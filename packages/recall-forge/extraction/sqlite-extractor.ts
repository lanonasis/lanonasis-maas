// Document-mode extraction for OpenClaw SQLite memory databases
// Reads chunks table, emits each chunk as an ExtractionRecord

import { createHash } from "crypto";
import { basename } from "path";

import type { LanCreateParams } from "../client.js";
import { shouldCapture } from "../enrichment/capture-filter.js";
import { detectMemoryType } from "../enrichment/type-detector.js";
import { extractTags } from "../enrichment/tag-extractor.js";
import { looksLikePromptInjection } from "../enrichment/prompt-safety.js";
import { redactSecrets } from "./secret-redactor.js";

import type { ExtractionOptions, ExtractionStats } from "./types.js";
import type { ExtractionDeps } from "./jsonl-extractor.js";

/**
 * Detect whether a file is a SQLite database based on extension.
 */
export function isSqliteFile(filePath: string): boolean {
  return /\.(sqlite3?|db)$/i.test(filePath);
}

interface SqliteChunk {
  id: string;
  path: string;
  source: string;
  start_line: number;
  end_line: number;
  model: string;
  text: string;
  updated_at: number;
}

function idempotencyKey(dbPath: string, chunkId: string): string {
  return createHash("sha256")
    .update(`sqlite:${dbPath}:${chunkId}`)
    .digest("hex")
    .slice(0, 32);
}

type SqliteDb = {
  all(sql: string): SqliteChunk[];
  get(sql: string): Record<string, unknown> | undefined;
  close(): void;
};

/**
 * Open a SQLite database using available runtime bindings.
 *
 * Priority:
 *   1. bun:sqlite  — available when running under Bun (OpenClaw's runtime)
 *   2. node:sqlite — available in Node.js >= 22.5.0 (experimental)
 *   3. Throws with a clear message if neither is available
 *
 * No child_process or shell commands are used.
 */
async function openDatabase(dbPath: string): Promise<SqliteDb> {
  // 1. Try Bun's built-in SQLite (primary path — OpenClaw runs on Bun)
  try {
    // @ts-ignore — bun:sqlite is a Bun-specific module, not in @types
    const { Database } = await import("bun:sqlite" as string);
    const db = new Database(dbPath, { readonly: true });
    return {
      all(sql: string): SqliteChunk[] {
        return db.query(sql).all() as SqliteChunk[];
      },
      get(sql: string): Record<string, unknown> | undefined {
        return db.query(sql).get() as Record<string, unknown> | undefined;
      },
      close() {
        db.close();
      },
    };
  } catch {
    // bun:sqlite unavailable — try Node.js built-in (Node >= 22.5.0)
  }

  // 2. Try Node's built-in sqlite module (Node 22.5+ experimental)
  try {
    // @ts-ignore — node:sqlite is experimental and not in stable @types/node
    const { DatabaseSync } = await import("node:sqlite" as string);
    const db = new DatabaseSync(dbPath, { open: true });
    return {
      all(sql: string): SqliteChunk[] {
        const stmt = db.prepare(sql);
        return stmt.all() as SqliteChunk[];
      },
      get(sql: string): Record<string, unknown> | undefined {
        const stmt = db.prepare(sql);
        return stmt.get() as Record<string, unknown> | undefined;
      },
      close() {
        db.close();
      },
    };
  } catch {
    // node:sqlite unavailable
  }

  throw new Error(
    `SQLite extraction requires Bun (bun:sqlite) or Node.js >= 22.5 (node:sqlite). ` +
    `Neither was available in the current runtime. Run this command under Bun or upgrade Node.`
  );
}

/**
 * Extract memories from an OpenClaw SQLite memory database.
 *
 * Reads the `chunks` table and processes each chunk through the standard pipeline:
 * redact → filter → enrich → dedup → store
 *
 * Also reads `meta` for the embedding model info which is logged and tagged.
 */
export async function extractSqlite(
  options: ExtractionOptions,
  deps: ExtractionDeps,
): Promise<ExtractionStats> {
  const startTime = Date.now();

  const stats: ExtractionStats = {
    linesRead: 0,
    linesParsed: 0,
    linesSkipped: 0,
    recordsExtracted: 0,
    recordsFiltered: 0,
    recordsDeduped: 0,
    recordsStored: 0,
    secretsRedacted: 0,
    markdownWritten: 0,
    errors: 0,
    durationMs: 0,
  };

  const {
    filePath,
    channel = "sqlite-extract",
    dedup = true,
    dedupThreshold = 0.92,
    localFallback = false,
    dryRun = false,
    limit,
    strict = false,
  } = options;

  const dbName = basename(filePath);
  let db: Awaited<ReturnType<typeof openDatabase>>;

  try {
    db = await openDatabase(filePath);
  } catch (err) {
    deps.logger.warn(`Failed to open ${filePath}: ${err instanceof Error ? err.message : "unknown"}`);
    stats.errors++;
    stats.durationMs = Date.now() - startTime;
    return stats;
  }

  deps.logger.info(`Format detected: sqlite (${dbName})`);

  // Read embedding model from meta if available
  let embeddingModel = "unknown";
  try {
    const meta = db.get("SELECT value FROM meta WHERE key = 'memory_index_meta_v1'");
    if (meta && typeof meta.value === "string") {
      try {
        const parsed = JSON.parse(meta.value);
        embeddingModel = parsed.model ?? "unknown";
        deps.logger.info(`Embedding model: ${embeddingModel} via ${parsed.provider ?? "unknown"}`);
      } catch { /* non-fatal */ }
    }
  } catch { /* meta table might not exist */ }

  // Read all chunks
  let chunks: SqliteChunk[];
  try {
    chunks = db.all("SELECT id, path, source, start_line, end_line, model, text, updated_at FROM chunks ORDER BY updated_at ASC");
  } catch (err) {
    deps.logger.warn(`Failed to read chunks: ${err instanceof Error ? err.message : "unknown"}`);
    db.close();
    stats.errors++;
    stats.durationMs = Date.now() - startTime;
    return stats;
  }

  stats.linesRead = chunks.length;
  stats.linesParsed = chunks.length;
  stats.recordsExtracted = chunks.length;

  let totalProcessed = 0;

  for (const chunk of chunks) {
    if (limit && totalProcessed >= limit) break;

    if (!chunk.text || chunk.text.trim().length === 0) {
      stats.linesSkipped++;
      continue;
    }

    // Step 1: Redact secrets
    const redaction = redactSecrets(chunk.text);
    stats.secretsRedacted += redaction.secretsFound;
    const cleanText = redaction.text;

    // Step 2: Capture filter
    if (!shouldCapture(cleanText, { strict })) {
      stats.recordsFiltered++;
      continue;
    }

    // Step 3: Prompt injection check
    if (looksLikePromptInjection(cleanText)) {
      stats.recordsFiltered++;
      continue;
    }

    // Step 4: Enrichment
    const sourceFile = chunk.path || dbName;
    const memoryType = detectMemoryType(cleanText, sourceFile);
    const tags = [
      ...extractTags(cleanText, sourceFile),
      "sqlite-extract",
      dbName.replace(/\.sqlite3?$/i, ""),
    ];
    if (chunk.source) tags.push(chunk.source);

    // Step 5: Vector dedup
    if (dedup && !dryRun) {
      try {
        const existing = await deps.client.searchMemories({
          query: cleanText.slice(0, 500),
          threshold: dedupThreshold,
          limit: 1,
        });
        if (existing && existing.length > 0) {
          stats.recordsDeduped++;
          continue;
        }
      } catch (err) {
        deps.logger.warn(
          `Dedup check failed: ${err instanceof Error ? err.message : "unknown"}`,
        );
      }
    }

    // Step 6: Store
    if (!dryRun) {
      const title = cleanText.slice(0, 80).replace(/\s+/g, " ").trim();
      const params: LanCreateParams = {
        title,
        content: cleanText,
        type: memoryType,
        tags,
        metadata: {
          agent_id: deps.config.agentId,
          source: "sqlite",
          channel,
          source_file: sourceFile,
          chunk_id: chunk.id,
          start_line: chunk.start_line,
          end_line: chunk.end_line,
          embedding_model: chunk.model || embeddingModel,
          captured_at: chunk.updated_at
            ? new Date(chunk.updated_at * 1000).toISOString()
            : new Date().toISOString(),
          secrets_redacted: redaction.secretsFound,
        },
        idempotency_key: idempotencyKey(filePath, chunk.id),
      };

      try {
        await deps.client.createMemory(params);
        stats.recordsStored++;
      } catch (err) {
        stats.errors++;
        deps.logger.warn(
          `Store failed for chunk ${chunk.id.slice(0, 8)}: ${err instanceof Error ? err.message : "unknown"}`,
        );
      }
    } else {
      stats.recordsStored++;
    }

    // Step 7: Local markdown fallback
    if (localFallback && deps.fallback) {
      try {
        const title = cleanText.slice(0, 80).replace(/\s+/g, " ").trim();
        await deps.fallback.writeMemory(title, cleanText);
        stats.markdownWritten++;
      } catch { /* non-fatal */ }
    }

    totalProcessed++;

    if (totalProcessed % 100 === 0) {
      deps.logger.info(
        `Progress: ${totalProcessed}/${chunks.length} chunks processed, ${stats.recordsStored} stored`,
      );
    }
  }

  db.close();
  stats.durationMs = Date.now() - startTime;
  return stats;
}

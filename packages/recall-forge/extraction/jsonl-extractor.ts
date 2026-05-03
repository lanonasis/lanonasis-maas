// Core streaming JSONL extraction engine
// Reads any JSONL source, redacts secrets, enriches, deduplicates, stores as memories

import { createReadStream } from "fs";
import { createInterface } from "readline";
import { createHash } from "crypto";

import type { LanonasisClient, LanCreateParams } from "../client.js";
import type { LanonasisConfig } from "../config.js";
import type { LocalFallbackWriter } from "../hooks/local-fallback.js";
import { shouldCapture } from "../enrichment/capture-filter.js";
import { detectMemoryType } from "../enrichment/type-detector.js";
import { extractTags } from "../enrichment/tag-extractor.js";
import { looksLikePromptInjection } from "../enrichment/prompt-safety.js";

import type {
  ExtractionOptions,
  ExtractionStats,
  ExtractionRecord,
} from "./types.js";
import { redactSecrets } from "./secret-redactor.js";
import { detectFormat } from "./format-adapters.js";
import type { FormatAdapter } from "./types.js";

export interface ExtractionDeps {
  client: LanonasisClient;
  config: LanonasisConfig;
  logger: { info(msg: string): void; warn(msg: string): void };
  fallback?: LocalFallbackWriter;
}

function idempotencyKey(
  filePath: string,
  lineNumber: number,
  textPrefix: string,
): string {
  return createHash("sha256")
    .update(`${filePath}:${lineNumber}:${textPrefix}`)
    .digest("hex")
    .slice(0, 32);
}

/**
 * Extract memories from a JSONL file with secret redaction
 *
 * Pipeline per record:
 * 1. Parse JSONL line → format adapter → ExtractionRecord
 * 2. Role filter (default: user only)
 * 3. redactSecrets() — strips API keys, tokens, credentials
 * 4. shouldCapture() — filters noise
 * 5. looksLikePromptInjection() — safety check
 * 6. detectMemoryType() + extractTags() — enrichment
 * 7. vector dedup via searchMemories() — skip duplicates
 * 8. createMemory() with idempotency key — store
 * 9. Optional local markdown fallback
 */
export async function extractJsonl(
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
    format,
    channel = "jsonl-extract",
    dedup = true,
    dedupThreshold = 0.92,
    localFallback = false,
    dryRun = false,
    limit,
    strict = false,
    roles = ["user"],
  } = options;

  let adapter: FormatAdapter | null = null;
  let totalProcessed = 0;

  // Stream the file line by line
  const fileStream = createReadStream(filePath, { encoding: "utf-8" });
  const rl = createInterface({ input: fileStream, crlfDelay: Infinity });

  for await (const line of rl) {
    stats.linesRead++;

    // Check limit
    if (limit && totalProcessed >= limit) break;

    // Skip empty lines
    const trimmed = line.trim();
    if (!trimmed) {
      stats.linesSkipped++;
      continue;
    }

    // Parse JSON
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      stats.linesSkipped++;
      stats.errors++;
      continue;
    }
    stats.linesParsed++;

    // Auto-detect format on first valid line
    if (!adapter) {
      adapter = detectFormat(parsed, format);
      deps.logger.info(`Format detected: ${adapter.name}`);
    }

    // Extract records from this line
    const records = adapter.extract(parsed, stats.linesRead);
    stats.recordsExtracted += records.length;

    // Process each record through the pipeline
    for (const record of records) {
      if (limit && totalProcessed >= limit) break;

      // Role filter
      if (roles.length > 0 && !roles.includes(record.role)) continue;

      // Step 1: Redact secrets FIRST — before any other processing
      const redaction = redactSecrets(record.text);
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
      const memoryType = detectMemoryType(cleanText);
      const tags = [
        ...extractTags(cleanText),
        "jsonl-extract",
        record.sourceFormat,
      ];

      // Step 5: Vector dedup (if enabled and not dry run)
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
          // Dedup failure is non-fatal — proceed to store
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
            source: record.sourceFormat,
            channel,
            line_number: record.lineNumber,
            captured_at: record.timestamp ?? new Date().toISOString(),
            secrets_redacted: redaction.secretsFound,
          },
          idempotency_key: idempotencyKey(
            filePath,
            record.lineNumber,
            cleanText.slice(0, 200),
          ),
        };

        try {
          await deps.client.createMemory(params);
          stats.recordsStored++;
        } catch (err) {
          stats.errors++;
          deps.logger.warn(
            `Store failed at line ${record.lineNumber}: ${err instanceof Error ? err.message : "unknown"}`,
          );
        }
      } else {
        // Dry run — count as "would store"
        stats.recordsStored++;
      }

      // Step 7: Local markdown fallback
      if (localFallback && deps.fallback) {
        try {
          const title = cleanText.slice(0, 80).replace(/\s+/g, " ").trim();
          await deps.fallback.writeMemory(title, cleanText);
          stats.markdownWritten++;
        } catch {
          // Non-fatal
        }
      }

      totalProcessed++;

      // Progress indicator every 500 records
      if (totalProcessed % 500 === 0) {
        deps.logger.info(
          `Progress: ${totalProcessed} records processed, ${stats.recordsStored} stored, ${stats.secretsRedacted} secrets redacted`,
        );
      }
    }
  }

  stats.durationMs = Date.now() - startTime;
  return stats;
}

/**
 * Format extraction stats as a human-readable report
 */
export function formatStats(stats: ExtractionStats, dryRun: boolean): string {
  const lines = [
    "",
    dryRun ? "=== DRY RUN REPORT ===" : "=== EXTRACTION REPORT ===",
    "",
    `Lines read:        ${stats.linesRead}`,
    `Lines parsed:      ${stats.linesParsed}`,
    `Lines skipped:     ${stats.linesSkipped}`,
    "",
    `Records extracted: ${stats.recordsExtracted}`,
    `Records filtered:  ${stats.recordsFiltered} (noise/injection)`,
    `Records deduped:   ${stats.recordsDeduped} (already in memory)`,
    `Records stored:    ${stats.recordsStored}${dryRun ? " (would store)" : ""}`,
    "",
    `Secrets redacted:  ${stats.secretsRedacted}`,
    `Errors:            ${stats.errors}`,
    "",
    `Duration:          ${(stats.durationMs / 1000).toFixed(1)}s`,
  ];

  if (stats.markdownWritten > 0) {
    lines.push(`Markdown written:  ${stats.markdownWritten}`);
  }

  return lines.join("\n");
}

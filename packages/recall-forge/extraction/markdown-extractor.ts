// Document-mode extraction for Markdown files
// Splits by heading sections, emits each as an ExtractionRecord

import { promises as fs } from "fs";
import { basename } from "path";
import { createHash } from "crypto";

import type { LanonasisClient, LanCreateParams } from "../client.js";
import type { LanonasisConfig } from "../config.js";
import type { LocalFallbackWriter } from "../hooks/local-fallback.js";
import { shouldCapture } from "../enrichment/capture-filter.js";
import { detectMemoryType } from "../enrichment/type-detector.js";
import { extractTags } from "../enrichment/tag-extractor.js";
import { looksLikePromptInjection } from "../enrichment/prompt-safety.js";
import { redactSecrets } from "./secret-redactor.js";

import type { ExtractionOptions, ExtractionStats, ExtractionRecord } from "./types.js";
import type { ExtractionDeps } from "./jsonl-extractor.js";

/** A heading-delimited section from a markdown file */
interface MarkdownSection {
  heading: string;
  level: number;
  body: string;
  lineNumber: number;
}

/**
 * Split a markdown file into heading-delimited sections.
 * Each section includes the heading text, level (1-6), body content, and starting line number.
 * Content before the first heading is emitted as a section with heading = filename.
 */
function splitMarkdownSections(content: string, filename: string): MarkdownSection[] {
  const lines = content.split("\n");
  const sections: MarkdownSection[] = [];
  const headingPattern = /^(#{1,6})\s+(.+)$/;

  let currentHeading = filename.replace(/\.md$/i, "");
  let currentLevel = 0;
  let currentLines: string[] = [];
  let currentStart = 1;

  for (let i = 0; i < lines.length; i++) {
    const match = headingPattern.exec(lines[i]);
    if (match) {
      // Flush previous section
      const body = currentLines.join("\n").trim();
      if (body.length > 0) {
        sections.push({
          heading: currentHeading,
          level: currentLevel,
          body,
          lineNumber: currentStart,
        });
      }

      currentHeading = match[2].trim();
      currentLevel = match[1].length;
      currentLines = [];
      currentStart = i + 1;
    } else {
      currentLines.push(lines[i]);
    }
  }

  // Flush final section
  const body = currentLines.join("\n").trim();
  if (body.length > 0) {
    sections.push({
      heading: currentHeading,
      level: currentLevel,
      body,
      lineNumber: currentStart,
    });
  }

  return sections;
}

/**
 * Convert markdown sections into ExtractionRecords.
 * Each section becomes one record with:
 *  - text: "{heading}\n\n{body}"  (heading provides context)
 *  - role: "user" (markdown docs are considered user-authored)
 *  - sourceFormat: "markdown"
 */
function sectionsToRecords(sections: MarkdownSection[]): ExtractionRecord[] {
  return sections.map((s) => ({
    text: s.level > 0 ? `${s.heading}\n\n${s.body}` : s.body,
    role: "user" as const,
    sourceFormat: "markdown",
    lineNumber: s.lineNumber,
  }));
}

function idempotencyKey(filePath: string, lineNumber: number, textPrefix: string): string {
  return createHash("sha256")
    .update(`${filePath}:${lineNumber}:${textPrefix}`)
    .digest("hex")
    .slice(0, 32);
}

/**
 * Detect whether a file is markdown based on extension.
 * Used by the CLI to route to extractMarkdown() vs extractJsonl().
 */
export function isMarkdownFile(filePath: string): boolean {
  return /\.(md|markdown|mdx)$/i.test(filePath);
}

/**
 * Extract memories from a Markdown document.
 *
 * Pipeline per section:
 * 1. Split file by headings → MarkdownSection[]
 * 2. Convert to ExtractionRecord[]
 * 3. Role filter (default: user only — all sections are "user")
 * 4. redactSecrets()
 * 5. shouldCapture() — filter noise
 * 6. looksLikePromptInjection() — safety check
 * 7. detectMemoryType() + extractTags() — enrichment
 * 8. Vector dedup via searchMemories()
 * 9. createMemory() with idempotency key
 * 10. Optional local markdown fallback
 */
export async function extractMarkdown(
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
    channel = "md-extract",
    dedup = true,
    dedupThreshold = 0.92,
    localFallback = false,
    dryRun = false,
    limit,
    strict = false,
    roles = ["user"],
  } = options;

  // Read the entire file
  let content: string;
  try {
    content = await fs.readFile(filePath, "utf-8");
  } catch (err) {
    deps.logger.warn(`Failed to read ${filePath}: ${err instanceof Error ? err.message : "unknown"}`);
    stats.errors++;
    stats.durationMs = Date.now() - startTime;
    return stats;
  }

  const lines = content.split("\n");
  stats.linesRead = lines.length;

  deps.logger.info(`Format detected: markdown`);

  // Split into sections
  const filename = basename(filePath);
  const sections = splitMarkdownSections(content, filename);
  const records = sectionsToRecords(sections);

  stats.linesParsed = stats.linesRead; // all lines are "parsed" in document mode
  stats.recordsExtracted = records.length;

  let totalProcessed = 0;

  for (const record of records) {
    if (limit && totalProcessed >= limit) break;

    // Role filter
    if (roles.length > 0 && !roles.includes(record.role)) continue;

    // Step 1: Redact secrets
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
    const memoryType = detectMemoryType(cleanText, filename);
    const tags = [
      ...extractTags(cleanText, filename),
      "md-extract",
      filename.replace(/\.md$/i, "").toLowerCase(),
    ];

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
          source: "markdown",
          channel,
          line_number: record.lineNumber,
          source_file: filename,
          captured_at: new Date().toISOString(),
          secrets_redacted: redaction.secretsFound,
        },
        idempotency_key: idempotencyKey(filePath, record.lineNumber, cleanText.slice(0, 200)),
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
  }

  stats.durationMs = Date.now() - startTime;
  return stats;
}

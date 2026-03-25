#!/usr/bin/env node
// Standalone JSONL extractor — runs anywhere without OpenClaw
// Usage: bun run extraction/standalone.ts <file.jsonl> [options]
//
// Options:
//   --dry-run       Extract + redact only, don't store to API
//   --format <fmt>  Force: claude-code | openclaw-cache | openclaw-session | codex | generic
//   --roles <r,r>   Roles to extract (default: user)
//   --limit <n>     Max records
//   --strict        Strict capture filter
//   --markdown      Write clean markdown to ./extracted/
//   --no-dedup      Skip vector dedup
//   --stats-only    Only show stats, no output
//
// Examples:
//   bun run extraction/standalone.ts ~/.openclaw/logs/cache-trace.jsonl --dry-run
//   bun run extraction/standalone.ts ~/.claude/projects/-opt-lanonasis/*.jsonl --dry-run --limit 50
//   node --import tsx extraction/standalone.ts session.jsonl --markdown --dry-run

import { createReadStream } from "fs";
import { createInterface } from "readline";
import { mkdir, appendFile } from "fs/promises";
import { join, basename } from "path";

import { redactSecrets } from "./secret-redactor.js";
import { detectFormat } from "./format-adapters.js";
import { shouldCapture } from "../enrichment/capture-filter.js";
import { detectMemoryType } from "../enrichment/type-detector.js";
import { extractTags } from "../enrichment/tag-extractor.js";
import { looksLikePromptInjection } from "../enrichment/prompt-safety.js";
import type { FormatAdapter, ExtractionStats } from "./types.js";

// Parse args
const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
if (!file) {
  console.error("Usage: standalone.ts <file.jsonl> [--dry-run] [--markdown] [--limit N] [--roles user,assistant]");
  process.exit(1);
}

const flags = {
  dryRun: args.includes("--dry-run"),
  markdown: args.includes("--markdown"),
  strict: args.includes("--strict"),
  noDedup: args.includes("--no-dedup"),
  statsOnly: args.includes("--stats-only"),
  format: args[args.indexOf("--format") + 1] as string | undefined,
  roles: (args[args.indexOf("--roles") + 1] ?? "user").split(","),
  limit: args.includes("--limit") ? parseInt(args[args.indexOf("--limit") + 1], 10) : undefined,
};

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

const startTime = Date.now();
let adapter: FormatAdapter | null = null;
let totalProcessed = 0;

// Markdown output dir
const outputDir = join(process.cwd(), "extracted");
const outputFile = join(outputDir, `${basename(file, ".jsonl")}-clean.md`);

if (flags.markdown) {
  await mkdir(outputDir, { recursive: true });
}

console.error(`[standalone] Extracting from: ${file}`);
console.error(`[standalone] Mode: ${flags.dryRun ? "DRY RUN" : "EXTRACT"}`);
console.error(`[standalone] Roles: ${flags.roles.join(", ")}`);
if (flags.limit) console.error(`[standalone] Limit: ${flags.limit}`);
console.error("");

const fileStream = createReadStream(file, { encoding: "utf-8" });
const rl = createInterface({ input: fileStream, crlfDelay: Infinity });

for await (const line of rl) {
  stats.linesRead++;

  if (flags.limit && totalProcessed >= flags.limit) break;

  const trimmed = line.trim();
  if (!trimmed) { stats.linesSkipped++; continue; }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    stats.linesSkipped++;
    stats.errors++;
    continue;
  }
  stats.linesParsed++;

  if (!adapter) {
    adapter = detectFormat(parsed, flags.format);
    console.error(`[standalone] Format detected: ${adapter.name}`);
  }

  const records = adapter.extract(parsed, stats.linesRead);
  stats.recordsExtracted += records.length;

  for (const record of records) {
    if (flags.limit && totalProcessed >= flags.limit) break;
    if (flags.roles.length > 0 && !flags.roles.includes(record.role)) continue;

    // Redact secrets FIRST
    const redaction = redactSecrets(record.text);
    stats.secretsRedacted += redaction.secretsFound;
    const cleanText = redaction.text;

    // Capture filter
    if (!shouldCapture(cleanText, { strict: flags.strict })) {
      stats.recordsFiltered++;
      continue;
    }

    // Prompt injection check
    if (looksLikePromptInjection(cleanText)) {
      stats.recordsFiltered++;
      continue;
    }

    // Enrich
    const memType = detectMemoryType(cleanText);
    const tags = [...extractTags(cleanText), "jsonl-extract", record.sourceFormat];

    stats.recordsStored++;
    totalProcessed++;

    // Output
    if (!flags.statsOnly) {
      const title = cleanText.slice(0, 80).replace(/\s+/g, " ").trim();
      const secretNote = redaction.secretsFound > 0
        ? ` | secrets_redacted: ${redaction.secretsFound} (${redaction.types.join(", ")})`
        : "";

      console.log(`\n--- Record ${totalProcessed} [${memType}] line:${record.lineNumber} ---`);
      console.log(`Title: ${title}`);
      console.log(`Tags: ${tags.join(", ")}`);
      if (secretNote) console.log(`Security: ${secretNote}`);
      console.log(`\n${cleanText.slice(0, 500)}${cleanText.length > 500 ? "\n... (truncated)" : ""}`);
    }

    // Markdown output
    if (flags.markdown) {
      const mdEntry = [
        `## ${cleanText.slice(0, 80).replace(/\s+/g, " ").trim()}`,
        "",
        `> Type: ${memType} | Tags: ${tags.join(", ")}`,
        redaction.secretsFound > 0 ? `> Secrets redacted: ${redaction.secretsFound}` : "",
        "",
        cleanText.slice(0, 2000),
        "",
        "---",
        "",
      ].filter(Boolean).join("\n");

      await appendFile(outputFile, mdEntry, "utf-8");
      stats.markdownWritten++;
    }

    // Progress
    if (totalProcessed % 500 === 0) {
      console.error(`[standalone] Progress: ${totalProcessed} records, ${stats.secretsRedacted} secrets redacted`);
    }
  }
}

stats.durationMs = Date.now() - startTime;

// Final report
console.error(`
=== EXTRACTION REPORT ===

Lines read:        ${stats.linesRead}
Lines parsed:      ${stats.linesParsed}
Lines skipped:     ${stats.linesSkipped}

Records extracted: ${stats.recordsExtracted}
Records filtered:  ${stats.recordsFiltered} (noise/injection)
Records stored:    ${stats.recordsStored}${flags.dryRun ? " (would store)" : ""}

Secrets redacted:  ${stats.secretsRedacted}
Errors:            ${stats.errors}

Duration:          ${(stats.durationMs / 1000).toFixed(1)}s${
  flags.markdown ? `\nMarkdown written:  ${stats.markdownWritten} entries → ${outputFile}` : ""
}`);

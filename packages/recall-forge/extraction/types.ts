// Extraction pipeline types
import type { LanMemoryType } from "../client.js";

/** A single meaningful record extracted from one JSONL line */
export interface ExtractionRecord {
  text: string;
  role: "user" | "assistant" | "system" | "unknown";
  sourceFormat: string;
  lineNumber: number;
  timestamp?: string;
}

/** Result of the redaction pass */
export interface RedactionResult {
  text: string;
  secretsFound: number;
  types: string[];
}

/** Stats reported after extraction completes */
export interface ExtractionStats {
  linesRead: number;
  linesParsed: number;
  linesSkipped: number;
  recordsExtracted: number;
  recordsFiltered: number;
  recordsDeduped: number;
  recordsStored: number;
  secretsRedacted: number;
  markdownWritten: number;
  errors: number;
  durationMs: number;
}

/** Options for the extraction function */
export interface ExtractionOptions {
  filePath: string;
  format?: "claude-code" | "openclaw-cache" | "openclaw-session" | "codex" | "generic" | "markdown" | "sqlite";
  channel?: string;
  dedup?: boolean;
  dedupThreshold?: number;
  localFallback?: boolean;
  batchSize?: number;
  dryRun?: boolean;
  limit?: number;
  strict?: boolean;
  roles?: string[];
  /** Enable PII detection alongside secret redaction (default: true) */
  redactPII?: boolean;
}

/** A format adapter converts a parsed JSON line into ExtractionRecords */
export interface FormatAdapter {
  name: string;
  detect(sample: Record<string, unknown>): boolean;
  extract(line: Record<string, unknown>, lineNumber: number): ExtractionRecord[];
}

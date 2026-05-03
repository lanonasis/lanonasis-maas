// Extraction pipeline — barrel export
export { extractJsonl, formatStats } from "./jsonl-extractor.js";
export { extractMarkdown, isMarkdownFile } from "./markdown-extractor.js";
export { extractSqlite, isSqliteFile } from "./sqlite-extractor.js";
export { redactSecrets, containsSecrets } from "./secret-redactor.js";
export { detectFormat, FORMAT_ADAPTERS } from "./format-adapters.js";
export { registerExtractCli } from "./cli-extract.js";
export type {
  ExtractionOptions,
  ExtractionStats,
  ExtractionRecord,
  RedactionResult,
  FormatAdapter,
} from "./types.js";

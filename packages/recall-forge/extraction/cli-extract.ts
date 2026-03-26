// CLI subcommand for JSONL extraction
// Usage: openclaw recall extract <file> [options]

import type { LanonasisClient } from "../client.js";
import type { LanonasisConfig } from "../config.js";
import type { LocalFallbackWriter } from "../hooks/local-fallback.js";
import { extractJsonl, formatStats } from "./jsonl-extractor.js";
import { isMarkdownFile } from "./markdown-extractor.js";
import { isSqliteFile } from "./sqlite-extractor.js";
import type { ExtractionOptions } from "./types.js";

export function registerExtractCli(
  cmd: any, // commander Command object from cli.ts
  getRuntime: () => { client: LanonasisClient; cfg: LanonasisConfig },
  fallback?: LocalFallbackWriter,
) {
  cmd
    .command("extract <file>")
    .description("Extract memories from session logs, markdown docs, or SQLite databases (with secret redaction)")
    .option("--format <fmt>", "Force format: claude-code, openclaw-cache, openclaw-session, codex, generic, markdown, sqlite")
    .option("--channel <name>", "Channel metadata", "jsonl-extract")
    .option("--no-dedup", "Skip vector dedup (faster)")
    .option("--threshold <n>", "Dedup similarity threshold", "0.92")
    .option("--local-fallback", "Also write to local markdown")
    .option("--dry-run", "Extract + redact only, don't store")
    .option("--limit <n>", "Max records to process")
    .option("--strict", "Use strict capture filter")
    .option("--roles <roles>", "Roles to extract (comma-separated)", "user")
    .option("--batch-size <n>", "Batch size", "10")
    .action(
      async (
        file: string,
        options: {
          format?: string;
          channel: string;
          dedup: boolean;
          threshold: string;
          localFallback?: boolean;
          dryRun?: boolean;
          limit?: string;
          strict?: boolean;
          roles: string;
          batchSize: string;
        },
      ) => {
        const { client, cfg } = getRuntime();
        const extractionOptions: ExtractionOptions = {
          filePath: file,
          format: options.format as ExtractionOptions["format"],
          channel: options.channel,
          dedup: options.dedup,
          dedupThreshold: parseFloat(options.threshold),
          localFallback: !!options.localFallback,
          dryRun: !!options.dryRun,
          limit: options.limit ? parseInt(options.limit, 10) : undefined,
          strict: !!options.strict,
          roles: options.roles.split(",").map((r) => r.trim()),
          batchSize: parseInt(options.batchSize, 10),
        };

        const logger = {
          info: (msg: string) => console.error(`[extract] ${msg}`),
          warn: (msg: string) => console.error(`[extract] WARN: ${msg}`),
        };

        console.error(`[extract] Starting extraction from: ${file}`);
        if (options.dryRun) console.error("[extract] DRY RUN — no data will be stored");

        try {
          // Route to the correct extractor based on file type or forced format
          const useMarkdown = extractionOptions.format === "markdown" || (
            !extractionOptions.format && isMarkdownFile(file)
          );
          const useSqlite = extractionOptions.format === "sqlite" || (
            !extractionOptions.format && isSqliteFile(file)
          );

          let stats;
          if (useMarkdown) {
            const { extractMarkdown: extract } = await import("./markdown-extractor.js");
            stats = await extract(extractionOptions, { client, config: cfg, logger, fallback });
          } else if (useSqlite) {
            const { extractSqlite: extract } = await import("./sqlite-extractor.js");
            stats = await extract(extractionOptions, { client, config: cfg, logger, fallback });
          } else {
            stats = await extractJsonl(extractionOptions, { client, config: cfg, logger, fallback });
          }

          console.log(formatStats(stats, !!options.dryRun));
        } catch (err) {
          console.error(
            `[extract] Fatal error: ${err instanceof Error ? err.message : "unknown"}`,
          );
          process.exit(1);
        }
      },
    );
}

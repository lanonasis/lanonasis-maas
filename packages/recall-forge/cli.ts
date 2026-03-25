// Phase 6 - CLI Commands
import type { OpenClawPluginApi } from "./plugin-sdk-stub.js";
import type { LanonasisClient } from "./client.js";
import type { LanonasisConfig } from "./config.js";
import {
  assertMemoryStatsShape,
  exitWithError,
  isNotFoundError,
  memoryTypeOf,
  parseMemoryType,
  parsePositiveInt,
  parseSortField,
  parseSortOrder,
  parseTags,
  parseThreshold,
  printMemoryStats,
  requireMemoryId,
  similarityOf,
  normalizeTextInput,
} from "./cli-common.js";
import { registerMemoryCli } from "./cli-memory.js";
import { registerExtractCli } from "./extraction/cli-extract.js";

function padCell(value: string | undefined, width: number): string {
  return (value ?? "").slice(0, width - 2).padEnd(width);
}

export function registerCli(
  api: OpenClawPluginApi,
  getRuntime: () => { client: LanonasisClient; cfg: LanonasisConfig },
) {
  api.registerCli(
    ({ program }: { program: any }) => {
      const cmd = program
        .command("lanonasis")
        .description("LanOnasis memory commands");

      // status
      cmd
        .command("status")
        .description("Check LanOnasis connection status")
        .action(async () => {
          try {
            const { client, cfg } = getRuntime();
            const h = await client.getHealth();
            console.log(
              `Status: ${h.status} | v${h.version} | project: ${cfg.projectId}`,
            );
          } catch (err) {
            console.error(
              `Error: ${err instanceof Error ? err.message : "unknown"}`,
            );
            process.exit(1);
          }
        });

      // search
      cmd
        .command("search <query>")
        .description("Semantic search memories")
        .option("--agent <id>", "Filter by agent_id")
        .option("--limit <n>", "Max results", "5")
        .option("--threshold <n>", "Minimum semantic similarity (0-1)")
        .option("--type <type>", "Filter by memory type")
        .option("--tags <tags>", "Comma-separated tags")
        .action(async (
          query: string,
          options: {
            agent?: string;
            limit: string;
            threshold?: string;
            type?: string;
            tags?: string;
          },
        ) => {
          try {
            const { client } = getRuntime();
            const normalizedQuery = normalizeTextInput("Query", query);
            if (!normalizedQuery) {
              throw new Error("Query cannot be empty or whitespace-only.");
            }

            const metadata: Record<string, unknown> = {};
            if (options.agent) metadata.agent_id = options.agent;

            const memories = await client.searchMemories({
              query: normalizedQuery,
              threshold: parseThreshold(options.threshold),
              limit: parsePositiveInt("--limit", options.limit, 5),
              type: parseMemoryType(options.type),
              tags: parseTags(options.tags),
              metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
            });

            if (!memories || memories.length === 0) {
              console.log("No memories found.");
              return;
            }

            // Table format: id(8), title(40), type, score
            console.log(
              `│ ${"ID".padEnd(10)} │ ${"Title".padEnd(42)} │ ${"Type".padEnd(12)} │ Score │`,
            );
            console.log(
              `├────────────┼──────────────────────────────────────────┼──────────────┼───────┤`,
            );
            memories.forEach((m: any) => {
              const id = padCell(m.id?.slice(0, 8), 10);
              const title = padCell(m.title, 42);
              const type = padCell(memoryTypeOf(m), 12);
              const similarity = similarityOf(m);
              const score = similarity !== undefined ? similarity.toFixed(2) : "N/A";
              console.log(`│ ${id} │ ${title} │ ${type} │ ${score.padStart(5)} │`);
            });
          } catch (err) {
            exitWithError(err);
          }
        });

      // list
      cmd
        .command("list")
        .description("List memories")
        .option("--type <type>", "Filter by type")
        .option("--limit <n>", "Max results", "20")
        .option("--page <n>", "Page number", "1")
        .option("--sort <field>", "Sort by created_at, updated_at, title, or type")
        .option("--order <order>", "Sort order: asc or desc")
        .option("--tags <tags>", "Comma-separated tags")
        .action(async (
          options: {
            type?: string;
            limit: string;
            page: string;
            sort?: string;
            order?: string;
            tags?: string;
          },
        ) => {
          try {
            const { client } = getRuntime();
            const result = await client.listMemories({
              limit: parsePositiveInt("--limit", options.limit, 20),
              page: parsePositiveInt("--page", options.page, 1),
              type: parseMemoryType(options.type),
              tags: parseTags(options.tags),
              sort: parseSortField(options.sort),
              order: parseSortOrder(options.order),
            });

            if (!result.memories || result.memories.length === 0) {
              console.log("No memories found.");
              return;
            }

            console.log(
              `│ ${"ID".padEnd(10)} │ ${"Title".padEnd(42)} │ ${"Type".padEnd(12)} │`,
            );
            console.log(
              `├────────────┼──────────────────────────────────────────┼──────────────┤`,
            );
            result.memories.forEach((m: any) => {
              const id = padCell(m.id?.slice(0, 8), 10);
              const title = padCell(m.title, 42);
              const type = padCell(memoryTypeOf(m), 12);
              console.log(`│ ${id} │ ${title} │ ${type} │`);
            });
            console.log(`\nTotal: ${result.total}`);
          } catch (err) {
            exitWithError(err);
          }
        });

      // stats
      cmd
        .command("stats")
        .description("Show memory statistics")
        .action(async () => {
          try {
            const { client } = getRuntime();
            const stats = assertMemoryStatsShape(await client.getStats());
            printMemoryStats(stats);
          } catch (err) {
            if (isNotFoundError(err)) {
              exitWithError(
                "Stats endpoint unavailable. Verify the LanOnasis deployment exposes /api/v1/memory/stats.",
              );
            }
            exitWithError(err);
          }
        });

      registerMemoryCli(cmd, getRuntime);

      // extract — JSONL extraction with secret redaction
      registerExtractCli(cmd, getRuntime);
    },
    { commands: ["lanonasis"] },
  );
}

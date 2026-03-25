// Phase 5 - Memory Search Tool
import type { OpenClawPluginApi } from "../plugin-sdk-stub.js";
import type { LanonasisClient } from "../client.js";
import type { LanonasisConfig } from "../config.js";

export function registerMemorySearchTool(
  api: OpenClawPluginApi,
  client: LanonasisClient,
  cfg: LanonasisConfig,
) {
  api.registerTool({
    name: "memory_search",
    description:
      "Semantic search through memories. Returns ranked results with previews.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query (required)",
        },
        limit: {
          type: "number",
          description: "Max results (default 5, max 10)",
          default: 5,
        },
        type: {
          type: "string",
          description:
            "Filter by type: context, project, knowledge, reference, personal, workflow",
        },
        threshold: {
          type: "number",
          description: "Similarity threshold (overrides config)",
        },
        agent_id: {
          type: "string",
          description: "Filter to specific agent's memories",
        },
      },
      required: ["query"],
    },
    async execute(_id: string, params: Record<string, unknown>) {
      try {
        const query = params.query as string;
        const limit = Math.min((params.limit as number) || 5, 10);
        const type = params.type as string | undefined;
        const threshold = params.threshold as number | undefined;
        const agentId = params.agent_id as string | undefined;

        const metadata: Record<string, unknown> = {};
        if (agentId) metadata.agent_id = agentId;

        const memories = await client.searchMemories({
          query,
          threshold: threshold || cfg.searchThreshold,
          limit,
          type: type as any,
          metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
        });

        if (!memories || memories.length === 0) {
          return {
            content: [{ type: "text", text: "No matching memories found." }],
          };
        }

        // Format: numbered list with 200 char previews
        const lines = memories.map((m: any, i: number) => {
          const preview = (m.content ?? '').slice(0, 200).replace(/\n/g, " ");
          const score = m.similarity !== undefined
            ? ` (score: ${m.similarity.toFixed(2)})`
            : "";
          const type = m.memory_type ?? m.type ?? 'context';
          return `${i + 1}. [${type}] **${m.title}**${score}\n   ID: ${m.id}\n   ${preview}...`;
        });

        return {
          content: [
            {
              type: "text",
              text: `Found ${memories.length} memories:\n\n${lines.join("\n\n")}`,
            },
          ],
          details: {
            count: memories.length,
            memories: memories.map((m: any) => ({
              id: m.id,
              title: m.title,
              type: m.memory_type ?? m.type,
              tags: m.tags,
              similarity: m.similarity,
              content_preview: (m.content ?? '').slice(0, 200),
            })),
          },
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text",
              text: `Search error: ${err instanceof Error ? err.message : "unknown"}`,
            },
          ],
        };
      }
    },
  });
}

// Phase 5 - Memory Forget Tool
import type { OpenClawPluginApi } from "../plugin-sdk-stub.js";
import type { LanonasisClient } from "../client.js";

export function registerMemoryForgetTool(
  api: OpenClawPluginApi,
  client: LanonasisClient,
) {
  api.registerTool({
    name: "memory_forget",
    description:
      "Delete a memory by ID or semantic query. Query mode requires high confidence.",
    parameters: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Memory ID to delete (UUID format)",
        },
        query: {
          type: "string",
          description:
            "Semantic query to find memory (deletes if single high-confidence match)",
        },
      },
    },
    async execute(_id: string, params: Record<string, unknown>) {
      try {
        const id = params.id as string | undefined;
        const query = params.query as string | undefined;

        // ID path
        if (id) {
          // Validate UUID format
          const uuidPattern =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (!uuidPattern.test(id)) {
            return {
              content: [
                {
                  type: "text",
                  text: `Invalid UUID format: ${id}`,
                },
              ],
            };
          }

          const resolvedId = await client.resolveMemoryId(id);
          await client.deleteMemory(resolvedId);
          return {
            content: [
              { type: "text", text: `Forgotten: ${resolvedId}` },
            ],
          };
        }

        // Query path
        if (query) {
          const results = await client.searchMemories({
            query,
            threshold: 0.7,
            limit: 5,
          });

          if (!results || results.length === 0) {
            return {
              content: [{ type: "text", text: "No matching memories found." }],
            };
          }

          // Single high-confidence match (>0.9)
          if (results.length === 1 && (results[0].similarity || 0) > 0.9) {
            await client.deleteMemory(results[0].id);
            return {
              content: [
                {
                  type: "text",
                  text: `Forgotten: **${results[0].title}** (id: ${results[0].id})`,
                },
              ],
            };
          }

          // Multiple results - return candidate list
          const lines = results.map(
            (r: any, i: number) =>
              `${i + 1}. [${r.memory_type ?? r.type}] **${r.title}** (score: ${(r.similarity || r.similarity_score || 0).toFixed(2)}) - id: ${r.id}`,
          );
          return {
            content: [
              {
                type: "text",
                text: `Multiple matches found. Specify which to delete:\n\n${lines.join("\n")}`,
              },
            ],
          };
        }

        return {
          content: [
            {
              type: "text",
              text: "Provide either 'id' or 'query' parameter.",
            },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text",
              text: `Forget error: ${err instanceof Error ? err.message : "unknown"}`,
            },
          ],
        };
      }
    },
  });
}

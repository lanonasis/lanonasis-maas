// Phase 5 - Memory Get Tool
import type { OpenClawPluginApi } from "../plugin-sdk-stub.js";
import type { LanonasisClient } from "../client.js";

export function registerMemoryGetTool(
  api: OpenClawPluginApi,
  client: LanonasisClient,
) {
  api.registerTool({
    name: "memory_get",
    description: "Fetch full memory content by ID.",
    parameters: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Memory ID or displayed prefix",
        },
      },
      required: ["id"],
    },
    async execute(_id: string, params: Record<string, unknown>) {
      try {
        const id = params.id as string;
        const memory = await client.getMemory(id);

        return {
          content: [
            {
              type: "text",
              text: `ID: ${memory.id}\n**${memory.title}** [${memory.type}]\n\n${memory.content}`,
            },
          ],
          details: memory,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : "unknown";
        if (message.includes("404")) {
          return {
            content: [
              { type: "text", text: `Memory not found: ${params.id}` },
            ],
          };
        }
        return {
          content: [
            { type: "text", text: `Error: ${message}` },
          ],
        };
      }
    },
  });
}

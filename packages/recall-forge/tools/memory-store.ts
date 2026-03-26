// Phase 5 - Memory Store Tool
import type { OpenClawPluginApi } from "../plugin-sdk-stub.js";
import type {
  LanonasisClient,
  LanMemoryType,
  LanUpdateParams,
} from "../client.js";
import type { LanonasisConfig } from "../config.js";
import { detectMemoryType } from "../enrichment/type-detector.js";
import { extractTags } from "../enrichment/tag-extractor.js";
import type { PrivacyGuard } from "../privacy/privacy-guard.js";

const MEMORY_TYPES: LanMemoryType[] = [
  "context",
  "project",
  "knowledge",
  "reference",
  "personal",
  "workflow",
];

function normalizeOptionalString(
  label: string,
  value: unknown,
): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") {
    throw new Error(`${label} must be a string.`);
  }
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${label} cannot be empty or whitespace-only.`);
  }
  return normalized;
}

function normalizeOptionalType(value: unknown): LanMemoryType | undefined {
  const normalized = normalizeOptionalString("Type", value);
  if (!normalized) return undefined;
  if (!MEMORY_TYPES.includes(normalized as LanMemoryType)) {
    throw new Error(`Type must be one of: ${MEMORY_TYPES.join(", ")}.`);
  }
  return normalized as LanMemoryType;
}

function normalizeTags(value: unknown): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    throw new Error("Tags must be an array of strings.");
  }

  const tags = [...new Set(value.map((tag) => {
    if (typeof tag !== "string") {
      throw new Error("Tags must be an array of strings.");
    }
    return tag.trim();
  }).filter(Boolean))];

  if (tags.length === 0) {
    throw new Error("Tags cannot be empty.");
  }
  return tags;
}

export function registerMemoryStoreTool(
  api: OpenClawPluginApi,
  client: LanonasisClient,
  cfg: LanonasisConfig,
  guard?: PrivacyGuard,
) {
  api.registerTool({
    name: "memory_store",
    description:
      "Store or update a memory. New memories are deduplicated before creation.",
    parameters: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Existing memory ID to update",
        },
        content: {
          type: "string",
          description: "Memory content (required for create, optional for update)",
        },
        title: {
          type: "string",
          description: "Memory title (auto-generated on create if absent)",
        },
        type: {
          type: "string",
          description:
            "Type: context, project, knowledge, reference, personal, workflow (auto-detected if absent)",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Tags (auto-extracted if absent)",
        },
      },
    },
    async execute(_id: string, params: Record<string, unknown>) {
      try {
        const id = normalizeOptionalString("Memory ID", params.id);
        const content = normalizeOptionalString("Content", params.content);
        let title = normalizeOptionalString("Title", params.title);
        let type = normalizeOptionalType(params.type);
        let tags = normalizeTags(params.tags);

        if (id) {
          const updates: LanUpdateParams = {};
          if (params.title !== undefined) updates.title = title;
          if (params.content !== undefined) updates.content = content;
          if (params.type !== undefined) updates.type = type;
          if (params.tags !== undefined) updates.tags = tags;

          if (Object.keys(updates).length === 0) {
            throw new Error(
              "Provide at least one field to update when `id` is set.",
            );
          }

          const memory = await client.updateMemory(id, updates);
          const resolvedType = memory.memory_type ?? memory.type;

          return {
            content: [
              {
                type: "text",
                text: `Updated: **${memory.title}** [${resolvedType}] (id: ${memory.id})`,
              },
            ],
            updated: true,
            id: memory.id,
            title: memory.title,
            type: resolvedType,
          };
        }

        if (!content) {
          throw new Error("Content is required when creating a memory.");
        }

        // Run privacy guard — stage 1: redact credentials, stage 2: mask PII
        const guardResult = guard ? guard.process(content) : null;
        const safeContent = guardResult ? guardResult.content : content;

        // Auto-generate if absent
        if (!title) {
          title = safeContent.slice(0, 80).replace(/\s+/g, " ").trim();
        }
        if (!type) {
          type = detectMemoryType(safeContent);
        }
        if (!tags || tags.length === 0) {
          const baseTags = extractTags(safeContent);
          const privacyTags = guardResult && guard ? guard.tagsFrom(guardResult.report) : [];
          tags = [...new Set([...baseTags, ...privacyTags])];
        } else if (guardResult && guard) {
          // Merge privacy tags with caller-supplied tags
          const privacyTags = guard.tagsFrom(guardResult.report);
          tags = [...new Set([...tags, ...privacyTags])];
        }

        // Dedup check using configurable threshold
        const existing = await client.searchMemories({
          query: safeContent,
          threshold: cfg.dedupeThreshold,
          limit: 1,
        });

        if (existing && existing.length > 0) {
          // Structured signal: stored:false lets the agent distinguish no-op from write
          return {
            content: [
              {
                type: "text",
                text: `Not stored — similar memory exists: **${existing[0].title}** (id: ${existing[0].id})`,
              },
            ],
            stored: false,
            reason: "duplicate",
            threshold: cfg.dedupeThreshold,
            existingTitle: existing[0].title,
            existingId: existing[0].id,
          };
        }

        // Create memory (with sanitized content + privacy metadata)
        const privacyMeta = guardResult && guard ? guard.metaFrom(guardResult.report) : undefined;
        const memory = await client.createMemory({
          title,
          content: safeContent,
          type: type as any,
          tags,
          metadata: {
            agent_id: cfg.agentId,
            source: "openclaw",
            captured_at: new Date().toISOString(),
            ...privacyMeta,
          },
        });

        const resolvedType = memory.memory_type ?? memory.type;
        return {
          content: [
            {
              type: "text",
              text: `Stored: **${title}** [${resolvedType}] (id: ${memory.id})`,
            },
          ],
          stored: true,
          id: memory.id,
          title,
          type: resolvedType,
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text",
              text: `Store error: ${err instanceof Error ? err.message : "unknown"}`,
            },
          ],
        };
      }
    },
  });
}

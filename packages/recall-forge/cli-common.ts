import { readFile } from "node:fs/promises";
import type {
  LanListSortField,
  LanMemory,
  LanMemoryStats,
  LanMemoryType,
  LanSortOrder,
} from "./client.js";

export const MEMORY_TYPES: LanMemoryType[] = [
  "context",
  "project",
  "knowledge",
  "reference",
  "personal",
  "workflow",
];

const SORT_FIELD_MAP: Record<string, LanListSortField> = {
  created_at: "created_at",
  updated_at: "updated_at",
  title: "title",
  type: "memory_type",
};

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return typeof error === "string" && error.trim() ? error : "unknown error";
}

export function exitWithError(error: unknown): never {
  console.error(`Error: ${errorMessage(error)}`);
  process.exit(1);
}

export function isNotFoundError(error: unknown): boolean {
  const message = errorMessage(error);
  return message.includes("(404)") || /\b404\b/.test(message);
}

export function normalizeTextInput(
  label: string,
  value: string | undefined,
): string | undefined {
  if (value === undefined) return undefined;
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${label} cannot be empty or whitespace-only.`);
  }
  return normalized;
}

export async function resolveContentInput(options: {
  content?: string;
  contentFile?: string;
  required?: boolean;
}): Promise<string | undefined> {
  const { content, contentFile, required = false } = options;

  if (content !== undefined && contentFile !== undefined) {
    throw new Error("Provide either --content or --content-file, not both.");
  }

  if (contentFile !== undefined) {
    try {
      const fileContent = await readFile(contentFile, "utf8");
      return normalizeTextInput("Content", fileContent);
    } catch (error) {
      throw new Error(
        `Unable to read content file "${contentFile}": ${errorMessage(error)}`,
      );
    }
  }

  const normalized = normalizeTextInput("Content", content);
  if (required && normalized === undefined) {
    throw new Error("Provide one of --content or --content-file.");
  }
  return normalized;
}

export function parseTags(input: string | undefined): string[] | undefined {
  if (input === undefined) return undefined;

  const tags = [...new Set(input.split(",").map((tag) => tag.trim()).filter(Boolean))];
  if (tags.length === 0) {
    throw new Error("`--tags` must include at least one non-empty tag.");
  }
  return tags;
}

export function parsePositiveInt(
  flag: string,
  raw: string | undefined,
  defaultValue?: number,
): number | undefined {
  if (raw === undefined) return defaultValue;

  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${flag} must be a positive integer.`);
  }
  return value;
}

export function parseThreshold(raw: string | undefined): number | undefined {
  if (raw === undefined) return undefined;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error("--threshold must be a number between 0 and 1.");
  }
  return value;
}

export function parseMemoryType(
  raw: string | undefined,
  flag = "--type",
): LanMemoryType | undefined {
  if (raw === undefined) return undefined;
  const normalized = raw.trim().toLowerCase();
  if (!normalized) {
    throw new Error(`${flag} cannot be empty or whitespace-only.`);
  }
  if (!MEMORY_TYPES.includes(normalized as LanMemoryType)) {
    throw new Error(
      `${flag} must be one of: ${MEMORY_TYPES.join(", ")}.`,
    );
  }
  return normalized as LanMemoryType;
}

export function parseSortField(
  raw: string | undefined,
): LanListSortField | undefined {
  if (raw === undefined) return undefined;
  const normalized = raw.trim().toLowerCase();
  if (!normalized) {
    throw new Error("--sort cannot be empty or whitespace-only.");
  }
  const sortField = SORT_FIELD_MAP[normalized];
  if (!sortField) {
    throw new Error(
      "--sort must be one of: created_at, updated_at, title, type.",
    );
  }
  return sortField;
}

export function parseSortOrder(
  raw: string | undefined,
): LanSortOrder | undefined {
  if (raw === undefined) return undefined;
  const normalized = raw.trim().toLowerCase();
  if (normalized !== "asc" && normalized !== "desc") {
    throw new Error("--order must be either asc or desc.");
  }
  return normalized;
}

export function requireMemoryId(id: string): string {
  const normalized = normalizeTextInput("Memory ID", id);
  if (!normalized) {
    throw new Error("Memory ID is required.");
  }
  return normalized;
}

export function requireUpdateFields(
  updates: Record<string, unknown>,
  message = "Provide at least one field to update: --title, --content, --content-file, --type, or --tags.",
): void {
  if (Object.keys(updates).length === 0) {
    throw new Error(message);
  }
}

export function formatPreview(content: string, maxLength = 140): string {
  const normalized = content.replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 3).trimEnd()}...`;
}

export function memoryTypeOf(memory: LanMemory): string {
  return memory.memory_type ?? memory.type ?? "unknown";
}

function formatTags(tags: string[] | undefined): string {
  return tags && tags.length > 0 ? tags.join(", ") : "(none)";
}

export function similarityOf(memory: LanMemory): number | undefined {
  return memory.similarity ?? memory.similarity_score;
}

export function printMemorySummary(memory: LanMemory, heading: string): void {
  const lines = [
    `${heading}:`,
    `  ID: ${memory.id}`,
    `  Title: ${memory.title}`,
    `  Type: ${memoryTypeOf(memory)}`,
    `  Tags: ${formatTags(memory.tags)}`,
  ];

  if (memory.created_at) lines.push(`  Created: ${memory.created_at}`);
  if (memory.updated_at) lines.push(`  Updated: ${memory.updated_at}`);

  const preview = formatPreview(memory.content);
  if (preview) lines.push(`  Preview: ${preview}`);

  console.log(lines.join("\n"));
}

export function printMemoryDetail(memory: LanMemory): void {
  const lines = [
    `ID: ${memory.id}`,
    `Title: ${memory.title}`,
    `Type: ${memoryTypeOf(memory)}`,
    `Tags: ${formatTags(memory.tags)}`,
    `Created: ${memory.created_at ?? "(unknown)"}`,
    `Updated: ${memory.updated_at ?? "(unknown)"}`,
    "",
    "Content:",
    memory.content,
    "",
    "Metadata:",
    JSON.stringify(memory.metadata ?? {}, null, 2),
  ];
  console.log(lines.join("\n"));
}

export function assertMemoryStatsShape(stats: unknown): LanMemoryStats {
  if (!stats || typeof stats !== "object") {
    throw new Error(
      "Stats endpoint returned an invalid response. Expected an object.",
    );
  }

  const typedStats = stats as Record<string, unknown>;
  if (typeof typedStats.total_memories !== "number") {
    throw new Error(
      "Stats endpoint returned an invalid response. Missing numeric total_memories.",
    );
  }

  const byType = typedStats.memories_by_type ?? typedStats.by_type;
  if (!byType || typeof byType !== "object" || Array.isArray(byType)) {
    throw new Error(
      "Stats endpoint returned an invalid response. Missing object memories_by_type or by_type.",
    );
  }

  for (const [key, value] of Object.entries(byType as Record<string, unknown>)) {
    if (typeof value !== "number") {
      throw new Error(
        `Stats endpoint returned an invalid response. by_type.${key} must be numeric.`,
      );
    }
  }

  if (
    typedStats.with_embeddings !== undefined &&
    typeof typedStats.with_embeddings !== "number"
  ) {
    throw new Error(
      "Stats endpoint returned an invalid response. with_embeddings must be numeric.",
    );
  }

  if (
    typedStats.without_embeddings !== undefined &&
    typeof typedStats.without_embeddings !== "number"
  ) {
    throw new Error(
      "Stats endpoint returned an invalid response. without_embeddings must be numeric.",
    );
  }

  if (typedStats.recent_activity !== undefined) {
    if (
      !typedStats.recent_activity ||
      typeof typedStats.recent_activity !== "object" ||
      Array.isArray(typedStats.recent_activity)
    ) {
      throw new Error(
        "Stats endpoint returned an invalid response. recent_activity must be an object.",
      );
    }

    for (const [key, value] of Object.entries(
      typedStats.recent_activity as Record<string, unknown>,
    )) {
      if (typeof value !== "number") {
        throw new Error(
          `Stats endpoint returned an invalid response. recent_activity.${key} must be numeric.`,
        );
      }
    }
  }

  if (typedStats.top_tags !== undefined) {
    if (
      !Array.isArray(typedStats.top_tags) ||
      typedStats.top_tags.some((entry) => {
        if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
          return true;
        }
        const typedEntry = entry as Record<string, unknown>;
        return (
          typeof typedEntry.tag !== "string" ||
          typeof typedEntry.count !== "number"
        );
      })
    ) {
      throw new Error(
        "Stats endpoint returned an invalid response. top_tags must be an array of { tag, count } objects.",
      );
    }
  }

  if (
    typedStats.storage !== undefined &&
    (!typedStats.storage ||
      typeof typedStats.storage !== "object" ||
      Array.isArray(typedStats.storage))
  ) {
    throw new Error(
      "Stats endpoint returned an invalid response. storage must be an object.",
    );
  }

  if (
    typedStats.organization_id !== undefined &&
    typeof typedStats.organization_id !== "string"
  ) {
    throw new Error(
      "Stats endpoint returned an invalid response. organization_id must be a string.",
    );
  }

  if (
    typedStats.generated_at !== undefined &&
    typeof typedStats.generated_at !== "string"
  ) {
    throw new Error(
      "Stats endpoint returned an invalid response. generated_at must be a string.",
    );
  }

  if (
    typedStats.total_topics !== undefined &&
    typeof typedStats.total_topics !== "number"
  ) {
    throw new Error(
      "Stats endpoint returned an invalid response. total_topics must be numeric.",
    );
  }

  if (
    typedStats.most_accessed_memory !== undefined &&
    typeof typedStats.most_accessed_memory !== "string"
  ) {
    throw new Error(
      "Stats endpoint returned an invalid response. most_accessed_memory must be a string.",
    );
  }

  if (
    typedStats.recent_memories !== undefined &&
    (!Array.isArray(typedStats.recent_memories) ||
      typedStats.recent_memories.some((entry) => typeof entry !== "string"))
  ) {
    throw new Error(
      "Stats endpoint returned an invalid response. recent_memories must be an array of strings.",
    );
  }

  return {
    total_memories: typedStats.total_memories,
    memories_by_type: byType as Record<string, number>,
    with_embeddings: typedStats.with_embeddings as number | undefined,
    without_embeddings: typedStats.without_embeddings as number | undefined,
    recent_activity: typedStats.recent_activity as
      | LanMemoryStats["recent_activity"]
      | undefined,
    top_tags: typedStats.top_tags as LanMemoryStats["top_tags"] | undefined,
    storage: typedStats.storage as Record<string, unknown> | undefined,
    organization_id: typedStats.organization_id as string | undefined,
    generated_at: typedStats.generated_at as string | undefined,
    total_topics: typedStats.total_topics as number | undefined,
    most_accessed_memory: typedStats.most_accessed_memory as string | undefined,
    recent_memories: typedStats.recent_memories as string[] | undefined,
  };
}

export function printMemoryStats(stats: LanMemoryStats): void {
  console.log(`Total memories: ${stats.total_memories}`);

  if (stats.organization_id) {
    console.log(`Organization: ${stats.organization_id}`);
  }

  if (stats.generated_at) {
    console.log(`Generated: ${stats.generated_at}`);
  }

  if (typeof stats.total_topics === "number") {
    console.log(`Total topics: ${stats.total_topics}`);
  }

  if (
    typeof stats.with_embeddings === "number" ||
    typeof stats.without_embeddings === "number"
  ) {
    console.log(
      `Embeddings: with=${stats.with_embeddings ?? 0}, without=${stats.without_embeddings ?? 0}`,
    );
  }

  console.log("");
  console.log("By type:");
  const byTypeEntries = Object.entries(stats.memories_by_type).sort(
    (a, b) => b[1] - a[1],
  );
  if (byTypeEntries.length === 0) {
    console.log("  (none)");
  } else {
    byTypeEntries.forEach(([type, count]) => {
      console.log(`  ${type.padEnd(12)}: ${count}`);
    });
  }

  if (stats.recent_activity) {
    console.log("");
    console.log("Recent activity (24h):");
    console.log(`  created : ${stats.recent_activity.created_last_24h ?? 0}`);
    console.log(`  updated : ${stats.recent_activity.updated_last_24h ?? 0}`);
    console.log(`  accessed: ${stats.recent_activity.accessed_last_24h ?? 0}`);
  }

  if (stats.most_accessed_memory) {
    console.log("");
    console.log(`Most accessed: ${stats.most_accessed_memory}`);
  }

  if (stats.recent_memories && stats.recent_memories.length > 0) {
    console.log("");
    console.log("Recent memories:");
    stats.recent_memories.forEach((entry) => {
      console.log(`  - ${entry}`);
    });
  }

  if (stats.top_tags && stats.top_tags.length > 0) {
    console.log("");
    console.log("Top tags:");
    stats.top_tags.forEach((entry) => {
      console.log(`  ${entry.tag}: ${entry.count}`);
    });
  }

  if (stats.storage && Object.keys(stats.storage).length > 0) {
    console.log("");
    console.log("Storage:");
    Object.entries(stats.storage).forEach(([key, value]) => {
      const rendered =
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
          ? String(value)
          : JSON.stringify(value);
      console.log(`  ${key}: ${rendered}`);
    });
  }
}

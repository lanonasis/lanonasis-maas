// Phase 4 - Recall Hook (updated Phase 2: cross-agent + Phase 3: profile mismatch)
import type { LanonasisClient, LanMemory, LanSearchParams } from "../client.js";
import type { LanonasisConfig } from "../config.js";
import { looksLikePromptInjection, formatRecalledMemories } from "../enrichment/prompt-safety.js";

/**
 * Check if a memory's embedding profile matches the current config.
 * Returns a warning string if mismatched, or undefined if OK.
 */
function detectProfileMismatch(memory: LanMemory, cfg: LanonasisConfig): string | undefined {
  if (!cfg.embeddingProfileId) return undefined;
  const storedProfile = (memory.metadata as Record<string, unknown> | undefined)?.embedding_profile_id;
  if (!storedProfile) return undefined;
  if (storedProfile === cfg.embeddingProfileId) return undefined;
  return `⚠ profile mismatch: stored=${storedProfile}, query=${cfg.embeddingProfileId}`;
}

/** Tag a recalled memory with its source layer for display */
function tagSource(m: LanMemory, source: "personal" | "shared"): LanMemory & { _recallSource: string } {
  return { ...m, _recallSource: source };
}

/**
 * Phase 2: Tiered recall with explicit fallback order.
 *
 * 1. Personal — search scoped to this agent's agentId
 * 2. Shared — search scoped to sharedNamespace (if configured)
 * 3. Deduplicate across tiers (by memory id)
 * 4. Cap to maxRecallResults
 *
 * If sharedNamespace is empty, recall behaves as before (single unscoped search).
 */
export async function tieredSearch(
  client: LanonasisClient,
  cfg: LanonasisConfig,
  query: string,
): Promise<(LanMemory & { _recallSource: string })[]> {
  const baseParams: LanSearchParams = {
    query,
    threshold: cfg.searchThreshold,
    limit: cfg.maxRecallResults,
  };

  // If no shared namespace is configured, do a single unscoped search (backwards compat)
  if (!cfg.sharedNamespace) {
    const results = await client.searchMemories(baseParams);
    return (results ?? []).map((m) => tagSource(m, "personal"));
  }

  // Tier 1: Personal recall — scoped to this agent
  const personalResults = await client.searchMemories({
    ...baseParams,
    metadata: { agent_id: cfg.agentId },
  });

  // Tier 2: Shared recall — scoped to shared namespace
  const sharedResults = await client.searchMemories({
    ...baseParams,
    metadata: { namespace: cfg.sharedNamespace },
  });

  // Deduplicate by id (personal takes priority)
  const seen = new Set<string>();
  const merged: (LanMemory & { _recallSource: string })[] = [];

  for (const m of personalResults ?? []) {
    if (!seen.has(m.id)) {
      seen.add(m.id);
      merged.push(tagSource(m, "personal"));
    }
  }

  for (const m of sharedResults ?? []) {
    if (!seen.has(m.id)) {
      seen.add(m.id);
      merged.push(tagSource(m, "shared"));
    }
  }

  // Sort by similarity descending, cap to limit
  merged.sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0));
  return merged.slice(0, cfg.maxRecallResults);
}

export function createRecallHook(
  client: LanonasisClient,
  cfg: LanonasisConfig,
) {
  return async (event: { prompt: string; messages?: unknown[] }): Promise<{ prependContext?: string } | void> => {
    try {
      // 1. Skip if prompt too short
      if (!event.prompt || event.prompt.length < 5) {
        return undefined;
      }

      // 2. Trim query: first 200 chars, drop punctuation-only lines
      const trimmedQuery = event.prompt
        .split("\n")
        .filter((l) => /\w/.test(l))
        .join(" ")
        .slice(0, 200)
        .trim() || event.prompt.slice(0, 200);

      // 3. Tiered search: personal → shared (5s timeout)
      const memories = await Promise.race([
        tieredSearch(client, cfg, trimmedQuery),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("recall timeout")), 5000)
        ),
      ]);

      // 4. If 0 results, return void
      if (!memories || memories.length === 0) {
        return undefined;
      }

      // 5. Filter out prompt injection attempts
      const filtered = memories.filter((m) => !looksLikePromptInjection(m.content));

      if (filtered.length === 0) {
        return undefined;
      }

      // 6. Annotate with profile mismatch and source, pass id + tags through
      const entries = filtered.map((m) => {
        const mismatch = detectProfileMismatch(m, cfg);
        const sourceTag = cfg.sharedNamespace ? ` [${m._recallSource}]` : "";
        return {
          title: `${m.title}${sourceTag}`,
          type: m.type,
          content: mismatch ? `${m.content}\n\n${mismatch}` : m.content,
          similarity: m.similarity,
          id: m.id,
          tags: m.tags,
        };
      });

      // 7. Format and return with strategy hint and char budget
      const formatted = formatRecalledMemories(entries, {
        recallStrategy: "semantic",
        maxChars: cfg.maxRecallChars,
      });
      return { prependContext: formatted };
    } catch (_err) {
      // Never throw - return void on error
      return undefined;
    }
  };
}

/**
 * memory_search.ts — local FTS5 search with best-effort MaaS enrichment.
 *
 * Contract (from brief, PR4 spec):
 *   - params: { query: string, limit?: number,
 *               target?: 'memory'|'user'|'project'|'failure',
 *               tags?: string[] }
 *   - details: { hits: MemoryHit[] }
 *
 * Lookup order: MemoryStore.search first. If local matches are fewer than
 * `limit` AND the MaaS sync adapter is enabled, also query MaaS. Merge and
 * dedupe by id; sort by score descending. MaaS calls are best-effort — they
 * NEVER throw to the caller; on failure we silently return the local hits.
 *
 * Post-merge PR5 will fill in `createMaasClient`. Until then the adapter
 * returns `enabled: false` and the MaaS branch is unreachable in the
 * stand-alone build.
 */

import { Type, type Static } from "typebox";
import type {
  AgentToolResult,
  ExtensionAPI,
  ExtensionContext,
} from "@earendil-works/pi-coding-agent";

import type { MemoryHit } from "../store/memory.js";
import type { MemoryStoreLike } from "../store/memory.js";
import type { MaaSAdapter, MaaSAdapter as _MaasAdapter } from "../deps.js";
import { err, ok } from "./tool-result.js";
import { debugLog } from "../debug.js";

export const memorySearchParams = Type.Object({
  query: Type.String({ minLength: 1 }),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100 })),
  target: Type.Optional(
    Type.Union([
      Type.Literal("memory"),
      Type.Literal("user"),
      Type.Literal("project"),
      Type.Literal("failure"),
    ]),
  ),
  tags: Type.Optional(Type.Array(Type.String())),
});

export type MemorySearchParams = Static<typeof memorySearchParams>;

export interface MemorySearchDetails {
  hits: MemoryHit[];
  query: string;
  source: "local" | "local+maas";
}

/** Pure search helper. Used by tool execute + tests. */
export async function searchMemory(
  store: MemoryStoreLike | null,
  maas: MaaSAdapter | _MaasAdapter,
  params: MemorySearchParams,
): Promise<MemorySearchDetails> {
  const limit = params.limit ?? 20;
  if (!store) {
    return { hits: [], query: params.query, source: "local" };
  }

  // Local FTS5 search first.
  const local: MemoryHit[] = store.search({
    query: params.query,
    limit,
    ...(params.target !== undefined
      ? { target: params.target as MemoryHit["target"] }
      : {}),
  });

  // Filter by tags if provided (in-memory filter — FTS5 doesn't natively
  // support tag filtering cheaply; the dataset is small enough).
  const filtered = params.tags
    ? local.filter((h) =>
        h.tags ? params.tags!.every((t) => h.tags!.includes(t)) : false,
      )
    : local;

  if (filtered.length >= limit || !maas.enabled) {
    return {
      hits: filtered.slice(0, limit),
      query: params.query,
      source: "local",
    };
  }

  // Best-effort MaaS enrichment to fill remaining slots.
  // The maas adapter's contract is "never throws", but if a stub
  // implementation misbehaves we degrade gracefully to local-only.
  const remaining = limit - filtered.length;
  let remote: Awaited<ReturnType<typeof maas.search>> = [];
  try {
    remote = await maas.search(params.query, remaining);
  } catch (e) {
    // Best-effort path: never let MaaS failures surface to the caller.
    debugLog("tools.memory_search.remote", e);
    remote = [];
  }

  const remoteAsHits: MemoryHit[] = remote.map((r) => ({
    id: r.id,
    target: "memory",
    category: null,
    title: r.title,
    content: r.content,
    score: r.score,
    tags: r.tags,
    created_at: new Date().toISOString(),
    matched_snippet: null,
  }));

  // Merge + dedupe on id; sort by score desc.
  const merged = mergeAndDedupe(filtered, remoteAsHits);
  const source: "local" | "local+maas" =
    remoteAsHits.length > 0 ? "local+maas" : "local";

  return {
    hits: merged.slice(0, limit),
    query: params.query,
    source,
  };
}

function mergeAndDedupe(a: MemoryHit[], b: MemoryHit[]): MemoryHit[] {
  const seen = new Set<string>();
  const out: MemoryHit[] = [];
  // Sort each side by score desc first.
  const sorted = [...a, ...b].sort((x, y) => y.score - x.score);
  for (const hit of sorted) {
    if (!seen.has(hit.id)) {
      seen.add(hit.id);
      out.push(hit);
    }
  }
  return out;
}

export function buildMemorySearchTool(input: {
  getStore: () => MemoryStoreLike | null;
  getMaas: () => MaaSAdapter;
}): {
  name: string;
  label: string;
  description: string;
  parameters: typeof memorySearchParams;
  execute: (
    toolCallId: string,
    params: MemorySearchParams,
    signal: AbortSignal | undefined,
    onUpdate: ((partial: AgentToolResult<MemorySearchDetails>) => void) | undefined,
    ctx: ExtensionContext,
  ) => Promise<AgentToolResult<MemorySearchDetails>>;
} {
  return {
    name: "memory_search",
    label: "memory_search",
    description:
      "Search the local memory store (FTS5). Best-effort MaaS enrichment when local matches < limit. Returns ranked hits.",
    parameters: memorySearchParams,
    async execute(
      _toolCallId,
      params,
      _signal,
      _onUpdate,
      ctx,
    ): Promise<AgentToolResult<MemorySearchDetails>> {
      try {
        const details = await searchMemory(
          input.getStore(),
          input.getMaas(),
          params,
        );
        const summary =
          details.hits.length === 0
            ? `no matches for "${details.query}"`
            : `${details.hits.length} hit(s) for "${details.query}" (source=${details.source})`;
        return ok(details, summary);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        ctx.ui.notify(`memory_search failed: ${msg}`, "error");
        return err(
          { hits: [], query: params.query, source: "local" as const },
          `error: ${msg}`,
        );
      }
    },
  };
}

export function registerMemorySearchTool(
  pi: ExtensionAPI,
  deps: { getStore: () => MemoryStoreLike | null; getMaas: () => MaaSAdapter },
): void {
  const tool = buildMemorySearchTool(deps);
  pi.registerTool(tool as Parameters<ExtensionAPI["registerTool"]>[0]);
}
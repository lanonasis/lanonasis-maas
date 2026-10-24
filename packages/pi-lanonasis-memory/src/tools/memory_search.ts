/**
 * memory_search.ts — local FTS5 search with best-effort MaaS enrichment.
 *
 * Contract (from brief, PR4 spec):
 *   - params: { query: string, limit?: number,
 *               target?: 'memory'|'user'|'project'|'failure',
 *               tags?: string[] }
 *   - details: { hits: MemoryHit[] }
 *
 * Dual-tier lookup (Phase 6):
 *   1. Local — MemoryStore.search. If it fills `limit`, return immediately.
 *   2. Remote — if the MaaS adapter is enabled, ask it for the remaining
 *      slots with the same target/tag filters, re-check those filters on
 *      the hits, and drop any remote hit that is a synced copy of a local
 *      one (matched by local id OR the local row's maas_id).
 *   3. Offline / failure — MaaS calls are best-effort and NEVER throw to
 *      the caller; we return whatever the local tier found, possibly [].
 *      No fallback guessing: an empty result is reported as empty.
 *
 * Local hits rank ahead of remote ones. Local scores are bucketed BM25 and
 * remote scores are cosine similarity, so sorting across tiers by raw score
 * would compare unlike quantities. Each hit carries `source`.
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
    remote = await maas.search(params.query, remaining, {
      ...(params.target !== undefined
        ? { target: params.target as MemoryHit["target"] }
        : {}),
      ...(params.tags ? { tags: params.tags } : {}),
    });
  } catch (e) {
    // Best-effort path: never let MaaS failures surface to the caller.
    debugLog("tools.memory_search.remote", e);
    remote = [];
  }

  const remoteAsHits: MemoryHit[] = remote
    // MaaS may ignore filters; re-check them so remote hits can't
    // smuggle in results the caller excluded.
    .filter((r) => params.target === undefined || r.target === params.target)
    .filter((r) => !params.tags || params.tags.every((t) => r.tags?.includes(t)))
    .map((r) => ({
      id: r.id,
      target: r.target ?? "memory",
      category: null,
      title: r.title,
      content: r.content,
      score: r.score,
      tags: r.tags,
      created_at: r.created_at ?? new Date().toISOString(),
      matched_snippet: null,
      source: "remote" as const,
    }));

  const merged = mergeLocalFirst(filtered, remoteAsHits);
  const source: "local" | "local+maas" = merged.some((h) => h.source === "remote")
    ? "local+maas"
    : "local";

  return {
    hits: merged.slice(0, limit),
    query: params.query,
    source,
  };
}

function mergeLocalFirst(local: MemoryHit[], remote: MemoryHit[]): MemoryHit[] {
  // A synced memory exists on both tiers under different ids; the local
  // row's maas_id is the link between them.
  const seen = new Set<string>();
  for (const hit of local) {
    seen.add(hit.id);
    if (hit.maas_id) seen.add(hit.maas_id);
  }
  const out = [...local].sort((x, y) => y.score - x.score);
  for (const hit of [...remote].sort((x, y) => y.score - x.score)) {
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
/**
 * maas-client.ts — wrapper around @lanonasis/memory-client/node.
 *
 * The wrapper exists for two reasons:
 *
 *   1. To keep the API key in exactly one place. The wrapper reads
 *      `LANONASIS_API_KEY` (and optionally `LANONASIS_API_URL`) from
 *      the environment, then NEVER logs it. The memory-client SDK
 *      sends the key in an `X-API-Key` header on every request; the
 *      wrapper does not inspect, persist, or print the key.
 *
 *   2. To normalise the SDK's `OperationResult<T>` shape into a
 *      flatter result that the sync worker can branch on. The worker
 *      only cares whether a write succeeded, returned a permanent 4xx,
 *      or returned a transient 5xx/408/429. The SDK's `OperationResult`
 *      splits `data` and `error` but does not surface the HTTP status
 *      code in a stable way across CLI vs API paths.
 *
 * The wrapper is async-by-design: `createNodeMemoryClient` performs
 * a CLI-detection round-trip on construction (or falls back to API
 * mode when the CLI is missing). Tests can pass an empty `LANONASIS_API_KEY`
 * to force the "no key" branch and observe `null` as the return value.
 */

import { createNodeMemoryClient } from "@lanonasis/memory-client/node";
import type {
  EnhancedMemoryClient,
  CreateMemoryRequest,
  MemoryEntry,
} from "@lanonasis/memory-client/node";

import type { MemoryTarget } from "../store/memory.js";
import type { MaasSearchFilters, MaasSearchHit } from "../deps.js";
import { redactContent } from "../scanner/redactor.js";
import { debugLog } from "../debug.js";

/** Local -> MaaS memory_type mapping (per PR5 contract). */
const TARGET_TO_MEMORY_TYPE: Record<MemoryTarget, CreateMemoryRequest["memory_type"]> = {
  user: "personal",
  project: "project",
  memory: "context",
  failure: "knowledge",
};

/** MaaS memory types — a closed enum; we don't add to it. */
export type MaaSMemoryType = CreateMemoryRequest["memory_type"];

export function mapTargetToMemoryType(target: MemoryTarget): MaaSMemoryType {
  return TARGET_TO_MEMORY_TYPE[target] ?? "context";
}

/**
 * MaaS -> local target. Inverse of TARGET_TO_MEMORY_TYPE; MaaS types we
 * never write (reference, workflow — created by other clients) land in
 * the general "memory" target.
 */
export function mapMemoryTypeToTarget(type: string | undefined): MemoryTarget {
  for (const [target, mapped] of Object.entries(TARGET_TO_MEMORY_TYPE)) {
    if (mapped === type) return target as MemoryTarget;
  }
  return "memory";
}

/**
 * Minimum similarity for a remote hit. Matches the SDK's schema default;
 * stated here so the request is explicit rather than relying on it.
 */
const REMOTE_SEARCH_THRESHOLD = 0.7;

/**
 * Remote search sits on the interactive path, but the SDK's request
 * defaults (30s timeout, 3 retries with backoff, then a second endpoint)
 * can hold a call for minutes when offline. Search gets its own deadline
 * (override: LANONASIS_REMOTE_SEARCH_TIMEOUT_MS) and, after a failure,
 * skips the remote tier for a cool-down so later searches answer from
 * local immediately instead of each paying the deadline again.
 */
const DEFAULT_REMOTE_SEARCH_DEADLINE_MS = 2_000;
const REMOTE_SEARCH_COOLDOWN_MS = 60_000;

/** Tag automatically appended to every synced memory for traceability. */
export const SOURCE_TAG = "source:pi-lanonasis-memory" as const;

/** Payload shape that flows from the queue to the wrapper. */
export interface MaaSCreatePayload {
  title: string;
  content: string;
  tags: string[];
  memory_type: MaaSMemoryType;
}

export interface MaaSUpdatePayload {
  title?: string;
  content?: string;
  tags?: string[];
  memory_type?: MaaSMemoryType;
}

/**
 * The minimal interface the sync worker needs. Tests inject a fake
 * that implements this; production uses `createRealMaasClient`.
 */
export interface MaasClient {
  /** Return true when the API is reachable AND authenticated. */
  health(): Promise<boolean>;
  /**
   * Create a memory. Returns the new MaaS id on success. On
   * failure, returns a discriminated union with a status code when
   * one is available.
   */
  create(payload: MaaSCreatePayload): Promise<
    | { ok: true; maasId: string }
    | { ok: false; status?: number; error: string }
  >;
  update(maasId: string, payload: MaaSUpdatePayload): Promise<
    | { ok: true; maasId: string }
    | { ok: false; status?: number; error: string }
  >;
  delete(maasId: string): Promise<
    | { ok: true; maasId: string }
    | { ok: false; status?: number; error: string }
  >;
  /**
   * Semantic search. Never throws — any failure returns []. Optional
   * so sync-only fakes don't have to implement it.
   */
  search?(query: string, limit: number, filters?: MaasSearchFilters): Promise<MaasSearchHit[]>;
}

const DEFAULT_API_URL = "https://api.lanonasis.com";

/**
 * Create a MaaS client. Returns `null` when the API key is missing
 * or empty — the sync worker treats this as "stay in the queue, do
 * not throw" per the LANA-2026-10-06 operator decision.
 *
 * Reads from the supplied `env` object (defaults to `process.env`).
 * The API key is forwarded to `createNodeMemoryClient` and is not
 * stored anywhere outside the SDK's internal client object.
 */
export async function createMaasClient(
  env: NodeJS.ProcessEnv = process.env,
): Promise<MaasClient | null> {
  const apiKey = (env?.LANONASIS_API_KEY ?? "").trim();
  if (apiKey.length === 0) return null;

  const apiUrl = (env?.LANONASIS_API_URL ?? "").trim() || DEFAULT_API_URL;

  // The EnhancedMemoryClient from memory-client does CLI detection on
  // construction. We disable the CLI path (preferCLI: false) because
  // it shell-interpolates title and content into `exec`, which is a
  // command-injection vector the sync layer cannot tolerate. The API
  // path uses fetch and our content-scan contract.
  //
  // We still allow MCP (enableMCP: true) since it provides
  // authentication context for the user — but only when the CLI is
  // installed and authenticated, which in practice means the
  // `enableMCP` flag is a no-op in headless environments.
  const sdk = await createNodeMemoryClient({
    apiUrl,
    apiKey,
    preferCLI: false,
    enableMCP: true,
    fallbackToAPI: true,
    verbose: false,
  });

  const deadline = Number(env?.LANONASIS_REMOTE_SEARCH_TIMEOUT_MS);
  return createRealMaasClient(sdk, {
    searchDeadlineMs:
      Number.isFinite(deadline) && deadline > 0 ? deadline : DEFAULT_REMOTE_SEARCH_DEADLINE_MS,
  });
}

function createRealMaasClient(
  sdk: EnhancedMemoryClient,
  opts: { searchDeadlineMs: number },
): MaasClient {
  let searchSkipUntil = 0;
  const failSearch = (reason: unknown): MaasSearchHit[] => {
    searchSkipUntil = Date.now() + REMOTE_SEARCH_COOLDOWN_MS;
    debugLog("sync.maas.search", reason);
    return [];
  };

  return {
    async health(): Promise<boolean> {
      try {
        const result = await sdk.healthCheck();
        return result.data?.status === "ok" && !result.error;
      } catch (err) {
        // Any transport failure means "offline" to the health monitor.
        debugLog("sync.maas.health", err);
        return false;
      }
    },

    async create(payload: MaaSCreatePayload) {
      try {
        const request: CreateMemoryRequest = {
          title: payload.title,
          content: payload.content,
          memory_type: payload.memory_type,
          tags: dedupTags([...(payload.tags ?? []), SOURCE_TAG]),
        };
        const result = await sdk.createMemory(request);
        return normaliseCreate(result, request);
      } catch (err) {
        return normaliseThrown(err);
      }
    },

    async update(maasId: string, payload: MaaSUpdatePayload) {
      try {
        const result = await sdk.updateMemory(maasId, {
          title: payload.title,
          content: payload.content,
          memory_type: payload.memory_type,
          tags: payload.tags ? dedupTags([...payload.tags, SOURCE_TAG]) : undefined,
        });
        return normaliseMutation(result, maasId);
      } catch (err) {
        return normaliseThrown(err);
      }
    },

    async delete(maasId: string) {
      try {
        const result = await sdk.deleteMemory(maasId);
        if (result.error) {
          return { ok: false as const, status: result.error.statusCode, error: result.error.message };
        }
        return { ok: true as const, maasId };
      } catch (err) {
        return normaliseThrown(err);
      }
    },

    async search(query: string, limit: number, filters?: MaasSearchFilters) {
      if (Date.now() < searchSkipUntil) return [];
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const timeout = new Promise<"timeout">((resolve) => {
          timer = setTimeout(() => resolve("timeout"), opts.searchDeadlineMs);
          (timer as { unref?: () => void }).unref?.();
        });
        const request = sdk.searchMemories({
          query,
          limit,
          threshold: REMOTE_SEARCH_THRESHOLD,
          status: "active",
          ...(filters?.target !== undefined
            ? {
                memory_types:
                  filters.target === "memory"
                    ? ["context", "reference", "workflow"]
                    : [mapTargetToMemoryType(filters.target)],
              }
            : {}),
          ...(filters?.tags && filters.tags.length > 0 ? { tags: filters.tags } : {}),
        });
        // NOTE: the timeout does NOT cancel this SDK request.
        // The `request` promise keeps running (the SDK may retry on the
        // primary endpoint, then fall back to a secondary endpoint).
        // We attach a no-op catch to prevent unhandled-rejection noise,
        // and race the timer only for *our* waiting — the abandoned
        // request settles on its own.  There is no cancellation contract
        // in place to stop fetches, retry delays, or fallbacks.
        request.catch(() => {});
        const result = await Promise.race([request, timeout]);
        if (result === "timeout") {
          return failSearch(`search exceeded ${opts.searchDeadlineMs}ms`);
        }
        if (result.error) return failSearch(result.error.message);
        if (!Array.isArray(result.data?.results)) return [];
        return result.data.results.map((r) => ({
          id: r.id,
          title: r.title ?? "",
          content: r.content ?? "",
          tags: Array.isArray(r.tags) ? r.tags : null,
          score: typeof r.similarity_score === "number" ? r.similarity_score : 0,
          target: mapMemoryTypeToTarget(r.memory_type),
          created_at: r.created_at,
        }));
      } catch (err) {
        return failSearch(err);
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

function normaliseCreate(
  result: { data?: MemoryEntry; error?: { message: string; statusCode?: number } },
  request: CreateMemoryRequest,
) {
  if (result.error) {
    return {
      ok: false as const,
      status: result.error.statusCode,
      error: scrubError(result.error.message, request),
    };
  }
  if (!result.data?.id) {
    return { ok: false as const, error: "create returned no memory id" };
  }
  return { ok: true as const, maasId: result.data.id };
}

function normaliseMutation(
  result: { data?: MemoryEntry; error?: { message: string; statusCode?: number } },
  maasId: string,
) {
  if (result.error) {
    return {
      ok: false as const,
      status: result.error.statusCode,
      error: result.error.message,
    };
  }
  return { ok: true as const, maasId: result.data?.id ?? maasId };
}

function normaliseThrown(err: unknown) {
  const e = err as { message?: string; statusCode?: number } | undefined;
  return {
    ok: false as const,
    status: e?.statusCode,
    error: e?.message ?? "unknown error",
  };
}

/**
 * Strip any string that LOOKS like a LanOnasis API key from an error
 * message before it is persisted. Belt-and-braces alongside the
 * queue's redactor; the worker logs should not leak the key.
 */
function scrubError(message: string, _request: CreateMemoryRequest): string {
  // The request itself never contains the API key. We re-run the
  // scanner's redactor on the message so the same regex set the
  // scanner uses is applied here. Defensive: the redactor is the
  // canonical secret-masker for this package.
  try {
    return redactContent(message).text;
  } catch {
    return message;
  }
}

function dedupTags(tags: string[]): string[] {
  return Array.from(new Set(tags));
}

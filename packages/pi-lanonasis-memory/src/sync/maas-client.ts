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

  return createRealMaasClient(sdk);
}

function createRealMaasClient(sdk: EnhancedMemoryClient): MaasClient {
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

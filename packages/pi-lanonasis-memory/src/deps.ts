/**
 * deps.ts — runtime dependency container shared by tools, commands, and the
 * extension factory.
 *
 * PR4 builds against the contracts pinned in the mission brief. PR1/2/3/5 are
 * open on origin and will land in sequence after PR4 is merged. To keep PR4
 * stand-alone (it must not import from the other PR branches), this module
 * resolves each dep either by `await import()` of the post-merge module
 * (`src/injection/system-prompt.js`, `src/sync/worker.js`, …) or, when the
 * module is missing, falls back to a no-op stub that satisfies the same shape.
 *
 * The container is created once per extension load and consumed by the tools,
 * commands, and the index.ts factory. After PR1/2/3/5 land on main, the
 * fallbacks become unreachable and the real implementations take over.
 */
import { join } from "node:path";
import { homedir } from "node:os";

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { MemoryStore } from "./store/memory.js";

/**
 * Storage root defaults from the brief. PR2 will resolve these from a
 * dedicated `storagePaths(home)` helper; for now we hard-code them so PR4
 * alone still opens the store correctly.
 */
export function defaultStorageRoot(home: string = homedir()): string {
  return join(home, ".pi", "agent", "lanonasis-pi-memory");
}

export function defaultDbPath(home: string = homedir()): string {
  return join(defaultStorageRoot(home), "memories.db");
}

export interface MaasClientLike {
  searchMemories(query: string, limit?: number): Promise<
    Array<{
      id: string;
      title: string;
      content: string;
      tags: string[] | null;
      score: number;
    }>
  >;
}

export interface SyncEnqueueLike {
  enqueue(input: {
    localId: string;
    op: "create" | "update" | "delete";
    payload: unknown;
    origin: "explicit" | "auto";
  }): void;
}

export interface SyncWorkerLike {
  start(): void;
  stop(): Promise<void>;
  flush(timeoutMs?: number): Promise<void>;
}

export interface StandingBlockInput {
  /** Standing instruction entries (small user-authored rules). */
  getStanding(): string[];
  /** Optional context entries for legacy-inject mode. */
  getContextEntries?(): string[];
}

export interface InjectionAdapter {
  /**
   * Register the `before_agent_start` hook that injects the memory policy
   * block (and standing instructions) into the system prompt. Returns
   * whatever the underlying hook returned so the caller can compose.
   */
  register(pi: ExtensionAPI, input: StandingBlockInput): () => void;
}

export interface CorrectionAdapter {
  /**
   * Register the on-the-fly correction detector. PR1 owns the real
   * implementation; PR4 falls back to a no-op so it loads standalone.
   */
  register(pi: ExtensionAPI): () => void;
}

export interface MirroredStoreLike {
  /** Underlying MemoryStore — used for queries, add/replace/remove with mirror side effects. */
  readonly store: MemoryStore;
}

/**
 * Try to dynamically import a module that lives in a path PR1/2/3/5 will
 * create. Returns `null` when the module cannot be loaded (file missing,
 * pre-merge, post-merge-but-not-yet-rebuilt). The call is wrapped in a
 * `try { await import(specifier) } catch {}` so it never throws.
 */
async function tryImport<T>(specifier: string): Promise<T | null> {
  try {
    const mod = await import(specifier);
    return mod as T;
  } catch {
    return null;
  }
}

/**
 * Resolve the injection adapter. When `src/injection/system-prompt.js` is
 * present (post PR3 merge) the real implementation is used; otherwise a
 * no-op adapter that registers a pass-through `before_agent_start` is
 * returned so the extension still loads.
 */
export async function resolveInjectionAdapter(): Promise<InjectionAdapter> {
  const mod = await tryImport<{
    registerSystemPromptInjection?: (
      pi: ExtensionAPI,
      input: StandingBlockInput,
    ) => () => void;
  }>("./injection/system-prompt.js");
  if (mod && typeof mod.registerSystemPromptInjection === "function") {
    return {
      register(pi, input) {
        return mod.registerSystemPromptInjection!(pi, input);
      },
    };
  }
  return {
    register(pi, _input) {
      // No-op fallback: do not inject anything. The function still returns
      // a noop disposer so callers can compose `() => off()` uniformly.
      return () => {};
    },
  };
}

/**
 * Resolve the correction-detection adapter. PR1 will own this; in the
 * stand-alone build the fallback is a no-op so the extension loads.
 */
export async function resolveCorrectionAdapter(): Promise<CorrectionAdapter> {
  // PR1 ships a `src/hooks/correction.ts` exporting
  // `registerCorrectionHook(pi, { getStore })`. Until that lands, fall back
  // to a no-op.
  const mod = await tryImport<{
    registerCorrectionHook?: (pi: ExtensionAPI) => () => void;
  }>("./hooks/correction.js");
  if (mod && typeof mod.registerCorrectionHook === "function") {
    return {
      register(pi) {
        return mod.registerCorrectionHook!(pi);
      },
    };
  }
  return {
    register(_pi) {
      return () => {};
    },
  };
}

/**
 * Resolve the sync worker adapter. PR5 ships `src/sync/worker.js` exporting
 * `createSyncWorker(...)` and `enqueueSync`. Until that lands, returns
 * null and the command/tool paths check for null and skip enqueue.
 */
export interface SyncAdapter {
  createWorker(): SyncWorkerLike | null;
  enqueue(input: {
    localId: string;
    op: "create" | "update" | "delete";
    payload: unknown;
    origin: "explicit" | "auto";
  }): void;
  start(): void;
  stop(): Promise<void>;
  flush(): Promise<void>;
  /** True when the worker is actually wired; false in the stand-alone build. */
  enabled: boolean;
}

export async function resolveSyncAdapter(
  _getStore: () => MemoryStore | null,
): Promise<SyncAdapter> {
  const workerMod = await tryImport<{
    createSyncWorker?: () => SyncWorkerLike | null;
  }>("./sync/worker.js");
  const queueMod = await tryImport<{
    enqueueSync?: (input: {
      localId: string;
      op: "create" | "update" | "delete";
      payload: unknown;
      origin: "explicit" | "auto";
    }) => void;
  }>("./sync/sync-queue.js");
  if (workerMod && typeof workerMod.createSyncWorker === "function") {
    return {
      enabled: true,
      createWorker() {
        return workerMod.createSyncWorker!();
      },
      enqueue(input) {
        if (typeof queueMod?.enqueueSync === "function") {
          queueMod.enqueueSync(input);
        }
      },
      start() {
        // Worker self-starts; nothing to do.
      },
      async stop() {
        // No-op; the real worker stops itself on session_shutdown.
      },
      async flush() {
        // No-op; the real worker flushes itself.
      },
    };
  }
  return {
    enabled: false,
    createWorker: () => null,
    enqueue: () => {},
    async start() {},
    async stop() {},
    async flush() {},
  };
}

/**
 * Resolve the Markdown mirror adapter. PR2 ships `src/store/mirror.ts`
 * exporting `createMirroredStore(store, paths)`. Until that lands we
 * return a plain passthrough so PR4 still loads.
 */
export async function resolveMirror(
  store: MemoryStore,
  _globalRoot: string,
): Promise<MirroredStoreLike> {
  const mirrorMod = await tryImport<{
    createMirroredStore?: (
      store: MemoryStore,
      paths: { globalRoot: string; projectRoot?: string },
    ) => MirroredStoreLike;
  }>("./store/mirror.js");
  if (mirrorMod && typeof mirrorMod.createMirroredStore === "function") {
    return mirrorMod.createMirroredStore(store, { globalRoot: _globalRoot });
  }
  // Fallback: bare store, no markdown side effects.
  return { store };
}

/**
 * Resolve the MaaS search adapter. PR5 ships `src/sync/maas-client.ts`
 * exporting `createMaasClient(env)` which wraps `@lanonasis/memory-client`.
 * Until that lands we return null so the search tool's best-effort MaaS
 * enrichment is simply skipped (never throws).
 */
export interface MaaSAdapter {
  enabled: boolean;
  search(
    query: string,
    limit: number,
  ): Promise<
    Array<{
      id: string;
      title: string;
      content: string;
      tags: string[] | null;
      score: number;
    }>
  >;
}

export async function resolveMaasAdapter(
  env: NodeJS.ProcessEnv = process.env,
): Promise<MaaSAdapter> {
  const mod = await tryImport<{
    createMaasClient?: (env: NodeJS.ProcessEnv) => MaasClientLike | null;
  }>("./sync/maas-client.js");
  if (mod && typeof mod.createMaasClient === "function") {
    const client = mod.createMaasClient(env);
    if (client) {
      return {
        enabled: true,
        async search(query, limit) {
          try {
            const hits = await client.searchMemories(query, limit);
            return hits;
          } catch {
            return [];
          }
        },
      };
    }
  }
  return {
    enabled: false,
    async search() {
      return [];
    },
  };
}

/** Re-export the helper to make the dependency container complete. */
export { MemoryStore };
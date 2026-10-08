/**
 * runtime.ts — wires the real on-main modules into the dependency surface
 * the tools and commands are written against.
 *
 * v1.0.1 motivation (LANA-2026-10-06-pi-memory-layer1): in v0.2.0,
 * `src/deps.ts` resolved peer-PR modules through `tryImport()` +
 * export-name lookups and fell back to no-ops on miss. After PRs #167-#172
 * merged, every lookup missed — the real modules export classes /
 * differently-named factories — so correction capture, the markdown mirror,
 * sync, and MaaS search were all silent no-ops at runtime.
 *
 * v1.0.1 deletes that indirection: this module statically imports the
 * production modules and composes them into `SyncAdapter`, `MaaSAdapter`,
 * and the per-session container the extension factory exposes.
 */

import { join } from "node:path";
import { mkdirSync } from "node:fs";

import { debugLog } from "./debug.js";

import { MemoryStore, type MemoryRecord } from "./store/memory.js";
import { MarkdownMirror, MirroredStore } from "./store/mirror.js";
import { resolveProject, bootstrapSoul } from "./store/project.js";
import { StandingStore } from "./store/standing.js";
import { storagePaths, type StoragePaths } from "./store/paths.js";

import { createCorrectionCapture, type CorrectionCaptureHooks } from "./hooks/correction.js";
import { buildIngestPipeline, type IngestHooks as IngestPipeline } from "./hooks/ingest.js";

import { registerSystemPromptInjection } from "./injection/system-prompt.js";

import { createMaasClient, type MaasClient } from "./sync/maas-client.js";
import { shouldSync } from "./sync/policy.js";
import { SyncQueue, type SyncQueueOptions } from "./sync/sync-queue.js";
import { SyncWorker, type SyncWorkerOptions } from "./sync/worker.js";
import { HealthMonitor } from "./sync/health.js";

import {
  DISABLED_MAAS,
  DISABLED_SYNC,
  type MaaSAdapter,
  type MaasSearchHit,
  type SyncAdapter,
  type SyncEnqueueInput,
  type SyncPruneCounts,
  type SyncStatus,
} from "./deps.js";

/**
 * Per-session container handed to tools and commands. Built by
 * `buildRuntime()` at session_start, torn down by `disposeRuntime()` at
 * session_shutdown.
 */
export interface Runtime {
  store: MirroredStore;
  standing: StandingStore;
  sync: SyncAdapter;
  maas: MaaSAdapter;
  correction: CorrectionCaptureHooks;
  /** Register the before_agent_start handler that injects the memory block. */
  injection: (pi: Parameters<typeof registerSystemPromptInjection>[0]) => () => void;
  /** Best-effort bounded flush, used by session_shutdown. */
  shutdown: (timeoutMs?: number) => Promise<{ pushed: number }>;
  /** Storage layout the runtime is using (test-inspection surface). */
  paths: StoragePaths;
  /** Underlying MaaS client (test-inspection surface). */
  rawMaasClient: MaasClient | null;
  ingestPipeline: IngestPipeline;
}

export interface BuildRuntimeOptions {
  /** Override HOME-derived layout. Defaults to `storagePaths()`. */
  paths?: StoragePaths;
  /**
   * Project root for the markdown mirror. When omitted, resolved from the
   * session cwd via `resolveProject`.
   */
  projectRoot?: string;
  /** Session cwd, used to resolve the project slug and SOUL bootstrap. */
  cwd?: string;
  /** Maximum queue depth (default 10_000, see sync-queue.ts). */
  maxQueueDepth?: number;
  /** Override env reading (used by tests). */
  env?: NodeJS.ProcessEnv;
  /**
   * Override the MaaS client factory. Defaults to `createMaasClient(env)`.
   * Returns `null` when no API key is set.
   */
  maasFactory?: (env: NodeJS.ProcessEnv) => Promise<MaasClient | null>;
  /**
   * Override queue construction. Defaults to `SyncQueue.open(...)`. The
   * runtime-wiring test uses this to swap in a counter for assertions.
   */
  queueFactory?: (dbPath: string, opts?: SyncQueueOptions) => Promise<SyncQueue>;
  /**
   * Resolve a remote MaaS id for a local id (worker update/delete). Defaults
   * to reading the MemoryRecord.maas_id straight from the store.
   */
  resolveRemoteId?: (localId: string) => string | null;
  /**
   * Override the shutdown flush timeout. Defaults to 5 seconds.
   */
  shutdownTimeoutMs?: number;
  /**
   * Skip the SOUL.md bootstrap pass. Production defaults to false.
   * Tests default to true (no SOUL.md exists in the test cwd).
   */
  skipSoulBootstrap?: boolean;
}

/** Default shutdown timeout, exported for tests that want to assert it. */
export const DEFAULT_SHUTDOWN_TIMEOUT_MS = 5000;

export async function buildRuntime(opts: BuildRuntimeOptions = {}): Promise<Runtime> {
  const env = opts.env ?? process.env;
  const paths = opts.paths ?? storagePaths();
  const projectSlug =
    opts.projectRoot !== undefined
      ? undefined
      : opts.cwd
        ? (resolveProject(opts.cwd)?.slug ?? undefined)
        : undefined;
  const projectRoot =
    opts.projectRoot ?? (projectSlug ? join(paths.projectsRoot, projectSlug) : undefined);

  // Ensure the SQLite parent directories are in place. node:sqlite will
  // not auto-create them, and `~/.pi/agent/lanonasis-pi-memory/` is
  // three levels deep. We tolerate ENOENT on the sync side too.
  mkdirSync(join(paths.dbPath, ".."), { recursive: true });
  mkdirSync(join(paths.syncDbPath, ".."), { recursive: true });

  const store = await MemoryStore.open(paths.dbPath);
  const mirror = new MarkdownMirror({ globalRoot: paths.globalRoot, projectRoot });
  const mirrored = new MirroredStore(store, mirror);
  const standing = new StandingStore(paths.globalRoot);

  // MaaS: ask the factory for the real client. createMaasClient returns
  // null when LANONASIS_API_KEY is empty — sync then degrades to "stay in
  // queue, never throw", per LANA-2026-10-06 operator decision.
  const maasClient = opts.maasFactory
    ? await opts.maasFactory(env)
    : await createMaasClient(env);

  const maasAdapter: MaaSAdapter = maasClient
    ? {
        enabled: true,
        async search(query, limit): Promise<MaasSearchHit[]> {
          try {
            const client = maasClient as MaasClient & {
              searchMemories?: (q: string, l: number) => Promise<unknown>;
            };
            if (typeof client.searchMemories !== "function") return [];
            const res = await client.searchMemories(query, limit);
            if (!Array.isArray(res)) return [];
            return (res as Array<Record<string, unknown>>).map((r) => ({
              id: String(r.id ?? ""),
              title: String(r.title ?? ""),
              content: String(r.content ?? ""),
              tags: Array.isArray(r.tags) ? (r.tags as string[]) : null,
              score: typeof r.score === "number" ? r.score : 0,
            }));
          } catch (err) {
            // Remote enrichment is optional; local results still stand.
            debugLog("runtime.maas.search", err);
            return [];
          }
        },
      }
    : DISABLED_MAAS;

  // SyncQueue + SyncWorker: only when a MaaS client is available. Without
  // one the queue would just grow forever; we keep the contract symmetric
  // (enqueue is always callable, never throws).
  let sync: SyncAdapter = DISABLED_SYNC;
  let rawSyncQueue: SyncQueue | null = null;
  let rawSyncWorker: SyncWorker | null = null;
  let rawHealthMonitor: HealthMonitor | null = null;

  if (maasClient) {
    const queue = opts.queueFactory
      ? await opts.queueFactory(paths.syncDbPath, { maxDepth: opts.maxQueueDepth })
      : await SyncQueue.open(paths.syncDbPath, { maxDepth: opts.maxQueueDepth });
    rawSyncQueue = queue;
    const health = new HealthMonitor({
      client: maasClient,
      intervalMs: 60_000,
      getDepth: () => queue.depth(),
    });
    rawHealthMonitor = health;
    const resolveRemoteId =
      opts.resolveRemoteId ??
      ((localId: string) => store.get(localId)?.maas_id ?? null);
    const workerOptions: SyncWorkerOptions = {
      queue,
      client: maasClient,
      health,
      onSynced: (localId, maasId) => {
        try {
          store.markSynced(localId, maasId);
        } catch (err) {
          debugLog("runtime.sync.markSynced", err);
          // Store may already be closed — tolerate it; the next session
          // opens the same row and the MaaS-side id survives.
        }
      },
      resolveRemoteId,
    };
    const worker = new SyncWorker(workerOptions);
    rawSyncWorker = worker;
    health.start();
    worker.start();
    sync = {
      enabled: true,
      enqueue(input: SyncEnqueueInput): void {
        if (!shouldSync(input.origin, env)) return;
        // The runtime is the only place that decides whether a record
        // gets pushed; tools and commands emit intents and we apply the
        // policy. Read the post-scan record from the store so the
        // payload matches what's in SQLite (never the caller's raw text).
        if (input.op === "delete") {
          const maasId = (input.payload as { maasId?: string } | undefined)?.maasId;
          try {
            queue.enqueue({
              localId: input.localId,
              op: "delete",
              payload: { title: "", content: "", tags: [], type: "memory", maasId },
              origin: input.origin,
            });
          } catch (err) {
            // Delete propagation is best-effort; the local row is already gone.
            debugLog("runtime.sync.enqueueDelete", err);
          }
          return;
        }
        const record: MemoryRecord | null = store.get(input.localId);
        if (!record) {
          // The store rejected the row (scanner block, validation). Do
          // not enqueue; the user already got a tool error.
          return;
        }
        try {
          queue.enqueue({
            localId: input.localId,
            op: input.op,
            payload: {
              title: record.title,
              content: record.content,
              tags: record.tags ?? [],
              type: record.target,
              maasId: record.maas_id ?? undefined,
            },
            origin: input.origin,
          });
        } catch (err) {
          // queue.enqueue throws only on a JSON.stringify failure; tolerate.
          debugLog("runtime.sync.enqueue", err);
        }
      },
      async status(): Promise<SyncStatus> {
        // Best-effort reachability: we do not await a probe (would block
        // /memory-sync status). report the cached online flag.
        return {
          depth: queue.depth(),
          dropped: queue.droppedCount(),
          maxDepth: queue.maxDepth,
          online: health.isOnline(),
          clientConfigured: true,
        };
      },
      prune({ olderThanDays, dropped }): SyncPruneCounts {
        const r = queue.prune({
          ...(olderThanDays !== undefined ? { olderThanDays } : {}),
          ...(dropped === true ? { dropped: true } : {}),
        });
        return { queued: r.queued, dropped: r.dropped };
      },
    };
  }

  const correction = createCorrectionCapture(() => mirrored as unknown as MemoryStore);

  const ingestPipeline = buildIngestPipeline(() => mirrored as unknown as MemoryStore, {
    target: "user",
    enabled: true,
    sessionTag: opts.cwd ? `session:${opts.cwd.split("/").pop() ?? opts.cwd}` : undefined,
    // Forward every successful auto-capture to the sync adapter. The
    // adapter applies `shouldSync(origin)` and the queue's depth cap, so
    // AUTO_SYNC=0 (the operator default) leaves auto-captures local-only.
    onWrite: (_input, id) => {
      try {
        sync.enqueue({ localId: id, op: "create", origin: "auto" });
      } catch (err) {
        // never break the ingest loop
        debugLog("runtime.ingest.onWrite", err);
      }
    },
  });

  const shutdownTimeoutMs = opts.shutdownTimeoutMs ?? DEFAULT_SHUTDOWN_TIMEOUT_MS;
  const shutdown = async (timeoutMs: number = shutdownTimeoutMs): Promise<{ pushed: number }> => {
    let pushed = 0;
    if (rawSyncWorker && rawSyncQueue) {
      try {
        pushed = await rawSyncWorker.flush(timeoutMs);
      } catch {
        // best-effort
      }
      try {
        await rawSyncWorker.stop();
      } catch {
        // best-effort
      }
    }
    if (rawHealthMonitor) {
      try {
        rawHealthMonitor.stop();
      } catch {
        // best-effort
      }
    }
    if (rawSyncQueue) {
      try {
        rawSyncQueue.close();
      } catch {
        // best-effort
      }
    }
    try {
      store.close();
    } catch {
      // best-effort
    }
    return { pushed };
  };

  // SOUL.md bootstrap (operator kept it in scope per the final report).
  // We let any failure land as a swallowed error so an unparsable SOUL.md
  // does not break session_start.
  if (!opts.skipSoulBootstrap && opts.cwd && projectRoot !== undefined) {
    try {
      bootstrapSoul(projectRoot, opts.cwd, store);
    } catch (err) {
      // Never block session_start on an unparsable SOUL.md (see above).
      debugLog("runtime.bootstrapSoul", err);
    }
  }

  const injection = (pi: Parameters<typeof registerSystemPromptInjection>[0]): (() => void) => {
    return registerSystemPromptInjection(pi, {
      getStanding: () => standing.list(),
    });
  };

  return {
    store: mirrored,
    standing,
    sync,
    maas: maasAdapter,
    correction,
    injection,
    shutdown,
    paths,
    rawMaasClient: maasClient,
    ingestPipeline,
  };
}
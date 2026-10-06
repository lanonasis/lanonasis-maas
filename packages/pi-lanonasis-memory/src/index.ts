/**
 * @lanonasis/pi-lanonasis-memory
 *
 * Pi extension wiring Layer-1 PR4 — tools, slash commands, and the
 * ExtensionAPI lifecycle that integrates with PR1/2/3/5 via stand-alone
 * adapters. See `src/deps.ts` for the adapter pattern: each dependency on
 * a peer PR is resolved at runtime; when the peer PR's module is not
 * present (pre-merge), a no-op fallback is used so PR4 still loads.
 *
 * Lifecycle (single session):
 *   session_start     → open MemoryStore (PR3 mirror; PR4 schema)
 *   turn_end               → existing PR1 ingest pipeline (already in main)
 *   before_agent_start → PR3 injection adapter (no-op pre-merge)
 *   tool_call/input     → PR1 correction adapter (no-op pre-merge)
 *   session_shutdown → flush SyncWorker (no-op pre-merge) + close store
 *
 * Tool surface (PR4 ships four):
 *   memory_add, memory_search, memory_replace, memory_remove
 *
 * Slash commands (PR4 ships seven):
 *   /memory, /reflect, /memory-save, /memory-skills, /memory-pin,
 *   /memory-preview-context, /memory-interview, /memory-index-sessions
 *
 * Stand-alone contract: PR4 alone must `npm install` and load in Pi without
 * the peer PRs. The adapter pattern in deps.ts makes that possible.
 */

import { join } from "node:path";
import { homedir } from "node:os";
import { mkdirSync } from "node:fs";

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

import {
  MemoryStore,
  defaultStorageRoot,
  defaultDbPath,
  resolveInjectionAdapter,
  resolveCorrectionAdapter,
  resolveSyncAdapter,
  resolveMirror,
  resolveMaasAdapter,
  type InjectionAdapter,
  type CorrectionAdapter,
  type SyncAdapter,
  type MaaSAdapter,
  type MirroredStoreLike,
} from "./deps.js";
import {
  scanForWrite,
  scanSecretsOnly,
  defaultScannerConfig,
  type ScannerConfig,
  type ScannerDecision,
} from "./scanner/scanner.js";
import { SCHEMA_VERSION } from "./store/schema.js";
import { buildIngestPipeline, type IngestConfig } from "./hooks/ingest.js";
import {
  registerMemoryAddTool,
  registerMemorySearchTool,
  registerMemoryReplaceTool,
  registerMemoryRemoveTool,
} from "./tools/index.js";
import {
  registerAllCommands,
  type CommandDeps,
} from "./commands/index.js";

export interface ExtensionContextLike {
  ui: {
    notify(message: string, level?: "info" | "warn" | "error"): void;
  };
}

export {
  scanForWrite,
  scanSecretsOnly,
  defaultScannerConfig,
  MemoryStore,
  SCHEMA_VERSION,
};
export type { ScannerConfig, ScannerDecision, IngestConfig };

/**
 * Default store path — one store per user, scoped to this extension.
 * Mirrors the original Phase 1 default but uses the brief's storage root.
 */
const DEFAULT_STORE_PATH = defaultDbPath();
const DEFAULT_STORAGE_ROOT = defaultStorageRoot();

/**
 * Container held for the lifetime of the Pi session. Built at session_start
 * (so async store-open + closed init happen before commands fire) and torn
 * down at session_shutdown.
 */
interface SessionContainer {
  store: MemoryStore | null;
  mirror: MirroredStoreLike | null;
  sync: SyncAdapter;
  maas: MaaSAdapter;
  injection: InjectionAdapter;
  correction: CorrectionAdapter;
  commandDeps: CommandDeps;
}

/**
 * Lazily resolve the per-session container. The first call awaits the
 * store open; subsequent calls return the cached container. Tests can
 * pre-fill the cache by passing a session into `installForTest`, or
 * clear it with `resetForTests()`.
 */
let cachedSession: SessionContainer | null = null;

/**
 * Test-only: clear the cached session container so a subsequent
 * `session_start` fires a fresh open. Exported as `__resetForTests` to
 * keep the surface tiny. Not part of the runtime API.
 */
export function __resetForTests(): void {
  cachedSession = null;
}

export default async function extension(pi: ExtensionAPI): Promise<void> {
  // Adapters that don't need the store — resolved immediately.
  const maas = await resolveMaasAdapter();
  const injection = await resolveInjectionAdapter();
  const correction = await resolveCorrectionAdapter();

  /**
   * Build the command dependency container that every PR4 command and
   * tool consumes. All accessors are lazy so the order of side-effects
   * during session_start doesn't matter.
   */
  function buildCommandDeps(): CommandDeps {
    const sync = resolveSyncAdapterSync();
    return {
      getStore: () => cachedSession?.store ?? null,
      getMirror: () => cachedSession?.mirror ?? null,
      getMaas: () => maas,
      getSync: () => sync,
      getInjection: () => injection,
      getCorrection: () => correction,
    };
  }

  /** Lazy sync adapter — resolved once per session when first accessed. */
  let syncCache: SyncAdapter | null = null;
  function resolveSyncAdapterSync(): SyncAdapter {
    if (syncCache) return syncCache;
    // Synchronous fallback: stand-alone build returns the no-op.
    syncCache = {
      enabled: false,
      createWorker: () => null,
      enqueue: () => {},
      async start() {},
      async stop() {},
      async flush() {},
    };
    return syncCache;
  }

  // Register tools and commands eagerly (Pi binds registrations immediately
  // and resolves parameters at call time, so this is safe before the
  // store is open).
  const cmdDeps = buildCommandDeps();
  registerAllCommands(pi, cmdDeps);
  registerMemoryAddTool(pi, cmdDeps);
  registerMemorySearchTool(pi, cmdDeps);
  registerMemoryReplaceTool(pi, cmdDeps);
  registerMemoryRemoveTool(pi, cmdDeps);

  // Register correction hook (PR1 contract; no-op until PR1 lands).
  correction.register(pi);

  // Build the ingest pipeline from PR1 — already in main.
  const ingestConfig: IngestConfig = {
    target: "user",
    enabled: true,
    sessionTag: undefined,
  };
  const pipeline = buildIngestPipeline(() => cachedSession?.store ?? null, ingestConfig);

  pi.on("session_start", async (event, ctx) => {
    if (cachedSession) return; // already initialized this session

    const cwd = (ctx as { cwd?: string }).cwd ?? "";
    const sessionTag = cwd
      ? `session:${cwd.split("/").pop() ?? cwd}`
      : undefined;
    ingestConfig.sessionTag = sessionTag;

    try {
      mkdirSync(join(DEFAULT_STORE_PATH, ".."), { recursive: true });
      const store = await MemoryStore.open(DEFAULT_STORE_PATH);
      const mirror = await resolveMirror(store, DEFAULT_STORAGE_ROOT);
      const sync = await resolveSyncAdapter(() => store);
      sync.start();
      cachedSession = {
        store,
        mirror,
        sync,
        maas,
        injection,
        correction,
        commandDeps: cmdDeps,
      };
      // Register injection adapter (post-merge per session_start contract).
      injection.register(pi, {
        getStanding: () => [], // PR3 will wire standing entries; empty pre-merge
        getContextEntries: () => [], // PR3 will wire; empty pre-merge
      });
      await pipeline.onSessionStart(event, ctx);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      (ctx as { ui?: { notify?: (m: string, l?: string) => void } }).ui?.notify?.(
        `[pi-lanonasis-memory] Failed to open store: ${msg}`,
        "error",
      );
    }
  });

  pi.on("turn_end", async (event, ctx) => {
    if (!cachedSession?.store) return;
    await pipeline.onTurnEnd(event, ctx);
  });

  pi.on("session_shutdown", async (event, ctx) => {
    const session = cachedSession;
    cachedSession = null;
    if (!session) return;

    try {
      await session.sync.flush();
      await session.sync.stop();
    } catch {
      // best-effort
    }

    try {
      await pipeline.onSessionShutdown(event, ctx);
    } catch {
      // best-effort
    }

    try {
      session.store?.close();
    } catch {
      // best-effort checkpoint
    }
  });
}

// Re-exports for downstream consumers.
export { registerEchoCommand } from "./commands/echo.js";
export {
  registerAllCommands,
} from "./commands/index.js";
export {
  registerMemoryAddTool,
  registerMemorySearchTool,
  registerMemoryReplaceTool,
  registerMemoryRemoveTool,
} from "./tools/index.js";

// Re-export the homedir so tests can stub it.
export { homedir, join };

// Re-export the default store path so the smoke test can verify it.
export const DEFAULT_DB_PATH = DEFAULT_STORE_PATH;
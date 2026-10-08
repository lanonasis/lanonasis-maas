/**
 * @lanonasis/pi-lanonasis-memory
 *
 * Pi extension wiring the real, on-main modules into a session. v1.0.1
 * replaces v0.2.0's `tryImport()` adapter indirection (which silently
 * fell back to no-ops after PRs #167-#172 merged) with a direct
 * dependency on `src/runtime.ts`, which statically composes:
 *
 *   - MarkdownMirror + MirroredStore (PR2)
 *   - createCorrectionCapture (PR1)
 *   - registerSystemPromptInjection (PR3)
 *   - SyncQueue + HealthMonitor + SyncWorker + createMaasClient (PR5)
 *   - bootstrapSoul for SOUL.md (PR2)
 *
 * Lifecycle (single session):
 *   session_start     → buildRuntime(); ingest.onSessionStart()
 *   input             → correction.onInput (sets pending flag; NEVER persists user text)
 *   turn_end          → ingest.onTurnEnd, then correction.onTurnEnd
 *   before_agent_start → injection.register(pi, { getStanding })
 *   session_shutdown  → flush worker (5s) → stop worker/health/queue/store
 *
 * Surface shipped:
 *   tools     — memory_add, memory_search, memory_replace, memory_remove
 *   commands  — /memory, /memory-save, /reflect, /memory-skills,
 *               /memory-pin, /memory-preview-context, /memory-interview,
 *               /memory-index-sessions, /memory-sync
 *
 * Test seam: `__setRuntimeForTest(factory)` lets the runtime-wiring suite
 * substitute the queue factory / MaaS factory / skipSoulBootstrap. The
 * default `extension()` call does not touch the seam.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

import { buildRuntime, type BuildRuntimeOptions, type Runtime } from "./runtime.js";
import { scanForWrite, scanSecretsOnly, defaultScannerConfig } from "./scanner/scanner.js";
import { MemoryStore } from "./store/memory.js";
import { SCHEMA_VERSION } from "./store/schema.js";
import type { CommandDeps } from "./commands/types.js";
import { registerAllCommands } from "./commands/index.js";
import {
  registerMemoryAddTool,
  registerMemorySearchTool,
  registerMemoryReplaceTool,
  registerMemoryRemoveTool,
} from "./tools/index.js";

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

/**
 * Container held for the lifetime of the Pi session. Built at session_start
 * (so async store-open + closed init happen before commands fire) and torn
 * down at session_shutdown.
 */
interface SessionContainer {
  runtime: Runtime;
  deps: CommandDeps;
  unsubscribeInjection?: () => void;
}

let cachedSession: SessionContainer | null = null;

type RuntimeFactory = (cwd: string) => Promise<Runtime>;

/**
 * Test seam: replace the runtime factory used by `extension()`. Production
 * passes nothing and gets the default `buildRuntime` call. The
 * runtime-wiring test uses this seam so it can run in a sandboxed HOME.
 */
let testRuntimeFactory: RuntimeFactory | null = null;
export function __setRuntimeForTest(factory: RuntimeFactory | null): void {
  testRuntimeFactory = factory;
}

/** Test-only: drop the cached container so a subsequent session_start rebuilds. */
export function __resetForTests(): void {
  cachedSession = null;
}

export default async function extension(pi: ExtensionAPI): Promise<void> {
  /**
   * Build the command dependency container. All accessors are lazy so the
   * order of side-effects during session_start doesn't matter.
   */
  const buildCommandDeps = (): CommandDeps => ({
    getStore: () => cachedSession?.runtime.store ?? null,
    getMirror: () =>
      cachedSession ? { store: cachedSession.runtime.store } : null,
    getMaas: () =>
      cachedSession?.runtime.maas ?? {
        enabled: false,
        async search() {
          return [];
        },
      },
    getSync: () =>
      cachedSession?.runtime.sync ?? {
        enabled: false,
        enqueue: () => {},
      },
    getInjection: () => ({
      register: () => () => {},
    }),
    getCorrection: () => ({
      register: () => () => {},
    }),
  });

  // Register tools and commands eagerly (Pi binds registrations immediately
  // and resolves parameters at call time, so this is safe before the
  // store is open).
  const initialDeps = buildCommandDeps();
  registerAllCommands(pi, initialDeps);
  registerMemoryAddTool(pi, initialDeps);
  registerMemorySearchTool(pi, initialDeps);
  registerMemoryReplaceTool(pi, initialDeps);
  registerMemoryRemoveTool(pi, initialDeps);

  pi.on("session_start", async (event, ctx) => {
    if (cachedSession) return;
    const ctxCwd = (ctx as { cwd?: string }).cwd ?? "";
    try {
      const runtime = testRuntimeFactory
        ? await testRuntimeFactory(ctxCwd)
        : await buildRuntimeForCwd(ctxCwd);
      const deps = buildCommandDeps();
      cachedSession = { runtime, deps, unsubscribeInjection: undefined };
      cachedSession.unsubscribeInjection = runtime.injection(pi);
      await runtime.ingestPipeline.onSessionStart(event, ctx);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      (ctx as { ui?: { notify?: (m: string, l?: string) => void } }).ui?.notify?.(
        `[pi-lanonasis-memory] Failed to open store: ${msg}`,
        "error",
      );
    }
  });

  pi.on("input", async (event, _ctx) => {
    if (!cachedSession?.runtime) return;
    cachedSession.runtime.correction.onInput(
      event as { type: "input"; text?: string; source?: string },
    );
  });

  pi.on("turn_end", async (event, ctx) => {
    if (!cachedSession?.runtime) return;
    try {
      await cachedSession.runtime.ingestPipeline.onTurnEnd(event, ctx);
    } catch {
      // ingest never throws, but belt and braces
    }
    try {
      await cachedSession.runtime.correction.onTurnEnd(
        event as { type: "turn_end"; message?: unknown },
      );
    } catch {
      // same
    }
  });

  pi.on("session_shutdown", async (event, ctx) => {
    const session = cachedSession;
    cachedSession = null;
    if (!session) return;
    try {
      session.unsubscribeInjection?.();
    } catch {
      // best-effort
    }
    try {
      await session.runtime.ingestPipeline.onSessionShutdown(event, ctx);
    } catch {
      // best-effort
    }
    try {
      await session.runtime.shutdown();
    } catch {
      // best-effort
    }
  });
}

/**
 * Wrapper used by the extension factory and the test seam. Production
 * reads `process.env` and the real HOME; tests can override via
 * `__setRuntimeForTest`.
 */
async function buildRuntimeForCwd(cwd: string): Promise<Runtime> {
  const opts: BuildRuntimeOptions = { cwd };
  return buildRuntime(opts);
}

// Re-exports for downstream consumers and test surface.
export { registerEchoCommand } from "./commands/echo.js";
export { registerAllCommands } from "./commands/index.js";
export {
  registerMemoryAddTool,
  registerMemorySearchTool,
  registerMemoryReplaceTool,
  registerMemoryRemoveTool,
} from "./tools/index.js";
export { buildRuntime, type Runtime, type BuildRuntimeOptions } from "./runtime.js";
export type {
  MaaSAdapter,
  SyncAdapter,
  MaasSearchHit,
  SyncEnqueueInput,
  SyncStatus,
  SyncPruneCounts,
  MirroredStoreLike,
} from "./deps.js";
/**
 * @lanonasis/pi-lanonasis-memory
 *
 * Pi extension that brings LanOnasis MaaS persistent memory into a Pi session.
 *
 * Phase 6 wires the local SQLite FTS5 store into Pi's lifecycle hooks so
 * session content is automatically classified and persisted without requiring
 * a slash command. Phases 1-5 built the foundation:
 *
 *   - Phase 1: Extension loads, /echo command works
 *   - Phase 2: Pre-write scanner (39+ rules, block/redact modes)
 *   - Phase 3: Local SQLite FTS5 store with scanner gating
 *   - Phase 4: Markdown mirror (MEMORY.md / USER.md) ← reserved
 *   - Phase 5: MaaS background sync ← reserved columns exist
 *   - Phase 6: Hook ingestion (this file)
 *
 * Hooks wired in Phase 6:
 *   `session_start`     — open the store, register session tag
 *   `turn_end`         — classify assistant responses, store actionable facts
 *   `session_shutdown` — checkpoint WAL, close store
 *
 * Why this lives at packages/pi-lanonasis-memory/ rather than apps/:
 *   Pi extensions are packages, not apps. The Pi loader expects either a
 *   `package.json` declaring `{"pi":{"extensions":["./src/index.ts"]}}` or a
 *   hand-written `pi-extension.json` pointing at the same entry. We ship both
 *   so users get dual install paths (`npm install` or `pi install <path>`).
 */

import { join } from "node:path";
import { homedir } from "node:os";
import { mkdirSync } from "node:fs";

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { registerEchoCommand } from "./commands/echo.js";
import {
  scanForWrite,
  scanSecretsOnly,
  defaultScannerConfig,
  type ScannerConfig,
  type ScannerDecision,
} from "./scanner/scanner.js";
import { MemoryStore } from "./store/memory.js";
import { SCHEMA_VERSION } from "./store/schema.js";
import {
  buildIngestPipeline,
  type IngestConfig,
} from "./hooks/ingest.js";

export interface ExtensionContextLike {
  ui: {
    notify(message: string, level?: "info" | "warn" | "error"): void;
  };
}

export { scanForWrite, scanSecretsOnly, defaultScannerConfig, MemoryStore, SCHEMA_VERSION };
export type { ScannerConfig, ScannerDecision, IngestConfig };

/** Default store path — one store per user, scoped to this extension. */
const DEFAULT_STORE_PATH = join(
  homedir(),
  ".pi",
  "agent",
  "lanonasis-pi-memory",
  "memories.db",
);

export default function extension(pi: ExtensionAPI): void {
  registerEchoCommand(pi);

  // Phase 6: open a single store and wire lifecycle hooks.
  // The store lives for the session; WAL is checkpointed on shutdown so
  // no WAL file is left behind after the session ends.
  const ingestConfig: IngestConfig = {
    target: "user",
    enabled: true,
    sessionTag: undefined,
  };

  let store: MemoryStore | null = null;
  let storeOpen = false;

  /** Lazily opens the store on first session_start. */
  function openStore(cwd: string): MemoryStore | null {
    if (storeOpen && store) return store;

    try {
      // Ensure parent directory exists (MemoryStore.open creates the file, not the dir).
      mkdirSync(join(DEFAULT_STORE_PATH, ".."), { recursive: true });
      store = null; // will be set after async open
      storeOpen = false;
      return null; // signal that we need to await the open
    } catch (err) {
      return null;
    }
  }

  // Build the pipeline with a getter that returns the current store.
  const pipeline = buildIngestPipeline(() => store, ingestConfig);

  pi.on("session_start", async (event, ctx) => {
    if (!ingestConfig.enabled) return;
    if (storeOpen && store) return; // already initialized this session

    // Derive session tag from cwd — gives per-project memory scoping naturally.
    const cwd = (ctx as { cwd?: string }).cwd ?? "";
    const sessionTag = cwd
      ? `session:${cwd.split("/").pop() ?? cwd}`
      : undefined;
    ingestConfig.sessionTag = sessionTag;

    try {
      mkdirSync(join(DEFAULT_STORE_PATH, ".."), { recursive: true });
      store = await MemoryStore.open(DEFAULT_STORE_PATH);
      storeOpen = true;
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
    if (!storeOpen || !store) return;
    await pipeline.onTurnEnd(event, ctx);
  });

  pi.on("session_shutdown", async (event, ctx) => {
    if (!store) return;
    await pipeline.onSessionShutdown(event, ctx);
    store = null;
    storeOpen = false;
  });
}

export { registerEchoCommand } from "./commands/echo.js";

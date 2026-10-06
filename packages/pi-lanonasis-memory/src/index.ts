/**
 * @lanonasis/pi-lanonasis-memory
 *
 * Pi extension that brings LanOnasis MaaS persistent memory into a Pi session.
 *
 * Wires the local SQLite FTS5 store into Pi's lifecycle hooks so session
 * content is automatically classified and persisted without requiring a
 * slash command. Background review (PR1/6) throttles classification to
 * once every N turns or M tool calls so we don't flood SQLite during
 * long sessions; corrections bypass the throttle and land immediately.
 *
 * Hooks wired:
 *   `input`              — observe the user prompt (text never persisted)
 *   `session_start`      — open the store, register session tag
 *   `turn_end`           — buffer assistant text + tool-call counts;
 *                            flush when cadence fires; capture corrections
 *   `session_shutdown`   — flush any remaining buffered items, close store
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
import { createCorrectionCapture } from "./hooks/correction.js";

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

  const ingestConfig: IngestConfig = {
    target: "user",
    enabled: true,
    sessionTag: undefined,
  };

  let store: MemoryStore | null = null;
  let storeOpen = false;

  // Build both hooks around the same store-getter so they share a single
  // open/close window. Correction capture is intentionally outside the
  // ingest cadence — a user correction is the highest-signal content in
  // any session and must not wait for the throttle to fire.
  const pipeline = buildIngestPipeline(() => store, ingestConfig);
  const correction = createCorrectionCapture(() => store);

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

  // Observe the user prompt to set a pending-correction flag. The prompt
  // text is NEVER persisted. (Brief LANA-2026-10-06 PR1/6 contract.)
  pi.on("input", (event) => {
    correction.onInput(event as { type: "input"; text?: string; source?: string });
  });

  pi.on("turn_end", async (event, ctx) => {
    if (!storeOpen || !store) return;
    await pipeline.onTurnEnd(event, ctx);
    // Fire correction capture AFTER ingest so a corrected assistant text
    // is written immediately, even if the ingest cadence wouldn't have fired.
    await correction.onTurnEnd(event as { type: "turn_end"; message?: unknown });
  });

  pi.on("session_shutdown", async (event, ctx) => {
    if (!store) return;
    await pipeline.onSessionShutdown(event, ctx);
    try {
      store.close();
    } catch {
      // best-effort WAL checkpoint
    }
    store = null;
    storeOpen = false;
  });
}

export { registerEchoCommand } from "./commands/echo.js";
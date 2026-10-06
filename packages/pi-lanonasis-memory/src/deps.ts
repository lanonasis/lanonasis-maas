/**
 * deps.ts — small shared contracts between the runtime (`src/runtime.ts`),
 * the tools (`src/tools/*`) and the slash commands (`src/commands/*`).
 *
 * History: in v0.2.0 this file resolved peer-PR modules through
 * `tryImport()` + export-name lookups and fell back to no-ops when the
 * lookup missed. After PRs #167-#172 merged, every lookup missed (the real
 * modules export classes / differently-named factories), so correction
 * capture, the markdown mirror, MaaS sync and MaaS search were all silent
 * no-ops at runtime. v1.0.1 deletes that indirection: the runtime imports
 * the real modules statically, and this file only carries the small
 * interfaces the tools and commands are written against (so unit tests can
 * hand them recording fakes).
 */

import type { SyncOrigin } from "./sync/policy.js";
import type { MemoryStoreLike } from "./store/memory.js";

export type { MemoryStoreLike };

/**
 * Surface for code that wants the inner MemoryStore. The runtime hands out
 * the `MirroredStore`, so callers get the mirror side effects for free on
 * add/replace/remove; `getMirror().store` exposes the read/write surface
 * directly. Tests use the same shape with a plain MemoryStore.
 */
export interface MirroredStoreLike {
  store: MemoryStoreLike;
}

/** One sync intent, as emitted by a tool / command after a successful write. */
export interface SyncEnqueueInput {
  localId: string;
  op: "create" | "update" | "delete";
  /**
   * Informational only. The runtime re-reads the post-scan record from the
   * store when it builds the queue payload, so callers cannot smuggle
   * unscanned text into the queue.
   */
  payload?: unknown;
  origin: SyncOrigin;
}

/** Snapshot reported by `/memory-sync status`. Never contains the API key. */
export interface SyncStatus {
  depth: number;
  dropped: number;
  maxDepth: number;
  online: boolean;
  clientConfigured: boolean;
}

export interface SyncPruneCounts {
  queued: number;
  dropped: number;
}

/**
 * Sync surface handed to tools and commands. `enqueue` never throws; the
 * runtime applies `shouldSync(origin)` before anything touches the queue.
 */
export interface SyncAdapter {
  /** True when a SyncQueue is open for this session. */
  enabled: boolean;
  enqueue(input: SyncEnqueueInput): void;
  /** Queue/health snapshot for `/memory-sync status`. */
  status?(): Promise<SyncStatus>;
  /** Housekeeping for `/memory-sync prune`. */
  prune?(opts: { olderThanDays?: number; dropped?: boolean }): SyncPruneCounts;
}

/** A MaaS search hit, normalised for merge with local FTS5 hits. */
export interface MaasSearchHit {
  id: string;
  title: string;
  content: string;
  tags: string[] | null;
  score: number;
}

/** Best-effort MaaS search used by memory_search. Never throws. */
export interface MaaSAdapter {
  enabled: boolean;
  search(query: string, limit: number): Promise<MaasSearchHit[]>;
}

/** Disabled adapters — used before session_start and when sync is unavailable. */
export const DISABLED_SYNC: SyncAdapter = {
  enabled: false,
  enqueue: () => {},
};

export const DISABLED_MAAS: MaaSAdapter = {
  enabled: false,
  async search() {
    return [];
  },
};
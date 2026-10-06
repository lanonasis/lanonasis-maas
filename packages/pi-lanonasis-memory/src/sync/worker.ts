/**
 * worker.ts — drains SyncQueue into a MaasClient.
 *
 * Responsibilities:
 *   - Poll the queue at a steady cadence (default 1/sec).
 *   - Skip ticks when HealthMonitor.isOnline() === false.
 *   - Dispatch each row to MaasClient.{create,update,delete}.
 *   - On success: invoke onSynced(localId, maasId) and remove the row.
 *   - On failure: funnel through SyncQueue.markFailed with the
 *     status code from the client (4xx-drop / 5xx-retry handled in
 *     the queue).
 *   - flush(timeoutMs): drain as fast as allowed until the queue is
 *     empty or the timeout elapses. Used on session_shutdown.
 *   - stop(): clear the timer; safe to call multiple times.
 *
 * The worker never throws. Unhandled rejections from the per-row
 * pipeline are caught and reported as retryable failures so a single
 * bad row never kills the loop.
 *
 * No logging happens here either — the queue's `last_error` column
 * is the audit trail. The redactor sanitises every error string
 * before it lands in SQLite.
 */

import type { MaasClient } from "./maas-client.js";
import type { QueueRow, SyncQueue } from "./sync-queue.js";
import type { HealthMonitor } from "./health.js";

export interface SyncWorkerOptions {
  queue: SyncQueue;
  client: MaasClient;
  health: HealthMonitor;
  /**
   * Called after a row is successfully pushed to MaaS. PR4 wires
   * this to `MemoryStore.markSynced(localId, maasId)` so the local
   * row gets its `maas_id` and `maas_synced_at` columns stamped.
   */
  onSynced: (localId: string, maasId: string) => void;
  /** Drain cadence in milliseconds. Defaults to 1000. */
  intervalMs?: number;
}

export class SyncWorker {
  private readonly queue: SyncQueue;
  private readonly client: MaasClient;
  private readonly health: HealthMonitor;
  private readonly onSynced: (localId: string, maasId: string) => void;
  private readonly intervalMs: number;
  private timer: ReturnType<typeof setInterval> | null = null;
  private stopped = false;

  constructor(options: SyncWorkerOptions) {
    this.queue = options.queue;
    this.client = options.client;
    this.health = options.health;
    this.onSynced = options.onSynced;
    this.intervalMs = options.intervalMs ?? 1000;
  }

  /** Start the drain loop. Idempotent. */
  start(): void {
    if (this.timer !== null) return;
    this.stopped = false;
    this.timer = setInterval(() => {
      void this.tick();
    }, this.intervalMs);
    if (typeof (this.timer as { unref?: () => void }).unref === "function") {
      (this.timer as { unref: () => void }).unref();
    }
  }

  /** Stop the drain loop. Safe to call multiple times or before start. */
  async stop(): Promise<void> {
    this.stopped = true;
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Drain the queue as fast as allowed until empty or the timeout
   * elapses. Returns the number of rows successfully pushed. Used
   * by the session_shutdown hook (PR4) for a best-effort flush.
   *
   * Concurrency: serialised. The MaaS API has per-key rate limits
   * and the queue is FIFO by design — running rows in parallel
   * would only re-order them.
   */
  async flush(timeoutMs: number): Promise<number> {
    const start = Date.now();
    let pushed = 0;
    while (Date.now() - start < timeoutMs) {
      if (!this.health.isOnline()) {
        // Wait briefly for the next health tick; if it's been a long
        // time without a probe, just bail out of flush rather than
        // spin.
        await sleep(50);
        continue;
      }
      const row = this.queue.next();
      if (!row) break;
      const ok = await this.processRow(row);
      if (ok) pushed++;
    }
    return pushed;
  }

  /** One tick. Exposed for tests; production uses start(). */
  async tick(): Promise<void> {
    if (this.stopped) return;
    if (!this.health.isOnline()) return;
    const row = this.queue.next();
    if (!row) return;
    await this.processRow(row);
  }

  private async processRow(row: QueueRow): Promise<boolean> {
    try {
      const result =
        row.op === "create"
          ? await this.client.create({
              title: row.payload.title,
              content: row.payload.content,
              tags: row.payload.tags,
              memory_type: targetToMemoryType(row.payload.type),
            })
          : row.op === "update"
            ? await this.client.update(row.localId, {
                title: row.payload.title,
                content: row.payload.content,
                tags: row.payload.tags,
                memory_type: targetToMemoryType(row.payload.type),
              })
            : await this.client.delete(row.localId);
      if (result.ok) {
        this.queue.markDone(row.id);
        try {
          this.onSynced(row.localId, result.maasId);
        } catch {
          // onSynced errors must not stop the loop. The store may
          // have been closed between sessions; we tolerate that.
        }
        return true;
      }
      this.queue.markFailed(
        new Error(result.error || "maas error"),
        result.status,
        row.id,
      );
      return false;
    } catch (err) {
      const e = err as Error;
      this.queue.markFailed(e, undefined, row.id);
      return false;
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Map a local MemoryTarget to a MaaS memory_type. The worker keeps
 * a duplicate of this map (maas-client.ts owns the canonical
 * version) so the worker's hot path doesn't need a circular import
 * on every tick. The two maps MUST stay in sync; the
 * sync/policy.test.ts matrix exercises the canonical one.
 */
function targetToMemoryType(target: string): "context" | "project" | "knowledge" | "personal" {
  switch (target) {
    case "user":
      return "personal";
    case "project":
      return "project";
    case "failure":
      return "knowledge";
    case "memory":
    default:
      return "context";
  }
}

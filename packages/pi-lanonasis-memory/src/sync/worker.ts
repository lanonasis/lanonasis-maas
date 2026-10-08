/**
 * worker.ts — drains SyncQueue into a MaasClient.
 *
 * Responsibilities:
 *   - Poll the queue at a steady cadence (default 1/sec).
 *   - Skip ticks when HealthMonitor.isOnline() === false (the periodic
 *     tick; flush() probes on demand so a queue drains on shutdown even
 *     when the monitor has not run yet).
 *   - Dispatch each row to MaasClient.{create,update,delete}.
 *   - On success: invoke onSynced(localId, maasId) and remove the row.
 *   - On failure: funnel through SyncQueue.markFailed with the
 *     status code from the client (4xx-drop / 5xx-retry handled in
 *     the queue).
 *   - flush(timeoutMs): stop the periodic loop, then drain as fast as
 *     allowed until the queue is empty or the deadline passes. Every
 *     wait inside flush (health probe, an in-flight push, its own push)
 *     is bounded by the deadline, so a stalled request can never block
 *     session_shutdown. Used on session_shutdown.
 *   - stop(graceMs): clear the timer; safe to call multiple times. Waits
 *     up to graceMs for an in-flight push, and not at all for a push
 *     flush() already abandoned at its deadline.
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
  /**
   * Resolve the REMOTE MaaS id for a local id (v1.0.1). Used for
   * update/delete rows whose payload carries no `maasId`. When supplied
   * and it returns null: an update is pushed as a create (the memory was
   * never synced), a delete is discarded (nothing exists remotely).
   * When omitted, the local id is passed through (legacy behaviour).
   */
  resolveRemoteId?: (localId: string) => string | null;
}

export class SyncWorker {
  private readonly queue: SyncQueue;
  private readonly client: MaasClient;
  private readonly health: HealthMonitor;
  private readonly onSynced: (localId: string, maasId: string) => void;
  private readonly intervalMs: number;
  private readonly resolveRemoteId: ((localId: string) => string | null) | undefined;
  private timer: ReturnType<typeof setInterval> | null = null;
  private stopped = false;
  /**
   * The row currently being pushed, if any. tick() and flush() share it
   * so the interval loop and a shutdown flush can never push the same
   * row twice, and stop() can wait for an in-flight push to settle
   * before the caller closes the queue.
   */
  private inFlight: Promise<boolean> | null = null;
  /** An in-flight push that flush() gave up on at its deadline. */
  private abandoned: Promise<boolean> | null = null;

  constructor(options: SyncWorkerOptions) {
    this.queue = options.queue;
    this.client = options.client;
    this.health = options.health;
    this.onSynced = options.onSynced;
    this.intervalMs = options.intervalMs ?? 1000;
    this.resolveRemoteId = options.resolveRemoteId;
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

  /**
   * Stop the drain loop. Safe to call multiple times or before start.
   * Waits at most `graceMs` for an in-flight push to settle, and does
   * not wait at all for a push that flush() already abandoned.
   */
  async stop(graceMs = 1000): Promise<void> {
    this.haltPolling();
    const pending = this.inFlight;
    if (pending && pending !== this.abandoned) {
      await withDeadline(pending, graceMs);
    }
  }

  private haltPolling(): void {
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
    // Stop polling first so the interval loop cannot start a new push
    // while (or after) we drain.
    this.haltPolling();
    const deadline = Date.now() + timeoutMs;
    const remaining = () => deadline - Date.now();
    let pushed = 0;
    while (remaining() > 0) {
      // Always run a probe before each row. This lets a queue drain
      // even when the periodic monitor hasn't ticked yet (the test path
      // and the shutdown path both need this).
      const probe = await withDeadline(
        this.health.tick().then(
          () => true,
          () => true,
        ),
        remaining(),
      );
      if (probe === TIMED_OUT) break;
      if (this.inFlight) {
        const pending = this.inFlight;
        if ((await withDeadline(pending, remaining())) === TIMED_OUT) {
          this.abandoned = pending;
          break;
        }
        continue;
      }
      const row = this.queue.next();
      if (!row) break;
      const outcome = await withDeadline(this.run(row), remaining());
      if (outcome === TIMED_OUT) {
        // The push keeps running in the background; the row stays in the
        // queue (markDone never ran) and is retried next session.
        this.abandoned = this.inFlight;
        break;
      }
      if (outcome) pushed++;
    }
    return pushed;
  }

  /** One tick. Exposed for tests; production uses start(). */
  async tick(): Promise<void> {
    if (this.stopped || this.inFlight) return;
    if (!this.health.isOnline()) return;
    try {
      const row = this.queue.next();
      if (!row) return;
      await this.run(row);
    } catch {
      // Queue closed underneath us (session teardown) — never throw
      // out of an interval callback.
    }
  }

  private async run(row: QueueRow): Promise<boolean> {
    const p = this.processRow(row);
    this.inFlight = p;
    try {
      return await p;
    } finally {
      this.inFlight = null;
    }
  }

  private async processRow(row: QueueRow): Promise<boolean> {
    try {
      let op = row.op;
      let remoteId = row.localId;
      if (op !== "create") {
        const known = row.payload.maasId ?? (this.resolveRemoteId ? this.resolveRemoteId(row.localId) : row.localId);
        if (!known) {
          if (op === "delete") {
            // Never synced — nothing to delete remotely.
            this.queue.markDone(row.id);
            return false;
          }
          op = "create"; // update of a never-synced memory: push it whole
        } else {
          remoteId = known;
        }
      }
      const result =
        op === "create"
          ? await this.client.create({
              title: row.payload.title,
              content: row.payload.content,
              tags: row.payload.tags,
              memory_type: targetToMemoryType(row.payload.type),
            })
          : op === "update"
            ? await this.client.update(remoteId, {
                title: row.payload.title,
                content: row.payload.content,
                tags: row.payload.tags,
                memory_type: targetToMemoryType(row.payload.type),
              })
            : await this.client.delete(remoteId);
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
      try {
        this.queue.markFailed(e, undefined, row.id);
      } catch {
        // Queue closed mid-push; the row stays queued for next session.
      }
      return false;
    }
  }
}

const TIMED_OUT: unique symbol = Symbol("timed-out");

/**
 * Resolve with the promise's value, or TIMED_OUT once `ms` elapses.
 * The timer is cleared on settle and unref'd so it never holds the
 * process open. Never rejects: a rejected promise also resolves as
 * TIMED_OUT (callers here only race promises that are not expected to
 * reject, so treating a rejection as "gave up" is the safe default).
 */
async function withDeadline<T>(p: Promise<T>, ms: number): Promise<T | typeof TIMED_OUT> {
  if (ms <= 0) return TIMED_OUT;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expiry = new Promise<typeof TIMED_OUT>((resolve) => {
    timer = setTimeout(() => resolve(TIMED_OUT), ms);
    (timer as { unref?: () => void }).unref?.();
  });
  try {
    const settled: Promise<T | typeof TIMED_OUT> = p.catch((): typeof TIMED_OUT => TIMED_OUT);
    return await Promise.race([settled, expiry]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

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
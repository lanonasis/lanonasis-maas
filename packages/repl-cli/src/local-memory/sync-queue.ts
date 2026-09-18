/**
 * AsyncSyncQueue — drains pending MaaS writes from a local backend's
 * sync_queue table, with exponential backoff and graceful failure
 * semantics. The actual MaaS transport is injected via the `submit`
 * callback so this module stays decoupled from the live API surface.
 *
 * Design contract:
 *   - run() never throws.
 *   - Each tick processes up to `batchSize` ready rows.
 *   - On 2xx: row is deleted; the caller (router) is responsible for
 *     updating maas_synced_at / maas_id on the source record.
 *   - On 4xx (non-retryable): row is dropped and the error is logged.
 *   - On 5xx / network: attempts++ and next_retry_at = now + min(2^attempts, 300s).
 *   - On timeout: same as 5xx.
 */

export type SyncOp = 'save' | 'delete';

export interface SyncQueueRow {
  id: number;
  op: SyncOp;
  payload: string; // JSON
  attempts: number;
  last_error: string | null;
  next_retry_at: string;
  created_at: string;
}

export interface SyncQueueDeps {
  /** Read up to `limit` rows whose next_retry_at <= now. */
  readReady(limit: number): SyncQueueRow[];
  /** Delete a row by id. */
  deleteById(id: number): void;
  /** Increment attempts and reschedule. */
  reschedule(id: number, attempts: number, errorMsg: string, delaySeconds: number): void;
  /** Mark a row as terminal-dropped (non-retryable). */
  drop(id: number, reason: string): void;
  /** Get count of pending rows (for health). */
  count(): number;
}

export interface SyncSubmitter {
  /** Submit a 'save' operation. Resolves on success, throws on failure. */
  submitSave(payload: Record<string, unknown>): Promise<{ maas_id: string }>;
  /** Submit a 'delete' operation. Resolves on success, throws on failure. */
  submitDelete(payload: { id: string }): Promise<void>;
}

export type SyncErrorKind = 'retryable' | 'fatal' | 'auth';

export interface SyncTickResult {
  attempted: number;
  succeeded: number;
  failed: number;
  dropped: number;
  durationMs: number;
}

export interface SyncRunnerOptions {
  batchSize?: number;
  /** Per-call timeout (ms) for the submitter. */
  submitTimeoutMs?: number;
  /** Maximum backoff in seconds. Default: 300 (5 min). */
  maxBackoffSeconds?: number;
  /** Base delay for backoff in seconds. Default: 2. */
  baseBackoffSeconds?: number;
  /** Optional error classifier. */
  classifyError?: (err: unknown) => SyncErrorKind;
}

const DEFAULT_OPTIONS: Required<Omit<SyncRunnerOptions, 'classifyError'>> & {
  classifyError: NonNullable<SyncRunnerOptions['classifyError']>;
} = {
  batchSize: 5,
  submitTimeoutMs: 8000,
  maxBackoffSeconds: 300,
  baseBackoffSeconds: 2,
  classifyError: (err: unknown): SyncErrorKind => {
    const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
    if (msg.includes('401') || msg.includes('403') || msg.includes('unauthorized') || msg.includes('forbidden')) {
      return 'auth';
    }
    if (msg.includes('400') || msg.includes('validation') || msg.includes('schema')) {
      return 'fatal';
    }
    return 'retryable';
  },
};

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`sync submit timeout after ${ms}ms`)), ms);
    p.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

export class AsyncSyncQueueRunner {
  private readonly deps: SyncQueueDeps;
  private readonly options: Required<Omit<SyncRunnerOptions, 'classifyError'>> & {
    classifyError: NonNullable<SyncRunnerOptions['classifyError']>;
  };
  private running = false;

  constructor(deps: SyncQueueDeps, options: SyncRunnerOptions = {}) {
    this.deps = deps;
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /** True if a tick is currently in-flight. */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Run one drain pass. Returns counts of what happened.
   * Caller decides when to call again (cron, idle, after-save, etc.).
   */
  async tick(submitter: SyncSubmitter): Promise<SyncTickResult> {
    if (this.running) {
      return { attempted: 0, succeeded: 0, failed: 0, dropped: 0, durationMs: 0 };
    }
    this.running = true;
    const start = Date.now();
    let attempted = 0;
    let succeeded = 0;
    let failed = 0;
    let dropped = 0;
    try {
      const ready = this.deps.readReady(this.options.batchSize);
      attempted = ready.length;
      for (const row of ready) {
        try {
          const payload = JSON.parse(row.payload);
          if (row.op === 'save') {
            await withTimeout(
              submitter.submitSave(payload),
              this.options.submitTimeoutMs,
            );
          } else if (row.op === 'delete') {
            await withTimeout(
              submitter.submitDelete(payload),
              this.options.submitTimeoutMs,
            );
          }
          this.deps.deleteById(row.id);
          succeeded++;
        } catch (err) {
          const kind = this.options.classifyError(err);
          if (kind === 'fatal' || kind === 'auth') {
            this.deps.drop(row.id, String(err instanceof Error ? err.message : err));
            dropped++;
          } else {
            const delay = Math.min(
              this.options.maxBackoffSeconds,
              this.options.baseBackoffSeconds ** Math.min(row.attempts + 1, 8),
            );
            this.deps.reschedule(
              row.id,
              row.attempts + 1,
              String(err instanceof Error ? err.message : err),
              delay,
            );
            failed++;
          }
        }
      }
    } catch (err) {
      // Outer failure (readReady etc.) — do not throw, just record.
      // eslint-disable-next-line no-console
      console.warn(`[sync-queue] tick failed: ${(err as Error).message}`);
    } finally {
      this.running = false;
    }
    return { attempted, succeeded, failed, dropped, durationMs: Date.now() - start };
  }

  pending(): number {
    return this.deps.count();
  }
}

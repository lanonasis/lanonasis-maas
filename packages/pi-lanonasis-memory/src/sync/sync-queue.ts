/**
 * sync-queue.ts — SQLite-backed FIFO sync queue.
 *
 * Storage layout (per the PR5 contract):
 *
 *   <globalRoot>/sync.db
 *     sync_queue(
 *       id INTEGER PK AUTOINCREMENT,
 *       local_id TEXT NOT NULL,
 *       op        TEXT NOT NULL,   -- 'create' | 'update' | 'delete'
 *       payload   TEXT NOT NULL,   -- JSON: { title, content, tags, type }
 *       origin    TEXT NOT NULL,   -- 'explicit' | 'auto'
 *       attempts  INTEGER NOT NULL DEFAULT 0,
 *       next_attempt_at INTEGER NOT NULL,  -- epoch ms
 *       last_error TEXT,
 *       created_at TEXT NOT NULL DEFAULT (datetime('now'))
 *     );
 *     sync_queue_dropped(
 *       id INTEGER PK AUTOINCREMENT,
 *       local_id TEXT NOT NULL,
 *       op        TEXT NOT NULL,
 *       status    INTEGER,
 *       last_error TEXT,
 *       dropped_at TEXT NOT NULL DEFAULT (datetime('now'))
 *     );
 *     sync_meta(
 *       key   TEXT PRIMARY KEY,
 *       value TEXT NOT NULL
 *     );
 *
 * Ordering: FIFO by `id` (autoincrement). Eligibility: a row is
 * "due" when its `next_attempt_at <= now`.
 *
 * Backoff: `next_attempt_at = now + min(2^attempts, 300) * 1000` ms.
 * The 300s cap is intentional — once an item has failed ~9 times
 * (2^9 = 512) we stop growing the gap so the operator notices in
 * the dropped log instead of silently.
 *
 * Drop policy: 4xx (except 408/429) → drop the row and record it in
 * `sync_queue_dropped` for forensic inspection. 408, 429, and 5xx →
 * retry with backoff. Network errors (no status) are treated like
 * 5xx.
 *
 * Payload invariant: the `payload` column is a JSON string carrying
 * ONLY the documented memory fields. The API key is NEVER written
 * to this table.
 */

import { chmodSync } from "node:fs";
import { openSqlite, type SqliteDatabase } from "../store/sqlite.js";
import type { MemoryTarget } from "../store/memory.js";
import type { SyncOrigin } from "./policy.js";
import { redactContent } from "../scanner/redactor.js";

/** Sync operations. */
export type SyncOp = "create" | "update" | "delete";

/** Memory fields persisted to the queue payload. */
export interface SyncPayload {
  title: string;
  content: string;
  tags: string[];
  type: MemoryTarget;
}

/** A row inserted via enqueue(). */
export interface EnqueueInput {
  localId: string;
  op: SyncOp;
  payload: SyncPayload;
  origin: SyncOrigin;
}

/** A row returned by next(). */
export interface QueueRow {
  id: number;
  localId: string;
  op: SyncOp;
  payload: SyncPayload;
  origin: SyncOrigin;
  attempts: number;
  next_attempt_at: number;
  last_error: string | null;
}

const SCHEMA_VERSION = "1";

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS sync_queue (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  local_id        TEXT    NOT NULL,
  op              TEXT    NOT NULL CHECK (op IN ('create', 'update', 'delete')),
  payload         TEXT    NOT NULL,
  origin          TEXT    NOT NULL CHECK (origin IN ('explicit', 'auto')),
  attempts        INTEGER NOT NULL DEFAULT 0,
  next_attempt_at INTEGER NOT NULL,
  last_error      TEXT,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sync_queue_due
  ON sync_queue(next_attempt_at, id);

CREATE TABLE IF NOT EXISTS sync_queue_dropped (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  local_id    TEXT    NOT NULL,
  op          TEXT    NOT NULL,
  status      INTEGER,
  last_error  TEXT,
  dropped_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sync_queue_dropped_local
  ON sync_queue_dropped(local_id);

CREATE TABLE IF NOT EXISTS sync_meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

const SCHEMA_VERSION_SQL = `
INSERT INTO sync_meta (key, value) VALUES ('_schema_version', ?)
ON CONFLICT(key) DO UPDATE SET value = excluded.value
`;

interface QueueRowDb {
  id: number;
  local_id: string;
  op: SyncOp;
  payload: string;
  origin: SyncOrigin;
  attempts: number;
  next_attempt_at: number;
  last_error: string | null;
}

export class SyncQueue {
  private readonly db: SqliteDatabase;
  private readonly inserts: ReturnType<SqliteDatabase["prepare"]>;
  private readonly countStmt: ReturnType<SqliteDatabase["prepare"]>;
  private readonly nextStmt: ReturnType<SqliteDatabase["prepare"]>;
  private readonly deleteStmt: ReturnType<SqliteDatabase["prepare"]>;
  private readonly updateFailStmt: ReturnType<SqliteDatabase["prepare"]>;
  private readonly selectByIdStmt: ReturnType<SqliteDatabase["prepare"]>;
  private readonly dropInsertStmt: ReturnType<SqliteDatabase["prepare"]>;
  private readonly dropDeleteStmt: ReturnType<SqliteDatabase["prepare"]>;

  private constructor(db: SqliteDatabase) {
    this.db = db;
    this.inserts = db.prepare(`
      INSERT INTO sync_queue
        (local_id, op, payload, origin, attempts, next_attempt_at, last_error)
      VALUES
        (?,        ?,   ?,       ?,      0,        ?,              NULL)
    `);
    this.countStmt = db.prepare(`SELECT COUNT(*) AS count FROM sync_queue`);
    this.nextStmt = db.prepare(`
      SELECT id, local_id, op, payload, origin, attempts, next_attempt_at, last_error
      FROM sync_queue
      WHERE next_attempt_at <= ?
      ORDER BY id ASC
      LIMIT 1
    `);
    this.deleteStmt = db.prepare(`DELETE FROM sync_queue WHERE id = ?`);
    this.updateFailStmt = db.prepare(`
      UPDATE sync_queue
      SET attempts        = attempts + 1,
          next_attempt_at = ?,
          last_error      = ?
      WHERE id = ?
    `);
    this.selectByIdStmt = db.prepare(`
      SELECT id, local_id, op, payload, origin, attempts, next_attempt_at, last_error
      FROM sync_queue
      WHERE id = ?
    `);
    this.dropInsertStmt = db.prepare(`
      INSERT INTO sync_queue_dropped (local_id, op, status, last_error)
      VALUES (?, ?, ?, ?)
    `);
    this.dropDeleteStmt = db.prepare(`
      DELETE FROM sync_queue WHERE id = ?
    `);
  }

  static async open(syncDbPath: string): Promise<SyncQueue> {
    const db = await openSqlite(syncDbPath);
    tightenFileMode(syncDbPath);
    db.exec(SCHEMA_SQL);
    db.prepare(SCHEMA_VERSION_SQL).run(SCHEMA_VERSION);
    return new SyncQueue(db);
  }

  /** Number of items currently in the queue (excluding dropped rows). */
  depth(): number {
    const row = this.countStmt.get() as { count: number };
    return row.count;
  }

  /**
   * Append a new item to the queue. Returns the assigned row id.
   * Throws if the payload cannot be JSON-serialised (which should be
   * impossible for the documented shape).
   *
   * `dueAt` defaults to `Date.now()` so a freshly-enqueued row is
   * eligible for the very next worker tick. Tests pass a fixed value
   * to keep the backoff math deterministic.
   */
  enqueue(input: EnqueueInput, dueAt: number = Date.now()): number {
    const payloadJson = JSON.stringify(input.payload);
    const result = this.inserts.run(
      input.localId,
      input.op,
      payloadJson,
      input.origin,
      dueAt,
    );
    return Number(result.lastInsertRowid);
  }

  /**
   * Return the oldest due row, or null when the queue is empty or
   * the next item is scheduled in the future.
   */
  next(now: number = Date.now()): QueueRow | null {
    const row = this.nextStmt.get(now) as QueueRowDb | undefined;
    if (!row) return null;
    return rowFromDb(row);
  }

  /**
   * Mark a row as successfully synced. Removes it from the queue.
   */
  markDone(id: number): void {
    this.deleteStmt.run(id);
  }

  /**
   * Mark a row as failed. When the status is a permanent client
   * error (4xx other than 408/429), the row is moved to the dropped
   * audit table instead of being retried. All other failures
   * (5xx, 408, 429, network/throw) increment attempts and push
   * next_attempt_at forward by `min(2^attempts, 300)` seconds.
   *
   * Operates on the row identified by `id` (the id returned by
   * `next()`). When no id is supplied, the head due row is used.
   */
  markFailed(err: Error, status?: number, id?: number, now: number = Date.now()): void {
    const head = id !== undefined
      ? (this.selectByIdStmt.get(id) as QueueRowDb | undefined)
      : (this.nextStmt.get(now) as QueueRowDb | undefined);
    if (!head) return;
    const rawMessage = err?.message ?? String(err);
    if (isPermanentClientError(status)) {
      // Sanitize the error message before it lands in the persistent
      // dropped-log table. Errors can come from anywhere (memory-client,
      // network stack, our own retries) and may include the API key
      // via a header-leak or a thrown config object. We re-run the
      // scanner in redact mode so any embedded secret is masked.
      const sanitized = sanitizeErrorMessage(rawMessage);
      this.dropInsertStmt.run(head.local_id, head.op, status ?? null, sanitized);
      this.dropDeleteStmt.run(head.id);
      return;
    }
    const attempts = head.attempts + 1;
    const delaySec = Math.min(Math.pow(2, attempts), 300);
    this.updateFailStmt.run(now + delaySec * 1000, sanitizeErrorMessage(rawMessage), head.id);
  }

  /** Close the underlying database. */
  close(): void {
    try {
      this.db.exec("PRAGMA wal_checkpoint(TRUNCATE)");
    } catch {
      // best effort
    }
    this.db.close();
  }
}

function rowFromDb(row: QueueRowDb): QueueRow {
  let payload: SyncPayload;
  try {
    payload = JSON.parse(row.payload) as SyncPayload;
  } catch {
    // The queue invariants should make this impossible, but if a row
    // ever gets corrupted, surface a tagged error rather than
    // crashing the worker.
    throw new Error(`sync_queue row ${row.id} has an unparseable payload`);
  }
  return {
    id: row.id,
    localId: row.local_id,
    op: row.op,
    payload,
    origin: row.origin,
    attempts: row.attempts,
    next_attempt_at: row.next_attempt_at,
    last_error: row.last_error,
  };
}

/**
 * Permanent client errors: 4xx that will not succeed on retry. 408
 * (Request Timeout) and 429 (Too Many Requests) are transient and
 * are treated as retryable.
 */
function isPermanentClientError(status: number | undefined): boolean {
  if (status === undefined) return false;
  if (status === 408 || status === 429) return false;
  return status >= 400 && status < 500;
}

/**
 * Sanitize an error message before it lands in any persistent column
 * (sync_queue.last_error or sync_queue_dropped.last_error). The
 * scanner's redact-mode replaces every detected secret with a
 * `[REDACTED:<type>]` marker. We use the same redactor the rest of
 * the package uses so the dropped-log format matches what the
 * scanner would produce in a content write.
 */
function sanitizeErrorMessage(message: string): string {
  try {
    return redactContent(message).text;
  } catch {
    return message;
  }
}

/**
 * Restrict the on-disk sync queue to owner-only (0o600). The queue
 * carries payload JSON (memory title/content/tags) and dropped-row
 * error messages — both of which can include secrets caught by the
 * scanner. SQLite creates the file with the process umask, which on
 * a shared host is world-readable, so a perms-tighten on open is the
 * simplest defence-in-depth.
 *
 * Runs after `openSqlite` (file exists) and before `db.exec(SCHEMA_SQL)`
 * (first data write). Windows uses ACL inheritance, so chmod is a
 * no-op there; we still wrap in try/catch so an EPERM on a
 * restrictive ACL never blocks `open()`.
 */
function tightenFileMode(syncDbPath: string): void {
  if (process.platform === "win32") return;
  try {
    chmodSync(syncDbPath, 0o600);
  } catch {
    // Best effort — see the MemoryStore equivalent.
  }
}

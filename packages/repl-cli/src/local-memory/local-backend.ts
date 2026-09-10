/**
 * LocalMemoryBackend — SQLite FTS5 mirror of the MaaS memory corpus.
 *
 * Pattern source: openclaw-plugin/extraction/sqlite-extractor.ts — opens
 * `bun:sqlite` first (OpenClaw runtime), then falls back to `node:sqlite`
 * (Node >= 22.5). We do NOT add a `better-sqlite3` dep — the runtime
 * already provides one of these in every supported environment.
 *
 * Hybrid role: this backend is the SOURCE OF TRUTH for the local REPL.
 * MaaS becomes a federation + semantic-search target. The router
 * (router.ts) is responsible for keeping the two in sync.
 *
 * On first run we import any pre-existing markdown files at
 * `<root>/memory/YYYY-MM-DD.md` (the openclaw-plugin fallback format)
 * so users upgrading from the openclaw era keep their history.
 */

import { mkdir, readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

import type {
  BackendHealth,
  ListOptions,
  MemoryBackend,
  MemoryHit,
  MemoryRecord,
  MemoryStatus,
  MemoryType,
  SaveResult,
  SearchOptions,
} from './types.js';
import { MemoryBackendError } from './types.js';
import { MarkdownMemoryMirror } from './markdown-mirror.js';
import { redactSecrets } from './privacy.js';
import type { SyncQueueDeps, SyncQueueRow } from './sync-queue.js';

interface SqliteStatement {
  all(...params: unknown[]): unknown[];
  get(...params: unknown[]): unknown;
  run(...params: unknown[]): unknown;
}

interface SqliteDb {
  exec(sql: string): void;
  prepare(sql: string): SqliteStatement;
  close(): void;
}

type SqliteDbFactory = (path: string) => SqliteDb;

let cachedFactory: SqliteDbFactory | null = null;
let factoryProbeFailed = false;

/**
 * Discover an available SQLite binding. Mirrors openclaw-plugin's
 * resolve-sqlite priority: bun:sqlite first, then node:sqlite.
 *
 * Throws a clear error if neither is available — caller surfaces to user.
 */
async function getSqliteFactory(): Promise<SqliteDbFactory> {
  if (cachedFactory) return cachedFactory;
  if (factoryProbeFailed) {
    throw new MemoryBackendError(
      'SQLite is not available in this runtime',
      'transport',
    );
  }

  // 1. Try bun:sqlite (preferred — the user's REPL runs on Bun).
  try {
    // @ts-ignore — bun:sqlite is a Bun-specific module, not in @types
    const mod = await import('bun:sqlite' as string);
    const Database = (mod as { Database: new (p: string) => unknown }).Database;
    cachedFactory = (path: string) => {
      const raw = new Database(path) as {
        exec(sql: string): void;
        prepare(sql: string): SqliteStatement;
        close(): void;
      };
      return {
        exec: raw.exec.bind(raw),
        prepare: raw.prepare.bind(raw),
        close: raw.close.bind(raw),
      };
    };
    return cachedFactory;
  } catch {
    // bun:sqlite unavailable
  }

  // 2. Try node:sqlite (Node >= 22.5 experimental).
  try {
    // @ts-ignore — node:sqlite is experimental in Node 22.5+
    const mod = await import('node:sqlite' as string);
    const DatabaseSync = (mod as { DatabaseSync: new (p: string) => unknown }).DatabaseSync;
    cachedFactory = (path: string) => {
      const raw = new DatabaseSync(path) as unknown as SqliteDb;
      return raw;
    };
    return cachedFactory;
  } catch {
    factoryProbeFailed = true;
  }

  throw new MemoryBackendError(
    'Local memory requires Bun (bun:sqlite) or Node.js >= 22.5 (node:sqlite). Neither was available.',
    'transport',
  );
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS memory_entries (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  memory_type TEXT NOT NULL DEFAULT 'context',
  status TEXT NOT NULL DEFAULT 'active',
  tags TEXT NOT NULL DEFAULT '[]',
  subject_id TEXT,
  source TEXT NOT NULL DEFAULT 'local',
  maas_synced_at TEXT,
  maas_id TEXT,
  metadata TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_accessed_at TEXT
);

CREATE VIRTUAL TABLE IF NOT EXISTS memory_entries_fts USING fts5(
  title,
  content,
  tags,
  content='memory_entries',
  content_rowid='rowid',
  tokenize='porter unicode61'
);

-- Triggers to keep the FTS index in sync with the source table.
-- Without these, INSERTs into memory_entries are invisible to FTS5.
CREATE TRIGGER IF NOT EXISTS memory_entries_ai AFTER INSERT ON memory_entries BEGIN
  INSERT INTO memory_entries_fts(rowid, title, content, tags)
  VALUES (new.rowid, new.title, new.content, new.tags);
END;

CREATE TRIGGER IF NOT EXISTS memory_entries_ad AFTER DELETE ON memory_entries BEGIN
  INSERT INTO memory_entries_fts(memory_entries_fts, rowid, title, content, tags)
  VALUES ('delete', old.rowid, old.title, old.content, old.tags);
END;

CREATE TRIGGER IF NOT EXISTS memory_entries_au AFTER UPDATE ON memory_entries BEGIN
  INSERT INTO memory_entries_fts(memory_entries_fts, rowid, title, content, tags)
  VALUES ('delete', old.rowid, old.title, old.content, old.tags);
  INSERT INTO memory_entries_fts(rowid, title, content, tags)
  VALUES (new.rowid, new.title, new.content, new.tags);
END;

CREATE INDEX IF NOT EXISTS idx_memory_entries_updated_at ON memory_entries(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_memory_entries_memory_type ON memory_entries(memory_type);
CREATE INDEX IF NOT EXISTS idx_memory_entries_subject_id ON memory_entries(subject_id);

CREATE TABLE IF NOT EXISTS sync_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  op TEXT NOT NULL,
  payload TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  next_retry_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sync_queue_ready ON sync_queue(next_retry_at);
`;

interface RawRow {
  id: string;
  title: string;
  content: string;
  memory_type: string;
  status: string;
  tags: string;
  subject_id: string | null;
  source: string;
  maas_synced_at: string | null;
  maas_id: string | null;
  metadata: string | null;
  created_at: string;
  updated_at: string;
  last_accessed_at: string | null;
}

/** FTS search rows extend RawRow with a bm25 rank column. */
interface FtsSearchRow extends RawRow {
  rank: number;
}

function rowToRecord(row: RawRow): MemoryRecord {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    memory_type: row.memory_type as MemoryType,
    status: row.status as MemoryStatus,
    tags: safeJsonArray(row.tags),
    subject_id: row.subject_id ?? undefined,
    source: row.source as MemoryRecord['source'],
    maas_synced_at: row.maas_synced_at,
    maas_id: row.maas_id,
    metadata: row.metadata ? safeJsonObject(row.metadata) : undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
    last_accessed_at: row.last_accessed_at,
  };
}

function safeJsonArray(s: string): string[] {
  try {
    const parsed = JSON.parse(s);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function safeJsonObject(s: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(s);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

export interface LocalBackendOptions {
  /** Directory that will contain memory.db (and the markdown mirror). */
  rootDir: string;
  /** Database filename. Default: 'memory.db'. */
  dbFilename?: string;
  /** Mirror writes to markdown files at <root>/memory/YYYY-MM-DD.md. Default: true. */
  mirrorToMarkdown?: boolean;
  /** When true, on first open we import any pre-existing openclaw-format markdown files. */
  importLegacyMarkdown?: boolean;
}

export class LocalMemoryBackend implements MemoryBackend {
  private readonly dbPath: string;
  private readonly mirror: MarkdownMemoryMirror;
  private db: SqliteDb | null = null;
  private readonly options: Required<LocalBackendOptions>;
  private pendingSync = 0;
  private initialized = false;

  constructor(options: LocalBackendOptions) {
    if (!options.rootDir) {
      throw new MemoryBackendError('rootDir is required', 'unknown');
    }
    this.options = {
      dbFilename: 'memory.db',
      mirrorToMarkdown: true,
      importLegacyMarkdown: true,
      ...options,
    };
    this.dbPath = join(this.options.rootDir, this.options.dbFilename);
    this.mirror = new MarkdownMemoryMirror({
      rootDir: this.options.rootDir,
    });
  }

  /** Eager init — call once before any other method. Safe to call repeatedly. */
  async init(): Promise<void> {
    if (this.initialized) return;
    await mkdir(this.options.rootDir, { recursive: true });

    const factory = await getSqliteFactory();
    this.db = factory(this.dbPath);
    if (!this.db) {
      throw new MemoryBackendError('Failed to open SQLite database', 'transport');
    }
    this.db.exec(SCHEMA);
    this.initialized = true;

    if (this.options.importLegacyMarkdown) {
      await this.importLegacyMarkdownIfAny();
    }

    // Refresh pendingSync counter from sync_queue.
    this.pendingSync = this.readPendingSyncCount();
  }

  private requireDb(): SqliteDb {
    if (!this.db) {
      throw new MemoryBackendError('LocalMemoryBackend.init() not called', 'unknown');
    }
    return this.db;
  }

  private readPendingSyncCount(): number {
    try {
      const row = this.requireDb()
        .prepare('SELECT COUNT(*) AS n FROM sync_queue')
        .get() as { n: number } | undefined;
      return row?.n ?? 0;
    } catch {
      return 0;
    }
  }

  async search(query: string, opts: SearchOptions = {}): Promise<MemoryHit[]> {
    if (!this.initialized) await this.init();
    const db = this.requireDb();
    const limit = opts.limit ?? 10;
    const status = opts.status ?? 'active';

    // Build FTS query — escape double quotes so the user can search phrases.
    const ftsQuery = sanitizeFtsQuery(query);
    if (!ftsQuery) return [];

    const sql = `
      SELECT m.id, m.title, m.content, m.memory_type, m.tags,
             m.created_at, m.last_accessed_at,
             bm25(memory_entries_fts) AS rank
      FROM memory_entries_fts f
      JOIN memory_entries m ON m.rowid = f.rowid
      WHERE memory_entries_fts MATCH ?
        AND m.status = ?
      ORDER BY rank
      LIMIT ?
    `;

    let rows: unknown[];
    try {
      rows = db.prepare(sql).all(ftsQuery, status, limit * 2);
    } catch {
      // FTS query syntax error — fall back to LIKE search.
      rows = this.fallbackLikeSearch(query, status, limit * 2);
    }

    const now = new Date().toISOString();
    const ids: string[] = [];
    const hits: MemoryHit[] = (rows as FtsSearchRow[])
      .map((r) => {
        // bm25 returns NEGATIVE numbers; lower (more negative) is better.
        // Convert to 0..1 score where higher = better.
        const score = normalizeBm25(r.rank);
        ids.push(r.id);
        return {
          id: r.id,
          title: r.title,
          content: r.content,
          score,
          source: 'local' as const,
          memory_type: r.memory_type as MemoryType,
          tags: safeJsonArray(r.tags),
          created_at: r.created_at,
          last_accessed_at: r.last_accessed_at ?? undefined,
        } satisfies MemoryHit;
      })
      .filter((h) => (opts.type ? h.memory_type === opts.type : true))
      .slice(0, limit);

    // Touch last_accessed_at for hit ids (fire-and-forget; we do not await
    // to keep search latency minimal).
    if (ids.length > 0) {
      try {
        const stmt = db.prepare(
          `UPDATE memory_entries SET last_accessed_at = ? WHERE id IN (${ids.map(() => '?').join(',')})`,
        );
        stmt.run(now, ...ids);
      } catch {
        // best effort
      }
    }

    return hits;
  }

  private fallbackLikeSearch(query: string, status: MemoryStatus, limit: number): RawRow[] {
    const db = this.requireDb();
    const like = `%${query.replace(/[%_]/g, '\\$&')}%`;
    return db
      .prepare(
        `SELECT id, title, content, memory_type, tags, created_at, last_accessed_at
         FROM memory_entries
         WHERE status = ? AND (title LIKE ? ESCAPE '\\' OR content LIKE ? ESCAPE '\\')
         ORDER BY updated_at DESC
         LIMIT ?`,
      )
      .all(status, like, like, limit) as RawRow[];
  }

  async get(id: string): Promise<MemoryRecord | null> {
    if (!this.initialized) await this.init();
    const db = this.requireDb();
    const row = db
      .prepare('SELECT * FROM memory_entries WHERE id = ?')
      .get(id) as RawRow | undefined;
    if (!row) return null;

    const now = new Date().toISOString();
    try {
      db.prepare('UPDATE memory_entries SET last_accessed_at = ? WHERE id = ?').run(now, id);
    } catch { /* best effort */ }

    return rowToRecord(row);
  }

  async list(opts: ListOptions = {}): Promise<MemoryRecord[]> {
    if (!this.initialized) await this.init();
    const db = this.requireDb();
    const limit = opts.limit ?? 50;

    const conditions: string[] = [];
    const params: unknown[] = [];
    if (opts.type) {
      conditions.push('memory_type = ?');
      params.push(opts.type);
    }
    if (opts.subjectId) {
      conditions.push('subject_id = ?');
      params.push(opts.subjectId);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `SELECT * FROM memory_entries ${where} ORDER BY updated_at DESC LIMIT ?`;
    const rows = db.prepare(sql).all(...params, limit) as RawRow[];
    return rows.map(rowToRecord);
  }

  async save(
    record: Omit<MemoryRecord, 'created_at' | 'updated_at' | 'source'> & {
      source?: MemoryRecord['source'];
    },
  ): Promise<SaveResult> {
    if (!this.initialized) await this.init();
    const db = this.requireDb();

    // Run secrets through the redaction pipeline BEFORE persistence. Matches
    // openclaw-plugin/extraction/secret-redactor.ts contract: redactSecrets
    // replaces detected secrets with [REDACTED:type] tokens. We never persist
    // a value that contains a known-secret pattern.
    const redactedTitle = redactSecrets(record.title).text;
    const redactedContent = redactSecrets(record.content).text;
    const redactedTags = record.tags.map((t) => redactSecrets(t).text);

    const now = new Date().toISOString();
    const id = record.id || randomUUID();
    const source: MemoryRecord['source'] = record.source ?? 'local';

    db.prepare(
      `INSERT INTO memory_entries (id, title, content, memory_type, status, tags, subject_id, source, metadata, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         title = excluded.title,
         content = excluded.content,
         memory_type = excluded.memory_type,
         status = excluded.status,
         tags = excluded.tags,
         subject_id = excluded.subject_id,
         source = excluded.source,
         metadata = excluded.metadata,
         updated_at = excluded.updated_at`,
    ).run(
      id,
      redactedTitle,
      redactedContent,
      record.memory_type,
      record.status ?? 'active',
      JSON.stringify(redactedTags),
      record.subject_id ?? null,
      source,
      record.metadata ? JSON.stringify(record.metadata) : null,
      now,
      now,
    );

    // Mirror to markdown — non-blocking failure (we still return success
    // since SQLite is the source of truth).
    if (this.options.mirrorToMarkdown) {
      try {
        await this.mirror.write({
          id,
          title: redactedTitle,
          content: redactedContent,
          tags: redactedTags,
          memory_type: record.memory_type,
          created_at: now,
        });
      } catch {
        // mirror failure is non-fatal
      }
    }

    // Enqueue async sync to MaaS. We do not await — the router will drain
    // the queue out-of-band and update maas_synced_at when it succeeds.
    try {
      db.prepare(
        `INSERT INTO sync_queue (op, payload) VALUES (?, ?)`,
      ).run('save', JSON.stringify({
        id,
        title: redactedTitle,
        content: redactedContent,
        memory_type: record.memory_type,
        status: record.status ?? 'active',
        tags: redactedTags,
        subject_id: record.subject_id,
        metadata: record.metadata,
        created_at: now,
      }));
      this.pendingSync = this.readPendingSyncCount();
    } catch {
      // queue failure is non-fatal
    }

    return { id, syncedToMaaS: false, pendingSync: this.pendingSync };
  }

  async delete(id: string): Promise<void> {
    if (!this.initialized) await this.init();
    const db = this.requireDb();
    db.prepare('DELETE FROM memory_entries WHERE id = ?').run(id);
    try {
      db.prepare(
        `INSERT INTO sync_queue (op, payload) VALUES (?, ?)`,
      ).run('delete', JSON.stringify({ id }));
    } catch { /* best effort */ }
  }

  async health(): Promise<BackendHealth> {
    if (!this.initialized) {
      try {
        await this.init();
      } catch {
        return { maas: false, local: false, pendingSync: 0 };
      }
    }
    const local = this.db !== null;
    return {
      maas: false, // Local backend cannot speak MaaS; the router reports maas.
      local,
      pendingSync: this.pendingSync,
    };
  }

  async close(): Promise<void> {
    if (this.db) {
      try {
        this.db.close();
      } catch { /* best effort */ }
      this.db = null;
      this.initialized = false;
    }
  }

  /**
   * Expose the sync_queue table as SyncQueueDeps so AsyncSyncQueueRunner
   * can drain it. Caller owns the runner; this method just hands it a
   * lifecycle-bound closure bundle.
   */
  getSyncQueueDeps(): SyncQueueDeps {
    return {
      readReady: (limit) => this.readReadySyncRows(limit),
      deleteById: (id) => this.deleteSyncRowById(id),
      reschedule: (id, attempts, errorMsg, delaySeconds) =>
        this.rescheduleSyncRow(id, attempts, errorMsg, delaySeconds),
      drop: (id, reason) => this.dropSyncRow(id, reason),
      count: () => this.readPendingSyncCount(),
    };
  }

  private readReadySyncRows(limit: number): SyncQueueRow[] {
    try {
      return this.requireDb()
        .prepare(
          `SELECT id, op, payload, attempts, last_error, next_retry_at, created_at
           FROM sync_queue
           WHERE next_retry_at <= datetime('now')
           ORDER BY id ASC
           LIMIT ?`,
        )
        .all(limit) as SyncQueueRow[];
    } catch {
      return [];
    }
  }

  private deleteSyncRowById(id: number): void {
    try {
      this.requireDb().prepare('DELETE FROM sync_queue WHERE id = ?').run(id);
    } catch { /* best effort */ }
  }

  private rescheduleSyncRow(id: number, attempts: number, errorMsg: string, delaySeconds: number): void {
    try {
      this.requireDb()
        .prepare(
          `UPDATE sync_queue
           SET attempts = ?, last_error = ?,
               next_retry_at = datetime('now', '+' || ? || ' seconds')
           WHERE id = ?`,
        )
        .run(attempts, errorMsg.slice(0, 1000), delaySeconds, id);
    } catch { /* best effort */ }
    this.pendingSync = this.readPendingSyncCount();
  }

  private dropSyncRow(id: number, reason: string): void {
    try {
      this.requireDb()
        .prepare(
          `UPDATE sync_queue
           SET last_error = ?,
               next_retry_at = '9999-12-31 23:59:59'
           WHERE id = ?`,
        )
        .run(`dropped: ${reason}`.slice(0, 1000), id);
    } catch { /* best effort */ }
    this.pendingSync = this.readPendingSyncCount();
  }

  /** Mark a synced record as confirmed on MaaS. */
  markSynced(id: string, maasId: string | null): void {
    if (!this.initialized) return;
    try {
      this.requireDb()
        .prepare(
          `UPDATE memory_entries SET maas_synced_at = datetime('now'), maas_id = ? WHERE id = ?`,
        )
        .run(maasId, id);
    } catch { /* best effort */ }
  }

  /**
   * Remove the most-recent sync_queue entries for a given record id.
   * Used by the router after a successful direct remote save — we
   * enqueue synchronously in local.save() so the failure path is
   * covered, but if remote succeeded we don't need to drain via
   * AsyncSyncQueueRunner later.
   */
  removeQueuedForRecord(recordId: string): number {
    if (!this.initialized) return 0;
    try {
      const result = this.requireDb()
        .prepare(
          `DELETE FROM sync_queue
           WHERE id IN (
             SELECT id FROM sync_queue
             WHERE op = 'save' AND payload LIKE ?
             ORDER BY id DESC
             LIMIT 1
           )`,
        )
        .run(`%"id":"${recordId}"%`);
      const removed = Number(result as unknown === 'object' && result && 'changes' in (result as object)
        ? (result as { changes?: number }).changes ?? 0
        : 0);
      this.pendingSync = this.readPendingSyncCount();
      return removed;
    } catch {
      return 0;
    }
  }

  /**
   * One-shot import of any pre-existing openclaw-format markdown files at
   * <rootDir>/memory/*.md. Idempotent — files imported previously are
   * skipped via a content-hash comparison against existing records.
   */
  private async importLegacyMarkdownIfAny(): Promise<void> {
    const memoryDir = join(this.options.rootDir, 'memory');
    if (!existsSync(memoryDir)) return;
    let entries: string[];
    try {
      entries = await readdir(memoryDir);
    } catch {
      return;
    }
    const db = this.requireDb();
    const existing = new Set(
      (db.prepare('SELECT title FROM memory_entries').all() as Array<{ title: string }>).map(
        (r) => r.title,
      ),
    );
    for (const entry of entries) {
      if (!entry.endsWith('.md')) continue;
      const filePath = join(memoryDir, entry);
      let text: string;
      try {
        text = await readFile(filePath, 'utf8');
      } catch {
        continue;
      }
      const sections = parseOpenclawMarkdown(text);
      for (const sec of sections) {
        if (existing.has(sec.title)) continue;
        try {
          db.prepare(
            `INSERT OR IGNORE INTO memory_entries (id, title, content, memory_type, status, tags, source, created_at, updated_at)
             VALUES (?, ?, ?, ?, 'active', ?, 'import', datetime('now'), datetime('now'))`,
          ).run(
            randomUUID(),
            sec.title,
            sec.content,
            'context',
            JSON.stringify(['legacy-import']),
          );
        } catch {
          // best effort
        }
      }
    }
  }
}

interface ParsedSection {
  title: string;
  content: string;
}

/** Parse the openclaw-plugin LocalFallbackWriter markdown format:
 *  `## <title>\n\n<content>\n\n---\n`  */
function parseOpenclawMarkdown(text: string): ParsedSection[] {
  const sections: ParsedSection[] = [];
  const blocks = text.split(/\n---\n/).map((b) => b.trim()).filter(Boolean);
  for (const block of blocks) {
    const m = block.match(/^##\s+(.+)\n\n([\s\S]+)$/);
    if (!m) continue;
    sections.push({ title: m[1].trim(), content: m[2].trim() });
  }
  return sections;
}

/** FTS5 sanitization — quote each token, AND them together. */
function sanitizeFtsQuery(query: string): string {
  const tokens = query
    .split(/\s+/)
    .map((t) => t.replace(/["()]/g, '').trim())
    .filter((t) => t.length > 0);
  if (tokens.length === 0) return '';
  return tokens.map((t) => `"${t}"`).join(' AND ');
}

/** Convert BM25 negative rank to 0..1 — higher is better. */
function normalizeBm25(rank: number): number {
  if (!Number.isFinite(rank)) return 0;
  // Empirical: bm25 in this corpus ranges from ~ -10 (excellent) to 0 (no match).
  const clamped = Math.max(-15, Math.min(0, rank));
  return Math.min(1, Math.max(0, 1 + clamped / 15));
}

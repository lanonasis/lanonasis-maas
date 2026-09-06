/**
 * memory.ts — local-first memory store backed by SQLite FTS5.
 *
 * Every write path (add / replace) is gated by scanForWrite from
 * src/scanner/scanner.ts. The non-negotiable contract from review §2.3
 * is that no memory entry lands in SQLite, the markdown mirror, or the
 * MaaS sync queue without passing the scanner. This file is where
 * that contract is enforced for the SQLite half.
 *
 * Storage layout (per pi-extension.json + Appendix C.4):
 *   ~/.pi/agent/lanonasis-pi-memory/memories.db   (this file)
 *   ~/.pi/agent/projects-memory/<project>/        (per-project scope,
 *                                                  Phase 4 will mirror)
 *
 * What this store does NOT do (deferred phases):
 *   - Per-project scoping (Phase 4 / markdown mirror)
 *   - MaaS sync (Phase 5) — maas_synced_at / maas_id columns are
 *     reserved here so the sync layer has nothing to migrate later
 *   - Session ingest / messages table (Phase 6)
 *   - Background review loop (Phase 6)
 *   - Trigram FTS5 tokenizer (Phase 8+)
 */

import { randomUUID } from "node:crypto";

import {
  scanForWrite,
  type ScannerMode,
  type ScannerDecision,
} from "../scanner/scanner.js";
import {
  openSqlite,
  type SqliteDatabase,
  type SqliteStatement,
} from "./sqlite.js";
import {
  CATEGORIES,
  SCHEMA_SQL,
  SCHEMA_VERSION,
  SCHEMA_VERSION_INSERT_SQL,
  TARGETS,
} from "./schema.js";

export type MemoryTarget = (typeof TARGETS)[number];
export type MemoryCategory = (typeof CATEGORIES)[number];

export interface MemoryRecord {
  id: string;
  target: MemoryTarget;
  category: MemoryCategory | null;
  title: string;
  content: string;
  tags: string[] | null;
  failure_reason: string | null;
  created_at: string;
  updated_at: string;
  maas_synced_at: string | null;
  maas_id: string | null;
  last_accessed_at: string | null;
}

export interface AddMemoryInput {
  target: MemoryTarget;
  category?: MemoryCategory;
  title: string;
  content: string;
  tags?: string[];
  failure_reason?: string;
}

export interface SearchOptions {
  query: string;
  limit?: number;
  target?: MemoryTarget;
  category?: MemoryCategory;
}

export interface MemoryHit {
  id: string;
  target: MemoryTarget;
  category: MemoryCategory | null;
  title: string;
  content: string;
  /** 0..1 — derived from FTS rank (BM25-derived, lower-is-better raw rank inverted). */
  score: number;
  tags: string[] | null;
  created_at: string;
  matched_snippet: string | null;
}

export interface ListOptions {
  limit?: number;
  cursor?: string;
  target?: MemoryTarget;
}

export type AddResult =
  | { ok: true; id: string; redacted: boolean; secretsFound: number }
  | { ok: false; reason: string };

export interface StoreOptions {
  /** Scanner mode. Defaults to "block" (refuses secret-bearing writes). */
  mode?: ScannerMode;
}

const VALIDATION_ERROR_MESSAGES: Record<string, string> = {
  target: `target must be one of: ${TARGETS.join(", ")}`,
  category: `category must be one of: ${CATEGORIES.join(", ")} (when provided)`,
  title: "title is required",
  content: "content is required",
};

function validateInput(input: AddMemoryInput): string | null {
  if (!TARGETS.includes(input.target)) return VALIDATION_ERROR_MESSAGES.target;
  if (input.category !== undefined && !CATEGORIES.includes(input.category)) {
    return VALIDATION_ERROR_MESSAGES.category;
  }
  if (typeof input.title !== "string" || input.title.trim().length === 0) {
    return VALIDATION_ERROR_MESSAGES.title;
  }
  if (typeof input.content !== "string" || input.content.trim().length === 0) {
    return VALIDATION_ERROR_MESSAGES.content;
  }
  return null;
}

interface InsertRow {
  id: string;
  target: MemoryTarget;
  category: MemoryCategory | null;
  title: string;
  content: string;
  tags: string | null;
  failure_reason: string | null;
  created_at: string;
  updated_at: string;
  maas_synced_at: string | null;
  maas_id: string | null;
  last_accessed_at: string | null;
}

/** Search-result row extends InsertRow with FTS5 virtual columns. */
type SearchRow = InsertRow & {
  matched_snippet: string | null;
  fts_rank: number;
};

interface PreparedStatements {
  insert: SqliteStatement;
  select: SqliteStatement;
  selectAll: SqliteStatement;
  delete: SqliteStatement;
  update: SqliteStatement;
  touch: SqliteStatement;
  count: SqliteStatement;
}

/**
 * Local-first memory store backed by a single SQLite FTS5 database.
 *
 * Construct with `await MemoryStore.open(dbPath)` — never with `new`.
 * The store must be closed (`.close()`) before the process exits so
 * WAL is checkpointed.
 */
export class MemoryStore {
  private readonly db: SqliteDatabase;
  private readonly mode: ScannerMode;
  private stmts!: PreparedStatements; // initialized by prepareAll()

  private constructor(db: SqliteDatabase, mode: ScannerMode) {
    this.db = db;
    this.mode = mode;
  }

  /**
   * Open a SQLite-backed memory store at the given path. The parent
   * directory must exist. If the file does not exist it is created
   * and the schema is applied.
   */
  static async open(dbPath: string, options: StoreOptions = {}): Promise<MemoryStore> {
    const mode: ScannerMode = options.mode ?? "block";
    const db = await openSqlite(dbPath);
    const store = new MemoryStore(db, mode);
    store.initialize();
    store.prepareAll();
    return store;
  }

  /** Apply schema and record the schema version. Idempotent. */
  private initialize(): void {
    this.db.exec(SCHEMA_SQL);
    this.db.prepare(SCHEMA_VERSION_INSERT_SQL).run(SCHEMA_VERSION);
  }

  /**
   * Prepare all SQL statements. Must run AFTER `initialize()` — the
   * statements bind to the schema at prepare-time, so preparing before
   * the tables exist leaves us with "no such table" errors at execute.
   */
  private prepareAll(): void {
    this.stmts = {
      insert: this.db.prepare(`
        INSERT INTO memories
          (id, target, category, title, content, tags, failure_reason,
           created_at, updated_at, maas_synced_at, maas_id, last_accessed_at)
        VALUES
          (?,  ?,      ?,        ?,     ?,       ?,    ?,
           ?,      ?,         ?,            ?,       ?)
      `),
      select: this.db.prepare(`SELECT * FROM memories WHERE id = ?`),
      selectAll: this.db.prepare(`SELECT * FROM memories ORDER BY created_at DESC LIMIT ?`),
      delete: this.db.prepare(`DELETE FROM memories WHERE id = ?`),
      update: this.db.prepare(`
        UPDATE memories
        SET target = ?, category = ?, title = ?, content = ?, tags = ?,
            failure_reason = ?, updated_at = ?
        WHERE id = ?
      `),
      touch: this.db.prepare(`UPDATE memories SET last_accessed_at = ? WHERE id = ?`),
      count: this.db.prepare(`SELECT COUNT(*) AS count FROM memories`),
    };
  }

  /**
   * Insert a new memory. The content (and title) pass through the
   * scanner before any SQLite write happens. Block-mode (default) means
   * any secret or threat pattern results in a refusal; redact-mode
   * replaces detected secrets and persists the cleaned text.
   */
  add(input: AddMemoryInput): AddResult {
    const validation = validateInput(input);
    if (validation !== null) {
      return { ok: false, reason: validation };
    }

    const verdict: ScannerDecision = scanForWrite(input.content, this.mode);
    if (verdict.decision === "block") {
      return { ok: false, reason: verdict.reason };
    }

    const titleVerdict: ScannerDecision = scanForWrite(input.title, this.mode);
    if (titleVerdict.decision === "block") {
      return { ok: false, reason: `title: ${titleVerdict.reason}` };
    }

    const finalContent =
      verdict.decision === "redact" ? verdict.text : input.content;
    const finalTitle =
      titleVerdict.decision === "redact" ? titleVerdict.text : input.title;
    const redacted = verdict.decision === "redact" || titleVerdict.decision === "redact";
    const secretsFound =
      (verdict.decision === "redact" ? verdict.secretsFound : 0) +
      (titleVerdict.decision === "redact" ? titleVerdict.secretsFound : 0);

    const id = randomUUID();
    const now = new Date().toISOString();
    const tagsJson = input.tags && input.tags.length > 0
      ? JSON.stringify(input.tags)
      : null;

    this.stmts.insert.run(
      id,
      input.target,
      input.category ?? null,
      finalTitle,
      finalContent,
      tagsJson,
      input.failure_reason ?? null,
      now,
      now,
      null,
      null,
      null,
    );

    return { ok: true, id, redacted, secretsFound };
  }

  /** Fetch a memory by id. Touches `last_accessed_at` (cheap audit trail). */
  get(id: string): MemoryRecord | null {
    const row = this.stmts.select.get(id) as InsertRow | undefined;
    if (!row) return null;
    const now = new Date().toISOString();
    this.stmts.touch.run(now, id);
    return rowToRecord(row);
  }

  /** List memories, newest first. Cursor is the `created_at` ISO timestamp. */
  list(options: ListOptions = {}): MemoryRecord[] {
    const limit = clamp(options.limit ?? 50, 1, 500);
    const rows = this.stmts.selectAll.all(limit) as InsertRow[];
    let filtered = rows;
    if (options.target) filtered = filtered.filter((r) => r.target === options.target);
    if (options.cursor !== undefined) {
      const cursor = options.cursor;
      filtered = filtered.filter((r) => r.created_at < cursor);
    }
    return filtered.map(rowToRecord);
  }

  /** Total memory count. */
  stats(): { memories: number } {
    const row = this.stmts.count.get() as { count: number };
    return { memories: row.count };
  }

  /**
   * FTS5 search. Returns hits ordered by relevance (BM25-derived via
   * SQLite's `rank` virtual column, lower-is-better — we invert it
   * into a 0..1 score so callers can sort by descending score).
   */
  search(options: SearchOptions): MemoryHit[] {
    const limit = clamp(options.limit ?? 10, 1, 100);
    const ftsQuery = buildFtsQuery(options.query);
    if (ftsQuery === null) return [];

    // The prepared statement uses two /* … */ placeholders that we
    // splice at search time based on filters. This keeps the prepared
    // statement reusable for the most common case (no filters).
    const hasTarget = options.target !== undefined;
    const hasCategory = options.category !== undefined;
    const targetClause = hasTarget ? "AND m.target = ?" : "";
    const categoryClause = hasCategory ? "AND m.category = ?" : "";

    const sql = `
      SELECT m.id, m.target, m.category, m.title, m.content, m.tags,
             m.created_at, snippet(memories_fts, 2, '<', '>', '…', 8) AS matched_snippet,
             rank AS fts_rank
      FROM memories_fts
      JOIN memories m ON m.rowid = memories_fts.rowid
      WHERE memories_fts MATCH ?
        ${targetClause}
        ${categoryClause}
      ORDER BY fts_rank
      LIMIT ?
    `;
    const stmt = this.db.prepare(sql);

    const params: unknown[] = [ftsQuery];
    if (hasTarget) params.push(options.target);
    if (hasCategory) params.push(options.category);
    params.push(limit);

    const rows = stmt.all(...params) as SearchRow[];

    return rows.map((row) => ({
      id: row.id,
      target: row.target,
      category: row.category,
      title: row.title,
      content: row.content,
      tags: parseTags(row.tags),
      created_at: row.created_at,
      matched_snippet: row.matched_snippet,
      score: rankToScore(row.fts_rank),
    }));
  }

  /**
   * Replace fields on an existing memory. Empty title / content are
   * not allowed (validation identical to add). The new content and
   * title pass through the scanner before the write.
   */
  replace(
    id: string,
    patch: Partial<AddMemoryInput>,
  ): AddResult {
    const existing = this.stmts.select.get(id) as InsertRow | undefined;
    if (!existing) {
      return { ok: false, reason: `memory not found: ${id}` };
    }

    const merged: AddMemoryInput = {
      target: patch.target ?? existing.target,
      category: (patch.category ?? existing.category) ?? undefined,
      title: patch.title ?? existing.title,
      content: patch.content ?? existing.content,
      tags: patch.tags ?? parseTags(existing.tags) ?? undefined,
      failure_reason: patch.failure_reason ?? existing.failure_reason ?? undefined,
    };

    const validation = validateInput(merged);
    if (validation !== null) {
      return { ok: false, reason: validation };
    }

    const contentVerdict = scanForWrite(merged.content, this.mode);
    if (contentVerdict.decision === "block") {
      return { ok: false, reason: contentVerdict.reason };
    }
    const titleVerdict = scanForWrite(merged.title, this.mode);
    if (titleVerdict.decision === "block") {
      return { ok: false, reason: `title: ${titleVerdict.reason}` };
    }

    const finalContent =
      contentVerdict.decision === "redact" ? contentVerdict.text : merged.content;
    const finalTitle =
      titleVerdict.decision === "redact" ? titleVerdict.text : merged.title;
    const redacted =
      contentVerdict.decision === "redact" || titleVerdict.decision === "redact";
    const secretsFound =
      (contentVerdict.decision === "redact" ? contentVerdict.secretsFound : 0) +
      (titleVerdict.decision === "redact" ? titleVerdict.secretsFound : 0);

    const now = new Date().toISOString();
    const tagsJson = merged.tags && merged.tags.length > 0
      ? JSON.stringify(merged.tags)
      : null;

    this.stmts.update.run(
      merged.target,
      merged.category ?? null,
      finalTitle,
      finalContent,
      tagsJson,
      merged.failure_reason ?? null,
      now,
      id,
    );

    return { ok: true, id, redacted, secretsFound };
  }

  /** Delete a memory by id. Returns true if a row was removed. */
  remove(id: string): boolean {
    const result = this.stmts.delete.run(id);
    return result.changes > 0;
  }

  /** Close the underlying database. Idempotent. */
  close(): void {
    try {
      // Checkpoint the WAL so on next open we don't have to replay it.
      this.db.exec("PRAGMA wal_checkpoint(TRUNCATE)");
    } catch {
      // best effort
    }
    this.db.close();
  }
}

function rowToRecord(row: InsertRow): MemoryRecord {
  return {
    id: row.id,
    target: row.target,
    category: row.category,
    title: row.title,
    content: row.content,
    tags: parseTags(row.tags),
    failure_reason: row.failure_reason,
    created_at: row.created_at,
    updated_at: row.updated_at,
    maas_synced_at: row.maas_synced_at,
    maas_id: row.maas_id,
    last_accessed_at: row.last_accessed_at,
  };
}

function parseTags(tags: string | null): string[] | null {
  if (tags === null || tags === "") return null;
  try {
    const parsed = JSON.parse(tags) as unknown;
    if (Array.isArray(parsed) && parsed.every((t) => typeof t === "string")) {
      return parsed as string[];
    }
  } catch {
    // fall through
  }
  return null;
}

/**
 * Convert a user-friendly search query into a safe FTS5 MATCH expression.
 * Returns null when the query is empty / whitespace-only — an empty
 * MATCH against an FTS5 virtual table returns zero rows, which is the
 * opposite of what most callers expect when passing an empty query.
 */
function buildFtsQuery(query: string): string | null {
  const trimmed = query.trim();
  if (trimmed.length === 0) return null;
  // Split on whitespace, quote each token, AND them together.
  // FTS5 supports `token1 token2` (implicit AND). Wrapping each token
  // in double quotes turns it into a phrase match and prevents the
  // tokenizer from interpreting punctuation as syntax.
  return trimmed
    .split(/\s+/)
    .filter((tok) => tok.length > 0)
    .map((tok) => `"${tok.replace(/"/g, '""')}"`)
    .join(" ");
}

/**
 * Convert SQLite FTS5 rank (negative, lower-is-better) into a 0..1
 * score where higher is better. The mapping saturates: rank=0 -> 1.0,
 * rank <= -10 -> 0.0, linear in between. This is the same shape the
 * upstream pi-hermes-memory uses for its memory search scores.
 */
function rankToScore(rank: number): number {
  if (rank >= 0) return 1.0;
  if (rank <= -10) return 0.0;
  return 1.0 + rank / 10;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

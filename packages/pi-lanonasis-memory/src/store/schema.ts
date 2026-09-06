/**
 * schema.ts — FTS5 schema mirroring chandra447/pi-hermes-memory src/store.
 *
 * Scope-down vs the upstream repo: this extension only persists memories
 * for v1 (no sessions / messages tables). Sessions come in Phase 6 with
 * the hook-driven ingest; messages are an artifact of session ingest
 * and belong to that phase. The FTS5 trigram tokenizer from upstream
 * is also deferred — we use porter+unicode61 which is bundled with
 * every SQLite build and supports CJK / unicode well enough for the
 * local-first store. Trigram is a Phase 8+ optimization.
 *
 * Triggers keep memories_fts in sync with memories on insert / update /
 * delete — same shape as the upstream repo.
 */

export const SCHEMA_VERSION = "1";

/**
 * Single SQL string executed on a fresh database. Idempotent — every
 * statement uses IF NOT EXISTS so re-running it on an existing DB is
 * a no-op.
 */
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS extension_metadata (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS memories (
  id               TEXT PRIMARY KEY,
  target           TEXT NOT NULL CHECK (target IN ('memory', 'user', 'project', 'failure')),
  category         TEXT CHECK (category IN ('failure', 'correction', 'insight', 'preference', 'convention', 'tool-quirk') OR category IS NULL),
  title            TEXT NOT NULL,
  content          TEXT NOT NULL,
  tags             TEXT,                  -- JSON array, may be null
  failure_reason   TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now')),
  maas_synced_at   TEXT,
  maas_id          TEXT,
  last_accessed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_memories_target    ON memories(target);
CREATE INDEX IF NOT EXISTS idx_memories_category  ON memories(category);
CREATE INDEX IF NOT EXISTS idx_memories_created   ON memories(created_at DESC);

CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(
  title,
  content,
  tags,
  content='memories',
  content_rowid='rowid',
  tokenize='porter unicode61'
);

CREATE TRIGGER IF NOT EXISTS memories_ai AFTER INSERT ON memories BEGIN
  INSERT INTO memories_fts(rowid, title, content, tags)
  VALUES (new.rowid, new.title, new.content, new.tags);
END;

CREATE TRIGGER IF NOT EXISTS memories_ad AFTER DELETE ON memories BEGIN
  INSERT INTO memories_fts(memories_fts, rowid, title, content, tags)
  VALUES ('delete', old.rowid, old.title, old.content, old.tags);
END;

CREATE TRIGGER IF NOT EXISTS memories_au AFTER UPDATE ON memories BEGIN
  INSERT INTO memories_fts(memories_fts, rowid, title, content, tags)
  VALUES ('delete', old.rowid, old.title, old.content, old.tags);
  INSERT INTO memories_fts(rowid, title, content, tags)
  VALUES (new.rowid, new.title, new.content, new.tags);
END;
`;

/** Records the schema version so future migrations can branch. */
export const SCHEMA_VERSION_INSERT_SQL = `
INSERT INTO extension_metadata (key, value) VALUES ('schema_version', ?)
ON CONFLICT(key) DO UPDATE SET value = excluded.value
`;

export const TARGETS = ["memory", "user", "project", "failure"] as const;
export const CATEGORIES = [
  "failure",
  "correction",
  "insight",
  "preference",
  "convention",
  "tool-quirk",
] as const;

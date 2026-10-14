"""Local-first SQLite FTS5 memory store.

Port of the pi-lanonasis-memory patterns (src/store/) into a pure-Python
module for the Hermes provider.  Provides a single-file ``.db`` with:

- ``memories`` table  (id, target, category, title, content, tags, …)
- ``memories_fts`` FTS5 virtual table (porter unicode61 tokenizer)
- Auto-sync triggers on INSERT / UPDATE / DELETE

Security: every write path is gated by ``scan_for_write()`` (imports
redaction logic from the existing security module).

Usage (single-file API):
    store = LocalMemoryStore(open("/tmp/lanonasis.db"))
    store.add(title="test", content="hello", memory_type="context")
    hits = store.search("hello", limit=5)
    store.close()
"""
from __future__ import annotations

import json
import logging
import sqlite3
import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from .security import redact_secrets, looks_like_prompt_injection

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Schema (mirrors pi-lanonasis-memory/src/store/schema.ts)
# ---------------------------------------------------------------------------

SCHEMA_VERSION = "1"

SCHEMA_SQL = """\
CREATE TABLE IF NOT EXISTS extension_metadata (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS memories (
  id               TEXT PRIMARY KEY,
  target           TEXT NOT NULL DEFAULT 'memory' CHECK (target IN ('memory', 'user', 'project', 'failure')),
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
"""

SCHEMA_VERSION_SQL = f"""INSERT INTO extension_metadata (key, value) VALUES ('schema_version', '{SCHEMA_VERSION}')
ON CONFLICT(key) DO UPDATE SET value = excluded.value"""

# ---------------------------------------------------------------------------
# Data types
# ---------------------------------------------------------------------------

TARGETS = ("memory", "user", "project", "failure")
CATEGORIES = ("failure", "correction", "insight", "preference", "convention", "tool-quirk")


@dataclass
class MemoryHit:
    id: str
    title: str
    content: str
    score: float  # 0..1, higher=better
    target: str = "memory"
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    created_at: Optional[str] = None
    matched_snippet: Optional[str] = None


@dataclass
class MemoryRecord:
    id: str
    title: str
    content: str
    target: str = "memory"
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    last_accessed_at: Optional[str] = None
    # ``maas_id`` is the REMOTE MaaS row id populated by
    # ``mark_synced`` after a successful POST. Without surfacing it
    # here, callers like ``_tool_forget`` cannot resolve the correct
    # remote handle and end up DELETEing the wrong record.
    maas_id: Optional[str] = None
    # ``maas_synced_at`` is the timestamp of the last successful
    # (or attempted) sync — surfaced alongside ``maas_id`` so the
    # pair round-trips consistently.
    maas_synced_at: Optional[str] = None
    # ``failure_reason`` exists in the schema but has no public write
    # path yet (producers live elsewhere in the pipeline); we surface
    # it so the failure-mode handler can read the value back via
    # ``get_by_id`` / ``list_memories``.
    failure_reason: Optional[str] = None


@dataclass
class ScanVerdict:
    blocked: bool
    reason: Optional[str] = None
    redacted_text: Optional[str] = None
    secrets_found: int = 0


# ---------------------------------------------------------------------------
# Module-level helpers
# ---------------------------------------------------------------------------

def _parse_tags(value: Optional[str]) -> Optional[List[str]]:
    """Decode the stored ``tags`` JSON column.

    Contract: the tags column on ``memories`` is documented as "JSON
    array, may be null". Public-facing ``MemoryRecord.tags`` /
    ``MemoryHit.tags`` must always be ``Optional[List[str]]`` — never
    a bare string, dict, or other JSON value. This helper returns
    ``None`` for anything that isn't a JSON list (missing, malformed,
    or "shape mismatch" cases like ``'"foo"'`` or ``'{"k": 1}'``).

    Centralizing the rule here keeps ``search()``, ``get_by_id()``,
    and ``list_memories()`` returning identical shapes for the same
    row.
    """
    if not value:
        return None
    try:
        decoded = json.loads(value)
    except (json.JSONDecodeError, TypeError):
        return None
    if not isinstance(decoded, list):
        return None
    return decoded


# ---------------------------------------------------------------------------
# Scanner (mirrors pi-lanonasis-memory/src/scanner/scanner.ts)
# ---------------------------------------------------------------------------

def scan_for_write(text: str, mode: str = "block") -> ScanVerdict:
    """Pre-write scanner. Returns (blocked, reason, redacted_text).

    ``mode``:
    - "block"  – refuse if any secret or threat pattern fires.
    - "redact" – replace secrets with [REDACTED:...] markers.
      Threat patterns still block.
    """
    # Prompt injection / threat patterns always block
    if looks_like_prompt_injection(text):
        return ScanVerdict(blocked=True, reason="prompt injection detected")

    # Redact secrets
    result = redact_secrets(text, {"redact_pii": False})
    if result.secrets_found > 0:
        if mode == "redact":
            return ScanVerdict(
                blocked=False,
                redacted_text=result.text,
                secrets_found=result.secrets_found,
            )
        return ScanVerdict(
            blocked=True,
            reason=f"secret detected ({result.secrets_found} secret(s))",
        )

    return ScanVerdict(blocked=False)


# ---------------------------------------------------------------------------
# Local store
# ---------------------------------------------------------------------------


class LocalMemoryStore:
    """SQLite FTS5-backed memory store with security gate."""

    def __init__(self, db_path: str, mode: str = "block") -> None:
        self._path = db_path
        self._mode = mode
        # ``check_same_thread=False`` is safe here because every call into
        # ``self._conn`` is a short statement committed immediately, and
        # SQLite serializes writers at the file level. The provider's
        # background write threads (sync_turn, on_pre_compress,
        # on_session_end) all need to write to the same store from their
        # own threads, and a per-thread connection would require a
        # global lock — simpler to let SQLite serialize.
        conn = sqlite3.connect(
            str(db_path),
            check_same_thread=False,
            timeout=10.0,
        )
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA foreign_keys=ON")
        self._conn = conn
        self._init_schema()

    def _init_schema(self) -> None:
        self._conn.executescript(SCHEMA_SQL)
        self._conn.execute(SCHEMA_VERSION_SQL)
        self._conn.commit()

    def add(
        self,
        title: str,
        content: str,
        memory_type: str = "context",
        target: str = "memory",
        category: Optional[str] = None,
        tags: Optional[List[str]] = None,
        failure_reason: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Insert a memory. Gated by ``scan_for_write``.

        ``memory_type`` is accepted for call-site compatibility with the
        provider but is not persisted: the schema has no such column.

        Returns dict with keys: ``ok`` (bool), ``id`` (str|None),
        ``redacted`` (bool), ``secrets_found`` (int).
        """
        verdict = scan_for_write(content, self._mode)
        if verdict.blocked:
            return {"ok": False, "id": None, "reason": verdict.reason}

        title_verdict = scan_for_write(title, self._mode)
        if title_verdict.blocked:
            return {"ok": False, "id": None, "reason": f"title: {title_verdict.reason}"}

        final_content = verdict.redacted_text or content
        final_title = title_verdict.redacted_text or title
        redacted = (
            verdict.secrets_found > 0
            or title_verdict.secrets_found > 0
        )
        secrets_found = (
            verdict.secrets_found + title_verdict.secrets_found
        )

        tags_json = json.dumps(tags) if tags else None
        now = datetime.now(timezone.utc).isoformat()
        mem_id = str(uuid.uuid4())

        self._conn.execute(
            """INSERT INTO memories
               (id, target, category, title, content, tags, failure_reason,
                created_at, updated_at, maas_synced_at, maas_id, last_accessed_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                mem_id,
                target,
                category,
                final_title,
                final_content,
                tags_json,
                failure_reason,
                now,
                now,
                None,  # maas_synced_at
                None,  # maas_id
                None,  # last_accessed_at
            ),
        )
        self._conn.commit()

        return {"ok": True, "id": mem_id, "redacted": redacted, "secrets_found": secrets_found}

    def search(self, query: str, limit: int = 10) -> List[MemoryHit]:
        """FTS5 search. Returns hits ordered by relevance.

        The query is tokenised by splitting on whitespace and quoting
        each token — FTS5 ``MATCH`` with quoted terms behaves like a
        phrase/AND query.
        """
        if not query or not query.strip():
            return []

        # Build a safe MATCH expression
        tokens = query.strip().split()
        # FTS5 supports `token1 token2` (implicit AND). Wrapping each
        # token in double quotes turns it into a phrase match.
        escaped = []
        for tok in tokens:
            escaped.append(f'"{tok.replace(chr(34), chr(34)+chr(34))}"')
        fts_query = " ".join(escaped)

        sql = """
        SELECT m.id, m.target, m.category, m.title, m.content, m.tags,
               m.created_at,
               snippet(memories_fts, -1, '<', '>', '…', 8) AS matched_snippet,
               rank AS fts_rank
        FROM memories_fts
        JOIN memories m ON m.rowid = memories_fts.rowid
        WHERE memories_fts MATCH ?
        ORDER BY fts_rank
        LIMIT ?
        """
        rows = self._conn.execute(sql, (fts_query, limit)).fetchall()

        hits: List[MemoryHit] = []
        for row in rows:
            # Columns: 0=id, 1=target, 2=category, 3=title, 4=content,
            # 5=tags, 6=created_at, 7=matched_snippet, 8=fts_rank
            rank = row[8]
            score = max(0.0, min(1.0, 1.0 + rank / 10))

            hits.append(MemoryHit(
                id=row[0],
                target=row[1],
                category=row[2],
                title=row[3],
                content=row[4],
                score=score,
                tags=_parse_tags(row[5]),
                created_at=row[6],
                matched_snippet=row[7],
            ))
        return hits

    def touch(self, id: str) -> None:
        """Mark a memory as accessed."""
        now = datetime.now(timezone.utc).isoformat()
        self._conn.execute(
            "UPDATE memories SET last_accessed_at = ? WHERE id = ?",
            (now, id),
        )
        self._conn.commit()

    def get_by_id(self, id: str) -> Optional[MemoryRecord]:
        """Fetch a single memory row by id, or ``None`` if absent.

        Best-effort: never raises — a missing or malformed id returns
        ``None`` rather than propagating a SQLite error to the caller.
        Reuses the same row->``MemoryRecord`` mapping shape as
        :meth:`list_memories` so the two paths return identical record
        types for the same row.
        """
        if not id:
            return None
        try:
            row = self._conn.execute(
                "SELECT id, title, content, created_at, updated_at, last_accessed_at, target, category, tags, maas_id, maas_synced_at, failure_reason FROM memories WHERE id = ?",
                (id,),
            ).fetchone()
        except sqlite3.Error:
            logger.exception("get_by_id failed for id=%r", id)
            return None
        if row is None:
            return None
        return MemoryRecord(
            id=row[0],
            title=row[1],
            content=row[2],
            created_at=row[3],
            updated_at=row[4],
            last_accessed_at=row[5],
            target=row[6],
            category=row[7],
            tags=_parse_tags(row[8]),
            # Sync / failure columns surfaced so downstream callers
            # (notably ``_tool_forget``) can resolve the REMOTE id
            # without reading the raw SQLite row.
            maas_id=row[9],
            maas_synced_at=row[10],
            failure_reason=row[11],
        )

    def mark_synced(self, id: str, maas_id: Optional[str]) -> None:
        """Record that a memory was synced to the remote MaaS API.

        Contract:
        - ``id`` is required. ``None`` or ``""`` → early-return with a
          DEBUG log; no SQL is run. (Previously the empty-string guard
          was correct but ``None`` slipped through to a silent no-op
          UPDATE; both are now treated identically.)
        - When ``maas_id`` is ``None``:
          - ``maas_id`` column is left untouched (never clobbers a
            previously-set remote id).
          - ``maas_synced_at`` IS still stamped, so callers can tell
            when the last sync attempt happened.
        - When ``maas_id`` is a real string:
          - Both columns are updated.
          - ``maas_synced_at`` is idempotent: a retry that supplies the
            same id does NOT rewrite the timestamp. SQLite's
            ``COALESCE(maas_synced_at, datetime('now'))`` keeps the
            first successful sync timestamp.

        Best-effort: never raises — failures are logged and swallowed
        so a sync hiccup never blocks the local write path. A missing
        local row is a no-op (the UPDATE simply matches no rows).
        """
        # Falsy-id guard — must catch BOTH ``""`` and ``None``. The
        # original code only caught ``""`` because ``not id`` is true
        # for both, but earlier this was ``if not id: return`` and
        # was apparently lost in a refactor (None slipped through).
        # Debug-level log so a caller can distinguish "we skipped this
        # deliberately" from "we silently swallowed it".
        if not id:
            logger.debug("mark_synced: skipped — empty/None id (maas_id=%r)", maas_id)
            return

        now = datetime.now(timezone.utc).isoformat()
        try:
            if maas_id is not None:
                # Real assignment — set maas_id; let COALESCE keep the
                # first successful timestamp (idempotent on retry).
                self._conn.execute(
                    "UPDATE memories "
                    "SET maas_id = ?, "
                    "    maas_synced_at = COALESCE(maas_synced_at, ?) "
                    "WHERE id = ?",
                    (maas_id, now, id),
                )
            else:
                # maas_id=None is a NO-OP for that column (would
                # otherwise clobber a previously-stored remote id).
                # We still stamp ``maas_synced_at`` so the caller can
                # tell we attempted sync.
                self._conn.execute(
                    "UPDATE memories SET maas_synced_at = ? WHERE id = ?",
                    (now, id),
                )
            self._conn.commit()
        except sqlite3.Error:
            logger.exception("mark_synced failed for id=%r", id)
            # Best effort — drop the transaction state so subsequent
            # calls keep working instead of failing with "no transaction".
            try:
                self._conn.rollback()
            except sqlite3.Error:
                pass

    def delete(self, id: str) -> bool:
        """Remove a memory row by id. Returns True iff a row was removed.

        Contract:
        - ``DELETE FROM memories WHERE id = ?`` and commit.
        - Returns ``True`` when ``cursor.rowcount > 0`` (a row was
          removed), ``False`` otherwise (no such id).
        - The ``memories_ad`` AFTER DELETE trigger handles the FTS index
          cleanup automatically — do NOT touch ``memories_fts`` directly.
        - Best-effort: any ``sqlite3.Error`` is logged and swallowed,
          returning ``False``; the method must never raise so callers
          can safely chain it with the remote delete on the forget path.
        - Falsy-id (empty / ``None``) is a no-op returning ``False``
          with a DEBUG log, mirroring the ``mark_synced`` guard.
        """
        if not id:
            logger.debug("delete: skipped — empty/None id")
            return False
        try:
            cursor = self._conn.execute(
                "DELETE FROM memories WHERE id = ?",
                (id,),
            )
            self._conn.commit()
            return cursor.rowcount > 0
        except sqlite3.Error:
            logger.exception("delete failed for id=%r", id)
            try:
                self._conn.rollback()
            except sqlite3.Error:
                pass
            return False

    def close(self) -> None:
        try:
            self._conn.execute("PRAGMA wal_checkpoint(TRUNCATE)")
        except Exception:
            pass  # best effort
        self._conn.close()

    def stats(self) -> Dict[str, int]:
        row = self._conn.execute("SELECT COUNT(*) FROM memories").fetchone()
        return {"memories": row[0] if row else 0}

    def list_memories(
        self, limit: int = 50, offset: int = 0
    ) -> List[MemoryRecord]:
        """List memories newest first.

        SELECT and record shape mirror :meth:`get_by_id` 1:1 so both
        paths return identical records (including the new
        ``maas_id`` / ``maas_synced_at`` / ``failure_reason`` columns
        populated by ``get_by_id``).
        """
        rows = self._conn.execute(
            "SELECT id, title, content, created_at, updated_at, last_accessed_at, target, category, tags, maas_id, maas_synced_at, failure_reason FROM memories ORDER BY created_at DESC LIMIT ? OFFSET ?",
            (limit, offset),
        ).fetchall()
        results = []
        for row in rows:
            results.append(MemoryRecord(
                id=row[0],
                title=row[1],
                content=row[2],
                created_at=row[3],
                updated_at=row[4],
                last_accessed_at=row[5],
                target=row[6],
                category=row[7],
                tags=_parse_tags(row[8]),
                # Mirror the new columns from get_by_id().
                maas_id=row[9],
                maas_synced_at=row[10],
                failure_reason=row[11],
            ))
        return results
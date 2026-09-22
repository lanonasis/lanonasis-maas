"""Local-first SQLite FTS5 memory store.

Port of the pi-lanonasis-memory patterns (src/store/) into a pure-Python
module for the Hermes provider.  Provides a single-file ``.db`` with:

- ``memories`` table  (id, title, content, tags, memory_type, …)
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
    memory_type: str = "context"
    target: str = "memory"
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    last_accessed_at: Optional[str] = None


@dataclass
class ScanVerdict:
    blocked: bool
    reason: Optional[str] = None
    redacted_text: Optional[str] = None
    secrets_found: int = 0


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
        conn = sqlite3.connect(str(db_path))
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
        import uuid
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
               snippet(memories_fts, 2, '<', '>', '…', 8) AS matched_snippet,
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

            tags_str = row[5]
            tags = None
            if tags_str:
                try:
                    tags = json.loads(tags_str)
                    if not isinstance(tags, list):
                        tags = None
                except (json.JSONDecodeError, TypeError):
                    tags = None

            hits.append(MemoryHit(
                id=row[0],
                target=row[1],
                category=row[2],
                title=row[3],
                content=row[4],
                score=score,
                tags=tags,
                created_at=row[7],
                matched_snippet=row[8],
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
        """List memories newest first."""
        rows = self._conn.execute(
            "SELECT id, title, content, created_at, updated_at, last_accessed_at, target, category, tags FROM memories ORDER BY created_at DESC LIMIT ? OFFSET ?",
            (limit, offset),
        ).fetchall()
        results = []
        for row in rows:
            tags_str = row[8]
            tags = None
            if tags_str:
                try:
                    tags = json.loads(tags_str)
                except (json.JSONDecodeError, TypeError):
                    tags = None
            results.append(MemoryRecord(
                id=row[0],
                title=row[1],
                content=row[2],
                created_at=row[3],
                updated_at=row[4],
                last_accessed_at=row[5],
                target=row[6],
                category=row[7],
                tags=tags,
            ))
        return results

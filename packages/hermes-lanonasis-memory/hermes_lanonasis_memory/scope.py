"""Scope envelope and dedup helpers for the Hermes memory write policy.

The write policy redesign (H2) requires every REMOTE write to carry:

* ``scope_type`` ∈ {personal, project, workspace, agent, session, organization}
* ``scope_id``    – opaque identifier within the scope
* ``source``      – always ``"hermes"`` for this provider
* ``memory_class`` ∈ {canonical, raw_event, session_context, summary,
                      conclusion, profile, working_context}
* ``visibility``  ∈ {private, project, organization, shared} (default: private)
* ``session_id``  – active Hermes session
* ``source_memory_id`` – optional, for promotions from local → remote

The envelope is attached to payload ``metadata`` AND emitted as a fixed
set of tags (so MaaS can index by them without a schema migration):

    ["source:hermes", f"scope:{scope_type}:{scope_id}", f"class:{memory_class}"]

Caller tags are merged in afterwards.

Dedup is a process-local ring buffer keyed by (normalized title, sha256 of
content). Identical writes inside the last ``DEDUP_WINDOW`` are skipped.
Same-session title collisions are logged at debug.
"""

from __future__ import annotations

import hashlib
import logging
import os
import re
import subprocess
import threading
from collections import deque
from dataclasses import dataclass, field
from typing import Any, Deque, Dict, List, Optional, Tuple

_logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Enums (string literals — match the MaaS taxonomy)
# ---------------------------------------------------------------------------

SCOPE_PERSONAL = "personal"
SCOPE_PROJECT = "project"
SCOPE_WORKSPACE = "workspace"
SCOPE_AGENT = "agent"
SCOPE_SESSION = "session"
SCOPE_ORGANIZATION = "organization"
SCOPE_TYPES = frozenset({
    SCOPE_PERSONAL,
    SCOPE_PROJECT,
    SCOPE_WORKSPACE,
    SCOPE_AGENT,
    SCOPE_SESSION,
    SCOPE_ORGANIZATION,
})

MEMORY_CLASS_CANONICAL = "canonical"
MEMORY_CLASS_RAW_EVENT = "raw_event"
MEMORY_CLASS_SESSION_CONTEXT = "session_context"
MEMORY_CLASS_SUMMARY = "summary"
MEMORY_CLASS_CONCLUSION = "conclusion"
MEMORY_CLASS_PROFILE = "profile"
MEMORY_CLASS_WORKING_CONTEXT = "working_context"
MEMORY_CLASSES = frozenset({
    MEMORY_CLASS_CANONICAL,
    MEMORY_CLASS_RAW_EVENT,
    MEMORY_CLASS_SESSION_CONTEXT,
    MEMORY_CLASS_SUMMARY,
    MEMORY_CLASS_CONCLUSION,
    MEMORY_CLASS_PROFILE,
    MEMORY_CLASS_WORKING_CONTEXT,
})

VISIBILITY_PRIVATE = "private"
VISIBILITY_PROJECT = "project"
VISIBILITY_ORGANIZATION = "organization"
VISIBILITY_SHARED = "shared"
VISIBILITIES = frozenset({
    VISIBILITY_PRIVATE,
    VISIBILITY_PROJECT,
    VISIBILITY_ORGANIZATION,
    VISIBILITY_SHARED,
})


# ---------------------------------------------------------------------------
# Junk-title detection
# ---------------------------------------------------------------------------

# Patterns that identify a "junk" / pre-policy title we want to refuse.
# Case-insensitive. Each is a regex; the test name uses anchor-friendly
# forms (whole string or substring depending on intent).
JUNK_TITLE_PATTERNS: Tuple[str, ...] = (
    r"^Context( \(.*\))?$",
    r"^Session summary( \(.*\))?$",
    r"user turn",
    r"^response$",
    r"pre-compact",
    r"pre-compaction",
)
_JUNK_REGEXES: Tuple[re.Pattern[str], ...] = tuple(
    re.compile(p, re.IGNORECASE) for p in JUNK_TITLE_PATTERNS
)


def is_junk_title(title: Optional[str]) -> bool:
    """Return True if the title matches any of the legacy-junk patterns."""
    if not title:
        return False
    t = title.strip()
    for rgx in _JUNK_REGEXES:
        if rgx.search(t):
            return True
    return False


# ---------------------------------------------------------------------------
# Scope envelope
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class ScopeEnvelope:
    """The mandatory metadata every REMOTE write must carry."""

    scope_type: str
    scope_id: str
    source: str = "hermes"
    memory_class: str = MEMORY_CLASS_CANONICAL
    visibility: str = VISIBILITY_PRIVATE
    session_id: str = ""
    source_memory_id: Optional[str] = None

    def __post_init__(self) -> None:
        # Defensive validation — log a warning on oddities but don't raise,
        # so a misconfigured plugin still writes (just gets a warning).
        if self.scope_type not in SCOPE_TYPES:
            _logger.warning(
                "[scope] unknown scope_type=%r (expected one of %s)",
                self.scope_type, sorted(SCOPE_TYPES),
            )
        if self.memory_class not in MEMORY_CLASSES:
            _logger.warning(
                "[scope] unknown memory_class=%r (expected one of %s)",
                self.memory_class, sorted(MEMORY_CLASSES),
            )
        if self.visibility not in VISIBILITIES:
            _logger.warning(
                "[scope] unknown visibility=%r (expected one of %s)",
                self.visibility, sorted(VISIBILITIES),
            )

    def as_metadata(self) -> Dict[str, Any]:
        """Return the envelope as a ``metadata`` dict for the MaaS payload."""
        out: Dict[str, Any] = {
            "scope_type": self.scope_type,
            "scope_id": self.scope_id,
            "source": self.source,
            "memory_class": self.memory_class,
            "visibility": self.visibility,
        }
        if self.session_id:
            out["session_id"] = self.session_id
        if self.source_memory_id:
            out["source_memory_id"] = self.source_memory_id
        return out

    def as_tags(self) -> List[str]:
        """Return the mandatory tags the envelope always emits."""
        return [
            f"source:{self.source}",
            f"scope:{self.scope_type}:{self.scope_id}",
            f"class:{self.memory_class}",
        ]


def envelope_tags(env: ScopeEnvelope) -> List[str]:
    """Sugar — same as ``env.as_tags()``."""
    return env.as_tags()


def merge_envelope_into_tags(
    env: ScopeEnvelope, caller_tags: Optional[List[str]] = None
) -> List[str]:
    """Merge envelope tags with caller-provided tags (de-duped, order-preserving)."""
    merged: List[str] = []
    seen: set[str] = set()
    for t in list(env.as_tags()) + list(caller_tags or []):
        if not t:
            continue
        key = str(t)
        if key in seen:
            continue
        seen.add(key)
        merged.append(key)
    return merged


def build_envelope(
    *,
    memory_class: str = MEMORY_CLASS_CANONICAL,
    scope_type: str = SCOPE_PROJECT,
    scope_id: str = "agent:hermes",
    visibility: str = VISIBILITY_PRIVATE,
    session_id: str = "",
    source_memory_id: Optional[str] = None,
) -> ScopeEnvelope:
    """Construct an envelope with sensible defaults."""
    return ScopeEnvelope(
        scope_type=scope_type,
        scope_id=scope_id,
        source="hermes",
        memory_class=memory_class,
        visibility=visibility,
        session_id=session_id,
        source_memory_id=source_memory_id,
    )


# ---------------------------------------------------------------------------
# Project-scope resolution (no shell=True, no eval, no path-escape)
# ---------------------------------------------------------------------------

_GIT_TOPLEVEL_CACHE: Dict[str, Optional[str]] = {}


def _git_toplevel(start: str) -> Optional[str]:
    """Return the git toplevel for ``start`` or None. Cached per path.

    Uses ``git rev-parse --show-toplevel`` via a list-form subprocess call
    (no shell). Returns None on any failure — never raises.
    """
    if start in _GIT_TOPLEVEL_CACHE:
        return _GIT_TOPLEVEL_CACHE[start]
    try:
        out = subprocess.run(
            ["git", "rev-parse", "--show-toplevel"],
            cwd=start,
            capture_output=True,
            text=True,
            timeout=2.0,
            check=False,
        )
        top = (out.stdout or "").strip()
        result = top or None
    except (OSError, subprocess.TimeoutExpired, ValueError):
        result = None
    _GIT_TOPLEVEL_CACHE[start] = result
    return result


def resolve_project_scope(
    *,
    env: Optional[Any] = None,
    config_scope: Optional[str] = None,
    cwd: Optional[str] = None,
) -> Tuple[str, str]:
    """Pick the (scope_type, scope_id) for project-class writes.

    Order of precedence:

    1. ``LANONASIS_HERMES_SCOPE_TYPE`` / ``LANONASIS_HERMES_SCOPE_ID`` env
       (the highest-priority operator override)
    2. ``config.project_scope`` (set by `hermes memory setup`)
    3. Git toplevel basename of ``cwd`` (the most common case for a
       per-repo session — reuses the pattern the rest of Hermes already
       uses; **no shell=True**)
    4. ``("agent", "agent:hermes")`` — the safe default

    Returns a ``(scope_type, scope_id)`` tuple.
    """
    env_get = (
        (lambda k, d=None: env.get(k, d))
        if env is not None and hasattr(env, "get")
        else (lambda k, d=None: os.environ.get(k, d))
    )

    env_type = env_get("LANONASIS_HERMES_SCOPE_TYPE") or ""
    env_id = env_get("LANONASIS_HERMES_SCOPE_ID") or ""
    # Operator override: if SCOPE_ID is set, it wins.
    # If SCOPE_TYPE is also set, use it; otherwise default to "project"
    # (the most common case for a per-repo session).
    if env_id:
        scope_type = env_type if env_type in SCOPE_TYPES else SCOPE_PROJECT
        return scope_type, env_id

    if config_scope:
        return SCOPE_PROJECT, config_scope

    start = cwd or os.getcwd()
    top = _git_toplevel(start)
    if top:
        # basename, e.g. /Users/.../lanonasis-monorepo → "lanonasis-monorepo"
        return SCOPE_PROJECT, os.path.basename(top.rstrip("/")) or "agent:hermes"

    return SCOPE_AGENT, "agent:hermes"


# ---------------------------------------------------------------------------
# Dedup guard (process-local ring buffer + session title set)
# ---------------------------------------------------------------------------

DEDUP_WINDOW = 50  # last N remote writes kept for hash dedup


def _normalize_title(title: str) -> str:
    """Normalize a title for dedup comparison: lowercase, collapse whitespace."""
    if not title:
        return ""
    return re.sub(r"\s+", " ", title.strip().lower())


def _content_hash(content: str) -> str:
    return hashlib.sha256((content or "").encode("utf-8")).hexdigest()


@dataclass
class _DedupEntry:
    title_norm: str
    content_hash: str
    session_id: str
    ts: float


class DedupGuard:
    """Process-local dedup for REMOTE memory writes.

    Two complementary rules:

    1. Windowed hash: skip if the same (normalized title, sha256(content))
       was written in the last ``window`` remote writes.
    2. Session title: skip (and debug-log) if the same normalized title
       was written earlier in the same session.
    """

    def __init__(self, window: int = DEDUP_WINDOW) -> None:
        self._window = max(1, int(window))
        self._ring: Deque[_DedupEntry] = deque(maxlen=self._window)
        self._session_titles: Dict[str, set[str]] = {}
        self._lock = threading.Lock()

    def _record(self, entry: _DedupEntry) -> None:
        self._ring.append(entry)
        self._session_titles.setdefault(entry.session_id, set()).add(
            entry.title_norm
        )

    def check_and_record(
        self,
        *,
        title: str,
        content: str,
        session_id: str = "",
    ) -> Optional[str]:
        """Return a reason string if the write should be SKIPPED, else None.

        The check AND the record happen atomically — duplicate calls in
        the same process always see the prior write.
        """
        title_norm = _normalize_title(title)
        content_h = _content_hash(content)
        sid = session_id or ""
        with self._lock:
            # Rule 1: windowed hash
            for prior in reversed(self._ring):
                if (
                    prior.title_norm == title_norm
                    and prior.content_hash == content_h
                ):
                    return (
                        f"dedup: identical (title, content) written "
                        f"{int(__import__('time').time() - prior.ts)}s ago"
                    )
            # Rule 2: session-title
            prior_titles = self._session_titles.get(sid, set())
            if title_norm and title_norm in prior_titles:
                _logger.debug(
                    "[dedup] session=%s already has title %r — debug-log only",
                    sid, title,
                )
                # Per the brief: log at debug, do not hard-skip.
            self._record(_DedupEntry(
                title_norm=title_norm,
                content_hash=content_h,
                session_id=sid,
                ts=__import__("time").time(),
            ))
            return None

    def reset(self) -> None:
        with self._lock:
            self._ring.clear()
            self._session_titles.clear()


# Process-wide singleton (one provider per Hermes profile).
_GUARD = DedupGuard()


def get_dedup_guard() -> DedupGuard:
    return _GUARD

"""Federation dedup + limit enforcement for local and remote memory hits.

Pure-Python port of repl-cli's ``mergeHits`` (see
``packages/repl-cli/src/local-memory/router.ts``). Used by the Hermes
provider when it fans a single query out to both the local SQLite FTS5
store and the remote MaaS API and needs to merge the two ranked lists
before returning them to the caller.

Why this exists as its own module:

- The provider (``provider.py``) is the call-site that owns the local
  ``LocalMemoryStore`` and the ``LanOnasisClient``; we want the dedup
  rules unit-testable without spinning up either of those.
- The exact dedup key + winner-tiebreak rules are easy to get subtly
  wrong (id vs. content-hash, prefer_remote semantics, equal-score
  ties, intra-side collisions). Concentrating them in this module
  makes the contract visible.

Unified dedup behavior (all input paths use ONE routine):

- Every hit is registered under two keys (when present):
  ``id::<id>`` and ``hash::sha256(f"{title}::{content}")[:16]``.
- One insertion loop runs local-then-remote through the same routine.
- On collision between two DIFFERENT hit objects, the winner is kept
  by ``prefer_remote`` first, then ``new.score > existing.score``.
- The loser is *fully evicted*: every key pointing at the loser is
  removed, so it cannot leak through a key the winner lacks.
- Whichever side won gets tagged ``source='merged'`` to signal "we
  saw this in two places". Intra-side collisions (two locals or two
  remotes sharing an id) follow the same rules.
- Hit objects with no collision keep their side-tag (``'local'`` or
  ``'maas'``).
- Output is sorted score desc and truncated to ``limit`` if given.
  On a score tie without ``prefer_remote``, the existing (local)
  row is kept — Python's stable sort preserves insertion order
  (local first), matching repl-cli.

Output: list of plain dicts with keys ``id``, ``title``, ``content``,
``score``, ``source``, plus pass-through of ``memory_type`` / ``tags`` /
``created_at`` / ``target`` / ``category`` when present on the input.
"""

from __future__ import annotations

import hashlib
from typing import Any, Dict, List, Optional


def content_hash(content: str, title: str) -> str:
    """Return the 16-hex-char content hash used as the dedup key.

    Mirrors ``contentHash`` in repl-cli's ``router.ts``:
    ``sha256(f"{title}::{content}")`` truncated to 16 chars.
    """
    return hashlib.sha256(f"{title}::{content}".encode("utf-8")).hexdigest()[:16]


# Keys we pass through from a dataclass or dict to the output dict.
# Anything outside this set is dropped on the floor — we don't want
# provider-specific fields bleeding into a public contract.
_PASSTHROUGH_KEYS = ("memory_type", "tags", "created_at", "target", "category")


def _coerce(hit: Any) -> Dict[str, Any]:
    """Normalize a dataclass instance or dict into our canonical dict shape.

    Accepts:
    - ``local_store.MemoryHit`` dataclass
    - any object exposing ``id``, ``title``, ``content``, ``score`` attrs
    - any dict with the same keys
    """
    if isinstance(hit, dict):
        base: Dict[str, Any] = {
            "id": hit.get("id"),
            "title": hit.get("title", ""),
            "content": hit.get("content", ""),
            "score": hit.get("score", 0.0),
        }
        for k in _PASSTHROUGH_KEYS:
            if k in hit:
                base[k] = hit[k]
        return base

    # dataclass / arbitrary object path
    base = {
        "id": getattr(hit, "id", None),
        "title": getattr(hit, "title", ""),
        "content": getattr(hit, "content", ""),
        "score": getattr(hit, "score", 0.0),
    }
    for k in _PASSTHROUGH_KEYS:
        v = getattr(hit, k, None)
        if v is not None:
            base[k] = v
    return base


def _hash_key(hit: Dict[str, Any]) -> str:
    """Content-hash dedup key — always available, identical for same (title, content)."""
    return f"hash::{content_hash(hit.get('content', ''), hit.get('title', ''))}"


def _id_key(hit: Dict[str, Any]) -> Optional[str]:
    """Id-based dedup key — None when the hit has no id."""
    if hit.get("id"):
        return f"id::{hit['id']}"
    return None


def _all_keys(hit: Dict[str, Any]) -> List[str]:
    """All dedup keys this hit can be looked up by."""
    keys = [_hash_key(hit)]
    ik = _id_key(hit)
    if ik is not None:
        keys.append(ik)
    return keys


def _bucket_for(key: str, by_id: Dict[str, Dict[str, Any]], by_hash: Dict[str, Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
    """Pick the right key-bucket for ``key`` (mutually exclusive split)."""
    if key.startswith("id::"):
        return by_id
    return by_hash


def merge_hits(
    local: List[Any],
    remote: List[Any],
    prefer_remote: bool = False,
    limit: Optional[int] = None,
) -> List[Dict[str, Any]]:
    """Federate local and remote hits, dedup, sort by score desc, truncate.

    Returns a list of plain dicts (always — never dataclass instances —
    so callers don't need to know which side a hit came from).

    All three input shapes (only local, only remote, both) flow through
    ONE dedup routine — see the module docstring. There is no
    empty-input fast path that skips dedup.
    """
    # Two buckets of dedup keys, mutally exclusive. A single hit
    # object can be referenced by zero or one id:: key (when it has
    # an id) plus exactly one hash:: key. Tracking buckets separately
    # lets us evict cleanly without quadratic scans during collisions.
    by_id: Dict[str, Dict[str, Any]] = {}
    by_hash: Dict[str, Dict[str, Any]] = {}

    def _find_existing(hit: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Return the first existing hit this object collides with, or None."""
        for k in _all_keys(hit):
            existing = by_id.get(k) if k.startswith("id::") else by_hash.get(k)
            if existing is not None:
                return existing
        return None

    def _register(hit: Dict[str, Any]) -> None:
        """Bind every key of ``hit`` to itself in the dedup state."""
        for k in _all_keys(hit):
            _bucket_for(k, by_id, by_hash)[k] = hit

    def _evict(hit: Dict[str, Any]) -> None:
        """Remove every key currently pointing at ``hit``.

        Critical: ``_register`` later may not cover every key the
        loser carried (e.g. a hit-by-id loser whose winner is a
        hash-only tie-in). Without this, the loser leaks through any
        key the new winner lacks.
        """
        for bucket in (by_id, by_hash):
            for k in list(bucket.keys()):
                if bucket[k] is hit:
                    del bucket[k]

    def _add_one(hit: Dict[str, Any], side: str) -> Dict[str, Any]:
        """Insert ``hit`` on ``side`` through the unified dedup pass.

        ``side`` is ``"local"`` for the local pass and ``"maas"`` for
        remote — it's the source tag the row gets on first sight.
        On a collision the survivor is re-tagged ``"merged"`` and the
        loser is evicted.
        """
        existing = _find_existing(hit)
        if existing is None:
            hit["source"] = side
            _register(hit)
            return hit

        # Collision: keep the higher-scoring body; ``prefer_remote``
        # always flips this. The loser is fully evicted so it cannot
        # leak through any key the new winner doesn't carry.
        take_new = prefer_remote or hit["score"] > existing["score"]
        if take_new:
            _evict(existing)
            hit["source"] = "merged"
            _register(hit)
            # Loser (existing) is fully gone — no source tag needed.
            return hit
        existing["source"] = "merged"
        # Loser (hit) is discarded — not registered anywhere.
        return existing

    # Local pass — every local hit goes through _add_one. Intra-side
    # collisions collapse here too.
    for h in local:
        _add_one(_coerce(h), side="local")

    # Remote pass — same routine. Inter-side collisions resolve here.
    for h in remote:
        _add_one(_coerce(h), side="maas")

    # Collapse duplicate object references — a single hit dict is
    # reachable under both an id:: key and a hash:: key, but the
    # caller wants each hit once.
    seen: set = set()
    final: List[Dict[str, Any]] = []
    for bucket in (by_id.values(), by_hash.values()):
        for hit in bucket:
            if id(hit) in seen:
                continue
            seen.add(id(hit))
            final.append(hit)

    # Sort score-desc; Python's sort is stable so equal-score entries
    # preserve insertion order (local before remote, matching repl-cli).
    final.sort(key=lambda r: r["score"], reverse=True)
    return final[:limit] if limit is not None else final

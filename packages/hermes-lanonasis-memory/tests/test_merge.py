"""Unit tests for hermes_lanonasis_memory.merge.

Pure-Python port of repl-cli's ``mergeHits`` (router.ts). Covers the
federation dedup + limit contract:

- remote empty -> local unchanged
- local empty  -> remote tagged 'maas'
- identical (title,content) -> one merged result, source 'merged'
- same id different content -> deduped by id
- prefer_remote flips the winner
- higher remote score wins without prefer_remote
- limit truncates after the score-desc sort
"""

from hermes_lanonasis_memory.local_store import MemoryHit
from hermes_lanonasis_memory import merge


def _hit(id=None, title="t", content="c", score=0.5, tags=None, created_at=None):
    """Shorthand: build a MemoryHit without repeating every default."""
    return MemoryHit(
        id=id or "",
        title=title,
        content=content,
        score=score,
        tags=tags,
        created_at=created_at,
    )


class TestContentHash:
    def test_deterministic_and_truncated(self):
        h1 = merge.content_hash("hello world", "greeting")
        h2 = merge.content_hash("hello world", "greeting")
        assert h1 == h2
        assert len(h1) == 16

    def test_differs_when_content_differs(self):
        assert merge.content_hash("a", "t") != merge.content_hash("b", "t")

    def test_differs_when_title_differs(self):
        # The reference uses ``title::content`` so title participates.
        assert merge.content_hash("c", "title-a") != merge.content_hash("c", "title-b")


class TestMergeHitsRemoteEmpty:
    def test_returns_local_unchanged(self):
        local = [_hit(id="L1", title="x", content="body", score=0.7)]
        out = merge.merge_hits(local, [], prefer_remote=False)
        assert len(out) == 1
        assert out[0]["id"] == "L1"
        assert out[0]["score"] == 0.7


class TestMergeHitsLocalEmpty:
    def test_returns_remote_tagged_maas(self):
        remote = [
            _hit(id="R1", title="x", content="body", score=0.9),
            _hit(id="R2", title="y", content="other", score=0.4),
        ]
        out = merge.merge_hits([], remote, prefer_remote=False)
        assert len(out) == 2
        assert all(r["source"] == "maas" for r in out)
        # Both ids preserved
        assert {r["id"] for r in out} == {"R1", "R2"}


class TestMergeHitsDedup:
    def test_identical_title_content_collapses_to_one_merged(self):
        local = [_hit(id="L1", title="same", content="same body", score=0.5)]
        remote = [_hit(id="R1", title="same", content="same body", score=0.5)]
        out = merge.merge_hits(local, remote, prefer_remote=False)
        assert len(out) == 1
        assert out[0]["source"] == "merged"
        assert out[0]["title"] == "same"
        assert out[0]["content"] == "same body"

    def test_same_id_different_content_dedupes_by_id(self):
        # If callers re-use an id but mutate the body, dedup is by id —
        # content-hash would NOT collapse these.
        local = [_hit(id="ID1", title="t", content="local body", score=0.6)]
        remote = [_hit(id="ID1", title="t", content="remote body", score=0.6)]
        out = merge.merge_hits(local, remote, prefer_remote=False)
        assert len(out) == 1
        assert out[0]["id"] == "ID1"
        assert out[0]["source"] == "merged"

    def test_distinct_items_kept_separate(self):
        local = [_hit(id="L1", title="alpha", content="a body", score=0.7)]
        remote = [_hit(id="R1", title="beta", content="b body", score=0.6)]
        out = merge.merge_hits(local, remote, prefer_remote=False)
        assert len(out) == 2
        sources = {r["source"] for r in out}
        assert sources == {"local", "maas"}


class TestMergeHitsPreferRemote:
    def test_prefer_remote_flips_winner_on_score_tie(self):
        # Equal scores: without prefer_remote local wins, with it remote wins.
        local = [_hit(id="L1", title="t", content="c", score=0.5)]
        remote = [_hit(id="R1", title="t", content="c", score=0.5)]
        no_pref = merge.merge_hits(local, remote, prefer_remote=False)
        pref = merge.merge_hits(local, remote, prefer_remote=True)
        # Without preference, local content survives.
        assert no_pref[0]["content"] == "c"
        assert no_pref[0]["source"] == "merged"
        # With prefer_remote, remote content wins.
        assert pref[0]["content"] == "c"
        assert pref[0]["source"] == "merged"
        # The deciding difference is which id survived.
        assert no_pref[0]["id"] == "L1"
        assert pref[0]["id"] == "R1"

    def test_prefer_remote_wins_even_when_local_score_higher(self):
        local = [_hit(id="L1", title="t", content="c", score=0.9)]
        remote = [_hit(id="R1", title="t", content="c", score=0.4)]
        out = merge.merge_hits(local, remote, prefer_remote=True)
        assert len(out) == 1
        assert out[0]["id"] == "R1"
        assert out[0]["source"] == "merged"


class TestMergeHitsScoring:
    def test_higher_remote_score_wins_without_prefer(self):
        local = [_hit(id="L1", title="t", content="c", score=0.5)]
        remote = [_hit(id="R1", title="t", content="c", score=0.8)]
        out = merge.merge_hits(local, remote, prefer_remote=False)
        assert len(out) == 1
        # Remote scored higher -> remote body wins.
        assert out[0]["id"] == "R1"
        assert out[0]["score"] == 0.8
        assert out[0]["source"] == "merged"

    def test_local_wins_on_exact_score_tie_without_prefer(self):
        # Same id, different bodies — id-based dedup with a tied score.
        # The reference behaviour on a tie is "keep the existing (local)
        # entry"; remote is discarded but the surviving row is still
        # tagged 'merged' to signal "we saw this in two places".
        local = [_hit(id="ID1", title="t", content="local-body", score=0.5)]
        remote = [_hit(id="ID1", title="t", content="remote-body", score=0.5)]
        out = merge.merge_hits(local, remote, prefer_remote=False)
        assert out[0]["id"] == "ID1"
        assert out[0]["content"] == "local-body"
        assert out[0]["source"] == "merged"


class TestMergeHitsSortAndLimit:
    def test_results_sorted_score_desc(self):
        local = [
            _hit(id="L1", title="low", content="a", score=0.2),
            _hit(id="L2", title="mid", content="b", score=0.5),
        ]
        remote = [
            _hit(id="R1", title="high", content="c", score=0.9),
            _hit(id="R2", title="mid2", content="d", score=0.6),
        ]
        out = merge.merge_hits(local, remote, prefer_remote=False)
        scores = [r["score"] for r in out]
        assert scores == sorted(scores, reverse=True)

    def test_limit_truncates_after_sort(self):
        local = [
            _hit(id="L1", title="a", content="aa", score=0.9),
            _hit(id="L2", title="b", content="bb", score=0.7),
            _hit(id="L3", title="c", content="cc", score=0.5),
        ]
        remote = [
            _hit(id="R1", title="d", content="dd", score=0.8),
            _hit(id="R2", title="e", content="ee", score=0.6),
        ]
        out = merge.merge_hits(local, remote, prefer_remote=False, limit=3)
        assert len(out) == 3
        # Top-3 by score: 0.9, 0.8, 0.7
        assert [r["score"] for r in out] == [0.9, 0.8, 0.7]

    def test_limit_none_returns_all(self):
        # Disjoint titles/content so no dedup — limit=None must keep every row.
        local = [_hit(id=f"L{i}", title=f"local-{i}", content=f"local-body-{i}", score=0.1 * i) for i in range(1, 6)]
        remote = [_hit(id=f"R{i}", title=f"remote-{i}", content=f"remote-body-{i}", score=0.1 * i + 0.01) for i in range(1, 4)]
        out = merge.merge_hits(local, remote, prefer_remote=False, limit=None)
        assert len(out) == 8  # 5 local + 3 remote, all distinct


class TestMergeHitsDictInput:
    def test_accepts_plain_dicts(self):
        local = [{"id": "L1", "title": "t", "content": "c", "score": 0.5}]
        remote = [{"id": "R1", "title": "u", "content": "d", "score": 0.7}]
        out = merge.merge_hits(local, remote, prefer_remote=False)
        assert len(out) == 2
        assert all(isinstance(r, dict) for r in out)

    def test_passes_through_memory_type_and_tags(self):
        local = [{
            "id": "L1", "title": "t", "content": "c", "score": 0.5,
            "memory_type": "context", "tags": ["alpha"], "created_at": "2026-01-01T00:00:00Z",
        }]
        remote = [{
            "id": "R1", "title": "u", "content": "d", "score": 0.7,
            "memory_type": "context", "tags": ["beta"], "created_at": "2026-01-02T00:00:00Z",
        }]
        out = merge.merge_hits(local, remote, prefer_remote=False)
        by_id = {r["id"]: r for r in out}
        assert by_id["L1"]["tags"] == ["alpha"]
        assert by_id["R1"]["tags"] == ["beta"]
        assert by_id["L1"]["memory_type"] == "context"


# ---------------------------------------------------------------------------
# Regression: empty-input paths used to skip dedup entirely, and Path-3
# could leak a loser through a key the winner lacked (so two locals
# sharing an id produced 2 rows; one local + one remote + intra-side
# local collision produced 3 rows). All three paths must now run through
# ONE dedup routine.
# ---------------------------------------------------------------------------
class TestMergeHitsDedupUnified:
    def test_duplicate_identical_local_hits_empty_remote_collapse_to_one(self):
        # Bug: empty-remote fast path bypassed dedup -> 2 rows returned.
        local = [
            {"id": "a", "title": "t", "content": "c", "score": 0.5},
            {"id": "a", "title": "t", "content": "c", "score": 0.5},
        ]
        out = merge.merge_hits(local, [])
        assert len(out) == 1
        assert out[0]["id"] == "a"

    def test_two_locals_same_id_diff_content_empty_remote_collapse_to_one(self):
        # Bug: empty-remote fast path returned both locals even though
        # they share an id and would have collapsed in Path 3.
        local = [
            {"id": "DUP", "title": "t1", "content": "c1", "score": 0.5},
            {"id": "DUP", "title": "t2", "content": "c2", "score": 0.6},
        ]
        out = merge.merge_hits(local, [])
        assert len(out) == 1
        assert out[0]["id"] == "DUP"
        # No prefer_remote: higher score wins (c2 at 0.6 > c1 at 0.5).
        assert out[0]["content"] == "c2"
        assert out[0]["score"] == 0.6

    def test_two_locals_same_id_with_remote_yields_exactly_two_rows(self):
        # Bug: Path-3 leaked the loser of the local collision because
        # _register() overwrote a key pointing at a different object.
        # Result was 3 rows; expected 2 (one local, one remote).
        local = [
            {"id": "DUP", "title": "t1", "content": "c1", "score": 0.5},
            {"id": "DUP", "title": "t2", "content": "c2", "score": 0.6},
        ]
        remote = [{"id": "R", "title": "r", "content": "x", "score": 0.7}]
        out = merge.merge_hits(local, remote)
        assert len(out) == 2
        ids = {r["id"] for r in out}
        # DUP still survives (one row); R survives (one row).
        assert ids == {"DUP", "R"}

    def test_two_identical_remote_hits_empty_local_collapse_to_one(self):
        local = []
        remote = [
            {"id": "x", "title": "t", "content": "c", "score": 0.5},
            {"id": "x", "title": "t", "content": "c", "score": 0.5},
        ]
        out = merge.merge_hits(local, remote)
        assert len(out) == 1
        assert out[0]["id"] == "x"
        # Both remotes hit the same id/hash key; even on a score tie
        # the survivor is tagged 'merged' because two distinct objects
        # collided for the same row.

    def test_remote_empty_dedup_at_three_identical_locals(self):
        # Strengthened: three identical locals, not just two.
        local = [
            {"id": "k", "title": "t", "content": "c", "score": 0.5}
            for _ in range(3)
        ]
        out = merge.merge_hits(local, [])
        assert len(out) == 1
        assert out[0]["id"] == "k"

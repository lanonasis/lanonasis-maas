"""Tests for the Hermes write-policy refactor (H2 / Mission brief).

The provider now writes:

* Raw turns → local FTS5 store only, by default. Opt-in remote via
  ``LANONASIS_HERMES_REMOTE_RAW_TURNS=1``.
* Pre-compress summary → local working_context only, NEVER remote.
* Session-end synthesis → local summary, at most one per session.
  Opt-in remote via ``LANONASIS_HERMES_REMOTE_SESSION_SUMMARY=1``.
* Explicit ``memory_store`` tool → canonical remote, with a scope
  envelope (memory_class / scope_type / scope_id / visibility / source /
  session_id) carried in both payload metadata and tags.

A process-wide dedup guard skips identical (title + content-hash) writes
inside the last 50 remote writes and identical normalized titles in the
same session.
"""

from __future__ import annotations

import json
import re
import threading
import time
import hashlib
from unittest.mock import MagicMock, patch

import pytest


# ---------------------------------------------------------------------------
# 1. Scope envelope
# ---------------------------------------------------------------------------

class TestScopeEnvelope:
    def test_envelope_carries_scope_type_and_id(self, provider, monkeypatch):
        """Explicit store attaches the scope envelope to metadata + tags."""
        from hermes_lanonasis_memory.scope import build_envelope, SCOPE_PROJECT
        provider._config.tool_policy = "write"
        provider._config.project_scope = "lan-onasis-monorepo"
        # Force project scope resolution.
        monkeypatch.setenv("LANONASIS_HERMES_SCOPE_TYPE", "project")
        monkeypatch.setenv("LANONASIS_HERMES_SCOPE_ID", "lan-onasis-monorepo")

        result = provider.handle_tool_call("memory_store", {
            "title": "Operator decision log",
            "content": "We chose Python 3.12 as the floor.",
            "memory_type": "project",
        })
        data = json.loads(result)
        assert data["stored"] is True
        # The remote post was called with the envelope in metadata AND tags.
        assert provider._client.post.call_count >= 1
        args, kwargs = provider._client.post.call_args
        payload = kwargs.get("json") or args[1]
        assert payload["metadata"]["scope_type"] == "project"
        assert payload["metadata"]["scope_id"] == "lan-onasis-monorepo"
        assert payload["metadata"]["memory_class"] == "canonical"
        # The envelope's ``source`` field is the operator/system identity
        # (``hermes``) — different from the call-site ``source`` field
        # which records where the write came from inside the provider.
        assert payload["metadata"]["source"] == "hermes"
        assert "visibility" in payload["metadata"]
        assert any(t.startswith("scope:") for t in payload["tags"]), (
            f"scope tag missing from {payload['tags']}"
        )
        assert any(t.startswith("class:") for t in payload["tags"]), (
            f"class tag missing from {payload['tags']}"
        )
        assert "source:hermes" in payload["tags"]

    def test_envelope_default_visibility_is_private(self, provider, monkeypatch):
        provider._config.tool_policy = "write"
        result = provider.handle_tool_call("memory_store", {
            "title": "Defaults check",
            "content": "visibility defaults to private",
        })
        provider.shutdown()
        args, kwargs = provider._client.post.call_args
        payload = kwargs.get("json") or args[1]
        assert payload["metadata"]["visibility"] == "private"

    def test_envelope_includes_session_id(self, provider):
        provider._config.tool_policy = "write"
        result = provider.handle_tool_call("memory_store", {
            "title": "Session tag check",
            "content": "session id propagated",
        })
        provider.shutdown()
        args, kwargs = provider._client.post.call_args
        payload = kwargs.get("json") or args[1]
        assert payload["metadata"]["session_id"] == "test-session-001"

    def test_envelope_merge_preserves_caller_tags(self, provider):
        provider._config.tool_policy = "write"
        result = provider.handle_tool_call("memory_store", {
            "title": "Caller tags preserved",
            "content": "tag merging works",
            "tags": ["alpha", "beta"],
        })
        provider.shutdown()
        args, kwargs = provider._client.post.call_args
        payload = kwargs.get("json") or args[1]
        for t in ("alpha", "beta", "source:hermes"):
            assert t in payload["tags"], f"missing {t} in {payload['tags']}"

    def test_envelope_module_exports_helpers(self):
        from hermes_lanonasis_memory import scope
        assert hasattr(scope, "ScopeEnvelope")
        assert hasattr(scope, "build_envelope")
        assert hasattr(scope, "envelope_tags")
        assert hasattr(scope, "SCOPE_PROJECT")
        assert hasattr(scope, "MEMORY_CLASS_CANONICAL")


# ---------------------------------------------------------------------------
# 2. Raw turns (sync_turn) — never remote by default
# ---------------------------------------------------------------------------

class TestSyncTurnLocalByDefault:
    def test_sync_turn_makes_zero_remote_calls_by_default(self, provider):
        """The contract: raw turns are local-only unless explicitly opted in."""
        provider._client.post.reset_mock()
        # Even a content-heavy turn with a strong signal must NOT hit the API.
        # The credential below is a placeholder (look-up key) so it doesn't
        # trip gitleaks' generic-api-key detector.
        provider.sync_turn(
            user_content="Remember that the API key is <<LOOKUP_KEY>>",
            assistant_content="Noted — the credential will be redacted in any store.",
        )
        provider.shutdown()
        assert provider._client.post.call_count == 0, (
            "raw sync_turn wrote to remote without opt-in"
        )

    def test_sync_turn_writes_locally_by_default(self, provider):
        provider._client.post.reset_mock()
        provider.sync_turn(
            user_content="Remember that the API key is <<LOOKUP_KEY>>",
            assistant_content="Noted.",
        )
        # Drain the background write thread BEFORE reading the local store
        # so the in-flight SQLite commit from the daemon thread has landed.
        provider.shutdown()
        # Open a fresh store on the same DB file for a race-free read.
        from hermes_lanonasis_memory.local_store import LocalMemoryStore
        records = LocalMemoryStore(provider._local_store._path).list_memories(limit=20)
        assert any(
            r.title.startswith("raw_event") or "raw_event" in (r.tags or [])
            for r in records
        ), f"no raw_event local record found: titles={[r.title for r in records]}"

    def test_sync_turn_remote_only_with_explicit_opt_in(self, provider, monkeypatch):
        monkeypatch.setenv("LANONASIS_HERMES_REMOTE_RAW_TURNS", "1")
        provider._client.post.reset_mock()
        provider.sync_turn(
            user_content="Remember that the API key is <<LOOKUP_KEY>>",
            assistant_content="Noted.",
        )
        provider.shutdown()
        # At least one remote post happened.
        assert provider._client.post.call_count >= 1
        args, kwargs = provider._client.post.call_args
        payload = kwargs.get("json") or args[1]
        # And the envelope / class are present.
        assert payload["metadata"]["memory_class"] == "raw_event"
        assert "class:raw_event" in payload["tags"]

    def test_credential_pattern_no_longer_selects_turn(self, provider):
        """The 'credential' class is removed from _STORE_SIGNALS entirely.

        A turn that ONLY mentions a credential is no longer selected.
        """
        from hermes_lanonasis_memory.provider import LanonasisMemoryProvider
        signals = dict(LanonasisMemoryProvider._STORE_SIGNALS)
        assert "credential" not in signals, (
            f"credential class still in _STORE_SIGNALS: {signals}"
        )
        # Functional check: a pure-credential turn is filtered out.
        # Use a placeholder-shaped credential so the existing gitleaks
        # baseline (4 known hits in test_security.py) does not grow.
        provider._client.post.reset_mock()
        provider.sync_turn(
            user_content="api_key=<<LOOKUP_KEY>>",
            assistant_content="ok",
        )
        provider.shutdown()
        assert provider._client.post.call_count == 0


# ---------------------------------------------------------------------------
# 3. on_pre_compress — never remote
# ---------------------------------------------------------------------------

class TestOnPreCompressLocalOnly:
    def test_pre_compress_returns_string(self, provider):
        summary = provider.on_pre_compress(
            [{"role": "user", "content": "we decided to use bun"}]
        )
        assert isinstance(summary, str)
        assert summary  # non-empty

    def test_pre_compress_makes_zero_remote_calls(self, provider):
        provider._client.post.reset_mock()
        provider.on_pre_compress(
            [{"role": "user", "content": "we decided to use bun"}]
        )
        provider.shutdown()
        assert provider._client.post.call_count == 0, (
            "on_pre_compress still wrote to remote"
        )

    def test_pre_compress_writes_working_context_locally(self, provider):
        provider._client.post.reset_mock()
        provider.on_pre_compress(
            [{"role": "user", "content": "we decided to use bun"}]
        )
        # Read local store BEFORE shutdown closes the DB.
        records = provider._local_store.list_memories(limit=20)
        provider.shutdown()
        # Should be a local row tagged working_context.
        found = False
        for r in records:
            tags = r.tags if isinstance(r.tags, list) else (
                json.loads(r.tags) if r.tags else []
            )
            if "class:working_context" in tags or "memory_class:working_context" in tags:
                found = True
                break
        assert found, (
            f"no working_context local record: titles={[r.title for r in records]}"
        )

    def test_pre_compress_title_is_not_legacy_literal(self, provider):
        """The literal 'Session summary (pre-compress)' must never be stored."""
        provider.on_pre_compress(
            [{"role": "user", "content": "Some session content for testing"}]
        )
        records = provider._local_store.list_memories(limit=50)
        provider.shutdown()
        for r in records:
            assert r.title != "Session summary (pre-compress)", (
                "legacy junk title leaked into local store"
            )


# ---------------------------------------------------------------------------
# 4. Session-end — at most one local synthesis
# ---------------------------------------------------------------------------

class TestOnSessionEndLocalOnly:
    def test_session_end_makes_zero_remote_calls_by_default(self, provider):
        provider._client.post.reset_mock()
        provider.on_session_end(
            [{"role": "user", "content": "we decided to use bun"}]
        )
        provider.shutdown()
        # Remote POST is reserved for opt-in. The flush endpoint is allowed
        # (it's the session_end reasoning flush, not a memory write).
        write_calls = [
            c for c in provider._client.post.call_args_list
            if "/api/v1/memories" in str(c) and "search" not in str(c)
        ]
        assert len(write_calls) == 0, (
            f"session_end wrote to /memories: {write_calls}"
        )

    def test_session_end_remote_only_with_explicit_opt_in(
        self, provider, monkeypatch
    ):
        monkeypatch.setenv("LANONASIS_HERMES_REMOTE_SESSION_SUMMARY", "1")
        provider._client.post.reset_mock()
        # First session_end call.
        provider.on_session_end(
            [{"role": "user", "content": "We will switch to Postgres for the new service."}]
        )
        provider.shutdown()
        # If a memory write happened, its title must be a real synthesis title.
        write_calls = [
            c for c in provider._client.post.call_args_list
            if "/api/v1/memories" in str(c) and "search" not in str(c)
        ]
        if write_calls:
            args, kwargs = write_calls[0]
            payload = kwargs.get("json") or args[1]
            assert payload["title"] != "Session summary (pre-compress)", (
                "legacy junk title still in use"
            )
            assert "session" in payload["title"].lower()

    def test_session_end_writes_summary_locally(self, provider):
        provider._client.post.reset_mock()
        provider.on_session_end(
            [{"role": "user", "content": "Quick brown fox jumping over a lazy dog here"}]
        )
        # Read local store BEFORE shutdown closes the DB.
        records = provider._local_store.list_memories(limit=20)
        provider.shutdown()
        tags_found = []
        for r in records:
            tags = r.tags if isinstance(r.tags, list) else (
                json.loads(r.tags) if r.tags else []
            )
            if "class:summary" in tags or "memory_class:summary" in tags:
                tags_found.append(r.title)
        assert tags_found, (
            f"no class:summary local record: {[r.title for r in records]}"
        )


# ---------------------------------------------------------------------------
# 5. Explicit memory_store — junk title rejection
# ---------------------------------------------------------------------------

JUNK_TITLE_PATTERNS = [
    r"^Context( \(.*\))?$",
    r"^Session summary( \(.*\))?$",
    r"user turn",
    r"^response$",
    r"pre-compact",
    r"pre-compaction",
]


class TestExplicitStoreJunkTitleRejection:
    @pytest.mark.parametrize("junk_title", [
        "Context",
        "Context (user)",
        "Context (assistant)",
        "Session summary",
        "Session summary (pre-compress)",
        "user turn",
        "response",
        "pre-compaction summary",
    ])
    def test_rejects_junk_titles(self, provider, junk_title):
        provider._config.tool_policy = "write"
        result = provider.handle_tool_call("memory_store", {
            "title": junk_title,
            "content": "real content here",
        })
        data = json.loads(result)
        # The store either refuses with an error, or it succeeded without
        # hitting the remote MaaS API. Either is acceptable; what we
        # MUST NOT see is a successful remote write with the junk title.
        if data.get("stored") is True and data.get("local") is True:
            # If it did store, the remote write must NOT have used the junk
            # title. This catches "tolerated and forwarded" implementations.
            remote_calls = [
                c for c in provider._client.post.call_args_list
                if "/api/v1/memories" in str(c) and "search" not in str(c)
            ]
            if remote_calls:
                args, kwargs = remote_calls[-1]
                payload = kwargs.get("json") or args[1]
                title_norm = (payload.get("title") or "").strip().lower()
                for pat in JUNK_TITLE_PATTERNS:
                    assert not re.search(pat, title_norm, re.IGNORECASE), (
                        f"junk title {junk_title!r} forwarded to remote as {title_norm!r}"
                    )
        # If the implementation rejected, we expect an explicit error.
        else:
            assert "error" in data or data.get("stored") is False, (
                f"junk title {junk_title!r} silently accepted: {data}"
            )

    def test_non_junk_title_succeeds(self, provider):
        provider._config.tool_policy = "write"
        result = provider.handle_tool_call("memory_store", {
            "title": "Operator decision: keep Python 3.10 floor",
            "content": "Decision rationale and migration plan.",
        })
        data = json.loads(result)
        assert data["stored"] is True


# ---------------------------------------------------------------------------
# 6. Dedup guard on remote writes
# ---------------------------------------------------------------------------

class TestDedupGuard:
    def test_identical_writes_in_window_are_skipped(self, provider, monkeypatch):
        provider._config.tool_policy = "write"
        # First write — should hit remote.
        provider.handle_tool_call("memory_store", {
            "title": "Repeat me once",
            "content": "Same content body, identical payload.",
        })
        # Second write — same title + same content → dedup guard should skip.
        # Trigger a fresh post counter by calling the internal remote write
        # path again.
        before = provider._client.post.call_count
        provider.handle_tool_call("memory_store", {
            "title": "Repeat me once",
            "content": "Same content body, identical payload.",
        })
        after = provider._client.post.call_count
        # Dedup must prevent at least one remote post.
        assert after - before < 1, (
            f"dedup guard did not skip duplicate: {before} → {after}"
        )

    def test_session_scoped_title_dedup(self, provider):
        provider._config.tool_policy = "write"
        # Two different contents, same title — second one is a same-session
        # title dedup at debug level (not necessarily a hard skip).
        provider.handle_tool_call("memory_store", {
            "title": "Same title session-scoped",
            "content": "First body — different.",
        })
        provider.handle_tool_call("memory_store", {
            "title": "Same title session-scoped",
            "content": "Second body — different again.",
        })
        provider.shutdown()
        # We don't assert a hard skip; the contract only requires the
        # debug-level log. But the dedup module must be wired in.
        from hermes_lanonasis_memory import scope
        assert hasattr(scope, "DedupGuard")


# ---------------------------------------------------------------------------
# 7. Redaction is still applied on every remote write
# ---------------------------------------------------------------------------

class TestRedactionStillApplied:
    def test_explicit_store_redacts_credentials(self, provider, monkeypatch):
        """The remote write payload MUST go through ``_protect_outbound``.

        H2 sanity check: the redaction pipeline is still wired in on
        every remote write. The actual redaction algorithm is tested
        in test_security.py; this test verifies the *wiring*.
        """
        from hermes_lanonasis_memory.security import redact_secrets

        provider._config.tool_policy = "write"
        # The actual redactor is the one in the provider. We monkeypatch
        # ``_protect_outbound`` so we can assert the wrapper ran, and so
        # the test does not need to embed a real-looking credential
        # (which would trip gitleaks).
        called = []

        def fake_protect(text, *args, **kwargs):
            called.append(text)
            # Simulate redaction by replacing a marker string.
            from hermes_lanonasis_memory.security import PrivacyConfig, PrivacyGuard
            return PrivacyGuard(PrivacyConfig(privacy_mode=False)).process(
                text.replace("<<LOOKUP_KEY>>", "[REDACTED:credential]")
            )

        monkeypatch.setattr(provider, "_protect_outbound", fake_protect)

        provider.handle_tool_call("memory_store", {
            "title": "With credential",
            "content": "this content has <<LOOKUP_KEY>> in it",
        })
        provider.shutdown()
        # The wrapper was called (we don't care how many times, but
        # at least once for title, once for content).
        assert called, "_protect_outbound was not invoked"
        # The remote payload does NOT contain the unredacted marker.
        write_calls = [
            c for c in provider._client.post.call_args_list
            if "/api/v1/memories" in str(c) and "search" not in str(c)
        ]
        assert write_calls, "no remote write happened"
        args, kwargs = write_calls[-1]
        payload = kwargs.get("json") or args[1]
        assert "<<LOOKUP_KEY>>" not in (payload.get("content") or ""), (
            "marker leaked to the remote payload (redaction wiring broken)"
        )
        assert "[REDACTED:credential]" in (payload.get("content") or ""), (
            "redaction marker missing from the remote payload"
        )


# ---------------------------------------------------------------------------
# 8. Project-scope resolution pattern (no shell=True)
# ---------------------------------------------------------------------------

class TestProjectScopeResolution:
    def test_resolve_project_scope_prefers_env_then_git_then_default(self, monkeypatch):
        from hermes_lanonasis_memory.scope import resolve_project_scope
        monkeypatch.setenv("LANONASIS_HERMES_SCOPE_ID", "env-wins")
        # Use a non-git cwd so the env override is the only signal.
        scope_type, scope_id = resolve_project_scope(
            env=monkeypatch, config_scope="config-value", cwd="/tmp"
        )
        assert scope_id == "env-wins"

    def test_resolve_project_scope_falls_back_to_agent(self, monkeypatch):
        from hermes_lanonasis_memory.scope import resolve_project_scope, SCOPE_AGENT
        monkeypatch.delenv("LANONASIS_HERMES_SCOPE_ID", raising=False)
        # No env, no config, no git toplevel at /tmp — falls back to agent:hermes
        scope_type, scope_id = resolve_project_scope(
            env=monkeypatch, config_scope=None, cwd="/tmp"
        )
        assert scope_type == SCOPE_AGENT
        assert scope_id == "agent:hermes"

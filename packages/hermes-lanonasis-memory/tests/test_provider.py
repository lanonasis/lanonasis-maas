"""Unit tests for LanonasisMemoryProvider — all use mocked httpx.

Tests assert the contract documented at
https://hermes-agent.nousresearch.com/docs/developer-guide/memory-provider-plugin
plus a few call-site behaviours that previously lived here.
"""

import json
import time
import threading
from unittest.mock import MagicMock, patch

import pytest


# ---------------------------------------------------------------------------
# TestIsAvailable  (no network calls — per the contract docs)
# ---------------------------------------------------------------------------
class TestIsAvailable:
    def test_returns_true_when_api_key_present(self, provider, monkeypatch):
        """Local-only check: API key + URL → available, no HTTP traffic."""
        monkeypatch.delenv("LANONASIS_API_KEY", raising=False)
        provider._config.api_key = "test_key_123"
        provider._config.api_url = "https://api.lanonasis.com"
        with patch.object(provider, "_ensure_client", return_value=None):
            assert provider.is_available() is True

    def test_returns_false_when_no_api_key(self, provider, monkeypatch):
        monkeypatch.delenv("LANONASIS_API_KEY", raising=False)
        provider._config.api_key = ""
        provider._config.api_url = "https://api.lanonasis.com"
        assert provider.is_available() is False

    def test_never_makes_network_call(self, provider, monkeypatch):
        """Contract: ``is_available()`` is a local check."""
        monkeypatch.delenv("LANONASIS_API_KEY", raising=False)
        provider._config.api_key = "test_key_123"
        provider._config.api_url = "https://api.lanonasis.com"
        fake_client = MagicMock()
        with patch.object(provider, "_ensure_client", return_value=fake_client):
            provider.is_available()
            fake_client.get.assert_not_called()
            fake_client.post.assert_not_called()
            fake_client.health_check.assert_not_called()

    def test_reads_api_key_from_profile_config(self, tmp_path, monkeypatch):
        monkeypatch.delenv("LANONASIS_API_KEY", raising=False)
        config_dir = tmp_path / "plugins" / "lanonasis"
        config_dir.mkdir(parents=True)
        (config_dir / "config.json").write_text(
            json.dumps({"api_key": "profile-key"}), encoding="utf-8"
        )

        from hermes_lanonasis_memory.provider import _read_optional_api_key

        assert _read_optional_api_key(str(tmp_path)) == "profile-key"

    def test_environment_key_overrides_profile_config(self, tmp_path, monkeypatch):
        config_dir = tmp_path / "plugins" / "lanonasis"
        config_dir.mkdir(parents=True)
        (config_dir / "config.json").write_text(
            json.dumps({"api_key": "profile-key"}), encoding="utf-8"
        )
        monkeypatch.setenv("LANONASIS_API_KEY", "environment-key")

        from hermes_lanonasis_memory import LanonasisMemoryProvider

        provider = LanonasisMemoryProvider()
        with patch(
            "hermes_lanonasis_memory.provider.LanonasisClient", create=True
        ):
            provider.initialize(session_id="s-1", hermes_home=str(tmp_path))
        assert provider._config.api_key == "environment-key"
        provider.shutdown()


# ---------------------------------------------------------------------------
# TestToolCallDispatch  (handle_tool_call returns a JSON string)
# ---------------------------------------------------------------------------
class TestToolCallDispatch:
    def test_memory_search_returns_json_string(self, provider):
        provider._client.post.return_value.json.return_value = {"memories": []}
        result = provider.handle_tool_call(
            "memory_search", {"query": "test", "limit": 5}
        )
        assert isinstance(result, str), "handle_tool_call must return JSON str"
        data = json.loads(result)
        assert data["memories"] == []
        assert "_security" in data  # result-side metadata is allowed in TOOL RESULTS

    def test_memory_search_calls_post_memories_search(self, provider):
        provider._client.post.return_value.json.return_value = {"memories": []}
        provider.handle_tool_call("memory_search", {"query": "x", "limit": 5})
        call_args = provider._client.post.call_args
        assert "/api/v1/memories/search" in str(call_args)

    def test_memory_store_calls_post_memories(self, provider):
        provider._config.tool_policy = "write"
        provider._client.post.return_value.json.return_value = {"id": "mem-123"}
        result = provider.handle_tool_call("memory_store", {
            "title": "Test", "content": "Test content", "memory_type": "context",
        })
        call_args = provider._client.post.call_args
        assert "/api/v1/memories" in str(call_args)
        data = json.loads(result)
        assert data["id"] == "mem-123"

    def test_memory_get_calls_get_memories_id(self, provider):
        mem_id = "11111111-2222-3333-4444-555555555555"
        provider._client.get.return_value.json.return_value = {
            "id": mem_id, "title": "My Memory",
        }
        result = provider.handle_tool_call("memory_get", {"id": mem_id})
        provider._client.get.assert_called_with(f"/api/v1/memories/{mem_id}")
        data = json.loads(result)
        assert data["id"] == mem_id

    def test_memory_forget_calls_delete_memories_id(self, provider):
        provider._config.tool_policy = "full_access"
        mem_id = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
        provider._client.delete.return_value.json.return_value = {"deleted": True}
        result = provider.handle_tool_call("memory_forget", {"id": mem_id})
        provider._client.delete.assert_called_with(f"/api/v1/memories/{mem_id}")
        data = json.loads(result)
        assert data["deleted"] is True

    def test_unknown_tool_returns_error_json_does_not_raise(self, provider):
        """Contract: unknown tools MUST NOT raise — they return error JSON so
        a bad tool name never crashes the agent mid-turn."""
        result = provider.handle_tool_call("unknown_tool", {})
        assert isinstance(result, str)
        data = json.loads(result)
        assert "error" in data
        assert "unknown_tool" in data.get("_tool", "") or "Unknown tool" in data["error"]

    @pytest.mark.parametrize("tool_name", ["memory_get", "memory_forget"])
    @pytest.mark.parametrize("memory_id", [None, 123, [], {}])
    def test_memory_id_tools_reject_non_strings(
        self, provider, tool_name, memory_id
    ):
        if tool_name == "memory_forget":
            provider._config.tool_policy = "full_access"
        result = provider.handle_tool_call(tool_name, {"id": memory_id})
        data = json.loads(result)
        assert data["_degraded"] is True
        assert "Invalid memory id" in data["error"]


# ---------------------------------------------------------------------------
# TestSyncTurnNonBlocking  (contract: sync_turn returns immediately)
# ---------------------------------------------------------------------------
class TestSyncTurnNonBlocking:
    def _slow_post(self, *args, **kwargs):
        time.sleep(0.5)
        m = MagicMock()
        m.status_code = 200
        return m

    def test_sync_turn_returns_within_50ms_with_slow_api(self, provider):
        provider._client.post.side_effect = self._slow_post
        start = time.perf_counter()
        provider.sync_turn(
            user_content="Hello",
            assistant_content="Hi there",
        )
        elapsed_ms = (time.perf_counter() - start) * 1000
        assert elapsed_ms < 50, (
            f"sync_turn took {elapsed_ms:.1f}ms — must be < 50ms (non-blocking)"
        )

    def test_sync_turn_writes_to_fallback_when_api_fails(self, provider):
        provider._client.post.side_effect = Exception("connection refused")
        provider.sync_turn(user_content="user says hello", assistant_content="assistant responds")
        # Drain so the worker completes before assertion.
        provider.shutdown()
        assert provider._fallback.write.called

    def test_sync_turn_accepts_kw_only_session_id_and_messages(self, provider):
        """Per the contract: ``sync_turn(user, assistant, *, session_id=\"\", messages=None)``."""
        provider.sync_turn(
            "u", "a", session_id="abc-123", messages=[{"role": "user", "content": "u"}]
        )
        # No exception ⇒ the signature matches the docs.

    def test_sync_turn_joins_previous_thread_with_timeout(self, provider):
        """The new worker serializes behind the previous write."""
        provider.sync_turn("u1", "a1")
        provider.sync_turn("u2", "a2")
        provider.shutdown()

    def test_second_sync_turn_does_not_join_on_caller_thread(self, provider):
        provider._client.post.side_effect = self._slow_post
        provider.sync_turn("u1", "a1")

        start = time.perf_counter()
        provider.sync_turn("u2", "a2")
        elapsed_ms = (time.perf_counter() - start) * 1000

        assert elapsed_ms < 50, (
            f"second sync_turn took {elapsed_ms:.1f}ms — previous-worker join "
            "must run off the caller thread"
        )
        provider.shutdown()


# ---------------------------------------------------------------------------
# TestOnSessionEnd  (renamed/moved comment block — kept stable)
# ---------------------------------------------------------------------------
class TestOnSessionEnd:
    def test_on_session_end_dispatches_flush_in_background(self, provider):
        provider._client.flush_reasoning.return_value = True
        provider.on_session_end([{"role": "user", "content": "hello"}])
        provider.shutdown()
        # Worker runs after shutdown's join — its call shows up here.
        provider._client.flush_reasoning.assert_called()


# ---------------------------------------------------------------------------
# TestShutdown
# ---------------------------------------------------------------------------
class TestShutdown:
    def test_shutdown_closes_httpx_client(self, provider):
        provider.shutdown()
        provider._client.close.assert_called()

    def test_shutdown_joins_pending_sync_thread(self, provider):
        provider.sync_turn("u", "a")
        provider.shutdown()

    def test_shutdown_drains_precompress_write(self, provider):
        completed = threading.Event()

        def slow_store(payload):
            time.sleep(0.05)
            completed.set()

        with patch.object(provider, "_run_store_payload", side_effect=slow_store):
            provider.on_pre_compress([{"role": "user", "content": "summary"}])
            provider.shutdown()

        assert completed.is_set()

    def test_shutdown_drains_session_end_flush(self, provider):
        completed = threading.Event()

        def slow_flush(client, subject_id):
            time.sleep(0.05)
            completed.set()

        with patch.object(provider, "_run_flush", side_effect=slow_flush):
            provider.on_session_end([])
            provider.shutdown()

        assert completed.is_set()


class TestOutboundPrivacy:
    def test_default_mode_preserves_pii_but_redacts_credentials(self, provider):
        from hermes_lanonasis_memory.security import PrivacyConfig, PrivacyGuard

        provider._config.tool_policy = "write"
        provider._privacy_guard = PrivacyGuard(PrivacyConfig(privacy_mode=False))
        provider.handle_tool_call(
            "memory_store",
            {
                "title": "Contact",
                "content": (
                    "Email person@example.com; "
                    "api_key=supersecretapikey12345678"
                ),
                "memory_type": "context",
            },
        )

        payload = provider._client.post.call_args.kwargs["json"]
        assert "person@example.com" in payload["content"]
        assert "supersecretapikey12345678" not in payload["content"]
        assert "[REDACTED:credential]" in payload["content"]

    def test_privacy_mode_masks_pii_before_store(self, provider):
        from hermes_lanonasis_memory.security import PrivacyConfig, PrivacyGuard

        provider._config.tool_policy = "write"
        provider._privacy_guard = PrivacyGuard(PrivacyConfig(privacy_mode=True))
        provider.handle_tool_call(
            "memory_store",
            {
                "title": "Contact",
                "content": "Email person@example.com",
                "memory_type": "context",
            },
        )

        payload = provider._client.post.call_args.kwargs["json"]
        assert "person@example.com" not in payload["content"]
        assert "[REDACTED:pii]" in payload["content"]


# ---------------------------------------------------------------------------
# TestGetToolSchemas
# ---------------------------------------------------------------------------
class TestGetToolSchemas:
    def test_defaults_to_read_only_tool_schemas(self, provider):
        schemas = provider.get_tool_schemas()
        names = {s["name"] for s in schemas}
        assert names == {"memory_search", "memory_get"}

    def test_write_policy_enables_store_but_not_delete(self, provider):
        provider._config.tool_policy = "write"
        names = {s["name"] for s in provider.get_tool_schemas()}
        assert names == {"memory_search", "memory_get", "memory_store"}

    def test_full_access_policy_enables_all_tools(self, provider):
        provider._config.tool_policy = "full_access"
        names = {s["name"] for s in provider.get_tool_schemas()}
        assert names == {
            "memory_search", "memory_store", "memory_get", "memory_forget",
        }

    def test_invalid_policy_fails_closed(self, provider):
        provider._config.tool_policy = "unexpected"
        names = {s["name"] for s in provider.get_tool_schemas()}
        assert names == {"memory_search", "memory_get"}

    @pytest.mark.parametrize("tool_name", ["memory_store", "memory_forget"])
    def test_read_only_policy_blocks_direct_dispatch(self, provider, tool_name):
        result = json.loads(provider.handle_tool_call(tool_name, {}))
        assert result["_blocked"] is True
        assert result["_tool"] == tool_name
        provider._client.post.assert_not_called()
        provider._client.delete.assert_not_called()

    def test_schemas_have_only_contract_keys(self, provider):
        """Schema payload hygiene — only ``name``, ``description``,
        ``parameters`` belong in the schema (per the context-engine docs)."""
        for schema in provider.get_tool_schemas():
            assert set(schema.keys()) >= {"name", "description", "parameters"}
            assert "_security" not in schema
            assert "_formatted_context" not in schema

    def test_memory_store_has_correct_required_fields(self, provider):
        provider._config.tool_policy = "write"
        store_schema = next(s for s in provider.get_tool_schemas() if s["name"] == "memory_store")
        required = store_schema["parameters"]["required"]
        assert "title" in required
        assert "content" in required


# ---------------------------------------------------------------------------
# TestGetConfigSchema  (api_key now has explicit env_var + type=secret)
# ---------------------------------------------------------------------------
class TestGetConfigSchema:
    def test_returns_all_config_fields(self, provider):
        schema = provider.get_config_schema()
        keys = {f["key"] for f in schema}
        assert keys == {
            "api_url", "api_key", "organization_id", "project_scope",
            "subject_id_strategy", "subject_id",
            "tool_policy", "privacy_mode", "embedding_model",
        }

    def test_api_key_is_marked_secret_with_env_var(self, provider):
        schema = provider.get_config_schema()
        key_field = next(f for f in schema if f["key"] == "api_key")
        assert key_field["type"] == "secret"
        # The contract: secrets MUST carry an explicit env_var so the
        # setup wizard writes them to .env (and never to config.json).
        assert key_field.get("env_var") == "LANONASIS_API_KEY"

    def test_api_url_has_default(self, provider):
        schema = provider.get_config_schema()
        url_field = next(f for f in schema if f["key"] == "api_url")
        assert url_field["default"] == "https://api.lanonasis.com"

    def test_tool_policy_defaults_to_read_only(self, provider):
        schema = provider.get_config_schema()
        field = next(f for f in schema if f["key"] == "tool_policy")
        assert field["default"] == "read_only"
        assert field["enum"] == ["read_only", "write", "full_access"]


# ---------------------------------------------------------------------------
# TestSystemPromptBlock
# ---------------------------------------------------------------------------
class TestSystemPromptBlock:
    def test_read_only_prompt_names_only_enabled_tools(self, provider):
        block = provider.system_prompt_block()
        assert "memory_search" in block
        assert "memory_get" in block
        assert "memory_store" not in block
        assert "memory_forget" not in block

    def test_full_access_prompt_names_all_tools(self, provider):
        provider._config.tool_policy = "full_access"
        block = provider.system_prompt_block()
        assert "memory_search" in block
        assert "memory_store" in block
        assert "memory_get" in block
        assert "memory_forget" in block

    def test_prompt_remains_static_when_prefetch_cache_attribute_exists(self, provider):
        provider._prefetch_cache = "CONTEXT BLOCK START\n> recalled fact\nCONTEXT BLOCK END"
        block = provider.system_prompt_block()
        assert "persistent memory system" in block
        assert "CONTEXT BLOCK START" not in block
        assert "recalled fact" not in block


# ---------------------------------------------------------------------------
# TestPrefetchRecallHook  (signature: prefetch(query, *, session_id="") -> str)
# ---------------------------------------------------------------------------
class TestPrefetchRecallHook:
    def test_prefetch_returns_string(self, provider):
        provider._client.post.return_value.json.return_value = {
            "memories": [{"title": "Prefs", "content": "user prefers dark mode"}]
        }
        result = provider.prefetch("what theme does the user like?")
        assert isinstance(result, str)
        assert "CONTEXT BLOCK START" in result

    def test_prefetch_returns_recall_on_happy_path(self, provider):
        provider._client.post.return_value.json.return_value = {
            "memories": [{"title": "Prefs", "content": "user prefers dark mode"}]
        }
        result = provider.prefetch("what theme does the user like?")
        provider._client.post.assert_called_once()
        assert "/api/v1/memories/search" in str(provider._client.post.call_args)
        assert "dark mode" in result

    def test_prefetch_swallows_api_failure_and_returns_empty_string(self, provider):
        provider._client.post.side_effect = Exception("MaaS unreachable")
        result = provider.prefetch("anything")
        assert result == ""

    def test_prefetch_no_memories_returns_empty_string(self, provider):
        provider._client.post.return_value.json.return_value = {"memories": []}
        result = provider.prefetch("no matches expected")
        assert result == ""

    def test_prefetch_empty_query_is_noop(self, provider):
        result = provider.prefetch("   ")
        provider._client.post.assert_not_called()
        assert result == ""

    def test_prefetch_result_is_not_copied_into_static_system_prompt(self, provider):
        provider._client.post.return_value.json.return_value = {
            "memories": [{"title": "Fact", "content": "the deploy key rotates weekly"}]
        }
        result = provider.prefetch("how often does the deploy key rotate?")
        block = provider.system_prompt_block()
        assert "deploy key rotates weekly" in result
        assert "deploy key rotates weekly" not in block

    def test_prefetch_accepts_session_id_keyword(self, provider):
        """Contract: ``prefetch(query, *, session_id=\"\")``."""
        provider._client.post.return_value.json.return_value = {"memories": []}
        # Must NOT raise — the kwarg is accepted by signature.
        result = provider.prefetch("anything", session_id="abc-123")
        assert isinstance(result, str)

    def test_prefetch_returns_directly_not_only_side_effect(self, provider):
        """Contract: the return value IS the recall string (not a side effect only)."""
        provider._client.post.return_value.json.return_value = {
            "memories": [{"title": "P", "content": "the cat is orange"}]
        }
        returned = provider.prefetch("what color is the cat?")
        assert "the cat is orange" in returned


# ---------------------------------------------------------------------------
# TestQueuePrefetch  (optional contract hook)
# ---------------------------------------------------------------------------
class TestQueuePrefetch:
    def test_queue_prefetch_accepts_session_id_kwarg(self, provider):
        provider.queue_prefetch("anything", session_id="s-1")


# ---------------------------------------------------------------------------
# TestReadPathHardening
# ---------------------------------------------------------------------------
class TestReadPathHardening:
    def test_tool_search_returns_empty_on_outage_no_raise(self, provider):
        provider._client.post.side_effect = Exception("connection refused")
        result = provider.handle_tool_call("memory_search", {"query": "x", "limit": 5})
        # Returns a JSON string, not a dict.
        assert isinstance(result, str)
        data = json.loads(result)
        assert data["memories"] == []
        assert "_error" in data

    def test_tool_get_returns_empty_object_on_outage_no_raise(self, provider):
        mem_id = "11111111-2222-3333-4444-555555555555"
        provider._client.get.side_effect = Exception("connection refused")
        result = provider.handle_tool_call("memory_get", {"id": mem_id})
        # Must be a JSON string (contract). null is the encoded form of None.
        assert isinstance(result, str)
        assert result == "null"

    def test_tool_get_invalid_uuid_is_error_json_not_exception(self, provider):
        """Contract: invalid input from the agent surfaces as error JSON —
        ``handle_tool_call`` MUST NOT raise into the agent loop."""
        result = provider.handle_tool_call("memory_get", {"id": "not-a-uuid"})
        assert isinstance(result, str)
        data = json.loads(result)
        assert "error" in data


# ---------------------------------------------------------------------------
# TestOnPreCompressReturnsString
# ---------------------------------------------------------------------------
class TestOnPreCompressReturnsString:
    def test_returns_string_summary(self, provider):
        result = provider.on_pre_compress(
            [{"role": "user", "content": "we decided to use bun"}]
        )
        assert isinstance(result, str)
        assert "Session summary" in result

    def test_returns_empty_string_when_no_messages(self, provider):
        assert provider.on_pre_compress([]) == ""


# ---------------------------------------------------------------------------
# TestRegisterEntryPoint  (contract: register(ctx) entry point exists)
# ---------------------------------------------------------------------------
class TestRegisterEntryPoint:
    def test_module_top_level_register_function_exists(self):
        from hermes_lanonasis_memory import register
        assert callable(register)

    def test_register_calls_ctx_register_memory_provider(self):
        from hermes_lanonasis_memory import register, LanonasisMemoryProvider
        ctx = MagicMock()
        register(ctx)
        ctx.register_memory_provider.assert_called_once()
        registered = ctx.register_memory_provider.call_args[0][0]
        assert isinstance(registered, LanonasisMemoryProvider)
        assert registered.name == "lanonasis"

    def test_register_raises_if_ctx_lacks_method(self):
        from hermes_lanonasis_memory import register
        with pytest.raises(AttributeError):
            register(object())

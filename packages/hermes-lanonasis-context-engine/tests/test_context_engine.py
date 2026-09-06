"""Contract tests for the LanOnasis context-engine wireframe.

Run from the package root against a Hermes runtime venv:

    /path/to/hermes/venv/bin/python -m pytest tests/ -v

In a bare venv the ABC-coupling tests skip; the pure-Python behavior
tests (fail-open, tool schema shape) always run.
"""

import json

import pytest

PKG = "hermes_lanonasis_context_engine"

try:
    from agent.context_engine import ContextEngine
    HAS_HERMES = True
except ImportError:
    HAS_HERMES = False

requires_hermes = pytest.mark.skipif(
    not HAS_HERMES,
    reason="agent.context_engine not importable — not a Hermes runtime venv",
)


@pytest.fixture
def engine():
    mod = __import__(PKG, fromlist=["LanonasisContextEngine"])
    return mod.LanonasisContextEngine()


# ---------------------------------------------------------------------------
# ABC conformance (Hermes runtime only)
# ---------------------------------------------------------------------------

@requires_hermes
class TestAbcConformance:
    def test_subclasses_context_engine(self, engine):
        assert isinstance(engine, ContextEngine)

    def test_no_abstract_methods_left(self, engine):
        assert not getattr(type(engine), "__abstractmethods__", set()), (
            "engine leaves abstract methods unimplemented"
        )

    def test_name(self, engine):
        assert engine.name == "lanonasis"

    def test_register_entry_point(self):
        import importlib.metadata

        eps = importlib.metadata.entry_points(group="hermes_agent.plugins")
        matches = [ep for ep in eps if ep.name == "lanonasis-context"]
        assert matches, "entry point 'lanonasis-context' not registered"
        mod = matches[0].load()
        assert callable(getattr(mod, "register", None)), (
            "entry point must resolve to a module exposing register()"
        )


# ---------------------------------------------------------------------------
# Fail-open behavior (always runs)
# ---------------------------------------------------------------------------

class TestFailOpen:
    def test_select_context_is_noop(self, engine):
        msgs = [{"role": "user", "content": "hi"}]
        assert engine.select_context(msgs) is None
        assert msgs[0]["content"] == "hi", "select_context must not mutate history"

    def test_on_turn_complete_is_noop(self, engine):
        engine.on_turn_complete([{"role": "assistant", "content": "ok"}], {})

    def test_compress_returns_messages_unchanged_without_backend(self, engine):
        msgs = [{"role": "user", "content": "a"} for _ in range(5)]
        out = engine.compress(msgs)
        assert out == msgs
        assert len(out) == 5

    def test_should_compress_false_when_no_context_length(self, engine):
        engine.context_length = 0
        assert engine.should_compress(prompt_tokens=10_000) is False

    def test_should_compress_true_at_threshold(self, engine):
        engine.context_length = 100_000
        engine.update_model("test-model", 100_000)
        assert engine.threshold_tokens == int(100_000 * engine.threshold_percent)
        assert engine.should_compress(prompt_tokens=engine.threshold_tokens) is True
        assert engine.should_compress(prompt_tokens=engine.threshold_tokens - 1) is False

    def test_tool_schemas_declared_but_stub_errors(self, engine):
        schemas = engine.get_tool_schemas()
        names = {s["name"] for s in schemas}
        assert "lcm_grep" in names
        resp = json.loads(engine.handle_tool_call("lcm_grep", {"query": "x"}))
        assert resp.get("_wireframe") is True
        assert "error" in resp

    def test_unknown_tool_returns_error(self, engine):
        resp = json.loads(engine.handle_tool_call("nope", {}))
        assert "error" in resp

    def test_is_available_reflects_key_presence(self, engine, monkeypatch):
        monkeypatch.delenv("LANONASIS_API_KEY", raising=False)
        from hermes_lanonasis_context_engine import LanonasisContextEngine

        assert LanonasisContextEngine().is_available is False
        monkeypatch.setenv("LANONASIS_API_KEY", "lano_test")
        assert LanonasisContextEngine().is_available is True

    def test_update_from_response_tracks_usage(self, engine):
        engine.update_from_response(
            {"prompt_tokens": 11, "completion_tokens": 22, "total_tokens": 33}
        )
        assert engine.last_prompt_tokens == 11
        assert engine.last_completion_tokens == 22
        assert engine.last_total_tokens == 33

    def test_config_schema_shape(self, engine):
        keys = {f["key"] for f in engine.get_config_schema()}
        assert {"api_url", "api_key", "threshold_percent"} <= keys

    def test_filter_turn_for_egress_passthrough(self, engine):
        # The future secret-prescan port slot currently passes through.
        assert engine.filter_turn_for_egress("hello sk_test_xxx") == "hello sk_test_xxx"

    def test_register_dispatches_to_context(self):
        from hermes_lanonasis_context_engine import register

        class FakeCtx:
            def __init__(self):
                self.engines = []

            def register_context_engine(self, engine):
                self.engines.append(engine)

        ctx = FakeCtx()
        register(ctx)
        assert len(ctx.engines) == 1
        assert ctx.engines[0].name == "lanonasis"

"""Contract tests for the LanOnasis secret-source wireframe.

Run from the package root against a Hermes runtime venv:

    /path/to/hermes/venv/bin/python -m pytest tests/ -v

The wireframe's contract is: registered, discoverable, NEVER raises,
NEVER prompts, and reports NOT_CONFIGURED until the backend stabilizes.
"""

import pytest

PKG = "hermes_lanonasis_secret_source"

try:
    from agent.secret_sources.base import (
        SECRET_SOURCE_API_VERSION,
        ErrorKind,
        FetchResult,
        SecretSource,
    )
    HAS_HERMES = True
except ImportError:
    HAS_HERMES = False

requires_hermes = pytest.mark.skipif(
    not HAS_HERMES,
    reason="agent.secret_sources.base not importable — not a Hermes runtime venv",
)


@pytest.fixture
def source():
    mod = __import__(PKG, fromlist=["LanonasisSecretSource"])
    return mod.LanonasisSecretSource()


# ---------------------------------------------------------------------------
# ABC conformance (Hermes runtime only)
# ---------------------------------------------------------------------------

@requires_hermes
class TestAbcConformance:
    def test_subclasses_secret_source(self, source):
        assert isinstance(source, SecretSource)

    def test_api_version_matches(self, source):
        assert source.api_version == SECRET_SOURCE_API_VERSION

    def test_identity(self, source):
        assert source.name == "lanonasis"
        assert source.shape == "mapped"
        assert source.label

    def test_register_entry_point(self):
        import importlib.metadata

        eps = importlib.metadata.entry_points(group="hermes_agent.plugins")
        matches = [ep for ep in eps if ep.name == "lanonasis-secrets"]
        assert matches, "entry point 'lanonasis-secrets' not registered"
        assert callable(matches[0].load())


# ---------------------------------------------------------------------------
# Wireframe behavior (always runs)
# ---------------------------------------------------------------------------

class TestWireframeBehavior:
    def test_fetch_never_raises_when_disabled(self, source):
        result = source.fetch({"enabled": False}, __import__("pathlib").Path("/tmp"))
        assert result.ok is False
        assert result.error is not None

    def test_fetch_fails_closed_by_default(self, source):
        # No config at all — must return NOT_CONFIGURED, never raise.
        result = source.fetch({}, __import__("pathlib").Path("/tmp"))
        assert result.ok is False
        kind = getattr(result.error_kind, "value", str(result.error_kind))
        assert kind == "not_configured"

    def test_fetch_disabled_with_full_config_still_not_configured(self, source):
        cfg = {
            "enabled": False,
            "access_token": "tok",
            "map": {"OPENAI_API_KEY": "lano://x"},
        }
        result = source.fetch(cfg, __import__("pathlib").Path("/tmp"))
        kind = getattr(result.error_kind, "value", str(result.error_kind))
        assert kind == "not_configured"

    def test_fetch_enabled_with_config_is_wireframe_marked(self, source):
        cfg = {
            "enabled": True,
            "access_token": "tok",
            "map": {"OPENAI_API_KEY": "lano://x"},
            "api_url": "https://api.lanonasis.com",
        }
        result = source.fetch(cfg, __import__("pathlib").Path("/tmp"))
        assert result.ok is False
        kind = getattr(result.error_kind, "value", str(result.error_kind))
        assert kind == "not_configured"
        assert "wireframe" in result.error.lower()
        assert result.warnings, "wireframe should surface a warning"

    def test_fetch_never_raises_on_malformed_config(self, source):
        for bad in (None, "string", [], 42):
            result = source.fetch(bad, __import__("pathlib").Path("/tmp"))
            assert result.ok is False

    def test_fetch_enabled_missing_token(self, source):
        result = source.fetch({"enabled": True}, __import__("pathlib").Path("/tmp"))
        assert result.ok is False

    def test_is_enabled_fails_closed(self, source):
        assert source.is_enabled({}) is False
        assert source.is_enabled({"enabled": False}) is False
        assert source.is_enabled({"enabled": True}) is True

    def test_protected_env_vars(self, source):
        protected = source.protected_env_vars({})
        assert "LANONASIS_SECRETS_TOKEN" in protected

    def test_config_schema_shape(self, source):
        schema = source.config_schema()
        for key in ("enabled", "access_token", "map", "api_url", "override_existing",
                    "timeout_seconds"):
            assert key in schema, f"config_schema missing '{key}'"

    def test_remediation_for_not_configured(self, source):
        # The real contract passes the ErrorKind enum, not a string.
        kind = ErrorKind.NOT_CONFIGURED if HAS_HERMES else "not_configured"
        text = source.remediation(kind, {})
        assert text, "remediation should give a hint for NOT_CONFIGURED"

    def test_fetch_timeout_seconds_sane(self, source):
        assert source.fetch_timeout_seconds({}) > 0
        assert source.fetch_timeout_seconds({"timeout_seconds": "bogus"}) > 0

    def test_register_dispatches_to_context(self):
        from hermes_lanonasis_secret_source import register

        class FakeCtx:
            def __init__(self):
                self.sources = []

            def register_secret_source(self, source):
                self.sources.append(source)

        ctx = FakeCtx()
        register(ctx)
        assert len(ctx.sources) == 1
        assert ctx.sources[0].name == "lanonasis"

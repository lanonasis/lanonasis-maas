"""Install smoke tests for hermes-lanonasis-memory.

These assert the two integration traps that silently break a provider
after a repo restructure or a fresh install:

1. **Dead editable install** — pip's editable ``.pth`` maps the import to
   a source path that no longer exists. Entry-point metadata survives
   (so ``hermes plugins list`` still shows the plugin) but ``import``
   raises ``ModuleNotFoundError`` and activation silently no-ops.
2. **Discovery gap** — ``hermes memory setup``/``status`` route through
   ``plugins.memory.discover_memory_providers()``, which scans on-disk
   directories under ``$HERMES_HOME/plugins/`` and NEVER reads the
   ``hermes_agent.plugins`` entry-point group. A pip-installed package
   with no flat symlink is invisible to the CLI even when the import
   works.

Run from the package root against a Hermes runtime venv:

    /path/to/hermes/venv/bin/python -m pytest tests/test_install.py -v

In a bare (non-Hermes) venv the Hermes-coupled tests skip cleanly.
"""

import importlib
import importlib.metadata
import os
import sys
from pathlib import Path

import pytest

PKG_NAME = "hermes_lanonasis_memory"
ENTRY_GROUP = "hermes_agent.plugins"
ENTRY_NAME = "lanonasis"

HAS_HERMES = True
try:
    from agent.memory_provider import MemoryProvider  # noqa: F401
except ImportError:
    HAS_HERMES = False

requires_hermes = pytest.mark.skipif(
    not HAS_HERMES,
    reason="agent.memory_provider not importable — not running inside a Hermes runtime venv",
)


# ---------------------------------------------------------------------------
# Import path
# ---------------------------------------------------------------------------

class TestImportPath:
    def test_package_imports_from_any_cwd(self, tmp_path, monkeypatch):
        """Import must resolve regardless of CWD (no bare-name shadowing)."""
        monkeypatch.chdir(tmp_path)
        mod = importlib.import_module(PKG_NAME)
        assert mod is not None

    def test_import_origin_is_a_real_file(self):
        """Catches the dead-editable-install trap.

        If the editable .pth points at a deleted tree, the module may still
        import via a stale bytecode cache — assert the source file on disk.
        """
        mod = importlib.import_module(PKG_NAME)
        assert mod.__file__, f"{PKG_NAME} has no __file__ — namespace package?"
        origin = Path(mod.__file__).resolve()
        assert origin.exists(), (
            f"module imported from {origin} but that file does not exist — "
            f"dead editable install. Reinstall with: "
            f"pip install -e /current/source/path"
        )
        # The resolved origin must live under the expected repo layout,
        # not some torn-down kanban workspace.
        assert "lan-onasis-monorepo" in str(origin), f"unexpected import origin: {origin}"

    def test_register_entry_point_exists(self):
        """The hermes_agent.plugins entry point must be registered."""
        eps = list(importlib.metadata.entry_points(group=ENTRY_GROUP))
        matches = [ep for ep in eps if ep.name == ENTRY_NAME]
        assert matches, (
            f"no '{ENTRY_NAME}' entry point in group '{ENTRY_GROUP}'. "
            f"pip install -e . into the Hermes venv to register it."
        )
        loader = matches[0].load()
        assert callable(loader), "entry point must resolve to a callable register(ctx)"

    def test_register_actually_registers_a_provider(self):
        """register(ctx) must hand a MemoryProvider to the context."""
        from hermes_lanonasis_memory import register

        class FakeCtx:
            def __init__(self):
                self.providers = []

            def register_memory_provider(self, provider):
                self.providers.append(provider)

        ctx = FakeCtx()
        register(ctx)
        assert len(ctx.providers) == 1
        assert ctx.providers[0].name == ENTRY_NAME


# ---------------------------------------------------------------------------
# Contract (only meaningful inside a Hermes runtime)
# ---------------------------------------------------------------------------

@requires_hermes
class TestRuntimeContract:
    def test_subclasses_real_abc(self):
        from hermes_lanonasis_memory import LanonasisMemoryProvider

        assert issubclass(LanonasisMemoryProvider, MemoryProvider)
        assert not getattr(LanonasisMemoryProvider, "__abstractmethods__", set()), (
            "provider leaves abstract methods unimplemented"
        )

    def test_instantiate_and_initialize(self):
        from hermes_lanonasis_memory import LanonasisMemoryProvider

        provider = LanonasisMemoryProvider()
        provider.initialize(
            "install-smoke-test",
            hermes_home=str(Path.home() / ".hermes"),
        )
        assert provider._initialized is True
        provider.shutdown()

    def test_hermes_discovery_finds_provider(self):
        """The on-disk discovery the CLI uses must see lanonasis.

        This is the discovery-gap trap: pip entry point alone is invisible
        to `hermes memory setup`; the flat $HERMES_HOME/plugins/lanonasis
        symlink is required.
        """
        from plugins.memory import discover_memory_providers, load_memory_provider

        names = [name for name, _, _ in discover_memory_providers()]
        assert ENTRY_NAME in names, (
            f"'{ENTRY_NAME}' not in discover_memory_providers() output {names}. "
            f"Add the flat symlink:\n"
            f"  mkdir -p $HERMES_HOME/plugins\n"
            f"  ln -s <repo>/packages/hermes-lanonasis-memory/hermes_lanonasis_memory "
            f"$HERMES_HOME/plugins/lanonasis"
        )
        provider = load_memory_provider(ENTRY_NAME)
        assert provider is not None, "load_memory_provider('lanonasis') returned None"


# ---------------------------------------------------------------------------
# Config schema shape (env-var-only secrets stay out of config.json)
# ---------------------------------------------------------------------------

class TestConfigSchemaShape:
    def test_api_key_is_secret_with_env_var(self):
        from hermes_lanonasis_memory import LanonasisMemoryProvider

        provider = LanonasisMemoryProvider()
        schema = provider.get_config_schema()
        api_key_field = next(f for f in schema if f["key"] == "api_key")
        # The provider declares the secret via type:"secret" + env_var
        # (the docs' boolean form "secret": True is an equivalent variant).
        is_secret = api_key_field.get("secret") is True or (
            api_key_field.get("type") == "secret"
        )
        assert is_secret, "api_key field must be marked secret"
        assert api_key_field.get("env_var") == "LANONASIS_API_KEY"

    def test_required_fields_present(self):
        from hermes_lanonasis_memory import LanonasisMemoryProvider

        provider = LanonasisMemoryProvider()
        keys = {f["key"] for f in provider.get_config_schema()}
        for required in {"api_url", "api_key", "tool_policy", "privacy_mode"}:
            assert required in keys, f"config schema missing required field '{required}'"

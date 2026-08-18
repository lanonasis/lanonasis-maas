#!/usr/bin/env bash
# verify-install.sh — health check for the LanOnasis Hermes context engine.
#
# Asserts the TWO integration paths Hermes needs, and prints exactly which
# one is broken if either fails:
#
#   1. Runtime import      — the package must import from the Hermes venv
#      (catches the dead-editable-install trap: pip .pth pointing at a
#      deleted source tree).
#   2. Entry-point load    — `hermes plugins list` discovers plugins via the
#      `hermes_agent.plugins` entry-point group, then invokes the module's
#      `register(ctx)`. This asserts the entry point resolves AND that
#      register() sets the manager's single-slot context engine to a
#      ContextEngine instance named 'lanonasis'.
#
# Unlike the memory provider, this plugin does NOT need a symlink in
# $HERMES_HOME/plugins/ — the entry point is the discovery path. (A symlink
# in ~/.hermes/plugins/ is harmless if present, but is not required.)
#
# Usage:  ./scripts/verify-install.sh   (run from the package root)
# Exit:   0 = all green, 1 = broken (details printed).
set -u

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Locate the Hermes runtime python. `hermes` is a venv shim; resolve it.
#
# Three cases:
#   A) symlink to the venv bin (readlink -f lands next to `python`)
#   B) bash shim that `exec`s a venv binary (e.g. ~/.local/bin/hermes) —
#      parse the exec target and look for `python` beside it
#   C) HERMES_PY set explicitly by the caller (override everything)
if [ -n "${HERMES_PY:-}" ] && [ -x "$HERMES_PY" ]; then
    echo "Hermes runtime python (env override): $HERMES_PY"
else
    HERMES_BIN="$(command -v hermes || true)"
    if [ -z "$HERMES_BIN" ]; then
        echo "✗ 'hermes' not found on PATH — is Hermes installed?" >&2
        exit 1
    fi
    HERMES_REAL="$(readlink -f "$HERMES_BIN" 2>/dev/null || echo "$HERMES_BIN")"
    HERMES_PY="$(dirname "$HERMES_REAL")/python"
    if [ ! -x "$HERMES_PY" ] && [ -f "$HERMES_REAL" ] && head -1 "$HERMES_REAL" | grep -q '^#!/usr/bin/env bash'; then
        # Bash shim: extract the quoted exec target, resolve symlinks on it,
        # then look for `python` in the venv's bin dir.
        HERMES_TARGET="$(grep -m1 '^[[:space:]]*exec ' "$HERMES_REAL" | sed -E 's/.*exec[[:space:]]+"([^"]+)".*/\1/')"
        if [ -z "$HERMES_TARGET" ]; then
            HERMES_TARGET="$(grep -m1 '^[[:space:]]*exec ' "$HERMES_REAL" | sed -E 's/.*exec[[:space:]]+([^ "]+).*/\1/')"
        fi
        if [ -n "$HERMES_TARGET" ]; then
            HERMES_TARGET_REAL="$(readlink -f "$HERMES_TARGET" 2>/dev/null || echo "$HERMES_TARGET")"
            HERMES_PY="$(dirname "$HERMES_TARGET_REAL")/python"
        fi
    fi
    if [ ! -x "$HERMES_PY" ]; then
        echo "✗ could not locate the Hermes venv python (tried $HERMES_PY)" >&2
        exit 1
    fi
    echo "Hermes runtime python: $HERMES_PY"
fi

fail=0

echo
echo "── 1/2  Runtime import ──────────────────────────────────────────"
if "$HERMES_PY" -c "
import os, sys
import hermes_lanonasis_context_engine as C
origin = os.path.abspath(C.__file__)
print(f'  module: {C.__file__}')
print(f'  origin exists on disk: {os.path.exists(origin)}')
" 2>&1; then
    echo "  ✓ import path resolves"
else
    echo "  ✗ 'import hermes_lanonasis_context_engine' FAILED from the Hermes venv." >&2
    echo "    Most likely cause: a dead editable install (pip .pth pointing at a" >&2
    echo "    deleted source tree). Fix:" >&2
    echo "      $HERMES_PY -m pip uninstall -y hermes-lanonasis-context-engine" >&2
    echo "      $HERMES_PY -m pip install -e '$HERE'" >&2
    fail=1
fi

echo
echo "── 2/2  Entry-point load + register() ──────────────────────────"
DISCOVERED_STDERR="$(mktemp)"
DISCOVERED="$("$HERMES_PY" -c "
import importlib.metadata as md
from hermes_cli.plugins import PluginManager, PluginContext, PluginManifest

def load_register():
    for group in md.entry_points().groups:
        for e in md.entry_points().select(group=group):
            if 'lanonasis-context' != e.name or 'lanonasis' not in e.value:
                continue
            pm = PluginManager()
            manifest = PluginManifest(
                name=e.name, key=e.name, version='0.1.0', description='verify',
                source='entrypoint', kind='plugin', path=e.value,
            )
            register_fn = e.load()
            register_fn(PluginContext(manifest, pm))
            ce = getattr(pm, '_context_engine', None)
            from agent.context_engine import ContextEngine
            return ('lanonasis-context' in [e.name],
                    ce is not None and isinstance(ce, ContextEngine) and ce.name == 'lanonasis')
    return (False, False)

ep, eng = load_register()
print(ep)
print(eng)
" 2>"$DISCOVERED_STDERR")"
if [ -s "$DISCOVERED_STDERR" ]; then
    echo "  (load stderr: $(tr '\n' ' ' < "$DISCOVERED_STDERR"))"
fi
rm -f "$DISCOVERED_STDERR"
EP_OK=$(echo "$DISCOVERED" | sed -n 1p)
ENG_OK=$(echo "$DISCOVERED" | sed -n 2p)

if [ "$EP_OK" = "True" ] && [ "$ENG_OK" = "True" ]; then
    echo "  ✓ entry point 'lanonasis-context' loads; register() sets engine 'lanonasis'"
else
    echo "  ✗ entry point did not load, or register() did not set the context engine." >&2
    echo "    Fix:" >&2
    echo "      $HERMES_PY -m pip uninstall -y hermes-lanonasis-context-engine" >&2
    echo "      $HERMES_PY -m pip install -e '$HERE'" >&2
    echo "      hermes plugins enable lanonasis-context" >&2
    echo "    Engine must inherit agent.context_engine.ContextEngine and name it 'lanonasis'." >&2
    fail=1
fi

echo
if [ "$fail" -eq 0 ]; then
    echo "✓ All green — context engine is importable AND registers."
    echo "  Next: set 'context.engine: lanonasis' in config.yaml to select it."
else
    echo "✗ Install is broken — fix the issues above, then re-run this script." >&2
fi
exit "$fail"

#!/usr/bin/env bash
# verify-install.sh — health check for the LanOnasis Hermes memory provider.
#
# Asserts the TWO integration paths Hermes needs, and prints exactly which
# one is broken if either fails:
#
#   1. Runtime import   — the package must import from the Hermes venv
#      (catches the dead-editable-install trap: pip .pth pointing at a
#      deleted source tree).
#   2. On-disk discovery — `hermes memory setup`/`status` route through
#      plugins.memory.discover_memory_providers(), which only scans
#      $HERMES_HOME/plugins/<name>/__init__.py on disk (catches the
#      entry-point-vs-discovery gap: pip install alone is invisible to
#      the CLI).
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
import hermes_lanonasis_memory as M
origin = os.path.abspath(M.__file__)
print(f'  module: {M.__file__}')
print(f'  origin exists on disk: {os.path.exists(origin)}')
print(f'  subclass-of-ABC check requires runtime; import OK.')
" 2>&1; then
    echo "  ✓ import path resolves"
else
    echo "  ✗ 'import hermes_lanonasis_memory' FAILED from the Hermes venv." >&2
    echo "    Most likely cause: a dead editable install (pip .pth pointing at a" >&2
    echo "    deleted source tree). Fix:" >&2
    echo "      $HERMES_PY -m pip uninstall -y hermes-lanonasis-memory" >&2
    echo "      $HERMES_PY -m pip install -e '$HERE'" >&2
    fail=1
fi

echo
echo "── 2/2  On-disk discovery (hermes memory setup path) ───────────"
DISCOVERED_STDERR="$(mktemp)"
DISCOVERED="$("$HERMES_PY" -c "
try:
    from plugins.memory import discover_memory_providers, load_memory_provider
    names = [n for n, _, _ in discover_memory_providers()]
    print('lanonasis' in names)
    p = load_memory_provider('lanonasis')
    print(p is not None)
except Exception as e:
    print(False)
    print(False)
    import sys; print(f'discovery raised: {e}', file=sys.stderr)
" 2>"$DISCOVERED_STDERR")"
if [ -s "$DISCOVERED_STDERR" ]; then
    echo "  (discovery stderr: $(tr '\n' ' ' < "$DISCOVERED_STDERR"))"
fi
rm -f "$DISCOVERED_STDERR"
DISCOVERED_NAME=$(echo "$DISCOVERED" | sed -n 1p)
DISCOVERED_LOAD=$(echo "$DISCOVERED" | sed -n 2p)

if [ "$DISCOVERED_NAME" = "True" ] && [ "$DISCOVERED_LOAD" = "True" ]; then
    echo "  ✓ discover_memory_providers() lists 'lanonasis' and it loads"
else
    echo "  ✗ Hermes' on-disk discovery does NOT see the provider." >&2
    echo "    A pip install alone is invisible to 'hermes memory setup' — it only" >&2
    echo "    scans \$HERMES_HOME/plugins/<name>/__init__.py on disk. Fix:" >&2
    echo "      HERMES_HOME=\${HERMES_HOME:-\$HOME/.hermes}" >&2
    echo "      mkdir -p \"\$HERMES_HOME/plugins\"" >&2
    echo "      ln -sfn '$HERE/hermes_lanonasis_memory' \"\$HERMES_HOME/plugins/lanonasis\"" >&2
    fail=1
fi

echo
if [ "$fail" -eq 0 ]; then
    echo "✓ All green — provider is importable AND discoverable."
    echo "  Next: hermes memory status | grep lanonasis  (should say available)"
else
    echo "✗ Install is broken — fix the issues above, then re-run this script." >&2
fi
exit "$fail"

#!/usr/bin/env bash
# build-and-test.sh
#
# Ensures workspace deps are linked, builds the CLI, then runs tests.
# Designed as a drop-in replacement for `npm test` in CI or manual runs.
#
# Usage:
#   npm run build-and-test          # run all tests
#   npm run build-and-test -- test/integration.test.ts   # run specific suite
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLI_DIR="$(dirname "$SCRIPT_DIR")"
MONOREPO_ROOT="$(cd "$CLI_DIR/../../.." && pwd)"

# ── 1. Ensure workspace deps are symlinked ──────────────────────────
symlink_workspace_deps() {
  local nm="@lanonasis"
  local nm_path="$CLI_DIR/node_modules/$nm"

  mkdir -p "$nm_path"

  # mem-intel-sdk
  local mem_path="$MONOREPO_ROOT/packages/memory-intelligence-engine/mem-intelligence-sdk"
  if [[ ! -L "$nm_path/mem-intel-sdk" ]] || [[ "$(readlink "$nm_path/mem-intel-sdk")" != "$mem_path" ]]; then
    rm -rf "$nm_path/mem-intel-sdk"
    ln -s "$mem_path" "$nm_path/mem-intel-sdk"
    echo "✓ Linked @lanonasis/mem-intel-sdk -> $mem_path"
  fi

  # secret-prescan
  local sec_path="$MONOREPO_ROOT/packages/secret-prescan"
  if [[ ! -L "$nm_path/secret-prescan" ]] || [[ "$(readlink "$nm_path/secret-prescan")" != "$sec_path" ]]; then
    rm -rf "$nm_path/secret-prescan"
    ln -s "$sec_path" "$nm_path/secret-prescan"
    echo "✓ Linked @lanonasis/secret-prescan -> $sec_path"
  fi

  # privacy-sdk
  local pri_path="$MONOREPO_ROOT/packages/privacy-sdk"
  if [[ ! -L "$nm_path/privacy-sdk" ]] || [[ "$(readlink "$nm_path/privacy-sdk")" != "$pri_path" ]]; then
    rm -rf "$nm_path/privacy-sdk"
    ln -s "$pri_path" "$nm_path/privacy-sdk"
    echo "✓ Linked @lanonasis/privacy-sdk -> $pri_path"
  fi
}

# ── 2. Build the CLI ───────────────────────────────────────────────
build_cli() {
  echo ""
  echo "🔨 Building CLI..."
  cd "$CLI_DIR"
  bun run build
  echo "✓ CLI built successfully"
}

# ── 3. Run tests ───────────────────────────────────────────────────
run_tests() {
  echo ""
  echo "🧪 Running tests..."
  cd "$CLI_DIR"
  if [[ $# -gt 0 ]]; then
    node --experimental-vm-modules node_modules/jest/bin/jest.js "$@"
  else
    node --experimental-vm-modules node_modules/jest/bin/jest.js
  fi
}

# ── Main ───────────────────────────────────────────────────────────
echo "=== Lanonasis CLI: Build & Test ==="
echo "CLI dir:   $CLI_DIR"
echo "Monorepo:  $MONOREPO_ROOT"
echo ""

symlink_workspace_deps
build_cli
run_tests "$@"

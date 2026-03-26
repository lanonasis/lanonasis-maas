#!/usr/bin/env bash
set -euo pipefail

# install.sh — Activate the recall-forge OpenClaw plugin
# Run from the monorepo root or the plugin directory.
#
# Prerequisites:
#   - OpenClaw installed (npm install -g openclaw && openclaw onboard)
#   - ~/.openclaw/ directory exists
#
# Usage:
#   bash packages/openclaw-plugin/setup/install.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_DIR="$(dirname "$SCRIPT_DIR")"
OPENCLAW_DIR="$HOME/.openclaw"
EXTENSIONS_DIR="$OPENCLAW_DIR/extensions"
LINK_NAME="recall-forge"
CONFIG_FILE="$OPENCLAW_DIR/openclaw.json"

# --- Preflight ---
echo "=== recall-forge plugin installer ==="
echo ""

if ! command -v openclaw &>/dev/null; then
  echo "ERROR: OpenClaw is not installed."
  echo ""
  echo "Install with:"
  echo "  npm install -g openclaw"
  echo "  openclaw onboard"
  echo ""
  exit 1
fi

if [ ! -d "$OPENCLAW_DIR" ]; then
  echo "ERROR: ~/.openclaw/ does not exist."
  echo "Run 'openclaw onboard' first to initialize your workspace."
  exit 1
fi

# --- Step 1: Symlink plugin ---
echo "1. Symlinking plugin..."
mkdir -p "$EXTENSIONS_DIR"

if [ -L "$EXTENSIONS_DIR/$LINK_NAME" ]; then
  echo "   Symlink already exists — updating..."
  rm "$EXTENSIONS_DIR/$LINK_NAME"
elif [ -d "$EXTENSIONS_DIR/$LINK_NAME" ]; then
  echo "   Directory exists at target — backing up to ${LINK_NAME}.bak..."
  mv "$EXTENSIONS_DIR/$LINK_NAME" "$EXTENSIONS_DIR/${LINK_NAME}.bak"
fi

ln -s "$PLUGIN_DIR" "$EXTENSIONS_DIR/$LINK_NAME"
echo "   Linked: $EXTENSIONS_DIR/$LINK_NAME -> $PLUGIN_DIR"

# --- Step 2: Install dependencies + build ---
echo "2. Installing dependencies and building dist/..."
cd "$PLUGIN_DIR"
if command -v bun &>/dev/null; then
  bun install --no-save 2>/dev/null || npm install --no-save 2>/dev/null
else
  npm install --no-save 2>/dev/null
fi
if ! npm run build >/dev/null 2>&1; then
  echo "ERROR: Build failed. Run 'npm run build' in $PLUGIN_DIR and fix the issue before continuing."
  exit 1
fi
echo "   Dependencies installed and dist/ built."

# --- Step 3: Merge openclaw.json config ---
echo "3. Configuring openclaw.json..."

# Check if jq is available for JSON manipulation
if ! command -v jq &>/dev/null; then
  echo "   WARNING: jq not installed — cannot auto-merge config."
  echo "   Please manually add the following to $CONFIG_FILE:"
  echo ""
  cat <<'MANUAL_CONFIG'
  "plugins": {
    "allow": ["recall-forge"],
    "slots": { "memory": "recall-forge" },
    "entries": {
      "recall-forge": {
        "enabled": true,
        "config": {
          "apiKey": "YOUR_LANONASIS_API_KEY",
          "projectId": "YOUR_PROJECT_ID",
          "captureMode": "hybrid",
          "localFallback": true,
          "autoRecall": true,
          "agentId": "main"
        }
      }
    }
  }
MANUAL_CONFIG
  echo ""
else
  # Backup current config
  if [ -f "$CONFIG_FILE" ]; then
    cp "$CONFIG_FILE" "${CONFIG_FILE}.bak.$(date +%s)"
    echo "   Backed up: ${CONFIG_FILE}.bak.*"
  fi

  # Read existing or create empty
  EXISTING=$(cat "$CONFIG_FILE" 2>/dev/null || echo '{}')

  # Check if plugin already configured
  if echo "$EXISTING" | jq -e '.plugins.entries["recall-forge"]' &>/dev/null; then
    echo "   Plugin already configured in openclaw.json — skipping merge."
  else
    # Prompt for credentials
    echo ""
    read -rp "   LanOnasis API Key (lano_...): " API_KEY
    read -rp "   LanOnasis Project ID: " PROJECT_ID

    if [ -z "$API_KEY" ] || [ -z "$PROJECT_ID" ]; then
      echo "   WARNING: Empty credentials — plugin will not connect to MaaS."
      echo "   Edit $CONFIG_FILE manually to add credentials."
      API_KEY="${API_KEY:-YOUR_API_KEY}"
      PROJECT_ID="${PROJECT_ID:-YOUR_PROJECT_ID}"
    fi

    # Merge plugin config
    UPDATED=$(echo "$EXISTING" | jq --arg key "$API_KEY" --arg pid "$PROJECT_ID" '
      .plugins.allow = ((.plugins.allow // []) + ["recall-forge"] | unique) |
      .plugins.slots.memory = "recall-forge" |
      .plugins.entries["recall-forge"] = {
        "enabled": true,
        "config": {
          "apiKey": $key,
          "projectId": $pid,
          "captureMode": "hybrid",
          "localFallback": true,
          "autoRecall": true,
          "agentId": "main"
        }
      }
    ')

    echo "$UPDATED" | jq . > "$CONFIG_FILE"
    echo "   Config merged into $CONFIG_FILE"
  fi
fi

# --- Step 4: Copy AGENTS.md and HEARTBEAT.md snippets ---
echo "4. Preparing workspace integration snippets..."
WORKSPACE_DIR="$OPENCLAW_DIR/workspace"
if [ -d "$WORKSPACE_DIR" ]; then
  echo "   AGENTS.md snippet:  $SCRIPT_DIR/agents-memory.md"
  echo "   HEARTBEAT.md snippet: $SCRIPT_DIR/heartbeat-memory.md"
  echo ""
  echo "   To activate, append these to your workspace files:"
  echo "     cat $SCRIPT_DIR/agents-memory.md >> $WORKSPACE_DIR/AGENTS.md"
  echo "     cat $SCRIPT_DIR/heartbeat-memory.md >> $WORKSPACE_DIR/HEARTBEAT.md"
else
  echo "   No workspace found at $WORKSPACE_DIR"
  echo "   Run 'openclaw onboard' to create a workspace first."
fi

# --- Step 5: Verify ---
echo ""
echo "5. Verifying..."
if openclaw recall status 2>/dev/null; then
  echo ""
  echo "=== Plugin activated successfully ==="
else
  echo "   Verification skipped — run 'openclaw recall status' manually after setup."
fi

echo ""
echo "=== Installation complete ==="
echo ""
echo "Next steps:"
echo "  1. Verify: openclaw recall status"
echo "  2. Test:   openclaw recall list"
echo "  3. Append AGENTS.md snippet to your workspace"
echo "  4. Append HEARTBEAT.md snippet for health monitoring"
echo ""

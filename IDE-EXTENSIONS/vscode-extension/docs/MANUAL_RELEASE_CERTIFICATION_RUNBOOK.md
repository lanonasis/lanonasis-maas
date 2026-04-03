# VSCode Extension Manual Release Certification Runbook

**Date:** 2026-04-03  
**Extension:** `lanonasis-memory`  
**Recommended channel:** Pre-release first

## Purpose

This runbook covers the **manual/interactive checks** that still need to be completed after the automated certification matrix passes.

Use this alongside:

- [`RELEASE_CERTIFICATION_MATRIX.md`](./RELEASE_CERTIFICATION_MATRIX.md)
- [`../PUBLISH_CHECKLIST.md`](../PUBLISH_CHECKLIST.md)
- [`../READY_TO_DEPLOY.md`](../READY_TO_DEPLOY.md)

## Current release stance

- The extension is **automatically certified** for lint, typecheck, unit tests, stable/pre-release packaging, VSIX integrity, and clean-profile install.
- The extension is **not yet manually certified** for live auth, upgrade behavior, CLI-import behavior, and offline recovery.
- Transport settings are **deprecated/ignored by the shipped runtime**:
  - `lanonasis.transportPreference`
  - `lanonasis.websocketUrl`
  - `lanonasis.enableRealtime`

## Evidence capture

For each scenario, capture:

1. Pass/fail
2. Timestamp
3. VSIX used
4. VS Code version
5. Short notes
6. Screenshot or output excerpt if anything looks unusual

Recommended local evidence folder:

```bash
mkdir -p /tmp/lanonasis-manual-cert/{screenshots,notes}
```

## Prerequisites

Before running this manual matrix:

1. Build the pre-release VSIX:

```bash
cd /Users/seyederick/DevOps/_project_folders/lan-onasis-monorepo/apps/lanonasis-maas/IDE-EXTENSIONS/vscode-extension
npm run package:pre-release
```

2. Confirm the artifact exists:

```bash
ls -lh /Users/seyederick/DevOps/_project_folders/lan-onasis-monorepo/apps/lanonasis-maas/IDE-EXTENSIONS/vscode-extension/lanonasis-memory-2.1.1-pre-release.vsix
```

3. Have the following ready:

- A browser session for OAuth login
- A valid API key for direct-key auth testing
- A CLI-authenticated environment for import testing
- A clean temp profile location

## Common temp-profile setup

Use dedicated VS Code user-data and extensions directories so results are reproducible:

```bash
export LANO_CERT_BASE="$(mktemp -d /tmp/lanonasis-manual-cert.XXXXXX)"
export LANO_USER_DIR="$LANO_CERT_BASE/user"
export LANO_EXT_DIR="$LANO_CERT_BASE/ext"
mkdir -p "$LANO_USER_DIR" "$LANO_EXT_DIR"
```

Install the pre-release VSIX:

```bash
code \
  --user-data-dir "$LANO_USER_DIR" \
  --extensions-dir "$LANO_EXT_DIR" \
  --install-extension /Users/seyederick/DevOps/_project_folders/lan-onasis-monorepo/apps/lanonasis-maas/IDE-EXTENSIONS/vscode-extension/lanonasis-memory-2.1.1-pre-release.vsix \
  --force
```

Launch VS Code against the current workspace:

```bash
code \
  --user-data-dir "$LANO_USER_DIR" \
  --extensions-dir "$LANO_EXT_DIR" \
  /Users/seyederick/DevOps/_project_folders/lan-onasis-monorepo
```

## Scenario 1: Fresh-run activation in a clean profile

### Goal

Confirm the extension activates, contributes commands/views/chat participant correctly, and does not fail on first load.

### Steps

1. Use the clean profile setup above.
2. Open the Command Palette.
3. Run:
   - `Lanonasis: Show Connection Status`
   - `Lanonasis: Run System Diagnostics`
   - `Lanonasis: Show MCP Server Status`
4. Verify the activity bar/view container and commands appear.
5. Open the extension output/log view if needed.

### Pass criteria

- No activation crash
- Commands are available
- Diagnostics complete and produce readable output
- Connection-status command returns a reasonable state
- MCP status command behaves gracefully even if no server is available

### Fail examples

- Extension fails to activate
- Missing commands/view container
- Diagnostics throw
- Command invocations hang or error immediately

## Scenario 2: Upgrade install over an existing profile

### Goal

Confirm a user upgrading an already-installed extension does not lose basic functionality.

### Suggested method

1. Create a temp profile.
2. Install the current stable VSIX first:

```bash
cd /Users/seyederick/DevOps/_project_folders/lan-onasis-monorepo/apps/lanonasis-maas/IDE-EXTENSIONS/vscode-extension
npm run package
```

3. Install `lanonasis-memory-2.1.1.vsix` into the temp profile.
4. Launch the extension once and close it.
5. Install `lanonasis-memory-2.1.1-pre-release.vsix` into the **same** temp profile.
6. Relaunch VS Code with the same user-data/extensions directories.

### Pass criteria

- Upgrade install succeeds
- Commands and sidebar still appear
- Existing extension state does not cause activation failure
- Diagnostics still run

## Scenario 3: OAuth sign-in flow

### Goal

Verify live browser auth works from the current shipped extension.

### Steps

1. In a clean or known-unauthenticated profile, run:
   - `Lanonasis: Authenticate`
2. Choose OAuth/browser auth.
3. Complete the browser flow.
4. Return to VS Code.
5. Run:
   - `Lanonasis: Check API Key Status`
   - `Lanonasis: Show Connection Status`
   - `Lanonasis: Run System Diagnostics`

### Pass criteria

- Browser opens successfully
- Authentication completes without extension error
- VS Code shows success confirmation
- API key/auth status reports configured
- Diagnostics show authenticated state via secure storage

### Evidence to capture

- Success notification text
- Diagnostics summary

## Scenario 4: API key entry flow

### Goal

Verify direct API-key auth still works cleanly.

### Steps

1. In a clean or cleared profile, run:
   - `Lanonasis: Authenticate`
2. Choose API key mode.
3. Paste a valid API key.
4. Run:
   - `Lanonasis: Check API Key Status`
   - `Lanonasis: Test Connection`
   - `Lanonasis: Show Connection Status`

### Pass criteria

- API key prompt accepts input
- Auth succeeds and stores credentials
- Connection test succeeds
- Status commands reflect authenticated state

## Scenario 5: CLI-present import path

### Goal

Verify the extension imports compatible auth/config state from `~/.maas/config.json` when allowed.

### Setup

Prepare a machine/user session where the CLI has already authenticated and written `~/.maas/config.json`.

### Steps

1. Confirm the extension profile has **no** stored secure credentials.
2. Keep `lanonasis.importCLIConfig = true`.
3. Launch the extension in a clean profile.
4. Watch for the import notification on startup.
5. Run:
   - `Lanonasis: Run System Diagnostics`
   - `Lanonasis: Show Connection Status`

### Pass criteria

- Startup imports compatible CLI metadata only when extension credentials are absent
- Diagnostics show CLI import source metadata
- Extension does not overwrite explicit VS Code settings

### Important checks

- Imported endpoint/config values should not override explicit extension settings
- Expired or unusable CLI credentials should be handled safely

## Scenario 6: CLI-absent startup path

### Goal

Verify the extension behaves gracefully when CLI/config is unavailable.

### Steps

1. Use a clean profile with no secure credentials.
2. Ensure no usable `~/.maas/config.json` is available for the test account, or set:
   - `lanonasis.importCLIConfig = false`
3. Launch the extension.
4. Run:
   - `Lanonasis: Run System Diagnostics`
   - `Lanonasis: Show MCP Server Status`
   - `Lanonasis: Authenticate`

### Pass criteria

- No startup crash
- No false claim that CLI auth was imported
- MCP status degrades gracefully if no server exists
- User can still authenticate manually

## Scenario 7: Offline queue and recovery

### Goal

Verify offline-aware behavior is real in the shipped extension path.

### Suggested setup

Use an authenticated profile first so create/update actions are available.

### Steps

1. Authenticate successfully.
2. Create a known test memory while online to confirm baseline behavior.
3. Disable network connectivity or otherwise force the extension into an offline state.
4. Create or update memory content while offline.
5. Verify the extension reports offline/queued behavior.
6. Restore connectivity.
7. Run `Lanonasis: Sync Offline Operations` if auto-sync does not immediately occur.

### Pass criteria

- Offline state is surfaced clearly
- New writes queue instead of silently failing
- Sync succeeds once connectivity returns
- No duplicate or corrupted writes appear after reconnection

## Scenario 8: Gateway vs Direct API mode

### Goal

Verify the supported runtime mode switch is the one users should rely on now that transport settings are deprecated.

### Steps

1. Run `Lanonasis: Switch Gateway/Direct API Mode`
2. Switch to Gateway mode and run `Lanonasis: Show Connection Status`
3. Switch to Direct API mode and run `Lanonasis: Show Connection Status`
4. Run `Lanonasis: Run System Diagnostics` after each switch

### Pass criteria

- Mode switch command succeeds
- Connection info updates accordingly
- Diagnostics reflect the selected API mode

## Scenario 9: Deprecated transport settings warning

### Goal

Verify ignored transport settings are clearly surfaced as deprecated, not silently honored.

### Steps

1. In Settings, set one or more of:
   - `lanonasis.transportPreference`
   - `lanonasis.websocketUrl`
   - `lanonasis.enableRealtime`
2. Confirm VS Code shows those settings as deprecated.
3. Run `Lanonasis: Run System Diagnostics`

### Pass criteria

- Settings UI shows deprecation messaging
- Diagnostics warn that those settings are ignored by the shipped runtime
- Core extension behavior remains unchanged

## Exit criteria for pre-release promotion

You can move to a real pre-release rollout when:

- All automated checks remain green
- Scenarios 1 through 9 pass, or any known failures are explicitly accepted
- Auth flows are stable
- CLI import behavior is understandable and documented
- Offline queue behavior is verified at least once

## Exit criteria for stable promotion

Promote from pre-release to stable only after:

- Pre-release users/testers report no packaging or activation regressions
- No auth regressions are found
- No migration surprises are reported
- No support churn appears around deprecated transport settings

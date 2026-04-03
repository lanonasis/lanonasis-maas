# VSCode Extension Release Certification Matrix

**Date:** 2026-04-03  
**Scope:** `apps/lanonasis-maas/IDE-EXTENSIONS/vscode-extension`  
**Extension Version:** `2.1.1`

## Outcome

Release certification is **conditionally ready** for marketplace promotion.

- Core ship path is healthy: lint, runtime typecheck, test-surface typecheck, unit tests, stable packaging, pre-release packaging, VSIX integrity, and clean-profile install all passed.
- Remaining release work is mostly **manual certification**, not source-blocking engineering debt.
- Transport settings are now treated as **deprecated/ignored by the shipped runtime** pending a future runtime integration decision.

## Automated Matrix

| Check | Result | Evidence |
| --- | --- | --- |
| `npm run lint` | PASS | Extension lint passed cleanly |
| `npm run typecheck` | PASS | Main shipped runtime TS check passed |
| `tsc -p tsconfig.test.json --noEmit` | PASS | Test-surface TS check passed |
| `npm exec nx run lanonasis-memory-vscode:test:unit` | PASS | 4 files / 50 tests passed |
| `npm run package` | PASS | Stable VSIX build succeeded for `lanonasis-memory-2.1.1.vsix` |
| `npm run package:pre-release` | PASS | Pre-release VSIX built: `lanonasis-memory-2.1.1-pre-release.vsix` |
| VSIX contents review | PASS | 23-file package, lean `out/extension.js`, no unexpected test/report artifacts |
| Pre-release manifest flag | PASS | `extension.vsixmanifest` contains `Microsoft.VisualStudio.Code.PreRelease=true` |
| Clean-profile install (pre-release artifact) | PASS | Fresh install succeeded with `code --user-data-dir ... --extensions-dir ... --install-extension ... --force` |

## Manual/Interactive Checks Still Required

| Check | Status | Notes |
| --- | --- | --- |
| Fresh-run activation in a real VS Code window | MANUAL | CLI install command proves package validity, but not end-user interaction flow |
| Upgrade install over an existing profile | MANUAL | Needed for migration confidence |
| OAuth sign-in flow | MANUAL | Requires browser interaction |
| API key entry flow | MANUAL | Requires interactive command execution |
| CLI-present import path | MANUAL | Requires a prepared `~/.maas/config.json` plus extension window validation |
| CLI-absent startup path | MANUAL | Requires clean profile without CLI/config |
| Offline queue end-to-end | MANUAL | Requires network-state transition in a live extension host |

## Transport Decision

### Decision

**Soft-deprecate the extension-local transport settings now. Do not integrate `TransportManager` in this release.**

### Rationale

- The shipped runtime does not instantiate `TransportManager`.
- The active connection path is `EnhancedMemoryService`/`MemoryService` plus offline wrappers, Gateway/Direct API mode, and MCP discovery.
- Leaving `transportPreference`, `websocketUrl`, and `enableRealtime` as if they are actionable creates false expectations and support churn.
- A future transport integration should be treated as an explicit product/architecture project, not an opportunistic release tweak.

### What Changed In This Pass

- `lanonasis.transportPreference` now has a deprecation message and states that it is ignored by the shipped runtime.
- `lanonasis.websocketUrl` now has a deprecation message and points users to MCP discovery and Gateway/Direct API settings instead.
- `lanonasis.enableRealtime` now has a deprecation message and states that real-time transport is not currently routed through the active extension path.
- Diagnostics now warn when any of those deprecated transport settings are explicitly configured by the user.
- README now documents those three settings as deprecated/ignored.

## Recommendation

Proceed with a **pre-release rollout first**, using the packaged `lanonasis-memory-2.1.1-pre-release.vsix`, then complete the manual certification items above before promoting the same code line to stable.

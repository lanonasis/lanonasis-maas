# Ready To Deploy

## Current status

The VS Code extension is **ready for a pre-release rollout**, not an immediate stable promotion.

Use these source-of-truth docs:

- [`PUBLISH_CHECKLIST.md`](./PUBLISH_CHECKLIST.md)
- [`docs/RELEASE_CERTIFICATION_MATRIX.md`](./docs/RELEASE_CERTIFICATION_MATRIX.md)

## What is already verified

- Packaging integrity passes through the current Nx/npm ship path
- Stable and pre-release VSIX packaging succeed
- The pre-release VSIX manifest carries `Microsoft.VisualStudio.Code.PreRelease=true`
- Clean-profile install succeeds for the current pre-release artifact
- Lint, runtime typecheck, test-surface typecheck, and unit tests all pass

## What still requires manual certification

- Fresh-run activation in a real VS Code window
- Upgrade install over an existing user profile
- OAuth sign-in flow
- API key entry flow
- CLI-present import path from `~/.maas/config.json`
- CLI-absent startup path
- Offline queue behavior during network transitions

## Transport stance for this release

The extension-local transport settings are **deprecated for the current release line**:

- `lanonasis.transportPreference`
- `lanonasis.websocketUrl`
- `lanonasis.enableRealtime`

Those settings are ignored by the shipped runtime and are now surfaced as deprecated in settings plus diagnostics. The supported runtime path remains:

- Gateway vs Direct API mode
- CLI-aware memory client integration
- MCP discovery/status
- Offline queue and cache wrappers

## Recommended rollout

1. Build the pre-release artifact:

```bash
cd IDE-EXTENSIONS/vscode-extension
npm run package:pre-release
```

2. Complete the manual certification items listed above.

3. Publish pre-release first:

```bash
cd IDE-EXTENSIONS/vscode-extension
npx @vscode/vsce login LanOnasis
npm run publish:pre-release
```

4. Promote to stable only after the pre-release line passes real-user/manual validation without auth, packaging, or activation regressions.

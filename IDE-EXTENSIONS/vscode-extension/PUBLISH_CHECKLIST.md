# VS Code Extension Publishing Checklist

## Pre-Publish Checklist

### 1. Version & Docs

- [ ] `package.json` version is correct for the intended release
- [ ] `CHANGELOG.md` reflects the release scope
- [ ] `README.md` matches the current runtime and auth/config behavior
- [ ] Any deprecated settings or legacy paths are documented conservatively

### 2. Code Quality

- [ ] `npm exec nx run lanonasis-memory-vscode:lint` passes
- [ ] Known warnings are reviewed and either fixed or explicitly accepted
- [ ] No secrets, tokens, or local-only URLs are packaged

### 3. Gate Validation

- [ ] Packaging integrity is verified with `npm exec nx run lanonasis-memory-vscode:package`
- [ ] Auth/config precedence changes are validated in diagnostics
- [ ] CLI-present and CLI-absent startup paths have been smoke tested
- [ ] Offline queue / sidebar load still work after packaging changes

### 4. Build Verification

- [ ] `npm run package` creates a stable VSIX
- [ ] `npm run package:pre-release` creates a pre-release VSIX when needed
- [ ] VSIX contents are reviewed for unexpected files
- [ ] Test install works in a clean VS Code profile

### 5. Marketplace Requirements

- [ ] Icon and metadata are present
- [ ] Publisher and repository metadata are correct
- [ ] Marketplace authentication is configured for the pinned local `@vscode/vsce` toolchain

### 6. Documentation & Communication

- [ ] Release notes explain any required user action
- [ ] Auth migration / CLI import behavior is described clearly
- [ ] Pre-release vs stable channel is stated explicitly

## Packaging Commands

### Stable

```bash
cd IDE-EXTENSIONS/vscode-extension
npm run package
```

### Pre-release

```bash
cd IDE-EXTENSIONS/vscode-extension
npm run package:pre-release
```

## Publishing Commands

### Stable

```bash
cd IDE-EXTENSIONS/vscode-extension
npx @vscode/vsce login LanOnasis
npm run publish
```

### Pre-release

```bash
cd IDE-EXTENSIONS/vscode-extension
npx @vscode/vsce login LanOnasis
npm run publish:pre-release
```

## Local Install Smoke Test

```bash
TMP_DATA_DIR="$(mktemp -d)"
TMP_EXT_DIR="$(mktemp -d)"

code \
  --user-data-dir "$TMP_DATA_DIR" \
  --extensions-dir "$TMP_EXT_DIR" \
  --install-extension lanonasis-memory-$(node -p "require('./package.json').version").vsix \
  --force
```

For pre-release validation, replace the VSIX name with `lanonasis-memory-<version>-pre-release.vsix`.

## Rollback Notes

- Publish a fixed version instead of relying on stale marketplace copy
- Keep release notes honest about what changed and what did not
- If a pre-release surfaces packaging/auth regressions, hold stable promotion until the regression is reproduced and fixed

# Release Checklist - @lanonasis/cli v3.9.0

## Pre-Release Verification

### ✅ Code Quality
- [x] All TypeScript errors resolved (0 errors)
- [x] All tests passing (168 passing, 15 skipped)
- [x] No lint errors or warnings
- [x] Build succeeds without errors

### ✅ Package Preparation
- [x] Version bumped to 3.9.0 in package.json
- [x] CHANGELOG.md updated with v3.9.0 changes
- [x] README.md updated with new features
- [x] .npmignore created to exclude dev files
- [x] .gitignore created for CLI directory
- [x] Test files excluded from npm package (verified with dry-run)
- [x] Package metadata complete (description, keywords, repository, etc.)

### ✅ Directory Cleanup
- [x] Old tarball files removed
- [x] Example config files moved to `docs/examples/`
- [x] Development artifacts properly ignored

### ✅ Documentation
- [x] CHANGELOG includes all features and fixes
- [x] README reflects current version and features
- [x] Inline code examples updated
- [x] File references include line numbers where applicable

## NPM Publish Checklist

### Before Publishing

1. **Verify Package Contents**
   ```bash
   npm publish --dry-run
   ```
   Expected output:
   - ✅ Package size: ~164.8 kB
   - ✅ Unpacked size: ~815.2 kB
   - ✅ Total files: ~98
   - ✅ No `__tests__` directories in output
   - ✅ No `.test.js` or `.test.d.ts` files in output

2. **Verify Build**
   ```bash
   npm run build
   ```
   Expected: 0 errors, dist/ directory populated

3. **Run Tests**
   ```bash
   npm test
   ```
   Expected: 168 passing tests

4. **Version Check**
   ```bash
   npm version
   ```
   Verify: 3.9.0

### Publishing

**Option 1: Standard Release**
```bash
npm publish
```

**Option 2: Beta Release** (if needed)
```bash
npm publish --tag beta
```

**Option 3: With OTP** (if 2FA enabled)
```bash
npm publish --otp=<your-otp-code>
```

### After Publishing

1. **Verify on NPM**
   - Visit: https://www.npmjs.com/package/@lanonasis/cli
   - Check version is 3.9.0
   - Verify README displays correctly
   - Check package size and file count

2. **Test Installation**
   ```bash
   npm install -g @lanonasis/cli@3.9.0
   lanonasis --version  # Should show 3.9.0
   ```

3. **Smoke Test Commands**
   ```bash
   lanonasis --help
   lanonasis memory --help
   lanonasis mcp --help
   ```

## GitHub Release Checklist

### Create Git Tag

```bash
cd /Users/seyederick/DevOps/_project_folders/lanonasis-maas

# Ensure on correct branch
git checkout cli-refactor  # or main after merge

# Create annotated tag
git tag -a cli-v3.9.0 -m "CLI v3.9.0: Professional UX & Critical Fixes"

# Push tag to remote
git push origin cli-v3.9.0
```

### Create GitHub Release

1. **Navigate to Releases**
   - Go to: https://github.com/lanonasis/lanonasis-maas/releases
   - Click "Draft a new release"

2. **Release Details**
   - **Tag**: `cli-v3.9.0`
   - **Target**: `cli-refactor` (or `main` after merge)
   - **Title**: `@lanonasis/cli v3.9.0 - Professional UX & Critical Fixes`

3. **Release Notes** (copy from CHANGELOG.md)

```markdown
## 🎨 CLI UX Revolution

### Seamless Multi-Line Text Input
- **Inline Text Editor**: Professional multi-line text input without external editors
- Full editing support with visual feedback
- Configurable fallback to external editors

### Intelligent MCP Connection Management
- Auto-detects and configures embedded MCP servers
- Persistent configuration across sessions
- Health monitoring and auto-reconnection

### First-Run Onboarding
- Interactive guided setup for new users
- Automatic connectivity testing
- Context-aware troubleshooting

## 🐛 Critical Bug Fixes (PR #93)

### P1: Connection Verification False Positive
- Fixed `verifyConnection()` returning true for error/stopped servers
- Impact: Accurate connection status reporting

### P2: Configuration Not Loaded
- Added proper `init()` method call before connection
- Impact: User configuration now properly respected

### P2: Empty Content Overwrites
- Added `defaultContent` support to TextInputHandler
- Impact: Memory updates preserve existing content

## 🧪 Testing & Quality
- 168 passing tests including property-based tests
- Zero TypeScript errors
- No regressions

## 📦 Package Improvements
- Test files excluded from published package (-32 kB)
- Clean directory structure
- Professional package metadata

## Installation

\`\`\`bash
npm install -g @lanonasis/cli@3.9.0
\`\`\`

## What's Changed
- Full PR: #93

**Full Changelog**: https://github.com/lanonasis/lanonasis-maas/blob/main/cli/CHANGELOG.md
```

4. **Attach Assets** (optional)
   - None required for this release

5. **Publish Release**
   - Check "Set as latest release" if this is the newest version
   - Click "Publish release"

## Post-Release

### 1. Update Documentation Sites
- [ ] Update docs.lanonasis.com with v3.9.0 features
- [ ] Update CLI reference documentation
- [ ] Add UX improvements to guides

### 2. Announce Release
- [ ] Post on company blog/changelog
- [ ] Tweet/social media announcement
- [ ] Notify team on Slack/Discord
- [ ] Email newsletter to users (if applicable)

### 3. Monitor
- [ ] Watch NPM download stats
- [ ] Monitor GitHub issues for v3.9.0 bugs
- [ ] Check for user feedback

### 4. Merge to Main (if on feature branch)
```bash
git checkout main
git merge cli-refactor
git push origin main
```

## Rollback Plan

If critical issues are discovered:

### NPM Deprecation
```bash
npm deprecate @lanonasis/cli@3.9.0 "Critical bug found, use 3.8.1 instead"
```

### Publish Patch
```bash
# Fix the issue
npm version patch  # Creates 3.9.1
npm publish
```

## Success Criteria

- [x] NPM package published successfully
- [ ] GitHub release created
- [ ] All smoke tests pass
- [ ] No critical issues reported within 24 hours
- [ ] Documentation updated

## Notes

- **Breaking Changes**: None (fully backward compatible)
- **Migration Required**: No
- **Deprecations**: None
- **Security Fixes**: None (but includes connection verification improvements)

---

**Release Date**: 2026-02-01
**Released By**: [Your Name]
**Reviewed By**: [Reviewer Name]

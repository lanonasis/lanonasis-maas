# VS Code Extension Publishing Checklist

## Pre-Publish Checklist

### 1. Version & Changelog

- [x] Version bumped to 1.5.6 in package.json
- [x] CHANGELOG.md updated with new version
- [ ] README.md reviewed and updated if needed
- [ ] All deprecated features documented

### 2. Code Quality

- [x] TypeScript compilation successful (no errors)
- [x] Linting passed
- [ ] All console.log statements removed or converted to proper logging
- [ ] No hardcoded credentials or sensitive data

### 3. Testing

- [ ] Extension loads without errors
- [ ] Authentication flow works (OAuth + API Key)
- [ ] Memory search works
- [ ] Memory creation works
- [ ] API key management works
- [ ] All commands accessible from command palette
- [ ] Keyboard shortcuts work
- [ ] Sidebar loads correctly
- [ ] Tree views display properly

### 4. Build Verification

- [x] `npm run compile` succeeds
- [x] `npm run package` creates VSIX file
- [x] VSIX file size reasonable (~215 KB)
- [ ] Test install locally: `code --install-extension lanonasis-memory-1.5.6.vsix --force`

### 5. Marketplace Requirements

- [x] Icon present (images/icon.png)
- [x] README.md with screenshots/features
- [x] LICENSE file present
- [x] Repository URL in package.json
- [x] Publisher set to "LanOnasis"
- [ ] vsce login completed

### 6. Documentation

- [x] README.md has getting started guide
- [x] All commands documented
- [x] Configuration options explained
- [x] Keyboard shortcuts listed
- [ ] Migration guide for breaking changes

## Publishing Steps

### Option 1: Automated Script

```bash
./build-and-publish.sh
```

### Option 2: Manual Steps

```bash
# 1. Clean and build
rm -rf out/ *.vsix
npm install
npm run compile

# 2. Package
npm run package

# 3. Test locally
code --install-extension lanonasis-memory-1.5.6.vsix --force

# 4. Login to marketplace (first time only)
vsce login LanOnasis

# 5. Publish
vsce publish
# OR
npm run publish
```

## Post-Publish

### Verification

- [ ] Extension appears on marketplace (5-10 minutes)
- [ ] Install from marketplace works
- [ ] All features work in fresh install
- [ ] No errors in extension host log

### Git

- [ ] Commit all changes
- [ ] Create git tag: `git tag -a vscode-v1.5.6 -m "VS Code Extension v1.5.6"`
- [ ] Push tag: `git push origin vscode-v1.5.6`
- [ ] Push changes: `git push origin main`

### Communication

- [ ] Update docs.lanonasis.com if needed
- [ ] Announce on social media/blog
- [ ] Notify team members
- [ ] Update internal documentation

## Rollback Plan

If issues are found after publishing:

1. **Unpublish version** (if critical bug):

   ```bash
   vsce unpublish LanOnasis.lanonasis-memory@1.5.6
   ```

2. **Fix and republish**:
   - Fix the issue
   - Bump to 1.5.7
   - Follow checklist again

3. **Notify users**:
   - Update marketplace description
   - Post issue on GitHub
   - Send notification if possible

## Marketplace Links

- **Extension Page**: https://marketplace.visualstudio.com/items?itemName=LanOnasis.lanonasis-memory
- **Publisher Dashboard**: https://marketplace.visualstudio.com/manage/publishers/LanOnasis
- **Analytics**: https://marketplace.visualstudio.com/manage/publishers/LanOnasis/extensions/lanonasis-memory/hub

## Notes

- Marketplace review can take 5-10 minutes
- Users may not see update immediately (cache)
- Extension auto-updates for users with auto-update enabled
- Manual update: Extensions → LanOnasis Memory → Update

## Current Status

**Version**: 1.5.6
**Build Date**: 2025-11-18
**Package**: lanonasis-memory-1.5.6.vsix (214.91 KB)
**Status**: ✅ Built, ready for testing

**Next Step**: Test locally, then run `./build-and-publish.sh`

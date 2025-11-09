# VS Code Marketplace Publishing Guide

**Version**: 1.4.0
**Date**: 2025-11-04
**Status**: ✅ Ready to Publish

---

## Quick Start

### Prerequisites Checklist

- [x] ✅ Extension compiles successfully
- [x] ✅ `vsce` CLI installed (`/opt/homebrew/bin/vsce`)
- [x] ✅ Publisher account configured: `LanOnasis`
- [x] ✅ Icon file present: `images/icon.png`
- [x] ✅ README.md present
- [x] ✅ CHANGELOG.md present
- [ ] ⏳ Personal Access Token (PAT) ready
- [ ] ⏳ Version tested locally

---

## Current Build Status

### ✅ VSCode Extension (v1.4.0)
- **Compilation**: ✅ Clean (no errors)
- **Package Name**: `lanonasis-memory`
- **Display Name**: LanOnasis Memory Assistant
- **Publisher**: LanOnasis
- **Repository**: https://github.com/lanonasis/lanonasis-maas
- **Marketplace**: https://marketplace.visualstudio.com/items?itemName=lanonasis.lanonasis-memory

### ⚠️ Cursor Extension (v1.4.0)
- **Compilation**: ✅ Clean
- **Note**: Not published to VS Code Marketplace (IDE-specific)

### ⚠️ Windsurf Extension (v1.4.0)
- **Compilation**: ⚠️ 1 error (missing `@lanonasis/memory-client`)
- **Note**: Not published to VS Code Marketplace (IDE-specific)

---

## Publishing Methods

### Method 1: Using the Script (Recommended)

```bash
# From anywhere in the repository
cd IDE-EXTENSIONS
./publish-vscode.sh
```

**What the script does:**
1. ✅ Navigates to vscode-extension folder
2. ✅ Checks pre-publish requirements (icon, README, CHANGELOG)
3. ✅ Installs dependencies
4. ✅ Compiles TypeScript
5. ✅ Packages extension (.vsix)
6. ✅ Publishes to marketplace (requires PAT)

### Method 2: Manual Publishing

```bash
# Step 1: Navigate to extension directory
cd IDE-EXTENSIONS/vscode-extension

# Step 2: Install dependencies
npm install

# Step 3: Compile
npm run compile

# Step 4: Package
vsce package --no-dependencies

# Step 5: Publish
vsce publish
# OR with explicit PAT:
vsce publish -p YOUR_PERSONAL_ACCESS_TOKEN
```

---

## Personal Access Token (PAT) Setup

### If You Don't Have a PAT:

1. **Go to Azure DevOps:**
   - URL: https://dev.azure.com/lanonasis/_usersSettings/tokens
   - Or: https://marketplace.visualstudio.com/manage/publishers/LanOnasis

2. **Create New Token:**
   - Click: `+ New Token`
   - Name: `VSCode Extension Publishing`
   - Organization: `lanonasis`
   - Expiration: Choose duration (90 days recommended)
   - Scopes: **Marketplace** → **Manage** (full access)

3. **Save Token Securely:**
   ```bash
   # Store in environment variable (recommended)
   export VSCE_PAT="your-token-here"

   # Or use vsce login (stores locally)
   vsce login LanOnasis
   ```

### If You Have a PAT:

**Option A: Environment Variable**
```bash
export VSCE_PAT="your-token-here"
vsce publish
```

**Option B: Inline**
```bash
vsce publish -p YOUR_PERSONAL_ACCESS_TOKEN
```

**Option C: Interactive Prompt**
```bash
vsce publish
# Will prompt: "Personal Access Token for publisher 'LanOnasis':"
```

---

## Pre-Publishing Checklist

### 1. Version Verification

```bash
cd IDE-EXTENSIONS/vscode-extension
cat package.json | grep '"version"'
# Should show: "version": "1.4.0"
```

### 2. Test Locally

```bash
# Package the extension
vsce package --no-dependencies

# Install locally for testing
code --install-extension lanonasis-memory-1.4.0.vsix

# Test in VS Code:
# - Open VS Code
# - Check extension loads without errors
# - Test authentication (OAuth and API key)
# - Test memory operations (search, create, delete)
# - Check settings are visible
```

### 3. Update CHANGELOG

Ensure `CHANGELOG.md` has entry for v1.4.0:

```markdown
## [1.4.0] - 2025-11-04

### Added
- OAuth2 with PKCE authentication flow
- Secure API key storage via SecretStorage
- Manual API key entry as OAuth alternative
- Console credential redaction

### Changed
- API key storage moved from plaintext to SecretStorage
- Deprecated `lanonasis.apiKey` setting (still works for compatibility)

### Security
- All credentials now stored in OS keychain
- OAuth tokens auto-refresh
- No plaintext secrets in logs or settings
```

### 4. Update README (if needed)

Verify README mentions:
- ✅ New authentication methods (OAuth + API key)
- ✅ Security improvements
- ✅ Installation instructions
- ✅ Configuration steps

---

## Publishing Steps

### Step 1: Run the Build Script (Recommended)

```bash
cd IDE-EXTENSIONS
./build-all-extensions.sh
```

**Output:**
```
✅ All extensions built successfully!

📦 Extension packages created in dist/extensions/:
  - lanonasis-memory-1.4.0.vsix (VS Code)
  - lanonasis-memory-cursor-1.4.0.vsix (Cursor)
  - lanonasis-memory-windsurf-1.4.0.vsix (Windsurf)
```

### Step 2: Test the Package Locally

```bash
# Install from built package
code --install-extension dist/extensions/lanonasis-memory-1.4.0.vsix

# Or from vscode-extension folder:
cd vscode-extension
code --install-extension lanonasis-memory-1.4.0.vsix
```

**Manual Testing:**
1. Restart VS Code
2. Open Command Palette (Cmd/Ctrl + Shift + P)
3. Run: `Lanonasis: Authenticate`
4. Test OAuth flow
5. Test manual API key entry
6. Test memory operations
7. Check console for errors (Help → Toggle Developer Tools)

### Step 3: Publish to Marketplace

```bash
cd IDE-EXTENSIONS
./publish-vscode.sh
```

**Expected Output:**
```
🚀 Publishing LanOnasis Memory Extension to VS Code Marketplace
==========================================================
📦 Current version: 1.4.0

🔍 Running pre-publish checks...
✅ Icon file present
✅ README.md present
✅ CHANGELOG.md present

📥 Installing dependencies...
🔨 Building extension...
📦 Packaging extension...
✅ Package created: lanonasis-memory-1.4.0.vsix

📤 Publishing to VS Code Marketplace...
```

**If PAT is not configured:**
```
Personal Access Token for publisher 'LanOnasis':
# Paste your PAT here
```

**On Success:**
```
✅ Successfully published version 1.4.0!
🌐 View at: https://marketplace.visualstudio.com/items?itemName=lanonasis.lanonasis-memory

Next steps:
1. Wait 5-10 minutes for marketplace to update
2. Users will auto-update or can manually update
3. Monitor reviews and feedback
```

### Step 4: Verify Publication

1. **Check Marketplace:**
   - URL: https://marketplace.visualstudio.com/items?itemName=lanonasis.lanonasis-memory
   - Verify version shows `1.4.0`
   - Check description, screenshots updated

2. **Check in VS Code:**
   ```
   # Search for extension
   Open VS Code → Extensions → Search "lanonasis"
   # Should show version 1.4.0 available
   ```

3. **Monitor Stats:**
   - Publisher dashboard: https://marketplace.visualstudio.com/manage/publishers/LanOnasis
   - Check install count, ratings, reviews

---

## Troubleshooting

### Error: "Extension validation failed"

**Cause:** Missing required files or invalid package.json

**Solution:**
```bash
# Check for required files
cd vscode-extension
ls images/icon.png README.md CHANGELOG.md package.json

# Validate package.json
cat package.json | jq .
```

### Error: "401 Unauthorized"

**Cause:** Invalid or expired PAT

**Solution:**
1. Generate new PAT: https://dev.azure.com/lanonasis/_usersSettings/tokens
2. Ensure scope: **Marketplace → Manage**
3. Re-run: `vsce publish -p NEW_TOKEN`

### Error: "This extension is already published with version 1.4.0"

**Cause:** Version already exists on marketplace

**Solution:**
1. Increment version in `package.json`:
   ```json
   "version": "1.4.1"
   ```
2. Update CHANGELOG.md with new version
3. Re-run publish script

### Error: "Cannot find module '@lanonasis/memory-client'"

**This error is in Windsurf, not VSCode** ✅

VSCode extension compiles cleanly and is ready to publish.

### Warning: "This package has 100 files"

**Cause:** Too many files in package

**Solution:**
Add to `.vscodeignore`:
```
node_modules/**
src/**
tsconfig.json
.gitignore
.eslintrc.json
```

---

## Post-Publishing Tasks

### 1. Tag the Release

```bash
cd /Users/seyederick/DevOps/_project_folders/lanonasis-maas

# Create and push tag
git tag -a vscode-v1.4.0 -m "VSCode Extension v1.4.0: OAuth2 + Secure API Keys"
git push origin vscode-v1.4.0
```

### 2. Create GitHub Release

1. Go to: https://github.com/lanonasis/lanonasis-maas/releases/new
2. Tag: `vscode-v1.4.0`
3. Title: `VSCode Extension v1.4.0 - OAuth2 + Secure API Key Management`
4. Description:
   ```markdown
   ## 🔐 Security Enhancements

   - OAuth2 with PKCE authentication flow
   - Secure API key storage via SecretStorage (OS keychain)
   - Deprecated plaintext API key setting
   - Console credential redaction

   ## ✨ Features

   - Manual API key entry as OAuth alternative
   - Automatic token refresh
   - Improved authentication UX

   ## 📥 Installation

   Install from VS Code Marketplace:
   https://marketplace.visualstudio.com/items?itemName=lanonasis.lanonasis-memory

   Or search "LanOnasis" in VS Code Extensions panel.
   ```
5. Attach: `lanonasis-memory-1.4.0.vsix` from `dist/extensions/`

### 3. Update Documentation

- [ ] Update main README.md with v1.4.0 features
- [ ] Update authentication documentation
- [ ] Update security documentation
- [ ] Add migration guide for users on v1.3.x

### 4. Monitor Marketplace

**First 24 Hours:**
- Check for installation errors
- Monitor reviews/ratings
- Watch for support requests
- Check analytics

**Dashboard**: https://marketplace.visualstudio.com/manage/publishers/LanOnasis

---

## Rollback Plan

### If Critical Issue Found After Publishing:

1. **Unpublish version (not recommended):**
   ```bash
   vsce unpublish lanonasis.lanonasis-memory@1.4.0
   ```

2. **Better: Publish hotfix:**
   ```bash
   # Increment to 1.4.1
   # Fix issue
   # Publish immediately
   vsce publish
   ```

---

## Version History

| Version | Date | Status | Notes |
|---------|------|--------|-------|
| 1.4.0 | 2025-11-04 | ✅ Ready | OAuth2 + Secure API Keys |
| 1.3.x | 2024-10-xx | Published | Previous stable version |

---

## Quick Reference Commands

```bash
# Check version
cd IDE-EXTENSIONS/vscode-extension && cat package.json | grep version

# Test compilation
npm run compile

# Package only (no publish)
vsce package --no-dependencies

# Publish with PAT
vsce publish -p YOUR_PAT

# Check current published version
vsce show lanonasis.lanonasis-memory

# Install locally
code --install-extension lanonasis-memory-1.4.0.vsix

# Uninstall
code --uninstall-extension lanonasis.lanonasis-memory
```

---

## Support & Resources

- **Marketplace**: https://marketplace.visualstudio.com/items?itemName=lanonasis.lanonasis-memory
- **Publisher Dashboard**: https://marketplace.visualstudio.com/manage/publishers/LanOnasis
- **GitHub Repository**: https://github.com/lanonasis/lanonasis-maas
- **Issues**: https://github.com/lanonasis/lanonasis-maas/issues
- **Documentation**: `IDE-EXTENSIONS/AUTHENTICATION-SETTINGS-GUIDE.md`

---

**Last Updated**: 2025-11-04
**Maintainer**: LanOnasis Team
**Next Review**: After marketplace publication

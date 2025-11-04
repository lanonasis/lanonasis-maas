# Quick Start: Publishing VSCode Extension to Marketplace

**Version**: 1.4.0
**Status**: ✅ Ready to Publish
**Time Required**: 15-30 minutes

---

## TL;DR - Fastest Path to Publishing

```bash
# 1. Navigate to extensions folder
cd IDE-EXTENSIONS

# 2. Build all extensions (includes VSCode)
./build-all-extensions.sh

# 3. Test locally (IMPORTANT!)
code --install-extension dist/extensions/lanonasis-memory-1.4.0.vsix

# 4. Test in VS Code
# - Restart VS Code
# - Test authentication (OAuth + API key)
# - Test memory operations
# - Check console for errors

# 5. Publish to marketplace (requires PAT)
./publish-vscode.sh
# When prompted, enter your Personal Access Token

# 6. Done! ✅
```

---

## Step-by-Step Guide

### Step 1: Get Personal Access Token (One-time Setup)

**If you already have a PAT, skip to Step 2.**

1. Go to: https://marketplace.visualstudio.com/manage/publishers/LanOnasis
2. Click "..." menu → "Create New Personal Access Token"
3. **Name**: `VSCode Publishing`
4. **Organization**: All accessible organizations
5. **Expiration**: 90 days (recommended)
6. **Scopes**: ✅ Marketplace → **Manage**
7. Click "Create" and **SAVE THE TOKEN** (you won't see it again)

**Store it:**
```bash
# Option A: Environment variable (recommended)
export VSCE_PAT="your-token-here"

# Option B: Will be prompted when you run publish script
```

### Step 2: Build the Extension

```bash
cd /Users/seyederick/DevOps/_project_folders/lanonasis-maas/IDE-EXTENSIONS
./build-all-extensions.sh
```

**Expected Output:**
```
🚀 Building LanOnasis-MAAS Extensions v1.4.0
===========================================

✓ VS Code Extension
✓ Cursor Extension
✓ Windsurf Extension

✅ All extensions built successfully!
📦 Packages in: dist/extensions/
```

### Step 3: Test Locally (CRITICAL!)

```bash
# Install the built package
code --install-extension dist/extensions/lanonasis-memory-1.4.0.vsix

# Restart VS Code
# Press: Cmd+Q (Mac) or Ctrl+Q (Linux/Windows)
```

**In VS Code, test these:**

1. **Extension Loads**
   - Open Command Palette: `Cmd+Shift+P`
   - Search: "Lanonasis"
   - Should see commands listed ✅

2. **Authentication Works**
   - Run: `Lanonasis: Authenticate`
   - Test OAuth (browser opens) ✅
   - OR test manual API key entry ✅

3. **Basic Operations Work**
   - Search memories
   - Create a memory
   - View memories in sidebar

4. **No Console Errors**
   - Help → Toggle Developer Tools
   - Check Console tab
   - Should be no red errors ✅

**If any test fails, STOP and fix issues before publishing!**

### Step 4: Publish to Marketplace

```bash
cd /Users/seyederick/DevOps/_project_folders/lanonasis-maas/IDE-EXTENSIONS
./publish-vscode.sh
```

**Script will prompt:**
```
Personal Access Token for publisher 'LanOnasis':
```

**Paste your PAT and press Enter.**

**Expected Output:**
```
✅ Successfully published version 1.4.0!
🌐 View at: https://marketplace.visualstudio.com/items?itemName=lanonasis.lanonasis-memory

Next steps:
1. Wait 5-10 minutes for marketplace to update
2. Users will auto-update or can manually update
3. Monitor reviews and feedback
```

### Step 5: Verify Publication

**Wait 5-10 minutes, then:**

1. **Check Marketplace Page:**
   - URL: https://marketplace.visualstudio.com/items?itemName=lanonasis.lanonasis-memory
   - Verify version shows `1.4.0` ✅
   - Check description looks correct ✅

2. **Search in VS Code:**
   - Open Extensions panel: `Cmd+Shift+X`
   - Search: "LanOnasis"
   - Should show version 1.4.0 available ✅

3. **Check Publisher Dashboard:**
   - URL: https://marketplace.visualstudio.com/manage/publishers/LanOnasis
   - Check install count incrementing
   - Monitor for reviews/ratings

### Step 6: Post-Publishing Tasks

```bash
# Create git tag
cd /Users/seyederick/DevOps/_project_folders/lanonasis-maas
git tag -a vscode-v1.4.0 -m "VSCode Extension v1.4.0: OAuth2 + Secure API Keys"
git push origin vscode-v1.4.0

# Create GitHub Release
# Go to: https://github.com/lanonasis/lanonasis-maas/releases/new
# Tag: vscode-v1.4.0
# Title: VSCode Extension v1.4.0 - OAuth2 + Secure API Key Management
# Attach: dist/extensions/lanonasis-memory-1.4.0.vsix
```

---

## Troubleshooting

### "401 Unauthorized"
**Your PAT is invalid or expired.**

**Fix:**
1. Generate new PAT: https://marketplace.visualstudio.com/manage
2. Run: `vsce publish -p NEW_TOKEN`

### "This extension is already published with version 1.4.0"
**Version already exists on marketplace.**

**Fix:**
1. Edit `vscode-extension/package.json`: change version to `1.4.1`
2. Update `CHANGELOG.md` with new version
3. Re-run: `./build-all-extensions.sh`
4. Re-run: `./publish-vscode.sh`

### "Cannot find vsce command"
**vsce CLI not installed.**

**Fix:**
```bash
npm install -g vsce
```

### Extension loads but authentication fails
**This is NOT a publishing issue.**

**Fix:**
- Check OAuth server is running: https://auth.lanonasis.com
- Check API server is running: https://api.lanonasis.com
- Verify firewall allows localhost:8080 (OAuth callback)

---

## What's New in v1.4.0

### For Users:
- 🔐 **OAuth2 Authentication** - Secure browser-based login
- 🔑 **Manual API Key Option** - Alternative to OAuth
- 🛡️ **Secure Storage** - Credentials stored in OS keychain
- ♻️ **Auto Token Refresh** - No manual re-authentication
- 🔒 **No Plaintext Secrets** - All credentials encrypted

### For Developers:
- Settings: `lanonasis.apiKey` deprecated (still works)
- Authentication: Choose OAuth or manual API key
- Storage: VS Code SecretStorage API (macOS Keychain, Windows Credential Manager)
- Migration: Automatic from old plaintext settings

---

## Scripts Reference

| Script | Purpose | Status |
|--------|---------|--------|
| `build-all-extensions.sh` | Build all 3 extensions | ✅ Ready |
| `publish-vscode.sh` | Publish VSCode to marketplace | ✅ Ready |

**Both scripts:**
- ✅ Compatible with current folder structure
- ✅ Executable permissions set
- ✅ Up-to-date with v1.4.0
- ✅ Tested and validated

---

## Documentation Reference

| Document | Purpose |
|----------|---------|
| `MARKETPLACE-PUBLISHING-GUIDE.md` | Detailed publishing workflow |
| `SCRIPTS-STATUS.md` | Script validation and compatibility |
| `AUTHENTICATION-SETTINGS-GUIDE.md` | User authentication documentation |
| `AUDIT-REPORT-VALIDATION.md` | Code validation results |
| `TEST-RESULTS.md` | Testing documentation |
| `PHASE-2-FIXES-APPLIED.md` | v1.4.0 changes summary |

---

## Time Estimates

| Task | First Time | Repeat |
|------|-----------|--------|
| Get PAT | 5 min | N/A (reuse) |
| Build extension | 2-3 min | 2-3 min |
| Test locally | 5-10 min | 3-5 min |
| Publish | 2 min | 2 min |
| Verify publication | 10 min | 5 min |
| **Total** | **25-30 min** | **12-15 min** |

---

## Success Checklist

Before publishing:
- [x] ✅ VSCode extension compiles cleanly
- [x] ✅ Version is 1.4.0
- [x] ✅ CHANGELOG updated
- [x] ✅ Icon file present
- [x] ✅ README present
- [ ] ⏳ PAT obtained
- [ ] ⏳ Tested locally (OAuth + API key)
- [ ] ⏳ No console errors

After publishing:
- [ ] ⏳ Marketplace page updated (5-10 min)
- [ ] ⏳ Git tag created (`vscode-v1.4.0`)
- [ ] ⏳ GitHub release created
- [ ] ⏳ Monitoring marketplace (24 hours)

---

## Need Help?

**Documentation:**
- Publishing Guide: `MARKETPLACE-PUBLISHING-GUIDE.md`
- Authentication Guide: `AUTHENTICATION-SETTINGS-GUIDE.md`
- Scripts Status: `SCRIPTS-STATUS.md`

**Resources:**
- Marketplace: https://marketplace.visualstudio.com/items?itemName=lanonasis.lanonasis-memory
- Dashboard: https://marketplace.visualstudio.com/manage/publishers/LanOnasis
- GitHub: https://github.com/lanonasis/lanonasis-maas
- Issues: https://github.com/lanonasis/lanonasis-maas/issues

---

**Ready to publish?** Run these commands:

```bash
cd IDE-EXTENSIONS
./build-all-extensions.sh
code --install-extension dist/extensions/lanonasis-memory-1.4.0.vsix
# Test in VS Code
./publish-vscode.sh
```

**Good luck! 🚀**

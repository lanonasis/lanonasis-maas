# Local Testing Guide - IDE Extensions v1.4.0

## 🎯 Build Complete!

All 3 extensions successfully packaged:
- ✅ `lanonasis-memory-1.4.0.vsix` (VSCode) - 141.54KB
- ✅ `lanonasis-memory-cursor-1.4.0.vsix` (Cursor) - 134.03KB
- ✅ `lanonasis-memory-windsurf-1.4.0.vsix` (Windsurf) - 137.67KB

Location: `dist/extensions/`

---

## 📋 What Was Fixed in v1.4.0

### Security Fixes
- 🔐 OAuth timeout race condition fixed (Issues #43, #44, #45)
- 🔐 Proper timeout tracking prevents double-rejection
- 🔐 clearTimeout on all authentication exit paths

### Package Manager Standardization
- ✅ Removed all bun.lock files
- ✅ Standardized on npm with package-lock.json
- ✅ CI/CD workflow now uses npm ci (faster, more reliable)

### Bug Fixes
- 🐛 Cursor: Removed unnecessary setTimeout import
- 🐛 Windsurf: Fixed client ID ('cursor-extension' → 'windsurf-extension')
- 🐛 Windsurf: Added missing IMemoryService and EnhancedMemoryService modules
- 🐛 All: TypeScript compilation errors resolved

---

## 🧪 Local Testing Instructions

### Option 1: Install in VS Code

```bash
# Navigate to extensions folder
cd dist/extensions/

# Install VSCode extension
code --install-extension lanonasis-memory-1.4.0.vsix

# Restart VS Code
```

**Verify installation:**
1. Open VS Code
2. View → Extensions
3. Search for "LanOnasis Memory"
4. Should show version 1.4.0

### Option 2: Install in Cursor

```bash
# Navigate to extensions folder
cd dist/extensions/

# Install Cursor extension (use 'cursor' command if available, or manually)
cursor --install-extension lanonasis-memory-cursor-1.4.0.vsix

# OR manually:
# 1. Open Cursor
# 2. Extensions panel (Cmd+Shift+X)
# 3. Click "..." menu → "Install from VSIX..."
# 4. Select lanonasis-memory-cursor-1.4.0.vsix
```

### Option 3: Install in Windsurf

```bash
# Navigate to extensions folder
cd dist/extensions/

# Install manually:
# 1. Open Windsurf
# 2. Extensions panel
# 3. Click "..." menu → "Install from VSIX..."
# 4. Select lanonasis-memory-windsurf-1.4.0.vsix
```

---

## ✅ Testing Checklist

### 1. Extension Loads
- [ ] Extension appears in Extensions list
- [ ] Version shows as 1.4.0
- [ ] No activation errors in console (Help → Toggle Developer Tools)

### 2. OAuth Authentication (Primary Method)
- [ ] Run command: "LanOnasis: Login with Browser"
- [ ] Browser opens to auth.lanonasis.com
- [ ] After login, extension receives token
- [ ] **Critical**: No double-rejection errors in console
- [ ] **Critical**: Timeout clears properly (check console for setTimeout warnings)
- [ ] Token stored in SecretStorage (not plaintext config)

### 3. Legacy API Key Authentication (Fallback)
- [ ] Add API key to settings: `lanonasis.apiKey`
- [ ] Extension reads and uses the key
- [ ] API calls work correctly
- [ ] Key remains accessible (backward compatibility)

### 4. Race Condition Fix Verification
**Test the OAuth timeout race condition fix:**

1. Run "Login with Browser"
2. **Wait exactly 5 minutes** without completing auth
3. Check console for timeout message
4. **Critical**: Should only see ONE rejection, not two
5. **Critical**: No "Cannot read properties of undefined" errors
6. **Critical**: Server closes cleanly

**Before fix:** Would see double-rejection error  
**After fix:** Single rejection, clean timeout

### 5. Client ID Verification (Windsurf Only)
- [ ] Open DevTools console
- [ ] Run "Login with Browser"
- [ ] Check network tab for OAuth requests
- [ ] **Critical**: client_id should be `windsurf-extension` (not `cursor-extension`)

### 6. Basic Functionality
- [ ] Run command: "LanOnasis: Search Memories" (Ctrl+Shift+M)
- [ ] Run command: "LanOnasis: Create Memory from Selection"
- [ ] Tree view shows memories in sidebar
- [ ] Status bar shows authentication status

### 7. Security Verification
- [ ] API keys stored in SecretStorage (not plaintext)
- [ ] OAuth tokens in SecretStorage
- [ ] No credentials visible in settings.json
- [ ] Console logs don't expose tokens (redaction works)

---

## 🐛 Known Issues to Verify

### Package.json Warnings (Non-blocking)
- ⚠️ "activation event can be removed" - Safe to ignore, doesn't affect functionality
- ⚠️ Missing icon property (Cursor/Windsurf) - Cosmetic only

### Security Vulnerabilities (2 moderate)
```bash
# Check vulnerabilities
cd vscode-extension && npm audit

# These are in dev dependencies, not runtime
# Can fix with: npm audit fix --force
# (But may cause breaking changes, test first)
```

---

## 📊 Build Artifacts Details

### VSCode Extension (lanonasis-memory-1.4.0.vsix)
- **Size**: 141.54KB
- **Files**: 28 files
- **Compiled**: TypeScript → JavaScript in `out/`
- **Includes**: SecureApiKeyService with race condition fixes

### Cursor Extension (lanonasis-memory-cursor-1.4.0.vsix)
- **Size**: 134.03KB
- **Files**: 22 files
- **Fixed**: Removed setTimeout import
- **Fixed**: Timeout tracking added

### Windsurf Extension (lanonasis-memory-windsurf-1.4.0.vsix)
- **Size**: 137.67KB
- **Files**: 23 files
- **Fixed**: Client ID changed to 'windsurf-extension'
- **Fixed**: Added EnhancedMemoryService and IMemoryService modules
- **Fixed**: Timeout tracking added

---

## 🔍 Debugging Tips

### Enable Extension Logging
```typescript
// In VS Code/Cursor/Windsurf settings.json
{
  "lanonasis.debug": true
}
```

### Check Extension Console
1. Open Developer Tools: Help → Toggle Developer Tools
2. Console tab → Filter for "LanOnasis" or "OAuth"
3. Look for timeout tracking logs
4. Verify no double-rejection errors

### Check Network Requests
1. Developer Tools → Network tab
2. Filter for "auth.lanonasis.com"
3. Verify client_id in OAuth requests
4. Check token exchange flow

### Check SecretStorage
```bash
# Cannot directly view SecretStorage (encrypted)
# But can verify behavior:
# 1. Set API key in settings
# 2. Restart extension
# 3. Check if extension still authenticated
# 4. Remove key from settings
# 5. Extension should still work (using SecretStorage copy)
```

---

## 🚀 Next Steps After Testing

### If Tests Pass:
1. ✅ Commit changes to git
2. ✅ Push to trigger CI workflow
3. ✅ Monitor CI build results
4. ✅ Tag release: `git tag ide-extensions-v1.4.0`
5. ✅ Publish to marketplace (via CI or manual)

### If Tests Fail:
1. Document the failure in GitHub issue
2. Check console errors
3. Verify timeout behavior specifically
4. Test with fresh install (remove old version first)
5. Report findings for additional fixes

---

## 📝 Test Results Template

Copy and fill this out:

```markdown
# IDE Extensions v1.4.0 Test Results

**Tester:** [Your Name]
**Date:** November 2, 2025
**Environment:** macOS [version] / Windows [version] / Linux [version]

## VSCode Extension
- [ ] Installation: PASS / FAIL
- [ ] OAuth Auth: PASS / FAIL
- [ ] Legacy Auth: PASS / FAIL
- [ ] Race Condition Fix: PASS / FAIL
- [ ] Basic Functions: PASS / FAIL
- [ ] Notes:

## Cursor Extension
- [ ] Installation: PASS / FAIL
- [ ] OAuth Auth: PASS / FAIL
- [ ] Legacy Auth: PASS / FAIL
- [ ] Race Condition Fix: PASS / FAIL
- [ ] setTimeout Import Removed: PASS / FAIL
- [ ] Basic Functions: PASS / FAIL
- [ ] Notes:

## Windsurf Extension
- [ ] Installation: PASS / FAIL
- [ ] OAuth Auth: PASS / FAIL
- [ ] Client ID Fixed: PASS / FAIL
- [ ] Race Condition Fix: PASS / FAIL
- [ ] Basic Functions: PASS / FAIL
- [ ] Notes:

## Overall Status: READY / NEEDS FIXES
```

---

## 🔐 Security Testing (Critical)

### Test 1: OAuth Timeout Race Condition
**Expected behavior:**
- Single rejection after 5-minute timeout
- Clean server shutdown
- No "Cannot read properties of undefined" errors
- clearTimeout called exactly once

**Test procedure:**
1. Start OAuth flow
2. Don't complete login for 5 minutes
3. Observe console logs
4. **PASS** if single rejection, **FAIL** if double-rejection

### Test 2: Credential Storage
**Expected behavior:**
- API keys never in plaintext settings.json
- OAuth tokens never in plaintext
- All credentials in SecretStorage

**Test procedure:**
1. Authenticate with OAuth
2. Open settings.json
3. Search for "token", "apiKey", "secret"
4. **PASS** if nothing found, **FAIL** if credentials visible

### Test 3: Console Redaction
**Expected behavior:**
- No tokens in console logs
- API keys redacted as "***"
- OAuth flows log sanitized data only

**Test procedure:**
1. Enable debug logging
2. Perform authentication
3. Make API calls
4. Check console logs
5. **PASS** if no tokens visible, **FAIL** if exposed

---

**Build Version:** 1.4.0  
**Build Date:** November 2, 2025  
**Build Script:** build-all-extensions.sh v1.4.0  
**Package Manager:** npm (bun.lock files removed)

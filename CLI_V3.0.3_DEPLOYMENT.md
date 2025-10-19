# CLI v3.0.3 Deployment Guide

## 🎯 What's Fixed in v3.0.3

### Critical Bug Fix
**Authentication Persistence** - The blocker that prevented CLI from working properly

**Before (v3.0.1)**:
```bash
lanonasis auth login  # ✅ Success
lanonasis status      # ❌ Shows "Authenticated: No"
lanonasis memory list # ❌ Requires re-authentication
```

**After (v3.0.3)**:
```bash
lanonasis auth login  # ✅ Success
lanonasis status      # ✅ Shows "Authenticated: Yes"
lanonasis memory list # ✅ Works without re-auth
```

### Root Cause
`CLIConfig` was never initialized with `await config.init()`, so saved authentication from `~/.maas/config.json` was never loaded.

### The Fix
Added `await cliConfig.init()` in:
1. `preAction` hook - Loads config before every command
2. `status` command - Ensures status reads actual saved auth

---

## 📋 Pre-Deployment Checklist

### 1. Verify Auth Endpoints ✅

**Current Configuration**:
- Auth Base: `https://api.lanonasis.com`
- Auth Login: `https://api.lanonasis.com/api/v1/auth/login`
- Auth Signup: `https://api.lanonasis.com/api/v1/auth/signup`
- Memory API: `https://api.lanonasis.com/api/v1`
- MCP WebSocket: `wss://mcp.lanonasis.com/ws`

**Verify Endpoints**:
```bash
# Test auth endpoint
curl -X POST https://api.lanonasis.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -H "X-Project-Scope: lanonasis-maas" \
  -d '{"email":"admin@example.com","password":"your-password"}'

# Should return: {"user":{...},"token":"...","expires_at":"..."}
```

### 2. Build & Test Locally ✅

```bash
# Navigate to CLI directory
cd cli

# Install dependencies
npm install

# Build
npm run build

# Link locally for testing
npm link

# Test authentication flow
lanonasis auth login
# Enter: admin@example.com / password

# Verify persistence
lanonasis status
# Should show: "Authenticated: Yes"

# Test memory operations
lanonasis memory list

# Cleanup local link
npm unlink -g @lanonasis/cli
```

### 3. Update Version References

**Files to update**:
- [x] `cli/package.json` - version: "3.0.3"
- [ ] `README-ENHANCED.md` - CLI badge version
- [ ] `CLI_DEPLOYMENT_PLAN.md` - version references

---

## 🚀 Deployment Steps

### Step 1: Final Build
```bash
cd cli
npm run build
```

### Step 2: NPM Login
```bash
npm login
# Username: [your-npm-username]
# Password: [your-npm-password]
# Email: [your-email]
```

### Step 3: Publish to NPM
```bash
# Dry run first (see what will be published)
npm publish --dry-run

# Publish for real
npm publish --access public

# Verify publication
npm view @lanonasis/cli version
# Should show: 3.0.3
```

### Step 4: Test Installation
```bash
# In a different directory
npm install -g @lanonasis/cli@latest

# Verify version
lanonasis --version
# Should show: 3.0.3

# Test auth flow
lanonasis auth login
lanonasis status
lanonasis memory list
```

---

## 🧪 Post-Deployment Testing

### Test Suite
```bash
# 1. Fresh installation
npm install -g @lanonasis/cli@latest

# 2. Authentication
lanonasis auth login
# Enter credentials

# 3. Verify persistence
lanonasis status
# Expected: "Authenticated: Yes"

# 4. Memory operations
lanonasis memory create --title "Test" --content "Testing v3.0.3"
lanonasis memory list
lanonasis memory search "test"

# 5. MCP functionality
lanonasis mcp status
lanonasis mcp start

# 6. Logout and re-login
lanonasis auth logout
lanonasis status
# Expected: "Authenticated: No"

lanonasis auth login
lanonasis status
# Expected: "Authenticated: Yes"
```

---

## 📊 Verification Checklist

After deployment, verify:

- [ ] NPM package published successfully
- [ ] Version shows as 3.0.3
- [ ] `npm install -g @lanonasis/cli@latest` works
- [ ] `lanonasis --version` shows 3.0.3
- [ ] Authentication persists between commands
- [ ] `lanonasis status` shows correct auth state
- [ ] Memory operations work without re-auth
- [ ] MCP connection works
- [ ] Config file `~/.maas/config.json` is created and persisted

---

## 🔧 Rollback Plan

If issues are discovered:

```bash
# Unpublish v3.0.3 (within 72 hours)
npm unpublish @lanonasis/cli@3.0.3

# Or deprecate
npm deprecate @lanonasis/cli@3.0.3 "Critical bug, use v3.0.4"

# Users can downgrade
npm install -g @lanonasis/cli@3.0.1
```

---

## 📝 Release Notes

### v3.0.3 (2025-10-17)

**Critical Fix**:
- 🐛 **FIXED**: Authentication not persisting between commands
  - Root cause: CLIConfig never initialized, saved auth never loaded
  - Impact: Users had to re-authenticate for every command
  - Solution: Added `await cliConfig.init()` in preAction hook and status command

**Technical Details**:
- Added config initialization in `cli/src/index.ts` line 49 (preAction hook)
- Added config initialization in `cli/src/index.ts` line 512 (status command)
- Config file location: `~/.maas/config.json`
- Auth token now properly persists across CLI sessions

**Testing**:
- ✅ Authentication flow tested
- ✅ Token persistence verified
- ✅ Memory operations work without re-auth
- ✅ Status command shows correct auth state

---

## 🎯 Next Steps After Deployment

1. **Announce Release**:
   - Update documentation
   - Notify users via email/slack
   - Post on social media

2. **Monitor**:
   - Watch npm download stats
   - Monitor error reports
   - Check user feedback

3. **Update Documentation**:
   - Update README with v3.0.3
   - Update CLI_DEPLOYMENT_PLAN.md
   - Update any tutorials/guides

4. **Merge to Main**:
   - Merge `mem0-inspired-enhancements` branch
   - Tag release in git
   - Update changelog

---

## 🔗 Related Files

- `cli/src/index.ts` - Main CLI entry point (contains fix)
- `cli/src/utils/config.ts` - Config management
- `cli/src/commands/auth.ts` - Authentication commands
- `cli/src/utils/api.ts` - API client with auth endpoints
- `AUTH_FIX.md` - Detailed fix documentation

---

## ✅ Ready to Deploy

All checks passed. CLI v3.0.3 is ready for npm publication.

**Command to deploy**:
```bash
cd cli && npm run build && npm publish --access public
```

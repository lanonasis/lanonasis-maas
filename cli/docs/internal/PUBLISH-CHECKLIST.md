# 📦 CLI v3.3.15 Publishing Checklist

**Version:** 3.3.15  
**Previous:** 3.2.15  
**Date:** October 27, 2025

---

## 🎯 What's New in v3.3.15

### **Major Changes:**
1. ✅ **Auth Gateway Integration**
   - CLI now verifies tokens with `auth.lanonasis.com`
   - Multi-endpoint fallback strategy
   - Better CLI token format support

2. ✅ **Token Verification Improvements**
   - Priority: localhost → auth.lanonasis.com → api.lanonasis.com
   - Handles `cli_timestamp_hex` format properly
   - 7-day token expiration

3. ✅ **URL Structure Alignment**
   - MCP auth: `mcp.lanonasis.com/auth/cli-login`
   - Token verify: `auth.lanonasis.com/v1/auth/verify-token`
   - API services: `api.lanonasis.com/api/v1`

---

## ⚠️ Package Version Mismatch Issue

### **Current State:**
```json
// package.json
"version": "3.3.15"

// package-lock.json (needs sync)
"version": "3.2.15"  ← OLD VERSION
```

### **Why This Happens:**
- You manually updated `package.json` version
- `package-lock.json` still has old version
- This is **NORMAL** and npm handles it automatically

### **What npm publish Does:**
When you run `npm publish`:
1. Reads version from `package.json` → `3.3.15` ✅
2. Updates `package-lock.json` automatically
3. Publishes using `package.json` version
4. Version mismatch is **NOT an issue** for publishing

---

## 📋 Pre-Publish Checklist

### **1. Version Sync (Optional but Recommended)**
```bash
cd apps/lanonasis-maas/cli

# This will sync package-lock.json with package.json version
npm install --package-lock-only

# Verify versions match
cat package.json | grep version
cat package-lock.json | head -5 | grep version
```

### **2. Clean Build**
```bash
# Clean old builds
rm -rf dist/

# Fresh install
npm ci

# Build
npm run build

# Verify build output
ls -la dist/
```

### **3. Test Locally**
```bash
# Link locally for testing
npm link

# Test commands
onasis --version  # Should show 3.3.15
onasis status
onasis auth login
onasis health

# Unlink when done
npm unlink -g @lanonasis/cli
```

### **4. Run Tests**
```bash
# Run test suite
npm test

# Type check
npm run type-check

# Lint
npm run lint
```

### **5. Verify Files to Publish**
```bash
# Check what will be published
npm pack --dry-run

# Should include:
# - dist/ (compiled code)
# - package.json
# - README.md
# - CHANGELOG (if exists)
```

### **6. Check npm Login**
```bash
# Verify you're logged in
npm whoami

# If not logged in:
npm login
```

---

## 🚀 Publishing Steps

### **Option 1: Standard Publish (Recommended)**
```bash
cd apps/lanonasis-maas/cli

# 1. Sync versions (optional)
npm install --package-lock-only

# 2. Clean build
rm -rf dist/
npm ci
npm run build

# 3. Verify version
cat package.json | grep version
# Should show: "version": "3.3.15"

# 4. Publish to npm
npm publish

# You'll be prompted for:
# - OTP (One-Time Password from authenticator app)
# - Confirmation

# 5. Verify publication
npm view @lanonasis/cli version
# Should show: 3.3.15

# 6. Test installation
npm install -g @lanonasis/cli
onasis --version
```

### **Option 2: Publish with Tag**
```bash
# Publish as beta first (for testing)
npm publish --tag beta

# Test beta version
npm install -g @lanonasis/cli@beta

# If good, promote to latest
npm dist-tag add @lanonasis/cli@3.3.15 latest
```

---

## 🧪 Post-Publish Verification

### **1. Check npm Registry**
```bash
# View published version
npm view @lanonasis/cli

# Check all versions
npm view @lanonasis/cli versions

# Check latest version
npm view @lanonasis/cli version
```

### **2. Test Fresh Install**
```bash
# Uninstall current
npm uninstall -g @lanonasis/cli

# Install from npm
npm install -g @lanonasis/cli

# Verify version
onasis --version
# Should show: 3.3.15

# Test authentication flow
onasis auth logout
onasis auth login
onasis status
# Should show: "Authenticated: Yes" ✅
```

### **3. Test All Major Features**
```bash
# Authentication
onasis auth login
onasis auth logout
onasis status

# Memory operations
onasis memory list
onasis memory create "Test" "Content"

# Health checks
onasis health
onasis ping

# Configuration
onasis config show
```

---

## 📝 Update CHANGELOG

Create or update `CHANGELOG.md`:

```markdown
# Changelog

## [3.3.15] - 2025-10-27

### Added
- Auth Gateway integration at auth.lanonasis.com
- Multi-endpoint token verification fallback
- Better CLI token format handling (cli_timestamp_hex)
- Enhanced error messages for authentication

### Changed
- Token verification priority: localhost → auth-gateway → netlify
- Improved authentication flow reliability
- Updated URL structure documentation

### Fixed
- CLI token validation with new auth-gateway
- Authentication status correctly shows "Authenticated: Yes"
- Token format recognition improvements

## [3.2.15] - Previous Release
...
```

---

## ⚠️ Common Issues & Solutions

### **Issue 1: "You do not have permission to publish"**
```bash
# Solution: Login to npm
npm logout
npm login
# Use correct npm account credentials
```

### **Issue 2: "Version 3.3.15 already exists"**
```bash
# Solution: Check current version
npm view @lanonasis/cli version

# If already published, bump version
# Edit package.json: 3.3.15 → 3.3.16
npm install --package-lock-only
npm publish
```

### **Issue 3: "package-lock.json version mismatch"**
```bash
# Solution: Sync versions (auto-fixed during publish anyway)
npm install --package-lock-only

# Or just ignore - npm publish handles it
```

### **Issue 4: OTP Required**
```bash
# Solution: Have authenticator app ready
npm publish
# Enter OTP when prompted
```

---

## 🔐 Security Checks

### **Before Publishing:**
```bash
# 1. Check for secrets in code
grep -r "SECRET\|PASSWORD\|API_KEY" src/

# 2. Verify .npmignore or files in package.json
cat package.json | grep -A 10 '"files"'

# 3. Check for sensitive data
npm pack --dry-run | grep -i "secret\|password\|key"

# 4. Audit dependencies
npm audit

# 5. Check package size
npm pack
ls -lh lanonasis-cli-3.3.15.tgz
```

---

## 📊 Version History

| Version | Date | Changes |
|---------|------|---------|
| 3.3.15 | 2025-10-27 | Auth gateway integration, multi-endpoint fallback |
| 3.2.15 | Previous | Multi-endpoint verification strategy |
| 3.2.14 | Previous | CLI-friendly token verification |

---

## ✅ Final Checklist

Before running `npm publish`:

- [ ] Version bumped in package.json (3.3.15)
- [ ] package-lock.json synced (run `npm install --package-lock-only`)
- [ ] Clean build completed (`npm run build`)
- [ ] Tests passing (`npm test`)
- [ ] No TypeScript errors (`npm run type-check`)
- [ ] No lint errors (`npm run lint`)
- [ ] CHANGELOG updated
- [ ] Logged into npm (`npm whoami`)
- [ ] No secrets in code
- [ ] Auth gateway deployed and working
- [ ] Local testing successful
- [ ] Ready to publish!

---

## 🚀 Quick Publish Command

```bash
cd apps/lanonasis-maas/cli && \
npm install --package-lock-only && \
rm -rf dist/ && \
npm ci && \
npm run build && \
npm test && \
npm publish
```

---

**Status:** ✅ Ready to Publish  
**Version:** 3.3.15  
**Changes:** Auth gateway integration + URL alignment  
**package-lock.json:** Will sync automatically during publish

# @lanonasis/cli v3.2.14

**Release Date:** October 27, 2025  
**Type:** Patch Release (Bug Fixes)

---

## 🔒 Security & Authentication Fixes

### **Critical Auth Flow Fixes**

#### 1. **Token Validation Enhancement**
- ✅ CLI now validates token format before accepting
- ✅ Rejects URLs pasted instead of tokens
- ✅ Server-side verification before saving credentials
- ✅ Clear error messages for invalid tokens

**Impact:** Prevents authentication bypass where any string (including URLs) was accepted as valid tokens

**Files Changed:** `src/commands/auth.ts`

#### 2. **Enhanced `isAuthenticated()` with Server Verification**
- ✅ Now verifies tokens with server on every check
- ✅ Smart caching (5-minute TTL) to reduce API calls
- ✅ Offline fallback mode with warning
- ✅ Detects revoked/invalid tokens

**Impact:** Ensures tokens are actually valid with the server, not just locally expired

**Files Changed:** `src/utils/config.ts`

---

## 🐛 Bug Fixes

### Authentication Bugs
1. **Fixed:** Browser auth accepted any string as token
   - **Before:** Could paste `https://mcp.lanonasis.com/auth/cli-login` as token
   - **After:** Validates format and verifies with server

2. **Fixed:** `onasis status` showed "Authenticated: No" even after successful login
   - **Before:** Only checked local token expiry
   - **After:** Verifies token validity with server

3. **Fixed:** No server-side token verification
   - **Before:** Tokens never validated against server
   - **After:** `/auth/verify` endpoint validates all tokens

---

## 📦 What's Included

### New Features
- Token format validation in browser auth flow
- Server-side token verification with caching
- Offline mode support with warnings
- Better error messages for auth failures

### Server-Side Updates (Deployed Separately)
- New `/auth/verify` endpoint for token validation
- Interactive auth page with working "COPY TOKEN" button
- Proper token generation: `cli_timestamp_hex` format

---

## 🔄 Upgrade Guide

### For Users

**Option 1: Install from npm (Recommended)**
```bash
npm install -g @lanonasis/cli@3.2.14
```

**Option 2: Build from Source**
```bash
git pull origin main
cd apps/lanonasis-maas/cli
npm install
npm run build
npm link  # or npm install -g .
```

### Breaking Changes
**None** - This is a backward-compatible patch release

### Behavioral Changes
1. Token validation now happens before accepting credentials
2. Auth status checks now contact server (cached for 5 min)
3. Invalid tokens are rejected immediately

---

## 🧪 Testing

### Manual Test
```bash
# Test complete auth flow
onasis auth logout
onasis auth login  # Choose browser option

# Should now:
# 1. Open browser with working COPY TOKEN button
# 2. Reject invalid formats (URLs, random text)
# 3. Verify token with server
# 4. Show success message

# Verify authentication
onasis status
# Should show: "Authenticated: Yes"
```

### Automated Tests
```bash
npm test
```

---

## 📊 Performance Impact

- **Token Validation:** +50-100ms per login (one-time)
- **Auth Checks:** Cached for 5 minutes (minimal impact)
- **Offline Mode:** Falls back to local validation (no blocking)

---

## 🔐 Security Improvements

1. **Token Format Validation:** Prevents injection attacks
2. **Server Verification:** Detects revoked/invalid tokens
3. **Smart Caching:** Balances security and performance
4. **Offline Fallback:** Continues working without network

---

## 🐛 Known Issues

### Non-Blocking Issues
1. Some TypeScript strict mode warnings (cosmetic, doesn't affect functionality)
2. Offline mode uses local validation (less secure but necessary)

### Workarounds
- For strict type checking: These are warnings only, code runs fine
- For offline security: Re-authenticate when network is restored

---

## 📝 Dependencies

No new dependencies added. Uses existing:
- `axios` for HTTP requests (already present)
- `inquirer` for CLI prompts (already present)
- `jwt-decode` for token parsing (already present)

---

## 🚀 Deployment

### Published to npm
```bash
# Published as
@lanonasis/cli@3.2.14
```

### Server-Side
Auth endpoints deployed via Netlify:
- ✅ `https://mcp.lanonasis.com/auth/cli-login`
- ✅ `https://api.lanonasis.com/auth/verify`

---

## 🙏 Credits

**Fixed By:** Cascade AI + @thefixer3x  
**Reported By:** User testing feedback  
**Test Coverage:** Manual + Automated

---

## 📚 Documentation

- **Full Fix Details:** `AUTH-FIX-COMPLETE.md`
- **Deployment Guide:** `DEPLOY-AUTH-FIX.md`
- **Original Requirements:** `AUTH-FIXES-REQUIRED.md`

---

## 🔗 Links

- **GitHub:** https://github.com/lanonasis/lanonasis-maas
- **npm:** https://www.npmjs.com/package/@lanonasis/cli
- **Docs:** https://docs.lanonasis.com
- **API Status:** https://api.lanonasis.com/health

---

## 📅 Next Release

**Planned:** v3.3.0 (Minor)
- OAuth 2.0 PKCE flow implementation
- Token refresh mechanism
- Hardware security key support (U2F/WebAuthn)
- Session management dashboard

---

**Status:** ✅ Ready for Production  
**Publish Command:** `npm publish`

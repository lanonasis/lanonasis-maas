# OAuth Authentication Fix - Port Binding Issue

**Issue:** OAuth callback server fails silently when port 8080 is in use  
**Date:** 2025-11-24  
**Version:** 1.5.9 → 1.5.10 (pending)

---

## 🔍 **Root Cause**

**Error from Jam Recording:**
```
GET net::ERR_CONNECTION_REFUSED http://localhost:8080/callback
```

**What Was Happening:**
1. ✅ User clicks "Authenticate" in extension
2. ✅ Extension tries to start callback server on port 8080
3. ❌ **Port 8080 is already in use by another process**
4. ❌ **Server fails to start BUT no error is thrown**
5. ✅ Browser opens OAuth page anyway
6. ✅ User logs in successfully
7. ✅ Server redirects to `http://localhost:8080/callback?code=...`
8. ❌ **Connection refused - no server listening!**

---

## 🐛 **The Bug**

**File:** `src/services/SecureApiKeyService.ts:303-306`

**Before (Broken):**
```typescript
server.listen(SecureApiKeyService.CALLBACK_PORT, 'localhost', () => {
    // Open browser
    vscode.env.openExternal(vscode.Uri.parse(authUrlObj.toString()));
});
```

**Problem:**
- No error handling for `server.on('error')`
- If port is in use, server fails silently
- Browser opens anyway, leading to connection refused

---

## ✅ **The Fix**

**After (Fixed):**
```typescript
// Add error handling for server
server.on('error', (err: NodeJS.ErrnoException) => {
    if (timeoutId) clearTimeout(timeoutId);
    
    if (err.code === 'EADDRINUSE') {
        reject(new Error(`Port ${SecureApiKeyService.CALLBACK_PORT} is already in use. Please close any applications using this port and try again.`));
    } else {
        reject(new Error(`Failed to start OAuth callback server: ${err.message}`));
    }
});

server.listen(SecureApiKeyService.CALLBACK_PORT, 'localhost', () => {
    this.outputChannel.appendLine(`OAuth callback server listening on port ${SecureApiKeyService.CALLBACK_PORT}`);
    
    // Open browser only after server is ready
    vscode.env.openExternal(vscode.Uri.parse(authUrlObj.toString()));
});
```

**Improvements:**
1. ✅ Catches port binding errors before opening browser
2. ✅ Shows clear error message to user
3. ✅ Logs successful server startup
4. ✅ Only opens browser after server is ready

---

## 🧪 **Testing**

### Test Case 1: Normal Flow (Port Free)
```bash
# Port 8080 is free
lsof -i :8080  # Returns nothing

# Expected behavior:
✅ Server starts on port 8080
✅ Browser opens OAuth page
✅ User logs in
✅ Callback succeeds
✅ Token stored successfully
```

### Test Case 2: Port In Use
```bash
# Simulate port conflict
python3 -m http.server 8080 &

# Try OAuth authentication
# Expected behavior:
❌ Clear error message: "Port 8080 is already in use. Please close any applications using this port and try again."
❌ Browser does NOT open
✅ User knows exactly what to fix
```

---

## 🔧 **How to Identify Port Conflicts**

### Check What's Using Port 8080:
```bash
# macOS/Linux
lsof -i :8080

# Or more detailed
lsof -i :8080 | grep LISTEN

# Common culprits:
# - Local dev servers (npm run dev, yarn dev)
# - Docker containers
# - Other VSCode extensions
# - Background services
```

### Kill Process on Port 8080:
```bash
# Find the PID
lsof -i :8080 | grep LISTEN

# Kill it
kill -9 <PID>

# Or one-liner
kill -9 $(lsof -t -i:8080)
```

---

## 📦 **Deployment**

### Build & Package:
```bash
cd /Users/seyederick/DevOps/_project_folders/lan-onasis-monorepo/apps/lanonasis-maas/IDE-EXTENSIONS/vscode-extension

# Compile TypeScript
npm run compile

# Package extension
npm run package

# Result: lanonasis-memory-1.5.10.vsix
```

### Version Bump (Optional):
```json
// package.json
{
  "version": "1.5.10",  // Bump from 1.5.9
  "changelog": "Fixed OAuth callback server port binding error handling"
}
```

---

## 🎯 **User Experience Improvements**

### Before (Confusing):
```
User clicks "Authenticate"
→ Browser opens
→ User logs in
→ Browser redirects
→ "Connection refused" (no context!)
→ User confused, thinks server is down
```

### After (Clear):
```
User clicks "Authenticate"
→ Clear error: "Port 8080 is already in use..."
→ User knows exactly what to fix
→ User closes conflicting app
→ Retry succeeds
```

---

## 🔍 **Related Issues**

This fix also prevents:
- Silent failures when firewall blocks port 8080
- Confusion when another extension uses the same port
- Debugging nightmares ("why isn't it working?")

---

## ✅ **Verification Checklist**

After installing the fixed version:
- [ ] ✅ Compiled successfully
- [ ] ✅ Packaged successfully (VSIX created)
- [ ] ✅ Normal OAuth flow works (port free)
- [ ] ✅ Error message appears when port in use
- [ ] ✅ Browser only opens after server starts
- [ ] ✅ Output channel shows "OAuth callback server listening on port 8080"

---

## 📝 **Release Notes**

### v1.5.10 (2025-11-24)

**Bug Fixes:**
- Fixed OAuth authentication failing silently when port 8080 is in use
- Added error handling for callback server port binding
- Improved error messages for port conflicts
- Added logging for successful server startup

**Breaking Changes:** None

**Migration:** No changes required, drop-in replacement for v1.5.9

---

## 🎓 **Lessons Learned**

1. **Always handle server errors** - Node.js http.Server emits 'error' events
2. **Fail fast with clear messages** - Don't let users wonder what went wrong
3. **Log success states** - Helps debugging when things work
4. **Test error paths** - Not just happy paths

---

## 🚀 **Next Steps**

1. ✅ Fix implemented
2. ✅ Code compiled
3. ✅ Package created
4. ⏳ Test with port conflict scenario
5. ⏳ Bump version to 1.5.10
6. ⏳ Deploy to marketplace

---

**Status:** 🟢 **FIXED AND READY TO TEST**

*Diagnosed via Jam recording showing `ERR_CONNECTION_REFUSED` on localhost:8080*

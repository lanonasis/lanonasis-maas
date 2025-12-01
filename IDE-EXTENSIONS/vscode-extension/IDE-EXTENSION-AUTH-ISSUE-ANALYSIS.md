# IDE Extension Authentication Issue Analysis

**Date:** 2025-11-24

---

## 🔍 **Problem Summary**

### **Scenario 1: API Key Authentication**
- ✅ **Memory services work** - Uses `X-API-Key` header
- ❌ **Projects/API Key section fails** - Error: `401 Unauthorized - {"error":"No token provided","code":"AUTH_TOKEN_MISSING"}`

### **Scenario 2: OAuth Authentication (Web Login)**
- ❌ **All services fail** - Error: `Failed to load memories: Invalid authentication credentials`
- ✅ **Web interface shows successful login** - Redirects to IDE

---

## 🎯 **Root Cause**

### **Different Authentication Requirements:**

1. **Memory Services** (`/api/v1/memory`):
   - Accepts: `X-API-Key` header (hashed SHA-256)
   - Location: `mcp-core/src/index.ts:933-981`

2. **Projects API** (`/api/v1/projects`):
   - Requires: `Authorization: Bearer <JWT_TOKEN>`
   - Location: `auth-gateway/src/middleware/auth.ts:16-36`
   - Uses `requireAuth` middleware which **ONLY accepts JWT tokens**

3. **IDE Extension ApiKeyService**:
   - **VSCode Extension**: Line 76-78
     - OAuth: `Authorization: Bearer ${token}` ✅
     - API Key: `X-API-Key: ${token}` ❌ (Projects API doesn't accept this)
   - **Cursor/Windsurf**: Line 90-100
     - Uses `getAuthenticationHeader()` which returns `Bearer <token>`
     - Falls back to `Bearer ${apiKey}` (wrong format for API keys)

---

## 🔧 **Solution Options**

### **Option 1: Make Projects API Accept API Keys (Recommended)**

Update `requireAuth` middleware to also accept API keys:

```typescript
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  // Try JWT token first
  const token = extractBearerToken(req.headers.authorization)
  
  if (token) {
    try {
      const payload = verifyToken(token)
      req.user = payload
      return next()
    } catch (error) {
      // JWT invalid, try API key
    }
  }
  
  // Try API key authentication
  const apiKey = req.headers['x-api-key'] as string
  if (apiKey) {
    try {
      const validation = await apiKeyService.validateAPIKey(apiKey)
      if (validation.valid && validation.userId) {
        // Create user payload from API key validation
        req.user = {
          sub: validation.userId,
          project_scope: validation.projectScope,
          // ... other fields
        }
        return next()
      }
    } catch (error) {
      // API key invalid
    }
  }
  
  // No valid authentication found
  return res.status(401).json({
    error: 'No token provided',
    code: 'AUTH_TOKEN_MISSING',
  })
}
```

**Pros:**
- ✅ Both authentication methods work for all services
- ✅ Consistent with memory services
- ✅ No IDE extension changes needed

**Cons:**
- ⚠️ Requires backend changes

---

### **Option 2: Fix IDE Extension to Use OAuth for Projects**

Update `ApiKeyService` to always use OAuth tokens for projects API:

```typescript
private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const credentials = await this.resolveCredentials();
  
  // Projects API requires JWT token
  const isProjectsEndpoint = endpoint.includes('/projects') || endpoint.includes('/api-keys');
  
  let authHeaders: Record<string, string>;
  
  if (isProjectsEndpoint) {
    // Projects API requires OAuth token
    if (credentials.type !== 'oauth') {
      throw new Error('Projects API requires OAuth authentication. Please authenticate with OAuth.');
    }
    authHeaders = { 'Authorization': `Bearer ${credentials.token}` };
  } else {
    // Memory services accept API keys
    authHeaders = credentials.type === 'oauth'
      ? { 'Authorization': `Bearer ${credentials.token}` }
      : { 'X-API-Key': credentials.token };
  }
  
  // ... rest of request
}
```

**Pros:**
- ✅ No backend changes
- ✅ Clear separation of auth methods

**Cons:**
- ⚠️ Requires users to use OAuth for projects
- ⚠️ API key users can't access projects

---

### **Option 3: Convert API Keys to JWT Tokens**

When user authenticates with API key, exchange it for a JWT token:

```typescript
// In IDE extension after API key authentication
const jwtToken = await exchangeApiKeyForJWT(apiKey);
await storeOAuthToken(jwtToken);
```

**Pros:**
- ✅ Projects API works with API keys
- ✅ No backend changes to requireAuth

**Cons:**
- ⚠️ Requires new endpoint to exchange API key for JWT
- ⚠️ More complex flow

---

## ✅ **Recommended Solution: Option 1**

Make `requireAuth` middleware accept both JWT tokens and API keys, similar to how memory services work.

---

## 📋 **Implementation Steps**

1. **Update `requireAuth` middleware** to accept API keys
2. **Test with API key authentication** - Projects API should work
3. **Test with OAuth authentication** - Both services should work
4. **Update IDE extension** if needed for better error handling

---

## 🧪 **Testing**

### **Test 1: API Key Authentication**
```bash
# Should work for both memory and projects
curl -H "X-API-Key: <hashed_key>" https://mcp.lanonasis.com/api/v1/memory
curl -H "X-API-Key: <hashed_key>" https://auth.lanonasis.com/api/v1/projects
```

### **Test 2: OAuth Authentication**
```bash
# Should work for both
curl -H "Authorization: Bearer <jwt_token>" https://mcp.lanonasis.com/api/v1/memory
curl -H "Authorization: Bearer <jwt_token>" https://auth.lanonasis.com/api/v1/projects
```

---

## 📝 **Files to Modify**

1. `/opt/lanonasis/onasis-core/services/auth-gateway/src/middleware/auth.ts` - Update `requireAuth` to accept API keys
2. `/opt/lanonasis/lanonasis-maas/IDE-EXTENSIONS/vscode-extension/src/services/ApiKeyService.ts` - May need error handling improvements

---

## ✅ **Status**

- [ ] `requireAuth` middleware updated to accept API keys
- [ ] Backend tested with both auth methods
- [ ] IDE extension tested
- [ ] Documentation updated


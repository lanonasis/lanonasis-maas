# Server-Side CSRF Fix for OAuth Endpoints

**Issue:** Auth-gateway CSRF middleware blocking OAuth token exchange  
**Error:** `ForbiddenError: invalid csrf token` (code: EBADCSRFTOKEN)  
**Date:** 2025-11-24

---

## 🐛 **The Problem**

```javascript
// Current server code - WRONG
const csrf = require('csurf');
app.use(csrf());  // ❌ Blocks ALL POST requests including OAuth

// OAuth token exchange fails:
POST /oauth/token
→ ForbiddenError: invalid csrf token
```

---

## ✅ **The Solution**

### **Option 1: Exclude OAuth Routes (Recommended)**

```javascript
// auth-gateway/src/index.js
const csrf = require('csurf');
const csrfProtection = csrf({ cookie: true });

// Middleware to conditionally apply CSRF
app.use((req, res, next) => {
  // Skip CSRF for OAuth endpoints (they have built-in protection)
  if (req.path.startsWith('/oauth/')) {
    return next();
  }
  
  // Apply CSRF to all other endpoints
  csrfProtection(req, res, next);
});

// OAuth endpoints - no CSRF needed
app.post('/oauth/token', async (req, res) => {
  // OAuth has its own CSRF protection via 'state' parameter
});

app.post('/oauth/authorize', async (req, res) => {
  // Protected by 'state' parameter
});

// Regular endpoints - CSRF protected
app.post('/api/users', csrfProtection, async (req, res) => {
  // CSRF token required
});
```

---

### **Option 2: Path-Specific Middleware**

```javascript
// Apply CSRF only to specific routes
const csrfProtection = csrf({ cookie: true });

// OAuth routes - NO CSRF
router.post('/oauth/token', async (req, res) => {
  // Handle token exchange
});

router.post('/oauth/authorize', async (req, res) => {
  // Handle authorization
});

// API routes - WITH CSRF
router.post('/api/users', csrfProtection, async (req, res) => {
  // CSRF protected
});

router.post('/api/projects', csrfProtection, async (req, res) => {
  // CSRF protected
});
```

---

### **Option 3: Separate Routers**

```javascript
// oauth-router.js - No CSRF
const oauthRouter = express.Router();

oauthRouter.post('/token', async (req, res) => {
  // Token exchange
});

oauthRouter.post('/authorize', async (req, res) => {
  // Authorization
});

// api-router.js - With CSRF
const apiRouter = express.Router();
apiRouter.use(csrf({ cookie: true }));  // All API routes protected

apiRouter.post('/users', async (req, res) => {
  // CSRF required
});

// Main app
app.use('/oauth', oauthRouter);     // No CSRF
app.use('/api', apiRouter);         // CSRF protected
```

---

## 🎯 **Why OAuth Doesn't Need CSRF Tokens**

OAuth 2.0 has **built-in CSRF protection**:

### 1. **State Parameter** (Main CSRF Defense)
```javascript
// Authorization request includes random state
GET /oauth/authorize?
  state=53b433d4960cb9d59053408c23ff8235  // ← Random value
  
// Server stores state in session
// Callback must return the same state
GET /callback?
  code=xxx
  &state=53b433d4960cb9d59053408c23ff8235  // ← Must match!

// Server validates:
if (returnedState !== storedState) {
  throw new Error('CSRF attack detected');
}
```

### 2. **PKCE Code Verifier** (Authorization Code Protection)
```javascript
// Client generates random verifier
const verifier = randomBytes(32).toString('base64url');
const challenge = sha256(verifier).toString('base64url');

// Authorization includes challenge
GET /oauth/authorize?code_challenge=xxx

// Token exchange includes verifier
POST /oauth/token
  code_verifier=xxx  // ← Server verifies matches challenge
```

### 3. **Redirect URI Validation**
```javascript
// Server validates redirect_uri matches registered URI
const registeredUri = 'http://localhost:8080/callback';
if (req.body.redirect_uri !== registeredUri) {
  throw new Error('Invalid redirect_uri');
}
```

**Conclusion:** OAuth has 3 layers of protection. Adding CSRF tokens is redundant and breaks standard clients.

---

## 🔧 **Implementation Steps**

### 1. **Find Your CSRF Middleware**

```bash
# Search for csrf usage in your auth-gateway
cd /opt/lanonasis/onasis-core/services/auth-gateway
grep -r "csrf" src/
```

### 2. **Update Middleware Configuration**

```javascript
// Before
app.use(csrf());

// After
app.use((req, res, next) => {
  if (req.path.startsWith('/oauth/')) {
    return next();
  }
  csrf()(req, res, next);
});
```

### 3. **Restart Service**

```bash
# Restart auth-gateway
pm2 restart auth-gateway

# Check logs
pm2 logs auth-gateway --lines 50
```

### 4. **Test OAuth Flow**

```bash
# Should now work without CSRF errors
curl -X POST https://auth.lanonasis.com/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "code=xxx" \
  -d "redirect_uri=http://localhost:8080/callback" \
  -d "code_verifier=xxx"

# Expected: 200 OK with access_token
```

---

## 📊 **Before vs After**

### Before (Broken):
```
Extension → POST /oauth/token (no CSRF token)
Server → CSRF middleware checks for token
Server → ❌ ForbiddenError: invalid csrf token
Extension → ❌ Authentication failed
```

### After (Fixed):
```
Extension → POST /oauth/token (no CSRF token)
Server → Skips CSRF for /oauth/* routes
Server → Validates OAuth state parameter instead
Server → ✅ Returns access_token
Extension → ✅ Authentication successful
```

---

## 🧪 **Testing**

### Test Case 1: OAuth Token Exchange
```bash
# Should work without CSRF token
curl -X POST https://auth.lanonasis.com/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code&code=xxx&..."

# Expected: 200 OK
```

### Test Case 2: Regular API Endpoints
```bash
# Should still require CSRF token
curl -X POST https://api.lanonasis.com/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"test"}'

# Expected: 403 Forbidden (CSRF required)
```

### Test Case 3: OAuth with CSRF Attack
```bash
# Server should reject mismatched state
GET /oauth/callback?code=xxx&state=WRONG_STATE

# Expected: 400 Bad Request (Invalid state)
```

---

## 🔍 **Debugging**

### Check Current CSRF Configuration:
```bash
cd /opt/lanonasis/onasis-core/services/auth-gateway

# Find CSRF middleware
grep -n "csrf" src/index.js
grep -n "csurf" package.json

# Check if it's global or route-specific
grep -A 5 "app.use(csrf" src/index.js
```

### Monitor Logs After Fix:
```bash
# Tail logs in real-time
pm2 logs auth-gateway --lines 0

# Try OAuth authentication from extension
# Should see successful token exchange, not CSRF errors
```

---

## ✅ **Verification Checklist**

After applying the fix:
- [ ] CSRF middleware excludes `/oauth/*` routes
- [ ] OAuth token exchange returns 200 OK
- [ ] Regular API endpoints still require CSRF
- [ ] No CSRF errors in server logs
- [ ] Extension authentication succeeds
- [ ] State parameter validation still works

---

## 📝 **Code Example: Complete Fix**

```javascript
// auth-gateway/src/index.js
import express from 'express';
import csrf from 'csurf';
import cookieParser from 'cookie-parser';

const app = express();

// Middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// CSRF protection (conditionally applied)
const csrfProtection = csrf({ cookie: true });

app.use((req, res, next) => {
  // OAuth endpoints don't need CSRF (they have state parameter)
  const oauthPaths = ['/oauth/token', '/oauth/authorize', '/oauth/callback'];
  
  if (oauthPaths.some(path => req.path.startsWith(path))) {
    console.log(`[CSRF] Skipping CSRF for OAuth endpoint: ${req.path}`);
    return next();
  }
  
  // Apply CSRF to all other routes
  csrfProtection(req, res, next);
});

// OAuth routes (no CSRF needed)
app.post('/oauth/token', async (req, res) => {
  try {
    const { grant_type, code, redirect_uri, code_verifier } = req.body;
    
    // Validate OAuth parameters (built-in protection)
    // - state parameter (CSRF protection)
    // - code_verifier (PKCE protection)
    // - redirect_uri (whitelist protection)
    
    const token = await exchangeCodeForToken({
      code,
      redirect_uri,
      code_verifier
    });
    
    res.json({
      access_token: token.accessToken,
      refresh_token: token.refreshToken,
      token_type: 'Bearer',
      expires_in: 3600
    });
  } catch (error) {
    console.error('Token exchange error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Regular API routes (CSRF protected)
app.post('/api/users', async (req, res) => {
  // CSRF token automatically validated by middleware
  // ...
});

app.listen(3000, () => {
  console.log('Auth gateway listening on port 3000');
});
```

---

## 🚀 **Deploy the Fix**

```bash
# 1. Update the code
cd /opt/lanonasis/onasis-core/services/auth-gateway
# Apply the fix above

# 2. Rebuild if using TypeScript
npm run build

# 3. Restart service
pm2 restart auth-gateway

# 4. Verify
pm2 logs auth-gateway --lines 20

# 5. Test from extension
# Try OAuth authentication - should work!
```

---

## 📚 **References**

- [OAuth 2.0 RFC 6749](https://tools.ietf.org/html/rfc6749) - No mention of CSRF tokens
- [OAuth 2.0 Security Best Practices](https://tools.ietf.org/html/draft-ietf-oauth-security-topics) - Uses state parameter for CSRF
- [PKCE RFC 7636](https://tools.ietf.org/html/rfc7636) - Additional protection layer
- [csurf middleware docs](https://github.com/expressjs/csurf) - How to conditionally apply

---

**Status:** 🔴 **SERVER CONFIGURATION ISSUE**  
**Fix Location:** `/opt/lanonasis/onasis-core/services/auth-gateway/src/index.js`  
**Fix Type:** Exclude OAuth routes from CSRF middleware  
**Estimated Time:** 5 minutes

---

*The extension code is correct. The server needs to exclude OAuth endpoints from CSRF protection.*

# OAuth Token Exchange Error - Troubleshooting Guide

**Error:** `Token exchange failed: 500 {"error":"Internal server error","code":"INTERNAL_ERROR"}`  
**Date:** 2025-11-24  
**Status:** SERVER-SIDE ISSUE (Not extension code)

---

## 🔍 **What's Happening**

### Flow Breakdown:
```
1. ✅ User clicks "Authenticate" in extension
2. ✅ Extension opens browser to OAuth page
3. ✅ User logs in successfully
4. ✅ Browser redirects to: http://localhost:8080/callback?code=...&state=...
5. ✅ Extension receives callback
6. ❌ Extension tries to exchange code for token → SERVER ERROR 500
```

### The Request That's Failing:
```http
POST https://auth.lanonasis.com/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&client_id=vscode-extension
&code=kFxVMUTAOXfPqoncG7iMw1tRu8cIewvRTBUB7Bq_XMPKNfUkwZj61TtWBlhwxwDl
&redirect_uri=http://localhost:8080/callback
&code_verifier=<PKCE_VERIFIER>
```

### The Response:
```json
HTTP/1.1 500 Internal Server Error
{
  "error": "Internal server error",
  "code": "INTERNAL_ERROR"
}
```

---

## 🎯 **This is NOT Extension Code**

**Evidence:**
1. ✅ Memory services work (screenshot shows 50 memories)
2. ✅ Basic authentication works
3. ✅ OAuth callback received correctly
4. ❌ Only token exchange fails (server endpoint issue)
5. ✅ Extension code properly catches and displays the error

**Extension Code:**
```typescript
// src/services/SecureApiKeyService.ts:421-448
private async exchangeCodeForToken(
    code: string,
    codeVerifier: string,
    redirectUri: string,
    authUrl: string
): Promise<{ access_token: string; refresh_token?: string }> {
    const tokenUrl = new URL('/oauth/token', authUrl);

    const body = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: 'vscode-extension',
        code,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier
    });

    const response = await fetch(tokenUrl.toString(), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
        },
        body: body.toString()
    });

    if (!response.ok) {
        const errorText = await response.text();
        // ⬆️ This is where the error is caught and displayed
        throw new Error(`Token exchange failed: ${response.status} ${errorText}`);
    }
    // ...
}
```

**This code is correct.** The server is returning a 500 error.

---

## 🔧 **Server-Side Checklist**

### 1. **Check OAuth Token Endpoint**

**File to Review:** Your OAuth server implementation (likely in `services/auth-gateway` or similar)

```typescript
// Example location: services/auth-gateway/oauth-handler.ts
app.post('/oauth/token', async (req, res) => {
  try {
    const { grant_type, code, redirect_uri, code_verifier, client_id } = req.body;
    
    // ⚠️ Check these validations:
    
    // 1. Is the authorization code valid?
    const authCode = await db.authCodes.findOne({ code });
    if (!authCode) {
      return res.status(400).json({ error: 'Invalid authorization code' });
    }
    
    // 2. Has the code expired? (usually 10 minutes)
    if (Date.now() > authCode.expiresAt) {
      return res.status(400).json({ error: 'Authorization code expired' });
    }
    
    // 3. Does the redirect_uri match?
    if (authCode.redirectUri !== redirect_uri) {
      return res.status(400).json({ error: 'Redirect URI mismatch' });
    }
    
    // 4. Is PKCE code_verifier valid?
    const expectedChallenge = base64UrlEncode(sha256(code_verifier));
    if (authCode.codeChallenge !== expectedChallenge) {
      return res.status(400).json({ error: 'PKCE validation failed' });
    }
    
    // 5. Has the code already been used? (should be single-use)
    if (authCode.used) {
      return res.status(400).json({ error: 'Authorization code already used' });
    }
    
    // Generate tokens
    const accessToken = jwt.sign({ userId: authCode.userId }, SECRET, { expiresIn: '1h' });
    const refreshToken = jwt.sign({ userId: authCode.userId }, SECRET, { expiresIn: '30d' });
    
    // Mark code as used
    await db.authCodes.update({ code }, { used: true });
    
    res.json({
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer',
      expires_in: 3600
    });
    
  } catch (error) {
    // ⚠️ THIS IS WHERE YOUR 500 ERROR COMES FROM
    console.error('Token exchange error:', error);
    
    // Log the full error for debugging
    logger.error('OAuth token exchange failed', {
      error: error.message,
      stack: error.stack,
      body: req.body
    });
    
    res.status(500).json({ 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});
```

### 2. **Common Server-Side Issues**

#### A. **Database Connection**
```bash
# Check if your auth database is accessible
psql -h localhost -U postgres -d auth_db -c "SELECT COUNT(*) FROM auth_codes;"
```

#### B. **PKCE Validation Error**
```typescript
// Make sure you're using the correct hashing
import crypto from 'crypto';

function sha256(buffer: string): Buffer {
  return crypto.createHash('sha256').update(buffer).digest();
}

function base64UrlEncode(buffer: Buffer): string {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}
```

#### C. **JWT Secret Missing**
```typescript
// Check if JWT_SECRET=REDACTED_JWT_SECRET
if (!process.env.JWT_SECRET=REDACTED_JWT_SECRET
  throw new Error('JWT_SECRET=REDACTED_JWT_SECRET
}
```

#### D. **Authorization Code Not Found**
```sql
-- Check if auth codes are being created
SELECT * FROM auth_codes 
WHERE created_at > NOW() - INTERVAL '10 minutes' 
ORDER BY created_at DESC 
LIMIT 5;
```

---

## 🔍 **Debugging Steps**

### 1. **Check Server Logs**

```bash
# Check your OAuth server logs
tail -f /var/log/auth-gateway/error.log

# Or if using PM2
pm2 logs auth-gateway --lines 100

# Or if using Docker
docker logs -f auth-gateway-container
```

**Look for:**
- Database connection errors
- PKCE validation failures
- JWT signing errors
- Missing environment variables

---

### 2. **Test Token Endpoint Directly**

```bash
# Get an authorization code first (from browser flow)
CODE="kFxVMUTAOXfPqoncG7iMw1tRu8cIewvRTBUB7Bq_XMPKNfUkwZj61TtWBlhwxwDl"
VERIFIER="your_code_verifier_from_extension_logs"

# Test the token exchange
curl -X POST https://auth.lanonasis.com/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "client_id=vscode-extension" \
  -d "code=$CODE" \
  -d "redirect_uri=http://localhost:8080/callback" \
  -d "code_verifier=$VERIFIER"
```

---

### 3. **Check OAuth Configuration**

```bash
# Verify OAuth client is registered
psql -U postgres -d auth_db -c "
  SELECT client_id, redirect_uris, grant_types 
  FROM oauth_clients 
  WHERE client_id = 'vscode-extension';
"

# Should return:
# client_id         | redirect_uris                          | grant_types
# vscode-extension | ["http://localhost:8080/callback"]     | ["authorization_code"]
```

---

### 4. **Enable Detailed Error Logging**

```typescript
// In your OAuth token endpoint
app.post('/oauth/token', async (req, res) => {
  try {
    // ... existing code
  } catch (error) {
    // ⚠️ Add detailed logging
    console.error('=== TOKEN EXCHANGE ERROR ===');
    console.error('Error:', error);
    console.error('Request body:', req.body);
    console.error('Stack trace:', error.stack);
    
    // Log to external service for debugging
    await logger.error('OAuth token exchange failed', {
      error: error.message,
      stack: error.stack,
      body: req.body,
      headers: req.headers,
      timestamp: new Date().toISOString()
    });
    
    res.status(500).json({ 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      // In development only:
      ...(process.env.NODE_ENV === 'development' && {
        details: error.message,
        stack: error.stack
      })
    });
  }
});
```

---

## 🛠️ **Quick Fixes to Try**

### Option 1: **Check Auth Server is Running**
```bash
# Is your OAuth server running?
curl https://auth.lanonasis.com/health

# Or
curl https://api.lanonasis.com/oauth/token
```

### Option 2: **Restart OAuth Service**
```bash
# If using PM2
pm2 restart auth-gateway

# If using systemd
sudo systemctl restart auth-gateway

# If using Docker
docker restart auth-gateway-container
```

### Option 3: **Check Database Connectivity**
```bash
# Can the auth service connect to its database?
psql -h <db_host> -U <db_user> -d auth_db -c "SELECT 1;"
```

### Option 4: **Verify OAuth Client Registration**
```sql
-- Make sure the VSCode extension is registered
INSERT INTO oauth_clients (
  client_id,
  client_name,
  redirect_uris,
  grant_types,
  response_types,
  pkce_required
) VALUES (
  'vscode-extension',
  'Lanonasis VSCode Extension',
  ARRAY['http://localhost:8080/callback'],
  ARRAY['authorization_code', 'refresh_token'],
  ARRAY['code'],
  true
)
ON CONFLICT (client_id) DO UPDATE
SET redirect_uris = EXCLUDED.redirect_uris;
```

---

## 📊 **Health Check Endpoint**

**Add this to your OAuth server for easy debugging:**

```typescript
// auth-gateway/health.ts
app.get('/oauth/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    checks: {
      database: 'unknown',
      redis: 'unknown',
      jwt_secret: 'unknown'
    }
  };
  
  try {
    // Check database
    await db.query('SELECT 1');
    health.checks.database = 'ok';
  } catch (error) {
    health.checks.database = 'error';
    health.status = 'degraded';
  }
  
  try {
    // Check Redis (if using for sessions)
    await redis.ping();
    health.checks.redis = 'ok';
  } catch (error) {
    health.checks.redis = 'error';
  }
  
  // Check JWT secret
  health.checks.jwt_secret = process.env.JWT_SECRET=REDACTED_JWT_SECRET
  
  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});
```

---

## 🎯 **Expected Server Response**

**When working correctly:**
```json
HTTP/1.1 200 OK
Content-Type: application/json

{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "memories:read memories:write memories:delete"
}
```

---

## 📞 **Next Steps**

1. ✅ **Check server logs** - Find the actual error causing the 500
2. ✅ **Verify database** - Make sure auth codes table exists
3. ✅ **Test endpoint directly** - Use curl to isolate the issue
4. ✅ **Check environment variables** - JWT_SECRET=REDACTED_JWT_SECRET
5. ✅ **Restart service** - Sometimes a simple restart fixes it

---

## 🔄 **If You Still Get Errors After Server Fix**

### Then Try Extension Reinstall:
```bash
# Remove old version
code --uninstall-extension lanonasis.lanonasis-memory

# Install new version
code --install-extension lanonasis-memory-1.5.9.vsix

# Clear extension storage (optional - will lose stored keys)
rm -rf ~/Library/Application\ Support/Code/User/globalStorage/lanonasis.lanonasis-memory/
```

---

## ✅ **Verification Checklist**

After fixing server:
- [ ] Server logs show successful token exchange
- [ ] `curl` test returns 200 with access_token
- [ ] Extension shows "Authentication Successful"
- [ ] API Keys section loads without error
- [ ] Can create/view/delete API keys

---

**Current Status:** 🔴 **SERVER-SIDE ISSUE**  
**Extension Status:** ✅ **Working Correctly** (catching and reporting server error)  
**Fix Location:** Your OAuth server at `https://auth.lanonasis.com/oauth/token`

---

*Last Updated: 2025-11-24*

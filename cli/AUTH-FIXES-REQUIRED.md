# CLI Authentication Fixes Required

**Date:** October 27, 2025  
**Status:** 🔴 CRITICAL - Authentication Not Working

---

## 🚨 Critical Issues Found

### Issue 1: Browser Authentication Accepts Invalid Tokens ❌

**Location:** `src/commands/auth.ts` lines 660-663

**Problem:**
```typescript
if (token && token.trim()) {
  await config.setToken(token.trim());  // NO VALIDATION!
  console.log(chalk.green('✓ Browser authentication successful'));
}
```

**What's Wrong:**
- Accepts ANY string you paste (even URLs)
- No format validation
- No server-side verification
- No token signature check

**Impact:** 
- Users can "authenticate" with garbage tokens
- `status` command shows "Authenticated: No" even after "successful" login
- No actual auth happening

---

### Issue 2: `isAuthenticated()` Only Checks Local Expiry ❌

**Location:** `src/utils/config.ts` lines 557-586

**Problem:**
```typescript
async isAuthenticated(): Promise<boolean> {
  const token = this.getToken();
  if (!token) return false;

  // Only local JWT decode - NO SERVER CHECK!
  try {
    const decoded = jwtDecode(token);
    const now = Date.now() / 1000;
    return typeof decoded.exp === 'number' && decoded.exp > now;
  } catch {
    return false;
  }
}
```

**What's Wrong:**
- Never contacts auth-gateway to verify token
- Only checks if JWT is expired
- Doesn't verify token signature
- Doesn't check if token was revoked

**Impact:**
- Invalid tokens appear as "authenticated" if they're valid JWTs
- No way to detect revoked tokens
- Security risk

---

### Issue 3: Wrong Auth Endpoint ❌

**Location:** `src/commands/auth.ts` line 633

**Problem:**
```typescript
const authUrl = 'https://mcp.lanonasis.com/auth/cli-login';
```

**What's Wrong:**
- Points to old MCP server endpoint
- Should use new auth-gateway: `/apps/onasis-core/services/auth-gateway`
- Auth-gateway is on Neon database (`super-night-54410645`)
- Page shows no interactive elements

**Impact:**
- Browser page is not functional
- No buttons to click
- Cannot actually get a valid token

---

### Issue 4: Vendor Key Format May Be Outdated ❌

**Location:** `src/commands/auth.ts` lines 552-590

**Current Format:** `pk_xxx.sk_xxx`

**Problem:**
- Auth-gateway may use different format
- No documentation on correct format for new system
- Validation logic hardcoded for old format

---

## ✅ Required Fixes

### Fix 1: Add Token Validation to Browser Auth

```typescript
async function handleOAuthFlow(config: CLIConfig): Promise<void> {
  const authUrl = 'https://mcp.lanonasis.com/auth/cli-login';
  
  try {
    await open(authUrl);
    
    const { token } = await inquirer.prompt<{ token: string }>([{
      type: 'input',
      name: 'token',
      message: 'Paste the authentication token from browser:',
      validate: async (input: string) => {
        if (!input || input.trim().length === 0) {
          return 'Token is required';
        }
        
        // VALIDATE TOKEN FORMAT
        const trimmed = input.trim();
        
        // Check if it's a JWT
        if (!trimmed.match(/^[\w-]+\.[\w-]+\.[\w-]+$/)) {
          return 'Invalid token format. Expected a JWT token.';
        }
        
        // VERIFY WITH AUTH-GATEWAY
        try {
          const response = await axios.post(
            'https://api.lanonasis.com/auth/verify',
            { token: trimmed }
          );
          if (response.data.valid !== true) {
            return 'Token is invalid or expired';
          }
        } catch {
          return 'Failed to verify token with server';
        }
        
        return true;
      }
    }]);
    
    await config.setToken(token.trim());
    console.log(chalk.green('✓ Browser authentication successful'));
  } catch (error) {
    console.error(chalk.red('✖ Authentication failed'));
  }
}
```

### Fix 2: Update `isAuthenticated()` to Verify with Server

```typescript
async isAuthenticated(): Promise<boolean> {
  const token = this.getToken();
  if (!token) return false;

  // Check local expiry first (fast check)
  try {
    const decoded = jwtDecode(token) as Record<string, unknown>;
    const now = Date.now() / 1000;
    if (typeof decoded.exp === 'number' && decoded.exp <= now) {
      return false;  // Expired
    }
  } catch {
    return false;  // Invalid JWT
  }

  // VERIFY WITH SERVER (required for security)
  try {
    const response = await axios.post(
      'https://api.lanonasis.com/auth/verify',
      { token },
      { timeout: 5000 }
    );
    return response.data.valid === true;
  } catch {
    // If server check fails, fall back to local expiry
    // This allows offline usage but is less secure
    return true;
  }
}
```

### Fix 3: Update Auth Endpoint

**Option A: Use Auth-Gateway Directly**
```typescript
const authUrl = 'http://localhost:4000/auth/cli-login';  // Local dev
// OR
const authUrl = 'https://auth.lanonasis.com/cli-login';  // Production
```

**Option B: Create Proper Auth Page**

Create an interactive auth page at the auth-gateway with:
- "Sign In" button
- "Copy Token" button
- Visual token display
- Instructions

### Fix 4: Verify Vendor Key Format with Auth-Gateway

**Action Required:**
1. Check auth-gateway documentation for correct vendor key format
2. Update validation regex in `validateVendorKeyFormat()`
3. Test against actual auth-gateway endpoints

---

## 🔧 Implementation Steps

### Step 1: Create Auth Verification Endpoint
1. Add `/auth/verify` endpoint to auth-gateway
2. Accepts: `{ token: string }`
3. Returns: `{ valid: boolean, user?: { email, role } }`

### Step 2: Update Browser Auth Flow
1. Add token format validation
2. Add server-side verification
3. Show better error messages

### Step 3: Update `isAuthenticated()`
1. Add server verification call
2. Cache result for 5 minutes to reduce API calls
3. Fall back to local check if offline

### Step 4: Fix Auth Page
1. Create interactive HTML page at auth-gateway
2. Add proper UI elements (buttons, copy functionality)
3. Test in browser

### Step 5: Document New Flow
1. Update README with correct auth flow
2. Document vendor key format
3. Add troubleshooting guide

---

## 🧪 Testing Checklist

- [ ] Browser auth rejects invalid tokens
- [ ] Browser auth verifies with server
- [ ] `status` command shows correct auth state
- [ ] Vendor key auth works with new format
- [ ] Token persists across CLI sessions
- [ ] Offline mode still works (with cached validation)
- [ ] `logout` command clears token properly
- [ ] Browser page shows interactive UI

---

## 📝 Additional Notes

### Auth-Gateway Connection Info
- **Database:** Neon (`super-night-54410645`)
- **Project:** `br-orange-cloud-adtz6zem`
- **Org:** `the-fixer-initiative`
- **User:** info@lanonasis.com

### Current Auth Flow (Broken)
1. User runs `onasis auth login`
2. Chooses browser auth
3. Browser opens to `mcp.lanonasis.com/auth/cli-login`
4. Page shows nothing interactive ❌
5. User pastes URL back into CLI ❌
6. CLI saves it without validation ❌
7. `status` shows "Authenticated: No" ❌

### Expected Auth Flow (Fixed)
1. User runs `onasis auth login`
2. Chooses browser auth
3. Browser opens to auth-gateway page
4. User clicks "Sign In" button ✅
5. Enters credentials ✅
6. Page displays token with "Copy" button ✅
7. User copies actual JWT token ✅
8. Pastes into CLI ✅
9. CLI validates format ✅
10. CLI verifies with auth-gateway ✅
11. CLI saves valid token ✅
12. `status` shows "Authenticated: Yes" ✅

---

## 🚀 Priority Order

1. **HIGH:** Add server-side token verification
2. **HIGH:** Fix browser auth validation
3. **HIGH:** Create interactive auth page
4. **MEDIUM:** Update `isAuthenticated()` with caching
5. **MEDIUM:** Verify vendor key format
6. **LOW:** Add offline mode support

---

**Next Steps:** Implement Fix 1 (token validation) first, then test auth flow end-to-end.

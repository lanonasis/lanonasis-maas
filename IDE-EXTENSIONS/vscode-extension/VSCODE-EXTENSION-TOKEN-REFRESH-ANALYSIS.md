# VSCode Extension Token Refresh Analysis

**Date:** 2025-12-01  
**Extension:** lanonasis-maas/IDE-EXTENSIONS/vscode-extension  
**Issue:** Missing automatic token refresh implementation

---

## Executive Summary

❌ **AUTOMATIC TOKEN REFRESH IS NOT IMPLEMENTED**

The VSCode extension:
- ✅ Stores refresh tokens securely
- ✅ Validates token expiration (1-minute buffer)
- ✅ Returns expired tokens as invalid
- ❌ **DOES NOT automatically refresh expired tokens**
- ❌ Does not use stored refresh tokens after initial auth

---

## Current Implementation Analysis

### File: `src/services/SecureApiKeyService.ts`

#### 1. Token Storage ✅

**Lines 20-23:** Keys defined for secure storage
```typescript
private static readonly API_KEY_KEY = 'lanonasis.apiKey';
private static readonly AUTH_TOKEN_KEY = 'lanonasis.authToken';
private static readonly REFRESH_TOKEN_KEY = 'lanonasis.refreshToken'; // ✅ Stored
private static readonly CREDENTIAL_TYPE_KEY = 'lanonasis.credentialType';
```

**Line 277-279:** Refresh token IS stored during OAuth flow
```typescript
if (token.refresh_token) {
    await this.context.secrets.store(
        SecureApiKeyService.REFRESH_TOKEN_KEY, 
        token.refresh_token
    );
}
```

#### 2. Token Validation ✅

**Lines 500-503:** Token expiration check with 1-minute buffer
```typescript
private isTokenValid(token: { expires_at?: number }): boolean {
    if (!token.expires_at) return true;
    return Date.now() < token.expires_at - 60000; // 1 minute buffer
}
```

#### 3. Token Retrieval - Missing Refresh ❌

**Lines 359-371:** `getStoredCredentials()` method

```typescript
async getStoredCredentials(): Promise<StoredCredential | null> {
    // Prefer OAuth tokens when available
    const authToken = await this.context.secrets.get(
        SecureApiKeyService.AUTH_TOKEN_KEY
    );
    
    if (authToken) {
        try {
            const token = JSON.parse(authToken);
            
            // 🚨 PROBLEM: If token is invalid, returns null instead of refreshing
            if (token?.access_token && this.isTokenValid(token)) {
                return { type: 'oauth', token: token.access_token };
            }
            // ❌ No else clause to refresh the token!
            
        } catch (error) {
            this.logError('Failed to parse stored OAuth token', error);
        }
    }
    
    // Falls back to API key
    const apiKey = await this.getApiKey();
    // ...
}
```

**🚨 Critical Issue:** When token expires:
1. `isTokenValid()` returns `false`
2. Method returns `null` instead of refreshing
3. User must re-authenticate manually

#### 4. OAuth Flow - Initial Auth Only ✅

**Lines 206-343:** `authenticateOAuth()` method
- Implements full PKCE OAuth flow
- Exchanges authorization code for tokens
- Stores both access and refresh tokens
- **Only runs during initial authentication**

#### 5. No Refresh Token Exchange ❌

**Missing:** Method to exchange refresh token for new access token

Expected implementation (NOT PRESENT):
```typescript
// ❌ THIS METHOD DOES NOT EXIST
async refreshAccessToken(): Promise<boolean> {
    const refreshToken = await this.context.secrets.get(
        SecureApiKeyService.REFRESH_TOKEN_KEY
    );
    
    if (!refreshToken) {
        return false;
    }
    
    // Call POST /oauth/token with grant_type=refresh_token
    // Store new access_token
    // Store new refresh_token (if rotated)
}
```

---

## OAuth Flow Architecture

### Current Flow

```
┌─────────────────────────────────────────────────────────────┐
│ INITIAL AUTHENTICATION (Works) ✅                           │
└─────────────────────────────────────────────────────────────┘

User triggers auth
    ↓
authenticateOAuth()
    ↓
Browser: /oauth/authorize
    ↓
User approves
    ↓
Callback with auth code
    ↓
exchangeCodeForToken(code)
    ↓
POST /oauth/token (grant_type=authorization_code)
    ↓
Receive: { access_token, refresh_token, expires_in }
    ↓
Store both tokens
    ↓
Done ✅

┌─────────────────────────────────────────────────────────────┐
│ SUBSEQUENT API CALLS (Broken after 15min) ❌                │
└─────────────────────────────────────────────────────────────┘

API call needs auth
    ↓
getStoredCredentials()
    ↓
Check if token valid
    ↓
Token expired? → Return null ❌
    ↓
API call fails
    ↓
User sees: "Failed to load memories: Token introspection failed"
```

### Required Flow

```
┌─────────────────────────────────────────────────────────────┐
│ FIXED: AUTO-REFRESH (Needed) ✅                             │
└─────────────────────────────────────────────────────────────┘

API call needs auth
    ↓
getStoredCredentials()
    ↓
Check if token valid
    ↓
Token expired? → refreshAccessToken() ✅
    ↓
POST /oauth/token (grant_type=refresh_token)
    ↓
Receive: { access_token, refresh_token, expires_in }
    ↓
Store new tokens
    ↓
Return new access_token ✅
    ↓
API call succeeds ✅
```

---

## Required Implementation

### 1. Add `refreshAccessToken()` Method

**Location:** `src/services/SecureApiKeyService.ts`

```typescript
/**
 * Refresh OAuth access token using stored refresh token
 */
async refreshAccessToken(): Promise<boolean> {
    try {
        // Get stored refresh token
        const refreshToken = await this.context.secrets.get(
            SecureApiKeyService.REFRESH_TOKEN_KEY
        );
        
        if (!refreshToken) {
            this.log('No refresh token available');
            return false;
        }
        
        // Get auth URL from config
        const config = vscode.workspace.getConfiguration('lanonasis');
        const authUrl = config.get<string>('authUrl') || 'https://auth.lanonasis.com';
        const tokenUrl = new URL('/oauth/token', authUrl);
        
        // Prepare refresh token request
        const body = new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
            client_id: 'vscode-extension'
        });
        
        this.log('Refreshing access token...');
        
        // Exchange refresh token for new access token
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
            this.logError('Token refresh failed', new Error(`${response.status}: ${errorText}`));
            
            // If refresh token is invalid, clear stored credentials
            if (response.status === 401 || response.status === 400) {
                this.log('Refresh token invalid, clearing stored credentials');
                await this.clearApiKey();
            }
            
            return false;
        }
        
        const tokenData = await response.json() as {
            access_token: string;
            refresh_token?: string;
            expires_in?: number;
        };
        
        // Store new access token with expiration
        const token = {
            access_token: tokenData.access_token,
            expires_at: Date.now() + (tokenData.expires_in ? tokenData.expires_in * 1000 : 3600000)
        };
        await this.context.secrets.store(
            SecureApiKeyService.AUTH_TOKEN_KEY, 
            JSON.stringify(token)
        );
        
        // Update refresh token if rotated (some OAuth servers rotate refresh tokens)
        if (tokenData.refresh_token) {
            await this.context.secrets.store(
                SecureApiKeyService.REFRESH_TOKEN_KEY, 
                tokenData.refresh_token
            );
        }
        
        this.log('✅ Access token refreshed successfully');
        return true;
        
    } catch (error) {
        this.logError('Token refresh error', error);
        return false;
    }
}
```

### 2. Update `getStoredCredentials()` Method

**Location:** `src/services/SecureApiKeyService.ts` (lines 359-380)

**Replace:**
```typescript
async getStoredCredentials(): Promise<StoredCredential | null> {
    // Prefer OAuth tokens when available
    const authToken = await this.context.secrets.get(SecureApiKeyService.AUTH_TOKEN_KEY);
    if (authToken) {
        try {
            const token = JSON.parse(authToken);
            if (token?.access_token && this.isTokenValid(token)) {
                return { type: 'oauth', token: token.access_token };
            }
        } catch (error) {
            this.logError('Failed to parse stored OAuth token', error);
        }
    }
    
    const apiKey = await this.getApiKey();
    if (apiKey) {
        const storedType = await this.context.secrets.get(SecureApiKeyService.CREDENTIAL_TYPE_KEY) as CredentialType | null;
        const inferredType: CredentialType = storedType === 'oauth' || storedType === 'apiKey'
            ? storedType
            : (this.looksLikeJwt(apiKey) ? 'oauth' : 'apiKey');
        return { type: inferredType, token: apiKey };
    }
    
    return null;
}
```

**With:**
```typescript
async getStoredCredentials(): Promise<StoredCredential | null> {
    // Prefer OAuth tokens when available
    const authToken = await this.context.secrets.get(SecureApiKeyService.AUTH_TOKEN_KEY);
    if (authToken) {
        try {
            const token = JSON.parse(authToken);
            
            // ✅ FIX: Check if token is valid
            if (token?.access_token) {
                if (this.isTokenValid(token)) {
                    // Token is still valid
                    return { type: 'oauth', token: token.access_token };
                } else {
                    // ✅ FIX: Token expired - attempt refresh
                    this.log('Access token expired, attempting refresh...');
                    const refreshed = await this.refreshAccessToken();
                    
                    if (refreshed) {
                        // Get newly refreshed token
                        const newAuthToken = await this.context.secrets.get(
                            SecureApiKeyService.AUTH_TOKEN_KEY
                        );
                        if (newAuthToken) {
                            const newToken = JSON.parse(newAuthToken);
                            return { type: 'oauth', token: newToken.access_token };
                        }
                    } else {
                        // Refresh failed - user needs to re-authenticate
                        this.log('Token refresh failed, user needs to re-authenticate');
                        return null;
                    }
                }
            }
        } catch (error) {
            this.logError('Failed to parse stored OAuth token', error);
        }
    }
    
    // Fallback to API key
    const apiKey = await this.getApiKey();
    if (apiKey) {
        const storedType = await this.context.secrets.get(
            SecureApiKeyService.CREDENTIAL_TYPE_KEY
        ) as CredentialType | null;
        const inferredType: CredentialType = storedType === 'oauth' || storedType === 'apiKey'
            ? storedType
            : (this.looksLikeJwt(apiKey) ? 'oauth' : 'apiKey');
        return { type: inferredType, token: apiKey };
    }
    
    return null;
}
```

### 3. Add User Notification (Optional)

```typescript
/**
 * Notify user about token refresh status
 */
private async notifyTokenRefresh(success: boolean): Promise<void> {
    if (success) {
        // Silent success - no notification needed
        this.log('Token refreshed automatically');
    } else {
        // Notify user they need to re-authenticate
        const action = await vscode.window.showWarningMessage(
            'Your session has expired. Please re-authenticate.',
            'Re-authenticate'
        );
        
        if (action === 'Re-authenticate') {
            await this.authenticateOAuth();
        }
    }
}
```

---

## Testing Checklist

### Before Implementation
- [ ] Verify refresh tokens are stored: `REFRESH_TOKEN_KEY` in secrets
- [ ] Confirm access tokens expire after 15 minutes
- [ ] Test current behavior: memory load fails after 15 minutes

### After Implementation
- [ ] Test initial OAuth authentication still works
- [ ] Verify tokens auto-refresh before expiration
- [ ] Test API calls continue working after 15+ minutes
- [ ] Verify refresh token rotation (if server implements it)
- [ ] Test error handling when refresh token expires (30 days)
- [ ] Verify fallback to re-authentication when refresh fails

---

## File Structure

```
vscode-extension/
├── src/
│   ├── services/
│   │   ├── SecureApiKeyService.ts     ← NEEDS FIX ❌
│   │   ├── MemoryService.ts           ← Uses getAuthenticationHeader()
│   │   └── EnhancedMemoryService.ts   ← Uses getApiKey()
│   └── extension.ts
```

---

## Related Components

### Auth Endpoints Used

1. **Authorization:** `GET /oauth/authorize` (PKCE flow)
2. **Token Exchange:** `POST /oauth/token` (grant_type=authorization_code)
3. **Token Refresh:** `POST /oauth/token` (grant_type=refresh_token) ← **NOT IMPLEMENTED**

### Configuration

**File:** `.vscode/settings.json` or User Settings
```json
{
  "lanonasis.authUrl": "https://auth.lanonasis.com"
}
```

For local dev:
```json
{
  "lanonasis.authUrl": "http://localhost:4000"
}
```

---

## Summary

| Feature | Status | Priority |
|---------|--------|----------|
| OAuth PKCE Flow | ✅ Implemented | - |
| Refresh Token Storage | ✅ Implemented | - |
| Token Expiration Check | ✅ Implemented | - |
| Automatic Token Refresh | ❌ **MISSING** | 🔴 HIGH |
| Refresh Token Exchange | ❌ **MISSING** | 🔴 HIGH |
| Error Handling | ⚠️ Partial | 🟡 MEDIUM |
| User Notification | ❌ Missing | 🟢 LOW |

---

## Quick Fix vs Proper Fix

### ❌ Quick Fix (NOT RECOMMENDED)
Add `ACCESS_TOKEN_TTL_SECONDS=3600` to auth-gateway `.env`
- Extends token life to 1 hour
- Reduces security
- Doesn't solve underlying problem

### ✅ Proper Fix (RECOMMENDED)
Implement automatic token refresh in VSCode extension
- Proper OAuth 2.0 flow
- Better security (short-lived tokens)
- Better user experience (seamless)
- Fixes root cause

---

## Implementation Estimate

**Complexity:** Medium  
**Time:** 2-3 hours  
**Files to modify:** 1 (`SecureApiKeyService.ts`)  
**Testing time:** 1-2 hours  
**Total:** 3-5 hours

---

## Related Issues

- All IDE extensions (Cursor, Windsurf) likely have same issue
- CLI tools may have same issue
- Web dashboard may have same issue

Check each client for automatic token refresh implementation.

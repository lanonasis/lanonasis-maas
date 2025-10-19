# OAuth Endpoint Fix - v3.0.13

## Issue
Browser-based authentication was trying to use a non-existent endpoint:
```
❌ https://api.lanonasis.com/api/v1/oauth/authorize
```

This returned a 404 error with available endpoints.

## Root Cause
The OAuth flow was using a hardcoded `/oauth/authorize` endpoint that doesn't exist in the API.

## Solution
Updated to use the correct browser-based CLI login endpoint:
```
✅ https://mcp.lanonasis.com/auth/cli-login
```

This endpoint:
- Exists and returns an HTML page
- Displays the authentication token to the user
- Is documented in the service discovery JSON

## Changes Made

### 1. Updated OAuth Flow
**File**: `cli/src/commands/auth.ts`

**Before**:
```typescript
const baseUrl = config.getDiscoveredApiUrl().replace(/\/+$/, '');
const authUrl = `${baseUrl}/oauth/authorize`;
```

**After**:
```typescript
// Use the browser-based CLI login endpoint from MCP service
const authUrl = 'https://mcp.lanonasis.com/auth/cli-login';
```

### 2. Improved User Experience
- Changed label from "Web OAuth" to "Browser Login"
- Added clearer instructions about token display
- Added token validation
- Better error messaging

### 3. Updated Messaging
```typescript
console.log(chalk.yellow('🌐 Browser-Based Authentication'));
console.log(colors.info('The page will display your authentication token'));
```

## Testing

### Test the Fix
```bash
# Install latest version
npm install -g @lanonasis/cli@latest

# Try browser authentication
onasis auth login

# Select: 🌐 Browser Login (Get token from web page)
# Browser opens to: https://mcp.lanonasis.com/auth/cli-login
# Copy token from page and paste into CLI
```

### Verify Endpoint
```bash
# Check the endpoint exists
curl https://mcp.lanonasis.com/auth/cli-login

# Should return HTML page with authentication form
```

## Service Discovery

The correct endpoint is documented in service discovery:
```bash
curl https://mcp.lanonasis.com/.well-known/onasis.json | jq '.auth'
```

Returns:
```json
{
  "login": "https://mcp.lanonasis.com/auth/login",
  "browser": "https://mcp.lanonasis.com/auth/cli-login"
}
```

## Available Auth Methods

After this fix, all three auth methods work:

1. **Vendor Key** (Recommended for API access)
   ```bash
   onasis auth login --vendor-key pk_xxx.sk_xxx
   ```

2. **Browser Login** (Fixed in v3.0.13)
   ```bash
   onasis auth login
   # Select: Browser Login
   ```

3. **Username/Password** (Direct credentials)
   ```bash
   onasis auth login --email user@example.com --password pass
   ```

## Version History

- **v3.0.12**: Initial mcp.lanonasis.com migration
- **v3.0.13**: Fixed OAuth endpoint to use /auth/cli-login ✅

## Related Files

- `cli/src/commands/auth.ts` - Auth command implementation
- `TRANSPORT_CONFIGURATION.md` - Full endpoint documentation
- `DEPLOYMENT_COMPLETE_v3.0.12.md` - Deployment summary

---

**Status**: ✅ Fixed and Published  
**Version**: 3.0.13  
**Date**: 2025-10-19

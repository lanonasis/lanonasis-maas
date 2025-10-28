# Issues Log

## 2024-10-27 20:50 UTC - MCP Service Discovery Authentication Issue

### Issue

CLI authentication fails with "Network connection failed" when attempting to login.

### Root Cause

The service discovery endpoint at `https://mcp.lanonasis.com/.well-known/onasis.json` returns incorrect authentication base URL:

```json
{
  "auth": {
    "base": "http://localhost:4000",
    "login": "http://localhost:4000/auth/login",
    "browser": "https://mcp.lanonasis.com/auth/cli-login"
  }
}
```

The `auth.base` and `auth.login` URLs point to `localhost:4000` instead of the production endpoint.

### Expected Behavior

The service discovery should return:

```json
{
  "auth": {
    "base": "https://api.lanonasis.com",
    "login": "https://api.lanonasis.com/v1/auth/login",
    "browser": "https://mcp.lanonasis.com/auth/cli-login"
  }
}
```

### Impact

- CLI users cannot authenticate using `lanonasis auth login`
- Service discovery causes CLI to attempt connection to localhost:4000
- Results in "Network connection failed" error message

### Verification

Tested authentication directly against production endpoint - works correctly:

```bash
curl -X POST https://api.lanonasis.com/v1/auth/login \
  -H "Content-Type: application/json" \
  -H "X-Project-Scope: lanonasis-maas" \
  -d '{"email":"admin@example.com","password":"REDACTED_CHANGE_ME"}' 
# Returns valid access_token
```

### Action Required

**Team: MCP-Core Repository (VPS Server)**

Update the service discovery endpoint at `mcp.lanonasis.com/.well-known/onasis.json` to return correct production URLs:

1. Change `auth.base` from `http://localhost:4000` to `https://api.lanonasis.com`
2. Change `auth.login` from `http://localhost:4000/auth/login` to `https://api.lanonasis.com/v1/auth/login`

### Files to Check in MCP-Core Repo

- Service discovery endpoint handler
- Environment configuration for auth base URL
- Any hardcoded localhost references in production deployment

### Priority

**HIGH** - Blocks all CLI authentication attempts

### Workaround

Manually configure CLI config file at `~/.maas/config.json` with correct auth_base URL.

---

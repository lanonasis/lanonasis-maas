# Legacy Scattered Authentication Files

**ARCHIVED: 2025-01-15**

This folder contains the previous authentication implementation that was scattered across multiple files before implementing the centralized OAuth client authentication system.

## What was replaced:

### 1. auth.ts (route)
- Old JWT-based authentication route
- Replaced by: `auth-router.ts` (proxy to centralized oauth-client)

### 2. oauth.ts (route) 
- Old OAuth 2.0 implementation with in-memory storage
- Replaced by: `auth-router.ts` (proxy to centralized oauth-client)

### 3. auth.ts (middleware)
- Old JWT middleware with local validation
- Replaced by: `auth-aligned.ts` (uses centralized oauth-client validation)

## Why this was changed:

1. **Centralization**: All authentication now flows through the `@lanonasis/oauth-client` package
2. **Consistency**: Same auth logic across CLI, SDK, REST API, IDE extensions, and MCP connector
3. **Maintainability**: Single source of truth for authentication
4. **Security**: Centralized token management and validation

## New Architecture:

```
oauth-client package (centralized)
├── Terminal Flow (CLI)
├── Desktop Flow (IDE extensions)
├── MCP Client (AI agents)
└── Auth Router (REST API proxy)
```

## DO NOT USE THESE FILES

These files are kept for reference only. The new centralized authentication system should be used for all new development.

## Migration Notes:

- All endpoints now proxy to the central auth server
- Token validation happens through oauth-client
- MCP connections use SSE with API key authentication
- Service registry manages all endpoint routing
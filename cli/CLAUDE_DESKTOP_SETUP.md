# Claude Desktop MCP Setup Guide

## Instant Remote Claude Desktop Integration

This guide provides the OAuth2 endpoints and configuration for instant Claude Desktop integration with Lan Onasis MCP services.

## OAuth2 Endpoints

### Authorization Endpoint
```
https://auth.lanonasis.com/oauth/authorize
```

### Token Endpoint
```
https://auth.lanonasis.com/oauth/token
```

### Revoke Endpoint
```
https://auth.lanonasis.com/oauth/revoke
```

### Introspect Endpoint
```
https://auth.lanonasis.com/oauth/introspect
```

## Claude Desktop OAuth Client

### Client Configuration

- **Client ID**: `claude-desktop`
- **Client Type**: Public (PKCE required)
- **Auth Method**: OAuth2 with PKCE (S256)
- **Status**: Active

### Allowed Redirect URIs

```json
[
  "http://localhost:3000/mcp/callback",
  "http://127.0.0.1:3000/mcp/callback",
  "http://localhost:52813/oauth/callback",
  "http://127.0.0.1:52813/oauth/callback",
  "claude-desktop://oauth/callback"
]
```

### Scopes

**Available Scopes**:
- `mcp:full` - Full MCP protocol access
- `mcp:tools` - MCP tools access
- `mcp:resources` - MCP resources access
- `mcp:prompts` - MCP prompts access
- `memories:read` - Read memory entries
- `memories:write` - Create and update memories
- `memories:delete` - Delete memory entries
- `api-keys:read` - Read API keys
- `api-keys:write` - Create and manage API keys
- `profile` - User profile access

**Default Scopes** (granted automatically):
- `mcp:full`
- `memories:read`
- `memories:write`

## Claude Desktop Configuration

### Option 1: OAuth2 Authentication (Recommended)

Add this to your Claude Desktop configuration file:

**Location**:
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`

**Configuration**:
```json
{
  "mcpServers": {
    "lanonasis": {
      "url": "https://mcp.lanonasis.com/api/v1",
      "transport": {
        "type": "http"
      },
      "authentication": {
        "type": "oauth2",
        "authorizationUrl": "https://auth.lanonasis.com/oauth/authorize",
        "tokenUrl": "https://auth.lanonasis.com/oauth/token",
        "clientId": "claude-desktop",
        "scope": "mcp:full memories:read memories:write",
        "usePKCE": true
      }
    }
  }
}
```

### Option 2: Direct API Key Authentication

If you prefer to use an API key instead of OAuth:

```json
{
  "mcpServers": {
    "lanonasis": {
      "url": "https://mcp.lanonasis.com/api/v1",
      "transport": {
        "type": "http"
      },
      "authentication": {
        "type": "bearer",
        "token": "YOUR_API_KEY_HERE"
      }
    }
  }
}
```

To obtain an API key:
```bash
# Using the CLI
onasis auth login
onasis api-keys create "claude-desktop" --scopes mcp:full,memories:read,memories:write
```

## OAuth2 Authentication Flow

### 1. Authorization Request

Claude Desktop will open a browser to:

```
https://auth.lanonasis.com/oauth/authorize?
  response_type=code&
  client_id=claude-desktop&
  redirect_uri=http://localhost:52813/oauth/callback&
  scope=mcp:full+memories:read+memories:write&
  code_challenge=<PKCE_CHALLENGE>&
  code_challenge_method=S256&
  state=<RANDOM_STATE>
```

### 2. User Authorization

- User logs in with Lan Onasis credentials
- User reviews and approves requested scopes
- System redirects back to Claude Desktop with authorization code

### 3. Token Exchange

Claude Desktop exchanges the authorization code for access token:

```bash
POST https://auth.lanonasis.com/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&
code=<AUTHORIZATION_CODE>&
redirect_uri=http://localhost:52813/oauth/callback&
client_id=claude-desktop&
code_verifier=<PKCE_VERIFIER>
```

**Response**:
```json
{
  "access_token": "eyJhbGci...",
  "refresh_token": "eyJhbGci...",
  "token_type": "Bearer",
  "expires_in": 604800,
  "scope": "mcp:full memories:read memories:write"
}
```

### 4. Token Refresh

When the access token expires, Claude Desktop can refresh it:

```bash
POST https://auth.lanonasis.com/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token&
refresh_token=<REFRESH_TOKEN>&
client_id=claude-desktop
```

## Available MCP Tools

Once authenticated, Claude Desktop has access to:

### Memory Operations
- `create_memory` - Create new memory entries
- `search_memories` - Semantic search across memories
- `get_memory` - Retrieve specific memory by ID
- `update_memory` - Update existing memory
- `delete_memory` - Delete memory entry
- `list_memories` - List memories with pagination

### API Key Management
- `create_api_key` - Generate new API keys
- `list_api_keys` - List all API keys
- `rotate_api_key` - Rotate API key
- `delete_api_key` - Delete API key

### System Operations
- `get_health_status` - Check system health
- `get_auth_status` - Check authentication status
- `get_organization_info` - Get organization details
- `get_config` - Get configuration settings

## Troubleshooting

### Authentication Issues

If authentication fails:

1. **Check OAuth client status**:
   ```bash
   # Verify client is active in database
   psql "YOUR_DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<db>
   ```

2. **Verify redirect URI**:
   - Ensure the redirect URI used by Claude Desktop matches one of the allowed URIs
   - Check for exact match (including protocol and port)

3. **Clear cached tokens**:
   - Close Claude Desktop completely
   - Remove cached tokens (location varies by OS)
   - Restart Claude Desktop and re-authenticate

### Connection Issues

If Claude Desktop cannot connect to MCP server:

1. **Test endpoints manually**:
   ```bash
   # Test health endpoint
   curl https://mcp.lanonasis.com/api/v1/health

   # Test with authentication
   curl -H "Authorization: Bearer YOUR_TOKEN" \
        https://mcp.lanonasis.com/api/v1/memory
   ```

2. **Check service discovery**:
   ```bash
   curl https://api.lanonasis.com/.well-known/onasis.json
   curl https://mcp.lanonasis.com/.well-known/onasis.json
   ```

3. **Verify SSL certificates**:
   ```bash
   openssl s_client -connect auth.lanonasis.com:443 -showcerts
   openssl s_client -connect mcp.lanonasis.com:443 -showcerts
   ```

## Security Best Practices

1. **Use OAuth2 over API Keys**: OAuth2 provides better security with token expiration and refresh capabilities

2. **Limit Scopes**: Only request the scopes you actually need

3. **Secure Storage**: Claude Desktop securely stores tokens using OS-level keychain/credential managers

4. **Token Rotation**: Refresh tokens are automatically rotated on use

5. **Audit Logging**: All authentication events are logged in the auth gateway

## Support

For issues or questions:

- **GitHub Issues**: https://github.com/thefixer3x/lan-onasis-monorepo/issues
- **Documentation**: https://docs.lanonasis.com
- **CLI Help**: `onasis --help`

## Related Links

- [Auth Gateway Documentation](../../onasis-core/services/auth-gateway/README-UPDATED.md)
- [MCP OAuth Clients Migration](../../onasis-core/services/auth-gateway/migrations/007_add_mcp_oauth_clients.sql)
- [CLI Authentication Guide](./README.md#authentication)

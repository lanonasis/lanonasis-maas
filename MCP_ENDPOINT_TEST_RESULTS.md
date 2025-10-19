# MCP Endpoint Test Results

## Tested Endpoints

### ✅ Working Endpoints

1. **Main API Health**
   - URL: `https://api.lanonasis.com/health`
   - Status: ✅ Working
   - Response: Gateway health with auth_service and api_service available

2. **Auth Service Health**
   - URL: `https://api.lanonasis.com/auth/health`
   - Status: ✅ Working
   - Endpoints: `/auth/login`, `/auth/register`
   - Methods: password, api_key, oauth

### ❌ Not Accessible (Port 3001)

3. **MCP Server Health**
   - URL: `https://api.lanonasis.com:3001/health`
   - Status: ❌ Not reachable (timeout)

4. **MCP WebSocket**
   - URL: `wss://api.lanonasis.com:3001/ws`
   - Status: ❌ Not tested (port not accessible)

5. **MCP SSE**
   - URL: `https://api.lanonasis.com:3001/api/v1/events`
   - Status: ❌ Not reachable (timeout)

## Current Configuration Issues

### 1. Service Discovery
- Endpoint: `https://api.lanonasis.com/.well-known/onasis.json`
- Returns: HTML landing page instead of JSON
- Impact: CLI can't auto-discover MCP endpoints

### 2. Port 3001 Access
- MCP server runs on port 3001 internally (PM2)
- Port 3001 not exposed/accessible externally
- Need reverse proxy or firewall rules

### 3. Auth Configuration
Current auth works at:
- Base: `https://api.lanonasis.com`
- Login: `https://api.lanonasis.com/auth/login`
- Register: `https://api.lanonasis.com/auth/register`

## Recommendations

### Option 1: Expose Port 3001 (Quick Fix)
```bash
# Add firewall rule to allow port 3001
# Update nginx/reverse proxy to forward :3001
```

### Option 2: Proxy MCP Through Main API (Better)
```nginx
# Nginx config
location /mcp/ {
    proxy_pass http://localhost:3001/;
}

location /mcp/ws {
    proxy_pass http://localhost:3001/ws;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

Then endpoints become:
- REST: `https://api.lanonasis.com/mcp/api/v1/*`
- WebSocket: `wss://api.lanonasis.com/mcp/ws`
- SSE: `https://api.lanonasis.com/mcp/api/v1/events`

### Option 3: Fix Service Discovery
Create `/.well-known/onasis.json`:
```json
{
  "auth": {
    "baseUrl": "https://api.lanonasis.com",
    "loginEndpoint": "/auth/login",
    "registerEndpoint": "/auth/register"
  },
  "mcp": {
    "restUrl": "https://api.lanonasis.com/mcp/api/v1",
    "wsUrl": "wss://api.lanonasis.com/mcp/ws",
    "sseUrl": "https://api.lanonasis.com/mcp/api/v1/events"
  },
  "memory": {
    "baseUrl": "https://api.lanonasis.com/api/v1"
  }
}
```

## MCP via npx

Yes! MCP can work with `npx @lanonasis/cli` commands:

```bash
# Using stdio MCP server (works now)
npx @lanonasis/cli mcp connect --local

# Using remote MCP (needs port 3001 or proxy)
npx @lanonasis/cli mcp connect --remote

# Trigger MCP tools
npx @lanonasis/cli mcp tools
npx @lanonasis/cli mcp call memory_create --args '{"title":"test"}'
```

## Next Steps

1. ✅ Hold publishing CLI patch
2. ⏳ Fix port 3001 access OR setup proxy
3. ⏳ Create service discovery JSON
4. ⏳ Test endpoints with curl/wscat
5. ⏳ Update CLI configuration
6. ⏳ Publish CLI with correct endpoints

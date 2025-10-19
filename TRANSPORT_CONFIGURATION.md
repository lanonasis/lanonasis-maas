# Transport Configuration Guide

## Service Endpoints

### Authentication Service
- **Base URL**: `https://api.lanonasis.com`
- **Login**: `https://api.lanonasis.com/auth/login`
- **Register**: `https://api.lanonasis.com/auth/register`
- **Browser Login**: `https://api.lanonasis.com/auth/cli-login`
- **Health**: `https://api.lanonasis.com/auth/health`

### Memory Service (REST API)
- **Base URL**: `https://api.lanonasis.com/api/v1`
- **Memories**: `https://api.lanonasis.com/api/v1/memories`
- **Topics**: `https://api.lanonasis.com/api/v1/topics`
- **Health**: `https://api.lanonasis.com/health`

### MCP Service (Model Context Protocol)
- **HTTP/REST**: `https://mcp.lanonasis.com/api/v1`
- **WebSocket**: `wss://mcp.lanonasis.com/ws`
- **SSE (Server-Sent Events)**: `https://mcp.lanonasis.com/api/v1/events`
- **Health**: `https://mcp.lanonasis.com/health`
- **Discovery**: `https://mcp.lanonasis.com/.well-known/onasis.json`

## CLI Configuration

### Set Auth Endpoints
```bash
# Configure auth service
onasis config set auth.baseUrl https://api.lanonasis.com
onasis config set auth.loginEndpoint /auth/login
onasis config set auth.browserEndpoint /auth/cli-login

# Verify configuration
onasis config show
```

### Set MCP Endpoints
```bash
# Configure MCP service
onasis config set mcp-server-url https://mcp.lanonasis.com/api/v1
onasis config set mcpWebSocketUrl wss://mcp.lanonasis.com/ws

# Set MCP preference
onasis mcp config --prefer-remote
```

### Clear Cached Discovery
```bash
# Clear old cached endpoints
onasis config set discoveredServices ""

# Force re-discovery
onasis config show
```

## Transport Options

### 1. STDIO (Local)
**Use Case**: Local MCP clients (Kiro, Claude Desktop)
```bash
onasis mcp connect --local
```
**Configuration**:
- Command: `node /usr/local/lib/node_modules/@lanonasis/cli/dist/mcp/server/lanonasis-server.js`
- Protocol: stdin/stdout
- Auth: Uses local config

### 2. HTTP/REST (Remote)
**Use Case**: Standard API calls
```bash
onasis mcp connect --remote
```
**Configuration**:
- Base URL: `https://mcp.lanonasis.com/api/v1`
- Headers: `Authorization: Bearer <token>`, `x-api-key: <token>`
- Protocol: HTTPS

### 3. WebSocket (Enterprise)
**Use Case**: Real-time bidirectional communication
```bash
onasis mcp connect --websocket --url wss://mcp.lanonasis.com/ws
```
**Configuration**:
- URL: `wss://mcp.lanonasis.com/ws`
- Headers: `Authorization: Bearer <token>`
- Auto-reconnect: Enabled

### 4. SSE (Server-Sent Events)
**Use Case**: Real-time server updates
```bash
# SSE is automatically enabled in remote mode
onasis mcp connect --remote
```
**Configuration**:
- URL: `https://mcp.lanonasis.com/api/v1/events`
- Long-lived connection
- Event types: `connected`, `message`, `server_info`

## Testing Endpoints

### Test Auth
```bash
# Health check
curl https://api.lanonasis.com/auth/health

# Login (get token)
curl -X POST https://api.lanonasis.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# CLI login
onasis auth login --email user@example.com --password password
```

### Test MCP HTTP
```bash
# Health check
curl https://mcp.lanonasis.com/health

# Get tools (requires auth)
curl https://mcp.lanonasis.com/api/v1/tools \
  -H "Authorization: Bearer <token>" \
  -H "x-api-key: <token>"

# CLI test
onasis mcp tools
```

### Test MCP WebSocket
```bash
# Using wscat
wscat -c wss://mcp.lanonasis.com/ws \
  -H "Authorization: Bearer <token>"

# CLI test
onasis mcp connect --websocket
```

### Test MCP SSE
```bash
# Using curl
curl -N https://mcp.lanonasis.com/api/v1/events \
  -H "Authorization: Bearer <token>"

# CLI test (automatic in remote mode)
onasis mcp connect --remote
```

## NPX Usage

All commands work with npx:
```bash
# One-time usage without global install
npx @lanonasis/cli auth login
npx @lanonasis/cli mcp connect --remote
npx @lanonasis/cli mcp tools
npx @lanonasis/cli memory list

# With specific version
npx @lanonasis/cli@latest mcp connect
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Client Layer                         │
│  (CLI, Kiro, Claude Desktop, Custom Apps)              │
└────────────┬────────────────────────────────────────────┘
             │
             ├─── STDIO ──────────────────────────────┐
             │                                        │
             ├─── HTTP/REST ──┐                      │
             │                │                      │
             ├─── WebSocket ──┤                      │
             │                │                      │
             └─── SSE ────────┤                      │
                              │                      │
┌─────────────────────────────▼──────────────────────▼────┐
│              Nginx Reverse Proxy                        │
│  api.lanonasis.com  │  mcp.lanonasis.com               │
└─────────────────────┬──────────────────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        │                           │
┌───────▼────────┐         ┌────────▼────────┐
│  Onasis-Core   │         │   MCP-Core      │
│  (Port 3000)   │         │   (Port 3001)   │
│  Auth + Memory │         │   MCP Protocol  │
└────────────────┘         └─────────────────┘
```

## Environment Variables

```bash
# Auth
export LANONASIS_API_KEY="your-api-key"
export LANONASIS_TOKEN="your-jwt-token"

# MCP
export MCP_SERVER_URL="https://mcp.lanonasis.com/api/v1"
export MCP_WS_URL="wss://mcp.lanonasis.com/ws"
export MCP_SSE_URL="https://mcp.lanonasis.com/api/v1/events"

# Debug
export CLI_VERBOSE="true"
```

## Troubleshooting

### Connection Issues
```bash
# Check service health
curl https://mcp.lanonasis.com/health

# Clear cached config
rm ~/.maas/config.json
onasis config show

# Test with verbose logging
CLI_VERBOSE=true onasis mcp connect --remote
```

### Auth Issues
```bash
# Check auth status
onasis status

# Re-authenticate
onasis auth logout
onasis auth login

# Verify token
onasis config get token
```

### MCP Issues
```bash
# Check MCP status
onasis mcp status

# Reconnect
onasis mcp disconnect
onasis mcp connect --remote

# List available tools
onasis mcp tools
```

## Version Information

- CLI Version: 3.0.11 (upcoming)
- MCP Protocol: 2024-11-05
- API Version: 1.0.0
- Last Updated: 2025-10-19

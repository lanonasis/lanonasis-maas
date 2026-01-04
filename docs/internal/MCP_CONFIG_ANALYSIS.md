# MCP Configuration Analysis

## Current Configuration (~/.maas/config.json)

```json
{
  "apiUrl": "https://api.lanonasis.com/api/v1",
  "mcpPreference": "auto"
}
```

## MCP Connection Modes

### 1. STDIO Mode (What Kiro Uses) ✅ WORKING

- **Protocol**: stdio (stdin/stdout)
- **Transport**: StdioServerTransport  
- **Command**: `node /usr/local/lib/node_modules/@lanonasis/cli/dist/mcp/server/lanonasis-server.js`
- **Use Case**: Local MCP clients (Kiro, Claude Desktop, etc.)
- **Status**: ✅ Connected and working

### 2. Remote/REST Mode (What CLI tries) ❌ NOT WORKING

- **Protocol**: HTTP REST API + SSE
- **Base URL**: `https://api.lanonasis.com`
- **SSE Endpoint**: `https://api.lanonasis.com/sse`
- **Tool Mapping**: REST endpoints like `/api/v1/memories`
- **Use Case**: Remote CLI operations
- **Status**: ❌ "MCP client not initialized" error
- **Issue**: The remote server doesn't have MCP protocol endpoints

### 3. WebSocket Mode (Enterprise)

- **Protocol**: WebSocket (wss://)
- **Default URL**: `wss://mcp.lanonasis.com/ws`
- **Fallback**: `ws://localhost:8081/mcp/ws`
- **Use Case**: Enterprise real-time connections
- **Status**: Not tested

## Endpoint Mapping

### STDIO Mode (Working)

```
Tools available via MCP SDK:
- memory_create, memory_search, memory_list
- memory_get, memory_update, memory_delete
- topic_create, topic_list
- system_health, system_config
```

### Remote Mode (Attempted)

```
Tries to call:
- https://api.lanonasis.com/sse (SSE connection)
- https://api.lanonasis.com/api/v1/memories (REST API)

Problem: These are REST endpoints, not MCP protocol endpoints
```

## CLI Command Behavior

### `onasis mcp tools`

1. Checks if connected
2. If not, attempts auto-connect
3. Uses `connectionMode` from config (defaults to 'remote')
4. Tries to connect to `https://api.lanonasis.com`
5. Fails because REST API ≠ MCP protocol

## Solution: Fix CLI Default

The CLI should default to using the stdio server that's already installed.

Change in `cli/src/utils/mcp-client.ts`:

```typescript
const serverPathValue = options.serverPath ?? 
  this.config.get<string>('mcpServerPath') ?? 
  '/usr/local/lib/node_modules/@lanonasis/cli/dist/mcp/server/lanonasis-server.js';
```

This way `onasis mcp tools` would work out of the box.

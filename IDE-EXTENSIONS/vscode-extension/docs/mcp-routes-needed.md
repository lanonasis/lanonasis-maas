# MCP Routes Needed by VSCode Extension

This note captures the exact MCP-facing routes the VSCode extension probes so
we can align the CLI wrapper when it's ready.

## Discovery & Health

The extension auto-discovers an MCP server via:

- Config: `lanonasis.mcpServerUrl`
- Env: `LANONASIS_MCP_URL` or `MCP_SERVER_URL`
- Auto-probe: `http://localhost:3001`, `http://localhost:3002`, `http://localhost:3000`

Required health endpoint (GET, 1s timeout):

- `GET <base>/health`

Expected response shape:

```json
{
  "status": "healthy" | "degraded" | "unhealthy",
  "version": "x.y.z",
  "capabilities": ["optional", "strings"]
}
```

## Capability Probes

If discovery succeeds, the extension probes these endpoints (OPTIONS, 1s timeout):

- `OPTIONS <base>/api/v1/memory`
- `OPTIONS <base>/api/v1/memory/search`
- `OPTIONS <base>/api/v1/api-keys`
- `OPTIONS <base>/api/v1/projects`

Any response < 500 is treated as "endpoint exists".

## HTTP Transport Tool Routes (if used)

When using the built-in HTTP MCP transport, tool names map to REST routes:

- `memory_create` -> `POST <base>/api/v1/memory`
- `memory_search` -> `POST <base>/api/v1/memory/search`
- `memory_list` -> `GET <base>/api/v1/memory`
- `memory_get` -> `GET <base>/api/v1/memory`
- `memory_update` -> `PUT <base>/api/v1/memory`
- `memory_delete` -> `DELETE <base>/api/v1/memory`
- `memory_stats` -> `GET <base>/api/v1/memory/stats`
- `topic_create` -> `POST <base>/api/v1/topics`
- `topic_list` -> `GET <base>/api/v1/topics`
- `system_health` -> `GET <base>/health`
- Fallback: `/<base>/mcp/tools/<toolName>`

## Headers Expected

Requests include:

- `Content-Type: application/json`
- `X-Client-Type: vscode-extension`

Auth is via either:

- `Authorization: Bearer <token>` or
- `X-API-Key: <api_key>`


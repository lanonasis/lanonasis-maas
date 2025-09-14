# MCP Integration in @LanOnasis/cli

## Overview

The @LanOnasis/cli now includes full MCP (Model Context Protocol) integration, providing a unified interface for memory operations whether using local MCP server or remote API.

## Architecture

### Unified Interface
- **Primary Interface**: MCP commands for all memory operations
- **Remote Mode**: Uses REST API transparently with MCP-style interface
- **Local Mode**: Direct MCP server communication
- **Auto-Detection**: Automatically selects best mode based on authentication

### Key Components

1. **MCP Client Module** (`src/utils/mcp-client.ts`)
   - Handles both local and remote connections
   - Transparent API translation for remote mode
   - SSE support for real-time updates

2. **MCP Commands** (`src/commands/mcp.ts`)
   - Connection management
   - Tool discovery and execution
   - Memory-specific operations

3. **Hybrid Mode**
   - Automatic fallback from MCP to REST API
   - Seamless switching between modes
   - Consistent interface regardless of backend

## Usage

### Basic Commands

```bash
# Connect to MCP (auto-detects best mode)
LanOnasis mcp connect

# Connect to remote MCP (uses API)
LanOnasis mcp connect --remote

# Connect to local MCP server
LanOnasis mcp connect --local

# Check connection status
LanOnasis mcp status

# List available tools
LanOnasis mcp tools

# Create memory via MCP
LanOnasis mcp memory create -t "Title" -c "Content"

# Search memories via MCP
LanOnasis mcp memory search "query"
```

### Configuration

```bash
# Set MCP preferences
LanOnasis mcp config --prefer-remote  # Always use remote
LanOnasis mcp config --prefer-local   # Always use local
LanOnasis mcp config --auto           # Auto-detect (default)
```

### Advanced Features

```bash
# Stream real-time updates (remote only)
LanOnasis memory-mcp stream

# Batch operations
LanOnasis memory-mcp batch-create -f memories.json

# Export memories
LanOnasis memory-mcp export -o backup.json
```

## Authentication

- **Remote Mode**: Requires authentication via `LanOnasis auth login`
- **Local Mode**: No authentication needed for local MCP server
- **Auto Mode**: Uses remote if authenticated, local otherwise

## SSE Real-time Updates

When using remote mode, the CLI automatically connects to the SSE endpoint for real-time updates:

```bash
# Stream live updates
LanOnasis memory-mcp stream

# Filter by type
LanOnasis memory-mcp stream -f project
```

## Environment Variables

```bash
# Override MCP server path
export MCP_SERVER_PATH=/path/to/mcp/server.js

# Override MCP server URL
export MCP_SERVER_URL=https://custom-api.com

# Disable MCP globally
export DISABLE_MCP=true
```

## Integration with Existing Commands

All existing memory commands now use MCP transparently when available:

```bash
# These commands auto-use MCP when connected
LanOnasis create -t "Title" -c "Content"
LanOnasis search "query"
LanOnasis list

# Disable MCP for specific command
LanOnasis --no-mcp create -t "Title" -c "Content"
```

## Tool Mapping

MCP tools are mapped to REST API endpoints for remote mode:

| MCP Tool | REST Endpoint | Description |
|----------|---------------|-------------|
| memory_create_memory | POST /api/v1/memory | Create new memory |
| memory_search_memories | POST /api/v1/memory/search | Semantic search |
| memory_get_memory | GET /api/v1/memory/:id | Get specific memory |
| memory_update_memory | PUT /api/v1/memory/:id | Update memory |
| memory_delete_memory | DELETE /api/v1/memory/:id | Delete memory |
| memory_list_memories | GET /api/v1/memory | List memories |

## Development

### Adding New MCP Tools

1. Add tool definition in MCP server
2. Add corresponding mapping in `mcp-client.ts`
3. Update tool documentation

### Testing MCP Integration

```bash
# Test local MCP
npm test:mcp:local

# Test remote MCP
npm test:mcp:remote

# Test fallback behavior
npm test:mcp:fallback
```

## Troubleshooting

### Connection Issues

```bash
# Check MCP status
LanOnasis mcp status

# Force reconnect
LanOnasis mcp disconnect
LanOnasis mcp connect --remote

# Verbose logging
LanOnasis -v mcp connect
```

### Common Errors

1. **"Cannot find module"**: Check MCP_SERVER_PATH environment variable
2. **"Authentication required"**: Run `LanOnasis auth login` for remote mode
3. **"Connection refused"**: Ensure MCP server is running for local mode

## Benefits

1. **Unified Interface**: Same commands work with local or remote backend
2. **Real-time Updates**: SSE integration for live memory updates
3. **Offline Support**: Local MCP server for offline development
4. **Tool Discovery**: Dynamic tool listing from MCP server
5. **Future-proof**: Ready for additional MCP tools and features

## Roadmap

- [ ] Support for MCP resources
- [ ] Bidirectional streaming
- [ ] Custom tool plugins
- [ ] MCP server embedded mode
- [ ] Cross-service MCP integration
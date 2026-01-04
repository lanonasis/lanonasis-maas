# MCP Integration Plan for @lanonasis/cli

## Current Architecture
The CLI currently uses direct REST API communication with the Memory Service.

## Proposed MCP Integration

### 1. Add MCP SDK Dependency
```bash
npm install @modelcontextprotocol/sdk
```

### 2. Create MCP Client Module
Create `src/utils/mcp-client.ts`:
```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export class MCPClient {
  private client: Client;
  
  async connect(serverPath: string) {
    const transport = new StdioClientTransport({
      command: serverPath,
      args: []
    });
    
    this.client = new Client({
      name: 'lanonasis-cli',
      version: '1.0.0'
    }, {
      capabilities: {}
    });
    
    await this.client.connect(transport);
  }
  
  async callTool(toolName: string, args: any) {
    return await this.client.callTool({
      name: toolName,
      arguments: args
    });
  }
}
```

### 3. Add MCP Commands
Create `src/commands/mcp.ts`:
```typescript
import { Command } from 'commander';
import { MCPClient } from '../utils/mcp-client.js';

export function mcpCommands(program: Command) {
  const mcp = program
    .command('mcp')
    .description('MCP server operations');
    
  mcp.command('connect')
    .description('Connect to MCP server')
    .option('-s, --server <path>', 'MCP server path', 'mcp-server')
    .action(async (options) => {
      const client = new MCPClient();
      await client.connect(options.server);
      console.log('Connected to MCP server');
    });
    
  mcp.command('memory:create')
    .description('Create memory via MCP')
    .requiredOption('-t, --title <title>', 'Memory title')
    .requiredOption('-c, --content <content>', 'Memory content')
    .action(async (options) => {
      const client = new MCPClient();
      await client.connect('mcp-server');
      
      const result = await client.callTool('memory_create_memory', {
        title: options.title,
        content: options.content,
        memory_type: 'context'
      });
      
      console.log('Memory created:', result);
    });
}
```

### 4. Update Main CLI Entry
Add to `src/index.ts`:
```typescript
import { mcpCommands } from './commands/mcp.js';

// Add MCP commands
mcpCommands(program);
```

### 5. Configuration Options
Add MCP settings to CLI config:
```typescript
interface CLIConfig {
  apiUrl: string;
  token?: string;
  mcpEnabled: boolean;
  mcpServerPath: string;
  preferMCP: boolean; // Use MCP when available
}
```

### 6. Hybrid Mode
Allow CLI to work in both REST API and MCP modes:
- Direct API mode (current)
- MCP mode (when server available)
- Auto-detect mode (prefer MCP if available)

## Benefits of MCP Integration
1. **Unified tool interface** - Same tools available in CLI as in other MCP clients
2. **Local processing** - Some operations can run locally via MCP server
3. **Extended capabilities** - Access to all MCP tools, not just Memory API
4. **Better integration** - Works seamlessly with other MCP-enabled tools

## Implementation Timeline
1. Phase 1: Add basic MCP client support
2. Phase 2: Implement memory operations via MCP
3. Phase 3: Add configuration and auto-detection
4. Phase 4: Full feature parity with REST API
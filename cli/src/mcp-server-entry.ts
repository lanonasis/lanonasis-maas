#!/usr/bin/env node
/**
 * Lanonasis MCP Server Entry Point
 *
 * Direct entry point for external MCP clients (Claude Desktop, Cursor, Windsurf, etc.)
 * This allows simple configuration like:
 *
 *   claude mcp add lanonasis -- lanonasis-mcp
 *
 * Or in claude_desktop_config.json:
 *   {
 *     "mcpServers": {
 *       "lanonasis": {
 *         "command": "lanonasis-mcp",
 *         "env": { "LANONASIS_API_KEY": "lano_xxx" }
 *       }
 *     }
 *   }
 */

import { LanonasisMCPServer } from './mcp/server/lanonasis-server.js';

async function main() {
  // Get API key from environment
  const apiKey = process.env.LANONASIS_API_KEY;

  if (!apiKey) {
    console.error('Error: LANONASIS_API_KEY environment variable is required');
    console.error('');
    console.error('Usage:');
    console.error('  LANONASIS_API_KEY=lano_xxx lanonasis-mcp');
    console.error('');
    console.error('Or configure in Claude Desktop/Cursor:');
    console.error('  {');
    console.error('    "mcpServers": {');
    console.error('      "lanonasis": {');
    console.error('        "command": "lanonasis-mcp",');
    console.error('        "env": { "LANONASIS_API_KEY": "your_api_key" }');
    console.error('      }');
    console.error('    }');
    console.error('  }');
    process.exit(1);
  }

  try {
    const server = new LanonasisMCPServer({
      apiKey,
      verbose: process.env.LOG_LEVEL === 'debug'
    });

    // Start in stdio mode (standard for MCP clients)
    await server.startStdio();
  } catch (error) {
    console.error(`Failed to start MCP server: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  }
}

main();

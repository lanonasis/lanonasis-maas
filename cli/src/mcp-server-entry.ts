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
import { CLIConfig } from './utils/config.js';

async function resolveApiKey(): Promise<string | undefined> {
  // 1. Explicit env var always wins
  const envKey = process.env.LANONASIS_API_KEY;
  if (typeof envKey === 'string' && envKey.trim().length > 0) {
    return envKey.trim();
  }

  // 2. Fall back to the user's saved CLI session
  const config = new CLIConfig();
  await config.init();

  // Try vendor key first (most common for external MCP clients)
  const vendorKey = await config.getVendorKeyAsync();
  if (typeof vendorKey === 'string' && vendorKey.trim().length > 0) {
    return vendorKey.trim();
  }

  // Then try JWT token
  const token = config.get('token');
  if (typeof token === 'string' && token.trim().length > 0) {
    return token.trim();
  }

  return undefined;
}

async function main() {
  const apiKey = await resolveApiKey();

  if (!apiKey) {
    console.error('Error: No authentication credentials found');
    console.error('');
    console.error('The MCP server needs an API key or JWT token.');
    console.error('');
    console.error('Options:');
    console.error('  1. Run "lanonasis auth login" to create a CLI session, then');
    console.error('     the server will automatically pick up the saved credentials.');
    console.error('');
    console.error('  2. Set LANONASIS_API_KEY in your environment or MCP client config:');
    console.error('     {');
    console.error('       "mcpServers": {');
    console.error('         "lanonasis": {');
    console.error('           "command": "lanonasis-mcp",');
    console.error('           "env": { "LANONASIS_API_KEY": "your_api_key" }');
    console.error('         }');
    console.error('       }');
    console.error('     }');
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

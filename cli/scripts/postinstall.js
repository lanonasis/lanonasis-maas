#!/usr/bin/env node
import { fileURLToPath } from 'url';
import { dirname, resolve, join } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Postinstall script to auto-configure MCP server path
 * This runs after npm/bun install and sets up the local MCP server path automatically
 */

async function postinstall() {
  console.log('⚙️  Configuring Lanonasis CLI...');

  const configDir = join(homedir(), '.maas');
  const configFile = join(configDir, 'config.json');

  // Ensure config directory exists
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }

  // Potential MCP server locations (in priority order)
  const potentialPaths = [
    // Development: relative to CLI in monorepo
    resolve(__dirname, '../../../onasis-core/dist/mcp-server.js'),
    resolve(__dirname, '../../../onasis-core/src/mcp/server.ts'),
    // Global install: look in common locations
    resolve(homedir(), 'DevOps/_project_folders/lan-onasis-monorepo/packages/onasis-core/dist/mcp-server.js'),
    resolve(homedir(), 'projects/lan-onasis-monorepo/packages/onasis-core/dist/mcp-server.js'),
    // Check if installed alongside CLI in node_modules
    resolve(__dirname, '../../onasis-core/dist/mcp-server.js'),
  ];

  // Find the first existing MCP server path
  let mcpServerPath = null;
  for (const path of potentialPaths) {
    if (existsSync(path)) {
      mcpServerPath = path;
      console.log(`✓ Found MCP server at: ${path}`);
      break;
    }
  }

  // Load existing config or create new one
  let config = {
    version: '1.0.0',
    apiUrl: 'https://mcp.lanonasis.com/api/v1'
  };

  if (existsSync(configFile)) {
    try {
      const existingConfig = readFileSync(configFile, 'utf-8');
      config = JSON.parse(existingConfig);
    } catch (error) {
      console.warn('⚠️  Could not read existing config, will create new one');
    }
  }

  // Update config with MCP server path if found
  if (mcpServerPath) {
    config.mcpServerPath = mcpServerPath;
    config.mcpConnectionMode = 'local';
    config.mcpPreference = 'local';
    console.log('✓ Configured local MCP server path');
  } else {
    // No local server found, prefer remote/websocket
    console.log('ℹ️  No local MCP server found, will use remote connection');
    config.mcpConnectionMode = 'websocket';
    config.mcpPreference = 'websocket';
    config.mcpWebSocketUrl = 'wss://mcp.lanonasis.com/ws';
  }

  // Save config
  try {
    writeFileSync(configFile, JSON.stringify(config, null, 2), 'utf-8');
    console.log('✓ Configuration saved to ~/.maas/config.json');
  } catch (error) {
    console.error('✖ Failed to save configuration:', error.message);
  }

  console.log('');
  console.log('🎉 Lanonasis CLI configured successfully!');
  console.log('');
  console.log('Get started:');
  console.log('  onasis --help          # Show available commands');
  console.log('  onasis auth            # Authenticate with your account');
  console.log('  onasis mcp connect     # Connect to MCP services');
  console.log('');
}

// Run postinstall
postinstall().catch((error) => {
  console.error('✖ Postinstall failed:', error);
  // Don't fail installation if postinstall fails
  process.exit(0);
});

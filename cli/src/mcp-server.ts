#!/usr/bin/env node

/**
 * CLI-Embedded MCP Server
 * Uses the same configuration and authentication as @lanonasis/cli v1.5.2+
 * Can run standalone or be invoked by CLI commands
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import { createRequire } from 'module';
import { spawn } from 'child_process';
import { CLIConfig } from './utils/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const nodeRequire = createRequire(import.meta.url);

interface MCPServerOptions {
  mode?: 'stdio' | 'http';
  port?: number;
  verbose?: boolean;
  useRemote?: boolean;
}

export class CLIMCPServer {
  private config: CLIConfig;

  constructor() {
    this.config = new CLIConfig();
  }

  /**
   * Start MCP server using CLI configuration
   */
  async start(options: MCPServerOptions = {}): Promise<void> {
    await this.config.init();

    const {
      useRemote = this.config.shouldUseRemoteMCP()
    } = options;

    if (useRemote) {
      await this.startRemoteMCP(options);
    } else {
      await this.startLocalMCP(options);
    }
  }

  private resolveMCPServerPath(): string {
    const candidates = new Set<string>();

    if (process.env.MCP_SERVER_PATH) {
      candidates.add(process.env.MCP_SERVER_PATH);
    }

    const packageRequests = [
      'mcp-core/dist/cli-aligned-mcp-server.js',
      'mcp-core/dist/cli-aligned-mcp-server.js'
    ];

    for (const request of packageRequests) {
      try {
        const resolved = nodeRequire.resolve(request);
        candidates.add(resolved);
      } catch {
        // Ignore resolution failures and continue through fallbacks
      }
    }

    candidates.add(join(process.cwd(), 'mcp-server/dist/cli-aligned-mcp-server.js'));
    candidates.add(join(__dirname, '../../../mcp-server/dist/cli-aligned-mcp-server.js'));

    for (const candidate of candidates) {
      if (candidate && existsSync(candidate)) {
        return candidate;
      }
    }

    throw new Error(
      'Unable to locate the CLI-aligned MCP server. Set MCP_SERVER_PATH or install @lanonasis/mcp-server.'
    );
  }

  /**
   * Start local MCP server using CLI auth config
   */
  private async startLocalMCP(options: MCPServerOptions): Promise<void> {
    const { mode, port, verbose } = options;

    // Path to production MCP server (uses CommonJS, no build needed)
    const mcpServerPath = join(__dirname, '../../../mcp-server/src/production-mcp-server.cjs');

    const args = mode === 'http' ? ['--http'] : ['--stdio'];

    if (verbose) {
      console.error('🚀 Starting CLI-aligned MCP Server...');
      console.error(`Mode: ${mode}`);
      console.error(`Config: ~/.maas/config.json`);
      console.error(`Auth: ${this.config.hasVendorKey() ? 'Vendor Key' : 'JWT Token'}`);
    }

    const resolvedPort =
      typeof port === 'number' && !Number.isNaN(port) ? port : 3001;

    // Set environment variables from CLI config
    const env = {
      ...process.env,
      PORT: resolvedPort.toString(),
      MEMORY_API_URL: this.config.getApiUrl(),
      LANONASIS_VENDOR_KEY: this.config.getVendorKey(),
      LANONASIS_TOKEN: this.config.getToken(),
      MCP_VERBOSE: verbose ? 'true' : 'false',
      CLI_ALIGNED: 'true'
    };

    const child = spawn('node', [mcpServerPath, ...args], {
      env,
      stdio: mode === 'stdio' ? ['pipe', 'pipe', 'inherit'] : 'inherit'
    });

    if (mode === 'stdio') {
      // For stdio mode, pipe stdin/stdout for MCP protocol
      process.stdin.pipe(child.stdin);
      child.stdout.pipe(process.stdout);
    }

    child.on('error', (error) => {
      console.error('❌ MCP Server failed to start:', error.message);
      process.exit(1);
    });

    child.on('exit', (code) => {
      if (code !== 0) {
        console.error(`❌ MCP Server exited with code ${code}`);
        process.exit(code || 1);
      }
    });

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      child.kill('SIGINT');
    });

    process.on('SIGTERM', () => {
      child.kill('SIGTERM');
    });
  }

  /**
   * Connect to remote MCP server
   */
  private async startRemoteMCP(options: MCPServerOptions): Promise<void> {
    const { verbose } = options;
    const message = 'Remote MCP not implemented; remove --remote or use local mode.';

    if (verbose) {
      console.error('🌐 Connecting to remote MCP server...');
      console.error(`URL: ${this.config.getMCPServerUrl()}`);
    }

    console.error(`❌ ${message}`);
    throw new Error(message);
  }

  /**
   * Check if MCP server is available and configured
   */
  async checkStatus(): Promise<{
    available: boolean;
    configured: boolean;
    authMethod: string;
    mode: 'local' | 'remote' | 'auto';
  }> {
    await this.config.init();

    return {
      available: true, // CLI always has MCP server available
      configured: this.config.hasVendorKey() || !!this.config.getToken(),
      authMethod: this.config.hasVendorKey() ? 'vendor_key' :
        this.config.getToken() ? 'jwt' : 'none',
      mode: this.config.shouldUseRemoteMCP() ? 'remote' : 'local'
    };
  }
}

// Main execution when run as standalone script
async function main() {
  const args = process.argv.slice(2);
  const server = new CLIMCPServer();

  // Parse command line arguments
  const options: MCPServerOptions = {
    mode: args.includes('--http') ? 'http' : 'stdio',
    port: parseInt(args.find(arg => arg.startsWith('--port='))?.split('=')[1] || '3001'),
    verbose: args.includes('--verbose') || args.includes('-v'),
    useRemote: args.includes('--remote')
  };

  if (args.includes('--status')) {
    const status = await server.checkStatus();
    console.log(JSON.stringify(status, null, 2));
    return;
  }

  if (args.includes('--help')) {
    console.log(`
CLI MCP Server - CLI-aligned Model Context Protocol server

Usage:
  mcp-core [options]

Options:
  --stdio          Use stdio transport (default)
  --http           Use HTTP transport
  --port=3001      HTTP port (default: 3001)
  --remote         Use remote MCP server
  --verbose, -v    Verbose logging
  --status         Check server status
  --help           Show this help

Examples:
  mcp-core                    # Start stdio server
  mcp-core --http --port=3002 # Start HTTP server
  mcp-core --status           # Check status
`);
    return;
  }

  await server.start(options);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exit(1);
  });
}

export default CLIMCPServer;

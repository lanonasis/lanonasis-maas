/**
 * MCP (Model Context Protocol) Auto-Discovery Service
 *
 * Discovers and connects to embedded CLI MCP servers automatically.
 * Supports:
 * - Auto-discovery at common ports (3001, 3002)
 * - Environment variable configuration (LANONASIS_MCP_URL)
 * - Custom server URL configuration
 * - Health check and capability detection
 */

import * as vscode from 'vscode';

export interface MCPServerInfo {
  url: string;
  version: string;
  capabilities: MCPCapabilities;
  isHealthy: boolean;
  source: 'auto-discovered' | 'configured' | 'environment';
}

export interface MCPCapabilities {
  memories: boolean;
  search: boolean;
  apiKeys: boolean;
  projects: boolean;
  streaming: boolean;
}

export interface MCPHealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime?: number;
  capabilities?: string[];
}

const DEFAULT_MCP_PORTS = [3001, 3002, 3000];
const DEFAULT_MCP_HOST = 'localhost';
const DISCOVERY_TIMEOUT_MS = 2000;

export class MCPDiscoveryService {
  private config: vscode.WorkspaceConfiguration;
  private discoveredServer: MCPServerInfo | null = null;
  private statusBarItem: vscode.StatusBarItem;
  private outputChannel: vscode.OutputChannel;

  constructor(outputChannel?: vscode.OutputChannel) {
    this.config = vscode.workspace.getConfiguration('lanonasis');
    this.outputChannel = outputChannel || vscode.window.createOutputChannel('Lanonasis MCP');

    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      99
    );
    this.statusBarItem.command = 'lanonasis.showMCPStatus';
  }

  /**
   * Auto-discover MCP server using multiple strategies
   */
  async discover(): Promise<MCPServerInfo | null> {
    const enableAutoDiscover = this.config.get<boolean>('mcpAutoDiscover', true);
    const enableMCP = this.config.get<boolean>('enableMCP', true);

    if (!enableMCP) {
      this.log('MCP disabled in configuration');
      this.updateStatusBar(null);
      return null;
    }

    // Strategy 1: Check configured URL
    const configuredUrl = this.config.get<string>('mcpServerUrl', '');
    if (configuredUrl) {
      this.log(`Checking configured MCP server: ${configuredUrl}`);
      const server = await this.checkServer(configuredUrl, 'configured');
      if (server) {
        this.discoveredServer = server;
        this.updateStatusBar(server);
        return server;
      }
    }

    // Strategy 2: Check environment variable
    const envUrl = process.env.LANONASIS_MCP_URL || process.env.MCP_SERVER_URL;
    if (envUrl) {
      this.log(`Checking environment MCP server: ${envUrl}`);
      const server = await this.checkServer(envUrl, 'environment');
      if (server) {
        this.discoveredServer = server;
        this.updateStatusBar(server);
        return server;
      }
    }

    // Strategy 3: Auto-discover on common ports
    if (enableAutoDiscover) {
      this.log('Starting MCP auto-discovery...');

      for (const port of DEFAULT_MCP_PORTS) {
        const url = `http://${DEFAULT_MCP_HOST}:${port}`;
        this.log(`Probing ${url}...`);

        const server = await this.checkServer(url, 'auto-discovered');
        if (server) {
          this.discoveredServer = server;
          this.updateStatusBar(server);
          vscode.window.showInformationMessage(
            `MCP server discovered at ${url}`,
            'Show Details'
          ).then(selection => {
            if (selection === 'Show Details') {
              this.showServerDetails();
            }
          });
          return server;
        }
      }
    }

    this.log('No MCP server found');
    this.updateStatusBar(null);
    return null;
  }

  /**
   * Check if a specific URL has a valid MCP server
   */
  private async checkServer(
    url: string,
    source: MCPServerInfo['source']
  ): Promise<MCPServerInfo | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), DISCOVERY_TIMEOUT_MS);

      // Check health endpoint
      const healthUrl = `${url.replace(/\/$/, '')}/health`;
      const response = await fetch(healthUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-Client-Type': 'vscode-extension',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        this.log(`Health check failed for ${url}: ${response.status}`);
        return null;
      }

      const health = await response.json() as MCPHealthResponse;

      if (health.status !== 'healthy' && health.status !== 'degraded') {
        this.log(`Server at ${url} is unhealthy: ${health.status}`);
        return null;
      }

      // Detect capabilities
      const capabilities = await this.detectCapabilities(url);

      const serverInfo: MCPServerInfo = {
        url,
        version: health.version || 'unknown',
        capabilities,
        isHealthy: health.status === 'healthy',
        source,
      };

      this.log(`MCP server found at ${url}: v${serverInfo.version}`);
      return serverInfo;

    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          this.log(`Timeout checking ${url}`);
        } else {
          this.log(`Error checking ${url}: ${error.message}`);
        }
      }
      return null;
    }
  }

  /**
   * Detect server capabilities by probing endpoints
   */
  private async detectCapabilities(baseUrl: string): Promise<MCPCapabilities> {
    const capabilities: MCPCapabilities = {
      memories: false,
      search: false,
      apiKeys: false,
      projects: false,
      streaming: false,
    };

    const endpoints = [
      { path: '/api/v1/memories', capability: 'memories' as const },
      { path: '/api/v1/memories/search', capability: 'search' as const },
      { path: '/api/v1/api-keys', capability: 'apiKeys' as const },
      { path: '/api/v1/projects', capability: 'projects' as const },
    ];

    // Quick probe each endpoint (OPTIONS or HEAD)
    const probePromises = endpoints.map(async ({ path, capability }) => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1000);

        const response = await fetch(`${baseUrl}${path}`, {
          method: 'OPTIONS',
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // If we get 200, 204, or even 401/403, the endpoint exists
        if (response.status < 500) {
          capabilities[capability] = true;
        }
      } catch {
        // Endpoint not available
      }
    });

    await Promise.all(probePromises);

    return capabilities;
  }

  /**
   * Get the currently discovered server
   */
  getDiscoveredServer(): MCPServerInfo | null {
    return this.discoveredServer;
  }

  /**
   * Get the MCP server URL (discovered or configured)
   */
  getServerUrl(): string | null {
    if (this.discoveredServer) {
      return this.discoveredServer.url;
    }

    const configuredUrl = this.config.get<string>('mcpServerUrl', '');
    if (configuredUrl) {
      return configuredUrl;
    }

    return null;
  }

  /**
   * Check if MCP is available
   */
  isAvailable(): boolean {
    return this.discoveredServer !== null && this.discoveredServer.isHealthy;
  }

  /**
   * Re-check the currently discovered server
   */
  async refresh(): Promise<boolean> {
    if (!this.discoveredServer) {
      const server = await this.discover();
      return server !== null;
    }

    const server = await this.checkServer(
      this.discoveredServer.url,
      this.discoveredServer.source
    );

    if (server) {
      this.discoveredServer = server;
      this.updateStatusBar(server);
      return true;
    } else {
      this.discoveredServer = null;
      this.updateStatusBar(null);
      return false;
    }
  }

  /**
   * Show server details in a quick pick
   */
  async showServerDetails(): Promise<void> {
    const server = this.discoveredServer;

    if (!server) {
      vscode.window.showWarningMessage('No MCP server currently connected');
      return;
    }

    const capabilities = Object.entries(server.capabilities)
      .filter(([, enabled]) => enabled)
      .map(([name]) => name)
      .join(', ');

    const items: vscode.QuickPickItem[] = [
      {
        label: '$(globe) Server URL',
        description: server.url,
        detail: `Source: ${server.source}`,
      },
      {
        label: '$(versions) Version',
        description: server.version,
      },
      {
        label: server.isHealthy ? '$(check) Status' : '$(warning) Status',
        description: server.isHealthy ? 'Healthy' : 'Degraded',
      },
      {
        label: '$(list-unordered) Capabilities',
        description: capabilities || 'None detected',
      },
      {
        label: '$(refresh) Refresh',
        description: 'Re-check server status',
      },
      {
        label: '$(debug-disconnect) Disconnect',
        description: 'Clear discovered server',
      },
    ];

    const selected = await vscode.window.showQuickPick(items, {
      title: 'MCP Server Details',
      placeHolder: 'Select an action',
    });

    if (selected?.label.includes('Refresh')) {
      await this.refresh();
      vscode.window.showInformationMessage(
        this.discoveredServer ? 'MCP server refreshed' : 'MCP server disconnected'
      );
    } else if (selected?.label.includes('Disconnect')) {
      this.discoveredServer = null;
      this.updateStatusBar(null);
      vscode.window.showInformationMessage('MCP server disconnected');
    }
  }

  private updateStatusBar(server: MCPServerInfo | null): void {
    if (server) {
      const icon = server.isHealthy ? '$(plug)' : '$(warning)';
      this.statusBarItem.text = `${icon} MCP`;
      this.statusBarItem.tooltip = `MCP Server: ${server.url}\nVersion: ${server.version}\nStatus: ${server.isHealthy ? 'Healthy' : 'Degraded'}`;
      this.statusBarItem.backgroundColor = server.isHealthy
        ? undefined
        : new vscode.ThemeColor('statusBarItem.warningBackground');
      this.statusBarItem.show();
    } else {
      this.statusBarItem.hide();
    }
  }

  private log(message: string): void {
    const timestamp = new Date().toISOString();
    this.outputChannel.appendLine(`[${timestamp}] [MCPDiscovery] ${message}`);
  }

  dispose(): void {
    this.statusBarItem.dispose();
  }
}

/**
 * Create and initialize the MCP Discovery Service
 */
export async function createMCPDiscoveryService(
  outputChannel?: vscode.OutputChannel
): Promise<MCPDiscoveryService> {
  const service = new MCPDiscoveryService(outputChannel);
  await service.discover();
  return service;
}

/**
 * Connection Manager Implementation
 *
 * Manages MCP server discovery, configuration, and connection lifecycle
 * Implementation of the ConnectionManager interface.
 */

import { promises as fs, createWriteStream } from 'fs';
import { join, dirname, resolve } from 'path';
import { spawn, ChildProcess } from 'child_process';
import { fileURLToPath } from 'url';
import {
  ConnectionManager,
  ConnectionResult,
  ConfigResult,
  ServerInstance,
  ConnectionStatus,
  MCPConfig,
} from '../interfaces/ConnectionManager.js';

/**
 * Default MCP configuration
 */
const DEFAULT_MCP_CONFIG: MCPConfig = {
  localServerPath: '',
  serverPort: 3000,
  autoStart: true,
  connectionTimeout: 10000,
  retryAttempts: 3,
  logLevel: 'info',
};

/**
 * ConnectionManagerImpl manages MCP server discovery, configuration, and connection lifecycle
 *
 * This implementation automatically detects the embedded MCP server location within the CLI package,
 * generates configuration files with correct server paths, and manages server processes.
 */
export class ConnectionManagerImpl implements ConnectionManager {
  private config: MCPConfig;
  private connectionStatus: ConnectionStatus;
  private serverProcess: ChildProcess | null = null;
  private configPath: string;

  constructor(configPath?: string) {
    this.config = { ...DEFAULT_MCP_CONFIG };
    this.configPath = configPath || join(process.cwd(), '.lanonasis', 'mcp-config.json');
    this.connectionStatus = {
      isConnected: false,
      connectionAttempts: 0,
    };
  }

  /**
   * Initialize the connection manager by loading persisted configuration
   */
  async init(): Promise<void> {
    await this.loadConfig();
  }

  /**
   * Connect to the local embedded MCP server
   */
  async connectLocal(): Promise<ConnectionResult> {
    try {
      // Load persisted configuration first
      await this.loadConfig();

      // First, try to detect the server path
      const configuredPath = this.config.localServerPath?.trim();
      const serverPath = configuredPath || (await this.detectServerPath());
      if (!serverPath) {
        return {
          success: false,
          error: 'Could not detect local MCP server path',
          suggestions: [
            'Ensure the CLI package is properly installed',
            'Check that the MCP server files are present',
            'Try running: lanonasis init',
          ],
        };
      }

      // Update configuration with detected path
      this.config.localServerPath = serverPath;
      await this.saveConfig();

      // Start the server if not already running
      if (!this.isServerRunning()) {
        const serverInstance = await this.startLocalServer();
        this.connectionStatus.serverInstance = serverInstance;
      }

      // Verify the connection
      const isConnected = await this.verifyConnection(serverPath);
      if (isConnected) {
        this.connectionStatus.isConnected = true;
        this.connectionStatus.lastConnected = new Date();
        this.connectionStatus.connectionAttempts++;

        return {
          success: true,
          serverPath,
        };
      } else {
        this.connectionStatus.connectionAttempts++;
        return {
          success: false,
          error: 'Failed to verify MCP server connection',
          suggestions: [
            'Check server logs for errors',
            'Ensure no other process is using the port',
            'Try restarting the CLI',
          ],
        };
      }
    } catch (error) {
      this.connectionStatus.connectionAttempts++;
      this.connectionStatus.lastError = error instanceof Error ? error.message : String(error);

      return {
        success: false,
        error: `Connection failed: ${error instanceof Error ? error.message : String(error)}`,
        suggestions: [
          'Check your network connection',
          'Verify the MCP server is installed correctly',
          'Try running: lanonasis mcp diagnose',
        ],
      };
    }
  }

  /**
   * Automatically configure the local MCP server with correct paths
   */
  async autoConfigureLocalServer(): Promise<ConfigResult> {
    try {
      const serverPath = await this.detectServerPath();
      if (!serverPath) {
        return {
          success: false,
          error: 'Could not detect MCP server path for auto-configuration',
        };
      }

      // Update configuration
      this.config.localServerPath = serverPath;

      // Ensure config directory exists
      await fs.mkdir(dirname(this.configPath), { recursive: true });

      // Save configuration
      await this.saveConfig();

      return {
        success: true,
        configPath: this.configPath,
        serverPath,
      };
    } catch (error) {
      return {
        success: false,
        error: `Auto-configuration failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Detect the embedded MCP server path within the CLI package
   */
  async detectServerPath(): Promise<string | null> {
    try {
      // Get the current module directory
      const currentDir = dirname(fileURLToPath(import.meta.url));

      // Common paths to check for the MCP server
      const candidatePaths = [
        // Relative to current CLI source
        resolve(currentDir, '../../mcp-server-entry.js'),
        resolve(currentDir, '../../../dist/mcp-server-entry.js'),

        // Relative to CLI package root
        resolve(currentDir, '../../../mcp-server-entry.js'),
        resolve(currentDir, '../../dist/mcp-server-entry.js'),

        // In node_modules (if installed as dependency)
        resolve(process.cwd(), 'node_modules/@lanonasis/cli/dist/mcp-server-entry.js'),

        // Global installation paths
        resolve(process.cwd(), 'dist/mcp-server-entry.js'),

        // Development paths
        resolve(process.cwd(), 'cli/dist/mcp-server-entry.js'),
        resolve(process.cwd(), '../cli/dist/mcp-server-entry.js'),
      ];

      // Check each candidate path
      for (const candidatePath of candidatePaths) {
        try {
          await fs.access(candidatePath);
          // Verify it's actually the MCP server by checking file content
          const content = await fs.readFile(candidatePath, 'utf-8');
          if (content.includes('mcp') || content.includes('server')) {
            return candidatePath;
          }
        } catch {
          // Path doesn't exist or isn't accessible, continue
        }
      }

      return null;
    } catch (error) {
      console.error('Error detecting server path:', error);
      return null;
    }
  }

  /**
   * Start the local MCP server process
   */
  async startLocalServer(): Promise<ServerInstance> {
    if (!this.config.localServerPath) {
      throw new Error('No local server path configured');
    }

    return new Promise((resolve, reject) => {
      const serverProcess = spawn('node', [this.config.localServerPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          PORT: this.config.serverPort?.toString() || '3000',
          LOG_LEVEL: this.config.logLevel,
        },
      });

      const serverInstance: ServerInstance = {
        pid: serverProcess.pid!,
        port: this.config.serverPort || 3000,
        status: 'starting',
        startTime: new Date(),
        logPath: join(dirname(this.configPath), 'mcp-server.log'),
      };

      // Set up logging
      const logStream = createWriteStream(serverInstance.logPath, { flags: 'a' });
      serverProcess.stdout?.pipe(logStream);
      serverProcess.stderr?.pipe(logStream);

      // Handle server startup
      const startupTimeout = setTimeout(() => {
        serverInstance.status = 'error';
        reject(new Error('Server startup timeout'));
      }, this.config.connectionTimeout);

      serverProcess.on('spawn', () => {
        clearTimeout(startupTimeout);
        serverInstance.status = 'running';
        this.serverProcess = serverProcess;
        resolve(serverInstance);
      });

      serverProcess.on('error', (error) => {
        clearTimeout(startupTimeout);
        serverInstance.status = 'error';
        reject(error);
      });

      serverProcess.on('exit', (code) => {
        serverInstance.status = code === 0 ? 'stopped' : 'error';
        this.serverProcess = null;
      });
    });
  }

  /**
   * Verify that the MCP server connection is working
   */
  async verifyConnection(serverPath: string): Promise<boolean> {
    try {
      // Simple verification - check if server path exists and is accessible
      await fs.access(serverPath);

      // If we have a running server instance, check if it's responsive
      if (this.connectionStatus.serverInstance) {
        const { status, pid } = this.connectionStatus.serverInstance;

        // Explicitly check for error/stopped states
        if (status === 'error' || status === 'stopped') {
          return false;
        }

        // Only verify process for running servers
        if (status === 'running') {
          try {
            process.kill(pid, 0); // Signal 0 checks if process exists
            return true;
          } catch {
            // Process doesn't exist despite status being 'running'
            this.connectionStatus.serverInstance.status = 'stopped';
            return false;
          }
        }

        // Starting state is not yet ready
        if (status === 'starting') {
          return false;
        }
      }

      // No server instance means we haven't started it yet
      // This is okay for initial connection attempts
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the current connection status
   */
  getConnectionStatus(): ConnectionStatus {
    return { ...this.connectionStatus };
  }

  /**
   * Stop the local MCP server if running
   */
  async stopLocalServer(): Promise<void> {
    if (this.serverProcess) {
      return new Promise((resolve) => {
        const forceKillTimeout = setTimeout(() => {
          if (this.serverProcess) {
            this.serverProcess.kill('SIGKILL');
          }
        }, 5000);

        this.serverProcess!.on('exit', () => {
          clearTimeout(forceKillTimeout);
          this.serverProcess = null;
          if (this.connectionStatus.serverInstance) {
            this.connectionStatus.serverInstance.status = 'stopped';
          }
          this.connectionStatus.isConnected = false;
          resolve();
        });

        this.serverProcess!.kill('SIGTERM');
      });
    }
  }

  /**
   * Get the current MCP configuration
   */
  getConfig(): MCPConfig {
    return { ...this.config };
  }

  /**
   * Update the MCP configuration
   */
  async updateConfig(config: Partial<MCPConfig>): Promise<void> {
    this.config = { ...this.config, ...config };
    await this.saveConfig();
  }

  /**
   * Check if the server is currently running
   */
  private isServerRunning(): boolean {
    return (
      this.serverProcess !== null && this.connectionStatus.serverInstance?.status === 'running'
    );
  }

  /**
   * Save the current configuration to disk
   */
  private async saveConfig(): Promise<void> {
    try {
      await fs.mkdir(dirname(this.configPath), { recursive: true });
      await fs.writeFile(this.configPath, JSON.stringify(this.config, null, 2));
    } catch (error) {
      throw new Error(
        `Failed to save configuration: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Load configuration from disk
   */
  private async loadConfig(): Promise<void> {
    try {
      const configData = await fs.readFile(this.configPath, 'utf-8');
      const loadedConfig = JSON.parse(configData);
      this.config = { ...DEFAULT_MCP_CONFIG, ...loadedConfig };
    } catch {
      // Config file doesn't exist or is invalid, use defaults
      this.config = { ...DEFAULT_MCP_CONFIG };
    }
  }
}

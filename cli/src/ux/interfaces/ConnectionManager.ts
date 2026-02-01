/**
 * Connection Manager Interface
 *
 * Manages MCP server discovery, configuration, and connection lifecycle
 * for CLI UX improvements as specified in the design document.
 */

export interface ConnectionResult {
  success: boolean;
  serverPath?: string;
  error?: string;
  suggestions?: string[];
}

export interface ConfigResult {
  success: boolean;
  configPath?: string;
  serverPath?: string;
  error?: string;
}

export interface ServerInstance {
  pid: number;
  port: number;
  status: 'starting' | 'running' | 'stopped' | 'error';
  startTime: Date;
  logPath: string;
}

export interface ConnectionStatus {
  isConnected: boolean;
  serverPath?: string;
  serverInstance?: ServerInstance;
  lastConnected?: Date;
  connectionAttempts: number;
  lastError?: string;
}

export interface MCPConfig {
  localServerPath: string;
  serverPort?: number;
  autoStart: boolean;
  connectionTimeout: number;
  retryAttempts: number;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
}

/**
 * ConnectionManager manages MCP server discovery, configuration, and connection lifecycle
 *
 * Key Methods:
 * - connectLocal(): Connect to the local embedded MCP server
 * - autoConfigureLocalServer(): Automatically configure server paths
 * - detectServerPath(): Find the embedded MCP server location
 * - startLocalServer(): Start the server process automatically
 * - verifyConnection(): Test server connectivity and functionality
 * - getConnectionStatus(): Get current connection state
 *
 * Implementation Strategy:
 * - Automatically detect embedded MCP server location within CLI package
 * - Generate configuration files with correct server paths
 * - Start server processes automatically when needed
 * - Implement health checks and connection verification
 */
export interface ConnectionManager {
  /**
   * Initialize the connection manager by loading persisted configuration
   * @returns Promise that resolves when initialization is complete
   */
  init(): Promise<void>;

  /**
   * Connect to the local embedded MCP server
   * @returns Promise that resolves to connection result
   */
  connectLocal(): Promise<ConnectionResult>;

  /**
   * Automatically configure the local MCP server with correct paths
   * @returns Promise that resolves to configuration result
   */
  autoConfigureLocalServer(): Promise<ConfigResult>;

  /**
   * Detect the embedded MCP server path within the CLI package
   * @returns Promise that resolves to server path or null if not found
   */
  detectServerPath(): Promise<string | null>;

  /**
   * Start the local MCP server process
   * @returns Promise that resolves to server instance
   */
  startLocalServer(): Promise<ServerInstance>;

  /**
   * Verify that the MCP server connection is working
   * @param serverPath Path to the server to verify
   * @returns Promise that resolves to true if connection is valid
   */
  verifyConnection(serverPath: string): Promise<boolean>;

  /**
   * Get the current connection status
   * @returns Current connection status information
   */
  getConnectionStatus(): ConnectionStatus;

  /**
   * Stop the local MCP server if running
   * @returns Promise that resolves when server is stopped
   */
  stopLocalServer(): Promise<void>;

  /**
   * Get the current MCP configuration
   * @returns Current MCP configuration
   */
  getConfig(): MCPConfig;

  /**
   * Update the MCP configuration
   * @param config New configuration to apply
   * @returns Promise that resolves when configuration is updated
   */
  updateConfig(config: Partial<MCPConfig>): Promise<void>;
}

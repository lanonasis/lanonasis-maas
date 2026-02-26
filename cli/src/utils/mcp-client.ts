import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import chalk from 'chalk';
import { CLIConfig } from './config.js';
import * as fs from 'fs';
import { EventSource } from 'eventsource';
import WebSocket from 'ws';


interface MCPConnectionOptions {
  serverPath?: string;
  serverUrl?: string;
  useRemote?: boolean;
  useWebSocket?: boolean;
  connectionMode?: 'local' | 'remote' | 'websocket';
  localArgs?: string[]; // extra args for stdio-friendly servers (e.g., --stdio)
}

/**
 * Interface for MCP tool arguments
 */
interface MCPToolArgs {
  [key: string]: unknown;
}

/**
 * Interface for MCP tool response
 */
export interface MCPToolResponse {
  result?: unknown;
  error?: {
    code: number;
    message: string;
  };
  // Memory-related fields for tool responses
  id?: string;
  title?: string;
  memory_type?: string;
  // For array-like responses
  length?: number;
  forEach?: (callback: (item: unknown, index: number) => void) => void;
  // For generic responses
  code?: number;
  message?: string;
  response?: unknown;
}

/**
 * Interface for remote tool mapping configuration
 */
interface RemoteToolMapping {
  method: string;
  endpoint: string;
  transform?: (args: MCPToolArgs) => Record<string, unknown>;
}

/**
 * Interface for MCP WebSocket messages
 */
export interface MCPWebSocketMessage {
  id: number;
  method?: string;
  params?: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

type AuthSource = 'token' | 'vendor_key' | 'env';

interface ResolvedAuth {
  value: string;
  source: AuthSource;
}

export class MCPClient {
  private client: Client | null = null;
  private config: CLIConfig;
  private isConnected: boolean = false;
  private sseConnection: EventSource | null = null;
  private wsConnection: WebSocket | null = null;
  private retryAttempts: number = 0;
  private maxRetries: number = 3;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private healthCheckTimeout: NodeJS.Timeout | null = null;
  private wsReconnectTimeout: NodeJS.Timeout | null = null;
  private connectionStartTime: number = 0;
  private lastHealthCheck: Date | null = null;
  private activeConnectionMode: string = 'local'; // Track actual connection mode

  constructor() {
    this.config = new CLIConfig();
  }

  /**
   * Overrides the configuration directory used by the underlying CLI config.
   * Useful for tests that need isolated config state.
   */
  setConfigDirectory(configDir: string): void {
    this.config.setConfigDirectory(configDir);
  }

  /**
   * Returns the current config file path. Primarily used for test introspection.
   */
  getConfigPath(): string {
    return this.config.getConfigPath();
  }

  /**
   * Helper for tests to seed authentication tokens without accessing internals.
   */
  async setTokenForTesting(token: string): Promise<void> {
    await this.config.setToken(token);
  }

  /**
   * Helper for tests to seed vendor keys without accessing internals.
   */
  async setVendorKeyForTesting(vendorKey: string): Promise<void> {
    await this.config.setVendorKey(vendorKey);
  }

  /**
   * Initialize the MCP client configuration
   */
  async init(): Promise<void> {
    await this.config.init();
  }
  /**
   * Connect to MCP server with retry logic
   */
  async connect(options: MCPConnectionOptions = {}): Promise<boolean> {
    this.retryAttempts = 0;
    return this.connectWithRetry(options);
  }

  /**
   * Persist successful connection mode and URLs to config for future use
   */
  private async persistConnectionState(mode: string, url?: string): Promise<void> {
    try {
      // Save the successful connection mode as preference
      this.config.set('mcpConnectionMode', mode);
      this.config.set('mcpPreference', mode);
      this.config.set('mcpUseRemote', mode === 'remote' || mode === 'websocket');

      // Save the specific URL that worked
      if (url) {
        if (mode === 'websocket') {
          this.config.set('mcpWebSocketUrl', url);
        } else if (mode === 'remote') {
          this.config.set('mcpServerUrl', url);
        } else if (mode === 'local') {
          this.config.set('mcpServerPath', url);
        }
      }

      // Save to disk
      await this.config.save();
    } catch (error) {
      // Don't fail connection if persistence fails, just log
      if (process.env.CLI_VERBOSE === 'true') {
        console.warn('⚠️  Failed to persist connection state:', error);
      }
    }
  }

  /**
   * Connect to MCP server with retry logic and exponential backoff
   */
  private async connectWithRetry(options: MCPConnectionOptions = {}): Promise<boolean> {
    try {
      this.connectionStartTime = Date.now();

      // Initialize config if not already done
      await this.init();

      // Validate authentication before attempting connection
      await this.validateAuthBeforeConnect();

      // Determine connection mode with clear precedence and safe defaults
      // 1) explicit option
      // 2) explicit flags
      // 3) configured preference
      // 4) default to 'websocket' (production-ready pm2 mcp-core)
      const configuredMode = this.config.get<string>('mcpConnectionMode');
      const mcpPreference = this.config.get<string>('mcpPreference');
      const preferRemote = this.config.get<boolean>('mcpUseRemote');
      const connectionMode = options.connectionMode
        ?? (options.useWebSocket ? 'websocket' : undefined)
        ?? (options.useRemote ? 'remote' : undefined)
        ?? configuredMode
        ?? mcpPreference
        ?? (preferRemote ? 'remote' : 'websocket');

      let wsUrl: string;
      let serverUrl: string;
      let serverPath: string;

      switch (connectionMode) {
        case 'websocket': {
          // WebSocket connection mode for enterprise users
          const wsUrlValue = options.serverUrl ??
            this.config.get<string>('mcpWebSocketUrl') ??
            this.config.getMCPServerUrl() ??
            'wss://mcp.lanonasis.com/ws';
          wsUrl = wsUrlValue;

          if (this.retryAttempts === 0) {
            console.log(chalk.cyan(`Connecting to WebSocket MCP server at ${wsUrl}...`));
          } else {
            console.log(chalk.yellow(`Retry ${this.retryAttempts}/${this.maxRetries}: Connecting to WebSocket MCP server...`));
          }

          // Initialize WebSocket connection
          await this.initializeWebSocket(wsUrl);

          this.isConnected = true;
          this.activeConnectionMode = 'websocket';
          this.retryAttempts = 0;

          // Persist successful connection state
          await this.persistConnectionState('websocket', wsUrl);

          this.startHealthMonitoring();
          return true;
        }

        case 'remote': {
          // For remote MCP, we'll use the REST API with MCP-style interface
          const serverUrlValue = options.serverUrl ??
            this.config.get<string>('mcpServerUrl') ??
            this.config.getMCPRestUrl() ??
            'https://mcp.lanonasis.com/api/v1';
          serverUrl = serverUrlValue;

          if (this.retryAttempts === 0) {
            console.log(chalk.cyan(`Connecting to remote MCP server at ${serverUrl}...`));
          } else {
            console.log(chalk.yellow(`Retry ${this.retryAttempts}/${this.maxRetries}: Connecting to remote MCP server...`));
          }

          // Verify remote health before establishing SSE
          await this.checkRemoteHealth(serverUrl);

          // Initialize SSE connection for real-time updates
          await this.initializeSSE(serverUrl);

          this.isConnected = true;
          this.activeConnectionMode = 'remote';
          this.retryAttempts = 0;

          // Persist successful connection state
          await this.persistConnectionState('remote', serverUrl);

          this.startHealthMonitoring();
          return true;
        }

        case 'local': {
          // Local MCP server connection requires explicit path via option or config
          serverPath = options.serverPath ?? this.config.get<string>('mcpServerPath');
          if (!serverPath) {
            console.log(chalk.yellow('⚠️  No local MCP server path configured.'));
            console.log(chalk.cyan('💡 Prefer using WebSocket mode (default). Or configure a local path via:'));
            console.log(chalk.cyan('   lanonasis config set mcpServerPath /absolute/path/to/server.js'));
            throw new Error('Local MCP server path not provided');
          }
          // Check if the server file exists
          if (!fs.existsSync(serverPath)) {
            console.log(chalk.yellow(`⚠️  Local MCP server not found at ${serverPath}`));
            console.log(chalk.cyan('💡 For remote connection, use: lanonasis mcp connect --mode websocket --url wss://mcp.lanonasis.com/ws'));
            throw new Error(`MCP server not found at ${serverPath}`);
          }

          if (this.retryAttempts === 0) {
            console.log(chalk.cyan(`Connecting to local MCP server at ${serverPath}...`));
          } else {
            console.log(chalk.yellow(`Retry ${this.retryAttempts}/${this.maxRetries}: Connecting to local MCP server...`));
          }

          // Allow passing extra args to local server (e.g., --stdio) via options or env/config
          // Precedence: options.localArgs -> env.MCP_LOCAL_SERVER_ARGS -> config.mcpLocalArgs -> none
          const envArgs = (process.env.MCP_LOCAL_SERVER_ARGS || '')
            .split(' ')
            .map(s => s.trim())
            .filter(Boolean);
          const configArgs = (this.config.get<string[]>('mcpLocalArgs') || []) as string[];
          const extraArgs = (options.localArgs && options.localArgs.length > 0)
            ? options.localArgs
            : (envArgs.length > 0 ? envArgs : configArgs);

          const args = [serverPath, ...extraArgs];

          const localTransport = new StdioClientTransport({
            command: 'node',
            args
          });

          this.client = new Client({
            name: '@lanonasis/cli',
            version: '3.0.1'
          });

          await this.client.connect(localTransport);

          this.isConnected = true;
          this.activeConnectionMode = 'local';
          this.retryAttempts = 0;

          // Persist successful connection state
          await this.persistConnectionState('local', serverPath);

          console.log(chalk.green('✓ Connected to MCP server'));
          this.startHealthMonitoring();
          return true;
        }

        default: {
          // Safety: if we reach default, fall back to remote (HTTP) rather than brittle local
          const serverUrlValue = options.serverUrl
            ?? this.config.get<string>('mcpServerUrl')
            ?? this.config.getMCPRestUrl()
            ?? 'https://mcp.lanonasis.com/api/v1';
          serverUrl = serverUrlValue;
          console.log(chalk.yellow(`Unknown connection mode '${String(connectionMode)}', falling back to remote at ${serverUrl}`));
          await this.initializeSSE(serverUrl);
          this.isConnected = true;
          this.activeConnectionMode = 'remote';
          this.retryAttempts = 0;

          // Persist successful connection state
          await this.persistConnectionState('remote', serverUrl);

          this.startHealthMonitoring();
          return true;
        }
      }
    } catch (error) {
      return this.handleConnectionFailure(error, options);
    }
  }

  /**
   * Handle connection failures with retry logic and specific error messages
   */
  private async handleConnectionFailure(error: unknown, options: MCPConnectionOptions): Promise<boolean> {
    // Check if this is an authentication error (don't retry these)
    if (this.isAuthenticationError(error)) {
      const authMsg = (error as { message?: string })?.message ?? '';
      console.error(chalk.red('Authentication failed:'), authMsg);
      this.provideAuthenticationGuidance(error);
      this.isConnected = false;
      return false;
    }

    this.retryAttempts++;

    if (this.retryAttempts > this.maxRetries) {
      console.error(chalk.red(`Failed to connect after ${this.maxRetries + 1} attempts`));
      this.provideNetworkTroubleshootingGuidance(error);
      this.isConnected = false;
      return false;
    }

    // For network errors, retry with exponential backoff
    const delay = await this.exponentialBackoff(this.retryAttempts);
    console.log(chalk.yellow(`Network error, retrying in ${delay}ms... (${this.retryAttempts}/${this.maxRetries})`));
    const message = (error as { message?: string })?.message ?? String(error);
    console.log(chalk.gray(`Error: ${message}`));

    await new Promise(resolve => setTimeout(resolve, delay));
    return this.connectWithRetry(options);
  }

  /**
   * Check if error is authentication-related
   */
  private isAuthenticationError(error: unknown): boolean {
    const errorMessage = (error as { message?: string })?.message?.toLowerCase() || '';

    return errorMessage.includes('authentication_required') ||
      errorMessage.includes('authentication_invalid') ||
      errorMessage.includes('unauthorized') ||
      errorMessage.includes('invalid token') ||
      errorMessage.includes('token is invalid') ||
      errorMessage.includes('401') ||
      errorMessage.includes('403') ||
      (((error as { response?: { status?: number } }).response?.status ?? 0) >= 401 &&
        ((error as { response?: { status?: number } }).response?.status ?? 0) <= 403);
  }

  /**
   * Provide authentication-specific guidance
   */
  private provideAuthenticationGuidance(error: unknown): void {
    console.log(chalk.yellow('\n🔐 Authentication Issue Detected:'));

    const msg = (error as { message?: string })?.message ?? '';
    if (msg.includes('AUTHENTICATION_REQUIRED')) {
      console.log(chalk.cyan('• No credentials found. Run: lanonasis auth login'));
      console.log(chalk.cyan('• Or set a vendor key: lanonasis auth login --vendor-key <your-key>'));
    } else if (msg.includes('AUTHENTICATION_INVALID')) {
      console.log(chalk.cyan('• Invalid credentials. Confirm the vendor key matches your dashboard value'));
      console.log(chalk.cyan('• Try: lanonasis auth logout && lanonasis auth login'));
    } else if (msg.includes('expired')) {
      console.log(chalk.cyan('• Token expired. Re-authenticate: lanonasis auth login'));
      console.log(chalk.cyan('• Or refresh: lanonasis auth refresh (if available)'));
    } else {
      console.log(chalk.cyan('• Check authentication status: lanonasis auth status'));
      console.log(chalk.cyan('• Re-authenticate: lanonasis auth login'));
      console.log(chalk.cyan('• Verify vendor key: lanonasis auth login --vendor-key <your-key>'));
    }
  }

  /**
   * Provide network troubleshooting guidance
   */
  private provideNetworkTroubleshootingGuidance(_error: unknown): void {
    console.log(chalk.yellow('\n🌐 Network Issue Detected:'));

    const msg = (_error as { message?: string })?.message ?? '';
    if (msg.includes('ECONNREFUSED') || msg.includes('connect ECONNREFUSED')) {
      console.log(chalk.cyan('• Connection refused. Service may be down:'));
      console.log(chalk.cyan('  - For remote: Check https://mcp.lanonasis.com/health'));
      console.log(chalk.cyan('  - For WebSocket: Check wss://mcp.lanonasis.com/ws'));
      console.log(chalk.cyan('  - For local: Install local MCP server'));
    } else if (msg.includes('timeout') || msg.includes('ETIMEDOUT')) {
      console.log(chalk.cyan('• Connection timeout. Check network:'));
      console.log(chalk.cyan('  - Verify internet connectivity'));
      console.log(chalk.cyan('  - Check firewall settings'));
      console.log(chalk.cyan('  - Try different connection mode: --mode remote'));
    } else if (msg.includes('ENOTFOUND') || msg.includes('getaddrinfo')) {
      console.log(chalk.cyan('• DNS resolution failed:'));
      console.log(chalk.cyan('  - Check DNS settings'));
      console.log(chalk.cyan('  - Verify server URL is correct'));
      console.log(chalk.cyan('  - Try using IP address instead of hostname'));
    } else if (msg.includes('certificate') || msg.includes('SSL') || msg.includes('TLS')) {
      console.log(chalk.cyan('• SSL/TLS certificate issue:'));
      console.log(chalk.cyan('  - Check system time and date'));
      console.log(chalk.cyan('  - Update CA certificates'));
      console.log(chalk.cyan('  - Try different connection mode'));
    } else {
      console.log(chalk.cyan('• General network error:'));
      console.log(chalk.cyan('  - Check server status'));
      console.log(chalk.cyan('  - Verify network connectivity'));
      console.log(chalk.cyan('  - Try: lanonasis mcp diagnose (when available)'));
    }
  }

  /**
   * Calculate exponential backoff delay with jitter
   */
  private async exponentialBackoff(attempt: number): Promise<number> {
    // Base delay of 1 second, exponentially increasing
    const baseDelay = 1000;
    const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);

    // Cap at 10 seconds maximum
    const cappedDelay = Math.min(exponentialDelay, 10000);

    // Add jitter (±25% randomization) to avoid thundering herd
    const jitter = cappedDelay * 0.25 * (Math.random() - 0.5);

    return Math.round(cappedDelay + jitter);
  }

  private async resolveAuthCredential(): Promise<ResolvedAuth | null> {
    const authMethod = String(this.config.get<string>('authMethod') || '').toLowerCase();
    const token = this.config.get<string>('token');
    const vendorKey = await this.config.getVendorKeyAsync();

    if (authMethod === 'vendor_key' && typeof vendorKey === 'string' && vendorKey.trim().length > 0) {
      return { value: vendorKey.trim(), source: 'vendor_key' };
    }

    if (
      (authMethod === 'oauth' || authMethod === 'oauth2' || authMethod === 'jwt') &&
      typeof token === 'string' &&
      token.trim().length > 0
    ) {
      return { value: token.trim(), source: 'token' };
    }

    if (typeof token === 'string' && token.trim().length > 0) {
      return { value: token.trim(), source: 'token' };
    }

    if (typeof vendorKey === 'string' && vendorKey.trim().length > 0) {
      return { value: vendorKey.trim(), source: 'vendor_key' };
    }

    const envKey = process.env.LANONASIS_API_KEY;
    if (typeof envKey === 'string' && envKey.trim().length > 0) {
      return { value: envKey.trim(), source: 'env' };
    }

    return null;
  }

  private buildAuthHeaders(auth: ResolvedAuth): Record<string, string> {
    const headers: Record<string, string> = {};
    const value = auth.value.trim();

    if (!value) {
      return headers;
    }

    if (auth.source === 'vendor_key' || value.startsWith('lano_')) {
      headers['X-API-Key'] = value;
      headers['X-Auth-Method'] = 'vendor_key';
      headers['X-Project-Scope'] = 'lanonasis-maas';
      return headers;
    }

    if (value.toLowerCase().startsWith('bearer ')) {
      headers['Authorization'] = value;
      headers['X-Auth-Method'] = 'jwt';
      headers['X-Project-Scope'] = 'lanonasis-maas';
      return headers;
    }

    headers['Authorization'] = `Bearer ${value}`;
    headers['X-Auth-Method'] = 'jwt';
    headers['X-Project-Scope'] = 'lanonasis-maas';
    return headers;
  }

  /**
   * Validate authentication credentials before attempting MCP connection
   */
  private async validateAuthBeforeConnect(): Promise<void> {
    const auth = await this.resolveAuthCredential();
    if (!auth) {
      throw new Error('AUTHENTICATION_REQUIRED: No authentication credentials found. Run "lanonasis auth login" first.');
    }

    await this.config.refreshTokenIfNeeded();

    const verification = await this.config.verifyCurrentCredentialsWithServer();
    if (!verification.valid) {
      const reason = verification.reason || 'Credential verification failed';
      if (verification.method === 'none') {
        throw new Error(`AUTHENTICATION_REQUIRED: ${reason}`);
      }
      throw new Error(`AUTHENTICATION_INVALID: ${reason}`);
    }
  }

  /**
   * Validate and refresh token if needed
   */
  private async validateAndRefreshToken(token: string): Promise<void> {
    try {
      // Try to decode the JWT token to check expiration
      const tokenParts = token.split('.');
      if (tokenParts.length === 3) {
        const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
        const currentTime = Math.floor(Date.now() / 1000);

        // Check if token is expired or expires within 5 minutes
        if (payload.exp && payload.exp < currentTime + 300) {
          console.log(chalk.yellow('Token is expired or expiring soon, attempting refresh...'));
          await this.refreshTokenIfNeeded();
        }
      }
    } catch {
      // If we can't decode the token, try to validate it with the server
      await this.validateTokenWithServer(token);
    }
  }

  /**
   * Refresh token if needed
   */
  private async refreshTokenIfNeeded(): Promise<void> {
    const refreshToken = this.config.get<string>('refreshToken');

    if (!refreshToken) {
      throw new Error('No refresh token available. Please re-authenticate.');
    }

    try {
      const axios = (await import('axios')).default;
      const authUrl = this.config.get<string>('authUrl') ?? 'https://api.lanonasis.com';

      const response = await axios.post(`${authUrl}/auth/refresh`, {
        refresh_token: refreshToken
      }, {
        timeout: 10000
      });

      if (response.data.access_token) {
        await this.config.setAndSave('token', response.data.access_token);
        console.log(chalk.green('✓ Token refreshed successfully'));
      }
    } catch {
      throw new Error('Failed to refresh token. Please re-authenticate.');
    }
  }

  /**
   * Validate token with server
   */
  private async validateTokenWithServer(token: string): Promise<void> {
    try {
      const axios = (await import('axios')).default;
      const authUrl = this.config.get<string>('authUrl') ?? 'https://api.lanonasis.com';

      await axios.get(`${authUrl}/auth/validate`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-api-key': String(token)
        },
        timeout: 10000
      });
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } }).response?.status;
      if (status === 401 || status === 403) {
        throw new Error('Token is invalid or expired. Please re-authenticate.');
      }
      const msg = (error as { message?: string })?.message || 'Unknown error';
      throw new Error(`Token validation failed: ${msg}`);
    }
  }

  /**
   * Initialize SSE connection for real-time updates
   */
  private async initializeSSE(serverUrl: string): Promise<void> {
    // Use the proper SSE endpoint from config
    const sseUrl = this.config.getMCPSSEUrl() ?? `${serverUrl}/events`;
    const auth = await this.resolveAuthCredential();

    if (auth) {
      // EventSource doesn't support headers directly, append token to URL
      this.sseConnection = new EventSource(`${sseUrl}?token=${encodeURIComponent(auth.value)}`);

      this.sseConnection.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          // Only show SSE updates in verbose mode to avoid interfering with interactive prompts
          if (process.env.CLI_VERBOSE === 'true') {
            console.log(chalk.blue('📡 Real-time update:'), data.type);
          }
        } catch {
          // Ignore parse errors
        }
      };

      this.sseConnection.onerror = () => {
        if (process.env.CLI_VERBOSE === 'true') {
          console.error(chalk.yellow('⚠️  SSE connection error (stream disabled for this session)'));
        }
        this.sseConnection?.close();
        this.sseConnection = null;
      };
    }
  }

  /**
   * Initialize WebSocket connection for enterprise MCP server
   */
  private async initializeWebSocket(wsUrl: string): Promise<void> {
    const auth = await this.resolveAuthCredential();

    if (!auth) {
      throw new Error('API key required for WebSocket mode. Set LANONASIS_API_KEY or login first.');
    }

    const wsHeaders = this.buildAuthHeaders(auth);

    return new Promise((resolve, reject) => {
      try {
        // Close existing connection if any
        if (this.wsConnection) {
          this.wsConnection.close();
          this.wsConnection = null;
        }

        // Create new WebSocket connection with authentication
        this.wsConnection = new WebSocket(wsUrl, [], {
          headers: wsHeaders
        });

        this.wsConnection.on('open', () => {
          console.log(chalk.green('✅ Connected to MCP WebSocket server'));

          // Send initialization message
          this.sendWebSocketMessage({
            id: 1,
            method: 'initialize',
            params: {
              protocolVersion: '2024-11-05',
              capabilities: {
                tools: ['memory_management', 'workflow_orchestration']
              },
              clientInfo: {
                name: '@lanonasis/cli',
                version: '1.1.0'
              }
            }
          });

          resolve();
        });

        this.wsConnection.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());
            // Only show WebSocket messages in verbose mode to avoid interfering with interactive prompts
            if (process.env.CLI_VERBOSE === 'true') {
              const messageId = message.id ?? 'event';
              const messageType = message.method
                || (message.error ? 'error' : undefined)
                || (message.result ? 'result' : undefined)
                || 'response';
              console.log(chalk.blue('📡 MCP message:'), messageId, messageType);
            }
          } catch (error) {
            if (process.env.CLI_VERBOSE === 'true') {
              console.error('Failed to parse WebSocket message:', error);
            }
          }
        });

        this.wsConnection.on('error', (error) => {
          console.error(chalk.red('WebSocket error:'), error);
          reject(error);
        });

        this.wsConnection.on('close', (code, reason) => {
          console.log(chalk.yellow(`WebSocket connection closed (${code}): ${reason}`));

          // Auto-reconnect after delay
          if (this.wsReconnectTimeout) {
            clearTimeout(this.wsReconnectTimeout);
          }
          this.wsReconnectTimeout = setTimeout(() => {
            if (this.isConnected && process.env.NODE_ENV !== 'test') {
              console.log(chalk.blue('🔄 Attempting to reconnect to WebSocket...'));
              this.initializeWebSocket(wsUrl).catch(err => {
                console.error('Failed to reconnect:', err);
              });
            }
          }, 5000);
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Send a message over the WebSocket connection
   */
  private sendWebSocketMessage(message: MCPWebSocketMessage): void {
    if (!this.wsConnection) {
      throw new Error('WebSocket not connected');
    }

    this.wsConnection.send(JSON.stringify(message));
  }

  /**
   * Start health monitoring for the connection
   */
  private startHealthMonitoring(): void {
    // Clear any existing health check interval
    this.stopHealthMonitoring();

    // Start health monitoring every 30 seconds
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, 30000);

    // Perform initial health check
    const initialDelay = process.env.NODE_ENV === 'test' ? 50 : 5000;
    this.healthCheckTimeout = setTimeout(() => this.performHealthCheck(), initialDelay);
  }

  /**
   * Stop health monitoring
   */
  private stopHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    if (this.healthCheckTimeout) {
      clearTimeout(this.healthCheckTimeout);
      this.healthCheckTimeout = null;
    }
  }

  /**
   * Perform a health check on the current connection
   */
  private async performHealthCheck(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      this.lastHealthCheck = new Date();
      const connectionMode = this.activeConnectionMode || 'remote';

      switch (connectionMode) {
        case 'websocket':
          await this.checkWebSocketHealth();
          break;
        case 'remote':
          await this.checkRemoteHealth();
          break;
        default:
          await this.checkLocalHealth();
          break;
      }
    } catch {
      const connectionMode = this.activeConnectionMode || 'remote';
      console.log(chalk.yellow(`⚠️  ${connectionMode} connection health check failed, attempting reconnection...`));
      await this.handleHealthCheckFailure();
    }
  }

  /**
   * Check WebSocket connection health
   */
  private async checkWebSocketHealth(): Promise<void> {
    if (!this.wsConnection || this.wsConnection.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket connection not open');
    }

    // Send a ping message to check connectivity
    this.sendWebSocketMessage({
      id: Date.now(),
      method: 'ping',
      params: {}
    });
  }

  /**
   * Check remote connection health
   */
  private async checkRemoteHealth(serverUrl?: string): Promise<void> {
    const apiUrl = serverUrl ?? this.config.getMCPRestUrl() ?? 'https://mcp.lanonasis.com/api/v1';
    const auth = await this.resolveAuthCredential();

    if (!auth) {
      throw new Error('No authentication token available');
    }

    try {
      const axios = (await import('axios')).default;
      await axios.get(`${apiUrl}/health`, {
        headers: this.buildAuthHeaders(auth),
        timeout: 5000
      });
    } catch (e) {
      const msg = (e as { message?: string })?.message ?? String(e);
      throw new Error(`Remote health check failed: ${msg}`);
    }
  }

  /**
   * Check local connection health
   */
  private async checkLocalHealth(): Promise<void> {
    if (!this.client) {
      throw new Error('Local MCP client not initialized');
    }

    // Try to list tools as a health check
    try {
      await this.client.listTools();
    } catch (e) {
      const msg = (e as { message?: string })?.message ?? String(e);
      throw new Error(`Local health check failed: ${msg}`);
    }
  }

  /**
   * Handle health check failure by attempting reconnection
   */
  private async handleHealthCheckFailure(): Promise<void> {
    this.isConnected = false;
    this.stopHealthMonitoring();

    // Attempt to reconnect with current configuration
    const connectionMode = (this.activeConnectionMode || 'remote') as 'local' | 'remote' | 'websocket';
    const options: MCPConnectionOptions = {
      connectionMode
    };

    console.log(chalk.yellow(`↻ Attempting reconnection using ${connectionMode} mode...`));

    // Add specific URLs if available
    if (connectionMode === 'websocket') {
      options.serverUrl = this.config.get<string>('mcpWebSocketUrl');
    } else if (connectionMode === 'remote') {
      options.serverUrl = this.config.get<string>('mcpServerUrl');
    } else {
      options.serverPath = this.config.get<string>('mcpServerPath');
    }

    // Attempt reconnection
    const reconnected = await this.connect(options);
    if (reconnected) {
      console.log(chalk.green('✓ Reconnected to MCP server'));
    } else {
      console.log(chalk.red('✗ Failed to reconnect to MCP server'));
    }
  }

  /**
   * Disconnect from MCP server
   */
  async disconnect(): Promise<void> {
    this.stopHealthMonitoring();
    this.isConnected = false;

    if (this.client) {
      await this.client.close();
      this.client = null;
    }

    if (this.sseConnection) {
      this.sseConnection.onmessage = null;
      this.sseConnection.onerror = null;
      this.sseConnection.close();
      this.sseConnection = null;
    }

    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
    }

    if (this.wsReconnectTimeout) {
      clearTimeout(this.wsReconnectTimeout);
      this.wsReconnectTimeout = null;
    }
    this.activeConnectionMode = 'websocket'; // Reset to default
  }

  /**
   * Call an MCP tool
   */
  async callTool(toolName: string, args: MCPToolArgs): Promise<MCPToolResponse> {
    if (!this.isConnected) {
      throw new Error('Not connected to MCP server. Run "lanonasis mcp connect" first.');
    }

    const useRemote = this.shouldUseRemoteToolBridge();

    if (useRemote) {
      // Remote MCP calls are translated to REST API calls
      return await this.callRemoteTool(toolName, args);
    } else {
      // Local MCP server call
      if (!this.client) {
        throw new Error('MCP client not initialized');
      }

      try {
        const result = await this.client.callTool({
          name: toolName,
          arguments: args
        });

        // Convert the SDK result to our expected MCPToolResponse format
        return {
          result: result,
          code: 200,
          message: 'Success'
        } as MCPToolResponse;
      } catch (error) {
        throw new Error(`MCP tool call failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  /**
   * Call remote tool via REST API with MCP interface
   */
  private async callRemoteTool(toolName: string, args: MCPToolArgs): Promise<MCPToolResponse> {
    const apiUrl = this.config.getMCPRestUrl() ?? 'https://mcp.lanonasis.com/api/v1';
    const auth = await this.resolveAuthCredential();

    if (!auth) {
      throw new Error('Authentication required. Run "lanonasis auth login" first.');
    }

    // Map MCP tool names to REST API endpoints
    const toolMappings: Record<string, RemoteToolMapping> = {
      'memory_create_memory': {
        method: 'POST',
        endpoint: '/memory',
        transform: (args) => args
      },
      'memory_search_memories': {
        method: 'POST',
        endpoint: '/memory/search',
        transform: (args) => args
      },
      'memory_get_memory': {
        method: 'GET',
        endpoint: '/memory/{id}',
        transform: () => undefined
      },
      'memory_update_memory': {
        method: 'PUT',
        endpoint: '/memory/{id}',
        transform: (args) => {
          const data = { ...args };
          delete data.memory_id;
          return data;
        }
      },
      'memory_delete_memory': {
        method: 'DELETE',
        endpoint: '/memory/{id}',
        transform: () => undefined
      },
      'memory_list_memories': {
        method: 'GET',
        endpoint: '/memory',
        transform: (args) => args
      }
    };

    const mapping = toolMappings[toolName];
    if (!mapping) {
      throw new Error(`Unknown tool: ${toolName}`);
    }

    try {
      const axios = (await import('axios')).default;

      // Handle dynamic endpoint for memory operations that need ID
      let endpoint = mapping.endpoint;
      if (endpoint.includes('{id}') && args.memory_id) {
        // Ensure memory_id is treated as a string for replacement
        endpoint = endpoint.replace('{id}', String(args.memory_id));
      }

      const response = await axios({
        method: mapping.method,
        url: `${apiUrl}${endpoint}`,
        headers: {
          ...this.buildAuthHeaders(auth),
          'Content-Type': 'application/json'
        },
        data: mapping.transform ? mapping.transform(args) : undefined,
        params: mapping.method === 'GET' ? args : undefined
      });

      return response.data;
    } catch (error: unknown) {
      // Safely handle errors with type checking
      const errorObj = error as { response?: { data?: { error?: string } }; message?: string };
      const errorMsg = errorObj.response?.data?.error || (errorObj.message ?? 'Unknown error');
      throw new Error(`Remote tool call failed: ${errorMsg}`);
    }
  }

  /**
   * List available tools
   */
  async listTools(): Promise<Array<{ name: string; description: string }>> {
    if (!this.isConnected) {
      throw new Error('Not connected to MCP server');
    }

    const useRemote = this.shouldUseRemoteToolBridge();

    if (useRemote) {
      // Return hardcoded list for remote mode
      return [
        { name: 'memory_create_memory', description: 'Create a new memory entry' },
        { name: 'memory_search_memories', description: 'Search memories using semantic search' },
        { name: 'memory_get_memory', description: 'Get a specific memory by ID' },
        { name: 'memory_update_memory', description: 'Update an existing memory' },
        { name: 'memory_delete_memory', description: 'Delete a memory' },
        { name: 'memory_list_memories', description: 'List all memories with pagination' }
      ];
    } else {
      if (!this.client) {
        throw new Error('MCP client not initialized');
      }

      const tools = await this.client.listTools();
      return tools.tools.map(tool => ({
        name: tool.name,
        description: tool.description || 'No description available'
      }));
    }
  }

  /**
   * Check if connected to MCP server
   */
  isConnectedToServer(): boolean {
    return this.isConnected;
  }

  /**
   * Determine whether tool operations should use the remote REST bridge.
   * WebSocket mode uses the same bridge for tool list/call operations.
   */
  private shouldUseRemoteToolBridge(): boolean {
    if (this.activeConnectionMode === 'remote' || this.activeConnectionMode === 'websocket') {
      return true;
    }
    return this.config.get<boolean>('mcpUseRemote') ?? false;
  }

  /**
   * Get connection status details with health information
   */
  getConnectionStatus(): {
    connected: boolean;
    mode: string;
    server?: string;
    latency?: number;
    lastHealthCheck?: Date;
    connectionUptime?: number;
    failureCount: number;
  } {
    // When disconnected, show the configured preference instead of the stale activeConnectionMode
    let connectionMode = this.activeConnectionMode;
    if (!this.isConnected) {
      // Check configured preference
      const mcpPreference = this.config.get<string>('mcpPreference');
      const mcpConnectionMode = this.config.get<string>('mcpConnectionMode');
      const preferRemote = this.config.get<boolean>('mcpUseRemote');

      connectionMode = mcpConnectionMode
        ?? mcpPreference
        ?? (preferRemote ? 'remote' : 'websocket');

      // If preference is 'auto', resolve to default (websocket)
      if (connectionMode === 'auto') {
        connectionMode = 'websocket';
      }
    }

    let server: string;
    switch (connectionMode) {
      case 'websocket':
        server = this.config.get<string>('mcpWebSocketUrl') ?? 'wss://mcp.lanonasis.com/ws';
        break;
      case 'remote':
        server = this.config.get<string>('mcpServerUrl') ?? 'https://mcp.lanonasis.com/api/v1';
        break;
      default:
        server = this.config.get<string>('mcpServerPath') ?? 'local MCP server';
        break;
    }

    const connectionUptime = this.connectionStartTime > 0
      ? Math.max(Date.now() - this.connectionStartTime, this.isConnected ? 1 : 0)
      : undefined;

    return {
      connected: this.isConnected,
      mode: connectionMode,
      server,
      lastHealthCheck: this.lastHealthCheck ?? undefined,
      connectionUptime,
      failureCount: this.retryAttempts
    };
  }
}

// Singleton instance
let mcpClientInstance: MCPClient | null = null;

export function getMCPClient(): MCPClient {
  if (!mcpClientInstance) {
    mcpClientInstance = new MCPClient();
  }
  return mcpClientInstance;
}

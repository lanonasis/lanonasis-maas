import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import chalk from 'chalk';
import { CLIConfig } from './config.js';
import * as path from 'path';
import * as fs from 'fs';
import { EventSource } from 'eventsource';
import { fileURLToPath } from 'url';
import WebSocket from 'ws';


interface MCPConnectionOptions {
  serverPath?: string;
  serverUrl?: string;
  useRemote?: boolean;
  useWebSocket?: boolean;
  connectionMode?: 'local' | 'remote' | 'websocket';
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
  forEach?: (callback: (item: any, index: number) => void) => void;
  // For generic responses
  code?: number;
  message?: string;
  response?: any;
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

export class MCPClient {
  private client: Client | null = null;
  private config: CLIConfig;
  private isConnected: boolean = false;
  private sseConnection: EventSource | null = null;
  private wsConnection: WebSocket | null = null;
  private retryAttempts: number = 0;
  private maxRetries: number = 3;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private connectionStartTime: number = 0;
  private lastHealthCheck: Date | null = null;

  constructor() {
    this.config = new CLIConfig();
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
   * Connect to MCP server with retry logic and exponential backoff
   */
  private async connectWithRetry(options: MCPConnectionOptions = {}): Promise<boolean> {
    try {
      this.connectionStartTime = Date.now();
      
      // Initialize config if not already done
      await this.init();
      
      // Validate authentication before attempting connection
      await this.validateAuthBeforeConnect();
      
      // Determine connection mode with priority to explicit mode option
      // Default to 'remote' for better user experience
      const connectionMode = options.connectionMode ?? 
                            (options.useWebSocket ? 'websocket' : 
                             options.useRemote ? 'remote' : 
                             this.config.get('mcpConnectionMode') ?? 
                             this.config.get('mcpUseRemote') ? 'remote' : 'remote');
      
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
          this.retryAttempts = 0;
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
          
          // Initialize SSE connection for real-time updates
          await this.initializeSSE(serverUrl);
          
          this.isConnected = true;
          this.retryAttempts = 0;
          this.startHealthMonitoring();
          return true;
        }
          
        default: {
          // Local MCP server connection (default)
          // Prefer the CLI-bundled MCP server; fall back to configured path
          const defaultBundledServer = path.join(__dirname, '../mcp/server/lanonasis-server.js');
          const serverPathValue = options.serverPath ?? 
                      this.config.get<string>('mcpServerPath') ?? 
                      defaultBundledServer;
          serverPath = serverPathValue;
          // Check if the server file exists
          if (!fs.existsSync(serverPath)) {
            console.log(chalk.yellow(`⚠️  Local MCP server not found at ${serverPath}`));
            console.log(chalk.cyan('💡 For remote connection, use: onasis mcp connect --url wss://mcp.lanonasis.com/ws'));
            console.log(chalk.cyan('💡 Or install local server: npm install -g @lanonasis/mcp-server'));
            throw new Error(`MCP server not found at ${serverPath}`);
          }
          
          if (this.retryAttempts === 0) {
            console.log(chalk.cyan(`Connecting to local MCP server at ${serverPath}...`));
          } else {
            console.log(chalk.yellow(`Retry ${this.retryAttempts}/${this.maxRetries}: Connecting to local MCP server...`));
          }
        
          const localTransport = new StdioClientTransport({
            command: 'node',
            args: [serverPath]
          });

          this.client = new Client({
            name: '@lanonasis/cli',
            version: '3.0.1'
          });
          
          await this.client.connect(localTransport);
          
          this.isConnected = true;
          this.retryAttempts = 0;
          console.log(chalk.green('✓ Connected to MCP server'));
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
  private async handleConnectionFailure(error: any, options: MCPConnectionOptions): Promise<boolean> {
    // Check if this is an authentication error (don't retry these)
    if (this.isAuthenticationError(error)) {
      console.error(chalk.red('Authentication failed:'), error.message);
      this.provideAuthenticationGuidance(error);
      this.isConnected = false;
      return false;
    }
    
    this.retryAttempts++;
    
    if (this.retryAttempts >= this.maxRetries) {
      console.error(chalk.red(`Failed to connect after ${this.maxRetries} attempts`));
      this.provideNetworkTroubleshootingGuidance(error);
      this.isConnected = false;
      return false;
    }
    
    // For network errors, retry with exponential backoff
    const delay = await this.exponentialBackoff(this.retryAttempts);
    console.log(chalk.yellow(`Network error, retrying in ${delay}ms... (${this.retryAttempts}/${this.maxRetries})`));
    console.log(chalk.gray(`Error: ${error.message}`));
    
    await new Promise(resolve => setTimeout(resolve, delay));
    return this.connectWithRetry(options);
  }

  /**
   * Check if error is authentication-related
   */
  private isAuthenticationError(error: any): boolean {
    const errorMessage = error.message?.toLowerCase() || '';
    
    return errorMessage.includes('authentication_required') ||
           errorMessage.includes('authentication_invalid') ||
           errorMessage.includes('unauthorized') ||
           errorMessage.includes('invalid token') ||
           errorMessage.includes('token is invalid') ||
           errorMessage.includes('401') ||
           errorMessage.includes('403') ||
           (error.response?.status >= 401 && error.response?.status <= 403);
  }

  /**
   * Provide authentication-specific guidance
   */
  private provideAuthenticationGuidance(error: any): void {
    console.log(chalk.yellow('\n🔐 Authentication Issue Detected:'));
    
    if (error.message?.includes('AUTHENTICATION_REQUIRED')) {
      console.log(chalk.cyan('• No credentials found. Run: lanonasis auth login'));
      console.log(chalk.cyan('• Or set vendor key: lanonasis auth login --vendor-key pk_xxx.sk_xxx'));
    } else if (error.message?.includes('AUTHENTICATION_INVALID')) {
      console.log(chalk.cyan('• Invalid credentials. Check your vendor key format'));
      console.log(chalk.cyan('• Expected format: pk_xxx.sk_xxx'));
      console.log(chalk.cyan('• Try: lanonasis auth logout && lanonasis auth login'));
    } else if (error.message?.includes('expired')) {
      console.log(chalk.cyan('• Token expired. Re-authenticate: lanonasis auth login'));
      console.log(chalk.cyan('• Or refresh: lanonasis auth refresh (if available)'));
    } else {
      console.log(chalk.cyan('• Check authentication status: lanonasis auth status'));
      console.log(chalk.cyan('• Re-authenticate: lanonasis auth login'));
      console.log(chalk.cyan('• Verify vendor key: lanonasis auth login --vendor-key pk_xxx.sk_xxx'));
    }
  }

  /**
   * Provide network troubleshooting guidance
   */
  private provideNetworkTroubleshootingGuidance(error: any): void {
    console.log(chalk.yellow('\n🌐 Network Issue Detected:'));
    
    if (error.message?.includes('ECONNREFUSED') || error.message?.includes('connect ECONNREFUSED')) {
      console.log(chalk.cyan('• Connection refused. Service may be down:'));
      console.log(chalk.cyan('  - For remote: Check https://mcp.lanonasis.com/health'));
      console.log(chalk.cyan('  - For WebSocket: Check wss://mcp.lanonasis.com/ws'));
      console.log(chalk.cyan('  - For local: Install local MCP server'));
    } else if (error.message?.includes('timeout') || error.message?.includes('ETIMEDOUT')) {
      console.log(chalk.cyan('• Connection timeout. Check network:'));
      console.log(chalk.cyan('  - Verify internet connectivity'));
      console.log(chalk.cyan('  - Check firewall settings'));
      console.log(chalk.cyan('  - Try different connection mode: --mode remote'));
    } else if (error.message?.includes('ENOTFOUND') || error.message?.includes('getaddrinfo')) {
      console.log(chalk.cyan('• DNS resolution failed:'));
      console.log(chalk.cyan('  - Check DNS settings'));
      console.log(chalk.cyan('  - Verify server URL is correct'));
      console.log(chalk.cyan('  - Try using IP address instead of hostname'));
    } else if (error.message?.includes('certificate') || error.message?.includes('SSL') || error.message?.includes('TLS')) {
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

  /**
   * Validate authentication credentials before attempting MCP connection
   */
  private async validateAuthBeforeConnect(): Promise<void> {
    const token = this.config.get<string>('token');
    const vendorKey = this.config.get<string>('vendorKey');
    
    // Check if we have any authentication credentials
    if (!token && !vendorKey) {
      throw new Error('AUTHENTICATION_REQUIRED: No authentication credentials found. Run "lanonasis auth login" first.');
    }
    
    // If we have a token, check if it's expired or needs refresh
    if (token) {
      try {
        await this.validateAndRefreshToken(token);
      } catch (error) {
        throw new Error(`AUTHENTICATION_INVALID: ${error instanceof Error ? error.message : 'Token validation failed'}`);
      }
    }
    
    // If we have a vendor key, validate its format
    if (vendorKey && !token) {
      if (!this.validateVendorKeyFormat(vendorKey)) {
        throw new Error('AUTHENTICATION_INVALID: Invalid vendor key format. Expected format: pk_xxx.sk_xxx');
      }
    }
  }

  /**
   * Validate vendor key format
   */
  private validateVendorKeyFormat(vendorKey: string): boolean {
    // Vendor key should be in format: pk_xxx.sk_xxx
    const vendorKeyPattern = /^pk_[a-zA-Z0-9]+\.sk_[a-zA-Z0-9]+$/;
    return vendorKeyPattern.test(vendorKey);
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error: any) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        throw new Error('Token is invalid or expired. Please re-authenticate.');
      }
      throw new Error(`Token validation failed: ${error.message}`);
    }
  }

  /**
   * Initialize SSE connection for real-time updates
   */
  private async initializeSSE(serverUrl: string): Promise<void> {
    // Use the proper SSE endpoint from config
    const sseUrl = this.config.getMCPSSEUrl() ?? `${serverUrl}/events`;
    const token = this.config.get<string>('token');
    
    if (token) {
      // EventSource doesn't support headers directly, append token to URL
      this.sseConnection = new EventSource(`${sseUrl}?token=${encodeURIComponent(token)}`);

      this.sseConnection.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log(chalk.blue('📡 Real-time update:'), data.type);
        } catch {
          // Ignore parse errors
        }
      };

      this.sseConnection.onerror = () => {
        console.error(chalk.yellow('⚠️  SSE connection error (will retry)'));
      };
    }
  }
  
  /**
   * Initialize WebSocket connection for enterprise MCP server
   */
  private async initializeWebSocket(wsUrl: string): Promise<void> {
    const token = this.config.get<string>('token');
    
    if (!token) {
      throw new Error('API key required for WebSocket mode. Set LANONASIS_API_KEY or login first.');
    }
    
    return new Promise((resolve, reject) => {
      try {
        // Close existing connection if any
        if (this.wsConnection) {
          this.wsConnection.close();
          this.wsConnection = null;
        }
        
        // Create new WebSocket connection with authentication
        this.wsConnection = new WebSocket(wsUrl, [], {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-API-Key': token
          }
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
            console.log(chalk.blue('📡 MCP message:'), message.id, message.method || 'response');
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        });
        
        this.wsConnection.on('error', (error) => {
          console.error(chalk.red('WebSocket error:'), error);
          reject(error);
        });
        
        this.wsConnection.on('close', (code, reason) => {
          console.log(chalk.yellow(`WebSocket connection closed (${code}): ${reason}`));
          
          // Auto-reconnect after delay
          setTimeout(() => {
            if (this.isConnected) {
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
    setTimeout(() => this.performHealthCheck(), 5000);
  }

  /**
   * Stop health monitoring
   */
  private stopHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
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
      const connectionMode = this.config.get('mcpConnectionMode') ?? 'remote';
      
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
    } catch (error) {
      console.log(chalk.yellow('⚠️  Health check failed, attempting reconnection...'));
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
  private async checkRemoteHealth(): Promise<void> {
    const apiUrl = this.config.getMCPRestUrl() ?? 'https://mcp.lanonasis.com/api/v1';
    const token = this.config.get('token');
    
    if (!token) {
      throw new Error('No authentication token available');
    }
    
    try {
      const axios = (await import('axios')).default;
      await axios.get(`${apiUrl}/health`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-api-key': String(token)
        },
        timeout: 5000
      });
    } catch (error) {
      throw new Error(`Remote health check failed: ${error}`);
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
    } catch (error) {
      throw new Error(`Local health check failed: ${error}`);
    }
  }

  /**
   * Handle health check failure by attempting reconnection
   */
  private async handleHealthCheckFailure(): Promise<void> {
    this.isConnected = false;
    this.stopHealthMonitoring();
    
    // Attempt to reconnect with current configuration
    const connectionMode = this.config.get('mcpConnectionMode') ?? 'remote';
    const options: MCPConnectionOptions = {
      connectionMode: connectionMode as 'local' | 'remote' | 'websocket'
    };
    
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
    
    if (this.client) {
      await this.client.close();
      this.client = null;
    }
    
    if (this.sseConnection) {
      this.sseConnection.close();
      this.sseConnection = null;
    }
    
    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
    }
    
    this.isConnected = false;
  }

  /**
   * Call an MCP tool
   */
  async callTool(toolName: string, args: MCPToolArgs): Promise<MCPToolResponse> {
    if (!this.isConnected) {
      throw new Error('Not connected to MCP server. Run "lanonasis mcp connect" first.');
    }

    const useRemote = this.config.get('mcpUseRemote') ?? false;
    
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
    const token = this.config.get('token');

    if (!token) {
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
          'Authorization': `Bearer ${token}`,
          'x-api-key': String(token),
          'Content-Type': 'application/json'
        },
        data: mapping.transform ? mapping.transform(args) : undefined,
        params: mapping.method === 'GET' ? args : undefined
      });

      return response.data;
    } catch (error: unknown) {
      // Safely handle errors with type checking
      const errorObj = error as Record<string, any>;
      const errorMsg = errorObj.response?.data?.error || 
                      (errorObj.message ? errorObj.message : 'Unknown error');
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

    const useRemote = this.config.get('mcpUseRemote') ?? false;
    
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
    const connectionMode = this.config.get<string>('mcpConnectionMode') ?? 
                          (this.config.get<boolean>('mcpUseRemote') ? 'remote' : 'local');
    
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
      ? Date.now() - this.connectionStartTime 
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

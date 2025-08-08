import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import chalk from 'chalk';
import { CLIConfig } from './config.js';
import * as path from 'path';
import { EventSource } from 'eventsource';
import { fileURLToPath } from 'url';
import WebSocket from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
interface MCPToolResponse {
  result?: unknown;
  error?: {
    code: number;
    message: string;
  };
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

  constructor() {
    this.config = new CLIConfig();
  }

  /**
   * Connect to MCP server (local or remote)
   */
  async connect(options: MCPConnectionOptions = {}): Promise<boolean> {
    try {
      // Determine connection mode with priority to explicit mode option
      const connectionMode = options.connectionMode ?? 
                            (options.useWebSocket ? 'websocket' : 
                             options.useRemote ? 'remote' : 
                             this.config.get('mcpConnectionMode') ?? 
                             this.config.get('mcpUseRemote') ? 'remote' : 'local');
      
      let wsUrl: string;
      let serverUrl: string;
      let serverPath: string;
      
      switch (connectionMode) {
        case 'websocket':
          // WebSocket connection mode for enterprise users
          wsUrl = options.serverUrl ?? 
                  this.config.get('mcpWebSocketUrl') ?? 
                  'ws://localhost:8081/mcp/ws';
          console.log(chalk.cyan(`Connecting to WebSocket MCP server at ${wsUrl}...`));
          
          // Initialize WebSocket connection
          await this.initializeWebSocket(wsUrl);
          
          this.isConnected = true;
          return true;
          
        case 'remote':
          // For remote MCP, we'll use the REST API with MCP-style interface
          serverUrl = options.serverUrl ?? 
                     this.config.get('mcpServerUrl') ?? 
                     'https://api.lanonasis.com';
          console.log(chalk.cyan(`Connecting to remote MCP server at ${serverUrl}...`));
          
          // Initialize SSE connection for real-time updates
          await this.initializeSSE(serverUrl);
          
          this.isConnected = true;
          return true;
          
        case 'local':
        default: {
          // Local MCP server connection
          serverPath = options.serverPath ?? 
                      this.config.get('mcpServerPath') ?? 
                      path.join(__dirname, '../../../../onasis-gateway/mcp-server/server.js');
          
          console.log(chalk.cyan(`Connecting to local MCP server at ${serverPath}...`));
        
          const transport = new StdioClientTransport({
            command: 'node',
            args: [serverPath]
          });

          this.client = new Client({
            name: '@lanonasis/cli',
            version: '1.0.0'
          }, {
            capabilities: {}
          });
        }

        await this.client.connect(transport);
        this.isConnected = true;
        
        console.log(chalk.green('✓ Connected to MCP server'));
        return true;
      }
    } catch (error) {
      console.error(chalk.red('Failed to connect to MCP server:'), error);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Initialize SSE connection for real-time updates
   */
  private async initializeSSE(serverUrl: string): Promise<void> {
    const sseUrl = `${serverUrl}/sse`;
    const token = this.config.get('token');
    
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
    const token = this.config.get('token');
    
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
        this.wsConnection = new WebSocket(wsUrl, {
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
   * Disconnect from MCP server
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
    }
    
    if (this.sseConnection) {
      this.sseConnection.close();
      this.sseConnection = null;
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

        return result;
      } catch (error) {
        throw new Error(`MCP tool call failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  /**
   * Call remote tool via REST API with MCP interface
   */
  private async callRemoteTool(toolName: string, args: MCPToolArgs): Promise<MCPToolResponse> {
    const apiUrl = this.config.get('apiUrl') ?? 'https://api.lanonasis.com';
    const token = this.config.get('token');

    if (!token) {
      throw new Error('Authentication required. Run "lanonasis auth login" first.');
    }

    // Map MCP tool names to REST API endpoints
    const toolMappings: Record<string, RemoteToolMapping> = {
      'memory_create_memory': {
        method: 'POST',
        endpoint: '/api/v1/memory',
        transform: (args) => args
      },
      'memory_search_memories': {
        method: 'POST',
        endpoint: '/api/v1/memory/search',
        transform: (args) => args
      },
      'memory_get_memory': {
        method: 'GET',
        endpoint: '/api/v1/memory/{id}',
        transform: () => undefined
      },
      'memory_update_memory': {
        method: 'PUT',
        endpoint: '/api/v1/memory/{id}',
        transform: (args) => {
          const data = { ...args };
          delete data.memory_id;
          return data;
        }
      },
      'memory_delete_memory': {
        method: 'DELETE',
        endpoint: '/api/v1/memory/{id}',
        transform: () => undefined
      },
      'memory_list_memories': {
        method: 'GET',
        endpoint: '/api/v1/memory',
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
        endpoint = endpoint.replace('{id}', args.memory_id);
      }
      
      const response = await axios({
        method: mapping.method,
        url: `${apiUrl}${endpoint}`,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        data: mapping.transform ? mapping.transform(args) : undefined,
        params: mapping.method === 'GET' ? args : undefined
      });

      return response.data;
    } catch (error: unknown) {
      throw new Error(`Remote tool call failed: ${error.response?.data?.error || error.message}`);
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
   * Get connection status details
   */
  getConnectionStatus(): { connected: boolean; mode: string; server?: string } {
    const useRemote = this.config.get('mcpUseRemote') ?? false;
    
    return {
      connected: this.isConnected,
      mode: useRemote ? 'remote' : 'local',
      server: useRemote 
        ? (this.config.get('mcpServerUrl') ?? 'https://api.lanonasis.com')
        : (this.config.get('mcpServerPath') ?? 'local MCP server')
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
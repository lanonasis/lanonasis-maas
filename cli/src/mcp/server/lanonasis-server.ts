/**
 * Lanonasis MCP Server Implementation
 * Provides MCP protocol access to Lanonasis MaaS functionality
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CLIConfig } from '../../utils/config.js';
import { APIClient } from '../../utils/api.js';
import chalk from 'chalk';

export interface LanonasisServerOptions {
  name?: string;
  version?: string;
  verbose?: boolean;
  apiUrl?: string;
  token?: string;
  preferredTransport?: 'stdio' | 'websocket' | 'http';
  enableTransportFallback?: boolean;
}

export interface ConnectionHealth {
  clientId: string;
  connectedAt: Date;
  lastActivity: Date;
  transport: 'stdio' | 'websocket' | 'http';
  authenticated: boolean;
  clientInfo?: {
    name?: string;
    version?: string;
  };
}

export interface ConnectionPoolStats {
  totalConnections: number;
  activeConnections: number;
  authenticatedConnections: number;
  connectionsByTransport: Record<string, number>;
}

export class LanonasisMCPServer {
  private server: Server;
  private config: CLIConfig;
  private apiClient: APIClient;
  private transport: StdioServerTransport | null = null;
  private options: LanonasisServerOptions;
  
  // Connection pool management
  private connectionPool: Map<string, ConnectionHealth> = new Map();
  private maxConnections: number = 10;
  private connectionCleanupInterval: NodeJS.Timeout | null = null;
  
  // Transport protocol management
  private supportedTransports: ('stdio' | 'websocket' | 'http')[] = ['stdio', 'websocket', 'http'];
  private transportFailures: Map<string, { count: number; lastFailure: Date }> = new Map();
  private enableFallback: boolean = true;

  constructor(options: LanonasisServerOptions = {}) {
    this.options = options;
    
    // Initialize transport settings
    this.enableFallback = options.enableTransportFallback !== false; // Default to true
    
    // Initialize server with metadata
    this.server = new Server({
      name: options.name || "lanonasis-maas-server",
      version: options.version || "3.0.1"
    }, {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {}
      }
    });

    // Initialize config and API client
    this.config = new CLIConfig();
    this.apiClient = new APIClient();
    
    // Note: registerTools is now async and called in initialize()
    // Setup error handling
    this.setupErrorHandling();
  }

  /**
   * Initialize the server
   */
  async initialize(): Promise<void> {
    // Initialize configuration
    await this.config.init();
    
    // Override with options if provided
    if (this.options.apiUrl) {
      await this.config.setApiUrl(this.options.apiUrl);
    }
    
    if (this.options.token) {
      await this.config.setToken(this.options.token);
    }

    // Initialize API client with config
    const apiUrl = this.config.getApiUrl();
    const token = this.config.getToken();
    
    if (apiUrl) {
      this.apiClient = new APIClient();
      // APIClient will use the config internally
    }

    // Register tools, resources, and prompts after config is loaded
    await this.registerTools();
    await this.registerResources();
    await this.registerPrompts();

    // Start connection cleanup monitoring
    this.startConnectionCleanup();

    if (this.options.verbose) {
      console.log(chalk.cyan('🚀 Lanonasis MCP Server initialized'));
      console.log(chalk.gray(`API URL: ${apiUrl}`));
      console.log(chalk.gray(`Authenticated: ${token ? 'Yes' : 'No'}`));
      console.log(chalk.gray(`Max connections: ${this.maxConnections}`));
    }
  }

  /**
   * Register MCP tools
   */
  private async registerTools(): Promise<void> {
    // Import request schemas dynamically for ES modules
    const { ListToolsRequestSchema, CallToolRequestSchema } = await import('@modelcontextprotocol/sdk/types.js');
    
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        // Memory tools
        {
          name: 'memory_create',
          description: 'Create a new memory entry',
          inputSchema: {
            type: 'object',
            properties: {
              title: { 
                type: 'string',
                description: 'Memory title'
              },
              content: { 
                type: 'string',
                description: 'Memory content'
              },
              memory_type: { 
                type: 'string',
                enum: ['context', 'reference', 'note'],
                default: 'context',
                description: 'Type of memory'
              },
              tags: {
                type: 'array',
                items: { type: 'string' },
                description: 'Optional tags for the memory'
              }
            },
            required: ['title', 'content']
          }
        },
        {
          name: 'memory_search',
          description: 'Search memories using semantic search',
          inputSchema: {
            type: 'object',
            properties: {
              query: { 
                type: 'string',
                description: 'Search query'
              },
              limit: { 
                type: 'number',
                default: 10,
                description: 'Maximum number of results'
              },
              threshold: {
                type: 'number',
                minimum: 0,
                maximum: 1,
                default: 0.7,
                description: 'Similarity threshold'
              }
            },
            required: ['query']
          }
        },
        {
          name: 'memory_list',
          description: 'List all memory entries',
          inputSchema: {
            type: 'object',
            properties: {
              limit: { 
                type: 'number',
                default: 20,
                description: 'Maximum number of results'
              },
              offset: {
                type: 'number',
                default: 0,
                description: 'Pagination offset'
              },
              topic_id: {
                type: 'string',
                description: 'Filter by topic ID'
              }
            }
          }
        },
        {
          name: 'memory_get',
          description: 'Get a specific memory by ID',
          inputSchema: {
            type: 'object',
            properties: {
              memory_id: {
                type: 'string',
                description: 'Memory ID'
              }
            },
            required: ['memory_id']
          }
        },
        {
          name: 'memory_update',
          description: 'Update an existing memory',
          inputSchema: {
            type: 'object',
            properties: {
              memory_id: {
                type: 'string',
                description: 'Memory ID'
              },
              title: {
                type: 'string',
                description: 'New title (optional)'
              },
              content: {
                type: 'string',
                description: 'New content (optional)'
              },
              tags: {
                type: 'array',
                items: { type: 'string' },
                description: 'New tags (optional)'
              }
            },
            required: ['memory_id']
          }
        },
        {
          name: 'memory_delete',
          description: 'Delete a memory',
          inputSchema: {
            type: 'object',
            properties: {
              memory_id: {
                type: 'string',
                description: 'Memory ID'
              }
            },
            required: ['memory_id']
          }
        },
        
        // Topic tools
        {
          name: 'topic_create',
          description: 'Create a new topic',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Topic name'
              },
              description: {
                type: 'string',
                description: 'Topic description'
              }
            },
            required: ['name']
          }
        },
        {
          name: 'topic_list',
          description: 'List all topics',
          inputSchema: {
            type: 'object',
            properties: {
              limit: {
                type: 'number',
                default: 20
              }
            }
          }
        },
        
        // API Key tools
        {
          name: 'apikey_create',
          description: 'Create a new API key',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'API key name'
              },
              permissions: {
                type: 'array',
                items: {
                  type: 'string',
                  enum: ['read', 'write', 'delete']
                },
                default: ['read']
              }
            },
            required: ['name']
          }
        },
        {
          name: 'apikey_list',
          description: 'List all API keys',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        
        // System tools
        {
          name: 'system_health',
          description: 'Check system health status',
          inputSchema: {
            type: 'object',
            properties: {
              verbose: {
                type: 'boolean',
                default: false,
                description: 'Include detailed diagnostics'
              }
            }
          }
        },
        {
          name: 'system_config',
          description: 'Get or update system configuration',
          inputSchema: {
            type: 'object',
            properties: {
              action: {
                type: 'string',
                enum: ['get', 'set'],
                default: 'get'
              },
              key: {
                type: 'string',
                description: 'Configuration key'
              },
              value: {
                type: 'string',
                description: 'Configuration value (for set action)'
              }
            }
          }
        },
        
        // Connection management tools
        {
          name: 'connection_stats',
          description: 'Get connection pool statistics',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'connection_auth_status',
          description: 'Get authentication status for all connections',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'connection_validate_auth',
          description: 'Validate authentication for a specific connection',
          inputSchema: {
            type: 'object',
            properties: {
              clientId: {
                type: 'string',
                description: 'Client ID to validate'
              }
            },
            required: ['clientId']
          }
        },
        
        // Transport management tools
        {
          name: 'transport_status',
          description: 'Get transport protocol status and statistics',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'transport_test',
          description: 'Test availability of a specific transport',
          inputSchema: {
            type: 'object',
            properties: {
              transport: {
                type: 'string',
                enum: ['stdio', 'websocket', 'http'],
                description: 'Transport to test'
              }
            },
            required: ['transport']
          }
        },
        {
          name: 'transport_reset_failures',
          description: 'Reset failure count for a transport',
          inputSchema: {
            type: 'object',
            properties: {
              transport: {
                type: 'string',
                enum: ['stdio', 'websocket', 'http'],
                description: 'Transport to reset (optional, resets all if not specified)'
              }
            }
          }
        }
      ]
    }));

    // Tool call handler (CallToolRequestSchema already imported above)
    this.server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
      const { name, arguments: args } = request.params;
      
      // Generate or extract client ID for connection tracking
      const clientId = this.extractClientId(request) || this.generateClientId();
      
      // Authenticate the connection before processing the request
      try {
        await this.authenticateRequest(request, clientId);
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Authentication Error: ${error instanceof Error ? error.message : 'Authentication failed'}`
            }
          ],
          isError: true
        };
      }
      
      this.updateConnectionActivity(clientId);
      
      try {
        const result = await this.handleToolCall(name, args, clientId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
          ],
          isError: true
        };
      }
    });
  } 
 /**
   * Register MCP resources
   */
  private async registerResources(): Promise<void> {
    const { ListResourcesRequestSchema, ReadResourceRequestSchema } = await import('@modelcontextprotocol/sdk/types.js');
    
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: 'memory://recent',
          name: 'Recent Memories',
          description: 'List of recently created or updated memories',
          mimeType: 'application/json'
        },
        {
          uri: 'memory://search',
          name: 'Memory Search',
          description: 'Search interface for memories',
          mimeType: 'application/json'
        },
        {
          uri: 'config://current',
          name: 'Current Configuration',
          description: 'Current CLI configuration settings',
          mimeType: 'application/json'
        },
        {
          uri: 'stats://usage',
          name: 'Usage Statistics',
          description: 'Memory usage and API statistics',
          mimeType: 'application/json'
        },
        {
          uri: 'connections://pool',
          name: 'Connection Pool',
          description: 'Current connection pool status and statistics',
          mimeType: 'application/json'
        },
        {
          uri: 'transport://status',
          name: 'Transport Status',
          description: 'Transport protocol status and failure statistics',
          mimeType: 'application/json'
        }
      ]
    }));

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request: any) => {
      const { uri } = request.params;
      
      try {
        const content = await this.handleResourceRead(uri);
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(content, null, 2)
            }
          ]
        };
      } catch (error) {
        throw new Error(`Failed to read resource ${uri}: ${error}`);
      }
    });
  }

  /**
   * Register MCP prompts
   */
  private async registerPrompts(): Promise<void> {
    const { ListPromptsRequestSchema, GetPromptRequestSchema } = await import('@modelcontextprotocol/sdk/types.js');
    
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => ({
      prompts: [
        {
          name: 'create_memory',
          description: 'Interactive prompt to create a new memory',
          arguments: [
            {
              name: 'title',
              description: 'Initial title for the memory',
              required: false
            }
          ]
        },
        {
          name: 'search_memories',
          description: 'Interactive prompt to search memories',
          arguments: [
            {
              name: 'query',
              description: 'Initial search query',
              required: false
            }
          ]
        },
        {
          name: 'organize_memories',
          description: 'Interactive prompt to organize memories into topics',
          arguments: []
        }
      ]
    }));

    this.server.setRequestHandler(GetPromptRequestSchema, async (request: any) => {
      const { name, arguments: args } = request.params;
      
      const prompts: Record<string, any> = {
        create_memory: {
          description: 'Create a new memory entry',
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `Please provide the following information for the new memory:
                
Title: ${args?.title || '[Enter a descriptive title]'}
Content: [Enter the memory content]
Type: [context/reference/note]
Tags: [Optional comma-separated tags]`
              }
            }
          ]
        },
        search_memories: {
          description: 'Search through your memories',
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `What would you like to search for in your memories?
                
Query: ${args?.query || '[Enter search terms]'}
Limit: [Number of results, default 10]
Threshold: [Similarity threshold 0-1, default 0.7]`
              }
            }
          ]
        },
        organize_memories: {
          description: 'Organize memories into topics',
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `Let's organize your memories into topics.
                
Would you like to:
1. Create a new topic
2. Move memories to existing topics
3. Review uncategorized memories
4. Merge similar topics

Please choose an option (1-4):`
              }
            }
          ]
        }
      };

      const prompt = prompts[name];
      if (!prompt) {
        throw new Error(`Unknown prompt: ${name}`);
      }

      return prompt;
    });
  }  /**
  
 * Handle tool calls
   */
  private async handleToolCall(name: string, args: any, clientId?: string): Promise<any> {
    // Ensure we're initialized
    if (!this.apiClient) {
      await this.initialize();
    }

    switch (name) {
      // Memory operations
      case 'memory_create':
        return await this.apiClient.createMemory(args);
      
      case 'memory_search':
        return await this.apiClient.searchMemories(args.query, {
          limit: args.limit,
          threshold: args.threshold
        });
      
      case 'memory_list':
        return await this.apiClient.getMemories({
          limit: args.limit,
          offset: args.offset,
          topic_id: args.topic_id
        });
      
      case 'memory_get':
        return await this.apiClient.getMemory(args.memory_id);
      
      case 'memory_update':
        return await this.apiClient.updateMemory(args.memory_id, args);
      
      case 'memory_delete':
        return await this.apiClient.deleteMemory(args.memory_id);
      
      // Topic operations
      case 'topic_create':
        return await this.apiClient.createTopic(args);
      
      case 'topic_list':
        return await this.apiClient.getTopics();
      
      // API Key operations
      case 'apikey_create':
        // API keys not directly supported in current APIClient
        return { error: 'API key creation not yet implemented' };
      
      case 'apikey_list':
        // API keys not directly supported in current APIClient
        return { error: 'API key listing not yet implemented' };
      
      // System operations
      case 'system_health':
        return await this.handleSystemHealth(args.verbose);
      
      case 'system_config':
        return await this.handleSystemConfig(args);
      
      // Connection management operations
      case 'connection_stats':
        return this.getConnectionPoolStats();
      
      case 'connection_auth_status':
        return this.getAuthenticationStatus();
      
      case 'connection_validate_auth':
        if (!args.clientId) {
          throw new Error('clientId is required');
        }
        return {
          clientId: args.clientId,
          authenticated: this.validateConnectionAuth(args.clientId),
          connection: this.getConnection(args.clientId) ? {
            transport: this.getConnection(args.clientId)!.transport,
            connectedAt: this.getConnection(args.clientId)!.connectedAt.toISOString(),
            lastActivity: this.getConnection(args.clientId)!.lastActivity.toISOString()
          } : null
        };
      
      // Transport management operations
      case 'transport_status':
        return this.getTransportStatus();
      
      case 'transport_test':
        if (!args.transport) {
          throw new Error('transport is required');
        }
        const isAvailable = await this.checkTransportAvailability(args.transport as 'stdio' | 'websocket' | 'http');
        return {
          transport: args.transport,
          available: isAvailable,
          tested_at: new Date().toISOString()
        };
      
      case 'transport_reset_failures':
        if (args.transport) {
          this.transportFailures.delete(args.transport);
          return {
            success: true,
            message: `Reset failures for ${args.transport} transport`
          };
        } else {
          this.transportFailures.clear();
          return {
            success: true,
            message: 'Reset failures for all transports'
          };
        }
      
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  /**
   * Handle resource reads
   */
  private async handleResourceRead(uri: string): Promise<any> {
    const [protocol, path] = uri.split('://');
    
    switch (protocol) {
      case 'memory':
        if (path === 'recent') {
          return await this.apiClient.getMemories({ limit: 10 });
        } else if (path === 'search') {
          return { 
            message: 'Use memory_search tool to search memories',
            example: { query: 'your search query', limit: 10 }
          };
        }
        break;
      
      case 'config':
        if (path === 'current') {
          await this.config.init();
          return {
            apiUrl: this.config.getApiUrl(),
            authenticated: await this.config.isAuthenticated(),
            user: await this.config.getCurrentUser()
          };
        }
        break;
      
      case 'stats':
        if (path === 'usage') {
          // TODO: Implement actual stats collection
          return {
            totalMemories: 0,
            totalTopics: 0,
            apiCallsToday: 0,
            lastSync: new Date().toISOString()
          };
        }
        break;
      
      case 'connections':
        if (path === 'pool') {
          return {
            ...this.getConnectionPoolStats(),
            connections: Array.from(this.connectionPool.values()).map(conn => ({
              clientId: conn.clientId,
              connectedAt: conn.connectedAt.toISOString(),
              lastActivity: conn.lastActivity.toISOString(),
              transport: conn.transport,
              authenticated: conn.authenticated,
              uptime: Date.now() - conn.connectedAt.getTime(),
              clientInfo: conn.clientInfo
            }))
          };
        }
        break;
      
      case 'transport':
        if (path === 'status') {
          return this.getTransportStatus();
        }
        break;
    }
    
    throw new Error(`Unknown resource: ${uri}`);
  }

  /**
   * Handle system health check
   */
  private async handleSystemHealth(verbose: boolean): Promise<any> {
    const health: any = {
      status: 'healthy',
      server: this.options.name || 'lanonasis-maas-server',
      version: this.options.version || '3.0.1',
      timestamp: new Date().toISOString(),
      connections: this.getConnectionPoolStats(),
      authentication: this.getAuthenticationStatus()
    };

    if (verbose) {
      health.api = {
        url: this.config.getApiUrl(),
        authenticated: await this.config.isAuthenticated()
      };
      
      try {
        const apiHealth = await this.apiClient.getHealth();
        health.api.status = apiHealth.status;
        health.api.version = apiHealth.version;
      } catch (error) {
        health.api.status = 'error';
        health.api.error = error instanceof Error ? error.message : 'Unknown error';
      }

      // Include detailed connection information
      health.connectionDetails = Array.from(this.connectionPool.values()).map(conn => ({
        clientId: conn.clientId,
        transport: conn.transport,
        authenticated: conn.authenticated,
        connectedAt: conn.connectedAt.toISOString(),
        lastActivity: conn.lastActivity.toISOString(),
        uptime: Date.now() - conn.connectedAt.getTime(),
        clientInfo: conn.clientInfo
      }));
    }

    return health;
  }

  /**
   * Handle system configuration
   */
  private async handleSystemConfig(args: any): Promise<any> {
    if (args.action === 'get') {
      if (args.key) {
        return { [args.key]: this.config.get(args.key) };
      } else {
        // Return all config
        await this.config.init();
        return {
          apiUrl: this.config.getApiUrl(),
          mcpServerUrl: this.config.get('mcpServerUrl'),
          mcpUseRemote: this.config.get('mcpUseRemote'),
          maxConnections: this.maxConnections,
          transport: this.getTransportStatus()
        };
      }
    } else if (args.action === 'set') {
      if (!args.key || !args.value) {
        throw new Error('Key and value required for set action');
      }
      
      // Handle special configuration keys
      if (args.key === 'maxConnections') {
        const newMax = parseInt(args.value);
        if (isNaN(newMax) || newMax < 1 || newMax > 100) {
          throw new Error('maxConnections must be a number between 1 and 100');
        }
        this.maxConnections = newMax;
        return { 
          success: true, 
          message: `Set ${args.key} to ${args.value}` 
        };
      }
      
      this.config.set(args.key, args.value);
      await this.config.save();
      
      return { 
        success: true, 
        message: `Set ${args.key} to ${args.value}` 
      };
    }
    
    throw new Error('Invalid action');
  }  /**

   * Connection pool management methods
   */
  
  /**
   * Add a new connection to the pool
   */
  private addConnection(clientId: string, transport: 'stdio' | 'websocket' | 'http', clientInfo?: { name?: string; version?: string }): boolean {
    // Check if we've reached the maximum number of connections
    if (this.connectionPool.size >= this.maxConnections) {
      if (this.options.verbose) {
        console.log(chalk.yellow(`⚠️ Maximum connections (${this.maxConnections}) reached, rejecting new connection`));
      }
      return false;
    }

    const connection: ConnectionHealth = {
      clientId,
      connectedAt: new Date(),
      lastActivity: new Date(),
      transport,
      authenticated: false,
      clientInfo
    };

    this.connectionPool.set(clientId, connection);
    
    if (this.options.verbose) {
      console.log(chalk.cyan(`✅ Added connection ${clientId} (${transport}) - Total: ${this.connectionPool.size}`));
    }

    return true;
  }

  /**
   * Remove a connection from the pool
   */
  private removeConnection(clientId: string): void {
    const connection = this.connectionPool.get(clientId);
    if (connection) {
      this.connectionPool.delete(clientId);
      
      if (this.options.verbose) {
        const uptime = Date.now() - connection.connectedAt.getTime();
        console.log(chalk.gray(`🔌 Removed connection ${clientId} (uptime: ${Math.round(uptime / 1000)}s) - Total: ${this.connectionPool.size}`));
      }
    }
  }

  /**
   * Update connection activity timestamp
   */
  private updateConnectionActivity(clientId: string): void {
    const connection = this.connectionPool.get(clientId);
    if (connection) {
      connection.lastActivity = new Date();
    }
  }

  /**
   * Mark connection as authenticated
   */
  private authenticateConnection(clientId: string): void {
    const connection = this.connectionPool.get(clientId);
    if (connection) {
      connection.authenticated = true;
      
      if (this.options.verbose) {
        console.log(chalk.green(`🔐 Connection ${clientId} authenticated`));
      }
    }
  }

  /**
   * Get connection pool statistics
   */
  private getConnectionPoolStats(): ConnectionPoolStats {
    const stats: ConnectionPoolStats = {
      totalConnections: this.connectionPool.size,
      activeConnections: 0,
      authenticatedConnections: 0,
      connectionsByTransport: {}
    };

    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);

    for (const connection of this.connectionPool.values()) {
      // Count as active if there was activity in the last 5 minutes
      if (connection.lastActivity.getTime() > fiveMinutesAgo) {
        stats.activeConnections++;
      }

      if (connection.authenticated) {
        stats.authenticatedConnections++;
      }

      stats.connectionsByTransport[connection.transport] = 
        (stats.connectionsByTransport[connection.transport] || 0) + 1;
    }

    return stats;
  }

  /**
   * Start connection cleanup monitoring
   */
  private startConnectionCleanup(): void {
    // Clean up stale connections every 2 minutes
    this.connectionCleanupInterval = setInterval(() => {
      this.cleanupStaleConnections();
    }, 2 * 60 * 1000);
  }

  /**
   * Stop connection cleanup monitoring
   */
  private stopConnectionCleanup(): void {
    if (this.connectionCleanupInterval) {
      clearInterval(this.connectionCleanupInterval);
      this.connectionCleanupInterval = null;
    }
  }

  /**
   * Clean up stale connections (no activity for 10 minutes)
   */
  private cleanupStaleConnections(): void {
    const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
    const staleConnections: string[] = [];

    for (const [clientId, connection] of this.connectionPool.entries()) {
      if (connection.lastActivity.getTime() < tenMinutesAgo) {
        staleConnections.push(clientId);
      }
    }

    for (const clientId of staleConnections) {
      this.removeConnection(clientId);
      
      if (this.options.verbose) {
        console.log(chalk.yellow(`🧹 Cleaned up stale connection: ${clientId}`));
      }
    }
  }

  /**
   * Generate unique client ID for new connections
   */
  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Extract client ID from request headers or metadata
   */
  private extractClientId(request: any): string | null {
    // Try to extract client ID from request metadata
    // This would depend on the MCP transport implementation
    return request.meta?.clientId || null;
  }

  /**
   * Authenticate incoming MCP request
   */
  private async authenticateRequest(request: any, clientId: string): Promise<void> {
    // Check if connection already exists and is authenticated
    const existingConnection = this.getConnection(clientId);
    if (existingConnection && existingConnection.authenticated) {
      return; // Already authenticated
    }

    // Extract authentication information from request
    const authInfo = this.extractAuthInfo(request);
    
    if (!authInfo.token && !authInfo.vendorKey) {
      // For stdio connections, use the CLI's stored credentials
      if (this.isStdioConnection(request)) {
        const isAuthenticated = await this.validateStoredCredentials();
        if (isAuthenticated) {
          this.ensureConnectionExists(clientId, 'stdio');
          this.authenticateConnection(clientId);
          return;
        }
      }
      
      throw new Error('Authentication required. No valid credentials provided.');
    }

    // Validate provided credentials
    const isValid = await this.validateCredentials(authInfo.token, authInfo.vendorKey);
    if (!isValid) {
      throw new Error('Invalid credentials provided.');
    }

    // Add/update connection in pool and mark as authenticated
    const transport = this.determineTransport(request);
    this.ensureConnectionExists(clientId, transport, authInfo.clientInfo);
    this.authenticateConnection(clientId);
  }

  /**
   * Extract authentication information from request
   */
  private extractAuthInfo(request: any): {
    token?: string;
    vendorKey?: string;
    clientInfo?: { name?: string; version?: string };
  } {
    // Try to extract from various possible locations
    const headers = request.headers || {};
    const meta = request.meta || {};
    const params = request.params || {};

    return {
      token: headers.authorization?.replace('Bearer ', '') || 
             headers['x-auth-token'] || 
             meta.token || 
             params.token,
      vendorKey: headers['x-api-key'] || 
                 headers['x-vendor-key'] || 
                 meta.vendorKey || 
                 params.vendorKey,
      clientInfo: {
        name: headers['x-client-name'] || meta.clientName || 'unknown',
        version: headers['x-client-version'] || meta.clientVersion || '1.0.0'
      }
    };
  }

  /**
   * Check if this is a stdio connection
   */
  private isStdioConnection(request: any): boolean {
    // Stdio connections typically don't have HTTP-style headers
    return !request.headers || Object.keys(request.headers).length === 0;
  }

  /**
   * Determine transport type from request
   */
  private determineTransport(request: any): 'stdio' | 'websocket' | 'http' {
    if (this.isStdioConnection(request)) {
      return 'stdio';
    }
    
    const headers = request.headers || {};
    if (headers.upgrade === 'websocket' || headers.connection?.includes('Upgrade')) {
      return 'websocket';
    }
    
    return 'http';
  }

  /**
   * Ensure connection exists in pool
   */
  private ensureConnectionExists(clientId: string, transport: 'stdio' | 'websocket' | 'http', clientInfo?: { name?: string; version?: string }): void {
    if (!this.connectionPool.has(clientId)) {
      const success = this.addConnection(clientId, transport, clientInfo);
      if (!success) {
        throw new Error('Maximum connections reached. Please try again later.');
      }
    }
  }

  /**
   * Validate stored CLI credentials
   */
  private async validateStoredCredentials(): Promise<boolean> {
    try {
      return await this.config.validateStoredCredentials();
    } catch (error) {
      if (this.options.verbose) {
        console.log(chalk.yellow(`⚠️ Stored credentials validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
      return false;
    }
  }

  /**
   * Validate provided credentials against the API
   */
  private async validateCredentials(token?: string, vendorKey?: string): Promise<boolean> {
    if (!token && !vendorKey) {
      return false;
    }

    try {
      // Import axios dynamically to avoid circular dependency
      const axios = (await import('axios')).default;
      
      // Ensure service discovery is done
      await this.config.discoverServices();
      
      const authBase = this.config.getDiscoveredApiUrl();
      const headers: Record<string, string> = {
        'X-Project-Scope': 'lanonasis-maas'
      };
      
      if (vendorKey) {
        headers['X-API-Key'] = vendorKey;
        headers['X-Auth-Method'] = 'vendor_key';
      } else if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        headers['X-Auth-Method'] = 'jwt';
      }
      
      // Validate against server with health endpoint
      await axios.get(`${authBase}/api/v1/health`, {
        headers,
        timeout: 10000
      });
      
      return true;
    } catch (error: any) {
      if (this.options.verbose) {
        console.log(chalk.yellow(`⚠️ Credential validation failed: ${error.response?.status || error.message}`));
      }
      return false;
    }
  }

  /**
   * Validate connection authentication status
   */
  private validateConnectionAuth(clientId: string): boolean {
    const connection = this.getConnection(clientId);
    return connection ? connection.authenticated : false;
  }

  /**
   * Get authentication status for all connections
   */
  private getAuthenticationStatus(): {
    totalConnections: number;
    authenticatedConnections: number;
    unauthenticatedConnections: number;
  } {
    const stats = this.getConnectionPoolStats();
    return {
      totalConnections: stats.totalConnections,
      authenticatedConnections: stats.authenticatedConnections,
      unauthenticatedConnections: stats.totalConnections - stats.authenticatedConnections
    };
  }

  /**
   * Transport protocol management methods
   */

  /**
   * Check if a transport is available and working
   */
  private async checkTransportAvailability(transport: 'stdio' | 'websocket' | 'http'): Promise<boolean> {
    try {
      switch (transport) {
        case 'stdio':
          // Stdio is always available if we can start the process
          return true;
        
        case 'websocket':
          // Check if WebSocket server can be started
          return await this.testWebSocketAvailability();
        
        case 'http':
          // Check if HTTP server can be started
          return await this.testHttpAvailability();
        
        default:
          return false;
      }
    } catch (error) {
      this.recordTransportFailure(transport, error);
      return false;
    }
  }

  /**
   * Test WebSocket transport availability
   */
  private async testWebSocketAvailability(): Promise<boolean> {
    try {
      // This would typically involve checking if we can bind to a WebSocket port
      // For now, we'll assume it's available unless we have recorded failures
      const failures = this.transportFailures.get('websocket');
      if (failures && failures.count > 3) {
        const timeSinceLastFailure = Date.now() - failures.lastFailure.getTime();
        // Don't retry for 5 minutes after multiple failures
        if (timeSinceLastFailure < 5 * 60 * 1000) {
          return false;
        }
      }
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Test HTTP transport availability
   */
  private async testHttpAvailability(): Promise<boolean> {
    try {
      // This would typically involve checking if we can bind to an HTTP port
      // For now, we'll assume it's available unless we have recorded failures
      const failures = this.transportFailures.get('http');
      if (failures && failures.count > 3) {
        const timeSinceLastFailure = Date.now() - failures.lastFailure.getTime();
        // Don't retry for 5 minutes after multiple failures
        if (timeSinceLastFailure < 5 * 60 * 1000) {
          return false;
        }
      }
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Record a transport failure
   */
  private recordTransportFailure(transport: string, error: any): void {
    const existing = this.transportFailures.get(transport);
    const failure = {
      count: existing ? existing.count + 1 : 1,
      lastFailure: new Date()
    };
    
    this.transportFailures.set(transport, failure);
    
    if (this.options.verbose) {
      console.log(chalk.yellow(`⚠️ Transport ${transport} failure #${failure.count}: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }

  /**
   * Get the best available transport
   */
  private async getBestAvailableTransport(): Promise<'stdio' | 'websocket' | 'http' | null> {
    const preferred = this.options.preferredTransport || 'stdio';
    
    // Try preferred transport first
    if (await this.checkTransportAvailability(preferred)) {
      return preferred;
    }

    if (!this.enableFallback) {
      return null;
    }

    // Try other transports in order of preference
    const fallbackOrder: ('stdio' | 'websocket' | 'http')[] = 
      this.supportedTransports.filter(t => t !== preferred);

    for (const transport of fallbackOrder) {
      if (await this.checkTransportAvailability(transport)) {
        if (this.options.verbose) {
          console.log(chalk.cyan(`🔄 Falling back to ${transport} transport`));
        }
        return transport;
      }
    }

    return null;
  }

  /**
   * Handle transport-specific errors with clear messages
   */
  private handleTransportError(transport: 'stdio' | 'websocket' | 'http', error: any): Error {
    this.recordTransportFailure(transport, error);
    
    const baseMessage = `${transport.toUpperCase()} transport failed`;
    let specificMessage = '';
    let troubleshooting = '';

    switch (transport) {
      case 'stdio':
        if (error.code === 'ENOENT') {
          specificMessage = 'Server executable not found';
          troubleshooting = 'Ensure the MCP server is installed and accessible';
        } else if (error.code === 'EACCES') {
          specificMessage = 'Permission denied';
          troubleshooting = 'Check file permissions for the MCP server executable';
        } else {
          specificMessage = 'Process communication failed';
          troubleshooting = 'Check if the server process can be started';
        }
        break;

      case 'websocket':
        if (error.code === 'EADDRINUSE') {
          specificMessage = 'WebSocket port already in use';
          troubleshooting = 'Try a different port or stop the conflicting service';
        } else if (error.code === 'ECONNREFUSED') {
          specificMessage = 'WebSocket connection refused';
          troubleshooting = 'Check if the WebSocket server is running and accessible';
        } else if (error.code === 'ENOTFOUND') {
          specificMessage = 'WebSocket server not found';
          troubleshooting = 'Verify the WebSocket server URL is correct';
        } else {
          specificMessage = 'WebSocket connection failed';
          troubleshooting = 'Check network connectivity and firewall settings';
        }
        break;

      case 'http':
        if (error.code === 'EADDRINUSE') {
          specificMessage = 'HTTP port already in use';
          troubleshooting = 'Try a different port or stop the conflicting service';
        } else if (error.code === 'ECONNREFUSED') {
          specificMessage = 'HTTP connection refused';
          troubleshooting = 'Check if the HTTP server is running and accessible';
        } else if (error.response?.status) {
          specificMessage = `HTTP ${error.response.status} error`;
          troubleshooting = 'Check server status and authentication';
        } else {
          specificMessage = 'HTTP connection failed';
          troubleshooting = 'Check network connectivity and server availability';
        }
        break;
    }

    const fullMessage = `${baseMessage}: ${specificMessage}. ${troubleshooting}`;
    return new Error(fullMessage);
  }

  /**
   * Attempt to start server with transport fallback
   */
  private async startWithTransportFallback(): Promise<'stdio' | 'websocket' | 'http'> {
    const availableTransport = await this.getBestAvailableTransport();
    
    if (!availableTransport) {
      const failureMessages = Array.from(this.transportFailures.entries())
        .map(([transport, failure]) => `${transport}: ${failure.count} failures`)
        .join(', ');
      
      throw new Error(
        `No available transports. All transports have failed: ${failureMessages}. ` +
        'Please check your configuration and network connectivity.'
      );
    }

    try {
      await this.startTransport(availableTransport);
      return availableTransport;
    } catch (error) {
      const transportError = this.handleTransportError(availableTransport, error);
      
      if (this.enableFallback && this.supportedTransports.length > 1) {
        // Try next available transport
        const nextTransport = await this.getBestAvailableTransport();
        if (nextTransport && nextTransport !== availableTransport) {
          console.log(chalk.yellow(`⚠️ ${transportError.message}`));
          console.log(chalk.cyan(`🔄 Attempting fallback to ${nextTransport} transport...`));
          
          try {
            await this.startTransport(nextTransport);
            return nextTransport;
          } catch (fallbackError) {
            const fallbackTransportError = this.handleTransportError(nextTransport, fallbackError);
            throw new Error(`Primary transport failed: ${transportError.message}. Fallback also failed: ${fallbackTransportError.message}`);
          }
        }
      }
      
      throw transportError;
    }
  }

  /**
   * Start a specific transport
   */
  private async startTransport(transport: 'stdio' | 'websocket' | 'http'): Promise<void> {
    switch (transport) {
      case 'stdio':
        this.transport = new StdioServerTransport();
        await this.server.connect(this.transport);
        break;
      
      case 'websocket':
        // WebSocket transport would be implemented here
        // For now, we'll simulate it
        throw new Error('WebSocket transport not yet implemented');
      
      case 'http':
        // HTTP transport would be implemented here
        // For now, we'll simulate it
        throw new Error('HTTP transport not yet implemented');
      
      default:
        throw new Error(`Unsupported transport: ${transport}`);
    }
  }

  /**
   * Get transport status and statistics
   */
  private getTransportStatus(): {
    supportedTransports: string[];
    preferredTransport: string;
    enableFallback: boolean;
    transportFailures: Record<string, { count: number; lastFailure: string }>;
  } {
    const failures: Record<string, { count: number; lastFailure: string }> = {};
    
    for (const [transport, failure] of this.transportFailures.entries()) {
      failures[transport] = {
        count: failure.count,
        lastFailure: failure.lastFailure.toISOString()
      };
    }

    return {
      supportedTransports: this.supportedTransports,
      preferredTransport: this.options.preferredTransport || 'stdio',
      enableFallback: this.enableFallback,
      transportFailures: failures
    };
  }

  /**
   * Check if connection limit allows new connections
   */
  private canAcceptNewConnection(): boolean {
    return this.connectionPool.size < this.maxConnections;
  }

  /**
   * Get connection by client ID
   */
  private getConnection(clientId: string): ConnectionHealth | undefined {
    return this.connectionPool.get(clientId);
  }

  /**
   * Setup error handling
   */
  private setupErrorHandling(): void {
    process.on('SIGINT', async () => {
      console.log(chalk.yellow('\n⚠️ Shutting down MCP server...'));
      await this.stop();
      process.exit(0);
    });

    process.on('uncaughtException', (error) => {
      console.error(chalk.red('Uncaught exception:'), error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error(chalk.red('Unhandled rejection at:'), promise, 'reason:', reason);
    });
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    await this.initialize();
    
    try {
      // Start server with transport fallback
      const activeTransport = await this.startWithTransportFallback();
      
      // Add the initial connection to the pool
      const initialClientId = this.generateClientId();
      this.addConnection(initialClientId, activeTransport, {
        name: `${activeTransport}-client`,
        version: '1.0.0'
      });
      
      if (this.options.verbose) {
        console.log(chalk.green('✅ Lanonasis MCP Server started'));
        console.log(chalk.gray(`Active transport: ${activeTransport}`));
        console.log(chalk.gray('Waiting for client connections...'));
        
        if (this.enableFallback) {
          console.log(chalk.gray('Transport fallback: enabled'));
        }
      }
      
      // Keep the process alive
      process.stdin.resume();
      
    } catch (error) {
      console.error(chalk.red('❌ Failed to start MCP Server:'));
      console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
      
      if (this.options.verbose) {
        console.log(chalk.yellow('\n🔧 Troubleshooting tips:'));
        console.log(chalk.cyan('• Check if all required dependencies are installed'));
        console.log(chalk.cyan('• Verify network connectivity and firewall settings'));
        console.log(chalk.cyan('• Try enabling transport fallback: --enable-fallback'));
        console.log(chalk.cyan('• Use --verbose for detailed error information'));
        
        const transportStatus = this.getTransportStatus();
        if (Object.keys(transportStatus.transportFailures).length > 0) {
          console.log(chalk.yellow('\n📊 Transport failure history:'));
          for (const [transport, failure] of Object.entries(transportStatus.transportFailures)) {
            console.log(chalk.gray(`  ${transport}: ${failure.count} failures (last: ${failure.lastFailure})`));
          }
        }
      }
      
      throw error;
    }
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    // Stop connection cleanup
    this.stopConnectionCleanup();
    
    // Clear all connections
    this.connectionPool.clear();
    
    if (this.transport) {
      await this.server.close();
      this.transport = null;
    }
    
    if (this.options.verbose) {
      console.log(chalk.gray('MCP Server stopped'));
    }
  }

  /**
   * Get server instance (for testing)
   */
  getServer(): Server {
    return this.server;
  }

  /**
   * Get connection pool for testing/monitoring
   */
  getConnectionPool(): Map<string, ConnectionHealth> {
    return new Map(this.connectionPool);
  }
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new LanonasisMCPServer({
    verbose: process.argv.includes('--verbose'),
    apiUrl: process.env.LANONASIS_API_URL,
    token: process.env.LANONASIS_TOKEN
  });

  server.start().catch((error) => {
    console.error(chalk.red('Failed to start server:'), error);
    process.exit(1);
  });
}
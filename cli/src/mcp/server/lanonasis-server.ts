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
}

export class LanonasisMCPServer {
  private server: Server;
  private config: CLIConfig;
  private apiClient: APIClient;
  private transport: StdioServerTransport | null = null;
  private options: LanonasisServerOptions;

  constructor(options: LanonasisServerOptions = {}) {
    this.options = options;
    
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

    if (this.options.verbose) {
      console.log(chalk.cyan('🚀 Lanonasis MCP Server initialized'));
      console.log(chalk.gray(`API URL: ${apiUrl}`));
      console.log(chalk.gray(`Authenticated: ${token ? 'Yes' : 'No'}`));
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
        }
      ]
    }));

    // Tool call handler (CallToolRequestSchema already imported above)
    this.server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
      const { name, arguments: args } = request.params;
      
      try {
        const result = await this.handleToolCall(name, args);
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
  }

  /**
   * Handle tool calls
   */
  private async handleToolCall(name: string, args: any): Promise<any> {
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
      timestamp: new Date().toISOString()
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
          mcpUseRemote: this.config.get('mcpUseRemote')
        };
      }
    } else if (args.action === 'set') {
      if (!args.key || !args.value) {
        throw new Error('Key and value required for set action');
      }
      
      this.config.set(args.key, args.value);
      await this.config.save();
      
      return { 
        success: true, 
        message: `Set ${args.key} to ${args.value}` 
      };
    }
    
    throw new Error('Invalid action');
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
    
    // Create and connect transport
    this.transport = new StdioServerTransport();
    await this.server.connect(this.transport);
    
    if (this.options.verbose) {
      console.log(chalk.green('✅ Lanonasis MCP Server started'));
      console.log(chalk.gray('Waiting for client connections...'));
    }
    
    // Keep the process alive
    process.stdin.resume();
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
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

#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { CLIConfig } from './utils/config.js';

// MCP Protocol Compliance: Redirect all console output to stderr
// This prevents stdout pollution which breaks JSON-RPC communication
const originalConsoleError = console.error;

// Silent mode for MCP protocol compliance
const isSilentMode = process.env.LANONASIS_SILENT === 'true' || process.argv.includes('--silent');

if (isSilentMode) {
  // Completely silence all output except JSON-RPC
  console.log = () => {};
  console.error = () => {};
  console.warn = () => {};
  console.info = () => {};
  console.debug = () => {};
} else {
  // Redirect to stderr for debugging
  console.log = (...args: unknown[]) => originalConsoleError('[MCP-LOG]', ...args);
  console.error = (...args: unknown[]) => originalConsoleError('[MCP-ERROR]', ...args);
  console.warn = (...args: unknown[]) => originalConsoleError('[MCP-WARN]', ...args);
  console.info = (...args: unknown[]) => originalConsoleError('[MCP-INFO]', ...args);
}

// Disable colors and verbose output for MCP protocol compliance
process.env.FORCE_COLOR = '0';
process.env.DEBUG = '';
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

class LanonasisMCPServer {
  private server: Server;
  private config: CLIConfig;

  constructor() {
    this.config = new CLIConfig();
    
    this.server = new Server(
      {
        name: 'lanonasis-mcp-server',
        version: '1.3.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    // List available tools - Comprehensive MCP toolset matching legacy CLI
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          // Memory Management Tools
          {
            name: 'create_memory',
            description: 'Create a new memory entry with vector embedding',
            inputSchema: {
              type: 'object',
              properties: {
                title: { type: 'string', description: 'Memory title' },
                content: { type: 'string', description: 'Memory content' },
                memory_type: { type: 'string', description: 'Type of memory', enum: ['context', 'project', 'knowledge', 'reference', 'personal', 'workflow'] },
                tags: { type: 'array', items: { type: 'string' }, description: 'Memory tags' },
                topic_id: { type: 'string', description: 'Topic ID for organization' }
              },
              required: ['title', 'content']
            }
          },
          {
            name: 'search_memories',
            description: 'Search through memories with semantic vector search',
            inputSchema: {
              type: 'object',
              properties: {
                query: { type: 'string', description: 'Search query' },
                memory_type: { type: 'string', description: 'Filter by memory type' },
                limit: { type: 'number', description: 'Maximum results to return', default: 10 },
                threshold: { type: 'number', description: 'Similarity threshold (0.0-1.0)', default: 0.7 },
                tags: { type: 'array', items: { type: 'string' }, description: 'Filter by tags' }
              },
              required: ['query']
            }
          },
          {
            name: 'get_memory',
            description: 'Get a specific memory by ID',
            inputSchema: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'Memory ID' }
              },
              required: ['id']
            }
          },
          {
            name: 'update_memory',
            description: 'Update an existing memory',
            inputSchema: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'Memory ID' },
                title: { type: 'string', description: 'Memory title' },
                content: { type: 'string', description: 'Memory content' },
                memory_type: { type: 'string', description: 'Type of memory' },
                tags: { type: 'array', items: { type: 'string' }, description: 'Memory tags' }
              },
              required: ['id']
            }
          },
          {
            name: 'delete_memory',
            description: 'Delete a memory by ID',
            inputSchema: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'Memory ID' }
              },
              required: ['id']
            }
          },
          {
            name: 'list_memories',
            description: 'List memories with pagination and filters',
            inputSchema: {
              type: 'object',
              properties: {
                limit: { type: 'number', description: 'Number of memories to return', default: 20 },
                offset: { type: 'number', description: 'Offset for pagination', default: 0 },
                memory_type: { type: 'string', description: 'Filter by memory type' },
                tags: { type: 'array', items: { type: 'string' }, description: 'Filter by tags' }
              }
            }
          },
          // API Key Management Tools
          {
            name: 'create_api_key',
            description: 'Create a new API key',
            inputSchema: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'API key name' },
                description: { type: 'string', description: 'API key description' },
                project_id: { type: 'string', description: 'Project ID' },
                access_level: { type: 'string', description: 'Access level', enum: ['public', 'authenticated', 'team', 'admin', 'enterprise'] },
                expires_in_days: { type: 'number', description: 'Expiration in days', default: 365 }
              },
              required: ['name']
            }
          },
          {
            name: 'list_api_keys',
            description: 'List API keys',
            inputSchema: {
              type: 'object',
              properties: {
                project_id: { type: 'string', description: 'Filter by project ID' },
                active_only: { type: 'boolean', description: 'Show only active keys', default: true }
              }
            }
          },
          {
            name: 'rotate_api_key',
            description: 'Rotate an API key',
            inputSchema: {
              type: 'object',
              properties: {
                key_id: { type: 'string', description: 'API key ID to rotate' }
              },
              required: ['key_id']
            }
          },
          {
            name: 'delete_api_key',
            description: 'Delete an API key',
            inputSchema: {
              type: 'object',
              properties: {
                key_id: { type: 'string', description: 'API key ID to delete' }
              },
              required: ['key_id']
            }
          },
          // Project Management Tools
          {
            name: 'create_project',
            description: 'Create a new project',
            inputSchema: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Project name' },
                description: { type: 'string', description: 'Project description' },
                organization_id: { type: 'string', description: 'Organization ID' }
              },
              required: ['name']
            }
          },
          {
            name: 'list_projects',
            description: 'List projects',
            inputSchema: {
              type: 'object',
              properties: {
                organization_id: { type: 'string', description: 'Filter by organization ID' }
              }
            }
          },
          // Organization Management Tools
          {
            name: 'get_organization_info',
            description: 'Get organization information',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          },
          // Authentication Tools
          {
            name: 'get_auth_status',
            description: 'Get authentication status',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          },
          // Configuration Tools
          {
            name: 'get_config',
            description: 'Get configuration settings',
            inputSchema: {
              type: 'object',
              properties: {
                key: { type: 'string', description: 'Specific config key to retrieve' }
              }
            }
          },
          {
            name: 'set_config',
            description: 'Set configuration setting',
            inputSchema: {
              type: 'object',
              properties: {
                key: { type: 'string', description: 'Configuration key' },
                value: { type: 'string', description: 'Configuration value' }
              },
              required: ['key', 'value']
            }
          },
          // Health and Status Tools
          {
            name: 'get_health_status',
            description: 'Get system health status',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          }
        ]
      };
    });

    // Handle tool calls - Comprehensive implementation
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        const apiKey = process.env.LANONASIS_API_KEY;
        const apiUrl = process.env.LANONASIS_API_URL || 'https://api.lanonasis.com';

        if (!apiKey) {
          return {
            content: [
              {
                type: 'text',
                text: 'Error: LANONASIS_API_KEY environment variable is required'
              }
            ]
          };
        }

        const headers = {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'lanonasis-mcp-server/1.3.0'
        };

        switch (name) {
          // Memory Management Tools
          case 'create_memory': {
            const response = await fetch(`${apiUrl}/api/v1/memory`, {
              method: 'POST',
              headers,
              body: JSON.stringify(args)
            });

            if (!response.ok) {
              const errorText = await response.text();
              throw new Error(`Memory creation failed: ${response.status} ${response.statusText} - ${errorText}`);
            }

            const result = await response.json();
            return {
              content: [
                {
                  type: 'text',
                  text: `✅ Memory created successfully:\n${JSON.stringify(result, null, 2)}`
                }
              ]
            };
          }

          case 'search_memories': {
            const queryParams = new URLSearchParams();
            if (args.query) queryParams.append('query', String(args.query));
            if (args.memory_type) queryParams.append('memory_type', String(args.memory_type));
            if (args.limit) queryParams.append('limit', args.limit.toString());
            if (args.threshold) queryParams.append('threshold', args.threshold.toString());
            if (args.tags && Array.isArray(args.tags)) {
              args.tags.forEach((tag: unknown) => queryParams.append('tags', String(tag)));
            }

            const response = await fetch(`${apiUrl}/api/v1/memory/search?${queryParams}`, {
              method: 'GET',
              headers
            });

            if (!response.ok) {
              const errorText = await response.text();
              throw new Error(`Memory search failed: ${response.status} ${response.statusText} - ${errorText}`);
            }

            const result = await response.json();
            return {
              content: [
                {
                  type: 'text',
                  text: `🔍 Search results (${result.length || 0} found):\n${JSON.stringify(result, null, 2)}`
                }
              ]
            };
          }

          case 'get_memory': {
            const response = await fetch(`${apiUrl}/api/v1/memory/${args.id}`, {
              method: 'GET',
              headers
            });

            if (!response.ok) {
              const errorText = await response.text();
              throw new Error(`Memory retrieval failed: ${response.status} ${response.statusText} - ${errorText}`);
            }

            const result = await response.json();
            return {
              content: [
                {
                  type: 'text',
                  text: `📄 Memory details:\n${JSON.stringify(result, null, 2)}`
                }
              ]
            };
          }

          case 'update_memory': {
            const { id, ...updateData } = args;
            const response = await fetch(`${apiUrl}/api/v1/memory/${id}`, {
              method: 'PUT',
              headers,
              body: JSON.stringify(updateData)
            });

            if (!response.ok) {
              const errorText = await response.text();
              throw new Error(`Memory update failed: ${response.status} ${response.statusText} - ${errorText}`);
            }

            const result = await response.json();
            return {
              content: [
                {
                  type: 'text',
                  text: `✏️ Memory updated successfully:\n${JSON.stringify(result, null, 2)}`
                }
              ]
            };
          }

          case 'delete_memory': {
            const response = await fetch(`${apiUrl}/api/v1/memory/${args.id}`, {
              method: 'DELETE',
              headers
            });

            if (!response.ok) {
              const errorText = await response.text();
              throw new Error(`Memory deletion failed: ${response.status} ${response.statusText} - ${errorText}`);
            }

            return {
              content: [
                {
                  type: 'text',
                  text: `🗑️ Memory deleted successfully (ID: ${args.id})`
                }
              ]
            };
          }

          case 'list_memories': {
            const queryParams = new URLSearchParams();
            if (args.limit) queryParams.append('limit', args.limit.toString());
            if (args.offset) queryParams.append('offset', args.offset.toString());
            if (args.memory_type) queryParams.append('memory_type', String(args.memory_type));
            if (args.tags && Array.isArray(args.tags)) {
              args.tags.forEach((tag: unknown) => queryParams.append('tags', String(tag)));
            }

            const response = await fetch(`${apiUrl}/api/v1/memory?${queryParams}`, {
              method: 'GET',
              headers
            });

            if (!response.ok) {
              const errorText = await response.text();
              throw new Error(`Memory listing failed: ${response.status} ${response.statusText} - ${errorText}`);
            }

            const result = await response.json();
            return {
              content: [
                {
                  type: 'text',
                  text: `📋 Memory list (${result.length || 0} items):\n${JSON.stringify(result, null, 2)}`
                }
              ]
            };
          }

          // API Key Management Tools
          case 'create_api_key': {
            const response = await fetch(`${apiUrl}/api/v1/api-keys`, {
              method: 'POST',
              headers,
              body: JSON.stringify(args)
            });

            if (!response.ok) {
              const errorText = await response.text();
              throw new Error(`API key creation failed: ${response.status} ${response.statusText} - ${errorText}`);
            }

            const result = await response.json();
            return {
              content: [
                {
                  type: 'text',
                  text: `🔑 API key created successfully:\n${JSON.stringify(result, null, 2)}`
                }
              ]
            };
          }

          case 'list_api_keys': {
            const queryParams = new URLSearchParams();
            if (args.project_id) queryParams.append('project_id', String(args.project_id));
            if (args.active_only !== undefined) queryParams.append('active_only', args.active_only.toString());

            const response = await fetch(`${apiUrl}/api/v1/api-keys?${queryParams}`, {
              method: 'GET',
              headers
            });

            if (!response.ok) {
              const errorText = await response.text();
              throw new Error(`API key listing failed: ${response.status} ${response.statusText} - ${errorText}`);
            }

            const result = await response.json();
            return {
              content: [
                {
                  type: 'text',
                  text: `🔑 API keys (${result.length || 0} found):\n${JSON.stringify(result, null, 2)}`
                }
              ]
            };
          }

          case 'get_health_status': {
            const response = await fetch(`${apiUrl}/api/v1/health`, {
              method: 'GET',
              headers
            });

            if (!response.ok) {
              const errorText = await response.text();
              throw new Error(`Health check failed: ${response.status} ${response.statusText} - ${errorText}`);
            }

            const result = await response.json();
            return {
              content: [
                {
                  type: 'text',
                  text: `💚 System health status:\n${JSON.stringify(result, null, 2)}`
                }
              ]
            };
          }

          default:
            return {
              content: [
                {
                  type: 'text',
                  text: `❌ Unknown tool: ${name}. Available tools: create_memory, search_memories, get_memory, update_memory, delete_memory, list_memories, create_api_key, list_api_keys, get_health_status`
                }
              ]
            };
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [
            {
              type: 'text',
              text: `❌ Error: ${errorMessage}`
            }
          ]
        };
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    // Log to stderr that server is ready
    console.error('[MCP-INFO] Lanonasis MCP Server started and ready');
  }
}

// Start the server
const server = new LanonasisMCPServer();
server.run().catch((error) => {
  console.error('[MCP-ERROR] Failed to start server:', error);
  process.exit(1);
});

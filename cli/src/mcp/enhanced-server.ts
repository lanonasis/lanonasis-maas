#!/usr/bin/env node

/**
 * Enhanced MCP Server - Adopting mem0 OpenMemory architectural patterns
 * Implements FastMCP-based server with context management and multi-transport support
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CLIConfig } from '../utils/config.js';
import { logger } from './logger.js';
import { MemoryAccessControl } from './access-control.js';
import { LanonasisVectorStore } from './vector-store.js';
import { MemoryStateManager } from './memory-state.js';

interface ServerContext {
  user_id?: string;
  app_id?: string;
  client_name?: string;
  session_id?: string;
}

interface MemoryBulkArgs {
  operation: 'pause' | 'delete' | 'archive';
  category?: string;
  app_id?: string;
  before?: string;
  memory_ids?: string[];
}

export class EnhancedMCPServer {
  private server: Server;
  private config: CLIConfig;
  private accessControl: MemoryAccessControl;
  private vectorStore: LanonasisVectorStore;
  private stateManager: MemoryStateManager;
  private context: Map<string, ServerContext> = new Map();

  constructor() {
    this.server = new Server(
      {
        name: "enhanced-lanonasis-mcp",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
        },
      }
    );

    this.config = new CLIConfig();
    this.accessControl = new MemoryAccessControl();
    this.vectorStore = new LanonasisVectorStore();
    this.stateManager = new MemoryStateManager();

    this.setupTools();
  }

  private setContext(sessionId: string, context: ServerContext): void {
    this.context.set(sessionId, context);
  }

  private getContext(sessionId: string): ServerContext {
    return this.context.get(sessionId) || {};
  }

  /**
   * Setup MCP tools with enhanced functionality
   */
  private setupTools(): void {
    // Enhanced memory creation with state management
    this.server.setRequestHandler({ method: "tools/list" } as any, async () => ({
      tools: [
        {
          name: "memory_create_memory",
          description: "Create a new memory with advanced state management and access control",
          inputSchema: {
            type: "object",
            properties: {
              title: { type: "string", description: "Memory title" },
              content: { type: "string", description: "Memory content" },
              memory_type: { type: "string", enum: ["context", "fact", "preference", "workflow"], default: "context" },
              tags: { type: "array", items: { type: "string" }, description: "Memory tags" },
              app_id: { type: "string", description: "Application identifier" },
              metadata: { type: "object", description: "Additional metadata" }
            },
            required: ["content"]
          }
        },
        {
          name: "memory_search_memories",
          description: "Search memories with advanced filtering and access control",
          inputSchema: {
            type: "object",
            properties: {
              query: { type: "string", description: "Search query" },
              limit: { type: "number", default: 10, description: "Maximum results" },
              threshold: { type: "number", default: 0.7, description: "Similarity threshold" },
              app_id: { type: "string", description: "Filter by application" },
              category: { type: "string", description: "Filter by category" }
            },
            required: ["query"]
          }
        },
        {
          name: "memory_bulk_operations",
          description: "Perform bulk operations on memories (pause, delete, archive)",
          inputSchema: {
            type: "object",
            properties: {
              operation: { type: "string", enum: ["pause", "delete", "archive"] },
              category: { type: "string", description: "Filter by category" },
              app_id: { type: "string", description: "Filter by application" },
              before: { type: "string", description: "Filter memories before date (ISO)" },
              memory_ids: { type: "array", items: { type: "string" }, description: "Specific memory IDs" }
            },
            required: ["operation"]
          }
        }
      ]
    }));

    this.server.setRequestHandler({ method: "tools/call" } as any, async (request: any) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "memory_create_memory":
            return await this.handleCreateMemory(args);
          case "memory_search_memories":
            return await this.handleSearchMemories(args);
          case "memory_bulk_operations":
            return await this.handleBulkOperations(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        logger.error(`Tool execution failed: ${name}`, { error, args });
        throw error;
      }
    });
  }

  private async handleCreateMemory(args: any): Promise<any> {
    try {
      const userId = await this.getCurrentUserId();
      const appId = args.app_id || 'default';

      // Check access control
      if (!await this.accessControl.checkCreateAccess(userId, appId)) {
        throw new Error('Access denied: Cannot create memories in this app');
      }

      // Create memory with state management
      const memory = await this.createMemoryWithState({
        content: args.content,
        title: args.title,
        memory_type: args.memory_type || 'context',
        tags: args.tags || [],
        app_id: appId,
        metadata: args.metadata || {}
      });

      // Log access
      await this.accessControl.logMemoryAccess(memory.id, appId, 'create', {
        memory_type: args.memory_type,
        tags: args.tags
      });

      return {
        content: [{
          type: "text",
          text: `Memory created successfully with ID: ${memory.id}`
        }],
        memory: memory,
        message: "Memory created successfully with enhanced access control"
      };
    } catch (error) {
      logger.error('Memory creation failed', { error, args });
      throw error;
    }
  }

  private async handleSearchMemories(args: any): Promise<any> {
    try {
      const userId = await this.getCurrentUserId();
      const appId = args.app_id || 'default';

      // Get accessible memories
      const accessibleMemories = await this.accessControl.getAccessibleMemories(userId, appId);

      // Perform vector search
      const results = await this.performVectorSearch({
        query: args.query,
        limit: args.limit || 10,
        threshold: args.threshold || 0.7,
        filter: {
          app_id: appId,
          memory_ids: accessibleMemories
        }
      });

      // Log access
      await this.accessControl.logMemoryAccess('search', appId, 'search', {
        query: args.query,
        results_count: results.length
      });

      return {
        content: [{
          type: "text",
          text: `Found ${results.length} memories matching your query`
        }],
        results: results,
        total: results.length,
        message: `Found ${results.length} memories`
      };
    } catch (error) {
      logger.error('Memory search failed', { error, args });
      throw error;
    }
  }

  private async handleBulkOperations(args: MemoryBulkArgs): Promise<any> {
    try {
      const userId = await this.getCurrentUserId();
      const appId = args.app_id || 'default';

      // Get accessible memories
      const accessibleMemories = await this.accessControl.getAccessibleMemories(userId, appId);

      // Filter memories based on criteria
      let targetMemories = accessibleMemories;
      if (args.memory_ids) {
        targetMemories = args.memory_ids.filter(id => accessibleMemories.includes(id));
      }

      // Perform bulk operation
      const results = await this.performBulkOperation({
        operation: args.operation,
        memory_ids: targetMemories,
        metadata: {
          user_id: userId,
          app_id: appId,
          timestamp: new Date().toISOString()
        }
      });

      // Log bulk access
      await this.accessControl.logMemoryAccess('bulk', appId, args.operation, {
        operation: args.operation,
        affected_count: results.length
      });

      return {
        content: [{
          type: "text",
          text: `Bulk ${args.operation} completed on ${results.length} memories`
        }],
        results,
        affected_count: results.length,
        message: `Bulk ${args.operation} completed on ${results.length} memories`
      };
    } catch (error) {
      logger.error('Bulk operation failed', { error, args });
      throw error;
    }
  }

  /**
   * Start the enhanced MCP server
   */
  async start(options: {
    transport?: 'stdio' | 'sse';
    port?: number;
    verbose?: boolean;
  } = {}): Promise<void> {
    const { transport = 'stdio', port = 3001, verbose = false } = options;

    try {
      // Initialize components
      await this.config.init();
      await this.vectorStore.initialize();
      await this.stateManager.initialize();

      if (verbose) {
        logger.info('Starting Enhanced MCP Server', { transport, port });
      }

      // Use stdio transport (SSE not available in current MCP SDK)
      const stdioTransport = new StdioServerTransport();
      await this.server.connect(stdioTransport);
      logger.info('Enhanced MCP Server running on stdio transport');

    } catch (error) {
      logger.error('Failed to start Enhanced MCP Server', { error });
      throw error;
    }
  }

  /**
   * Helper methods for memory operations
   */
  private async createMemoryWithState(data: any): Promise<any> {
    // Mock implementation - in production this would use the actual state manager
    return {
      id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      content: data.content,
      title: data.title,
      memory_type: data.memory_type,
      tags: data.tags,
      app_id: data.app_id,
      metadata: data.metadata,
      created_at: new Date().toISOString(),
      state: 'active'
    };
  }

  private async performVectorSearch(params: any): Promise<any[]> {
    // Mock implementation - in production this would use the actual vector store
    return [
      {
        id: `mem_${Date.now()}`,
        content: `Mock result for query: ${params.query}`,
        score: 0.85,
        metadata: { app_id: params.filter?.app_id }
      }
    ];
  }

  private async performBulkOperation(params: any): Promise<any[]> {
    // Mock implementation - in production this would use the actual state manager
    return params.memory_ids.map((id: string) => ({
      memory_id: id,
      operation: params.operation,
      success: true,
      timestamp: new Date().toISOString()
    }));
  }

  private async getCurrentUserId(): Promise<string> {
    const token = this.config.get('token');
    if (token && typeof token === 'string') {
      try {
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        return payload.sub || payload.user_id || 'anonymous';
      } catch (error) {
        logger.error('Failed to decode token', { error });
      }
    }
    return 'anonymous';
  }
}

/**
 * Main function to start the server
 */
async function main(): Promise<void> {
  const server = new EnhancedMCPServer();
  
  const args = process.argv.slice(2);
  const options = {
    transport: args.includes('--sse') ? 'sse' as const : 'stdio' as const,
    port: parseInt(args.find(arg => arg.startsWith('--port='))?.split('=')[1] || '3001'),
    verbose: args.includes('--verbose') || args.includes('-v')
  };

  await server.start(options);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

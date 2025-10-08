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

interface MemoryCreateArgs {
  title: string;
  content: string;
  memory_type?: string;
  tags?: string[];
  app_id?: string;
  metadata?: Record<string, any>;
}

interface MemorySearchArgs {
  query: string;
  limit?: number;
  threshold?: number;
  app_id?: string;
  category?: string;
  since?: string;
  before?: string;
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
    this.config = new CLIConfig();
    this.server = new Server({
      name: "lanonasis-maas-server",
      version: "1.0.0"
    }, {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {}
      }
    });
    
    this.accessControl = new MemoryAccessControl();
    this.vectorStore = new LanonasisVectorStore();
    this.stateManager = new MemoryStateManager();
    
    this.setupTools();
    this.setupResources();
    this.setupPrompts();
  }

  /**
   * Context variable management (inspired by mem0's contextvars)
   */
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
    this.server.tool("memory_create_memory", {
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
        required: ["title", "content"]
      }
    }, async (args: MemoryCreateArgs, context) => {
      const sessionContext = this.getContext(context.sessionId || 'default');
      
      try {
        // Enhanced memory creation with access control
        const memoryData = {
          ...args,
          user_id: sessionContext.user_id || await this.getCurrentUserId(),
          app_id: args.app_id || sessionContext.app_id || 'default',
          state: 'active' as const,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        // Check access permissions
        const hasAccess = await this.accessControl.checkCreateAccess(
          memoryData.user_id,
          memoryData.app_id
        );

        if (!hasAccess) {
          throw new Error('Insufficient permissions to create memory');
        }

        // Create memory via API
        const response = await this.callMemoryAPI('POST', '/memory', memoryData);
        
        // Add to vector store if configured
        if (this.vectorStore.isConfigured()) {
          await this.vectorStore.addMemory(response.id, args.content, {
            title: args.title,
            tags: args.tags || [],
            memory_type: args.memory_type || 'context'
          });
        }

        // Log access
        await this.accessControl.logMemoryAccess(
          response.id,
          memoryData.app_id,
          'create'
        );

        return {
          success: true,
          memory: response,
          message: "Memory created successfully with enhanced access control"
        };
      } catch (error) {
        logger.error('Memory creation failed', { error, args });
        throw error;
      }
    });

    // Enhanced memory search with filtering
    this.mcp.tool("memory_search_memories", {
      description: "Search memories with advanced filtering and access control",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query" },
          limit: { type: "number", default: 10, description: "Maximum results" },
          threshold: { type: "number", default: 0.7, description: "Similarity threshold" },
          app_id: { type: "string", description: "Filter by application" },
          category: { type: "string", description: "Filter by category" },
          since: { type: "string", description: "Filter memories since date (ISO)" },
          before: { type: "string", description: "Filter memories before date (ISO)" }
        },
        required: ["query"]
      }
    }, async (args: MemorySearchArgs, context) => {
      const sessionContext = this.getContext(context.sessionId || 'default');
      const userId = sessionContext.user_id || await this.getCurrentUserId();

      try {
        // Get accessible memories for user/app
        const accessibleMemories = await this.accessControl.getAccessibleMemories(
          userId,
          args.app_id || sessionContext.app_id || 'default'
        );

        // Enhanced search with vector store if available
        let results;
        if (this.vectorStore.isConfigured()) {
          results = await this.vectorStore.searchMemories(args.query, {
            limit: args.limit,
            threshold: args.threshold,
            memoryIds: accessibleMemories,
            category: args.category,
            since: args.since,
            before: args.before
          });
        } else {
          // Fallback to API search
          const searchParams = new URLSearchParams({
            query: args.query,
            limit: args.limit?.toString() || '10',
            ...(args.app_id && { app_id: args.app_id }),
            ...(args.category && { category: args.category }),
            ...(args.since && { since: args.since }),
            ...(args.before && { before: args.before })
          });

          results = await this.callMemoryAPI('GET', `/memory/search?${searchParams}`);
        }

        // Log search access
        await this.accessControl.logMemoryAccess(
          'search',
          args.app_id || 'default',
          'search'
        );

        return {
          success: true,
          results: results.memories || results,
          total: results.total || results.length,
          message: `Found ${results.length || 0} memories`
        };
      } catch (error) {
        logger.error('Memory search failed', { error, args });
        throw error;
      }
    });

    // Bulk memory operations (inspired by mem0)
    this.mcp.tool("memory_bulk_operations", {
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
    }, async (args: MemoryBulkArgs, context) => {
      const sessionContext = this.getContext(context.sessionId || 'default');
      const userId = sessionContext.user_id || await this.getCurrentUserId();

      try {
        // Get memories to operate on
        let targetMemories: string[] = [];
        
        if (args.memory_ids) {
          targetMemories = args.memory_ids;
        } else {
          // Get memories by filters
          const accessibleMemories = await this.accessControl.getAccessibleMemories(
            userId,
            args.app_id || sessionContext.app_id || 'default'
          );
          
          // Apply additional filters
          targetMemories = await this.filterMemoriesByBulkCriteria(
            accessibleMemories,
            args
          );
        }

        // Check permissions for each memory
        const allowedMemories = [];
        for (const memoryId of targetMemories) {
          const hasAccess = await this.accessControl.checkMemoryAccess(
            memoryId,
            args.app_id || 'default'
          );
          if (hasAccess) {
            allowedMemories.push(memoryId);
          }
        }

        // Perform bulk operation
        const results = await this.stateManager.bulkUpdateState(
          allowedMemories,
          args.operation
        );

        // Log bulk operation
        await this.accessControl.logMemoryAccess(
          `bulk_${args.operation}`,
          args.app_id || 'default',
          'bulk_operation'
        );

        return {
          success: true,
          operation: args.operation,
          affected_count: results.length,
          results,
          message: `Bulk ${args.operation} completed on ${results.length} memories`
        };
      } catch (error) {
        logger.error('Bulk operation failed', { error, args });
        throw error;
      }
    });

    // Related memory discovery (mem0 feature)
    this.mcp.tool("memory_find_related", {
      description: "Find memories related to a specific memory by shared categories and content similarity",
      inputSchema: {
        type: "object",
        properties: {
          memory_id: { type: "string", description: "Source memory ID" },
          limit: { type: "number", default: 5, description: "Maximum related memories" },
          threshold: { type: "number", default: 0.6, description: "Similarity threshold" }
        },
        required: ["memory_id"]
      }
    }, async (args, context) => {
      const sessionContext = this.getContext(context.sessionId || 'default');
      const userId = sessionContext.user_id || await this.getCurrentUserId();

      try {
        // Check access to source memory
        const hasAccess = await this.accessControl.checkMemoryAccess(
          args.memory_id,
          sessionContext.app_id || 'default'
        );

        if (!hasAccess) {
          throw new Error('Access denied to source memory');
        }

        // Get source memory
        const sourceMemory = await this.callMemoryAPI('GET', `/memory/${args.memory_id}`);
        
        // Find related memories
        let relatedMemories;
        if (this.vectorStore.isConfigured()) {
          relatedMemories = await this.vectorStore.findRelatedMemories(
            args.memory_id,
            {
              limit: args.limit,
              threshold: args.threshold,
              excludeId: args.memory_id
            }
          );
        } else {
          // Fallback to category-based search
          relatedMemories = await this.findRelatedByCategories(
            sourceMemory,
            args.limit
          );
        }

        // Hydrate and reshape vector-store results to match CLI expectations
        const enriched = await Promise.all(
          relatedMemories.map(async result => {
            const memory = await this.callMemoryAPI('GET', `/memory/${result.id}`);
            return {
              ...memory,
              relevance_score: result.score,
              metadata: result.metadata
            };
          })
        );

        return {
          success: true,
          source_memory: sourceMemory,
          related_memories: enriched,
          count: enriched.length,
          message: `Found ${enriched.length} related memories`
        };
      } catch (error) {
        logger.error('Related memory search failed', { error, args });
        throw error;
      }
    });
  }

  /**
   * Setup MCP resources
   */
  private setupResources(): void {
    this.mcp.resource("memory://user/{user_id}/memories", {
      description: "User's memory collection",
      mimeType: "application/json"
    }, async (uri) => {
      const userId = this.extractUserIdFromUri(uri);
      const memories = await this.callMemoryAPI('GET', `/memory?user_id=${userId}`);
      
      return {
        contents: [{
          uri,
          mimeType: "application/json",
          text: JSON.stringify(memories, null, 2)
        }]
      };
    });

    this.mcp.resource("memory://app/{app_id}/memories", {
      description: "Application-specific memory collection",
      mimeType: "application/json"
    }, async (uri) => {
      const appId = this.extractAppIdFromUri(uri);
      const memories = await this.callMemoryAPI('GET', `/memory?app_id=${appId}`);
      
      return {
        contents: [{
          uri,
          mimeType: "application/json",
          text: JSON.stringify(memories, null, 2)
        }]
      };
    });
  }

  /**
   * Setup MCP prompts
   */
  private setupPrompts(): void {
    this.mcp.prompt("memory_context", {
      description: "Generate context from user's memories for AI conversations",
      arguments: [{
        name: "query",
        description: "Context query to search memories",
        required: true
      }, {
        name: "limit",
        description: "Maximum memories to include",
        required: false
      }]
    }, async (args) => {
      const memories = await this.mcp.invokeTool("memory_search_memories", {
        query: args.query,
        limit: parseInt(args.limit || '5')
      });

      const context = memories.results.map((m: any) => 
        `${m.title}: ${m.content}`
      ).join('\n\n');

      return {
        description: `Context from ${memories.results.length} relevant memories`,
        messages: [{
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `Relevant context from my memories:\n\n${context}`
          }
        }]
      };
    });
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

      if (transport === 'sse') {
        const sseTransport = new SseServerTransport("/mcp/messages/", port);
        await this.mcp.connect(sseTransport);
        logger.info(`Enhanced MCP Server running on SSE transport at port ${port}`);
      } else {
        const stdioTransport = new StdioServerTransport();
        await this.mcp.connect(stdioTransport);
        logger.info('Enhanced MCP Server running on stdio transport');
      }
    } catch (error) {
      logger.error('Failed to start Enhanced MCP Server', { error });
      throw error;
    }
  }

  /**
   * Helper methods
   */
  private async getCurrentUserId(): Promise<string> {
    // Extract from token or config
    const token = this.config.get('token');
    if (token) {
      // Decode JWT to get user ID
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      return payload.sub || payload.user_id || 'anonymous';
    }
    return 'anonymous';
  }

  private async callMemoryAPI(method: string, endpoint: string, data?: any): Promise<any> {
    const apiUrl = this.config.get('apiUrl') || 'https://api.lanonasis.com';
    const token = this.config.get('token');

    const axios = (await import('axios')).default;
    
    const response = await axios({
      method,
      url: `${apiUrl}/api/v1${endpoint}`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data
    });

    return response.data;
  }

  private extractUserIdFromUri(uri: string): string {
    const match = uri.match(/memory:\/\/user\/([^\/]+)/);
    return match ? match[1] : 'unknown';
  }

  private extractAppIdFromUri(uri: string): string {
    const match = uri.match(/memory:\/\/app\/([^\/]+)/);
    return match ? match[1] : 'unknown';
  }

  private async filterMemoriesByBulkCriteria(
    memories: string[],
    criteria: MemoryBulkArgs
  ): Promise<string[]> {
    // Implementation would filter memories based on criteria
    // This is a placeholder for the actual filtering logic
    return memories;
  }

  private async findRelatedByCategories(
    sourceMemory: any,
    limit: number
  ): Promise<any[]> {
    // Fallback implementation for finding related memories
    // This would use category matching and other heuristics
    return [];
  }
}

// Main execution
async function main() {
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

export { EnhancedMCPServer };
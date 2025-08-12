/**
 * Execution Agent
 * Handles actual execution of memory operations and external API calls
 */

import { BaseAgent, AgentConfig, AgentRequest, AgentResponse, AgentContext } from './base-agent';

// Use globalThis for Node.js globals to avoid redeclaration errors
const { AbortController, setTimeout, clearTimeout } = globalThis;

interface MemoryOperation {
  type: 'create' | 'search' | 'update' | 'delete' | 'list';
  payload: Record<string, unknown>;
  context: AgentContext;
}

interface APICall {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  endpoint: string;
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
}

export class ExecutionAgent extends BaseAgent {
  private apiBaseUrl: string;
  private defaultHeaders: Record<string, string>;

  constructor() {
    const config: AgentConfig = {
      name: 'ExecutionAgent',
      description: 'Executes memory operations and external API calls',
      capabilities: ['execute', 'api', 'memory', 'crud', 'database'],
      priority: 9,
      timeout: 30000
    };
    
    super(config);
    
    this.apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'User-Agent': 'ExecutionAgent/1.0'
    };
  }

  async process(request: AgentRequest): Promise<AgentResponse> {
    const { input, context, parameters } = request;

    try {
      // Memory operations
      if (this.isMemoryOperation(input, parameters)) {
        return await this.executeMemoryOperation({
          type: this.determineMemoryOperation(input, parameters),
          payload: parameters?.payload as Record<string, unknown> || {},
          context
        });
      }

      // API calls
      if (parameters?.api_call) {
        return await this.executeAPICall(parameters.api_call as APICall, context);
      }

      // Batch operations
      if (parameters?.batch_operations) {
        return await this.executeBatchOperations(
          parameters.batch_operations as MemoryOperation[],
          context
        );
      }

      // Health check
      if (input.includes('health') || parameters?.operation === 'health_check') {
        return await this.performHealthCheck();
      }

      // Default: try to infer operation from input
      return await this.inferAndExecute(input, context, parameters);

    } catch (error) {
      return {
        success: false,
        error: `Execution failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Execute memory operations
   */
  private async executeMemoryOperation(operation: MemoryOperation): Promise<AgentResponse> {
    const { type, payload, context } = operation;

    try {
      let endpoint: string;
      let method: 'GET' | 'POST' | 'PUT' | 'DELETE';
      let body: unknown = undefined;

      switch (type) {
        case 'create':
          endpoint = '/api/v1/memory';
          method = 'POST';
          body = {
            title: payload.title || 'Untitled Memory',
            content: payload.content || '',
            memory_type: payload.memory_type || 'context',
            tags: payload.tags || [],
            metadata: payload.metadata || {}
          };
          break;

        case 'search':
          endpoint = '/api/v1/memory/search';
          method = 'POST';
          body = {
            query: payload.query || '',
            limit: payload.limit || 10,
            threshold: payload.threshold || 0.7,
            memory_types: payload.memory_types || undefined,
            tags: payload.tags || undefined
          };
          break;

        case 'update': {
          if (!payload.id) {
            throw new Error('Memory ID required for update operation');
          }
          endpoint = `/api/v1/memory/${payload.id}`;
          method = 'PUT';
          const updateBody: Record<string, unknown> = {};
          if (payload.title) updateBody.title = payload.title;
          if (payload.content) updateBody.content = payload.content;
          if (payload.memory_type) updateBody.memory_type = payload.memory_type;
          if (payload.tags) updateBody.tags = payload.tags;
          if (payload.metadata) updateBody.metadata = payload.metadata;
          body = updateBody;
          break;
        }

        case 'delete':
          if (!payload.id) {
            throw new Error('Memory ID required for delete operation');
          }
          endpoint = `/api/v1/memory/${payload.id}`;
          method = 'DELETE';
          break;

        case 'list': {
          const queryParams = new URLSearchParams();
          if (payload.limit) queryParams.append('limit', String(payload.limit));
          if (payload.memory_type) queryParams.append('memory_type', String(payload.memory_type));
          if (payload.tags && Array.isArray(payload.tags)) {
            queryParams.append('tags', (payload.tags as string[]).join(','));
          }
          endpoint = `/api/v1/memory${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
          method = 'GET';
          break;
        }

        default:
          throw new Error(`Unsupported memory operation: ${type}`);
      }

      const headers = {
        ...this.defaultHeaders,
        ...(context.user_id && { 'X-User-ID': context.user_id })
      };

      const result = await this.makeAPIRequest({
        method,
        endpoint,
        headers,
        body,
        timeout: 30000
      });

      return {
        success: result.success,
        data: result.data,
        error: result.error || '',
        metadata: {
          operation: type,
          endpoint,
          method
        }
      };

    } catch (error) {
      return {
        success: false,
        error: `Memory operation failed: ${error instanceof Error ? error.message : String(error)}`,
        metadata: {
          operation: type
        }
      };
    }
  }

  /**
   * Execute external API calls
   */
  private async executeAPICall(apiCall: APICall, context: AgentContext): Promise<AgentResponse> {
    try {
      const headers = {
        ...this.defaultHeaders,
        ...apiCall.headers,
        ...(context.user_id && { 'X-User-ID': context.user_id })
      };

      const result = await this.makeAPIRequest({
        method: apiCall.method,
        endpoint: apiCall.endpoint,
        headers,
        body: apiCall.body,
        timeout: apiCall.timeout || 30000
      });

      return {
        success: result.success,
        data: result.data,
        error: result.error || '',
        metadata: {
          api_call: {
            method: apiCall.method,
            endpoint: apiCall.endpoint
          }
        }
      };

    } catch (error) {
      return {
        success: false,
        error: `API call failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Execute batch operations
   */
  private async executeBatchOperations(
    operations: MemoryOperation[],
    context: AgentContext
  ): Promise<AgentResponse> {
    const results: Array<{ operation: MemoryOperation; result: AgentResponse }> = [];
    let successCount = 0;
    let errorCount = 0;

    for (const operation of operations) {
      try {
        const result = await this.executeMemoryOperation({
          ...operation,
          context
        });

        results.push({ operation, result });

        if (result.success) {
          successCount++;
        } else {
          errorCount++;
        }

      } catch (error) {
        const errorResult: AgentResponse = {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        };
        
        results.push({ operation, result: errorResult });
        errorCount++;
      }
    }

    return {
      success: errorCount === 0,
      data: {
        results,
        summary: {
          total: operations.length,
          success: successCount,
          errors: errorCount,
          success_rate: (successCount / operations.length) * 100
        }
      },
      metadata: {
        batch_size: operations.length
      }
    };
  }

  /**
   * Perform health check
   */
  private async performHealthCheck(): Promise<AgentResponse> {
    try {
      const result = await this.makeAPIRequest({
        method: 'GET',
        endpoint: '/health',
        timeout: 5000
      });

      return {
        success: result.success,
        data: {
          status: result.success ? 'healthy' : 'unhealthy',
          api_response: result.data,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      return {
        success: false,
        error: `Health check failed: ${error instanceof Error ? error.message : String(error)}`,
        data: {
          status: 'unhealthy',
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Infer operation from natural language input
   */
  private async inferAndExecute(
    input: string,
    context: AgentContext,
    parameters?: Record<string, unknown>
  ): Promise<AgentResponse> {
    const lowerInput = input.toLowerCase();

    // Simple inference rules
    if (lowerInput.includes('create') || lowerInput.includes('add') || lowerInput.includes('save')) {
      return await this.executeMemoryOperation({
        type: 'create',
        payload: {
          title: this.extractTitle(input),
          content: this.extractContent(input),
          memory_type: this.extractMemoryType(input) || 'context',
          tags: this.extractTags(input)
        },
        context
      });
    }

    if (lowerInput.includes('search') || lowerInput.includes('find') || lowerInput.includes('look')) {
      return await this.executeMemoryOperation({
        type: 'search',
        payload: {
          query: this.extractSearchQuery(input),
          limit: parameters?.limit || 10
        },
        context
      });
    }

    if (lowerInput.includes('list') || lowerInput.includes('show all') || lowerInput.includes('get all')) {
      return await this.executeMemoryOperation({
        type: 'list',
        payload: {
          limit: parameters?.limit || 20
        },
        context
      });
    }

    return {
      success: false,
      error: `Could not infer operation from input: "${input}"`
    };
  }

  /**
   * Make HTTP API request
   */
  private async makeAPIRequest(request: {
    method: string;
    endpoint: string;
    headers?: Record<string, string>;
    body?: unknown;
    timeout?: number;
  }): Promise<{ success: boolean; data?: unknown; error?: string }> {
    const url = request.endpoint.startsWith('http') 
      ? request.endpoint 
      : `${this.apiBaseUrl}${request.endpoint}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, request.timeout || 30000);

    try {
      const fetchOptions: RequestInit = {
        method: request.method,
        headers: request.headers || this.defaultHeaders,
        signal: controller.signal
      };
      
      if (request.body) {
        fetchOptions.body = JSON.stringify(request.body);
      }
      
      const response = await fetch(url, fetchOptions);

      (globalThis.clearTimeout || clearTimeout)(timeoutId);

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        return {
          success: false,
          error: data?.error || `HTTP ${response.status}: ${response.statusText}`
        };
      }

      return {
        success: true,
        data
      };

    } catch (error) {
      (globalThis.clearTimeout || clearTimeout)(timeoutId);
      
      if ((error as Error).name === 'AbortError') {
        return {
          success: false,
          error: 'Request timeout'
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  // Helper methods for parsing natural language input
  private isMemoryOperation(input: string, parameters?: Record<string, unknown>): boolean {
    const memoryKeywords = ['memory', 'note', 'save', 'create', 'search', 'find', 'list', 'update', 'delete'];
    return memoryKeywords.some(keyword => input.toLowerCase().includes(keyword)) ||
           parameters?.memory_operation !== undefined;
  }

  private determineMemoryOperation(input: string, parameters?: Record<string, unknown>): MemoryOperation['type'] {
    if (parameters?.memory_operation) {
      return parameters.memory_operation as MemoryOperation['type'];
    }

    const lowerInput = input.toLowerCase();
    
    if (lowerInput.includes('create') || lowerInput.includes('add') || lowerInput.includes('save')) {
      return 'create';
    }
    if (lowerInput.includes('search') || lowerInput.includes('find')) {
      return 'search';
    }
    if (lowerInput.includes('update') || lowerInput.includes('edit') || lowerInput.includes('modify')) {
      return 'update';
    }
    if (lowerInput.includes('delete') || lowerInput.includes('remove')) {
      return 'delete';
    }
    if (lowerInput.includes('list') || lowerInput.includes('show')) {
      return 'list';
    }

    return 'search'; // default
  }

  private extractTitle(input: string): string {
    const match = input.match(/"([^"]+)"/);
    return match?.[1] || input.substring(0, 50).trim() || 'Untitled';
  }

  private extractContent(input: string): string {
    const quotes = input.match(/"([^"]+)"/g);
    return quotes?.[1]?.slice(1, -1) || input.trim();
  }

  private extractMemoryType(input: string): string | undefined {
    const types = ['conversation', 'knowledge', 'project', 'context', 'reference'];
    return types.find(type => input.toLowerCase().includes(type));
  }

  private extractTags(input: string): string[] {
    const hashtagMatches = input.match(/#(\w+)/g);
    const tags = hashtagMatches?.map(tag => tag.slice(1)) || [];
    
    // Look for "tagged with" or "tags:"
    const tagMatch = input.match(/(?:tagged with|tags:)\s*([^.!?]+)/i);
    if (tagMatch && tagMatch[1]) {
      const additionalTags = tagMatch[1].split(/[,\s]+/).filter(tag => tag.length > 0);
      tags.push(...additionalTags);
    }
    
    return [...new Set(tags)];
  }

  private extractSearchQuery(input: string): string {
    // Remove command words and extract the actual search query
    return input
      .replace(/^(search|find|look for)\s+/i, '')
      .replace(/\s+(in|from)\s+(memory|memories).*$/i, '')
      .trim();
  }
}
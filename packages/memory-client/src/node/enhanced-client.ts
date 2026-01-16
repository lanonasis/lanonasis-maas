/**
 * Enhanced Memory Client with CLI Integration
 *
 * Intelligently routes requests through CLI v1.5.2+ when available,
 * with fallback to direct API for maximum compatibility and performance
 *
 * IMPORTANT: This file uses Node.js-specific features (process.env) and should only be used in Node.js environments
 */

import { CoreMemoryClient, type CoreMemoryClientConfig, type ApiResponse, type PaginatedResponse } from '../core/client';
import { CLIIntegration, type CLIAuthStatus, type CLIMCPStatus } from './cli-integration';
import type { ApiErrorResponse } from '../core/errors';
import { createErrorResponse } from '../core/utils';
import type {
  MemoryEntry,
  MemoryTopic,
  CreateMemoryRequest,
  UpdateMemoryRequest,
  SearchMemoryRequest,
  MemorySearchResult,
  UserMemoryStats,
  CreateTopicRequest
} from '../core/types';

export interface EnhancedMemoryClientConfig extends CoreMemoryClientConfig {
  /** Prefer CLI when available (default: true) */
  preferCLI?: boolean;
  /** Enable MCP channels when available (default: true) */
  enableMCP?: boolean;
  /** CLI detection timeout in ms (default: 5000) */
  cliDetectionTimeout?: number;
  /** Fallback to direct API on CLI failure (default: true) */
  fallbackToAPI?: boolean;
  /** Minimum CLI version required for Golden Contract compliance (default: 1.5.2) */
  minCLIVersion?: string;
  /** Enable verbose logging for troubleshooting (default: false) */
  verbose?: boolean;
}

export interface OperationResult<T> {
  data?: T;
  error?: ApiErrorResponse;
  source: 'cli' | 'api';
  mcpUsed?: boolean;
}

/**
 * Enhanced Memory Client with intelligent CLI/API routing
 */
export class EnhancedMemoryClient {
  private directClient: CoreMemoryClient;
  private cliIntegration: CLIIntegration;
  private config: Required<EnhancedMemoryClientConfig>;
  private capabilities: Awaited<ReturnType<CLIIntegration['getCapabilities']>> | null = null;

  private createDefaultCapabilities(): Awaited<ReturnType<CLIIntegration['getCapabilities']>> {
    return {
      cliAvailable: false,
      mcpSupport: false,
      authenticated: false,
      goldenContract: false
    };
  }

  constructor(config: EnhancedMemoryClientConfig) {
    // Merge config with defaults, ensuring all required fields are present
    // Spread config first, then apply defaults only for undefined values
    const mergedConfig: EnhancedMemoryClientConfig = {
      ...config,
      preferCLI: config.preferCLI ?? true,
      enableMCP: config.enableMCP ?? true,
      cliDetectionTimeout: config.cliDetectionTimeout ?? 5000,
      fallbackToAPI: config.fallbackToAPI ?? true,
      minCLIVersion: config.minCLIVersion ?? '1.5.2',
      verbose: config.verbose ?? false,
      timeout: config.timeout ?? 30000,
      apiUrl: config.apiUrl || 'https://api.lanonasis.com',
      apiKey: config.apiKey || process.env.LANONASIS_API_KEY || '',
      authToken: config.authToken || '',
      headers: config.headers || {}
    };
    
    this.config = mergedConfig as Required<EnhancedMemoryClientConfig>;

    this.directClient = new CoreMemoryClient(config);
    this.cliIntegration = new CLIIntegration();
  }

  /**
   * Initialize the client and detect capabilities
   */
  async initialize(): Promise<void> {
    try {
      const detectionPromise = this.cliIntegration.getCapabilities();
      const capabilities = this.config.cliDetectionTimeout > 0
        ? await Promise.race([
            detectionPromise,
            new Promise<null>((resolve) => {
              setTimeout(() => resolve(null), this.config.cliDetectionTimeout);
            })
          ])
        : await detectionPromise;

      if (capabilities) {
        this.capabilities = capabilities;

        if (this.config.verbose && capabilities.cliAvailable && !capabilities.authenticated) {
          const suggestedCommand = capabilities.goldenContract ? 'onasis login' : 'lanonasis login';
          console.warn(
            `CLI detected but not authenticated. Run '${suggestedCommand}' to enable enhanced SDK features.`
          );
        }
      } else {
        this.capabilities = this.createDefaultCapabilities();
        if (this.config.verbose) {
          console.warn(
            `CLI detection timed out after ${this.config.cliDetectionTimeout}ms. Falling back to API mode.`
          );
        }
      }
    } catch (error) {
      if (this.config.verbose) {
        console.warn('CLI detection failed:', error);
      }
      this.capabilities = this.createDefaultCapabilities();
    }
  }

  /**
   * Get current capabilities
   */
  async getCapabilities(): Promise<Awaited<ReturnType<CLIIntegration['getCapabilities']>>> {
    if (!this.capabilities) {
      await this.initialize();
    }
    if (!this.capabilities) {
      this.capabilities = this.createDefaultCapabilities();
    }
    return this.capabilities;
  }

  /**
   * Determine if operation should use CLI
   */
  private async shouldUseCLI(): Promise<boolean> {
    const capabilities = await this.getCapabilities();

    return (
      this.config.preferCLI &&
      capabilities.cliAvailable &&
      capabilities.authenticated &&
      capabilities.goldenContract
    );
  }

  /**
   * Execute operation with intelligent routing
   */
  private async executeOperation<T>(
    operation: string,
    cliOperation: () => Promise<ApiResponse<T>>,
    apiOperation: () => Promise<ApiResponse<T>>
  ): Promise<OperationResult<T>> {
    const useCLI = await this.shouldUseCLI();
    const capabilities = await this.getCapabilities();

    if (useCLI) {
      try {
        const result = await cliOperation();

        if (result.error && this.config.fallbackToAPI) {
          console.warn(`CLI ${operation} failed, falling back to API:`, result.error);
          const apiResult = await apiOperation();
          return {
            ...apiResult,
            source: 'api',
            mcpUsed: false
          };
        }

        return {
          ...result,
          source: 'cli',
          mcpUsed: capabilities.mcpSupport
        };
      } catch (error) {
        if (this.config.fallbackToAPI) {
          console.warn(`CLI ${operation} error, falling back to API:`, error);
          const apiResult = await apiOperation();
          return {
            ...apiResult,
            source: 'api',
            mcpUsed: false
          };
        }

        return {
          error: createErrorResponse(
            error instanceof Error ? error.message : `CLI ${operation} failed`,
            'API_ERROR'
          ),
          source: 'cli',
          mcpUsed: false
        };
      }
    } else {
      const result = await apiOperation();
      return {
        ...result,
        source: 'api',
        mcpUsed: false
      };
    }
  }

  // Enhanced API Methods

  /**
   * Health check with intelligent routing
   */
  async healthCheck(): Promise<OperationResult<{ status: string; timestamp: string }>> {
    return this.executeOperation(
      'health check',
      () => this.cliIntegration.healthCheckViaCLI(),
      () => this.directClient.healthCheck()
    );
  }

  /**
   * Create memory with CLI/API routing
   */
  async createMemory(memory: CreateMemoryRequest): Promise<OperationResult<MemoryEntry>> {
    return this.executeOperation(
      'create memory',
      () => this.cliIntegration.createMemoryViaCLI(
        memory.title,
        memory.content,
        {
          memoryType: memory.memory_type,
          tags: memory.tags,
          topicId: memory.topic_id
        }
      ),
      () => this.directClient.createMemory(memory)
    );
  }

  /**
   * List memories with intelligent routing
   */
  async listMemories(options: {
    page?: number;
    limit?: number;
    memory_type?: string;
    topic_id?: string;
    project_ref?: string;
    status?: string;
    tags?: string[];
    sort?: string;
    order?: 'asc' | 'desc';
  } = {}): Promise<OperationResult<PaginatedResponse<MemoryEntry>>> {
    return this.executeOperation(
      'list memories',
      () => this.cliIntegration.listMemoriesViaCLI({
        limit: options.limit,
        memoryType: options.memory_type,
        tags: options.tags,
        sortBy: options.sort
      }),
      () => this.directClient.listMemories(options)
    );
  }

  /**
   * Search memories with MCP enhancement when available
   */
  async searchMemories(request: SearchMemoryRequest): Promise<OperationResult<{
    results: MemorySearchResult[];
    total_results: number;
    search_time_ms: number;
  }>> {
    return this.executeOperation(
      'search memories',
      () => this.cliIntegration.searchMemoriesViaCLI(
        request.query,
        {
          limit: request.limit,
          memoryTypes: request.memory_types
        }
      ),
      () => this.directClient.searchMemories(request)
    );
  }

  /**
   * Get memory by ID (API only for now)
   */
  async getMemory(id: string): Promise<OperationResult<MemoryEntry>> {
    // CLI doesn't have get by ID yet, use API
    const result = await this.directClient.getMemory(id);
    return {
      ...result,
      source: 'api',
      mcpUsed: false
    };
  }

  /**
   * Update memory (API only for now)
   */
  async updateMemory(id: string, updates: UpdateMemoryRequest): Promise<OperationResult<MemoryEntry>> {
    // CLI doesn't have update yet, use API
    const result = await this.directClient.updateMemory(id, updates);
    return {
      ...result,
      source: 'api',
      mcpUsed: false
    };
  }

  /**
   * Delete memory (API only for now)
   */
  async deleteMemory(id: string): Promise<OperationResult<void>> {
    // CLI doesn't have delete yet, use API
    const result = await this.directClient.deleteMemory(id);
    return {
      ...result,
      source: 'api',
      mcpUsed: false
    };
  }

  // Topic Operations (API only for now)

  async createTopic(topic: CreateTopicRequest): Promise<OperationResult<MemoryTopic>> {
    const result = await this.directClient.createTopic(topic);
    return { ...result, source: 'api', mcpUsed: false };
  }

  async getTopics(): Promise<OperationResult<MemoryTopic[]>> {
    const result = await this.directClient.getTopics();
    return { ...result, source: 'api', mcpUsed: false };
  }

  async getTopic(id: string): Promise<OperationResult<MemoryTopic>> {
    const result = await this.directClient.getTopic(id);
    return { ...result, source: 'api', mcpUsed: false };
  }

  async updateTopic(id: string, updates: Partial<CreateTopicRequest>): Promise<OperationResult<MemoryTopic>> {
    const result = await this.directClient.updateTopic(id, updates);
    return { ...result, source: 'api', mcpUsed: false };
  }

  async deleteTopic(id: string): Promise<OperationResult<void>> {
    const result = await this.directClient.deleteTopic(id);
    return { ...result, source: 'api', mcpUsed: false };
  }

  /**
   * Get memory statistics
   */
  async getMemoryStats(): Promise<OperationResult<UserMemoryStats>> {
    const result = await this.directClient.getMemoryStats();
    return { ...result, source: 'api', mcpUsed: false };
  }

  // Utility Methods

  /**
   * Force CLI re-detection
   */
  async refreshCLIDetection(): Promise<void> {
    this.capabilities = null;
    await this.cliIntegration.refresh();
    await this.initialize();
  }

  /**
   * Get authentication status from CLI
   */
  async getAuthStatus(): Promise<OperationResult<CLIAuthStatus>> {
    try {
      const result = await this.cliIntegration.getAuthStatus();
      return { ...result, source: 'cli', mcpUsed: false };
    } catch (error) {
      return {
        error: createErrorResponse(
          error instanceof Error ? error.message : 'Auth status check failed',
          'API_ERROR'
        ),
        source: 'cli',
        mcpUsed: false
      };
    }
  }

  /**
   * Get MCP status when available
   */
  async getMCPStatus(): Promise<OperationResult<CLIMCPStatus>> {
    const capabilities = await this.getCapabilities();

    if (!capabilities.mcpSupport) {
      return {
        error: createErrorResponse('MCP not available', 'API_ERROR'),
        source: 'cli',
        mcpUsed: false
      };
    }

    try {
      const result = await this.cliIntegration.getMCPStatus();
      return { ...result, source: 'cli', mcpUsed: true };
    } catch (error) {
      return {
        error: createErrorResponse(
          error instanceof Error ? error.message : 'MCP status check failed',
          'API_ERROR'
        ),
        source: 'cli',
        mcpUsed: false
      };
    }
  }

  /**
   * Update authentication for both CLI and API client
   */
  setAuthToken(token: string): void {
    this.directClient.setAuthToken(token);
  }

  setApiKey(apiKey: string): void {
    this.directClient.setApiKey(apiKey);
  }

  clearAuth(): void {
    this.directClient.clearAuth();
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<EnhancedMemoryClientConfig>): void {
    this.config = { ...this.config, ...updates };
    this.directClient.updateConfig(updates);
  }

  /**
   * Get configuration summary
   */
  getConfigSummary(): {
    apiUrl: string;
    preferCLI: boolean;
    enableMCP: boolean;
    capabilities?: Awaited<ReturnType<CLIIntegration['getCapabilities']>>;
  } {
    return {
      apiUrl: this.config.apiUrl,
      preferCLI: this.config.preferCLI,
      enableMCP: this.config.enableMCP,
      capabilities: this.capabilities || undefined
    };
  }
}

/**
 * Factory function to create an enhanced memory client
 */
export async function createNodeMemoryClient(config: EnhancedMemoryClientConfig): Promise<EnhancedMemoryClient> {
  const client = new EnhancedMemoryClient(config);
  await client.initialize();
  return client;
}

/**
 * Synchronous factory function (initialization happens on first API call)
 */
export function createEnhancedMemoryClient(config: EnhancedMemoryClientConfig): EnhancedMemoryClient {
  return new EnhancedMemoryClient(config);
}

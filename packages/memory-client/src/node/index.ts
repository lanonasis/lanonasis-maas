/**
 * @lanonasis/memory-client/node
 *
 * Node.js-enhanced client with CLI integration
 * ONLY import this in Node.js environments
 *
 * Provides intelligent CLI detection and MCP channel utilization
 * when @lanonasis/cli v1.5.2+ is available
 */

// Enhanced client with CLI support
export {
  EnhancedMemoryClient,
  createNodeMemoryClient,
  createEnhancedMemoryClient
} from './enhanced-client';

export type {
  EnhancedMemoryClientConfig,
  OperationResult
} from './enhanced-client';

// CLI integration utilities
export {
  CLIIntegration,
  cliIntegration
} from './cli-integration';

export type {
  CLIInfo,
  CLICommand,
  MCPChannel,
  CLICapabilities,
  RoutingStrategy,
  CLIAuthStatus,
  CLIMCPStatus,
  CLIMCPTool,
  CLIExecutionOptions
} from './cli-integration';

// Re-export core types for convenience
export type {
  MemoryEntry,
  MemoryTopic,
  CreateMemoryRequest,
  UpdateMemoryRequest,
  SearchMemoryRequest,
  CreateTopicRequest,
  MemorySearchResult,
  UserMemoryStats,
  MemoryType,
  MemoryStatus
} from '../core/types';

export type {
  ApiResponse,
  ApiError,
  PaginatedResponse
} from '../core/client';

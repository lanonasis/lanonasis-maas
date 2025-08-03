/**
 * LanOnasis Enterprise SDK
 * 
 * Comprehensive SDK for Memory as a Service (MaaS) and API Key Management
 * with Model Context Protocol (MCP) integration for AI agents.
 * 
 * @author LanOnasis (Seye Derick)
 * @version 1.0.0
 */

// Core clients
export { LanOnasisClient } from './client/LanOnasisClient.js';
export { MemoryClient } from './memory/MemoryClient.js';
export { ApiKeyClient } from './api-keys/ApiKeyClient.js';
export { MCPClient } from './mcp/MCPClient.js';

// Memory types and interfaces
export type {
  Memory,
  MemoryType,
  CreateMemoryRequest,
  UpdateMemoryRequest,
  SearchMemoryRequest,
  SearchMemoryResponse,
  MemorySearchResult,
  Topic,
  CreateTopicRequest,
  UpdateTopicRequest,
  UsageAnalytics
} from './memory/types.js';

// API Key types and interfaces
export type {
  ApiKey,
  ApiKeyProject,
  CreateApiKeyRequest,
  UpdateApiKeyRequest,
  CreateProjectRequest,
  UpdateProjectRequest,
  KeyType,
  Environment,
  AccessLevel,
  KeyStatus,
  MCPTool,
  CreateMCPToolRequest,
  MCPAccessRequest,
  MCPSession,
  ProxyToken,
  SecurityEvent,
  KeyUsageAnalytics
} from './api-keys/types.js';

// MCP types and interfaces
export type {
  MCPClientConfig,
  MCPServerInfo,
  MCPToolCall,
  MCPResource,
  MCPMessage,
  SessionConfig,
  AccessContext
} from './mcp/types.js';

// Utility types
export type {
  ClientConfig,
  AuthToken,
  PaginatedResponse,
  SortOrder,
  FilterOptions,
  ErrorResponse,
  SuccessResponse
} from './types/common.js';

// Error classes
export {
  LanOnasisError,
  AuthenticationError,
  ValidationError,
  NotFoundError,
  PermissionError,
  RateLimitError,
  ServerError
} from './errors/index.js';

// Utility functions
export {
  validateEmail,
  validateUUID,
  sanitizeInput,
  formatDate,
  parseJWT,
  generateSecureId
} from './utils/index.js';

// Constants
export {
  DEFAULT_API_URL,
  DEFAULT_TIMEOUT,
  SUPPORTED_MEMORY_TYPES,
  SUPPORTED_KEY_TYPES,
  SUPPORTED_ENVIRONMENTS,
  MAX_MEMORY_SIZE,
  MAX_BATCH_SIZE
} from './constants.js';

// Re-export commonly used types for convenience
export type {
  // Common memory operations
  Memory as MemoryEntry,
  SearchMemoryResponse as MemorySearchResponse,
  
  // Common API key operations
  ApiKey as StoredApiKey,
  MCPTool as RegisteredTool,
  MCPSession as ActiveSession,
  
  // Authentication
  AuthToken as Token,
  ClientConfig as Config
} from './types/index.js';

/**
 * Default export - Main LanOnasis client
 * 
 * @example
 * ```typescript
 * import LanOnasis from '@lanonasis/sdk';
 * 
 * const client = new LanOnasis({
 *   apiUrl: 'https://api.lanonasis.com',
 *   apiKey: 'your-api-key'
 * });
 * 
 * // Memory operations
 * const memory = await client.memory.create({
 *   title: 'Important Note',
 *   content: 'This is a test memory',
 *   type: 'context'
 * });
 * 
 * // API Key operations
 * const apiKey = await client.apiKeys.create({
 *   name: 'stripe_api_key',
 *   value: 'sk_live_...',
 *   keyType: 'api_key',
 *   environment: 'production'
 * });
 * 
 * // MCP operations
 * const session = await client.mcp.requestAccess({
 *   toolId: 'payment-processor',
 *   keyNames: ['stripe_api_key'],
 *   justification: 'Processing customer payment'
 * });
 * ```
 */
export { LanOnasisClient as default } from './client/LanOnasisClient.js';
/**
 * SDK Constants and Configuration Values
 * 
 * @author LanOnasis (Seye Derick)
 * @version 1.2.0
 */

/**
 * Default API URL for LanOnasis services
 */
export const DEFAULT_API_URL = 'https://api.lanonasis.com';

/**
 * Default request timeout in milliseconds
 */
export const DEFAULT_TIMEOUT = 30000;

/**
 * Supported memory types
 */
export const SUPPORTED_MEMORY_TYPES = [
  'context',
  'code_snippet',
  'document',
  'conversation',
  'note',
  'bookmark',
  'task',
  'idea'
] as const;

/**
 * Supported API key types
 */
export const SUPPORTED_KEY_TYPES = [
  'api_key',
  'oauth_token',
  'jwt_token',
  'webhook_secret',
  'database_url',
  'custom'
] as const;

/**
 * Supported environments
 */
export const SUPPORTED_ENVIRONMENTS = [
  'development',
  'staging',
  'production'
] as const;

/**
 * Maximum memory content size in bytes (10MB)
 */
export const MAX_MEMORY_SIZE = 10 * 1024 * 1024;

/**
 * Maximum batch operation size
 */
export const MAX_BATCH_SIZE = 100;

/**
 * API version
 */
export const API_VERSION = 'v1';

/**
 * SDK version
 */
export const SDK_VERSION = '1.2.0';

/**
 * Default pagination limits
 */
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/**
 * Rate limiting constants
 */
export const RATE_LIMIT = {
  REQUESTS_PER_MINUTE: 1000,
  BURST_LIMIT: 100
} as const;

/**
 * Retry configuration
 */
export const RETRY_CONFIG = {
  MAX_ATTEMPTS: 3,
  INITIAL_DELAY: 1000,
  BACKOFF_MULTIPLIER: 2,
  MAX_DELAY: 10000
} as const;

/**
 * HTTP status codes
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500
} as const;

/**
 * MCP (Model Context Protocol) constants
 */
export const MCP_CONFIG = {
  DEFAULT_SSE_URL: 'https://api.lanonasis.com/mcp/sse',
  HEARTBEAT_INTERVAL: 30000,
  RECONNECT_DELAY: 5000,
  MAX_RECONNECT_ATTEMPTS: 10
} as const;
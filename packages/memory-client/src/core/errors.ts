/**
 * Error handling for Memory Client
 * Browser-safe, no Node.js dependencies
 */

/**
 * Base error class for Memory Client errors
 */
export class MemoryClientError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'MemoryClientError';

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, MemoryClientError);
    }
  }
}

/**
 * Network/API error
 */
export class ApiError extends MemoryClientError {
  constructor(message: string, statusCode?: number, details?: unknown) {
    super(message, 'API_ERROR', statusCode, details);
    this.name = 'ApiError';
  }
}

/**
 * Authentication error
 */
export class AuthenticationError extends MemoryClientError {
  constructor(message: string = 'Authentication required') {
    super(message, 'AUTH_ERROR', 401);
    this.name = 'AuthenticationError';
  }
}

/**
 * Validation error
 */
export class ValidationError extends MemoryClientError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

/**
 * Timeout error
 */
export class TimeoutError extends MemoryClientError {
  constructor(message: string = 'Request timeout') {
    super(message, 'TIMEOUT_ERROR', 408);
    this.name = 'TimeoutError';
  }
}

/**
 * Rate limit error
 */
export class RateLimitError extends MemoryClientError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 'RATE_LIMIT_ERROR', 429);
    this.name = 'RateLimitError';
  }
}

/**
 * Not found error
 */
export class NotFoundError extends MemoryClientError {
  constructor(resource: string) {
    super(`${resource} not found`, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

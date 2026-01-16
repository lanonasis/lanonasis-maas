/**
 * Error handling for Memory Client
 * Browser-safe, no Node.js dependencies
 */

/**
 * Standardized error codes for programmatic error handling
 */
export const ERROR_CODES = [
  'API_ERROR',
  'AUTH_ERROR',
  'VALIDATION_ERROR',
  'TIMEOUT_ERROR',
  'RATE_LIMIT_ERROR',
  'NOT_FOUND',
  'NETWORK_ERROR',
  'FORBIDDEN',
  'CONFLICT',
  'SERVER_ERROR'
] as const;

export type ErrorCode = typeof ERROR_CODES[number];

/**
 * Structured API error response - replaces plain string errors
 * Enables programmatic error handling with typed codes
 */
export interface ApiErrorResponse {
  /** Machine-readable error code for programmatic handling */
  code: ErrorCode;
  /** Human-readable error message */
  message: string;
  /** HTTP status code if from API response */
  statusCode?: number;
  /** Additional error details (validation errors, etc.) */
  details?: unknown;
  /** Request ID for debugging/support */
  requestId?: string;
  /** Timestamp when error occurred */
  timestamp?: string;
}

/**
 * Type guard to check if an object is an ApiErrorResponse
 */
export function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    'message' in value &&
    typeof (value as ApiErrorResponse).code === 'string' &&
    typeof (value as ApiErrorResponse).message === 'string'
  );
}

/**
 * Base error class for Memory Client errors
 */
export class MemoryClientError extends Error {
  constructor(
    message: string,
    public code: ErrorCode = 'API_ERROR',
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

  /**
   * Convert to ApiErrorResponse for consistent API responses
   */
  toResponse(): ApiErrorResponse {
    return {
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
      timestamp: new Date().toISOString()
    };
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

  /**
   * Create from an HTTP response
   */
  static fromResponse(status: number, statusText: string, body?: unknown): ApiError {
    let message = `HTTP ${status}: ${statusText}`;
    let details: unknown = undefined;

    if (body && typeof body === 'object') {
      const bodyObj = body as Record<string, unknown>;
      if (typeof bodyObj.error === 'string') {
        message = bodyObj.error;
      } else if (typeof bodyObj.message === 'string') {
        message = bodyObj.message;
      }
      if (bodyObj.details) {
        details = bodyObj.details;
      }
    }

    return new ApiError(message, status, details);
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
 * Validation error with field-level details
 */
export class ValidationError extends MemoryClientError {
  public readonly validationErrors: Array<{ field: string; message: string }>;

  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';

    // Parse validation details into field errors
    this.validationErrors = [];
    if (Array.isArray(details)) {
      this.validationErrors = details.filter(
        (item): item is { field: string; message: string } =>
          typeof item === 'object' &&
          item !== null &&
          typeof item.field === 'string' &&
          typeof item.message === 'string'
      );
    }
  }

  /**
   * Create from Zod error
   */
  static fromZodError(error: { issues: Array<{ path: (string | number)[]; message: string }> }): ValidationError {
    const details = error.issues.map(issue => ({
      field: issue.path.join('.'),
      message: issue.message
    }));
    return new ValidationError('Validation failed', details);
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
 * Rate limit error with retry-after info
 */
export class RateLimitError extends MemoryClientError {
  public readonly retryAfter?: number;

  constructor(message: string = 'Rate limit exceeded', retryAfter?: number) {
    super(message, 'RATE_LIMIT_ERROR', 429, { retryAfter });
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

/**
 * Not found error
 */
export class NotFoundError extends MemoryClientError {
  public readonly resource: string;

  constructor(resource: string) {
    super(`${resource} not found`, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
    this.resource = resource;
  }
}

/**
 * Network error (no response received)
 */
export class NetworkError extends MemoryClientError {
  constructor(message: string = 'Network error') {
    super(message, 'NETWORK_ERROR');
    this.name = 'NetworkError';
  }
}

/**
 * Server error (5xx responses)
 */
export class ServerError extends MemoryClientError {
  constructor(message: string, statusCode: number = 500) {
    super(message, 'SERVER_ERROR', statusCode);
    this.name = 'ServerError';
  }
}

/**
 * Create appropriate error class from status code
 */
export function createErrorFromStatus(
  status: number,
  message: string,
  details?: unknown
): MemoryClientError {
  switch (status) {
    case 400:
      return new ValidationError(message, details);
    case 401:
      return new AuthenticationError(message);
    case 404:
      return new NotFoundError(message);
    case 408:
      return new TimeoutError(message);
    case 429:
      return new RateLimitError(message);
    case 500:
    case 502:
    case 503:
    case 504:
      return new ServerError(message, status);
    default:
      return new ApiError(message, status, details);
  }
}

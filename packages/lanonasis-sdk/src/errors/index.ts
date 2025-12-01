/**
 * Error classes for LanOnasis SDK
 */

/**
 * Base error class for all LanOnasis SDK errors
 */
export class LanonasisError extends Error {
  public readonly statusCode?: number;
  public readonly code?: string;
  public readonly details?: Record<string, any>;

  constructor(
    message: string,
    statusCode?: number,
    code?: string,
    details?: Record<string, any>
  ) {
    super(message);
    this.name = 'LanonasisError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, LanonasisError);
    }
  }
}

/**
 * Authentication error - thrown when authentication fails
 */
export class AuthenticationError extends LanonasisError {
  constructor(message: string = 'Authentication failed', details?: Record<string, any>) {
    super(message, 401, 'AUTHENTICATION_ERROR', details);
    this.name = 'AuthenticationError';
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AuthenticationError);
    }
  }
}

/**
 * Validation error - thrown when input validation fails
 */
export class ValidationError extends LanonasisError {
  constructor(message: string = 'Validation failed', details?: Record<string, any>) {
    super(message, 400, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ValidationError);
    }
  }
}

/**
 * Not found error - thrown when a resource is not found
 */
export class NotFoundError extends LanonasisError {
  constructor(message: string = 'Resource not found', details?: Record<string, any>) {
    super(message, 404, 'NOT_FOUND', details);
    this.name = 'NotFoundError';
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, NotFoundError);
    }
  }
}

/**
 * Permission error - thrown when access is forbidden
 */
export class PermissionError extends LanonasisError {
  constructor(message: string = 'Access forbidden', details?: Record<string, any>) {
    super(message, 403, 'PERMISSION_ERROR', details);
    this.name = 'PermissionError';
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, PermissionError);
    }
  }
}

/**
 * Rate limit error - thrown when rate limit is exceeded
 */
export class RateLimitError extends LanonasisError {
  public readonly retryAfter?: number;

  constructor(
    message: string = 'Rate limit exceeded',
    retryAfter?: number,
    details?: Record<string, any>
  ) {
    super(message, 429, 'RATE_LIMIT_ERROR', details);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, RateLimitError);
    }
  }
}

/**
 * Server error - thrown when a server error occurs
 */
export class ServerError extends LanonasisError {
  constructor(message: string = 'Internal server error', details?: Record<string, any>) {
    super(message, 500, 'SERVER_ERROR', details);
    this.name = 'ServerError';
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ServerError);
    }
  }
}


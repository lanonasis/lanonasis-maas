import { describe, it, expect } from 'vitest';
import {
  MemoryClientError,
  ApiError,
  AuthenticationError,
  ValidationError,
  TimeoutError,
  RateLimitError,
  NotFoundError,
  NetworkError,
  ServerError,
  createErrorFromStatus,
  isApiErrorResponse,
  ERROR_CODES
} from './errors';

describe('ERROR_CODES', () => {
  it('contains all expected error codes', () => {
    expect(ERROR_CODES).toContain('API_ERROR');
    expect(ERROR_CODES).toContain('AUTH_ERROR');
    expect(ERROR_CODES).toContain('VALIDATION_ERROR');
    expect(ERROR_CODES).toContain('TIMEOUT_ERROR');
    expect(ERROR_CODES).toContain('RATE_LIMIT_ERROR');
    expect(ERROR_CODES).toContain('NOT_FOUND');
    expect(ERROR_CODES).toContain('NETWORK_ERROR');
    expect(ERROR_CODES).toContain('FORBIDDEN');
    expect(ERROR_CODES).toContain('CONFLICT');
    expect(ERROR_CODES).toContain('SERVER_ERROR');
  });
});

describe('MemoryClientError', () => {
  it('creates error with message and code', () => {
    const error = new MemoryClientError('Test error', 'API_ERROR');
    expect(error.message).toBe('Test error');
    expect(error.code).toBe('API_ERROR');
    expect(error.name).toBe('MemoryClientError');
  });

  it('includes status code when provided', () => {
    const error = new MemoryClientError('Test', 'NOT_FOUND', 404);
    expect(error.statusCode).toBe(404);
  });

  it('includes details when provided', () => {
    const details = { field: 'name' };
    const error = new MemoryClientError('Test', 'VALIDATION_ERROR', 400, details);
    expect(error.details).toEqual(details);
  });

  it('converts to ApiErrorResponse', () => {
    const error = new MemoryClientError('Test', 'API_ERROR', 500);
    const response = error.toResponse();
    expect(response.code).toBe('API_ERROR');
    expect(response.message).toBe('Test');
    expect(response.statusCode).toBe(500);
    expect(response.timestamp).toBeDefined();
  });
});

describe('ApiError', () => {
  it('creates with API_ERROR code', () => {
    const error = new ApiError('API failed');
    expect(error.code).toBe('API_ERROR');
    expect(error.name).toBe('ApiError');
  });

  it('creates from HTTP response', () => {
    const error = ApiError.fromResponse(500, 'Internal Server Error', { error: 'DB connection failed' });
    expect(error.message).toBe('DB connection failed');
    expect(error.statusCode).toBe(500);
  });

  it('handles response body with message field', () => {
    const error = ApiError.fromResponse(400, 'Bad Request', { message: 'Invalid input' });
    expect(error.message).toBe('Invalid input');
  });

  it('falls back to status text when no body message', () => {
    const error = ApiError.fromResponse(404, 'Not Found', {});
    expect(error.message).toBe('HTTP 404: Not Found');
  });
});

describe('AuthenticationError', () => {
  it('has AUTH_ERROR code and 401 status', () => {
    const error = new AuthenticationError();
    expect(error.code).toBe('AUTH_ERROR');
    expect(error.statusCode).toBe(401);
    expect(error.name).toBe('AuthenticationError');
  });

  it('uses custom message when provided', () => {
    const error = new AuthenticationError('Token expired');
    expect(error.message).toBe('Token expired');
  });
});

describe('ValidationError', () => {
  it('has VALIDATION_ERROR code and 400 status', () => {
    const error = new ValidationError('Invalid data');
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.statusCode).toBe(400);
    expect(error.name).toBe('ValidationError');
  });

  it('parses validation details into field errors', () => {
    const details = [
      { field: 'email', message: 'Invalid format' },
      { field: 'password', message: 'Too short' }
    ];
    const error = new ValidationError('Validation failed', details);
    expect(error.validationErrors).toHaveLength(2);
    expect(error.validationErrors[0].field).toBe('email');
  });

  it('creates from Zod error', () => {
    const zodError = {
      issues: [
        { path: ['user', 'email'], message: 'Invalid email' },
        { path: ['password'], message: 'Required' }
      ]
    };
    const error = ValidationError.fromZodError(zodError);
    expect(error.validationErrors).toHaveLength(2);
    expect(error.validationErrors[0].field).toBe('user.email');
    expect(error.validationErrors[1].field).toBe('password');
  });
});

describe('TimeoutError', () => {
  it('has TIMEOUT_ERROR code and 408 status', () => {
    const error = new TimeoutError();
    expect(error.code).toBe('TIMEOUT_ERROR');
    expect(error.statusCode).toBe(408);
    expect(error.message).toBe('Request timeout');
  });
});

describe('RateLimitError', () => {
  it('has RATE_LIMIT_ERROR code and 429 status', () => {
    const error = new RateLimitError();
    expect(error.code).toBe('RATE_LIMIT_ERROR');
    expect(error.statusCode).toBe(429);
  });

  it('includes retry-after when provided', () => {
    const error = new RateLimitError('Rate limited', 60);
    expect(error.retryAfter).toBe(60);
  });
});

describe('NotFoundError', () => {
  it('has NOT_FOUND code and 404 status', () => {
    const error = new NotFoundError('Memory');
    expect(error.code).toBe('NOT_FOUND');
    expect(error.statusCode).toBe(404);
    expect(error.message).toBe('Memory not found');
    expect(error.resource).toBe('Memory');
  });
});

describe('NetworkError', () => {
  it('has NETWORK_ERROR code and no status', () => {
    const error = new NetworkError();
    expect(error.code).toBe('NETWORK_ERROR');
    expect(error.statusCode).toBeUndefined();
    expect(error.message).toBe('Network error');
  });
});

describe('ServerError', () => {
  it('has SERVER_ERROR code', () => {
    const error = new ServerError('Internal error');
    expect(error.code).toBe('SERVER_ERROR');
    expect(error.statusCode).toBe(500);
  });

  it('accepts custom status code', () => {
    const error = new ServerError('Gateway timeout', 504);
    expect(error.statusCode).toBe(504);
  });
});

describe('createErrorFromStatus', () => {
  it('creates ValidationError for 400', () => {
    const error = createErrorFromStatus(400, 'Bad request');
    expect(error).toBeInstanceOf(ValidationError);
  });

  it('creates AuthenticationError for 401', () => {
    const error = createErrorFromStatus(401, 'Unauthorized');
    expect(error).toBeInstanceOf(AuthenticationError);
  });

  it('creates NotFoundError for 404', () => {
    const error = createErrorFromStatus(404, 'Resource');
    expect(error).toBeInstanceOf(NotFoundError);
  });

  it('creates TimeoutError for 408', () => {
    const error = createErrorFromStatus(408, 'Timeout');
    expect(error).toBeInstanceOf(TimeoutError);
  });

  it('creates RateLimitError for 429', () => {
    const error = createErrorFromStatus(429, 'Too many requests');
    expect(error).toBeInstanceOf(RateLimitError);
  });

  it('creates ServerError for 5xx', () => {
    expect(createErrorFromStatus(500, 'Error')).toBeInstanceOf(ServerError);
    expect(createErrorFromStatus(502, 'Error')).toBeInstanceOf(ServerError);
    expect(createErrorFromStatus(503, 'Error')).toBeInstanceOf(ServerError);
  });

  it('creates ApiError for other status codes', () => {
    const error = createErrorFromStatus(418, "I'm a teapot");
    expect(error).toBeInstanceOf(ApiError);
  });
});

describe('isApiErrorResponse', () => {
  it('returns true for valid error response', () => {
    const response = { code: 'API_ERROR', message: 'Something failed' };
    expect(isApiErrorResponse(response)).toBe(true);
  });

  it('returns true with optional fields', () => {
    const response = {
      code: 'VALIDATION_ERROR',
      message: 'Invalid',
      statusCode: 400,
      details: { field: 'email' }
    };
    expect(isApiErrorResponse(response)).toBe(true);
  });

  it('returns false for null', () => {
    expect(isApiErrorResponse(null)).toBe(false);
  });

  it('returns false for missing code', () => {
    expect(isApiErrorResponse({ message: 'Error' })).toBe(false);
  });

  it('returns false for missing message', () => {
    expect(isApiErrorResponse({ code: 'API_ERROR' })).toBe(false);
  });

  it('returns false for non-string code', () => {
    expect(isApiErrorResponse({ code: 123, message: 'Error' })).toBe(false);
  });

  it('returns false for primitives', () => {
    expect(isApiErrorResponse('error')).toBe(false);
    expect(isApiErrorResponse(123)).toBe(false);
    expect(isApiErrorResponse(undefined)).toBe(false);
  });
});

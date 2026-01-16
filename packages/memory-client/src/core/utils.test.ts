import { describe, it, expect } from 'vitest';
import {
  safeJsonParse,
  createErrorResponse,
  httpStatusToErrorCode,
  calculateRetryDelay,
  isRetryableError,
  sleep
} from './utils';

describe('safeJsonParse', () => {
  it('parses valid JSON successfully', () => {
    const result = safeJsonParse<{ name: string }>('{"name": "test"}');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('test');
    }
  });

  it('handles arrays', () => {
    const result = safeJsonParse<number[]>('[1, 2, 3]');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual([1, 2, 3]);
    }
  });

  it('returns error for invalid JSON', () => {
    const result = safeJsonParse('not valid json');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Invalid JSON');
    }
  });

  it('returns error for empty string', () => {
    const result = safeJsonParse('');
    expect(result.success).toBe(false);
  });

  it('handles nested objects', () => {
    const input = '{"user": {"id": 1, "settings": {"theme": "dark"}}}';
    const result = safeJsonParse<{ user: { id: number; settings: { theme: string } } }>(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.user.settings.theme).toBe('dark');
    }
  });
});

describe('createErrorResponse', () => {
  it('creates basic error response', () => {
    const error = createErrorResponse('Something went wrong', 'API_ERROR');
    expect(error.message).toBe('Something went wrong');
    expect(error.code).toBe('API_ERROR');
    expect(error.timestamp).toBeDefined();
  });

  it('includes status code when provided', () => {
    const error = createErrorResponse('Not found', 'NOT_FOUND', 404);
    expect(error.statusCode).toBe(404);
  });

  it('includes details when provided', () => {
    const details = { field: 'email', reason: 'invalid format' };
    const error = createErrorResponse('Validation failed', 'VALIDATION_ERROR', 400, details);
    expect(error.details).toEqual(details);
  });

  it('generates timestamp in ISO format', () => {
    const error = createErrorResponse('Test', 'API_ERROR');
    expect(error.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});

describe('httpStatusToErrorCode', () => {
  it('maps 400 to VALIDATION_ERROR', () => {
    expect(httpStatusToErrorCode(400)).toBe('VALIDATION_ERROR');
  });

  it('maps 401 to AUTH_ERROR', () => {
    expect(httpStatusToErrorCode(401)).toBe('AUTH_ERROR');
  });

  it('maps 403 to FORBIDDEN', () => {
    expect(httpStatusToErrorCode(403)).toBe('FORBIDDEN');
  });

  it('maps 404 to NOT_FOUND', () => {
    expect(httpStatusToErrorCode(404)).toBe('NOT_FOUND');
  });

  it('maps 408 to TIMEOUT_ERROR', () => {
    expect(httpStatusToErrorCode(408)).toBe('TIMEOUT_ERROR');
  });

  it('maps 409 to CONFLICT', () => {
    expect(httpStatusToErrorCode(409)).toBe('CONFLICT');
  });

  it('maps 429 to RATE_LIMIT_ERROR', () => {
    expect(httpStatusToErrorCode(429)).toBe('RATE_LIMIT_ERROR');
  });

  it('maps 5xx to SERVER_ERROR', () => {
    expect(httpStatusToErrorCode(500)).toBe('SERVER_ERROR');
    expect(httpStatusToErrorCode(502)).toBe('SERVER_ERROR');
    expect(httpStatusToErrorCode(503)).toBe('SERVER_ERROR');
    expect(httpStatusToErrorCode(504)).toBe('SERVER_ERROR');
  });

  it('maps unknown codes to API_ERROR', () => {
    expect(httpStatusToErrorCode(418)).toBe('API_ERROR');
    expect(httpStatusToErrorCode(999)).toBe('API_ERROR');
  });
});

describe('calculateRetryDelay', () => {
  it('calculates linear delay with ±20% jitter', () => {
    // Linear: base * (attempt + 1), ±20% jitter
    const delay0 = calculateRetryDelay(0, 1000, 'linear');
    const delay1 = calculateRetryDelay(1, 1000, 'linear');
    const delay2 = calculateRetryDelay(2, 1000, 'linear');

    // attempt 0: 1000 ±20% = 800-1200
    expect(delay0).toBeGreaterThanOrEqual(800);
    expect(delay0).toBeLessThanOrEqual(1200);
    // attempt 1: 2000 ±20% = 1600-2400
    expect(delay1).toBeGreaterThanOrEqual(1600);
    expect(delay1).toBeLessThanOrEqual(2400);
    // attempt 2: 3000 ±20% = 2400-3600
    expect(delay2).toBeGreaterThanOrEqual(2400);
    expect(delay2).toBeLessThanOrEqual(3600);
  });

  it('calculates exponential delay with ±20% jitter', () => {
    const delay0 = calculateRetryDelay(0, 1000, 'exponential');
    const delay1 = calculateRetryDelay(1, 1000, 'exponential');
    const delay2 = calculateRetryDelay(2, 1000, 'exponential');

    // Exponential: base * 2^attempt, ±20% jitter
    // attempt 0: 1000 ±20% = 800-1200
    expect(delay0).toBeGreaterThanOrEqual(800);
    expect(delay0).toBeLessThanOrEqual(1200);
    // attempt 1: 2000 ±20% = 1600-2400
    expect(delay1).toBeGreaterThanOrEqual(1600);
    expect(delay1).toBeLessThanOrEqual(2400);
    // attempt 2: 4000 ±20% = 3200-4800
    expect(delay2).toBeGreaterThanOrEqual(3200);
    expect(delay2).toBeLessThanOrEqual(4800);
  });

  it('respects max delay limit', () => {
    const delay = calculateRetryDelay(10, 1000, 'exponential', 5000);
    expect(delay).toBeLessThanOrEqual(5000); // max caps the delay
  });

  it('defaults to 30 second max', () => {
    const delay = calculateRetryDelay(20, 1000, 'exponential');
    expect(delay).toBeLessThanOrEqual(30000); // 30s max
  });
});

describe('isRetryableError', () => {
  it('returns true for 429 rate limit', () => {
    expect(isRetryableError(429)).toBe(true);
  });

  it('returns true for 408 timeout', () => {
    expect(isRetryableError(408)).toBe(true);
  });

  it('returns true for 5xx server errors', () => {
    expect(isRetryableError(500)).toBe(true);
    expect(isRetryableError(502)).toBe(true);
    expect(isRetryableError(503)).toBe(true);
    expect(isRetryableError(504)).toBe(true);
  });

  it('returns false for 4xx client errors (except 408, 429)', () => {
    expect(isRetryableError(400)).toBe(false);
    expect(isRetryableError(401)).toBe(false);
    expect(isRetryableError(403)).toBe(false);
    expect(isRetryableError(404)).toBe(false);
  });

  it('returns true for undefined status (network errors are retryable)', () => {
    expect(isRetryableError(undefined)).toBe(true);
  });
});

describe('sleep', () => {
  it('resolves after specified delay', async () => {
    const start = Date.now();
    await sleep(100);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(95); // Allow small timing variance
    expect(elapsed).toBeLessThan(200);
  });

  it('resolves immediately for 0ms', async () => {
    const start = Date.now();
    await sleep(0);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(50);
  });
});

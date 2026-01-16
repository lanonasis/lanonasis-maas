/**
 * Core Utilities for Memory Client
 * Browser-safe, no Node.js dependencies
 */

import type { ApiErrorResponse, ErrorCode } from './errors';

/**
 * Safe JSON parse result - discriminated union for type-safe error handling
 */
export type SafeJsonResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Safely parse JSON with detailed error reporting
 * Prevents scattered try/catch blocks throughout the codebase
 */
export function safeJsonParse<T = unknown>(input: string): SafeJsonResult<T> {
  try {
    const data = JSON.parse(input) as T;
    return { success: true, data };
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : 'Unknown JSON parse error';
    return { success: false, error: `Invalid JSON: ${message}` };
  }
}

/**
 * HTTP status code to error code mapping
 */
export function httpStatusToErrorCode(status: number): ErrorCode {
  switch (status) {
    case 400:
      return 'VALIDATION_ERROR';
    case 401:
      return 'AUTH_ERROR';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 408:
      return 'TIMEOUT_ERROR';
    case 409:
      return 'CONFLICT';
    case 429:
      return 'RATE_LIMIT_ERROR';
    case 500:
    case 502:
    case 503:
    case 504:
      return 'SERVER_ERROR';
    default:
      return 'API_ERROR';
  }
}

/**
 * Create a standardized error response from various error sources
 */
export function createErrorResponse(
  message: string,
  code: ErrorCode = 'API_ERROR',
  statusCode?: number,
  details?: unknown
): ApiErrorResponse {
  return {
    code,
    message,
    statusCode,
    details,
    timestamp: new Date().toISOString()
  };
}

/**
 * Create an error response from an HTTP response
 */
export function createErrorFromResponse(
  status: number,
  statusText: string,
  body?: unknown
): ApiErrorResponse {
  const code = httpStatusToErrorCode(status);

  // Try to extract message from response body
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

  return createErrorResponse(message, code, status, details);
}

/**
 * Sleep utility for retry logic
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate retry delay with exponential backoff and jitter
 */
export function calculateRetryDelay(
  attempt: number,
  baseDelay: number = 1000,
  backoff: 'linear' | 'exponential' = 'exponential',
  maxDelay: number = 30000
): number {
  let delay: number;

  if (backoff === 'exponential') {
    delay = baseDelay * Math.pow(2, attempt);
  } else {
    delay = baseDelay * (attempt + 1);
  }

  // Add jitter (±20%) to prevent thundering herd
  const jitter = delay * 0.2 * (Math.random() * 2 - 1);
  delay = Math.min(delay + jitter, maxDelay);

  return Math.round(delay);
}

/**
 * Check if an error is retryable based on status code
 */
export function isRetryableError(statusCode?: number): boolean {
  if (!statusCode) return true; // Network errors are retryable

  // Retry on server errors and rate limits
  return statusCode >= 500 || statusCode === 429 || statusCode === 408;
}

/**
 * Deep merge two objects
 */
export function deepMerge<T extends Record<string, unknown>>(
  target: T,
  source: Partial<T>
): T {
  const result = { ...target };

  for (const key of Object.keys(source) as Array<keyof T>) {
    const sourceValue = source[key];
    const targetValue = result[key];

    if (
      sourceValue !== undefined &&
      typeof sourceValue === 'object' &&
      sourceValue !== null &&
      !Array.isArray(sourceValue) &&
      typeof targetValue === 'object' &&
      targetValue !== null &&
      !Array.isArray(targetValue)
    ) {
      result[key] = deepMerge(
        targetValue as Record<string, unknown>,
        sourceValue as Record<string, unknown>
      ) as T[keyof T];
    } else if (sourceValue !== undefined) {
      result[key] = sourceValue as T[keyof T];
    }
  }

  return result;
}

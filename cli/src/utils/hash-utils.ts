/**
 * Local Hash Utilities for CLI
 * Copied from shared/hash-utils.ts to avoid TypeScript rootDir issues
 */

import crypto from 'crypto';

/**
 * Determine if the provided value is already a SHA-256 hex digest
 */
export function isSha256Hash(value: string): boolean {
  return typeof value === 'string' && /^[a-f0-9]{64}$/i.test(value.trim());
}

/**
 * Hash an API key with SHA-256
 * Used for: Database storage, validation, lookups
 * 
 * @param apiKey - The raw API key to hash
 * @returns SHA-256 hash as hex string (64 characters)
 */
export function hashApiKey(apiKey: string): string {
  if (!apiKey || typeof apiKey !== 'string') {
    throw new Error('API key must be a non-empty string');
  }
  
  return crypto
    .createHash('sha256')
    .update(apiKey)
    .digest('hex');
}

/**
 * Normalize any API key input to a SHA-256 hex digest
 * Leaves an existing 64-char hex hash untouched to prevent double hashing
 */
export function ensureApiKeyHash(apiKey: string): string {
  if (isSha256Hash(apiKey)) {
    return apiKey.toLowerCase();
  }
  return hashApiKey(apiKey);
}

// Export types for TypeScript
export type ApiKeyHash = string; // SHA-256 hex string (64 chars)
export type ApiKey = string; // Raw API key (lns_...)

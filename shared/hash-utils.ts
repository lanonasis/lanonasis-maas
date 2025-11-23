/**
 * Shared Hashing Utilities
 * Ensures consistent SHA-256 hashing across all services
 * 
 * CRITICAL: All API key hashing MUST use these utilities
 */

import crypto from 'crypto';

/**
 * Determine if the provided value is already a SHA-256 hex digest
 */
export function isSha256Hash(value: string): boolean {
  return typeof value === 'string' && /^[a-f0-9]{64}$/i.test(value.trim());
}

/**
 * Hash an API key with SHA-256 (Server-side)
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
 * Hash an API key with SHA-256 (Browser-side)
 * For use in React components and browser contexts
 * 
 * @param apiKey - The raw API key to hash
 * @returns Promise<string> SHA-256 hash as hex string
 */
export async function hashApiKeyBrowser(apiKey: string): Promise<string> {
  if (!apiKey || typeof apiKey !== 'string') {
    throw new Error('API key must be a non-empty string');
  }
  
  // Use Web Crypto API
  const subtle = (globalThis as any)?.crypto?.subtle || (crypto as any).webcrypto?.subtle;
  if (!subtle) {
    // Fallback to Node.js hash when Web Crypto is unavailable
    return hashApiKey(apiKey);
  }

  const data = new TextEncoder().encode(apiKey);
  const hashBuffer = await subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}

/**
 * Normalize any API key input to a SHA-256 hex digest (sync, Node contexts)
 * Leaves an existing 64-char hex hash untouched to prevent double hashing
 */
export function ensureApiKeyHash(apiKey: string): string {
  if (isSha256Hash(apiKey)) {
    return apiKey.toLowerCase();
  }
  return hashApiKey(apiKey);
}

/**
 * Normalize any API key input to a SHA-256 hex digest (async, browser-safe)
 * Uses Web Crypto when available, falls back to Node hash otherwise
 */
export async function ensureApiKeyHashBrowser(apiKey: string): Promise<string> {
  if (isSha256Hash(apiKey)) {
    return apiKey.toLowerCase();
  }
  return hashApiKeyBrowser(apiKey);
}

/**
 * Verify an API key against a stored hash
 * Uses constant-time comparison to prevent timing attacks
 * 
 * @param apiKey - The raw API key to verify
 * @param storedHash - The SHA-256 hash from database
 * @returns boolean - True if match
 */
export function verifyApiKey(apiKey: string, storedHash: string): boolean {
  const computedHash = hashApiKey(apiKey);
  
  // Use constant-time comparison
  if (computedHash.length !== storedHash.length) {
    return false;
  }
  
  const computedBuffer = Buffer.from(computedHash, 'hex');
  const storedBuffer = Buffer.from(storedHash, 'hex');
  
  return crypto.timingSafeEqual(computedBuffer, storedBuffer);
}

/**
 * Generate a secure API key
 * Format: lns_[48 random chars]
 * 
 * @returns Secure random API key
 */
export function generateApiKey(): string {
  const randomBytes = crypto.randomBytes(36);
  const randomString = randomBytes.toString('base64url');
  return `lns_${randomString}`;
}

// Export types for TypeScript
export type ApiKeyHash = string; // SHA-256 hex string (64 chars)
export type ApiKey = string; // Raw API key (lns_...)

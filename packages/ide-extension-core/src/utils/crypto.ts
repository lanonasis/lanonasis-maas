/**
 * Cryptographic utilities for IDE extension core
 * Platform-agnostic crypto functions with browser compatibility
 *
 * @module crypto
 */

import * as crypto from 'crypto';

// ============================================================================
// PKCE & OAuth Utilities
// ============================================================================

/**
 * Generate PKCE code verifier (43-128 characters)
 *
 * @returns Random base64url-encoded string suitable for PKCE
 */
export function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Generate PKCE code challenge from verifier
 *
 * @param verifier - The PKCE code verifier
 * @returns SHA-256 hash of the verifier in base64url format
 */
export function generateCodeChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

/**
 * Generate random state parameter for OAuth
 *
 * @returns Random hex string for OAuth state parameter
 */
export function generateState(): string {
  return crypto.randomBytes(16).toString('hex');
}

// ============================================================================
// Token & Hash Detection
// ============================================================================

/**
 * Check if string looks like a JWT token
 *
 * @param value - The string to check
 * @returns True if the string matches JWT format (header.payload.signature)
 */
export function looksLikeJwt(value: string): boolean {
  const parts = value.split('.');
  if (parts.length !== 3) {
    return false;
  }
  const jwtSegment = /^[A-Za-z0-9-_]+$/;
  return parts.every(segment => jwtSegment.test(segment));
}

/**
 * Determine if the provided value is already a SHA-256 hex digest
 *
 * @param value - The value to check
 * @returns True if the value is a 64-character hex string
 */
export function isSha256Hash(value: string): boolean {
  return typeof value === 'string' && /^[a-f0-9]{64}$/i.test(value.trim());
}

// ============================================================================
// API Key Hashing - Node.js (Sync)
// ============================================================================

/**
 * Hash an API key with SHA-256 (Server-side/Node.js)
 * Used for: Database storage, validation, lookups
 *
 * @param apiKey - The raw API key to hash
 * @returns SHA-256 hash as hex string (64 characters)
 * @throws Error if apiKey is not a non-empty string
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
 * Normalize any API key input to a SHA-256 hex digest (sync, Node contexts)
 * Leaves an existing 64-char hex hash untouched to prevent double hashing
 *
 * @param apiKey - The API key (raw or already hashed)
 * @returns SHA-256 hash as hex string (64 characters, lowercase)
 */
export function ensureApiKeyHash(apiKey: string): string {
  if (isSha256Hash(apiKey)) {
    return apiKey.toLowerCase();
  }
  return hashApiKey(apiKey);
}

// ============================================================================
// API Key Hashing - Browser Compatible (Async)
// ============================================================================

/**
 * Hash an API key with SHA-256 (Browser-side)
 * For use in React components, IDE extensions, and browser contexts
 * Uses Web Crypto API when available, falls back to Node.js hash otherwise
 *
 * @param apiKey - The raw API key to hash
 * @returns Promise<string> SHA-256 hash as hex string (64 characters)
 * @throws Error if apiKey is not a non-empty string
 *
 * @example
 * ```typescript
 * // In a browser or IDE extension context
 * const hash = await hashApiKeyBrowser('lns_abc123...');
 * console.log(hash); // 64-character hex string
 * ```
 */
export async function hashApiKeyBrowser(apiKey: string): Promise<string> {
  if (!apiKey || typeof apiKey !== 'string') {
    throw new Error('API key must be a non-empty string');
  }

  // Try Web Crypto API first (browser/modern environments)
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
 * Normalize any API key input to a SHA-256 hex digest (async, browser-safe)
 * Uses Web Crypto when available, falls back to Node hash otherwise
 * Leaves an existing 64-char hex hash untouched to prevent double hashing
 *
 * @param apiKey - The API key (raw or already hashed)
 * @returns Promise<string> SHA-256 hash as hex string (64 characters, lowercase)
 *
 * @example
 * ```typescript
 * // Safe to call with raw key or existing hash
 * const hash1 = await ensureApiKeyHashBrowser('lns_mykey123');
 * const hash2 = await ensureApiKeyHashBrowser(hash1); // Returns same hash
 * console.log(hash1 === hash2); // true
 * ```
 */
export async function ensureApiKeyHashBrowser(apiKey: string): Promise<string> {
  if (isSha256Hash(apiKey)) {
    return apiKey.toLowerCase();
  }
  return hashApiKeyBrowser(apiKey);
}

// ============================================================================
// API Key Generation
// ============================================================================

/**
 * Generate a secure API key with platform prefix
 * Format: lns_[48 random base64url characters]
 *
 * Uses cryptographically secure random bytes for key generation.
 * The 'lns_' prefix identifies keys from the Lan Onasis platform.
 *
 * @returns Secure random API key with 'lns_' prefix
 *
 * @example
 * ```typescript
 * const apiKey = generateApiKey();
 * console.log(apiKey); // e.g., 'lns_xYz123AbC...' (52 chars total)
 * ```
 */
export function generateApiKey(): string {
  const randomBytes = crypto.randomBytes(36);
  const randomString = randomBytes.toString('base64url');
  return `lns_${randomString}`;
}

// ============================================================================
// API Key Verification
// ============================================================================

/**
 * Verify an API key against a stored hash
 * Uses constant-time comparison to prevent timing attacks
 *
 * @param apiKey - The raw API key to verify
 * @param storedHash - The SHA-256 hash from database
 * @returns True if the API key matches the stored hash
 */
export function verifyApiKey(apiKey: string, storedHash: string): boolean {
  const computedHash = hashApiKey(apiKey);

  if (computedHash.length !== storedHash.length) {
    return false;
  }

  const computedBuffer = Buffer.from(computedHash, 'hex');
  const storedBuffer = Buffer.from(storedHash, 'hex');

  return crypto.timingSafeEqual(computedBuffer, storedBuffer);
}

// ============================================================================
// Type Exports
// ============================================================================

/** SHA-256 hex string (64 characters) */
export type ApiKeyHash = string;

/** Raw API key (lns_...) */
export type ApiKey = string;

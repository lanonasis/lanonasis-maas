/**
 * Cryptographic utilities for IDE extension core
 * Platform-agnostic crypto functions
 */

import * as crypto from 'crypto';

/**
 * Generate PKCE code verifier (43-128 characters)
 */
export function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Generate PKCE code challenge from verifier
 */
export function generateCodeChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

/**
 * Generate random state parameter for OAuth
 */
export function generateState(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Check if string looks like a JWT token
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
 * Check if value is a SHA-256 hash
 */
export function isSha256Hash(value: string): boolean {
  return typeof value === 'string' && /^[a-f0-9]{64}$/i.test(value.trim());
}

/**
 * Hash API key with SHA-256
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
 * Ensure API key is hashed (idempotent)
 */
export function ensureApiKeyHash(apiKey: string): string {
  if (isSha256Hash(apiKey)) {
    return apiKey.toLowerCase();
  }
  return hashApiKey(apiKey);
}

/**
 * Verify API key against stored hash (constant time)
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

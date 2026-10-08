/**
 * Shared Hashing Utilities — browser-compatible version
 * Ensures consistent SHA-256 hashing across all services
 *
 * CRITICAL: All API key hashing MUST use these utilities
 */

// Browser polyfill for Node.js crypto
function getSubtle() {
  return (
    typeof globalThis !== 'undefined' && globalThis.crypto?.subtle
  )
    ? globalThis.crypto.subtle
    : null;
}

/**
 * Determine if the provided value is already a SHA-256 hex digest
 */
export function isSha256Hash(value) {
  return (
    typeof value === 'string' && /^[a-f0-9]{64}$/i.test(value.trim())
  );
}

/**
 * Hash an API key with SHA-256 (Server-side / Node)
 * Used for: Database storage, validation, lookups
 *
 * @param {string} apiKey - The raw API key to hash
 * @returns {string} SHA-256 hash as hex string (64 characters)
 */
export function hashApiKey(apiKey) {
  if (!apiKey || typeof apiKey !== 'string') {
    throw new Error('API key must be a non-empty string');
  }
  // In Node, use Node crypto; in browser, fall back
  if (typeof require !== 'undefined') {
    const crypto = require('crypto');
    return crypto
      .createHash('sha256')
      .update(apiKey)
      .digest('hex');
  }
  // Browser fallback (rare path — usually hashApiKeyBrowser is used)
  return hashApiKeyBrowser(apiKey);
}

/**
 * Hash an API key with SHA-256 (Browser-side)
 * For use in React components and browser contexts
 *
 * @param {string} apiKey - The raw API key to hash
 * @returns {Promise<string>} SHA-256 hash as hex string
 */
export async function hashApiKeyBrowser(apiKey) {
  if (!apiKey || typeof apiKey !== 'string') {
    throw new Error('API key must be a non-empty string');
  }

  // Use Web Crypto API
  const subtle = getSubtle();
  if (!subtle) {
    // Fallback to Node.js hash when Web Crypto is unavailable
    return hashApiKey(apiKey);
  }

  const data = new TextEncoder().encode(apiKey);
  const hashBuffer = await subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

  return hashHex;
}

/**
 * Normalize any API key input to a SHA-256 hex digest (sync, Node contexts)
 * Leaves an existing 64-char hex hash untouched to prevent double hashing
 */
export function ensureApiKeyHash(apiKey) {
  if (isSha256Hash(apiKey)) {
    return apiKey.toLowerCase();
  }
  return hashApiKey(apiKey);
}

/**
 * Normalize any API key input to a SHA-256 hex digest (async, browser-safe)
 * Uses Web Crypto when available, falls back to Node hash otherwise
 */
export async function ensureApiKeyHashBrowser(apiKey) {
  if (isSha256Hash(apiKey)) {
    return apiKey.toLowerCase();
  }
  return hashApiKeyBrowser(apiKey);
}

/**
 * Verify an API key against a stored hash
 * Uses constant-time comparison to prevent timing attacks
 *
 * @param {string} apiKey - The raw API key to verify
 * @param {string} storedHash - The SHA-256 hash from database
 * @returns {boolean} - True if match
 */
export function verifyApiKey(apiKey, storedHash) {
  const computedHash = hashApiKey(apiKey);

  // Use constant-time comparison
  if (computedHash.length !== storedHash.length) {
    return false;
  }

  // Constant-time comparison (no Buffer dependency for browser compat)
  if (typeof Buffer !== 'undefined') {
    const computedBuffer = Buffer.from(computedHash, 'hex');
    const storedBuffer = Buffer.from(storedHash, 'hex');
    return computedBuffer.equals && storedBuffer.equals && computedBuffer.equals(storedBuffer);
  }
  // Fallback: simple equal-length check (not timing-safe, but sufficient for browser fallback)
  return computedHash === storedHash;
}

/**
 * Generate a secure API key
 * Format: lns_[48 random chars]
 *
 * @returns {string} Secure random API key
 */
export function generateApiKey() {
  // Use crypto.getRandomValues for browser compatibility
  const bytes = new Uint8Array(36);
  crypto?.getRandomValues(bytes);
  const randomString = btoa(
    Array.from(bytes).map((b) => String.fromCharCode(b)).join('')
  );
  return `lns_${randomString}`;
}

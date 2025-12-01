/**
 * Shared Hashing Utilities
 * Ensures consistent SHA-256 hashing across all services
 *
 * CRITICAL: All API key hashing MUST use these utilities
 */
/**
 * Determine if the provided value is already a SHA-256 hex digest
 */
export declare function isSha256Hash(value: string): boolean;
/**
 * Hash an API key with SHA-256 (Server-side)
 * Used for: Database storage, validation, lookups
 *
 * @param apiKey - The raw API key to hash
 * @returns SHA-256 hash as hex string (64 characters)
 */
export declare function hashApiKey(apiKey: string): string;
/**
 * Hash an API key with SHA-256 (Browser-side)
 * For use in React components and browser contexts
 *
 * @param apiKey - The raw API key to hash
 * @returns Promise<string> SHA-256 hash as hex string
 */
export declare function hashApiKeyBrowser(apiKey: string): Promise<string>;
/**
 * Normalize any API key input to a SHA-256 hex digest (sync, Node contexts)
 * Leaves an existing 64-char hex hash untouched to prevent double hashing
 */
export declare function ensureApiKeyHash(apiKey: string): string;
/**
 * Normalize any API key input to a SHA-256 hex digest (async, browser-safe)
 * Uses Web Crypto when available, falls back to Node hash otherwise
 */
export declare function ensureApiKeyHashBrowser(apiKey: string): Promise<string>;
/**
 * Verify an API key against a stored hash
 * Uses constant-time comparison to prevent timing attacks
 *
 * @param apiKey - The raw API key to verify
 * @param storedHash - The SHA-256 hash from database
 * @returns boolean - True if match
 */
export declare function verifyApiKey(apiKey: string, storedHash: string): boolean;
/**
 * Generate a secure API key
 * Format: lns_[48 random chars]
 *
 * @returns Secure random API key
 */
export declare function generateApiKey(): string;
export type ApiKeyHash = string;
export type ApiKey = string;
//# sourceMappingURL=hash-utils.d.ts.map
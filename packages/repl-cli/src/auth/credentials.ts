/**
 * Credentials Storage for CLI
 *
 * Stores OAuth tokens in ~/.lanonasis/credentials.json
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from 'fs';
import { CONFIG_DIR, CREDENTIALS_FILE } from '../config/constants.js';

export interface StoredCredentials {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_at: number; // Unix timestamp
  scope?: string;
  auth_method: 'oauth' | 'api_key' | 'magic_link';
  created_at: number;
  updated_at: number;
}

/**
 * Ensure config directory exists
 */
function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

/**
 * Save credentials to file
 */
export function saveCredentials(credentials: Omit<StoredCredentials, 'created_at' | 'updated_at'> & { expires_in?: number }): void {
  ensureConfigDir();

  const now = Date.now();
  const expiresAt = credentials.expires_at || (credentials.expires_in
    ? now + (credentials.expires_in * 1000)
    : now + (3600 * 1000)); // Default 1 hour

  const stored: StoredCredentials = {
    access_token: credentials.access_token,
    refresh_token: credentials.refresh_token,
    token_type: credentials.token_type,
    expires_at: expiresAt,
    scope: credentials.scope,
    auth_method: credentials.auth_method,
    created_at: now,
    updated_at: now,
  };

  writeFileSync(CREDENTIALS_FILE, JSON.stringify(stored, null, 2), { mode: 0o600 });
}

/**
 * Load credentials from file
 */
export function loadCredentials(): StoredCredentials | null {
  if (!existsSync(CREDENTIALS_FILE)) {
    return null;
  }

  try {
    const content = readFileSync(CREDENTIALS_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Clear stored credentials
 */
export function clearCredentials(): boolean {
  if (existsSync(CREDENTIALS_FILE)) {
    try {
      unlinkSync(CREDENTIALS_FILE);
      return true;
    } catch {
      return false;
    }
  }
  return true;
}

/**
 * Check if credentials are expired
 */
export function isExpired(credentials: StoredCredentials): boolean {
  // Add 60 second buffer
  return Date.now() > (credentials.expires_at - 60000);
}

/**
 * Get valid access token (auto-refresh if needed)
 */
export async function getValidToken(
  refreshFn?: (refreshToken: string) => Promise<{ access_token: string; refresh_token?: string; expires_in: number }>
): Promise<string | null> {
  const credentials = loadCredentials();

  if (!credentials) {
    return null;
  }

  // Check if token is still valid
  if (!isExpired(credentials)) {
    return credentials.access_token;
  }

  // Try to refresh if we have a refresh token
  if (credentials.refresh_token && refreshFn) {
    try {
      const newTokens = await refreshFn(credentials.refresh_token);

      // Update stored credentials
      saveCredentials({
        access_token: newTokens.access_token,
        refresh_token: newTokens.refresh_token || credentials.refresh_token,
        token_type: credentials.token_type,
        expires_in: newTokens.expires_in,
        scope: credentials.scope,
        auth_method: credentials.auth_method,
        expires_at: 0, // Will be calculated from expires_in
      });

      return newTokens.access_token;
    } catch {
      // Refresh failed, credentials are invalid
      return null;
    }
  }

  // Token expired and no refresh token
  return null;
}

/**
 * Get authentication status
 */
export function getAuthStatus(): {
  authenticated: boolean;
  method?: string;
  expiresAt?: Date;
  scope?: string;
  needsRefresh?: boolean;
} {
  const credentials = loadCredentials();

  if (!credentials) {
    return { authenticated: false };
  }

  const expired = isExpired(credentials);
  const needsRefresh = expired && !!credentials.refresh_token;

  return {
    authenticated: !expired || needsRefresh,
    method: credentials.auth_method,
    expiresAt: new Date(credentials.expires_at),
    scope: credentials.scope,
    needsRefresh,
  };
}

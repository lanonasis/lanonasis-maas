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
  /**
   * Expiry in epoch milliseconds. 0 means "unknown": the server did not say,
   * so the token is used as-is and the server decides whether it is valid.
   */
  expires_at: number;
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
 * Resolve the expiry to store.
 *
 * Every login/refresh call site passes `expires_at: 0` as a placeholder next to
 * the server's real `expires_in`. The previous `expires_at ?? fromExpiresIn`
 * kept that 0 (`??` only replaces null/undefined), so every stored token looked
 * expired and a refresh ran on every start. Precedence now:
 *   1. a positive explicit expires_at
 *   2. now + expires_in, when the server supplied a positive expires_in
 *   3. 0 = unknown (never invented; see isExpired)
 */
export function resolveExpiresAt(
  expiresAt: number | undefined,
  expiresIn: number | undefined,
  now: number = Date.now()
): number {
  if (typeof expiresAt === 'number' && Number.isFinite(expiresAt) && expiresAt > 0) {
    return expiresAt;
  }
  if (typeof expiresIn === 'number' && Number.isFinite(expiresIn) && expiresIn > 0) {
    return now + expiresIn * 1000;
  }
  return 0;
}

/**
 * Save credentials to file
 */
export function saveCredentials(
  credentials: Omit<StoredCredentials, 'created_at' | 'updated_at' | 'expires_at'> & {
    expires_at?: number;
    expires_in?: number;
  }
): void {
  ensureConfigDir();

  const now = Date.now();
  const expiresAt = resolveExpiresAt(credentials.expires_at, credentials.expires_in, now);

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
  const expiresAt = Number(credentials.expires_at);
  // Unknown expiry (0, missing, garbage) is not "expired forever". Credential
  // files written by <=1.1.0 all carry expires_at: 0; treating that as expired
  // forced a refresh on every start and, when the refresh failed, silently
  // dropped the user to unauthenticated. Use the token; the server decides.
  if (!Number.isFinite(expiresAt) || expiresAt <= 0) {
    return false;
  }
  // 60 second buffer
  return Date.now() > (expiresAt - 60000);
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
      });

      return newTokens.access_token;
    } catch (error) {
      // Not silent: the caller continues unauthenticated, so say why.
      const reason = error instanceof Error ? error.message : String(error);
      console.warn(
        `Stored login expired and token refresh failed (${reason}). ` +
        'Continuing without it — run `onasis-repl login` to sign in again.'
      );
      return null;
    }
  }

  console.warn('Stored login expired and has no refresh token — run `onasis-repl login` to sign in again.');
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
    expiresAt: credentials.expires_at > 0 ? new Date(credentials.expires_at) : undefined,
    scope: credentials.scope,
    needsRefresh,
  };
}

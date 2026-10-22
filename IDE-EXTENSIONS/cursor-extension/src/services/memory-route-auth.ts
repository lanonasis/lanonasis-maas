/**
 * Auth + error helpers for memory update/delete via the MaaS API routes
 * when a custom API key is active (issue #59).
 *
 * Mirrors the dashboard api-client conventions (apps/dashboard/src/lib/api-client.ts):
 * - `vx_*` router keys: send both `Authorization` and `X-API-Key`.
 * - All other platform keys (`lano_*` etc.): `X-API-Key` only — sending them as
 *   Bearer triggers OAuth introspection and causes 401s.
 *
 * This module is intentionally free of `vscode` imports so it can be unit-tested
 * with plain node/bun.
 */

export type MemoryCredentialType = 'oauth' | 'apiKey';

/** Minimal credential shape (matches the core `StoredCredential` projection). */
export interface MemoryCredential {
  type: MemoryCredentialType;
  token: string;
}

/** Resolved auth for a request against the memory API routes with a custom key. */
export interface CustomApiKeyAuth {
  apiKey: string;
  headers: Record<string, string>;
}

/**
 * Resolve auth headers for the memory API routes when a custom API key is the
 * active credential. Returns null when OAuth is active (or no usable key exists),
 * in which case callers keep the existing authenticated path.
 */
export function resolveCustomApiKeyAuth(
  credential: MemoryCredential | null,
): CustomApiKeyAuth | null {
  if (!credential || credential.type !== 'apiKey') return null;

  const apiKey = credential.token?.trim();
  if (!apiKey) return null;

  const headers: Record<string, string> = {};
  if (apiKey.startsWith('vx_')) {
    headers['Authorization'] = apiKey;
    headers['X-API-Key'] = apiKey;
  } else {
    headers['X-API-Key'] = apiKey;
  }

  return { apiKey, headers };
}

/**
 * Build a user-facing error message from a failed memory API response.
 *
 * The MaaS routes return `{ error, message }` envelopes on failure (e.g. 401,
 * 403, 404); non-JSON bodies fall back to the raw (trimmed) text.
 */
export function formatMemoryApiError(operation: string, status: number, body: string): string {
  let detail = '';

  try {
    const parsed: unknown = JSON.parse(body);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const obj = parsed as Record<string, unknown>;
      detail = [obj.error, obj.message]
        .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
        .join(': ');
    }
  } catch {
    // Not JSON — use raw text below.
  }

  if (!detail) {
    const text = (body || '').trim();
    if (text) {
      detail = text;
    } else if (status === 401) {
      detail = 'Invalid or missing API key';
    } else if (status === 403) {
      detail = 'The API key does not have permission for this memory';
    } else if (status === 404) {
      detail = 'Memory not found';
    }
  }

  return `Failed to ${operation} memory: ${status}${detail ? ` — ${detail}` : ''}`;
}

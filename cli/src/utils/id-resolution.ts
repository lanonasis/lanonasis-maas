/**
 * Shared short-ID resolution for CLI commands.
 *
 * List tables show full IDs so they can be copied, but users routinely paste a
 * short prefix (e.g. `0a95d688`). The MaaS API accepts memory IDs as >=8-char
 * prefixes, while the API-key routes require a full UUID. This helper gives all
 * resources the same ergonomics and the same ambiguity/not-found errors.
 */

/** Accepts any hex UUID shape; resource IDs are not always v4. */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const MIN_ID_PREFIX_LENGTH = 8;

export function isFullUuid(value: string): boolean {
  return UUID_PATTERN.test(value.trim());
}

export interface ResolveIdPrefixOptions {
  /** Human label used in errors, e.g. "Memory" or "API key". */
  kind: string;
  /** Fetches the IDs that are candidates for prefix matching. */
  listIds: () => Promise<string[]>;
}

/**
 * Resolve a full UUID or a unique prefix to a full ID.
 *
 * - Full UUIDs are returned untouched (no extra request).
 * - Prefixes shorter than 8 characters are rejected before any network call.
 * - Ambiguous prefixes list up to five matches so the user can disambiguate.
 */
export async function resolveIdPrefix(
  idOrPrefix: string,
  options: ResolveIdPrefixOptions,
): Promise<string> {
  const candidate = (idOrPrefix ?? '').trim();
  const { kind, listIds } = options;

  if (!candidate) {
    throw new Error(`${kind} ID is required.`);
  }

  if (isFullUuid(candidate)) {
    return candidate;
  }

  if (candidate.length < MIN_ID_PREFIX_LENGTH) {
    throw new Error(
      `${kind} ID prefix must be at least ${MIN_ID_PREFIX_LENGTH} characters or a full UUID.`,
    );
  }

  const ids = await listIds();
  const normalized = candidate.toLowerCase();
  const matches = [...new Set(
    ids.filter((id) => typeof id === 'string' && id.toLowerCase().startsWith(normalized)),
  )];

  if (matches.length === 0) {
    throw new Error(`${kind} not found for ID/prefix: ${candidate}`);
  }

  if (matches.length > 1) {
    throw new Error(
      `${kind} ID prefix is ambiguous: ${candidate}. Matches: ${matches.slice(0, 5).join(', ')}`,
    );
  }

  return matches[0];
}

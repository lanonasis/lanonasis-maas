/**
 * redactor.ts — redact-mode secret replacement.
 *
 * Ported from packages/recall-forge/extraction/secret-redactor.ts
 * (MIT, LanOnasis). Original was 119 lines covering 17 credential
 * patterns + 1 env-var assignment regex. We port the same shape and
 * add a small set of additional provider tokens that recall-forge
 * does not yet cover (so that this scanner is a superset for our
 * pre-write redact path).
 *
 * redactContent() returns the redacted string + the types it caught.
 * Use this ONLY when the caller has opted into redact mode via
 * LANONASIS_PI_MEMORY_REDACT=1. Default is block mode (see
 * content-scanner.ts), which refuses the write entirely.
 */

export type SecretType =
  | "anthropic-api-key"
  | "openai-api-key"
  | "openrouter-api-key"
  | "github-token"
  | "supabase-token"
  | "stripe-key"
  | "stripe-webhook-secret"
  | "aws-access-key"
  | "google-api-key"
  | "notion-token"
  | "slack-token"
  | "lanonasis-api-key"
  | "jwt-token"
  | "bearer-token"
  | "database-url"
  | "private-key"
  | "hex-secret"
  | "elevenlabs-api-key"
  | "telegram-bot-token"
  | "env-secret";

export interface RedactionResult {
  /** The text with every secret replaced by [REDACTED:<type>] markers. */
  text: string;
  /** Total number of secrets replaced. */
  secretsFound: number;
  /** Unique secret types detected (sorted by first occurrence). */
  types: SecretType[];
}

interface SecretPattern {
  type: SecretType;
  pattern: RegExp;
}

const SECRET_PATTERNS: ReadonlyArray<SecretPattern> = [
  { type: "anthropic-api-key",    pattern: /\bsk-ant-[A-Za-z0-9_-]{20,}\b/g },
  { type: "openai-api-key",       pattern: /\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}\b/g },
  { type: "openrouter-api-key",   pattern: /\bsk-or-v1-[A-Za-z0-9_-]{20,}\b/g },
  { type: "github-token",         pattern: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{20,}\b/g },
  { type: "github-token",         pattern: /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g },
  { type: "supabase-token",       pattern: /\bsb[ap]_[A-Za-z0-9_-]{20,}\b/g },
  { type: "stripe-key",           pattern: /\b(?:sk|pk)_(?:live|test)_[A-Za-z0-9]{20,}\b/g },
  { type: "stripe-webhook-secret", pattern: /\bwhsec_[A-Za-z0-9]{20,}\b/g },
  { type: "aws-access-key",       pattern: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g },
  { type: "google-api-key",       pattern: /\bAIza[0-9A-Za-z_-]{30,}\b/g },
  { type: "notion-token",         pattern: /\b(?:ntn|secret)_[A-Za-z0-9]{20,}\b/g },
  { type: "slack-token",          pattern: /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/g },
  { type: "lanonasis-api-key",    pattern: /\b(?:lano|lns)_[A-Za-z0-9_-]{20,}\b/g },
  { type: "jwt-token",            pattern: /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g },
  { type: "bearer-token",         pattern: /\bBearer\s+[A-Za-z0-9._~+/=-]{20,}\b/g },
  { type: "database-url",         pattern: /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis):\/\/[^\s"'<>]+/gi },
  { type: "private-key",          pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g },
  { type: "hex-secret",           pattern: /\b[a-f0-9]{64,}\b/gi },
  { type: "elevenlabs-api-key",   pattern: /\bel_[A-Za-z0-9_-]{20,}\b/g },
  { type: "telegram-bot-token",   pattern: /\b\d{8,10}:[A-Za-z0-9_-]{30,}\b/g },
];

const ASSIGNMENT_PATTERN =
  /\b((?:export\s+)?[A-Z][A-Z0-9_]*(?:API[_-]?KEY|TOKEN|SECRET|PASSWORD|PRIVATE[_-]?KEY|ACCESS[_-]?TOKEN|REFRESH[_-]?TOKEN)[A-Z0-9_]*\s*=\s*)(["']?)([^\s"'`]+)(\2)/gi;

/**
 * Replace every detected secret with a `[REDACTED:<type>]` marker.
 * Idempotent — running on already-redacted text is a no-op.
 */
export function redactContent(input: string): RedactionResult {
  let text = input;
  const types: SecretType[] = [];
  let secretsFound = 0;

  const mark = (type: SecretType) => {
    secretsFound++;
    if (!types.includes(type)) types.push(type);
    return `[REDACTED:${type}]`;
  };

  for (const { type, pattern } of SECRET_PATTERNS) {
    text = text.replace(pattern, () => mark(type));
  }

  text = text.replace(
    ASSIGNMENT_PATTERN,
    (
      _match: string,
      prefix: string,
      quote: string,
      value: string,
      closingQuote: string,
    ) => {
      if (value.startsWith("[REDACTED:")) return `${prefix}${quote}${value}${closingQuote}`;
      return `${prefix}${quote}${mark("env-secret")}${closingQuote}`;
    },
  );

  return { text, secretsFound, types };
}

/** Convenience predicate: does this string contain any redactable secret? */
export function containsSecrets(input: string): boolean {
  return redactContent(input).secretsFound > 0;
}

export function _patternCounts(): { credentials: number; assignmentRegex: 1 } {
  return { credentials: SECRET_PATTERNS.length, assignmentRegex: 1 };
}

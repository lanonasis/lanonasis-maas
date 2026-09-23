import type { RedactionResult } from "./types.js";

type SecretPattern = {
  type: string;
  pattern: RegExp;
};

const SECRET_PATTERNS: SecretPattern[] = [
  {
    type: "anthropic-api-key",
    pattern: /\bsk-ant-[A-Za-z0-9_-]{20,}\b/g,
  },
  {
    type: "openai-api-key",
    pattern: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/g,
  },
  {
    type: "github-token",
    pattern: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{20,}\b/g,
  },
  {
    type: "github-token",
    pattern: /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g,
  },
  {
    type: "supabase-token",
    pattern: /\bsb[ap]_[A-Za-z0-9_-]{20,}\b/g,
  },
  {
    type: "stripe-key",
    pattern: /\b(?:sk|pk)_(?:live|test)_[A-Za-z0-9]{20,}\b/g,
  },
  {
    type: "stripe-webhook-secret",
    pattern: /\bwhsec_[A-Za-z0-9]{20,}\b/g,
  },
  {
    type: "aws-access-key",
    pattern: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g,
  },
  {
    type: "google-api-key",
    pattern: /\bAIza[0-9A-Za-z_-]{30,}\b/g,
  },
  {
    type: "notion-token",
    pattern: /\b(?:ntn|secret)_[A-Za-z0-9]{20,}\b/g,
  },
  {
    type: "lanonasis-api-key",
    pattern: /\b(?:lano|lns)_[A-Za-z0-9_-]{20,}\b/g,
  },
  {
    type: "jwt-token",
    pattern: /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
  },
  {
    type: "bearer-token",
    pattern: /\bBearer\s+[A-Za-z0-9._~+/=-]{20,}\b/g,
  },
  {
    type: "database-url",
    pattern: /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis):\/\/[^\s"'<>]+/gi,
  },
  {
    type: "private-key",
    pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
  },
  {
    type: "hex-secret",
    pattern: /\b[a-f0-9]{64,}\b/gi,
  },
  {
    type: "elevenlabs-api-key",
    pattern: /\bel_[A-Za-z0-9_-]{20,}\b/g,
  },
  {
    type: "telegram-bot-token",
    pattern: /\b\d{8,10}:[A-Za-z0-9_-]{30,}\b/g,
  },
];

// Lowercase / `key: value` credential assignments that ASSIGNMENT_PATTERN
// (UPPER_CASE env style only) misses. Carried over from the 1.1.1 redactor.
const KEYED_SECRET_PATTERNS: SecretPattern[] = [
  {
    type: "aws-secret-key",
    pattern: /\baws[_-]?secret[_-]?access[_-]?key\s*[:=]\s*["']?[A-Za-z0-9/+=]{40}["']?/gi,
  },
  {
    type: "generic-api-key",
    pattern: /\b(?:api[_-]?key|apikey)\s*[:=]\s*["']?[A-Za-z0-9_-]{16,}["']?/gi,
  },
  {
    type: "secret-key",
    pattern: /\b(?:secret[_-]?key|private[_-]?key)\s*[:=]\s*["']?[A-Za-z0-9_-]{16,}["']?/gi,
  },
  {
    type: "password",
    pattern: /\b(?:password|passwd|pwd)\s*[:=]\s*["']?[^\s"']{8,}["']?/gi,
  },
];

// PII, on by default (1.1.1 behaviour). Callers that run their own PII stage
// can pass { redactPII: false }.
const PII_PATTERNS: SecretPattern[] = [
  {
    type: "email",
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
  },
  {
    type: "credit-card",
    pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
  },
  {
    type: "ssn",
    pattern: /\b\d{3}[\s-]?\d{2}[\s-]?\d{4}\b/g,
  },
  {
    type: "phone",
    pattern: /\+?[\d\s()-]{10,}\b/g,
  },
];

export interface RedactOptions {
  /** Also redact PII (email, credit card, SSN, phone). Default: true. */
  redactPII?: boolean;
}

const ASSIGNMENT_PATTERN =
  /\b((?:export\s+)?[A-Z][A-Z0-9_]*(?:API[_-]?KEY|TOKEN|SECRET|PASSWORD|PRIVATE[_-]?KEY|ACCESS[_-]?TOKEN|REFRESH[_-]?TOKEN)[A-Z0-9_]*\s*=\s*)(["']?)([^\s"'`]+)(\2)/gi;

export function redactSecrets(input: string, options: RedactOptions = {}): RedactionResult {
  const { redactPII = true } = options;
  let text = input;
  const types: string[] = [];
  let secretsFound = 0;

  const mark = (type: string) => {
    secretsFound++;
    if (!types.includes(type)) types.push(type);
    return `[REDACTED:${type}]`;
  };

  for (const { type, pattern } of SECRET_PATTERNS) {
    text = text.replace(pattern, () => mark(type));
  }

  text = text.replace(
    ASSIGNMENT_PATTERN,
    (_match, prefix: string, quote: string, value: string, closingQuote: string) => {
      if (value.startsWith("[REDACTED:")) return `${prefix}${quote}${value}${closingQuote}`;
      return `${prefix}${quote}${mark("env-secret")}${closingQuote}`;
    },
  );

  for (const { type, pattern } of KEYED_SECRET_PATTERNS) {
    text = text.replace(pattern, (match) => (match.includes("[REDACTED:") ? match : mark(type)));
  }

  if (redactPII) {
    for (const { type, pattern } of PII_PATTERNS) {
      text = text.replace(pattern, () => mark(type));
    }
  }

  return {
    text,
    secretsFound,
    types,
  };
}

export function containsSecrets(input: string, options: RedactOptions = {}): boolean {
  return redactSecrets(input, options).secretsFound > 0;
}

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
    pattern: /\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}\b/g,
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

const ASSIGNMENT_PATTERN =
  /\b((?:export\s+)?[A-Z][A-Z0-9_]*(?:API[_-]?KEY|TOKEN|SECRET|PASSWORD|PRIVATE[_-]?KEY|ACCESS[_-]?TOKEN|REFRESH[_-]?TOKEN)[A-Z0-9_]*\s*=\s*)(["']?)([^\s"'`]+)(\2)/gi;

export function redactSecrets(input: string): RedactionResult {
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

  return {
    text,
    secretsFound,
    types,
  };
}

export function containsSecrets(input: string): boolean {
  return redactSecrets(input).secretsFound > 0;
}

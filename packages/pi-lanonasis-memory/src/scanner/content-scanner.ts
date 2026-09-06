/**
 * content-scanner.ts — block-mode pre-write gate.
 *
 * Ported from chandra447/pi-hermes-memory src/store/content-scanner.ts (MIT).
 * Original was lines 1–94 of that file. See PLAN.md → "Hermes Source File
 * Reference Map" in the upstream repo for source provenance.
 *
 * This is the non-negotiable pre-write scanner: it returns null when content
 * is safe to persist, and an error string when content must be blocked.
 * Callers (store, sync-queue, slash commands) MUST treat a non-null result
 * as a hard refusal and never persist the content.
 *
 * Three categories of blocked content:
 *   1. Invisible Unicode (U+200B, U+FEFF, bidi controls) — possible injection
 *   2. Prompt injection / exfiltration / role-hijack patterns — 11 patterns
 *   3. Secret / credential patterns — 20 patterns (high + medium severity)
 *
 * scanSecrets() exposes the secret check only (no threat patterns, no
 * unicode) for non-blocking warnings (pre-fill checks in interviews,
 * tool-call guards).
 */

const MEMORY_THREAT_PATTERNS: ReadonlyArray<{ pattern: RegExp; id: string }> = [
  { pattern: /ignore\s+(previous|all|above|prior)\s+instructions/i, id: "prompt_injection" },
  { pattern: /you\s+are\s+now\s+/i, id: "role_hijack" },
  { pattern: /do\s+not\s+tell\s+the\s+user/i, id: "deception_hide" },
  { pattern: /system\s+prompt\s+override/i, id: "sys_prompt_override" },
  { pattern: /disregard\s+(your|all|any)\s+(instructions|rules|guidelines)/i, id: "disregard_rules" },
  { pattern: /act\s+as\s+(if|though)\s+you\s+(have\s+no|don'?t\s+have)\s+(restrictions|limits|rules)/i, id: "bypass_restrictions" },
  { pattern: /curl\s+[^\n]*\$\{?\w*(KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL|API)/i, id: "exfil_curl" },
  { pattern: /wget\s+[^\n]*\$\{?\w*(KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL|API)/i, id: "exfil_wget" },
  { pattern: /cat\s+[^\n]*(\.env|credentials|\.netrc|\.pgpass|\.npmrc|\.pypirc)/i, id: "read_secrets" },
  { pattern: /authorized_keys/i, id: "ssh_backdoor" },
  { pattern: /\$HOME\/\.ssh|~\/\.ssh/i, id: "ssh_access" },
];

const SECRET_PATTERNS: ReadonlyArray<{ pattern: RegExp; id: string; severity: "high" | "medium" }> = [
  // API keys
  { pattern: /\bsk-ant-api\S{10,}\b/, id: "anthropic_api_key", severity: "high" },
  { pattern: /\bsk-or-v1-\S{10,}\b/, id: "openrouter_api_key", severity: "high" },
  { pattern: /\bsk-\S{20,}\b/, id: "openai_api_key", severity: "high" },
  { pattern: /\bAKIA[0-9A-Z]{16}\b/, id: "aws_access_key", severity: "high" },
  // Tokens
  { pattern: /\bghp_\S{10,}\b/, id: "github_personal_token", severity: "high" },
  { pattern: /\bghu_\S{10,}\b/, id: "github_user_token", severity: "high" },
  { pattern: /\bxoxb-\S{10,}\b/, id: "slack_bot_token", severity: "high" },
  { pattern: /\bxapp-\S{10,}\b/, id: "slack_app_token", severity: "high" },
  { pattern: /\bntn_\S{10,}\b/, id: "notion_token", severity: "high" },
  { pattern: /\bBearer\s+\S{20,}\b/, id: "bearer_auth_token", severity: "high" },
  // SSH keys
  { pattern: /-----BEGIN\s+(?:RSA\s+)?PRIVATE\sKEY-----/, id: "private_key_block", severity: "high" },
  // Environment variable names that indicate secrets
  { pattern: /\bANTHROPIC_API_KEY\b/, id: "env_anthropic_key", severity: "medium" },
  { pattern: /\bOPENAI_API_KEY\b/, id: "env_openai_key", severity: "medium" },
  { pattern: /\bOPENROUTER_API_KEY\b/, id: "env_openrouter_key", severity: "medium" },
  { pattern: /\bGITHUB_TOKEN\b/, id: "env_github_token", severity: "medium" },
  { pattern: /\bAWS_SECRET_ACCESS_KEY\b/, id: "env_aws_secret", severity: "medium" },
  { pattern: /\bDATABASE_URL\b/, id: "env_database_url", severity: "medium" },
  // Inline secret assignments (likely accidental paste)
  { pattern: /\bpassword\s*[=:]\s*\S{6,}\b/i, id: "password_assignment", severity: "medium" },
  { pattern: /\bsecret\s*[=:]\s*\S{6,}\b/i, id: "secret_assignment", severity: "medium" },
  { pattern: /\btoken\s*[=:]\s*\S{10,}\b/i, id: "token_assignment", severity: "medium" },
];

const INVISIBLE_CHARS: ReadonlySet<string> = new Set([
  '\u200b', '\u200c', '\u200d', '\u2060', '\ufeff',
  '\u202a', '\u202b', '\u202c', '\u202d', '\u202e',
]);

export interface SecretHit {
  id: string;
  severity: "high" | "medium";
}

export interface ScanVerdict {
  /** null = safe; non-null = blocked, with human-readable reason */
  blocked: string | null;
  /** All secret hits detected (independent of block decision). */
  secretHits: SecretHit[];
}

/**
 * Scan memory content for injection/exfiltration patterns AND secret leaks.
 * Returns a verdict describing the first blocking rule that fired and every
 * secret hit detected. Callers should refuse to persist when verdict.blocked
 * is non-null.
 */
export function scanContent(content: string): ScanVerdict {
  // 1. Invisible unicode — likely injection or smuggled tag.
  for (const char of content) {
    if (INVISIBLE_CHARS.has(char)) {
      const cp = char.charCodeAt(0).toString(16).toUpperCase().padStart(4, "0");
      return {
        blocked: `Blocked: content contains invisible unicode character U+${cp} (possible injection).`,
        secretHits: [],
      };
    }
  }

  // 2. Threat patterns (prompt injection, role hijack, exfiltration).
  for (const { pattern, id } of MEMORY_THREAT_PATTERNS) {
    if (pattern.test(content)) {
      return {
        blocked: `Blocked: content matches threat pattern '${id}'. Memory entries may be surfaced through search or legacy prompt injection and must not contain injection or exfiltration payloads.`,
        secretHits: [],
      };
    }
  }

  // 3. Secret patterns. We collect ALL hits so callers can surface them in
  // a warning, then return the first one as the blocking reason.
  const secretHits: SecretHit[] = [];
  for (const { pattern, id, severity } of SECRET_PATTERNS) {
    if (pattern.test(content)) {
      secretHits.push({ id, severity });
    }
  }
  if (secretHits.length > 0) {
    const first = secretHits[0];
    return {
      blocked: `Blocked: content looks like a ${first.severity}-severity credential or secret ('${first.id}'). Never persist API keys, tokens, or passwords to memory. Use an .env file or secrets manager instead.`,
      secretHits,
    };
  }

  return { blocked: null, secretHits: [] };
}

/**
 * Non-blocking secret check. Returns matched secret IDs without raising.
 * Use for pre-fill warnings, tool-call guards, or interview prompts.
 */
export function scanSecrets(content: string): string[] {
  const found: string[] = [];
  for (const { pattern, id } of SECRET_PATTERNS) {
    if (pattern.test(content)) {
      found.push(id);
    }
  }
  return found;
}

export function _patternCounts(): { threats: number; secrets: number; invisible: number } {
  return {
    threats: MEMORY_THREAT_PATTERNS.length,
    secrets: SECRET_PATTERNS.length,
    invisible: INVISIBLE_CHARS.size,
  };
}

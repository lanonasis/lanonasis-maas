/**
 * scanner.ts — top-level pre-write scanner used by the store, sync queue,
 * and slash commands.
 *
 * Two modes, controlled by LANONASIS_PI_MEMORY_REDACT:
 *   - "block"  (default): refuse the write if any secret or threat pattern fires.
 *                     Returns { decision: "block", reason }.
 *   - "redact" (opt-in):  replace secrets with [REDACTED:<type>] markers and
 *                     persist the cleaned text. Threat patterns still block.
 *                     Returns { decision: "redact", text, types }.
 *
 * Pre-fill warnings (interview prompt, tool-call guard) use scanSecretsOnly()
 * which never blocks — it just reports matched secret IDs so the caller can
 * warn the user.
 *
 * This module composes content-scanner.ts (block-mode gate, prompt injection,
 * credential detection) and redactor.ts (redact-mode replacement, broader
 * credential coverage). The split keeps each file auditable and testable.
 */

import { scanContent, scanSecrets, type ScanVerdict, type SecretHit } from "./content-scanner.js";
import { redactContent, type RedactionResult, type SecretType } from "./redactor.js";

export type ScannerMode = "block" | "redact";

export interface BlockDecision {
  decision: "block";
  reason: string;
  secretHits: SecretHit[];
}

export interface RedactDecision {
  decision: "redact";
  text: string;
  types: SecretType[];
  secretsFound: number;
  /** If a threat pattern fired, the redacted text is also unsafe. */
  threatBlocked: false;
}

export interface ThreatBlockedDecision {
  decision: "block";
  reason: string;
  threat: true;
  secretHits: SecretHit[];
}

export interface PassDecision {
  decision: "pass";
  secretHits: SecretHit[];
}

export type ScannerDecision = BlockDecision | RedactDecision | ThreatBlockedDecision | PassDecision;

/**
 * Pre-write scanner. Call this BEFORE persisting anything to local SQLite,
 * the markdown mirror, or the MaaS sync queue. Never bypass.
 *
 * @param content  The user-supplied content (memory body, skill body, etc.)
 * @param mode     "block" refuses on secret/threat; "redact" replaces secrets.
 *                 Threat patterns always block, regardless of mode.
 */
export function scanForWrite(content: string, mode: ScannerMode = "block"): ScannerDecision {
  const verdict: ScanVerdict = scanContent(content);

  // Threat patterns / invisible unicode always block — redact mode cannot
  // remove a prompt-injection payload safely.
  if (verdict.blocked && verdict.secretHits.length === 0) {
    return {
      decision: "block",
      reason: verdict.blocked,
      threat: true,
      secretHits: [],
    };
  }

  // No threats detected.
  if (verdict.secretHits.length === 0) {
    return { decision: "pass", secretHits: [] };
  }

  // Secrets present. Apply mode.
  if (mode === "block") {
    return {
      decision: "block",
      reason: verdict.blocked ?? "secret detected",
      secretHits: verdict.secretHits,
    };
  }

  // mode === "redact"
  const redacted: RedactionResult = redactContent(content);
  return {
    decision: "redact",
    text: redacted.text,
    types: redacted.types,
    secretsFound: redacted.secretsFound,
    threatBlocked: false,
  };
}

/**
 * Non-blocking secret probe. Used by:
 *   - pre-fill checks during /memory-interview
 *   - tool-call guards (warn before persisting)
 *   - /memory-preview-context diagnostic
 */
export function scanSecretsOnly(content: string): string[] {
  return scanSecrets(content);
}

export interface ScannerConfig {
  /** Resolved from LANONASIS_PI_MEMORY_REDACT=1 (redact) or 0/missing (block). */
  mode: ScannerMode;
}

export function resolveScannerMode(env: NodeJS.ProcessEnv = process.env): ScannerMode {
  return env.LANONASIS_PI_MEMORY_REDACT === "1" ? "redact" : "block";
}

/**
 * Convenience helper for slash commands and the write path that builds a
 * ScannerConfig from the current environment.
 */
export function defaultScannerConfig(env: NodeJS.ProcessEnv = process.env): ScannerConfig {
  return { mode: resolveScannerMode(env) };
}

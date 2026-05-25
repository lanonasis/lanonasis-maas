/**
 * Rules-based detector for the deterministic event types.
 *
 * Per the ontology spec, only three of the seven event types are
 * reliably detectable via pattern matching:
 *
 *   decision    — explicit "we'll go with X", "decided on", "choosing X over Y"
 *   commitment  — "I'll", "I will", "by <date>", "next session"
 *   frustration — explicit vent vocabulary; tool/error keywords
 *
 * Interpretive types (`surprise`, `insight`) require an LLM pass and are
 * NOT handled here — they ship in v0.1 via the AI Router classifier.
 *
 * Auto types (`revisit`, `abandon`) are derived from corpus state, not
 * from individual messages, and live in separate hooks.
 *
 * All patterns are anchored against word boundaries (`\b`) where possible
 * to avoid matching inside larger words (e.g. "willing" should not match
 * the `commitment` "I will" pattern).
 */

import type { DetectedEvent, EventType } from './types.js';

interface Rule {
  type: EventType;
  pattern: RegExp;
  confidence: number;
  /** Optional: extract structured payload from the match. */
  extract?: (match: RegExpMatchArray, input: string) => Record<string, string> | undefined;
}

const RULES: Rule[] = [
  // ── decision ────────────────────────────────────────────────────────
  {
    type: 'decision',
    pattern: /\b(?:we(?:'ll| will) go with|going with|decided (?:to|on)|choosing .+? over .+?|let's (?:pick|go with|use))\b/i,
    confidence: 0.75,
  },

  // ── commitment ──────────────────────────────────────────────────────
  // "I'll / I will <verb>" — stated intent
  {
    type: 'commitment',
    pattern: /\bI(?:'ll| will) [a-z][a-z']*/i,
    confidence: 0.7,
  },
  // "by <date>" — extracted due date (boost confidence and tag with date)
  {
    type: 'commitment',
    pattern: /\bby (Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|tomorrow|next week|end of (?:day|week|month)|\d{4}-\d{2}-\d{2})\b/i,
    confidence: 0.85,
    extract: (m) => ({ due: m[1].toLowerCase() }),
  },
  // "next session" / "tomorrow let's" — session-bounded commitment
  {
    type: 'commitment',
    pattern: /\b(?:next session|tomorrow we|tomorrow let's)\b/i,
    confidence: 0.7,
  },

  // ── frustration ─────────────────────────────────────────────────────
  // Explicit vent vocabulary
  {
    type: 'frustration',
    pattern: /\b(?:frustrating|annoying|driving me (?:crazy|nuts|mad)|sick of (?:this|it))\b/i,
    confidence: 0.85,
  },
  // Repeated-failure language
  {
    type: 'frustration',
    pattern: /\b(?:still (?:broken|failing|not working)|keeps (?:breaking|failing|crashing)|again (?:broken|failed))\b/i,
    confidence: 0.8,
  },
  // Blocker language
  {
    type: 'frustration',
    pattern: /\b(?:i'?m (?:stuck|blocked)|completely (?:broken|stuck))\b/i,
    confidence: 0.75,
  },
];

/**
 * Run all rules against `input` and return the set of detected events,
 * deduplicated by `type` (highest-confidence match wins; payloads merge).
 *
 * Pure function — no I/O, no state. Safe to call on every turn.
 */
export function detectEvents(input: string): DetectedEvent[] {
  if (!input || !input.trim()) return [];

  // Bucket matches by type so we can merge confidence + payload.
  const byType = new Map<EventType, DetectedEvent>();

  for (const rule of RULES) {
    const match = input.match(rule.pattern);
    if (!match) continue;

    const payload = rule.extract?.(match, input);
    const existing = byType.get(rule.type);

    if (!existing) {
      byType.set(rule.type, {
        type: rule.type,
        confidence: rule.confidence,
        evidence: match[0],
        payload,
      });
    } else {
      // Keep the higher-confidence evidence; merge payloads.
      if (rule.confidence > existing.confidence) {
        existing.confidence = rule.confidence;
        existing.evidence = match[0];
      }
      if (payload) {
        existing.payload = { ...(existing.payload ?? {}), ...payload };
      }
    }
  }

  return Array.from(byType.values());
}

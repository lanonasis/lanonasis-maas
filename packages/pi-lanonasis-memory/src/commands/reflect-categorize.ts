/**
 * reflect-categorize.ts — small heuristic used by /reflect.
 *
 * Inspects the user's free-form reflection text and picks one of:
 *   - "insight"      (default — observations, things learned)
 *   - "preference"   (signals like "I prefer", "I like", "I usually")
 *   - "correction"   (signals like "actually", "instead", "should have")
 *
 * Pure function; never throws; always returns one of the three categories.
 * Used by `/reflect`'s command handler and tested in isolation.
 */

export type ReflectionCategory = "insight" | "preference" | "correction";

const PREFERENCE_PATTERNS: RegExp[] = [
  /\bI prefer\b/i,
  /\bI (?:like|love|want)\b/i,
  /\bI usually\b/i,
  /\bmy preference\b/i,
  /\bmy convention\b/i,
  /\bmy style\b/i,
];

const CORRECTION_PATTERNS: RegExp[] = [
  /\bactually\b/i,
  /\binstead\b/i,
  /\bshould have\b/i,
  /\bnot\s+\w+\s+but\b/i,
  /\bI was wrong\b/i,
  /\bcorrection\b/i,
  /\bdon'?t (?:do|use)\b/i,
];

export function categorizeReflection(text: string): ReflectionCategory {
  const t = text.trim();
  if (t.length === 0) return "insight";

  for (const re of PREFERENCE_PATTERNS) {
    if (re.test(t)) return "preference";
  }
  for (const re of CORRECTION_PATTERNS) {
    if (re.test(t)) return "correction";
  }
  return "insight";
}
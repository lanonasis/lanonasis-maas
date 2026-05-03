// Phase 3 - Capture Filter
import { looksLikePromptInjection } from "./prompt-safety.js";

// Trigger patterns for strict mode
const MEMORY_TRIGGERS = [
  /remember/i,
  /prefer/i,
  /decided/i,
  /always/i,
  /never/i,
  /important/i,
  /learned/i,
  /discovered/i,
];

export function shouldCapture(
  text: string,
  opts?: { maxChars?: number; strict?: boolean },
): boolean {
  const maxChars = opts?.maxChars ?? 2000;
  const strict = opts?.strict ?? false;

  // Rule 1: Length check (10-2000 for standard, 30-2000 for strict)
  const minLength = strict ? 30 : 10;
  if (text.length < minLength || text.length > maxChars) {
    return false;
  }

  // Rule 2: No injected recall wrappers from legacy or current formats
  if (
    text.includes("<relevant-memories>")
    || text.includes("CONTEXT BLOCK START")
  ) {
    return false;
  }

  // Rule 3: No XML tag opening
  if (/^\s*</.test(text)) {
    return false;
  }

  // Rule 4: Not prompt injection
  if (looksLikePromptInjection(text)) {
    return false;
  }

  // Strict mode additional rules
  if (strict) {
    // Must match at least one trigger pattern
    const hasTrigger = MEMORY_TRIGGERS.some((pattern) => pattern.test(text));
    if (!hasTrigger) {
      return false;
    }
  }

  return true;
}

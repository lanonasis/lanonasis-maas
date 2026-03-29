import { looksLikePromptInjection } from "./prompt-safety.js";

const MEMORY_TRIGGERS = [
  /remember/i,
  /prefer/i,
  /decided/i,
  /always/i,
  /never/i,
  /important/i,
  /learned/i,
  /discovered/i,
  /root cause/i,
  /switched to/i,
  /pivoted to/i,
  /the fix was/i,
  /the issue was/i,
  /turned out/i,
  /the problem was/i,
  /we chose/i,
  /the approach/i,
  /architecture/i,
  /trade-?off/i,
];

export function shouldCapture(
  text: string,
  opts?: { maxChars?: number; strict?: boolean },
): boolean {
  const maxChars = opts?.maxChars ?? 2000;
  const strict = opts?.strict ?? false;
  const minLength = strict ? 50 : 10;

  if (text.length < minLength || text.length > maxChars) return false;
  if (text.includes("<recalled-context")) return false;
  if (text.includes("<relevant-memories>")) return false;
  if (text.includes("CONTEXT BLOCK START")) return false;
  if (/^\s*</.test(text)) return false;
  if (looksLikePromptInjection(text)) return false;

  if (strict) {
    return MEMORY_TRIGGERS.some((pattern) => pattern.test(text));
  }

  return true;
}

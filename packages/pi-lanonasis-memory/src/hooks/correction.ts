/**
 * correction.ts — detect user-correction cues and assistant acknowledgements,
 * store the corrected assistant text on the fly.
 *
 * Background (LANA-2026-10-06, PR1/6):
 *   When a user says "that's wrong" or "no, actually", the assistant almost
 *   always replies with an explicit acknowledgement that contains the
 *   *corrected* fact. That acknowledgement is the highest-signal content in
 *   the whole session — far more valuable than the assistant's first
 *   attempt. We capture it immediately, bypassing the throttle / dedupe path,
 *   so a correction is never lost to the buffer-and-flush design.
 *
 * Privacy contract:
 *   The user's prompt text is NEVER stored. We only inspect it in-memory
 *   to decide whether to set the pending flag. The pipe (createCorrectionCapture)
 *   exposes `onInput` and `onTurnEnd`; only the assistant's reply lands in
 *   the store, with `category: 'correction'` and tags
 *   `['origin:auto', 'correction']` so the sync policy (PR5) can keep
 *   auto-captured memories local by default.
 *
 * Test coverage: tests/hooks/correction.test.ts.
 */

import type { MemoryStore } from "../store/memory.js";

/** Phrases that signal the user is correcting the assistant's previous reply. */
// Apostrophe character class accepts straight (') and curly (’) variants —
// real chat clients often normalize to curly while LLM responses frequently
// use straight quotes.
export const CORRECTION_CUE_PATTERNS: RegExp[] = [
  /\bthat[’']?s\s+wrong\b/i,
  /\bno,?\s*actually\b/i,
  /\byou(?:' ?re| are)\s+wrong\b/i,
  /\bthat[’']?s\s+incorrect\b/i,
  /\bincorrect\b/i,
  /\bnot\s+what\s+i\s+asked\b/i,
  /\bthat[’']?s\s+not\s+right\b/i,
  /\bthat\s+is(?:[’']?n[’']?t| not)\s+right\b/i,
  /\bthat[’']?s\s+the\s+wrong\b/i,
];

/** Phrases that signal the assistant is acknowledging a correction. */
export const CORRECTION_ACK_PATTERNS: RegExp[] = [
  /\byou(?:' ?re| are)\s+right\b/i,
  /\bmy\s+mistake\b/i,
  /\bi\s+was\s+wrong\b/i,
  /\bapologies\b/i,
  // "Correction: <text>" — no trailing \b because ':' isn't a word char.
  /\bcorrection:/i,
  /\bi\s+misread\b/i,
  /\bi\s+misunderstood\b/i,
  /\bgood\s+catch\b/i,
];

/**
 * True if the user message reads like a correction of a previous assistant
 * reply. Conservative — when in doubt, return false; a missed cue just
 * means we fall back to the regular ingest buffer.
 */
export function detectCorrectionCue(text: string | null | undefined): boolean {
  if (typeof text !== "string") return false;
  for (const p of CORRECTION_CUE_PATTERNS) if (p.test(text)) return true;
  return false;
}

/**
 * True if the assistant message acknowledges a user correction and
 * therefore should be captured immediately.
 */
export function detectCorrectionAck(text: string | null | undefined): boolean {
  if (typeof text !== "string") return false;
  for (const p of CORRECTION_ACK_PATTERNS) if (p.test(text)) return true;
  return false;
}

/**
 * Extract assistant text from a Pi `turn_end.message`. Mirrors the helper
 * in ingest.ts so we don't depend on a private export.
 */
function extractAssistantText(message: unknown): string {
  if (!message || typeof message !== "object") return "";
  const m = message as { role?: string; content?: unknown };
  if (m.role && m.role !== "assistant") return "";
  const c = m.content;
  if (typeof c === "string") return c.trim();
  if (Array.isArray(c)) {
    return c
      .filter((b) => (b as { type?: string }).type === "text")
      .map((b) => (b as { type: string; text?: string }).text ?? "")
      .join("\n")
      .trim();
  }
  return "";
}

export interface CorrectionCaptureHooks {
  /**
   * Wire a Pi `pi.on("input")` handler. The user prompt text is inspected
   * in memory only; it is never persisted and never leaves this function.
   */
  onInput: (event: { type: "input"; text?: string; source?: string }) => void;
  /**
   * Wire a Pi `pi.on("turn_end")` handler. If a cue was pending and the
   * assistant's reply acknowledges it, the reply lands immediately in the
   * store with category `correction`. Returns the store result, or null
   * when no capture happens.
   */
  onTurnEnd: (event: { type: "turn_end"; message?: unknown }) => Promise<
    | { ok: true; id: string; redacted: boolean; secretsFound: number }
    | { ok: false; reason: string }
    | null
  >;
  /** Test-only: is a correction cue currently pending? */
  isPending: () => boolean;
}

export interface CorrectionCaptureDeps {
  /** Returns the current open MemoryStore, or null if no store is open. */
  getStore: () => MemoryStore | null;
  /**
   * Source values that count as user input. Pi's InputEvent.source is
   `'interactive' | 'rpc' | 'extension'`; we default to interactive + rpc
   and skip `extension` (programmatic prompts should not arm a correction).
   */
  interactiveSources?: ReadonlySet<string>;
}

/**
 * Build the correction-capture hook pair. See file header for the
 * privacy + storage contract.
 *
 * Accepts either a getter function (matches the ingest-pipeline signature,
 * which the rest of the extension uses) or a deps object (future-proof — when
 * we need extra config like the input-source allowlist, callers pass an
 * object instead of changing the call site).
 */
export function createCorrectionCapture(
  captureDepsOrGetStore: CorrectionCaptureDeps | (() => MemoryStore | null),
): CorrectionCaptureHooks {
  const captureDeps: CorrectionCaptureDeps =
    typeof captureDepsOrGetStore === "function"
      ? { getStore: captureDepsOrGetStore }
      : captureDepsOrGetStore;
  const interactiveSources =
    captureDeps.interactiveSources ?? new Set(["interactive", "rpc"]);
  let pending = false;

  return {
    onInput(event) {
      const src = event?.source ?? "interactive";
      if (!interactiveSources.has(src)) {
        pending = false;
        return;
      }
      // Inspect the user text in memory only — never persist it.
      pending = detectCorrectionCue(event?.text);
    },

    async onTurnEnd(event) {
      if (!pending) return null;
      // Always clear the flag, even if the assistant doesn't acknowledge.
      // A later ack without a fresh cue is not a correction.
      pending = false;

      const text = extractAssistantText(event?.message);
      if (!text) return null;
      if (!detectCorrectionAck(text)) return null;

      const store = captureDeps.getStore();
      if (!store) return null;

      return store.add({
        target: "memory",
        category: "correction",
        title: buildCorrectionTitle(text),
        content: text,
        tags: ["origin:auto", "correction"],
      });
    },

    isPending() {
      return pending;
    },
  };
}

/** Build a short title for a correction memory, capped at 80 chars. */
function buildCorrectionTitle(content: string): string {
  const firstSentence = content.split(/[.!?]\s/, 1)[0]?.trim() ?? content;
  const raw = firstSentence.length > 80 ? firstSentence.slice(0, 77) + "…" : firstSentence;
  return `[correction] ${raw}`;
}
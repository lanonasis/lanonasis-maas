/**
 * AI Router classifier hook for the v0.1 capture-event ontology.
 *
 * Scope (locked decision §2 of capture-event-ontology.md):
 *   The rules pass already covers `decision`, `commitment`, and `frustration`.
 *   The classifier here is INTENTIONALLY narrow: it asks for ONLY
 *   `surprise` and `insight` events — the two interpretive types that
 *   require an LLM. `revisit` is derived from corpus state (separate hook,
 *   out of scope for this PR); `abandon` is never auto-tagged in v0.
 *
 * Why we ship the rules-detected events as exemplars to the classifier:
 *   – avoids double-tagging (the prompt is told what's already captured)
 *   – grounds the model in the user's actual session vocabulary
 *
 * Why we ship recent `human-corrected:true` memories as exemplars:
 *   – per locked decision §5, corrections are the system's training signal.
 *     Without them the classifier mistakes erode trust and the second-brain
 *     illusion breaks.
 *
 * Brand: all user-visible logging in callers uses "LZero". No upstream
 * vendor names surface — this file's identifier-only references to
 * "AI Router" are internal contract-level naming, not user output.
 */

import type { DetectedEvent, EventType } from './types.js';
import type { SessionTurn } from './session-buffer.js';

/**
 * Minimal chat surface the classifier needs. Decouples this module from
 * a concrete AIRouterClient so unit tests can pass a stub. The concrete
 * `AIRouterClient.chat()` shape conforms.
 */
export interface ChatClient {
  chat(req: {
    messages: Array<{ role: string; content: string }>;
    use_case?: string;
    temperature?: number;
    max_tokens?: number;
  }): Promise<{ message: { content: string } }>;
}

/**
 * A correction exemplar pulled from the corpus — a prior memory the user
 * manually tagged (or untagged) with `human-corrected:true`. Used to
 * teach the classifier the user's sensibility (see locked decision §5).
 */
export interface CorrectionExemplar {
  /** The event type the user landed on after correction (e.g. 'insight'). */
  type: EventType;
  /** Short text from the corrected memory's title or content snippet. */
  text: string;
}

export interface ClassifierInput {
  /** Recent session turns to inspect. */
  turns: SessionTurn[];
  /** Events the rules pass already caught — passed in to suppress
   *  re-classification + ground the model in this session's voice. */
  rulesDetected: DetectedEvent[];
  /** Recent human-corrected exemplars (cap ~10) from prior sessions. */
  corrections: CorrectionExemplar[];
}

export interface ClassifiedEvent extends DetectedEvent {
  /** Always `'classifier'` so downstream can distinguish from rules hits. */
  source: 'classifier';
}

/**
 * Only these two types are produced by the classifier. The other five
 * (decision, commitment, frustration, revisit, abandon) are handled by
 * the rules pass or by separate hooks / manual user action.
 */
const CLASSIFIER_TYPES: ReadonlyArray<Extract<EventType, 'surprise' | 'insight'>> = [
  'surprise',
  'insight',
] as const;

/** Cap on exemplars injected into the prompt — keeps token budget compact. */
export const MAX_CORRECTION_EXEMPLARS = 10;

/** Cap on session turn characters per turn — protects classifier latency. */
const MAX_TURN_CHARS = 1200;

/**
 * Build the classifier prompt. Public for tests + transparency.
 *
 * The prompt is deliberately scoped:
 *   1. Lists the two types we want (surprise, insight) with one-line defs
 *      from the ontology spec.
 *   2. Lists the deterministic types as ALREADY-COVERED so the model
 *      knows not to re-emit them (no double-tagging).
 *   3. Shows what the rules pass found in THIS session as exemplars of
 *      "events we already have — do not duplicate".
 *   4. Shows recent human-corrected exemplars so the model picks up the
 *      user's sensibility.
 *   5. Asks for strict JSON: `{ events: [{ type, evidence, confidence }] }`.
 *      A title is omitted — the caller derives one from `evidence`.
 */
export function buildClassifierPrompt(input: ClassifierInput): string {
  const exemplars = input.corrections.slice(0, MAX_CORRECTION_EXEMPLARS);

  const rulesAlreadyCaught = input.rulesDetected
    .map(e => `- event:${e.type}  evidence="${truncate(e.evidence, 140)}"`)
    .join('\n') || '(none)';

  const exemplarBlock = exemplars
    .map(e => `- event:${e.type}  "${truncate(e.text, 140)}"`)
    .join('\n') || '(no prior human-corrected exemplars available)';

  const sessionBlock = input.turns
    .map(t => `[${t.role}] ${truncate(t.content, MAX_TURN_CHARS)}`)
    .join('\n');

  return [
    `You are an event classifier for a personal continuity-intelligence system.`,
    ``,
    `Your task: read the session transcript below and emit ONLY events of these two types:`,
    `  - surprise: an outside-in moment where a prior assumption broke ("oh, I didn't know that"; "huh, not what I expected")`,
    `  - insight:  an inside-out moment where the user articulates a new connection between two or more things they already knew`,
    ``,
    `DO NOT emit any of these — they are covered by a separate deterministic pass:`,
    `  - decision, commitment, frustration, revisit, abandon`,
    ``,
    `Events the deterministic pass already captured in THIS session (do NOT re-emit):`,
    rulesAlreadyCaught,
    ``,
    `Recent exemplars the user manually corrected — match this sensibility:`,
    exemplarBlock,
    ``,
    `Session transcript:`,
    sessionBlock,
    ``,
    `Respond with strict JSON only — no markdown fences, no prose:`,
    `{"events":[{"type":"surprise"|"insight","evidence":"<short verbatim quote from transcript>","confidence":<0..1>}]}`,
    `If nothing qualifies, respond with: {"events":[]}`,
  ].join('\n');
}

function truncate(text: string, max: number): string {
  if (!text) return '';
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

/**
 * Parse the classifier's JSON response and return only valid
 * surprise/insight events. Defensive — bad JSON or unexpected shapes
 * resolve to an empty list rather than throwing into the REPL.
 */
export function parseClassifierResponse(raw: string): ClassifiedEvent[] {
  if (!raw || !raw.trim()) return [];

  // Strip a code fence if the model emitted one despite instructions.
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return [];
  }

  if (!parsed || typeof parsed !== 'object') return [];
  const events = (parsed as { events?: unknown }).events;
  if (!Array.isArray(events)) return [];

  const out: ClassifiedEvent[] = [];
  for (const e of events) {
    if (!e || typeof e !== 'object') continue;
    const rec = e as Record<string, unknown>;
    const type = rec.type;
    if (type !== 'surprise' && type !== 'insight') continue;
    const evidence = typeof rec.evidence === 'string' ? rec.evidence.trim() : '';
    if (!evidence) continue;
    const confRaw = typeof rec.confidence === 'number' ? rec.confidence : 0.6;
    const confidence = Math.max(0, Math.min(1, confRaw));
    out.push({
      type,
      evidence,
      confidence,
      source: 'classifier',
    });
  }
  return out;
}

/**
 * Run the AI Router classifier on the buffered session.
 *
 * Caller is responsible for env-gating (`LANONASIS_CAPTURE_EVENTS`),
 * mode-gating (`LANONASIS_CLASSIFIER=rules-only` short-circuits before
 * this is ever called), corrections lookup, and downstream `createMemory`.
 * This module does NOT touch the network except via the injected client.
 */
export async function classifySessionEvents(
  client: ChatClient,
  input: ClassifierInput,
): Promise<ClassifiedEvent[]> {
  if (!input.turns || input.turns.length === 0) return [];

  const prompt = buildClassifierPrompt(input);

  const response = await client.chat({
    messages: [
      {
        role: 'system',
        content:
          'You are a precise event classifier. Output strict JSON only. ' +
          'Do not invent events that are not in the transcript.',
      },
      { role: 'user', content: prompt },
    ],
    // Internal use-case label only — never surfaced to user.
    use_case: 'event-classifier',
    temperature: 0.2,
    max_tokens: 600,
  });

  return parseClassifierResponse(response?.message?.content ?? '');
}

/** Exposed for testing — the set of types the classifier is allowed to produce. */
export const CLASSIFIER_OUTPUT_TYPES = CLASSIFIER_TYPES;

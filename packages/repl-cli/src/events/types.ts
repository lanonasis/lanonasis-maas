/**
 * Capture-event ontology — type-level definitions.
 *
 * Implements the 7-type ontology locked in
 * `docs/context/architecture/capture-event-ontology.md`. Each event type
 * is a tag-convention slug applied alongside the existing `memory_type`
 * enum on the MaaS memory record — no MaaS schema changes required.
 *
 * Convergence (Phase B) reads `event:*` tags off the memory corpus. The
 * quality of that synthesis is bounded by what is captured here.
 */

/**
 * The seven canonical event types. Order is intentional: deterministic
 * types (rules-detectable) come first, interpretive types last.
 *
 *   decision    — explicit choice between alternatives with rationale (Mind)
 *   commitment  — stated intent to do X (optionally by Y)
 *   frustration — friction signal: blocker, repeated failure, vent (Heart)
 *   surprise    — outside-in: assumption-breaking moment
 *   insight     — inside-out: connection-making moment
 *   revisit     — auto: semantic hit on a >7-day-old prior memory
 *   abandon     — NOT auto-tagged in v0; user-applied via /event tag
 */
export const EVENT_TYPES = [
  'decision',
  'commitment',
  'frustration',
  'surprise',
  'insight',
  'revisit',
  'abandon',
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export function isEventType(value: string): value is EventType {
  return (EVENT_TYPES as readonly string[]).includes(value);
}

/**
 * Detector output. A single chunk of input text may match multiple
 * event types — e.g. "I'll fix the broken pipeline by Friday" is both
 * `commitment` (intent + deadline) and `frustration` (broken).
 */
export interface DetectedEvent {
  /** Which event type the rule matched. */
  type: EventType;
  /** Confidence score in [0,1]. Rules-based detectors emit fixed values
   *  (typically 0.7 for a single-pattern hit, 0.9 for multi-pattern). */
  confidence: number;
  /** The substring that triggered the match (for diagnostics + /event detect). */
  evidence: string;
  /** Optional structured metadata derived from the match — e.g. a parsed
   *  due date for a commitment, the tool name for a tool-tagged frustration. */
  payload?: Record<string, string>;
}

/**
 * Classifier mode — gated by env var `LANONASIS_CLASSIFIER`.
 *
 *   hybrid     — rules-first for deterministic types; AI Router call at
 *                session-end for surprise/insight (v0.1 implements the
 *                router pass; v0 ships rules only).
 *   rules-only — never call the router; offline path.
 */
export type ClassifierMode = 'hybrid' | 'rules-only';

export const DEFAULT_CLASSIFIER_MODE: ClassifierMode = 'hybrid';

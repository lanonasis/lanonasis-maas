/**
 * cadence.ts — review-cadence counter for hook classification.
 *
 * Background (LANA-2026-10-06, PR1/6):
 *   We never want to classify every turn_end as a memory event. Pi sessions
 * can run for hundreds of exchanges and re-classifying every assistant message
 * burns CPU and floods SQLite with duplicates. Instead, ingest.ts buffers
 * assistant text per turn and only triggers a review when *either*:
 *     - enough turns have elapsed (default 10), or
 *     - enough tool calls have fired (default 15) — tool calls are a strong
 *   signal that the model just discovered something actionable.
 *
 * `ReviewCadence` is a small pure state machine. No I/O. No events.
 * The host (ingest.ts) decides what to do when `shouldReview()` flips true.
 *
 * Test coverage: tests/hooks/cadence.test.ts (pure unit tests).
 */

export interface ReviewCadenceOptions {
  /** Review after this many assistant turns. Clamped to ≥1. @default 10 */
  everyTurns?: number;
  /**
   * Review after this many tool-call events have fired since the last
   * reset. Independent of turn count. Clamped to ≥1. @default 15
   */
  everyToolCalls?: number;
}

const DEFAULTS = {
  everyTurns: 10,
  everyToolCalls: 15,
} as const;

function clampThreshold(n: number | null | undefined, fallback: number): number {
  if (!Number.isFinite(n ?? Number.NaN)) return fallback;
  const v = Math.trunc(n as number);
  return v >= 1 ? v : 1;
}

/**
 * ReviewCadence — accumulates turn + tool-call counts and reports when a
 * review should run. After the host runs the review it must call `reset()`
 * so the next probe period starts fresh.
 *
 * Pure: no I/O, no timers. Safe to unit-test without a fake clock.
 */
export class ReviewCadence {
  readonly everyTurns: number;
  readonly everyToolCalls: number;
  private _turns = 0;
  private _toolCalls = 0;

  constructor(opts: ReviewCadenceOptions = {}) {
    this.everyTurns = clampThreshold(opts.everyTurns, DEFAULTS.everyTurns);
    this.everyToolCalls = clampThreshold(opts.everyToolCalls, DEFAULTS.everyToolCalls);
  }

  /** Number of turns since the last reset (or construction). */
  get turns(): number {
    return this._turns;
  }

  /** Number of tool calls since the last reset (or construction). */
  get toolCalls(): number {
    return this._toolCalls;
  }

  /** Record one assistant turn. */
  recordTurn(): void {
    this._turns += 1;
  }

  /**
   * Record `n` tool-call results (typically `event.toolResults.length`).
   * Negative / non-finite values are ignored — they usually indicate a
   * caller that defaulted to -1 instead of 0 and should not poison the
   * accumulator.
   */
  recordToolCalls(n: number): void {
    if (!Number.isFinite(n) || n <= 0) return;
    this._toolCalls += Math.trunc(n);
  }

  /**
   * True when either threshold has been met or exceeded since the last
   * reset. Sticky: it stays true until reset() runs.
   */
  shouldReview(): boolean {
    return this._turns >= this.everyTurns || this._toolCalls >= this.everyToolCalls;
  }

  /** Reset both counters. */
  reset(): void {
    this._turns = 0;
    this._toolCalls = 0;
  }
}
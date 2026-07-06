/**
 * Session input buffer for the v0.1 classifier hook.
 *
 * Accumulates the last N (user, assistant) turns of a REPL session in a
 * bounded ring so the session-end classifier has substrate to inspect.
 *
 * Per the ontology spec (Locked decision §5), capture is hybrid:
 *   • rules pass runs mid-session on each user turn
 *   • AI Router pass runs ONCE at session-end on the accumulated buffer
 *
 * No I/O — pure data structure. The classifier owns the network call.
 */
export type SessionRole = 'user' | 'assistant';

export interface SessionTurn {
  role: SessionRole;
  /** The text of the turn. Long content is preserved; truncation is the
   *  classifier's responsibility (it knows its token budget). */
  content: string;
  /** Wall-clock ms; useful when the classifier wants to bias toward
   *  recency. Optional so tests can omit it. */
  ts?: number;
}

const DEFAULT_MAX_TURNS = 40;

export class SessionBuffer {
  private turns: SessionTurn[] = [];
  private readonly maxTurns: number;

  constructor(maxTurns: number = DEFAULT_MAX_TURNS) {
    this.maxTurns = Math.max(2, maxTurns);
  }

  /** Append a turn; oldest is dropped past `maxTurns`. */
  push(role: SessionRole, content: string): void {
    if (!content || !content.trim()) return;
    this.turns.push({ role, content, ts: Date.now() });
    if (this.turns.length > this.maxTurns) {
      this.turns.splice(0, this.turns.length - this.maxTurns);
    }
  }

  /** Snapshot of the current buffer. Returns a defensive copy. */
  snapshot(): SessionTurn[] {
    return this.turns.slice();
  }

  /** Number of turns currently held. */
  size(): number {
    return this.turns.length;
  }

  /** Reset for next session or after a successful classify pass. */
  clear(): void {
    this.turns = [];
  }
}

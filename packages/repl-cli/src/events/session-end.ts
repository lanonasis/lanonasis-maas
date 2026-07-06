/**
 * Session-end orchestration for the v0.1 classifier.
 *
 * Glues together:
 *   • env gating (LANONASIS_CAPTURE_EVENTS, LANONASIS_CLASSIFIER)
 *   • rules pass over recent user turns (already shipped in v0)
 *   • the AI Router classifier hook (this PR)
 *   • correction-exemplar fetch from the corpus (locked decision §5)
 *   • createMemory writes for surprise/insight only (rules-handled types
 *     are deliberately skipped — no double-tagging)
 *
 * Caller (the REPL engine) invokes `runSessionEndClassifier(...)` from
 * its `stop()` path. The function is best-effort: any failure logs and
 * returns gracefully — it must never crash the REPL on shutdown.
 *
 * Brand: user-visible log lines say "LZero". No vendor names surface.
 */

import { detectEvents } from './rules.js';
import {
  classifySessionEvents,
  type ChatClient,
  type ClassifiedEvent,
  type CorrectionExemplar,
  MAX_CORRECTION_EXEMPLARS,
} from './classifier.js';
import { isCaptureEventsEnabled, readClassifierMode } from './config.js';
import { eventTag, TAG_HUMAN_CORRECTED } from './tags.js';
import type { SessionBuffer } from './session-buffer.js';
import type { DetectedEvent, EventType } from './types.js';

/**
 * Minimal MemoryClient surface the runner needs. Decouples from the
 * concrete `MemoryClient` import so tests can stub easily.
 */
export interface MinimalMemoryClient {
  listMemories(options: {
    tags?: string[];
    limit?: number;
    status?: string;
    sort?: string;
    order?: 'asc' | 'desc';
  }): Promise<{
    data?: { data?: Array<{ title: string; content: string; tags?: string[] }> };
    error?: unknown;
  }>;
  createMemory(memory: {
    title: string;
    content: string;
    memory_type: string;
    tags: string[];
  }): Promise<{ data?: { id?: string }; error?: unknown }>;
}

/**
 * Stats returned for diagnostics / tests / `/event classify` reporting.
 */
export interface SessionEndStats {
  ran: boolean;
  reason?: string;
  rulesDetected: number;
  classifierEvents: number;
  memoriesCreated: number;
  errors: string[];
}

export interface SessionEndOptions {
  buffer: SessionBuffer;
  client: MinimalMemoryClient;
  chatClient?: ChatClient | null;
  env?: NodeJS.ProcessEnv;
  /** Override to force-run regardless of LANONASIS_CAPTURE_EVENTS — used
   *  by `/event classify` for explicit manual triggering. */
  force?: boolean;
  /** Optional callback invoked once with the final stats — used by the
   *  REPL to surface a one-line summary on session end. */
  onComplete?: (stats: SessionEndStats) => void;
}

/**
 * Run the session-end classifier pipeline. Always resolves with stats;
 * never throws. Failures are accumulated in `stats.errors`.
 */
export async function runSessionEndClassifier(
  opts: SessionEndOptions,
): Promise<SessionEndStats> {
  const env = opts.env ?? process.env;
  const stats: SessionEndStats = {
    ran: false,
    rulesDetected: 0,
    classifierEvents: 0,
    memoriesCreated: 0,
    errors: [],
  };

  if (!opts.force && !isCaptureEventsEnabled(env)) {
    stats.reason = 'LANONASIS_CAPTURE_EVENTS disabled';
    opts.onComplete?.(stats);
    return stats;
  }

  const turns = opts.buffer.snapshot();
  if (turns.length === 0) {
    stats.reason = 'empty session buffer';
    opts.onComplete?.(stats);
    return stats;
  }

  // Run the rules pass over user turns only — the rules vocabulary is
  // built for user-authored intent, not assistant responses.
  const rulesDetected: DetectedEvent[] = [];
  for (const turn of turns) {
    if (turn.role !== 'user') continue;
    const hits = detectEvents(turn.content);
    for (const hit of hits) rulesDetected.push(hit);
  }
  stats.rulesDetected = rulesDetected.length;

  const mode = readClassifierMode(env);
  if (mode === 'rules-only') {
    stats.ran = true;
    stats.reason = 'rules-only mode: classifier skipped';
    opts.onComplete?.(stats);
    return stats;
  }

  if (!opts.chatClient) {
    stats.reason = 'no chat client configured';
    opts.onComplete?.(stats);
    return stats;
  }

  // Fetch up to MAX_CORRECTION_EXEMPLARS recent human-corrected memories.
  // Best-effort: failure here doesn't block the classifier — we just send
  // fewer exemplars.
  let corrections: CorrectionExemplar[] = [];
  try {
    corrections = await fetchCorrectionExemplars(opts.client);
  } catch (err) {
    stats.errors.push(`corrections fetch failed: ${errorString(err)}`);
  }

  let classified: ClassifiedEvent[] = [];
  try {
    classified = await classifySessionEvents(opts.chatClient, {
      turns,
      rulesDetected,
      corrections,
    });
  } catch (err) {
    stats.errors.push(`classifier call failed: ${errorString(err)}`);
    stats.ran = true;
    opts.onComplete?.(stats);
    return stats;
  }

  // Defense in depth: drop any event whose type isn't surprise/insight.
  // The rules pass owns decision/commitment/frustration; revisit/abandon
  // are handled elsewhere. Double-tagging here would dilute signal.
  const RULES_HANDLED: ReadonlySet<EventType> = new Set([
    'decision',
    'commitment',
    'frustration',
    'revisit',
    'abandon',
  ]);
  const safe = classified.filter(e => !RULES_HANDLED.has(e.type));
  stats.classifierEvents = safe.length;

  for (const ev of safe) {
    try {
      const title = deriveTitle(ev.evidence, ev.type);
      const content = ev.evidence;
      const tags = [eventTag(ev.type)];
      const result = await opts.client.createMemory({
        title,
        content,
        memory_type: 'context',
        tags,
      });
      if (result.error) {
        stats.errors.push(`create event:${ev.type} failed: ${errorString(result.error)}`);
        continue;
      }
      stats.memoriesCreated += 1;
    } catch (err) {
      stats.errors.push(`create event:${ev.type} threw: ${errorString(err)}`);
    }
  }

  stats.ran = true;
  opts.onComplete?.(stats);
  // Buffer is the caller's; do not clear here — the REPL owns lifecycle.
  return stats;
}

/**
 * Pull up to `MAX_CORRECTION_EXEMPLARS` recent memories tagged
 * `human-corrected:true`. Returns one exemplar per memory, picking the
 * first `event:<type>` tag we find on it as the "user landed on" type.
 *
 * If no exemplars exist (fresh user, no prior corrections), returns an
 * empty array — the classifier prompt handles that case explicitly.
 */
async function fetchCorrectionExemplars(
  client: MinimalMemoryClient,
): Promise<CorrectionExemplar[]> {
  const result = await client.listMemories({
    tags: [TAG_HUMAN_CORRECTED],
    limit: MAX_CORRECTION_EXEMPLARS,
    status: 'active',
    sort: 'created_at',
    order: 'desc',
  });
  if (result.error || !result.data?.data) return [];

  const out: CorrectionExemplar[] = [];
  for (const m of result.data.data) {
    const type = firstEventTypeFromTags(m.tags ?? []);
    if (!type) continue;
    const text = (m.title || m.content || '').trim();
    if (!text) continue;
    out.push({ type, text });
  }
  return out.slice(0, MAX_CORRECTION_EXEMPLARS);
}

function firstEventTypeFromTags(tags: string[]): EventType | undefined {
  for (const t of tags) {
    if (!t.startsWith('event:')) continue;
    const slug = t.slice('event:'.length);
    switch (slug) {
      case 'decision':
      case 'commitment':
      case 'frustration':
      case 'surprise':
      case 'insight':
      case 'revisit':
      case 'abandon':
        return slug as EventType;
      default:
        continue;
    }
  }
  return undefined;
}

/**
 * Derive a short, human-readable title from the evidence snippet.
 * Capped at 80 chars; falls back to "<type> event" if evidence is empty.
 */
function deriveTitle(evidence: string, type: EventType): string {
  const cleaned = evidence.replace(/\s+/g, ' ').trim();
  if (!cleaned) return `${type} event`;
  const max = 80;
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max - 1)}…`;
}

function errorString(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === 'string') return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

/**
 * ingest.ts — Pi hook-driven session ingestion.
 *
 * Wires the MemoryStore into Pi's ExtensionAPI lifecycle hooks so
 * session content is automatically persisted without requiring a slash
 * command or manual API call.
 *
 * Hooks wired:
 *   `session_start`      — open the store, load session tag
 *   `turn_end`           — buffer assistant text + tool-call counts
 *   `session_shutdown`   — flush any remaining buffered items, close store
 *
 * Architecture (LANA-2026-10-06 PR1/6):
 *   We no longer classify on every turn_end — Pi sessions can run for
 *   hundreds of exchanges and classifying each one floods SQLite with
 *   duplicates. Instead, ingest buffers assistant text per turn and only
 *   runs the classifier when `ReviewCadence.shouldReview()` flips.
 *
 *   Correction capture (`src/hooks/correction.ts`) is intentionally
 *   separate and runs **outside** this throttle — a user correction is
 *   the highest-signal content in any session and must never be lost to
 *   the buffer-and-flush design.
 *
 * What gets stored (classified by signal patterns):
 *   - Explicit memory requests: "remember", "note that", "keep in mind"
 *   - Preference statements:  "I prefer", "my convention", "I usually"
 *   - Configuration facts:    "export const", "MEMORY.md", "USER.md"
 *   - Conventions:           "always", "never", "the pattern is"
 *   - Error conclusions:     "the issue was", "root cause", "solution"
 *   - Insights:              "interesting", "TIL", "learned that"
 *   - Tool corrections:      "that's wrong", "incorrect" (also covered
 *                              immediately by the correction hook)
 *
 * What's NEVER stored:
 *   - Raw user prompts (privacy boundary)
 *   - Tool call arguments or file contents (too noisy)
 *   - Very short responses (< minContentLength chars)
 *   - Responses flagged as errors by the tool layer
 *
 * Design decisions:
 *   - Store is opened once at session_start and lives for the session.
 *     This avoids the 1-file-per-session sprawl that pi-hermes-memory has.
 *   - Only assistant messages are classified — user prompts are too variable.
 *   - The scanner gates every write (inherited from Phase 3).
 *   - All ingested memories carry the `origin:auto` tag so the sync
 *     policy (PR5) can keep auto-captured memories local by default.
 *   - MaaS sync columns (maas_synced_at / maas_id) are set to null;
 *     Phase 5 will drain them in the background.
 */

import { MemoryStore, type AddMemoryInput, type MemoryTarget } from "../store/memory.js";
import { ReviewCadence } from "./cadence.js";

/** Ingest configuration — set once at extension load time. */
export interface IngestConfig {
  /**
   * Default target for ingested memories.
   * 'user' (personal facts/preferences) is the correct default for a
   * personal coding agent. 'project' would be used for team-shared facts.
   * @default 'user'
   */
  target?: MemoryTarget;

  /**
   * Minimum character length for an assistant response to be considered
   * for classification. Short responses ("no", "sure", "done") are skipped.
   * @default 20
   */
  minContentLength?: number;

  /**
   * Whether ingest is active. Disable this if you need a fully passive
   * extension (slash-command-only mode).
   * @default true
   */
  enabled?: boolean;

  /**
   * Optional session tag prepended to every ingested memory's title.
   * Useful for multi-project workspaces to scope memories to a session.
   * @default undefined (no prefix)
   */
  sessionTag?: string;

  /**
   * Review-cadence threshold — flush the buffered turns after this many
   * assistant turns since the last flush. Clamped to ≥1. @default 10
   */
  reviewEveryTurns?: number;

  /**
   * Review-cadence threshold — flush after this many tool-call events
   * have fired since the last flush. Clamped to ≥1. @default 15
   */
  reviewEveryToolCalls?: number;

  /**
   * Optional callback fired after a successful auto-capture. The runtime
   * uses it to enqueue the row to MaaS when
   * `LANONASIS_PI_MEMORY_AUTO_SYNC=1`. Never throws.
   * @default undefined
   */
  onWrite?: (input: AddMemoryInput, id: string) => void;
}

/** A single buffered turn waiting for the cadence to fire. */
interface BufferedTurn {
  text: string;
  /** Length of event.toolResults for this turn (used to advance cadence). */
  toolCallCount: number;
  /** toolResults payload — preserved for the classifier's error gate. */
  toolResults: Array<{ isError?: boolean }>;
}

/** Return type from buildIngestPipeline — the three hook handlers. */
export interface IngestHooks {
  onSessionStart: (event: { type: "session_start" }, ctx: unknown) => Promise<void>;
  onTurnEnd: (
    event: {
      type: "turn_end";
      turnIndex: number;
      message: unknown;
      toolResults: unknown[];
    },
    ctx: unknown,
  ) => Promise<void>;
  onSessionShutdown: (event: { type: "session_shutdown" }, ctx: unknown) => Promise<void>;
  /** Test-only: number of buffered turns waiting on the cadence. */
  pendingTurns: () => number;
}

/** Internal state held for the lifetime of a Pi session. */
interface IngestState {
  store: MemoryStore | null;
  sessionTag: string;
  enabled: boolean;
  minContentLength: number;
  defaultTarget: MemoryTarget;
  cadence: ReviewCadence;
  buffer: BufferedTurn[];
}

/**
 * Map the classifier's bucket to a category in the locked SQLite enum.
 * PR2 owns the schema; until its mirror/scoping PR lands, only the
 * existing CATEGORIES (`failure|correction|insight|preference|convention|tool-quirk`)
 * are accepted by MemoryStore.add. We collapse broader buckets:
 *   explicit     -> insight  (explicit memory requests)
 *   preference   -> preference
 *   config       -> insight  (config / export facts)
 *   errorDiag    -> failure  (root-cause / fix narratives)
 *   insight      -> insight
 *   correction   -> correction
 *   convention   -> convention
 */
function categoryToEnum(category: string): AddMemoryInput["category"] {
  switch (category) {
    case "preference":
      return "preference";
    case "correction":
      return "correction";
    case "convention":
      return "convention";
    case "errorDiag":
      return "failure";
    case "explicit":
    case "config":
    case "insight":
    default:
      return "insight";
  }
}

/** Signal patterns — matched against assistant message content. */
const SIGNALS = {
  /** Explicit memory requests from the assistant. */
  explicit: [
    /\bremember\b/i,
    /\bnote that\b/i,
    /\bkeep in mind\b/i,
    /\bimportant:?\b/i,
    /\bdon't forget\b/i,
    /\bworth noting\b/i,
  ],

  /** Preference / convention statements. */
  preference: [
    /\bI prefer\b/i,
    /\bmy convention\b/i,
    /\bI usually\b/i,
    /\bI always\b/i,
    /\bI never\b/i,
    /\bthe pattern is\b/i,
    /\bthe convention\b/i,
    /\bstandard approach\b/i,
  ],

  /** Configuration / export facts. */
  config: [
    /export const\b/,
    /export function\b/,
    /\bMEMORY\.md\b/,
    /\bUSER\.md\b/,
    /\bconfig\b.*?[:=]/i,
    /\b\.env\b/,
  ],

  /** Error diagnosis / root cause. */
  errorDiag: [
    /\bthe issue was\b/i,
    /\broot cause\b/i,
    /\bsolution:?\b/i,
    /\bthe fix\b/i,
    /\bturned out to be\b/i,
    /\bthe problem\b.*?[Bb]een/i,
  ],

  /** General insights. */
  insight: [
    /\binteresting\b/i,
    /\bTIL\b/i,
    /\blearned that\b/i,
    /\bdidn't know\b/i,
    /\bsurprisingly\b/i,
    /\bnotably\b/i,
  ],

  /** Tool corrections (assistant told user something was wrong). */
  correction: [
    /\bthat's wrong\b/i,
    /\bincorrect\b/i,
    /\berror\b.*?[Ii]s\b/i,
    /\byou should\b.*?[Cc]heck\b/i,
    /\bshould be\b.*?[Nn]ot\b/i,
  ],

  /** Convention reinforcement. */
  convention: [
    /\balways\b/i,
    /\bnever\b/i,
    /\bdo not\b.*?[Ii]t\b/i,
    /\bmake sure to\b/i,
    /\bbest practice\b/i,
    /\blinting\b/i,
  ],
} as const;

/**
 * Classify which category a message belongs to, if any.
 * Returns null when no signal fires — the message is not worth storing.
 */
function classifyMessage(
  content: string,
  toolResults: Array<{ isError?: boolean }>,
): { category: string; title: string } | null {
  // Tool errors never produce interesting memories for the user side.
  if (toolResults.some((r) => r.isError)) return null;

  for (const [category, patterns] of Object.entries(SIGNALS)) {
    for (const pattern of patterns) {
      if (pattern.test(content)) {
        const title = buildTitle(category, content);
        return { category, title };
      }
    }
  }

  return null;
}

/**
 * Build a short title from the content, capped at 80 chars.
 * Uses the first sentence or first clause as the title.
 */
function buildTitle(category: string, content: string): string {
  const firstSentence = content.split(/[.!?]\s/, 1)[0]?.trim() ?? content;
  const raw = firstSentence.length > 80 ? firstSentence.slice(0, 77) + "…" : firstSentence;
  return `[${category}] ${raw}`;
}

/**
 * Extract plain text from a Pi AgentMessage.
 * Handles TextContent and ToolResultMessage variants.
 */
function extractText(message: {
  role?: string;
  content?: unknown;
}): string {
  if (!message.content) return "";

  if (typeof message.content === "string") {
    return message.content.trim();
  }

  if (Array.isArray(message.content)) {
    return message.content
      .filter((block) => (block as { type?: string }).type === "text")
      .map((block) => (block as { type: "text"; text?: string }).text ?? "")
      .join("\n")
      .trim();
  }

  return String(message.content);
}

/**
 * Build the three Pi hook handlers wired to a single MemoryStore instance.
 *
 * Backward compatible — the previous signature accepted `MemoryStore`
 * directly; we now accept a getter so callers can defer opening the store
 * (e.g. only at session_start) and still close over the same store.
 *
 * Usage in index.ts:
 *   const pipeline = buildIngestPipeline(() => store, config);
 *   pi.on("session_start", pipeline.onSessionStart);
 *   pi.on("turn_end",     pipeline.onTurnEnd);
 *   pi.on("session_shutdown", pipeline.onSessionShutdown);
 *
 * @param getStore  — factory that returns an open MemoryStore (or null if disabled)
 * @param config    — ingest behaviour configuration
 */
export function buildIngestPipeline(
  getStore: () => MemoryStore | null,
  config: IngestConfig = {},
): IngestHooks {
  const minContentLength = config.minContentLength ?? 20;
  const enabled = config.enabled ?? true;
  const defaultTarget = config.target ?? "user";
  const sessionTag = config.sessionTag ?? "";

  const state: IngestState = {
    store: null,
    sessionTag,
    enabled,
    minContentLength,
    defaultTarget,
    cadence: new ReviewCadence({
      everyTurns: config.reviewEveryTurns ?? 10,
      everyToolCalls: config.reviewEveryToolCalls ?? 15,
    }),
    buffer: [],
  };

  /** Persist every buffered turn that fires a signal, then reset cadence. */
  function flushBuffer(): void {
    const store = state.store ?? getStore();
    if (store) state.store = store;

    if (store) {
      for (const turn of state.buffer) {
        // Tool errors at this turn disqualify just that turn.
        const classification = classifyMessage(turn.text, turn.toolResults);
        if (!classification) continue;

        const titlePrefix = state.sessionTag ? `[${state.sessionTag}] ` : "";
        const input: AddMemoryInput = {
          target: defaultTarget,
          category: categoryToEnum(classification.category),
          title: titlePrefix + classification.title,
          content: turn.text,
          tags: ["origin:auto"],
        };
        const result = store.add(input);
        if (result.ok && config.onWrite) {
          try {
            config.onWrite(input, result.id);
          } catch {
            // host-supplied callback must never break the ingest loop
          }
        }
      }
    }

    state.buffer.length = 0;
    state.cadence.reset();
  }

  return {
    async onSessionStart(_event, _ctx) {
      if (!enabled) return;
      const store = getStore();
      if (!store) return;
      state.store = store;
      state.cadence.reset();
      state.buffer.length = 0;
      if (state.sessionTag) {
        const result = store.add({
          target: "memory",
          category: "insight",
          title: `[session] ${state.sessionTag}`,
          content: `Session started at ${new Date().toISOString()}.`,
          tags: ["origin:auto"],
        });
        if (result.ok && config.onWrite) {
          try {
            config.onWrite(
              {
                target: "memory",
                category: "insight",
                title: `[session] ${state.sessionTag}`,
                content: `Session started at ${new Date().toISOString()}.`,
                tags: ["origin:auto"],
              },
              result.id,
            );
          } catch {
            // host-supplied callback must never break the ingest loop
          }
        }
      }
    },

    async onTurnEnd(event, _ctx) {
      if (!enabled) return;
      const msg = event.message as { role?: string; content?: unknown };
      // Only classify assistant messages
      if (msg.role !== "assistant") return;

      const text = extractText(msg);
      const toolCallCount = Array.isArray(event.toolResults) ? event.toolResults.length : 0;
      const toolResults = (event.toolResults ?? []) as Array<{ isError?: boolean }>;

      // Always advance the cadence — even short messages count toward
      // the "have we done enough work to be worth reviewing?" budget.
      state.cadence.recordTurn();
      if (toolCallCount > 0) state.cadence.recordToolCalls(toolCallCount);

      // Buffer anything substantive. Sub-threshold and tool-error turns
      // are silently dropped — they will be remembered via the cadence
      // reset (no noise accumulates forever).
      if (text.length >= minContentLength) {
        state.buffer.push({ text, toolCallCount, toolResults });
      }

      if (state.cadence.shouldReview()) {
        flushBuffer();
      }
    },

    async onSessionShutdown(_event, _ctx) {
      // Final flush — anything still in the buffer is written *before*
      // the store closes. The store itself is closed by the host
      // (index.ts) after this handler returns; we only own pipeline
      // state here so the host can interleave with other shutdown work.
      flushBuffer();
      state.store = null;
    },

    pendingTurns() {
      return state.buffer.length;
    },
  };
}
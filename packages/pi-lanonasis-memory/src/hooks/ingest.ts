/**
 * ingest.ts — Phase 6: Pi hook-driven session ingestion.
 *
 * Wires the MemoryStore into Pi's ExtensionAPI lifecycle hooks so
 * session content is automatically persisted without requiring a slash
 * command or manual API call.
 *
 * Hooks wired:
 *   `session_start`  — open the store, load session tag
 *   `turn_end`       — classify the assistant's response, store if signal fires
 *   `session_shutdown` — checkpoint WAL, close store
 *
 * What gets stored (classified by signal patterns):
 *   - Explicit memory requests: "remember", "note that", "keep in mind"
 *   - Preference statements:  "I prefer", "my convention", "I usually"
 *   - Configuration facts:    "export const", "MEMORY.md", "USER.md"
 *   - Conventions:           "always", "never", "the pattern is"
 *   - Error conclusions:     "the issue was", "root cause", "solution"
 *   - Insights:              "interesting", "TIL", "learned that"
 *   - Tool corrections:       correction patterns from tool results
 *
 * What's NEVER stored:
 *   - Raw user prompts (privacy boundary)
 *   - Tool call arguments or file contents (too noisy)
 *   - Very short responses (< minContentLength chars)
 *   - Responses flagged as errors by the tool layer
 *
 * Design decisions (from Phase 6 review):
 *   - Store is opened once at session_start and lives for the session.
 *     This avoids the 1-file-per-session sprawl that pi-hermes-memory has.
 *   - Only assistant messages are classified — user prompts are too variable.
 *   - The scanner gates every write (inherited from Phase 3).
 *   - MaaS sync columns (maas_synced_at / maas_id) are set to null;
 *     Phase 5 will drain them in the background.
 */

import { MemoryStore, type AddMemoryInput, type MemoryTarget } from "../store/memory.js";

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
}

/** Internal state held for the lifetime of a Pi session. */
interface IngestState {
  store: MemoryStore | null;
  sessionTag: string;
  enabled: boolean;
  minContentLength: number;
  defaultTarget: MemoryTarget;
  turnCount: number;
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
    /\ball caps phrase\b/i,
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
 * Handles TextContent andToolResultMessage variants.
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
 * Usage in index.ts:
 *   const { onSessionStart, onTurnEnd, onSessionShutdown } = buildIngestPipeline(store, config);
 *   pi.on("session_start", onSessionStart);
 *   pi.on("turn_end",     onTurnEnd);
 *   pi.on("session_shutdown", onSessionShutdown);
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
    turnCount: 0,
  };

  return {
    async onSessionStart(_event, _ctx) {
      if (!enabled) return;
      const store = getStore();
      if (!store) return;
      state.store = store;
      state.turnCount = 0;
      if (state.sessionTag) {
        store.add({
          target: "memory",
          category: "insight",
          title: `[session] ${state.sessionTag}`,
          content: `Session started at ${new Date().toISOString()}.`,
        });
      }
    },

    async onTurnEnd(event, _ctx) {
      if (!enabled) return;
      const store = state.store ?? getStore();
      if (!store) return;
      state.store = store;
      state.turnCount++;

      const msg = event.message as { role?: string; content?: unknown };
      // Only classify assistant messages
      if (msg.role !== "assistant") return;

      const text = extractText(msg);
      if (text.length < minContentLength) return;

      const classification = classifyMessage(text, event.toolResults as Array<{ isError?: boolean }>);
      if (!classification) return;

      const titlePrefix = state.sessionTag ? `[${state.sessionTag}] ` : "";

      const input: AddMemoryInput = {
        target: defaultTarget,
        category: classification.category as AddMemoryInput["category"],
        title: titlePrefix + classification.title,
        content: text,
      };

      const result = store.add(input);
      if (result.ok) {
        // Fire-and-forget: don't await the write on the hot path
        void state.turnCount; // suppress unused-warning; state is live
      }
    },

    async onSessionShutdown(_event, _ctx) {
      if (!state.store) return;
      try {
        state.store.close();
      } catch {
        // best-effort checkpoint
      }
      state.store = null;
    },
  };
}

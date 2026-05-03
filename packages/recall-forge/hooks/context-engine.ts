// RecallForge — contextEngine slot implementation
// OpenClaw calls buildContext() on demand (not just at session start).
// This fills plugins.slots.contextEngine, the slot LinkMind currently occupies.
// Reuses the tieredSearch + prompt-safety machinery from recall.ts.

import type { ContextEngineProvider, OpenClawSession } from "../plugin-sdk-stub.js";
import type { LanonasisClient } from "../client.js";
import type { LanonasisConfig } from "../config.js";
import { tieredSearch } from "./recall.js";
import {
  looksLikePromptInjection,
  formatRecalledMemories,
} from "../enrichment/prompt-safety.js";

export function createContextEngine(
  client: LanonasisClient,
  cfg: LanonasisConfig,
): ContextEngineProvider {
  return {
    id: "recall-forge",
    // Priority 10 — runs before lower-priority engines, yields to explicit user context
    priority: 10,

    async buildContext(session: OpenClawSession): Promise<string> {
      try {
        const raw = (session.currentInput ?? session.query ?? "").trim();
        if (!raw || raw.length < 5) return "";

        // Normalise query: strip punctuation-only lines, cap at 200 chars
        const query =
          raw
            .split("\n")
            .filter((l) => /\w/.test(l))
            .join(" ")
            .slice(0, 200)
            .trim() || raw.slice(0, 200);

        // 5s timeout — never block the agent
        const memories = await Promise.race([
          tieredSearch(client, cfg, query),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error("recall-forge context timeout")),
              5000,
            ),
          ),
        ]);

        if (!memories || memories.length === 0) return "";

        // Filter prompt injection attempts before injecting into context window
        const filtered = memories.filter(
          (m) => !looksLikePromptInjection(m.content),
        );
        if (filtered.length === 0) return "";

        const entries = filtered.map((m) => ({
          title: m.title,
          type: m.type,
          content: m.content,
          similarity: m.similarity,
          id: m.id,
          tags: m.tags,
        }));

        return formatRecalledMemories(entries, {
          recallStrategy: "semantic",
          maxChars: cfg.maxRecallChars,
        });
      } catch {
        // Never throw — a failed context engine must not break the agent session
        return "";
      }
    },
  };
}

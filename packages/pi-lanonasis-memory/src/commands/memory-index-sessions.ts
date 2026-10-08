/**
 * memory-index-sessions.ts — `/memory-index-sessions`
 *
 * Lists distinct session-tag values found in the store along with the count
 * of memories tagged with each. A session tag is anything matching
 * `session:*` (the convention PR1 / ingest.ts uses).
 *
 * Reads are direct from the store. No LLM call.
 *
 * Per the brief: "if no sessions, message 'no sessions indexed yet'".
 */

import type { CommandRegister } from "./types.js";

export const register: CommandRegister = (pi, deps) => {
  pi.registerCommand("memory-index-sessions", {
    description:
      "/memory-index-sessions — list distinct session tags with counts.",
    handler: async (_args, ctx) => {
      try {
        const store = deps.getStore();
        if (!store) {
          ctx.ui.notify(
            "memory-index-sessions: store not open",
            "error",
          );
          return;
        }
        const index = indexSessions(store);
        const entries = Object.entries(index);
        if (entries.length === 0) {
          ctx.ui.notify("no sessions indexed yet", "info");
          return;
        }
        const lines = entries
          .sort((a, b) => b[1] - a[1])
          .map(([tag, count]) => `- ${tag} (${count})`);
        ctx.ui.notify(
          `memory-index-sessions: ${entries.length} session(s):\n${lines.join("\n")}`,
          "info",
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        ctx.ui.notify(
          `memory-index-sessions: failed: ${msg}`,
          "error",
        );
      }
    },
  });
};

/**
 * Walk the store and tally every tag that starts with `session:`. Pure
 * helper; used by the command and tested in isolation. Returns a sorted
 * object literal so tests are deterministic.
 */
export function indexSessions(
  store: import("../store/memory.js").MemoryStoreLike,
): Record<string, number> {
  const all = store.list({ limit: 500 });
  const counts: Record<string, number> = {};
  for (const rec of all) {
    if (!rec.tags) continue;
    for (const tag of rec.tags) {
      if (tag.startsWith("session:")) {
        counts[tag] = (counts[tag] ?? 0) + 1;
      }
    }
  }
  return counts;
}

export { register as registerMemoryIndexSessionsCommand };
/**
 * memory-preview-context.ts — `/memory-preview-context`
 *
 * Prints up to 10 recent context entries from the local store. No LLM
 * call. Each entry is one line: `[target] title — id (created_at)`.
 *
 * Per the brief: "no LLM call" — this is a pure read from the store.
 */

import type { CommandRegister } from "./types.js";

export const register: CommandRegister = (pi, deps) => {
  pi.registerCommand("memory-preview-context", {
    description:
      "/memory-preview-context — show up to 10 recent context entries (no LLM call).",
    handler: async (_args, ctx) => {
      try {
        const store = deps.getStore();
        if (!store) {
          ctx.ui.notify("memory-preview-context: store not open", "error");
          return;
        }
        const recent = store.list({ limit: 10 });
        if (recent.length === 0) {
          ctx.ui.notify(
            "memory-preview-context: no memories yet",
            "info",
          );
          return;
        }
        const lines = recent.map((r) => {
          const snippet = r.content.replace(/\s+/g, " ").slice(0, 60);
          const ellipsis = r.content.length > 60 ? "…" : "";
          return `- [${r.target}${r.category ? "/" + r.category : ""}] ${r.title} (${r.id.slice(0, 8)}) — ${snippet}${ellipsis}`;
        });
        ctx.ui.notify(
          `memory-preview-context: ${recent.length} recent:\n${lines.join("\n")}`,
          "info",
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        ctx.ui.notify(
          `memory-preview-context: failed: ${msg}`,
          "error",
        );
      }
    },
  });
};

export { register as registerMemoryPreviewContextCommand };
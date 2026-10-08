/**
 * memory-save.ts — `/memory save <text>` (also exposed via `/memory-save` alias)
 *
 * Wraps the `memory_add` tool with `origin: 'explicit'`, default target
 * `memory`. Same scanner gate; on block, the user is notified and nothing
 * is written.
 *
 * Implementation: registered under two names so both `/memory save <text>`
 * (via the multi-subcommand `/memory` parser in memory-search.ts) and the
 * `/memory-save` standalone form work — the brief specifies the former but
 * we expose the latter for convenience when the user wants to bind it.
 */

import type { CommandDeps, CommandRegister } from "./types.js";
import { addMemory } from "../tools/memory_add.js";

export const register: CommandRegister = (pi, deps) => {
  // `/memory save <text>` — only fires when args starts with "save".
  pi.registerCommand("memory-save", {
    description: "/memory-save <text> — short alias; use '/memory save <text>' inside /memory.",
    handler: async (args, ctx) => {
      await runSave(args, ctx, deps);
    },
  });
};

/** Pure helper used by the standalone alias and (post-merge) by /memory's `save` subcommand. */
export async function runSave(
  args: string,
  ctx: { ui: { notify: (msg: string, level?: "info" | "warning" | "error") => void } },
  deps: CommandDeps,
): Promise<void> {
  try {
    const text = args.trim();
    if (text.length === 0) {
      ctx.ui.notify("memory-save: requires text", "error");
      return;
    }
    const { details, written } = addMemory(
      deps.getStore(),
      { target: "memory", content: text },
      deps.getSync(),
    );
    if (!written || details.scannerDecision === "block") {
      ctx.ui.notify(
        `memory-save: blocked by scanner (${details.reason ?? "unknown"})`,
        "error",
      );
      return;
    }
    ctx.ui.notify(`memory-save: saved memory ${details.id}`, "info");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    ctx.ui.notify(`memory-save: failed: ${msg}`, "error");
  }
}

export { register as registerMemorySaveCommand };
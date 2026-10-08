/**
 * reflect.ts — `/reflect`
 *
 * Opens a small TUI prompt (or a readline fallback when TUI is unavailable)
 * for the user to type a structured reflection. Saves the result with
 * `category` inferred from a small heuristic (preference/correction/insight),
 * target = 'memory', and tags `origin:explicit`.
 *
 * After save, prints the saved id. On scanner block the user is told and
 * nothing is written.
 */

import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import type { CommandRegister } from "./types.js";
import { addMemory } from "../tools/memory_add.js";
import { categorizeReflection } from "./reflect-categorize.js";

export const register: CommandRegister = (pi, deps) => {
  pi.registerCommand("reflect", {
    description:
      "/reflect — open a structured reflection prompt; auto-categorized and saved to memory.",
    handler: async (_args, ctx) => {
      try {
        const reflection = await promptReflection(ctx);
        if (reflection.length === 0) {
          ctx.ui.notify("reflect: empty reflection; nothing saved", "info");
          return;
        }
        const category = categorizeReflection(reflection);
        const { details, written } = addMemory(
          deps.getStore(),
          { target: "memory", content: reflection, category },
          deps.getSync(),
        );
        if (!written || details.scannerDecision === "block") {
          ctx.ui.notify(
            `reflect: blocked by scanner (${details.reason ?? "unknown"})`,
            "error",
          );
          return;
        }
        ctx.ui.notify(
          `reflect: saved [${category}] memory ${details.id}`,
          "info",
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        ctx.ui.notify(`reflect: failed: ${msg}`, "error");
      }
    },
  });
};

/**
 * Prompt the user. TUI path uses ctx.ui.input (returns the user's text or
 * undefined when cancelled). Non-TUI / test path falls back to readline
 * so the command is usable in any environment.
 */
async function promptReflection(ctx: {
  ui?: { input?: (title: string, placeholder?: string) => Promise<string | undefined> };
  cwd?: string;
  mode?: string;
}): Promise<string> {
  // Prefer TUI when available. ctx.ui.input is the Pi dialog API.
  if (ctx.ui?.input) {
    const answer = await ctx.ui.input(
      "Reflect",
      "what did you learn?",
    );
    return (answer ?? "").trim();
  }
  // Fallback: readline. Available in interactive shells; throws in non-TTY.
  try {
    if (!input.isTTY) return "";
    const rl = createInterface({ input, output });
    try {
      const answer = await rl.question("reflect> ");
      return answer.trim();
    } finally {
      rl.close();
    }
  } catch {
    // Non-interactive: degrade gracefully per the brief ("degrades to a
    // single-line message if no TTY").
    return "";
  }
}

export { register as registerReflectCommand };
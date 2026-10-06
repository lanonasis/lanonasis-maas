/**
 * memory-skills.ts — `/memory-skills [list]`
 *
 * Calls `skills.list()` (PR2) via dynamic import. When PR2 is not merged
 * yet (this is the stand-alone build), the adapter returns `[]` and we
 * tell the user. When PR2 is merged, the listing is pretty-printed with
 * the skill slug, source (global | project), and description.
 *
 * Always pretty. Never throws.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

import type { CommandDeps, CommandRegister } from "./types.js";

interface SkillEntry {
  slug: string;
  scope: "global" | "project";
  path: string;
  description: string;
}

interface SkillsModule {
  list?: () => SkillEntry[];
}

export const register: CommandRegister = (pi, deps) => {
  pi.registerCommand("memory-skills", {
    description: "/memory-skills [list] — list installed memory skills (PR2).",
    handler: async (args, ctx) => {
      try {
        const subcommand = args.trim().split(/\s+/, 1)[0] ?? "list";
        if (subcommand !== "list" && subcommand !== "") {
          ctx.ui.notify(
            `memory-skills: unknown subcommand '${subcommand}'; only 'list' is supported`,
            "error",
          );
          return;
        }

        const skills = await loadSkills();
        if (skills.length === 0) {
          ctx.ui.notify(
            "memory-skills: no skills installed (PR2 not merged yet or empty)",
            "info",
          );
          return;
        }
        const lines = skills.map(
          (s) =>
            `- ${s.slug} [${s.scope}] — ${s.description || "(no description)"} (${s.path})`,
        );
        ctx.ui.notify(
          `memory-skills: ${skills.length} skill(s):\n${lines.join("\n")}`,
          "info",
        );
        void deps; // parameter reserved for future per-project skills (PR2)
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        ctx.ui.notify(`memory-skills: failed: ${msg}`, "error");
      }
    },
  });
};

/**
 * Try to import `src/store/skills.ts` (PR2) and call `.list()`. Returns
 * `[]` when the module is missing — same shape as the no-op case. Pure
 * helper; never throws.
 */
export async function loadSkills(): Promise<SkillEntry[]> {
  try {
    const mod = (await import("../store/skills.js")) as SkillsModule;
    if (typeof mod.list === "function") {
      return mod.list();
    }
    return [];
  } catch {
    return [];
  }
}

export { register as registerMemorySkillsCommand };
/**
 * commands/index.ts — barrel export for the seven slash commands.
 *
 * Seven commands, each in its own file so the test suite can exercise the
 * pure helpers without spinning up an ExtensionAPI:
 *   /memory              — search|save subcommands
 *   /reflect             — TUI / readline structured reflection
 *   /memory-save         — standalone save (alias of /memory save)
 *   /memory-skills       — list installed skills (PR2)
 *   /memory-pin          — toggle 'pinned' tag by id or top-hit
 *   /memory-preview-context — recent 10 entries
 *   /memory-interview    — first-run 3-question interview
 *   /memory-index-sessions — distinct session tag counts
 *
 * PR4 ships these commands plus the four `memory_*` tools (see tools/).
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import type { CommandDeps, CommandRegister } from "./types.js";

import { register as _registerMemorySearch, parseSearchArgs } from "./memory-search.js";
import { register as _registerReflect } from "./reflect.js";
import { register as _registerMemorySave, runSave } from "./memory-save.js";
import { register as _registerMemorySkills, loadSkills } from "./memory-skills.js";
import { register as _registerMemoryPin, resolveId } from "./memory-pin.js";
import { register as _registerMemoryPreviewContext } from "./memory-preview-context.js";
import { register as _registerMemoryInterview } from "./memory-interview.js";
import { register as _registerMemoryIndexSessions, indexSessions } from "./memory-index-sessions.js";
import { register as _registerMemorySync } from "./memory-sync.js";

export { parseSearchArgs } from "./memory-search.js";
export { runSave } from "./memory-save.js";
export { loadSkills } from "./memory-skills.js";
export { resolveId } from "./memory-pin.js";
export { indexSessions } from "./memory-index-sessions.js";
export { categorizeReflection, type ReflectionCategory } from "./reflect-categorize.js";
export type { CommandDeps, CommandRegister, CommandArgs } from "./types.js";

/** Per-command register wrappers — kept as named exports for testability. */
export const registerMemorySearch: CommandRegister = _registerMemorySearch;
export const registerReflect: CommandRegister = _registerReflect;
export const registerMemorySave: CommandRegister = _registerMemorySave;
export const registerMemorySkills: CommandRegister = _registerMemorySkills;
export const registerMemoryPin: CommandRegister = _registerMemoryPin;
export const registerMemoryPreviewContext: CommandRegister = _registerMemoryPreviewContext;
export const registerMemoryInterview: CommandRegister = _registerMemoryInterview;
export const registerMemoryIndexSessions: CommandRegister = _registerMemoryIndexSessions;
export const registerMemorySync: CommandRegister = _registerMemorySync;

/**
 * Register every PR4 command against a single ExtensionAPI. Used by the
 * extension factory and by the integration test.
 */
export function registerAllCommands(
  pi: ExtensionAPI,
  deps: CommandDeps,
): void {
  registerMemorySearch(pi, deps);
  registerMemorySave(pi, deps);
  registerReflect(pi, deps);
  registerMemorySkills(pi, deps);
  registerMemoryPin(pi, deps);
  registerMemoryPreviewContext(pi, deps);
  registerMemoryInterview(pi, deps);
  registerMemoryIndexSessions(pi, deps);
  registerMemorySync(pi, deps);
}
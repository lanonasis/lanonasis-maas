/**
 * user.ts — target-routing helper for USER.md.
 *
 * USER.md is a thin mirror of `target: "user"` records. The contract
 * for PR2 calls for thin helpers for USER.md routing; mirror.ts owns
 * the actual file operations, so this module is the small read/write
 * facade a slash command or hook can call without knowing the path
 * layout. The mirror already routes `target: "user"` to USER.md; the
 * helpers here exist so a non-mirror caller (e.g. `/identity show`)
 * can do the same.
 *
 * Inject `paths` to avoid touching the real `~/.pi` in tests.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { atomicWrite, parseMemoryFile, renderMemoryFile, type MarkdownEntry } from "./markdown.js";
import { USER_FILE, type StoragePaths } from "./paths.js";

export interface UserFileHandle {
  path: string;
}

export function userFilePath(paths: StoragePaths): string {
  return join(paths.globalRoot, USER_FILE);
}

/** Read USER.md entries. Returns [] when the file is absent. */
export function readUserFile(paths: StoragePaths): MarkdownEntry[] {
  const path = userFilePath(paths);
  if (!existsSync(path)) return [];
  return parseMemoryFile(readFileSync(path, "utf8"));
}

/** Write USER.md atomically. Caller owns the entries. */
export function writeUserFile(paths: StoragePaths, entries: readonly MarkdownEntry[]): void {
  atomicWrite(userFilePath(paths), renderMemoryFile("user", entries));
}

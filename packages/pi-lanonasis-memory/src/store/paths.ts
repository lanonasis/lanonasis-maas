/**
 * paths.ts — storage layout for the local-first memory store.
 *
 * The contract (review Appendix C.4) pins every path here so parallel
 * PRs (tools, sync, ingest) compose without re-deriving locations.
 *
 *   ~/.pi/agent/lanonasis-pi-memory/        — globalRoot
 *   ├── memories.db                         — SQLite FTS5 store
 *   ├── sync.db                             — MaaS sync queue (PR5)
 *   ├── MEMORY.md                           — facts mirror
 *   ├── USER.md                             — identity mirror
 *   ├── STANDING.md                         — always-on rules
 *   └── skills/<slug>/SKILL.md              — Pi-native skills (global)
 *
 *   ~/.pi/agent/projects-memory/<slug>/     — per-project scope
 *   ├── MEMORY.md                           — project facts mirror
 *   └── skills/<slug>/SKILL.md              — project skills (override global)
 *
 * The home directory is injectable for tests; production code should
 * rely on the default (`homedir()`).
 */

import { homedir } from "node:os";
import { join } from "node:path";

export const GLOBAL_ROOT_BASENAME = ".pi/agent/lanonasis-pi-memory";
export const PROJECTS_ROOT_BASENAME = ".pi/agent/projects-memory";

export const MEMORY_FILE = "MEMORY.md";
export const USER_FILE = "USER.md";
export const STANDING_FILE = "STANDING.md";
export const SKILLS_DIR = "skills";

export interface StoragePaths {
  globalRoot: string;
  dbPath: string;
  syncDbPath: string;
  projectsRoot: string;
}

/**
 * Compute the storage paths. Pure function — never touches the
 * filesystem. The parent directories of `globalRoot` and
 * `projectsRoot` are not auto-created here; callers (the store
 * bootstrap, mirror writes) own that with `ensureDir`.
 */
export function storagePaths(home: string = homedir()): StoragePaths {
  const globalRoot = join(home, GLOBAL_ROOT_BASENAME);
  return {
    globalRoot,
    dbPath: join(globalRoot, "memories.db"),
    syncDbPath: join(globalRoot, "sync.db"),
    projectsRoot: join(home, PROJECTS_ROOT_BASENAME),
  };
}

/**
 * Resolve a project's storage root. The slug is trusted to be a
 * `[a-z0-9-]+` already (see `slugify`); we still guard against
 * directory traversal in case a future caller passes raw input.
 */
export function projectRoot(paths: StoragePaths, slug: string): string {
  if (typeof slug !== "string" || slug.length === 0) {
    throw new Error("projectRoot: slug is required");
  }
  if (!/^[a-z0-9-]+$/.test(slug)) {
    throw new Error(`projectRoot: invalid slug ${JSON.stringify(slug)}`);
  }
  return join(paths.projectsRoot, slug);
}

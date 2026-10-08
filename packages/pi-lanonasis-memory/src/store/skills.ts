/**
 * skills.ts — read-only listing of Pi-native skills.
 *
 * Skills are stored as `skills/<slug>/SKILL.md` with YAML frontmatter
 * carrying `name` and `description`. We look first in the project's
 * skills dir, then in the global one; on a slug clash the project
 * entry wins. We never write or modify skills in v1 (skill_manage
 * is upstream's tool — see review Appendix C.4).
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { SKILLS_DIR } from "./paths.js";
import { debugLog } from "../debug.js";

export interface SkillEntry {
  slug: string;
  scope: "global" | "project";
  path: string;
  description: string;
}

export interface SkillsStoreOptions {
  globalRoot: string;
  projectRoot?: string;
}

export class SkillsStore {
  private readonly globalRoot: string;
  private readonly projectRoot: string | undefined;

  constructor(options: SkillsStoreOptions) {
    this.globalRoot = options.globalRoot;
    this.projectRoot = options.projectRoot;
  }

  list(): SkillEntry[] {
    const bySlug = new Map<string, SkillEntry>();
    // Project overrides global: collect global first, then overwrite.
    for (const e of this.scan(this.globalRoot, "global")) bySlug.set(e.slug, e);
    if (this.projectRoot) {
      for (const e of this.scan(this.projectRoot, "project")) bySlug.set(e.slug, e);
    }
    return [...bySlug.values()].sort((a, b) => a.slug.localeCompare(b.slug));
  }

  view(slug: string): string | null {
    const entry = this.list().find((e) => e.slug === slug);
    if (!entry) return null;
    return readFileSync(entry.path, "utf8");
  }

  private scan(root: string, scope: "global" | "project"): SkillEntry[] {
    const dir = join(root, SKILLS_DIR);
    if (!existsSync(dir)) return [];
    let entries: import("node:fs").Dirent[];
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch (err) {
      // Unreadable skills dir lists as empty.
      debugLog("store.skills.readdir", err);
      return [];
    }
    const out: SkillEntry[] = [];
    for (const dirent of entries) {
      if (!dirent.isDirectory() && !dirent.isSymbolicLink()) continue;
      const skillPath = join(dir, dirent.name, "SKILL.md");
      if (!existsSync(skillPath)) continue;
      let stat;
      try {
        stat = statSync(skillPath);
      } catch (err) {
        // Dangling symlink or race with deletion: skip this entry.
        debugLog("store.skills.stat", err);
        continue;
      }
      if (!stat.isFile()) continue;
      const parsed = parseFrontmatter(readFileSync(skillPath, "utf8"));
      if (!parsed) continue;
      out.push({
        slug: dirent.name,
        scope,
        path: skillPath,
        description: parsed.description,
      });
    }
    return out;
  }
}

interface Frontmatter {
  name: string;
  description: string;
}

/**
 * Minimal YAML frontmatter parser — enough for `name` and
 * `description` scalar fields. We deliberately avoid pulling in a
 * full YAML library for two key/value strings. The format we accept:
 *
 *   ---
 *   name: <value>
 *   description: <value>
 *   ---
 *
 * Values are trimmed; double-quoted strings have their quotes
 * stripped. Anything more exotic (lists, multiline, flow style) is
 * rejected, and the skill is omitted from `list()`.
 */
export function parseFrontmatter(text: string): Frontmatter | null {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!match) return null;
  const body = match[1] ?? "";
  const fields: Record<string, string> = {};
  for (const raw of body.split(/\r?\n/)) {
    const line = raw.trimEnd();
    if (line.length === 0 || line.startsWith("#")) continue;
    const m = /^([A-Za-z_][A-Za-z0-9_-]*):\s*(.*)$/.exec(line);
    if (!m) continue;
    const key = m[1] ?? "";
    let value = (m[2] ?? "").trim();
    if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) {
      value = value.slice(1, -1);
    } else if (value.startsWith("'") && value.endsWith("'") && value.length >= 2) {
      value = value.slice(1, -1);
    }
    fields[key] = value;
  }
  const name = fields.name;
  const description = fields.description;
  if (typeof name !== "string" || name.length === 0) return null;
  if (typeof description !== "string" || description.length === 0) return null;
  return { name, description };
}

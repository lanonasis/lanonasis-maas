/**
 * markdown.ts — render and parse the three-file mirror.
 *
 * File shape (per memory):
 *
 *   # <Scope> Memory
 *
 *   ## <TITLE>
 *   <!-- id:<id> -->
 *   category: <category|null>
 *   tags: tag1, tag2
 *   updated: <ISO 8601>
 *
 *   <content as-is, with a trailing newline>
 *
 *   ## <NEXT TITLE>
 *   ...
 *
 * The `<!-- id:<id> -->` marker is the stable handle used by mirror
 * remove/rebuild. Parse is tolerant: unknown metadata lines are
 * ignored, and sections missing the id marker are dropped (they are
 * not safe to round-trip).
 *
 * `atomicWrite(path, text)` writes to a temp file in the same
 * directory and renames over the target. This is the only safe way
 * to update a file readers may have open. `ensureDir(path)` is a
 * mkdir -p wrapper.
 */

import { mkdirSync, renameSync, writeFileSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import { randomBytes } from "node:crypto";

export type MemoryScope = "global" | "project" | "user";

export interface MarkdownEntry {
  id: string;
  title: string;
  content: string;
  category: string | null;
  tags: string[] | null;
  /** ISO 8601 timestamp. */
  updated_at: string;
}

const SCOPE_HEADINGS: Record<MemoryScope, string> = {
  global: "Global Memory",
  project: "Project Memory",
  user: "User Memory",
};

/** Render a memory file from entries. Returns the full markdown text. */
export function renderMemoryFile(scope: MemoryScope, entries: readonly MarkdownEntry[]): string {
  const header = `# ${SCOPE_HEADINGS[scope]}\n\n`;
  if (entries.length === 0) return header;
  const body = entries.map(renderEntry).join("\n");
  return `${header}${body}\n`;
}

function renderEntry(entry: MarkdownEntry): string {
  const meta: string[] = [];
  if (entry.category) meta.push(`category: ${entry.category}`);
  if (entry.tags && entry.tags.length > 0) meta.push(`tags: ${entry.tags.join(", ")}`);
  meta.push(`updated: ${entry.updated_at}`);

  const titleLine = `## ${entry.title}`;
  const idLine = `<!-- id:${entry.id} -->`;
  const metaBlock = meta.join("\n");
  const content = entry.content.endsWith("\n") ? entry.content : `${entry.content}\n`;
  return `${titleLine}\n${idLine}\n${metaBlock}\n\n${content}`;
}

/**
 * Parse a memory file. Tolerant:
 *   - the leading `# <Scope> Memory` line is optional (we ignore the
 *     exact scope on read; it determines where we write, not read);
 *   - unknown metadata lines are dropped;
 *   - sections missing the `<!-- id:… -->` marker are skipped (we
 *     cannot safely round-trip them);
 *   - HTML comments inside fenced code blocks are ignored.
 */
export function parseMemoryFile(text: string): MarkdownEntry[] {
  const lines = text.split(/\r?\n/);
  const entries: MarkdownEntry[] = [];
  let i = 0;

  // Optional scope line.
  if (lines[0] && /^#\s/.test(lines[0])) i = 1;

  let inFence = false;
  while (i < lines.length) {
    // Skip blank lines between entries.
    while (i < lines.length && (lines[i] ?? "").trim() === "") i += 1;
    if (i >= lines.length) break;

    const heading = /^##\s+(.+?)\s*$/.exec(lines[i] ?? "");
    if (!heading) {
      // Not a section header — skip line and keep scanning. (Tolerant of
      // stray prose before the first section.)
      i += 1;
      continue;
    }
    const title = heading[1] ?? "";
    i += 1;

    // Collect metadata + id until blank line.
    let id: string | null = null;
    let category: string | null = null;
    let tags: string[] | null = null;
    let updated_at: string | null = null;

    while (i < lines.length && (lines[i] ?? "").trim() !== "") {
      const line = lines[i] ?? "";
      if (line.trimStart().startsWith("```")) {
        inFence = !inFence;
        i += 1;
        continue;
      }
      if (inFence) {
        i += 1;
        continue;
      }
      const idMatch = /^<!--\s*id:([^\s>]+)\s*-->/.exec(line);
      if (idMatch) {
        id = idMatch[1] ?? null;
        i += 1;
        continue;
      }
      const cat = /^category:\s*(.*)$/.exec(line);
      if (cat) {
        const v = (cat[1] ?? "").trim();
        category = v === "" || v.toLowerCase() === "null" ? null : v;
        i += 1;
        continue;
      }
      const tg = /^tags:\s*(.*)$/.exec(line);
      if (tg) {
        const v = (tg[1] ?? "").trim();
        tags = v === "" ? [] : v.split(",").map((s) => s.trim()).filter((s) => s.length > 0);
        i += 1;
        continue;
      }
      const up = /^updated:\s*(.*)$/.exec(line);
      if (up) {
        updated_at = (up[1] ?? "").trim();
        i += 1;
        continue;
      }
      // Unknown metadata line — ignore.
      i += 1;
    }

    if (id === null) {
      // Skip the body of this section too.
      while (i < lines.length && (lines[i] ?? "").trim() !== "") i += 1;
      continue;
    }

    // Consume the blank line(s) before the body.
    while (i < lines.length && (lines[i] ?? "").trim() === "") i += 1;

    // Body: from here until the next `## ` or end of file.
    const bodyLines: string[] = [];
    while (i < lines.length) {
      const line = lines[i] ?? "";
      if (/^##\s+/.test(line)) break;
      if (/^<!--\s*id:/.test(line)) break; // tolerate run-on sections
      bodyLines.push(line);
      i += 1;
    }
    // Strip exactly one trailing newline pair, not user content.
    const content = stripTrailingBlankLines(bodyLines.join("\n"));

    entries.push({
      id,
      title,
      content,
      category,
      tags: tags && tags.length > 0 ? tags : null,
      updated_at: updated_at ?? new Date(0).toISOString(),
    });
  }

  return entries;
}

function stripTrailingBlankLines(text: string): string {
  return text.replace(/\n+$/g, "");
}

/** mkdir -p. */
export function ensureDir(path: string): void {
  if (!existsSync(path)) mkdirSync(path, { recursive: true });
}

/**
 * Atomic file write. Writes to `<path>.<random>.tmp` in the same
 * directory, then renames over `<path>`. The temp file is removed on
 * rename success; on rename failure the temp file is left for the
 * OS to clean up (we still try to unlink it, best-effort).
 */
export function atomicWrite(path: string, text: string): void {
  ensureDir(dirname(path));
  const tmp = `${path}.${randomBytes(8).toString("hex")}.tmp`;
  writeFileSync(tmp, text, "utf8");
  try {
    renameSync(tmp, path);
  } catch (err) {
    try {
      // Best-effort cleanup; never mask the real error.
      const { unlinkSync } = require("node:fs") as typeof import("node:fs");
      unlinkSync(tmp);
    } catch {
      // ignore
    }
    throw err;
  }
}

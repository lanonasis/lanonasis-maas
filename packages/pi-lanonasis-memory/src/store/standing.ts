/**
 * standing.ts — STANDING.md store.
 *
 * Standing instructions are user-authored rules that must always be
 * in effect (e.g. "never force-push to main"). They live in a small
 * file in the global root, separate from MEMORY.md, with strict caps:
 *   - 20 entries max
 *   - 2,000 chars total
 *   - every add passes through scanForWrite in block mode (default)
 *
 * Bullet format: each non-empty line starting with `- ` is one entry.
 * Other lines (headers, blanks) are preserved as-is so the file
 * stays human-editable. The contract is `add(text)` where `text` is
 * a single bullet's body (no leading `- `); we render it.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { scanForWrite } from "../scanner/scanner.js";
import { ensureDir, atomicWrite } from "./markdown.js";
import { STANDING_FILE } from "./paths.js";

export const MAX_ENTRIES = 20;
export const MAX_CHARS = 2000;

export type StandingAddResult = { ok: true } | { ok: false; error: string };

export class StandingStore {
  private readonly path: string;

  constructor(globalRoot: string) {
    this.path = join(globalRoot, STANDING_FILE);
  }

  list(): string[] {
    if (!existsSync(this.path)) return [];
    const text = readFileSync(this.path, "utf8");
    const out: string[] = [];
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trimEnd();
      if (line.startsWith("- ")) out.push(line.slice(2).trim());
    }
    return out;
  }

  add(text: string): StandingAddResult {
    const trimmed = text.replace(/\s+$/g, "").trim();
    if (trimmed.length === 0) {
      return { ok: false, error: "standing rule cannot be empty" };
    }
    const verdict = scanForWrite(trimmed, "block");
    if (verdict.decision === "block") {
      return { ok: false, error: verdict.reason };
    }
    const entries = this.list();
    if (entries.length >= MAX_ENTRIES) {
      return { ok: false, error: `standing rules capped at ${MAX_ENTRIES} entries` };
    }
    const projected = entries.concat(trimmed).join("\n");
    if (projected.length > MAX_CHARS) {
      return {
        ok: false,
        error: `standing rules capped at ${MAX_CHARS} chars (adding would total ${projected.length})`,
      };
    }
    const next = this.composeFile(entries.concat(trimmed));
    ensureDir(dirOf(this.path));
    atomicWrite(this.path, next);
    return { ok: true };
  }

  remove(index: number): boolean {
    const entries = this.list();
    if (index < 0 || index >= entries.length) return false;
    const next = entries.filter((_, i) => i !== index);
    if (next.length === 0) {
      // Drop the file entirely so an empty list maps to "no file".
      const { unlinkSync } = require("node:fs") as typeof import("node:fs");
      try {
        unlinkSync(this.path);
      } catch {
        // ignore — best effort
      }
      return true;
    }
    ensureDir(dirOf(this.path));
    atomicWrite(this.path, this.composeFile(next));
    return true;
  }

  private composeFile(entries: readonly string[]): string {
    return entries.map((e) => `- ${e}`).join("\n") + "\n";
  }
}

function dirOf(p: string): string {
  const idx = p.lastIndexOf("/");
  return idx === -1 ? "." : p.slice(0, idx);
}

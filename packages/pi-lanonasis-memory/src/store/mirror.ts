/**
 * mirror.ts — Markdown mirror on top of MemoryStore.
 *
 * `MarkdownMirror` is a single-target file writer/reader keyed by the
 * record's id marker. Target routing (per Appendix C.4):
 *
 *   user     → <globalRoot>/USER.md
 *   memory   → <globalRoot>/MEMORY.md
 *   failure  → <globalRoot>/MEMORY.md
 *   project  → <projectRoot>/MEMORY.md (if projectRoot is set),
 *              else <globalRoot>/MEMORY.md
 *
 * `MirroredStore` wraps a `MemoryStore` and keeps SQLite and the
 * markdown mirror in sync. The SQLite write is authoritative and runs
 * first; on a markdown failure the SQLite row is preserved and the
 * error is reported via `result.mirrorError`. This is the contract
 * from the mission brief — never let a markdown hiccup lose a
 * scanner-passed memory.
 *
 * The mirror never receives the raw caller input. The store's
 * `add`/`replace` are scanner-gated, and we read the post-scan record
 * back via `store.get` so the markdown always reflects what landed
 * in SQLite (redactions included).
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { ensureDir, atomicWrite, parseMemoryFile, renderMemoryFile, type MarkdownEntry } from "./markdown.js";
import {
  MemoryStore,
  type AddMemoryInput,
  type AddResult,
  type ListOptions,
  type MemoryHit,
  type MemoryRecord,
  type SearchOptions,
} from "./memory.js";
import { MEMORY_FILE, USER_FILE } from "./paths.js";

export interface MarkdownMirrorOptions {
  globalRoot: string;
  /** When set, target=project records route here instead of globalRoot. */
  projectRoot?: string;
}

type FileKind = "memory" | "user";

interface FileSpec {
  path: string;
  kind: FileKind;
  scope: "global" | "project";
}

export class MarkdownMirror {
  private readonly globalRoot: string;
  private readonly projectRoot: string | undefined;

  constructor(options: MarkdownMirrorOptions) {
    this.globalRoot = options.globalRoot;
    this.projectRoot = options.projectRoot;
  }

  /** Add or replace the section for `record.id` in the file it routes to. */
  write(record: MemoryRecord): void {
    const spec = this.fileSpecFor(record);
    const entries = this.readFile(spec);
    const filtered = entries.filter((e) => e.id !== record.id);
    filtered.push(recordToEntry(record));
    filtered.sort((a, b) => a.title.localeCompare(b.title));
    this.writeFile(spec, filtered);
  }

  /** Remove the section for `id` from whichever file it lives in. */
  remove(id: string): void {
    for (const spec of this.allFiles()) {
      const entries = this.readFile(spec);
      const next = entries.filter((e) => e.id !== id);
      if (next.length !== entries.length) {
        this.writeFile(spec, next);
      }
    }
  }

  /** Rewrite the file from the supplied records (idempotent replace). */
  rebuild(records: readonly MemoryRecord[]): void {
    // Group by file spec, then write each.
    const buckets = new Map<string, { spec: FileSpec; entries: MarkdownEntry[] }>();
    for (const spec of this.allFiles()) buckets.set(spec.path, { spec, entries: [] });
    for (const record of records) {
      const spec = this.fileSpecFor(record);
      let bucket = buckets.get(spec.path);
      if (!bucket) {
        bucket = { spec, entries: [] };
        buckets.set(spec.path, bucket);
      }
      bucket.entries.push(recordToEntry(record));
    }
    for (const { spec, entries } of buckets.values()) {
      entries.sort((a, b) => a.title.localeCompare(b.title));
      this.writeFile(spec, entries);
    }
  }

  private fileSpecFor(record: MemoryRecord): FileSpec {
    if (record.target === "user") {
      return { path: join(this.globalRoot, USER_FILE), kind: "user", scope: "global" };
    }
    if (record.target === "project" && this.projectRoot) {
      return {
        path: join(this.projectRoot, MEMORY_FILE),
        kind: "memory",
        scope: "project",
      };
    }
    return {
      path: join(this.globalRoot, MEMORY_FILE),
      kind: "memory",
      scope: "global",
    };
  }

  private allFiles(): FileSpec[] {
    const files: FileSpec[] = [
      { path: join(this.globalRoot, MEMORY_FILE), kind: "memory", scope: "global" },
      { path: join(this.globalRoot, USER_FILE), kind: "user", scope: "global" },
    ];
    if (this.projectRoot) {
      files.push({ path: join(this.projectRoot, MEMORY_FILE), kind: "memory", scope: "project" });
    }
    return files;
  }

  private readFile(spec: FileSpec): MarkdownEntry[] {
    if (!existsSync(spec.path)) return [];
    try {
      return parseMemoryFile(readFileSync(spec.path, "utf8"));
    } catch {
      // Corrupt file: best we can do is return empty so the rebuild
      // path can fix it on the next write.
      return [];
    }
  }

  private writeFile(spec: FileSpec, entries: readonly MarkdownEntry[]): void {
    ensureDir(dirOf(spec.path));
    atomicWrite(spec.path, renderMemoryFile(spec.scope, entries));
  }
}

function dirOf(p: string): string {
  const idx = p.lastIndexOf("/");
  return idx === -1 ? "." : p.slice(0, idx);
}

function recordToEntry(record: MemoryRecord): MarkdownEntry {
  return {
    id: record.id,
    title: record.title,
    content: record.content,
    category: record.category,
    tags: record.tags,
    updated_at: record.updated_at,
  };
}

/** Result of a MirroredStore write — extends AddResult with mirror diagnostics. */
export type MirroredAddResult =
  | (AddResult & { ok: true; mirrorError?: string })
  | (AddResult & { ok: false });

/**
 * SQLite store wrapped to keep the markdown mirror in sync. The SQLite
 * write runs first; if it succeeds and the mirror write throws, the
 * error is captured into `mirrorError` and returned. SQLite is never
 * rolled back on a mirror failure.
 */
export class MirroredStore {
  private readonly store: MemoryStore;
  private readonly mirror: MarkdownMirror;

  constructor(store: MemoryStore, mirror: MarkdownMirror) {
    this.store = store;
    this.mirror = mirror;
  }

  add(input: AddMemoryInput): MirroredAddResult {
    const result = this.store.add(input);
    if (!result.ok) return result;
    return this.mirrorById(result.id, result, "add");
  }

  replace(id: string, patch: Partial<AddMemoryInput>): MirroredAddResult {
    const result = this.store.replace(id, patch);
    if (!result.ok) return result;
    return this.mirrorById(result.id, result, "replace");
  }

  remove(id: string): boolean {
    const removed = this.store.remove(id);
    if (!removed) return false;
    try {
      this.mirror.remove(id);
    } catch {
      // Mirror failure on remove: best-effort. The SQLite row is gone
      // so a future rebuild from `list()` will reconcile.
    }
    return true;
  }

  get(id: string): MemoryRecord | null {
    return this.store.get(id);
  }

  list(options?: ListOptions): MemoryRecord[] {
    return this.store.list(options ?? {});
  }

  search(options: SearchOptions): MemoryHit[] {
    return this.store.search(options);
  }

  stats(): { memories: number } {
    return this.store.stats();
  }

  close(): void {
    this.store.close();
  }

  private mirrorById(
    id: string,
    result: Extract<AddResult, { ok: true }>,
    op: "add" | "replace",
  ): MirroredAddResult {
    const record = this.store.get(id);
    if (!record) {
      // Should not happen — the row was just inserted/updated. If it
      // does, surface the inconsistency rather than mirror stale data.
      return {
        ok: true,
        id: result.id,
        redacted: result.redacted,
        secretsFound: result.secretsFound,
        mirrorError: `${op}: record disappeared from store before mirror`,
      };
    }
    try {
      this.mirror.write(record);
    } catch (err) {
      return {
        ok: true,
        id: result.id,
        redacted: result.redacted,
        secretsFound: result.secretsFound,
        mirrorError: err instanceof Error ? err.message : String(err),
      };
    }
    return {
      ok: true,
      id: result.id,
      redacted: result.redacted,
      secretsFound: result.secretsFound,
    };
  }
}

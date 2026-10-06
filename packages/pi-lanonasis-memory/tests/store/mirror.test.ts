import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { MemoryStore, type MemoryRecord } from "../../src/store/memory.js";
import { MarkdownMirror, MirroredStore } from "../../src/store/mirror.js";

const ANTHROPIC_FIXTURE =
  String.fromCharCode(115, 107, 45, 97, 110, 116, 45) + "api" + "a".repeat(20);

async function openStore(dir: string): Promise<MemoryStore> {
  return MemoryStore.open(join(dir, "memories.db"));
}

describe("MarkdownMirror", () => {
  let dir: string;
  let globalRoot: string;
  let projectRoot: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "pi-mem-mirror-"));
    globalRoot = join(dir, "global");
    projectRoot = join(dir, "projects", "alpha");
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("routes target=user to USER.md", () => {
    const m = new MarkdownMirror({ globalRoot });
    const record: MemoryRecord = stubRecord({
      id: "u1",
      target: "user",
      title: "Identity",
      content: "I am Derick",
      category: "preference",
    });
    m.write(record);
    expect(existsSync(join(globalRoot, "USER.md"))).toBe(true);
    expect(existsSync(join(globalRoot, "MEMORY.md"))).toBe(false);
    const text = readFileSync(join(globalRoot, "USER.md"), "utf8");
    expect(text).toContain("<!-- id:u1 -->");
    expect(text).toContain("I am Derick");
  });

  it("routes target=memory and target=failure to MEMORY.md", () => {
    const m = new MarkdownMirror({ globalRoot });
    m.write(stubRecord({ id: "m1", target: "memory", title: "Fact", content: "fact body" }));
    m.write(stubRecord({ id: "f1", target: "failure", title: "Oops", content: "err" }));
    const text = readFileSync(join(globalRoot, "MEMORY.md"), "utf8");
    expect(text).toContain("<!-- id:m1 -->");
    expect(text).toContain("<!-- id:f1 -->");
  });

  it("routes target=project to <projectRoot>/MEMORY.md when projectRoot is set", () => {
    const m = new MarkdownMirror({ globalRoot, projectRoot });
    m.write(stubRecord({ id: "p1", target: "project", title: "Project note", content: "spec" }));
    expect(existsSync(join(projectRoot, "MEMORY.md"))).toBe(true);
    expect(existsSync(join(globalRoot, "MEMORY.md"))).toBe(false);
  });

  it("falls back to global MEMORY.md for project records when no projectRoot is configured", () => {
    const m = new MarkdownMirror({ globalRoot });
    m.write(stubRecord({ id: "p1", target: "project", title: "Project note", content: "spec" }));
    expect(existsSync(join(globalRoot, "MEMORY.md"))).toBe(true);
  });

  it("remove() strips the section by id and leaves siblings intact", () => {
    const m = new MarkdownMirror({ globalRoot });
    m.write(stubRecord({ id: "a", target: "memory", title: "Alpha", content: "alpha body" }));
    m.write(stubRecord({ id: "b", target: "memory", title: "Beta", content: "beta body" }));
    m.remove("a");
    const text = readFileSync(join(globalRoot, "MEMORY.md"), "utf8");
    expect(text).toContain("<!-- id:b -->");
    expect(text).not.toContain("<!-- id:a -->");
  });

  it("rebuild() rewrites the file from the supplied records", () => {
    const m = new MarkdownMirror({ globalRoot });
    m.write(stubRecord({ id: "old", target: "memory", title: "Stale", content: "remove me" }));
    m.rebuild([
      stubRecord({ id: "n1", target: "memory", title: "New", content: "fresh" }),
    ]);
    const text = readFileSync(join(globalRoot, "MEMORY.md"), "utf8");
    expect(text).toContain("<!-- id:n1 -->");
    expect(text).not.toContain("Stale");
  });
});

describe("MirroredStore", () => {
  let dir: string;
  let globalRoot: string;
  let projectRoot: string;
  let store: MemoryStore;
  let mirror: MarkdownMirror;
  let wrapped: MirroredStore;

  beforeEach(async () => {
    dir = mkdtempSync(join(tmpdir(), "pi-mem-mirrored-"));
    globalRoot = join(dir, "global");
    projectRoot = join(dir, "projects", "alpha");
    store = await openStore(dir);
    mirror = new MarkdownMirror({ globalRoot, projectRoot });
    wrapped = new MirroredStore(store, mirror);
  });

  afterEach(() => {
    wrapped.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it("add() persists to SQLite and writes markdown on success", () => {
    const r = wrapped.add({
      target: "memory",
      title: "Hello",
      content: "world",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(existsSync(join(globalRoot, "MEMORY.md"))).toBe(true);
    expect(r.mirrorError).toBeUndefined();
    const got = wrapped.get(r.id);
    expect(got?.content).toBe("world");
  });

  it("add() surfaces markdown errors via mirrorError without throwing", () => {
    // Force a mirror failure by pointing the mirror at a path the process
    // cannot create: a regular file as a parent of a directory.
    const blocking = join(dir, "blocker");
    writeFileSync(blocking, "not a directory");
    const brokenMirror = new MarkdownMirror({ globalRoot: join(blocking, "child") });
    const broken = new MirroredStore(store, brokenMirror);
    const r = broken.add({ target: "memory", title: "Will fail mirror", content: "still saves" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // SQLite write succeeded; mirror did not.
    expect(r.mirrorError).toBeTruthy();
    expect(store.list()).toHaveLength(1);
  });

  it("add() forwards the scanner block decision (no SQLite, no markdown)", () => {
    const r = wrapped.add({
      target: "memory",
      title: "secret",
      content: `key is ${ANTHROPIC_FIXTURE}`,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toMatch(/secret/i);
    expect(wrapped.list()).toHaveLength(0);
    expect(existsSync(join(globalRoot, "MEMORY.md"))).toBe(false);
  });

  it("add() reads back the post-scan record before mirroring (so the markdown never sees raw input)", async () => {
    const redactStore = await MemoryStore.open(join(dir, "redact.db"), { mode: "redact" });
    const redactWrapped = new MirroredStore(redactStore, mirror);
    redactWrapped.add({
      target: "memory",
      title: "with key",
      content: `key is ${ANTHROPIC_FIXTURE}`,
    });
    const md = readFileSync(join(globalRoot, "MEMORY.md"), "utf8");
    expect(md).not.toContain(ANTHROPIC_FIXTURE);
    expect(md).toContain("[REDACTED:");
    redactWrapped.close();
  });

  it("replace() re-mirrors the post-scan record", () => {
    const r = wrapped.add({ target: "memory", title: "v1", content: "v1 body" });
    if (!r.ok) throw new Error("add failed");
    const replaced = wrapped.replace(r.id, { title: "v2", content: "v2 body" });
    expect(replaced.ok).toBe(true);
    const md = readFileSync(join(globalRoot, "MEMORY.md"), "utf8");
    expect(md).toContain("## v2");
    expect(md).not.toContain("v1 body");
  });

  it("remove() deletes from SQLite and the mirror", () => {
    const r = wrapped.add({ target: "memory", title: "bye", content: "body" });
    if (!r.ok) throw new Error("add failed");
    const removed = wrapped.remove(r.id);
    expect(removed).toBe(true);
    const md = readFileSync(join(globalRoot, "MEMORY.md"), "utf8");
    expect(md).not.toContain("<!-- id:");
  });

  it("exposes list/search/stats/get that mirror MemoryStore", async () => {
    wrapped.add({ target: "memory", title: "A", content: "alpha" });
    wrapped.add({ target: "memory", title: "B", content: "beta" });
    expect(wrapped.list()).toHaveLength(2);
    const hits = wrapped.search({ query: "alpha" });
    expect(hits).toHaveLength(1);
    expect(wrapped.stats().memories).toBe(2);
    const a = wrapped.list()[0]!;
    expect(wrapped.get(a.id)?.id).toBe(a.id);
  });

  it("close() closes the underlying store", () => {
    const freshDir = mkdtempSync(join(tmpdir(), "pi-mem-mirrored-close-"));
    return (async () => {
      const s = await openStore(freshDir);
      const w = new MirroredStore(s, new MarkdownMirror({ globalRoot: join(freshDir, "g") }));
      w.close();
      let threw = false;
      try {
        s.get("nope");
      } catch {
        threw = true;
      }
      expect(threw).toBe(true);
      rmSync(freshDir, { recursive: true, force: true });
    })();
  });
});

function stubRecord(over: Partial<MemoryRecord>): MemoryRecord {
  return {
    id: over.id ?? "stub",
    target: over.target ?? "memory",
    category: over.category ?? null,
    title: over.title ?? "Title",
    content: over.content ?? "body",
    tags: over.tags ?? null,
    failure_reason: over.failure_reason ?? null,
    created_at: over.created_at ?? "2026-10-06T10:00:00.000Z",
    updated_at: over.updated_at ?? "2026-10-06T10:00:00.000Z",
    maas_synced_at: over.maas_synced_at ?? null,
    maas_id: over.maas_id ?? null,
    last_accessed_at: over.last_accessed_at ?? null,
  };
}

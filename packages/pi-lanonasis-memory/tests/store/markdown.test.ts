import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  renderMemoryFile,
  parseMemoryFile,
  atomicWrite,
  ensureDir,
  type MarkdownEntry,
} from "../../src/store/markdown.js";

describe("renderMemoryFile", () => {
  it("renders a header line and one section per entry", () => {
    const entries: MarkdownEntry[] = [
      {
        id: "abc",
        title: "First",
        content: "hello",
        category: "insight",
        tags: ["alpha", "beta"],
        updated_at: "2026-10-06T10:00:00.000Z",
      },
      {
        id: "def",
        title: "Second",
        content: "world",
        category: null,
        tags: null,
        updated_at: "2026-10-06T11:00:00.000Z",
      },
    ];
    const md = renderMemoryFile("global", entries);
    expect(md.split("\n")[0]).toMatch(/^# (Global|Project|User) Memory/);
    expect(md).toContain("## First");
    expect(md).toContain("<!-- id:abc -->");
    expect(md).toContain("category: insight");
    expect(md).toContain("tags: alpha, beta");
    expect(md).toContain("updated: 2026-10-06T10:00:00.000Z");
    expect(md).toContain("hello");
    expect(md).toContain("## Second");
    expect(md).toContain("<!-- id:def -->");
    expect(md).toContain("world");
  });

  it("renders a stable blank file when there are no entries", () => {
    const md = renderMemoryFile("project", []);
    expect(md).toMatch(/^# Project Memory\n\n$/);
  });
});

describe("parseMemoryFile", () => {
  it("round-trips a rendered file", () => {
    const entries: MarkdownEntry[] = [
      {
        id: "a",
        title: "Title One",
        content: "Body one\nWith two lines",
        category: "convention",
        tags: ["x", "y"],
        updated_at: "2026-10-06T10:00:00.000Z",
      },
    ];
    const md = renderMemoryFile("global", entries);
    const parsed = parseMemoryFile(md);
    expect(parsed).toEqual(entries);
  });

  it("tolerates unknown metadata lines and missing optional fields", () => {
    const md = [
      "# Global Memory",
      "",
      "## Loose",
      "<!-- id:l1 -->",
      "category: insight",
      "updated: 2026-10-06T10:00:00.000Z",
      "freeform: anything",
      "",
      "Body.",
      "",
    ].join("\n");
    const parsed = parseMemoryFile(md);
    expect(parsed).toEqual([
      {
        id: "l1",
        title: "Loose",
        content: "Body.",
        category: "insight",
        tags: null,
        updated_at: "2026-10-06T10:00:00.000Z",
      },
    ]);
  });

  it("skips sections that are missing the id marker but preserves the rest", () => {
    const md = [
      "# Global Memory",
      "",
      "## Without Id",
      "category: insight",
      "",
      "body",
      "",
      "## With Id",
      "<!-- id:42 -->",
      "",
      "body2",
      "",
    ].join("\n");
    const parsed = parseMemoryFile(md);
    expect(parsed.map((p) => p.id)).toEqual(["42"]);
  });

  it("ignores comments and code fences that look like markers", () => {
    const md = [
      "# Global Memory",
      "",
      "## Title",
      "<!-- id:real -->",
      "category: insight",
      "",
      "A code block:",
      "```",
      "<!-- id:fake -->",
      "```",
      "",
    ].join("\n");
    const parsed = parseMemoryFile(md);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.id).toBe("real");
  });
});

describe("atomicWrite", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "pi-mem-md-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("creates the parent dir and writes atomically", () => {
    const path = join(dir, "deep", "sub", "note.md");
    atomicWrite(path, "hello\n");
    const read = join(dir, "deep", "sub", "note.md");
    const md = readFileSync(read, "utf8");
    expect(md).toBe("hello\n");
  });

  it("overwrites an existing file via temp + rename", () => {
    const path = join(dir, "note.md");
    atomicWrite(path, "v1\n");
    atomicWrite(path, "v2\n");
    expect(readFileSync(path, "utf8")).toBe("v2\n");
  });

  it("does not leave temp files behind on success", () => {
    const path = join(dir, "note.md");
    atomicWrite(path, "x\n");
    const fs = require("node:fs") as typeof import("node:fs");
    expect(fs.readdirSync(dir).filter((n) => n.includes(".tmp-"))).toEqual([]);
  });
});

describe("ensureDir", () => {
  it("mkdir -p a nested path", () => {
    const dir = join(mkdtempSync(join(tmpdir(), "pi-mem-md-")), "a", "b", "c");
    ensureDir(dir);
    // Idempotent
    ensureDir(dir);
  });
});

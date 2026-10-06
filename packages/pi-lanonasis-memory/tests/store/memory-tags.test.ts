/**
 * memory-tags.test.ts — optional `tags` filter on MemoryStore.search/list
 * (PR2 of pi-memory Layer 1). AND semantics: every requested tag must be
 * present in the record's JSON tags column.
 *
 * Kept in its own file so parallel PRs touching memory.test.ts don't
 * conflict.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { MemoryStore } from "../../src/store/memory.js";

describe("MemoryStore tags filter", () => {
  let dir: string;
  let store: MemoryStore;

  beforeEach(async () => {
    dir = mkdtempSync(join(tmpdir(), "pi-mem-tags-"));
    store = await MemoryStore.open(join(dir, "memories.db"));
    store.add({ target: "project", title: "alpha deploy", content: "deploy uses bun", tags: ["project:alpha", "deploy"] });
    store.add({ target: "project", title: "beta deploy", content: "deploy uses npm", tags: ["project:beta", "deploy"] });
    store.add({ target: "memory", title: "untagged deploy", content: "deploy notes" });
  });

  afterEach(() => {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it("search filters by a single tag", () => {
    const hits = store.search({ query: "deploy", tags: ["project:alpha"] });
    expect(hits.map((h) => h.title)).toEqual(["alpha deploy"]);
  });

  it("search uses AND semantics across tags", () => {
    expect(store.search({ query: "deploy", tags: ["deploy"] })).toHaveLength(2);
    expect(store.search({ query: "deploy", tags: ["deploy", "project:beta"] }).map((h) => h.title)).toEqual([
      "beta deploy",
    ]);
    expect(store.search({ query: "deploy", tags: ["project:alpha", "project:beta"] })).toHaveLength(0);
  });

  it("search with an empty tags array behaves like no filter", () => {
    expect(store.search({ query: "deploy", tags: [] })).toHaveLength(3);
  });

  it("list filters by tags (AND) and excludes untagged rows", () => {
    expect(store.list({ tags: ["deploy"] })).toHaveLength(2);
    expect(store.list({ tags: ["project:alpha"] }).map((r) => r.title)).toEqual(["alpha deploy"]);
    expect(store.list({ tags: ["nope"] })).toHaveLength(0);
  });

  it("list tags filter composes with target filter", () => {
    expect(store.list({ tags: ["deploy"], target: "memory" })).toHaveLength(0);
    expect(store.list({ tags: ["deploy"], target: "project" })).toHaveLength(2);
  });

  it("tag matching is exact (no substring matches)", () => {
    expect(store.list({ tags: ["project:alp"] })).toHaveLength(0);
    expect(store.search({ query: "deploy", tags: ["dep"] })).toHaveLength(0);
  });
});

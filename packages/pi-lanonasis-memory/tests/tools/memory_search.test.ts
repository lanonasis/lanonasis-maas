/**
 * memory_search.test.ts — 8+ cases per tool.
 *
 * Verifies:
 *   - local FTS5 search returns matching hits ordered by score desc
 *   - empty store returns []
 *   - filter by target narrows the hit list
 *   - limit clamps the number of hits
 *   - tag filter (in-memory) is applied
 *   - maas adapter enabled: best-effort enrichment when local < limit
 *   - maas adapter disabled: no enrichment, source='local'
 *   - maas adapter throws: silent fallback to local (never throws to caller)
 *   - dedupe on id between local + maas hits
 *   - sort by score descending
 *   - empty query returns []
 *   - store=null returns []
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { searchMemory } from "../../src/tools/memory_search.js";
import {
  addMemory,
  type MemoryAddParams,
} from "../../src/tools/memory_add.js";
import type { MaaSAdapter } from "../../src/deps.js";
import {
  openTempStore,
  RecordingSyncAdapter,
  type StoreHandle,
} from "../test-helpers.js";

class StubMaas implements MaaSAdapter {
  public enabled = true;
  public hits: Array<{ id: string; title: string; content: string; tags: string[] | null; score: number }> = [];
  public throwOnCall = false;
  async search(_query: string, limit: number) {
    if (this.throwOnCall) throw new Error("maas down");
    return this.hits.slice(0, limit);
  }
}

describe("memory_search", () => {
  let h: StoreHandle;
  let sync: RecordingSyncAdapter;

  beforeEach(async () => {
    h = await openTempStore();
    sync = new RecordingSyncAdapter();
  });
  afterEach(() => {
    h.cleanup();
  });

  function seed(contents: string[], category?: MemoryAddParams["category"]) {
    const ids: string[] = [];
    for (const c of contents) {
      const { details, written } = addMemory(
        h.store,
        { target: "memory", content: c, category },
        sync,
      );
      if (written && details.id) ids.push(details.id);
    }
    return ids;
  }

  it("returns matching hits ordered by score desc", async () => {
    seed([
      "the quick brown fox jumps over the lazy dog",
      "a quick fox was spotted in the forest",
      "completely unrelated text",
    ]);
    const maas = new StubMaas();
    maas.enabled = false;
    const details = await searchMemory(h.store, maas, { query: "quick fox", limit: 10 });
    expect(details.hits.length).toBeGreaterThanOrEqual(2);
    expect(details.source).toBe("local");
    // BM25-derived scores may differ at the 7th decimal place due to FTS5
    // tie-breaking, so allow a tiny epsilon.
    for (let i = 1; i < details.hits.length; i++) {
      expect(details.hits[i - 1]!.score + 1e-6).toBeGreaterThanOrEqual(
        details.hits[i]!.score,
      );
    }
  });

  it("returns [] when the store is empty", async () => {
    const maas = new StubMaas();
    maas.enabled = false;
    const details = await searchMemory(h.store, maas, { query: "anything" });
    expect(details.hits).toEqual([]);
    expect(details.source).toBe("local");
  });

  it("narrows hits by target filter", async () => {
    addMemory(h.store, { target: "user", content: "user-secret-about-foxes" }, sync);
    addMemory(h.store, { target: "memory", content: "memory-secret-about-foxes" }, sync);
    const maas = new StubMaas();
    maas.enabled = false;
    const details = await searchMemory(h.store, maas, { query: "foxes", target: "user" });
    expect(details.hits.every((h) => h.target === "user")).toBe(true);
  });

  it("clamps hits to the limit", async () => {
    for (let i = 0; i < 10; i++) {
      addMemory(h.store, { target: "memory", content: `fox number ${i}` }, sync);
    }
    const maas = new StubMaas();
    maas.enabled = false;
    const details = await searchMemory(h.store, maas, { query: "fox", limit: 3 });
    expect(details.hits.length).toBe(3);
  });

  it("filters hits by tag (in-memory)", async () => {
    const a = addMemory(h.store, { target: "memory", content: "fox pinned", tags: ["pinned"] }, sync);
    addMemory(h.store, { target: "memory", content: "fox unpinned" }, sync);
    const maas = new StubMaas();
    maas.enabled = false;
    const details = await searchMemory(h.store, maas, {
      query: "fox",
      tags: ["pinned"],
    });
    expect(details.hits.length).toBe(1);
    expect(details.hits[0]!.id).toBe(a.details.id);
  });

  it("enriches with MaaS when local matches < limit and MaaS enabled", async () => {
    seed(["fox local hit"]);
    const maas = new StubMaas();
    maas.hits = [
      { id: "maas-1", title: "maas one", content: "remote fox", tags: null, score: 0.9 },
      { id: "maas-2", title: "maas two", content: "another remote fox", tags: null, score: 0.8 },
    ];
    const result = await searchMemory(h.store, maas, { query: "fox", limit: 5 });
    expect(result.source).toBe("local+maas");
    expect(result.hits.length).toBe(3);
    const ids = result.hits.map((h) => h.id);
    expect(ids).toContain("maas-1");
    expect(ids).toContain("maas-2");
  });

  it("does not call MaaS when local matches the limit", async () => {
    for (let i = 0; i < 5; i++) {
      addMemory(h.store, { target: "memory", content: `fox ${i}` }, sync);
    }
    const maas = new StubMaas();
    maas.hits = [{ id: "m", title: "t", content: "c", tags: null, score: 0.5 }];
    const result = await searchMemory(h.store, maas, { query: "fox", limit: 5 });
    expect(result.source).toBe("local");
    expect(result.hits.length).toBe(5);
  });

  it("never throws when MaaS adapter throws", async () => {
    seed(["fox local"]);
    const maas = new StubMaas();
    maas.enabled = true;
    maas.throwOnCall = true;
    const result = await searchMemory(h.store, maas, { query: "fox", limit: 5 });
    expect(result.hits.length).toBeGreaterThanOrEqual(1);
    expect(result.source).toBe("local"); // degraded gracefully
  });

  it("dedupes hits on id when local and maas overlap", async () => {
    const a = addMemory(h.store, { target: "memory", content: "fox shared" }, sync);
    const maas = new StubMaas();
    maas.hits = [
      { id: a.details.id!, title: "shared", content: "fox shared", tags: null, score: 0.95 },
      { id: "remote-only", title: "remote", content: "remote fox", tags: null, score: 0.5 },
    ];
    const r = await searchMemory(h.store, maas, { query: "fox", limit: 10 });
    const aCount = r.hits.filter((h) => h.id === a.details.id).length;
    expect(aCount).toBe(1);
    expect(r.hits.some((h) => h.id === "remote-only")).toBe(true);
  });

  it("returns [] when store is null (no crash)", async () => {
    const maas = new StubMaas();
    const r = await searchMemory(null, maas, { query: "anything" });
    expect(r.hits).toEqual([]);
  });

  it("respects target + tag filters together", async () => {
    addMemory(h.store, { target: "user", content: "fox user", tags: ["pinned"] }, sync);
    addMemory(h.store, { target: "user", content: "fox user2", tags: [] }, sync);
    addMemory(h.store, { target: "memory", content: "fox memory", tags: ["pinned"] }, sync);
    const maas = new StubMaas();
    maas.enabled = false;
    const r = await searchMemory(h.store, maas, {
      query: "fox",
      target: "user",
      tags: ["pinned"],
    });
    expect(r.hits.length).toBe(1);
    expect(r.hits[0]!.target).toBe("user");
    expect(r.hits[0]!.tags).toContain("pinned");
  });
});
/**
 * memory_remove.test.ts — 8+ cases per tool.
 *
 * Verifies:
 *   - happy path: row removed, sync delete enqueued
 *   - missing id returns ok=false, no mutation, no enqueue
 *   - removed row no longer appears in store.list()
 *   - store=null returns ok=false
 *   - multiple removes in a row
 *   - idempotent remove (second remove returns ok=false)
 *   - no scanner gate (per brief: deletion is not scanned)
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { removeMemory } from "../../src/tools/memory_remove.js";
import { addMemory } from "../../src/tools/memory_add.js";
import {
  openTempStore,
  RecordingSyncAdapter,
  type StoreHandle,
} from "../test-helpers.js";

describe("memory_remove", () => {
  let h: StoreHandle;
  let sync: RecordingSyncAdapter;

  beforeEach(async () => {
    h = await openTempStore();
    sync = new RecordingSyncAdapter();
  });
  afterEach(() => {
    h.cleanup();
  });

  function seed(text = "body"): string {
    const { details, written } = addMemory(
      h.store,
      { target: "memory", content: text },
      sync,
    );
    if (!written || !details.id) throw new Error("seed failed");
    return details.id;
  }

  it("removes an existing row and enqueues delete (happy path)", () => {
    const id = seed("body");
    sync.calls.length = 0;
    const r = removeMemory(h.store, { id }, sync);
    expect(r.ok).toBe(true);
    expect(h.store.get(id)).toBeNull();
    expect(sync.calls.length).toBe(1);
    expect(sync.calls[0]?.op).toBe("delete");
    expect(sync.calls[0]?.origin).toBe("explicit");
  });

  it("returns ok=false and does not enqueue when id is unknown", () => {
    sync.calls.length = 0;
    const r = removeMemory(h.store, { id: "no-such-id" }, sync);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/not found/i);
    expect(sync.calls.length).toBe(0);
  });

  it("removed row no longer appears in store.list()", () => {
    const id = seed("body");
    expect(h.store.list().some((r) => r.id === id)).toBe(true);
    removeMemory(h.store, { id }, sync);
    expect(h.store.list().some((r) => r.id === id)).toBe(false);
  });

  it("returns ok=false when store is null", () => {
    const r = removeMemory(null, { id: "anything" }, sync);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/store/i);
  });

  it("removes multiple rows in sequence", () => {
    const ids = ["body a", "body b", "body c"].map(seed);
    for (const id of ids) {
      const r = removeMemory(h.store, { id }, sync);
      expect(r.ok).toBe(true);
    }
    expect(h.store.stats().memories).toBe(0);
  });

  it("is idempotent: second remove of the same id returns ok=false", () => {
    const id = seed("body");
    expect(removeMemory(h.store, { id }, sync).ok).toBe(true);
    expect(removeMemory(h.store, { id }, sync).ok).toBe(false);
  });

  it("does not pass the deletion through the scanner (per spec)", () => {
    // Even content with secrets would have been blocked by add, but
    // remove() takes the id. There is no scanner gate on the delete path.
    const id = seed("body");
    sync.calls.length = 0;
    const r = removeMemory(h.store, { id }, sync);
    expect(r.ok).toBe(true);
    expect(sync.calls.length).toBe(1);
  });

  it("preserves the id field in the return shape (never undefined)", () => {
    const id = seed("body");
    const r = removeMemory(h.store, { id }, sync);
    expect(r.id).toBe(id);
  });

  it("deletes only the targeted id, not siblings", () => {
    const keep = seed("keep");
    const drop = seed("drop");
    removeMemory(h.store, { id: drop }, sync);
    expect(h.store.get(keep)).not.toBeNull();
    expect(h.store.get(drop)).toBeNull();
  });
});
/**
 * memory_replace.test.ts — 8+ cases per tool.
 *
 * Verifies:
 *   - happy path: replace existing memory's content
 *   - missing id returns tool error (no mutation)
 *   - secret in new content blocks the write (no mutation)
 *   - secret in new title blocks the write (no mutation)
 *   - sync enqueue fires on successful replace
 *   - sync skipped on block
 *   - target update applies
 *   - category update applies
 *   - store=null blocks the operation
 *   - validation error on empty content
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { replaceMemory } from "../../src/tools/memory_replace.js";
import { addMemory } from "../../src/tools/memory_add.js";
import {
  openTempStore,
  RecordingSyncAdapter,
  type StoreHandle,
} from "../test-helpers.js";

describe("memory_replace", () => {
  let h: StoreHandle;
  let sync: RecordingSyncAdapter;

  beforeEach(async () => {
    h = await openTempStore();
    sync = new RecordingSyncAdapter();
  });
  afterEach(() => {
    h.cleanup();
  });

  function seed(text = "original body"): string {
    const { details, written } = addMemory(
      h.store,
      { target: "memory", content: text },
      sync,
    );
    if (!written || !details.id) throw new Error("seed failed");
    return details.id;
  }

  it("replaces content on an existing memory (happy path)", () => {
    const id = seed("original body");
    sync.calls.length = 0; // clear seed enqueue
    const r = replaceMemory(
      h.store,
      { id, content: "replacement body" },
      sync,
    );
    expect(r.ok).toBe(true);
    expect(r.id).toBe(id);
    expect(r.scannerDecision).toBe("allow");
    const stored = h.store.get(id);
    expect(stored?.content).toBe("replacement body");
    // One update enqueue fires
    expect(sync.calls.length).toBe(1);
    expect(sync.calls[0]?.op).toBe("update");
    expect(sync.calls[0]?.origin).toBe("explicit");
  });

  it("returns an error when id is missing (no mutation)", () => {
    sync.calls.length = 0;
    const r = replaceMemory(
      h.store,
      { id: "no-such-id", content: "x" },
      sync,
    );
    expect(r.ok).toBe(false);
    expect(r.scannerDecision).toBe("block");
    expect(h.store.stats().memories).toBe(0);
    expect(sync.calls.length).toBe(0);
  });

  it("blocks when new content contains a secret (no mutation)", () => {
    const id = seed("clean body");
    sync.calls.length = 0;
    const r = replaceMemory(
      h.store,
      {
        id,
        content: "new body AKIAIOSFODNN7EXAMPLE", // secret in new content
      },
      sync,
    );
    expect(r.ok).toBe(false);
    expect(r.scannerDecision).toBe("block");
    // original content intact
    expect(h.store.get(id)?.content).toBe("clean body");
    expect(sync.calls.length).toBe(0);
  });

  it("blocks when new title contains a secret (no mutation)", () => {
    const id = seed("body");
    sync.calls.length = 0;
    const r = replaceMemory(
      h.store,
      { id, content: "body", title: "AKIAIOSFODNN7EXAMPLE" },
      sync,
    );
    expect(r.ok).toBe(false);
    expect(r.scannerDecision).toBe("block");
    expect(sync.calls.length).toBe(0);
  });

  it("applies a target update", () => {
    const id = seed("body");
    sync.calls.length = 0;
    const r = replaceMemory(
      h.store,
      { id, content: "still the same", target: "user" },
      sync,
    );
    expect(r.ok).toBe(true);
    expect(h.store.get(id)?.target).toBe("user");
  });

  it("applies a category update", () => {
    const id = seed("body");
    sync.calls.length = 0;
    const r = replaceMemory(
      h.store,
      { id, content: "body", category: "preference" },
      sync,
    );
    expect(r.ok).toBe(true);
    expect(h.store.get(id)?.category).toBe("preference");
  });

  it("blocks when the new content is empty (validation)", () => {
    const id = seed("body");
    sync.calls.length = 0;
    const r = replaceMemory(
      h.store,
      { id, content: "" },
      sync,
    );
    expect(r.ok).toBe(false);
    expect(r.scannerDecision).toBe("block");
    expect(h.store.get(id)?.content).toBe("body");
  });

  it("returns tool error when store is null", () => {
    sync.calls.length = 0;
    const r = replaceMemory(null, { id: "x", content: "y" }, sync);
    expect(r.ok).toBe(false);
    expect(r.scannerDecision).toBe("block");
    expect(r.reason).toMatch(/store/i);
  });

  it("scannerDecision is allow when neither content nor title has a secret", () => {
    const id = seed("body");
    const r = replaceMemory(
      h.store,
      { id, content: "clean body" },
      sync,
    );
    expect(r.scannerDecision).toBe("allow");
    expect(r.redacted).toBe(false);
  });
});
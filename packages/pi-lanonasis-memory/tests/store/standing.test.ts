import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { StandingStore, MAX_ENTRIES } from "../../src/store/standing.js";

const ANTHROPIC_FIXTURE =
  String.fromCharCode(115, 107, 45, 97, 110, 116, 45) + "api" + "a".repeat(20);

describe("StandingStore", () => {
  let dir: string;
  let store: StandingStore;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "pi-mem-standing-"));
    store = new StandingStore(dir);
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("returns an empty list when the file is absent", () => {
    expect(store.list()).toEqual([]);
  });

  it("add() writes bullets to STANDING.md", () => {
    expect(store.add("Never force-push to main.").ok).toBe(true);
    expect(store.add("Run tests before /memory save.").ok).toBe(true);
    expect(store.list()).toEqual([
      "Never force-push to main.",
      "Run tests before /memory save.",
    ]);
    const text = readFileSync(join(dir, "STANDING.md"), "utf8");
    expect(text).toMatch(/^- Never force-push to main\.$/m);
  });

  it("caps at 20 entries", () => {
    for (let i = 0; i < 21; i++) {
      store.add(`rule ${i}`);
    }
    expect(store.list()).toHaveLength(MAX_ENTRIES);
    const last = store.add("one too many");
    expect(last.ok).toBe(false);
    if (last.ok) return;
    expect(last.error).toMatch(/20 entries/);
  });

  it("caps total chars at 2000", () => {
    const big = "x".repeat(1500);
    expect(store.add(big).ok).toBe(true);
    const r = store.add("y".repeat(800));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/2000/);
  });

  it("rejects blank entries", () => {
    const r = store.add("   \n  ");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/empty/);
  });

  it("rejects scanner-blocked entries (default block mode)", () => {
    const r = store.add(`my key is ${ANTHROPIC_FIXTURE}`);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/secret|redacted/i);
  });

  it("remove(index) drops the bullet by 0-based position", () => {
    store.add("a");
    store.add("b");
    store.add("c");
    expect(store.remove(1)).toBe(true);
    expect(store.list()).toEqual(["a", "c"]);
    expect(store.remove(99)).toBe(false);
  });

  it("persists across instances", () => {
    store.add("persistent rule");
    const other = new StandingStore(dir);
    expect(other.list()).toEqual(["persistent rule"]);
  });
});

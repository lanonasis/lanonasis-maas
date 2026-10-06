/**
 * memory-search-command.test.ts — `/memory search <q> [limit]`.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { register as registerMemorySearch, parseSearchArgs } from "../../src/commands/memory-search.js";
import { addMemory } from "../../src/tools/memory_add.js";
import {
  FakeCommandCtx,
  FakePi,
  RecordingSyncAdapter,
  openTempStore,
  runCommand,
  type StoreHandle,
} from "../test-helpers.js";
import type { CommandDeps } from "../../src/commands/types.js";

describe("/memory search", () => {
  let h: StoreHandle;
  let sync: RecordingSyncAdapter;
  let pi: FakePi;
  let ctx: FakeCommandCtx;
  let deps: CommandDeps;

  beforeEach(async () => {
    h = await openTempStore();
    sync = new RecordingSyncAdapter();
    pi = new FakePi();
    ctx = new FakeCommandCtx();
    deps = {
      getStore: () => h.store,
      getMirror: () => ({ store: h.store }),
      getMaas: () => ({ enabled: false, async search() { return []; } }),
      getSync: () => sync,
      getInjection: () => ({ register: () => () => {} }),
      getCorrection: () => ({ register: () => () => {} }),
    };
    registerMemorySearch(pi as never, deps);
  });
  afterEach(() => {
    h.cleanup();
  });

  it("registers the `memory` command", () => {
    expect(pi.commands.length).toBe(1);
    expect(pi.commands[0]?.name).toBe("memory");
  });

  it("returns hits for a matching query", async () => {
    addMemory(h.store, { target: "memory", content: "fox jumps over the lazy dog" }, sync);
    addMemory(h.store, { target: "memory", content: "a fox in the forest" }, sync);
    const handler = pi.commands[0]!.handler as (a: string, c: unknown) => Promise<void>;
    await runCommand(ctx, handler, "search fox");
    // At least one notification includes "hit(s)"
    expect(
      ctx.notifications.some(
        (n) => n.message.includes("hit(s)") && n.level === "info",
      ),
    ).toBe(true);
  });

  it("reports no matches on an empty result", async () => {
    const handler = pi.commands[0]!.handler as (a: string, c: unknown) => Promise<void>;
    await runCommand(ctx, handler, "search nonexistent-thing");
    expect(
      ctx.notifications.some(
        (n) => n.message.includes("no matches") && n.level === "info",
      ),
    ).toBe(true);
  });

  it("respects a trailing numeric limit", async () => {
    for (let i = 0; i < 10; i++) {
      addMemory(h.store, { target: "memory", content: `fox ${i}` }, sync);
    }
    const handler = pi.commands[0]!.handler as (a: string, c: unknown) => Promise<void>;
    await runCommand(ctx, handler, "search fox 2");
    const last = ctx.notifications[ctx.notifications.length - 1]?.message ?? "";
    expect(last).toMatch(/hit\(s\)/);
  });

  it("rejects an unknown subcommand", async () => {
    const handler = pi.commands[0]!.handler as (a: string, c: unknown) => Promise<void>;
    await runCommand(ctx, handler, "frobnicate fox");
    expect(
      ctx.notifications.some(
        (n) => n.level === "error" && n.message.includes("unknown subcommand"),
      ),
    ).toBe(true);
  });

  it("rejects an empty query", async () => {
    const handler = pi.commands[0]!.handler as (a: string, c: unknown) => Promise<void>;
    await runCommand(ctx, handler, "search ");
    expect(
      ctx.notifications.some(
        (n) => n.level === "error" && n.message.includes("requires a query"),
      ),
    ).toBe(true);
  });

  it("rejects when no subcommand is provided", async () => {
    const handler = pi.commands[0]!.handler as (a: string, c: unknown) => Promise<void>;
    await runCommand(ctx, handler, "");
    expect(
      ctx.notifications.some(
        (n) => n.level === "error" && n.message.includes("missing subcommand"),
      ),
    ).toBe(true);
  });

  it("catches thrown errors from the store layer", async () => {
    const brokenDeps: CommandDeps = {
      ...deps,
      getStore: () => {
        throw new Error("boom");
      },
    };
    pi = new FakePi();
    registerMemorySearch(pi as never, brokenDeps);
    const handler = pi.commands[0]!.handler as (a: string, c: unknown) => Promise<void>;
    await runCommand(ctx, handler, "search anything");
    expect(
      ctx.notifications.some(
        (n) => n.level === "error" && n.message.includes("boom"),
      ),
    ).toBe(true);
  });
});

describe("parseSearchArgs", () => {
  it("returns search subcommand with query", () => {
    expect(parseSearchArgs("search quick fox")).toEqual({
      subcommand: "search",
      query: "quick fox",
    });
  });

  it("extracts trailing numeric limit", () => {
    expect(parseSearchArgs("search quick fox 5")).toEqual({
      subcommand: "search",
      query: "quick fox",
      limit: 5,
    });
  });

  it("treats trailing '0' as part of the query, not a limit", () => {
    const r = parseSearchArgs("search 7th fox");
    expect(r.subcommand).toBe("search");
    expect(r.query).toBe("7th fox");
  });

  it("returns an error for empty input", () => {
    expect(parseSearchArgs("").error).toBeTruthy();
  });

  it("returns an error for unknown subcommand", () => {
    expect(parseSearchArgs("frobnicate foo").error).toBeTruthy();
  });
});
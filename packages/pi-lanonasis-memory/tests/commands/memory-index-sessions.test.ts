/**
 * memory-index-sessions.test.ts — `/memory-index-sessions`.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";

import {
  register as registerMemoryIndexSessions,
  indexSessions,
} from "../../src/commands/memory-index-sessions.js";
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

describe("/memory-index-sessions", () => {
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
    registerMemoryIndexSessions(pi as never, deps);
  });
  afterEach(() => h.cleanup());

  it("registers the `memory-index-sessions` command", () => {
    expect(pi.commands[0]?.name).toBe("memory-index-sessions");
  });

  it("prints the empty-state message when no sessions exist", async () => {
    const handler = pi.commands[0]!.handler as (a: string, c: unknown) => Promise<void>;
    await runCommand(ctx, handler, "");
    expect(
      ctx.notifications.some(
        (n) => n.message === "no sessions indexed yet" && n.level === "info",
      ),
    ).toBe(true);
  });

  it("groups by session: tag and reports counts", async () => {
    addMemory(
      h.store,
      { target: "memory", content: "a", tags: ["session:foo"] },
      sync,
    );
    addMemory(
      h.store,
      { target: "memory", content: "b", tags: ["session:foo"] },
      sync,
    );
    addMemory(
      h.store,
      { target: "memory", content: "c", tags: ["session:bar"] },
      sync,
    );
    addMemory(h.store, { target: "memory", content: "d" }, sync); // no tag
    const handler = pi.commands[0]!.handler as (a: string, c: unknown) => Promise<void>;
    await runCommand(ctx, handler, "");
    const last = ctx.notifications[ctx.notifications.length - 1]?.message ?? "";
    expect(last).toMatch(/session:foo \(2\)/);
    expect(last).toMatch(/session:bar \(1\)/);
  });

  it("errors when store is null", async () => {
    const brokenDeps: CommandDeps = {
      ...deps,
      getStore: () => null,
    };
    pi = new FakePi();
    registerMemoryIndexSessions(pi as never, brokenDeps);
    const handler = pi.commands[0]!.handler as (a: string, c: unknown) => Promise<void>;
    await runCommand(ctx, handler, "");
    expect(
      ctx.notifications.some(
        (n) => n.level === "error" && n.message.includes("store not open"),
      ),
    ).toBe(true);
  });

  it("indexSessions pure helper returns the count map", () => {
    addMemory(
      h.store,
      { target: "memory", content: "a", tags: ["session:x"] },
      sync,
    );
    const m = indexSessions(h.store);
    expect(m["session:x"]).toBe(1);
  });
});
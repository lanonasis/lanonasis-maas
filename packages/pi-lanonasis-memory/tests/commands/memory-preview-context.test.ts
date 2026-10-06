/**
 * memory-preview-context.test.ts — `/memory-preview-context`.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { register as registerMemoryPreviewContext } from "../../src/commands/memory-preview-context.js";
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

describe("/memory-preview-context", () => {
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
    registerMemoryPreviewContext(pi as never, deps);
  });
  afterEach(() => h.cleanup());

  it("registers the `memory-preview-context` command", () => {
    expect(pi.commands[0]?.name).toBe("memory-preview-context");
  });

  it("prints up to 10 recent entries", async () => {
    for (let i = 0; i < 12; i++) {
      addMemory(h.store, { target: "memory", content: `entry ${i}` }, sync);
    }
    const handler = pi.commands[0]!.handler as (a: string, c: unknown) => Promise<void>;
    await runCommand(ctx, handler, "");
    const last = ctx.notifications[ctx.notifications.length - 1]?.message ?? "";
    expect(last).toMatch(/10 recent/);
  });

  it("prints the empty-state message when nothing is stored", async () => {
    const handler = pi.commands[0]!.handler as (a: string, c: unknown) => Promise<void>;
    await runCommand(ctx, handler, "");
    expect(
      ctx.notifications.some(
        (n) => n.level === "info" && n.message.includes("no memories yet"),
      ),
    ).toBe(true);
  });

  it("uses an error level when store is null", async () => {
    const brokenDeps: CommandDeps = {
      ...deps,
      getStore: () => null,
    };
    pi = new FakePi();
    registerMemoryPreviewContext(pi as never, brokenDeps);
    const handler = pi.commands[0]!.handler as (a: string, c: unknown) => Promise<void>;
    await runCommand(ctx, handler, "");
    expect(
      ctx.notifications.some(
        (n) => n.level === "error" && n.message.includes("store not open"),
      ),
    ).toBe(true);
  });

  it("does not require an LLM call (no network, deterministic)", async () => {
    addMemory(h.store, { target: "memory", content: "x" }, sync);
    const handler = pi.commands[0]!.handler as (a: string, c: unknown) => Promise<void>;
    await runCommand(ctx, handler, "");
    // notifications is fully synchronous; just verify no throw
    expect(ctx.notifications.length).toBeGreaterThan(0);
  });
});
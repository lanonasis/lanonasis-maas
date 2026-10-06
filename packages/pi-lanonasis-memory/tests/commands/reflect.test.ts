/**
 * reflect.test.ts — `/reflect`.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { register as registerReflect } from "../../src/commands/reflect.js";
import {
  FakeCommandCtx,
  FakePi,
  RecordingSyncAdapter,
  openTempStore,
  runCommand,
  type StoreHandle,
} from "../test-helpers.js";
import type { CommandDeps } from "../../src/commands/types.js";

describe("/reflect", () => {
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
    // Set the answer to the TUI prompt
    ctx.inputs = ["I prefer bun because it's much faster to install"];
    deps = {
      getStore: () => h.store,
      getMirror: () => ({ store: h.store }),
      getMaas: () => ({ enabled: false, async search() { return []; } }),
      getSync: () => sync,
      getInjection: () => ({ register: () => () => {} }),
      getCorrection: () => ({ register: () => () => {} }),
    };
    registerReflect(pi as never, deps);
  });
  afterEach(() => h.cleanup());

  it("registers the `reflect` command", () => {
    expect(pi.commands[0]?.name).toBe("reflect");
  });

  it("saves the reflection with auto-categorized category", async () => {
    const handler = pi.commands[0]!.handler as (a: string, c: unknown) => Promise<void>;
    await runCommand(ctx, handler, "");
    expect(h.store.stats().memories).toBe(1);
    const rec = h.store.list()[0]!;
    expect(rec.category).toBe("preference");
    expect(rec.tags).toContain("origin:explicit");
  });

  it("uses insight category when no heuristic fires", async () => {
    ctx.inputs = ["the migration reduced startup by 40 percent"];
    const handler = pi.commands[0]!.handler as (a: string, c: unknown) => Promise<void>;
    await runCommand(ctx, handler, "");
    expect(h.store.list()[0]!.category).toBe("insight");
  });

  it("uses correction category for 'actually' phrasing", async () => {
    ctx.inputs = ["actually the test was wrong about the timing"];
    const handler = pi.commands[0]!.handler as (a: string, c: unknown) => Promise<void>;
    await runCommand(ctx, handler, "");
    expect(h.store.list()[0]!.category).toBe("correction");
  });

  it("does not save on empty reflection", async () => {
    ctx.inputs = [""];
    const handler = pi.commands[0]!.handler as (a: string, c: unknown) => Promise<void>;
    await runCommand(ctx, handler, "");
    expect(h.store.stats().memories).toBe(0);
    expect(
      ctx.notifications.some(
        (n) => n.level === "info" && n.message.includes("empty reflection"),
      ),
    ).toBe(true);
  });

  it("blocks on secrets in the reflection", async () => {
    ctx.inputs = [
      "AKIAIOSFODNN7EXAMPLE wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    ];
    const handler = pi.commands[0]!.handler as (a: string, c: unknown) => Promise<void>;
    await runCommand(ctx, handler, "");
    expect(h.store.stats().memories).toBe(0);
    expect(
      ctx.notifications.some(
        (n) => n.level === "error" && n.message.includes("blocked"),
      ),
    ).toBe(true);
  });

  it("errors when store is null", async () => {
    const brokenDeps: CommandDeps = {
      ...deps,
      getStore: () => null,
    };
    pi = new FakePi();
    registerReflect(pi as never, brokenDeps);
    const handler = pi.commands[0]!.handler as (a: string, c: unknown) => Promise<void>;
    await runCommand(ctx, handler, "");
    expect(
      ctx.notifications.some(
        (n) => n.level === "error" && n.message.includes("store"),
      ),
    ).toBe(true);
  });

  it("sync enqueue fires on save", async () => {
    const handler = pi.commands[0]!.handler as (a: string, c: unknown) => Promise<void>;
    await runCommand(ctx, handler, "");
    expect(sync.calls.some((c) => c.op === "create" && c.origin === "explicit")).toBe(true);
  });
});
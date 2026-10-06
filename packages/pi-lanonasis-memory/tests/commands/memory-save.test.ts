/**
 * memory-save.test.ts — `/memory-save <text>` (alias of /memory save).
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { register as registerMemorySave, runSave } from "../../src/commands/memory-save.js";
import {
  FakeCommandCtx,
  FakePi,
  RecordingSyncAdapter,
  openTempStore,
  runCommand,
  type StoreHandle,
} from "../test-helpers.js";
import type { CommandDeps } from "../../src/commands/types.js";

describe("/memory-save", () => {
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
    registerMemorySave(pi as never, deps);
  });
  afterEach(() => h.cleanup());

  it("registers the `memory-save` command", () => {
    expect(pi.commands.length).toBe(1);
    expect(pi.commands[0]?.name).toBe("memory-save");
  });

  it("writes a memory row and notifies on success", async () => {
    const handler = pi.commands[0]!.handler as (a: string, c: unknown) => Promise<void>;
    await runCommand(ctx, handler, "remember the configuration goes here");
    expect(h.store.stats().memories).toBe(1);
    expect(
      ctx.notifications.some(
        (n) => n.level === "info" && n.message.includes("saved memory"),
      ),
    ).toBe(true);
  });

  it("blocks on secret content and notifies error", async () => {
    const handler = pi.commands[0]!.handler as (a: string, c: unknown) => Promise<void>;
    await runCommand(
      ctx,
      handler,
      "AKIAIOSFODNN7EXAMPLE wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    );
    expect(h.store.stats().memories).toBe(0);
    expect(
      ctx.notifications.some(
        (n) => n.level === "error" && n.message.includes("blocked"),
      ),
    ).toBe(true);
  });

  it("rejects empty text", async () => {
    const handler = pi.commands[0]!.handler as (a: string, c: unknown) => Promise<void>;
    await runCommand(ctx, handler, "   ");
    expect(
      ctx.notifications.some(
        (n) => n.level === "error" && n.message.includes("requires text"),
      ),
    ).toBe(true);
  });

  it("saves the entry with origin:explicit tag", async () => {
    const handler = pi.commands[0]!.handler as (a: string, c: unknown) => Promise<void>;
    await runCommand(ctx, handler, "tagged entry");
    const all = h.store.list();
    expect(all[0]?.tags).toContain("origin:explicit");
  });

  it("save helper (runSave) is callable outside the command flow", async () => {
    await runSave("hello world", ctx, deps);
    expect(h.store.stats().memories).toBe(1);
  });
});
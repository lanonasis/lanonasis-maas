/**
 * memory-interview.test.ts — `/memory-interview`.
 *
 * Three TUI questions; each saved answer becomes a memory with target=user
 * and tag 'interview'. When TUI is unavailable (no ui.input), the command
 * degrades to a single-line message.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { register as registerMemoryInterview } from "../../src/commands/memory-interview.js";
import {
  FakeCommandCtx,
  FakePi,
  RecordingSyncAdapter,
  openTempStore,
  runCommand,
  type StoreHandle,
} from "../test-helpers.js";
import type { CommandDeps } from "../../src/commands/types.js";

describe("/memory-interview", () => {
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
    // ctx.ui.input is provided by default (FakeCommandCtx stubs it)
    deps = {
      getStore: () => h.store,
      getMirror: () => ({ store: h.store }),
      getMaas: () => ({ enabled: false, async search() { return []; } }),
      getSync: () => sync,
      getInjection: () => ({ register: () => () => {} }),
      getCorrection: () => ({ register: () => () => {} }),
    };
    registerMemoryInterview(pi as never, deps);
  });
  afterEach(() => h.cleanup());

  it("registers the `memory-interview` command", () => {
    expect(pi.commands[0]?.name).toBe("memory-interview");
  });

  it("saves three user-target memories when the user answers every question", async () => {
    ctx.inputs = ["Derick", "Product Manager", "Ship Layer 1 PR4"];
    const handler = pi.commands[0]!.handler as (a: string, c: unknown) => Promise<void>;
    await runCommand(ctx, handler, "");
    expect(h.store.stats().memories).toBe(3);
    for (const rec of h.store.list()) {
      expect(rec.target).toBe("user");
      expect(rec.tags).toContain("interview");
      expect(rec.tags).toContain("origin:explicit");
    }
  });

  it("skips empty answers (no empty content stored)", async () => {
    ctx.inputs = ["", "", ""];
    const handler = pi.commands[0]!.handler as (a: string, c: unknown) => Promise<void>;
    await runCommand(ctx, handler, "");
    expect(h.store.stats().memories).toBe(0);
  });

  it("degrades gracefully when TUI is unavailable", async () => {
    // Remove the ui.input stub to simulate a non-TUI session.
    const ctx2 = new FakeCommandCtx();
    (ctx2.ui as { input?: unknown }).input = undefined;
    pi = new FakePi();
    registerMemoryInterview(pi as never, deps);
    const handler = pi.commands[0]!.handler as (a: string, c: unknown) => Promise<void>;
    await runCommand(ctx2, handler, "");
    expect(
      ctx2.notifications.some(
        (n) => n.level === "info" && n.message.includes("TTY unavailable"),
      ),
    ).toBe(true);
  });

  it("blocks answers that contain a secret (scanner gate)", async () => {
    ctx.inputs = [
      "AKIAIOSFODNN7EXAMPLE wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
      "normal",
      "normal",
    ];
    const handler = pi.commands[0]!.handler as (a: string, c: unknown) => Promise<void>;
    await runCommand(ctx, handler, "");
    // Only the two clean answers are stored.
    expect(h.store.stats().memories).toBe(2);
  });

  it("errors when store is null", async () => {
    const brokenDeps: CommandDeps = {
      ...deps,
      getStore: () => null,
    };
    pi = new FakePi();
    registerMemoryInterview(pi as never, brokenDeps);
    const handler = pi.commands[0]!.handler as (a: string, c: unknown) => Promise<void>;
    await runCommand(ctx, handler, "");
    expect(
      ctx.notifications.some(
        (n) => n.level === "error" && n.message.includes("store not open"),
      ),
    ).toBe(true);
  });
});
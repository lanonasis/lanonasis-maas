/**
 * memory-skills.test.ts — `/memory-skills [list]`.
 *
 * PR2 not yet merged → loadSkills() returns []; the command degrades to a
 * single-line 'no skills installed' message.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { register as registerMemorySkills, loadSkills } from "../../src/commands/memory-skills.js";
import {
  FakeCommandCtx,
  FakePi,
  openTempStore,
  runCommand,
  type StoreHandle,
} from "../test-helpers.js";
import type { CommandDeps } from "../../src/commands/types.js";

describe("/memory-skills", () => {
  let h: StoreHandle;
  let pi: FakePi;
  let ctx: FakeCommandCtx;
  let deps: CommandDeps;

  beforeEach(async () => {
    h = await openTempStore();
    pi = new FakePi();
    ctx = new FakeCommandCtx();
    deps = {
      getStore: () => h.store,
      getMirror: () => ({ store: h.store }),
      getMaas: () => ({ enabled: false, async search() { return []; } }),
      getSync: () => ({ enabled: false, createWorker: () => null, enqueue: () => {}, async start() {}, async stop() {}, async flush() {} }),
      getInjection: () => ({ register: () => () => {} }),
      getCorrection: () => ({ register: () => () => {} }),
    };
    registerMemorySkills(pi as never, deps);
  });
  afterEach(() => h.cleanup());

  it("registers the `memory-skills` command", () => {
    expect(pi.commands.length).toBe(1);
    expect(pi.commands[0]?.name).toBe("memory-skills");
  });

  it("returns the empty-state message when no skills exist (PR2 not merged)", async () => {
    const handler = pi.commands[0]!.handler as (a: string, c: unknown) => Promise<void>;
    await runCommand(ctx, handler, "list");
    expect(
      ctx.notifications.some(
        (n) =>
          n.level === "info" &&
          n.message.includes("no skills installed"),
      ),
    ).toBe(true);
  });

  it("rejects an unknown subcommand", async () => {
    const handler = pi.commands[0]!.handler as (a: string, c: unknown) => Promise<void>;
    await runCommand(ctx, handler, "frobnicate");
    expect(
      ctx.notifications.some(
        (n) => n.level === "error" && n.message.includes("unknown subcommand"),
      ),
    ).toBe(true);
  });

  it("loadSkills returns [] when the PR2 module is missing", async () => {
    const skills = await loadSkills();
    expect(skills).toEqual([]);
  });
});
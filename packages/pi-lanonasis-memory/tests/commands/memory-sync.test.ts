/**
 * memory-sync.test.ts — `/memory-sync status | prune` command.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { register as registerMemorySync } from "../../src/commands/memory-sync.js";
import {
  FakeCommandCtx,
  FakePi,
  type StoreHandle,
} from "../test-helpers.js";
import type { CommandDeps } from "../../src/commands/types.js";

describe("/memory-sync", () => {
  let pi: FakePi;
  let ctx: FakeCommandCtx;
  let deps: CommandDeps;

  beforeEach(() => {
    pi = new FakePi();
    ctx = new FakeCommandCtx();
    deps = {
      getStore: () => null,
      getMirror: () => null,
      getMaas: () => ({ enabled: false, async search() { return []; } }),
      getSync: () => ({
        enabled: true,
        enqueue: () => {},
        async status() {
          return { depth: 1, dropped: 2, maxDepth: 10_000, online: false, clientConfigured: true };
        },
        prune() {
          return { queued: 1, dropped: 2 };
        },
      }),
      getInjection: () => ({ register: () => () => {} }),
      getCorrection: () => ({ register: () => () => {} }),
    };
    registerMemorySync(pi as never, deps);
  });
  afterEach(() => {});

  it("registers the `memory-sync` command", () => {
    expect(pi.commands.length).toBe(1);
    expect(pi.commands[0]?.name).toBe("memory-sync");
  });

  it("status reports depth / dropped / online / configured without printing the key", async () => {
    const handler = pi.commands[0]!.handler as (a: string, c: unknown) => Promise<void>;
    await handler("", ctx);
    const msg = ctx.notifications.map((n) => n.message).join("\n");
    expect(msg).toMatch(/depth: 1\/10000/);
    expect(msg).toMatch(/dropped: 2/);
    expect(msg).toMatch(/network: offline/);
    expect(msg).toMatch(/client configured: yes/);
  });

  it("prune defaults to 30 days and clears dropped rows", async () => {
    const handler = pi.commands[0]!.handler as (a: string, c: unknown) => Promise<void>;
    await handler("prune", ctx);
    expect(ctx.notifications.some((n) => /pruned 1 queued \(>= 30d\)/.test(n.message))).toBe(true);
    expect(ctx.notifications.some((n) => /and 2 dropped rows/.test(n.message))).toBe(true);
  });

  it("prune accepts an explicit days argument", async () => {
    const handler = pi.commands[0]!.handler as (a: string, c: unknown) => Promise<void>;
    await handler("prune 7", ctx);
    expect(ctx.notifications.some((n) => />= 7d/.test(n.message))).toBe(true);
  });

  it("rejects unknown subcommand", async () => {
    const handler = pi.commands[0]!.handler as (a: string, c: unknown) => Promise<void>;
    await handler("frobnicate", ctx);
    expect(ctx.notifications.some((n) => n.level === "error" && n.message.includes("unknown subcommand"))).toBe(true);
  });

  it("degrades gracefully when status() / prune() are missing", async () => {
    deps.getSync = () => ({ enabled: false, enqueue: () => {} });
    pi = new FakePi();
    registerMemorySync(pi as never, deps);
    const handler = pi.commands[0]!.handler as (a: string, c: unknown) => Promise<void>;
    await handler("status", ctx);
    await handler("prune", ctx);
    expect(ctx.notifications.some((n) => /not available/.test(n.message))).toBe(true);
  });
});

/**
 * memory-pin.test.ts — `/memory-pin <id-or-query>`.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { register as registerMemoryPin, resolveId } from "../../src/commands/memory-pin.js";
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

describe("/memory-pin", () => {
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
    registerMemoryPin(pi as never, deps);
  });
  afterEach(() => h.cleanup());

  it("registers the `memory-pin` command", () => {
    expect(pi.commands[0]?.name).toBe("memory-pin");
  });

  it("rejects empty args with an error", async () => {
    const handler = pi.commands[0]!.handler as (a: string, c: unknown) => Promise<void>;
    await runCommand(ctx, handler, "");
    expect(
      ctx.notifications.some(
        (n) => n.level === "error" && n.message.includes("requires an id"),
      ),
    ).toBe(true);
  });

  it("pins a memory by id (UUID-shaped)", async () => {
    const { details, written } = addMemory(
      h.store,
      { target: "memory", content: "pin me" },
      sync,
    );
    expect(written).toBe(true);
    sync.calls.length = 0;

    const handler = pi.commands[0]!.handler as (a: string, c: unknown) => Promise<void>;
    await runCommand(ctx, handler, details.id!);
    const record = h.store.get(details.id!);
    expect(record?.tags).toContain("pinned");
    // update enqueue fired
    expect(sync.calls.some((c) => c.op === "update")).toBe(true);
  });

  it("unpins a memory on a second invocation (toggle)", async () => {
    const { details } = addMemory(
      h.store,
      { target: "memory", content: "pin me" },
      sync,
    );
    const handler = pi.commands[0]!.handler as (a: string, c: unknown) => Promise<void>;
    await runCommand(ctx, handler, details.id!);
    expect(h.store.get(details.id!)?.tags).toContain("pinned");
    await runCommand(ctx, handler, details.id!);
    expect(h.store.get(details.id!)?.tags ?? []).not.toContain("pinned");
  });

  it("pins by search query (top hit)", async () => {
    addMemory(h.store, { target: "memory", content: "the fox ran quickly" }, sync);
    const handler = pi.commands[0]!.handler as (a: string, c: unknown) => Promise<void>;
    await runCommand(ctx, handler, "fox");
    expect(
      h.store.list().some((r) => r.tags?.includes("pinned") ?? false),
    ).toBe(true);
  });

  it("errors when neither id nor query matches", async () => {
    const handler = pi.commands[0]!.handler as (a: string, c: unknown) => Promise<void>;
    await runCommand(ctx, handler, "absolutely-unmatched-query");
    expect(
      ctx.notifications.some(
        (n) => n.level === "error" && n.message.includes("no memory matched"),
      ),
    ).toBe(true);
  });

  it("catches thrown errors from the store layer", async () => {
    const brokenDeps: CommandDeps = {
      ...deps,
      getStore: () => {
        throw new Error("store-closed");
      },
    };
    pi = new FakePi();
    registerMemoryPin(pi as never, brokenDeps);
    const handler = pi.commands[0]!.handler as (a: string, c: unknown) => Promise<void>;
    await runCommand(ctx, handler, "anything");
    expect(
      ctx.notifications.some(
        (n) => n.level === "error" && n.message.includes("store-closed"),
      ),
    ).toBe(true);
  });

  it("resolveId helper: returns existing id when arg looks UUID-shaped", async () => {
    const { details } = addMemory(h.store, { target: "memory", content: "x" }, sync);
    const id = await resolveId(h.store, deps, details.id!);
    expect(id).toBe(details.id);
  });

  it("resolveId helper: returns null when nothing matches", async () => {
    const id = await resolveId(h.store, deps, "absolutely-unmatched");
    expect(id).toBeNull();
  });
});
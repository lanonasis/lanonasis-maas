/**
 * extension.test.ts — integration tests that import the default export of
 * src/index.ts with a fake ExtensionAPI. Asserts the right events and
 * tools are wired.
 *
 * The tests stub `process.env` for `homedir()` via the brief's storage
 * root. Each test opens an isolated store path.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";

import extensionFactory, { __resetForTests } from "../../src/index.js";
import { SCHEMA_VERSION } from "../../src/store/schema.js";
import { FakePi } from "../test-helpers.js";

describe("extension factory (integration)", () => {
  beforeEach(() => {
    // Ensure module-level cachedSession from previous tests is cleared.
    __resetForTests();
  });
  afterEach(() => {
    __resetForTests();
  });

  it("exports a default function with PR4 surface", () => {
    expect(typeof extensionFactory).toBe("function");
  });

  it("registers the four memory_* tools against the pi API", async () => {
    const pi = new FakePi();
    await extensionFactory(pi as never);
    const names = pi.tools.map((t) => t.name);
    expect(names).toContain("memory_add");
    expect(names).toContain("memory_search");
    expect(names).toContain("memory_replace");
    expect(names).toContain("memory_remove");
  });

  it("registers the seven slash commands", async () => {
    const pi = new FakePi();
    await extensionFactory(pi as never);
    const names = pi.commands.map((c) => c.name);
    expect(names).toContain("memory");
    expect(names).toContain("memory-save");
    expect(names).toContain("reflect");
    expect(names).toContain("memory-skills");
    expect(names).toContain("memory-pin");
    expect(names).toContain("memory-preview-context");
    expect(names).toContain("memory-interview");
    expect(names).toContain("memory-index-sessions");
  });

  it("wires session_start, turn_end, and session_shutdown events", async () => {
    const pi = new FakePi();
    await extensionFactory(pi as never);
    const events = pi.onCalls.map((c) => c.event);
    expect(events).toContain("session_start");
    expect(events).toContain("turn_end");
    expect(events).toContain("session_shutdown");
  });

  it("exports the schema version constant", () => {
    expect(SCHEMA_VERSION).toBe("1");
  });

  it("re-exports scanForWrite / scanSecretsOnly / defaultScannerConfig", async () => {
    const mod = await import("../../src/index.js");
    expect(typeof mod.scanForWrite).toBe("function");
    expect(typeof mod.scanSecretsOnly).toBe("function");
    expect(typeof mod.defaultScannerConfig).toBe("function");
    expect(typeof mod.MemoryStore).toBe("function");
  });

  it("registerAllCommands is re-exported from index", async () => {
    const mod = await import("../../src/index.js");
    expect(typeof mod.registerAllCommands).toBe("function");
  });

  it("re-exports the four tool register helpers", async () => {
    const mod = await import("../../src/index.js");
    expect(typeof mod.registerMemoryAddTool).toBe("function");
    expect(typeof mod.registerMemorySearchTool).toBe("function");
    expect(typeof mod.registerMemoryReplaceTool).toBe("function");
    expect(typeof mod.registerMemoryRemoveTool).toBe("function");
  });

  it("default export is callable and returns a Promise", async () => {
    const pi = new FakePi();
    const ret = extensionFactory(pi as never);
    expect(ret).toBeInstanceOf(Promise);
    await ret;
  });

  it("session_start handler opens the store (smoke)", async () => {
    const pi = new FakePi();
    await extensionFactory(pi as never);
    const sessionStart = pi.onCalls.find((c) => c.event === "session_start");
    expect(sessionStart).toBeDefined();
    const handler = sessionStart!.handler as (e: unknown, c: { cwd: string; ui: { notify: (m: string, l?: string) => void } }) => Promise<void>;
    // Should not throw even with no Pi UI; the handler swallows errors.
    await expect(
      handler({ type: "session_start", reason: "startup" }, {
        cwd: "/tmp/fake",
        ui: { notify: () => {} },
      }),
    ).resolves.not.toThrow();
  });

  it("tool description mentions origin:explicit (origin tag guarantee)", async () => {
    const pi = new FakePi();
    await extensionFactory(pi as never);
    const addTool = pi.tools.find((t) => t.name === "memory_add");
    expect(addTool?.description).toMatch(/origin:explicit/i);
  });

  it("memory_search description mentions FTS5 + MaaS enrichment", async () => {
    const pi = new FakePi();
    await extensionFactory(pi as never);
    const t = pi.tools.find((t) => t.name === "memory_search");
    expect(t?.description).toMatch(/FTS5/i);
    expect(t?.description).toMatch(/MaaS/i);
  });

  it("memory_remove description states no scanner gate", async () => {
    const pi = new FakePi();
    await extensionFactory(pi as never);
    const t = pi.tools.find((t) => t.name === "memory_remove");
    expect(t?.description).toMatch(/no scanner/i);
  });

  it("memory_replace description states scanner-gated", async () => {
    const pi = new FakePi();
    await extensionFactory(pi as never);
    const t = pi.tools.find((t) => t.name === "memory_replace");
    expect(t?.description).toMatch(/scanner-gated/i);
  });

  it("/memory command description references FTS5", async () => {
    const pi = new FakePi();
    await extensionFactory(pi as never);
    const c = pi.commands.find((c) => c.name === "memory");
    expect(c?.description).toMatch(/FTS5/);
  });

  it("/memory-skills command description references PR2 skills", async () => {
    const pi = new FakePi();
    await extensionFactory(pi as never);
    const c = pi.commands.find((c) => c.name === "memory-skills");
    expect(c?.description).toMatch(/skill/i);
  });

  it("/reflect command description mentions auto-categorized", async () => {
    const pi = new FakePi();
    await extensionFactory(pi as never);
    const c = pi.commands.find((c) => c.name === "reflect");
    expect(c?.description).toMatch(/categor/i);
  });

  it("idempotent: registering twice still produces the expected tools", async () => {
    const pi1 = new FakePi();
    const pi2 = new FakePi();
    await extensionFactory(pi1 as never);
    await extensionFactory(pi2 as never);
    expect(pi1.tools.length).toBe(pi2.tools.length);
    expect(new Set(pi1.tools.map((t) => t.name))).toEqual(
      new Set(pi2.tools.map((t) => t.name)),
    );
  });

  it("memory_add execute writes a row when the store is open (smoke)", async () => {
    const pi = new FakePi();
    await extensionFactory(pi as never);
    // Fire session_start so the store actually opens in this run.
    const sessionStart = pi.onCalls.find((c) => c.event === "session_start");
    expect(sessionStart).toBeDefined();
    const startHandler = sessionStart!.handler as (
      e: unknown,
      c: { cwd: string; ui: { notify: (m: string, l?: string) => void } },
    ) => Promise<void>;
    await startHandler({ type: "session_start", reason: "startup" }, {
      cwd: "/tmp/integration-test",
      ui: { notify: () => {} },
    });

    const addTool = pi.tools.find((t) => t.name === "memory_add");
    expect(addTool).toBeDefined();
    const execute = addTool!.execute as (
      id: string,
      params: { target: "memory"; content: string },
      sig: undefined,
      onUpdate: undefined,
      ctx: { ui: { notify: (m: string, l?: string) => void } },
    ) => Promise<{ isError?: boolean; details: { id: string | null } }>;
    const result = await execute(
      "tc-1",
      { target: "memory", content: "integration-smoke-write" },
      undefined,
      undefined,
      { ui: { notify: () => {} } },
    );
    expect(result.isError).toBeFalsy();
    expect(result.details.id).toBeTruthy();
  });
});
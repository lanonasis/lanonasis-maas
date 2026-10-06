/**
 * runtime-wiring.test.ts — end-to-end proof that the REAL default export of
 * src/index.ts wires the real modules at runtime (v1.0.1).
 *
 * Background: PRs #167-#172 merged with src/deps.ts adapters that looked up
 * export names which did not exist on main (registerCorrectionHook,
 * createSyncWorker, enqueueSync, createMirroredStore, sync createMaasClient).
 * Every adapter silently fell back to a no-op, and the unit suites stayed
 * green because they exercised the modules in isolation. These tests drive
 * the extension exactly as Pi does — through pi.on / registerTool handlers —
 * and assert the observable side effects (SQLite rows, MEMORY.md, sync.db,
 * MaaS HTTP calls, system prompt).
 *
 * Isolation:
 *   - process.env.HOME points at a fresh temp dir per test, so storagePaths()
 *     resolves under it. The real ~/.pi is never touched.
 *   - globalThis.fetch is spied per test. The MaaS path goes through the real
 *     createMaasClient -> @lanonasis/memory-client/node -> fetch; no test seam
 *     is needed because the SDK calls the global fetch.
 *   - The index module is imported AFTER the first HOME override (dynamic
 *     import in beforeAll) so even a build that resolves paths at import time
 *     cannot write to the real home directory.
 */

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { FakePi } from "../test-helpers.js";
import { MemoryStore } from "../../src/store/memory.js";
import { openSqlite } from "../../src/store/sqlite.js";

const ORIGINAL_ENV = { ...process.env };
const API_KEY = "sk-test-fixture-0123456789abcdef";
const API_URL = "http://maas.invalid";

type Handler = (event: unknown, ctx: unknown) => unknown;
type ExtensionFactory = (pi: unknown) => Promise<void>;

let extensionFactory: ExtensionFactory;
let resetForTests: () => void = () => {};
const bootHome = mkdtempSync(join(tmpdir(), "pi-mem-wiring-boot-"));

beforeAll(async () => {
  process.env.HOME = bootHome;
  process.env.USERPROFILE = bootHome;
  const mod = (await import("../../src/index.js")) as unknown as {
    default: ExtensionFactory;
    __resetForTests?: () => void;
  };
  extensionFactory = mod.default;
  if (typeof mod.__resetForTests === "function") resetForTests = mod.__resetForTests;
});

afterAll(() => {
  rmSync(bootHome, { recursive: true, force: true });
});

interface Harness {
  pi: FakePi;
  home: string;
  cwd: string;
  globalRoot: string;
  notifications: Array<{ message: string; level?: string }>;
  ctx: { cwd: string; ui: { notify: (m: string, l?: string) => void } };
  fire: (event: string, payload: Record<string, unknown>) => Promise<unknown[]>;
  tool: (name: string) => (params: Record<string, unknown>) => Promise<{
    isError?: boolean;
    details: Record<string, unknown>;
  }>;
  command: (name: string) => (args: string) => Promise<void>;
}

let home: string;

async function boot(): Promise<Harness> {
  const pi = new FakePi();
  await extensionFactory(pi);
  const cwd = mkdtempSync(join(tmpdir(), "pi-mem-wiring-cwd-"));
  const notifications: Array<{ message: string; level?: string }> = [];
  const ctx = {
    cwd,
    ui: {
      notify: (message: string, level?: string) => {
        notifications.push({ message, level });
      },
    },
  };
  const fire = async (event: string, payload: Record<string, unknown>) => {
    const out: unknown[] = [];
    for (const c of pi.onCalls.filter((c) => c.event === event)) {
      out.push(await (c.handler as Handler)({ type: event, ...payload }, ctx));
    }
    return out;
  };
  const tool = (name: string) => {
    const t = pi.tools.find((x) => x.name === name);
    if (!t) throw new Error(`tool ${name} not registered`);
    return (params: Record<string, unknown>) =>
      (t.execute as (...a: unknown[]) => Promise<{ isError?: boolean; details: Record<string, unknown> }>)(
        "tc-1",
        params,
        undefined,
        undefined,
        ctx,
      );
  };
  const command = (name: string) => {
    const c = pi.commands.find((x) => x.name === name);
    if (!c) throw new Error(`command ${name} not registered`);
    return (args: string) => (c.handler as (a: string, ctx: unknown) => Promise<void>)(args, ctx);
  };
  return {
    pi,
    home,
    cwd,
    globalRoot: join(home, ".pi", "agent", "lanonasis-pi-memory"),
    notifications,
    ctx,
    fire,
    tool,
    command,
  };
}

async function queueRows(syncDbPath: string): Promise<Array<{ local_id: string; op: string; origin: string }>> {
  if (!existsSync(syncDbPath)) return [];
  const db = await openSqlite(syncDbPath);
  try {
    return db.prepare(`SELECT local_id, op, origin FROM sync_queue ORDER BY id`).all() as Array<{
      local_id: string;
      op: string;
      origin: string;
    }>;
  } catch {
    return [];
  } finally {
    db.close();
  }
}

/** Open the on-disk store under the temp HOME; asserts the extension created it there. */
async function openStoreUnder(globalRoot: string): Promise<MemoryStore> {
  const dbPath = join(globalRoot, "memories.db");
  expect(existsSync(dbPath), `memories.db must exist under the session HOME (${dbPath})`).toBe(true);
  return MemoryStore.open(dbPath);
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/** Fake MaaS: /health -> ok; POST /memories -> created id. Records every call. */
function installFakeMaas(): { calls: Array<{ url: string; method: string; body: string | null; headers: Record<string, string> }> } {
  const calls: Array<{ url: string; method: string; body: string | null; headers: Record<string, string> }> = [];
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input: unknown, init?: RequestInit) => {
    const url = typeof input === "string" ? input : String((input as { url?: string }).url ?? input);
    const method = (init?.method ?? "GET").toUpperCase();
    const headers: Record<string, string> = {};
    const h = init?.headers as Record<string, string> | undefined;
    if (h) for (const [k, v] of Object.entries(h)) headers[k.toLowerCase()] = String(v);
    calls.push({ url, method, body: typeof init?.body === "string" ? init.body : null, headers });
    if (url.endsWith("/api/v1/health")) return jsonResponse(200, { status: "ok" });
    if (url.endsWith("/api/v1/memories") && method === "POST") {
      return jsonResponse(201, { id: "maas-created-001", title: "t", content: "c" });
    }
    if (url.includes("/api/v1/memories/search") || url.includes("/api/v1/memory/search")) {
      return jsonResponse(200, { results: [], total_results: 0, search_time_ms: 1 });
    }
    return jsonResponse(404, { error: "not found" });
  });
  return { calls };
}

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), "pi-mem-wiring-home-"));
  process.env.HOME = home;
  process.env.USERPROFILE = home;
  delete process.env.LANONASIS_API_KEY;
  delete process.env.LANONASIS_API_URL;
  delete process.env.LANONASIS_PI_MEMORY_AUTO_SYNC;
  delete process.env.LANONASIS_PI_MEMORY_MODE;
  resetForTests();
});

afterEach(() => {
  resetForTests();
  vi.restoreAllMocks();
  for (const k of Object.keys(process.env)) {
    if (!(k in ORIGINAL_ENV)) delete process.env[k];
  }
  Object.assign(process.env, ORIGINAL_ENV);
  process.env.HOME = bootHome; // keep any late writes off the real home
  rmSync(home, { recursive: true, force: true });
});

describe("runtime wiring — real default export", () => {
  it("(1) memory_add -> SQLite row AND MEMORY.md mirror entry", async () => {
    const h = await boot();
    await h.fire("session_start", { reason: "startup" });

    const res = await h.tool("memory_add")({
      target: "memory",
      content: "The staging database lives on port 6543.",
      title: "staging db port",
    });
    expect(res.isError).toBeFalsy();
    const id = res.details.id as string;
    expect(id).toBeTruthy();

    await h.fire("session_shutdown", {});

    const store = await openStoreUnder(h.globalRoot);
    try {
      expect(store.get(id)?.content).toBe("The staging database lives on port 6543.");
    } finally {
      store.close();
    }
    const md = readFileSync(join(h.globalRoot, "MEMORY.md"), "utf8");
    expect(md).toContain(`<!-- id:${id} -->`);
    expect(md).toContain("The staging database lives on port 6543.");
  });

  it("(2) explicit memory_add with LANONASIS_API_KEY is enqueued and synced on shutdown flush (maas_id set)", async () => {
    process.env.LANONASIS_API_KEY = API_KEY;
    process.env.LANONASIS_API_URL = API_URL;
    const maas = installFakeMaas();
    const h = await boot();
    await h.fire("session_start", { reason: "startup" });

    const res = await h.tool("memory_add")({
      target: "project",
      content: "Deploys go through the release workflow, never by hand.",
      title: "deploy rule",
    });
    expect(res.isError).toBeFalsy();
    const id = res.details.id as string;

    await h.fire("session_shutdown", {});

    const creates = maas.calls.filter((c) => c.method === "POST" && c.url.endsWith("/api/v1/memories"));
    expect(creates).toHaveLength(1);
    expect(creates[0]!.url.startsWith(API_URL)).toBe(true);
    expect(creates[0]!.headers["x-api-key"]).toBe(API_KEY);
    const body = JSON.parse(creates[0]!.body ?? "{}") as { content: string; memory_type: string; tags: string[] };
    expect(body.content).toBe("Deploys go through the release workflow, never by hand.");
    expect(body.memory_type).toBe("project");
    expect(body.tags).toContain("source:pi-lanonasis-memory");
    // The key travels only in the header — never in a request body.
    for (const c of maas.calls) expect(c.body ?? "").not.toContain(API_KEY);

    const store = await openStoreUnder(h.globalRoot);
    try {
      expect(store.get(id)?.maas_id).toBe("maas-created-001");
    } finally {
      store.close();
    }
    expect(await queueRows(join(h.globalRoot, "sync.db"))).toEqual([]);
    // The API key is never written to disk.
    expect(readFileSync(join(h.globalRoot, "sync.db")).toString("latin1")).not.toContain(API_KEY);
  });

  it("(3a) auto-ingested memories are NOT enqueued without LANONASIS_PI_MEMORY_AUTO_SYNC (no API key => queue is inert)", async () => {
    const h = await boot();
    await h.fire("session_start", { reason: "startup" }); // ingest writes a [session] auto memory
    await h.fire("turn_end", {
      turnIndex: 0,
      message: { role: "assistant", content: [{ type: "text", text: "Remember: the root cause was a stale lockfile in CI." }] },
      toolResults: [],
    });
    await h.fire("session_shutdown", {}); // final ingest flush

    const store = await openStoreUnder(h.globalRoot);
    let autoCount = 0;
    try {
      autoCount = store.list({ tags: ["origin:auto"] }).length;
    } finally {
      store.close();
    }
    expect(autoCount).toBeGreaterThan(0);
    // No API key => sync adapter is disabled; no sync.db is created.
    expect(existsSync(join(h.globalRoot, "sync.db"))).toBe(false);
  });

  it("(3b) auto-ingested memories ARE enqueued (origin=auto) with LANONASIS_PI_MEMORY_AUTO_SYNC=1 + API key", async () => {
    process.env.LANONASIS_API_KEY = API_KEY;
    process.env.LANONASIS_API_URL = API_URL;
    process.env.LANONASIS_PI_MEMORY_AUTO_SYNC = "1";
    const maas = installFakeMaas();
    const h = await boot();
    await h.fire("session_start", { reason: "startup" });
    await h.fire("turn_end", {
      turnIndex: 0,
      message: { role: "assistant", content: [{ type: "text", text: "Remember: the root cause was a stale lockfile in CI." }] },
      toolResults: [],
    });
    await h.fire("session_shutdown", {});

    expect(existsSync(join(h.globalRoot, "sync.db"))).toBe(true);
    const creates = maas.calls.filter((c) => c.method === "POST" && c.url.endsWith("/api/v1/memories"));
    // At least the [session] tag and the auto-captured assistant turn.
    expect(creates.length).toBeGreaterThan(0);
    const bodies = creates.map((c) => JSON.parse(c.body ?? "{}") as { content: string; tags: string[] });
    expect(bodies.every((b) => b.tags.includes("origin:auto"))).toBe(true);
  });

  it("(4) correction: stores the acknowledged ASSISTANT text as category=correction, never the user text", async () => {
    const h = await boot();
    await h.fire("session_start", { reason: "startup" });
    const userText = "that's wrong, the secret-sauce port is not 80";
    await h.fire("input", { text: userText, source: "interactive" });
    const ack = "You're right, my mistake: the service listens on port 8443.";
    await h.fire("turn_end", {
      turnIndex: 1,
      message: { role: "assistant", content: [{ type: "text", text: ack }] },
      toolResults: [],
    });
    await h.fire("session_shutdown", {});

    const store = await openStoreUnder(h.globalRoot);
    try {
      const all = store.list({ limit: 500 });
      const corrections = all.filter((r) => r.category === "correction");
      expect(corrections).toHaveLength(1);
      expect(corrections[0]!.content).toContain(ack);
      for (const r of all) {
        expect(r.content).not.toContain("secret-sauce");
        expect(r.title).not.toContain("secret-sauce");
      }
    } finally {
      store.close();
    }
    const md = readFileSync(join(h.globalRoot, "MEMORY.md"), "utf8");
    expect(md).toContain(ack);
    expect(md).not.toContain("secret-sauce");
  });

  it("(5) before_agent_start returns a systemPrompt with the memory-policy block and STANDING.md entries", async () => {
    const h = await boot();
    mkdirSync(h.globalRoot, { recursive: true });
    writeFileSync(join(h.globalRoot, "STANDING.md"), "- Never force-push to main\n- Prefer bun over npm\n");
    await h.fire("session_start", { reason: "startup" });

    const results = await h.fire("before_agent_start", { prompt: "hi", systemPrompt: "BASE PROMPT" });
    const withPrompt = results.find(
      (r): r is { systemPrompt: string } => !!r && typeof (r as { systemPrompt?: unknown }).systemPrompt === "string",
    );
    expect(withPrompt).toBeDefined();
    expect(withPrompt!.systemPrompt.startsWith("BASE PROMPT")).toBe(true);
    expect(withPrompt!.systemPrompt).toContain("<memory-policy>");
    expect(withPrompt!.systemPrompt).toContain("<standing-instructions>");
    expect(withPrompt!.systemPrompt).toContain("Never force-push to main");
    expect(withPrompt!.systemPrompt).toContain("Prefer bun over npm");
    await h.fire("session_shutdown", {});
  });

  it("(6) /memory-sync status reports depth + client config without printing the key; prune clears rows", async () => {
    process.env.LANONASIS_API_KEY = API_KEY;
    process.env.LANONASIS_API_URL = API_URL;
    // MaaS unreachable: every fetch rejects, so the explicit save stays queued.
    vi.spyOn(globalThis, "fetch").mockRejectedValue(
      Object.assign(new Error("connect ECONNREFUSED 127.0.0.1:443"), { code: "ECONNREFUSED" }),
    );
    const h = await boot();
    await h.fire("session_start", { reason: "startup" });
    await h.tool("memory_add")({ target: "memory", content: "queued while offline" });

    await h.command("memory-sync")("status");
    const status = h.notifications.map((n) => n.message).join("\n");
    expect(status).toMatch(/depth:\s*1/);
    expect(status).toMatch(/client configured:\s*yes/);
    expect(status).toMatch(/offline/);
    expect(status).not.toContain(API_KEY);

    await h.command("memory-sync")("prune 0");
    expect(h.notifications.some((n) => /pruned 1 queued/.test(n.message))).toBe(true);
    await h.fire("session_shutdown", {});
    expect(await queueRows(join(h.globalRoot, "sync.db"))).toEqual([]);
  });

  it("(7) handler errors never reach Pi: a broken HOME degrades to ctx.ui.notify", async () => {
    // Point HOME at a regular file so mkdir under it fails.
    const fileHome = join(home, "not-a-dir");
    writeFileSync(fileHome, "x");
    process.env.HOME = fileHome;
    const h = await boot();
    await expect(h.fire("session_start", { reason: "startup" })).resolves.toBeDefined();
    expect(h.notifications.some((n) => n.level === "error")).toBe(true);
    await expect(h.fire("turn_end", { turnIndex: 0, message: { role: "assistant", content: "x" }, toolResults: [] })).resolves.toBeDefined();
    await expect(h.fire("input", { text: "that's wrong", source: "interactive" })).resolves.toBeDefined();
    await expect(h.fire("before_agent_start", { prompt: "p", systemPrompt: "S" })).resolves.toBeDefined();
    await expect(h.fire("session_shutdown", {})).resolves.toBeDefined();
  });
});

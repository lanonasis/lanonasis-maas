/**
 * worker.test.ts — SyncWorker end-to-end against a fake MaasClient.
 *
 * SyncWorker drains the queue at a steady cadence (default 1/s), hands
 * each row to MaasClient.{create,update,delete}, and invokes
 * `onSynced(localId, maasId)` when a row succeeds. Failures funnel
 * through the queue's markFailed, which honours the documented 4xx-drop
 * vs 5xx-retry contract.
 *
 * Each test uses a fresh queue + client so failures can't bleed
 * between cases.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { SyncQueue } from "../../src/sync/sync-queue.js";
import { SyncWorker } from "../../src/sync/worker.js";
import { HealthMonitor } from "../../src/sync/health.js";
import type { MaasClient } from "../../src/sync/maas-client.js";

let tmp: string;
let queue: SyncQueue;
let health: HealthMonitor;
let onSynced: ReturnType<typeof vi.fn>;
let worker: SyncWorker;
let fake: MaasClient;

beforeEach(async () => {
  tmp = mkdtempSync(join(tmpdir(), "pi-mem-worker-"));
  queue = await SyncQueue.open(join(tmp, "sync.db"));
  onSynced = vi.fn();
});

afterEach(async () => {
  await worker?.stop();
  health?.stop();
  await queue.close();
  if (existsSync(tmp)) rmSync(tmp, { recursive: true, force: true });
});

function makeFake(behaviour: Partial<MaasClient>): MaasClient {
  return {
    health: async () => true,
    create: async () => ({ ok: true, maasId: "maas-1" }),
    update: async () => ({ ok: true, maasId: "maas-1" }),
    delete: async () => ({ ok: true, maasId: "maas-1" }),
    ...behaviour,
  };
}

function buildWorker(behaviour: Partial<MaasClient>, options?: { intervalMs?: number; online?: boolean; healthIntervalMs?: number }) {
  fake = makeFake(behaviour);
  health = new HealthMonitor({
    client: fake,
    getDepth: () => queue.depth(),
    intervalMs: options?.healthIntervalMs ?? 30, // fast tick for tests
  });
  // Force the online state without waiting for a real probe.
  if (options?.online === false) {
    // skip start() so isOnline() stays false
  } else {
    health.start();
    // Fire a probe immediately so the worker doesn't have to wait
    // for the first interval to elapse.
    void health.tick();
  }
  worker = new SyncWorker({
    queue,
    client: fake,
    health,
    onSynced,
    intervalMs: options?.intervalMs ?? 30,
  });
  return worker;
}

describe("sync/worker — drain cadence", () => {
  it("drains a single enqueued create at 1 per interval", async () => {
    queue.enqueue({
      localId: "l-1",
      op: "create",
      payload: { title: "t", content: "c", tags: [], type: "memory" },
      origin: "explicit",
    });
    buildWorker({});
    worker.start();

    // Wait long enough for at least one tick to fire.
    await new Promise((r) => setTimeout(r, 150));
    expect(onSynced).toHaveBeenCalledWith("l-1", "maas-1");
    expect(queue.depth()).toBe(0);
  });

  it("drains three items in FIFO order over multiple ticks", async () => {
    queue.enqueue({ localId: "a", op: "create", payload: { title: "a", content: "a", tags: [], type: "memory" }, origin: "explicit" });
    queue.enqueue({ localId: "b", op: "create", payload: { title: "b", content: "b", tags: [], type: "memory" }, origin: "explicit" });
    queue.enqueue({ localId: "c", op: "create", payload: { title: "c", content: "c", tags: [], type: "memory" }, origin: "explicit" });
    buildWorker({});
    worker.start();
    await new Promise((r) => setTimeout(r, 400));
    const calls = onSynced.mock.calls.map((c) => c[0]);
    expect(calls).toEqual(["a", "b", "c"]);
    expect(queue.depth()).toBe(0);
  });

  it("does NOT drain while health.isOnline() === false", async () => {
    queue.enqueue({ localId: "l-1", op: "create", payload: { title: "t", content: "c", tags: [], type: "memory" }, origin: "explicit" });
    buildWorker({}, { online: false });
    worker.start();
    await new Promise((r) => setTimeout(r, 200));
    expect(onSynced).not.toHaveBeenCalled();
    expect(queue.depth()).toBe(1);
  });
});

describe("sync/worker — error handling", () => {
  it("a 4xx from create() drops the row and does NOT call onSynced", async () => {
    queue.enqueue({ localId: "bad", op: "create", payload: { title: "t", content: "c", tags: [], type: "memory" }, origin: "explicit" });
    buildWorker({ create: async () => ({ ok: false, status: 400, error: "bad request" }) });
    worker.start();
    await new Promise((r) => setTimeout(r, 150));
    expect(onSynced).not.toHaveBeenCalled();
    expect(queue.depth()).toBe(0); // dropped
  });

  it("a 5xx from create() leaves the row in the queue with attempts++", async () => {
    queue.enqueue({ localId: "flaky", op: "create", payload: { title: "t", content: "c", tags: [], type: "memory" }, origin: "explicit" });
    buildWorker({ create: async () => ({ ok: false, status: 503, error: "down" }) });
    worker.start();
    await new Promise((r) => setTimeout(r, 150));
    expect(onSynced).not.toHaveBeenCalled();
    expect(queue.depth()).toBe(1);
  });

  it("a thrown error from create() is caught and reported as retryable", async () => {
    queue.enqueue({ localId: "boom", op: "create", payload: { title: "t", content: "c", tags: [], type: "memory" }, origin: "explicit" });
    buildWorker({
      create: async () => { throw new Error("ECONNREFUSED"); },
    });
    // Silence the noisy unhandled-rejection log for this case.
    const handler = (_err: Error) => undefined;
    process.once("unhandledRejection", handler);
    worker.start();
    await new Promise((r) => setTimeout(r, 150));
    expect(onSynced).not.toHaveBeenCalled();
    expect(queue.depth()).toBe(1);
    process.off("unhandledRejection", handler);
  });
});

describe("sync/worker — flush()", () => {
  it("flush() drains the queue as fast as allowed until empty or timeout", async () => {
    for (let i = 0; i < 5; i++) {
      queue.enqueue({ localId: `f-${i}`, op: "create", payload: { title: "t", content: "c", tags: [], type: "memory" }, origin: "explicit" });
    }
    buildWorker({});
    // Don't start the worker — flush() runs synchronously.
    await worker.flush(1000);
    expect(queue.depth()).toBe(0);
    expect(onSynced).toHaveBeenCalledTimes(5);
  });

  it("flush() respects the timeout when the queue cannot drain", async () => {
    // Always-5xx means the queue keeps refilling via markFailed's
    // attempts++ — flush() must time out instead of looping forever.
    for (let i = 0; i < 3; i++) {
      queue.enqueue({ localId: `t-${i}`, op: "create", payload: { title: "t", content: "c", tags: [], type: "memory" }, origin: "explicit" });
    }
    buildWorker({ create: async () => ({ ok: false, status: 503, error: "down" }) });
    const start = Date.now();
    await worker.flush(120);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(500);
    expect(queue.depth()).toBeGreaterThan(0); // still retrying
  });
});

describe("sync/worker — offline accumulates, online drains", () => {
  it("enqueue-while-offline → start-when-online drains everything in order", async () => {
    // Build worker with health unstarted → starts offline.
    queue.enqueue({ localId: "off-1", op: "create", payload: { title: "t", content: "c", tags: [], type: "memory" }, origin: "explicit" });
    queue.enqueue({ localId: "off-2", op: "create", payload: { title: "t", content: "c", tags: [], type: "memory" }, origin: "explicit" });
    buildWorker({}, { online: false });
    worker.start();
    await new Promise((r) => setTimeout(r, 200));
    expect(onSynced).not.toHaveBeenCalled();
    expect(queue.depth()).toBe(2);

    // Go online and let the worker pick them up.
    health.start();
    await new Promise((r) => setTimeout(r, 70)); // one tick
    health.start(); // ensure timer is up
    await new Promise((r) => setTimeout(r, 250));
    expect(onSynced.mock.calls.map((c) => c[0])).toEqual(["off-1", "off-2"]);
  });
});

describe("sync/worker — bounded shutdown (CodeRabbit: shutdown deadline)", () => {
  const hang = () => new Promise<never>(() => {});

  it("flush(timeoutMs) returns by the deadline even when a periodic push is stalled in flight", async () => {
    queue.enqueue({ localId: "hang-1", op: "create", payload: { title: "t", content: "c", tags: [], type: "memory" }, origin: "explicit" });
    buildWorker({ create: hang });
    void worker.tick(); // periodic push now stuck in flight
    await new Promise((r) => setTimeout(r, 20));
    const start = Date.now();
    await worker.flush(150);
    expect(Date.now() - start).toBeLessThan(600);
  });

  it("flush(timeoutMs) returns by the deadline when its own push stalls", async () => {
    queue.enqueue({ localId: "hang-2", op: "create", payload: { title: "t", content: "c", tags: [], type: "memory" }, origin: "explicit" });
    buildWorker({ create: hang });
    const start = Date.now();
    const pushed = await worker.flush(150);
    expect(Date.now() - start).toBeLessThan(600);
    expect(pushed).toBe(0);
  });

  it("stop() after a timed-out flush does not wait again for the stalled push", async () => {
    queue.enqueue({ localId: "hang-3", op: "create", payload: { title: "t", content: "c", tags: [], type: "memory" }, origin: "explicit" });
    buildWorker({ create: hang });
    worker.start();
    await worker.flush(100);
    const start = Date.now();
    await worker.stop();
    expect(Date.now() - start).toBeLessThan(200);
  });

  it("the periodic loop does not start new pushes once a flush has begun", async () => {
    for (let i = 0; i < 3; i++) {
      queue.enqueue({ localId: `p-${i}`, op: "create", payload: { title: "t", content: "c", tags: [], type: "memory" }, origin: "explicit" });
    }
    let calls = 0;
    buildWorker({ create: async () => { calls++; return { ok: true, maasId: `m-${calls}` }; } }, { intervalMs: 5 });
    worker.start();
    await worker.flush(1000);
    await new Promise((r) => setTimeout(r, 40));
    expect(calls).toBe(3); // each row pushed exactly once
    expect(queue.depth()).toBe(0);
  });
});

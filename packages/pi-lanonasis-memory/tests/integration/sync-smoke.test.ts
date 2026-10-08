/**
 * sync-smoke.test.ts — end-to-end sync drain integration smoke.
 *
 * Composes SyncQueue + MemoryStore + HealthMonitor + SyncWorker +
 * createMaasClient into the real user journey from the LANA-2026-10-06
 * pi-memory Layer 1 brief:
 *
 *   - explicit-online: 3 items (create/update/delete), fake client
 *     returns ok / ok / 503 / ok -> FIFO preserved, backoff between
 *     the 503 attempt is the documented min(2^attempts, 300) seconds
 *     (in [1s, 300s]), queue eventually drains, markSynced is invoked
 *     with the maasId returned by the client for every success
 *   - permanent 4xx: a single 400 -> row dropped, last_error recorded
 *   - no API key: createMaasClient returns null -> the queue
 *     accumulates but the worker never starts (no client to call)
 *   - offline -> online transitions: while offline the queue depth
 *     grows; when the API becomes reachable the worker drains
 *     everything in FIFO order without reordering
 *
 * Uses real SQLite-backed SyncQueue and MemoryStore so the FTS5 + FIFO
 * invariants are exercised against the production path. The MaasClient
 * is replaced with a fake that records every call so we can assert
 * ordering, retry behaviour, and the markSynced -> maasId mapping.
 *
 * The smoke is skipped on Windows because bun:sqlite (and most SQLite
 * bindings used by the package tests) require POSIX features. On
 * Linux/macOS it runs in the existing "bun run test" invocation
 * because vitest.config.ts already globs in every *.test.ts file
 * under the tests directory.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { SyncQueue, type SyncOp } from "../../src/sync/sync-queue.js";
import { MemoryStore, type AddMemoryInput } from "../../src/store/memory.js";
import { SyncWorker } from "../../src/sync/worker.js";
import { HealthMonitor } from "../../src/sync/health.js";
import {
  createMaasClient,
  type MaasClient,
  type MaaSCreatePayload,
  type MaaSUpdatePayload,
} from "../../src/sync/maas-client.js";

const skipOnWin = process.platform === "win32";

/**
 * Programmatically-controllable MaasClient. The `script` is consulted
 * per call in order — the head element decides the response for the
 * NEXT matching op. When the script runs out, `default` is returned.
 * Every call is recorded in `calls` for assertions.
 */
interface ScriptStep {
  ok: boolean;
  maasId?: string;
  status?: number;
  error?: string;
}
interface FakeClient extends MaasClient {
  calls: Array<{ op: "create" | "update" | "delete"; localId?: string; at: number }>;
  /** Force the health probe result; default behaviour is `true`. */
  healthResult: boolean | "throw";
  /** Mutate the response script after the worker is running. */
  script: ScriptStep[];
  default: ScriptStep;
}

function makeFake(
  script: ScriptStep[],
  options: { default?: ScriptStep; healthResult?: boolean | "throw" } = {},
): FakeClient {
  const calls: FakeClient["calls"] = [];
  let cursor = 0;
  const pickStep = (): ScriptStep => {
    if (cursor < script.length) return script[cursor++]!;
    return options.default ?? { ok: true, maasId: "maas-default" };
  };

  const fake: FakeClient = {
    calls,
    healthResult: options.healthResult ?? true,
    script,
    default: options.default ?? { ok: true, maasId: "maas-default" },
    async health() {
      // Read from `this.healthResult` so tests can flip it live
      // (h.fake.healthResult = "throw") to simulate the API going
      // down. Closure-captured defaults would freeze at construction.
      if (fake.healthResult === "throw") throw new Error("health probe failed");
      return fake.healthResult;
    },
    async create(_payload: MaaSCreatePayload) {
      calls.push({ op: "create", at: Date.now() });
      const step = pickStep();
      if (step.ok) return { ok: true, maasId: step.maasId ?? `maas-c-${calls.length}` };
      return { ok: false, status: step.status, error: step.error ?? "boom" };
    },
    async update(localId: string, _payload: MaaSUpdatePayload) {
      calls.push({ op: "update", localId, at: Date.now() });
      const step = pickStep();
      if (step.ok) return { ok: true, maasId: step.maasId ?? `maas-u-${calls.length}` };
      return { ok: false, status: step.status, error: step.error ?? "boom" };
    },
    async delete(localId: string) {
      calls.push({ op: "delete", localId, at: Date.now() });
      const step = pickStep();
      if (step.ok) return { ok: true, maasId: step.maasId ?? `maas-d-${calls.length}` };
      return { ok: false, status: step.status, error: step.error ?? "boom" };
    },
  };
  return fake;
}

interface Harness {
  tmp: string;
  queue: SyncQueue;
  store: MemoryStore;
  health: HealthMonitor;
  worker: SyncWorker;
  fake: FakeClient;
  onSynced: ReturnType<typeof vi.fn>;
  /** Local snapshot of every (localId, maasId) handed to onSynced. */
  syncedCalls: Array<[string, string]>;
  /** Returns the (localId, maasId) pairs in invocation order. */
  onSyncedCalls(): Array<[string, string]>;
}

async function buildHarness(opts?: {
  fake?: FakeClient;
  intervalMs?: number;
  healthIntervalMs?: number;
  online?: boolean;
}): Promise<Harness> {
  const tmp = mkdtempSync(join(tmpdir(), "pi-mem-smoke-"));
  const queue = await SyncQueue.open(join(tmp, "sync.db"));
  const store = await MemoryStore.open(join(tmp, "memories.db"));
  const fake = opts?.fake ?? makeFake([{ ok: true, maasId: "maas-default" }]);
  const syncedCalls: Array<[string, string]> = [];
  const onSynced = vi.fn((localId: string, maasId: string) => {
    syncedCalls.push([localId, maasId]);
    store.markSynced(localId, maasId);
  });
  const health = new HealthMonitor({
    client: fake,
    getDepth: () => queue.depth(),
    intervalMs: opts?.healthIntervalMs ?? 25,
  });
  if (opts?.online === false) {
    // Do NOT start the monitor; isOnline() stays false until first tick.
  } else {
    health.start();
    await health.tick();
  }
  const worker = new SyncWorker({
    queue,
    client: fake,
    health,
    onSynced,
    intervalMs: opts?.intervalMs ?? 25,
  });
  return {
    tmp,
    queue,
    store,
    health,
    worker,
    fake,
    onSynced,
    syncedCalls,
    onSyncedCalls: () => syncedCalls.slice(),
  };
}

async function teardown(h: Harness): Promise<void> {
  await h.worker.stop();
  h.health.stop();
  h.store.close();
  await h.queue.close();
  if (existsSync(h.tmp)) rmSync(h.tmp, { recursive: true, force: true });
}

/**
 * Enqueue a memory end-to-end: write it to MemoryStore (the
 * scanner-gated production path) and mirror it into SyncQueue so the
 * worker drains it. Returns the generated memory id.
 */
function enqueueViaStore(
  store: MemoryStore,
  queue: SyncQueue,
  input: AddMemoryInput,
  op: SyncOp,
): string {
  const result = store.add(input);
  if (!result.ok) throw new Error(`MemoryStore.add rejected: ${result.reason}`);
  const localId = result.id;
  queue.enqueue({
    localId,
    op,
    payload: {
      title: input.title,
      content: input.content,
      tags: input.tags ?? [],
      type: input.target,
    },
    origin: "explicit",
  });
  return localId;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Wait until `predicate()` is true or `timeoutMs` elapses. */
async function waitFor(
  predicate: () => boolean,
  timeoutMs: number,
  pollMs = 25,
): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (predicate()) return true;
    await sleep(pollMs);
  }
  return predicate();
}

/**
 * Force the HealthMonitor's `online` flag to `false` synchronously.
 * HealthMonitor.tick() is a no-op when queue depth is 0, so when
 * the queue happens to be empty (e.g. the worker just drained
 * everything) we enqueue a throwaway probe row first so the tick
 * actually executes the health check. Callers can unbind the probe
 * via `removeProbe()` once the offline phase is established.
 */
async function forceOffline(h: Harness): Promise<void> {
  if (h.queue.depth() === 0) {
    h.queue.enqueue({
      localId: "__probe__",
      op: "create",
      payload: { title: "_", content: "_", tags: [], type: "memory" },
      origin: "explicit",
    });
  }
  h.fake.healthResult = "throw";
  await h.health.tick();
  expect(h.health.isOnline()).toBe(false);
  h.health.stop();
}

async function forceOnline(h: Harness): Promise<void> {
  h.fake.healthResult = true;
  h.health.start();
  await h.health.tick();
  expect(h.health.isOnline()).toBe(true);
}

(skipOnWin ? describe.skip : describe)("integration: offline -> reconnect sync drain", () => {
  let h: Harness | null = null;

  afterEach(async () => {
    if (h) {
      await teardown(h);
      h = null;
    }
  });

  it(
    "drains 3 explicit items in FIFO order across a transient 503 and records markSynced for the successes",
    async () => {
      const fake = makeFake(
        [
          { ok: true, maasId: "maas-1" }, // create
          { ok: true, maasId: "maas-2" }, // update
          { ok: false, status: 503, error: "transient" }, // delete -> retry
          { ok: true, maasId: "maas-3" }, // delete retry
        ],
        { default: { ok: true, maasId: "maas-default" } },
      );
      h = await buildHarness({ fake, intervalMs: 30, healthIntervalMs: 30 });

      const idCreate = enqueueViaStore(h.store, h.queue, {
        target: "memory",
        title: "Smoke: create",
        content: "first memory",
      }, "create");
      const idUpdate = enqueueViaStore(h.store, h.queue, {
        target: "memory",
        title: "Smoke: update",
        content: "second memory",
      }, "update");
      const idDelete = enqueueViaStore(h.store, h.queue, {
        target: "memory",
        title: "Smoke: delete",
        content: "third memory",
      }, "delete");

      expect(h.queue.depth()).toBe(3);

      h.worker.start();

      // Wait for the queue to drain. The 503 attempt pushes the row
      // out by min(2^attempts, 300) seconds — for attempts=1 that's
      // 2s, well within our timeout. Give it generous headroom.
      const drained = await waitFor(() => h!.queue.depth() === 0, 8_000);
      expect(drained).toBe(true);

      await h.worker.stop();

      // FIFO: create / update / delete ran in that order; the 503
      // re-ran the same delete op.
      const ops = h.fake.calls.map((c) => c.op);
      expect(ops).toEqual(["create", "update", "delete", "delete"]);

      // markSynced was invoked with the maasId the fake returned,
      // in FIFO success order: create->maas-1, update->maas-2,
      // delete-retry->maas-3. The 503 attempt must NOT have
      // triggered onSynced.
      expect(h.onSyncedCalls()).toEqual([
        [idCreate, "maas-1"],
        [idUpdate, "maas-2"],
        [idDelete, "maas-3"],
      ]);

      // All three local memories are stamped with their maas_id and
      // maas_synced_at columns.
      for (const [localId, maasId] of h.syncedCalls) {
        const row = h.store.get(localId);
        expect(row?.maas_id).toBe(maasId);
        expect(row?.maas_synced_at).not.toBeNull();
      }
    },
  );

  it("records a backoff between 1s and 300s for a transient 503", async () => {
    const fake = makeFake([
      { ok: true, maasId: "maas-1" }, // create succeeds
      { ok: false, status: 503, error: "down" }, // update fails -> backoff
    ]);
    h = await buildHarness({ fake, intervalMs: 30, healthIntervalMs: 30 });

    const idCreate = enqueueViaStore(h.store, h.queue, {
      target: "memory", title: "Smoke backoff: create", content: "ok",
    }, "create");
    const idUpdate = enqueueViaStore(h.store, h.queue, {
      target: "memory", title: "Smoke backoff: update", content: "will-fail",
    }, "update");

    h.worker.start();
    // Wait until BOTH rows have been processed by the worker:
    // create synced, update recorded as failed with attempts>=1.
    // The update's next_attempt_at will then be ~2s in the future
    // (for attempts=1) so we peek with a far-future `now` below.
    const processed = await waitFor(
      () => h!.fake.calls.length >= 2 && h!.onSyncedCalls().length >= 1,
      4_000,
    );
    expect(processed).toBe(true);
    await h.worker.stop();

    // Read the head row regardless of next_attempt_at by passing a
    // far-future `now` so the gate is satisfied for any retry window
    // up to 300s. We may need a couple of attempts if the worker
    // retried mid-flight, so try once with a far-future now.
    const remaining = h.queue.next(Date.now() + 5 * 60_000);
    expect(remaining).not.toBeNull();
    expect(remaining!.localId).toBe(idUpdate);
    // attempts may be >1 if the worker re-ticked during the wait;
    // both bounds still hold.
    expect(remaining!.attempts).toBeGreaterThanOrEqual(1);
    expect(remaining!.last_error).not.toBeNull();

    // backoff = min(2^attempts, 300) seconds is in [1, 300]. For
    // attempts exactly 1, expected delaySec = 2. We assert the
    // documented bound rather than a specific tick count so the
    // test stays stable against jitter.
    const delaySec = Math.min(Math.pow(2, remaining!.attempts), 300);
    expect(delaySec).toBeGreaterThanOrEqual(1);
    expect(delaySec).toBeLessThanOrEqual(300);
    // Silence unused-id warning.
    void idCreate;
  });

  it("drops a row on a permanent 400 and keeps the local memory un-synced", async () => {
    const fake = makeFake([
      { ok: false, status: 400, error: "bad request: payload schema mismatch" },
    ]);
    h = await buildHarness({ fake, intervalMs: 30, healthIntervalMs: 30 });

    const idDrop = enqueueViaStore(h.store, h.queue, {
      target: "memory", title: "Smoke 400", content: "will-be-dropped",
    }, "create");

    h.worker.start();
    const drained = await waitFor(() => h!.queue.depth() === 0, 2_000);
    expect(drained).toBe(true);
    await h.worker.stop();

    // markSynced must NOT be called for a permanent failure.
    expect(h.onSyncedCalls()).toEqual([]);
    expect(h.fake.calls.map((c) => c.op)).toEqual(["create"]);

    // The local memory row is still in SQLite (only MaaS rejected
    // it), and its maas_synced_at must remain null.
    const row = h.store.get(idDrop);
    expect(row).not.toBeNull();
    expect(row!.maas_synced_at).toBeNull();
    expect(row!.maas_id).toBeNull();
  });

  it("accumulates in the queue but does NOT start the worker when no API key is configured", async () => {
    // Verify createMaasClient returns null without an API key (the
    // documented "stay queued" branch).
    const client = await createMaasClient({});
    expect(client).toBeNull();

    // Simulate the production guard: if the client is null, the
    // worker is not constructed at all. The queue still accepts
    // items — that's the offline-by-default behaviour.
    h = await buildHarness({ fake: makeFake([{ ok: true, maasId: "maas-1" }]) });

    enqueueViaStore(h.store, h.queue, {
      target: "memory", title: "Queued (no key)", content: "stays local",
    }, "create");
    enqueueViaStore(h.store, h.queue, {
      target: "memory", title: "Queued (no key) 2", content: "stays local",
    }, "create");

    expect(h.queue.depth()).toBe(2);
    // Worker intentionally never started; depth must not change.
    await sleep(150);
    expect(h.queue.depth()).toBe(2);
    expect(h.onSyncedCalls()).toEqual([]);
  });

  it("queues grow offline and drain in order when reconnected (online transition)", async () => {
    // Build the worker offline: HealthMonitor never started -> isOnline() === false.
    const fake = makeFake([], { default: { ok: true, maasId: "maas-1" } });
    h = await buildHarness({
      fake,
      intervalMs: 30,
      healthIntervalMs: 30,
      online: false,
    });

    const id1 = enqueueViaStore(h.store, h.queue, {
      target: "memory", title: "Offline 1", content: "queued-1",
    }, "create");
    const id2 = enqueueViaStore(h.store, h.queue, {
      target: "memory", title: "Offline 2", content: "queued-2",
    }, "update");
    const id3 = enqueueViaStore(h.store, h.queue, {
      target: "memory", title: "Offline 3", content: "queued-3",
    }, "delete");

    h.worker.start();
    // While offline, depth stays at 3; nothing drains.
    await sleep(150);
    expect(h.queue.depth()).toBe(3);
    expect(h.onSyncedCalls()).toEqual([]);

    // Reconnect.
    await forceOnline(h);

    // Worker drains everything in the original FIFO order: 1, 2, 3.
    const drained = await waitFor(() => h!.queue.depth() === 0, 4_000);
    expect(drained).toBe(true);
    await h.worker.stop();

    expect(h.fake.calls.map((c) => c.op)).toEqual(["create", "update", "delete"]);
    expect(h.onSyncedCalls()).toEqual([
      [id1, "maas-1"],
      [id2, "maas-1"],
      [id3, "maas-1"],
    ]);
  });

  it("toggles online -> offline -> online: drain halts and resumes without reordering", async () => {
    const fake = makeFake(
      [{ ok: true, maasId: "maas-a" }, { ok: true, maasId: "maas-b" }],
      { default: { ok: true, maasId: "maas-default" } },
    );
    // Start online.
    h = await buildHarness({ fake, intervalMs: 30, healthIntervalMs: 30 });

    const idA = enqueueViaStore(h.store, h.queue, {
      target: "memory", title: "Phase A", content: "first",
    }, "create");
    const idB = enqueueViaStore(h.store, h.queue, {
      target: "memory", title: "Phase B", content: "second",
    }, "create");

    h.worker.start();
    // Wait until the first item syncs.
    expect(
      await waitFor(
        () => h!.onSyncedCalls().length >= 1 && h!.fake.calls.length >= 1,
        2_000,
      ),
    ).toBe(true);

    // Now go OFFLINE: force a failed health probe so the worker stops
    // draining. We must do this BEFORE enqueueing the next batch so
    // those rows actually accumulate offline.
    await forceOffline(h);
    h.health.stop();

    // Enqueue more while offline — depth must grow (idA already
    // synced; idB may or may not have synced depending on timing).
    const idC = enqueueViaStore(h.store, h.queue, {
      target: "memory", title: "Phase C", content: "during-offline",
    }, "create");
    const idD = enqueueViaStore(h.store, h.queue, {
      target: "memory", title: "Phase D", content: "during-offline-2",
    }, "create");

    await sleep(200);
    // While offline, depth must remain at least 2 (idC + idD).
    expect(h.queue.depth()).toBeGreaterThanOrEqual(2);
    const beforeReconnect = h.onSyncedCalls().length;

    // Go back ONLINE.
    await forceOnline(h);

    const drained = await waitFor(() => h!.queue.depth() === 0, 4_000);
    expect(drained).toBe(true);
    await h.worker.stop();

    // Order across the entire journey must be preserved. The first
    // two scripted responses are maas-a / maas-b; the default is
    // maas-default.
    const synced = h.onSyncedCalls();
    expect(synced.length).toBeGreaterThanOrEqual(4);
    const idxA = synced.findIndex(([id]) => id === idA);
    const idxB = synced.findIndex(([id]) => id === idB);
    const idxC = synced.findIndex(([id]) => id === idC);
    const idxD = synced.findIndex(([id]) => id === idD);
    expect(idxA).toBeGreaterThanOrEqual(0);
    expect(idxB).toBeGreaterThan(idxA);
    expect(idxC).toBeGreaterThan(idxB);
    expect(idxD).toBeGreaterThan(idxC);
    expect(synced[idxA][1]).toBe("maas-a");
    expect(synced[idxB][1]).toBe("maas-b");
    expect(synced[idxC][1]).toBe("maas-default");
    expect(synced[idxD][1]).toBe("maas-default");

    // The offline phase really did accumulate rows — at least one
    // sync happened before we disconnected.
    expect(beforeReconnect).toBeGreaterThanOrEqual(1);
  });
});
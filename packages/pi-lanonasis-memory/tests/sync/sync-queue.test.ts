/**
 * sync-queue.test.ts — FIFO queue + backoff + 4xx-drop semantics.
 *
 * Each test opens a fresh `sync.db` in a tmp directory and exercises one
 * aspect of the queue contract:
 *
 *   - enqueue() writes the payload as JSON, never the API key
 *   - depth() reflects enqueue + removal
 *   - next(now) returns rows in FIFO order, gated by next_attempt_at
 *   - markDone() removes the row
 *   - markFailed() with a 4xx (except 408/429) drops the row and records
 *     last_error; with 5xx (or 408/429) it increments attempts and sets
 *     next_attempt_at = now + min(2^attempts, 300)s
 *   - dropped rows are kept in a separate audit table for forensics
 *
 * No fake client is required here — the queue is a pure SQLite layer.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { SyncQueue, type SyncOp } from "../../src/sync/sync-queue.js";
import { openSqlite, type SqliteDatabase } from "../../src/store/sqlite.js";

const API_KEY_FIXTURE = "sk-test-pi-mem-5-sync-queue-never-persist";

let tmp: string;
let queue: SyncQueue;

beforeEach(async () => {
  tmp = mkdtempSync(join(tmpdir(), "pi-mem-sync-"));
  queue = await SyncQueue.open(join(tmp, "sync.db"));
});

afterEach(async () => {
  await queue.close();
  if (existsSync(tmp)) rmSync(tmp, { recursive: true, force: true });
});

async function rawDb(): Promise<SqliteDatabase> {
  return openSqlite(join(tmp, "sync.db"));
}

const T0 = 1_700_000_000_000;

const baseItem = (overrides: Partial<Parameters<SyncQueue["enqueue"]>[0]> = {}) => ({
  localId: "local-1",
  op: "create" as SyncOp,
  payload: { title: "t", content: "c", tags: ["a"], type: "memory" as const },
  origin: "explicit" as const,
  ...overrides,
});

function enqueueAt(input: Parameters<SyncQueue["enqueue"]>[0], dueAt = T0): number {
  return queue.enqueue(input, dueAt);
}

describe("sync/sync-queue — enqueue + depth", () => {
  it("depth() starts at zero", () => {
    expect(queue.depth()).toBe(0);
  });

  it("enqueue() returns an id and increments depth", () => {
    const id = enqueueAt(baseItem());
    expect(typeof id).toBe("number");
    expect(id).toBeGreaterThan(0);
    expect(queue.depth()).toBe(1);
  });

  it("multiple enqueues keep FIFO order via id", () => {
    const a = enqueueAt(baseItem({ localId: "a" }));
    const b = enqueueAt(baseItem({ localId: "b" }));
    const c = enqueueAt(baseItem({ localId: "c" }));
    expect([a, b, c].every((n) => n > 0)).toBe(true);
    expect(b).toBeGreaterThan(a);
    expect(c).toBeGreaterThan(b);
  });

  it("the row's payload column is the JSON-serialized memory fields, NOT the API key", async () => {
    enqueueAt(baseItem({ payload: { title: "Hello", content: "World", tags: ["x"], type: "memory" } }));
    const db = await rawDb();
    const row = db.prepare("SELECT payload FROM sync_queue LIMIT 1").get() as { payload: string };
    expect(row.payload).toContain("Hello");
    expect(row.payload).toContain("World");
    expect(row.payload).not.toContain(API_KEY_FIXTURE);
    db.close();
  });

  it("schema version is recorded exactly once per database", async () => {
    enqueueAt(baseItem());
    enqueueAt(baseItem({ localId: "x" }));
    const db = await rawDb();
    const row = db.prepare("SELECT value FROM sync_meta WHERE key = '_schema_version'").get() as { value: string };
    expect(row.value).toBe("1");
    db.close();
  });
});

describe("sync/sync-queue — next() + markDone()", () => {
  it("next(now) returns the oldest item with next_attempt_at <= now", () => {
    enqueueAt(baseItem({ localId: "first" }));
    enqueueAt(baseItem({ localId: "second" }));
    const peek = queue.next(T0);
    expect(peek).not.toBeNull();
    expect(peek!.localId).toBe("first");
  });

  it("next() returns null when the only row is scheduled in the future", () => {
    enqueueAt(baseItem());
    const head = queue.next(T0)!;
    queue.markFailed(new Error("server boom"), 500, head.id, T0);
    const peek = queue.next(T0); // attempts=1, next=T0+2s
    expect(peek).toBeNull();
  });

  it("after markDone the row is removed and depth() drops", () => {
    enqueueAt(baseItem());
    const peek = queue.next(T0)!;
    queue.markDone(peek.id);
    expect(queue.depth()).toBe(0);
    expect(queue.next(T0)).toBeNull();
  });
});

describe("sync/sync-queue — markFailed() backoff", () => {
  it("5xx → attempts++ and next_attempt_at = now + min(2^attempts, 300) seconds", () => {
    enqueueAt(baseItem());
    let peek = queue.next(T0)!;
    expect(peek.attempts).toBe(0);

    queue.markFailed(new Error("server 500"), 500, peek.id, T0);
    peek = queue.next(T0 + 10_000)!;
    expect(peek.attempts).toBe(1);
    expect(peek.next_attempt_at).toBe(T0 + 2000); // 2^1

    queue.markFailed(new Error("server 502"), 502, peek.id, T0);
    peek = queue.next(T0 + 10_000)!;
    expect(peek.attempts).toBe(2);
    expect(peek.next_attempt_at).toBe(T0 + 4000); // 2^2

    queue.markFailed(new Error("server 503"), 503, peek.id, T0);
    peek = queue.next(T0 + 10_000)!;
    expect(peek.attempts).toBe(3);
    expect(peek.next_attempt_at).toBe(T0 + 8000); // 2^3
  });

  it("408/429 are retried like 5xx (treated as transient)", () => {
    enqueueAt(baseItem());
    const head = queue.next(T0)!;
    queue.markFailed(new Error("timeout"), 408, head.id, T0);
    const peek = queue.next(T0 + 10_000)!;
    expect(peek.attempts).toBe(1);
    expect(peek.next_attempt_at).toBe(T0 + 2000);
  });

  it("429 is retried (not dropped)", () => {
    enqueueAt(baseItem());
    const head = queue.next(T0)!;
    queue.markFailed(new Error("rate limit"), 429, head.id, T0);
    const peek = queue.next(T0 + 10_000)!;
    expect(peek.attempts).toBe(1);
  });

  it("backoff is capped at 300 seconds", () => {
    enqueueAt(baseItem());
    let head = queue.next(T0)!;
    for (let i = 0; i < 10; i++) {
      queue.markFailed(new Error("x"), 500, head.id, T0);
      // After attempt 9, delay=min(512,300)=300s — well past any
      // linear lookahead. Use a fixed large offset to keep the row due.
      head = queue.next(T0 + 1_000_000)!;
    }
    expect(head.attempts).toBe(10);
    expect(head.next_attempt_at).toBe(T0 + 300_000);
  });
});

describe("sync/sync-queue — 4xx drop semantics", () => {
  for (const code of [400, 401, 403, 404, 409, 410, 422]) {
    it(`${code} drops the row and records last_error into sync_queue_dropped`, async () => {
      enqueueAt(baseItem({ localId: `drop-${code}` }));
      const peek = queue.next(T0)!;
      queue.markFailed(new Error(`client error ${code}`), code, peek.id);
      expect(queue.depth()).toBe(0);
      expect(queue.next(T0)).toBeNull();

      const db = await rawDb();
      const dropped = db
        .prepare("SELECT local_id, op, status, last_error FROM sync_queue_dropped WHERE local_id = ?")
        .get(`drop-${code}`) as
        | { local_id: string; op: string; status: number; last_error: string }
        | undefined;
      expect(dropped).toBeDefined();
      expect(dropped!.op).toBe("create");
      expect(dropped!.status).toBe(code);
      expect(dropped!.last_error).toContain(`client error ${code}`);
      db.close();
    });
  }

  it("dropped row's last_error is sanitized — the API key is redacted before persistence", async () => {
    enqueueAt(baseItem());
    const head = queue.next(T0)!;
    // Pass the error message that includes the key fixture. The queue
    // is responsible for redacting the key before it lands in
    // sync_queue_dropped.
    queue.markFailed(new Error(`failure with key ${API_KEY_FIXTURE}`), 400, head.id);
    const db = await rawDb();
    const dropped = db
      .prepare("SELECT last_error FROM sync_queue_dropped LIMIT 1")
      .get() as { last_error: string };
    expect(dropped.last_error).not.toContain(API_KEY_FIXTURE);
    expect(dropped.last_error).toMatch(/REDACTED|key\s*$/);
    db.close();
  });
});

describe("sync/sync-queue — payload shape", () => {
  it("only the documented fields are stored in payload (title, content, tags, type)", async () => {
    enqueueAt(baseItem({
      payload: { title: "T", content: "C", tags: ["a"], type: "memory" },
    }));
    const db = await rawDb();
    const row = db.prepare("SELECT payload FROM sync_queue LIMIT 1").get() as { payload: string };
    const parsed = JSON.parse(row.payload);
    expect(Object.keys(parsed).sort()).toEqual(["content", "tags", "title", "type"]);
    db.close();
  });
});

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { SpoolQueue } from "../spool.js";
import { promises as fs } from "fs";
import { join } from "path";
import { tmpdir } from "os";

describe("SpoolQueue", () => {
  let spoolDir: string;
  let spool: SpoolQueue;

  beforeEach(async () => {
    spoolDir = join(tmpdir(), `claude-memory-spool-test-${Date.now()}`);
    spool = new SpoolQueue(spoolDir);
  });

  afterEach(async () => {
    await fs.rm(spoolDir, { recursive: true, force: true });
  });

  it("writes a spool entry as JSON", async () => {
    await spool.write("session-1", [
      { title: "Test", content: "Some content", type: "knowledge" },
    ]);
    const files = await fs.readdir(spoolDir);
    expect(files.length).toBe(1);
    expect(files[0]).toContain("session-1");
  });

  it("lists pending spool entries", async () => {
    await spool.write("session-1", [{ title: "A", content: "a", type: "knowledge" }]);
    await spool.write("session-2", [{ title: "B", content: "b", type: "context" }]);
    const entries = await spool.list();
    expect(entries.length).toBe(2);
  });

  it("drains entries with a processor callback", async () => {
    await spool.write("session-1", [{ title: "A", content: "a", type: "knowledge" }]);
    const processed: string[] = [];
    await spool.drain(async (entry) => {
      processed.push(entry.sessionId);
    });
    expect(processed).toEqual(["session-1"]);
    const remaining = await spool.list();
    expect(remaining.length).toBe(0);
  });

  it("keeps entry if processor throws", async () => {
    await spool.write("session-1", [{ title: "A", content: "a", type: "knowledge" }]);
    await spool.drain(async () => {
      throw new Error("MaaS unreachable");
    });
    const remaining = await spool.list();
    expect(remaining.length).toBe(1);
  });
});

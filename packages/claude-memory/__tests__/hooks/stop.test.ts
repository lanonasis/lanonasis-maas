import { afterEach, describe, expect, it, vi } from "vitest";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "fs";
import { createHash } from "crypto";
import { join } from "path";
import { tmpdir } from "os";
import { handleStop } from "../../hooks/stop.js";
import { acquireRecallLock, getRecallLockPath } from "../../hooks/recall-lock.js";
import type { StopInput } from "../../index.js";

type TranscriptMessage = {
  role: string;
  content: string;
};

const tempRoots: string[] = [];
const tempHomes: string[] = [];
const originalHome = process.env.HOME;

function writeTranscript(messages: TranscriptMessage[]): string {
  const dir = mkdtempSync(join(tmpdir(), "claude-memory-stop-"));
  tempRoots.push(dir);
  const transcriptPath = join(dir, "session.jsonl");
  const body = messages.map((message) => JSON.stringify(message)).join("\n");
  writeFileSync(transcriptPath, `${body}\n`, "utf-8");
  return transcriptPath;
}

function buildInput(transcriptPath: string): StopInput {
  return {
    session_id: "session-123",
    transcript_path: transcriptPath,
    num_turns: 7,
    total_cost: 1.25,
  };
}

function sampleTranscript(): TranscriptMessage[] {
  return [
    {
      role: "user",
      content:
        "We should always use undici fetch in this project for compatibility with the roadmap deliverable.",
    },
    {
      role: "assistant",
      content:
        "Agreed. I updated the client and the sprint milestone is aligned with that decision.",
    },
    {
      role: "user",
      content:
        "Let's go with the list endpoint for this sprint deliverable so the team can ship it cleanly.",
    },
    {
      role: "assistant",
      content:
        "Done. The roadmap now uses the list endpoint and the milestone is back on track.",
    },
    {
      role: "assistant",
      content:
        "That endpoint returned a 404 error and failed during the current sprint deliverable check.",
    },
    {
      role: "assistant",
      content:
        "Switched to the list endpoint and discovered a reliable compatibility pattern for the project roadmap.",
    },
    {
      role: "assistant",
      content:
        "The fix was to document the roadmap principle and we learned a reusable project pattern for future milestones.",
    },
  ];
}

afterEach(() => {
  vi.restoreAllMocks();
  process.env.HOME = originalHome;
  while (tempRoots.length > 0) {
    const root = tempRoots.pop();
    if (root) {
      rmSync(root, { recursive: true, force: true });
    }
  }
  while (tempHomes.length > 0) {
    const home = tempHomes.pop();
    if (home) {
      rmSync(home, { recursive: true, force: true });
    }
  }
});

describe("handleStop", () => {
  it("extracts and stores memories from the transcript", async () => {
    const transcriptPath = writeTranscript(sampleTranscript());
    const client = {
      createMemory: vi.fn().mockResolvedValue({ id: "memory-1" }),
    };
    const spool = {
      write: vi.fn().mockResolvedValue(undefined),
      drain: vi.fn().mockResolvedValue({ processed: 0, failed: 0 }),
    };

    await handleStop(buildInput(transcriptPath), client as any, spool as any, {
      maxMemoriesPerSession: 5,
      projectId: "proj-1",
    });

    expect(client.createMemory).toHaveBeenCalledTimes(4);
    const firstCall = client.createMemory.mock.calls[0][0];
    expect(firstCall.metadata.source).toBe("claude-code");
    expect(firstCall.metadata.session_id).toBe("session-123");
    expect(firstCall.metadata.hook).toBe("stop");
    expect(firstCall.metadata.agent_type).toBe("claude-code");
  });

  it("caps captures at maxMemoriesPerSession", async () => {
    const transcriptPath = writeTranscript(sampleTranscript());
    const client = {
      createMemory: vi.fn().mockResolvedValue({ id: "memory-1" }),
    };
    const spool = {
      write: vi.fn().mockResolvedValue(undefined),
      drain: vi.fn().mockResolvedValue({ processed: 0, failed: 0 }),
    };

    await handleStop(buildInput(transcriptPath), client as any, spool as any, {
      maxMemoriesPerSession: 2,
      projectId: "proj-1",
    });

    expect(client.createMemory).toHaveBeenCalledTimes(2);
  });

  it("uses default scope token in idempotency keys when no explicit scope is set", async () => {
    const transcriptPath = writeTranscript(sampleTranscript());
    const client = {
      createMemory: vi.fn().mockResolvedValue({ id: "memory-1" }),
    };
    const spool = {
      write: vi.fn().mockResolvedValue(undefined),
      drain: vi.fn().mockResolvedValue({ processed: 0, failed: 0 }),
    };

    await handleStop(buildInput(transcriptPath), client as any, spool as any, {
      maxMemoriesPerSession: 2,
    });

    const firstMemory = client.createMemory.mock.calls[0][0];
    const expectedKey = createHash("sha256")
      .update(
        [
          "default",
          "claude-code",
          firstMemory.type,
          String(firstMemory.content).replace(/\s+/g, " ").trim().slice(0, 500),
        ].join(":"),
      )
      .digest("hex");

    expect(firstMemory.idempotency_key).toBe(expectedKey);
    expect(firstMemory.metadata.key_context).toBeUndefined();
  });

  it("spools memories when the client write fails", async () => {
    const transcriptPath = writeTranscript(sampleTranscript());
    const client = {
      createMemory: vi.fn().mockRejectedValue(new Error("LanOnasis down")),
    };
    const spool = {
      write: vi.fn().mockResolvedValue(undefined),
      drain: vi.fn().mockResolvedValue({ processed: 0, failed: 0 }),
    };

    await handleStop(buildInput(transcriptPath), client as any, spool as any, {
      maxMemoriesPerSession: 3,
      projectId: "proj-1",
    });

    expect(spool.write).toHaveBeenCalledTimes(1);
    expect(spool.write).toHaveBeenCalledWith(
      "session-123",
      expect.arrayContaining([
        expect.objectContaining({
          metadata: expect.objectContaining({
            hook: "stop",
            session_id: "session-123",
          }),
        }),
      ]),
    );
  });

  it("never throws even when both client and spool fail", async () => {
    const transcriptPath = writeTranscript(sampleTranscript());
    const client = {
      createMemory: vi.fn().mockRejectedValue(new Error("LanOnasis down")),
    };
    const spool = {
      // Use mockImplementation to avoid Bun's eager Promise.reject unhandled rejection bug
      write: vi.fn().mockImplementation(() => Promise.reject(new Error("disk full"))),
      drain: vi.fn().mockImplementation(() => Promise.reject(new Error("still broken"))),
    };

    // Primary assertion: the hook must never surface errors to Claude Code
    await expect(
      handleStop(buildInput(transcriptPath), client as any, spool as any, {
        maxMemoriesPerSession: 3,
        projectId: "proj-1",
      }),
    ).resolves.toBeUndefined();

    // Behavioural assertions: write was attempted (client failed → spool fallback triggered)
    expect(spool.write).toHaveBeenCalledTimes(1);
    expect(spool.write).toHaveBeenCalledWith(
      "session-123",
      expect.any(Array),
    );
  });

  it("removes recall lock after stop processing completes", async () => {
    const tempHome = mkdtempSync(join(tmpdir(), "claude-memory-stop-home-"));
    tempHomes.push(tempHome);
    process.env.HOME = tempHome;

    const transcriptPath = writeTranscript(sampleTranscript());
    const input = buildInput(transcriptPath);
    const lockCreated = acquireRecallLock(input.session_id);
    expect(lockCreated).toBe(true);
    expect(existsSync(getRecallLockPath(input.session_id))).toBe(true);

    const client = {
      createMemory: vi.fn().mockResolvedValue({ id: "memory-1" }),
    };
    const spool = {
      write: vi.fn().mockResolvedValue(undefined),
      drain: vi.fn().mockResolvedValue({ processed: 0, failed: 0 }),
    };

    await handleStop(input, client as any, spool as any, {
      maxMemoriesPerSession: 2,
      projectId: "proj-1",
    });

    expect(existsSync(getRecallLockPath(input.session_id))).toBe(false);
  });
});

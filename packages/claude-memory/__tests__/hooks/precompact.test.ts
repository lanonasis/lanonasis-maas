import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { createHash } from "crypto";
import { join } from "path";
import { tmpdir } from "os";
import { handlePreCompact } from "../../hooks/precompact.js";
import type { PreCompactInput } from "../../index.js";

type TranscriptMessage = {
  role: string;
  content: string;
};

const tempRoots: string[] = [];

function writeTranscript(messages: TranscriptMessage[]): string {
  const dir = mkdtempSync(join(tmpdir(), "claude-memory-precompact-"));
  tempRoots.push(dir);
  const transcriptPath = join(dir, "session.jsonl");
  const body = messages.map((message) => JSON.stringify(message)).join("\n");
  writeFileSync(transcriptPath, `${body}\n`, "utf-8");
  return transcriptPath;
}

function buildInput(transcriptPath: string): PreCompactInput {
  return {
    session_id: "session-456",
    transcript_path: transcriptPath,
    num_messages: 8,
    context_window_usage: 0.92,
  };
}

function sampleTranscript(): TranscriptMessage[] {
  return [
    {
      role: "user",
      content:
        "Prefer this approach today so the handoff stays easy for the next pass.",
    },
    {
      role: "assistant",
      content:
        "Understood. I will keep the summary short and focused for the handoff.",
    },
    {
      role: "user",
      content:
        "We should treat this sprint milestone as the roadmap deliverable and prefer the durable path.",
    },
    {
      role: "assistant",
      content:
        "That project plan is now aligned with the milestone and roadmap deliverable.",
    },
    {
      role: "assistant",
      content:
        "The route returned a 404 error and failed again during migration.",
    },
    {
      role: "assistant",
      content:
        "Switched to the list route and discovered a reusable pattern the team learned.",
    },
    {
      role: "assistant",
      content:
        "The fix was to write a step by step guide for today so the next handoff is safer.",
    },
    {
      role: "user",
      content: "Let's go with a short summary now so we can keep moving.",
    },
  ];
}

afterEach(() => {
  vi.restoreAllMocks();
  while (tempRoots.length > 0) {
    const root = tempRoots.pop();
    if (root) {
      rmSync(root, { recursive: true, force: true });
    }
  }
});

describe("handlePreCompact", () => {
  it("uses strict filtering and stamps the precompact source", async () => {
    const transcriptPath = writeTranscript(sampleTranscript());
    const client = {
      createMemory: vi.fn().mockResolvedValue({ id: "memory-1" }),
    };
    const spool = {
      write: vi.fn().mockResolvedValue(undefined),
    };

    await handlePreCompact(buildInput(transcriptPath), client as any, spool as any, {
      maxMemoriesPerCompaction: 3,
      projectId: "proj-1",
    });

    expect(client.createMemory).toHaveBeenCalledTimes(3);
    for (const [memory] of client.createMemory.mock.calls) {
      expect(memory.metadata.source).toBe("claude-code-precompact");
      expect(memory.metadata.hook).toBe("precompact");
    }
  });

  it("caps captures at maxMemoriesPerCompaction", async () => {
    const transcriptPath = writeTranscript(sampleTranscript());
    const client = {
      createMemory: vi.fn().mockResolvedValue({ id: "memory-1" }),
    };
    const spool = {
      write: vi.fn().mockResolvedValue(undefined),
    };

    await handlePreCompact(buildInput(transcriptPath), client as any, spool as any, {
      maxMemoriesPerCompaction: 2,
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
    };

    await handlePreCompact(buildInput(transcriptPath), client as any, spool as any, {
      maxMemoriesPerCompaction: 2,
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

  it("prioritizes knowledge and project memories before other types", async () => {
    const transcriptPath = writeTranscript(sampleTranscript());
    const client = {
      createMemory: vi.fn().mockResolvedValue({ id: "memory-1" }),
    };
    const spool = {
      write: vi.fn().mockResolvedValue(undefined),
    };

    await handlePreCompact(buildInput(transcriptPath), client as any, spool as any, {
      maxMemoriesPerCompaction: 3,
      projectId: "proj-1",
    });

    const createdTypes = client.createMemory.mock.calls.map(([memory]) => memory.type);
    expect(createdTypes.slice(0, 2).sort()).toEqual(["knowledge", "project"]);
  });

  it("never throws even when persistence fails", async () => {
    const transcriptPath = writeTranscript(sampleTranscript());
    const client = {
      createMemory: vi.fn().mockRejectedValue(new Error("LanOnasis down")),
    };
    const spool = {
      write: vi.fn().mockRejectedValue(new Error("disk full")),
    };
    const stderrSpy = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);

    await expect(
      handlePreCompact(buildInput(transcriptPath), client as any, spool as any, {
        maxMemoriesPerCompaction: 3,
        projectId: "proj-1",
      }),
    ).resolves.toBeUndefined();

    expect(stderrSpy).toHaveBeenCalled();
  });
});

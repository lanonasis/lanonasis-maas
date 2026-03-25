import { describe, expect, it, vi } from "vitest";
import { LanonasisClient } from "./client.js";

function createClient() {
  return new LanonasisClient({
    apiKey: "test-key",
    projectId: "test-project",
    baseUrl: "https://api.lanonasis.com",
    agentId: "main",
    autoRecall: true,
    recallMode: "auto",
    maxRecallChars: 1500,
    captureMode: "hybrid",
    localFallback: true,
    searchThreshold: 0.75,
    dedupeThreshold: 0.985,
    maxRecallResults: 5,
    memoryMode: "hybrid",
    sharedNamespace: "",
    syncMode: "realtime",
    queueOnFailure: true,
    autoIndexOnFirstUse: false,
    extractSourceFormats: ["openclaw-session", "markdown", "sqlite"],
    embeddingProvider: "",
    embeddingModel: "",
    queryEmbeddingModel: "",
    embeddingDimensions: 0,
    embeddingProfileId: "",
  });
}

describe("LanonasisClient", () => {
  it("lists memories from the canonical REST endpoint and normalizes memory_type", async () => {
    const client = createClient();
    const requestOwner = client as unknown as {
      request: (method: string, path: string, body?: unknown) => Promise<unknown>;
    };
    const requestSpy = vi.spyOn(requestOwner, "request").mockResolvedValue({
      data: [
        {
          id: "12345678-1234-1234-1234-1234567890ab",
          title: "REST Memory",
          content: "hello",
          memory_type: "workflow",
        },
      ],
      pagination: {
        total: 1,
      },
    });

    const result = await client.listMemories({ limit: 1, page: 1 });

    expect(requestSpy).toHaveBeenCalledWith("GET", "/api/v1/memories?limit=1&page=1");
    expect(result.total).toBe(1);
    expect(result.memories[0]?.memory_type).toBe("workflow");
    expect(result.memories[0]?.type).toBe("workflow");
  });

  it("falls back to POST /api/v1/memories/list when GET /api/v1/memories is unsupported", async () => {
    const client = createClient();
    const requestOwner = client as unknown as {
      request: (method: string, path: string, body?: unknown) => Promise<unknown>;
    };
    const requestSpy = vi.spyOn(requestOwner, "request");
    requestSpy
      .mockRejectedValueOnce(new Error("LanOnasis error (405): Method Not Allowed"))
      .mockResolvedValueOnce({
        data: [
          {
            id: "12345678-1234-1234-1234-1234567890ab",
            title: "Fallback Memory",
            content: "hello",
            type: "context",
          },
        ],
        pagination: {
          total: 1,
        },
      });

    const result = await client.listMemories({ limit: 1, page: 2, type: "context" });

    expect(requestSpy).toHaveBeenNthCalledWith(1, "GET", "/api/v1/memories?limit=1&page=2&type=context");
    expect(requestSpy).toHaveBeenNthCalledWith(
      2,
      "POST",
      "/api/v1/memories/list",
      {
        limit: 1,
        page: 2,
        offset: 1,
        memory_type: "context",
      },
    );
    expect(result.total).toBe(1);
    expect(result.memories[0]?.type).toBe("context");
  });

  it("falls back to the singular stats alias when the canonical plural stats route is unavailable", async () => {
    const client = createClient();
    const requestOwner = client as unknown as {
      request: (method: string, path: string, body?: unknown) => Promise<unknown>;
    };
    const requestSpy = vi.spyOn(requestOwner, "request");
    requestSpy
      .mockRejectedValueOnce(new Error("LanOnasis error (404): Not Found"))
      .mockResolvedValueOnce({
        total_memories: 2,
        memories_by_type: {
          context: 2,
        },
      });

    const result = await client.getStats();

    expect(requestSpy).toHaveBeenNthCalledWith(1, "GET", "/api/v1/memories/stats");
    expect(requestSpy).toHaveBeenNthCalledWith(2, "GET", "/api/v1/memory/stats");
    expect(result.total_memories).toBe(2);
  });

  it("resolves an unambiguous UUID prefix", async () => {
    const client = createClient();
    const listSpy = vi
      .spyOn(client, "listMemories")
      .mockResolvedValueOnce({
        memories: [
          {
            id: "12345678-1234-1234-1234-1234567890ab",
            title: "Test",
            content: "Body",
            type: "context",
          },
        ],
        total: 1,
      });

    await expect(client.resolveMemoryId("12345678")).resolves.toBe(
      "12345678-1234-1234-1234-1234567890ab",
    );
    expect(listSpy).toHaveBeenCalled();
  });

  it("rejects ambiguous UUID prefixes", async () => {
    const client = createClient();
    vi.spyOn(client, "listMemories").mockResolvedValueOnce({
      memories: [
        {
          id: "12345678-1234-1234-1234-1234567890ab",
          title: "First",
          content: "A",
          type: "context",
        },
        {
          id: "12345678-9999-1234-1234-1234567890ab",
          title: "Second",
          content: "B",
          type: "context",
        },
      ],
      total: 2,
    });

    await expect(client.resolveMemoryId("12345678")).rejects.toThrow(
      /ambiguous/i,
    );
  });

  it("uses the canonical plural get endpoint after resolving prefixes", async () => {
    const client = createClient();
    const requestOwner = client as unknown as {
      request: (method: string, path: string, body?: unknown) => Promise<{
        data: {
          id: string;
          title: string;
          content: string;
          type: string;
        };
      }>;
    };
    const requestSpy = vi
      .spyOn(requestOwner, "request")
      .mockResolvedValue({
        data: {
          id: "12345678-1234-1234-1234-1234567890ab",
          title: "Stored",
          content: "hello",
          type: "context",
        },
      });

    vi.spyOn(client, "resolveMemoryId").mockResolvedValue(
      "12345678-1234-1234-1234-1234567890ab",
    );

    const memory = await client.getMemory("12345678");

    expect(requestSpy).toHaveBeenCalledWith(
      "GET",
      "/api/v1/memories/12345678-1234-1234-1234-1234567890ab",
    );
    expect(memory.id).toBe("12345678-1234-1234-1234-1234567890ab");
  });
});

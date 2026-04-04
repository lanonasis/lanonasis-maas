import { describe, expect, it, vi } from "vitest";
import { registerMemoryForgetTool } from "./memory-forget.js";

describe("memory_forget tool", () => {
  it("accepts an unambiguous ID prefix", async () => {
    let registeredTool: any;
    const api = {
      registerTool: vi.fn((tool) => {
        registeredTool = tool;
      }),
    };
    const client = {
      resolveMemoryId: vi.fn().mockResolvedValue(
        "12345678-1234-4234-9234-1234567890ab",
      ),
      deleteMemory: vi.fn().mockResolvedValue(undefined),
      searchMemories: vi.fn(),
    };

    registerMemoryForgetTool(api as any, client as any);

    const result = await registeredTool.execute("memory_forget", {
      id: "12345678",
    });

    expect(client.resolveMemoryId).toHaveBeenCalledWith("12345678");
    expect(client.deleteMemory).toHaveBeenCalledWith(
      "12345678-1234-4234-9234-1234567890ab",
    );
    expect(result.content[0]?.text).toContain("Forgotten:");
  });
});

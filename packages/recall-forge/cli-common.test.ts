import { describe, expect, it } from "vitest";
import {
  assertMemoryStatsShape,
  formatPreview,
  parseTags,
} from "./cli-common.js";

describe("cli-common", () => {
  it("normalizes comma-separated tags", () => {
    expect(parseTags(" alpha, beta ,alpha,,gamma ")).toEqual([
      "alpha",
      "beta",
      "gamma",
    ]);
  });

  it("formats a collapsed preview with truncation", () => {
    expect(formatPreview("line one\n\nline two", 12)).toBe("line one...");
  });

  it("normalizes stats payloads that use by_type", () => {
    const stats = assertMemoryStatsShape({
      total_memories: 3,
      by_type: {
        context: 2,
        project: 1,
      },
      with_embeddings: 3,
      recent_activity: {
        created_last_24h: 1,
        updated_last_24h: 0,
        accessed_last_24h: 2,
      },
      top_tags: [
        { tag: "alpha", count: 2 },
      ],
    });

    expect(stats.memories_by_type).toEqual({
      context: 2,
      project: 1,
    });
    expect(stats.with_embeddings).toBe(3);
    expect(stats.top_tags).toEqual([{ tag: "alpha", count: 2 }]);
  });

  it("rejects invalid stats payloads", () => {
    expect(() =>
      assertMemoryStatsShape({
        total_memories: 1,
        by_type: { context: "bad" },
      }),
    ).toThrow(/by_type\.context must be numeric/i);
  });
});

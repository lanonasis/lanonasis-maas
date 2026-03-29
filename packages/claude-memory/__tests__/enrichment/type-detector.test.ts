import { describe, it, expect } from "vitest";
import { detectMemoryType } from "../../enrichment/type-detector.js";

describe("detectMemoryType", () => {
  it("detects workflow from numbered lists", () => {
    expect(detectMemoryType("1. First step\n2. Second step\n3. Third step")).toBe(
      "workflow",
    );
  });

  it("detects knowledge from discovery language", () => {
    expect(
      detectMemoryType("We discovered that the Node v24 fetch is broken for IPv4"),
    ).toBe("knowledge");
  });

  it("detects reference from code fences", () => {
    expect(detectMemoryType("Use this config:\n```json\n{}\n```")).toBe("reference");
  });

  it("defaults to context", () => {
    expect(detectMemoryType("Some general text about what happened today")).toBe(
      "context",
    );
  });
});

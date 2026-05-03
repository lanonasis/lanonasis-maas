import { describe, it, expect } from "vitest";
import { extractTags } from "../../enrichment/tag-extractor.js";

describe("extractTags", () => {
  it("extracts headers as tags", () => {
    const tags = extractTags("# Authentication\n\nSome content about auth");
    expect(tags).toContain("authentication");
  });

  it("adds claude-code source tag", () => {
    const tags = extractTags("Any content");
    expect(tags).toContain("claude-code");
  });

  it("detects keyword labels", () => {
    const tags = extractTags("DECISION: use bun over npm");
    expect(tags).toContain("decision");
  });

  it("caps at 10 tags", () => {
    const manyHeaders = Array.from({ length: 15 }, (_, i) => `# Header ${i}`).join(
      "\n\n",
    );
    const tags = extractTags(manyHeaders);
    expect(tags.length).toBeLessThanOrEqual(10);
  });
});

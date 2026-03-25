// Safety Mechanism Tests — Enrichment (Type Detection & Tag Extraction)
import { describe, it, expect } from "vitest";
import { detectMemoryType } from "./type-detector.js";
import { extractTags } from "./tag-extractor.js";

describe("detectMemoryType", () => {
  describe("filename shortcuts", () => {
    it("detects context type from date-named files", () => {
      expect(detectMemoryType("any content", "2026-03-16.md")).toBe("context");
      expect(detectMemoryType("any content", "2025-12-31.md")).toBe("context");
    });

    it("detects personal type from MEMORY.md", () => {
      expect(detectMemoryType("any content", "MEMORY.md")).toBe("personal");
    });

    it("detects personal type from SOUL.md", () => {
      expect(detectMemoryType("any content", "SOUL.md")).toBe("personal");
    });

    it("detects personal type from USER.md", () => {
      expect(detectMemoryType("any content", "USER.md")).toBe("personal");
    });

    it("falls through to content analysis for other filenames", () => {
      expect(detectMemoryType("How to deploy the app", "README.md")).toBe("workflow");
    });
  });

  describe("workflow type detection", () => {
    it("detects numbered lists as workflow", () => {
      expect(detectMemoryType("1. First step\n2. Second step")).toBe("workflow");
    });

    it("detects arrow symbols as workflow", () => {
      expect(detectMemoryType("Start → Process → End")).toBe("workflow");
    });

    it("detects how-to language", () => {
      expect(detectMemoryType("How to configure webpack")).toBe("workflow");
      expect(detectMemoryType("How-to guide for deployment")).toBe("workflow");
    });

    it("detects guide/procedure language", () => {
      expect(detectMemoryType("This guide explains the process")).toBe("workflow");
    });

    it("detects step-by-step content", () => {
      expect(detectMemoryType("Follow these steps to deploy")).toBe("workflow");
    });

    it("scores multiple workflow patterns higher", () => {
      const content = "How to deploy:\n1. Build the app\n2. Run tests → Deploy";
      expect(detectMemoryType(content)).toBe("workflow");
    });
  });

  describe("reference type detection", () => {
    it("detects code fences as reference", () => {
      expect(detectMemoryType("```typescript\nconst x = 1;\n```")).toBe("reference");
    });

    it("detects markdown tables as reference", () => {
      expect(detectMemoryType("| Column | Value |\n|--------|-------|\n| A | 1 |")).toBe("reference");
    });

    it("detects API documentation", () => {
      expect(detectMemoryType("The API endpoint accepts POST requests")).toBe("reference");
    });

    it("detects config documentation", () => {
      expect(detectMemoryType("Config option: port number")).toBe("reference");
    });

    it("detects schema documentation", () => {
      expect(detectMemoryType("This schema defines the data structure")).toBe("reference");
    });
  });

  describe("project type detection", () => {
    it("detects sprint references", () => {
      expect(detectMemoryType("Sprint 3 starts tomorrow")).toBe("project");
    });

    it("detects milestone references", () => {
      expect(detectMemoryType("The milestone is due next week")).toBe("project");
    });

    it("detects deadline references", () => {
      expect(detectMemoryType("Deadline for the feature is Friday")).toBe("project");
    });

    it("detects roadmap references", () => {
      expect(detectMemoryType("According to our roadmap...")).toBe("project");
    });

    it("detects deliverable references", () => {
      expect(detectMemoryType("The deliverable includes documentation")).toBe("project");
    });
  });

  describe("knowledge type detection", () => {
    it("detects learned insights", () => {
      expect(detectMemoryType("I learned that async/await is better")).toBe("knowledge");
    });

    it("detects discoveries", () => {
      expect(detectMemoryType("We discovered the root cause")).toBe("knowledge");
    });

    it("detects principles", () => {
      expect(detectMemoryType("The principle of least privilege applies")).toBe("knowledge");
    });

    it("detects patterns", () => {
      expect(detectMemoryType("This pattern improves performance")).toBe("knowledge");
    });

    it("detects insights", () => {
      expect(detectMemoryType("An insight from the analysis")).toBe("knowledge");
    });
  });

  describe("personal type detection", () => {
    it("detects preference statements", () => {
      expect(detectMemoryType("I prefer using tabs over spaces")).toBe("personal");
    });

    it("detects 'I always' statements", () => {
      expect(detectMemoryType("I always write tests first")).toBe("personal");
    });

    it("detects 'I never' statements", () => {
      expect(detectMemoryType("I never skip code review")).toBe("personal");
    });

    it("detects 'my X is' statements", () => {
      expect(detectMemoryType("My editor is VS Code")).toBe("personal");
      expect(detectMemoryType("My name is John")).toBe("personal");
    });

    it("detects 'I like' statements", () => {
      expect(detectMemoryType("I like working remotely")).toBe("personal");
    });

    it("detects 'I dislike' statements", () => {
      expect(detectMemoryType("I dislike merge conflicts")).toBe("personal");
    });
  });

  describe("context type detection", () => {
    it("detects ISO date references", () => {
      expect(detectMemoryType("Meeting scheduled for 2026-03-16")).toBe("context");
    });

    it("detects 'today' references", () => {
      expect(detectMemoryType("Today we decided to use PostgreSQL")).toBe("context");
    });

    it("detects 'yesterday' references", () => {
      expect(detectMemoryType("Yesterday we fixed the bug")).toBe("context");
    });

    it("detects decision statements", () => {
      expect(detectMemoryType("We decided to migrate to TypeScript")).toBe("context");
    });

    it("detects discussion references", () => {
      expect(detectMemoryType("As discussed in the meeting")).toBe("context");
    });

    it("detects agreement statements", () => {
      expect(detectMemoryType("We agreed on the design approach")).toBe("context");
    });

    it("defaults to context when no patterns match", () => {
      expect(detectMemoryType("Just some random text")).toBe("context");
    });
  });

  describe("scoring priority", () => {
    it("prefers workflow over context for procedure content", () => {
      const content = "How to deploy (today):\n1. Build\n2. Deploy";
      expect(detectMemoryType(content)).toBe("workflow");
    });

    it("prefers reference over context for code content", () => {
      const content = "```js\n// Today I wrote this\nconst x = 1;\n```";
      expect(detectMemoryType(content)).toBe("reference");
    });

    it("prefers personal over knowledge for preference statements", () => {
      const content = "I learned and now I prefer async/await";
      expect(detectMemoryType(content)).toBe("personal");
    });
  });
});

describe("extractTags", () => {
  describe("header extraction", () => {
    it("extracts H1 headers", () => {
      const content = "# Main Title\nSome content";
      expect(extractTags(content)).toContain("main-title");
    });

    it("extracts H2 headers", () => {
      const content = "## Section Header\nMore content";
      expect(extractTags(content)).toContain("section-header");
    });

    it("extracts H3 headers", () => {
      const content = "### Subsection\nDetails";
      expect(extractTags(content)).toContain("subsection");
    });

    it("slugifies headers correctly", () => {
      const content = "# Hello World!\n## Test 123";
      const tags = extractTags(content);
      expect(tags).toContain("hello-world");
      expect(tags).toContain("test-123");
    });

    it("handles multiple headers", () => {
      const content = "# First\n## Second\n### Third";
      const tags = extractTags(content);
      expect(tags).toContain("first");
      expect(tags).toContain("second");
      expect(tags).toContain("third");
    });
  });

  describe("filename extraction", () => {
    it("extracts filename stem", () => {
      const content = "Some content";
      expect(extractTags(content, "README.md")).toContain("readme");
    });

    it("skips date-format filenames", () => {
      const content = "Content";
      const tags = extractTags(content, "2026-03-16.md");
      expect(tags).not.toContain("2026-03-16");
    });

    it("slugifies filename", () => {
      const content = "Content";
      expect(extractTags(content, "My File.md")).toContain("my-file");
    });
  });

  describe("keyword extraction", () => {
    it("extracts TODO keywords", () => {
      expect(extractTags("TODO: Fix this bug")).toContain("todo");
      expect(extractTags("todo: lowercase works too")).toContain("todo");
    });

    it("extracts FIXME keywords", () => {
      expect(extractTags("FIXME: This needs refactoring")).toContain("fixme");
    });

    it("extracts DECISION keywords", () => {
      expect(extractTags("DECISION: We will use TypeScript")).toContain("decision");
    });

    it("extracts IMPORTANT keywords", () => {
      expect(extractTags("IMPORTANT: Do not skip tests")).toContain("important");
    });

    it("extracts NOTE keywords", () => {
      expect(extractTags("NOTE: This is temporary")).toContain("note");
    });
  });

  describe("source tag", () => {
    it("always includes openclaw tag", () => {
      expect(extractTags("")).toContain("openclaw");
      expect(extractTags("any content")).toContain("openclaw");
    });
  });

  describe("tag limits", () => {
    it("limits to 10 tags maximum", () => {
      // Create content with many headers
      const content = Array.from({ length: 20 }, (_, i) => `# Header ${i}`).join("\n");
      const tags = extractTags(content);
      expect(tags.length).toBeLessThanOrEqual(10);
    });

    it("deduplicates tags", () => {
      const content = "# Same\n## Same\n### Same";
      const tags = extractTags(content);
      expect(tags.filter(t => t === "same").length).toBe(1);
    });
  });

  describe("combined extraction", () => {
    it("extracts from all sources", () => {
      const content = `# Deployment Guide
## Setup Process
TODO: Add monitoring
NOTE: Review before merge`;
      
      const tags = extractTags(content, "DEPLOY.md");
      
      expect(tags).toContain("deployment-guide");
      expect(tags).toContain("setup-process");
      expect(tags).toContain("todo");
      expect(tags).toContain("note");
      expect(tags).toContain("deploy");
      expect(tags).toContain("openclaw");
    });
  });
});

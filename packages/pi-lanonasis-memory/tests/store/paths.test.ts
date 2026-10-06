import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { homedir } from "node:os";

import {
  storagePaths,
  projectRoot,
  MEMORY_FILE,
  USER_FILE,
  STANDING_FILE,
  SKILLS_DIR,
} from "../../src/store/paths.js";

describe("storagePaths", () => {
  it("derives every path from the injected home", () => {
    const p = storagePaths("/h");
    expect(p).toEqual({
      globalRoot: join("/h", ".pi", "agent", "lanonasis-pi-memory"),
      dbPath: join("/h", ".pi", "agent", "lanonasis-pi-memory", "memories.db"),
      syncDbPath: join("/h", ".pi", "agent", "lanonasis-pi-memory", "sync.db"),
      projectsRoot: join("/h", ".pi", "agent", "projects-memory"),
    });
  });

  it("defaults to os.homedir()", () => {
    expect(storagePaths().globalRoot).toBe(join(homedir(), ".pi", "agent", "lanonasis-pi-memory"));
  });

  it("does not touch the filesystem", () => {
    // Pure function: a non-existent home must not throw.
    expect(() => storagePaths("/definitely/not/a/real/home")).not.toThrow();
  });
});

describe("projectRoot", () => {
  it("is <projectsRoot>/<slug>", () => {
    const p = storagePaths("/h");
    expect(projectRoot(p, "my-app")).toBe(join(p.projectsRoot, "my-app"));
  });

  it("rejects slugs that could escape projectsRoot", () => {
    const p = storagePaths("/h");
    expect(() => projectRoot(p, "../evil")).toThrow();
    expect(() => projectRoot(p, "a/b")).toThrow();
    expect(() => projectRoot(p, "")).toThrow();
  });
});

describe("file name constants", () => {
  it("match the three-file model", () => {
    expect(MEMORY_FILE).toBe("MEMORY.md");
    expect(USER_FILE).toBe("USER.md");
    expect(STANDING_FILE).toBe("STANDING.md");
    expect(SKILLS_DIR).toBe("skills");
  });
});

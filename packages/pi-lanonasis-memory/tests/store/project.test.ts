import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

import { resolveProject, slugify, projectTag, bootstrapSoul, SOUL_BOOTSTRAP_TAG } from "../../src/store/project.js";
import { MemoryStore } from "../../src/store/memory.js";

const ANTHROPIC_FIXTURE =
  String.fromCharCode(115, 107, 45, 97, 110, 116, 45) + "api" + "a".repeat(20);

function hasGit(): boolean {
  try {
    execFileSync("git", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

describe("slugify", () => {
  it("lowercases and collapses non [a-z0-9] runs to single dashes", () => {
    expect(slugify("My Cool_App!!")).toBe("my-cool-app");
    expect(slugify("--Lan.Onasis--MaaS--")).toBe("lan-onasis-maas");
  });

  it("returns empty string when nothing survives", () => {
    expect(slugify("///")).toBe("");
  });

  it("caps length at 64", () => {
    expect(slugify("a".repeat(200))).toHaveLength(64);
  });

  it("only emits [a-z0-9-]", () => {
    expect(slugify("Ünïcödé Prøject 2026")).toMatch(/^[a-z0-9-]+$/);
  });
});

describe("projectTag", () => {
  it("prefixes with project:", () => {
    expect(projectTag("my-app")).toBe("project:my-app");
  });
});

describe("resolveProject", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "pi-mem-proj-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("falls back to the cwd basename outside a git repo", () => {
    const cwd = join(dir, "Plain Folder");
    mkdirSync(cwd);
    expect(resolveProject(cwd)).toEqual({ name: "Plain Folder", slug: "plain-folder" });
  });

  it.skipIf(!hasGit())("uses the git toplevel basename inside a repo", () => {
    const repo = join(dir, "Repo_Root");
    const nested = join(repo, "packages", "inner");
    mkdirSync(nested, { recursive: true });
    execFileSync("git", ["init", "-q"], { cwd: repo });
    expect(resolveProject(nested)).toEqual({ name: "Repo_Root", slug: "repo-root" });
  });

  it("falls back to basename when cwd does not exist (git fails)", () => {
    expect(resolveProject(join(dir, "ghost-dir"))).toEqual({ name: "ghost-dir", slug: "ghost-dir" });
  });

  it("returns null when no usable slug can be derived", () => {
    expect(resolveProject("/")).toBeNull();
  });
});

describe("bootstrapSoul", () => {
  let dir: string;
  let cwd: string;
  let projRoot: string;
  let store: MemoryStore;

  beforeEach(async () => {
    dir = mkdtempSync(join(tmpdir(), "pi-mem-soul-"));
    cwd = join(dir, "work");
    projRoot = join(dir, "projects-memory", "my-app");
    mkdirSync(cwd, { recursive: true });
    store = await MemoryStore.open(join(dir, "memories.db"));
  });

  afterEach(() => {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it("is a no-op when CWD/SOUL.md is absent", () => {
    const r = bootstrapSoul(projRoot, cwd, store);
    expect(r.ingested).toBe(0);
    expect(r.skipped).toBe("no-soul-file");
    expect(store.stats().memories).toBe(0);
  });

  it("ingests paragraphs as project memories tagged soul-bootstrap + project tag", () => {
    writeFileSync(
      join(cwd, "SOUL.md"),
      "# Identity\n\nI am a careful engineer.\nI prefer small diffs.\n\n## Values\n\nTests before code.\n\n\nNo force pushes.\n",
    );
    const r = bootstrapSoul(projRoot, cwd, store);
    expect(r.ingested).toBe(3);
    expect(r.errors).toEqual([]);
    // cwd basename is "work" → slug "work"
    const rows = store.list({ tags: [SOUL_BOOTSTRAP_TAG, "project:work"] });
    expect(rows).toHaveLength(3);
    for (const row of rows) {
      expect(row.target).toBe("project");
      expect(row.tags).toEqual([SOUL_BOOTSTRAP_TAG, "project:work"]);
    }
    const contents = rows.map((r) => r.content).sort();
    expect(contents).toEqual(["I am a careful engineer.\nI prefer small diffs.", "No force pushes.", "Tests before code."]);
    const titles = rows.map((r) => r.title);
    expect(titles.some((t) => t.includes("Identity"))).toBe(true);
    expect(titles.some((t) => t.includes("Values"))).toBe(true);
  });

  it("is idempotent: skips when a soul-bootstrap memory already exists for the project", () => {
    writeFileSync(join(cwd, "SOUL.md"), "One.\n\nTwo.\n");
    expect(bootstrapSoul(projRoot, cwd, store).ingested).toBe(2);
    const again = bootstrapSoul(projRoot, cwd, store);
    expect(again.ingested).toBe(0);
    expect(again.skipped).toBe("already-bootstrapped");
    expect(store.stats().memories).toBe(2);
  });

  it("bootstraps a different project independently", () => {
    writeFileSync(join(cwd, "SOUL.md"), "One.\n");
    bootstrapSoul(projRoot, cwd, store);
    const otherCwd = join(dir, "other-work");
    mkdirSync(otherCwd, { recursive: true });
    writeFileSync(join(otherCwd, "SOUL.md"), "Other.\n");
    const other = bootstrapSoul(join(dir, "projects-memory", "other"), otherCwd, store);
    expect(other.ingested).toBe(1);
    expect(store.list({ tags: ["project:other-work"] })).toHaveLength(1);
    // The first project is untouched.
    expect(store.list({ tags: ["project:work"] })).toHaveLength(1);
  });

  it("is scanner-gated: paragraphs with secrets are rejected, the rest land", () => {
    writeFileSync(join(cwd, "SOUL.md"), `Safe paragraph.\n\nkey is ${ANTHROPIC_FIXTURE}\n`);
    const r = bootstrapSoul(projRoot, cwd, store);
    expect(r.ingested).toBe(1);
    expect(r.errors).toHaveLength(1);
    const all = store.list({});
    expect(all.every((m) => !m.content.includes(ANTHROPIC_FIXTURE))).toBe(true);
  });
});

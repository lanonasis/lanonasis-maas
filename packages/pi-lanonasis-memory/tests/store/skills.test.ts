import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { SkillsStore } from "../../src/store/skills.js";

function writeSkill(root: string, slug: string, body: string, dir = "skills"): void {
  const dirPath = join(root, dir, slug);
  mkdirSync(dirPath, { recursive: true });
  writeFileSync(join(dirPath, "SKILL.md"), body);
}

describe("SkillsStore", () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "pi-mem-skills-"));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("returns an empty list when no skills dir exists", () => {
    const s = new SkillsStore({ globalRoot: root });
    expect(s.list()).toEqual([]);
    expect(s.view("nope")).toBeNull();
  });

  it("reads name and description from SKILL.md YAML frontmatter", () => {
    writeSkill(
      root,
      "lint",
      `---\nname: lint\ndescription: Run project lint.\n---\n# body\n`,
    );
    writeSkill(
      root,
      "test",
      `---\nname: test\ndescription: Run the test suite.\n---\n`,
    );
    const s = new SkillsStore({ globalRoot: root });
    const list = s.list();
    expect(list).toHaveLength(2);
    const lint = list.find((e) => e.slug === "lint");
    expect(lint).toMatchObject({
      slug: "lint",
      scope: "global",
      description: "Run project lint.",
    });
    expect(lint?.path).toBe(join(root, "skills", "lint", "SKILL.md"));
  });

  it("view() returns the file text", () => {
    writeSkill(root, "lint", `---\nname: lint\ndescription: x\n---\nbody line\n`);
    const s = new SkillsStore({ globalRoot: root });
    expect(s.view("lint")).toContain("body line");
    expect(s.view("missing")).toBeNull();
  });

  it("project skills override global skills on slug clash", () => {
    writeSkill(
      root,
      "lint",
      `---\nname: lint\ndescription: global lint\n---\nglobal body\n`,
    );
    const projectRoot = join(root, "projects", "alpha");
    writeSkill(
      projectRoot,
      "lint",
      `---\nname: lint\ndescription: project lint\n---\nproject body\n`,
      "skills",
    );
    const s = new SkillsStore({ globalRoot: root, projectRoot });
    const lint = s.list().find((e) => e.slug === "lint");
    expect(lint?.scope).toBe("project");
    expect(lint?.description).toBe("project lint");
    expect(s.view("lint")).toContain("project body");
  });

  it("skips skills without a parseable name/description", () => {
    writeSkill(root, "broken", "no frontmatter here\n");
    writeSkill(
      root,
      "good",
      `---\nname: good\ndescription: a working skill\n---\n`,
    );
    const s = new SkillsStore({ globalRoot: root });
    expect(s.list().map((e) => e.slug)).toEqual(["good"]);
  });

  it("ignores non-directory entries under skills/", () => {
    mkdirSync(join(root, "skills"), { recursive: true });
    writeFileSync(join(root, "skills", "loose-file.md"), "ignored");
    writeSkill(root, "ok", `---\nname: ok\ndescription: ok\n---\n`);
    const s = new SkillsStore({ globalRoot: root });
    expect(s.list().map((e) => e.slug)).toEqual(["ok"]);
  });
});

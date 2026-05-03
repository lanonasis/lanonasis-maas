import { afterEach, describe, expect, it } from "vitest";
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { installHooks } from "../../scripts/install-hooks.js";

const tempRoots: string[] = [];

function createPaths() {
  const root = mkdtempSync(join(tmpdir(), "claude-memory-install-"));
  tempRoots.push(root);

  return {
    root,
    settingsPath: join(root, ".claude", "settings.json"),
    hooksDir: join(root, ".lanonasis", "hooks"),
    spoolDir: join(root, ".lanonasis", "maas-spool", "claude-code"),
  };
}

afterEach(() => {
  while (tempRoots.length > 0) {
    const root = tempRoots.pop();
    if (root) {
      rmSync(root, { recursive: true, force: true });
    }
  }
});

describe("installHooks", () => {
  it("creates settings.json when it is missing", () => {
    const paths = createPaths();

    installHooks(paths);

    const settings = JSON.parse(readFileSync(paths.settingsPath, "utf-8"));
    // Hooks are written as array-of-matchers format used by Claude Code
    expect(Array.isArray(settings.hooks.Stop)).toBe(true);
    expect(Array.isArray(settings.hooks.SubagentStop)).toBe(true);
    expect(Array.isArray(settings.hooks.PreCompact)).toBe(true);
    expect(Array.isArray(settings.hooks.PreToolUse)).toBe(true);
  });

  it("writes correct hook commands in array-of-matchers format", () => {
    const paths = createPaths();

    installHooks(paths);

    const settings = JSON.parse(readFileSync(paths.settingsPath, "utf-8"));
    const stopCommand = settings.hooks.Stop[0].hooks[0].command;
    expect(stopCommand).toBe(join(paths.hooksDir, "stop.sh"));
    const precompactCommand = settings.hooks.PreCompact[0].hooks[0].command;
    expect(precompactCommand).toBe(join(paths.hooksDir, "precompact.sh"));
    const recallCommand = settings.hooks.PreToolUse[0].hooks[0].command;
    expect(recallCommand).toBe(join(paths.hooksDir, "recall.sh"));
  });

  it("preserves existing settings and non-claude-memory hooks while adding hooks", () => {
    const paths = createPaths();
    mkdirSync(join(paths.root, ".claude"), { recursive: true });
    writeFileSync(
      paths.settingsPath,
      JSON.stringify(
        {
          theme: "dark",
          hooks: {
            Existing: {
              command: "/tmp/existing-hook.sh",
            },
          },
        },
        null,
        2,
      ),
      "utf-8",
    );

    installHooks(paths);

    const settings = JSON.parse(readFileSync(paths.settingsPath, "utf-8"));
    expect(settings.theme).toBe("dark");
    // Non-claude-memory hooks are preserved as-is
    expect(settings.hooks.Existing).toEqual({ command: "/tmp/existing-hook.sh" });
    // New claude-memory hooks are in array format
    expect(Array.isArray(settings.hooks.Stop)).toBe(true);
  });

  it("creates a backup before modifying settings", () => {
    const paths = createPaths();
    const original = JSON.stringify({ telemetry: false }, null, 2);
    mkdirSync(join(paths.root, ".claude"), { recursive: true });
    writeFileSync(paths.settingsPath, original, "utf-8");

    installHooks(paths);

    expect(existsSync(`${paths.settingsPath}.bak`)).toBe(true);
    expect(readFileSync(`${paths.settingsPath}.bak`, "utf-8")).toBe(original);
  });

  it("creates the spool directory", () => {
    const paths = createPaths();

    installHooks(paths);

    expect(existsSync(paths.spoolDir)).toBe(true);
    expect(statSync(paths.spoolDir).isDirectory()).toBe(true);
  });

  it("writes executable shell wrapper scripts for all hooks", () => {
    const paths = createPaths();

    installHooks(paths);

    const scripts = ["stop.sh", "subagent-stop.sh", "precompact.sh", "recall.sh"];
    for (const script of scripts) {
      const scriptPath = join(paths.hooksDir, script);
      expect(existsSync(scriptPath), `${script} should exist`).toBe(true);
      const content = readFileSync(scriptPath, "utf-8");
      expect(content.startsWith("#!/bin/sh"), `${script} should have shebang`).toBe(true);
      expect(content).toContain("bun");
      // Executable bit
      const mode = statSync(scriptPath).mode;
      expect(mode & 0o111, `${script} should be executable`).toBeGreaterThan(0);
    }
  });

  it("subagent-stop.sh sets CLAUDE_MEMORY_HOOK env var", () => {
    const paths = createPaths();

    installHooks(paths);

    const content = readFileSync(join(paths.hooksDir, "subagent-stop.sh"), "utf-8");
    expect(content).toContain("CLAUDE_MEMORY_HOOK=subagent_stop");
  });

  it("idempotent — running twice does not duplicate hook entries", () => {
    const paths = createPaths();

    installHooks(paths);
    installHooks(paths);

    const settings = JSON.parse(readFileSync(paths.settingsPath, "utf-8"));
    // Each event should only have ONE claude-memory entry
    expect(settings.hooks.Stop).toHaveLength(1);
    expect(settings.hooks.PreCompact).toHaveLength(1);
    expect(settings.hooks.PreToolUse).toHaveLength(1);
  });
});

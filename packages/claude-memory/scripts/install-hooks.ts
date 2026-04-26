import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "fs";
import { homedir } from "os";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";

export type InstallOptions = {
  settingsPath: string;
  hooksDir: string;
  spoolDir: string;
  /** Absolute path to the claude-memory package root. Defaults to the directory containing this script. */
  packageRoot?: string;
};

// Claude Code uses an array-of-matchers format for hooks
type HookCommand = { type: "command"; command: string };
type HookMatcher = { matcher?: string; hooks: HookCommand[] };
type ClaudeSettings = {
  hooks?: Record<string, HookMatcher[]>;
  [key: string]: unknown;
};

function defaultOptions(): InstallOptions {
  const home = homedir();
  const thisFile = fileURLToPath(import.meta.url);
  const packageRoot = resolve(dirname(thisFile), "..");
  return {
    settingsPath: join(home, ".claude", "settings.json"),
    hooksDir: join(home, ".lanonasis", "hooks"),
    spoolDir: join(home, ".lanonasis", "maas-spool", "claude-code"),
    packageRoot,
  };
}

function readSettings(settingsPath: string): ClaudeSettings {
  if (!existsSync(settingsPath)) return {};
  try {
    const parsed = JSON.parse(readFileSync(settingsPath, "utf-8"));
    if (parsed && typeof parsed === "object") return parsed as ClaudeSettings;
  } catch {
    // Corrupt settings — start fresh (backup already written by caller)
  }
  return {};
}

/** Replace any existing claude-memory entry for an event, preserve others. */
function mergeHookEntry(
  existing: HookMatcher[] | undefined,
  command: string,
): HookMatcher[] {
  const entry: HookMatcher = { hooks: [{ type: "command", command }] };
  if (!existing || !Array.isArray(existing)) return [entry];
  const others = existing.filter(
    (m) => !m.hooks?.some((h) => h.command?.includes("lanonasis/hooks/")),
  );
  return [...others, entry];
}

function writeShell(scriptPath: string, content: string): void {
  writeFileSync(scriptPath, content, { mode: 0o755 });
  chmodSync(scriptPath, 0o755);
}

export function installHooks(opts: InstallOptions): void {
  mkdirSync(dirname(opts.settingsPath), { recursive: true });
  mkdirSync(opts.hooksDir, { recursive: true });
  mkdirSync(opts.spoolDir, { recursive: true });

  if (existsSync(opts.settingsPath)) {
    copyFileSync(opts.settingsPath, `${opts.settingsPath}.bak`);
  }

  // --- Write shell wrapper scripts ---
  const packageRoot = opts.packageRoot ?? resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const hooksRoot = join(packageRoot, "hooks");

  writeShell(
    join(opts.hooksDir, "stop.sh"),
    `#!/bin/sh\nexec bun "${join(hooksRoot, "stop.ts")}"\n`,
  );

  // SubagentStop reuses stop.ts with a different env var
  writeShell(
    join(opts.hooksDir, "subagent-stop.sh"),
    `#!/bin/sh\nexec env CLAUDE_MEMORY_HOOK=subagent_stop bun "${join(hooksRoot, "stop.ts")}"\n`,
  );

  writeShell(
    join(opts.hooksDir, "precompact.sh"),
    `#!/bin/sh\nexec bun "${join(hooksRoot, "precompact.ts")}"\n`,
  );

  writeShell(
    join(opts.hooksDir, "recall.sh"),
    `#!/bin/sh\nexec bun "${join(hooksRoot, "recall.ts")}"\n`,
  );

  // --- Merge hook entries into settings.json ---
  const settings = readSettings(opts.settingsPath);
  const hooks: Record<string, HookMatcher[]> =
    settings.hooks && typeof settings.hooks === "object"
      ? { ...(settings.hooks as Record<string, HookMatcher[]>) }
      : {};

  hooks.Stop = mergeHookEntry(hooks.Stop, join(opts.hooksDir, "stop.sh"));
  hooks.SubagentStop = mergeHookEntry(hooks.SubagentStop, join(opts.hooksDir, "subagent-stop.sh"));
  hooks.PreCompact = mergeHookEntry(hooks.PreCompact, join(opts.hooksDir, "precompact.sh"));
  // PreToolUse: recall fires on first tool use only (session lock)
  hooks.PreToolUse = mergeHookEntry(hooks.PreToolUse, join(opts.hooksDir, "recall.sh"));

  settings.hooks = hooks;
  writeFileSync(opts.settingsPath, `${JSON.stringify(settings, null, 2)}\n`, "utf-8");

  console.log(`✓ Shell scripts written to ${opts.hooksDir}`);
  console.log(`  stop.sh, subagent-stop.sh, precompact.sh, recall.sh`);
  console.log(`✓ ~/.claude/settings.json patched (backup at ${opts.settingsPath}.bak)`);
  console.log(`✓ Spool dir ready: ${opts.spoolDir}`);
  console.log(``);
  console.log(`Required env vars:`);
  console.log(`  LANONASIS_API_KEY     — your LanOnasis API key`);
  console.log(`  LANONASIS_ORG_ID      — org scope override (optional)`);
  console.log(`  LANONASIS_PROJECT_ID  — legacy alias for LANONASIS_ORG_ID (optional)`);
}

if ((import.meta as { main?: boolean }).main) {
  installHooks(defaultOptions());
}

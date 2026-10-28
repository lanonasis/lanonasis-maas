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
type HookCommand = { type: "command"; command: string; timeout?: number };
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

/**
 * True when a command is this package's wrapper for `script` under either the
 * configured hooks directory or the legacy default location.
 */
function isClaudeMemoryCommand(
  command: string | undefined,
  script: string,
  hookDirs: string[],
): boolean {
  if (!command) return false;
  const commandPath = command.trim().replace(/^["']|["']$/g, "");
  return hookDirs.some((dir) => resolve(dir, script) === resolve(commandPath));
}

/**
 * Remove only this package's command for `script`, preserving unrelated
 * handlers in the same matcher and other commands in the same directory.
 */
function withoutClaudeMemory(
  existing: HookMatcher[] | undefined,
  script: string,
  hookDirs: string[],
): HookMatcher[] {
  if (!existing || !Array.isArray(existing)) return [];
  const kept: HookMatcher[] = [];
  for (const matcher of existing) {
    if (!Array.isArray(matcher.hooks)) {
      kept.push(matcher);
      continue;
    }
    const hooks = matcher.hooks.filter(
      (hook) => !isClaudeMemoryCommand(hook.command, script, hookDirs),
    );
    if (hooks.length === matcher.hooks.length) {
      kept.push(matcher);
    } else if (hooks.length > 0) {
      kept.push({ ...matcher, hooks });
    }
  }
  return kept;
}

function mergeHookEntry(
  existing: HookMatcher[] | undefined,
  command: string,
  timeout: number,
  script: string,
  hookDirs: string[],
): HookMatcher[] {
  const entry: HookMatcher = { hooks: [{ type: "command", command, timeout }] };
  return [...withoutClaudeMemory(existing, script, hookDirs), entry];
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

  // Match both the configured hooks dir and the legacy default so an install
  // that moved the directory still replaces its old entries.
  const hookDirs = [opts.hooksDir, join(homedir(), ".lanonasis", "hooks")];

  // Timeouts match hooks/hooks.json. Recall runs before every prompt, so it is the tightest.
  hooks.Stop = mergeHookEntry(hooks.Stop, join(opts.hooksDir, "stop.sh"), 10, "stop.sh", hookDirs);
  hooks.SubagentStop = mergeHookEntry(hooks.SubagentStop, join(opts.hooksDir, "subagent-stop.sh"), 10, "subagent-stop.sh", hookDirs);
  hooks.PreCompact = mergeHookEntry(hooks.PreCompact, join(opts.hooksDir, "precompact.sh"), 15, "precompact.sh", hookDirs);
  // Recall searches with the user's prompt, so it belongs on UserPromptSubmit.
  // Older installs registered it on PreToolUse; drop that copy.
  hooks.UserPromptSubmit = mergeHookEntry(hooks.UserPromptSubmit, join(opts.hooksDir, "recall.sh"), 5, "recall.sh", hookDirs);
  const preToolUse = withoutClaudeMemory(hooks.PreToolUse, "recall.sh", hookDirs);
  if (preToolUse.length > 0) hooks.PreToolUse = preToolUse;
  else delete hooks.PreToolUse;

  settings.hooks = hooks;
  writeFileSync(opts.settingsPath, `${JSON.stringify(settings, null, 2)}\n`, "utf-8");

  console.log(`✓ Shell scripts written to ${opts.hooksDir}`);
  console.log(`  stop.sh, subagent-stop.sh, precompact.sh, recall.sh`);
  console.log(`✓ ~/.claude/settings.json patched (backup at ${opts.settingsPath}.bak)`);
  console.log(`✓ Spool dir ready: ${opts.spoolDir}`);
  console.log(``);
  console.log(`Credentials: your \`lanonasis auth login\` session is used when set;`);
  console.log(`Optional env vars:`);
  console.log(`  LANONASIS_API_KEY     — overrides the CLI login`);
  console.log(`  LANONASIS_ORG_ID      — org scope override (optional)`);
  console.log(`  LANONASIS_PROJECT_ID  — legacy alias for LANONASIS_ORG_ID (optional)`);
}

if ((import.meta as { main?: boolean }).main) {
  installHooks(defaultOptions());
}

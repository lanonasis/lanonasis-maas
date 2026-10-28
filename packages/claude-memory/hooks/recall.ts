import { LanonasisClient } from "../client.js";
import type { PreToolInput, HookResult } from "../index.js";
import { looksLikePromptInjection, formatRecalledMemories, redactSecrets } from "../enrichment/prompt-safety.js";
import { parseConfig } from "../config.js";
import { basename } from "path";
import { execSync } from "child_process";
import { acquireRecallLock } from "./recall-lock.js";

type RecallOptions = {
  searchThreshold: number;
  maxRecallResults: number;
  cwd: string;
  gitBranch?: string;
};

// Long prompts are cut to what the search needs; the stop-gap hook used 200 too.
const PROMPT_QUERY_CHARS = 200;

function buildRecallQuery(input: PreToolInput, opts: RecallOptions): string {
  const prompt = input.prompt?.trim();
  if (prompt) return redactSecrets(prompt).slice(0, PROMPT_QUERY_CHARS);

  const parts: string[] = [];
  const projectName = basename(opts.cwd);
  if (projectName) parts.push(projectName);
  if (opts.gitBranch) parts.push(opts.gitBranch);
  if (input.tool_name) parts.push(input.tool_name);
  return parts.join(" ") || "session context";
}

export async function handleRecall(
  input: PreToolInput,
  client: LanonasisClient,
  opts: RecallOptions,
): Promise<HookResult> {
  try {
    const query = buildRecallQuery(input, opts);

    const memories = await Promise.race([
      client.searchMemories({
        query,
        threshold: opts.searchThreshold,
        limit: opts.maxRecallResults,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("recall timeout")), 3000),
      ),
    ]);

    if (!memories || memories.length === 0) {
      return {};
    }

    const filtered = memories.filter((m) => !looksLikePromptInjection(m.content));
    if (filtered.length === 0) return {};

    const formatted = formatRecalledMemories(
      filtered.map((m) => ({
        title: m.title,
        // The search API names this field memory_type.
        type: m.type ?? (m as { memory_type?: string }).memory_type ?? "memory",
        content: m.content,
        similarity: m.similarity,
      })),
    );

    return { result: formatted };
  } catch {
    return {};
  }
}

export async function handleRecallWithSessionLock(
  input: PreToolInput,
  client: LanonasisClient,
  opts: RecallOptions,
): Promise<HookResult> {
  if (!acquireRecallLock(input.session_id)) {
    return {};
  }
  return handleRecall(input, client, opts);
}

export function detectGitBranch(cwd: string): string | undefined {
  try {
    const branch = execSync("git rev-parse --abbrev-ref HEAD", {
      cwd,
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 1000,
    })
      .toString()
      .trim();
    if (!branch || branch === "HEAD") {
      return undefined;
    }
    return branch;
  } catch {
    return undefined;
  }
}

type RecallHookDeps = {
  makeClient?: (config: ReturnType<typeof parseConfig>) => LanonasisClient;
  cwd?: string;
};

/**
 * Runs one hook invocation and returns what to print. No exported key is
 * required: the client falls back to the `lanonasis auth login` session.
 * On UserPromptSubmit it searches with the prompt, every prompt; on
 * PreToolUse (older installs) it keeps the once-per-session lock.
 */
export async function runRecallHook(raw: string, deps: RecallHookDeps = {}): Promise<string> {
  const input: PreToolInput = JSON.parse(raw);
  const config = parseConfig({
    apiKey: process.env.LANONASIS_API_KEY ?? "",
    orgId: process.env.LANONASIS_ORG_ID ?? "",
    projectId: process.env.LANONASIS_PROJECT_ID ?? "",
  });
  const client = deps.makeClient ? deps.makeClient(config) : new LanonasisClient(config);
  const cwd = deps.cwd ?? process.env.CLAUDE_CWD ?? process.cwd();
  const opts = {
    searchThreshold: config.searchThreshold ?? 0.55,
    maxRecallResults: config.maxRecallResults ?? 5,
    cwd,
    gitBranch: detectGitBranch(cwd),
  };

  const event = input.hook_event_name ?? (input.prompt ? "UserPromptSubmit" : "PreToolUse");
  const result = event === "UserPromptSubmit"
    ? await handleRecall(input, client, opts)
    : await handleRecallWithSessionLock(input, client, opts);
  if (!result.result) return "";

  return JSON.stringify({
    hookSpecificOutput: { hookEventName: event, additionalContext: result.result },
  });
}

// Hook entry point — Claude Code pipes the hook JSON to stdin
// import.meta.main, not stdin.isTTY: bun leaves isTTY undefined for piped stdin.
if ((import.meta as { main?: boolean }).main) {
  let raw = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => { raw += chunk; });
  process.stdin.on("end", async () => {
    try {
      const out = await runRecallHook(raw);
      if (out) process.stdout.write(out);
    } catch (err) {
      process.stderr.write(`[claude-memory] recall hook error: ${err}\n`);
    }
    process.exit(0);
  });
}

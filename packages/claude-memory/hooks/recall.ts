import { LanonasisClient } from "../client.js";
import type { PreToolInput, HookResult } from "../index.js";
import { looksLikePromptInjection, formatRecalledMemories } from "../enrichment/prompt-safety.js";
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

function buildRecallQuery(input: PreToolInput, opts: RecallOptions): string {
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
        type: m.type,
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

// Hook entry point — Claude Code pipes PreToolUse JSON to stdin
if (process.stdin.isTTY === false) {
  let raw = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => { raw += chunk; });
  process.stdin.on("end", async () => {
    try {
      const input: PreToolInput = JSON.parse(raw);
      const config = parseConfig({
        apiKey: process.env.LANONASIS_API_KEY ?? "",
        orgId: process.env.LANONASIS_ORG_ID ?? "",
        projectId: process.env.LANONASIS_PROJECT_ID ?? "",
      });
      if (!config.apiKey) {
        process.exit(0); // No key — skip recall silently
      }
      const client = new LanonasisClient(config);
      const cwd = process.env.CLAUDE_CWD ?? process.cwd();
      const result = await handleRecallWithSessionLock(input, client, {
        searchThreshold: config.searchThreshold ?? 0.55,
        maxRecallResults: config.maxRecallResults ?? 5,
        cwd,
        gitBranch: detectGitBranch(cwd),
      });
      if (result.result) {
        process.stdout.write(JSON.stringify(result));
      }
    } catch (err) {
      process.stderr.write(`[claude-memory] recall hook error: ${err}\n`);
    }
    process.exit(0);
  });
}

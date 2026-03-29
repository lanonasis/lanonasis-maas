import { createHash } from "crypto";
import { readFileSync } from "fs";
import { LanonasisClient, type LanCreateParams } from "../client.js";
import { parseConfig } from "../config.js";
import { extractDecisionChains } from "../enrichment/chain-extractor.js";
import { shouldCapture } from "../enrichment/capture-filter.js";
import { redactSecrets } from "../enrichment/prompt-safety.js";
import { extractTags } from "../enrichment/tag-extractor.js";
import { detectMemoryType } from "../enrichment/type-detector.js";
import type { StopInput } from "../index.js";
import { SpoolQueue } from "../spool.js";
import { clearRecallLock } from "./recall-lock.js";

type StopHookName = "stop" | "subagent_stop";

export type StopOptions = {
  maxMemoriesPerSession: number;
  projectId?: string;
  agentType?: string;
  hook?: StopHookName;
};

type StopClient = Pick<LanonasisClient, "createMemory">;
type StopSpool = Pick<SpoolQueue, "write" | "drain">;
type TranscriptMessage = {
  role: string;
  content: string | Array<{ type: string; text?: string }>;
};

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function normalizeContent(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function resolveScopeForIdempotency(projectId?: string): string {
  const scope = projectId?.trim();
  return scope ? scope : "default";
}

function parseTranscript(transcriptPath: string): TranscriptMessage[] {
  const raw = readFileSync(transcriptPath, "utf-8");
  const lines = raw.split("\n");
  const messages: TranscriptMessage[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === "object") {
        messages.push(parsed as TranscriptMessage);
      }
    } catch {
      // Skip malformed lines so a partial transcript can still be captured.
    }
  }

  return messages;
}

function resolveOptions(opts?: Partial<StopOptions>): StopOptions {
  return {
    maxMemoriesPerSession: opts?.maxMemoriesPerSession ?? 5,
    projectId: opts?.projectId ?? "",
    agentType: opts?.agentType ?? "claude-code",
    hook: opts?.hook ?? "stop",
  };
}

function buildMemories(input: StopInput, opts: StopOptions): LanCreateParams[] {
  const messages = parseTranscript(input.transcript_path);
  const chains = extractDecisionChains(messages)
    .filter((chain) => shouldCapture(chain.content, { strict: false }))
    .slice(0, opts.maxMemoriesPerSession);

  return chains.map((chain) => {
    const content = redactSecrets(chain.content);
    const title = redactSecrets(chain.title);
    const type = detectMemoryType(content);
    const normalizedContent = normalizeContent(content);
    const scopeForIdempotency = resolveScopeForIdempotency(opts.projectId);

    return {
      title,
      content,
      type,
      tags: extractTags(content),
      metadata: {
        source: "claude-code",
        hook: opts.hook,
        session_id: input.session_id,
        agent_type: opts.agentType,
        chain_type: chain.type,
        num_turns: input.num_turns,
        total_cost: input.total_cost,
      },
      idempotency_key: sha256(
        [
          scopeForIdempotency,
          opts.agentType ?? "claude-code",
          type,
          normalizedContent.slice(0, 500),
        ].join(":"),
      ),
    };
  });
}

async function drainSpool(client: StopClient, spool: StopSpool): Promise<void> {
  await spool.drain(async (entry) => {
    for (const memory of entry.memories) {
      await client.createMemory({
        title: memory.title,
        content: memory.content,
        type: memory.type as LanCreateParams["type"],
        tags: memory.tags,
        metadata: memory.metadata,
      });
    }
  });
}

function buildRuntimeDependencies(
  opts?: Partial<StopOptions>,
): {
  client: StopClient;
  spool: StopSpool;
  options: StopOptions;
} {
  const config = parseConfig({
    apiKey: process.env.LANONASIS_API_KEY ?? "",
    orgId: process.env.LANONASIS_ORG_ID ?? "",
    projectId: process.env.LANONASIS_PROJECT_ID ?? "",
    agentType: process.env.CLAUDE_MEMORY_AGENT_TYPE ?? opts?.agentType,
    spoolDir: process.env.CLAUDE_MEMORY_SPOOL_DIR,
    maxMemoriesPerSession: opts?.maxMemoriesPerSession,
  });
  const options = resolveOptions({
    maxMemoriesPerSession: config.maxMemoriesPerSession,
    projectId: opts?.projectId ?? config.projectId,
    agentType: opts?.agentType ?? config.agentType,
    hook: opts?.hook,
  });

  return {
    client: new LanonasisClient(config),
    spool: new SpoolQueue(config.spoolDir, options.agentType),
    options,
  };
}

export async function handleStop(
  input: StopInput,
  client?: StopClient,
  spool?: StopSpool,
  opts?: Partial<StopOptions>,
): Promise<void> {
  try {
    const runtime = !client || !spool ? buildRuntimeDependencies(opts) : null;
    const resolvedOptions = runtime?.options ?? resolveOptions(opts);
    const resolvedClient = runtime?.client ?? client;
    const resolvedSpool = runtime?.spool ?? spool;

    if (!resolvedClient || !resolvedSpool) {
      return;
    }

    const memories = buildMemories(input, resolvedOptions);
    let directWriteFailed = false;

    for (const memory of memories) {
      try {
        await resolvedClient.createMemory(memory);
      } catch {
        directWriteFailed = true;
        break;
      }
    }

    if (directWriteFailed) {
      try {
        await resolvedSpool.write(input.session_id, memories);
      } catch (spoolErr) {
        process.stderr.write(`[claude-memory] spool write error: ${spoolErr}\n`);
        return;
      }
    }

    try {
      await drainSpool(resolvedClient, resolvedSpool);
    } catch (drainErr) {
      process.stderr.write(`[claude-memory] drain error: ${drainErr}\n`);
    }
  } catch (err) {
    process.stderr.write(`[claude-memory] stop hook error: ${err}\n`);
  } finally {
    clearRecallLock(input.session_id);
  }
}

// Hook entry point — Claude Code calls this via stdin JSON
if (process.stdin.isTTY === false) {
  let raw = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => {
    raw += chunk;
  });
  process.stdin.on("end", async () => {
    try {
      const input: StopInput = JSON.parse(raw);
      if (!(process.env.LANONASIS_API_KEY ?? "").trim()) {
        clearRecallLock(input.session_id);
        process.exit(0);
      }
      const hook = (process.env.CLAUDE_MEMORY_HOOK as StopHookName) ?? "stop";
      await handleStop(input, undefined, undefined, { hook });
    } catch (err) {
      // Never crash Claude Code
      process.stderr.write(`[claude-memory] hook error: ${err}\n`);
    }
    process.exit(0);
  });
}

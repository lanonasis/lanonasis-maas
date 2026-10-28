import { createHash } from "crypto";
import { readFileSync } from "fs";
import { LanonasisClient, type LanCreateParams } from "../client.js";
import { parseConfig } from "../config.js";
import { extractDecisionChains } from "../enrichment/chain-extractor.js";
import { shouldCapture } from "../enrichment/capture-filter.js";
import { redactSecrets } from "../enrichment/prompt-safety.js";
import { extractTags } from "../enrichment/tag-extractor.js";
import { detectMemoryType } from "../enrichment/type-detector.js";
import type { PreCompactInput } from "../index.js";
import { SpoolQueue } from "../spool.js";

export type PreCompactOptions = {
  maxMemoriesPerCompaction: number;
  projectId?: string;
  agentType?: string;
};

type PreCompactClient = Pick<LanonasisClient, "createMemory">;
type PreCompactSpool = Pick<SpoolQueue, "write" | "remove">;
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
        // Claude Code JSONL wraps the message inside a `message` field:
        // { type: "user"|"assistant", message: { role, content }, ... }
        const msg = (parsed as Record<string, unknown>).message ?? parsed;
        if (msg && typeof (msg as Record<string, unknown>).role === "string") {
          messages.push(msg as TranscriptMessage);
        }
      }
    } catch {
      // Skip malformed lines so we still preserve the rest of the transcript.
    }
  }

  return messages;
}

function resolveOptions(opts?: Partial<PreCompactOptions>): PreCompactOptions {
  return {
    maxMemoriesPerCompaction: opts?.maxMemoriesPerCompaction ?? 3,
    projectId: opts?.projectId ?? "",
    agentType: opts?.agentType ?? "claude-code",
  };
}

function buildMemories(
  input: PreCompactInput,
  opts: PreCompactOptions,
): LanCreateParams[] {
  const messages = parseTranscript(input.transcript_path);
  const enriched = extractDecisionChains(messages)
    .filter((chain) => shouldCapture(chain.content, { strict: true }))
    .map((chain, index) => {
      const content = redactSecrets(chain.content);
      const title = redactSecrets(chain.title);
      const type = detectMemoryType(content);
      const normalizedContent = normalizeContent(content);
      const scopeForIdempotency = resolveScopeForIdempotency(opts.projectId);
      const priority = type === "knowledge" || type === "project" ? 0 : 1;

      return {
        priority,
        index,
        memory: {
          title,
          content,
          type,
          tags: extractTags(content),
          metadata: {
            source: "claude-code-precompact",
            hook: "precompact",
            key_context: "personal",
            session_id: input.session_id,
            agent_type: opts.agentType,
            chain_type: chain.type,
            num_messages: input.num_messages,
            context_window_usage: input.context_window_usage,
          },
          idempotency_key: sha256(
            [
              scopeForIdempotency,
              opts.agentType ?? "claude-code",
              type,
              normalizedContent.slice(0, 500),
            ].join(":"),
          ),
        } satisfies LanCreateParams,
      };
    });

  enriched.sort((a, b) => a.priority - b.priority || a.index - b.index);
  return enriched
    .slice(0, opts.maxMemoriesPerCompaction)
    .map((entry) => entry.memory);
}

function buildRuntimeDependencies(
  opts?: Partial<PreCompactOptions>,
): {
  client: PreCompactClient;
  spool: PreCompactSpool;
  options: PreCompactOptions;
} {
  const config = parseConfig({
    apiKey: process.env.LANONASIS_API_KEY ?? "",
    orgId: process.env.LANONASIS_ORG_ID ?? "",
    projectId: process.env.LANONASIS_PROJECT_ID ?? "",
    agentType: process.env.CLAUDE_MEMORY_AGENT_TYPE ?? opts?.agentType,
    spoolDir: process.env.CLAUDE_MEMORY_SPOOL_DIR,
    maxMemoriesPerCompaction: opts?.maxMemoriesPerCompaction,
  });
  const options = resolveOptions({
    maxMemoriesPerCompaction: config.maxMemoriesPerCompaction,
    projectId: opts?.projectId ?? config.projectId,
    agentType: opts?.agentType ?? config.agentType,
  });

  return {
    client: new LanonasisClient(config),
    spool: new SpoolQueue(config.spoolDir, options.agentType),
    options,
  };
}

export async function handlePreCompact(
  input: PreCompactInput,
  client?: PreCompactClient,
  spool?: PreCompactSpool,
  opts?: Partial<PreCompactOptions>,
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

    // Spool before the network: a hook deadline can kill the process while
    // createMemory retries. Successful writes are removed from the spool below.
    try {
      await resolvedSpool.write(input.session_id, memories);
    } catch (spoolErr) {
      process.stderr.write(`[claude-memory] spool write error: ${spoolErr}\n`);
    }

    const failed: LanCreateParams[] = [];
    for (const memory of memories) {
      try {
        await resolvedClient.createMemory(memory);
      } catch {
        failed.push(memory);
      }
    }

    try {
      if (failed.length === 0) {
        await resolvedSpool.remove(input.session_id);
      } else {
        // Keep only captures that still need a write, so a later drain cannot
        // replay ones that already succeeded in this run.
        await resolvedSpool.write(input.session_id, failed);
      }
    } catch (spoolErr) {
      process.stderr.write(`[claude-memory] spool update error: ${spoolErr}\n`);
    }
  } catch (err) {
    process.stderr.write(`[claude-memory] precompact hook error: ${err}\n`);
  }
}

// Hook entry point
// import.meta.main, not stdin.isTTY: bun leaves isTTY undefined for piped stdin.
if ((import.meta as { main?: boolean }).main) {
  let raw = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => {
    raw += chunk;
  });
  process.stdin.on("end", async () => {
    try {
      const input: PreCompactInput = JSON.parse(raw);
      await handlePreCompact(input);
    } catch (err) {
      process.stderr.write(`[claude-memory] precompact hook error: ${err}\n`);
    }
    process.exit(0);
  });
}

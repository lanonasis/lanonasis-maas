#!/usr/bin/env bun
/**
 * migrate-sessions.ts
 * Backfills historical Claude Code sessions into MaaS memory bank.
 *
 * Usage:
 *   bun run migrate [--dry-run] [--days 30] [--verbose] [--project <path>]
 *
 * Options:
 *   --dry-run           Show what would be saved, no API writes
 *   --days <n>          Only process sessions modified in the last N days (default: 30)
 *   --verbose           Print each chain candidate
 *   --project <path>    Restrict to a specific project dir under ~/.claude/projects/
 */

import { createHash } from "crypto";
import { readFileSync, readdirSync, statSync } from "fs";
import { homedir } from "os";
import { join, basename } from "path";
import { LanonasisClient } from "../client.js";
import { parseConfig } from "../config.js";
import { SpoolQueue } from "../spool.js";
import { extractDecisionChains } from "../enrichment/chain-extractor.js";
import { shouldCapture } from "../enrichment/capture-filter.js";
import { redactSecrets } from "../enrichment/prompt-safety.js";
import { extractTags } from "../enrichment/tag-extractor.js";
import { detectMemoryType } from "../enrichment/type-detector.js";

// ── CLI args ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const verbose = args.includes("--verbose");
const daysIdx = args.indexOf("--days");
const days = daysIdx !== -1 ? parseInt(args[daysIdx + 1] ?? "30", 10) : 30;
const projectIdx = args.indexOf("--project");
const projectFilter = projectIdx !== -1 ? args[projectIdx + 1] : undefined;

// ── Config ────────────────────────────────────────────────────────────────────

const cfg = parseConfig({
  apiKey: process.env.LANONASIS_API_KEY ?? "",
  orgId: process.env.LANONASIS_ORG_ID ?? "",
  projectId: process.env.LANONASIS_PROJECT_ID ?? "",
  agentType: "claude-code",
});

if (!cfg.apiKey && !dryRun) {
  console.error("LANONASIS_API_KEY not set — run with --dry-run or set the key");
  process.exit(1);
}

const client = cfg.apiKey ? new LanonasisClient(cfg) : null;
const spool = new SpoolQueue(cfg.spoolDir, "claude-code");

// ── Helpers ───────────────────────────────────────────────────────────────────

type Message = { role: string; content: string | Array<{ type: string; text?: string }> };

function parseJsonl(filePath: string): Message[] {
  const lines = readFileSync(filePath, "utf-8").split("\n");
  const messages: Message[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const obj = JSON.parse(trimmed) as Record<string, unknown>;
      const msg = (obj.message ?? obj) as Record<string, unknown>;
      if (typeof msg.role === "string") {
        messages.push(msg as unknown as Message);
      }
    } catch {
      // skip malformed lines
    }
  }
  return messages;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function findJsonlFiles(baseDir: string, cutoffMs: number, filter?: string): string[] {
  const results: string[] = [];
  let dirs: string[];
  try {
    dirs = readdirSync(baseDir);
  } catch {
    return results;
  }
  for (const dir of dirs) {
    if (filter && !dir.includes(filter)) continue;
    const dirPath = join(baseDir, dir);
    try {
      const stat = statSync(dirPath);
      if (!stat.isDirectory()) continue;
      for (const file of readdirSync(dirPath)) {
        if (!file.endsWith(".jsonl")) continue;
        const filePath = join(dirPath, file);
        const fstat = statSync(filePath);
        if (fstat.mtimeMs >= cutoffMs) {
          results.push(filePath);
        }
      }
    } catch {
      continue;
    }
  }
  return results;
}

// ── Main ──────────────────────────────────────────────────────────────────────

const claudeProjectsDir = join(homedir(), ".claude", "projects");
const cutoffMs = Date.now() - days * 24 * 60 * 60 * 1000;

const files = findJsonlFiles(claudeProjectsDir, cutoffMs, projectFilter);

console.log(`\nclaude-memory migrate`);
console.log(`  Mode     : ${dryRun ? "DRY RUN (no writes)" : "LIVE"}`);
console.log(`  Days     : last ${days} days`);
console.log(`  Sessions : ${files.length} .jsonl files found`);
if (projectFilter) console.log(`  Filter   : ${projectFilter}`);
console.log();

let totalChains = 0;
let totalSaved = 0;
let totalSkipped = 0;
let totalFailed = 0;

for (const filePath of files) {
  const sessionId = basename(filePath, ".jsonl");
  const messages = parseJsonl(filePath);
  if (messages.length === 0) continue;

  const chains = extractDecisionChains(messages).filter((c) =>
    shouldCapture(c.content, { strict: false }),
  );

  if (chains.length === 0) {
    if (verbose) console.log(`  [skip] ${sessionId} — no chains`);
    continue;
  }

  totalChains += chains.length;
  console.log(`  ${sessionId.slice(0, 8)}… — ${chains.length} chains`);

  for (const chain of chains) {
    const content = redactSecrets(chain.content);
    const title = redactSecrets(chain.title);
    const type = detectMemoryType(content);
    const idempotencyKey = sha256(
      ["migration", "claude-code", type, content.replace(/\s+/g, " ").trim().slice(0, 500)].join(":"),
    );

    if (verbose) {
      console.log(`    [${chain.type}] ${title.slice(0, 70)}`);
    }

    if (dryRun) {
      totalSaved++;
      continue;
    }

    if (!client) continue;

    try {
      await client.createMemory({
        title,
        content,
        type: type as Parameters<typeof client.createMemory>[0]["type"],
        tags: extractTags(content),
        metadata: {
          source: "claude-code-migration",
          hook: "migration",
          session_id: sessionId,
          agent_type: "claude-code",
          chain_type: chain.type,
        },
        idempotency_key: idempotencyKey,
      });
      totalSaved++;
    } catch (err) {
      totalFailed++;
      if (verbose) console.error(`    [error] ${err instanceof Error ? err.message : err}`);
      // spool the whole session batch on first failure
      try {
        await spool.write(sessionId, chains.map((c) => ({
          title: redactSecrets(c.title),
          content: redactSecrets(c.content),
          type: detectMemoryType(c.content),
          tags: extractTags(c.content),
          metadata: { source: "claude-code-migration", hook: "migration", session_id: sessionId },
        })));
      } catch {
        // spool write failed too — just continue
      }
      break;
    }
  }
}

console.log();
console.log(`Done.`);
console.log(`  Chains found : ${totalChains}`);
console.log(`  Saved        : ${totalSaved}${dryRun ? " (dry-run)" : ""}`);
if (totalSkipped) console.log(`  Skipped      : ${totalSkipped}`);
if (totalFailed)  console.log(`  Failed       : ${totalFailed}`);

#!/usr/bin/env node

import { parseConfig } from "./config.js";
import { LanonasisClient } from "./client.js";
import { SpoolQueue } from "./spool.js";

async function main() {
  const command = process.argv[2];

  const cfg = parseConfig({
    apiKey: process.env.LANONASIS_API_KEY ?? "",
    orgId: process.env.LANONASIS_ORG_ID ?? "",
    projectId: process.env.LANONASIS_PROJECT_ID ?? "",
  });

  const offlineCommands = new Set([undefined, "help", "spool", "stats"]);
  if (!cfg.apiKey && !offlineCommands.has(command)) {
    console.error("LANONASIS_API_KEY not set");
    process.exit(1);
  }

  const client = cfg.apiKey ? new LanonasisClient(cfg) : null;
  const spool = new SpoolQueue(cfg.spoolDir, cfg.agentType);

  switch (command) {
    case "status": {
      if (!client) { console.error("LANONASIS_API_KEY not set"); break; }
      try {
        const health = await client.getHealth();
        const { total } = await client.listMemories({ limit: 1 });
        const spoolCount = await spool.count();
        console.log(`Connected | ${health.version} | ${total} memories | spool: ${spoolCount} pending`);
      } catch (err) {
        console.error(`Disconnected: ${err instanceof Error ? err.message : err}`);
      }
      break;
    }

    case "search": {
      if (!client) { console.error("LANONASIS_API_KEY not set"); break; }
      const query = process.argv.slice(3).join(" ");
      if (!query) { console.error("Usage: claude-memory search <query>"); break; }
      const results = await client.searchMemories({ query, threshold: cfg.searchThreshold, limit: 10 });
      for (const m of results) {
        const score = m.similarity?.toFixed(2) ?? "?";
        const type = m.type ?? (m as Record<string, unknown>).memory_type ?? "unknown";
        console.log(`  [${type}] ${m.title} (${score})`);
      }
      if (results.length === 0) console.log("  No results.");
      break;
    }

    case "list": {
      if (!client) { console.error("LANONASIS_API_KEY not set"); break; }
      const { memories } = await client.listMemories({ limit: 20 });
      for (const m of memories) {
        const date = m.created_at?.slice(0, 10) ?? "?";
        const type = m.type ?? (m as Record<string, unknown>).memory_type ?? "unknown";
        console.log(`  ${date} [${type}] ${m.title}`);
      }
      if (memories.length === 0) console.log("  No memories yet.");
      break;
    }

    case "spool": {
      const entries = await spool.list();
      console.log(`${entries.length} pending spool entries`);
      for (const e of entries) {
        console.log(`  ${e.sessionId} — ${e.memories.length} memories — spooled ${e.spooledAt}`);
      }
      break;
    }

    case "drain": {
      if (!client) { console.error("LANONASIS_API_KEY not set"); break; }
      const result = await spool.drain(async (entry) => {
        for (const mem of entry.memories) {
          await client.createMemory({
            title: mem.title,
            content: mem.content,
            type: mem.type as any,
            tags: mem.tags,
            metadata: mem.metadata,
          });
        }
      });
      console.log(`Drained: ${result.processed} processed, ${result.failed} failed`);
      break;
    }

    case "stats": {
      const spoolCount = await spool.count();
      console.log(`Spool: ${spoolCount} pending entries`);
      console.log(`Spool dir: ${cfg.spoolDir}`);
      console.log(`Agent type: ${cfg.agentType}`);
      console.log(`API: ${cfg.baseUrl}`);
      break;
    }

    default:
      console.log("claude-memory — Cross-session semantic memory for Claude Code");
      console.log("");
      console.log("Usage: claude-memory <command>");
      console.log("");
      console.log("Commands:");
      console.log("  status   — Connection health + memory count + spool status");
      console.log("  search   — Semantic search across stored memories");
      console.log("  list     — Show recent memories");
      console.log("  spool    — Show pending spool entries (offline queue)");
      console.log("  drain    — Retry sending spooled entries to MaaS");
      console.log("  stats    — Local configuration and counts");
      console.log("");
      console.log("Environment:");
      console.log("  LANONASIS_API_KEY       — Required for API operations");
      console.log("  LANONASIS_ORG_ID        — Org scope override (optional)");
      console.log("  LANONASIS_PROJECT_ID    — Legacy alias for LANONASIS_ORG_ID (optional)");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

/**
 * memory-sync.ts — `/memory-sync <subcommand>`
 *
 * Operator-facing sync housekeeping. Two subcommands:
 *   status               — show depth, dropped count, online state, client configured (NO key)
 *   prune [days]         — clear dropped rows + queued rows older than `days`
 *                          (default: dropped rows + queued rows older than 30 days)
 *
 * Implementation: defers entirely to `SyncAdapter.status()` and
 * `SyncAdapter.prune()`. The runtime owns the queue; this command is the
 * command-line veneer.
 *
 * Security — VERA: status never reads LANONASIS_API_KEY. The MaaS adapter
 * reports `clientConfigured: true` only when the client exists; the key
 * is never echoed.
 */

import type { CommandDeps, CommandRegister } from "./types.js";

export const register: CommandRegister = (pi, deps) => {
  pi.registerCommand("memory-sync", {
    description: "/memory-sync status | prune [days] — sync housekeeping.",
    handler: async (args, ctx) => {
      try {
        const parts = args.trim().split(/\s+/);
        const sub = (parts[0] ?? "status").toLowerCase();
        if (sub === "" || sub === "status") {
          await runStatus(deps, ctx);
          return;
        }
        if (sub === "prune") {
          await runPrune(deps, parts, ctx);
          return;
        }
        ctx.ui.notify(
          `memory-sync: unknown subcommand '${sub}'; try 'status' or 'prune [days]'`,
          "error",
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        ctx.ui.notify(`memory-sync: failed: ${msg}`, "error");
      }
    },
  });
};

async function runStatus(
  deps: CommandDeps,
  ctx: { ui: { notify: (m: string, level?: "info" | "warning" | "error") => void } },
): Promise<void> {
  const sync = deps.getSync();
  if (!sync.status) {
    ctx.ui.notify(
      "memory-sync: status not available (no SyncQueue open for this session)",
      "info",
    );
    return;
  }
  const s = await sync.status();
  const online = s.online ? "online" : "offline";
  const configured = s.clientConfigured ? "yes" : "no";
  ctx.ui.notify(
    [
      `memory-sync status:`,
      `  depth: ${s.depth}/${s.maxDepth}`,
      `  dropped: ${s.dropped}`,
      `  network: ${online}`,
      `  client configured: ${configured}`,
    ].join("\n"),
    "info",
  );
}

async function runPrune(
  deps: CommandDeps,
  parts: string[],
  ctx: { ui: { notify: (m: string, level?: "info" | "warning" | "error") => void } },
): Promise<void> {
  const sync = deps.getSync();
  if (!sync.prune) {
    ctx.ui.notify(
      "memory-sync: prune not available (no SyncQueue open for this session)",
      "info",
    );
    return;
  }
  // Default: clear dropped log + queued rows older than 30 days.
  const daysArg = parts[1];
  let olderThanDays = 30;
  if (daysArg !== undefined) {
    const n = Number(daysArg);
    if (Number.isFinite(n) && n >= 0) olderThanDays = n;
  }
  const { queued, dropped } = sync.prune({ olderThanDays, dropped: true });
  ctx.ui.notify(
    `memory-sync: pruned ${queued} queued (>= ${olderThanDays}d) and ${dropped} dropped rows`,
    "info",
  );
}

export { register as registerMemorySyncCommand };
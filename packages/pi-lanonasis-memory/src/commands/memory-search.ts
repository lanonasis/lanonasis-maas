/**
 * memory-search.ts — `/memory search <q> [limit]`
 *
 * Thin command-layer wrapper over the `memory_search` tool. Parses the
 * argument string, delegates to `searchMemory`, and pretty-prints the
 * results via `ctx.ui.notify`. Errors are caught and surfaced via
 * `ctx.ui.notify(level="error")` — never thrown to Pi.
 */

import type { CommandRegister } from "./types.js";
import { searchMemory } from "../tools/memory_search.js";

export const register: CommandRegister = (pi, deps) => {
  pi.registerCommand("memory", {
    description:
      "/memory search <q> [limit] — search local memories (FTS5 + optional MaaS enrichment).",
    handler: async (args, ctx) => {
      try {
        const parsed = parseSearchArgs(args);
        if (parsed.error) {
          ctx.ui.notify(`memory: ${parsed.error}`, "error");
          return;
        }
        if (parsed.subcommand !== "search") {
          ctx.ui.notify(
            `memory: unknown subcommand '${parsed.subcommand}'; try 'memory search <q>'`,
            "error",
          );
          return;
        }

        const details = await searchMemory(
          deps.getStore(),
          deps.getMaas(),
          { query: parsed.query, limit: parsed.limit },
        );

        if (details.hits.length === 0) {
          ctx.ui.notify(
            `memory: no matches for "${details.query}"`,
            "info",
          );
          return;
        }

        const lines = details.hits.map(
          (h, i) =>
            `${i + 1}. [${h.target}${h.category ? "/" + h.category : ""}] ` +
            `${h.title} — ${h.id.slice(0, 8)} (score=${h.score.toFixed(2)})`,
        );
        ctx.ui.notify(
          `memory: ${details.hits.length} hit(s) for "${details.query}" (source=${details.source}):\n${lines.join("\n")}`,
          "info",
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        ctx.ui.notify(`memory: search failed: ${msg}`, "error");
      }
    },
  });
};

export interface ParsedSearchArgs {
  subcommand: string;
  query: string;
  limit?: number;
  error?: string;
}

/**
 * Parse `args` into a subcommand + query + limit. Pure, never fails in a way
 * that throws — returns an `error` string the caller can display.
 *
 * Accepts these forms (after the slash command has stripped the leading
 * `memory`):
 *   ` search <query>`         → { subcommand: 'search', query, limit? }
 *   ` search <query> 25`      → { subcommand: 'search', query, limit: 25 }
 *   ` <anything-else>`        → { error: '...' } or other-subcommand result
 */
export function parseSearchArgs(raw: string): ParsedSearchArgs {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return {
      subcommand: "",
      query: "",
      error: "missing subcommand; try 'memory search <q>'",
    };
  }
  const parts = trimmed.split(/\s+/);
  const subcommand = parts[0] ?? "";
  if (subcommand !== "search") {
    return {
      subcommand,
      query: "",
      error: `unknown subcommand '${subcommand}'`,
    };
  }
  const queryParts = parts.slice(1);
  if (queryParts.length === 0) {
    return {
      subcommand: "search",
      query: "",
      error: "search requires a query",
    };
  }
  // Optional trailing limit (positive integer).
  let limit: number | undefined;
  const last = queryParts[queryParts.length - 1];
  if (last !== undefined && /^\d+$/.test(last)) {
    const parsed = parseInt(last, 10);
    if (parsed > 0 && parsed <= 100) {
      limit = parsed;
      queryParts.pop();
    }
  }
  const query = queryParts.join(" ");
  if (query.length === 0) {
    return {
      subcommand: "search",
      query: "",
      error: "search requires a query",
    };
  }
  return { subcommand: "search", query, limit };
}

export { register as registerMemorySearchCommand };
/**
 * memory-pin.ts — `/memory-pin <id-or-query>`
 *
 * Toggles a `pinned` tag on a memory.
 *   - if `<id-or-query>` looks like a UUID (8+ hex chars), use it directly
 *   - otherwise search with the query; pin the top hit
 *
 * Implementation: uses MemoryStore.add with `replace: false` after the
 * MemoryStore loads an existing entry, then store.replace() to update tags.
 * Since the underlying MemoryStore does not expose a `replace` flag on
 * `add`, we use `replace` directly to add the tag (additive union).
 *
 * Always tags with `origin:explicit` for the sync policy to honour.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

import type { CommandDeps, CommandRegister } from "./types.js";
import { searchMemory } from "../tools/memory_search.js";

export const register: CommandRegister = (pi, deps) => {
  pi.registerCommand("memory-pin", {
    description:
      "/memory-pin <id-or-query> — toggle the 'pinned' tag on a memory.",
    handler: async (args, ctx) => {
      try {
        const arg = args.trim();
        if (arg.length === 0) {
          ctx.ui.notify(
            "memory-pin: requires an id or a search query",
            "error",
          );
          return;
        }

        const store = deps.getStore();
        if (!store) {
          ctx.ui.notify("memory-pin: store not open", "error");
          return;
        }

        const id = await resolveId(store, deps, arg);
        if (!id) {
          ctx.ui.notify(
            `memory-pin: no memory matched '${arg}'`,
            "error",
          );
          return;
        }

        const existing = store.get(id);
        if (!existing) {
          ctx.ui.notify(
            `memory-pin: memory ${id} not found`,
            "error",
          );
          return;
        }

        const tags = existing.tags ?? [];
        const isPinned = tags.includes("pinned");
        const nextTags = isPinned
          ? tags.filter((t) => t !== "pinned")
          : [...tags, "pinned"];

        const result = store.replace(id, { tags: nextTags });
        if (!result.ok) {
          ctx.ui.notify(
            `memory-pin: replace failed (${result.reason})`,
            "error",
          );
          return;
        }

        // Best-effort sync enqueue (PR5).
        deps.getSync().enqueue({
          localId: id,
          op: "update",
          payload: { id, tags: nextTags },
          origin: "explicit",
        });

        ctx.ui.notify(
          isPinned
            ? `memory-pin: unpinned memory ${id}`
            : `memory-pin: pinned memory ${id}`,
          "info",
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        ctx.ui.notify(`memory-pin: failed: ${msg}`, "error");
      }
    },
  });
};

/**
 * Resolve `arg` to a memory id. UUID-shaped strings are returned as-is;
 * anything else is treated as a search query and the top hit is returned.
 * Returns null when nothing matches.
 */
export async function resolveId(
  store: import("../store/memory.js").MemoryStore,
  deps: CommandDeps,
  arg: string,
): Promise<string | null> {
  // UUID with optional dashes (8+ hex chars or 8-4-4-4-12) — try directly.
  if (/^[a-f0-9]{8}(-[a-f0-9-]{4,})?$/i.test(arg)) {
    const existing = store.get(arg);
    if (existing) return existing.id;
  }
  const details = await searchMemory(store, deps.getMaas(), {
    query: arg,
    limit: 1,
  });
  return details.hits[0]?.id ?? null;
}

export { register as registerMemoryPinCommand };
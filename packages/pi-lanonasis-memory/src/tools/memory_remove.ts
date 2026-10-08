/**
 * memory_remove.ts — soft-delete an existing memory by id.
 *
 * Contract (from brief, PR4 spec):
 *   - params: { id: string }
 *   - details: { ok: boolean }
 *
 * No scanner gate (it's a deletion). Returns ok=true when a row was
 * actually removed and ok=false when the id was unknown (still a tool
 * success, not an error — the model gets the same effect either way).
 * The brief says "soft-delete via remove() is fine" so we treat the
 * existing store.remove as the contract.
 */

import { Type, type Static } from "typebox";
import type {
  AgentToolResult,
  ExtensionAPI,
  ExtensionContext,
} from "@earendil-works/pi-coding-agent";

import type { MemoryStoreLike } from "../store/memory.js";
import type { SyncAdapter } from "../deps.js";
import { err, ok } from "./tool-result.js";

export const memoryRemoveParams = Type.Object({
  id: Type.String({ minLength: 1 }),
});

export type MemoryRemoveParams = Static<typeof memoryRemoveParams>;

export interface MemoryRemoveDetails {
  ok: boolean;
  id: string;
  reason?: string;
}

export function removeMemory(
  store: MemoryStoreLike | null,
  params: MemoryRemoveParams,
  sync: SyncAdapter,
): MemoryRemoveDetails {
  if (!store) {
    return { ok: false, id: params.id, reason: "store not open" };
  }
  const removed = store.remove(params.id);
  if (removed) {
    sync.enqueue({
      localId: params.id,
      op: "delete",
      payload: { id: params.id },
      origin: "explicit",
    });
  }
  return {
    ok: removed,
    id: params.id,
    reason: removed ? undefined : "not found",
  };
}

export function buildMemoryRemoveTool(input: {
  getStore: () => MemoryStoreLike | null;
  getSync: () => SyncAdapter;
}): {
  name: string;
  label: string;
  description: string;
  parameters: typeof memoryRemoveParams;
  execute: (
    toolCallId: string,
    params: MemoryRemoveParams,
    signal: AbortSignal | undefined,
    onUpdate: ((partial: AgentToolResult<MemoryRemoveDetails>) => void) | undefined,
    ctx: ExtensionContext,
  ) => Promise<AgentToolResult<MemoryRemoveDetails>>;
} {
  return {
    name: "memory_remove",
    label: "memory_remove",
    description:
      "Delete a memory by id. No scanner gate. Returns ok=false when the id is unknown (still a tool success).",
    parameters: memoryRemoveParams,
    async execute(
      _toolCallId,
      params,
      _signal,
      _onUpdate,
      ctx,
    ): Promise<AgentToolResult<MemoryRemoveDetails>> {
      try {
        const details = removeMemory(
          input.getStore(),
          params,
          input.getSync(),
        );
        const msg = details.ok
          ? `removed memory ${params.id}`
          : `no memory with id ${params.id}`;
        ctx.ui.notify(msg, details.ok ? "info" : "warning");
        return ok(details, msg);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        ctx.ui.notify(`memory_remove failed: ${msg}`, "error");
        return err({ ok: false, id: params.id, reason: msg }, `error: ${msg}`);
      }
    },
  };
}

export function registerMemoryRemoveTool(
  pi: ExtensionAPI,
  deps: { getStore: () => MemoryStoreLike | null; getSync: () => SyncAdapter },
): void {
  const tool = buildMemoryRemoveTool(deps);
  pi.registerTool(tool as Parameters<ExtensionAPI["registerTool"]>[0]);
}
/**
 * memory_replace.ts — scanner-gated update of an existing memory.
 *
 * Contract (from brief, PR4 spec):
 *   - params: { id: string, content: string, title?: string, category?: ... }
 *   - details: { ok: boolean, scannerDecision: 'allow'|'redact'|'block' }
 *
 * Same scanner gate as `memory_add` — content + title are scanned before
 * any write. The store's `replace()` is called with the (possibly redacted)
 * text. `id` is mandatory; on missing id we return a tool error without
 * writing.
 *
 * Post-merge: PR5 will wire `markSynced` here so a sync re-enqueue happens
 * for items already on the MaaS side. Until then the tool just enqueues a
 * best-effort `update` op.
 */

import { Type, type Static } from "typebox";
import type {
  ExtensionAPI,
  ExtensionToolContext,
} from "@earendil-works/pi-coding-agent";
import type { AgentToolResult } from "@earendil-works/pi-agent-core";

import { MemoryStore, type AddMemoryInput } from "../store/memory.js";
import type { MemoryStoreLike } from "../store/memory.js";
import { scanForWrite } from "../scanner/scanner.js";
import type { SyncAdapter } from "../deps.js";
import { ok, err } from "./tool-result.js";

export const memoryReplaceParams = Type.Object({
  id: Type.String({ minLength: 1 }),
  content: Type.String({ minLength: 1 }),
  title: Type.Optional(Type.String({ minLength: 1 })),
  category: Type.Optional(
    Type.Union([
      Type.Literal("failure"),
      Type.Literal("correction"),
      Type.Literal("insight"),
      Type.Literal("preference"),
      Type.Literal("convention"),
      Type.Literal("tool-quirk"),
    ]),
  ),
  target: Type.Optional(
    Type.Union([
      Type.Literal("memory"),
      Type.Literal("user"),
      Type.Literal("project"),
      Type.Literal("failure"),
    ]),
  ),
});

export type MemoryReplaceParams = Static<typeof memoryReplaceParams>;

export interface MemoryReplaceDetails {
  ok: boolean;
  scannerDecision: "allow" | "redact" | "block";
  redacted: boolean;
  id: string | null;
  reason?: string;
}

export function replaceMemory(
  store: MemoryStoreLike | null,
  params: MemoryReplaceParams,
  sync: SyncAdapter,
): MemoryReplaceDetails {
  if (!store) {
    return {
      ok: false,
      scannerDecision: "block",
      redacted: false,
      id: null,
      reason: "store not open",
    };
  }

  const contentVerdict = scanForWrite(params.content, "block");
  if (contentVerdict.decision === "block") {
    return {
      ok: false,
      scannerDecision: "block",
      redacted: false,
      id: null,
      reason: contentVerdict.reason,
    };
  }

  const titleVerdict = params.title
    ? scanForWrite(params.title, "block")
    : null;

  const finalContent =
    contentVerdict.decision === "redact"
      ? (contentVerdict.text as string)
      : params.content;
  const finalTitle =
    titleVerdict && titleVerdict.decision === "redact"
      ? (titleVerdict.text as string)
      : params.title;

  const patch: Partial<AddMemoryInput> = {
    content: finalContent,
  };
  if (finalTitle !== undefined) patch.title = finalTitle;
  if (params.category !== undefined) patch.category = params.category;
  if (params.target !== undefined) patch.target = params.target;

  const result = store.replace(params.id, patch);
  if (!result.ok) {
    return {
      ok: false,
      scannerDecision: "block",
      redacted: false,
      id: null,
      reason: result.reason,
    };
  }

  sync.enqueue({
    localId: result.id,
    op: "update",
    payload: { id: result.id, ...patch },
    origin: "explicit",
  });

  const redacted =
    contentVerdict.decision === "redact" ||
    (titleVerdict?.decision === "redact" || false);
  return {
    ok: true,
    scannerDecision: redacted ? "redact" : "allow",
    redacted,
    id: result.id,
  };
}

export function buildMemoryReplaceTool(input: {
  getStore: () => MemoryStoreLike | null;
  getSync: () => SyncAdapter;
}): {
  name: string;
  label: string;
  description: string;
  parameters: typeof memoryReplaceParams;
  execute: (
    toolCallId: string,
    params: MemoryReplaceParams,
    signal: AbortSignal | undefined,
    onUpdate: ((partial: AgentToolResult<MemoryReplaceDetails>) => void) | undefined,
    ctx: ExtensionToolContext,
  ) => Promise<AgentToolResult<MemoryReplaceDetails>>;
} {
  return {
    name: "memory_replace",
    label: "memory_replace",
    description:
      "Replace an existing memory's content/title/category/target. Scanner-gated; missing id returns a tool error.",
    parameters: memoryReplaceParams,
    async execute(
      _toolCallId,
      params,
      _signal,
      _onUpdate,
      ctx,
    ): Promise<AgentToolResult<MemoryReplaceDetails>> {
      try {
        const details = replaceMemory(
          input.getStore(),
          params,
          input.getSync(),
        );
        if (!details.ok || details.scannerDecision === "block") {
          ctx.ui.notify(
            `memory_replace refused: ${details.reason ?? "blocked"}`,
            "error",
          );
          return err(details, `blocked: ${details.reason ?? "unknown"}`);
        }
        return ok(details, `updated memory ${details.id}`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        ctx.ui.notify(`memory_replace failed: ${msg}`, "error");
        return err(
          {
            ok: false,
            scannerDecision: "block",
            redacted: false,
            id: null,
            reason: msg,
          },
          `error: ${msg}`,
        );
      }
    },
  };
}

export function registerMemoryReplaceTool(
  pi: ExtensionAPI,
  deps: { getStore: () => MemoryStoreLike | null; getSync: () => SyncAdapter },
): void {
  const tool = buildMemoryReplaceTool(deps);
  pi.registerTool(tool as Parameters<ExtensionAPI["registerTool"]>[0]);
}
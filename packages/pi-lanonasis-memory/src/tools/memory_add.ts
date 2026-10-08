/**
 * memory_add.ts — pre-scanned write of a memory entry.
 *
 * Contract (from brief, PR4 spec):
 *   - params: { target: 'memory'|'user'|'project'|'failure',
 *               content: string, title?: string,
 *               category?: 'failure'|'correction'|'insight'|'preference'|'convention'|'tool-quirk',
 *               tags?: string[] }
 *   - details: { id, scannerDecision: 'allow'|'redact'|'block', redacted: boolean }
 *
 * Always tag the entry with `origin: 'explicit'` so the sync policy (PR5) can
 * decide whether to enqueue. On `block`, return a tool error and never touch
 * the store. On `allow`/`redact`, store the (possibly redacted) text — never
 * the user-supplied raw text without scanner pass.
 */

import { Type, type Static } from "typebox";
import type {
  AgentToolResult,
  ExtensionAPI,
  ExtensionContext,
} from "@earendil-works/pi-coding-agent";

import {
  type AddMemoryInput,
  type MemoryStoreLike,
  type MemoryCategory,
  type MemoryTarget,
} from "../store/memory.js";
import { scanForWrite } from "../scanner/scanner.js";
import type { SyncAdapter } from "../deps.js";
import { ok, err } from "./tool-result.js";

/** Origin tag attached to every entry this tool writes. */
const ORIGIN_TAG = "origin:explicit";

// NOTE: TypeBox `Static<typeof X>` has a known limitation when literal arrays
// are extracted into a const first — `Static` widens them to `never`. The
// schemas below intentionally inline the literal arrays (no `.map`) so the
// derived `Static<...>` types resolve to the right union.

export const memoryAddParams = Type.Object({
  target: Type.Union([
    Type.Literal("memory"),
    Type.Literal("user"),
    Type.Literal("project"),
    Type.Literal("failure"),
  ]),
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
  tags: Type.Optional(Type.Array(Type.String())),
});

export type MemoryAddParams = Static<typeof memoryAddParams>;

export interface MemoryAddDetails {
  id: string | null;
  scannerDecision: "allow" | "redact" | "block";
  redacted: boolean;
  reason?: string;
}

/** Generate a short default title when the caller omits one. */
function defaultTitle(content: string): string {
  const firstLine = content.split(/\r?\n/, 1)[0]?.trim() ?? content;
  return firstLine.length > 80 ? firstLine.slice(0, 77) + "…" : firstLine;
}

/**
 * Pure helper. Performs the scanner gate and the store write. Used by the
 * tool's `execute` and by unit tests so the same code path is exercised
 * everywhere.
 *
 * Always tags with `origin:explicit` so sync (PR5) can distinguish from
 * hook-driven auto-ingest.
 */
export function addMemory(
  store: MemoryStoreLike | null,
  params: MemoryAddParams,
  sync: SyncAdapter,
): { details: MemoryAddDetails; written: boolean } {
  if (!store) {
    return {
      written: false,
      details: {
        id: null,
        scannerDecision: "block",
        redacted: false,
        reason: "store not open",
      },
    };
  }

  // Run the content through the pre-write scanner. Title is scanned too.
  const contentVerdict = scanForWrite(params.content, "block");
  const title = params.title ?? defaultTitle(params.content);
  const titleVerdict = scanForWrite(title, "block");

  if (contentVerdict.decision === "block") {
    return {
      written: false,
      details: {
        id: null,
        scannerDecision: "block",
        redacted: false,
        reason: contentVerdict.reason,
      },
    };
  }
  if (titleVerdict.decision === "block") {
    return {
      written: false,
      details: {
        id: null,
        scannerDecision: "block",
        redacted: false,
        reason: `title: ${titleVerdict.reason}`,
      },
    };
  }

  // Compose the input with the final (possibly redacted) text.
  const finalContent =
    contentVerdict.decision === "redact"
      ? (contentVerdict.text as string)
      : params.content;
  const finalTitle =
    titleVerdict.decision === "redact"
      ? (titleVerdict.text as string)
      : title;

  const mergedTags = mergeTags(params.tags, [ORIGIN_TAG]);

  const input: AddMemoryInput = {
    target: params.target as MemoryTarget,
    category: params.category as MemoryCategory | undefined,
    title: finalTitle,
    content: finalContent,
    tags: mergedTags,
  };

  const result = store.add(input);
  if (!result.ok) {
    // store.add also scans internally; surface its reason as a block.
    return {
      written: false,
      details: {
        id: null,
        scannerDecision: "block",
        redacted: false,
        reason: result.reason,
      },
    };
  }

  // Best-effort sync enqueue. Never throws.
  sync.enqueue({
    localId: result.id,
    op: "create",
    payload: { ...input, id: result.id },
    origin: "explicit",
  });

  const redacted =
    contentVerdict.decision === "redact" || titleVerdict.decision === "redact";
  return {
    written: true,
    details: {
      id: result.id,
      scannerDecision: redacted ? "redact" : "allow",
      redacted,
    },
  };
}

/** Combine caller-supplied tags with the origin tag, dedupe, preserve order. */
function mergeTags(supplied: string[] | undefined, extra: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const t of supplied ?? []) {
    if (!seen.has(t)) {
      seen.add(t);
      out.push(t);
    }
  }
  for (const t of extra) {
    if (!seen.has(t)) {
      seen.add(t);
      out.push(t);
    }
  }
  return out;
}

/**
 * Build the ToolDefinition for `memory_add`. Caller wires it with
 * `pi.registerTool(...)`. The `getStore` / `sync` closures are provided by
 * the extension factory so the same tool definition can be reused across
 * sessions.
 */
export function buildMemoryAddTool(input: {
  getStore: () => MemoryStoreLike | null;
  getSync: () => SyncAdapter;
}): {
  name: string;
  label: string;
  description: string;
  parameters: typeof memoryAddParams;
  execute: (
    toolCallId: string,
    params: MemoryAddParams,
    signal: AbortSignal | undefined,
    onUpdate: ((partial: AgentToolResult<MemoryAddDetails>) => void) | undefined,
    ctx: ExtensionContext,
  ) => Promise<AgentToolResult<MemoryAddDetails>>;
} {
  return {
    name: "memory_add",
    label: "memory_add",
    description:
      "Save a memory entry. Content is pre-scanned; secrets are blocked or redacted before any write. Always tags the entry with origin:explicit.",
    parameters: memoryAddParams,
    async execute(
      _toolCallId,
      params,
      _signal,
      _onUpdate,
      ctx,
    ): Promise<AgentToolResult<MemoryAddDetails>> {
      try {
        const { details, written } = addMemory(
          input.getStore(),
          params,
          input.getSync(),
        );
        if (!written || details.scannerDecision === "block") {
          ctx.ui.notify(
            `memory_add refused: ${details.reason ?? "blocked"}`,
            "error",
          );
          return err(details, `blocked: ${details.reason ?? "unknown"}`);
        }
        return ok(details, `saved memory ${details.id}`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        ctx.ui.notify(`memory_add failed: ${msg}`, "error");
        return err(
          {
            id: null,
            scannerDecision: "block",
            redacted: false,
            reason: msg,
          },
          `error: ${msg}`,
        );
      }
    },
  };
}

/**
 * Convenience wrapper that registers the tool directly with an
 * ExtensionAPI. Useful for the extension factory and for tests.
 */
export function registerMemoryAddTool(
  pi: ExtensionAPI,
  deps: { getStore: () => MemoryStoreLike | null; getSync: () => SyncAdapter },
): void {
  const tool = buildMemoryAddTool(deps);
  pi.registerTool(tool as Parameters<ExtensionAPI["registerTool"]>[0]);
}
/**
 * system-prompt.ts — PR3: memory policy + standing-instructions injection.
 *
 * On every `before_agent_start`, appends a single marker-bounded section to
 * Pi's system prompt:
 *
 *   <!-- lanonasis-pi-memory:start -->
 *   <memory-policy>…</memory-policy>
 *   <standing-instructions>…</standing-instructions>   (omitted when empty)
 *   <memory-context>…</memory-context>                 (legacy-inject mode only)
 *   <!-- lanonasis-pi-memory:end -->
 *
 * Design:
 *   - Idempotent: any previously injected section is stripped before the new
 *     one is appended, so injecting twice == injecting once.
 *   - Every user-supplied entry is XML-escaped (`<`, `>`, `&`) and collapsed to
 *     one line, so entries can't forge tags or the HTML-comment markers.
 *   - Hard caps (standing 2,000 chars; context 2,000 chars / 10 entries) are
 *     enforced with deterministic, entity-safe truncation.
 *   - Mode comes from `LANONASIS_PI_MEMORY_MODE`: `policy-only` (default) or
 *     `legacy-inject`. Unknown values fall back to `policy-only`.
 *   - The Pi handler never throws: any error yields `undefined` (prompt untouched).
 *
 * Wiring into the extension entry point happens in PR4 (`src/index.ts`).
 */

import type {
  BeforeAgentStartEvent,
  BeforeAgentStartEventResult,
  ExtensionAPI,
} from "@earendil-works/pi-coding-agent";

export type InjectionMode = "policy-only" | "legacy-inject";

export interface InjectOptions {
  /** Standing instructions (raw text, one per entry). */
  standing: readonly string[];
  mode: InjectionMode;
  /** Recalled memories for the `<memory-context>` block (legacy-inject only). */
  contextEntries?: readonly string[];
}

export interface SystemPromptInjectionDeps {
  getStanding: () => string[];
  getContextEntries?: () => string[];
}

export const MODE_ENV_VAR = "LANONASIS_PI_MEMORY_MODE";
export const DEFAULT_MODE: InjectionMode = "policy-only";

export const INJECTION_START_MARKER = "<!-- lanonasis-pi-memory:start -->";
export const INJECTION_END_MARKER = "<!-- lanonasis-pi-memory:end -->";

export const STANDING_BLOCK_MAX_CHARS = 2000;
export const CONTEXT_BLOCK_MAX_CHARS = 2000;
export const CONTEXT_BLOCK_MAX_ENTRIES = 10;

const ELLIPSIS = "…";

const MEMORY_POLICY_TEXT = [
  "You have persistent, local-first memory across sessions via the tools memory_add, memory_search, memory_replace and memory_remove.",
  "- Save durable facts: user preferences, project conventions, corrections, and failures worth not repeating.",
  "- Do not save transient task state or secrets. Writes are scanned and secrets are blocked.",
  "- Search memory before asking the user to repeat context.",
  "- Standing instructions always apply.",
  "- Explicit /memory save and /reflect sync to LanOnasis MaaS; auto-captured memories stay local unless the user opts in.",
].join("\n");

// ── helpers ──────────────────────────────────────────────────────────────────

function escapeXml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Collapse all whitespace (incl. newlines) to single spaces and trim. */
function normalizeEntry(text: unknown): string {
  return typeof text === "string" ? text.replace(/\s+/g, " ").trim() : "";
}

/**
 * Build `prefix + escape(raw)` truncated to at most `maxLen` chars, ending in
 * an ellipsis when cut. Escaping happens per code point, so an entity like
 * `&amp;` is never split.
 */
function escapeTruncated(prefix: string, raw: string, maxLen: number): string {
  const full = prefix + escapeXml(raw);
  if (full.length <= maxLen) return full;
  let out = prefix;
  for (const ch of raw) {
    const piece = escapeXml(ch);
    if (out.length + piece.length + ELLIPSIS.length > maxLen) break;
    out += piece;
  }
  return out + ELLIPSIS;
}

/**
 * Render `open + lines.join("\n") + close` within `maxChars`, dropping whole
 * trailing lines (with an omission notice when it fits) and truncating the
 * first line if even it alone does not fit. Deterministic for a given input.
 */
function renderCapped(
  tag: string,
  header: string | null,
  items: Array<{ prefix: string; raw: string }>,
  maxChars: number,
  noun: string,
): string {
  if (items.length === 0) return "";
  const open = `<${tag}>\n`;
  const close = `\n</${tag}>`;
  const budget = maxChars - open.length - close.length;
  const lines: string[] = header ? [header] : [];
  const used = () => lines.join("\n").length;
  const sep = () => (lines.length > 0 ? 1 : 0);

  let included = 0;
  for (const item of items) {
    const line = item.prefix + escapeXml(item.raw);
    if (used() + sep() + line.length <= budget) {
      lines.push(line);
      included++;
      continue;
    }
    if (included === 0) {
      const room = budget - used() - sep();
      if (room > item.prefix.length + ELLIPSIS.length) {
        lines.push(escapeTruncated(item.prefix, item.raw, room));
        included++;
      }
    }
    break;
  }

  const omitted = items.length - included;
  if (omitted > 0) {
    const notice = () => `(+${items.length - included} more ${noun} omitted)`;
    const minLines = header ? 1 : 0;
    while (lines.length > minLines && used() + 1 + notice().length > budget) {
      lines.pop();
      included--;
    }
    if (used() + sep() + notice().length <= budget) lines.push(notice());
  }

  if (included === 0) return "";
  return open + lines.join("\n") + close;
}

// ── public API ───────────────────────────────────────────────────────────────

export function buildMemoryPolicyBlock(): string {
  return `<memory-policy>\n${MEMORY_POLICY_TEXT}\n</memory-policy>`;
}

/** Numbered, escaped standing instructions; "" when there are none. */
export function buildStandingBlock(entries: readonly string[]): string {
  const items = (Array.isArray(entries) ? entries : [])
    .map(normalizeEntry)
    .filter((e) => e.length > 0)
    .map((raw, i) => ({ prefix: `${i + 1}. `, raw }));
  return renderCapped("standing-instructions", null, items, STANDING_BLOCK_MAX_CHARS, "standing instructions");
}

/** Legacy recalled-memory block: first 10 non-blank entries, ≤ 2,000 chars; "" when empty. */
export function buildContextBlock(entries: readonly string[]): string {
  const items = (Array.isArray(entries) ? entries : [])
    .map(normalizeEntry)
    .filter((e) => e.length > 0)
    .slice(0, CONTEXT_BLOCK_MAX_ENTRIES)
    .map((raw) => ({ prefix: "- ", raw }));
  return renderCapped(
    "memory-context",
    "Recalled memories (may be stale; verify before relying on them):",
    items,
    CONTEXT_BLOCK_MAX_CHARS,
    "memories",
  );
}

export function resolveMode(env: Record<string, string | undefined> = process.env): InjectionMode {
  const raw = (env[MODE_ENV_VAR] ?? "").trim().toLowerCase();
  return raw === "legacy-inject" ? "legacy-inject" : DEFAULT_MODE;
}

/**
 * Remove every previously injected section (start marker → end marker) and
 * trailing whitespace before it. An unterminated start marker strips to the
 * end of the text (it can only come from a truncated prior injection).
 */
export function stripInjectedSection(text: string): string {
  let out = text;
  for (;;) {
    const start = out.indexOf(INJECTION_START_MARKER);
    if (start === -1) return out;
    const endIdx = out.indexOf(INJECTION_END_MARKER, start + INJECTION_START_MARKER.length);
    const after = endIdx === -1 ? "" : out.slice(endIdx + INJECTION_END_MARKER.length);
    out = out.slice(0, start).trimEnd() + after;
  }
}

/** Idempotently (re)inject the memory section at the end of `base`. */
export function injectSystemPrompt(base: string, options: InjectOptions): string {
  const stripped = stripInjectedSection(typeof base === "string" ? base : "").trimEnd();
  const blocks = [buildMemoryPolicyBlock(), buildStandingBlock(options.standing ?? [])];
  if (options.mode === "legacy-inject") blocks.push(buildContextBlock(options.contextEntries ?? []));
  const section = [INJECTION_START_MARKER, ...blocks.filter((b) => b.length > 0), INJECTION_END_MARKER].join("\n");
  return stripped.length > 0 ? `${stripped}\n\n${section}` : section;
}

/**
 * Register the `before_agent_start` handler. Returns Pi's unsubscribe function.
 * The handler never throws into Pi; on any error it returns `undefined`.
 */
export function registerSystemPromptInjection(
  pi: ExtensionAPI,
  deps: SystemPromptInjectionDeps,
): () => void {
  return pi.on(
    "before_agent_start",
    (event: BeforeAgentStartEvent): BeforeAgentStartEventResult | undefined => {
      try {
        if (!event || typeof event.systemPrompt !== "string") return undefined;
        const mode = resolveMode();
        const standing = deps.getStanding();
        const contextEntries =
          mode === "legacy-inject" && deps.getContextEntries ? deps.getContextEntries() : undefined;
        return { systemPrompt: injectSystemPrompt(event.systemPrompt, { standing, mode, contextEntries }) };
      } catch {
        return undefined;
      }
    },
  );
}

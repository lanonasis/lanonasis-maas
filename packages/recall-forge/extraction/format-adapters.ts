// Pluggable JSONL format parsers
// Each adapter detects and extracts content from a specific JSONL format

import type { FormatAdapter, ExtractionRecord } from "./types.js";

// Shared: extract text from Claude-style message content (string or content blocks)
function extractMessageText(msg: Record<string, unknown>): string[] {
  const texts: string[] = [];
  const content = msg.content;

  if (typeof content === "string") {
    texts.push(content);
  } else if (Array.isArray(content)) {
    for (const block of content) {
      const b = block as Record<string, unknown>;
      if (b.type === "text" && typeof b.text === "string") {
        texts.push(b.text);
      }
    }
  }

  return texts;
}

const TEXT_BLOCK_TYPES = new Set(["text", "input_text", "output_text", "markdown"]);

function extractOpenClawSessionText(value: unknown): string[] {
  if (typeof value === "string") {
    return value.length > 0 ? [value] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry) => extractOpenClawSessionText(entry));
  }

  if (!value || typeof value !== "object") {
    return [];
  }

  const record = value as Record<string, unknown>;
  const texts: string[] = [];
  const blockType = typeof record.type === "string" ? record.type : undefined;

  if (typeof record.text === "string" && (!blockType || TEXT_BLOCK_TYPES.has(blockType))) {
    texts.push(record.text);
  }

  if ("content" in record) {
    texts.push(...extractOpenClawSessionText(record.content));
  }

  if ("message" in record && typeof record.message !== "object") {
    texts.push(...extractOpenClawSessionText(record.message));
  }

  if (typeof record.body === "string") {
    texts.push(record.body);
  }

  if (typeof record.prompt === "string") {
    texts.push(record.prompt);
  }

  return [...new Set(texts.filter((text) => text.length > 0))];
}

/**
 * Claude Code session JSONL format
 * Lines have: { role: "user"|"assistant"|"system", content: string|ContentBlock[] }
 */
const claudeCodeAdapter: FormatAdapter = {
  name: "claude-code",

  detect(sample) {
    return (
      typeof sample.role === "string" &&
      ["user", "assistant", "system"].includes(sample.role) &&
      ("content" in sample || "type" in sample)
    );
  },

  extract(line, lineNumber) {
    const role = line.role as string;
    const normalizedRole =
      role === "user" || role === "assistant" || role === "system"
        ? role
        : "unknown";

    const texts = extractMessageText(line);
    const timestamp = (line.timestamp ?? line.created_at) as string | undefined;

    return texts
      .filter((t) => t.length > 0)
      .map((text) => ({
        text,
        role: normalizedRole as ExtractionRecord["role"],
        sourceFormat: "claude-code",
        lineNumber,
        timestamp,
      }));
  },
};

/**
 * OpenClaw cache-trace JSONL format
 * Lines may have request/response payloads, tool outputs, etc.
 */
const openclawCacheAdapter: FormatAdapter = {
  name: "openclaw-cache",

  detect(sample) {
    return (
      "cache_key" in sample ||
      "trace_id" in sample ||
      ("request" in sample && "response" in sample) ||
      ("tool" in sample && "output" in sample)
    );
  },

  extract(line, lineNumber) {
    const records: ExtractionRecord[] = [];
    const timestamp = (line.timestamp ?? line.ts ?? line.created_at) as string | undefined;

    // Extract from request body
    if (line.request && typeof line.request === "object") {
      const req = line.request as Record<string, unknown>;
      const texts = extractMessageText(req);
      if (typeof req.body === "string") texts.push(req.body);
      if (typeof req.prompt === "string") texts.push(req.prompt);

      for (const text of texts.filter((t) => t.length > 0)) {
        records.push({
          text,
          role: "user",
          sourceFormat: "openclaw-cache",
          lineNumber,
          timestamp,
        });
      }
    }

    // Extract from response body
    if (line.response && typeof line.response === "object") {
      const res = line.response as Record<string, unknown>;
      const texts = extractMessageText(res);
      if (typeof res.body === "string") texts.push(res.body);
      if (typeof res.result === "string") texts.push(res.result);

      for (const text of texts.filter((t) => t.length > 0)) {
        records.push({
          text,
          role: "assistant",
          sourceFormat: "openclaw-cache",
          lineNumber,
          timestamp,
        });
      }
    }

    // Extract from tool output
    if (typeof line.output === "string" && line.output.length > 0) {
      records.push({
        text: line.output,
        role: "assistant",
        sourceFormat: "openclaw-cache",
        lineNumber,
        timestamp,
      });
    }

    // Extract from top-level content
    if (typeof line.content === "string" && line.content.length > 0) {
      records.push({
        text: line.content,
        role: "unknown",
        sourceFormat: "openclaw-cache",
        lineNumber,
        timestamp,
      });
    }

    return records;
  },
};

/**
 * OpenClaw session JSONL format
 * Lines have: { type: "message", message: { role, content[] } }
 */
const openclawSessionAdapter: FormatAdapter = {
  name: "openclaw-session",

  detect(sample) {
    // Session header line (first line of OpenClaw session files)
    if (sample.type === "session" && ("cwd" in sample || "id" in sample)) return true;
    // Standard message line
    if (sample.type !== "message" || !sample.message || typeof sample.message !== "object") {
      return false;
    }

    const message = sample.message as Record<string, unknown>;
    return typeof message.role === "string" && ("content" in message || "text" in message);
  },

  extract(line, lineNumber) {
    // Skip non-message lines (session header, model_change, thinking_level_change, custom, etc.)
    if (line.type !== "message" || !line.message || typeof line.message !== "object") {
      return [];
    }

    const message = line.message as Record<string, unknown>;
    const role = message.role as string;
    const normalizedRole =
      role === "user" || role === "assistant" || role === "system"
        ? role
        : "unknown";
    const timestamp = (line.timestamp ?? line.ts ?? line.created_at ?? message.timestamp) as string | undefined;
    const texts = extractOpenClawSessionText(message.content ?? message.text ?? message);

    return texts.map((text) => ({
      text,
      role: normalizedRole as ExtractionRecord["role"],
      sourceFormat: "openclaw-session",
      lineNumber,
      timestamp,
    }));
  },
};

/**
 * Codex session JSONL format
 * Lines have: { type: "message", sender: "user"|"agent", content: string }
 */
const codexAdapter: FormatAdapter = {
  name: "codex",

  detect(sample) {
    return (
      (sample.type === "message" || sample.type === "rollout") &&
      ("sender" in sample || "agent" in sample)
    );
  },

  extract(line, lineNumber) {
    const records: ExtractionRecord[] = [];
    const timestamp = (line.timestamp ?? line.ts) as string | undefined;

    const sender = (line.sender ?? line.agent ?? "unknown") as string;
    const role =
      sender === "user" ? "user" : sender === "agent" ? "assistant" : "unknown";

    if (typeof line.content === "string" && line.content.length > 0) {
      records.push({ text: line.content, role: role as ExtractionRecord["role"], sourceFormat: "codex", lineNumber, timestamp });
    }
    if (typeof line.message === "string" && line.message.length > 0) {
      records.push({ text: line.message, role: role as ExtractionRecord["role"], sourceFormat: "codex", lineNumber, timestamp });
    }

    return records;
  },
};

/**
 * Generic fallback — tries to find text in any JSON structure
 */
const genericAdapter: FormatAdapter = {
  name: "generic",

  detect() {
    return true; // Always matches as fallback
  },

  extract(line, lineNumber) {
    const records: ExtractionRecord[] = [];
    const timestamp = (line.timestamp ?? line.ts ?? line.created_at) as string | undefined;

    // Try common text field names
    const textFields = ["content", "text", "message", "body", "prompt", "output", "result"];
    for (const field of textFields) {
      const val = line[field];
      if (typeof val === "string" && val.length > 0) {
        records.push({
          text: val,
          role: "unknown",
          sourceFormat: "generic",
          lineNumber,
          timestamp,
        });
      }
    }

    return records;
  },
};

/** All adapters in detection priority order */
export const FORMAT_ADAPTERS: FormatAdapter[] = [
  claudeCodeAdapter,
  openclawCacheAdapter,
  openclawSessionAdapter,
  codexAdapter,
  genericAdapter,
];

/**
 * Auto-detect the format adapter for a JSONL file
 * Uses the first successfully parsed line as a sample
 */
export function detectFormat(
  sample: Record<string, unknown>,
  forceFormat?: string,
): FormatAdapter {
  if (forceFormat) {
    const forced = FORMAT_ADAPTERS.find((a) => a.name === forceFormat);
    if (forced) return forced;
  }

  for (const adapter of FORMAT_ADAPTERS) {
    if (adapter.detect(sample)) return adapter;
  }

  // Should never reach here — generic always matches
  return genericAdapter;
}

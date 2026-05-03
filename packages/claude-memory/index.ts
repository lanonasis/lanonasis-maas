export { parseConfig, type ClaudeMemoryConfig, type CaptureMode } from "./config.js";
export {
  LanonasisClient,
  type LanMemory,
  type LanMemoryType,
  type LanCreateParams,
  type LanSearchParams,
} from "./client.js";
export { SpoolQueue, type SpoolEntry, type SpoolMemory } from "./spool.js";

export type StopInput = {
  session_id: string;
  transcript_path: string;
  num_turns: number;
  total_cost?: number;
};

export type PreCompactInput = {
  session_id: string;
  transcript_path: string;
  num_messages: number;
  context_window_usage?: number;
};

export type PreToolInput = {
  session_id: string;
  tool_name: string;
  tool_input: Record<string, unknown>;
};

export type HookResult = {
  result?: string;
  stopHook?: boolean;
};

export const claudeMemory = {
  id: "claude-memory" as const,
  version: "0.1.0",
};

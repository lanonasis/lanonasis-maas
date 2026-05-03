import { homedir } from "os";
import { join } from "path";

export type CaptureMode = "auto" | "explicit" | "hybrid";

export type ClaudeMemoryConfig = {
  apiKey: string;
  baseUrl: string;
  projectId: string;
  agentType: string;
  spoolDir: string;
  captureMode: CaptureMode;
  autoRecall: boolean;
  maxMemoriesPerSession: number;
  maxMemoriesPerCompaction: number;
  searchThreshold: number;
  maxRecallResults: number;
};

const VALID_MODES: CaptureMode[] = ["auto", "explicit", "hybrid"];

function resolveEnv(s: string): string {
  return s.replace(/\$\{([^}]+)\}/g, (_, name: string) => {
    return process.env[name] ?? "";
  });
}

function firstNonEmpty(...values: Array<string | undefined>): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }
  return "";
}

export function parseConfig(raw: Record<string, unknown>): ClaudeMemoryConfig {
  const agentType = (raw.agentType as string) ?? "claude-code";
  const rawMode = raw.captureMode as string;
  const captureMode = VALID_MODES.includes(rawMode as CaptureMode)
    ? (rawMode as CaptureMode)
    : "hybrid";
  const explicitScope = firstNonEmpty(raw.orgId as string, raw.projectId as string);
  const envScope = firstNonEmpty(
    process.env.LANONASIS_ORG_ID,
    process.env.LANONASIS_PROJECT_ID,
  );

  return {
    apiKey: resolveEnv((raw.apiKey as string) ?? ""),
    baseUrl: resolveEnv(
      ((raw.baseUrl as string) ?? "https://api.lanonasis.com").replace(/\/$/, ""),
    ),
    projectId: resolveEnv(firstNonEmpty(explicitScope, envScope)),
    agentType,
    spoolDir:
      (raw.spoolDir as string) ??
      join(homedir(), ".lanonasis", "maas-spool", agentType),
    captureMode,
    autoRecall: (raw.autoRecall as boolean) ?? true,
    maxMemoriesPerSession:
      typeof raw.maxMemoriesPerSession === "number"
        ? raw.maxMemoriesPerSession
        : 5,
    maxMemoriesPerCompaction:
      typeof raw.maxMemoriesPerCompaction === "number"
        ? raw.maxMemoriesPerCompaction
        : 3,
    searchThreshold:
      typeof raw.searchThreshold === "number" ? raw.searchThreshold : 0.7,
    maxRecallResults:
      typeof raw.maxRecallResults === "number" ? raw.maxRecallResults : 5,
  };
}

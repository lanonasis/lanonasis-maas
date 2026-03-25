// Phase 1 - Config Module
export type CaptureMode = "auto" | "explicit" | "hybrid";
export type MemoryMode = "remote" | "local" | "hybrid";
export type SyncMode = "realtime" | "batch" | "manual";
export type RecallMode = "auto" | "ondemand";

export type LanonasisConfig = {
  apiKey: string;
  baseUrl: string;
  projectId: string;
  agentId: string;
  autoRecall: boolean;
  recallMode: RecallMode;
  maxRecallChars: number;
  captureMode: CaptureMode;
  localFallback: boolean;
  searchThreshold: number;
  dedupeThreshold: number;
  maxRecallResults: number;
  // Phase 4 — operator-visible settings
  memoryMode: MemoryMode;
  sharedNamespace: string;
  syncMode: SyncMode;
  queueOnFailure: boolean;
  autoIndexOnFirstUse: boolean;
  extractSourceFormats: string[];
  // Phase 3 — embedding profile contract
  embeddingProvider: string;
  embeddingModel: string;
  queryEmbeddingModel: string;
  embeddingDimensions: number;
  embeddingProfileId: string;
};

const DEFAULTS: LanonasisConfig = {
  apiKey: "",
  baseUrl: "https://api.lanonasis.com",
  projectId: "",
  agentId: "main",
  autoRecall: true,
  recallMode: "auto",
  maxRecallChars: 1500,
  captureMode: "hybrid",
  localFallback: true,
  searchThreshold: 0.75,
  dedupeThreshold: 0.985,
  maxRecallResults: 5,
  // Phase 4
  memoryMode: "hybrid",
  sharedNamespace: "",
  syncMode: "realtime",
  queueOnFailure: true,
  autoIndexOnFirstUse: false,
  extractSourceFormats: ["openclaw-session", "markdown", "sqlite"],
  // Phase 3
  embeddingProvider: "",
  embeddingModel: "",
  queryEmbeddingModel: "",
  embeddingDimensions: 0,
  embeddingProfileId: "",
};

// Resolve ${ENV_VAR} references in string values
function resolveEnv(s: string): string {
  return s.replace(/\$\{([^}]+)\}/g, (_, name: string) => {
    return process.env[name] ?? "";
  });
}

function resolveStringSetting(
  raw: unknown,
  envName: string | undefined,
  defaultValue: string,
): string {
  if (typeof raw === "string") {
    const resolved = resolveEnv(raw).trim();
    if (resolved) return resolved;
  }

  if (envName) {
    const envValue = process.env[envName];
    if (typeof envValue === "string" && envValue.trim()) {
      return envValue.trim();
    }
  }

  return defaultValue;
}

export const lanonasisConfigSchema = {
  parse: (value: unknown): LanonasisConfig => {
    const raw = (typeof value === "object" && value !== null ? value : {}) as Record<string, unknown>;

    const apiKey = resolveStringSetting(raw.apiKey, "LANONASIS_API_KEY", DEFAULTS.apiKey);
    const projectId = resolveStringSetting(raw.projectId, "LANONASIS_PROJECT_ID", DEFAULTS.projectId);
    const baseUrl = resolveStringSetting(raw.baseUrl, "LANONASIS_BASE_URL", DEFAULTS.baseUrl);

    const captureMode = (raw.captureMode as CaptureMode) ?? DEFAULTS.captureMode;
    const validModes: CaptureMode[] = ["auto", "explicit", "hybrid"];
    const resolvedMode = validModes.includes(captureMode) ? captureMode : DEFAULTS.captureMode;

    // Phase 4: memoryMode
    const memoryMode = (raw.memoryMode as MemoryMode) ?? DEFAULTS.memoryMode;
    const validMemoryModes: MemoryMode[] = ["remote", "local", "hybrid"];
    const resolvedMemoryMode = validMemoryModes.includes(memoryMode) ? memoryMode : DEFAULTS.memoryMode;

    // Phase 4: syncMode
    const syncMode = (raw.syncMode as SyncMode) ?? DEFAULTS.syncMode;
    const validSyncModes: SyncMode[] = ["realtime", "batch", "manual"];
    const resolvedSyncMode = validSyncModes.includes(syncMode) ? syncMode : DEFAULTS.syncMode;

    // Phase 4: extractSourceFormats
    const extractSourceFormats = Array.isArray(raw.extractSourceFormats)
      ? (raw.extractSourceFormats as string[])
      : DEFAULTS.extractSourceFormats;

    return {
      apiKey,
      baseUrl: baseUrl.replace(/\/$/, ""),
      projectId,
      agentId: (raw.agentId as string) ?? DEFAULTS.agentId,
      autoRecall: (raw.autoRecall as boolean) ?? DEFAULTS.autoRecall,
      recallMode: (() => {
        const v = raw.recallMode as RecallMode;
        const valid: RecallMode[] = ["auto", "ondemand"];
        return valid.includes(v) ? v : DEFAULTS.recallMode;
      })(),
      maxRecallChars: typeof raw.maxRecallChars === "number" ? raw.maxRecallChars : DEFAULTS.maxRecallChars,
      captureMode: resolvedMode,
      localFallback: (raw.localFallback as boolean) ?? DEFAULTS.localFallback,
      searchThreshold: typeof raw.searchThreshold === "number" ? raw.searchThreshold : DEFAULTS.searchThreshold,
      dedupeThreshold: typeof raw.dedupeThreshold === "number" ? raw.dedupeThreshold : DEFAULTS.dedupeThreshold,
      maxRecallResults: typeof raw.maxRecallResults === "number" ? raw.maxRecallResults : DEFAULTS.maxRecallResults,
      // Phase 4
      memoryMode: resolvedMemoryMode,
      sharedNamespace: resolveStringSetting(raw.sharedNamespace, "LANONASIS_SHARED_NAMESPACE", DEFAULTS.sharedNamespace),
      syncMode: resolvedSyncMode,
      queueOnFailure: (raw.queueOnFailure as boolean) ?? DEFAULTS.queueOnFailure,
      autoIndexOnFirstUse: (raw.autoIndexOnFirstUse as boolean) ?? DEFAULTS.autoIndexOnFirstUse,
      extractSourceFormats,
      // Phase 3
      embeddingProvider: resolveStringSetting(raw.embeddingProvider, "LANONASIS_EMBEDDING_PROVIDER", DEFAULTS.embeddingProvider),
      embeddingModel: resolveStringSetting(raw.embeddingModel, "LANONASIS_EMBEDDING_MODEL", DEFAULTS.embeddingModel),
      queryEmbeddingModel: resolveStringSetting(raw.queryEmbeddingModel, undefined, (raw.embeddingModel as string) ?? DEFAULTS.queryEmbeddingModel),
      embeddingDimensions: typeof raw.embeddingDimensions === "number" ? raw.embeddingDimensions : DEFAULTS.embeddingDimensions,
      embeddingProfileId: resolveStringSetting(raw.embeddingProfileId, "LANONASIS_EMBEDDING_PROFILE_ID", DEFAULTS.embeddingProfileId),
    };
  },
};

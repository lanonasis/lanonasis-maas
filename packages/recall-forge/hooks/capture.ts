// Phase 4 - Capture Hooks
import type { LanonasisClient, LanCreateParams } from "../client.js";
import type { LanonasisConfig } from "../config.js";
import { detectMemoryType } from "../enrichment/type-detector.js";
import { extractTags } from "../enrichment/tag-extractor.js";
import { shouldCapture } from "../enrichment/capture-filter.js";
import type { LocalFallbackWriter } from "./local-fallback.js";
import type { PrivacyGuard, PrivacyReport } from "../privacy/privacy-guard.js";
import type { PrivacyLogWriter } from "../privacy/privacy-log.js";

// Extract text content from message (handles string and content blocks)
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

// Build embedding profile metadata when config has explicit profile info
function embeddingProfileMeta(cfg: LanonasisConfig): Record<string, unknown> {
  const meta: Record<string, unknown> = {};
  if (cfg.embeddingProfileId) meta.embedding_profile_id = cfg.embeddingProfileId;
  if (cfg.embeddingProvider) meta.embedding_provider = cfg.embeddingProvider;
  if (cfg.embeddingModel) meta.embedding_model = cfg.embeddingModel;
  if (cfg.embeddingDimensions > 0) meta.embedding_dimensions = cfg.embeddingDimensions;
  return meta;
}

// Types that should be routed to shared namespace when configured
const SHARED_TYPES = new Set(["knowledge", "project", "reference"]);

// Create memory with proper metadata (Phase 2: shared namespace routing)
function createMemoryParams(
  text: string,
  cfg: LanonasisConfig,
  channel: string,
  guard?: PrivacyGuard,
): { params: LanCreateParams; safeContent: string } {
  const guardResult = guard ? guard.process(text) : { content: text, report: null };
  const safeContent = guardResult.content;

  const type = detectMemoryType(safeContent);
  const baseTags = extractTags(safeContent);
  const privacyTags = guardResult.report && guard ? guard.tagsFrom(guardResult.report) : [];
  const tags = [...new Set([...baseTags, ...privacyTags])];
  const title = safeContent.slice(0, 80).replace(/\s+/g, " ").trim();

  // Route knowledge/project/reference to shared namespace when configured
  const isShared = cfg.sharedNamespace && SHARED_TYPES.has(type);
  const privacyMeta = guardResult.report && guard ? guard.metaFrom(guardResult.report) : undefined;

  return {
    safeContent,
    params: {
      title,
      content: safeContent,
      type,
      tags,
      metadata: {
        agent_id: cfg.agentId,
        source: "openclaw",
        channel,
        captured_at: new Date().toISOString(),
        ...(isShared ? { namespace: cfg.sharedNamespace } : {}),
        ...embeddingProfileMeta(cfg),
        ...privacyMeta,
      },
    },
  };
}

export function createCaptureHook(
  client: LanonasisClient,
  cfg: LanonasisConfig,
  logger: { info(msg: string): void; warn(msg: string): void },
  fallback: LocalFallbackWriter,
  guard?: PrivacyGuard,
  privacyLog?: PrivacyLogWriter,
) {
  return async (event: {
    messages: unknown[];
    success: boolean;
    error?: string;
  }) => {
    try {
      // 1. Skip if session failed
      if (!event.success) return;

      // 2. Determine mode and cap
      const strict = cfg.captureMode === "hybrid";
      const cap = cfg.captureMode === "hybrid" ? 3 : 5;

      // 3. Extract user messages only
      const userTexts: string[] = [];
      for (const msg of event.messages) {
        if (!msg || typeof msg !== "object") continue;
        const m = msg as Record<string, unknown>;
        if (m.role !== "user") continue;

        const texts = extractMessageText(m);
        userTexts.push(...texts);
      }

      // 4. Filter with shouldCapture
      const toCapture = userTexts.filter((text) =>
        shouldCapture(text, { strict }),
      );

      // 5. Cap and create memories
      const captured = toCapture.slice(0, cap);
      const channel = cfg.defaultChannel;

      const safeCaptured: string[] = [];
      for (const text of captured) {
        const { params, safeContent } = createMemoryParams(text, cfg, channel, guard);
        safeCaptured.push(safeContent);
        await client.createMemory(params);
        if (privacyLog && params.metadata?.privacy) {
          // Extract the report from metadata for logging — reconstruct minimal shape
          const p = params.metadata.privacy as Record<string, unknown>;
          await privacyLog.write({
            secretsFound: (p.secretsFound as number) ?? 0,
            secretTypes: (p.secretTypes as string[]) ?? [],
            piiFound: !!(p.piiTypes),
            piiTypes: (p.piiTypes as string[]) ?? [],
            piiSensitivity: (p.piiSensitivity as PrivacyReport["piiSensitivity"]) ?? "none",
            regulations: (p.regulations as string[]) ?? [],
            action: p.action as PrivacyReport["action"],
            timestamp: p.timestamp as string,
          });
        }
      }

      // 6. Local fallback (single append — uses already-sanitized content)
      if (cfg.localFallback && safeCaptured.length > 0) {
        const combined = safeCaptured.join("\n\n---\n\n");
        await fallback.writeMemory(
          `Captured ${safeCaptured.length} memories`,
          combined,
        );
      }
    } catch (err) {
      logger.warn(
        `capture-hook error: ${err instanceof Error ? err.message : "unknown"}`,
      );
    }
  };
}

export function createCompactionCaptureHook(
  client: LanonasisClient,
  cfg: LanonasisConfig,
  logger: { info(msg: string): void; warn(msg: string): void },
  guard?: PrivacyGuard,
) {
  return async (event: {
    messageCount: number;
    messages?: unknown[];
    sessionFile?: string;
    tokenCount?: number;
    compactingCount?: number;
  }) => {
    try {
      // 1. Extract messages (from event or sessionFile)
      let messages: unknown[] = event.messages || [];

      // 2. Filter user messages with strict bar
      const userTexts: string[] = [];
      for (const msg of messages) {
        if (!msg || typeof msg !== "object") continue;
        const m = msg as Record<string, unknown>;
        if (m.role !== "user") continue;

        const texts = extractMessageText(m);
        userTexts.push(...texts);
      }

      // 3. Strict filter + prioritize knowledge/project
      const filtered = userTexts.filter((text) =>
        shouldCapture(text, { strict: true }),
      );

      // Prioritize knowledge/project types
      filtered.sort((a, b) => {
        const typeA = detectMemoryType(a);
        const typeB = detectMemoryType(b);
        const scoreA = typeA === "knowledge" || typeA === "project" ? 1 : 0;
        const scoreB = typeB === "knowledge" || typeB === "project" ? 1 : 0;
        return scoreB - scoreA;
      });

      // 4. Cap at 3
      const toCapture = filtered.slice(0, 3);
      const channel = cfg.defaultChannel;

      // 5. Create memories
      for (const text of toCapture) {
        const { params } = createMemoryParams(text, cfg, channel, guard);
        await client.createMemory(params);
      }
    } catch (err) {
      logger.warn(
        `compaction-hook error: ${err instanceof Error ? err.message : "unknown"}`,
      );
    }
  };
}

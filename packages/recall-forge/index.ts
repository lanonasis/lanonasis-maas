// RecallForge Plugin Entry Point
// Fills both plugins.slots.memory AND plugins.slots.contextEngine in OpenClaw.
import type { OpenClawPluginApi, OpenClawPlugin } from "./plugin-sdk-stub.js";
import { lanonasisConfigSchema } from "./config.js";
import { LanonasisClient } from "./client.js";
import { LocalFallbackWriter } from "./hooks/local-fallback.js";
import { createRecallHook } from "./hooks/recall.js";
import { createContextEngine } from "./hooks/context-engine.js";
import { createCaptureHook, createCompactionCaptureHook } from "./hooks/capture.js";
import { registerMemorySearchTool } from "./tools/memory-search.js";
import { registerMemoryGetTool } from "./tools/memory-get.js";
import { registerMemoryStoreTool } from "./tools/memory-store.js";
import { registerMemoryForgetTool } from "./tools/memory-forget.js";
import { registerCli } from "./cli.js";

const CONFIG_PATH = 'plugins.entries["recall-forge"].config';

function formatErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return typeof error === "string" && error.trim() ? error : "unknown error";
}

function missingConfigMessage(field: "apiKey" | "projectId", envName: string): string {
  return `${field} is required. Set ${CONFIG_PATH}.${field} in ~/.openclaw/openclaw.json or export ${envName} before starting OpenClaw.`;
}

const plugin: OpenClawPlugin = {
  id: "recall-forge",
  kind: "memory",
  name: "RecallForge",
  description: "Secret-safe memory and context engine for OpenClaw — semantic recall with credential protection",
  configSchema: {}, // JSON Schema validation handled by openclaw.plugin.json

  register(api: OpenClawPluginApi) {
    let cachedRuntime:
      | {
          cfg: ReturnType<typeof lanonasisConfigSchema.parse>;
          client: LanonasisClient;
          cacheKey: string;
        }
      | undefined;

    const getRuntime = () => {
      const cfg = lanonasisConfigSchema.parse(api.pluginConfig);

      if (!cfg.apiKey) {
        throw new Error(missingConfigMessage("apiKey", "LANONASIS_API_KEY"));
      }
      if (!cfg.projectId) {
        throw new Error(
          missingConfigMessage("projectId", "LANONASIS_PROJECT_ID"),
        );
      }

      const cacheKey = JSON.stringify([
        cfg.baseUrl,
        cfg.apiKey,
        cfg.projectId,
        cfg.agentId,
        cfg.autoRecall,
        cfg.recallMode,
        cfg.maxRecallChars,
        cfg.captureMode,
        cfg.localFallback,
        cfg.searchThreshold,
        cfg.dedupeThreshold,
        cfg.maxRecallResults,
        cfg.memoryMode,
        cfg.sharedNamespace,
        cfg.embeddingProfileId,
      ]);

      if (!cachedRuntime || cachedRuntime.cacheKey !== cacheKey) {
        cachedRuntime = {
          cfg,
          client: new LanonasisClient(cfg),
          cacheKey,
        };
      }

      return cachedRuntime;
    };

    // 1. Always register CLI so subcommands remain visible even if runtime config is incomplete.
    registerCli(api, getRuntime);

    // 2. Initialise runtime for hooks and tools.
    let runtime: ReturnType<typeof getRuntime>;
    try {
      runtime = getRuntime();
    } catch (err) {
      api.logger.error(
        `[recall-forge] ${formatErrorMessage(err)}`,
      );
      return;
    }

    const { client, cfg } = runtime;

    // 3. Local fallback writer (writes ~/.openclaw/workspace/memory/YYYY-MM-DD.md)
    const fallback = new LocalFallbackWriter(api.resolvePath);

    // 4. Recall hook — injects relevant memories before each session (passive, event-driven)
    //    recallMode "ondemand" disables auto-injection; tools still available for manual recall
    if (cfg.autoRecall && cfg.recallMode !== "ondemand") {
      api.on("before_agent_start", createRecallHook(client, cfg));
    }

    // 5. Context engine — fills plugins.slots.contextEngine (active, on-demand)
    //    OpenClaw calls buildContext() whenever it needs to assemble agent context.
    //    Secret-redacted tiered recall with prompt injection protection.
    api.registerContextEngine(createContextEngine(client, cfg));

    // 6. Capture hooks — auto/hybrid modes only (explicit = agent calls memory_store directly)
    if (cfg.captureMode !== "explicit") {
      api.on("agent_end", createCaptureHook(client, cfg, api.logger, fallback));
      api.on("before_compaction", createCompactionCaptureHook(client, cfg, api.logger));
    }

    // 7. Agent tools — always registered regardless of captureMode
    registerMemorySearchTool(api, client, cfg);
    registerMemoryGetTool(api, client);
    registerMemoryStoreTool(api, client, cfg);
    registerMemoryForgetTool(api, client);

    const sharedLabel = cfg.sharedNamespace ? `shared: ${cfg.sharedNamespace}` : "shared: off";
    const recallStatus = cfg.autoRecall && cfg.recallMode !== "ondemand" ? "active" : cfg.recallMode === "ondemand" ? "ondemand" : "off";
    api.logger.info(
      `[recall-forge] Ready — slots: memory+contextEngine | mode: ${cfg.captureMode} | memory: ${cfg.memoryMode} | recall: ${recallStatus} | ${sharedLabel} | fallback: ${cfg.localFallback} | project: ${cfg.projectId}`,
    );
  },
};

export default plugin;

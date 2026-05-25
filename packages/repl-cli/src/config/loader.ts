import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { ReplConfig } from './types.js';
import {
  CONFIG_DIR,
  CONFIG_FILE,
  HISTORY_FILE,
  DEFAULT_API_URL,
  DEFAULT_AI_ROUTER_URL,
  DEFAULT_OPENAI_MODEL,
  DEFAULT_MAX_HISTORY_SIZE
} from './constants.js';

/**
 * Path that loadConfig() most recently read from. saveConfig() defaults
 * to this path so `persona switch --save` round-trips back to the same
 * file the user opened with `--config`.
 */
let _activeConfigPath: string = CONFIG_FILE;

export function getActiveConfigPath(): string {
  return _activeConfigPath;
}

const DEFAULT_CONFIG: ReplConfig = {
  apiUrl: process.env.MEMORY_API_URL || DEFAULT_API_URL,
  useMCP: false,
  mcpServerPath: undefined,
  authToken: process.env.LANONASIS_API_KEY || process.env.MEMORY_API_KEY,
  vendorKey: process.env.LANONASIS_VENDOR_KEY,
  openaiApiKey: process.env.OPENAI_API_KEY,
  openaiModel: process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL,
  // AI router is the default NL engine; OpenAI key is now optional.
  aiRouterUrl: process.env.AI_ROUTER_URL || DEFAULT_AI_ROUTER_URL,
  aiRouterAuthToken: process.env.AI_ROUTER_AUTH_TOKEN,
  aiRouterApiKey: process.env.AI_ROUTER_API_KEY,
  historyFile: HISTORY_FILE,
  maxHistorySize: DEFAULT_MAX_HISTORY_SIZE,
  // User profile defaults
  userProfile: {
    name: process.env.USER_NAME || process.env.USER,
  },
  // User preferences defaults
  userPreferences: {
    theme: 'dark',
    defaultMemoryType: 'context',
    autoSave: true,
    verboseMode: false
  },
  // Default persona slug — applied on REPL startup. Override with `persona switch <name> --save`.
  defaultPersona: process.env.LANONASIS_PERSONA || 'lzero',
  // L0/LZero configuration
  l0: {
    enabled: true,
    enableCampaigns: true,
    enableTrends: true,
    enableContentCreation: true
  },
  // Legacy userContext (for backwards compatibility)
  userContext: process.env.USER_NAME || process.env.USER ? {
    name: process.env.USER_NAME || process.env.USER
  } : undefined
};

export async function loadConfig(
  overrides: Partial<ReplConfig>,
  options?: { configPath?: string }
): Promise<ReplConfig> {
  const target = options?.configPath ? resolve(options.configPath) : CONFIG_FILE;
  _activeConfigPath = target;

  // Ensure containing directory exists (works for both default and custom paths)
  const targetDir = dirname(target);
  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true });
  }

  // Load existing config or create default
  let config = DEFAULT_CONFIG;

  if (existsSync(target)) {
    try {
      const fileContent = readFileSync(target, 'utf-8');
      const savedConfig = JSON.parse(fileContent);
      config = { ...config, ...savedConfig };
    } catch (error) {
      console.warn(`Failed to load config from ${target}, using defaults`);
    }
  } else {
    // Save default config to the requested path (custom or default)
    writeFileSync(target, JSON.stringify(DEFAULT_CONFIG, null, 2));
  }
  
  // Apply overrides from command line (filter out undefined values)
  const filteredOverrides = Object.fromEntries(
    Object.entries(overrides).filter(([_, v]) => v !== undefined)
  );
  const merged = { ...config, ...filteredOverrides };

  // Keep branded model identity consistent unless user explicitly overrides it.
  if (!filteredOverrides.openaiModel && !process.env.OPENAI_MODEL) {
    merged.openaiModel = DEFAULT_OPENAI_MODEL;
  }

  // Reuse main auth token for AI router unless explicitly overridden.
  // Priority: aiRouterApiKey (lano_...) > aiRouterAuthToken > authToken
  if (!merged.aiRouterAuthToken && !merged.aiRouterApiKey && merged.authToken) {
    merged.aiRouterAuthToken = merged.authToken;
  }

  return merged;
}

/**
 * Persist a partial update to the config file. Defaults to the path
 * most recently passed to loadConfig() (or CONFIG_FILE if loadConfig
 * was never called). Pass `options.configPath` to override.
 * Merges with on-disk content; existing fields not in `partial` are preserved.
 */
export function saveConfig(
  partial: Partial<ReplConfig>,
  options?: { configPath?: string }
): void {
  const target = options?.configPath
    ? resolve(options.configPath)
    : _activeConfigPath;
  const targetDir = dirname(target);
  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true });
  }
  let existing: Partial<ReplConfig> = {};
  if (existsSync(target)) {
    try {
      const raw = readFileSync(target, 'utf-8');
      existing = JSON.parse(raw);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Cannot save config: existing file at "${target}" is invalid JSON (${message}).`
      );
    }
  }
  const merged = { ...existing, ...partial };
  writeFileSync(target, JSON.stringify(merged, null, 2));
}

import type { Interface as ReadLine } from 'readline';
import type { MemoryBackendRouter } from '../local-memory/router.js';

export interface UserProfile {
  name?: string;
  email?: string;
  avatar?: string;
  timezone?: string;
}

export interface UserPreferences {
  theme?: 'dark' | 'light' | 'auto';
  language?: string;
  defaultMemoryType?: 'context' | 'project' | 'knowledge' | 'reference' | 'personal' | 'workflow';
  autoSave?: boolean;
  verboseMode?: boolean;
  [key: string]: any; // Allow additional preferences
}

export interface L0Config {
  enabled?: boolean;
  orchestratorModel?: string; // Model for L0 orchestration (default: uses openaiModel)
  enableCampaigns?: boolean;
  enableTrends?: boolean;
  enableContentCreation?: boolean;
}

export interface ReplConfig {
  apiUrl: string;
  useMCP: boolean;
  mcpServerPath?: string;
  authToken?: string;
  vendorKey?: string;
  openaiApiKey?: string;
  openaiModel?: string;
  aiRouterUrl?: string;
  aiRouterAuthToken?: string;
  aiRouterApiKey?: string; // Dedicated API key for AI Router (lano_...)
  /**
   * Opt-in direct api.openai.com fallback when the AI Router fails (default
   * false). Requires openaiApiKey. Also LANONASIS_OPENAI_FALLBACK=1.
   */
  openaiFallback?: boolean;
  historyFile: string;
  maxHistorySize: number;
  /**
   * Persist the in-memory command history to `historyFile` across sessions.
   * Defaults to `true`. Disable by setting this to `false`, or by exporting
   * `LANONASIS_REPL_HISTORY=0` before launching the REPL.
   */
  historyPersistence?: boolean;
  nlMode?: boolean;
  // User profile and preferences
  userProfile?: UserProfile;
  userPreferences?: UserPreferences;
  // Default persona slug applied on startup; overridden at runtime by `persona switch`
  defaultPersona?: string;
  // L0/LZero configuration
  l0?: L0Config;
  // Legacy userContext (for backwards compatibility)
  userContext?: {
    name?: string;
    projects?: string[];
    preferences?: Record<string, any>;
  };
}

export interface CommandContext {
  mode: 'remote' | 'local';
  lastResult?: unknown;
  aliases: Map<string, string>;
  readline?: ReadLine | null; // For spinner coordination
  config: ReplConfig;
  /** Local-first memory router (provided by the orchestrator). */
  memoryRouter?: MemoryBackendRouter | null;
}

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
  historyFile: string;
  maxHistorySize: number;
  // User profile and preferences
  userProfile?: UserProfile;
  userPreferences?: UserPreferences;
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
  config: ReplConfig;
}

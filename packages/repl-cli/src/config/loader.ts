import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { ReplConfig } from './types.js';
import {
  CONFIG_DIR,
  CONFIG_FILE,
  HISTORY_FILE,
  DEFAULT_API_URL,
  DEFAULT_OPENAI_MODEL,
  DEFAULT_MAX_HISTORY_SIZE
} from './constants.js';

const DEFAULT_CONFIG: ReplConfig = {
  apiUrl: process.env.MEMORY_API_URL || DEFAULT_API_URL,
  useMCP: false,
  mcpServerPath: undefined,
  authToken: process.env.LANONASIS_API_KEY || process.env.MEMORY_API_KEY,
  vendorKey: process.env.LANONASIS_VENDOR_KEY,
  openaiApiKey: process.env.OPENAI_API_KEY=REDACTED_OPENAI_API_KEY
  openaiModel: process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL,
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

export async function loadConfig(overrides: Partial<ReplConfig>): Promise<ReplConfig> {
  // Ensure config directory exists
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
  
  // Load existing config or create default
  let config = DEFAULT_CONFIG;
  
  if (existsSync(CONFIG_FILE)) {
    try {
      const fileContent = readFileSync(CONFIG_FILE, 'utf-8');
      const savedConfig = JSON.parse(fileContent);
      config = { ...config, ...savedConfig };
    } catch (error) {
      console.warn('Failed to load config, using defaults');
    }
  } else {
    // Save default config
    writeFileSync(CONFIG_FILE, JSON.stringify(DEFAULT_CONFIG, null, 2));
  }
  
  // Apply overrides from command line (filter out undefined values)
  const filteredOverrides = Object.fromEntries(
    Object.entries(overrides).filter(([_, v]) => v !== undefined)
  );
  return { ...config, ...filteredOverrides };
}

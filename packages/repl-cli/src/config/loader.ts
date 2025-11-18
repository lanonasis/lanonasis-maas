import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { ReplConfig } from './types.js';

const CONFIG_DIR = join(homedir(), '.lanonasis');
const CONFIG_FILE = join(CONFIG_DIR, 'repl-config.json');

const DEFAULT_CONFIG: ReplConfig = {
  apiUrl: process.env.MEMORY_API_URL || 'https://api.lanonasis.com',
  useMCP: false,
  mcpServerPath: undefined,
  authToken: process.env.LANONASIS_API_KEY || process.env.MEMORY_API_KEY,
  vendorKey: process.env.LANONASIS_VENDOR_KEY,
  openaiApiKey: process.env.OPENAI_API_KEY=REDACTED_OPENAI_API_KEY
  historyFile: join(CONFIG_DIR, 'repl-history.txt'),
  maxHistorySize: 1000
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
  
  // Apply overrides from command line
  return { ...config, ...overrides };
}

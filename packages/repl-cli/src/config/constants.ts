/**
 * Shared Configuration Constants
 *
 * Centralized location for configuration paths and default values
 * to avoid duplication across modules.
 */

import { join } from 'path';
import { homedir } from 'os';

// Configuration directory for all LanOnasis CLI data
export const CONFIG_DIR = join(homedir(), '.lanonasis');

// File paths
export const CONFIG_FILE = join(CONFIG_DIR, 'repl-config.json');
export const CREDENTIALS_FILE = join(CONFIG_DIR, 'credentials.json');
export const HISTORY_FILE = join(CONFIG_DIR, 'repl-history.txt');

// Default API URL
export const DEFAULT_API_URL = 'https://api.lanonasis.com';
export const DEFAULT_AI_ROUTER_URL = 'https://ai.vortexcore.app';

// Default OAuth settings
export const DEFAULT_AUTH_URL = 'https://auth.lanonasis.com';
export const DEFAULT_CLIENT_ID = 'lanonasis-repl-cli';
export const DEFAULT_CALLBACK_PORT = 8899;

// Timeouts (in milliseconds)
export const DEFAULT_API_TIMEOUT = 30000;
export const MCP_CONNECTION_TIMEOUT = 10000;
export const MCP_TOOL_CALL_TIMEOUT = 30000;
export const OAUTH_CALLBACK_TIMEOUT = 5 * 60 * 1000; // 5 minutes

// Model defaults
export const DEFAULT_OPENAI_MODEL = 'L-Zero';

// History settings
export const DEFAULT_MAX_HISTORY_SIZE = 1000;

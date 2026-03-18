/**
 * Command contract fixtures for CLI test suite.
 *
 * Defines schemas, categories, and valid examples for all CLI commands.
 * Used by contract, integration, and load tests.
 */

import { z } from 'zod';

// Memory type enum (must match API)
export const MEMORY_TYPES = ['context', 'project', 'knowledge', 'reference', 'personal', 'workflow'] as const;
export const MEMORY_TYPE_ENUM = z.enum(MEMORY_TYPES);

// Common validators
const UUID = z.string().uuid();
const EmailSchema = z.string().email();

export const COMMAND_SCHEMAS = {
  // Auth commands (5)
  auth_login: z.object({
    email: z.string().email().optional(),
    password: z.string().min(1).optional(),
    vendorKey: z.string().min(1).optional(),
    useWebAuth: z.boolean().optional(),
    oauth: z.boolean().optional(),
  }).strict().refine((data) => {
    // At least one auth method or interactive
    return true; // Interactive mode allowed without params
  }),

  auth_logout: z.object({}).strict(),

  auth_status: z.object({}).strict(),

  auth_register: z.object({
    email: z.string().email(),
    password: z.string().min(8),
    confirmPassword: z.string(),
    organizationName: z.string().min(1),
  }).strict(),

  auth_whoami: z.object({}).strict(),

  // Memory commands (11)
  memory_list: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    type: MEMORY_TYPE_ENUM.optional(),
    tags: z.string().optional(),
    userId: z.string().optional(),
    sort: z.string().optional(),
    order: z.enum(['asc', 'desc']).optional(),
  }).strict(),

  memory_create: z.object({
    title: z.string().min(1).max(500).optional(),
    content: z.string().min(1).optional(),
    type: MEMORY_TYPE_ENUM.optional(),
    tags: z.string().optional(),
    topicId: z.string().optional(),
    interactive: z.boolean().optional(),
    json: z.string().optional(),
    contentFile: z.string().optional(),
    inline: z.boolean().optional(),
  }).strict(),

  memory_get: z.object({
    id: z.string().min(1),
  }).strict(),

  memory_update: z.object({
    id: z.string().min(1),
    title: z.string().min(1).optional(),
    content: z.string().min(1).optional(),
    type: MEMORY_TYPE_ENUM.optional(),
    tags: z.string().optional(),
    interactive: z.boolean().optional(),
    inline: z.boolean().optional(),
  }).strict(),

  memory_delete: z.object({
    id: z.string().min(1),
    force: z.boolean().optional(),
  }).strict(),

  memory_search: z.object({
    query: z.string().min(1),
    limit: z.string().optional(),
    threshold: z.string().optional(),
    type: z.string().optional(),
    tags: z.string().optional(),
  }).strict(),

  memory_stats: z.object({}).strict(),

  memory_save_session: z.object({
    testSummary: z.string().optional(),
    title: z.string().optional(),
    type: MEMORY_TYPE_ENUM.optional(),
    tags: z.string().optional(),
  }).strict(),

  memory_list_sessions: z.object({
    limit: z.string().optional(),
    tags: z.string().optional(),
  }).strict(),

  memory_load_session: z.object({
    id: z.string().min(1),
  }).strict(),

  memory_delete_session: z.object({
    id: z.string().min(1),
    force: z.boolean().optional(),
  }).strict(),

  // Topics commands (5)
  topics_list: z.object({
    limit: z.string().optional(),
    parent: z.string().optional(),
  }).strict(),

  topics_create: z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    icon: z.string().optional(),
    parent: z.string().optional(),
    interactive: z.boolean().optional(),
  }).strict(),

  topics_get: z.object({
    id: z.string().min(1),
  }).strict(),

  topics_update: z.object({
    id: z.string().min(1),
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    icon: z.string().optional(),
    interactive: z.boolean().optional(),
  }).strict(),

  topics_delete: z.object({
    id: z.string().min(1),
    force: z.boolean().optional(),
  }).strict(),

  // Config commands (4)
  config_list: z.object({}).strict(),

  config_get: z.object({
    key: z.string().min(1),
  }).strict(),

  config_set: z.object({
    key: z.string().min(1),
    value: z.string().min(1),
  }).strict(),

  config_reset: z.object({
    force: z.boolean().optional(),
  }).strict(),

  // API Keys commands (4)
  api_keys_list: z.object({
    activeOnly: z.boolean().optional(),
  }).strict(),

  api_keys_create: z.object({
    name: z.string().min(1),
    scope: z.string().optional(),
    expiresInDays: z.string().optional(),
  }).strict(),

  api_keys_revoke: z.object({
    id: z.string().min(1),
  }).strict(),

  api_keys_rotate: z.object({
    id: z.string().min(1),
  }).strict(),

  // MCP commands (10)
  mcp_status: z.object({
    verbose: z.boolean().optional(),
  }).strict(),

  mcp_connect: z.object({
    remote: z.boolean().optional(),
    local: z.boolean().optional(),
    auto: z.boolean().optional(),
  }).strict(),

  mcp_disconnect: z.object({}).strict(),

  mcp_list_servers: z.object({}).strict(),

  mcp_tools: z.object({
    verbose: z.boolean().optional(),
  }).strict(),

  mcp_resources: z.object({}).strict(),

  mcp_call: z.object({
    tool: z.string().min(1),
    args: z.string().optional(),
  }).strict(),

  mcp_health: z.object({
    verbose: z.boolean().optional(),
  }).strict(),

  mcp_server_start: z.object({
    verbose: z.boolean().optional(),
    port: z.string().optional(),
  }).strict(),

  mcp_server_stop: z.object({}).strict(),

  // System commands (6)
  system_health: z.object({
    verbose: z.boolean().optional(),
  }).strict(),

  system_status: z.object({}).strict(),

  system_init: z.object({}).strict(),

  system_guide: z.object({}).strict(),

  system_quickstart: z.object({}).strict(),

  system_completion: z.object({
    shell: z.enum(['bash', 'zsh', 'fish']).optional(),
  }).strict(),
} as const;

export type CommandName = keyof typeof COMMAND_SCHEMAS;
export const EXPECTED_COMMAND_NAMES = Object.keys(COMMAND_SCHEMAS) as CommandName[];

export const COMMAND_CATEGORIES = {
  auth: [
    'auth_login',
    'auth_logout',
    'auth_status',
    'auth_register',
    'auth_whoami',
  ],
  memory: [
    'memory_list',
    'memory_create',
    'memory_get',
    'memory_update',
    'memory_delete',
    'memory_search',
    'memory_stats',
    'memory_save_session',
    'memory_list_sessions',
    'memory_load_session',
    'memory_delete_session',
  ],
  topics: [
    'topics_list',
    'topics_create',
    'topics_get',
    'topics_update',
    'topics_delete',
  ],
  config: [
    'config_list',
    'config_get',
    'config_set',
    'config_reset',
  ],
  apiKeys: [
    'api_keys_list',
    'api_keys_create',
    'api_keys_revoke',
    'api_keys_rotate',
  ],
  mcp: [
    'mcp_status',
    'mcp_connect',
    'mcp_disconnect',
    'mcp_list_servers',
    'mcp_tools',
    'mcp_resources',
    'mcp_call',
    'mcp_health',
    'mcp_server_start',
    'mcp_server_stop',
  ],
  system: [
    'system_health',
    'system_status',
    'system_init',
    'system_guide',
    'system_quickstart',
    'system_completion',
  ],
} as const;

// Sample IDs for test examples
const sampleMemoryId = '123e4567-e89b-42d3-a456-426614174000';
const sampleTopicId = '223e4567-e89b-42d3-a456-426614174000';
const sampleApiKeyId = '323e4567-e89b-42d3-a456-426614174000';

export const VALID_COMMAND_EXAMPLES: Record<CommandName, unknown> = {
  // Auth
  auth_login: { vendorKey: 'pk_test_abc123' },
  auth_logout: {},
  auth_status: {},
  auth_register: {
    email: 'test@example.com',
    password: 'SecurePass123!',
    confirmPassword: 'SecurePass123!',
    organizationName: 'Test Org',
  },
  auth_whoami: {},

  // Memory
  memory_list: { limit: '20', page: '1', type: 'context', sort: 'created_at', order: 'desc' },
  memory_create: {
    title: 'Test Memory',
    content: 'Test content',
    type: 'context',
    tags: 'test,cli',
  },
  memory_get: { id: sampleMemoryId },
  memory_update: { id: sampleMemoryId, title: 'Updated Title' },
  memory_delete: { id: sampleMemoryId },
  memory_search: { query: 'test query', limit: '10', threshold: '0.7' },
  memory_stats: {},
  memory_save_session: { testSummary: 'Vitest: 53 passed', title: 'Session summary', tags: 'session,cli' },
  memory_list_sessions: { limit: '10', tags: 'session' },
  memory_load_session: { id: sampleMemoryId },
  memory_delete_session: { id: sampleMemoryId },

  // Topics
  topics_list: { limit: '20' },
  topics_create: {
    name: 'Development',
    description: 'Development topics',
    color: '#3B82F6',
    icon: '💻',
  },
  topics_get: { id: sampleTopicId },
  topics_update: { id: sampleTopicId, name: 'Updated Topic', color: '#10B981' },
  topics_delete: { id: sampleTopicId },

  // Config
  config_list: {},
  config_get: { key: 'apiUrl' },
  config_set: { key: 'apiUrl', value: 'https://api.lanonasis.com/api/v1' },
  config_reset: {},

  // API Keys
  api_keys_list: { activeOnly: true },
  api_keys_create: { name: 'Integration Key', scope: 'memory:read', expiresInDays: '90' },
  api_keys_revoke: { id: sampleApiKeyId },
  api_keys_rotate: { id: sampleApiKeyId },

  // MCP
  mcp_status: { verbose: true },
  mcp_connect: { remote: true },
  mcp_disconnect: {},
  mcp_list_servers: {},
  mcp_tools: { verbose: true },
  mcp_resources: {},
  mcp_call: { tool: 'list_memories', args: '{"limit": 10}' },
  mcp_health: { verbose: true },
  mcp_server_start: { verbose: true, port: '3001' },
  mcp_server_stop: {},

  // System
  system_health: { verbose: true },
  system_status: {},
  system_init: {},
  system_guide: {},
  system_quickstart: {},
  system_completion: { shell: 'bash' },
};

/**
 * Get command name from CLI command path
 * e.g., 'memory list' -> 'memory_list'
 */
export function cliCommandToName(cliCommand: string): CommandName {
  const normalized = cliCommand.trim().toLowerCase().replace(/\s+/g, '_');
  
  // Handle special cases
  if (normalized.startsWith('auth_')) {
    return `auth_${normalized.replace('auth_', '')}` as CommandName;
  }
  if (normalized.startsWith('memory_')) {
    return `memory_${normalized.replace('memory_', '')}` as CommandName;
  }
  if (normalized.startsWith('topic_') || normalized.startsWith('topics_')) {
    return `topics_${normalized.replace(/^topic[s]?_/, '')}` as CommandName;
  }
  if (normalized.startsWith('config_')) {
    return `config_${normalized.replace('config_', '')}` as CommandName;
  }
  if (normalized.startsWith('api_')) {
    return `api_keys_${normalized.replace(/^api_?keys?_/, '')}` as CommandName;
  }
  if (normalized.startsWith('mcp_')) {
    return `mcp_${normalized.replace('mcp_', '')}` as CommandName;
  }
  if (['health', 'status', 'init', 'guide', 'quickstart', 'completion'].includes(normalized)) {
    return `system_${normalized}` as CommandName;
  }
  
  throw new Error(`Unknown command: ${cliCommand}`);
}

/**
 * Get CLI command path from internal command name
 * e.g., 'memory_list' -> 'memory list'
 * e.g., 'memory_save_session' -> 'memory save-session'
 */
export function commandNameToCli(commandName: CommandName): string {
  const [category, ...rest] = commandName.split('_');
  const subcommand = rest.join('_');
  
  if (category === 'auth') {
    return `auth ${subcommand}`;
  }
  if (category === 'memory') {
    // Memory commands with underscores in subcommand use kebab-case
    return `memory ${subcommand.replace(/_/g, '-')}`;
  }
  if (category === 'topics') {
    return `topic ${subcommand}`;
  }
  if (category === 'config') {
    return `config ${subcommand}`;
  }
  if (category === 'apiKeys') {
    return `api-keys ${subcommand}`;
  }
  if (category === 'mcp') {
    // MCP commands with underscores in subcommand use kebab-case
    return `mcp ${subcommand.replace(/_/g, '-')}`;
  }
  if (category === 'system') {
    return subcommand;
  }
  
  return commandName;
}

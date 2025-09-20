/**
 * Unified Tool Configuration for LanOnasis-MAAS
 * 17 Enterprise Tools for all IDE Extensions
 */

export interface ToolDefinition {
  name: string;
  command: string;
  title: string;
  description: string;
  category: string;
  icon?: string;
  keybinding?: {
    key: string;
    mac?: string;
    when?: string;
  };
  contextMenu?: boolean;
  requiresAuth?: boolean;
}

/**
 * Complete list of 17 LanOnasis-MAAS tools
 * Shared across VS Code, Cursor, and Windsurf extensions
 */
export const LANONASIS_TOOLS: ToolDefinition[] = [
  // Memory Management Tools (6)
  {
    name: 'create_memory',
    command: 'lanonasis.createMemory',
    title: 'Create Memory',
    description: 'Create a new memory from selection or file',
    category: 'Memory',
    icon: '$(add)',
    keybinding: {
      key: 'ctrl+shift+alt+m',
      mac: 'cmd+shift+alt+m',
      when: 'editorHasSelection'
    },
    contextMenu: true,
    requiresAuth: true
  },
  {
    name: 'search_memories',
    command: 'lanonasis.searchMemory',
    title: 'Search Memories',
    description: 'Search through all stored memories',
    category: 'Memory',
    icon: '$(search)',
    keybinding: {
      key: 'ctrl+shift+m',
      mac: 'cmd+shift+m',
      when: 'editorTextFocus'
    },
    requiresAuth: true
  },
  {
    name: 'get_memory',
    command: 'lanonasis.getMemory',
    title: 'Get Memory',
    description: 'Retrieve a specific memory by ID',
    category: 'Memory',
    icon: '$(file)',
    requiresAuth: true
  },
  {
    name: 'update_memory',
    command: 'lanonasis.updateMemory',
    title: 'Update Memory',
    description: 'Update an existing memory',
    category: 'Memory',
    icon: '$(edit)',
    requiresAuth: true
  },
  {
    name: 'delete_memory',
    command: 'lanonasis.deleteMemory',
    title: 'Delete Memory',
    description: 'Delete a memory permanently',
    category: 'Memory',
    icon: '$(trash)',
    requiresAuth: true
  },
  {
    name: 'list_memories',
    command: 'lanonasis.listMemories',
    title: 'List Memories',
    description: 'List all memories with filtering options',
    category: 'Memory',
    icon: '$(list-unordered)',
    requiresAuth: true
  },

  // API Key Management Tools (4)
  {
    name: 'create_api_key',
    command: 'lanonasis.createApiKey',
    title: 'Create API Key',
    description: 'Generate a new API key for your project',
    category: 'API Keys',
    icon: '$(key)',
    requiresAuth: true
  },
  {
    name: 'list_api_keys',
    command: 'lanonasis.listApiKeys',
    title: 'List API Keys',
    description: 'View all API keys for your organization',
    category: 'API Keys',
    icon: '$(list-flat)',
    keybinding: {
      key: 'ctrl+shift+k',
      mac: 'cmd+shift+k'
    },
    requiresAuth: true
  },
  {
    name: 'rotate_api_key',
    command: 'lanonasis.rotateApiKey',
    title: 'Rotate API Key',
    description: 'Rotate an existing API key for security',
    category: 'API Keys',
    icon: '$(sync)',
    requiresAuth: true
  },
  {
    name: 'delete_api_key',
    command: 'lanonasis.deleteApiKey',
    title: 'Delete API Key',
    description: 'Revoke and delete an API key',
    category: 'API Keys',
    icon: '$(close)',
    requiresAuth: true
  },

  // System & Auth Tools (3)
  {
    name: 'get_health_status',
    command: 'lanonasis.getHealthStatus',
    title: 'Health Status',
    description: 'Check service health and connectivity',
    category: 'System',
    icon: '$(pulse)',
    requiresAuth: false
  },
  {
    name: 'get_auth_status',
    command: 'lanonasis.getAuthStatus',
    title: 'Authentication Status',
    description: 'View current authentication status and user info',
    category: 'System',
    icon: '$(shield)',
    requiresAuth: false
  },
  {
    name: 'get_organization_info',
    command: 'lanonasis.getOrganizationInfo',
    title: 'Organization Info',
    description: 'Get organization details and usage stats',
    category: 'System',
    icon: '$(organization)',
    requiresAuth: true
  },

  // Project Management Tools (2)
  {
    name: 'create_project',
    command: 'lanonasis.createProject',
    title: 'Create Project',
    description: 'Create a new project in your organization',
    category: 'Projects',
    icon: '$(folder-library)',
    requiresAuth: true
  },
  {
    name: 'list_projects',
    command: 'lanonasis.listProjects',
    title: 'List Projects',
    description: 'View all projects in your organization',
    category: 'Projects',
    icon: '$(folder-opened)',
    requiresAuth: true
  },

  // Configuration Tools (2)
  {
    name: 'get_config',
    command: 'lanonasis.getConfig',
    title: 'Get Configuration',
    description: 'Retrieve current configuration settings',
    category: 'Config',
    icon: '$(settings)',
    requiresAuth: false
  },
  {
    name: 'set_config',
    command: 'lanonasis.setConfig',
    title: 'Set Configuration',
    description: 'Update configuration settings',
    category: 'Config',
    icon: '$(settings-gear)',
    requiresAuth: true
  }
];

/**
 * Tool categories for grouping in UI
 */
export const TOOL_CATEGORIES = [
  'Memory',
  'API Keys',
  'System',
  'Projects',
  'Config'
];

/**
 * Map tool names to their definitions for quick lookup
 */
export const TOOLS_MAP = new Map<string, ToolDefinition>(
  LANONASIS_TOOLS.map(tool => [tool.name, tool])
);

/**
 * Get tools by category
 */
export function getToolsByCategory(category: string): ToolDefinition[] {
  return LANONASIS_TOOLS.filter(tool => tool.category === category);
}

/**
 * Get tools that require authentication
 */
export function getAuthRequiredTools(): ToolDefinition[] {
  return LANONASIS_TOOLS.filter(tool => tool.requiresAuth);
}

/**
 * Get tools with keybindings
 */
export function getToolsWithKeybindings(): ToolDefinition[] {
  return LANONASIS_TOOLS.filter(tool => tool.keybinding);
}

/**
 * Validate that all 17 tools are present
 */
export function validateToolsComplete(): boolean {
  return LANONASIS_TOOLS.length === 17;
}

import { exec, execSync } from 'child_process';
import { promisify } from 'util';
import { z } from 'zod';

/**
 * Memory Client class for interacting with the Memory as a Service API
 */
class MemoryClient {
    constructor(config) {
        this.config = {
            timeout: 30000,
            useGateway: true,
            ...config
        };
        this.baseHeaders = {
            'Content-Type': 'application/json',
            'User-Agent': '@LanOnasis/memory-client/1.0.0',
            ...config.headers
        };
        // Set authentication headers
        if (config.authToken) {
            this.baseHeaders['Authorization'] = `Bearer ${config.authToken}`;
        }
        else if (config.apiKey) {
            this.baseHeaders['X-API-Key'] = config.apiKey;
        }
    }
    /**
     * Make an HTTP request to the API
     */
    async request(endpoint, options = {}) {
        // Handle gateway vs direct API URL formatting
        const baseUrl = this.config.apiUrl.includes('/api')
            ? this.config.apiUrl.replace('/api', '')
            : this.config.apiUrl;
        const url = `${baseUrl}/api/v1${endpoint}`;
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
            const response = await fetch(url, {
                headers: { ...this.baseHeaders, ...options.headers },
                signal: controller.signal,
                ...options,
            });
            clearTimeout(timeoutId);
            let data;
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            }
            else {
                data = await response.text();
            }
            if (!response.ok) {
                return {
                    error: data?.error || `HTTP ${response.status}: ${response.statusText}`
                };
            }
            return { data };
        }
        catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                return { error: 'Request timeout' };
            }
            return {
                error: error instanceof Error ? error.message : 'Network error'
            };
        }
    }
    /**
     * Test the API connection and authentication
     */
    async healthCheck() {
        return this.request('/health');
    }
    // Memory Operations
    /**
     * Create a new memory
     */
    async createMemory(memory) {
        return this.request('/memory', {
            method: 'POST',
            body: JSON.stringify(memory)
        });
    }
    /**
     * Get a memory by ID
     */
    async getMemory(id) {
        return this.request(`/memory/${encodeURIComponent(id)}`);
    }
    /**
     * Update an existing memory
     */
    async updateMemory(id, updates) {
        return this.request(`/memory/${encodeURIComponent(id)}`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
    }
    /**
     * Delete a memory
     */
    async deleteMemory(id) {
        return this.request(`/memory/${encodeURIComponent(id)}`, {
            method: 'DELETE'
        });
    }
    /**
     * List memories with optional filtering and pagination
     */
    async listMemories(options = {}) {
        const params = new URLSearchParams();
        Object.entries(options).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                if (Array.isArray(value)) {
                    params.append(key, value.join(','));
                }
                else {
                    params.append(key, String(value));
                }
            }
        });
        const queryString = params.toString();
        const endpoint = queryString ? `/memory?${queryString}` : '/memory';
        return this.request(endpoint);
    }
    /**
     * Search memories using semantic search
     */
    async searchMemories(request) {
        return this.request('/memory/search', {
            method: 'POST',
            body: JSON.stringify(request)
        });
    }
    /**
     * Bulk delete multiple memories
     */
    async bulkDeleteMemories(memoryIds) {
        return this.request('/memory/bulk/delete', {
            method: 'POST',
            body: JSON.stringify({ memory_ids: memoryIds })
        });
    }
    // Topic Operations
    /**
     * Create a new topic
     */
    async createTopic(topic) {
        return this.request('/topics', {
            method: 'POST',
            body: JSON.stringify(topic)
        });
    }
    /**
     * Get all topics
     */
    async getTopics() {
        return this.request('/topics');
    }
    /**
     * Get a topic by ID
     */
    async getTopic(id) {
        return this.request(`/topics/${encodeURIComponent(id)}`);
    }
    /**
     * Update a topic
     */
    async updateTopic(id, updates) {
        return this.request(`/topics/${encodeURIComponent(id)}`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
    }
    /**
     * Delete a topic
     */
    async deleteTopic(id) {
        return this.request(`/topics/${encodeURIComponent(id)}`, {
            method: 'DELETE'
        });
    }
    /**
     * Get user memory statistics
     */
    async getMemoryStats() {
        return this.request('/memory/stats');
    }
    // Utility Methods
    /**
     * Update authentication token
     */
    setAuthToken(token) {
        this.baseHeaders['Authorization'] = `Bearer ${token}`;
        delete this.baseHeaders['X-API-Key'];
    }
    /**
     * Update API key
     */
    setApiKey(apiKey) {
        this.baseHeaders['X-API-Key'] = apiKey;
        delete this.baseHeaders['Authorization'];
    }
    /**
     * Clear authentication
     */
    clearAuth() {
        delete this.baseHeaders['Authorization'];
        delete this.baseHeaders['X-API-Key'];
    }
    /**
     * Update configuration
     */
    updateConfig(updates) {
        this.config = { ...this.config, ...updates };
        if (updates.headers) {
            this.baseHeaders = { ...this.baseHeaders, ...updates.headers };
        }
    }
    /**
     * Get current configuration (excluding sensitive data)
     */
    getConfig() {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { apiKey, authToken, ...safeConfig } = this.config;
        return safeConfig;
    }
}
/**
 * Factory function to create a new Memory Client instance
 */
function createMemoryClient(config) {
    return new MemoryClient(config);
}

/**
 * CLI Integration Module for Memory Client SDK
 *
 * Provides intelligent CLI detection and MCP channel utilization
 * when @LanOnasis/cli v1.5.2+ is available in the environment
 */
const execAsync = promisify(exec);
/**
 * CLI Detection and Integration Service
 */
class CLIIntegration {
    constructor() {
        this.cliInfo = null;
        this.detectionPromise = null;
    }
    /**
     * Detect if CLI is available and get its capabilities
     */
    async detectCLI() {
        // Return cached result if already detected
        if (this.cliInfo) {
            return this.cliInfo;
        }
        // Return existing promise if detection is in progress
        if (this.detectionPromise) {
            return this.detectionPromise;
        }
        // Start new detection
        this.detectionPromise = this.performDetection();
        this.cliInfo = await this.detectionPromise;
        return this.cliInfo;
    }
    async performDetection() {
        try {
            // Check if onasis/LanOnasis CLI is available
            const { stdout: versionOutput } = await execAsync('onasis --version 2>/dev/null || LanOnasis --version 2>/dev/null', {
                timeout: 5000
            });
            const version = versionOutput.trim();
            // Verify it's v1.5.2 or higher for Golden Contract support
            const versionMatch = version.match(/(\d+)\.(\d+)\.(\d+)/);
            if (!versionMatch) {
                return { available: false };
            }
            const [, major, minor, patch] = versionMatch.map(Number);
            const isCompatible = major > 1 || (major === 1 && minor > 5) || (major === 1 && minor === 5 && patch >= 2);
            if (!isCompatible) {
                return {
                    available: true,
                    version,
                    mcpAvailable: false,
                    authenticated: false
                };
            }
            // Check MCP availability
            let mcpAvailable = false;
            try {
                await execAsync('onasis mcp status --output json 2>/dev/null || LanOnasis mcp status --output json 2>/dev/null', {
                    timeout: 3000
                });
                mcpAvailable = true;
            }
            catch {
                // MCP not available or not configured
            }
            // Check authentication status
            let authenticated = false;
            try {
                const { stdout: authOutput } = await execAsync('onasis auth status --output json 2>/dev/null || LanOnasis auth status --output json 2>/dev/null', {
                    timeout: 3000
                });
                const authStatus = JSON.parse(authOutput);
                authenticated = authStatus.authenticated === true;
            }
            catch {
                // Authentication check failed
            }
            return {
                available: true,
                version,
                mcpAvailable,
                authenticated
            };
        }
        catch {
            return { available: false };
        }
    }
    /**
     * Execute CLI command and return parsed JSON result
     */
    async executeCLICommand(command, options = {}) {
        const cliInfo = await this.detectCLI();
        if (!cliInfo.available) {
            return { error: 'CLI not available' };
        }
        if (!cliInfo.authenticated) {
            return { error: 'CLI not authenticated. Run: onasis login' };
        }
        try {
            const timeout = options.timeout || 30000;
            const outputFormat = options.outputFormat || 'json';
            const verbose = options.verbose ? '--verbose' : '';
            // Determine which CLI command to use (prefer onasis for Golden Contract)
            const cliCmd = await this.getPreferredCLICommand();
            const fullCommand = `${cliCmd} ${command} --output ${outputFormat} ${verbose}`.trim();
            const { stdout, stderr } = await execAsync(fullCommand, {
                timeout,
                maxBuffer: 1024 * 1024 // 1MB buffer
            });
            if (stderr && stderr.trim()) {
                console.warn('CLI warning:', stderr);
            }
            if (outputFormat === 'json') {
                try {
                    const result = JSON.parse(stdout);
                    return { data: result };
                }
                catch (parseError) {
                    return { error: `Failed to parse CLI JSON output: ${parseError instanceof Error ? parseError.message : 'Unknown error'}` };
                }
            }
            return { data: stdout };
        }
        catch (error) {
            if (error instanceof Error && error.message.includes('timeout')) {
                return { error: 'CLI command timeout' };
            }
            return {
                error: error instanceof Error ? error.message : 'CLI command failed'
            };
        }
    }
    /**
     * Get preferred CLI command (onasis for Golden Contract, fallback to LanOnasis)
     */
    async getPreferredCLICommand() {
        try {
            execSync('which onasis', { stdio: 'ignore', timeout: 1000 });
            return 'onasis';
        }
        catch {
            return 'LanOnasis';
        }
    }
    /**
     * Memory operations via CLI
     */
    async createMemoryViaCLI(title, content, options = {}) {
        const { memoryType = 'context', tags = [], topicId } = options;
        let command = `memory create --title "${title}" --content "${content}" --memory-type ${memoryType}`;
        if (tags.length > 0) {
            command += ` --tags "${tags.join(',')}"`;
        }
        if (topicId) {
            command += ` --topic-id "${topicId}"`;
        }
        return this.executeCLICommand(command);
    }
    async listMemoriesViaCLI(options = {}) {
        let command = 'memory list';
        if (options.limit) {
            command += ` --limit ${options.limit}`;
        }
        if (options.memoryType) {
            command += ` --memory-type ${options.memoryType}`;
        }
        if (options.tags && options.tags.length > 0) {
            command += ` --tags "${options.tags.join(',')}"`;
        }
        if (options.sortBy) {
            command += ` --sort-by ${options.sortBy}`;
        }
        return this.executeCLICommand(command);
    }
    async searchMemoriesViaCLI(query, options = {}) {
        let command = `memory search "${query}"`;
        if (options.limit) {
            command += ` --limit ${options.limit}`;
        }
        if (options.memoryTypes && options.memoryTypes.length > 0) {
            command += ` --memory-types "${options.memoryTypes.join(',')}"`;
        }
        return this.executeCLICommand(command);
    }
    /**
     * Health check via CLI
     */
    async healthCheckViaCLI() {
        return this.executeCLICommand('health');
    }
    /**
     * MCP-specific operations
     */
    async getMCPStatus() {
        const cliInfo = await this.detectCLI();
        if (!cliInfo.mcpAvailable) {
            return { error: 'MCP not available via CLI' };
        }
        return this.executeCLICommand('mcp status');
    }
    async listMCPTools() {
        const cliInfo = await this.detectCLI();
        if (!cliInfo.mcpAvailable) {
            return { error: 'MCP not available via CLI' };
        }
        return this.executeCLICommand('mcp tools');
    }
    /**
     * Authentication operations
     */
    async getAuthStatus() {
        return this.executeCLICommand('auth status');
    }
    /**
     * Check if specific CLI features are available
     */
    async getCapabilities() {
        const cliInfo = await this.detectCLI();
        return {
            cliAvailable: cliInfo.available,
            version: cliInfo.version,
            mcpSupport: cliInfo.mcpAvailable || false,
            authenticated: cliInfo.authenticated || false,
            goldenContract: cliInfo.available && this.isGoldenContractCompliant(cliInfo.version)
        };
    }
    isGoldenContractCompliant(version) {
        if (!version)
            return false;
        const versionMatch = version.match(/(\d+)\.(\d+)\.(\d+)/);
        if (!versionMatch)
            return false;
        const [, major, minor, patch] = versionMatch.map(Number);
        return major > 1 || (major === 1 && minor > 5) || (major === 1 && minor === 5 && patch >= 2);
    }
    /**
     * Force refresh CLI detection
     */
    async refresh() {
        this.cliInfo = null;
        this.detectionPromise = null;
        return this.detectCLI();
    }
    /**
     * Get cached CLI info without re-detection
     */
    getCachedInfo() {
        return this.cliInfo;
    }
}

/**
 * Enhanced Memory Client with CLI Integration
 *
 * Intelligently routes requests through CLI v1.5.2+ when available,
 * with fallback to direct API for maximum compatibility and performance
 */
/**
 * Enhanced Memory Client with intelligent CLI/API routing
 */
class EnhancedMemoryClient {
    constructor(config) {
        this.capabilities = null;
        this.config = {
            preferCLI: true,
            enableMCP: true,
            cliDetectionTimeout: 5000,
            fallbackToAPI: true,
            minCLIVersion: '1.5.2',
            verbose: false,
            timeout: 30000,
            useGateway: true,
            apiKey: config.apiKey || process.env.LANONASIS_API_KEY || '',
            authToken: config.authToken || '',
            ...config
        };
        this.directClient = new MemoryClient(config);
        this.cliIntegration = new CLIIntegration();
    }
    /**
     * Initialize the client and detect capabilities
     */
    async initialize() {
        try {
            this.capabilities = await this.cliIntegration.getCapabilities();
            if (this.capabilities.cliAvailable && !this.capabilities.authenticated) {
                console.warn('CLI is available but not authenticated. Consider running: onasis login');
            }
        }
        catch (error) {
            console.warn('CLI detection failed:', error);
            this.capabilities = {
                cliAvailable: false,
                mcpSupport: false,
                authenticated: false,
                goldenContract: false
            };
        }
    }
    /**
     * Get current capabilities
     */
    async getCapabilities() {
        if (!this.capabilities) {
            await this.initialize();
        }
        return this.capabilities;
    }
    /**
     * Determine if operation should use CLI
     */
    async shouldUseCLI() {
        const capabilities = await this.getCapabilities();
        return (this.config.preferCLI &&
            capabilities.cliAvailable &&
            capabilities.authenticated &&
            capabilities.goldenContract);
    }
    /**
     * Execute operation with intelligent routing
     */
    async executeOperation(operation, cliOperation, apiOperation) {
        const useCLI = await this.shouldUseCLI();
        const capabilities = await this.getCapabilities();
        if (useCLI) {
            try {
                const result = await cliOperation();
                if (result.error && this.config.fallbackToAPI) {
                    console.warn(`CLI ${operation} failed, falling back to API:`, result.error);
                    const apiResult = await apiOperation();
                    return {
                        ...apiResult,
                        source: 'api',
                        mcpUsed: false
                    };
                }
                return {
                    ...result,
                    source: 'cli',
                    mcpUsed: capabilities.mcpSupport
                };
            }
            catch (error) {
                if (this.config.fallbackToAPI) {
                    console.warn(`CLI ${operation} error, falling back to API:`, error);
                    const apiResult = await apiOperation();
                    return {
                        ...apiResult,
                        source: 'api',
                        mcpUsed: false
                    };
                }
                return {
                    error: error instanceof Error ? error.message : `CLI ${operation} failed`,
                    source: 'cli',
                    mcpUsed: false
                };
            }
        }
        else {
            const result = await apiOperation();
            return {
                ...result,
                source: 'api',
                mcpUsed: false
            };
        }
    }
    // Enhanced API Methods
    /**
     * Health check with intelligent routing
     */
    async healthCheck() {
        return this.executeOperation('health check', () => this.cliIntegration.healthCheckViaCLI(), () => this.directClient.healthCheck());
    }
    /**
     * Create memory with CLI/API routing
     */
    async createMemory(memory) {
        return this.executeOperation('create memory', () => this.cliIntegration.createMemoryViaCLI(memory.title, memory.content, {
            memoryType: memory.memory_type,
            tags: memory.tags,
            topicId: memory.topic_id
        }), () => this.directClient.createMemory(memory));
    }
    /**
     * List memories with intelligent routing
     */
    async listMemories(options = {}) {
        return this.executeOperation('list memories', () => this.cliIntegration.listMemoriesViaCLI({
            limit: options.limit,
            memoryType: options.memory_type,
            tags: options.tags,
            sortBy: options.sort
        }), () => this.directClient.listMemories(options));
    }
    /**
     * Search memories with MCP enhancement when available
     */
    async searchMemories(request) {
        return this.executeOperation('search memories', () => this.cliIntegration.searchMemoriesViaCLI(request.query, {
            limit: request.limit,
            memoryTypes: request.memory_types
        }), () => this.directClient.searchMemories(request));
    }
    /**
     * Get memory by ID (API only for now)
     */
    async getMemory(id) {
        // CLI doesn't have get by ID yet, use API
        const result = await this.directClient.getMemory(id);
        return {
            ...result,
            source: 'api',
            mcpUsed: false
        };
    }
    /**
     * Update memory (API only for now)
     */
    async updateMemory(id, updates) {
        // CLI doesn't have update yet, use API
        const result = await this.directClient.updateMemory(id, updates);
        return {
            ...result,
            source: 'api',
            mcpUsed: false
        };
    }
    /**
     * Delete memory (API only for now)
     */
    async deleteMemory(id) {
        // CLI doesn't have delete yet, use API
        const result = await this.directClient.deleteMemory(id);
        return {
            ...result,
            source: 'api',
            mcpUsed: false
        };
    }
    // Topic Operations (API only for now)
    async createTopic(topic) {
        const result = await this.directClient.createTopic(topic);
        return { ...result, source: 'api', mcpUsed: false };
    }
    async getTopics() {
        const result = await this.directClient.getTopics();
        return { ...result, source: 'api', mcpUsed: false };
    }
    async getTopic(id) {
        const result = await this.directClient.getTopic(id);
        return { ...result, source: 'api', mcpUsed: false };
    }
    async updateTopic(id, updates) {
        const result = await this.directClient.updateTopic(id, updates);
        return { ...result, source: 'api', mcpUsed: false };
    }
    async deleteTopic(id) {
        const result = await this.directClient.deleteTopic(id);
        return { ...result, source: 'api', mcpUsed: false };
    }
    /**
     * Get memory statistics
     */
    async getMemoryStats() {
        const result = await this.directClient.getMemoryStats();
        return { ...result, source: 'api', mcpUsed: false };
    }
    // Utility Methods
    /**
     * Force CLI re-detection
     */
    async refreshCLIDetection() {
        this.capabilities = null;
        await this.cliIntegration.refresh();
        await this.initialize();
    }
    /**
     * Get authentication status from CLI
     */
    async getAuthStatus() {
        try {
            const result = await this.cliIntegration.getAuthStatus();
            return { ...result, source: 'cli', mcpUsed: false };
        }
        catch (error) {
            return {
                error: error instanceof Error ? error.message : 'Auth status check failed',
                source: 'cli',
                mcpUsed: false
            };
        }
    }
    /**
     * Get MCP status when available
     */
    async getMCPStatus() {
        const capabilities = await this.getCapabilities();
        if (!capabilities.mcpSupport) {
            return {
                error: 'MCP not available',
                source: 'cli',
                mcpUsed: false
            };
        }
        try {
            const result = await this.cliIntegration.getMCPStatus();
            return { ...result, source: 'cli', mcpUsed: true };
        }
        catch (error) {
            return {
                error: error instanceof Error ? error.message : 'MCP status check failed',
                source: 'cli',
                mcpUsed: false
            };
        }
    }
    /**
     * Update authentication for both CLI and API client
     */
    setAuthToken(token) {
        this.directClient.setAuthToken(token);
    }
    setApiKey(apiKey) {
        this.directClient.setApiKey(apiKey);
    }
    clearAuth() {
        this.directClient.clearAuth();
    }
    /**
     * Update configuration
     */
    updateConfig(updates) {
        this.config = { ...this.config, ...updates };
        this.directClient.updateConfig(updates);
    }
    /**
     * Get configuration summary
     */
    getConfigSummary() {
        return {
            apiUrl: this.config.apiUrl,
            preferCLI: this.config.preferCLI,
            enableMCP: this.config.enableMCP,
            capabilities: this.capabilities || undefined
        };
    }
}
/**
 * Factory function to create an enhanced memory client
 */
async function createEnhancedMemoryClient(config) {
    const client = new EnhancedMemoryClient(config);
    await client.initialize();
    return client;
}

/**
 * Configuration utilities for Memory Client SDK
 * Provides smart defaults and environment detection for CLI/MCP integration
 */
/**
 * Environment detection utilities
 */
const Environment = {
    isNode: typeof globalThis !== 'undefined' && 'process' in globalThis && globalThis.process?.versions?.node,
    isBrowser: typeof window !== 'undefined',
    isVSCode: typeof globalThis !== 'undefined' && 'vscode' in globalThis,
    isCursor: typeof globalThis !== 'undefined' && 'cursor' in globalThis,
    isWindsurf: typeof globalThis !== 'undefined' && 'windsurf' in globalThis,
    get isIDE() {
        return this.isVSCode || this.isCursor || this.isWindsurf;
    },
    get supportsCLI() {
        return Boolean(this.isNode && !this.isBrowser);
    }
};
/**
 * Create smart configuration with environment-aware defaults
 */
function createSmartConfig(baseConfig, options = {}) {
    const defaults = {
        preferCLI: Environment.supportsCLI,
        minCLIVersion: '1.5.2',
        enableMCP: true,
        cliDetectionTimeout: 3000,
        verbose: false
    };
    const config = { ...defaults, ...options };
    return {
        ...baseConfig,
        preferCLI: config.preferCLI,
        minCLIVersion: config.minCLIVersion,
        enableMCP: config.enableMCP,
        cliDetectionTimeout: config.cliDetectionTimeout,
        verbose: config.verbose,
        // Smart API configuration with environment detection
        apiUrl: baseConfig.apiUrl || (process?.env?.NODE_ENV === 'development'
            ? 'http://localhost:3001'
            : 'https://api.LanOnasis.com'),
        // Default timeout based on environment
        timeout: baseConfig.timeout || (Environment.isIDE ? 10000 : 15000)
    };
}
/**
 * Preset configurations for common scenarios
 */
const ConfigPresets = {
    /**
     * Development configuration with local API and CLI preference
     */
    development: (apiKey) => createSmartConfig({
        apiUrl: 'http://localhost:3001',
        apiKey,
        timeout: 30000
    }, {
        preferCLI: true,
        verbose: true
    }),
    /**
     * Production configuration optimized for performance
     */
    production: (apiKey) => createSmartConfig({
        apiUrl: 'https://api.LanOnasis.com',
        apiKey,
        timeout: 15000
    }, {
        preferCLI: Environment.supportsCLI,
        verbose: false
    }),
    /**
     * IDE extension configuration with MCP prioritization
     */
    ideExtension: (apiKey) => createSmartConfig({
        apiUrl: 'https://api.LanOnasis.com',
        apiKey,
        timeout: 10000
    }, {
        preferCLI: true,
        enableMCP: true,
        cliDetectionTimeout: 2000
    }),
    /**
     * Browser-only configuration (no CLI support)
     */
    browserOnly: (apiKey) => createSmartConfig({
        apiUrl: 'https://api.LanOnasis.com',
        apiKey,
        timeout: 15000
    }, {
        preferCLI: false,
        enableMCP: false
    }),
    /**
     * CLI-first configuration for server environments
     */
    serverCLI: (apiKey) => createSmartConfig({
        apiUrl: 'https://api.LanOnasis.com',
        apiKey,
        timeout: 20000
    }, {
        preferCLI: true,
        enableMCP: true,
        verbose: false
    })
};
/**
 * Migration helper for existing MemoryClient users
 */
function migrateToEnhanced(existingConfig, enhancementOptions = {}) {
    return createSmartConfig(existingConfig, {
        preferCLI: Environment.supportsCLI,
        ...enhancementOptions
    });
}

/**
 * Memory types supported by the service
 */
const MEMORY_TYPES = ['context', 'project', 'knowledge', 'reference', 'personal', 'workflow'];
/**
 * Memory status values
 */
const MEMORY_STATUSES = ['active', 'archived', 'draft', 'deleted'];
/**
 * Validation schemas using Zod
 */
const createMemorySchema = z.object({
    title: z.string().min(1).max(500),
    content: z.string().min(1).max(50000),
    summary: z.string().max(1000).optional(),
    memory_type: z.enum(MEMORY_TYPES).default('context'),
    topic_id: z.string().uuid().optional(),
    project_ref: z.string().max(100).optional(),
    tags: z.array(z.string().min(1).max(50)).max(20).default([]),
    metadata: z.record(z.unknown()).optional()
});
const updateMemorySchema = z.object({
    title: z.string().min(1).max(500).optional(),
    content: z.string().min(1).max(50000).optional(),
    summary: z.string().max(1000).optional(),
    memory_type: z.enum(MEMORY_TYPES).optional(),
    status: z.enum(MEMORY_STATUSES).optional(),
    topic_id: z.string().uuid().nullable().optional(),
    project_ref: z.string().max(100).nullable().optional(),
    tags: z.array(z.string().min(1).max(50)).max(20).optional(),
    metadata: z.record(z.unknown()).optional()
});
const searchMemorySchema = z.object({
    query: z.string().min(1).max(1000),
    memory_types: z.array(z.enum(MEMORY_TYPES)).optional(),
    tags: z.array(z.string()).optional(),
    topic_id: z.string().uuid().optional(),
    project_ref: z.string().optional(),
    status: z.enum(MEMORY_STATUSES).default('active'),
    limit: z.number().int().min(1).max(100).default(20),
    threshold: z.number().min(0).max(1).default(0.7)
});
const createTopicSchema = z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    icon: z.string().max(50).optional(),
    parent_topic_id: z.string().uuid().optional()
});

/**
 * @LanOnasis/memory-client
 *
 * Memory as a Service (MaaS) Client SDK for LanOnasis
 * Intelligent memory management with semantic search capabilities
 */
// Main client
// Constants
const VERSION = '1.3.0';
const CLIENT_NAME = '@LanOnasis/memory-client';
// Environment detection
const isBrowser = typeof window !== 'undefined';
const isNode = typeof globalThis !== 'undefined' && 'process' in globalThis && globalThis.process?.versions?.node;
// Default configurations for different environments
const defaultConfigs = {
    development: {
        apiUrl: 'http://localhost:3001',
        timeout: 30000,
        useGateway: false
    },
    production: {
        apiUrl: 'https://api.LanOnasis.com',
        timeout: 15000,
        useGateway: true
    },
    gateway: {
        apiUrl: 'https://api.LanOnasis.com',
        timeout: 10000,
        useGateway: true
    }
};
// Utility functions will be added in a future version to avoid circular imports

export { CLIENT_NAME, CLIIntegration, ConfigPresets, EnhancedMemoryClient, Environment, MEMORY_STATUSES, MEMORY_TYPES, MemoryClient, VERSION, createEnhancedMemoryClient, createMemoryClient, createMemorySchema, createSmartConfig, createTopicSchema, defaultConfigs, isBrowser, isNode, migrateToEnhanced, searchMemorySchema, updateMemorySchema };
//# sourceMappingURL=index.esm.js.map

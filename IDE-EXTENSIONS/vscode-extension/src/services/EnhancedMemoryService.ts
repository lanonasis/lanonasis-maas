import * as vscode from 'vscode';
import type {
  CoreMemoryClient as CoreMemoryClientType,
  CoreMemoryClientConfig,
  PaginatedResponse,
  CreateMemoryRequest as SDKCreateMemoryRequest,
  UpdateMemoryRequest as SDKUpdateMemoryRequest,
  SearchMemoryRequest as SDKSearchMemoryRequest,
  MemoryEntry as SDKMemoryEntry,
  MemorySearchResult as SDKMemorySearchResult,
  UserMemoryStats as SDKUserMemoryStats,
  ApiResponse
} from '@lanonasis/memory-client';
import { SecureApiKeyService, StoredCredential } from './SecureApiKeyService';
import { CreateMemoryRequest, SearchMemoryRequest, MemoryEntry, MemorySearchResult, MemoryType, UserMemoryStats } from '../types/memory-aligned';
import { IEnhancedMemoryService, MemoryServiceCapabilities } from './IMemoryService';

// Type aliases for backwards compatibility with legacy code
type EnhancedMemoryClientType = CoreMemoryClientType;
type EnhancedMemoryClientConfig = CoreMemoryClientConfig;

// Stub for missing OperationResult - use ApiResponse pattern
interface OperationResult<T> extends ApiResponse<T> {
  source?: 'cli' | 'api';
  mcpUsed?: boolean;
}

// Stub for missing CLICapabilities
interface CLICapabilities {
  cliAvailable: boolean;
  mcpSupport: boolean;
  authenticated: boolean;
  goldenContract: boolean;
}

type MemoryClientModule = typeof import('@lanonasis/memory-client');
type SDKMemoryType = SDKCreateMemoryRequest['memory_type'];

let cachedMemoryClientModule: MemoryClientModule | undefined;
let attemptedMemoryClientLoad = false;
let verboseLoggingWarningShown = false;

function getMemoryClientModule(): MemoryClientModule | undefined {
  if (!attemptedMemoryClientLoad) {
    attemptedMemoryClientLoad = true;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      cachedMemoryClientModule = require('@lanonasis/memory-client') as MemoryClientModule;
    } catch (error) {
      console.warn('[EnhancedMemoryService] @lanonasis/memory-client not available. Falling back to basic service.', error);
      cachedMemoryClientModule = undefined;
    }
  }

  return cachedMemoryClientModule;
}

export class EnhancedMemoryService implements IEnhancedMemoryService {
  private client: EnhancedMemoryClientType | null = null;
  private config: vscode.WorkspaceConfiguration;
  private statusBarItem: vscode.StatusBarItem;
  private cliCapabilities: CLICapabilities | null = null;
  private showPerformanceFeedback: boolean;
  private secureApiKeyService: SecureApiKeyService;
  private readonly sdk: MemoryClientModule;

  constructor(secureApiKeyService: SecureApiKeyService) {
    const sdkModule = getMemoryClientModule();

    if (!sdkModule) {
      throw new Error('@lanonasis/memory-client module not available');
    }

    this.sdk = sdkModule;
    this.secureApiKeyService = secureApiKeyService;
    this.config = vscode.workspace.getConfiguration('lanonasis');
    this.showPerformanceFeedback = this.config.get<boolean>('showPerformanceFeedback', false);

    // Create status bar item to show CLI/MCP status
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.statusBarItem.command = 'lanonasis.showConnectionInfo';

    this.initializeClient();
  }

  private async initializeClient(): Promise<void> {
    const { CoreMemoryClient } = this.sdk;
    const credential = await this.secureApiKeyService.getStoredCredentials();

    if (!credential) {
      this.client = null;
      this.updateStatusBar(false, 'No API Key');
      return;
    }

    try {
      // Use IDE extension preset for optimized configuration
      const clientConfig = this.buildClientConfigFromCredential(credential);

      // Override with VSCode-specific settings
      const apiUrl = this.config.get<string>('apiUrl', 'https://api.lanonasis.com');
      const useGateway = this.config.get<boolean>('useGateway', true);

      clientConfig.apiUrl = useGateway ?
        this.config.get<string>('gatewayUrl', 'https://api.lanonasis.com') :
        apiUrl;

      // Note: CLI detection is no longer supported in CoreMemoryClient
      // The client uses HTTP API directly
      const verbose = this.config.get<boolean>('verboseLogging', false);

      // Performance warning: verbose logging in production (show only once per session)
      if (verbose && process.env.NODE_ENV === 'production' && !verboseLoggingWarningShown) {
        verboseLoggingWarningShown = true;
        // Log to output channel instead of popup to avoid interrupting workflow
        console.info(
          '[EnhancedMemoryService] Note: Verbose logging is enabled. Disable via Settings > Lanonasis > Verbose Logging for production use.'
        );
      }

      this.client = new CoreMemoryClient(clientConfig);

      // Detect capabilities (CoreMemoryClient is ready immediately, no initialize needed)
      this.cliCapabilities = await this.detectCapabilities();

      this.updateStatusBar(true, this.getConnectionStatus());

    } catch (error) {
      console.warn('Enhanced Memory Service initialization failed:', error);
      this.client = null;
      this.updateStatusBar(false, 'Initialization Failed');
      throw error;
    }
  }

  private async detectCapabilities(): Promise<CLICapabilities> {
    if (!this.client) {
      return {
        cliAvailable: false,
        mcpSupport: false,
        authenticated: false,
        goldenContract: false
      };
    }

    try {
      // Test API connection with a health check
      const healthResult = await this.client.healthCheck();

      // CoreMemoryClient uses pure HTTP API (no CLI detection)
      // CLI capabilities are now determined externally
      return {
        cliAvailable: false, // CoreMemoryClient doesn't use CLI
        mcpSupport: false,   // CoreMemoryClient uses HTTP, not MCP
        authenticated: healthResult.error === undefined,
        goldenContract: false // CLI feature not available in CoreMemoryClient
      };
    } catch {
      return {
        cliAvailable: false,
        mcpSupport: false,
        authenticated: false,
        goldenContract: false
      };
    }
  }

  private getConnectionStatus(): string {
    if (!this.cliCapabilities) return 'Unknown';

    if (this.cliCapabilities.cliAvailable) {
      const parts = ['CLI'];
      if (this.cliCapabilities.mcpSupport) parts.push('MCP');
      if (this.cliCapabilities.goldenContract) parts.push('Golden');
      return parts.join('+');
    }

    return 'API';
  }

  private updateStatusBar(connected: boolean, status: string): void {
    if (connected) {
      this.statusBarItem.text = `$(database) ${status}`;
      this.statusBarItem.backgroundColor = undefined;
      this.statusBarItem.tooltip = `Lanonasis Memory: Connected via ${status}`;
    } else {
      this.statusBarItem.text = `$(alert) ${status}`;
      this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
      this.statusBarItem.tooltip = `Lanonasis Memory: ${status}`;
    }
    this.statusBarItem.show();
  }

  public async refreshClient(): Promise<void> {
    this.config = vscode.workspace.getConfiguration('lanonasis');
    await this.initializeClient();
  }

  public async refreshConfig(): Promise<void> {
    await this.refreshClient();
  }

  public isAuthenticated(): boolean {
    return this.client !== null;
  }

  public getCapabilities(): MemoryServiceCapabilities | null {
    return this.cliCapabilities;
  }

  public async testConnection(apiKey?: string): Promise<void> {
    const { CoreMemoryClient } = this.sdk;
    let testClient = this.client;

    if (apiKey) {
      const config = this.buildClientConfigFromCredential({ type: 'apiKey', token: apiKey });
      testClient = new CoreMemoryClient(config);
    }

    if (!testClient) {
      const credential = await this.secureApiKeyService.getStoredCredentials();
      if (!credential) {
        throw new Error('No API key configured');
      }

      const config = this.buildClientConfigFromCredential(credential);
      testClient = new CoreMemoryClient(config);
    }

    // Test with enhanced client - this will try CLI first, then fallback to API
    const testRequest = this.toSDKSearchRequest({
      query: 'connection test',
      limit: 1,
      status: 'active',
      threshold: 0.1
    } satisfies SearchMemoryRequest);

    const result = await testClient.searchMemories(testRequest);

    if (result.error) {
      throw new Error(result.error);
    }

    // Update capabilities after successful test
    if (!apiKey) {
      this.cliCapabilities = await this.detectCapabilities();
      this.updateStatusBar(true, this.getConnectionStatus());
    }
  }

  public async createMemory(memory: CreateMemoryRequest): Promise<MemoryEntry> {
    if (!this.client) {
      throw new Error('Not authenticated. Please configure your API key.');
    }

    const sdkMemory = this.toSDKCreateRequest(memory);
    const result = await this.client.createMemory(sdkMemory);

    if (result.error || !result.data) {
      throw new Error(result.error || 'Failed to create memory');
    }

    this.showOperationFeedback('create', result);
    return this.convertSDKMemoryEntry(result.data);
  }

  public async updateMemory(id: string, memory: Partial<CreateMemoryRequest>): Promise<MemoryEntry> {
    if (!this.client) {
      throw new Error('Not authenticated. Please configure your API key.');
    }

    const sdkMemory = this.toSDKUpdateRequest(memory);
    const result = await this.client.updateMemory(id, sdkMemory);

    if (result.error || !result.data) {
      throw new Error(result.error || 'Failed to update memory');
    }

    this.showOperationFeedback('update', result);
    return this.convertSDKMemoryEntry(result.data);
  }

  public async searchMemories(
    query: string,
    options: Partial<SearchMemoryRequest> = {}
  ): Promise<MemorySearchResult[]> {
    if (!this.client) {
      throw new Error('Not authenticated. Please configure your API key.');
    }

    const searchRequest: SearchMemoryRequest = {
      query,
      limit: 20,
      threshold: 0.7,
      status: 'active',
      ...options
    };

    const sdkSearchRequest = this.toSDKSearchRequest(searchRequest);

    const result = await this.client.searchMemories(sdkSearchRequest);

    if (result.error || !result.data) {
      throw new Error(result.error || 'Search failed');
    }

    // Show search performance info in verbose mode
    if (this.config.get<boolean>('verboseLogging', false)) {
      this.showOperationFeedback('search', result);
    }

    return this.convertSDKSearchResults(result.data.results);
  }

  public async getMemory(id: string): Promise<MemoryEntry> {
    if (!this.client) {
      throw new Error('Not authenticated. Please configure your API key.');
    }

    const result = await this.client.getMemory(id);

    if (result.error || !result.data) {
      throw new Error(result.error || 'Memory not found');
    }

    return this.convertSDKMemoryEntry(result.data);
  }

  public async listMemories(limit: number = 50): Promise<MemoryEntry[]> {
    if (!this.client) {
      throw new Error('Not authenticated. Please configure your API key.');
    }

    // Type validation for limit parameter
    if (typeof limit !== 'number' || limit < 0) {
      throw new Error('limit must be a non-negative number');
    }

    // Ensure limit is within reasonable bounds
    const validatedLimit = Math.min(Math.max(1, Math.floor(limit)), 1000);

    const result: OperationResult<PaginatedResponse<SDKMemoryEntry>> = await this.client.listMemories({
      limit: validatedLimit,
      sort: 'updated_at',
      order: 'desc'
    });

    if (result.error || !result.data) {
      throw new Error(result.error || 'Failed to fetch memories');
    }

    return result.data.data.map(entry => this.convertSDKMemoryEntry(entry));
  }

  public async deleteMemory(id: string): Promise<void> {
    if (!this.client) {
      throw new Error('Not authenticated. Please configure your API key.');
    }

    const result = await this.client.deleteMemory(id);

    if (result.error) {
      throw new Error(result.error);
    }

    this.showOperationFeedback('delete', result);
  }

  public async getMemoryStats(): Promise<UserMemoryStats> {
    if (!this.client) {
      throw new Error('Not authenticated. Please configure your API key.');
    }

    const result = await this.client.getMemoryStats();

    if (result.error || !result.data) {
      throw new Error(result.error || 'Failed to fetch stats');
    }

    return this.convertSDKUserMemoryStats(result.data);
  }

  private showOperationFeedback(operation: string, result: OperationResult<unknown>): void {
    if (!this.showPerformanceFeedback) return;

    const source = result.source === 'cli' ?
      (result.mcpUsed ? 'CLI+MCP' : 'CLI') :
      'API';

    const message = `${operation} completed via ${source}`;

    // Show brief status message
    vscode.window.setStatusBarMessage(
      `$(check) ${message}`,
      2000
    );
  }

  public async showConnectionInfo(): Promise<void> {
    const caps = this.cliCapabilities;
    if (!caps) {
      vscode.window.showInformationMessage('Connection status: Unknown');
      return;
    }

    const details = [
      `CLI Available: ${caps.cliAvailable ? '✅' : '❌'}`,
      `MCP Support: ${caps.mcpSupport ? '✅' : '❌'}`,
      `Authenticated: ${caps.authenticated ? '✅' : '❌'}`,
      `Golden Contract: ${caps.goldenContract ? '✅' : '❌'}`
    ];

    const message = `Lanonasis Memory Connection Status:\n\n${details.join('\n')}`;

    if (caps.cliAvailable && caps.goldenContract) {
      vscode.window.showInformationMessage(
        `${message}\n\nEnhanced performance with CLI v1.5.2+ integration!`
      );
    } else if (caps.authenticated) {
      vscode.window.showInformationMessage(
        `${message}\n\nInstall @lanonasis/cli v1.5.2+ for enhanced performance.`
      );
    } else {
      vscode.window.showWarningMessage(message);
    }
  }

  private toSDKCreateRequest(memory: CreateMemoryRequest): SDKCreateMemoryRequest {
    const { memory_type, ...rest } = memory;
    return {
      ...rest,
      memory_type: this.mapMemoryType(memory_type)
    };
  }

  private toSDKUpdateRequest(memory: Partial<CreateMemoryRequest>): SDKUpdateMemoryRequest {
    const { memory_type, ...rest } = memory;
    const result: SDKUpdateMemoryRequest = { ...rest };
    if (memory_type !== undefined) {
      result.memory_type = this.mapMemoryType(memory_type);
    }
    return result;
  }

  private toSDKSearchRequest(request: SearchMemoryRequest): SDKSearchMemoryRequest {
    const { memory_types, ...rest } = request;
    const sdkTypes = memory_types?.map(type => this.mapMemoryType(type));
    const sdkRequest: SDKSearchMemoryRequest = {
      ...rest,
      ...(sdkTypes ? { memory_types: sdkTypes } : {})
    };
    return sdkRequest;
  }

  private mapMemoryType(vscodeType: MemoryType): SDKMemoryType {
    const typeMap: Record<MemoryType, SDKMemoryType> = {
      conversation: 'context',
      knowledge: 'knowledge',
      project: 'project',
      context: 'context',
      reference: 'reference',
      personal: 'personal',
      workflow: 'workflow'
    };

    return typeMap[vscodeType] ?? 'context';
  }

  private mapMemoryTypeFromSDK(sdkType: string): MemoryType {
    const typeMap: Record<string, MemoryType> = {
      context: 'context',
      project: 'project',
      knowledge: 'knowledge',
      reference: 'reference',
      personal: 'personal',
      workflow: 'workflow',
      conversation: 'conversation'
    };

    return typeMap[sdkType] ?? 'context';
  }

  private convertSDKMemoryEntry(sdkEntry: SDKMemoryEntry): MemoryEntry {
    return {
      ...sdkEntry,
      memory_type: this.mapMemoryTypeFromSDK(sdkEntry.memory_type)
    };
  }

  private buildClientConfigFromCredential(credential: StoredCredential): EnhancedMemoryClientConfig & { userId?: string; organizationId?: string } {
    // Build config manually (ConfigPresets no longer available in CoreMemoryClient)
    const vscodeConfig = vscode.workspace.getConfiguration('lanonasis');
    const apiUrl = vscodeConfig.get<string>('apiUrl', 'https://api.lanonasis.com');

    const config: EnhancedMemoryClientConfig & { userId?: string; organizationId?: string } = {
      apiUrl,
      apiKey: credential.type === 'apiKey' ? credential.token : undefined,
      timeout: 30000,
      retry: {
        maxRetries: 3,
        retryDelay: 1000,
        backoff: 'exponential'
      },
      headers: {
        'X-Client-Type': 'vscode-extension',
        'X-Client-Version': '2.0.5',
        'X-Project-Scope': 'lanonasis-maas'  // Required by backend auth middleware
      }
    };

    if (credential.type === 'oauth') {
      config.apiKey = undefined;
      config.authToken = credential.token;
      
      // Try to extract user_id from JWT for fallback organization context
      try {
        const parts = credential.token.split('.');
        if (parts.length >= 2) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
          // Set userId as fallback for organization - individual users don't need org_id
          if (payload.sub || payload.user_id) {
            config.userId = payload.sub || payload.user_id;
          }
        }
      } catch {
        // JWT decode failed, not critical - server will handle it
      }
    }

    // Include organization ID from VS Code configuration via custom headers (optional for teams)
    const organizationId = vscodeConfig.get<string>('organizationId');
    if (organizationId) {
      config.headers = {
        ...config.headers,
        'X-Organization-ID': organizationId
      };
      config.organizationId = organizationId;
    }

    return config;
  }

  private convertSDKSearchResults(sdkResults: SDKMemorySearchResult[]): MemorySearchResult[] {
    return sdkResults.map(result => ({
      ...result,
      memory_type: this.mapMemoryTypeFromSDK(result.memory_type)
    }));
  }

  private convertSDKUserMemoryStats(stats: SDKUserMemoryStats): UserMemoryStats {
    const initial: Record<MemoryType, number> = {
      conversation: 0,
      knowledge: 0,
      project: 0,
      context: 0,
      reference: 0,
      personal: 0,
      workflow: 0
    };

    const memoriesByType = { ...initial };
    for (const [key, value] of Object.entries(stats.memories_by_type)) {
      const mappedKey = this.mapMemoryTypeFromSDK(key);
      memoriesByType[mappedKey] = value;
    }

    return {
      ...stats,
      memories_by_type: memoriesByType
    };
  }

  public dispose(): void {
    this.statusBarItem.dispose();
  }

  // Migration helper for existing MemoryService users
  public static async migrateFromBasicService(secureApiKeyService: SecureApiKeyService): Promise<EnhancedMemoryService> {
    const enhanced = new EnhancedMemoryService(secureApiKeyService);

    // Show migration message
    vscode.window.showInformationMessage(
      '🚀 Upgraded to Enhanced Memory Service with CLI integration!',
      'Learn More'
    ).then(selection => {
      if (selection === 'Learn More') {
        vscode.env.openExternal(vscode.Uri.parse('https://docs.lanonasis.com/cli/integration'));
      }
    });

    return enhanced;
  }
}

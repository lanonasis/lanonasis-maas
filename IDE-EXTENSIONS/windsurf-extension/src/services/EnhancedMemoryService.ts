import * as vscode from 'vscode';
import { AuthenticationService } from '../auth/AuthenticationService';
import { 
  EnhancedMemoryClient, 
  createEnhancedMemoryClient,
  ConfigPresets,
  Environment,
  type EnhancedMemoryClientConfig,
  type OperationResult,
  type CLICapabilities
} from '@lanonasis/memory-client';
import { 
    MemoryEntry, 
    CreateMemoryRequest, 
    UpdateMemoryRequest, 
    SearchMemoryRequest,
    MemorySearchResult,
    MemoryStats,
    MemoryType
} from '../types/memory';

export class EnhancedMemoryService {
  private authService: AuthenticationService;
  private baseUrl: string = '';
  private client: EnhancedMemoryClient | null = null;
  private statusBarItem: vscode.StatusBarItem;
  private cliCapabilities: CLICapabilities | null = null;

  constructor(authService: AuthenticationService) {
    this.authService = authService;
    
    // Create status bar item to show CLI/MCP status for Cursor
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right, 
      100
    );
    this.statusBarItem.command = 'lanonasis.showConnectionInfo';
    
    this.updateConfiguration();
    this.initializeEnhancedClient();
  }

  updateConfiguration(): void {
    const config = vscode.workspace.getConfiguration('lanonasis');
    const apiUrl = config.get<string>('apiUrl', 'https://mcp.lanonasis.com');
    const useGateway = config.get<boolean>('useGateway', true);
    
    this.baseUrl = useGateway ? 
      config.get<string>('gatewayUrl', apiUrl) : 
      apiUrl;
  }

  private async initializeEnhancedClient(): Promise<void> {
    try {
      // Get authentication from Cursor's OAuth service
      const authHeader = await this.authService.getAuthenticationHeader();
      
      if (!authHeader) {
        this.client = null;
        this.updateStatusBar(false, 'Not Authenticated');
        return;
      }

      // Extract token from Bearer header
      const token = authHeader.replace('Bearer ', '');
      
      // Use Cursor-optimized configuration
      const clientConfig: EnhancedMemoryClientConfig = {
        ...ConfigPresets.ideExtension(token),
        apiUrl: this.baseUrl,
        
        // Cursor-specific optimizations
        preferCLI: Environment.supportsCLI && vscode.workspace.getConfiguration('lanonasis').get<boolean>('preferCLI', true),
        enableMCP: vscode.workspace.getConfiguration('lanonasis').get<boolean>('enableMCP', true),
        cliDetectionTimeout: vscode.workspace.getConfiguration('lanonasis').get<number>('cliDetectionTimeout', 2000),
        verbose: vscode.workspace.getConfiguration('lanonasis').get<boolean>('verboseLogging', false),
        
        // OAuth token for API fallback
        authToken: token
      };

      this.client = new EnhancedMemoryClient(clientConfig);
      
      // Initialize and detect CLI capabilities
      await this.client.initialize();
      this.cliCapabilities = await this.detectCapabilities();
      
      this.updateStatusBar(true, this.getConnectionStatus());
      
    } catch (error) {
      console.warn('Enhanced Memory Service initialization failed:', error);
      this.client = null;
      this.updateStatusBar(false, 'Initialization Failed');
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
      // Test if CLI integration is working with Cursor OAuth
      const testResult = await this.client.searchMemories({
        query: 'test connection cursor',
        limit: 1,
        status: 'active',
        threshold: 0.1
      } as any);

      return {
        cliAvailable: testResult.source === 'cli',
        mcpSupport: testResult.mcpUsed || false,
        authenticated: testResult.error === undefined,
        goldenContract: testResult.source === 'cli' // CLI available implies Golden Contract v1.5.2+
      };
    } catch (error) {
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
      if (this.cliCapabilities.goldenContract) parts.push('OAuth');
      return parts.join('+');
    }
    
    return 'OAuth+API';
  }

  private updateStatusBar(connected: boolean, status: string): void {
    if (connected) {
      this.statusBarItem.text = `$(database) ${status}`;
      this.statusBarItem.backgroundColor = undefined;
      this.statusBarItem.tooltip = `Lanonasis Memory (Cursor): Connected via ${status}`;
    } else {
      this.statusBarItem.text = `$(alert) ${status}`;
      this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
      this.statusBarItem.tooltip = `Lanonasis Memory (Cursor): ${status}`;
    }
    this.statusBarItem.show();
  }

  public isAuthenticated(): boolean {
    return this.client !== null;
  }

  public getCapabilities(): CLICapabilities | null {
    return this.cliCapabilities;
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
      `OAuth Authenticated: ${caps.authenticated ? '✅' : '❌'}`,
      `Golden Contract: ${caps.goldenContract ? '✅' : '❌'}`
    ];

    const message = `Lanonasis Memory (Cursor) Status:\n\n${details.join('\n')}`;
    
    if (caps.cliAvailable && caps.goldenContract) {
      vscode.window.showInformationMessage(
        `${message}\n\n🚀 Enhanced performance with CLI v3.0.6+ + OAuth integration!`
      );
    } else if (caps.authenticated) {
      vscode.window.showInformationMessage(
        `${message}\n\n💡 Install @lanonasis/cli v3.0.6+ for enhanced performance.`
      );
    } else {
      vscode.window.showWarningMessage(message);
    }
  }

  // Enhanced methods using CLI when available, fallback to OAuth API
  async createMemory(request: CreateMemoryRequest): Promise<MemoryEntry> {
    if (this.client && this.cliCapabilities?.cliAvailable) {
      // Use enhanced client with CLI
      const mappedRequest = {
        ...request,
        memory_type: this.mapMemoryType(request.memory_type || 'context')
      };
      
      const result = await this.client.createMemory(mappedRequest as any);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      this.showOperationFeedback('create', result);
      return this.convertSDKMemoryEntry(result.data);
    }
    
    // Fallback to direct OAuth API
    return this.createMemoryViaAPI(request);
  }

  async updateMemory(id: string, request: UpdateMemoryRequest): Promise<MemoryEntry> {
    if (this.client && this.cliCapabilities?.cliAvailable) {
      const mappedRequest = {
        ...request,
        memory_type: request.memory_type ? this.mapMemoryType(request.memory_type) : 'context'
      };
      
      const result = await this.client.updateMemory(id, mappedRequest as any);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      this.showOperationFeedback('update', result);
      return this.convertSDKMemoryEntry(result.data);
    }
    
    // Fallback to direct OAuth API
    return this.updateMemoryViaAPI(id, request);
  }

  async deleteMemory(id: string): Promise<void> {
    if (this.client && this.cliCapabilities?.cliAvailable) {
      const result = await this.client.deleteMemory(id);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      this.showOperationFeedback('delete', result);
      return;
    }
    
    // Fallback to direct OAuth API
    return this.deleteMemoryViaAPI(id);
  }

  async getMemory(id: string): Promise<MemoryEntry> {
    if (this.client && this.cliCapabilities?.cliAvailable) {
      const result = await this.client.getMemory(id);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      return this.convertSDKMemoryEntry(result.data);
    }
    
    // Fallback to direct OAuth API
    return this.getMemoryViaAPI(id);
  }

  async searchMemories(request: SearchMemoryRequest): Promise<MemorySearchResult[]> {
    if (this.client && this.cliCapabilities?.cliAvailable) {
      // Convert Cursor memory types to SDK types for the search
      const sdkSearchRequest = {
        ...request,
        memory_types: request.memory_types?.map(type => this.mapMemoryType(type))
      };
      
      const result = await this.client.searchMemories(sdkSearchRequest as any);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      // Show search performance info in verbose mode
      if (vscode.workspace.getConfiguration('lanonasis').get<boolean>('verboseLogging', false)) {
        this.showOperationFeedback('search', result);
      }
      
      return this.convertSDKSearchResults(result.data!.results);
    }
    
    // Fallback to direct OAuth API
    return this.searchMemoriesViaAPI(request);
  }

  async listMemories(options: {
    page?: number;
    limit?: number;
    memory_type?: string;
    tags?: string[];
    sort?: string;
    order?: string;
  } = {}): Promise<{
    memories: MemoryEntry[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    if (this.client && this.cliCapabilities?.cliAvailable) {
      const result = await this.client.listMemories({
        limit: options.limit || 50,
        sort: options.sort || 'updated_at',
        order: (options.order as 'asc' | 'desc') || 'desc'
      });
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      // Convert to expected format for Cursor
      return {
        memories: result.data!.data.map((entry: any) => this.convertSDKMemoryEntry(entry)),
        pagination: {
          page: options.page || 1,
          limit: options.limit || 50,
          total: result.data!.data.length,
          pages: 1
        }
      };
    }
    
    // Fallback to direct OAuth API
    return this.listMemoriesViaAPI(options);
  }

  async getMemoryStats(): Promise<MemoryStats> {
    if (this.client && this.cliCapabilities?.cliAvailable) {
      const result = await this.client.getMemoryStats();
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      return (result.data || {}) as MemoryStats;
    }
    
    // Fallback to direct OAuth API
    return this.getMemoryStatsViaAPI();
  }

  async testConnection(apiKey?: string): Promise<boolean> {
    if (this.client && this.cliCapabilities?.cliAvailable) {
      try {
        const result = await this.client.searchMemories({
          query: 'connection test cursor',
          limit: 1,
          status: 'active',
          threshold: 0.1
        } as any);
        
        return !result.error;
      } catch (error) {
        return false;
      }
    }
    
    // Fallback to OAuth API test
    return this.testConnectionViaAPI(apiKey);
  }

  // Type mapping helpers
  private mapMemoryType(cursorType: MemoryType): string {
    const typeMap: Record<MemoryType, string> = {
      'context': 'context',
      'project': 'project', 
      'knowledge': 'knowledge',
      'reference': 'reference',
      'personal': 'personal',
      'workflow': 'workflow'
    };
    
    return typeMap[cursorType] || 'context';
  }
  
  private mapMemoryTypeFromSDK(sdkType: string): MemoryType {
    const typeMap: Record<string, MemoryType> = {
      'context': 'context',
      'project': 'project',
      'knowledge': 'knowledge', 
      'reference': 'reference',
      'personal': 'personal',
      'workflow': 'workflow'
    };
    
    return typeMap[sdkType] || 'context';
  }
  
  private convertSDKMemoryEntry(sdkEntry: any): MemoryEntry {
    return {
      ...sdkEntry,
      memory_type: this.mapMemoryTypeFromSDK(sdkEntry.memory_type)
    };
  }
  
  private convertSDKSearchResults(sdkResults: any[]): MemorySearchResult[] {
    return sdkResults.map(result => ({
      ...result,
      memory_type: this.mapMemoryTypeFromSDK(result.memory_type)
    }));
  }

  private showOperationFeedback(operation: string, result: OperationResult<any>): void {
    if (!vscode.workspace.getConfiguration('lanonasis').get<boolean>('showPerformanceFeedback', false)) return;

    const source = result.source === 'cli' ? 
      (result.mcpUsed ? 'CLI+MCP+OAuth' : 'CLI+OAuth') : 
      'OAuth+API';
    
    const message = `${operation} completed via ${source}`;
    
    // Show brief status message
    vscode.window.setStatusBarMessage(
      `$(check) ${message}`,
      2000
    );
  }

  // Fallback methods using direct OAuth API (original Cursor implementation)
  private async createMemoryViaAPI(request: CreateMemoryRequest): Promise<MemoryEntry> {
    const response = await this.makeAuthenticatedRequest('/api/v1/memory', {
      method: 'POST',
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create memory: ${response.status} ${error}`);
    }

    return await response.json() as MemoryEntry;
  }

  private async updateMemoryViaAPI(id: string, request: UpdateMemoryRequest): Promise<MemoryEntry> {
    const response = await this.makeAuthenticatedRequest(`/api/v1/memory/${id}`, {
      method: 'PUT',
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to update memory: ${response.status} ${error}`);
    }

    return await response.json() as MemoryEntry;
  }

  private async deleteMemoryViaAPI(id: string): Promise<void> {
    const response = await this.makeAuthenticatedRequest(`/api/v1/memory/${id}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to delete memory: ${response.status} ${error}`);
    }
  }

  private async getMemoryViaAPI(id: string): Promise<MemoryEntry> {
    const response = await this.makeAuthenticatedRequest(`/api/v1/memory/${id}`);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Memory not found');
      }
      const error = await response.text();
      throw new Error(`Failed to get memory: ${response.status} ${error}`);
    }

    return await response.json() as MemoryEntry;
  }

  private async searchMemoriesViaAPI(request: SearchMemoryRequest): Promise<MemorySearchResult[]> {
    const response = await this.makeAuthenticatedRequest('/api/v1/memory/search', {
      method: 'POST',
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to search memories: ${response.status} ${error}`);
    }

    const data = await response.json() as { results: MemorySearchResult[] };
    return data.results || [];
  }

  private async listMemoriesViaAPI(options: {
    page?: number;
    limit?: number;
    memory_type?: string;
    tags?: string[];
    sort?: string;
    order?: string;
  } = {}): Promise<{
    memories: MemoryEntry[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    const params = new URLSearchParams();
    
    if (options.page) params.set('page', options.page.toString());
    if (options.limit) params.set('limit', options.limit.toString());
    if (options.memory_type) params.set('memory_type', options.memory_type);
    if (options.tags?.length) params.set('tags', options.tags.join(','));
    if (options.sort) params.set('sort', options.sort);
    if (options.order) params.set('order', options.order);

    const url = `/api/v1/memory${params.toString() ? '?' + params.toString() : ''}`;
    const response = await this.makeAuthenticatedRequest(url);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to list memories: ${response.status} ${error}`);
    }

    return await response.json() as { memories: MemoryEntry[]; pagination: { page: number; limit: number; total: number; pages: number } };
  }

  private async getMemoryStatsViaAPI(): Promise<MemoryStats> {
    const response = await this.makeAuthenticatedRequest('/api/v1/memory/admin/stats');

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get memory stats: ${response.status} ${error}`);
    }

    return await response.json() as MemoryStats;
  }

  private async testConnectionViaAPI(apiKey?: string): Promise<boolean> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      } else {
        const authHeader = await this.authService.getAuthenticationHeader();
        if (authHeader) {
          headers['Authorization'] = authHeader;
        }
      }

      const response = await fetch(`${this.baseUrl}/api/v1/health`, {
        method: 'GET',
        headers
      });

      return response.ok;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  private async makeAuthenticatedRequest(endpoint: string, options: RequestInit = {}): Promise<globalThis.Response> {
    const authHeader = await this.authService.getAuthenticationHeader();
    if (!authHeader) {
      throw new Error('Not authenticated. Please login first.');
    }

    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': authHeader,
      'User-Agent': 'Windsurf LanOnasis-Memory/1.4.5',
      ...options.headers
    };

    const response = await fetch(url, {
      ...options,
      headers
    });

    // Handle authentication errors
    if (response.status === 401) {
      // Token might be expired, try to refresh
      if (await this.authService.checkAuthenticationStatus()) {
        // Retry with new token
        const newAuthHeader = await this.authService.getAuthenticationHeader();
        if (newAuthHeader) {
          headers['Authorization'] = newAuthHeader;
          return await fetch(url, { ...options, headers });
        }
      }
      throw new Error('Authentication required. Please login again.');
    }

    return response;
  }

  public async refreshClient(): Promise<void> {
    this.updateConfiguration();
    await this.initializeEnhancedClient();
  }

  public dispose(): void {
    this.statusBarItem.dispose();
  }

  // Migration helper for existing Cursor users
  public static async migrateFromBasicService(authService: AuthenticationService): Promise<EnhancedMemoryService> {
    const enhanced = new EnhancedMemoryService(authService);
    
    // Show migration message specific to Cursor
    vscode.window.showInformationMessage(
      '🚀 Cursor Memory Extension upgraded with CLI integration! OAuth + CLI for maximum performance.',
      'Learn More'
    ).then(selection => {
      if (selection === 'Learn More') {
        vscode.env.openExternal(vscode.Uri.parse('https://docs.lanonasis.com/cli/cursor'));
      }
    });

    return enhanced;
  }
}
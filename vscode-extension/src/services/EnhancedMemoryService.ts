import * as vscode from 'vscode';
import { 
  EnhancedMemoryClient, 
  createEnhancedMemoryClient,
  ConfigPresets,
  Environment,
  type EnhancedMemoryClientConfig,
  type OperationResult,
  type CLICapabilities
} from '@lanonasis/memory-client';
import { CreateMemoryRequest, SearchMemoryRequest, MemoryEntry, MemorySearchResult, MemoryType } from '../types/memory-aligned';
import { IEnhancedMemoryService } from './IMemoryService';

export class EnhancedMemoryService implements IEnhancedMemoryService {
  private client: EnhancedMemoryClient | null = null;
  private config: vscode.WorkspaceConfiguration;
  private statusBarItem: vscode.StatusBarItem;
  private cliCapabilities: CLICapabilities | null = null;

  constructor() {
    this.config = vscode.workspace.getConfiguration('lanonasis');
    
    // Create status bar item to show CLI/MCP status
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right, 
      100
    );
    this.statusBarItem.command = 'lanonasis.showConnectionInfo';
    
    this.initializeClient();
  }

  private async initializeClient(): Promise<void> {
    const apiKey = this.config.get<string>('apiKey');
    
    if (!apiKey || apiKey.trim().length === 0) {
      this.client = null;
      this.updateStatusBar(false, 'No API Key');
      return;
    }

    try {
      // Use IDE extension preset for optimized configuration
      const clientConfig: EnhancedMemoryClientConfig = ConfigPresets.ideExtension(apiKey);
      
      // Override with VSCode-specific settings
      const apiUrl = this.config.get<string>('apiUrl', 'https://api.lanonasis.com');
      const useGateway = this.config.get<boolean>('useGateway', true);
      
      clientConfig.apiUrl = useGateway ? 
        this.config.get<string>('gatewayUrl', 'https://api.lanonasis.com') : 
        apiUrl;

      // Enable CLI detection with shorter timeout for responsive UX
      clientConfig.preferCLI = Environment.supportsCLI;
      clientConfig.cliDetectionTimeout = 2000;
      clientConfig.verbose = this.config.get<boolean>('verboseLogging', false);
      
      // Performance warning: verbose logging in production
      if (clientConfig.verbose && process.env.NODE_ENV === 'production') {
        vscode.window.showWarningMessage(
          'Verbose logging is enabled in production. This may impact performance and expose sensitive information in logs.'
        );
        console.warn(
          '[EnhancedMemoryService] Warning: Verbose logging is enabled in production. This may impact performance and expose sensitive information in logs.'
        );
      }

      this.client = new EnhancedMemoryClient(clientConfig);
      
      // Initialize and detect CLI capabilities
      await this.client.initialize();
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
      // Test if CLI integration is working
      const testResult = await this.client.searchMemories({
        query: 'test connection',
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

  public isAuthenticated(): boolean {
    return this.client !== null;
  }

  public getCapabilities(): CLICapabilities | null {
    return this.cliCapabilities;
  }

  public async testConnection(apiKey?: string): Promise<void> {
    let testClient = this.client;
    
    if (apiKey) {
      const config = ConfigPresets.ideExtension(apiKey);
      testClient = new EnhancedMemoryClient(config);
      await testClient.initialize();
    }

    if (!testClient) {
      throw new Error('No API key configured');
    }

    // Test with enhanced client - this will try CLI first, then fallback to API
    const result = await testClient.searchMemories({
      query: 'connection test',
      limit: 1,
      status: 'active',
      threshold: 0.1
    } as any);

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

    // Map VSCode memory types to SDK memory types
    const mappedMemory = {
      ...memory,
      memory_type: this.mapMemoryType(memory.memory_type)
    };
    
    const result = await this.client.createMemory(mappedMemory as any);
    
    if (result.error || !result.data) {
      throw new Error(result.error || 'Failed to create memory');
    }

    // Show information about which method was used
    this.showOperationFeedback('create', result);

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

    // Convert VSCode memory types to SDK types for the search
    const sdkSearchRequest = {
      ...searchRequest,
      memory_types: searchRequest.memory_types?.map(type => this.mapMemoryType(type))
    };
    
    const result = await this.client.searchMemories(sdkSearchRequest as any);
    
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

    const result = await this.client.listMemories({ 
      limit,
      sort: 'updated_at',
      order: 'desc'
    });
    
    if (result.error || !result.data) {
      throw new Error(result.error || 'Failed to fetch memories');
    }

    return result.data.data.map((entry: any) => this.convertSDKMemoryEntry(entry));
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

  public async getMemoryStats(): Promise<any> {
    if (!this.client) {
      throw new Error('Not authenticated. Please configure your API key.');
    }

    const result = await this.client.getMemoryStats();
    
    if (result.error || !result.data) {
      throw new Error(result.error || 'Failed to fetch stats');
    }

    return result.data;
  }

  private showOperationFeedback(operation: string, result: OperationResult<any>): void {
    if (!this.config.get<boolean>('showPerformanceFeedback', false)) return;

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
        `${message}\n\n🚀 Enhanced performance with CLI v1.5.2+ integration!`
      );
    } else if (caps.authenticated) {
      vscode.window.showInformationMessage(
        `${message}\n\n💡 Install @lanonasis/cli v1.5.2+ for enhanced performance.`
      );
    } else {
      vscode.window.showWarningMessage(message);
    }
  }

  private mapMemoryType(vscodeType: MemoryType): string {
    // Map VSCode extension memory types to SDK memory types
    const typeMap: Record<MemoryType, string> = {
      'context': 'context',
      'project': 'project', 
      'knowledge': 'knowledge',
      'reference': 'reference',
      'conversation': 'context', // Map conversation to context
      'personal': 'personal',
      'workflow': 'workflow'
    } as any;
    
    return typeMap[vscodeType] || 'context';
  }
  
  private mapMemoryTypeFromSDK(sdkType: string): MemoryType {
    // Map SDK memory types back to VSCode extension types
    const typeMap: Record<string, MemoryType> = {
      'context': 'context',
      'project': 'project',
      'knowledge': 'knowledge', 
      'reference': 'reference',
      'personal': 'context', // Map personal back to context for compatibility
      'workflow': 'context'  // Map workflow back to context for compatibility
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

  public dispose(): void {
    this.statusBarItem.dispose();
  }

  // Migration helper for existing MemoryService users
  public static async migrateFromBasicService(): Promise<EnhancedMemoryService> {
    const enhanced = new EnhancedMemoryService();
    
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
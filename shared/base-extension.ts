/**
 * Unified Base Extension for LanOnasis-MAAS
 * Shared across VS Code, Cursor, and Windsurf
 */

import * as vscode from 'vscode';
import { 
  LANONASIS_TOOLS, 
  ToolDefinition,
  getAuthRequiredTools 
} from './tools-config';
import {
  VSCodeSecureStorage,
  ExtensionAuthHandler,
  ConsoleRedactor
} from './secure-storage';

/**
 * Base extension class with all 17 tools implementation
 */
export abstract class LanonasisBaseExtension {
  protected context: vscode.ExtensionContext;
  protected authHandler: ExtensionAuthHandler;
  protected outputChannel: vscode.OutputChannel;
  protected statusBarItem: vscode.StatusBarItem;
  protected treeDataProvider: LanonasisTreeDataProvider;
  
  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    
    // Initialize secure storage
    const secureStorage = new VSCodeSecureStorage(context.secrets);
    this.authHandler = new ExtensionAuthHandler(secureStorage);
    
    // Initialize console redactor to prevent API key leaks
    ConsoleRedactor.initialize();
    
    // Create output channel for logging
    this.outputChannel = vscode.window.createOutputChannel('Lanonasis Memory');
    
    // Create status bar item
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    
    // Initialize tree data provider
    this.treeDataProvider = new LanonasisTreeDataProvider();
  }

  /**
   * Activate the extension
   */
  async activate(): Promise<void> {
    this.log('Activating Lanonasis Memory Extension...');
    
    // Register all 17 tools as commands
    this.registerAllTools();
    
    // Set up UI components
    this.setupUI();
    
    // Check authentication status
    await this.checkAuthStatus();
    
    // Register event handlers
    this.registerEventHandlers();
    
    this.log('Lanonasis Memory Extension activated with 17 tools');
    this.showWelcomeMessage();
  }

  /**
   * Register all 17 tools as VS Code commands
   */
  private registerAllTools(): void {
    let registeredCount = 0;
    
    for (const tool of LANONASIS_TOOLS) {
      const disposable = vscode.commands.registerCommand(
        tool.command,
        async () => {
          try {
            // Check auth if required
            if (tool.requiresAuth && !this.authHandler.getAuthStatus()) {
              const shouldAuth = await vscode.window.showWarningMessage(
                'This tool requires authentication',
                'Authenticate',
                'Cancel'
              );
              
              if (shouldAuth === 'Authenticate') {
                await this.authenticate();
              }
              return;
            }

            // Execute tool
            await this.executeTool(tool);
          } catch (error) {
            this.handleError(error, `Failed to execute ${tool.title}`);
          }
        }
      );
      
      this.context.subscriptions.push(disposable);
      registeredCount++;
    }
    
    this.log(`Registered ${registeredCount}/17 tools`);
  }

  /**
   * Execute a specific tool
   */
  private async executeTool(tool: ToolDefinition): Promise<void> {
    this.log(`Executing tool: ${tool.name}`);
    
    switch (tool.name) {
      // Memory Management Tools
      case 'create_memory':
        await this.createMemory();
        break;
      case 'search_memories':
        await this.searchMemories();
        break;
      case 'get_memory':
        await this.getMemory();
        break;
      case 'update_memory':
        await this.updateMemory();
        break;
      case 'delete_memory':
        await this.deleteMemory();
        break;
      case 'list_memories':
        await this.listMemories();
        break;
        
      // API Key Management Tools
      case 'create_api_key':
        await this.createApiKey();
        break;
      case 'list_api_keys':
        await this.listApiKeys();
        break;
      case 'rotate_api_key':
        await this.rotateApiKey();
        break;
      case 'delete_api_key':
        await this.deleteApiKey();
        break;
        
      // System & Auth Tools
      case 'get_health_status':
        await this.getHealthStatus();
        break;
      case 'get_auth_status':
        await this.getAuthStatus();
        break;
      case 'get_organization_info':
        await this.getOrganizationInfo();
        break;
        
      // Project Management Tools
      case 'create_project':
        await this.createProject();
        break;
      case 'list_projects':
        await this.listProjects();
        break;
        
      // Configuration Tools
      case 'get_config':
        await this.getConfig();
        break;
      case 'set_config':
        await this.setConfig();
        break;
        
      default:
        throw new Error(`Unknown tool: ${tool.name}`);
    }
  }

  /**
   * Set up UI components
   */
  private setupUI(): void {
    // Register tree view
    vscode.window.registerTreeDataProvider(
      'lanonasisMemories',
      this.treeDataProvider
    );
    
    // Update status bar
    this.updateStatusBar();
    this.statusBarItem.show();
    
    // Set context for when clause
    vscode.commands.executeCommand('setContext', 'lanonasis.enabled', true);
  }

  /**
   * Update status bar item
   */
  protected updateStatusBar(): void {
    const isAuth = this.authHandler.getAuthStatus();
    this.statusBarItem.text = isAuth 
      ? '$(check) Lanonasis Connected' 
      : '$(warning) Lanonasis (Not Connected)';
    this.statusBarItem.tooltip = isAuth
      ? 'Click to view connection details'
      : 'Click to authenticate';
    this.statusBarItem.command = isAuth
      ? 'lanonasis.showConnectionInfo'
      : 'lanonasis.authenticate';
  }

  /**
   * Check authentication status on startup
   */
  private async checkAuthStatus(): Promise<void> {
    // Try to validate existing token
    const headers = await this.authHandler.getAuthHeaders().catch(() => null);
    if (headers) {
      try {
        const response = await fetch('https://api.lanonasis.com/v1/auth/validate', {
          headers
        });
        
        if (response.ok) {
          this.log('Authenticated with existing token');
          vscode.commands.executeCommand('setContext', 'lanonasis.authenticated', true);
          this.updateStatusBar();
          return;
        }
      } catch (error) {
        this.log('Failed to validate existing token');
      }
    }
    
    vscode.commands.executeCommand('setContext', 'lanonasis.authenticated', false);
  }

  /**
   * Register event handlers
   */
  private registerEventHandlers(): void {
    // Handle configuration changes
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('lanonasis')) {
        this.log('Configuration changed');
        this.treeDataProvider.refresh();
      }
    });
    
    // Handle authentication command
    const authCommand = vscode.commands.registerCommand(
      'lanonasis.authenticate',
      async () => {
        await this.authenticate();
      }
    );
    
    this.context.subscriptions.push(authCommand);
  }

  /**
   * Authenticate user
   */
  protected async authenticate(): Promise<void> {
    const choice = await vscode.window.showQuickPick(
      ['OAuth (Browser)', 'API Key', 'Cancel'],
      { placeHolder: 'Choose authentication method' }
    );
    
    if (choice === 'OAuth (Browser)') {
      const success = await this.authHandler.authenticateOAuth();
      if (success) {
        vscode.window.showInformationMessage('Successfully authenticated!');
        vscode.commands.executeCommand('setContext', 'lanonasis.authenticated', true);
        this.updateStatusBar();
        this.treeDataProvider.refresh();
      } else {
        vscode.window.showErrorMessage('Authentication failed');
      }
    } else if (choice === 'API Key') {
      const apiKey = await vscode.window.showInputBox({
        prompt: 'Enter your Lanonasis API key',
        password: true,
        ignoreFocusOut: true,
        validateInput: (value) => {
          if (!value) return 'API key is required';
          if (value.length < 20) return 'API key seems too short';
          return null;
        }
      });
      
      if (apiKey) {
        const success = await this.authHandler.authenticateWithApiKey(apiKey);
        if (success) {
          vscode.window.showInformationMessage('Successfully authenticated!');
          vscode.commands.executeCommand('setContext', 'lanonasis.authenticated', true);
          this.updateStatusBar();
          this.treeDataProvider.refresh();
        } else {
          vscode.window.showErrorMessage('Invalid API key');
        }
      }
    }
  }

  /**
   * Show welcome message
   */
  private showWelcomeMessage(): void {
    const config = vscode.workspace.getConfiguration('lanonasis');
    const showWelcome = config.get('showWelcomeMessage', true);
    
    if (showWelcome) {
      vscode.window.showInformationMessage(
        'Welcome to Lanonasis Memory! 17 tools are now available.',
        'Get Started',
        'Don\'t Show Again'
      ).then(selection => {
        if (selection === 'Get Started') {
          vscode.commands.executeCommand('lanonasis.authenticate');
        } else if (selection === 'Don\'t Show Again') {
          config.update('showWelcomeMessage', false, true);
        }
      });
    }
  }

  /**
   * Log message to output channel
   */
  protected log(message: string): void {
    const timestamp = new Date().toISOString();
    this.outputChannel.appendLine(`[${timestamp}] ${message}`);
  }

  /**
   * Handle errors uniformly
   */
  protected handleError(error: any, context: string): void {
    const message = error?.message || 'Unknown error';
    this.log(`Error in ${context}: ${message}`);
    vscode.window.showErrorMessage(`${context}: ${message}`);
  }

  // Abstract methods for tool implementations
  protected abstract createMemory(): Promise<void>;
  protected abstract searchMemories(): Promise<void>;
  protected abstract getMemory(): Promise<void>;
  protected abstract updateMemory(): Promise<void>;
  protected abstract deleteMemory(): Promise<void>;
  protected abstract listMemories(): Promise<void>;
  protected abstract createApiKey(): Promise<void>;
  protected abstract listApiKeys(): Promise<void>;
  protected abstract rotateApiKey(): Promise<void>;
  protected abstract deleteApiKey(): Promise<void>;
  protected abstract getHealthStatus(): Promise<void>;
  protected abstract getAuthStatus(): Promise<void>;
  protected abstract getOrganizationInfo(): Promise<void>;
  protected abstract createProject(): Promise<void>;
  protected abstract listProjects(): Promise<void>;
  protected abstract getConfig(): Promise<void>;
  protected abstract setConfig(): Promise<void>;

  /**
   * Deactivate the extension
   */
  deactivate(): void {
    this.outputChannel.dispose();
    this.statusBarItem.dispose();
    this.log('Lanonasis Memory Extension deactivated');
  }
}

/**
 * Tree Data Provider for Memories View
 */
class LanonasisTreeDataProvider implements vscode.TreeDataProvider<MemoryItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<MemoryItem | undefined | null | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
  
  private memories: MemoryItem[] = [];

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: MemoryItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: MemoryItem): Thenable<MemoryItem[]> {
    if (!element) {
      // Root level - return memories
      return Promise.resolve(this.memories);
    }
    return Promise.resolve([]);
  }

  async loadMemories(): Promise<void> {
    // Implementation would fetch from API
    this.memories = [];
    this.refresh();
  }
}

/**
 * Memory Tree Item
 */
class MemoryItem extends vscode.TreeItem {
  constructor(
    public readonly id: string,
    public readonly label: string,
    public readonly type: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(label, collapsibleState);
    this.tooltip = `${this.label} (${this.type})`;
    this.contextValue = 'memory';
  }
}

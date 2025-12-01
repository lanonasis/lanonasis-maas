import * as vscode from 'vscode';
import type { IMemoryService } from '../services/IMemoryService';
import type { ApiKeyService } from '../services/ApiKeyService';
import { PrototypeUIBridge } from '../bridges/PrototypeUIBridge';

export class EnhancedSidebarProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'lanonasis.sidebar';
    private _view?: vscode.WebviewView;
    private _bridge: PrototypeUIBridge;
    private _apiKeyService?: ApiKeyService;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly memoryService: IMemoryService,
        apiKeyService?: ApiKeyService
    ) {
        this._bridge = new PrototypeUIBridge(memoryService);
        this._apiKeyService = apiKeyService;
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        console.log('[Lanonasis] EnhancedSidebarProvider.resolveWebviewView called');

        try {
            this._view = webviewView;

            // Configure webview
            webviewView.webview.options = {
                enableScripts: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(this._extensionUri, 'media'),
                    vscode.Uri.joinPath(this._extensionUri, 'out'),
                    vscode.Uri.joinPath(this._extensionUri, 'images')
                ]
            };

            // Set up React-based HTML
            webviewView.webview.html = this._getReactHtmlForWebview(webviewView.webview);

            // Handle messages from the React webview
            webviewView.webview.onDidReceiveMessage(async (data) => {
                try {
                    await this.handleWebviewMessage(data);
                } catch (error) {
                    console.error('[Lanonasis] Enhanced sidebar error:', error);
                    this._view?.webview.postMessage({
                        type: 'error',
                        message: `Action failed: ${error instanceof Error ? error.message : String(error)}`
                    });
                }
            });

            // Initial data load - call immediately
            this.sendInitialData().catch((error) => {
                console.error('[Lanonasis] Failed to load enhanced sidebar:', error);
                this._view?.webview.postMessage({
                    type: 'error',
                    message: 'Failed to load enhanced UI. Falling back to original interface.'
                });
            });

        } catch (error) {
            console.error('[Lanonasis] Enhanced sidebar initialization failed:', error);
            throw error;
        }
    }

    private async handleWebviewMessage(data: { type: string; data?: unknown }) {
        try {
            switch (data.type) {
                case 'getAuthState':
                    await this.sendAuthState();
                    break;
                case 'authenticate': {
                    const authData = data.data as { mode?: 'oauth' | 'apikey' } | undefined;
                    await this.handleAuthentication(authData?.mode);
                    break;
                }
                case 'logout':
                    await this.handleLogout();
                    break;
                case 'getMemories':
                    await this.sendMemories();
                    break;
                case 'searchMemories':
                    await this.handleSearch(data.data as string);
                    break;
                case 'chatQuery':
                    await this.handleChatQuery(data.data as string);
                    break;
                case 'selectMemory':
                    await this.handleMemorySelection(data.data as string);
                    break;
                case 'createMemory':
                    await this.handleCreateMemory(data.data as Record<string, unknown>);
                    break;
                case 'getApiKeys':
                    await this.handleGetApiKeys();
                    break;
                case 'createApiKey':
                    await this.handleCreateApiKey(data.data as { name: string; scope?: string });
                    break;
                case 'deleteApiKey':
                    await this.handleDeleteApiKey(data.data as string);
                    break;
                case 'storeApiKey':
                    await this.handleStoreApiKey();
                    break;
                case 'manageApiKeys':
                    await vscode.commands.executeCommand('lanonasis.manageApiKeys');
                    break;
                case 'openSettings':
                    await vscode.commands.executeCommand('workbench.action.openSettings', 'lanonasis');
                    break;
                default:
                    console.warn('[EnhancedSidebarProvider] Unknown message type:', data.type);
            }
        } catch (error) {
            console.error('[EnhancedSidebarProvider] Message handling error:', error);
            this._view?.webview.postMessage({
                type: 'error',
                data: error instanceof Error ? error.message : String(error)
            });
        }
    }

    private async sendAuthState() {
        try {
            const isAuthenticated = await this._bridge.isAuthenticated();
            this._view?.webview.postMessage({
                type: 'authState',
                data: { authenticated: isAuthenticated }
            });
        } catch {
            this._view?.webview.postMessage({
                type: 'authState',
                data: { authenticated: false, error: 'Failed to check authentication state' }
            });
        }
    }

    private async handleLogout() {
        try {
            // Clear stored credentials and reset auth context
            await vscode.commands.executeCommand('lanonasis.logout');
            await this.sendAuthState();
        } catch (error) {
            this._view?.webview.postMessage({
                type: 'error',
                data: 'Logout failed: ' + (error instanceof Error ? error.message : String(error))
            });
        }
    }

    private async handleAuthentication(mode?: 'oauth' | 'apikey'): Promise<void> {
        try {
            // Trigger authentication through VS Code commands with mode
            await vscode.commands.executeCommand('lanonasis.authenticate', mode);
            // Wait a bit for auth to complete, then refresh state
            setTimeout(async () => {
                await this.sendAuthState();
                await this.sendMemories();
            }, 1000);
        } catch (error) {
            this._view?.webview.postMessage({
                type: 'error',
                data: 'Authentication failed: ' + (error instanceof Error ? error.message : String(error))
            });
        }
    }

    private async handleChatQuery(query: string): Promise<void> {
        if (!this._view) return;
        
        try {
            // Send loading state
            this._view.webview.postMessage({
                type: 'chatLoading',
                data: true
            });

            // Use semantic search to find relevant memories for the chat query
            const results = await this._bridge.searchMemories(query);
            
            // Format results as a chat response
            const response = this.formatChatResponse(query, results);
            
            this._view.webview.postMessage({
                type: 'chatResponse',
                data: {
                    query,
                    response,
                    memories: results.slice(0, 5) // Include top 5 relevant memories
                }
            });
        } catch (error) {
            this._view.webview.postMessage({
                type: 'chatError',
                data: `Failed to process query: ${error instanceof Error ? error.message : String(error)}`
            });
        } finally {
            this._view.webview.postMessage({
                type: 'chatLoading',
                data: false
            });
        }
    }

    private formatChatResponse(query: string, memories: Array<{ title: string; content: string }>): string {
        if (memories.length === 0) {
            return `I couldn't find any memories related to "${query}". Would you like me to help you create one?`;
        }

        const topMemory = memories[0];
        let response = `Based on your query "${query}", I found ${memories.length} relevant memory${memories.length > 1 ? 'ies' : ''}.\n\n`;
        response += `**Most relevant:** ${topMemory.title}\n`;
        response += `${topMemory.content.substring(0, 200)}${topMemory.content.length > 200 ? '...' : ''}\n\n`;
        
        if (memories.length > 1) {
            response += `**Other related memories:**\n`;
            memories.slice(1, 4).forEach((mem, idx) => {
                response += `${idx + 2}. ${mem.title}\n`;
            });
        }

        return response;
    }

    private async handleGetApiKeys(): Promise<void> {
        try {
            let apiKeys: any[] = [];
            
            // Try to get API keys from ApiKeyService if available
            if (this._apiKeyService) {
                try {
                    apiKeys = await this._apiKeyService.getApiKeys();
                } catch (error) {
                    console.warn('[EnhancedSidebarProvider] Failed to fetch API keys from service:', error);
                }
            }
            
            // Transform API keys to match the expected format
            const transformedKeys = apiKeys.map(key => ({
                id: key.id || key.keyId || String(Math.random()),
                name: key.name || 'Unnamed Key',
                scope: key.scope || key.accessLevel || key.keyType || 'read,write',
                lastUsed: key.lastUsed || key.lastUsedAt || key.createdAt ? 
                    this.formatLastUsed(key.lastUsed || key.lastUsedAt || key.createdAt) : 'Never'
            }));
            
            this._view?.webview.postMessage({
                type: 'apiKeys',
                data: transformedKeys
            });
        } catch {
            console.warn('[EnhancedSidebarProvider] Failed to fetch API keys');
            this._view?.webview.postMessage({
                type: 'apiKeys',
                data: []
            });
            this._view?.webview.postMessage({
                type: 'apiKeyError',
                data: 'Unable to load API keys. Please check your connection or authentication.'
            });
        }
    }

    private formatLastUsed(date: string | Date): string {
        try {
            const dateObj = typeof date === 'string' ? new Date(date) : date;
            const now = new Date();
            const diffMs = now.getTime() - dateObj.getTime();
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMs / 3600000);
            const diffDays = Math.floor(diffMs / 86400000);

            if (diffMins < 1) return 'Just now';
            if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
            if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
            if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
            return dateObj.toLocaleDateString();
        } catch {
            return 'Unknown';
        }
    }

    private async handleCreateApiKey(_keyData: { name: string; scope?: string }): Promise<void> {
        try {
            // Delegate creation to the existing command flow (collects required fields)
            await vscode.commands.executeCommand('lanonasis.createApiKey');

            // Refresh API keys after creation
            await this.handleGetApiKeys();

            this._view?.webview.postMessage({
                type: 'apiKeyCreated',
                data: { success: true, message: 'API key created.' }
            });
        } catch (error) {
            this._view?.webview.postMessage({
                type: 'apiKeyError',
                data: 'Failed to create API key: ' + (error instanceof Error ? error.message : String(error))
            });
        }
    }

    private async handleDeleteApiKey(keyId: string): Promise<void> {
        try {
            if (this._apiKeyService && keyId) {
                await this._apiKeyService.deleteApiKey(keyId);
            } else {
                // Fallback: trigger tree refresh (best-effort)
                await vscode.commands.executeCommand('lanonasis.refreshApiKeys');
            }

            await this.handleGetApiKeys();

            this._view?.webview.postMessage({
                type: 'apiKeyDeleted',
                data: { success: true, message: 'API key deleted.' }
            });
        } catch (error) {
            this._view?.webview.postMessage({
                type: 'apiKeyError',
                data: 'Failed to delete API key: ' + (error instanceof Error ? error.message : String(error))
            });
        }
    }

    private async handleStoreApiKey(): Promise<void> {
        try {
            // Prompt user to enter/paste an API key and store it securely
            await vscode.commands.executeCommand('lanonasis.authenticate', 'apikey');
            await this.sendAuthState();
        } catch (error) {
            this._view?.webview.postMessage({
                type: 'apiKeyError',
                data: 'Failed to store API key: ' + (error instanceof Error ? error.message : String(error))
            });
        }
    }

    private async handleMemorySelection(memoryId: string) {
        try {
            const memory = await this._bridge.getMemoryById(memoryId);
            this._view?.webview.postMessage({
                type: 'memory',
                data: memory
            });
        } catch (error) {
            this._view?.webview.postMessage({
                type: 'error',
                data: 'Failed to load memory: ' + (error instanceof Error ? error.message : String(error))
            });
        }
    }

    private async handleCreateMemory(memoryData: Record<string, unknown>) {
        try {
            // Validate and transform memory data
            const createMemoryData = {
                title: (memoryData.title as string) || 'New Memory',
                content: (memoryData.content as string) || '',
                memory_type: (memoryData.memory_type as 'context' | 'knowledge' | 'project' | 'reference' | 'personal' | 'workflow' | 'conversation') || 'context',
                tags: Array.isArray(memoryData.tags) ? (memoryData.tags as string[]) : [],
                summary: memoryData.summary as string | undefined,
                topic_id: memoryData.topic_id as string | undefined,
                project_ref: memoryData.project_ref as string | undefined,
                metadata: memoryData.metadata as Record<string, unknown> | undefined,
            };
            const memory = await this._bridge.createMemory(createMemoryData);
            this._view?.webview.postMessage({
                type: 'memory',
                data: memory
            });
            // Refresh memories list
            await this.sendMemories();
        } catch (error) {
            this._view?.webview.postMessage({
                type: 'error',
                data: 'Failed to create memory: ' + (error instanceof Error ? error.message : String(error))
            });
        }
    }

    private async sendMemories() {
        try {
            const memories = await this._bridge.getAllMemories();
            this._view?.webview.postMessage({
                type: 'memories',
                data: memories
            });
        } catch {
            this._view?.webview.postMessage({
                type: 'memories',
                data: []
            });
        }
    }

    private async handleSearch(query: string) {
        try {
            const results = await this._bridge.searchMemories(query);
            this._view?.webview.postMessage({
                type: 'memories',
                data: results
            });
        } catch (error) {
            this._view?.webview.postMessage({
                type: 'error',
                message: `Search failed: ${error instanceof Error ? error.message : String(error)}`
            });
        }
    }

    private async sendInitialData() {
        await Promise.all([
            this.sendAuthState(),
            this.sendMemories()
        ]);
    }

    public async refresh(_force: boolean = false) {
        try {
            if (this._view) {
                await this.sendInitialData();
            }
        } catch (error) {
            console.error('[Lanonasis] Enhanced refresh failed:', error);
        }
    }

    private _getReactHtmlForWebview(webview: vscode.Webview) {
        const reactScriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'sidebar-react.js'));
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'react-styles.css'));
        const nonce = this.getNonce();

        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}'; img-src ${webview.cspSource} https:; font-src ${webview.cspSource};">
            <link href="${styleUri}" rel="stylesheet">
            <title>Lanonasis Memory - Enhanced UI</title>
        </head>
        <body>
            <div id="root">
                <div class="loading-state">
                    <div class="spinner"></div>
                    <p>Loading Enhanced UI...</p>
                </div>
            </div>
            <script nonce="${nonce}">
                // Initialize VS Code API before React loads
                (function() {
                    const vscode = acquireVsCodeApi();
                    window.vscode = vscode;
                })();
            </script>
            <script nonce="${nonce}" src="${reactScriptUri}"></script>
        </body>
        </html>`;
    }

    private getNonce(): string {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }
}

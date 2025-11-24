import * as vscode from 'vscode';
import type { IMemoryService } from '../services/IMemoryService';
import { PrototypeUIBridge } from '../bridges/PrototypeUIBridge';

export class EnhancedSidebarProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'lanonasis.enhanced-sidebar';
    private _view?: vscode.WebviewView;
    private _bridge: PrototypeUIBridge;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly memoryService: IMemoryService
    ) {
        this._bridge = new PrototypeUIBridge(memoryService);
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

            // Initial data load
            setTimeout(async () => {
                try {
                    await this.sendInitialData();
                } catch (error) {
                    console.error('[Lanonasis] Failed to load enhanced sidebar:', error);
                    this._view?.webview.postMessage({
                        type: 'error',
                        message: 'Failed to load enhanced UI. Falling back to original interface.'
                    });
                }
            }, 1000);

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
                case 'authenticate':
                    await this.handleAuthentication();
                    break;
                case 'logout':
                    await this.handleLogout();
                    break;
                case 'getMemories':
                    await this.sendMemories();
                    break;
                case 'searchMemories':
                    await this.handleSearch(data.data as string);
                    break;
                case 'selectMemory':
                    await this.handleMemorySelection(data.data as string);
                    break;
                case 'createMemory':
                    await this.handleCreateMemory(data.data as Record<string, unknown>);
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
        } catch (_error) {
            this._view?.webview.postMessage({
                type: 'authState',
                data: { authenticated: false, error: 'Failed to check authentication state' }
            });
        }
    }

    private async handleLogout() {
        try {
            // Trigger logout through VS Code commands since IMemoryService doesn't have logout
            await vscode.commands.executeCommand('lanonasis.clearAuth');
            await this.sendAuthState();
        } catch (error) {
            this._view?.webview.postMessage({
                type: 'error',
                data: 'Logout failed: ' + (error instanceof Error ? error.message : String(error))
            });
        }
    }

    private async handleAuthentication(): Promise<void> {
        try {
            // Trigger authentication through VS Code commands
            await vscode.commands.executeCommand('lanonasis.authenticate');
            await this.sendAuthState();
        } catch (error) {
            this._view?.webview.postMessage({
                type: 'error',
                data: 'Authentication failed: ' + (error instanceof Error ? error.message : String(error))
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

    private async handleCreateMemory(memoryData: any) {
        try {
            const memory = await this._bridge.createMemory(memoryData);
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
        } catch (error) {
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

import * as vscode from 'vscode';
import { EnhancedMemoryService } from '../services/EnhancedMemoryService';
import type { IMemoryService } from '../services/IMemoryService';

export class MemorySidebarProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'lanonasis.sidebar';
    private _view?: vscode.WebviewView;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly memoryService: IMemoryService
    ) { }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        console.log('[Lanonasis] MemorySidebarProvider.resolveWebviewView called');
        try {
            const activationChannel = vscode.window.createOutputChannel('Lanonasis Activation');
            activationChannel.appendLine('[Lanonasis] MemorySidebarProvider.resolveWebviewView called');
        } catch {
            // ignore in tests
        }
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case 'authenticate':
                    await vscode.commands.executeCommand('lanonasis.authenticate', data.mode);
                    break;
                case 'searchMemories':
                    await this.handleSearch(data.query);
                    break;
                case 'createMemory':
                    await vscode.commands.executeCommand('lanonasis.createMemory');
                    break;
                case 'openMemory':
                    await vscode.commands.executeCommand('lanonasis.openMemory', data.memory);
                    break;
                case 'refresh':
                    await this.refresh();
                    break;
                case 'showSettings':
                    await vscode.commands.executeCommand('workbench.action.openSettings', 'lanonasis');
                    break;
                case 'getApiKey':
                    await vscode.env.openExternal(vscode.Uri.parse('https://api.lanonasis.com'));
                    break;
                case 'openCommandPalette':
                    await vscode.commands.executeCommand('workbench.action.quickOpen', '>Lanonasis: Authenticate');
                    break;
            }
        });

        // Initial load
        this.refresh();
    }

    public async refresh() {
        if (this._view) {
            try {
                const authenticated = this.memoryService.isAuthenticated();

                this._view.webview.postMessage({
                    type: 'updateState',
                    state: { loading: true }
                });

                if (!authenticated) {
                    this._view.webview.postMessage({
                        type: 'updateState',
                        state: {
                            authenticated: false,
                            memories: [],
                            loading: false,
                            enhancedMode: false,
                            cliVersion: null
                        }
                    });
                    return;
                }

                const memories = await this.memoryService.listMemories(50);
                const enhancedInfo = this.memoryService instanceof EnhancedMemoryService
                    ? this.memoryService.getCapabilities()
                    : null;

                this._view.webview.postMessage({
                    type: 'updateState',
                    state: {
                        authenticated: authenticated,
                        memories,
                        loading: false,
                        enhancedMode: enhancedInfo?.cliAvailable || false,
                        cliVersion: enhancedInfo?.version || null
                    }
                });
            } catch (error) {
                if (error instanceof Error && error.message.includes('Not authenticated')) {
                    this._view.webview.postMessage({
                        type: 'updateState',
                        state: {
                            authenticated: false,
                            memories: [],
                            loading: false
                        }
                    });
                    return;
                }

                this._view.webview.postMessage({
                    type: 'error',
                    message: error instanceof Error ? error.message : 'Failed to load memories'
                });
                this._view.webview.postMessage({
                    type: 'updateState',
                    state: { loading: false }
                });
            }
        }
    }

    private async handleSearch(query: string) {
        if (!this._view) return;

        if (!this.memoryService.isAuthenticated()) {
            this._view.webview.postMessage({
                type: 'updateState',
                state: {
                    authenticated: false,
                    memories: [],
                    loading: false
                }
            });
            return;
        }

        try {
            this._view.webview.postMessage({
                type: 'updateState',
                state: { loading: true }
            });

            const results = await this.memoryService.searchMemories(query);

            this._view.webview.postMessage({
                type: 'searchResults',
                results,
                query
            });
        } catch (error) {
            this._view.webview.postMessage({
                type: 'error',
                message: error instanceof Error ? error.message : 'Search failed'
            });
        } finally {
            this._view.webview.postMessage({
                type: 'updateState',
                state: { loading: false }
            });
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'sidebar.css'));
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'sidebar.js'));

        // Get CSP
        const nonce = getNonce();

        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}'; img-src ${webview.cspSource} https:; font-src ${webview.cspSource};">
            <link href="${styleUri}" rel="stylesheet">
            <title>Lanonasis Memory</title>
        </head>
        <body>
            <div id="root">
                <div class="loading-state">
                    <div class="spinner"></div>
                    <p>Loading Lanonasis Memory...</p>
                </div>
            </div>
            <script nonce="${nonce}" src="${scriptUri}"></script>
        </body>
        </html>`;
    }
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

import * as vscode from 'vscode';
import { MemoryService } from '../services/MemoryService';
import { EnhancedMemoryService } from '../services/EnhancedMemoryService';
import type { IMemoryService } from '../services/IMemoryService';
import { MemoryEntry, MemoryType } from '../types/memory-aligned';

export class MemorySidebarProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'lanonasis.sidebar';
    private _view?: vscode.WebviewView;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly memoryService: IMemoryService
    ) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
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
                    await vscode.commands.executeCommand('lanonasis.authenticate');
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
            }
        });

        // Initial load
        this.refresh();
    }

    public async refresh() {
        if (this._view) {
            const authenticated = await this.isAuthenticated();
            
            if (!authenticated) {
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

                const memories = await this.memoryService.listMemories(50);
                const enhancedInfo = this.memoryService instanceof EnhancedMemoryService 
                    ? this.memoryService.getCapabilities()
                    : null;

                this._view.webview.postMessage({
                    type: 'updateState',
                    state: {
                        authenticated: true,
                        memories,
                        loading: false,
                        enhancedMode: enhancedInfo?.cliAvailable || false,
                        cliVersion: enhancedInfo?.cliVersion || null
                    }
                });
            } catch (error) {
                this._view.webview.postMessage({
                    type: 'error',
                    message: error instanceof Error ? error.message : 'Failed to load memories'
                });
            }
        }
    }

    private async handleSearch(query: string) {
        if (!this._view) return;

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

    private async isAuthenticated(): Promise<boolean> {
        return this.memoryService.isAuthenticated();
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
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
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

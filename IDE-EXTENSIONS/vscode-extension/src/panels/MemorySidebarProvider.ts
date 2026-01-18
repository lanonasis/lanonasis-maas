import * as vscode from 'vscode';
import { EnhancedMemoryService } from '../services/EnhancedMemoryService';
import type { IMemoryService } from '../services/IMemoryService';
import { createMemorySchema, updateMemorySchema, type MemoryEntry } from '@lanonasis/memory-client';

export class MemorySidebarProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'lanonasis.sidebar';
    private _view?: vscode.WebviewView;
    private _cachedMemories: MemoryEntry[] = [];
    private _cacheTimestamp: number = 0;
    private readonly CACHE_DURATION = 30000; // 30 seconds
    private _pendingStateUpdate: NodeJS.Timeout | null = null;
    private _lastState: Record<string, unknown> = {};

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

        try {
            this._view = webviewView;

            // Restrict resource access to only necessary directories
            webviewView.webview.options = {
                enableScripts: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(this._extensionUri, 'media'),
                    vscode.Uri.joinPath(this._extensionUri, 'out'),
                    vscode.Uri.joinPath(this._extensionUri, 'images')
                ]
            };

            webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

            // Handle messages from the webview
            webviewView.webview.onDidReceiveMessage(async (data) => {
                try {
                    switch (data.type) {
                        case 'authenticate':
                            await vscode.commands.executeCommand('lanonasis.authenticate', data.mode);
                            break;
                        case 'searchMemories':
                            await this.handleSearch(data.query);
                            break;
                        case 'createMemory':
                            await this.handleCreateFromWebview(data.payload);
                            break;
                        case 'updateMemory':
                            await this.handleUpdateFromWebview(data.id, data.payload);
                            break;
                        case 'deleteMemory':
                            await this.handleDeleteFromWebview(data.id);
                            break;
                        case 'bulkDelete':
                            await this.handleBulkDeleteFromWebview(data.ids);
                            break;
                        case 'bulkTag':
                            await this.handleBulkTagFromWebview(data.ids, data.tags);
                            break;
                        case 'restoreMemory':
                            await this.handleCreateFromWebview(data.payload);
                            break;
                        case 'openMemory':
                            await vscode.commands.executeCommand('lanonasis.openMemory', data.memory);
                            break;
                        case 'refresh':
                            await this.refresh(true); // Force refresh when user clicks refresh button
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
                } catch (error) {
                    console.error('[Lanonasis] Error handling webview message:', error);
                    this._view?.webview.postMessage({
                        type: 'error',
                        message: `Action failed: ${error instanceof Error ? error.message : String(error)}`
                    });
                }
            });

            // Initial load with error handling and delay for auth settlement
            // Wait for authentication to complete before loading
            setTimeout(async () => {
                try {
                    // Check if authenticated before trying to load
                    const isAuthenticated = this.memoryService.isAuthenticated();

                    if (!isAuthenticated) {
                        // Show auth screen immediately, don't try to load memories
                        this._view?.webview.postMessage({
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

                    await this.refresh();
                } catch (error) {
                    console.error('[Lanonasis] Failed to load sidebar:', error);
                    // Show auth screen on error instead of crashing
                    this._view?.webview.postMessage({
                        type: 'updateState',
                        state: {
                            authenticated: false,
                            memories: [],
                            loading: false
                        }
                    });
                }
            }, 300);
        } catch (error) {
            console.error('[Lanonasis] Fatal error in resolveWebviewView:', error);
            vscode.window.showErrorMessage(`Lanonasis extension failed to load: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    public async refresh(forceRefresh: boolean = false) {
        if (this._view) {
            try {
                const authenticated = this.memoryService.isAuthenticated();

                // Show loading only if not using cache
                const now = Date.now();
                const useCache = !forceRefresh &&
                                this._cachedMemories.length > 0 &&
                                (now - this._cacheTimestamp) < this.CACHE_DURATION;

                if (useCache) {
                    // Use cached data immediately
                    const enhancedInfo = this.memoryService instanceof EnhancedMemoryService
                        ? this.memoryService.getCapabilities()
                        : null;

                    this.sendStateUpdate({
                        authenticated: authenticated,
                        memories: this._cachedMemories,
                        loading: false,
                        enhancedMode: enhancedInfo?.cliAvailable || false,
                        cliVersion: enhancedInfo?.version || null,
                        cached: true
                    }, true);
                    return;
                }

                // Only show loading if we're actually going to fetch
                if (authenticated) {
                    this.sendStateUpdate({ loading: true });
                }

                if (!authenticated) {
                    this._cachedMemories = [];
                    this._cacheTimestamp = 0;
                    this.sendStateUpdate({
                        authenticated: false,
                        memories: [],
                        loading: false,
                        enhancedMode: false,
                        cliVersion: null
                    }, true);
                    return;
                }

                const memories = await this.memoryService.listMemories(50);
                const enhancedInfo = this.memoryService instanceof EnhancedMemoryService
                    ? this.memoryService.getCapabilities()
                    : null;

                // Update cache
                this._cachedMemories = memories;
                this._cacheTimestamp = Date.now();

                this.sendStateUpdate({
                    authenticated: authenticated,
                    memories,
                    loading: false,
                    enhancedMode: enhancedInfo?.cliAvailable || false,
                    cliVersion: enhancedInfo?.version || null,
                    cached: false
                }, true);
            } catch (error) {
                const errorMsg = error instanceof Error ? error.message : String(error);

                // Check for specific error types
                if (errorMsg.includes('Not authenticated') || errorMsg.includes('401') || errorMsg.includes('Authentication required')) {
                    this._cachedMemories = [];
                    this._cacheTimestamp = 0;
                    this.sendStateUpdate({
                        authenticated: false,
                        memories: [],
                        loading: false
                    }, true);
                    return;
                }

                // If we have cached data, show it with an error message
                if (this._cachedMemories.length > 0) {
                    this._view.webview.postMessage({
                        type: 'error',
                        message: `Failed to refresh: ${errorMsg}. Showing cached data.`
                    });

                    const enhancedInfo = this.memoryService instanceof EnhancedMemoryService
                        ? this.memoryService.getCapabilities()
                        : null;

                    this.sendStateUpdate({
                        authenticated: true,
                        memories: this._cachedMemories,
                        loading: false,
                        enhancedMode: enhancedInfo?.cliAvailable || false,
                        cliVersion: enhancedInfo?.version || null,
                        cached: true
                    }, true);
                } else {
                    // Network/timeout errors - show auth screen instead of blank
                    this._view.webview.postMessage({
                        type: 'error',
                        message: `Connection failed: ${errorMsg}`
                    });

                    this.sendStateUpdate({
                        authenticated: false,
                        memories: [],
                        loading: false
                    }, true);
                }
            }
        }
    }

    public clearCache(): void {
        this._cachedMemories = [];
        this._cacheTimestamp = 0;
    }

    /**
     * Debounced state update to prevent rapid re-renders that cause blank screen
     * Only sends update if state actually changed
     */
    private sendStateUpdate(state: Record<string, unknown>, immediate: boolean = false): void {
        // Cancel any pending update
        if (this._pendingStateUpdate) {
            clearTimeout(this._pendingStateUpdate);
            this._pendingStateUpdate = null;
        }

        // Check if state actually changed (compare JSON for simplicity)
        const stateStr = JSON.stringify(state);
        const lastStateStr = JSON.stringify(this._lastState);

        if (stateStr === lastStateStr && !immediate) {
            return; // No change, skip update
        }

        const doUpdate = () => {
            this._lastState = state;
            this._view?.webview.postMessage({
                type: 'updateState',
                state
            });
        };

        if (immediate) {
            doUpdate();
        } else {
            // Debounce by 50ms to batch rapid updates
            this._pendingStateUpdate = setTimeout(doUpdate, 50);
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

    private async handleCreateFromWebview(payload: unknown): Promise<void> {
        if (!this._view) return;

        if (!this.memoryService.isAuthenticated()) {
            this._view.webview.postMessage({
                type: 'error',
                message: 'Not authenticated. Please sign in first.'
            });
            return;
        }

        try {
            // Validate payload
            const validated = createMemorySchema.parse(payload);

            await this.memoryService.createMemory(validated);

            this._view.webview.postMessage({
                type: 'memoryCreated',
                message: 'Memory created successfully'
            });

            // Refresh the list
            await this.refresh(true);
        } catch (error) {
            this._view.webview.postMessage({
                type: 'error',
                message: error instanceof Error ? error.message : 'Failed to create memory'
            });
        }
    }

    private async handleUpdateFromWebview(id: string, payload: unknown): Promise<void> {
        if (!this._view) return;

        if (!this.memoryService.isAuthenticated()) {
            this._view.webview.postMessage({
                type: 'error',
                message: 'Not authenticated. Please sign in first.'
            });
            return;
        }

        try {
            // Validate payload
            const validated = updateMemorySchema.parse(payload);

            // Convert null values to undefined for the service API
            const sanitized: Parameters<typeof this.memoryService.updateMemory>[1] = {
                ...validated,
                topic_id: validated.topic_id === null ? undefined : validated.topic_id,
                project_ref: validated.project_ref === null ? undefined : validated.project_ref
            };

            await this.memoryService.updateMemory(id, sanitized);

            this._view.webview.postMessage({
                type: 'memoryUpdated',
                message: 'Memory updated successfully'
            });

            // Refresh the list
            await this.refresh(true);
        } catch (error) {
            this._view.webview.postMessage({
                type: 'error',
                message: error instanceof Error ? error.message : 'Failed to update memory'
            });
        }
    }

    private async handleDeleteFromWebview(id: string): Promise<void> {
        if (!this._view) return;

        if (!this.memoryService.isAuthenticated()) {
            this._view.webview.postMessage({
                type: 'error',
                message: 'Not authenticated. Please sign in first.'
            });
            return;
        }

        try {
            await this.memoryService.deleteMemory(id);

            this._view.webview.postMessage({
                type: 'memoryDeleted',
                message: 'Memory deleted successfully'
            });

            // Refresh the list
            await this.refresh(true);
        } catch (error) {
            this._view.webview.postMessage({
                type: 'error',
                message: error instanceof Error ? error.message : 'Failed to delete memory'
            });
        }
    }

    private async handleBulkDeleteFromWebview(ids: string[]): Promise<void> {
        if (!this._view) return;

        if (!this.memoryService.isAuthenticated()) {
            this._view.webview.postMessage({
                type: 'error',
                message: 'Not authenticated. Please sign in first.'
            });
            return;
        }

        try {
            // Delete memories one by one (bulk delete not directly supported)
            const results = await Promise.allSettled(
                ids.map(id => this.memoryService.deleteMemory(id))
            );

            const failed = results.filter(r => r.status === 'rejected').length;
            const succeeded = results.length - failed;

            this._view.webview.postMessage({
                type: 'bulkDeleteComplete',
                message: `Deleted ${succeeded} memories${failed > 0 ? `, ${failed} failed` : ''}`
            });

            // Refresh the list
            await this.refresh(true);
        } catch (error) {
            this._view.webview.postMessage({
                type: 'error',
                message: error instanceof Error ? error.message : 'Failed to delete memories'
            });
        }
    }

    private async handleBulkTagFromWebview(ids: string[], tags: string[]): Promise<void> {
        if (!this._view) return;

        if (!this.memoryService.isAuthenticated()) {
            this._view.webview.postMessage({
                type: 'error',
                message: 'Not authenticated. Please sign in first.'
            });
            return;
        }

        try {
            // Update tags for each memory
            const results = await Promise.allSettled(
                ids.map(id => this.memoryService.updateMemory(id, { tags }))
            );

            const failed = results.filter(r => r.status === 'rejected').length;
            const succeeded = results.length - failed;

            this._view.webview.postMessage({
                type: 'bulkTagComplete',
                message: `Updated tags for ${succeeded} memories${failed > 0 ? `, ${failed} failed` : ''}`
            });

            // Refresh the list
            await this.refresh(true);
        } catch (error) {
            this._view.webview.postMessage({
                type: 'error',
                message: error instanceof Error ? error.message : 'Failed to update tags'
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

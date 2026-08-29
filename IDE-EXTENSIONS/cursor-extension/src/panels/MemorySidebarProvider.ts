import * as vscode from 'vscode';
import { MemoryService } from '../services/MemoryService';
import { EnhancedMemoryService } from '../services/EnhancedMemoryService';
import type { IMemoryService } from '../services/IMemoryService';
import { MemoryEntry, MemoryType, createMemorySchema, updateMemorySchema } from '../types/memory';
import {
    AIRouterClient,
    AIRouterRateLimitError,
    AIRouterTimeoutError,
} from '@lanonasis/ide-extension-core';
import {
    resolveRouterCredential,
    type RouterCredentialService,
} from '../services/sidebar-credential-wiring';

const AI_ROUTER_TIMEOUT_MS = 45000; // 45 seconds

// ---------------------------------------------------------------------------
export class MemorySidebarProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'lanonasis.sidebar';
    private _view: vscode.WebviewView | null = null;
    private _credentialService: RouterCredentialService | null = null;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly memoryService: IMemoryService,
    ) {}

    /**
     * Expose the secure credential service so chat queries can resolve
     * credentials without prompting the user.
     */
    setCredentialService(service: RouterCredentialService): void {
        this._credentialService = service;
    }

    // ──────────────────────────────────────────────────
    // Webview lifecycle
    // ──────────────────────────────────────────────────

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri],
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
                    await this.refresh();
                    break;
                case 'showSettings':
                    await vscode.commands.executeCommand('workbench.action.openSettings', 'lanonasis');
                    break;
                case 'getApiKey':
                    await vscode.env.openExternal(vscode.Uri.parse('https://api.lanonasis.com'));
                    break;
                // ── AI Router chat ──────────────────────────
                case 'aiChatQuery':
                    await this.handleChatQuery(data.query);
                    break;
            }
        });

        // Initial load
        this.refresh();
    }

    public async refresh() {
        if (!this._view) return;

        const authenticated = await this.isAuthenticated();

        if (!authenticated) {
            this._view.webview.postMessage({
                type: 'updateState',
                state: { authenticated: false, memories: [], loading: false },
            });
            return;
        }

        try {
            this._view.webview.postMessage({ type: 'updateState', state: { loading: true } });

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
                    cliVersion: enhancedInfo?.version || null,
                },
            });
        } catch (error) {
            this._view.webview.postMessage({
                type: 'error',
                message: error instanceof Error ? error.message : 'Failed to load memories',
            });
        }
    }

    // ──────────────────────────────────────────────────
    // Search / CRUD handlers (unchanged)
    // ──────────────────────────────────────────────────

    private async handleSearch(query: string) {
        if (!this._view) return;

        try {
            this._view.webview.postMessage({ type: 'updateState', state: { loading: true } });
            const results = await this.memoryService.searchMemories(query);
            this._view.webview.postMessage({ type: 'searchResults', results, query });
        } catch (error) {
            this._view.webview.postMessage({
                type: 'error',
                message: error instanceof Error ? error.message : 'Search failed',
            });
        } finally {
            this._view.webview.postMessage({ type: 'updateState', state: { loading: false } });
        }
    }

    private async isAuthenticated(): Promise<boolean> {
        return this.memoryService.isAuthenticated();
    }

    private async handleCreateFromWebview(payload: any) {
        const parsed = createMemorySchema.safeParse(payload);
        if (!parsed.success) {
            const msg = parsed.error.issues.map((i) => i.message).join('; ');
            vscode.window.showErrorMessage(`Memory not created: ${msg}`);
            return;
        }
        await this.memoryService.createMemory(parsed.data);
        await this.refresh();
    }

    private async handleUpdateFromWebview(id: string, payload: any) {
        const parsed = updateMemorySchema.safeParse(payload);
        if (!parsed.success) {
            const msg = parsed.error.issues.map((i) => i.message).join('; ');
            vscode.window.showErrorMessage(`Memory not updated: ${msg}`);
            return;
        }
        await this.memoryService.updateMemory(id, parsed.data);
        await this.refresh();
    }

    private async handleDeleteFromWebview(id: string) {
        await this.memoryService.deleteMemory(id);
        await this.refresh();
    }

    private async handleBulkDeleteFromWebview(ids: string[]) {
        if (!ids?.length) return;
        await Promise.all(ids.map((id) => this.memoryService.deleteMemory(id)));
        await this.refresh();
    }

    private async handleBulkTagFromWebview(ids: string[], tags: string[]) {
        if (!ids?.length || !tags?.length) return;
        await Promise.all(
            ids.map(async (id) => {
                const mem = await this.memoryService.getMemory(id);
                const nextTags = Array.from(new Set([...(mem.tags || []), ...tags]));
                await this.memoryService.updateMemory(id, { tags: nextTags });
            }),
        );
        await this.refresh();
    }

    // ──────────────────────────────────────────────────
    // AI Router — chat
    // ──────────────────────────────────────────────────

    private parseChatInput(
        queryData: string | { query: string; attachedMemories?: unknown[] },
    ): { query: string; attachedMemories: Array<{ id: string; title: string; content: string }> } {
        if (typeof queryData === 'string') {
            return { query: queryData, attachedMemories: [] };
        }
        const raw = queryData.attachedMemories || [];
        const attached = raw.filter(
            (m: unknown): m is { id: string; title: string; content: string } =>
                !!m && typeof m === 'object' && typeof (m as any).content === 'string',
        );
        return { query: queryData.query, attachedMemories: attached };
    }

    private async handleChatQuery(
        queryData: string | { query: string; attachedMemories?: unknown[] },
    ): Promise<void> {
        if (!this._view) return;

        const { query, attachedMemories } = this.parseChatInput(queryData);
        const attachedMemoryIds = Array.from(
            new Set(attachedMemories.map((m) => m.id).filter(Boolean)),
        );

        try {
            this._view.webview.postMessage({ type: 'chatLoading', data: true });

            const attachedContext = this.buildAttachedContext(attachedMemories);

            // Primary path: ask the AI router for a synthesized answer.
            try {
                const synthesized = await this.queryAIRouter(query, attachedContext);

                let searchResults: Array<{ title: string; content: string }> = [];
                try {
                    searchResults = await (this.memoryService as any).searchMemories(query);
                } catch (searchError) {
                    console.warn(
                        '[MemorySidebarProvider] Memory search failed (chat answer unaffected):',
                        this.safeErrorMessage(searchError),
                    );
                }

                this.postChatResponse(query, synthesized, searchResults, attachedMemoryIds);
            } catch (routerError) {
                await this.handleAIRouterFailure(query, attachedContext, attachedMemoryIds, routerError);
            }
        } catch (error) {
            this._view.webview.postMessage({
                type: 'chatError',
                data: `Failed to process query: ${this.safeErrorMessage(error)}`,
            });
        } finally {
            this._view.webview.postMessage({ type: 'chatLoading', data: false });
        }
    }

    private buildAttachedContext(
        attachedMemories: Array<{ id: string; title: string; content: string }>,
    ): string {
        if (attachedMemories.length === 0) return '';
        return (
            '\n\n## Attached Context:\n' +
            attachedMemories
                .map(
                    (m, i) =>
                        `**${i + 1}. ${m.title}**\n${m.content.substring(0, 500)}${m.content.length > 500 ? '...' : ''}`,
                )
                .join('\n\n')
        );
    }

    private getAIRouterUrl(): string {
        const config = vscode.workspace.getConfiguration('lanonasis');
        const configured = config.get<string>('aiRouterUrl', 'https://ai.vortexcore.app');
        const url = (configured || 'https://ai.vortexcore.app').trim().replace(/\/+$/, '');
        return url || 'https://ai.vortexcore.app';
    }

    private async resolveRouterCredential(): Promise<string | null> {
        return resolveRouterCredential(this._credentialService);
    }

    private async queryAIRouter(query: string, attachedContext: string): Promise<string> {
        const token = await this.resolveRouterCredential();
        if (!token) {
            throw new Error('No stored credentials — falling back to memory search.');
        }

        const router = new AIRouterClient({
            baseUrl: this.getAIRouterUrl(),
            authToken: token,
            defaultUseCase: 'memory-analysis',
        });

        const userContent = attachedContext ? `${query}\n\n${attachedContext}` : query;

        try {
            const result = await router.chat({
                messages: [{ role: 'user', content: userContent }],
                use_case: 'memory-analysis',
            });
            return result.message.content;
        } catch (err) {
            if (err instanceof AIRouterTimeoutError) {
                throw new Error('AI router unreachable: request timed out.');
            }
            if (err instanceof AIRouterRateLimitError) {
                throw err;
            }
            throw new Error(`AI router request failed: ${this.safeErrorMessage(err)}`);
        }
    }

    private async handleAIRouterFailure(
        query: string,
        attachedContext: string,
        attachedMemoryIds: string[],
        routerError: unknown,
    ): Promise<void> {
        let searchResults: Array<{ title: string; content: string }>;
        try {
            searchResults = await (this.memoryService as any).searchMemories(query);
        } catch (searchError) {
            this._view?.webview.postMessage({
                type: 'chatError',
                data: `Failed to process query: ${this.safeErrorMessage(searchError)}`,
            });
            return;
        }

        let response = this.formatChatResponse(query, searchResults, attachedContext);

        if (routerError instanceof AIRouterRateLimitError) {
            const seconds = (routerError as AIRouterRateLimitError).retryAfterSeconds;
            const waitHint =
                typeof seconds === 'number' && Number.isFinite(seconds)
                    ? ` in ~${seconds}s`
                    : ' shortly';
            response = `⏳ **Rate limit reached** — the AI assistant is busy. Please try again${waitHint}.\n\nMeanwhile, here's what I found in your memories:\n\n${response}`;
        } else {
            console.warn(
                '[MemorySidebarProvider] AI router unavailable, using memory search fallback:',
                this.safeErrorMessage(routerError),
            );
        }

        this.postChatResponse(query, response, searchResults, attachedMemoryIds);
    }

    private postChatResponse(
        query: string,
        response: string,
        searchResults: Array<{ title: string; content: string }>,
        attachedMemoryIds: string[],
    ): void {
        this._view?.webview.postMessage({
            type: 'chatResponse',
            data: { query, response, memories: searchResults.slice(0, 5), attachedMemoryIds },
        });
    }

    private formatChatResponse(
        query: string,
        memories: Array<{ title: string; content: string }>,
        attachedContext?: string,
    ): string {
        let response = '';
        if (attachedContext) {
            response += `📎 **Using your attached context:**\n${attachedContext}\n\n---\n\n`;
        }
        if (memories.length === 0 && !attachedContext) {
            return `I couldn't find any memories related to "${query}". Would you like me to help you create one?`;
        }
        if (memories.length === 0 && attachedContext) {
            return `Based on your attached context, I can help with "${query}".\n\nNo additional related memories were found.`;
        }

        const top = memories[0];
        response += `Found **${memories.length}** relevant ${memories.length > 1 ? 'memories' : 'memory'} for "${query}":\n\n`;
        response += `**Most relevant:** ${top.title}\n${top.content.substring(0, 300)}${top.content.length > 300 ? '...' : ''}\n\n`;
        if (memories.length > 1) {
            response += '**Other related memories:**\n';
            memories.slice(1, 4).forEach((mem, idx) => {
                response += `${idx + 2}. ${mem.title}\n`;
            });
        }
        return response;
    }

    private safeErrorMessage(error: unknown): string {
        return error instanceof Error ? error.message : String(error);
    }

    // ──────────────────────────────────────────────────
    // Webview HTML
    // ──────────────────────────────────────────────────

    private _getHtmlForWebview(webview: vscode.Webview) {
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'sidebar.css'));
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'sidebar.js'));
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

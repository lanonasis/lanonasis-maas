import * as vscode from 'vscode';
import type { IMemoryService, IEnhancedMemoryService } from '../services/IMemoryService';
import type { ApiKeyService } from '../services/ApiKeyService';
import { PrototypeUIBridge } from '../bridges/PrototypeUIBridge';
import type { MemoryCacheBridge } from '../bridges/MemoryCacheBridge';
import type { OnboardingService, OnboardingStepId } from '../services/OnboardingService';
import type { OfflineService } from '../services/OfflineService';
import type { OfflineQueueService } from '../services/OfflineQueueService';

interface ApiKeyRecord {
    id?: string;
    keyId?: string;
    name?: string;
    scope?: string;
    accessLevel?: string;
    keyType?: string;
    lastUsed?: string | Date;
    lastUsedAt?: string | Date;
    createdAt?: string | Date;
}

export class EnhancedSidebarProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'lanonasis.sidebar';
    private _view?: vscode.WebviewView;
    private _bridge: PrototypeUIBridge;
    private _apiKeyService?: ApiKeyService;
    private readonly cacheBridge?: MemoryCacheBridge;
    private readonly onboardingService?: OnboardingService;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly memoryService: IMemoryService,
        apiKeyService?: ApiKeyService,
        cacheBridge?: MemoryCacheBridge,
        onboardingService?: OnboardingService,
        private readonly offlineService?: OfflineService,
        private readonly offlineQueue?: OfflineQueueService,
    ) {
        this._bridge = new PrototypeUIBridge(memoryService, cacheBridge);
        this._apiKeyService = apiKeyService;
        this.cacheBridge = cacheBridge;
        this.onboardingService = onboardingService;
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
                case 'getOnboardingState':
                    await this.sendOnboardingState();
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
                case 'updateMemory':
                    await this.handleUpdateMemory(data.data as { id: string; updates: Record<string, unknown> });
                    break;
                case 'deleteMemory':
                    await this.handleDeleteMemory(data.data as string);
                    break;
                case 'chatQuery':
                    await this.handleChatQuery(data.data as string | { query: string; attachedMemories?: Array<{ id: string; title: string; content: string }> });
                    break;
                case 'pasteFromClipboard':
                    await this.handlePasteFromClipboard();
                    break;
                case 'copyToClipboard':
                    await this.handleCopyToClipboard(data.data as string);
                    break;
                case 'executeCommand':
                    await vscode.commands.executeCommand(data.data as string);
                    break;
                case 'completeOnboardingStep':
                    await this.handleCompleteOnboardingStep(data.data as { step: OnboardingStepId });
                    break;
                case 'skipOnboarding':
                    await this.handleSkipOnboarding();
                    break;
                case 'resetOnboarding':
                    await this.handleResetOnboarding();
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
                case 'getSidebarPreferences':
                    await this.sendSidebarPreferences();
                    break;
                case 'updateSidebarPreferences':
                    await this.handleUpdateSidebarPreferences(data.data as {
                        typeOrder?: string[];
                        hiddenTypes?: string[];
                        theme?: string;
                    });
                    break;
                case 'getConnectionStatus':
                    await this.sendConnectionStatus();
                    break;
                case 'captureClipboard':
                    await this.handleCaptureClipboard();
                    break;
                case 'saveAsMemory':
                    await this.handleSaveAsMemory(data.data as { content: string; title?: string });
                    break;
                case 'getClipboardContent':
                    await this.handleGetClipboardContent();
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
            // Add timeout to prevent hanging
            const authPromise = this._bridge.isAuthenticated();
            const timeoutPromise = new Promise<boolean>((_, reject) =>
                setTimeout(() => reject(new Error('Auth check timeout')), 5000)
            );

            const isAuthenticated = await Promise.race([authPromise, timeoutPromise]);
            let user: { id?: string; name?: string; email?: string } | null = null;

            if (isAuthenticated && this._apiKeyService) {
                try {
                    user = await this._apiKeyService.getUserInfo();
                } catch (error) {
                    console.warn('[EnhancedSidebarProvider] Failed to fetch user profile:', error);
                }
            }

            this._view?.webview.postMessage({
                type: 'authState',
                data: { authenticated: isAuthenticated, user }
            });
        } catch (error) {
            console.warn('[EnhancedSidebarProvider] Auth check failed:', error);
            this._view?.webview.postMessage({
                type: 'authState',
                data: { authenticated: false, user: null, error: 'Failed to check authentication state' }
            });
        }
    }

    public async sendOnboardingState(): Promise<void> {
        if (!this.onboardingService) {
            return;
        }

        const status = await this.onboardingService.getStatus();
        this._view?.webview.postMessage({
            type: 'onboardingState',
            data: status
        });
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
            this._view?.webview.postMessage({
                type: 'authLoading',
                data: true
            });
            // Trigger authentication through VS Code commands with mode
            await vscode.commands.executeCommand('lanonasis.authenticate', mode);
            // Wait a bit for auth to complete, then refresh state
            setTimeout(async () => {
                await this.sendAuthState();
                await this.sendMemories();
                this._view?.webview.postMessage({
                    type: 'authLoading',
                    data: false
                });
            }, 1000);
        } catch (error) {
            this._view?.webview.postMessage({
                type: 'error',
                data: 'Authentication failed: ' + (error instanceof Error ? error.message : String(error))
            });
            this._view?.webview.postMessage({
                type: 'authLoading',
                data: false
            });
        }
    }

    private async handleCompleteOnboardingStep(payload: { step: OnboardingStepId }): Promise<void> {
        if (!this.onboardingService) {
            return;
        }

        await this.onboardingService.markStepComplete(payload.step);
        await this.sendOnboardingState();
    }

    private async handleSkipOnboarding(): Promise<void> {
        if (!this.onboardingService) {
            return;
        }

        await this.onboardingService.skip();
        await this.sendOnboardingState();
    }

    private async handleResetOnboarding(): Promise<void> {
        if (!this.onboardingService) {
            return;
        }

        await this.onboardingService.reset();
        await this.sendOnboardingState();
    }

    private async updateOnboardingStep(step: OnboardingStepId): Promise<void> {
        if (!this.onboardingService) {
            return;
        }

        try {
            await this.onboardingService.markStepComplete(step);
            await this.sendOnboardingState();
        } catch (error) {
            console.warn('[EnhancedSidebarProvider] Failed to update onboarding step:', error);
        }
    }

    private async handleChatQuery(queryData: string | { query: string; attachedMemories?: Array<{ id: string; title: string; content: string }> }): Promise<void> {
        if (!this._view) return;

        // Support both string and object format
        const query = typeof queryData === 'string' ? queryData : queryData.query;
        const attachedMemories = typeof queryData === 'object' && queryData.attachedMemories ? queryData.attachedMemories : [];

        try {
            // Send loading state
            this._view.webview.postMessage({
                type: 'chatLoading',
                data: true
            });

            // Build attached context from provided memories (content included from frontend)
            let attachedContext = '';
            if (attachedMemories.length > 0) {
                attachedContext = '\n\n## Attached Context:\n' +
                    attachedMemories.map((m, i) =>
                        `**${i + 1}. ${m.title}**\n${m.content.substring(0, 500)}${m.content.length > 500 ? '...' : ''}`
                    ).join('\n\n');
            }

            // Use semantic search to find additional relevant memories
            const searchResults = await this._bridge.searchMemories(query);

            // Combine attached and searched memories (dedupe by id)
            const attachedMemoryIds = attachedMemories.map(m => m.id);

            // Format results as a chat response
            const response = this.formatChatResponse(query, searchResults, attachedContext);

            this._view.webview.postMessage({
                type: 'chatResponse',
                data: {
                    query,
                    response,
                    memories: searchResults.slice(0, 5), // Include top 5 relevant memories
                    attachedMemoryIds
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

    private formatChatResponse(
        query: string,
        memories: Array<{ title: string; content: string }>,
        attachedContext?: string
    ): string {
        let response = '';

        // Include attached context first if provided
        if (attachedContext) {
            response += `📎 **Using your attached context:**\n${attachedContext}\n\n---\n\n`;
        }

        if (memories.length === 0 && !attachedContext) {
            return `I couldn't find any memories related to "${query}". Would you like me to help you create one?`;
        }

        if (memories.length === 0 && attachedContext) {
            response += `Based on your attached context, I can help with "${query}".\n\n`;
            response += `No additional related memories were found in your memory bank.`;
            return response;
        }

        const topMemory = memories[0];
        response += `Found **${memories.length}** relevant ${memories.length > 1 ? 'memories' : 'memory'} for "${query}":\n\n`;
        response += `**Most relevant:** ${topMemory.title}\n`;
        response += `${topMemory.content.substring(0, 300)}${topMemory.content.length > 300 ? '...' : ''}\n\n`;

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
            let apiKeys: ApiKeyRecord[] = [];

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

    private async handleCaptureClipboard(): Promise<void> {
        try {
            // Get content from clipboard
            const clipboardContent = await vscode.env.clipboard.readText();

            if (!clipboardContent.trim()) {
                this._view?.webview.postMessage({
                    type: 'clipboardError',
                    data: 'Clipboard is empty'
                });
                return;
            }

            // Show quick input to create memory from clipboard
            const title = await vscode.window.showInputBox({
                prompt: 'Title for this memory',
                placeHolder: 'Enter a title...',
                value: clipboardContent.substring(0, 50).replace(/\n/g, ' ')
            });

            if (title) {
                const memory = await this._bridge.createMemory({
                    title,
                    content: clipboardContent,
                    memory_type: 'context',
                    tags: ['clipboard', 'captured']
                });

                this._view?.webview.postMessage({
                    type: 'memoryCaptured',
                    data: memory
                });

                vscode.window.showInformationMessage('📝 Memory captured from clipboard!');

                // Refresh memories list
                await this.sendMemories();
            }
        } catch (error) {
            this._view?.webview.postMessage({
                type: 'clipboardError',
                data: 'Failed to capture clipboard: ' + (error instanceof Error ? error.message : String(error))
            });
        }
    }

    private async handleGetClipboardContent(): Promise<void> {
        try {
            const clipboardContent = await vscode.env.clipboard.readText();
            this._view?.webview.postMessage({
                type: 'clipboardContent',
                data: clipboardContent
            });
        } catch (error) {
            this._view?.webview.postMessage({
                type: 'clipboardError',
                data: 'Failed to read clipboard: ' + (error instanceof Error ? error.message : String(error))
            });
        }
    }

    private async handlePasteFromClipboard(): Promise<void> {
        try {
            const clipboardContent = await vscode.env.clipboard.readText();
            if (!clipboardContent || !clipboardContent.trim()) {
                vscode.window.showWarningMessage('Clipboard is empty');
                return;
            }

            // Send clipboard content to webview
            this._view?.webview.postMessage({
                type: 'clipboardContent',
                data: clipboardContent
            });

            // Also show info message
            vscode.window.showInformationMessage(
                `Clipboard content ready (${clipboardContent.length} chars)`,
                'Create Memory'
            ).then(action => {
                if (action === 'Create Memory') {
                    vscode.commands.executeCommand('lanonasis.captureClipboard');
                }
            });
        } catch (error) {
            this._view?.webview.postMessage({
                type: 'error',
                data: 'Failed to read clipboard: ' + (error instanceof Error ? error.message : String(error))
            });
        }
    }

    private async handleCopyToClipboard(text: string): Promise<void> {
        try {
            if (!text) {
                vscode.window.showWarningMessage('Nothing to copy');
                return;
            }

            await vscode.env.clipboard.writeText(text);

            this._view?.webview.postMessage({
                type: 'copySuccess',
                data: true
            });

            // Show brief confirmation
            vscode.window.setStatusBarMessage('📋 Copied to clipboard', 2000);
        } catch (error) {
            this._view?.webview.postMessage({
                type: 'error',
                data: 'Failed to copy: ' + (error instanceof Error ? error.message : String(error))
            });
        }
    }

    private async handleSaveAsMemory(data: { content: string; title?: string }): Promise<void> {
        try {
            // Generate title from content if not provided
            const defaultTitle = data.content.substring(0, 50).replace(/\n/g, ' ').trim();

            // Show quick input for title
            const title = await vscode.window.showInputBox({
                prompt: 'Title for this memory',
                placeHolder: 'Enter a title...',
                value: data.title || defaultTitle
            });

            if (!title) return; // User cancelled

            // Show quick pick for memory type
            const memoryType = await vscode.window.showQuickPick(
                ['context', 'knowledge', 'reference', 'project', 'personal', 'workflow'],
                {
                    placeHolder: 'Select memory type',
                    title: 'Memory Type'
                }
            ) as 'context' | 'knowledge' | 'reference' | 'project' | 'personal' | 'workflow' | undefined;

            if (!memoryType) return; // User cancelled

            // Create the memory
            const memory = await this._bridge.createMemory({
                title,
                content: data.content,
                memory_type: memoryType,
                tags: ['chat-response', 'ai-generated']
            });

            this._view?.webview.postMessage({
                type: 'memorySaved',
                data: memory
            });

            vscode.window.showInformationMessage(`💾 Saved as memory: "${title}"`);

            // Refresh memories list
            await this.sendMemories();
            await this.updateOnboardingStep('create_memory');
        } catch (error) {
            this._view?.webview.postMessage({
                type: 'error',
                data: 'Failed to save memory: ' + (error instanceof Error ? error.message : String(error))
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
                memory_type: (memoryData.memory_type as 'context' | 'knowledge' | 'project' | 'reference' | 'personal' | 'workflow') || 'context',
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
            await this.updateOnboardingStep('create_memory');
        } catch (error) {
            this._view?.webview.postMessage({
                type: 'error',
                data: 'Failed to create memory: ' + (error instanceof Error ? error.message : String(error))
            });
        }
    }

    private async handleUpdateMemory(payload: { id: string; updates: Record<string, unknown> }) {
        try {
            const { id, updates } = payload;
            if (!id) {
                throw new Error('Missing memory id');
            }
            const updated = await this._bridge.updateMemory(id, updates);
            this._view?.webview.postMessage({
                type: 'memoryUpdated',
                data: updated
            });
            await this.sendMemories();
        } catch (error) {
            this._view?.webview.postMessage({
                type: 'error',
                data: 'Failed to update memory: ' + (error instanceof Error ? error.message : String(error))
            });
        }
    }

    private async handleDeleteMemory(memoryId: string) {
        try {
            if (!memoryId) {
                throw new Error('Missing memory id');
            }
            await this._bridge.deleteMemory(memoryId);
            this._view?.webview.postMessage({
                type: 'memoryDeleted',
                data: { id: memoryId }
            });
            await this.sendMemories();
        } catch (error) {
            this._view?.webview.postMessage({
                type: 'error',
                data: 'Failed to delete memory: ' + (error instanceof Error ? error.message : String(error))
            });
        }
    }

    private async sendSidebarPreferences(): Promise<void> {
        const config = vscode.workspace.getConfiguration('lanonasis');
        const typeOrder = config.get<string[]>('sidebarTypeOrder', []);
        const hiddenTypes = config.get<string[]>('sidebarHiddenTypes', []);
        const theme = config.get<string>('sidebarTheme', 'default');

        this._view?.webview.postMessage({
            type: 'sidebarPreferences',
            data: { typeOrder, hiddenTypes, theme }
        });
    }

    private async handleUpdateSidebarPreferences(preferences: {
        typeOrder?: string[];
        hiddenTypes?: string[];
        theme?: string;
    }): Promise<void> {
        const config = vscode.workspace.getConfiguration('lanonasis');

        if (preferences.typeOrder) {
            await config.update('sidebarTypeOrder', preferences.typeOrder, vscode.ConfigurationTarget.Global);
        }
        if (preferences.hiddenTypes) {
            await config.update('sidebarHiddenTypes', preferences.hiddenTypes, vscode.ConfigurationTarget.Global);
        }
        if (preferences.theme) {
            await config.update('sidebarTheme', preferences.theme, vscode.ConfigurationTarget.Global);
        }

        await this.sendSidebarPreferences();
    }

    private async sendConnectionStatus(): Promise<void> {
        const capabilities = this.isEnhancedService(this.memoryService)
            ? this.memoryService.getCapabilities()
            : null;
        const cacheStatus = this.cacheBridge?.getStatus() ?? null;
        const authenticated = capabilities?.authenticated ?? this.memoryService.isAuthenticated();
        const connectionMode = capabilities?.cliAvailable ? 'cli' : 'http';
        const offlineStatus = this.offlineService?.getStatus() ?? null;
        const queueStatus = this.offlineQueue?.getStatus() ?? null;

        this._view?.webview.postMessage({
            type: 'connectionStatus',
            data: {
                authenticated,
                connectionMode,
                capabilities,
                cacheStatus,
                offline: offlineStatus ? !offlineStatus.online : undefined,
                queueStatus
            }
        });
    }

    private isEnhancedService(service: IMemoryService): service is IEnhancedMemoryService {
        return typeof (service as IEnhancedMemoryService).getCapabilities === 'function';
    }

    private async sendMemories() {
        // Send loading state first
        this._view?.webview.postMessage({
            type: 'loading',
            data: true
        });

        try {
            // Add timeout to prevent infinite loading
            const memoriesPromise = this._bridge.getAllMemories();
            const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('Memory fetch timeout')), 10000)
            );

            const memories = await Promise.race([memoriesPromise, timeoutPromise]);

            this._view?.webview.postMessage({
                type: 'memories',
                data: memories
            });
        } catch (error) {
            console.warn('[EnhancedSidebarProvider] Failed to fetch memories:', error);
            // Send empty array so UI shows empty state instead of spinning
            this._view?.webview.postMessage({
                type: 'memories',
                data: []
            });
            // Also send specific error message
            this._view?.webview.postMessage({
                type: 'error',
                data: error instanceof Error ? error.message : 'Failed to load memories'
            });
        } finally {
            // Always clear loading state
            this._view?.webview.postMessage({
                type: 'loading',
                data: false
            });
            await this.sendConnectionStatus();
        }
    }

    private async handleSearch(query: string) {
        // Send loading state first
        this._view?.webview.postMessage({
            type: 'loading',
            data: true
        });

        try {
            // Add timeout for search
            const searchPromise = this._bridge.searchMemories(query);
            const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('Search timeout')), 10000)
            );

            const results = await Promise.race([searchPromise, timeoutPromise]);

            this._view?.webview.postMessage({
                type: 'memories',
                data: results
            });
            await this.updateOnboardingStep('search');
        } catch (error) {
            console.warn('[EnhancedSidebarProvider] Search failed:', error);
            this._view?.webview.postMessage({
                type: 'memories',
                data: []
            });
            this._view?.webview.postMessage({
                type: 'error',
                data: `Search failed: ${error instanceof Error ? error.message : String(error)}`
            });
        } finally {
            // Always clear loading state
            this._view?.webview.postMessage({
                type: 'loading',
                data: false
            });
            await this.sendConnectionStatus();
        }
    }

    private async sendInitialData() {
        console.log('[EnhancedSidebarProvider] Sending initial data...');

        try {
            // First check auth state - this determines if we should fetch memories
            await this.sendAuthState();
            await this.sendOnboardingState();
            await this.sendSidebarPreferences();
            await this.sendConnectionStatus();

            // Only fetch memories if we might be authenticated
            // The bridge will handle unauthenticated state gracefully
            await this.sendMemories();

            console.log('[EnhancedSidebarProvider] Initial data sent successfully');
        } catch (error) {
            console.error('[EnhancedSidebarProvider] Failed to send initial data:', error);
            // Ensure UI doesn't hang
            this._view?.webview.postMessage({
                type: 'loading',
                data: false
            });
            this._view?.webview.postMessage({
                type: 'error',
                data: 'Failed to initialize. Please refresh or re-authenticate.'
            });
        }
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
            <script nonce="${nonce}">
                window.addEventListener('error', (event) => {
                    console.error('Uncaught error:', event.error);
                    window.vscode.postMessage({
                        type: 'reactError',
                        error: event.error.message,
                        stack: event.error.stack
                    });
                });
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

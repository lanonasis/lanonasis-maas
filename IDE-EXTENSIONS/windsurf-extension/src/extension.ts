import * as vscode from 'vscode';
import { MemoryTreeProvider } from './providers/MemoryTreeProvider';
import { MemoryCompletionProvider } from './providers/MemoryCompletionProvider';
import { ApiKeyTreeProvider } from './providers/ApiKeyTreeProvider';
import { MemorySidebarProvider } from './panels/MemorySidebarProvider';
import { MemoryService } from './services/MemoryService';
import { ApiKeyService } from './services/ApiKeyService';
import { WindsurfAiAssistant } from './utils/WindsurfAiAssistant';
import { AuthenticationService } from './auth/AuthenticationService';
import { MemoryType } from './types/memory';
import {
    createWindsurfAdapter,
    SecureApiKeyService,
} from '@lanonasis/ide-extension-core';

export async function activate(context: vscode.ExtensionContext) {
    console.log('Lanonasis Memory Extension for Windsurf is now active');

    const extensionVersion = '1.4.5';
    const outputChannel = vscode.window.createOutputChannel('LanOnasis');
    const adapter = createWindsurfAdapter(
        { context, outputChannel, vscode },
        {
            ideName: 'Windsurf',
            extensionName: 'lanonasis-memory-windsurf',
            extensionDisplayName: 'LanOnasis Memory Assistant',
            commandPrefix: 'lanonasis',
            userAgent: `Windsurf/${vscode.version} LanOnasis-Memory/${extensionVersion}`,
        },
    );

    // Initialize authentication service with shared core (OAuth + API key + secure storage)
    const secureAuthService = new SecureApiKeyService(adapter);
    const authService = new AuthenticationService(adapter, secureAuthService);
    await authService.initialize();

    // Initialize services
    const memoryService = new MemoryService(authService);
    const apiKeyService = new ApiKeyService();

    // Initialize Windsurf AI Assistant
    const aiAssistant = new WindsurfAiAssistant(memoryService);

    // Initialize sidebar provider (modern UI) with its secure router credential source.
    const sidebarProvider = new MemorySidebarProvider(context.extensionUri, memoryService as any);
    sidebarProvider.setCredentialService(secureAuthService);

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            MemorySidebarProvider.viewType,
            sidebarProvider,
        ),
    );

    // Initialize tree providers (optional legacy view)
    const memoryTreeProvider = new MemoryTreeProvider(memoryService, authService);
    const apiKeyTreeProvider = new ApiKeyTreeProvider(apiKeyService);
    vscode.window.registerTreeDataProvider('lanonasisMemories', memoryTreeProvider);
    vscode.window.registerTreeDataProvider('lanonasisApiKeys', apiKeyTreeProvider);

    // Initialize completion provider with Windsurf context awareness
    const completionProvider = new MemoryCompletionProvider(memoryService);
    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider(
            { scheme: 'file' },
            completionProvider,
            '@', '#', '//', '/*', '/**',
        ),
    );

    // Set context variables
    vscode.commands.executeCommand('setContext', 'lanonasis.enabled', true);

    // Check authentication status with auto-refresh
    checkAuthenticationStatusWithAutoRefresh(authService, memoryTreeProvider);

    // Register commands
    const commands = [
        vscode.commands.registerCommand('lanonasis.searchMemory', async () => {
            await searchMemories(memoryService, authService);
        }),

        vscode.commands.registerCommand('lanonasis.createMemory', async () => {
            await createMemoryFromSelection(memoryService, authService);
        }),

        vscode.commands.registerCommand('lanonasis.createMemoryFromFile', async () => {
            await createMemoryFromFile(memoryService, authService);
        }),

        vscode.commands.registerCommand('lanonasis.createMemoryFromWorkspace', async () => {
            await createMemoryFromWorkspace(memoryService, authService);
        }),

        vscode.commands.registerCommand('lanonasis.captureContext', async () => {
            await captureContextToMemory(memoryService, authService);
        }),

        vscode.commands.registerCommand('lanonasis.captureClipboard', async () => {
            await captureClipboardToMemory(memoryService, authService);
        }),

        vscode.commands.registerCommand('lanonasis.quickCapture', async () => {
            const editor = vscode.window.activeTextEditor;
            if (editor && !editor.selection.isEmpty) {
                await captureContextToMemory(memoryService, authService);
            } else {
                await captureClipboardToMemory(memoryService, authService);
            }
        }),

        vscode.commands.registerCommand('lanonasis.authenticate', async () => {
            await authenticate(authService, memoryTreeProvider);
        }),

        vscode.commands.registerCommand('lanonasis.logout', async () => {
            await logout(authService, memoryTreeProvider);
        }),

        vscode.commands.registerCommand('lanonasis.refreshMemories', async () => {
            memoryTreeProvider.refresh();
        }),

        vscode.commands.registerCommand('lanonasis.openMemory', (memory: any) => {
            openMemoryInEditor(memory);
        }),

        vscode.commands.registerCommand('lanonasis.switchMode', async () => {
            await switchConnectionMode(memoryService);
        }),

        vscode.commands.registerCommand('lanonasis.aiAssist', async () => {
            await aiAssist(aiAssistant, authService);
        }),

        // API Key Management Commands
        vscode.commands.registerCommand('lanonasis.manageApiKeys', async () => {
            await manageApiKeys(apiKeyService);
        }),

        vscode.commands.registerCommand('lanonasis.createProject', async () => {
            await createProject(apiKeyService, apiKeyTreeProvider);
        }),

        vscode.commands.registerCommand('lanonasis.viewProjects', async () => {
            await viewProjects(apiKeyService);
        }),

        vscode.commands.registerCommand('lanonasis.refreshApiKeys', async () => {
            apiKeyTreeProvider.refresh();
        }),
    ];

    context.subscriptions.push(...commands);

    // Auto-refresh memories periodically
    const config = vscode.workspace.getConfiguration('lanonasis');
    const refreshInterval = config.get<number>('autoRefreshInterval', 300000); // 5 minutes default

    const refreshTimer = setInterval(() => {
        authService.checkAuthenticationStatus().then(
            (isAuthed) => {
                if (isAuthed) {
                    memoryTreeProvider.refresh();
                }
            },
            () => undefined,
        );
    }, refreshInterval);

    context.subscriptions.push({ dispose: () => clearInterval(refreshTimer) });

    // Windsurf-specific workspace context monitoring
    if (config.get<boolean>('windsurf.enableContextAwareness', true)) {
        initializeWindsurfContextAwareness(context, memoryService, authService);
    }

    // Show welcome message if first time
    const isFirstTime = context.globalState.get('lanonasis.firstTime', true);
    if (isFirstTime) {
        showWelcomeMessage(authService);
        context.globalState.update('lanonasis.firstTime', false);
    }
}

async function checkAuthenticationStatusWithAutoRefresh(
    authService: AuthenticationService,
    memoryTreeProvider: MemoryTreeProvider,
) {
    const isAuthenticated = await authService.checkAuthenticationStatus();
    vscode.commands.executeCommand('setContext', 'lanonasis.authenticated', isAuthenticated);

    if (!isAuthenticated) {
        const config = vscode.workspace.getConfiguration('lanonasis');
        const useAutoAuth = config.get<boolean>('useAutoAuth', true);

        if (useAutoAuth) {
            const result = await vscode.window.showInformationMessage(
                'Lanonasis Memory: Authentication required. Use auto-login with browser?',
                'Auto Login', 'Manual Setup', 'Later',
            );

            if (result === 'Auto Login') {
                await authenticate(authService, memoryTreeProvider);
            } else if (result === 'Manual Setup') {
                vscode.commands.executeCommand('workbench.action.openSettings', 'lanonasis');
            }
        } else {
            const result = await vscode.window.showInformationMessage(
                'Lanonasis Memory: No authentication configured. Set up now?',
                'Configure', 'Later',
            );

            if (result === 'Configure') {
                await authenticate(authService, memoryTreeProvider);
            }
        }
    } else {
        memoryTreeProvider.refresh();
    }
}

async function searchMemories(memoryService: MemoryService, authService: AuthenticationService) {
    if (!await ensureAuthenticated(authService)) return;

    const query = await vscode.window.showInputBox({
        prompt: 'Search memories',
        placeHolder: 'Enter search query...',
    });

    if (!query) return;

    try {
        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: 'Searching memories...',
                cancellable: false,
            },
            async () => {
                const results = await memoryService.searchMemories({
                    query,
                    limit: vscode.workspace.getConfiguration('lanonasis').get<number>('searchLimit', 10),
                    threshold: 0.7,
                });

                if (results.length === 0) {
                    vscode.window.showInformationMessage('No memories found for your query');
                    return;
                }

                const items = results.map((memory) => ({
                    label: memory.title,
                    description: `${memory.memory_type} • Score: ${(memory.relevance_score * 100).toFixed(1)}%`,
                    detail: memory.content.substring(0, 100) + (memory.content.length > 100 ? '...' : ''),
                    memory,
                }));

                const selected = await vscode.window.showQuickPick(items, {
                    placeHolder: `Found ${results.length} memory(ies) - Select to open`,
                    ignoreFocusOut: true,
                    matchOnDescription: true,
                    matchOnDetail: true,
                });

                if (selected) {
                    openMemoryInEditor(selected.memory);
                }
            },
        );
    } catch (error) {
        handleError('Failed to search memories', error);
    }
}

async function createMemoryFromSelection(memoryService: MemoryService, authService: AuthenticationService) {
    if (!await ensureAuthenticated(authService)) return;

    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showWarningMessage('No active editor');
        return;
    }

    const selection = editor.selection;
    const selectedText = editor.document.getText(selection);

    if (!selectedText.trim()) {
        vscode.window.showWarningMessage('No text selected');
        return;
    }

    const fileName = editor.document.fileName.split('/').pop() || 'untitled';
    const lineNumber = selection.start.line + 1;

    const title = await vscode.window.showInputBox({
        prompt: 'Memory title',
        value: `Code from ${fileName}:${lineNumber}`,
    });

    if (!title) return;

    const config = vscode.workspace.getConfiguration('lanonasis');
    const defaultType = config.get<string>('defaultMemoryType', 'context');

    try {
        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: 'Creating memory...',
                cancellable: false,
            },
            async () => {
                await memoryService.createMemory({
                    title,
                    content: selectedText,
                    memory_type: defaultType as MemoryType,
                    tags: ['windsurf', 'selection', fileName.split('.').pop() || 'code'],
                    metadata: {
                        source: 'windsurf',
                        fileName,
                        lineNumber: lineNumber.toString(),
                        timestamp: new Date().toISOString(),
                        language: editor.document.languageId,
                    },
                });
            },
        );

        vscode.window.showInformationMessage(`Memory "${title}" created successfully`);
        vscode.commands.executeCommand('lanonasis.refreshMemories');
    } catch (error) {
        handleError('Failed to create memory', error);
    }
}

async function createMemoryFromFile(memoryService: MemoryService, authService: AuthenticationService) {
    if (!await ensureAuthenticated(authService)) return;

    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showWarningMessage('No active editor');
        return;
    }

    const content = editor.document.getText();
    const fileName = editor.document.fileName;
    const language = editor.document.languageId;

    const title = await vscode.window.showInputBox({
        prompt: 'Memory title',
        value: `File: ${fileName.split('/').pop()}`,
    });

    if (!title) return;

    const config = vscode.workspace.getConfiguration('lanonasis');
    const defaultType = config.get<string>('defaultMemoryType', 'context');

    try {
        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: 'Creating memory from file...',
                cancellable: false,
            },
            async () => {
                await memoryService.createMemory({
                    title,
                    content,
                    memory_type: defaultType as MemoryType,
                    tags: ['windsurf', 'file', language],
                    metadata: {
                        source: 'windsurf-file',
                        fileName,
                        fullPath: fileName,
                        timestamp: new Date().toISOString(),
                        language,
                        fileSize: content.length,
                    },
                });
            },
        );

        vscode.window.showInformationMessage(`Memory "${title}" created from file`);
        vscode.commands.executeCommand('lanonasis.refreshMemories');
    } catch (error) {
        handleError('Failed to create memory from file', error);
    }
}

async function createMemoryFromWorkspace(memoryService: MemoryService, authService: AuthenticationService) {
    if (!await ensureAuthenticated(authService)) return;

    if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
        vscode.window.showWarningMessage('No workspace folder open');
        return;
    }

    const workspaceFolder = vscode.workspace.workspaceFolders[0];
    const workspaceName = workspaceFolder.name;

    // Get workspace context
    const openFiles = vscode.workspace.textDocuments
        .filter((doc) => !doc.isUntitled && doc.uri.scheme === 'file')
        .map((doc) => doc.fileName);

    const workspaceContext = `Workspace: ${workspaceName}
Open files: ${openFiles.map((f) => f.split('/').pop()).join(', ')}
Path: ${workspaceFolder.uri.fsPath}`;

    const title = await vscode.window.showInputBox({
        prompt: 'Memory title',
        value: `Workspace: ${workspaceName}`,
    });

    if (!title) return;

    try {
        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: 'Creating workspace memory...',
                cancellable: false,
            },
            async () => {
                await memoryService.createMemory({
                    title,
                    content: workspaceContext,
                    memory_type: 'project' as MemoryType,
                    tags: ['windsurf', 'workspace', workspaceName],
                    metadata: {
                        source: 'windsurf-workspace',
                        workspaceName,
                        workspacePath: workspaceFolder.uri.fsPath,
                        openFiles: openFiles.length,
                        timestamp: new Date().toISOString(),
                    },
                });
            },
        );

        vscode.window.showInformationMessage(`Workspace memory "${title}" created`);
        vscode.commands.executeCommand('lanonasis.refreshMemories');
    } catch (error) {
        handleError('Failed to create workspace memory', error);
    }
}

async function captureContextToMemory(memoryService: MemoryService, authService: AuthenticationService) {
    if (!await ensureAuthenticated(authService)) return;

    try {
        let content: string | undefined;
        let source = 'selection';
        const editor = vscode.window.activeTextEditor;

        if (editor && !editor.selection.isEmpty) {
            content = editor.document.getText(editor.selection);
            source = 'editor';
        } else {
            content = await vscode.env.clipboard.readText();
            source = 'clipboard';
        }

        if (!content || !content.trim()) {
            vscode.window.showWarningMessage('No content to capture. Select text or copy something to clipboard first.');
            return;
        }

        const defaultTitle = content.substring(0, 50).replace(/\s+/g, ' ').trim();
        const title = await vscode.window.showInputBox({
            prompt: 'Title for this memory',
            placeHolder: 'Enter a title...',
            value: defaultTitle,
        });

        if (!title) return;

        const memoryType = await vscode.window.showQuickPick(
            ['context', 'knowledge', 'reference', 'project', 'personal', 'workflow'],
            {
                placeHolder: 'Select memory type',
                title: 'Memory Type',
                ignoreFocusOut: true,
            },
        ) as MemoryType | undefined;

        if (!memoryType) return;

        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: 'Creating memory...',
                cancellable: false,
            },
            async () => {
                await memoryService.createMemory({
                    title,
                    content,
                    memory_type: memoryType,
                    tags: ['windsurf', 'captured', source],
                    metadata: {
                        source,
                        capturedAt: new Date().toISOString(),
                        editor: editor?.document.fileName,
                        language: editor?.document.languageId,
                    },
                });
            },
        );

        vscode.window.showInformationMessage(`Memory "${title}" captured`);
        vscode.commands.executeCommand('lanonasis.refreshMemories');
    } catch (error) {
        handleError('Failed to capture context', error);
    }
}

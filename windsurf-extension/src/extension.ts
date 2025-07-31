import * as vscode from 'vscode';
import { MemoryTreeProvider } from './providers/MemoryTreeProvider';
import { MemoryCompletionProvider } from './providers/MemoryCompletionProvider';
import { MemoryService } from './services/MemoryService';
import { AuthenticationService } from './auth/AuthenticationService';
import { WindsurfAiAssistant } from './utils/WindsurfAiAssistant';
import { MemoryType } from './types/memory';

export function activate(context: vscode.ExtensionContext) {
    console.log('Lanonasis Memory Extension for Windsurf is now active');

    // Initialize authentication service with Windsurf-optimized settings
    const authService = new AuthenticationService(context);
    
    // Initialize memory service
    const memoryService = new MemoryService(authService);
    
    // Initialize Windsurf AI Assistant
    const aiAssistant = new WindsurfAiAssistant(memoryService);
    
    // Initialize tree provider
    const memoryTreeProvider = new MemoryTreeProvider(memoryService, authService);
    vscode.window.registerTreeDataProvider('lanonasisMemories', memoryTreeProvider);

    // Initialize completion provider with Windsurf context awareness
    const completionProvider = new MemoryCompletionProvider(memoryService);
    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider(
            { scheme: 'file' },
            completionProvider,
            '@', '#', '//', '/*', '/**'
        )
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
        })
    ];

    context.subscriptions.push(...commands);

    // Auto-refresh memories periodically
    const config = vscode.workspace.getConfiguration('lanonasis');
    const refreshInterval = config.get<number>('autoRefreshInterval', 300000); // 5 minutes default
    
    const refreshTimer = setInterval(() => {
        if (authService.isAuthenticated()) {
            memoryTreeProvider.refresh();
        }
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
    memoryTreeProvider: MemoryTreeProvider
) {
    const isAuthenticated = await authService.checkAuthenticationStatus();
    vscode.commands.executeCommand('setContext', 'lanonasis.authenticated', isAuthenticated);
    
    if (!isAuthenticated) {
        const config = vscode.workspace.getConfiguration('lanonasis');
        const useAutoAuth = config.get<boolean>('useAutoAuth', true);
        
        if (useAutoAuth) {
            const result = await vscode.window.showInformationMessage(
                'Lanonasis Memory: Authentication required. Use auto-login with browser?',
                'Auto Login', 'Manual Setup', 'Later'
            );
            
            if (result === 'Auto Login') {
                await authenticate(authService, memoryTreeProvider);
            } else if (result === 'Manual Setup') {
                vscode.commands.executeCommand('workbench.action.openSettings', 'lanonasis');
            }
        } else {
            const result = await vscode.window.showInformationMessage(
                'Lanonasis Memory: No authentication configured. Set up now?',
                'Configure', 'Later'
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
        placeHolder: 'Enter search query...'
    });

    if (!query) return;

    try {
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Searching memories...',
            cancellable: false
        }, async () => {
            const results = await memoryService.searchMemories({
                query,
                limit: vscode.workspace.getConfiguration('lanonasis').get<number>('searchLimit', 10),
                threshold: 0.7
            });

            if (results.length === 0) {
                vscode.window.showInformationMessage('No memories found for your query');
                return;
            }

            const items = results.map(memory => ({
                label: memory.title,
                description: `${memory.memory_type} • Score: ${(memory.relevance_score * 100).toFixed(1)}%`,
                detail: memory.content.substring(0, 100) + (memory.content.length > 100 ? '...' : ''),
                memory
            }));

            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: `Found ${results.length} memory(ies) - Select to open`,
                ignoreFocusOut: true,
                matchOnDescription: true,
                matchOnDetail: true
            });

            if (selected) {
                openMemoryInEditor(selected.memory);
            }
        });
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
        value: `Code from ${fileName}:${lineNumber}`
    });

    if (!title) return;

    const config = vscode.workspace.getConfiguration('lanonasis');
    const defaultType = config.get<string>('defaultMemoryType', 'context');

    try {
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Creating memory...',
            cancellable: false
        }, async () => {
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
                    language: editor.document.languageId
                }
            });
        });

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
        value: `File: ${fileName.split('/').pop()}`
    });

    if (!title) return;

    const config = vscode.workspace.getConfiguration('lanonasis');
    const defaultType = config.get<string>('defaultMemoryType', 'context');

    try {
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Creating memory from file...',
            cancellable: false
        }, async () => {
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
                    fileSize: content.length
                }
            });
        });

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
        .filter(doc => !doc.isUntitled && doc.uri.scheme === 'file')
        .map(doc => doc.fileName);

    const workspaceContext = `Workspace: ${workspaceName}
Open files: ${openFiles.map(f => f.split('/').pop()).join(', ')}
Path: ${workspaceFolder.uri.fsPath}`;

    const title = await vscode.window.showInputBox({
        prompt: 'Memory title',
        value: `Workspace: ${workspaceName}`
    });

    if (!title) return;

    try {
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Creating workspace memory...',
            cancellable: false
        }, async () => {
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
                    timestamp: new Date().toISOString()
                }
            });
        });

        vscode.window.showInformationMessage(`Workspace memory "${title}" created`);
        vscode.commands.executeCommand('lanonasis.refreshMemories');
    } catch (error) {
        handleError('Failed to create workspace memory', error);
    }
}

async function authenticate(authService: AuthenticationService, memoryTreeProvider: MemoryTreeProvider) {
    const config = vscode.workspace.getConfiguration('lanonasis');
    const useAutoAuth = config.get<boolean>('useAutoAuth', true);
    
    if (useAutoAuth) {
        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Authenticating with Lanonasis...',
                cancellable: true
            }, async (progress, token) => {
                progress.report({ message: 'Opening browser for authentication...' });
                
                const success = await authService.authenticateWithBrowser(token);
                
                if (success) {
                    vscode.commands.executeCommand('setContext', 'lanonasis.authenticated', true);
                    vscode.window.showInformationMessage('Successfully authenticated with Lanonasis Memory Service');
                    memoryTreeProvider.refresh();
                } else {
                    throw new Error('Authentication was cancelled or failed');
                }
            });
        } catch (error) {
            vscode.window.showErrorMessage(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    } else {
        const apiKey = await vscode.window.showInputBox({
            prompt: 'Enter your Lanonasis API Key',
            placeHolder: 'Get your API key from api.lanonasis.com',
            password: true,
            ignoreFocusOut: true
        });

        if (!apiKey) return;

        try {
            const success = await authService.authenticateWithApiKey(apiKey);
            
            if (success) {
                vscode.commands.executeCommand('setContext', 'lanonasis.authenticated', true);
                vscode.window.showInformationMessage('Successfully authenticated with Lanonasis Memory Service');
                memoryTreeProvider.refresh();
            }
        } catch (error) {
            handleError('Authentication failed', error);
        }
    }
}

async function logout(authService: AuthenticationService, memoryTreeProvider: MemoryTreeProvider) {
    const confirmed = await vscode.window.showWarningMessage(
        'Are you sure you want to logout from Lanonasis?',
        'Logout', 'Cancel'
    );
    
    if (confirmed === 'Logout') {
        await authService.logout();
        vscode.commands.executeCommand('setContext', 'lanonasis.authenticated', false);
        vscode.window.showInformationMessage('Logged out from Lanonasis Memory Service');
        memoryTreeProvider.refresh();
    }
}

async function aiAssist(aiAssistant: WindsurfAiAssistant, authService: AuthenticationService) {
    if (!await ensureAuthenticated(authService)) return;
    
    const config = vscode.workspace.getConfiguration('lanonasis');
    if (!config.get<boolean>('enableAiAssist', true)) {
        vscode.window.showInformationMessage('AI Assistant is disabled in settings');
        return;
    }

    await aiAssistant.showAssistantPanel();
}

async function ensureAuthenticated(authService: AuthenticationService): Promise<boolean> {
    if (await authService.checkAuthenticationStatus()) {
        return true;
    }
    
    vscode.window.showWarningMessage('Please authenticate with Lanonasis first', 'Authenticate')
        .then(choice => {
            if (choice === 'Authenticate') {
                vscode.commands.executeCommand('lanonasis.authenticate');
            }
        });
    
    return false;
}

function initializeWindsurfContextAwareness(
    context: vscode.ExtensionContext,
    memoryService: MemoryService,
    authService: AuthenticationService
) {
    // Monitor file changes for context awareness
    const fileWatcher = vscode.workspace.onDidChangeTextDocument(async (event) => {
        if (!await authService.checkAuthenticationStatus()) return;
        
        // Implement smart context tracking for Windsurf
        // This could include auto-suggesting relevant memories based on current work
    });
    
    context.subscriptions.push(fileWatcher);
}

function openMemoryInEditor(memory: any) {
    const content = `# ${memory.title}

**Type:** ${memory.memory_type}
**Created:** ${new Date(memory.created_at).toLocaleString()}
**Last Accessed:** ${memory.last_accessed ? new Date(memory.last_accessed).toLocaleString() : 'Never'}
**Tags:** ${memory.tags?.join(', ') || 'None'}
**Relevance:** ${memory.relevance_score ? (memory.relevance_score * 100).toFixed(1) + '%' : 'N/A'}

---

${memory.content}

---
*Opened via Lanonasis Memory Assistant for Windsurf*`;
    
    vscode.workspace.openTextDocument({
        content,
        language: 'markdown'
    }).then(doc => {
        vscode.window.showTextDocument(doc);
    });
}

function showWelcomeMessage(authService: AuthenticationService) {
    const config = vscode.workspace.getConfiguration('lanonasis');
    const useAutoAuth = config.get<boolean>('useAutoAuth', true);
    
    const authMethod = useAutoAuth ? 'auto-login with browser' : 'manual API key';
    
    const message = `Welcome to Lanonasis Memory Assistant for Windsurf! 🚀

🧠 AI-powered memory management integrated with Windsurf
🔍 Press Ctrl+Shift+M to search memories
📝 Select text and press Ctrl+Shift+Alt+M to create a memory
🤖 Press Ctrl+Shift+Alt+A for AI assistance
🌐 Enhanced with auto-redirect authentication
🔄 Smart context awareness for better suggestions

Authentication method: ${authMethod}`;

    vscode.window.showInformationMessage(message, 'Get Started', 'Configure')
        .then(selection => {
            if (selection === 'Get Started') {
                vscode.commands.executeCommand('lanonasis.authenticate');
            } else if (selection === 'Configure') {
                vscode.commands.executeCommand('workbench.action.openSettings', 'lanonasis');
            }
        });
}

async function switchConnectionMode(memoryService: MemoryService) {
    const config = vscode.workspace.getConfiguration('lanonasis');
    const currentUseGateway = config.get<boolean>('useGateway', true);
    
    const options = [
        {
            label: '🌐 Gateway Mode (Recommended)',
            description: 'Use Onasis Gateway for optimized routing and caching',
            picked: currentUseGateway,
            value: true
        },
        {
            label: '🔗 Direct API Mode',
            description: 'Connect directly to memory service',
            picked: !currentUseGateway,
            value: false
        }
    ];

    const selected = await vscode.window.showQuickPick(options, {
        placeHolder: 'Choose connection mode',
        ignoreFocusOut: true
    });

    if (selected) {
        await config.update('useGateway', selected.value, vscode.ConfigurationTarget.Global);
        memoryService.updateConfiguration();
        vscode.window.showInformationMessage(`Switched to ${selected.label}`);
    }
}

function handleError(context: string, error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`${context}:`, error);
    vscode.window.showErrorMessage(`${context}: ${message}`);
}

export function deactivate() {
    console.log('Lanonasis Memory Extension for Windsurf is deactivated');
}
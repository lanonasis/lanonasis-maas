"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const MemoryTreeProvider_1 = require("./providers/MemoryTreeProvider");
const MemoryCompletionProvider_1 = require("./providers/MemoryCompletionProvider");
const MemoryService_1 = require("./services/MemoryService");
const AuthenticationService_1 = require("./auth/AuthenticationService");
function activate(context) {
    console.log('Lanonasis Memory Extension for Cursor is now active');
    // Initialize authentication service with auto-redirect capabilities
    const authService = new AuthenticationService_1.AuthenticationService(context);
    // Initialize memory service
    const memoryService = new MemoryService_1.MemoryService(authService);
    // Initialize tree provider
    const memoryTreeProvider = new MemoryTreeProvider_1.MemoryTreeProvider(memoryService, authService);
    vscode.window.registerTreeDataProvider('lanonasisMemories', memoryTreeProvider);
    // Initialize completion provider
    const completionProvider = new MemoryCompletionProvider_1.MemoryCompletionProvider(memoryService);
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider({ scheme: 'file' }, completionProvider, '@', '#', '//'));
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
        vscode.commands.registerCommand('lanonasis.authenticate', async () => {
            await authenticate(authService, memoryTreeProvider);
        }),
        vscode.commands.registerCommand('lanonasis.logout', async () => {
            await logout(authService, memoryTreeProvider);
        }),
        vscode.commands.registerCommand('lanonasis.refreshMemories', async () => {
            memoryTreeProvider.refresh();
        }),
        vscode.commands.registerCommand('lanonasis.openMemory', (memory) => {
            openMemoryInEditor(memory);
        }),
        vscode.commands.registerCommand('lanonasis.switchMode', async () => {
            await switchConnectionMode(memoryService);
        })
    ];
    context.subscriptions.push(...commands);
    // Auto-refresh memories periodically
    const config = vscode.workspace.getConfiguration('lanonasis');
    const refreshInterval = config.get('autoRefreshInterval', 300000); // 5 minutes default
    const refreshTimer = setInterval(() => {
        if (authService.isAuthenticated()) {
            memoryTreeProvider.refresh();
        }
    }, refreshInterval);
    context.subscriptions.push({ dispose: () => clearInterval(refreshTimer) });
    // Show welcome message if first time
    const isFirstTime = context.globalState.get('lanonasis.firstTime', true);
    if (isFirstTime) {
        showWelcomeMessage(authService);
        context.globalState.update('lanonasis.firstTime', false);
    }
}
async function checkAuthenticationStatusWithAutoRefresh(authService, memoryTreeProvider) {
    const isAuthenticated = await authService.checkAuthenticationStatus();
    vscode.commands.executeCommand('setContext', 'lanonasis.authenticated', isAuthenticated);
    if (!isAuthenticated) {
        const config = vscode.workspace.getConfiguration('lanonasis');
        const useAutoAuth = config.get('useAutoAuth', true);
        if (useAutoAuth) {
            // Show subtle notification about auto-authentication
            const result = await vscode.window.showInformationMessage('Lanonasis Memory: Authentication required. Use auto-login with browser?', 'Auto Login', 'Manual Setup', 'Later');
            if (result === 'Auto Login') {
                await authenticate(authService, memoryTreeProvider);
            }
            else if (result === 'Manual Setup') {
                // Open settings for manual API key configuration
                vscode.commands.executeCommand('workbench.action.openSettings', 'lanonasis');
            }
        }
        else {
            // Traditional flow for users who prefer manual setup
            const result = await vscode.window.showInformationMessage('Lanonasis Memory: No authentication configured. Set up now?', 'Configure', 'Later');
            if (result === 'Configure') {
                await authenticate(authService, memoryTreeProvider);
            }
        }
    }
    else {
        // Refresh memories when authenticated
        memoryTreeProvider.refresh();
    }
}
async function searchMemories(memoryService, authService) {
    if (!await ensureAuthenticated(authService))
        return;
    const query = await vscode.window.showInputBox({
        prompt: 'Search memories',
        placeHolder: 'Enter search query...'
    });
    if (!query)
        return;
    try {
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Searching memories...',
            cancellable: false
        }, async () => {
            const results = await memoryService.searchMemories({
                query,
                limit: vscode.workspace.getConfiguration('lanonasis').get('searchLimit', 10),
                threshold: 0.7
            });
            if (results.length === 0) {
                vscode.window.showInformationMessage('No memories found for your query');
                return;
            }
            const items = results.map(memory => ({
                label: memory.title,
                description: memory.memory_type,
                detail: memory.content.substring(0, 100) + (memory.content.length > 100 ? '...' : ''),
                memory
            }));
            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: `Found ${results.length} memory(ies)`,
                ignoreFocusOut: true,
                matchOnDescription: true,
                matchOnDetail: true
            });
            if (selected) {
                openMemoryInEditor(selected.memory);
            }
        });
    }
    catch (error) {
        handleError('Failed to search memories', error);
    }
}
async function createMemoryFromSelection(memoryService, authService) {
    if (!await ensureAuthenticated(authService))
        return;
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
    if (!title)
        return;
    const config = vscode.workspace.getConfiguration('lanonasis');
    const defaultType = config.get('defaultMemoryType', 'context');
    try {
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Creating memory...',
            cancellable: false
        }, async () => {
            await memoryService.createMemory({
                title,
                content: selectedText,
                memory_type: defaultType,
                tags: ['cursor', 'selection'],
                metadata: {
                    source: 'cursor',
                    fileName,
                    lineNumber: lineNumber.toString(),
                    timestamp: new Date().toISOString()
                }
            });
        });
        vscode.window.showInformationMessage(`Memory "${title}" created successfully`);
        vscode.commands.executeCommand('lanonasis.refreshMemories');
    }
    catch (error) {
        handleError('Failed to create memory', error);
    }
}
async function createMemoryFromFile(memoryService, authService) {
    if (!await ensureAuthenticated(authService))
        return;
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showWarningMessage('No active editor');
        return;
    }
    const content = editor.document.getText();
    const fileName = editor.document.fileName;
    const title = await vscode.window.showInputBox({
        prompt: 'Memory title',
        value: `File: ${fileName.split('/').pop()}`
    });
    if (!title)
        return;
    const config = vscode.workspace.getConfiguration('lanonasis');
    const defaultType = config.get('defaultMemoryType', 'context');
    try {
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Creating memory from file...',
            cancellable: false
        }, async () => {
            await memoryService.createMemory({
                title,
                content,
                memory_type: defaultType,
                tags: ['cursor', 'file'],
                metadata: {
                    source: 'cursor-file',
                    fileName,
                    fullPath: fileName,
                    timestamp: new Date().toISOString()
                }
            });
        });
        vscode.window.showInformationMessage(`Memory "${title}" created from file`);
        vscode.commands.executeCommand('lanonasis.refreshMemories');
    }
    catch (error) {
        handleError('Failed to create memory from file', error);
    }
}
async function authenticate(authService, memoryTreeProvider) {
    const config = vscode.workspace.getConfiguration('lanonasis');
    const useAutoAuth = config.get('useAutoAuth', true);
    if (useAutoAuth) {
        // Use OAuth2 with browser redirect
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
                }
                else {
                    throw new Error('Authentication was cancelled or failed');
                }
            });
        }
        catch (error) {
            vscode.window.showErrorMessage(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    else {
        // Fallback to manual API key entry
        const apiKey = await vscode.window.showInputBox({
            prompt: 'Enter your Lanonasis API Key',
            placeHolder: 'Get your API key from api.lanonasis.com',
            password: true,
            ignoreFocusOut: true
        });
        if (!apiKey)
            return;
        try {
            const success = await authService.authenticateWithApiKey(apiKey);
            if (success) {
                vscode.commands.executeCommand('setContext', 'lanonasis.authenticated', true);
                vscode.window.showInformationMessage('Successfully authenticated with Lanonasis Memory Service');
                memoryTreeProvider.refresh();
            }
        }
        catch (error) {
            handleError('Authentication failed', error);
        }
    }
}
async function logout(authService, memoryTreeProvider) {
    const confirmed = await vscode.window.showWarningMessage('Are you sure you want to logout from Lanonasis?', 'Logout', 'Cancel');
    if (confirmed === 'Logout') {
        await authService.logout();
        vscode.commands.executeCommand('setContext', 'lanonasis.authenticated', false);
        vscode.window.showInformationMessage('Logged out from Lanonasis Memory Service');
        memoryTreeProvider.refresh();
    }
}
async function ensureAuthenticated(authService) {
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
function openMemoryInEditor(memory) {
    const content = `# ${memory.title}

**Type:** ${memory.memory_type}
**Created:** ${new Date(memory.created_at).toLocaleString()}
**Last Accessed:** ${memory.last_accessed ? new Date(memory.last_accessed).toLocaleString() : 'Never'}
**Tags:** ${memory.tags?.join(', ') || 'None'}

---

${memory.content}`;
    vscode.workspace.openTextDocument({
        content,
        language: 'markdown'
    }).then(doc => {
        vscode.window.showTextDocument(doc);
    });
}
function showWelcomeMessage(authService) {
    const config = vscode.workspace.getConfiguration('lanonasis');
    const useAutoAuth = config.get('useAutoAuth', true);
    const authMethod = useAutoAuth ? 'auto-login with browser' : 'manual API key';
    const message = `Welcome to Lanonasis Memory Assistant for Cursor! 

🧠 Search and manage your memories directly in Cursor
🔍 Press Ctrl+Shift+M to search memories
📝 Select text and press Ctrl+Shift+Alt+M to create a memory
🌐 Enhanced with auto-redirect authentication
🔄 Auto-refresh keeps your memories up to date

Authentication method: ${authMethod}`;
    vscode.window.showInformationMessage(message, 'Get Started', 'Configure')
        .then(selection => {
        if (selection === 'Get Started') {
            vscode.commands.executeCommand('lanonasis.authenticate');
        }
        else if (selection === 'Configure') {
            vscode.commands.executeCommand('workbench.action.openSettings', 'lanonasis');
        }
    });
}
async function switchConnectionMode(memoryService) {
    const config = vscode.workspace.getConfiguration('lanonasis');
    const currentUseGateway = config.get('useGateway', true);
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
function handleError(context, error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`${context}:`, error);
    vscode.window.showErrorMessage(`${context}: ${message}`);
}
function deactivate() {
    console.log('Lanonasis Memory Extension for Cursor is deactivated');
}
//# sourceMappingURL=extension.js.map
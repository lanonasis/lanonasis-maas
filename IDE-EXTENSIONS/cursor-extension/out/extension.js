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
const ApiKeyTreeProvider_1 = require("./providers/ApiKeyTreeProvider");
const MemorySidebarProvider_1 = require("./panels/MemorySidebarProvider");
const MemoryService_1 = require("./services/MemoryService");
const EnhancedMemoryService_1 = require("./services/EnhancedMemoryService");
const ApiKeyService_1 = require("./services/ApiKeyService");
const AuthenticationService_1 = require("./auth/AuthenticationService");
const ide_extension_core_1 = require("@lanonasis/ide-extension-core");
async function activate(context) {
    console.log('Lanonasis Memory Extension for Cursor is now active');
    const extensionVersion = '1.4.5';
    const outputChannel = vscode.window.createOutputChannel('LanOnasis');
    const adapter = (0, ide_extension_core_1.createCursorAdapter)({ context, outputChannel, vscode }, {
        ideName: 'Cursor',
        extensionName: 'lanonasis-memory-cursor',
        extensionDisplayName: 'LanOnasis Memory Assistant',
        commandPrefix: 'lanonasis',
        userAgent: `Cursor/${vscode.version} LanOnasis/${extensionVersion}`
    });
    // Initialize authentication service with shared core (OAuth + API key + secure storage)
    const secureAuthService = new ide_extension_core_1.SecureApiKeyService(adapter);
    const authService = new AuthenticationService_1.AuthenticationService(adapter, secureAuthService);
    await authService.initialize();
    // Initialize services - use Enhanced version when available
    let memoryService;
    try {
        // Try enhanced service first
        memoryService = new EnhancedMemoryService_1.EnhancedMemoryService(authService);
        console.log('Using Enhanced Memory Service with CLI+OAuth integration for Cursor');
    }
    catch (error) {
        // Fallback to basic service
        console.warn('Enhanced Memory Service not available, using basic service:', error);
        memoryService = new MemoryService_1.MemoryService(authService);
    }
    const apiKeyService = new ApiKeyService_1.ApiKeyService();
    // Set auth service for secure API key access
    apiKeyService.setAuthService(authService);
    // Initialize sidebar provider (modern UI)
    const sidebarProvider = new MemorySidebarProvider_1.MemorySidebarProvider(context.extensionUri, memoryService);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider(MemorySidebarProvider_1.MemorySidebarProvider.viewType, sidebarProvider));
    // Initialize tree providers (optional legacy view)
    const memoryTreeProvider = new MemoryTreeProvider_1.MemoryTreeProvider(memoryService, authService);
    const apiKeyTreeProvider = new ApiKeyTreeProvider_1.ApiKeyTreeProvider(apiKeyService);
    vscode.window.registerTreeDataProvider('lanonasisMemories', memoryTreeProvider);
    vscode.window.registerTreeDataProvider('lanonasisApiKeys', apiKeyTreeProvider);
    // Initialize completion provider
    const completionProvider = new MemoryCompletionProvider_1.MemoryCompletionProvider(memoryService);
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider({ scheme: 'file' }, completionProvider, '@', '#', '//'));
    // Set context variables
    vscode.commands.executeCommand('setContext', 'lanonasis.enabled', true);
    // Check authentication status with auto-refresh and CLI capabilities
    if (memoryService instanceof EnhancedMemoryService_1.EnhancedMemoryService) {
        await checkEnhancedAuthenticationStatus(authService, memoryTreeProvider, memoryService);
    }
    else {
        checkAuthenticationStatusWithAutoRefresh(authService, memoryTreeProvider);
    }
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
        }),
        // Enhanced command for connection info (if available)
        vscode.commands.registerCommand('lanonasis.showConnectionInfo', async () => {
            if (memoryService instanceof EnhancedMemoryService_1.EnhancedMemoryService) {
                await memoryService.showConnectionInfo();
            }
            else {
                vscode.window.showInformationMessage('Connection info available in Enhanced Memory Service. Upgrade to CLI integration for more details.');
            }
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
        })
    ];
    context.subscriptions.push(...commands);
    // Add enhanced service to subscriptions for proper cleanup if it's enhanced
    if (memoryService instanceof EnhancedMemoryService_1.EnhancedMemoryService) {
        context.subscriptions.push(memoryService);
    }
    // Auto-refresh memories periodically
    const config = vscode.workspace.getConfiguration('lanonasis');
    const refreshInterval = config.get('autoRefreshInterval', 300000); // 5 minutes default
    const refreshTimer = setInterval(() => {
        authService.checkAuthenticationStatus()
            .then(isAuthed => {
            if (isAuthed) {
                memoryTreeProvider.refresh();
            }
        })
            .catch(() => undefined);
    }, refreshInterval);
    context.subscriptions.push({ dispose: () => clearInterval(refreshTimer) });
    // Show welcome message if first time
    const isFirstTime = context.globalState.get('lanonasis.firstTime', true);
    if (isFirstTime) {
        showWelcomeMessage();
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
async function checkEnhancedAuthenticationStatus(authService, memoryTreeProvider, enhancedService) {
    const isAuthenticated = await authService.checkAuthenticationStatus();
    vscode.commands.executeCommand('setContext', 'lanonasis.authenticated', isAuthenticated);
    if (!isAuthenticated) {
        const config = vscode.workspace.getConfiguration('lanonasis');
        const useAutoAuth = config.get('useAutoAuth', true);
        if (useAutoAuth) {
            const result = await vscode.window.showInformationMessage('Lanonasis Memory: Authentication required. Use auto-login with CLI integration?', 'Auto Login + CLI', 'Manual Setup', 'Later');
            if (result === 'Auto Login + CLI') {
                await authenticate(authService, memoryTreeProvider);
            }
            else if (result === 'Manual Setup') {
                await authenticate(authService, memoryTreeProvider);
            }
        }
        else {
            const result = await vscode.window.showInformationMessage('Lanonasis Memory: No authentication configured. Set up with CLI enhancement?', 'Configure + CLI', 'Later');
            if (result === 'Configure + CLI') {
                await authenticate(authService, memoryTreeProvider);
            }
        }
        return;
    }
    // Refresh memories when authenticated
    memoryTreeProvider.refresh();
    // Check CLI capabilities for enhanced features
    const capabilities = enhancedService.getCapabilities();
    if (capabilities?.cliAvailable && capabilities.goldenContract) {
        vscode.window.showInformationMessage('?? Cursor Memory: CLI v1.5.2+ + OAuth detected! Maximum performance active.', 'Show Details').then(selection => {
            if (selection === 'Show Details') {
                vscode.commands.executeCommand('lanonasis.showConnectionInfo');
            }
        });
    }
    else if (capabilities?.authenticated) {
        const installCLI = await vscode.window.showInformationMessage('?? Cursor Memory: Install CLI v1.5.2+ for enhanced performance with OAuth.', 'Install CLI', 'Learn More', 'Later');
        if (installCLI === 'Install CLI') {
            vscode.env.openExternal(vscode.Uri.parse('https://www.npmjs.com/package/@lanonasis/cli'));
        }
        else if (installCLI === 'Learn More') {
            vscode.env.openExternal(vscode.Uri.parse('https://docs.lanonasis.com/cli/cursor'));
        }
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
        .then((choice) => {
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
    }).then((doc) => {
        vscode.window.showTextDocument(doc);
    });
}
function showWelcomeMessage() {
    const config = vscode.workspace.getConfiguration('lanonasis');
    const useAutoAuth = config.get('useAutoAuth', true);
    const authMethod = useAutoAuth ? 'auto-login with browser' : 'manual API key';
    const message = `Welcome to Lanonasis Memory Assistant for Cursor! 

?? Search and manage your memories directly in Cursor
?? Press Ctrl+Shift+M to search memories
?? Select text and press Ctrl+Shift+Alt+M to create a memory
?? Enhanced with auto-redirect authentication
?? Auto-refresh keeps your memories up to date

Authentication method: ${authMethod}`;
    vscode.window.showInformationMessage(message, 'Get Started', 'Configure')
        .then((selection) => {
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
            label: '?? Gateway Mode (Recommended)',
            description: 'Use Onasis Gateway for optimized routing and caching',
            picked: currentUseGateway,
            value: true
        },
        {
            label: '?? Direct API Mode',
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
// API Key Management Functions
async function manageApiKeys(apiKeyService) {
    const quickPickItems = [
        {
            label: '$(key) View API Keys',
            description: 'View all API keys across projects',
            command: 'view'
        },
        {
            label: '$(add) Create API Key',
            description: 'Create a new API key',
            command: 'create'
        },
        {
            label: '$(folder) Manage Projects',
            description: 'Create and manage API key projects',
            command: 'projects'
        },
        {
            label: '$(refresh) Refresh',
            description: 'Refresh API key data',
            command: 'refresh'
        }
    ];
    const selected = await vscode.window.showQuickPick(quickPickItems, {
        placeHolder: 'Choose an API key management action'
    });
    if (!selected)
        return;
    switch (selected.command) {
        case 'view':
            await viewApiKeys(apiKeyService);
            break;
        case 'create':
            await createApiKey(apiKeyService);
            break;
        case 'projects':
            await viewProjects(apiKeyService);
            break;
        case 'refresh':
            vscode.commands.executeCommand('lanonasis.refreshApiKeys');
            break;
    }
}
async function viewApiKeys(apiKeyService) {
    try {
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Loading API keys...',
            cancellable: false
        }, async () => {
            const apiKeys = await apiKeyService.getApiKeys();
            if (apiKeys.length === 0) {
                vscode.window.showInformationMessage('No API keys found. Create your first API key to get started.');
                return;
            }
            const items = apiKeys.map(key => ({
                label: key.name,
                description: `${key.environment} ? ${key.keyType} ? ${key.accessLevel}`,
                detail: `Project: ${key.projectId} | Created: ${new Date(key.createdAt).toLocaleDateString()}`,
                apiKey: key
            }));
            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: `Select an API key (${apiKeys.length} found)`
            });
            if (selected) {
                await showApiKeyDetails(selected.apiKey);
            }
        });
    }
    catch (error) {
        vscode.window.showErrorMessage(`Failed to load API keys: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
async function createApiKey(apiKeyService) {
    try {
        // Get projects first
        const projects = await apiKeyService.getProjects();
        if (projects.length === 0) {
            const createProjectChoice = await vscode.window.showInformationMessage('No projects found. You need to create a project first.', 'Create Project', 'Cancel');
            if (createProjectChoice === 'Create Project') {
                await createProject(apiKeyService, undefined);
            }
            return;
        }
        // Select project
        const projectItems = projects.map(p => ({
            label: p.name,
            description: p.description || 'No description',
            project: p
        }));
        const selectedProject = await vscode.window.showQuickPick(projectItems, {
            placeHolder: 'Select a project for the API key'
        });
        if (!selectedProject)
            return;
        // Get key details
        const name = await vscode.window.showInputBox({
            prompt: 'API Key Name',
            placeHolder: 'Enter a name for your API key'
        });
        if (!name)
            return;
        const value = await vscode.window.showInputBox({
            prompt: 'API Key Value',
            placeHolder: 'Enter the API key value',
            password: true
        });
        if (!value)
            return;
        // Key type selection
        const keyTypes = [
            { label: 'API Key', value: 'api_key' },
            { label: 'Database URL', value: 'database_url' },
            { label: 'OAuth Token', value: 'oauth_token' },
            { label: 'Certificate', value: 'certificate' },
            { label: 'SSH Key', value: 'ssh_key' },
            { label: 'Webhook Secret', value: 'webhook_secret' },
            { label: 'Encryption Key', value: 'encryption_key' }
        ];
        const selectedKeyType = await vscode.window.showQuickPick(keyTypes, {
            placeHolder: 'Select key type'
        });
        if (!selectedKeyType)
            return;
        // Environment selection
        const config = vscode.workspace.getConfiguration('lanonasis');
        const defaultEnv = config.get('defaultEnvironment', 'development');
        const environments = [
            { label: 'Development', value: 'development', picked: defaultEnv === 'development' },
            { label: 'Staging', value: 'staging', picked: defaultEnv === 'staging' },
            { label: 'Production', value: 'production', picked: defaultEnv === 'production' }
        ];
        const selectedEnvironment = await vscode.window.showQuickPick(environments, {
            placeHolder: 'Select environment'
        });
        if (!selectedEnvironment)
            return;
        // Create the API key
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Creating API key...',
            cancellable: false
        }, async () => {
            await apiKeyService.createApiKey({
                name,
                value,
                keyType: selectedKeyType.value,
                environment: selectedEnvironment.value,
                accessLevel: 'team',
                projectId: selectedProject.project.id
            });
        });
        vscode.window.showInformationMessage(`API key "${name}" created successfully`);
        vscode.commands.executeCommand('lanonasis.refreshApiKeys');
    }
    catch (error) {
        vscode.window.showErrorMessage(`Failed to create API key: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
async function createProject(apiKeyService, apiKeyTreeProvider) {
    try {
        const name = await vscode.window.showInputBox({
            prompt: 'Project Name',
            placeHolder: 'Enter a name for your project'
        });
        if (!name)
            return;
        const description = await vscode.window.showInputBox({
            prompt: 'Project Description (optional)',
            placeHolder: 'Enter a description for your project'
        });
        const config = vscode.workspace.getConfiguration('lanonasis');
        const organizationId = config.get('organizationId');
        if (!organizationId) {
            const orgId = await vscode.window.showInputBox({
                prompt: 'Organization ID',
                placeHolder: 'Enter your organization ID'
            });
            if (!orgId)
                return;
            await config.update('organizationId', orgId, vscode.ConfigurationTarget.Global);
        }
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Creating project...',
            cancellable: false
        }, async () => {
            const project = await apiKeyService.createProject({
                name,
                description,
                organizationId: organizationId || await config.get('organizationId')
            });
            if (apiKeyTreeProvider) {
                await apiKeyTreeProvider.addProject(project);
            }
        });
        vscode.window.showInformationMessage(`Project "${name}" created successfully`);
        vscode.commands.executeCommand('lanonasis.refreshApiKeys');
    }
    catch (error) {
        vscode.window.showErrorMessage(`Failed to create project: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
async function viewProjects(apiKeyService) {
    try {
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Loading projects...',
            cancellable: false
        }, async () => {
            const projects = await apiKeyService.getProjects();
            if (projects.length === 0) {
                const createProjectOption = await vscode.window.showInformationMessage('No projects found. Create your first project to get started.', 'Create Project', 'Cancel');
                if (createProjectOption === 'Create Project') {
                    await createProject(apiKeyService, undefined);
                }
                return;
            }
            const items = projects.map(project => ({
                label: project.name,
                description: project.description || 'No description',
                detail: `Organization: ${project.organizationId} | Created: ${new Date(project.createdAt).toLocaleDateString()}`,
                project
            }));
            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: `Select a project (${projects.length} found)`
            });
            if (selected) {
                await showProjectDetails(selected.project, apiKeyService);
            }
        });
    }
    catch (error) {
        vscode.window.showErrorMessage(`Failed to load projects: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
async function showApiKeyDetails(apiKey) {
    const content = `# API Key: ${apiKey.name}

**Type:** ${apiKey.keyType}
**Environment:** ${apiKey.environment}
**Access Level:** ${apiKey.accessLevel}
**Project ID:** ${apiKey.projectId}
**Created:** ${new Date(apiKey.createdAt).toLocaleString()}
${apiKey.expiresAt ? `**Expires:** ${new Date(apiKey.expiresAt).toLocaleString()}` : '**Expires:** Never'}

## Tags
${apiKey.tags.length > 0 ? apiKey.tags.map((tag) => `- ${tag}`).join('\n') : 'No tags'}

## Metadata
\`\`\`json
${JSON.stringify(apiKey.metadata, null, 2)}
\`\`\``;
    vscode.workspace.openTextDocument({
        content,
        language: 'markdown'
    }).then((doc) => {
        vscode.window.showTextDocument(doc);
    });
}
async function showProjectDetails(project, apiKeyService) {
    try {
        const apiKeys = await apiKeyService.getApiKeys(project.id);
        const content = `# Project: ${project.name}

**Description:** ${project.description || 'No description'}
**Organization ID:** ${project.organizationId}
**Created:** ${new Date(project.createdAt).toLocaleString()}
**Team Members:** ${project.teamMembers.length}

## API Keys (${apiKeys.length})
${apiKeys.length > 0 ?
            apiKeys.map((key) => `- **${key.name}** (${key.keyType}, ${key.environment})`).join('\n') :
            'No API keys found in this project'}

## Settings
\`\`\`json
${JSON.stringify(project.settings, null, 2)}
\`\`\``;
        vscode.workspace.openTextDocument({
            content,
            language: 'markdown'
        }).then((doc) => {
            vscode.window.showTextDocument(doc);
        });
    }
    catch (error) {
        vscode.window.showErrorMessage(`Failed to load project details: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
function deactivate() {
    console.log('Lanonasis Memory Extension for Cursor is deactivated');
}
//# sourceMappingURL=extension.js.map
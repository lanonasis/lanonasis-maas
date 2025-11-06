import * as vscode from 'vscode';
import { MemoryTreeProvider } from './providers/MemoryTreeProvider';
import { MemoryCompletionProvider } from './providers/MemoryCompletionProvider';
import { ApiKeyTreeProvider } from './providers/ApiKeyTreeProvider';
import { MemorySidebarProvider } from './panels/MemorySidebarProvider';
import { MemoryService } from './services/MemoryService';
import { EnhancedMemoryService } from './services/EnhancedMemoryService';
import type { IMemoryService, IEnhancedMemoryService } from './services/IMemoryService';
import { ApiKeyService } from './services/ApiKeyService';
import { SecureApiKeyService } from './services/SecureApiKeyService';
import { MemoryType } from './types/memory-aligned';

export async function activate(context: vscode.ExtensionContext) {
    console.log('Lanonasis Memory Extension is now active');

    // Create output channel for logging
    const outputChannel = vscode.window.createOutputChannel('Lanonasis');

    // Initialize secure API key service
    const secureApiKeyService = new SecureApiKeyService(context, outputChannel);
    await secureApiKeyService.initialize();

    // Initialize services - use Enhanced version when available
    let memoryService: IMemoryService;

    try {
        // Try enhanced service first
        memoryService = new EnhancedMemoryService(secureApiKeyService);
        console.log('Using Enhanced Memory Service with CLI integration');
    } catch (error) {
        // Fallback to basic service
        console.warn('Enhanced Memory Service not available, using basic service:', error);
        memoryService = new MemoryService(secureApiKeyService);
    }
    const apiKeyService = new ApiKeyService(secureApiKeyService);

    // Initialize sidebar provider (modern UI)
    const sidebarProvider = new MemorySidebarProvider(context.extensionUri, memoryService);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            MemorySidebarProvider.viewType,
            sidebarProvider
        )
    );

    // Initialize tree providers (optional legacy view)
    const memoryTreeProvider = new MemoryTreeProvider(memoryService as any);
    const apiKeyTreeProvider = new ApiKeyTreeProvider(apiKeyService);

    vscode.window.registerTreeDataProvider('lanonasisMemories', memoryTreeProvider);
    vscode.window.registerTreeDataProvider('lanonasisApiKeys', apiKeyTreeProvider);

    // Initialize completion provider
    const completionProvider = new MemoryCompletionProvider(memoryService as any);
    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider(
            { scheme: 'file' },
            completionProvider,
            '@', '#', '//'
        )
    );

    // Set context variables
    vscode.commands.executeCommand('setContext', 'lanonasis.enabled', true);

    // Check authentication status
    if (memoryService instanceof EnhancedMemoryService) {
        await checkEnhancedAuthenticationStatus(memoryService, secureApiKeyService);
    } else {
        await checkAuthenticationStatus(secureApiKeyService);
    }

    // Register commands
    const commands = [
        vscode.commands.registerCommand('lanonasis.searchMemory', async () => {
            await searchMemories(memoryService as any);
        }),

        vscode.commands.registerCommand('lanonasis.createMemory', async () => {
            await createMemoryFromSelection(memoryService as any);
        }),

        vscode.commands.registerCommand('lanonasis.createMemoryFromFile', async () => {
            await createMemoryFromFile(memoryService as any);
        }),

        vscode.commands.registerCommand('lanonasis.authenticate', async () => {
            await vscode.commands.executeCommand('lanonasis.configureApiKey');
        }),

        vscode.commands.registerCommand('lanonasis.logout', async () => {
            try {
                await secureApiKeyService.logout();
                await memoryService.refreshClient();
                vscode.window.showInformationMessage('You have been signed out of Lanonasis.');
                if (memoryService instanceof EnhancedMemoryService) {
                    await memoryService.refreshConfig();
                }
                await sidebarProvider.refresh();
                vscode.commands.executeCommand('setContext', 'lanonasis.authenticated', false);
            } catch (error) {
                vscode.window.showErrorMessage(`Logout failed: ${error}`);
                outputChannel.appendLine(`[Logout] Error: ${error}`);
            }
        }),

        vscode.commands.registerCommand('lanonasis.refreshMemories', async () => {
            memoryTreeProvider.refresh();
            await sidebarProvider.refresh();
        }),

        vscode.commands.registerCommand('lanonasis.openMemory', (memory: any) => {
            openMemoryInEditor(memory);
        }),

        vscode.commands.registerCommand('lanonasis.switchMode', async () => {
            await switchConnectionMode(memoryService as any);
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

        // Enhanced command for connection info (if available)
        vscode.commands.registerCommand('lanonasis.showConnectionInfo', async () => {
            if (memoryService instanceof EnhancedMemoryService) {
                await memoryService.showConnectionInfo();
            } else {
                vscode.window.showInformationMessage('Connection info available in Enhanced Memory Service. Upgrade to CLI integration for more details.');
            }
        }),

        // Secure API Key Management Commands
        vscode.commands.registerCommand('lanonasis.configureApiKey', async () => {
            try {
                await secureApiKeyService.promptForAuthentication();
                if (await secureApiKeyService.hasApiKey()) {
                    vscode.window.showInformationMessage('Authentication configured successfully and stored securely.');
                    // Refresh services that depend on API key
                    if (memoryService instanceof EnhancedMemoryService) {
                        await memoryService.refreshConfig();
                    }
                    await memoryService.refreshClient();
                    await sidebarProvider.refresh();
                }
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to configure authentication: ${error}`);
                outputChannel.appendLine(`[ConfigureApiKey] Error: ${error}`);
            }
        }),

        vscode.commands.registerCommand('lanonasis.clearApiKey', async () => {
            try {
                const hasApiKey = await secureApiKeyService.hasApiKey();
                if (!hasApiKey) {
                    vscode.window.showInformationMessage('No API key is currently configured.');
                    return;
                }

                const confirmed = await vscode.window.showWarningMessage(
                    'Are you sure you want to clear your API key? This will require re-authentication.',
                    { modal: true },
                    'Clear API Key'
                );

                if (confirmed === 'Clear API Key') {
                    await secureApiKeyService.deleteApiKey();
                    vscode.window.showInformationMessage('API key cleared successfully.');
                    outputChannel.appendLine('[ClearApiKey] API key removed from secure storage');
                    await memoryService.refreshClient();
                    await sidebarProvider.refresh();
                }
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to clear API key: ${error}`);
                outputChannel.appendLine(`[ClearApiKey] Error: ${error}`);
            }
        }),

        vscode.commands.registerCommand('lanonasis.checkApiKeyStatus', async () => {
            try {
                const hasApiKey = await secureApiKeyService.hasApiKey();
                const status = hasApiKey ? '✅ Configured and stored securely' : '❌ Not configured';

                if (hasApiKey) {
                    vscode.window.showInformationMessage(
                        `API Key Status: ${status}`,
                        'Test Connection',
                        'View Security Info'
                    ).then(async (selection) => {
                        if (selection === 'Test Connection') {
                            vscode.commands.executeCommand('lanonasis.testConnection');
                        } else if (selection === 'View Security Info') {
                            vscode.env.openExternal(vscode.Uri.parse('https://docs.lanonasis.com/security/api-keys'));
                        }
                    });
                } else {
                    vscode.window.showInformationMessage(
                        `API Key Status: ${status}`,
                        'Configure API Key'
                    ).then((selection) => {
                        if (selection === 'Configure API Key') {
                            vscode.commands.executeCommand('lanonasis.configureApiKey');
                        }
                    });
                }
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to check API key status: ${error}`);
                outputChannel.appendLine(`[CheckApiKeyStatus] Error: ${error}`);
            }
        }),

        vscode.commands.registerCommand('lanonasis.testConnection', async () => {
            try {
                if (memoryService instanceof EnhancedMemoryService) {
                    await memoryService.testConnection();
                    vscode.window.showInformationMessage('✅ Connection test successful!');
                } else {
                    await memoryService.testConnection();
                    vscode.window.showInformationMessage('✅ API connection successful.');
                }
            } catch (error) {
                vscode.window.showErrorMessage(`Connection test failed: ${error}`);
                outputChannel.appendLine(`[TestConnection] Error: ${error}`);
            }
        })
    ];

    context.subscriptions.push(...commands);

    // Add enhanced service to subscriptions for proper cleanup if it's enhanced
    if (memoryService instanceof EnhancedMemoryService) {
        context.subscriptions.push(memoryService);
    }

    // Show welcome message if first time
    const isFirstTime = context.globalState.get('lanonasis.firstTime', true);
    if (isFirstTime) {
        showWelcomeMessage();
        context.globalState.update('lanonasis.firstTime', false);
    }
}

async function checkAuthenticationStatus(secureApiKeyService: SecureApiKeyService) {
    const authenticated = await secureApiKeyService.hasApiKey();

    vscode.commands.executeCommand('setContext', 'lanonasis.authenticated', authenticated);

    if (!authenticated) {
        const result = await vscode.window.showInformationMessage(
            'Lanonasis Memory: No credentials configured. Would you like to authenticate now?',
            'Authenticate', 'Later'
        );

        if (result === 'Authenticate') {
            await vscode.commands.executeCommand('lanonasis.authenticate');
        }
    }
}

async function searchMemories(memoryService: MemoryService) {
    const query = await vscode.window.showInputBox({
        prompt: 'Search memories',
        placeHolder: 'Enter search query...'
    });

    if (!query) return;

    try {
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Searching memories...',
            cancellable: false
        }, async () => {
            const results = await memoryService.searchMemories(query);
            await showSearchResults(results, query);
        });
    } catch (error) {
        vscode.window.showErrorMessage(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

async function showSearchResults(results: any[], query: string) {
    if (results.length === 0) {
        vscode.window.showInformationMessage(`No memories found for "${query}"`);
        return;
    }

    const items = results.map(memory => ({
        label: memory.title,
        description: memory.type,
        detail: memory.content.substring(0, 100) + (memory.content.length > 100 ? '...' : ''),
        memory
    }));

    const selected = await vscode.window.showQuickPick(items, {
        placeHolder: `Found ${results.length} memories for "${query}"`
    });

    if (selected) {
        openMemoryInEditor(selected.memory);
    }
}

async function createMemoryFromSelection(memoryService: MemoryService) {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.selection.isEmpty) {
        vscode.window.showWarningMessage('Please select some text to create a memory');
        return;
    }

    const selectedText = editor.document.getText(editor.selection);
    const fileName = editor.document.fileName;
    const lineNumber = editor.selection.start.line + 1;

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
                tags: ['vscode', 'selection'],
                metadata: {
                    source: 'vscode',
                    fileName,
                    lineNumber: lineNumber.toString()
                }
            });
        });

        vscode.window.showInformationMessage(`Memory "${title}" created successfully`);
        vscode.commands.executeCommand('lanonasis.refreshMemories');
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to create memory: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

async function createMemoryFromFile(memoryService: MemoryService) {
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
                tags: ['vscode', 'file'],
                metadata: {
                    source: 'vscode-file',
                    fileName,
                    fullPath: fileName
                }
            });
        });

        vscode.window.showInformationMessage(`Memory "${title}" created from file`);
        vscode.commands.executeCommand('lanonasis.refreshMemories');
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to create memory: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

async function authenticate(memoryService: MemoryService) {
    const apiKey = await vscode.window.showInputBox({
        prompt: 'Enter your Lanonasis API Key',
        placeHolder: 'Get your API key from api.lanonasis.com',
        password: true,
        ignoreFocusOut: true
    });

    if (!apiKey) return;

    try {
        // Test the API key
        await memoryService.testConnection(apiKey);

        // Save to configuration
        const config = vscode.workspace.getConfiguration('lanonasis');
        await config.update('apiKey', apiKey, vscode.ConfigurationTarget.Global);

        vscode.commands.executeCommand('setContext', 'lanonasis.authenticated', true);
        vscode.window.showInformationMessage('Successfully authenticated with Lanonasis Memory Service');
        vscode.commands.executeCommand('lanonasis.refreshMemories');
    } catch (error) {
        vscode.window.showErrorMessage(`Authentication failed: ${error instanceof Error ? error.message : 'Invalid API key'}`);
    }
}

function openMemoryInEditor(memory: any) {
    const content = `# ${memory.title}\n\n**Type:** ${memory.type}\n**Created:** ${new Date(memory.created_at).toLocaleString()}\n\n---\n\n${memory.content}`;

    vscode.workspace.openTextDocument({
        content,
        language: 'markdown'
    }).then(doc => {
        vscode.window.showTextDocument(doc);
    });
}

async function checkEnhancedAuthenticationStatus(
    enhancedService: EnhancedMemoryService,
    secureApiKeyService: SecureApiKeyService
) {
    const authenticated = await secureApiKeyService.hasApiKey();

    vscode.commands.executeCommand('setContext', 'lanonasis.authenticated', authenticated);

    if (!authenticated) {
        const result = await vscode.window.showInformationMessage(
            'Lanonasis Memory: No credentials configured. Would you like to authenticate now?',
            'Authenticate', 'Later'
        );

        if (result === 'Authenticate') {
            await vscode.commands.executeCommand('lanonasis.authenticate');
        }
        return;
    }

    // Check CLI capabilities
    const capabilities = enhancedService.getCapabilities();
    if (capabilities?.cliAvailable && capabilities.goldenContract) {
        vscode.window.showInformationMessage(
            '🚀 Lanonasis Memory: CLI v1.5.2+ detected! Enhanced performance active.',
            'Show Details'
        ).then(selection => {
            if (selection === 'Show Details') {
                vscode.commands.executeCommand('lanonasis.showConnectionInfo');
            }
        });
    }
}

function showWelcomeMessage() {
    const message = `Welcome to Lanonasis Memory Assistant! 

🧠 Search and manage your memories directly in VSCode
🔍 Press Ctrl+Shift+M to search memories
📝 Select text and press Ctrl+Shift+Alt+M to create a memory
🌐 Now using Onasis Gateway for enhanced performance

Get your API key from api.lanonasis.com to get started.`;

    vscode.window.showInformationMessage(message, 'Get API Key', 'Configure')
        .then(selection => {
            if (selection === 'Get API Key') {
                vscode.env.openExternal(vscode.Uri.parse('https://api.lanonasis.com'));
            } else if (selection === 'Configure') {
                vscode.commands.executeCommand('lanonasis.authenticate');
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

    if (!selected) return;

    try {
        await config.update('useGateway', selected.value, vscode.ConfigurationTarget.Global);
        await memoryService.refreshClient();

        const modeName = selected.value ? 'Gateway' : 'Direct API';
        vscode.window.showInformationMessage(`Switched to ${modeName} mode. Testing connection...`);

        // Test the new connection
        await memoryService.testConnection();
        vscode.window.showInformationMessage(`✅ ${modeName} mode active and connected`);

        vscode.commands.executeCommand('lanonasis.refreshMemories');
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to switch mode: ${error instanceof Error ? error.message : 'Unknown error'}`);
        // Revert the setting
        await config.update('useGateway', currentUseGateway, vscode.ConfigurationTarget.Global);
        memoryService.refreshClient();
    }
}

// ============================================================================
// API KEY MANAGEMENT FUNCTIONS
// ============================================================================

async function manageApiKeys(apiKeyService: ApiKeyService) {
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

    if (!selected) return;

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

async function viewApiKeys(apiKeyService: ApiKeyService) {
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
                description: `${key.environment} • ${key.keyType} • ${key.accessLevel}`,
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
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to load API keys: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

async function createApiKey(apiKeyService: ApiKeyService) {
    try {
        // Get projects first
        const projects = await apiKeyService.getProjects();

        if (projects.length === 0) {
            const createProjectResponse = await vscode.window.showInformationMessage(
                'No projects found. You need to create a project first.',
                'Create Project', 'Cancel'
            );

            if (createProjectResponse === 'Create Project') {
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

        if (!selectedProject) return;

        // Get key details
        const name = await vscode.window.showInputBox({
            prompt: 'API Key Name',
            placeHolder: 'Enter a name for your API key'
        });

        if (!name) return;

        const value = await vscode.window.showInputBox({
            prompt: 'API Key Value',
            placeHolder: 'Enter the API key value',
            password: true
        });

        if (!value) return;

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

        if (!selectedKeyType) return;

        // Environment selection
        const config = vscode.workspace.getConfiguration('lanonasis');
        const defaultEnv = config.get<string>('defaultEnvironment', 'development');

        const environments = [
            { label: 'Development', value: 'development', picked: defaultEnv === 'development' },
            { label: 'Staging', value: 'staging', picked: defaultEnv === 'staging' },
            { label: 'Production', value: 'production', picked: defaultEnv === 'production' }
        ];

        const selectedEnvironment = await vscode.window.showQuickPick(environments, {
            placeHolder: 'Select environment'
        });

        if (!selectedEnvironment) return;

        // Create the API key
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Creating API key...',
            cancellable: false
        }, async () => {
            await apiKeyService.createApiKey({
                name,
                value,
                keyType: selectedKeyType.value as any,
                environment: selectedEnvironment.value as any,
                accessLevel: 'team',
                projectId: selectedProject.project.id
            });
        });

        vscode.window.showInformationMessage(`API key "${name}" created successfully`);
        vscode.commands.executeCommand('lanonasis.refreshApiKeys');

    } catch (error) {
        vscode.window.showErrorMessage(`Failed to create API key: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

async function createProject(apiKeyService: ApiKeyService, apiKeyTreeProvider: ApiKeyTreeProvider | undefined) {
    try {
        const name = await vscode.window.showInputBox({
            prompt: 'Project Name',
            placeHolder: 'Enter a name for your project'
        });

        if (!name) return;

        const description = await vscode.window.showInputBox({
            prompt: 'Project Description (optional)',
            placeHolder: 'Enter a description for your project'
        });

        const config = vscode.workspace.getConfiguration('lanonasis');
        const organizationId = config.get<string>('organizationId');

        if (!organizationId) {
            const orgId = await vscode.window.showInputBox({
                prompt: 'Organization ID',
                placeHolder: 'Enter your organization ID'
            });

            if (!orgId) return;

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
                organizationId: organizationId || await config.get<string>('organizationId')!
            });

            if (apiKeyTreeProvider) {
                await apiKeyTreeProvider.addProject(project);
            }
        });

        vscode.window.showInformationMessage(`Project "${name}" created successfully`);
        vscode.commands.executeCommand('lanonasis.refreshApiKeys');

    } catch (error) {
        vscode.window.showErrorMessage(`Failed to create project: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

async function viewProjects(apiKeyService: ApiKeyService) {
    try {
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Loading projects...',
            cancellable: false
        }, async () => {
            const projects = await apiKeyService.getProjects();

            if (projects.length === 0) {
                const createProjectResponse = await vscode.window.showInformationMessage(
                    'No projects found. Create your first project to get started.',
                    'Create Project', 'Cancel'
                );

                if (createProjectResponse === 'Create Project') {
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
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to load projects: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

async function showApiKeyDetails(apiKey: any) {
    const content = `# API Key: ${apiKey.name}

**Type:** ${apiKey.keyType}
**Environment:** ${apiKey.environment}
**Access Level:** ${apiKey.accessLevel}
**Project ID:** ${apiKey.projectId}
**Created:** ${new Date(apiKey.createdAt).toLocaleString()}
${apiKey.expiresAt ? `**Expires:** ${new Date(apiKey.expiresAt).toLocaleString()}` : '**Expires:** Never'}

## Tags
${apiKey.tags.length > 0 ? apiKey.tags.map((tag: string) => `- ${tag}`).join('\n') : 'No tags'}

## Metadata
\`\`\`json
${JSON.stringify(apiKey.metadata, null, 2)}
\`\`\``;

    vscode.workspace.openTextDocument({
        content,
        language: 'markdown'
    }).then((doc: any) => {
        vscode.window.showTextDocument(doc);
    });
}

async function showProjectDetails(project: any, apiKeyService: ApiKeyService) {
    try {
        const apiKeys = await apiKeyService.getApiKeys(project.id);

        const content = `# Project: ${project.name}

**Description:** ${project.description || 'No description'}
**Organization ID:** ${project.organizationId}
**Created:** ${new Date(project.createdAt).toLocaleString()}
**Team Members:** ${project.teamMembers.length}

## API Keys (${apiKeys.length})
${apiKeys.length > 0 ?
                apiKeys.map((key: any) => `- **${key.name}** (${key.keyType}, ${key.environment})`).join('\n') :
                'No API keys found in this project'
            }

## Settings
\`\`\`json
${JSON.stringify(project.settings, null, 2)}
\`\`\``;

        vscode.workspace.openTextDocument({
            content,
            language: 'markdown'
        }).then((doc: any) => {
            vscode.window.showTextDocument(doc);
        });
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to load project details: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export function deactivate() {
    // Cleanup if needed
}
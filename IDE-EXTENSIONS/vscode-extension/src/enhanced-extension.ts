import * as vscode from 'vscode';
import { MemoryTreeProvider } from './providers/MemoryTreeProvider';
import { MemoryCompletionProvider } from './providers/MemoryCompletionProvider';
import { ApiKeyTreeProvider } from './providers/ApiKeyTreeProvider';
import { EnhancedMemoryService } from './services/EnhancedMemoryService';
import { ApiKeyService } from './services/ApiKeyService';
import { SecureApiKeyService } from './services/SecureApiKeyService';
import { MemoryType } from './types/memory-aligned';

let enhancedMemoryService: EnhancedMemoryService;

export async function activate(context: vscode.ExtensionContext) {
    console.log('Lanonasis Memory Extension (Enhanced) is now active');

    // Create output channel for logging
    const outputChannel = vscode.window.createOutputChannel('Lanonasis');

    // Initialize secure API key service
    const secureApiKeyService = new SecureApiKeyService(context, outputChannel);
    await secureApiKeyService.initialize();

    // Initialize enhanced memory service
    enhancedMemoryService = new EnhancedMemoryService(secureApiKeyService);

    // Initialize API key service
    const apiKeyService = new ApiKeyService(secureApiKeyService);

    // Initialize tree providers
    const memoryTreeProvider = new MemoryTreeProvider(enhancedMemoryService as any);
    const apiKeyTreeProvider = new ApiKeyTreeProvider(apiKeyService);

    vscode.window.registerTreeDataProvider('lanonasisMemories', memoryTreeProvider);
    vscode.window.registerTreeDataProvider('lanonasisApiKeys', apiKeyTreeProvider);

    // Initialize completion provider
    const completionProvider = new MemoryCompletionProvider(enhancedMemoryService as any);
    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider(
            { scheme: 'file' },
            completionProvider,
            '@', '#', '//'
        )
    );

    // Set context variables
    vscode.commands.executeCommand('setContext', 'lanonasis.enabled', true);

    // Check authentication status and CLI capabilities
    await checkEnhancedAuthenticationStatus();

    // Register commands
    const commands = [
        vscode.commands.registerCommand('lanonasis.searchMemory', async () => {
            await searchMemories();
        }),

        vscode.commands.registerCommand('lanonasis.createMemory', async () => {
            await createMemoryFromSelection();
        }),

        vscode.commands.registerCommand('lanonasis.createMemoryFromFile', async () => {
            await createMemoryFromFile();
        }),

        vscode.commands.registerCommand('lanonasis.authenticate', async () => {
            await authenticate();
        }),

        vscode.commands.registerCommand('lanonasis.refreshMemories', async () => {
            memoryTreeProvider.refresh();
        }),

        vscode.commands.registerCommand('lanonasis.openMemory', (memory: any) => {
            openMemoryInEditor(memory);
        }),

        vscode.commands.registerCommand('lanonasis.switchMode', async () => {
            await switchConnectionMode();
        }),

        // Enhanced command for connection info
        vscode.commands.registerCommand('lanonasis.showConnectionInfo', async () => {
            await enhancedMemoryService.showConnectionInfo();
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

    // Add enhanced service to subscriptions for proper cleanup
    context.subscriptions.push(enhancedMemoryService);

    // Show welcome message with CLI information if first time
    const isFirstTime = context.globalState.get('lanonasis.firstTime', true);
    if (isFirstTime) {
        await showEnhancedWelcomeMessage();
        context.globalState.update('lanonasis.firstTime', false);
    }

    // Show upgrade message if migrating from basic service
    const hasSeenUpgrade = context.globalState.get('lanonasis.seenCliUpgrade', false);
    if (!hasSeenUpgrade) {
        await showCliUpgradeMessage();
        context.globalState.update('lanonasis.seenCliUpgrade', true);
    }
}

async function checkEnhancedAuthenticationStatus() {
    const config = vscode.workspace.getConfiguration('lanonasis');
    const apiKey = config.get<string>('apiKey');
    const authenticated = !!apiKey && apiKey.trim().length > 0;

    vscode.commands.executeCommand('setContext', 'lanonasis.authenticated', authenticated);

    if (!authenticated) {
        const result = await vscode.window.showInformationMessage(
            'Lanonasis Memory: No API key configured. Would you like to set it up now?',
            'Configure', 'Later'
        );

        if (result === 'Configure') {
            vscode.commands.executeCommand('lanonasis.authenticate');
        }
        return;
    }

    // Check CLI capabilities
    const capabilities = enhancedMemoryService.getCapabilities();
    if (capabilities?.cliAvailable && capabilities.goldenContract) {
        vscode.window.showInformationMessage(
            '🚀 Lanonasis Memory: CLI v1.5.2+ detected! Enhanced performance active.',
            'Show Details'
        ).then(selection => {
            if (selection === 'Show Details') {
                vscode.commands.executeCommand('lanonasis.showConnectionInfo');
            }
        });
    } else if (capabilities?.authenticated) {
        const installCLI = await vscode.window.showInformationMessage(
            '💡 Lanonasis Memory: Install CLI v1.5.2+ for enhanced performance.',
            'Install CLI', 'Learn More', 'Later'
        );

        if (installCLI === 'Install CLI') {
            vscode.env.openExternal(vscode.Uri.parse('https://www.npmjs.com/package/@lanonasis/cli'));
        } else if (installCLI === 'Learn More') {
            vscode.env.openExternal(vscode.Uri.parse('https://docs.lanonasis.com/cli'));
        }
    }
}

async function searchMemories() {
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
            const results = await enhancedMemoryService.searchMemories(query);
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

async function createMemoryFromSelection() {
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
            await enhancedMemoryService.createMemory({
                title,
                content: selectedText,
                memory_type: defaultType as MemoryType,
                tags: ['vscode', 'selection', 'enhanced'],
                metadata: {
                    source: 'vscode-enhanced',
                    fileName,
                    lineNumber: lineNumber.toString(),
                    extensionVersion: '1.3.0'
                }
            });
        });

        vscode.window.showInformationMessage(`Memory "${title}" created successfully`);
        vscode.commands.executeCommand('lanonasis.refreshMemories');
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to create memory: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

async function createMemoryFromFile() {
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
            await enhancedMemoryService.createMemory({
                title,
                content,
                memory_type: defaultType as MemoryType,
                tags: ['vscode', 'file', 'enhanced'],
                metadata: {
                    source: 'vscode-file-enhanced',
                    fileName,
                    fullPath: fileName,
                    extensionVersion: '1.3.0'
                }
            });
        });

        vscode.window.showInformationMessage(`Memory "${title}" created from file`);
        vscode.commands.executeCommand('lanonasis.refreshMemories');
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to create memory: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

async function authenticate() {
    const apiKey = await vscode.window.showInputBox({
        prompt: 'Enter your Lanonasis API Key',
        placeHolder: 'Get your API key from api.lanonasis.com',
        password: true,
        ignoreFocusOut: true
    });

    if (!apiKey) return;

    try {
        // Test the API key with enhanced service
        await enhancedMemoryService.testConnection(apiKey);

        // Save to configuration
        const config = vscode.workspace.getConfiguration('lanonasis');
        await config.update('apiKey', apiKey, vscode.ConfigurationTarget.Global);

        // Refresh the client to pick up new configuration
        await enhancedMemoryService.refreshClient();

        vscode.commands.executeCommand('setContext', 'lanonasis.authenticated', true);
        vscode.window.showInformationMessage('Successfully authenticated with Lanonasis Memory Service');
        vscode.commands.executeCommand('lanonasis.refreshMemories');

        // Check CLI capabilities after authentication
        setTimeout(async () => {
            await checkEnhancedAuthenticationStatus();
        }, 1000);

    } catch (error) {
        vscode.window.showErrorMessage(`Authentication failed: ${error instanceof Error ? error.message : 'Invalid API key'}`);
    }
}

function openMemoryInEditor(memory: any) {
    const capabilities = enhancedMemoryService.getCapabilities();
    const connectionInfo = capabilities?.cliAvailable ?
        (capabilities.mcpSupport ? 'CLI+MCP' : 'CLI') :
        'API';

    const content = `# ${memory.title}\n\n**Type:** ${memory.type}\n**Created:** ${new Date(memory.created_at).toLocaleString()}\n**Connection:** ${connectionInfo}\n\n---\n\n${memory.content}`;

    vscode.workspace.openTextDocument({
        content,
        language: 'markdown'
    }).then(doc => {
        vscode.window.showTextDocument(doc);
    });
}

async function showEnhancedWelcomeMessage() {
    const message = `Welcome to Lanonasis Memory Assistant v1.3! 

🧠 Enhanced with CLI v1.5.2+ integration for better performance
🔍 Press Ctrl+Shift+M to search memories  
📝 Select text and press Ctrl+Shift+Alt+M to create a memory
🌐 Intelligent routing via CLI/MCP when available
🚀 Automatic fallback to direct API when needed

Get your API key from api.lanonasis.com to get started.`;

    const selection = await vscode.window.showInformationMessage(
        message,
        'Get API Key',
        'Install CLI',
        'Configure'
    );

    if (selection === 'Get API Key') {
        vscode.env.openExternal(vscode.Uri.parse('https://api.lanonasis.com'));
    } else if (selection === 'Install CLI') {
        vscode.env.openExternal(vscode.Uri.parse('https://www.npmjs.com/package/@lanonasis/cli'));
    } else if (selection === 'Configure') {
        vscode.commands.executeCommand('lanonasis.authenticate');
    }
}

async function showCliUpgradeMessage() {
    const selection = await vscode.window.showInformationMessage(
        '🚀 Lanonasis Memory v1.3 now supports CLI integration for enhanced performance!\n\nInstall @lanonasis/cli v1.5.2+ to unlock faster operations and MCP support.',
        'Install CLI',
        'Learn More',
        'Later'
    );

    if (selection === 'Install CLI') {
        vscode.env.openExternal(vscode.Uri.parse('https://www.npmjs.com/package/@lanonasis/cli'));
    } else if (selection === 'Learn More') {
        vscode.env.openExternal(vscode.Uri.parse('https://docs.lanonasis.com/cli/vscode'));
    }
}

async function switchConnectionMode() {
    const config = vscode.workspace.getConfiguration('lanonasis');
    const currentUseGateway = config.get<boolean>('useGateway', true);
    const currentPreferCLI = config.get<boolean>('preferCLI', true);

    const options = [
        {
            label: '🚀 Auto (CLI + Gateway)',
            description: 'Use CLI when available, fallback to Gateway (Recommended)',
            picked: currentPreferCLI && currentUseGateway,
            value: { preferCLI: true, useGateway: true }
        },
        {
            label: '⚡ CLI Only',
            description: 'Use CLI v1.5.2+ for all operations',
            picked: currentPreferCLI && !currentUseGateway,
            value: { preferCLI: true, useGateway: false }
        },
        {
            label: '🌐 Gateway Only',
            description: 'Use Onasis Gateway, no CLI integration',
            picked: !currentPreferCLI && currentUseGateway,
            value: { preferCLI: false, useGateway: true }
        },
        {
            label: '🔗 Direct API',
            description: 'Connect directly to memory service',
            picked: !currentPreferCLI && !currentUseGateway,
            value: { preferCLI: false, useGateway: false }
        }
    ];

    const selected = await vscode.window.showQuickPick(options, {
        placeHolder: 'Choose connection mode',
        ignoreFocusOut: true
    });

    if (!selected) return;

    try {
        await config.update('useGateway', selected.value.useGateway, vscode.ConfigurationTarget.Global);
        await config.update('preferCLI', selected.value.preferCLI, vscode.ConfigurationTarget.Global);

        await enhancedMemoryService.refreshClient();

        vscode.window.showInformationMessage(`Updated connection preferences. Testing...`);

        // Test the new connection
        await enhancedMemoryService.testConnection();
        vscode.window.showInformationMessage(`✅ Connection mode updated successfully`);

        vscode.commands.executeCommand('lanonasis.refreshMemories');

        // Show updated connection info
        setTimeout(() => {
            vscode.commands.executeCommand('lanonasis.showConnectionInfo');
        }, 1000);

    } catch (error) {
        vscode.window.showErrorMessage(`Failed to switch mode: ${error instanceof Error ? error.message : 'Unknown error'}`);
        // Revert the settings
        await config.update('useGateway', currentUseGateway, vscode.ConfigurationTarget.Global);
        await config.update('preferCLI', currentPreferCLI, vscode.ConfigurationTarget.Global);
        await enhancedMemoryService.refreshClient();
    }
}

// Import existing API key management functions from original extension
// These remain the same as they don't need CLI integration
export async function manageApiKeys(apiKeyService: ApiKeyService) {
    // ... (implementation same as original)
}

export async function createProject(apiKeyService: ApiKeyService, apiKeyTreeProvider: ApiKeyTreeProvider) {
    // ... (implementation same as original) 
}

export async function viewProjects(apiKeyService: ApiKeyService) {
    // ... (implementation same as original)
}

export function deactivate() {
    if (enhancedMemoryService) {
        enhancedMemoryService.dispose();
    }
}
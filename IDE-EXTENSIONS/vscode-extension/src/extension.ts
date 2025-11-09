import * as vscode from 'vscode';
import { MemoryTreeProvider } from './providers/MemoryTreeProvider';
import { MemoryCompletionProvider } from './providers/MemoryCompletionProvider';
import { ApiKeyTreeProvider } from './providers/ApiKeyTreeProvider';
import { MemorySidebarProvider } from './panels/MemorySidebarProvider';
import { MemoryService } from './services/MemoryService';
import { EnhancedMemoryService } from './services/EnhancedMemoryService';
import type { IMemoryService } from './services/IMemoryService';
import { ApiKeyService } from './services/ApiKeyService';
import type { ApiKey, Project, CreateApiKeyRequest } from './services/ApiKeyService';
import { SecureApiKeyService } from './services/SecureApiKeyService';
import { MemoryType, MemoryEntry, MemorySearchResult } from './types/memory-aligned';
import { withRetry, showErrorWithRecovery, withProgressAndRetry } from './utils/errorRecovery';
import { runDiagnostics, formatDiagnosticResults } from './utils/diagnostics';

export async function activate(context: vscode.ExtensionContext) {
    console.log('Lanonasis Memory Extension is now active');

    const outputChannel = vscode.window.createOutputChannel('Lanonasis');

    const secureApiKeyService = new SecureApiKeyService(context, outputChannel);
    await secureApiKeyService.initialize();

    let memoryService: IMemoryService;

    try {
        memoryService = new EnhancedMemoryService(secureApiKeyService);
        console.log('Using Enhanced Memory Service with CLI integration');
    } catch (error) {
        console.warn('Enhanced Memory Service not available, using basic service:', error);
        memoryService = new MemoryService(secureApiKeyService);
    }
    const apiKeyService = new ApiKeyService(secureApiKeyService);

    const sidebarProvider = new MemorySidebarProvider(context.extensionUri, memoryService);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            MemorySidebarProvider.viewType,
            sidebarProvider
        )
    );

    const memoryTreeProvider = new MemoryTreeProvider(memoryService);
    const apiKeyTreeProvider = new ApiKeyTreeProvider(apiKeyService);

    context.subscriptions.push(
        vscode.window.registerTreeDataProvider('lanonasisMemories', memoryTreeProvider),
        vscode.window.registerTreeDataProvider('lanonasisApiKeys', apiKeyTreeProvider)
    );

    const completionProvider = new MemoryCompletionProvider(memoryService);
    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider(
            { scheme: 'file' },
            completionProvider,
            '@', '#', '//'
        )
    );

    const configuration = vscode.workspace.getConfiguration('lanonasis');
    await vscode.commands.executeCommand('setContext', 'lanonasis.enabled', true);
    await vscode.commands.executeCommand(
        'setContext',
        'lanonasis.enableApiKeyManagement',
        configuration.get<boolean>('enableApiKeyManagement', true)
    );
    await vscode.commands.executeCommand('setContext', 'lanonasis.authenticated', false);

    memoryTreeProvider.setAuthenticated(false);
    apiKeyTreeProvider.setAuthenticated(false);

    const refreshServices = async () => {
        try {
            await memoryService.refreshClient();
        } catch (error) {
            outputChannel.appendLine(`[Auth] Failed to refresh memory service: ${error instanceof Error ? error.message : String(error)}`);
        }

        try {
            apiKeyService.refreshConfig();
        } catch (error) {
            outputChannel.appendLine(`[Auth] Failed to refresh API key service: ${error instanceof Error ? error.message : String(error)}`);
        }
    };

    const applyAuthenticationState = async (authenticated: boolean) => {
        await vscode.commands.executeCommand('setContext', 'lanonasis.authenticated', authenticated);
        memoryTreeProvider.setAuthenticated(authenticated);
        apiKeyTreeProvider.setAuthenticated(authenticated);
        await sidebarProvider.refresh();
    };

    const announceEnhancedCapabilities = () => {
        if (!(memoryService instanceof EnhancedMemoryService)) {
            return;
        }

        const capabilities = memoryService.getCapabilities();
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
    };

    const handleAuthenticationSuccess = async () => {
        await refreshServices();
        await applyAuthenticationState(true);
        announceEnhancedCapabilities();
    };

    const handleAuthenticationCleared = async () => {
        try {
            await memoryService.refreshClient();
        } catch (error) {
            outputChannel.appendLine(`[ClearAuth] Failed to refresh memory service: ${error instanceof Error ? error.message : String(error)}`);
        }
        await applyAuthenticationState(false);
    };

    // Register authentication command FIRST before any other code tries to call it
    const authenticateCommand = vscode.commands.registerCommand('lanonasis.authenticate', async (mode?: 'oauth' | 'apikey') => {
        try {
            let apiKey: string | null = null;

            if (mode === 'oauth') {
                apiKey = await secureApiKeyService.authenticateWithOAuthFlow();
            } else if (mode === 'apikey') {
                apiKey = await secureApiKeyService.promptForApiKeyEntry();
            } else {
                apiKey = await secureApiKeyService.promptForAuthentication();
            }

            if (apiKey) {
                await handleAuthenticationSuccess();
                vscode.window.showInformationMessage('✅ Successfully authenticated with Lanonasis Memory');
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`Authentication failed: ${message}`);
            outputChannel.appendLine(`[Auth] Error: ${message}`);
        }
    });

    const promptForAuthenticationIfMissing = async () => {
        const selection = await vscode.window.showInformationMessage(
            'Lanonasis Memory: No authentication configured. Choose how you would like to connect.',
            'Connect in Browser',
            'Enter API Key',
            'Maybe Later'
        );

        if (selection === 'Connect in Browser') {
            vscode.commands.executeCommand('lanonasis.authenticate', 'oauth');
        } else if (selection === 'Enter API Key') {
            vscode.commands.executeCommand('lanonasis.authenticate', 'apikey');
        }
    };

    const commands = [
        authenticateCommand,
        vscode.commands.registerCommand('lanonasis.searchMemory', async () => {
            await searchMemories(memoryService);
        }),

        vscode.commands.registerCommand('lanonasis.createMemory', async () => {
            await createMemoryFromSelection(memoryService);
        }),

        vscode.commands.registerCommand('lanonasis.createMemoryFromFile', async () => {
            await createMemoryFromFile(memoryService);
        }),

        // Note: lanonasis.authenticate is registered earlier (line 125) to prevent timing issues

        vscode.commands.registerCommand('lanonasis.refreshMemories', async () => {
            memoryTreeProvider.refresh();
            await sidebarProvider.refresh();
        }),

        vscode.commands.registerCommand('lanonasis.openMemory', (memory: MemoryEntry) => {
            openMemoryInEditor(memory);
        }),

        vscode.commands.registerCommand('lanonasis.switchMode', async () => {
            await switchConnectionMode(memoryService, apiKeyService);
            memoryTreeProvider.refresh();
            await sidebarProvider.refresh();
        }),

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
            apiKeyTreeProvider.refresh(true);
        }),

        vscode.commands.registerCommand('lanonasis.showConnectionInfo', async () => {
            if (memoryService instanceof EnhancedMemoryService) {
                await memoryService.showConnectionInfo();
            } else {
                vscode.window.showInformationMessage('Connection info available in Enhanced Memory Service. Upgrade to CLI integration for more details.');
            }
        }),

        vscode.commands.registerCommand('lanonasis.configureApiKey', async (mode?: 'oauth' | 'apikey') => {
            await vscode.commands.executeCommand('lanonasis.authenticate', mode);
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
                    await handleAuthenticationCleared();
                    await promptForAuthenticationIfMissing();
                }
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                vscode.window.showErrorMessage(`Failed to clear API key: ${message}`);
                outputChannel.appendLine(`[ClearApiKey] Error: ${message}`);
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
                        'Connect in Browser',
                        'Enter API Key'
                    ).then((selection) => {
                        if (selection === 'Connect in Browser') {
                            vscode.commands.executeCommand('lanonasis.authenticate', 'oauth');
                        } else if (selection === 'Enter API Key') {
                            vscode.commands.executeCommand('lanonasis.authenticate', 'apikey');
                        }
                    });
                }
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                vscode.window.showErrorMessage(`Failed to check API key status: ${message}`);
                outputChannel.appendLine(`[CheckApiKeyStatus] Error: ${message}`);
            }
        }),

        vscode.commands.registerCommand('lanonasis.testConnection', async () => {
            try {
                const hasApiKey = await secureApiKeyService.hasApiKey();
                if (!hasApiKey) {
                    vscode.window.showWarningMessage('❌ No API key configured.');
                    return;
                }

                await memoryService.testConnection();
                vscode.window.showInformationMessage('✅ Connection test successful!');
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                vscode.window.showErrorMessage(`Connection test failed: ${message}`);
                outputChannel.appendLine(`[TestConnection] Error: ${message}`);
            }
        }),

        vscode.commands.registerCommand('lanonasis.runDiagnostics', async () => {
            try {
                outputChannel.show();
                outputChannel.appendLine('Running comprehensive diagnostics...\n');

                const health = await runDiagnostics(
                    context,
                    secureApiKeyService,
                    memoryService,
                    outputChannel
                );

                const report = formatDiagnosticResults(health);

                // Show report in a new document
                const doc = await vscode.workspace.openTextDocument({
                    content: report,
                    language: 'markdown'
                });

                await vscode.window.showTextDocument(doc);

                // Show summary notification
                const statusEmoji = {
                    healthy: '✅',
                    degraded: '⚠️',
                    critical: '❌'
                };

                const message = `${statusEmoji[health.overall]} System Health: ${health.overall.toUpperCase()}`;

                if (health.overall === 'healthy') {
                    vscode.window.showInformationMessage(message, 'View Report').then(action => {
                        if (action === 'View Report') {
                            outputChannel.show();
                        }
                    });
                } else if (health.overall === 'degraded') {
                    vscode.window.showWarningMessage(message, 'View Report', 'Fix Issues').then(action => {
                        if (action === 'View Report') {
                            outputChannel.show();
                        }
                    });
                } else {
                    vscode.window.showErrorMessage(message, 'View Report', 'Get Help').then(action => {
                        if (action === 'View Report') {
                            outputChannel.show();
                        } else if (action === 'Get Help') {
                            vscode.env.openExternal(vscode.Uri.parse('https://docs.lanonasis.com/troubleshooting'));
                        }
                    });
                }
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                vscode.window.showErrorMessage(`Diagnostics failed: ${message}`);
                outputChannel.appendLine(`[Diagnostics] Fatal error: ${message}`);
            }
        }),

        vscode.commands.registerCommand('lanonasis.showLogs', () => {
            outputChannel.show();
        })
    ];

    context.subscriptions.push(...commands);

    if (memoryService instanceof EnhancedMemoryService) {
        context.subscriptions.push(memoryService);
    }

    const hasStoredKey = await secureApiKeyService.hasApiKey();

    if (hasStoredKey) {
        await handleAuthenticationSuccess();
    } else {
        await applyAuthenticationState(false);
    }

    const isFirstTime = context.globalState.get('lanonasis.firstTime', true);
    if (isFirstTime) {
        showWelcomeMessage();
        await context.globalState.update('lanonasis.firstTime', false);
    }

    if (!hasStoredKey && !isFirstTime) {
        await promptForAuthenticationIfMissing();
    }
}

async function searchMemories(memoryService: IMemoryService) {
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

async function showSearchResults(results: MemorySearchResult[], query: string) {
    if (results.length === 0) {
        vscode.window.showInformationMessage(`No memories found for "${query}"`);
        return;
    }

    const items = results.map(memory => ({
        label: memory.title,
        description: memory.memory_type,
        detail: `${memory.content.substring(0, 100)}${memory.content.length > 100 ? '...' : ''}`,
        memory
    }));

    const selected = await vscode.window.showQuickPick(items, {
        placeHolder: `Found ${results.length} memories for "${query}"`
    });

    if (selected) {
        openMemoryInEditor(selected.memory);
    }
}

async function createMemoryFromSelection(memoryService: IMemoryService) {
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

async function createMemoryFromFile(memoryService: IMemoryService) {
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

function openMemoryInEditor(memory: MemoryEntry | MemorySearchResult) {
    const content = `# ${memory.title}\n\n**Type:** ${memory.memory_type}\n**Created:** ${new Date(memory.created_at).toLocaleString()}\n\n---\n\n${memory.content}`;

    vscode.workspace.openTextDocument({
        content,
        language: 'markdown'
    }).then(doc => {
        vscode.window.showTextDocument(doc);
    });
}

async function checkEnhancedAuthenticationStatus(enhancedService: EnhancedMemoryService) {
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
    const message = `🎉 Welcome to Lanonasis Memory Assistant!

Your AI-powered memory management system is ready. Let's get you started!`;

    vscode.window.showInformationMessage(
        message,
        'Connect in Browser',
        'Enter API Key',
        'Get API Key',
        'Learn More'
    ).then(selection => {
        if (selection === 'Connect in Browser') {
            vscode.commands.executeCommand('lanonasis.authenticate', 'oauth');
        } else if (selection === 'Enter API Key') {
            vscode.commands.executeCommand('lanonasis.authenticate', 'apikey');
        } else if (selection === 'Get API Key') {
            vscode.env.openExternal(vscode.Uri.parse('https://api.lanonasis.com'));
        } else if (selection === 'Learn More') {
            showOnboardingGuide();
        }
    });
}

function showOnboardingGuide() {
    const guide = `# 🧠 Lanonasis Memory Assistant - Quick Start Guide

Welcome to your AI-powered memory management system! This guide will help you get started in just a few minutes.

## 🚀 Getting Started

### Step 1: Authenticate
Choose one of two authentication methods:

**Option A: Browser Authentication (Recommended)**
1. Click the Lanonasis icon in the sidebar
2. Click "Continue in Browser"
3. Sign in with your Lanonasis account
4. Authorize the extension

**Option B: API Key Authentication**
1. Visit https://api.lanonasis.com to get your API key
2. Click the Lanonasis icon in the sidebar
3. Click "Enter API Key"
4. Paste your API key when prompted

### Step 2: Create Your First Memory
There are multiple ways to create memories:

**From Selected Text:**
1. Select any text in your editor
2. Press \`Ctrl+Shift+Alt+M\` (or \`Cmd+Shift+Alt+M\` on Mac)
3. Give your memory a title
4. Done! Your memory is saved

**From Current File:**
1. Open any file
2. Run command: \`Lanonasis: Create Memory from Current File\`
3. Give your memory a title
4. The entire file content is saved as a memory

**From Sidebar:**
1. Click the Lanonasis icon in the sidebar
2. Click the "Create" button
3. Select text first, then click to save

### Step 3: Search Your Memories
**Quick Search:**
- Press \`Ctrl+Shift+M\` (or \`Cmd+Shift+M\` on Mac)
- Type your search query
- Select a memory to open it

**Sidebar Search:**
- Open the Lanonasis sidebar
- Use the search box at the top
- Results appear instantly

## 🎯 Key Features

### Memory Types
Memories are automatically organized by type:
- **Context**: Code snippets and contextual information
- **Project**: Project-specific notes and documentation
- **Knowledge**: General knowledge and learnings
- **Reference**: Reference materials and guides
- **Conversation**: Discussion notes and meeting summaries

### CLI Integration
If you have \`@lanonasis/cli\` v3.0.6+ installed, you'll get:
- ⚡ Faster performance
- 🔄 Enhanced caching
- 🚀 Advanced features

Install with: \`npm install -g @lanonasis/cli\`

### API Key Management
Manage multiple API keys for different projects:
- Press \`Ctrl+Shift+K\` (or \`Cmd+Shift+K\` on Mac)
- Create, view, and organize API keys
- Support for different environments (dev, staging, prod)

## 🛠️ Useful Commands

Open the Command Palette (\`Ctrl+Shift+P\` or \`Cmd+Shift+P\`) and try:

- \`Lanonasis: Search Memories\` - Search your memories
- \`Lanonasis: Create Memory from Selection\` - Save selected text
- \`Lanonasis: Manage API Keys\` - Manage your API keys
- \`Lanonasis: Run System Diagnostics\` - Check system health
- \`Lanonasis: Show Extension Logs\` - View detailed logs
- \`Lanonasis: Test Connection\` - Test your connection
- \`Lanonasis: Switch Gateway/Direct API Mode\` - Change connection mode

## 🔧 Troubleshooting

### Connection Issues?
1. Run: \`Lanonasis: Run System Diagnostics\`
2. Check the diagnostics report for issues
3. Follow recommended actions

### Authentication Problems?
1. Run: \`Lanonasis: Check API Key Status\`
2. Clear and re-enter your API key if needed
3. Try OAuth authentication as an alternative

### Need Help?
- 📚 Documentation: https://docs.lanonasis.com
- 🐛 Report Issues: https://github.com/lanonasis/lanonasis-maas/issues
- 💬 Community: https://discord.gg/lanonasis

## ⚙️ Settings

Configure the extension to your liking:
1. Go to: \`File > Preferences > Settings\`
2. Search for: \`Lanonasis\`
3. Customize:
   - API URLs
   - Default memory types
   - Search limits
   - Performance options
   - And more!

## 🎓 Tips & Tricks

1. **Use Keyboard Shortcuts**: Master the shortcuts for faster workflow
2. **Tag Your Memories**: Add tags during creation for better organization
3. **Regular Backups**: Export important memories regularly
4. **CLI Integration**: Install the CLI for best performance
5. **Organize by Project**: Use project-specific memories for better context

## 🎉 You're All Set!

You're now ready to use Lanonasis Memory Assistant. Start by:
1. Authenticating (if you haven't already)
2. Creating your first memory
3. Searching and exploring

Happy memory management! 🧠✨

---

**Quick Reference:**
- Search: \`Ctrl+Shift+M\` / \`Cmd+Shift+M\`
- Create from Selection: \`Ctrl+Shift+Alt+M\` / \`Cmd+Shift+Alt+M\`
- Manage API Keys: \`Ctrl+Shift+K\` / \`Cmd+Shift+K\`
`;

    vscode.workspace.openTextDocument({
        content: guide,
        language: 'markdown'
    }).then(doc => {
        vscode.window.showTextDocument(doc);
    });
}

async function switchConnectionMode(memoryService: IMemoryService, apiKeyService: ApiKeyService) {
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
        apiKeyService.refreshConfig();

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
        await memoryService.refreshClient();
        apiKeyService.refreshConfig();
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
        type KeyTypeOption = vscode.QuickPickItem & { value: CreateApiKeyRequest['keyType'] };
        const keyTypes: KeyTypeOption[] = [
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

        type EnvironmentOption = vscode.QuickPickItem & { value: CreateApiKeyRequest['environment'] };
        const environments: EnvironmentOption[] = [
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
                keyType: selectedKeyType.value,
                environment: selectedEnvironment.value,
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
        let organizationId = config.get<string>('organizationId');

        if (!organizationId) {
            const orgId = await vscode.window.showInputBox({
                prompt: 'Organization ID',
                placeHolder: 'Enter your organization ID'
            });

            if (!orgId) return;

            await config.update('organizationId', orgId, vscode.ConfigurationTarget.Global);
            organizationId = orgId;
        }

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Creating project...',
            cancellable: false
        }, async () => {
            const project = await apiKeyService.createProject({
                name,
                description,
                organizationId: organizationId
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

async function showApiKeyDetails(apiKey: ApiKey) {
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
    }).then((doc: vscode.TextDocument) => {
        vscode.window.showTextDocument(doc);
    });
}

async function showProjectDetails(project: Project, apiKeyService: ApiKeyService) {
    try {
        const apiKeys = await apiKeyService.getApiKeys(project.id);

        const content = `# Project: ${project.name}

**Description:** ${project.description || 'No description'}
**Organization ID:** ${project.organizationId}
**Created:** ${new Date(project.createdAt).toLocaleString()}
**Team Members:** ${project.teamMembers.length}

## API Keys (${apiKeys.length})
${apiKeys.length > 0 ?
                apiKeys.map((key: ApiKey) => `- **${key.name}** (${key.keyType}, ${key.environment})`).join('\n') :
                'No API keys found in this project'
            }

## Settings
\`\`\`json
${JSON.stringify(project.settings, null, 2)}
\`\`\``;

        vscode.workspace.openTextDocument({
            content,
            language: 'markdown'
        }).then((doc: vscode.TextDocument) => {
            vscode.window.showTextDocument(doc);
        });
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to load project details: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export function deactivate() {
    // Cleanup if needed
}
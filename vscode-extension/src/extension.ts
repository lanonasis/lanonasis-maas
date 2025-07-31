import * as vscode from 'vscode';
import { MemoryTreeProvider } from './providers/MemoryTreeProvider';
import { MemoryCompletionProvider } from './providers/MemoryCompletionProvider';
import { MemoryService } from './services/MemoryService';
import { MemoryType } from './types/memory-aligned';

export function activate(context: vscode.ExtensionContext) {
    console.log('Lanonasis Memory Extension is now active');

    // Initialize memory service
    const memoryService = new MemoryService();
    
    // Initialize tree provider
    const memoryTreeProvider = new MemoryTreeProvider(memoryService);
    vscode.window.registerTreeDataProvider('lanonasisMemories', memoryTreeProvider);

    // Initialize completion provider
    const completionProvider = new MemoryCompletionProvider(memoryService);
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
    checkAuthenticationStatus();

    // Register commands
    const commands = [
        vscode.commands.registerCommand('lanonasis.searchMemory', async () => {
            await searchMemories(memoryService);
        }),

        vscode.commands.registerCommand('lanonasis.createMemory', async () => {
            await createMemoryFromSelection(memoryService);
        }),

        vscode.commands.registerCommand('lanonasis.createMemoryFromFile', async () => {
            await createMemoryFromFile(memoryService);
        }),

        vscode.commands.registerCommand('lanonasis.authenticate', async () => {
            await authenticate(memoryService);
        }),

        vscode.commands.registerCommand('lanonasis.refreshMemories', async () => {
            memoryTreeProvider.refresh();
        }),

        vscode.commands.registerCommand('lanonasis.openMemory', (memory: any) => {
            openMemoryInEditor(memory);
        }),

        vscode.commands.registerCommand('lanonasis.switchMode', async () => {
            await switchConnectionMode(memoryService);
        })
    ];

    context.subscriptions.push(...commands);

    // Show welcome message if first time
    const isFirstTime = context.globalState.get('lanonasis.firstTime', true);
    if (isFirstTime) {
        showWelcomeMessage();
        context.globalState.update('lanonasis.firstTime', false);
    }
}

async function checkAuthenticationStatus() {
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
        memoryService.refreshClient();
        
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

export function deactivate() {
    // Cleanup if needed
}
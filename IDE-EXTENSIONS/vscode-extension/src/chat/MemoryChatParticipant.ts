import * as vscode from 'vscode';
import type { MemorySearchResult } from '@lanonasis/memory-client';
import type { IMemoryService } from '../services/IMemoryService';

/**
 * Chat Participant for @lanonasis
 * 
 * Enables users to interact with their memory bank via GitHub Copilot Chat.
 * Users can invoke with @lanonasis in the chat window.
 * 
 * Reference: https://code.visualstudio.com/api/extension-guides/ai/chat
 */

// Chat Participant ID must match package.json contribution
export const CHAT_PARTICIPANT_ID = 'lanonasis-memory.memory-assistant';

// Command IDs for slash commands
export interface ChatSlashCommand {
    name: string;
    description: string;
}

export const SLASH_COMMANDS: ChatSlashCommand[] = [
    { name: 'recall', description: 'Search and recall memories semantically' },
    { name: 'save', description: 'Save current context or selection as a memory' },
    { name: 'list', description: 'List recent memories' },
    { name: 'context', description: 'Get relevant context for current file/project' },
    { name: 'refine', description: 'Refine a prompt using your memories as context' },
];

/**
 * Create and register the @lanonasis chat participant
 */
export function registerMemoryChatParticipant(
    context: vscode.ExtensionContext,
    memoryService: IMemoryService
): vscode.ChatParticipant {
    // Create the chat participant
    const participant = vscode.chat.createChatParticipant(
        CHAT_PARTICIPANT_ID,
        createChatRequestHandler(memoryService)
    );

    // Set participant properties
    participant.iconPath = vscode.Uri.joinPath(context.extensionUri, 'images', 'icon.png');

    // Handle user feedback for telemetry
    participant.onDidReceiveFeedback((feedback: vscode.ChatResultFeedback) => {
        console.log('[MemoryChatParticipant] Received feedback:', feedback.kind);
        // Log feedback for improving the experience
    });

    context.subscriptions.push(participant);

    console.log('[MemoryChatParticipant] @lanonasis chat participant registered');
    return participant;
}

/**
 * Create the chat request handler
 */
function createChatRequestHandler(
    memoryService: IMemoryService
): vscode.ChatRequestHandler {
    return async (
        request: vscode.ChatRequest,
        context: vscode.ChatContext,
        stream: vscode.ChatResponseStream,
        token: vscode.CancellationToken
    ): Promise<vscode.ChatResult> => {
        const { prompt, command } = request;

        try {
            // Handle slash commands
            if (command) {
                return await handleSlashCommand(command, prompt, memoryService, stream, token);
            }

            // Default behavior: semantic search with response
            return await handleSemanticQuery(prompt, memoryService, stream, context, token);
        } catch (error) {
            stream.markdown(`❌ **Error:** ${error instanceof Error ? error.message : 'An unexpected error occurred'}`);
            return { errorDetails: { message: error instanceof Error ? error.message : 'Unknown error' } };
        }
    };
}

/**
 * Handle slash commands like /recall, /save, /list, /context
 */
async function handleSlashCommand(
    command: string,
    prompt: string,
    memoryService: IMemoryService,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
): Promise<vscode.ChatResult> {
    switch (command) {
        case 'recall':
            return await handleRecallCommand(prompt, memoryService, stream, token);

        case 'save':
            return await handleSaveCommand(prompt, stream);

        case 'list':
            return await handleListCommand(memoryService, stream, token);

        case 'context':
            return await handleContextCommand(prompt, memoryService, stream, token);

        case 'refine':
            return await handleRefineCommand(prompt, memoryService, stream, token);

        default:
            stream.markdown(`Unknown command: \`/${command}\`. Available commands: ${SLASH_COMMANDS.map(c => `/${c.name}`).join(', ')}`);
            return {};
    }
}

/**
 * Handle /recall command - semantic search for memories
 */
async function handleRecallCommand(
    query: string,
    memoryService: IMemoryService,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
): Promise<vscode.ChatResult> {
    if (!query.trim()) {
        stream.markdown('Please provide a search query. Example: `@lanonasis /recall how to deploy to production`');
        return {};
    }

    stream.progress('Searching memories...');

    const results = await memoryService.searchMemories(query, { limit: 5 });

    if (token.isCancellationRequested) {
        return { errorDetails: { message: 'Search cancelled' } };
    }

    if (results.length === 0) {
        stream.markdown(`No memories found for "${query}". Try a different search term or create new memories.`);
        
        // Suggest creating a memory
        stream.button({
            command: 'lanonasis.createMemoryFromFile',
            title: '📝 Create Memory'
        });
        
        return {};
    }

    // Display results
    stream.markdown(`## 🧠 Found ${results.length} relevant memories\n\n`);

    results.forEach((result, index) => {
        stream.markdown(`### ${index + 1}. ${result.title}\n`);
        stream.markdown(`${result.content.substring(0, 300)}${result.content.length > 300 ? '...' : ''}\n\n`);
        
        if (result.tags && result.tags.length > 0) {
            stream.markdown(`*Tags: ${result.tags.join(', ')}*\n\n`);
        }
        
        stream.markdown('---\n\n');
    });

    // Provide follow-up actions
    stream.button({
        command: 'lanonasis.searchMemory',
        title: '🔍 Search More'
    });

    return {
        metadata: {
            command: 'recall',
            resultCount: results.length
        }
    };
}

/**
 * Handle /save command - save selection or clipboard as memory
 */
async function handleSaveCommand(
    title: string,
    stream: vscode.ChatResponseStream
): Promise<vscode.ChatResult> {
    const editor = vscode.window.activeTextEditor;
    
    if (editor && !editor.selection.isEmpty) {
        // Save selected text
        stream.markdown('💾 Saving selected text as a memory...\n\n');
        stream.button({
            command: 'lanonasis.createMemory',
            title: '📝 Create from Selection'
        });
    } else {
        // Guide user to save something
        stream.markdown('To save a memory:\n\n');
        stream.markdown('1. **Select text** in the editor and run `@lanonasis /save`\n');
        stream.markdown('2. Use **Quick Capture** with `⌘⇧S` / `Ctrl+Shift+S`\n');
        stream.markdown('3. Or click below to create from clipboard:\n\n');
        
        stream.button({
            command: 'lanonasis.captureClipboard',
            title: '📋 Capture Clipboard'
        });
    }

    if (title.trim()) {
        stream.markdown(`\n*Suggested title: "${title}"*`);
    }

    return {};
}

/**
 * Handle /list command - show recent memories
 */
async function handleListCommand(
    memoryService: IMemoryService,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
): Promise<vscode.ChatResult> {
    stream.progress('Loading memories...');

    const memories = await memoryService.listMemories(10);

    if (token.isCancellationRequested) {
        return { errorDetails: { message: 'List cancelled' } };
    }

    if (!memories || memories.length === 0) {
        stream.markdown('📭 No memories found. Start building your memory bank!\n\n');
        stream.button({
            command: 'lanonasis.createMemoryFromFile',
            title: '📝 Create First Memory'
        });
        return {};
    }

    stream.markdown(`## 📚 Recent Memories (${memories.length})\n\n`);

    memories.forEach((memory, index) => {
        const typeEmoji = getTypeEmoji(memory.memory_type);
        stream.markdown(`${index + 1}. ${typeEmoji} **${memory.title}** - _${memory.memory_type}_\n`);
    });

    stream.markdown('\n');
    stream.button({
        command: 'lanonasis.searchMemory',
        title: '🔍 Search Memories'
    });

    return {
        metadata: {
            command: 'list',
            count: memories.length
        }
    };
}

/**
 * Handle /context command - get relevant context for current work
 */
async function handleContextCommand(
    additionalQuery: string,
    memoryService: IMemoryService,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
): Promise<vscode.ChatResult> {
    const editor = vscode.window.activeTextEditor;
    const fileName = editor?.document.fileName || '';
    const fileExtension = fileName.split('.').pop() || '';
    const workspaceName = vscode.workspace.name || '';

    // Build context query
    const contextTerms: string[] = [];
    if (workspaceName) contextTerms.push(workspaceName);
    if (fileExtension) contextTerms.push(fileExtension);
    if (additionalQuery) contextTerms.push(additionalQuery);

    const query = contextTerms.join(' ') || 'development context';

    stream.progress(`Finding relevant context for ${fileName ? `"${fileName.split('/').pop()}"` : 'your workspace'}...`);

    const results = await memoryService.searchMemories(query, { limit: 5 });

    if (token.isCancellationRequested) {
        return { errorDetails: { message: 'Context search cancelled' } };
    }

    stream.markdown(`## 📑 Relevant Context\n\n`);

    if (results.length === 0) {
        stream.markdown(`No relevant memories found for the current context.\n\n`);
        stream.markdown(`*Search terms: ${query}*\n\n`);
    } else {
        stream.markdown(`Found ${results.length} relevant memories:\n\n`);
        
        results.forEach((result, index) => {
            stream.markdown(`### ${index + 1}. ${result.title}\n`);
            stream.markdown(`${result.content.substring(0, 200)}...\n\n`);
        });
    }

    stream.markdown(`\n💡 *Tip: Use \`@lanonasis /save\` to save important context for later.*`);

    return {
        metadata: {
            command: 'context',
            query,
            resultCount: results.length
        }
    };
}

/**
 * Handle default semantic query (no slash command)
 */
async function handleSemanticQuery(
    prompt: string,
    memoryService: IMemoryService,
    stream: vscode.ChatResponseStream,
    context: vscode.ChatContext,
    token: vscode.CancellationToken
): Promise<vscode.ChatResult> {
    if (!prompt.trim()) {
        stream.markdown('👋 **Welcome to LanOnasis Memory!**\n\n');
        stream.markdown('I can help you manage your knowledge and context. Try:\n\n');
        stream.markdown('- `@lanonasis /recall <query>` - Search memories\n');
        stream.markdown('- `@lanonasis /save` - Save current selection\n');
        stream.markdown('- `@lanonasis /list` - View recent memories\n');
        stream.markdown('- `@lanonasis /context` - Get context for current file\n\n');
        stream.markdown('Or just ask me anything about your stored knowledge!\n');
        return {};
    }

    stream.progress('Searching your memory bank...');

    // Search for relevant memories
    const results = await memoryService.searchMemories(prompt, { limit: 5 });

    if (token.isCancellationRequested) {
        return { errorDetails: { message: 'Cancelled' } };
    }

    if (results.length === 0) {
        stream.markdown(`I couldn't find any memories related to "${prompt}".\n\n`);
        stream.markdown(`Would you like to:\n`);
        stream.button({
            command: 'lanonasis.createMemory',
            title: '📝 Create Memory'
        });
        stream.button({
            command: 'lanonasis.searchMemory',
            title: '🔍 Try Different Search'
        });
        return {};
    }

    // Provide intelligent response based on memories
    stream.markdown(`## 🧠 Based on your memories:\n\n`);

    const topResult = results[0];
    stream.markdown(`**Most relevant:** ${topResult.title}\n\n`);
    stream.markdown(`${topResult.content}\n\n`);

    if (results.length > 1) {
        stream.markdown(`---\n\n**Related memories:**\n`);
        results.slice(1).forEach((result, index) => {
            stream.markdown(`${index + 2}. ${result.title}\n`);
        });
    }

    const refined = await maybeCallRefineEndpoint(prompt, results);
    if (refined) {
        stream.markdown(`\n### ✨ Refined Prompt Suggestion\n\`\`\`\n${refined}\n\`\`\`\n`);
    }
    
    return {
        metadata: {
            query: prompt,
            resultCount: results.length,
            topMemory: topResult.id
        }
    };
}

/**
 * Get emoji for memory type
 */
function getTypeEmoji(type: string): string {
    const emojiMap: Record<string, string> = {
        context: '💭',
        knowledge: '📚',
        project: '📁',
        reference: '🔗',
        personal: '👤',
        workflow: '⚙️',
        conversation: '💬'
    };
    return emojiMap[type] || '📝';
}

async function handleRefineCommand(
    prompt: string,
    memoryService: IMemoryService,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
): Promise<vscode.ChatResult> {
    if (!prompt.trim()) {
        stream.markdown('Paste a prompt to refine. Example: `@lanonasis /refine Generate a deployment checklist`');
        return {};
    }

    stream.progress('Retrieving context for refinement...');
    const results = await memoryService.searchMemories(prompt, { limit: 5 });
    if (token.isCancellationRequested) return { errorDetails: { message: 'Refine cancelled' } };

    const refined = await maybeCallRefineEndpoint(prompt, results);

    stream.markdown('### ✨ Refined Prompt\n');
    stream.markdown('```\n' + refined + '\n```');

    if (results.length) {
        stream.markdown('\n#### Context used\n');
        results.forEach((r, idx) => {
            stream.markdown(`${idx + 1}. ${r.title}${r.tags?.length ? ` — tags: ${r.tags.join(', ')}` : ''}`);
        });
    }

    return {
        metadata: {
            command: 'refine',
            resultCount: results.length
        }
    };
}

function buildRefinedPrompt(prompt: string, results: MemorySearchResult[]): string {
    const top = results.slice(0, 3).map(r => `- ${r.title}${r.tags?.length ? ` (tags: ${r.tags.join(', ')})` : ''}`).join('\n');
    const contextBlock = top ? `Context:\n${top}\n\n` : '';
    return `${contextBlock}Task: ${prompt}\n\nPlease use the above context, be concise, and include any relevant IDs, tags, or steps.`;
}

async function maybeCallRefineEndpoint(
    prompt: string,
    results: MemorySearchResult[]
): Promise<string> {
    const refinedLocal = buildRefinedPrompt(prompt, results);
    const config = vscode.workspace.getConfiguration('lanonasis');
    const endpoint = config.get<string>('refineEndpoint');
    const apiKey = config.get<string>('refineApiKey');
    if (!endpoint || !apiKey) {
        return refinedLocal;
    }

    try {
        const payload = {
            prompt,
            context: results.slice(0, 5).map(r => ({
                title: r.title,
                tags: r.tags,
                snippet: r.content?.substring(0, 500) || ''
            }))
        };

        const resp = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(payload)
        });

        if (!resp.ok) {
            return refinedLocal;
        }

        const data = await resp.json();
        const refined = data?.refinedPrompt || data?.refined_prompt || data?.prompt;
        return typeof refined === 'string' && refined.trim().length > 0 ? refined : refinedLocal;
    } catch (err) {
        console.warn('[lanonasis] refine endpoint failed, falling back to local prompt builder', err);
        return refinedLocal;
    }
}

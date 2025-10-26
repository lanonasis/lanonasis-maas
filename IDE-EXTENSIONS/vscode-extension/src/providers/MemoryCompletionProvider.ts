import * as vscode from 'vscode';
import { MemoryService } from '../services/MemoryService';
import { MemorySearchResult } from '../types/memory-aligned';

export class MemoryCompletionProvider implements vscode.CompletionItemProvider {
    private cache: Map<string, { results: MemorySearchResult[]; timestamp: number }> = new Map();
    private readonly cacheTimeout = 5 * 60 * 1000; // 5 minutes

    constructor(private memoryService: MemoryService) {}

    async provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        _token: vscode.CancellationToken,
        context: vscode.CompletionContext
    ): Promise<vscode.CompletionItem[]> {
        if (!this.memoryService.isAuthenticated()) {
            return [];
        }

        // Get the current line and extract context
        const line = document.lineAt(position);
        const lineText = line.text.substring(0, position.character);
        
        // Look for trigger characters and extract query
        const query = this.extractQuery(lineText, context.triggerCharacter);
        if (!query || query.length < 2) {
            return [];
        }

        try {
            const memories = await this.searchWithCache(query);
            return this.createCompletionItems(memories, query, context.triggerCharacter, document.languageId);
        } catch (error) {
            console.error('Memory completion error:', error);
            return [];
        }
    }

    private extractQuery(lineText: string, triggerCharacter?: string): string {
        if (!triggerCharacter) {
            return '';
        }

        const lastTriggerIndex = lineText.lastIndexOf(triggerCharacter);
        if (lastTriggerIndex === -1) {
            return '';
        }

        return lineText.substring(lastTriggerIndex + 1).trim();
    }

    private async searchWithCache(query: string): Promise<MemorySearchResult[]> {
        const cacheKey = query.toLowerCase();
        const cached = this.cache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.results;
        }

        const results = await this.memoryService.searchMemories(query, {
            limit: 10,
            threshold: 0.6
        });

        this.cache.set(cacheKey, {
            results,
            timestamp: Date.now()
        });

        // Clean old cache entries
        this.cleanCache();

        return results;
    }

    private cleanCache(): void {
        const now = Date.now();
        for (const [key, value] of this.cache.entries()) {
            if (now - value.timestamp > this.cacheTimeout) {
                this.cache.delete(key);
            }
        }
    }

    private createCompletionItems(
        memories: MemorySearchResult[],
        _query: string,
        triggerCharacter?: string,
        languageId: string = 'typescript'
    ): vscode.CompletionItem[] {
        return memories.map((memory, index) => {
            const item = new vscode.CompletionItem(
                memory.title,
                vscode.CompletionItemKind.Snippet
            );

            // Create different insertion text based on trigger character
            let insertText: string;
            let documentation: string;

            switch (triggerCharacter) {
                case '@':
                    // For @mentions, insert a reference
                    insertText = `@memory:${memory.id} (${memory.title})`;
                    documentation = `**Memory Reference**\n\n${memory.content.substring(0, 300)}${memory.content.length > 300 ? '...' : ''}`;
                    break;

                case '#':
                    // For #tags, insert memory content as a comment block
                    insertText = this.formatAsComment(memory, languageId);
                    documentation = `**Insert Memory as Comment**\n\n${memory.content}`;
                    break;

                case '//':
                    // For // comments, insert relevant memory snippet
                    insertText = this.formatAsSnippet(memory);
                    documentation = `**Code Snippet from Memory**\n\n${memory.content}`;
                    break;

                default:
                    insertText = memory.content;
                    documentation = memory.content;
            }

            item.insertText = insertText;
            item.documentation = new vscode.MarkdownString(documentation);
            item.detail = `${memory.memory_type} • ${new Date(memory.created_at).toLocaleDateString()} • Score: ${Math.round(memory.similarity_score * 100)}%`;
            
            // Add tags to filter text for better search
            item.filterText = `${memory.title} ${memory.tags?.join(' ')} ${memory.memory_type}`;
            
            // Sort by relevance score
            item.sortText = String(1 - memory.similarity_score).padStart(5, '0') + String(index).padStart(3, '0');

            // Add command to open full memory
            item.command = {
                command: 'lanonasis.openMemory',
                title: 'Open Memory',
                arguments: [memory]
            };

            return item;
        });
    }

    private formatAsComment(memory: MemorySearchResult, languageId: string): string {
        const commentPrefix = this.getCommentPrefix(languageId);
        const lines = memory.content.split('\n');
        
        return lines.map(line => `${commentPrefix} ${line}`).join('\n');
    }

    private formatAsSnippet(memory: MemorySearchResult): string {
        // Try to extract code blocks from memory content
        const codeBlockRegex = /```[\s\S]*?```/g;
        const codeBlocks = memory.content.match(codeBlockRegex);
        
        if (codeBlocks && codeBlocks.length > 0) {
            // Return the first code block without markdown formatting
            return codeBlocks[0].replace(/```\w*\n?/g, '').replace(/```$/g, '');
        }

        // If no code blocks, return content with some formatting
        return memory.content.substring(0, 500);
    }

    private getCommentPrefix(languageId: string): string {
        const commentPrefixes: Record<string, string> = {
            'javascript': '//',
            'typescript': '//',
            'java': '//',
            'c': '//',
            'cpp': '//',
            'csharp': '//',
            'go': '//',
            'rust': '//',
            'swift': '//',
            'kotlin': '//',
            'scala': '//',
            'python': '#',
            'ruby': '#',
            'perl': '#',
            'shell': '#',
            'bash': '#',
            'powershell': '#',
            'yaml': '#',
            'dockerfile': '#',
            'html': '<!--',
            'xml': '<!--',
            'css': '/*',
            'scss': '//',
            'less': '//',
            'sql': '--',
            'lua': '--',
            'vim': '"',
            'r': '#'
        };

        return commentPrefixes[languageId] || '//';
    }

    resolveCompletionItem(
        item: vscode.CompletionItem,
        _token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.CompletionItem> {
        return item;
    }
}
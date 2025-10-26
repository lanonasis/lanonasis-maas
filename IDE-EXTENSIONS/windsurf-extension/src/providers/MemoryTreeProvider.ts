import * as vscode from 'vscode';
import { MemoryService } from '../services/MemoryService';
import { AuthenticationService } from '../auth/AuthenticationService';
import { MemoryEntry, MemoryType } from '../types/memory';

export class MemoryTreeProvider implements vscode.TreeDataProvider<MemoryTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<MemoryTreeItem | undefined | null | void> = new vscode.EventEmitter<MemoryTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<MemoryTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private memories: MemoryEntry[] = [];
    private isLoading: boolean = false;

    constructor(
        private memoryService: MemoryService,
        private authService: AuthenticationService
    ) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: MemoryTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: MemoryTreeItem): Promise<MemoryTreeItem[]> {
        if (!await this.authService.checkAuthenticationStatus()) {
            return [new MemoryTreeItem(
                'Not authenticated',
                '',
                vscode.TreeItemCollapsibleState.None,
                {
                    command: 'lanonasis.authenticate',
                    title: 'Authenticate',
                    arguments: []
                },
                'authentication-required'
            )];
        }

        if (!element) {
            // Root level - show memory type categories
            return this.getMemoryTypeCategories();
        }

        if (element.contextValue === 'memory-type') {
            // Show memories of this type
            return this.getMemoriesOfType(element.memoryType!);
        }

        return [];
    }

    private async getMemoryTypeCategories(): Promise<MemoryTreeItem[]> {
        if (this.isLoading) {
            return [new MemoryTreeItem(
                'Loading...',
                '',
                vscode.TreeItemCollapsibleState.None,
                undefined,
                'loading'
            )];
        }

        try {
            this.isLoading = true;
            const result = await this.memoryService.listMemories({ limit: 100 });
            this.memories = result.memories;
            this.isLoading = false;

            if (this.memories.length === 0) {
                return [new MemoryTreeItem(
                    'No memories found',
                    'Create your first memory by selecting text and pressing Ctrl+Shift+Alt+M',
                    vscode.TreeItemCollapsibleState.None,
                    {
                        command: 'lanonasis.createMemory',
                        title: 'Create Memory',
                        arguments: []
                    },
                    'empty-state'
                )];
            }

            // Group memories by type
            const memoryTypes: Map<MemoryType, MemoryEntry[]> = new Map();
            this.memories.forEach(memory => {
                const type = memory.memory_type;
                if (!memoryTypes.has(type)) {
                    memoryTypes.set(type, []);
                }
                memoryTypes.get(type)!.push(memory);
            });

            // Create tree items for each type
            const typeItems: MemoryTreeItem[] = [];
            const typeOrder: MemoryType[] = ['context', 'project', 'knowledge', 'reference', 'personal', 'workflow'];
            
            typeOrder.forEach(type => {
                const memories = memoryTypes.get(type);
                if (memories && memories.length > 0) {
                    const typeItem = new MemoryTreeItem(
                        `${this.capitalizeFirst(type)} (${memories.length})`,
                        `${memories.length} ${memories.length === 1 ? 'memory' : 'memories'}`,
                        vscode.TreeItemCollapsibleState.Collapsed,
                        undefined,
                        'memory-type'
                    );
                    typeItem.memoryType = type;
                    typeItem.iconPath = this.getTypeIcon(type);
                    typeItems.push(typeItem);
                }
            });

            return typeItems;
        } catch (error) {
            this.isLoading = false;
            console.error('Failed to load memories:', error);
            return [new MemoryTreeItem(
                'Error loading memories',
                error instanceof Error ? error.message : 'Unknown error',
                vscode.TreeItemCollapsibleState.None,
                {
                    command: 'lanonasis.refreshMemories',
                    title: 'Retry',
                    arguments: []
                },
                'error'
            )];
        }
    }

    private async getMemoriesOfType(memoryType: MemoryType): Promise<MemoryTreeItem[]> {
        const memoriesOfType = this.memories.filter(m => m.memory_type === memoryType);
        
        // Sort by most recently updated
        memoriesOfType.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

        return memoriesOfType.map(memory => {
            const item = new MemoryTreeItem(
                memory.title,
                this.getMemoryDescription(memory),
                vscode.TreeItemCollapsibleState.None,
                {
                    command: 'lanonasis.openMemory',
                    title: 'Open Memory',
                    arguments: [memory]
                },
                'memory'
            );
            
            item.tooltip = this.createMemoryTooltip(memory);
            item.iconPath = new vscode.ThemeIcon('note');
            
            return item;
        });
    }

    private getMemoryDescription(memory: MemoryEntry): string {
        const preview = memory.content.length > 50 ? 
            memory.content.substring(0, 50) + '...' : 
            memory.content;
        
        const lastAccessed = memory.last_accessed ? 
            new Date(memory.last_accessed).toLocaleDateString() : 
            'Never';
        
        return `${preview} • Accessed: ${lastAccessed}`;
    }

    private createMemoryTooltip(memory: MemoryEntry): vscode.MarkdownString {
        const tooltip = new vscode.MarkdownString();
        tooltip.appendMarkdown(`**${memory.title}**\n\n`);
        tooltip.appendMarkdown(`**Type:** ${memory.memory_type}\n\n`);
        tooltip.appendMarkdown(`**Created:** ${new Date(memory.created_at).toLocaleString()}\n\n`);
        tooltip.appendMarkdown(`**Last Updated:** ${new Date(memory.updated_at).toLocaleString()}\n\n`);
        
        if (memory.last_accessed) {
            tooltip.appendMarkdown(`**Last Accessed:** ${new Date(memory.last_accessed).toLocaleString()}\n\n`);
        }
        
        if (memory.tags && memory.tags.length > 0) {
            tooltip.appendMarkdown(`**Tags:** ${memory.tags.join(', ')}\n\n`);
        }
        
        tooltip.appendMarkdown(`**Access Count:** ${memory.access_count}\n\n`);
        
        const preview = memory.content.length > 200 ? 
            memory.content.substring(0, 200) + '...' : 
            memory.content;
        tooltip.appendMarkdown(`**Preview:**\n\n${preview}`);
        
        return tooltip;
    }

    private getTypeIcon(type: MemoryType): vscode.ThemeIcon {
        const iconMap: Record<MemoryType, string> = {
            'context': 'globe',
            'project': 'folder',
            'knowledge': 'book',
            'reference': 'bookmark',
            'personal': 'person',
            'workflow': 'gear'
        };
        
        return new vscode.ThemeIcon(iconMap[type] || 'note');
    }

    private capitalizeFirst(str: string): string {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}

class MemoryTreeItem extends vscode.TreeItem {
    public memoryType?: MemoryType;

    constructor(
        public readonly label: string,
        public readonly description: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly command?: vscode.Command,
        public readonly contextValue?: string
    ) {
        super(label, collapsibleState);
        this.description = description;
        this.tooltip = `${this.label}${description ? `: ${description}` : ''}`;
    }
}
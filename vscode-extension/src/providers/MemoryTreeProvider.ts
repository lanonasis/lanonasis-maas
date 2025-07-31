import * as vscode from 'vscode';
import { MemoryService } from '../services/MemoryService';
import { MemoryEntry, MemoryType } from '../types/memory-aligned';

export class MemoryTreeItem extends vscode.TreeItem {
    constructor(
        public readonly memory: MemoryEntry,
        collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(memory.title, collapsibleState);
        
        this.tooltip = `${memory.title}\n\nType: ${memory.memory_type}\nCreated: ${new Date(memory.created_at).toLocaleDateString()}\n\n${memory.content.substring(0, 200)}${memory.content.length > 200 ? '...' : ''}`;
        this.description = memory.memory_type;
        this.contextValue = 'memory';
        
        // Set icon based on memory type
        this.iconPath = this.getIconForMemoryType(memory.memory_type);
        
        // Add command to open memory when clicked
        this.command = {
            command: 'lanonasis.openMemory',
            title: 'Open Memory',
            arguments: [memory]
        };
    }

    private getIconForMemoryType(type: MemoryType): vscode.ThemeIcon {
        switch (type) {
            case 'conversation':
                return new vscode.ThemeIcon('comment-discussion');
            case 'knowledge':
                return new vscode.ThemeIcon('book');
            case 'project':
                return new vscode.ThemeIcon('project');
            case 'context':
                return new vscode.ThemeIcon('info');
            case 'reference':
                return new vscode.ThemeIcon('references');
            default:
                return new vscode.ThemeIcon('file');
        }
    }
}

export class MemoryTypeTreeItem extends vscode.TreeItem {
    constructor(
        public readonly memoryType: MemoryType,
        public readonly memories: MemoryEntry[],
        collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(memoryType, collapsibleState);
        
        this.tooltip = `${memoryType} (${memories.length} memories)`;
        this.description = `${memories.length} memories`;
        this.contextValue = 'memoryType';
        this.iconPath = new vscode.ThemeIcon('folder');
    }
}

export class MemoryTreeProvider implements vscode.TreeDataProvider<MemoryTreeItem | MemoryTypeTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<MemoryTreeItem | MemoryTypeTreeItem | undefined | null | void> = new vscode.EventEmitter<MemoryTreeItem | MemoryTypeTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<MemoryTreeItem | MemoryTypeTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private memories: MemoryEntry[] = [];
    private loading: boolean = false;

    constructor(private memoryService: MemoryService) {
        this.loadMemories();
    }

    private async loadMemories(): Promise<void> {
        if (!this.memoryService.isAuthenticated()) {
            this.memories = [];
            this._onDidChangeTreeData.fire();
            return;
        }

        try {
            this.loading = true;
            this.memories = await this.memoryService.listMemories(100);
        } catch (error) {
            this.memories = [];
            vscode.window.showErrorMessage(`Failed to load memories: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            this.loading = false;
            this._onDidChangeTreeData.fire();
        }
    }

    refresh(): void {
        this.loadMemories();
    }

    getTreeItem(element: MemoryTreeItem | MemoryTypeTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: MemoryTreeItem | MemoryTypeTreeItem): Thenable<(MemoryTreeItem | MemoryTypeTreeItem)[]> {
        if (!this.memoryService.isAuthenticated()) {
            return Promise.resolve([]);
        }

        if (this.loading) {
            return Promise.resolve([]);
        }

        if (!element) {
            // Root level - group by memory type
            return Promise.resolve(this.getMemoryTypeGroups());
        }

        if (element instanceof MemoryTypeTreeItem) {
            // Return memories for this type
            return Promise.resolve(
                element.memories.map(memory => 
                    new MemoryTreeItem(memory, vscode.TreeItemCollapsibleState.None)
                )
            );
        }

        return Promise.resolve([]);
    }

    private getMemoryTypeGroups(): MemoryTypeTreeItem[] {
        const memoryTypes: MemoryType[] = ['conversation', 'knowledge', 'project', 'context', 'reference'];
        const groups: MemoryTypeTreeItem[] = [];

        for (const type of memoryTypes) {
            const memoriesForType = this.memories.filter(memory => memory.memory_type === type);
            if (memoriesForType.length > 0) {
                groups.push(new MemoryTypeTreeItem(
                    type,
                    memoriesForType,
                    vscode.TreeItemCollapsibleState.Collapsed
                ));
            }
        }

        return groups;
    }

    getParent(element: MemoryTreeItem | MemoryTypeTreeItem): vscode.ProviderResult<MemoryTreeItem | MemoryTypeTreeItem> {
        if (element instanceof MemoryTreeItem) {
            // Find the parent memory type group
            const memoryType = element.memory.memory_type;
            const memoriesForType = this.memories.filter(memory => memory.memory_type === memoryType);
            return new MemoryTypeTreeItem(memoryType, memoriesForType, vscode.TreeItemCollapsibleState.Collapsed);
        }
        return null;
    }
}
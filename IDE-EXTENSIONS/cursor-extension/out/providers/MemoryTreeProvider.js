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
exports.MemoryTreeProvider = void 0;
const vscode = __importStar(require("vscode"));
class MemoryTreeProvider {
    constructor(memoryService, authService) {
        this.memoryService = memoryService;
        this.authService = authService;
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.memories = [];
        this.isLoading = false;
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    async getChildren(element) {
        if (!await this.authService.checkAuthenticationStatus()) {
            return [new MemoryTreeItem('Not authenticated', '', vscode.TreeItemCollapsibleState.None, {
                    command: 'lanonasis.authenticate',
                    title: 'Authenticate',
                    arguments: []
                }, 'authentication-required')];
        }
        if (!element) {
            // Root level - show memory type categories
            return this.getMemoryTypeCategories();
        }
        if (element.contextValue === 'memory-type') {
            // Show memories of this type
            return this.getMemoriesOfType(element.memoryType);
        }
        return [];
    }
    async getMemoryTypeCategories() {
        if (this.isLoading) {
            return [new MemoryTreeItem('Loading...', '', vscode.TreeItemCollapsibleState.None, undefined, 'loading')];
        }
        try {
            this.isLoading = true;
            const result = await this.memoryService.listMemories({ limit: 100 });
            this.memories = result.memories;
            this.isLoading = false;
            if (this.memories.length === 0) {
                return [new MemoryTreeItem('No memories found', 'Create your first memory by selecting text and pressing Ctrl+Shift+Alt+M', vscode.TreeItemCollapsibleState.None, {
                        command: 'lanonasis.createMemory',
                        title: 'Create Memory',
                        arguments: []
                    }, 'empty-state')];
            }
            // Group memories by type
            const memoryTypes = new Map();
            this.memories.forEach(memory => {
                const type = memory.memory_type;
                if (!memoryTypes.has(type)) {
                    memoryTypes.set(type, []);
                }
                memoryTypes.get(type).push(memory);
            });
            // Create tree items for each type
            const typeItems = [];
            const typeOrder = ['context', 'project', 'knowledge', 'reference', 'personal', 'workflow'];
            typeOrder.forEach(type => {
                const memories = memoryTypes.get(type);
                if (memories && memories.length > 0) {
                    const typeItem = new MemoryTreeItem(`${this.capitalizeFirst(type)} (${memories.length})`, `${memories.length} ${memories.length === 1 ? 'memory' : 'memories'}`, vscode.TreeItemCollapsibleState.Collapsed, undefined, 'memory-type');
                    typeItem.memoryType = type;
                    typeItem.iconPath = this.getTypeIcon(type);
                    typeItems.push(typeItem);
                }
            });
            return typeItems;
        }
        catch (error) {
            this.isLoading = false;
            console.error('Failed to load memories:', error);
            return [new MemoryTreeItem('Error loading memories', error instanceof Error ? error.message : 'Unknown error', vscode.TreeItemCollapsibleState.None, {
                    command: 'lanonasis.refreshMemories',
                    title: 'Retry',
                    arguments: []
                }, 'error')];
        }
    }
    async getMemoriesOfType(memoryType) {
        const memoriesOfType = this.memories.filter(m => m.memory_type === memoryType);
        // Sort by most recently updated
        memoriesOfType.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
        return memoriesOfType.map(memory => {
            const item = new MemoryTreeItem(memory.title, this.getMemoryDescription(memory), vscode.TreeItemCollapsibleState.None, {
                command: 'lanonasis.openMemory',
                title: 'Open Memory',
                arguments: [memory]
            }, 'memory');
            item.tooltip = this.createMemoryTooltip(memory);
            item.iconPath = new vscode.ThemeIcon('note');
            return item;
        });
    }
    getMemoryDescription(memory) {
        const preview = memory.content.length > 50 ?
            memory.content.substring(0, 50) + '...' :
            memory.content;
        const lastAccessed = memory.last_accessed ?
            new Date(memory.last_accessed).toLocaleDateString() :
            'Never';
        return `${preview} • Accessed: ${lastAccessed}`;
    }
    createMemoryTooltip(memory) {
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
    getTypeIcon(type) {
        const iconMap = {
            'context': 'globe',
            'project': 'folder',
            'knowledge': 'book',
            'reference': 'bookmark',
            'personal': 'person',
            'workflow': 'gear'
        };
        return new vscode.ThemeIcon(iconMap[type] || 'note');
    }
    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}
exports.MemoryTreeProvider = MemoryTreeProvider;
class MemoryTreeItem extends vscode.TreeItem {
    constructor(label, description, collapsibleState, command, contextValue) {
        super(label, collapsibleState);
        this.label = label;
        this.description = description;
        this.collapsibleState = collapsibleState;
        this.command = command;
        this.contextValue = contextValue;
        this.description = description;
        this.tooltip = `${this.label}${description ? `: ${description}` : ''}`;
    }
}
//# sourceMappingURL=MemoryTreeProvider.js.map
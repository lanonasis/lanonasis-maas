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
exports.MemoryTreeProvider = exports.MemoryTypeTreeItem = exports.MemoryTreeItem = void 0;
const vscode = __importStar(require("vscode"));
class MemoryTreeItem extends vscode.TreeItem {
    constructor(memory, collapsibleState) {
        super(memory.title, collapsibleState);
        this.memory = memory;
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
    getIconForMemoryType(type) {
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
exports.MemoryTreeItem = MemoryTreeItem;
class MemoryTypeTreeItem extends vscode.TreeItem {
    constructor(memoryType, memories, collapsibleState) {
        super(memoryType, collapsibleState);
        this.memoryType = memoryType;
        this.memories = memories;
        this.tooltip = `${memoryType} (${memories.length} memories)`;
        this.description = `${memories.length} memories`;
        this.contextValue = 'memoryType';
        this.iconPath = new vscode.ThemeIcon('folder');
    }
}
exports.MemoryTypeTreeItem = MemoryTypeTreeItem;
class MemoryTreeProvider {
    constructor(memoryService) {
        this.memoryService = memoryService;
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.memories = [];
        this.loading = false;
        this.authenticated = false;
        this.authenticated = this.memoryService.isAuthenticated();
        if (this.authenticated) {
            void this.loadMemories();
        }
    }
    async loadMemories() {
        if (!this.authenticated) {
            this.memories = [];
            this.loading = false;
            this._onDidChangeTreeData.fire();
            return;
        }
        try {
            this.loading = true;
            this.memories = await this.memoryService.listMemories(100);
        }
        catch (error) {
            this.memories = [];
            if (!(error instanceof Error && error.message.includes('Not authenticated'))) {
                vscode.window.showErrorMessage(`Failed to load memories: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }
        finally {
            this.loading = false;
            this._onDidChangeTreeData.fire();
        }
    }
    refresh() {
        if (!this.authenticated) {
            this.clear();
            return;
        }
        void this.loadMemories();
    }
    setAuthenticated(authenticated) {
        this.authenticated = authenticated;
        if (authenticated) {
            void this.loadMemories();
        }
        else {
            this.clear();
        }
    }
    clear() {
        this.loading = false;
        this.memories = [];
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        if (!this.authenticated) {
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
            return Promise.resolve(element.memories.map(memory => new MemoryTreeItem(memory, vscode.TreeItemCollapsibleState.None)));
        }
        return Promise.resolve([]);
    }
    getMemoryTypeGroups() {
        const memoryTypes = ['conversation', 'knowledge', 'project', 'context', 'reference'];
        const groups = [];
        for (const type of memoryTypes) {
            const memoriesForType = this.memories.filter(memory => memory.memory_type === type);
            if (memoriesForType.length > 0) {
                groups.push(new MemoryTypeTreeItem(type, memoriesForType, vscode.TreeItemCollapsibleState.Collapsed));
            }
        }
        return groups;
    }
    getParent(element) {
        if (!this.authenticated) {
            return null;
        }
        if (element instanceof MemoryTreeItem) {
            // Find the parent memory type group
            const memoryType = element.memory.memory_type;
            const memoriesForType = this.memories.filter(memory => memory.memory_type === memoryType);
            return new MemoryTypeTreeItem(memoryType, memoriesForType, vscode.TreeItemCollapsibleState.Collapsed);
        }
        return null;
    }
}
exports.MemoryTreeProvider = MemoryTreeProvider;
//# sourceMappingURL=MemoryTreeProvider.js.map
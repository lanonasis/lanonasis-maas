import * as vscode from 'vscode';
import { ApiKeyService, ApiKey, Project } from '../services/ApiKeyService';

export class ApiKeyTreeItem extends vscode.TreeItem {
    public readonly apiKey: ApiKey;

    constructor(
        apiKey: ApiKey,
        collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(apiKey.name, collapsibleState);
        
        this.apiKey = apiKey;
        this.tooltip = `${apiKey.name}\nType: ${apiKey.keyType}\nEnvironment: ${apiKey.environment}\nAccess Level: ${apiKey.accessLevel}`;
        this.description = `${apiKey.environment} • ${apiKey.keyType}`;
        this.contextValue = 'apiKey';
        
        // Set icon based on key type
        this.iconPath = this.getIconForKeyType(apiKey.keyType);
        
        // Add expiration warning if key expires soon
        if (apiKey.expiresAt) {
            const expiresAt = new Date(apiKey.expiresAt);
            const now = new Date();
            const daysUntilExpiry = Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            
            if (daysUntilExpiry <= 7) {
                this.description += ` ⚠️ Expires in ${daysUntilExpiry} days`;
            }
        }
    }

    private getIconForKeyType(keyType: string): vscode.ThemeIcon {
        const iconMap: Record<string, string> = {
            'api_key': 'key',
            'database_url': 'database',
            'oauth_token': 'account',
            'certificate': 'certificate',
            'ssh_key': 'terminal',
            'webhook_secret': 'webhook',
            'encryption_key': 'shield'
        };
        
        return new vscode.ThemeIcon(iconMap[keyType] || 'key');
    }
}

export class ProjectTreeItem extends vscode.TreeItem {
    public readonly project: Project;

    constructor(
        project: Project,
        collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(project.name, collapsibleState);
        
        this.project = project;
        this.tooltip = `${project.name}\n${project.description || 'No description'}\nOrganization: ${project.organizationId}`;
        this.description = project.description ? project.description.substring(0, 50) + '...' : 'No description';
        this.contextValue = 'project';
        this.iconPath = new vscode.ThemeIcon('folder');
    }
}

export class ApiKeyTreeProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined | null | void> = new vscode.EventEmitter<vscode.TreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private projects: Project[] = [];
    private apiKeys: Record<string, ApiKey[]> = {};

    constructor(private apiKeyService: ApiKeyService) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
        try {
            if (!element) {
                // Root level - show projects
                this.projects = await this.apiKeyService.getProjects();
                return this.projects.map(project => 
                    new ProjectTreeItem(project, vscode.TreeItemCollapsibleState.Collapsed)
                );
            } else if (element instanceof ProjectTreeItem) {
                // Project level - show API keys for this project
                const projectId = element.project.id;
                if (!this.apiKeys[projectId]) {
                    this.apiKeys[projectId] = await this.apiKeyService.getApiKeys(projectId);
                }
                
                return this.apiKeys[projectId].map(apiKey => 
                    new ApiKeyTreeItem(apiKey, vscode.TreeItemCollapsibleState.None)
                );
            }
        } catch (error) {
            console.error('Error loading API keys:', error);
            vscode.window.showErrorMessage(`Failed to load API keys: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        
        return [];
    }

    // Utility methods for managing the tree
    async addProject(project: Project): Promise<void> {
        this.projects.push(project);
        this.refresh();
    }

    async updateProject(updatedProject: Project): Promise<void> {
        const index = this.projects.findIndex(p => p.id === updatedProject.id);
        if (index !== -1) {
            this.projects[index] = updatedProject;
            this.refresh();
        }
    }

    async removeProject(projectId: string): Promise<void> {
        this.projects = this.projects.filter(p => p.id !== projectId);
        delete this.apiKeys[projectId];
        this.refresh();
    }

    async addApiKey(projectId: string, apiKey: ApiKey): Promise<void> {
        if (!this.apiKeys[projectId]) {
            this.apiKeys[projectId] = [];
        }
        this.apiKeys[projectId].push(apiKey);
        this.refresh();
    }

    async updateApiKey(projectId: string, updatedApiKey: ApiKey): Promise<void> {
        if (this.apiKeys[projectId]) {
            const index = this.apiKeys[projectId].findIndex(k => k.id === updatedApiKey.id);
            if (index !== -1) {
                this.apiKeys[projectId][index] = updatedApiKey;
                this.refresh();
            }
        }
    }

    async removeApiKey(projectId: string, apiKeyId: string): Promise<void> {
        if (this.apiKeys[projectId]) {
            this.apiKeys[projectId] = this.apiKeys[projectId].filter(k => k.id !== apiKeyId);
            this.refresh();
        }
    }

    // Clear cache when refreshing
    clearCache(): void {
        this.projects = [];
        this.apiKeys = {};
    }
}

import * as vscode from 'vscode';
import { MemoryService } from '../services/MemoryService';
import { MemoryType } from '../types/memory';

export class WindsurfAiAssistant {
    private memoryService: MemoryService;
    private panel: vscode.WebviewPanel | undefined;

    constructor(memoryService: MemoryService) {
        this.memoryService = memoryService;
    }

    async showAssistantPanel() {
        if (this.panel) {
            this.panel.reveal(vscode.ViewColumn.Beside);
            return;
        }

        this.panel = vscode.window.createWebviewPanel(
            'lanonasisAiAssistant',
            'Lanonasis AI Memory Assistant',
            vscode.ViewColumn.Beside,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        this.panel.webview.html = this.getWebviewContent();

        // Handle messages from the webview
        this.panel.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.command) {
                    case 'searchMemories':
                        await this.handleSearchMemories(message.query);
                        break;
                    case 'suggestMemories':
                        await this.handleSuggestMemories();
                        break;
                    case 'createMemoryFromContext':
                        await this.handleCreateMemoryFromContext(message.data);
                        break;
                    case 'analyzeCode':
                        await this.handleAnalyzeCode();
                        break;
                }
            }
        );

        // Handle panel disposal
        this.panel.onDidDispose(() => {
            this.panel = undefined;
        });
    }

    private async handleSearchMemories(query: string) {
        try {
            const results = await this.memoryService.searchMemories({
                query,
                limit: 10,
                threshold: 0.6
            });

            this.panel?.webview.postMessage({
                command: 'searchResults',
                data: results
            });
        } catch (error) {
            this.panel?.webview.postMessage({
                command: 'error',
                message: `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            });
        }
    }

    private async handleSuggestMemories() {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            this.panel?.webview.postMessage({
                command: 'error',
                message: 'No active editor found'
            });
            return;
        }

        try {
            // Get current file context
            const fileName = editor.document.fileName.split('/').pop() || 'untitled';
            const language = editor.document.languageId;
            const currentLine = editor.document.lineAt(editor.selection.active.line).text;

            // Build context-aware search query
            const contextQuery = `${language} ${fileName} ${currentLine.trim().substring(0, 50)}`;

            const suggestions = await this.memoryService.searchMemories({
                query: contextQuery,
                limit: 5,
                threshold: 0.5
            });

            this.panel?.webview.postMessage({
                command: 'suggestions',
                data: {
                    context: {
                        fileName,
                        language,
                        currentLine: currentLine.trim()
                    },
                    suggestions
                }
            });
        } catch (error) {
            this.panel?.webview.postMessage({
                command: 'error',
                message: `Failed to get suggestions: ${error instanceof Error ? error.message : 'Unknown error'}`
            });
        }
    }

    private async handleCreateMemoryFromContext(data: { title: string; content: string; type: MemoryType }) {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;

        try {
            const fileName = editor.document.fileName.split('/').pop() || 'untitled';
            const language = editor.document.languageId;

            await this.memoryService.createMemory({
                title: data.title,
                content: data.content,
                memory_type: data.type,
                tags: ['windsurf', 'ai-assistant', language],
                metadata: {
                    source: 'windsurf-ai-assistant',
                    fileName,
                    language,
                    timestamp: new Date().toISOString(),
                    createdBy: 'ai-assistant'
                }
            });

            this.panel?.webview.postMessage({
                command: 'memoryCreated',
                message: `Memory "${data.title}" created successfully`
            });

            vscode.commands.executeCommand('lanonasis.refreshMemories');
        } catch (error) {
            this.panel?.webview.postMessage({
                command: 'error',
                message: `Failed to create memory: ${error instanceof Error ? error.message : 'Unknown error'}`
            });
        }
    }

    private async handleAnalyzeCode() {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            this.panel?.webview.postMessage({
                command: 'error',
                message: 'No active editor found'
            });
            return;
        }

        const selection = editor.selection;
        const selectedText = editor.document.getText(selection);
        const codeToAnalyze = selectedText || editor.document.getText();

        if (!codeToAnalyze.trim()) {
            this.panel?.webview.postMessage({
                command: 'error',
                message: 'No code to analyze'
            });
            return;
        }

        try {
            // Search for similar code patterns
            const language = editor.document.languageId;
            const searchQuery = `${language} ${codeToAnalyze.substring(0, 100)}`;

            const similarCode = await this.memoryService.searchMemories({
                query: searchQuery,
                memory_types: ['reference', 'knowledge'],
                limit: 5,
                threshold: 0.4
            });

            this.panel?.webview.postMessage({
                command: 'codeAnalysis',
                data: {
                    code: codeToAnalyze,
                    language,
                    similarPatterns: similarCode,
                    analysis: this.generateCodeAnalysis(codeToAnalyze, language, similarCode)
                }
            });
        } catch (error) {
            this.panel?.webview.postMessage({
                command: 'error',
                message: `Code analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            });
        }
    }

    private generateCodeAnalysis(code: string, language: string, similarPatterns: any[]) {
        const lines = code.split('\n').length;
        const characters = code.length;
        
        return {
            metrics: {
                lines,
                characters,
                language
            },
            suggestions: [
                similarPatterns.length > 0 ? 
                    `Found ${similarPatterns.length} similar code patterns in your memories` :
                    'No similar patterns found in your memories',
                `Code contains ${lines} lines and ${characters} characters`,
                `Language detected: ${language}`
            ],
            relatedMemories: similarPatterns.slice(0, 3)
        };
    }

    private getWebviewContent(): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Lanonasis AI Assistant</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            padding: 20px;
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            line-height: 1.6;
        }
        
        .header {
            display: flex;
            align-items: center;
            margin-bottom: 30px;
            padding-bottom: 15px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }
        
        .header h1 {
            margin: 0;
            color: var(--vscode-textLink-foreground);
            font-size: 24px;
        }
        
        .assistant-section {
            margin-bottom: 25px;
            padding: 15px;
            background-color: var(--vscode-sideBar-background);
            border-radius: 8px;
            border: 1px solid var(--vscode-panel-border);
        }
        
        .section-title {
            font-weight: 600;
            margin-bottom: 15px;
            color: var(--vscode-textLink-foreground);
            font-size: 16px;
        }
        
        .search-container {
            display: flex;
            gap: 10px;
            margin-bottom: 15px;
        }
        
        input[type="text"] {
            flex: 1;
            padding: 8px 12px;
            border: 1px solid var(--vscode-input-border);
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border-radius: 4px;
            font-size: 14px;
        }
        
        button {
            padding: 8px 16px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            transition: background-color 0.2s;
        }
        
        button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        
        button.secondary {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        
        button.secondary:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }
        
        .results-container {
            max-height: 300px;
            overflow-y: auto;
            margin-top: 15px;
        }
        
        .memory-item {
            padding: 12px;
            margin-bottom: 10px;
            background-color: var(--vscode-editor-background);
            border-radius: 6px;
            border: 1px solid var(--vscode-panel-border);
            cursor: pointer;
            transition: background-color 0.2s;
        }
        
        .memory-item:hover {
            background-color: var(--vscode-list-hoverBackground);
        }
        
        .memory-title {
            font-weight: 600;
            margin-bottom: 5px;
            color: var(--vscode-textLink-foreground);
        }
        
        .memory-meta {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 8px;
        }
        
        .memory-content {
            font-size: 13px;
            line-height: 1.4;
            color: var(--vscode-editor-foreground);
        }
        
        .action-buttons {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }
        
        .status-message {
            padding: 10px;
            margin-top: 15px;
            border-radius: 4px;
            font-size: 14px;
        }
        
        .status-message.error {
            background-color: var(--vscode-inputValidation-errorBackground);
            color: var(--vscode-inputValidation-errorForeground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
        }
        
        .status-message.success {
            background-color: var(--vscode-terminal-ansiGreen);
            color: var(--vscode-editor-background);
        }
        
        .context-info {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            background-color: var(--vscode-editor-background);
            padding: 8px 12px;
            border-radius: 4px;
            margin-bottom: 15px;
        }
        
        .create-memory-form {
            display: none;
            padding: 15px;
            background-color: var(--vscode-editor-background);
            border-radius: 6px;
            border: 1px solid var(--vscode-panel-border);
            margin-top: 15px;
        }
        
        .form-group {
            margin-bottom: 15px;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 5px;
            font-weight: 600;
            color: var(--vscode-textLink-foreground);
        }
        
        select, textarea {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid var(--vscode-input-border);
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border-radius: 4px;
            font-size: 14px;
            font-family: inherit;
            resize: vertical;
        }
        
        textarea {
            min-height: 100px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🤖 AI Memory Assistant</h1>
    </div>
    
    <div class="assistant-section">
        <div class="section-title">🔍 Search Memories</div>
        <div class="search-container">
            <input type="text" id="searchInput" placeholder="Search your memories..." />
            <button onclick="searchMemories()">Search</button>
        </div>
        <div id="searchResults" class="results-container"></div>
    </div>
    
    <div class="assistant-section">
        <div class="section-title">💡 Smart Suggestions</div>
        <div class="action-buttons">
            <button onclick="getSuggestions()">Get Context Suggestions</button>
            <button onclick="analyzeCode()" class="secondary">Analyze Current Code</button>
        </div>
        <div id="suggestions" class="results-container"></div>
    </div>
    
    <div class="assistant-section">
        <div class="section-title">📝 Quick Memory Creation</div>
        <div class="action-buttons">
            <button onclick="showCreateForm()">Create Memory</button>
        </div>
        <div id="createForm" class="create-memory-form">
            <div class="form-group">
                <label for="memoryTitle">Title:</label>
                <input type="text" id="memoryTitle" placeholder="Memory title..." />
            </div>
            <div class="form-group">
                <label for="memoryType">Type:</label>
                <select id="memoryType">
                    <option value="context">Context</option>
                    <option value="project">Project</option>
                    <option value="knowledge">Knowledge</option>
                    <option value="reference">Reference</option>
                    <option value="personal">Personal</option>
                    <option value="workflow">Workflow</option>
                </select>
            </div>
            <div class="form-group">
                <label for="memoryContent">Content:</label>
                <textarea id="memoryContent" placeholder="Memory content..."></textarea>
            </div>
            <div class="action-buttons">
                <button onclick="createMemory()">Create Memory</button>
                <button onclick="hideCreateForm()" class="secondary">Cancel</button>
            </div>
        </div>
    </div>
    
    <div id="statusMessage"></div>

    <script>
        const vscode = acquireVsCodeApi();
        
        function searchMemories() {
            const query = document.getElementById('searchInput').value.trim();
            if (!query) return;
            
            vscode.postMessage({
                command: 'searchMemories',
                query: query
            });
            
            showStatus('Searching memories...', false);
        }
        
        function getSuggestions() {
            vscode.postMessage({
                command: 'suggestMemories'
            });
            
            showStatus('Getting context suggestions...', false);
        }
        
        function analyzeCode() {
            vscode.postMessage({
                command: 'analyzeCode'
            });
            
            showStatus('Analyzing code...', false);
        }
        
        function showCreateForm() {
            document.getElementById('createForm').style.display = 'block';
        }
        
        function hideCreateForm() {
            document.getElementById('createForm').style.display = 'none';
        }
        
        function createMemory() {
            const title = document.getElementById('memoryTitle').value.trim();
            const content = document.getElementById('memoryContent').value.trim();
            const type = document.getElementById('memoryType').value;
            
            if (!title || !content) {
                showStatus('Please fill in all fields', true);
                return;
            }
            
            vscode.postMessage({
                command: 'createMemoryFromContext',
                data: { title, content, type }
            });
            
            showStatus('Creating memory...', false);
        }
        
        function showStatus(message, isError = false) {
            const statusDiv = document.getElementById('statusMessage');
            statusDiv.textContent = message;
            statusDiv.className = 'status-message ' + (isError ? 'error' : 'success');
            
            if (!isError) {
                setTimeout(() => {
                    statusDiv.textContent = '';
                    statusDiv.className = '';
                }, 3000);
            }
        }
        
        function displaySearchResults(results) {
            const container = document.getElementById('searchResults');
            if (!results || results.length === 0) {
                container.innerHTML = '<div class="context-info">No memories found</div>';
                return;
            }
            
            container.innerHTML = results.map(memory => \`
                <div class="memory-item">
                    <div class="memory-title">\${memory.title}</div>
                    <div class="memory-meta">
                        Type: \${memory.memory_type} • 
                        Score: \${(memory.relevance_score * 100).toFixed(1)}% • 
                        Created: \${new Date(memory.created_at).toLocaleDateString()}
                    </div>
                    <div class="memory-content">\${memory.content.substring(0, 150)}...</div>
                </div>
            \`).join('');
        }
        
        function displaySuggestions(data) {
            const container = document.getElementById('suggestions');
            const { context, suggestions } = data;
            
            let html = \`<div class="context-info">
                Context: \${context.language} • \${context.fileName}
            </div>\`;
            
            if (suggestions && suggestions.length > 0) {
                html += suggestions.map(memory => \`
                    <div class="memory-item">
                        <div class="memory-title">\${memory.title}</div>
                        <div class="memory-meta">
                            Type: \${memory.memory_type} • 
                            Score: \${(memory.relevance_score * 100).toFixed(1)}%
                        </div>
                        <div class="memory-content">\${memory.content.substring(0, 100)}...</div>
                    </div>
                \`).join('');
            } else {
                html += '<div class="context-info">No relevant suggestions found</div>';
            }
            
            container.innerHTML = html;
        }
        
        function displayCodeAnalysis(data) {
            const container = document.getElementById('suggestions');
            const { code, language, analysis, similarPatterns } = data;
            
            let html = \`<div class="context-info">
                Code Analysis: \${analysis.metrics.lines} lines, \${language}
            </div>\`;
            
            html += '<h4>Analysis Results:</h4>';
            html += analysis.suggestions.map(suggestion => 
                \`<div class="context-info">• \${suggestion}</div>\`
            ).join('');
            
            if (analysis.relatedMemories && analysis.relatedMemories.length > 0) {
                html += '<h4>Related Memories:</h4>';
                html += analysis.relatedMemories.map(memory => \`
                    <div class="memory-item">
                        <div class="memory-title">\${memory.title}</div>
                        <div class="memory-meta">Type: \${memory.memory_type}</div>
                        <div class="memory-content">\${memory.content.substring(0, 100)}...</div>
                    </div>
                \`).join('');
            }
            
            container.innerHTML = html;
        }
        
        // Handle messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            
            switch (message.command) {
                case 'searchResults':
                    displaySearchResults(message.data);
                    showStatus(\`Found \${message.data.length} memories\`, false);
                    break;
                case 'suggestions':
                    displaySuggestions(message.data);
                    showStatus('Context suggestions loaded', false);
                    break;
                case 'codeAnalysis':
                    displayCodeAnalysis(message.data);
                    showStatus('Code analysis complete', false);
                    break;
                case 'memoryCreated':
                    showStatus(message.message, false);
                    hideCreateForm();
                    document.getElementById('memoryTitle').value = '';
                    document.getElementById('memoryContent').value = '';
                    break;
                case 'error':
                    showStatus(message.message, true);
                    break;
            }
        });
        
        // Handle Enter key in search input
        document.getElementById('searchInput').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchMemories();
            }
        });
    </script>
</body>
</html>`;
    }
}
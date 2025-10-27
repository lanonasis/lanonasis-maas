// @ts-check
(function () {
    const vscode = acquireVsCodeApi();
    
    // State management
    let state = {
        authenticated: false,
        memories: [],
        loading: true,
        enhancedMode: false,
        cliVersion: null,
        expandedGroups: new Set(['context', 'project', 'knowledge'])
    };

    // Initialize
    document.addEventListener('DOMContentLoaded', () => {
        setupEventListeners();
        render();
    });

    // Handle messages from extension
    window.addEventListener('message', event => {
        const message = event.data;
        
        switch (message.type) {
            case 'updateState':
                state = { ...state, ...message.state };
                render();
                break;
            case 'searchResults':
                displaySearchResults(message.results, message.query);
                break;
            case 'error':
                showError(message.message);
                break;
        }
    });

    function setupEventListeners() {
        // Search
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', debounce((e) => {
                const query = e.target.value.trim();
                if (query.length > 2) {
                    vscode.postMessage({
                        type: 'searchMemories',
                        query: query
                    });
                }
            }, 300));
        }
    }

    function render() {
        const root = document.getElementById('root');
        if (!root) return;

        if (state.loading) {
            root.innerHTML = getLoadingHTML();
            return;
        }

        if (!state.authenticated) {
            root.innerHTML = getAuthHTML();
            attachAuthListeners();
            return;
        }

        root.innerHTML = getMainHTML();
        attachMainListeners();
    }

    function getLoadingHTML() {
        return `
            <div class="loading-state">
                <div class="spinner"></div>
                <p>Loading Lanonasis Memory...</p>
            </div>
        `;
    }

    function getAuthHTML() {
        return `
            <div class="auth-state">
                <div class="auth-icon">🔐</div>
                <h3>Welcome to Lanonasis Memory</h3>
                <p>Connect your Lanonasis account to access your memories, create new ones, and leverage AI-powered semantic search.</p>
                <div class="auth-actions">
                    <button class="btn" id="auth-btn">
                        <span class="btn-icon">🔑 Authenticate</span>
                    </button>
                    <button class="btn btn-secondary" id="get-key-btn">
                        <span class="btn-icon">🌐 Get API Key</span>
                    </button>
                    <button class="btn btn-secondary" id="settings-btn">
                        <span class="btn-icon">⚙️ Settings</span>
                    </button>
                </div>
            </div>
        `;
    }

    function getMainHTML() {
        const hasMemories = state.memories && state.memories.length > 0;
        
        return `
            <div class="sidebar-header">
                <div class="header-title">
                    <h2>🧠 Lanonasis Memory</h2>
                    <span class="status-badge">
                        <span class="status-dot"></span>
                        Connected
                    </span>
                </div>
                ${state.enhancedMode ? getEnhancedBannerHTML() : ''}
                
                <div class="search-container">
                    <span class="search-icon">🔍</span>
                    <input 
                        type="text" 
                        class="search-box" 
                        id="search-input"
                        placeholder="Search memories..." 
                    />
                </div>
                
                <div class="action-buttons">
                    <button class="btn" id="create-memory-btn">
                        <span class="btn-icon">➕ Create</span>
                    </button>
                    <button class="btn btn-secondary" id="refresh-btn">
                        <span class="btn-icon">🔄 Refresh</span>
                    </button>
                </div>
            </div>

            ${hasMemories ? getMemoriesHTML() : getEmptyStateHTML()}
        `;
    }

    function getEnhancedBannerHTML() {
        return `
            <div class="enhanced-banner">
                <div class="enhanced-banner-header">
                    🚀 Enhanced Mode Active
                </div>
                <div class="enhanced-banner-text">
                    CLI ${state.cliVersion || 'v3.0+'} detected - Performance optimized
                </div>
            </div>
        `;
    }

    function getMemoriesHTML() {
        const groupedMemories = groupMemoriesByType(state.memories);
        const types = Object.keys(groupedMemories);
        
        if (types.length === 0) {
            return getEmptyStateHTML();
        }

        return `
            <div class="memories-container">
                <div class="section-header">
                    <span>Your Memories</span>
                    <span>${state.memories.length} total</span>
                </div>
                ${types.map(type => getMemoryGroupHTML(type, groupedMemories[type])).join('')}
            </div>
        `;
    }

    function getMemoryGroupHTML(type, memories) {
        const isExpanded = state.expandedGroups.has(type);
        const icon = getTypeIcon(type);
        
        return `
            <div class="memory-group">
                <div class="memory-type-header" data-type="${type}">
                    <span class="memory-type-icon">${icon}</span>
                    <span>${capitalizeFirst(type)}</span>
                    <span class="memory-count">${memories.length}</span>
                </div>
                ${isExpanded ? `
                    <ul class="memory-list">
                        ${memories.map(memory => getMemoryItemHTML(memory)).join('')}
                    </ul>
                ` : ''}
            </div>
        `;
    }

    function getMemoryItemHTML(memory) {
        const date = new Date(memory.created_at).toLocaleDateString();
        const preview = (memory.content || '').substring(0, 80);
        
        return `
            <li class="memory-item" data-id="${memory.id}">
                <div class="memory-title">${escapeHtml(memory.title)}</div>
                <div class="memory-meta">
                    <span>📅 ${date}</span>
                    ${memory.tags && memory.tags.length > 0 ? `<span>🏷️ ${memory.tags.length}</span>` : ''}
                </div>
            </li>
        `;
    }

    function getEmptyStateHTML() {
        return `
            <div class="empty-state">
                <div class="empty-icon">📝</div>
                <h3>No Memories Yet</h3>
                <p>Get started by creating your first memory from selected text or a file.</p>
                <button class="btn" id="create-first-memory-btn">
                    <span class="btn-icon">✨ Create Your First Memory</span>
                </button>
                <p class="mt-2" style="font-size: 12px; opacity: 0.7;">
                    Tip: Select text in any file and press Cmd+Shift+Alt+M
                </p>
            </div>
        `;
    }

    function attachAuthListeners() {
        const authBtn = document.getElementById('auth-btn');
        const getKeyBtn = document.getElementById('get-key-btn');
        const settingsBtn = document.getElementById('settings-btn');

        authBtn?.addEventListener('click', () => {
            vscode.postMessage({ type: 'authenticate' });
        });

        getKeyBtn?.addEventListener('click', () => {
            vscode.postMessage({ type: 'getApiKey' });
        });

        settingsBtn?.addEventListener('click', () => {
            vscode.postMessage({ type: 'showSettings' });
        });
    }

    function attachMainListeners() {
        // Create memory button
        const createBtn = document.getElementById('create-memory-btn');
        const createFirstBtn = document.getElementById('create-first-memory-btn');
        const refreshBtn = document.getElementById('refresh-btn');

        createBtn?.addEventListener('click', () => {
            vscode.postMessage({ type: 'createMemory' });
        });

        createFirstBtn?.addEventListener('click', () => {
            vscode.postMessage({ type: 'createMemory' });
        });

        refreshBtn?.addEventListener('click', () => {
            vscode.postMessage({ type: 'refresh' });
        });

        // Memory type headers (toggle expand/collapse)
        document.querySelectorAll('.memory-type-header').forEach(header => {
            header.addEventListener('click', (e) => {
                const type = e.currentTarget.getAttribute('data-type');
                if (type) {
                    toggleGroupExpansion(type);
                }
            });
        });

        // Memory items
        document.querySelectorAll('.memory-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const memoryId = e.currentTarget.getAttribute('data-id');
                const memory = state.memories.find(m => m.id === memoryId);
                if (memory) {
                    vscode.postMessage({
                        type: 'openMemory',
                        memory: memory
                    });
                }
            });
        });
    }

    function toggleGroupExpansion(type) {
        if (state.expandedGroups.has(type)) {
            state.expandedGroups.delete(type);
        } else {
            state.expandedGroups.add(type);
        }
        render();
    }

    function displaySearchResults(results, query) {
        if (results.length === 0) {
            showInfo(`No results found for "${query}"`);
            return;
        }

        // Update state with search results
        state.memories = results;
        render();
    }

    function showError(message) {
        const root = document.getElementById('root');
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        root?.prepend(errorDiv);

        setTimeout(() => errorDiv.remove(), 5000);
    }

    function showInfo(message) {
        // Similar to showError but with different styling
        console.log('Info:', message);
    }

    // Utility functions
    function groupMemoriesByType(memories) {
        const grouped = {};
        memories.forEach(memory => {
            const type = memory.memory_type || 'context';
            if (!grouped[type]) {
                grouped[type] = [];
            }
            grouped[type].push(memory);
        });
        return grouped;
    }

    function getTypeIcon(type) {
        const icons = {
            'context': '💡',
            'project': '📁',
            'knowledge': '📚',
            'reference': '🔗',
            'personal': '👤',
            'workflow': '⚙️',
            'conversation': '💬'
        };
        return icons[type] || '📄';
    }

    function capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
})();

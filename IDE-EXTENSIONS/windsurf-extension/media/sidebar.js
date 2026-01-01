// @ts-check
(function () {
    const vscode = acquireVsCodeApi();
    
    // State management
    const allowedTypes = ['context', 'project', 'knowledge', 'reference', 'personal', 'workflow'];

    let state = {
        authenticated: false,
        memories: [],
        loading: true,
        enhancedMode: false,
        cliVersion: null,
        expandedGroups: new Set(['context', 'project', 'knowledge']),
        showCreate: false,
        selectedIds: new Set(),
        editingId: null,
        editingDraft: null,
        editingError: '',
        undoToast: null,
        refinerInput: '',
        refinerOutput: ''
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
                state = {
                    ...state,
                    ...message.state,
                    expandedGroups: state.expandedGroups,
                    selectedIds: state.selectedIds,
                    editingId: state.editingId,
                    editingDraft: state.editingDraft,
                    editingError: state.editingError,
                    undoToast: state.undoToast
                };
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
        const selectedCount = state.selectedIds.size;
        
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
                    <button class="btn" id="toggle-create-btn">
                        <span class="btn-icon">➕ ${state.showCreate ? 'Close' : 'Create'}</span>
                    </button>
                    <button class="btn btn-secondary" id="refresh-btn">
                        <span class="btn-icon">🔄 Refresh</span>
                    </button>
                </div>
            </div>

            ${state.showCreate ? getCreateFormHTML() : ''}
            ${selectedCount > 0 ? getBulkBarHTML(selectedCount) : ''}
            ${getRefinerHTML()}
            ${hasMemories ? getMemoriesHTML() : getEmptyStateHTML()}
            ${state.undoToast ? getUndoToastHTML(state.undoToast.message) : ''}
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

    function getCreateFormHTML() {
        return `
        <div class="card create-card">
            <div class="form-row">
                <label for="template-select">Template</label>
                <select id="template-select">
                    <option value="">Blank</option>
                    <option value="bug">Bug report</option>
                    <option value="note">Note</option>
                    <option value="spec">Spec</option>
                </select>
            </div>
            <div class="form-row">
                <label for="create-title">Title</label>
                <input id="create-title" type="text" placeholder="e.g., OAuth flow notes" />
            </div>
            <div class="form-row">
                <label for="create-type">Type</label>
                <select id="create-type">
                    ${allowedTypes.map(t => `<option value="${t}">${t}</option>`).join('')}
                </select>
            </div>
            <div class="form-row">
                <label for="create-tags">Tags (comma separated)</label>
                <input id="create-tags" type="text" placeholder="auth, oauth, cli" />
            </div>
            <div class="form-row">
                <label for="create-content">Content</label>
                <textarea id="create-content" rows="5" placeholder="Paste content..."></textarea>
            </div>
            <div class="form-actions">
                <button class="btn" id="create-save-btn"><span class="btn-icon">✅ Save</span></button>
                <button class="btn btn-secondary" id="create-cancel-btn"><span class="btn-icon">✖ Cancel</span></button>
            </div>
        </div>
        `;
    }

    function getBulkBarHTML(count) {
        return `
        <div class="bulk-bar">
            <div>${count} selected</div>
            <div class="bulk-actions">
                <button class="btn btn-secondary" id="bulk-tag-btn">Tag</button>
                <button class="btn btn-secondary" id="bulk-delete-btn">Delete</button>
                <button class="btn btn-secondary" id="bulk-export-btn">Export</button>
                <button class="btn btn-secondary" id="bulk-clear-btn">Clear</button>
            </div>
        </div>
        `;
    }

    function getUndoToastHTML(message) {
        return `
        <div class="undo-toast">
            <span>${message}</span>
            <button class="btn btn-secondary" id="undo-btn">Undo</button>
        </div>
        `;
    }

    function getRefinerHTML() {
        return `
        <div class="card refine-card">
            <div class="refine-header">
                <span>Prompt Refiner</span>
                <span class="hint">Uses current memories for context</span>
            </div>
            <textarea id="refine-input" rows="3" placeholder="Paste a prompt to refine...">${escapeHtml(state.refinerInput || '')}</textarea>
            <div class="form-actions">
                <button class="btn btn-secondary" id="refine-run-btn">Refine</button>
                <button class="btn btn-secondary" id="refine-copy-btn">Copy</button>
            </div>
            ${state.refinerOutput ? `
            <div class="refine-output">
                <div class="refine-label">Refined prompt</div>
                <pre>${escapeHtml(state.refinerOutput)}</pre>
            </div>` : ''}
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
        const checked = state.selectedIds.has(memory.id) ? 'checked' : '';
        const isEditing = state.editingId === memory.id;
        const draft = state.editingDraft || { title: memory.title, content: memory.content, tags: (memory.tags || []).join(', '), memory_type: memory.memory_type };
        
        return `
            <li class="memory-item" data-id="${memory.id}">
                <div class="memory-row">
                    <input type="checkbox" class="memory-select" data-id="${memory.id}" ${checked} />
                    <div class="memory-body" data-id="${memory.id}">
                        ${isEditing ? `
                            <div class="edit-form">
                                <input id="edit-title-${memory.id}" type="text" value="${escapeHtml(draft.title)}" />
                                <textarea id="edit-content-${memory.id}" rows="4">${escapeHtml(draft.content || '')}</textarea>
                                <input id="edit-tags-${memory.id}" type="text" value="${escapeHtml(draft.tags || '')}" placeholder="tags (comma separated)" />
                                <select id="edit-type-${memory.id}">
                                    ${allowedTypes.map(t => `<option value="${t}" ${t === draft.memory_type ? 'selected' : ''}>${t}</option>`).join('')}
                                </select>
                                ${state.editingError ? `<div class="error-message inline-error">${escapeHtml(state.editingError)}</div>` : ''}
                                <div class="form-actions">
                                    <button class="btn btn-secondary edit-cancel" data-id="${memory.id}">Cancel</button>
                                    <button class="btn edit-save" data-id="${memory.id}">Save</button>
                                </div>
                            </div>
                        ` : `
                <div class="memory-title">${escapeHtml(memory.title)}</div>
                <div class="memory-meta">
                    <span>📅 ${date}</span>
                    ${memory.tags && memory.tags.length > 0 ? `<span>🏷️ ${memory.tags.length}</span>` : ''}
                            </div>
                            <div class="memory-preview">${escapeHtml(preview)}${preview.length === 80 ? '…' : ''}</div>
                        `}
                    </div>
                    <div class="memory-actions">
                        ${isEditing ? '' : `<button class="btn-icon memory-edit" data-id="${memory.id}" title="Edit">✏️</button>`}
                        <button class="btn-icon memory-delete" data-id="${memory.id}" title="Delete">🗑️</button>
                    </div>
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
        const toggleCreateBtn = document.getElementById('toggle-create-btn');
        const createFirstBtn = document.getElementById('create-first-memory-btn');
        const refreshBtn = document.getElementById('refresh-btn');
        const bulkTagBtn = document.getElementById('bulk-tag-btn');
        const bulkDeleteBtn = document.getElementById('bulk-delete-btn');
        const bulkClearBtn = document.getElementById('bulk-clear-btn');
        const bulkExportBtn = document.getElementById('bulk-export-btn');
        const undoBtn = document.getElementById('undo-btn');
        const refineRunBtn = document.getElementById('refine-run-btn');
        const refineCopyBtn = document.getElementById('refine-copy-btn');
        const refineInput = document.getElementById('refine-input');

        toggleCreateBtn?.addEventListener('click', () => {
            state.showCreate = !state.showCreate;
            render();
        });

        createFirstBtn?.addEventListener('click', () => {
            state.showCreate = true;
            render();
        });

        refreshBtn?.addEventListener('click', () => {
            vscode.postMessage({ type: 'refresh' });
        });

        const saveBtn = document.getElementById('create-save-btn');
        const cancelBtn = document.getElementById('create-cancel-btn');
        const templateSelect = document.getElementById('template-select');
        saveBtn?.addEventListener('click', () => submitCreateForm());
        cancelBtn?.addEventListener('click', () => { state.showCreate = false; render(); });
        templateSelect?.addEventListener('change', (e) => applyTemplate(e.target.value));

        bulkDeleteBtn?.addEventListener('click', () => handleBulkDelete());
        bulkTagBtn?.addEventListener('click', () => handleBulkTag());
        bulkClearBtn?.addEventListener('click', () => { state.selectedIds.clear(); render(); });
        bulkExportBtn?.addEventListener('click', () => handleBulkExport());
        undoBtn?.addEventListener('click', () => handleUndo());
        refineRunBtn?.addEventListener('click', () => {
            state.refinerInput = refineInput?.value || '';
            state.refinerOutput = buildRefinedPrompt(state.refinerInput, state.memories);
            render();
        });
        refineCopyBtn?.addEventListener('click', () => {
            if (!state.refinerOutput) return;
            navigator.clipboard.writeText(state.refinerOutput).catch(() => {});
        });

        document.querySelectorAll('.memory-type-header').forEach(header => {
            header.addEventListener('click', (e) => {
                const type = e.currentTarget.getAttribute('data-type');
                if (type) toggleGroupExpansion(type);
            });
        });

        document.querySelectorAll('.memory-item .memory-body').forEach(item => {
            item.addEventListener('click', (e) => {
                const memoryId = e.currentTarget.getAttribute('data-id');
                const memory = state.memories.find(m => m.id === memoryId);
                if (memory) vscode.postMessage({ type: 'openMemory', memory });
            });
        });

        document.querySelectorAll('.memory-select').forEach(cb => {
            cb.addEventListener('change', (e) => {
                const id = e.target.getAttribute('data-id');
                if (!id) return;
                if (e.target.checked) state.selectedIds.add(id);
                else state.selectedIds.delete(id);
                render();
            });
        });

        document.querySelectorAll('.memory-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.getAttribute('data-id');
                const mem = state.memories.find(m => m.id === id);
                if (!mem) return;
                state.editingId = id;
                state.editingDraft = {
                    title: mem.title,
                    content: mem.content,
                    tags: (mem.tags || []).join(', '),
                    memory_type: mem.memory_type || 'context'
                };
                state.editingError = '';
                render();
            });
        });

        document.querySelectorAll('.memory-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.getAttribute('data-id');
                const mem = state.memories.find(m => m.id === id);
                if (!mem) return;
                scheduleDeleteWithUndo(mem);
            });
        });

        document.querySelectorAll('.edit-save').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = btn.getAttribute('data-id');
                submitEdit(id);
            });
        });

        document.querySelectorAll('.edit-cancel').forEach(btn => {
            btn.addEventListener('click', (e) => {
                state.editingId = null;
                state.editingDraft = null;
                state.editingError = '';
                render();
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
        console.log('Info:', message);
    }

    function applyTemplate(templateKey) {
        const titleEl = document.getElementById('create-title');
        const contentEl = document.getElementById('create-content');
        if (!titleEl || !contentEl) return;
        switch (templateKey) {
            case 'bug':
                titleEl.value = 'Bug report: ';
                contentEl.value = 'Steps to reproduce:\\nExpected:\\nActual:\\nLogs:\\n';
                break;
            case 'note':
                titleEl.value = 'Note: ';
                contentEl.value = 'Context:\\nKey points:\\nNext steps:\\n';
                break;
            case 'spec':
                titleEl.value = 'Spec: ';
                contentEl.value = 'Goal:\\nScope:\\nConstraints:\\nOpen questions:\\n';
                break;
            default:
                titleEl.value = '';
                contentEl.value = '';
        }
    }

    function submitCreateForm() {
        const title = document.getElementById('create-title')?.value?.trim();
        const content = document.getElementById('create-content')?.value?.trim();
        const type = document.getElementById('create-type')?.value;
        const tagsRaw = document.getElementById('create-tags')?.value;
        const payload = {
            title,
            content,
            memory_type: type || 'context',
            tags: tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : undefined
        };
        if (!title || !content) {
            showError('Title and content are required');
            return;
        }
        vscode.postMessage({ type: 'createMemory', payload });
        state.showCreate = false;
        render();
    }

    function handleBulkDelete() {
        const ids = Array.from(state.selectedIds);
        if (!ids.length) return;
        const ok = confirm(`Delete ${ids.length} memories?`);
        if (!ok) return;
        ids.forEach(id => {
            const mem = state.memories.find(m => m.id === id);
            if (mem) scheduleDeleteWithUndo(mem);
        });
        state.selectedIds.clear();
        render();
    }

    function handleBulkTag() {
        const ids = Array.from(state.selectedIds);
        if (!ids.length) return;
        const tagsRaw = prompt('Add tags (comma separated)');
        if (!tagsRaw) return;
        const tags = tagsRaw.split(',').map(t => t.trim()).filter(Boolean);
        if (!tags.length) return;
        vscode.postMessage({ type: 'bulkTag', ids, tags });
        state.selectedIds.clear();
        render();
    }

    function handleBulkExport() {
        const ids = Array.from(state.selectedIds);
        if (!ids.length) return;
        const payload = state.memories.filter(m => ids.includes(m.id));
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lanonasis-memories-${ids.length}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    function scheduleDeleteWithUndo(memory) {
        vscode.postMessage({ type: 'deleteMemory', id: memory.id });
        state.undoToast = {
            message: `Deleted "${memory.title}".`,
            payload: {
                title: memory.title,
                content: memory.content,
                memory_type: memory.memory_type || 'context',
                tags: memory.tags || []
            },
            timer: setTimeout(() => {
                state.undoToast = null;
                render();
            }, 5000)
        };
        render();
    }

    function handleUndo() {
        if (!state.undoToast) return;
        clearTimeout(state.undoToast.timer);
        const payload = state.undoToast.payload;
        vscode.postMessage({ type: 'restoreMemory', payload });
        state.undoToast = null;
        render();
    }

    function submitEdit(id) {
        const titleEl = document.getElementById(`edit-title-${id}`);
        const contentEl = document.getElementById(`edit-content-${id}`);
        const tagsEl = document.getElementById(`edit-tags-${id}`);
        const typeEl = document.getElementById(`edit-type-${id}`);
        const title = titleEl?.value?.trim();
        const content = contentEl?.value?.trim();
        if (!title || !content) {
            state.editingError = 'Title and content are required';
            render();
            return;
        }
        const tags = tagsEl?.value
            ? tagsEl.value.split(',').map(t => t.trim()).filter(Boolean)
            : undefined;
        vscode.postMessage({
            type: 'updateMemory',
            id,
            payload: {
                title,
                content,
                memory_type: typeEl?.value || 'context',
                tags
            }
        });
        state.editingId = null;
        state.editingDraft = null;
        state.editingError = '';
        render();
    }

    function buildRefinedPrompt(prompt, memories) {
        if (!prompt || !prompt.trim()) return '';
        const top = memories.slice(0, 3).map(m => `- ${m.title}${m.tags?.length ? ` (tags: ${m.tags.join(', ')})` : ''}`).join('\n');
        const contextBlock = top ? `Context:\n${top}\n\n` : '';
        return `${contextBlock}Task: ${prompt}\n\nPlease use the above context, be concise, and include any relevant IDs, tags, or steps.`;
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

# Implementation Guide: ApiKeyManager Component

## Overview

This guide provides detailed instructions for implementing the missing `ApiKeyManager` React component for the VSCode extension's enhanced React UI.

**Priority:** CRITICAL - Blocks build
**Location:** `src/components/ApiKeyManager.tsx`
**Imported at:** `src/components/IDEPanel.tsx:40`

---

## Reference Implementations

Before starting, review these existing implementations:

| File | Purpose |
|------|---------|
| `/v-secure/vortex-secure/src/pages/APIKeysPage.tsx` | Full web UI for API key management |
| `/apps/lanonasis-maas/IDE-EXTENSIONS/vscode-extension/src/services/ApiKeyService.ts` | API client for key operations |
| `/apps/lanonasis-maas/IDE-EXTENSIONS/vscode-extension/src/providers/ApiKeyTreeProvider.ts` | Tree view implementation pattern |
| `/v-secure/vortex-secure/src/types/mcp-router.ts` | Type definitions for API keys |

---

## Data Types

### API Key Interface (align with existing types)

```typescript
interface ApiKey {
  id: string;
  name: string;
  keyType: 'api_key' | 'database_url' | 'oauth_token' | 'certificate' | 'ssh_key' | 'webhook_secret' | 'encryption_key';
  environment: 'development' | 'staging' | 'production';
  accessLevel: 'public' | 'authenticated' | 'team' | 'admin' | 'enterprise';
  projectId: string;
  createdAt: string;
  expiresAt?: string;
  lastUsedAt?: string;
  usageCount: number;
  tags: string[];
  metadata: Record<string, unknown>;
  status: 'active' | 'rotating' | 'deprecated' | 'expired' | 'compromised';
}

interface Project {
  id: string;
  name: string;
  description?: string;
  apiKeyCount: number;
  createdAt: string;
}
```

---

## Component Structure

```
ApiKeyManager/
├── ApiKeyManager.tsx       # Main container component
├── ApiKeyList.tsx          # List of API keys
├── ApiKeyCard.tsx          # Individual key display
├── CreateKeyForm.tsx       # Create new key form
├── ApiKeyStats.tsx         # Usage statistics
└── index.ts                # Barrel export
```

---

## Implementation Steps

### Step 1: Create the Main Component

**File:** `src/components/ApiKeyManager.tsx`

```typescript
import React, { useState, useEffect, useCallback } from 'react';
import { Key, Plus, RefreshCw, Trash2, Copy, RotateCw, Check, AlertCircle } from 'lucide-react';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from './ui/collapsible';

interface ApiKeyManagerProps {
  onClose?: () => void;
}

export function ApiKeyManager({ onClose }: ApiKeyManagerProps) {
  // State
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Use VSCode message protocol
      window.vscode.postMessage({ type: 'getApiKeys' });
      window.vscode.postMessage({ type: 'getProjects' });
    } catch (err) {
      setError('Failed to load API keys');
    }
  }, []);

  // Message listener for responses
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const { type, data, error: msgError } = event.data;

      switch (type) {
        case 'apiKeysResponse':
          setApiKeys(data || []);
          setIsLoading(false);
          break;
        case 'projectsResponse':
          setProjects(data || []);
          break;
        case 'apiKeyCreated':
          setApiKeys(prev => [...prev, data]);
          setShowCreateForm(false);
          break;
        case 'apiKeyDeleted':
          setApiKeys(prev => prev.filter(k => k.id !== data.id));
          break;
        case 'apiKeyRotated':
          setApiKeys(prev => prev.map(k => k.id === data.id ? data : k));
          break;
        case 'error':
          setError(msgError);
          setIsLoading(false);
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Handlers
  const handleCreateKey = (formData: CreateKeyFormData) => {
    window.vscode.postMessage({
      type: 'createApiKey',
      data: formData
    });
  };

  const handleDeleteKey = (keyId: string) => {
    // Confirmation handled in UI
    window.vscode.postMessage({
      type: 'deleteApiKey',
      data: { keyId }
    });
  };

  const handleRotateKey = (keyId: string) => {
    window.vscode.postMessage({
      type: 'rotateApiKey',
      data: { keyId }
    });
  };

  const handleCopyKey = async (keyId: string, keyValue: string) => {
    try {
      await navigator.clipboard.writeText(keyValue);
      setCopiedKeyId(keyId);
      setTimeout(() => setCopiedKeyId(null), 2000);
    } catch {
      // Fallback for clipboard API
      window.vscode.postMessage({
        type: 'copyToClipboard',
        data: keyValue
      });
    }
  };

  // Filter keys by project
  const filteredKeys = selectedProject
    ? apiKeys.filter(k => k.projectId === selectedProject)
    : apiKeys;

  // Render
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-[var(--vscode-panel-border)]">
        <div className="flex items-center gap-2">
          <Key className="h-4 w-4" />
          <span className="font-medium">API Keys</span>
          <Badge variant="secondary">{apiKeys.length}</Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={loadData}
            disabled={isLoading}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => setShowCreateForm(true)}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            New Key
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-3 bg-[var(--vscode-inputValidation-errorBackground)] text-[var(--vscode-inputValidation-errorForeground)] flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Project Filter */}
      {projects.length > 0 && (
        <div className="p-2 border-b border-[var(--vscode-panel-border)]">
          <select
            value={selectedProject || ''}
            onChange={(e) => setSelectedProject(e.target.value || null)}
            className="w-full p-1.5 text-sm bg-[var(--vscode-input-background)] text-[var(--vscode-input-foreground)] border border-[var(--vscode-input-border)] rounded"
          >
            <option value="">All Projects</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Keys List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-[var(--vscode-descriptionForeground)]">
            Loading...
          </div>
        ) : filteredKeys.length === 0 ? (
          <div className="p-4 text-center text-[var(--vscode-descriptionForeground)]">
            <Key className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No API keys found</p>
            <Button
              variant="link"
              size="sm"
              onClick={() => setShowCreateForm(true)}
            >
              Create your first key
            </Button>
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {filteredKeys.map(key => (
              <ApiKeyCard
                key={key.id}
                apiKey={key}
                isCopied={copiedKeyId === key.id}
                onCopy={() => handleCopyKey(key.id, key.id)} // Use actual key value
                onRotate={() => handleRotateKey(key.id)}
                onDelete={() => handleDeleteKey(key.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Form Modal */}
      {showCreateForm && (
        <CreateKeyForm
          projects={projects}
          onSubmit={handleCreateKey}
          onCancel={() => setShowCreateForm(false)}
        />
      )}
    </div>
  );
}

// Sub-component: ApiKeyCard
interface ApiKeyCardProps {
  apiKey: ApiKey;
  isCopied: boolean;
  onCopy: () => void;
  onRotate: () => void;
  onDelete: () => void;
}

function ApiKeyCard({ apiKey, isCopied, onCopy, onRotate, onDelete }: ApiKeyCardProps) {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-400';
      case 'expired': return 'bg-red-500/20 text-red-400';
      case 'rotating': return 'bg-yellow-500/20 text-yellow-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getEnvColor = (env: string) => {
    switch (env) {
      case 'production': return 'bg-red-500/20 text-red-400';
      case 'staging': return 'bg-yellow-500/20 text-yellow-400';
      default: return 'bg-blue-500/20 text-blue-400';
    }
  };

  return (
    <Collapsible>
      <div className="border border-[var(--vscode-panel-border)] rounded-md overflow-hidden">
        <CollapsibleTrigger className="w-full p-3 flex items-center justify-between hover:bg-[var(--vscode-list-hoverBackground)] transition-colors">
          <div className="flex items-center gap-2">
            <Key className="h-4 w-4 text-[var(--vscode-descriptionForeground)]" />
            <span className="font-medium">{apiKey.name}</span>
            <Badge className={getStatusColor(apiKey.status)}>
              {apiKey.status}
            </Badge>
            <Badge className={getEnvColor(apiKey.environment)}>
              {apiKey.environment}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onCopy(); }}>
              {isCopied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="p-3 pt-0 border-t border-[var(--vscode-panel-border)] bg-[var(--vscode-editor-background)]">
            {/* Key Details */}
            <div className="grid grid-cols-2 gap-2 text-sm mb-3">
              <div>
                <span className="text-[var(--vscode-descriptionForeground)]">Type:</span>
                <span className="ml-2">{apiKey.keyType}</span>
              </div>
              <div>
                <span className="text-[var(--vscode-descriptionForeground)]">Access:</span>
                <span className="ml-2">{apiKey.accessLevel}</span>
              </div>
              <div>
                <span className="text-[var(--vscode-descriptionForeground)]">Created:</span>
                <span className="ml-2">{new Date(apiKey.createdAt).toLocaleDateString()}</span>
              </div>
              <div>
                <span className="text-[var(--vscode-descriptionForeground)]">Usage:</span>
                <span className="ml-2">{apiKey.usageCount} calls</span>
              </div>
              {apiKey.expiresAt && (
                <div className="col-span-2">
                  <span className="text-[var(--vscode-descriptionForeground)]">Expires:</span>
                  <span className="ml-2">{new Date(apiKey.expiresAt).toLocaleDateString()}</span>
                </div>
              )}
            </div>

            {/* Tags */}
            {apiKey.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {apiKey.tags.map(tag => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={onRotate}>
                <RotateCw className="h-3.5 w-3.5 mr-1" />
                Rotate
              </Button>

              {showConfirmDelete ? (
                <>
                  <Button variant="destructive" size="sm" onClick={onDelete}>
                    Confirm Delete
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setShowConfirmDelete(false)}>
                    Cancel
                  </Button>
                </>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => setShowConfirmDelete(true)}>
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Delete
                </Button>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

// Sub-component: CreateKeyForm
interface CreateKeyFormData {
  name: string;
  keyType: string;
  environment: string;
  projectId?: string;
  tags: string[];
}

interface CreateKeyFormProps {
  projects: Project[];
  onSubmit: (data: CreateKeyFormData) => void;
  onCancel: () => void;
}

function CreateKeyForm({ projects, onSubmit, onCancel }: CreateKeyFormProps) {
  const [formData, setFormData] = useState<CreateKeyFormData>({
    name: '',
    keyType: 'api_key',
    environment: 'development',
    projectId: projects[0]?.id,
    tags: [],
  });
  const [tagInput, setTagInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (formData.name.length < 3) {
      newErrors.name = 'Name must be at least 3 characters';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  return (
    <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-[var(--vscode-editor-background)] border border-[var(--vscode-panel-border)] rounded-lg w-full max-w-md">
        <div className="p-4 border-b border-[var(--vscode-panel-border)]">
          <h3 className="font-medium">Create API Key</h3>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm mb-1">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full p-2 text-sm bg-[var(--vscode-input-background)] text-[var(--vscode-input-foreground)] border border-[var(--vscode-input-border)] rounded"
              placeholder="my-api-key"
            />
            {errors.name && (
              <span className="text-xs text-[var(--vscode-errorForeground)]">{errors.name}</span>
            )}
          </div>

          {/* Key Type */}
          <div>
            <label className="block text-sm mb-1">Key Type</label>
            <select
              value={formData.keyType}
              onChange={(e) => setFormData(prev => ({ ...prev, keyType: e.target.value }))}
              className="w-full p-2 text-sm bg-[var(--vscode-input-background)] text-[var(--vscode-input-foreground)] border border-[var(--vscode-input-border)] rounded"
            >
              <option value="api_key">API Key</option>
              <option value="database_url">Database URL</option>
              <option value="oauth_token">OAuth Token</option>
              <option value="webhook_secret">Webhook Secret</option>
            </select>
          </div>

          {/* Environment */}
          <div>
            <label className="block text-sm mb-1">Environment</label>
            <select
              value={formData.environment}
              onChange={(e) => setFormData(prev => ({ ...prev, environment: e.target.value }))}
              className="w-full p-2 text-sm bg-[var(--vscode-input-background)] text-[var(--vscode-input-foreground)] border border-[var(--vscode-input-border)] rounded"
            >
              <option value="development">Development</option>
              <option value="staging">Staging</option>
              <option value="production">Production</option>
            </select>
          </div>

          {/* Project */}
          {projects.length > 0 && (
            <div>
              <label className="block text-sm mb-1">Project</label>
              <select
                value={formData.projectId}
                onChange={(e) => setFormData(prev => ({ ...prev, projectId: e.target.value }))}
                className="w-full p-2 text-sm bg-[var(--vscode-input-background)] text-[var(--vscode-input-foreground)] border border-[var(--vscode-input-border)] rounded"
              >
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Tags */}
          <div>
            <label className="block text-sm mb-1">Tags</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                className="flex-1 p-2 text-sm bg-[var(--vscode-input-background)] text-[var(--vscode-input-foreground)] border border-[var(--vscode-input-border)] rounded"
                placeholder="Add tag..."
              />
              <Button type="button" variant="outline" size="sm" onClick={addTag}>
                Add
              </Button>
            </div>
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {formData.tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => removeTag(tag)}>
                    {tag} ×
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" variant="default">
              Create Key
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ApiKeyManager;
```

---

### Step 2: Update EnhancedSidebarProvider Message Handlers

Add these handlers in `src/panels/EnhancedSidebarProvider.ts`:

```typescript
case 'getApiKeys':
  await this.handleGetApiKeys();
  break;
case 'getProjects':
  await this.handleGetProjects();
  break;
case 'createApiKey':
  await this.handleCreateApiKey(data.data);
  break;
case 'deleteApiKey':
  await this.handleDeleteApiKey(data.data.keyId);
  break;
case 'rotateApiKey':
  await this.handleRotateApiKey(data.data.keyId);
  break;
```

With implementations:

```typescript
private async handleGetApiKeys() {
  try {
    const keys = await this.apiKeyService.getApiKeys();
    this.postMessage({ type: 'apiKeysResponse', data: keys });
  } catch (error) {
    this.postMessage({ type: 'error', error: 'Failed to load API keys' });
  }
}

private async handleCreateApiKey(data: CreateKeyFormData) {
  try {
    const newKey = await this.apiKeyService.createApiKey(data);
    this.postMessage({ type: 'apiKeyCreated', data: newKey });
  } catch (error) {
    this.postMessage({ type: 'error', error: 'Failed to create API key' });
  }
}

// ... similar for delete and rotate
```

---

### Step 3: Create Barrel Export

**File:** `src/components/ApiKeyManager/index.ts`

```typescript
export { ApiKeyManager } from './ApiKeyManager';
export type { ApiKey, Project } from './types';
```

---

## Testing Checklist

- [ ] Component renders without errors
- [ ] API keys load on mount
- [ ] Create new key form validates input
- [ ] Delete confirmation works
- [ ] Rotate key updates list
- [ ] Copy to clipboard works
- [ ] Loading states display correctly
- [ ] Error states display with recovery actions
- [ ] Keyboard navigation works (Tab, Enter, Escape)
- [ ] VSCode theme colors applied correctly

---

## VSCode Message Protocol Reference

| Message Type | Direction | Payload |
|--------------|-----------|---------|
| `getApiKeys` | UI → Extension | none |
| `apiKeysResponse` | Extension → UI | `{ data: ApiKey[] }` |
| `getProjects` | UI → Extension | none |
| `projectsResponse` | Extension → UI | `{ data: Project[] }` |
| `createApiKey` | UI → Extension | `{ data: CreateKeyFormData }` |
| `apiKeyCreated` | Extension → UI | `{ data: ApiKey }` |
| `deleteApiKey` | UI → Extension | `{ data: { keyId: string } }` |
| `apiKeyDeleted` | Extension → UI | `{ data: { id: string } }` |
| `rotateApiKey` | UI → Extension | `{ data: { keyId: string } }` |
| `apiKeyRotated` | Extension → UI | `{ data: ApiKey }` |
| `error` | Extension → UI | `{ error: string }` |

---

## Styling Guidelines

Use VSCode CSS variables for theme compatibility:

```css
/* Backgrounds */
var(--vscode-editor-background)
var(--vscode-sideBar-background)
var(--vscode-input-background)
var(--vscode-list-hoverBackground)

/* Text */
var(--vscode-foreground)
var(--vscode-descriptionForeground)
var(--vscode-input-foreground)

/* Borders */
var(--vscode-panel-border)
var(--vscode-input-border)

/* Status Colors */
var(--vscode-errorForeground)
var(--vscode-successForeground)
var(--vscode-warningForeground)
```

---

## Files to Create/Modify

1. **CREATE:** `src/components/ApiKeyManager.tsx` - Main component
2. **MODIFY:** `src/panels/EnhancedSidebarProvider.ts` - Add message handlers
3. **MODIFY:** `src/components/IDEPanel.tsx` - Import should now work

---

## Definition of Done

1. Build succeeds with `npm run compile`
2. Component renders in sidebar when API Keys tab is selected
3. All CRUD operations work end-to-end
4. No TypeScript errors
5. Matches VSCode theme (dark/light)
6. Keyboard accessible

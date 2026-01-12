# Implementation Guide: Implement Delete/Update Memory Operations

## Overview

The PrototypeUIBridge shows delete/update buttons but throws "not implemented" errors.

**Priority:** HIGH
**Issue:** #18

---

## Current Problem

**File:** `src/bridges/PrototypeUIBridge.ts` (lines 99-106)

```typescript
async updateMemory(_id: string, _updates: Partial<CreateMemoryRequest>): Promise<PrototypeMemory> {
  throw new Error('Update memory not yet implemented in enhanced UI');
}

async deleteMemory(_id: string): Promise<void> {
  throw new Error('Delete memory not yet implemented in enhanced UI');
}
```

---

## Solution Steps

### Step 1: Implement deleteMemory in PrototypeUIBridge

**File:** `src/bridges/PrototypeUIBridge.ts`

```typescript
async deleteMemory(id: string): Promise<void> {
  // Get memory service instance
  const memoryService = this.memoryService;

  if (!memoryService) {
    throw new Error('Memory service not initialized');
  }

  try {
    await memoryService.deleteMemory(id);

    // Remove from local cache if caching is implemented
    if (this.cachedMemories) {
      this.cachedMemories = this.cachedMemories.filter(m => m.id !== id);
    }
  } catch (error) {
    console.error('[PrototypeUIBridge] Delete memory failed:', error);
    throw new Error(`Failed to delete memory: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
```

### Step 2: Implement updateMemory in PrototypeUIBridge

```typescript
async updateMemory(id: string, updates: Partial<CreateMemoryRequest>): Promise<PrototypeMemory> {
  const memoryService = this.memoryService;

  if (!memoryService) {
    throw new Error('Memory service not initialized');
  }

  try {
    const updatedMemory = await memoryService.updateMemory(id, updates);

    // Update local cache if caching is implemented
    if (this.cachedMemories) {
      const index = this.cachedMemories.findIndex(m => m.id === id);
      if (index !== -1) {
        this.cachedMemories[index] = this.convertToPrototypeMemory(updatedMemory);
      }
    }

    return this.convertToPrototypeMemory(updatedMemory);
  } catch (error) {
    console.error('[PrototypeUIBridge] Update memory failed:', error);
    throw new Error(`Failed to update memory: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

private convertToPrototypeMemory(memory: MemoryEntry): PrototypeMemory {
  return {
    id: memory.id,
    title: memory.title,
    content: memory.content,
    summary: memory.summary,
    memory_type: memory.memory_type,
    tags: memory.tags,
    created_at: memory.created_at,
    updated_at: memory.updated_at,
    relevance_score: memory.relevance_score,
  };
}
```

### Step 3: Add Message Handlers in EnhancedSidebarProvider

**File:** `src/panels/EnhancedSidebarProvider.ts`

Add to the message switch statement:

```typescript
case 'deleteMemory':
  await this.handleDeleteMemory(data.data);
  break;

case 'updateMemory':
  await this.handleUpdateMemory(data.data);
  break;
```

Implement the handlers:

```typescript
private async handleDeleteMemory(data: { memoryId: string }): Promise<void> {
  try {
    await this.uiBridge.deleteMemory(data.memoryId);

    // Notify UI of success
    this.postMessage({
      type: 'memoryDeleted',
      data: { id: data.memoryId }
    });

    // Refresh the memory list
    await this.handleGetMemories();

  } catch (error) {
    this.postMessage({
      type: 'error',
      error: `Failed to delete memory: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }
}

private async handleUpdateMemory(data: { memoryId: string; updates: Partial<CreateMemoryRequest> }): Promise<void> {
  try {
    const updatedMemory = await this.uiBridge.updateMemory(data.memoryId, data.updates);

    // Notify UI of success
    this.postMessage({
      type: 'memoryUpdated',
      data: updatedMemory
    });

  } catch (error) {
    this.postMessage({
      type: 'error',
      error: `Failed to update memory: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }
}
```

### Step 4: Update MemoryCard UI

**File:** `src/components/MemoryCard.tsx`

Ensure the delete handler is properly wired:

```typescript
interface MemoryCardProps {
  memory: PrototypeMemory;
  onDelete?: (id: string) => void;
  onUpdate?: (id: string, updates: Partial<CreateMemoryRequest>) => void;
  onClick?: () => void;
}

export function MemoryCard({ memory, onDelete, onUpdate, onClick }: MemoryCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!onDelete) return;

    setIsDeleting(true);
    try {
      onDelete(memory.id);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="...">
      {/* Card content */}

      <DropdownMenu>
        <DropdownMenuTrigger>
          <MoreVertical className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={onClick}>
            <Eye className="mr-2 h-3 w-3" />
            View
          </DropdownMenuItem>

          {onUpdate && (
            <DropdownMenuItem onClick={() => {/* Open edit modal */}}>
              <Edit className="mr-2 h-3 w-3" />
              Edit
            </DropdownMenuItem>
          )}

          {onDelete && (
            <>
              {showDeleteConfirm ? (
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="text-[var(--vscode-errorForeground)]"
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 h-3 w-3" />
                  )}
                  Confirm Delete
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => setShowDeleteConfirm(true)}>
                  <Trash2 className="mr-2 h-3 w-3" />
                  Delete
                </DropdownMenuItem>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
```

### Step 5: Connect in MemoriesPanel/IDEPanel

Ensure the handlers are passed through:

```typescript
// In MemoriesPanel.tsx or IDEPanel.tsx
const handleDeleteMemory = (memoryId: string) => {
  window.vscode.postMessage({
    type: 'deleteMemory',
    data: { memoryId }
  });
};

const handleUpdateMemory = (memoryId: string, updates: Partial<CreateMemoryRequest>) => {
  window.vscode.postMessage({
    type: 'updateMemory',
    data: { memoryId, updates }
  });
};

// Pass to MemoryCard
<MemoryCard
  memory={memory}
  onDelete={handleDeleteMemory}
  onUpdate={handleUpdateMemory}
/>
```

### Step 6: Add Success Toast/Notification

```typescript
// Listen for success events
useEffect(() => {
  const handler = (event: MessageEvent) => {
    switch (event.data.type) {
      case 'memoryDeleted':
        // Show success notification
        showToast('Memory deleted successfully');
        break;
      case 'memoryUpdated':
        showToast('Memory updated successfully');
        break;
    }
  };
  window.addEventListener('message', handler);
  return () => window.removeEventListener('message', handler);
}, []);
```

---

## Message Protocol

| Message | Direction | Payload |
|---------|-----------|---------|
| `deleteMemory` | UI → Extension | `{ memoryId: string }` |
| `memoryDeleted` | Extension → UI | `{ id: string }` |
| `updateMemory` | UI → Extension | `{ memoryId: string, updates: object }` |
| `memoryUpdated` | Extension → UI | `{ ...updatedMemory }` |
| `error` | Extension → UI | `{ error: string }` |

---

## Files to Modify

1. **MODIFY:** `src/bridges/PrototypeUIBridge.ts` - Implement methods
2. **MODIFY:** `src/panels/EnhancedSidebarProvider.ts` - Add handlers
3. **MODIFY:** `src/components/MemoryCard.tsx` - Wire up delete/edit
4. **MODIFY:** Parent component to pass handlers

---

## Definition of Done

- [ ] Delete button in dropdown works
- [ ] Confirmation dialog appears before delete
- [ ] Memory removed from list after delete
- [ ] Update operation works (if edit UI exists)
- [ ] Success notifications appear
- [ ] Error handling shows user-friendly messages
- [ ] No console errors

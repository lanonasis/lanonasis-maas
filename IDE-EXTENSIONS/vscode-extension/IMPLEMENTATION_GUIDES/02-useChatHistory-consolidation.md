# Implementation Guide: Consolidate useChatHistory Hook

## Overview

This guide addresses the duplicate `useChatHistory` hook implementations that exist in two places.

**Priority:** HIGH
**Issue:** #16

---

## Current Problem

### Location 1: Inline in IDEPanel.tsx (Lines 54-91)
```typescript
// Simpler version without sessions
function useChatHistory() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  // Basic implementation
}
```

### Location 2: Standalone hook file
**File:** `src/hooks/useChatHistory.tsx`
```typescript
// Full version with sessions, auto-save, persistence
export function useChatHistory(): UseChatHistoryReturn {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  // Complete implementation
}
```

---

## Solution Steps

### Step 1: Review the Standalone Hook

Read `src/hooks/useChatHistory.tsx` to understand its full capabilities:

- Session management (multiple chat sessions)
- VSCode state persistence (`getState()`/`setState()`)
- Auto-save functionality
- Message CRUD operations
- Session switching

### Step 2: Update IDEPanel.tsx

Remove the inline hook definition and import from the hooks directory:

**Before (lines 54-91 in IDEPanel.tsx):**
```typescript
// Remove this entire block
function useChatHistory() {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    // ...inline implementation
  });
  // ...
}
```

**After:**
```typescript
import { useChatHistory } from '../hooks/useChatHistory';
```

### Step 3: Adapt Usage to Match Hook Interface

The standalone hook returns a different interface. Update usage in IDEPanel:

**Standalone hook interface:**
```typescript
interface UseChatHistoryReturn {
  sessions: ChatSession[];
  currentSession: ChatSession | null;
  messages: ChatMessage[];
  addMessage: (message: ChatMessage) => void;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  deleteMessage: (id: string) => void;
  clearHistory: () => void;
  createSession: (title?: string) => string;
  switchSession: (sessionId: string) => void;
  deleteSession: (sessionId: string) => void;
}
```

**Update IDEPanel usage:**
```typescript
// Old usage
const { messages, addMessage, clearHistory } = useChatHistory();

// New usage - same destructuring should work
const { messages, addMessage, clearHistory } = useChatHistory();
```

### Step 4: Ensure Type Alignment

Verify `ChatMessage` type is consistent:

**In hooks/useChatHistory.tsx:**
```typescript
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  attachedMemories?: string[];
}
```

**Ensure IDEPanel uses same type or import it:**
```typescript
import { useChatHistory, ChatMessage } from '../hooks/useChatHistory';
```

### Step 5: Test the Integration

1. Chat history persists across sidebar reload
2. Messages appear correctly
3. Clear history works
4. No duplicate state management

---

## Files to Modify

1. **MODIFY:** `src/components/IDEPanel.tsx`
   - Remove inline hook (lines 54-91)
   - Add import from `../hooks/useChatHistory`
   - Update any type references

2. **VERIFY:** `src/hooks/useChatHistory.tsx`
   - Ensure it exports necessary types
   - Ensure VSCode state persistence works

---

## Definition of Done

- [ ] Only one `useChatHistory` implementation exists
- [ ] IDEPanel imports from `src/hooks/`
- [ ] Chat functionality works as before
- [ ] No TypeScript errors
- [ ] Chat history persists across reloads

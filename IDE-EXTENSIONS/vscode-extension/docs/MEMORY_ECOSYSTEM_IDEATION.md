# Memory Ecosystem Ideation: Seamless Context Flow

## Vision Statement

> "Start an idea on mobile, continue in the IDE, use memories as living context for AI-assisted development."

The goal is to transform Lanonasis Memory from a **storage system** into a **contextual intelligence layer** that seamlessly integrates with AI workflows, captures content from anywhere, and provides persistent context across devices.

---

## Current Pain Points

1. **Chat input is ephemeral** - Input disappears after sending, no history
2. **Limited capture points** - Can only create memories from editor selection
3. **No AI integration** - Cannot reference memories in Copilot/AI chats
4. **No clipboard integration** - Can't capture from terminal, output panels, etc.
5. **Mobile/IDE disconnect** - Ideas captured on mobile don't flow to IDE context

---

## Feature Areas

### 1. Chat History & Persistence

**Problem**: Chat input disappears, no conversation history

**Solution**: Persistent chat with memory-backed conversations

```
┌─────────────────────────────────────────────────┐
│  Memory Assistant                               │
├─────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────┐   │
│  │ You: How did I implement auth last time? │   │
│  └─────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────┐   │
│  │ Assistant: Based on your memories from   │   │
│  │ "OAuth PKCE Implementation" (Nov 15):    │   │
│  │                                          │   │
│  │ You used PKCE flow with code_verifier... │   │
│  │ [📎 View Full Memory]                    │   │
│  └─────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────┐   │
│  │ You: Apply that pattern here            │   │
│  └─────────────────────────────────────────┘   │
├─────────────────────────────────────────────────┤
│  [💬 Type message...                    ] [→]  │
│  [📎 Attach] [📋 Paste] [🔗 Reference Memory]  │
└─────────────────────────────────────────────────┘
```

**Implementation**:
- Store chat sessions in memory service with `memory_type: 'conversation'`
- Auto-save conversations every 30 seconds
- Link referenced memories to conversation
- Resume conversations across sessions

**Data Model**:
```typescript
interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  referenced_memories: string[];
  created_at: string;
  updated_at: string;
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  attached_memories?: string[];
  code_snippets?: CodeSnippet[];
}
```

---

### 2. Universal Clipboard Capture

**Problem**: Can only capture from editor, not terminal/output/debug panels

**Solution**: Global capture command that works everywhere

**Capture Sources**:
- ✅ Editor selection
- 🆕 Terminal output
- 🆕 Debug console
- 🆕 Output panels
- 🆕 Problems panel
- 🆕 Search results
- 🆕 System clipboard

**Implementation**:

```typescript
// New command: lanonasis.captureContext
vscode.commands.registerCommand('lanonasis.captureContext', async () => {
  // Get content from various sources
  const content = await getContextualContent();
  
  // Show quick create dialog
  const memory = await showQuickCreateDialog({
    content,
    suggestedTitle: inferTitle(content),
    suggestedType: inferType(content),
    suggestedTags: inferTags(content)
  });
  
  if (memory) {
    await memoryService.createMemory(memory);
    vscode.window.showInformationMessage('📝 Memory captured!');
  }
});

async function getContextualContent(): Promise<string> {
  // 1. Check for editor selection first
  const editor = vscode.window.activeTextEditor;
  if (editor?.selection && !editor.selection.isEmpty) {
    return editor.document.getText(editor.selection);
  }
  
  // 2. Check active terminal
  const terminal = vscode.window.activeTerminal;
  if (terminal) {
    // Use terminal selection API (VS Code 1.93+)
    const selection = await terminal.selection;
    if (selection) return selection;
  }
  
  // 3. Fall back to system clipboard
  return await vscode.env.clipboard.readText();
}
```

**Keyboard Shortcut**: `Cmd+Shift+M` (Mac) / `Ctrl+Shift+M` (Windows)

**Context Menu Integration**:
```json
{
  "menus": {
    "terminal/context": [
      { "command": "lanonasis.captureContext", "group": "lanonasis" }
    ],
    "debug/console/context": [
      { "command": "lanonasis.captureContext", "group": "lanonasis" }
    ],
    "output/context": [
      { "command": "lanonasis.captureContext", "group": "lanonasis" }
    ]
  }
}
```

---

### 3. Copilot Chat Integration (VS Code Chat API)

**Problem**: Can't reference memories in GitHub Copilot conversations

**Solution**: Register as a Chat Participant with `@memory` mention

```
┌─────────────────────────────────────────────────┐
│  Copilot Chat                                   │
├─────────────────────────────────────────────────┤
│  User: @memory how did I handle rate limiting   │
│        in the API gateway?                      │
│                                                 │
│  @memory: Found 3 relevant memories:            │
│                                                 │
│  1. "Rate Limiting Implementation" (Nov 20)     │
│     You used token bucket algorithm with Redis  │
│     [View Memory]                               │
│                                                 │
│  2. "API Gateway Config" (Nov 18)               │
│     Rate limits: 100/min for free, 1000/min pro │
│     [View Memory]                               │
│                                                 │
│  User: @workspace /fix apply rate limiting from │
│        @memory to this endpoint                 │
└─────────────────────────────────────────────────┘
```

**Implementation** (VS Code Chat API):

```typescript
// Register Memory Chat Participant
const participant = vscode.chat.createChatParticipant(
  'lanonasis.memory',
  async (request, context, response, token) => {
    // Extract query from user message
    const query = request.prompt;
    
    // Search memories
    const memories = await memoryService.searchMemories(query, {
      limit: 5,
      threshold: 0.7
    });
    
    if (memories.length === 0) {
      response.markdown('No relevant memories found for your query.');
      return;
    }
    
    // Format response with memory references
    response.markdown(`Found **${memories.length}** relevant memories:\n\n`);
    
    for (const memory of memories) {
      response.markdown(`### ${memory.title}\n`);
      response.markdown(`*${memory.memory_type} • ${formatDate(memory.created_at)}*\n\n`);
      response.markdown(`${memory.content.substring(0, 300)}...\n\n`);
      
      // Add button to view full memory
      response.button({
        title: 'View Full Memory',
        command: 'lanonasis.openMemory',
        arguments: [memory.id]
      });
    }
    
    // Return memory context for follow-up questions
    return {
      metadata: {
        memories: memories.map(m => m.id)
      }
    };
  }
);

// Set participant properties
participant.iconPath = vscode.Uri.joinPath(extensionUri, 'images/icon.png');
participant.followupProvider = {
  provideFollowups(result, context, token) {
    return [
      { prompt: 'Show me the code from this memory' },
      { prompt: 'How can I apply this to my current file?' },
      { prompt: 'Find related memories' }
    ];
  }
};
```

**Chat Variables** (for @workspace integration):

```typescript
// Register memory as a chat variable
vscode.chat.registerChatVariableResolver('memory', {
  async resolve(name, context, token) {
    // Get recent or relevant memories
    const memories = await memoryService.listMemories(5);
    
    return memories.map(memory => ({
      level: vscode.ChatVariableLevel.Full,
      value: `Memory: ${memory.title}\n${memory.content}`,
      description: memory.title
    }));
  }
});
```

---

### 4. Memory Context Provider for AI Agents

**Problem**: AI agents can't access memory context automatically

**Solution**: Automatic context injection based on current file/project

```typescript
// Register as Language Model Tool (VS Code 1.93+)
const memoryTool = vscode.lm.registerTool('lanonasis-memory', {
  async invoke(options, token) {
    const { query, limit = 5 } = options.parameters;
    
    // Search memories
    const results = await memoryService.searchMemories(query, { limit });
    
    return {
      memories: results.map(m => ({
        title: m.title,
        content: m.content,
        type: m.memory_type,
        relevance: m.similarity_score
      }))
    };
  }
});

// Tool schema for LLM
memoryTool.schema = {
  type: 'function',
  function: {
    name: 'search_memories',
    description: 'Search the user\'s memory bank for relevant context, past decisions, and code patterns',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Natural language query to search memories'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of memories to return'
        }
      },
      required: ['query']
    }
  }
};
```

**Automatic Context Injection**:

```typescript
// Provide context based on current file
vscode.workspace.onDidOpenTextDocument(async (document) => {
  // Infer relevant context
  const filename = path.basename(document.fileName);
  const language = document.languageId;
  
  // Search for related memories
  const contextMemories = await memoryService.searchMemories(
    `${filename} ${language} implementation`,
    { limit: 3, threshold: 0.6 }
  );
  
  if (contextMemories.length > 0) {
    // Show subtle indicator
    statusBar.text = `$(brain) ${contextMemories.length} related memories`;
    statusBar.tooltip = contextMemories.map(m => m.title).join('\n');
    
    // Make available to Copilot
    setContextMemories(contextMemories);
  }
});
```

---

### 5. Cross-Device Sync (Mobile → IDE)

**Problem**: Ideas captured on mobile don't flow to IDE

**Solution**: Real-time sync with mobile companion app notifications

**Architecture**:

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Mobile     │    │   Supabase   │    │   VS Code    │
│   App        │───▶│   Realtime   │───▶│   Extension  │
└──────────────┘    └──────────────┘    └──────────────┘
     │                    │                    │
     │  Create memory     │  Broadcast         │  Show notification
     │  "Auth idea..."    │  event             │  "New mobile memory!"
     └────────────────────┴────────────────────┘
```

**Implementation**:

```typescript
// Subscribe to real-time memory updates
const supabase = createClient(supabaseUrl, supabaseKey);

const subscription = supabase
  .channel('memories')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'memories',
      filter: `user_id=eq.${userId}`
    },
    async (payload) => {
      const newMemory = payload.new as MemoryEntry;
      
      // Check if from mobile (metadata.source === 'mobile')
      if (newMemory.metadata?.source === 'mobile') {
        // Show notification
        const action = await vscode.window.showInformationMessage(
          `📱 New memory from mobile: "${newMemory.title}"`,
          'View',
          'Use as Context',
          'Dismiss'
        );
        
        if (action === 'View') {
          await vscode.commands.executeCommand('lanonasis.openMemory', newMemory.id);
        } else if (action === 'Use as Context') {
          // Insert into current chat
          await insertMemoryIntoChat(newMemory);
        }
      }
      
      // Refresh memory list
      memoryTreeProvider.refresh();
    }
  )
  .subscribe();
```

**Mobile-First Workflow**:

1. **On Mobile**: Capture idea → "Auth should use PKCE with rotating refresh tokens"
2. **Real-time**: Syncs to Supabase → Broadcasts to all devices
3. **In IDE**: Notification appears → "📱 New memory from mobile"
4. **Developer**: Clicks "Use as Context" → Memory inserted into Copilot chat
5. **Copilot**: Generates implementation based on the mobile idea

---

### 6. Enhanced Chat Interface

**Current State**: Input disappears, no history, no context display

**New Design**:

```
┌─────────────────────────────────────────────────────────┐
│  Memory Assistant                            [⚙️] [📜]  │
├─────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────┐ │
│  │  📁 Context: 3 memories attached                  │ │
│  │  ┌─────────────────────────────────────────────┐  │ │
│  │  │ [×] OAuth PKCE Flow (project)               │  │ │
│  │  │ [×] Rate Limiting Config (reference)        │  │ │
│  │  │ [×] Mobile idea: Auth tokens (mobile)       │  │ │
│  │  └─────────────────────────────────────────────┘  │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 👤 You (2 min ago)                              │   │
│  │ How should I implement the auth flow?           │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 🤖 Assistant                                    │   │
│  │ Based on your attached context, here's the      │   │
│  │ recommended approach:                           │   │
│  │                                                 │   │
│  │ 1. Use PKCE flow (from "OAuth PKCE Flow")       │   │
│  │ 2. Implement rate limiting (from config)        │   │
│  │ 3. Add rotating refresh tokens (mobile idea)    │   │
│  │                                                 │   │
│  │ ```typescript                                   │   │
│  │ const authConfig = {                            │   │
│  │   pkce: true,                                   │   │
│  │   refreshRotation: true,                        │   │
│  │   rateLimit: { window: 60, max: 100 }           │   │
│  │ };                                              │   │
│  │ ```                                             │   │
│  │                                                 │   │
│  │ [📋 Copy] [💾 Save as Memory] [🔗 Apply to File]│   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────┐ │
│  │ Ask about your memories...                       │ │
│  │                                                   │ │
│  │ [📎] [📋 Paste] [@memory] [#tag]         [Send →]│ │
│  └───────────────────────────────────────────────────┘ │
│  [+ Attach Memory] [📷 Capture Context] [🎤 Voice]    │
└─────────────────────────────────────────────────────────┘
```

**Features**:
- **Context Panel**: Shows attached memories, can remove/add
- **Chat History**: Scrollable conversation history
- **Rich Responses**: Code blocks, buttons, memory links
- **Input Actions**: Paste, attach, mention, voice input
- **Response Actions**: Copy, save as memory, apply to file

---

## Implementation Phases

### Phase 1: Chat Persistence (Week 1-2)
- [ ] Store chat history in memory service
- [ ] Add conversation list/history view
- [ ] Resume conversations across sessions
- [ ] Add "Save as Memory" for responses

### Phase 2: Universal Capture (Week 2-3)
- [ ] Add global capture command
- [ ] Terminal context menu integration
- [ ] Output/debug panel capture
- [ ] Clipboard monitoring option

### Phase 3: Copilot Integration (Week 3-4)
- [ ] Register `@memory` chat participant
- [ ] Implement memory search in chat
- [ ] Add follow-up suggestions
- [ ] Register Language Model Tool

### Phase 4: Enhanced Chat UI (Week 4-5)
- [ ] Context attachment panel
- [ ] Chat history display
- [ ] Rich response rendering
- [ ] Action buttons on responses

### Phase 5: Real-time Sync (Week 5-6)
- [ ] Supabase realtime subscription
- [ ] Mobile notification integration
- [ ] Cross-device sync indicators
- [ ] Conflict resolution

---

## Technical Requirements

### VS Code API Features Needed
- `vscode.chat.createChatParticipant` (1.90+)
- `vscode.lm.registerTool` (1.93+)
- `vscode.chat.registerChatVariableResolver` (1.90+)
- `vscode.window.activeTerminal.selection` (1.93+)

### Backend Requirements
- Supabase Realtime for sync
- WebSocket connection management
- Conversation storage schema
- Mobile app API endpoints

### Performance Considerations
- Lazy load chat history (pagination)
- Cache recent memories client-side
- Debounce real-time updates
- Limit context size for AI calls

---

## Success Metrics

1. **Engagement**: % of users who reference memories in Copilot
2. **Capture Rate**: Memories created from non-editor sources
3. **Cross-device**: Mobile → IDE workflow completions
4. **Context Usage**: Memories attached per chat session
5. **Retention**: Chat sessions resumed vs abandoned

---

## Open Questions

1. **Privacy**: Should mobile-captured content go through server or peer-to-peer?
2. **AI Provider**: Support Copilot only or also Claude, Gemini, etc.?
3. **Offline**: How to handle captures when offline?
4. **Voice**: Add voice-to-memory feature?
5. **Sharing**: Team memory sharing in chat context?

---

## Next Steps

1. **Prototype**: Build chat persistence first (highest impact, lowest effort)
2. **Validate**: Test Copilot integration with VS Code Insiders
3. **Design**: Create Figma mockups for enhanced chat UI
4. **Mobile**: Coordinate with mobile app team on sync protocol


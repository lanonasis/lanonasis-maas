# Windsurf Extension - Component Context

**Package:** `lanonasis-memory-windsurf`
**Version:** 1.4.5
**Location:** `IDE-EXTENSIONS/windsurf-extension/`

---

## Purpose

Memory as a Service integration for Windsurf IDE (Codeium). Provides AI-powered memory management with enhanced CLI/MCP features optimized specifically for Windsurf's AI-first workflow.

---

## Key Commands

| Command | Title | Keybinding |
|---------|-------|------------|
| `lanonasis.searchMemory` | Search Memories | `Ctrl+Shift+M` |
| `lanonasis.createMemory` | Create Memory from Selection | `Ctrl+Shift+Alt+M` |
| `lanonasis.createMemoryFromFile` | Create Memory from Current File | - |
| `lanonasis.createMemoryFromWorkspace` | Create Memory from Workspace Context | - |
| `lanonasis.captureContext` | Capture to Memory | `Ctrl+Shift+C` |
| `lanonasis.captureClipboard` | Capture Clipboard to Memory | `Ctrl+Alt+V` |
| `lanonasis.quickCapture` | Quick Capture | `Ctrl+Shift+S` |
| `lanonasis.aiAssist` | AI Memory Assistant | `Ctrl+Shift+Alt+A` |
| `lanonasis.authenticate` | Authenticate with Lanonasis | - |

---

## Views

| View | Type | Description |
|------|------|-------------|
| Memory Assistant | Webview | Sidebar UI |
| Tree View | Tree | Memory list (optional) |

---

## Configuration Options

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `lanonasis.apiUrl` | string | `https://api.lanonasis.com` | API endpoint |
| `lanonasis.gatewayUrl` | string | `https://api.lanonasis.com` | Gateway URL |
| `lanonasis.useGateway` | boolean | `false` | Use gateway |
| `lanonasis.useAutoAuth` | boolean | `true` | OAuth auto-redirect |
| `lanonasis.defaultMemoryType` | enum | `context` | Default memory type |
| `lanonasis.searchLimit` | number | `10` | Max search results |
| `lanonasis.enableAutoCompletion` | boolean | `true` | Code completion |
| `lanonasis.enableAiAssist` | boolean | `true` | AI assistance |
| `lanonasis.windsurf.enableContextAwareness` | boolean | `true` | Windsurf-specific context |
| `lanonasis.preferCLI` | boolean | `true` | Prefer CLI integration |
| `lanonasis.enableMCP` | boolean | `true` | MCP support |
| `lanonasis.mcpAutoDiscover` | boolean | `true` | Auto-discover MCP |
| `lanonasis.verboseLogging` | boolean | `false` | Debug logging |
| `lanonasis.showPerformanceFeedback` | boolean | `false` | Show CLI vs API perf |

---

## Windsurf-Specific Features

### AI Memory Assistant
- `Ctrl+Shift+Alt+A` - AI-powered memory suggestions
- Context-aware recommendations based on current file

### Context Awareness
- Windsurf-specific context awareness enabled by default
- Better integration with Windsurf's AI flow

### Performance Feedback
- Shows whether CLI or API was used for operations
- Helps optimize workflow

---

## Development

```bash
npm run compile          # Compile TypeScript
npm run watch            # Watch mode
npm run lint             # ESLint
npm run package          # Package .vsix
npm run publish          # Publish to marketplace
```

---

## Dependencies

### Internal
- `@lanonasis/memory-client` - API client
- `@lanonasis/ide-extension-core` - Shared core

### External
- `zod` (3.23.8) - Validation

---

## Architecture

Similar to VSCode/Cursor (Windsurf is also VSCode-based).
- **Entry:** `src/extension.ts`
- **TypeScript:** Standard build
- **ExtensionKind:** `ui`
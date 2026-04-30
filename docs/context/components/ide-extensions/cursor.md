# Cursor Extension - Component Context

**Package:** `lanonasis-memory-cursor`
**Version:** 1.4.5
**Location:** `IDE-EXTENSIONS/cursor-extension/`

---

## Purpose

Memory as a Service integration for Cursor IDE. Provides AI-powered memory management with semantic search, OAuth authentication, and MCP support. Built on VSCode extension architecture (Cursor is VSCode-based).

---

## Key Commands

| Command | Title | Keybinding |
|---------|-------|------------|
| `lanonasis.searchMemory` | Search Memories | `Ctrl+Shift+M` |
| `lanonasis.createMemory` | Create Memory from Selection | `Ctrl+Shift+Alt+M` |
| `lanonasis.captureContext` | Capture to Memory | `Ctrl+Shift+C` |
| `lanonasis.captureClipboard` | Capture Clipboard to Memory | `Ctrl+Alt+V` |
| `lanonasis.quickCapture` | Quick Capture | `Ctrl+Shift+S` |
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
| `lanonasis.preferCLI` | boolean | `true` | Prefer CLI integration |
| `lanonasis.enableMCP` | boolean | `true` | MCP support |
| `lanonasis.showTreeView` | boolean | `false` | Show tree view |

---

## Features

### Memory Operations
- Create memories from selection or clipboard
- Semantic search
- Quick capture from multiple contexts

### Authentication
- OAuth2 automatic authentication with browser redirect
- Secure credential storage

### MCP Integration
- Auto-discover MCP servers
- CLI MCP server support (`http://localhost:3001`)

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

Similar to VSCode extension (Cursor is VSCode-based).
- **Entry:** `src/extension.ts`
- **TypeScript:** Standard build
- **ExtensionKind:** `ui`
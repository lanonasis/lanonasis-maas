# VSCode Extension - Component Context

**Package:** `lanonasis-memory`
**Version:** 2.1.1
**Location:** `IDE-EXTENSIONS/vscode-extension/`

---

## Purpose

Memory as a Service integration for Visual Studio Code. Provides AI-powered memory management with semantic search, MCP support, and secure API key management directly within VSCode.

---

## Key Commands

| Command | Title | Keybinding |
|---------|-------|------------|
| `lanonasis.searchMemory` | Search Memories | `Ctrl+Shift+M` |
| `lanonasis.createMemory` | Create Memory from Selection | `Ctrl+Shift+Alt+M` |
| `lanonasis.captureContext` | Capture to Memory | `Ctrl+Shift+C` |
| `lanonasis.captureClipboard` | Capture Clipboard to Memory | `Ctrl+Alt+V` |
| `lanonasis.quickCapture` | Quick Capture | `Ctrl+Shift+S` |
| `lanonasis.authenticate` | Authenticate | `Ctrl+Shift+K` |
| `lanonasis.manageApiKeys` | Manage API Keys | - |
| `lanonasis.switchMode` | Switch Gateway/Direct API Mode | - |

---

## Views

| View | Type | Description |
|------|------|-------------|
| Memory Assistant | Webview | Modern sidebar UI |
| Memories | Tree | Traditional memory list |
| API Keys | Tree | API key management |

---

## Configuration Options

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `lanonasis.apiUrl` | string | `https://api.lanonasis.com` | API endpoint |
| `lanonasis.gatewayUrl` | string | `https://api.lanonasis.com` | Gateway URL |
| `lanonasis.useGateway` | boolean | `false` | Use gateway |
| `lanonasis.defaultMemoryType` | enum | `context` | Default memory type |
| `lanonasis.searchLimit` | number | `10` | Max search results |
| `lanonasis.enableAutoCompletion` | boolean | `true` | Code completion |
| `lanonasis.enableMCP` | boolean | `true` | MCP support |
| `lanonasis.mcpAutoDiscover` | boolean | `true` | Auto-discover MCP |
| `lanonasis.preferCLI` | boolean | `true` | Prefer CLI integration |
| `lanonasis.showTreeView` | boolean | `false` | Show tree view |
| `lanonasis.sidebarTheme` | enum | `default` | Sidebar theme |

---

## Features

### Memory Operations
- Create memories from selection, file, or workspace context
- Semantic search across all memories
- Memory type organization (context, project, knowledge, reference, personal, workflow)
- Quick capture from clipboard or selection

### API Key Management
- Create, view, rotate, and delete API keys
- Project-based organization
- Secure storage using VS Code SecretStorage

### Authentication
- OAuth2 browser-based authentication
- Direct API key entry
- Auto-import from CLI config

### MCP Integration
- Model Context Protocol support
- Auto-discovery of MCP servers
- CLI MCP server integration

### Chat Integration
- Built-in chat participant (`lanonasis`)
- Commands: `recall`, `save`, `list`, `context`

---

## Development

```bash
npm run compile          # Compile TypeScript
npm run watch            # Watch mode
npm run typecheck        # Type checking
npm run lint             # ESLint
npm run test:unit        # Unit tests (vitest)
npm run test:e2e         # E2E tests (playwright)
npm run package          # Package .vsix
npm run publish          # Publish to marketplace
```

---

## Dependencies

### Internal
- `@lanonasis/memory-client` - API client
- `@lanonasis/ide-extension-core` - Shared core

### External
- `react` (19.2.3) - UI framework
- `tailwindcss` (4.1.18) - Styling
- `zod` (4.1.13) - Validation
- `framer-motion` - Animations
- `lucide-react` - Icons

---

## Architecture

- **Entry:** `src/extension.ts`
- **React UI:** `src/react/` with Tailwind CSS
- **Backend:** TypeScript with esbuild
- **Testing:** Vitest + Playwright
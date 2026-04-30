# @lanonasis/ide-extension-core - Component Context

**Package:** `@lanonasis/ide-extension-core`
**Version:** 1.0.0
**Type:** Shared library for IDE extensions

---

## Purpose

Shared core library for Lanonasis IDE extensions (VSCode, Cursor, Windsurf). Contains common utilities, types, and logic used across all three IDE extensions to avoid code duplication.

---

## Key Features

- **Shared logic**: Common code for all IDE extensions
- **TypeScript types**: Shared type definitions
- **Memory integration**: Unified memory operations via `@lanonasis/memory-client`
- **Authentication**: Shared auth handling across extensions

---

## Dependencies

### External
- `zod` (3.22.4) - Validation

### Peer Dependencies
- `@lanonasis/memory-client` (^1.0.0 || ^2.0.0) - Required for memory functionality

---

## Usage

IDE extensions import from this core:

```typescript
import { createMemoryIntegration } from '@lanonasis/ide-extension-core';

// Shared across VSCode, Cursor, Windsurf
const memory = createMemoryIntegration({
  apiKey: process.env.MEMORY_API_KEY
});
```

---

## Development

```bash
npm run build           # Compile TypeScript
npm run watch           # Watch mode
npm run type-check      # TypeScript checking
npm run lint            # ESLint
npm run test            # Run tests
npm run test:coverage   # With coverage
```

---

## Extension Implementations

| Extension | Location |
|-----------|----------|
| VSCode | `IDE-EXTENSIONS/vscode-extension/` |
| Cursor | `IDE-EXTENSIONS/cursor-extension/` |
| Windsurf | `IDE-EXTENSIONS/windsurf-extension/` |

Each extension depends on this core package and adds IDE-specific UI/UX.
# @lanonasis/ide-extension-core

Shared core library for Lanonasis IDE extensions (VSCode, Cursor, Windsurf).

## Overview

This package provides platform-agnostic abstractions and shared functionality for all Lanonasis IDE extensions, ensuring consistency, reducing code duplication, and improving maintainability.

## Features

- **Type-Safe Schemas**: Zod-based validation for all memory operations
- **IDE Adapters**: Platform-agnostic interfaces for IDE-specific functionality
- **Secure Authentication**: Unified OAuth2 + PKCE and API key management
- **Memory Services**: Consistent memory operations across all IDEs
- **Configuration Management**: Type-safe configuration with validation
- **Shared Types**: Common interfaces for memory entries, search, and more

## Installation

```bash
npm install @lanonasis/ide-extension-core
```

## Usage

### Using Type Schemas

```typescript
import { CreateMemoryRequestSchema, MemoryType } from '@lanonasis/ide-extension-core';

// Validate memory creation request
const result = CreateMemoryRequestSchema.safeParse({
  title: 'My Memory',
  content: 'Important information',
  type: 'context',
  tags: ['typescript', 'api']
});

if (result.success) {
  console.log('Valid request:', result.data);
} else {
  console.error('Validation errors:', result.error);
}
```

### Implementing IDE Adapter

```typescript
import { IIDEAdapter, BrandingConfig } from '@lanonasis/ide-extension-core';
import * as vscode from 'vscode';

export function createVSCodeAdapter(
  context: vscode.ExtensionContext
): IIDEAdapter {
  return {
    secureStorage: {
      store: async (key, value) => {
        await context.secrets.store(key, value);
      },
      get: async (key) => {
        return await context.secrets.get(key);
      },
      delete: async (key) => {
        await context.secrets.delete(key);
      }
    },
    // ... implement other interfaces
    branding: {
      ideName: 'VSCode',
      extensionName: 'lanonasis-memory',
      extensionDisplayName: 'LanOnasis Memory Assistant',
      commandPrefix: 'lanonasis',
      userAgent: `VSCode/${vscode.version} LanOnasis/2.0.0`
    },
    getConfig: () => {
      // Return extension configuration
    }
  };
}
```

## Architecture

```
packages/ide-extension-core/
├── src/
│   ├── adapters/          # IDE adapter interfaces
│   │   └── IIDEAdapter.ts
│   ├── services/          # Shared services (future)
│   ├── types/             # Type definitions and schemas
│   │   ├── memory-aligned.ts
│   │   ├── memory-service.ts
│   │   ├── auth.ts
│   │   ├── config.ts
│   │   └── index.ts
│   ├── utils/             # Shared utilities (future)
│   └── index.ts
└── tests/                 # Test suite
```

## Development

```bash
# Install dependencies
npm install

# Build the package
npm run build

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Type checking
npm run type-check

# Lint code
npm run lint
```

## Contributing

This package is designed to be used by all Lanonasis IDE extensions. When adding new features:

1. Ensure they are platform-agnostic
2. Add comprehensive type definitions
3. Include tests with >80% coverage
4. Update this README with usage examples

## License

MIT

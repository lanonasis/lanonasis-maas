# Universal SDK v2.0 Migration Blueprint for @lanonasis/memory-sdk

## 📋 Overview

This document provides step-by-step instructions to replicate the Universal SDK v2.0 architecture from `@lanonasis/memory-client` to `@lanonasis/memory-sdk`.

## 🎯 Current vs. Target Architecture

### Current (v1.0)
```
src/
├── memory-client-sdk.ts  (MaaSClient with all features)
├── multimodal-memory.ts  (MultiModalMemoryClient extension)
├── types.ts
└── index.ts
```

### Target (v2.0 Universal)
```
src/
├── core/               # Browser-safe SDK
│   ├── client.ts       # MaaSClient (browser-safe)
│   ├── multimodal.ts   # MultiModal features
│   ├── types.ts        # Shared types
│   ├── errors.ts       # Error classes
│   └── index.ts        # Core exports
│
├── node/               # Node.js-specific
│   ├── enhanced-client.ts  # Server-side features
│   └── index.ts
│
├── react/              # React integration
│   ├── provider.tsx
│   ├── hooks.ts
│   └── index.ts
│
├── vue/                # Vue integration
│   ├── plugin.ts
│   ├── composables.ts
│   └── index.ts
│
├── presets/            # Configuration presets
│   └── index.ts
│
└── index.ts            # Main entry with auto-detection
```

## Step 1: Create Core Module (Browser-Safe)

### 1.1: Move Types to Core
Copy `src/types.ts` to `src/core/types.ts` - no changes needed, it's already browser-safe.

### 1.2: Create Core Client
**File:** `src/core/client.ts`

Replace `axios` with `fetch()` (already done in current code):
```typescript
/**
 * Core Memory SDK Client - Browser-Safe
 * Works in: Browser, Edge Functions, React Native, Deno, Bun
 */

import type {
  MemoryEntry,
  MemoryTopic,
  CreateMemoryRequest,
  UpdateMemoryRequest,
  SearchMemoryRequest,
  CreateTopicRequest,
  MemorySearchResult,
  UserMemoryStats
} from './types';

export interface MaaSClientConfig {
  apiUrl: string;
  apiKey?: string;
  authToken?: string;
  timeout?: number;
  headers?: Record<string, string>;

  // Hooks for custom behavior
  onError?: (error: ApiError) => void;
  onRequest?: (endpoint: string) => void;
  onResponse?: (endpoint: string, duration: number) => void;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface ApiError {
  message: string;
  code?: string;
  statusCode?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export class MaaSClient {
  // ... copy from memory-client-sdk.ts
  // Already browser-safe, uses fetch()
}

export function createMaaSClient(config: MaaSClientConfig): MaaSClient {
  return new MaaSClient(config);
}
```

### 1.3: Create Multimodal Module
**File:** `src/core/multimodal.ts`

**Key Change:** Make external API calls configurable instead of hard-coded `process.env`:

```typescript
/**
 * Multi-Modal Memory Extension - Browser-Safe
 *
 * NOTE: For OpenAI API calls to work in browser, you need CORS-enabled proxy
 * or server-side endpoints that forward to OpenAI
 */

import { MaaSClient, type MaaSClientConfig } from './client';

export interface MultiModalConfig extends MaaSClientConfig {
  /** OpenAI API key (use proxy in browser to avoid CORS) */
  openaiApiKey?: string;
  /** OpenAI API base URL (use proxy endpoint in browser) */
  openaiBaseUrl?: string;
}

export class MultiModalMemoryClient extends MaaSClient {
  private openaiApiKey?: string;
  private openaiBaseUrl: string;

  constructor(config: MultiModalConfig) {
    super(config);
    this.openaiApiKey = config.openaiApiKey;
    this.openaiBaseUrl = config.openaiBaseUrl || 'https://api.openai.com/v1';
  }

  // ... rest of multimodal methods
  // Replace `process.env.OPENAI_API_KEY
  // Replace hardcoded URLs with `this.openaiBaseUrl`
}
```

### 1.4: Create Core Index
**File:** `src/core/index.ts`

```typescript
// Client
export { MaaSClient, createMaaSClient } from './client';
export type { MaaSClientConfig, ApiResponse, ApiError, PaginatedResponse } from './client';

// Multimodal
export { MultiModalMemoryClient } from './multimodal';
export type { MultiModalConfig, MultiModalMemory } from './multimodal';

// Types
export * from './types';

// Constants
export const VERSION = '2.0.0';
export const SDK_NAME = '@lanonasis/memory-sdk';
```

## Step 2: Create Node.js Module

**File:** `src/node/index.ts`

```typescript
/**
 * Node.js-specific features for Memory SDK
 *
 * Adds server-side capabilities like:
 * - process.env access
 * - File system operations (if needed)
 * - Buffer handling
 */

import { MultiModalMemoryClient, type MultiModalConfig } from '../core/multimodal';

export interface NodeMemoryConfig extends MultiModalConfig {
  /** Load OpenAI key from environment if not provided */
  autoLoadEnv?: boolean;
}

export class NodeMemoryClient extends MultiModalMemoryClient {
  constructor(config: NodeMemoryConfig) {
    const finalConfig: MultiModalConfig = {
      ...config,
      openaiApiKey: config.openaiApiKey ||
        (config.autoLoadEnv && process.env.OPENAI_API_KEY
        undefined
    };

    super(finalConfig);
  }
}

export function createNodeMemoryClient(config: NodeMemoryConfig): NodeMemoryClient {
  return new NodeMemoryClient(config);
}

// Re-export core types
export type * from '../core/types';
```

## Step 3: Create React Integration

**File:** `src/react/provider.tsx`

```typescript
import { createElement, createContext, useMemo, type ReactNode } from 'react';
import { createMaaSClient, type MaaSClient, type MaaSClientConfig } from '../core/client';

export const MemoryContext = createContext<MaaSClient | null>(null);

export interface MemoryProviderProps {
  children: ReactNode;
  config?: MaaSClientConfig;
  apiKey?: string;
  apiUrl?: string;
  client?: MaaSClient;
}

export function MemoryProvider({ children, config, apiKey, apiUrl = 'https://api.lanonasis.com', client: providedClient }: MemoryProviderProps) {
  const client = useMemo(() => {
    if (providedClient) return providedClient;
    return createMaaSClient({ apiUrl, apiKey, ...config });
  }, [providedClient, apiUrl, apiKey, config]);

  return createElement(MemoryContext.Provider, { value: client }, children);
}
```

**File:** `src/react/hooks.ts`

```typescript
// Copy pattern from memory-client/src/react/hooks.ts
// Add hooks for:
// - useMemories()
// - useMemory(id)
// - useCreateMemory()
// - useSearchMemories()
// - useBuildContext() // NEW! For context building
// - useMultiModal()   // NEW! For multimodal features
```

## Step 4: Create Vue Integration

**File:** `src/vue/plugin.ts`

```typescript
// Copy pattern from memory-client/src/vue/plugin.ts
```

**File:** `src/vue/composables.ts`

```typescript
// Copy pattern from memory-client/src/vue/composables.ts
// Add composables for advanced features:
// - useBuildContext()
// - useMultiModal()
```

## Step 5: Create Configuration Presets

**File:** `src/presets/index.ts`

```typescript
import type { MaaSClientConfig } from '../core/client';
import type { MultiModalConfig } from '../core/multimodal';

export function browserPreset(config: Partial<MaaSClientConfig> = {}): MaaSClientConfig {
  return {
    apiUrl: 'https://api.lanonasis.com',
    timeout: 15000,
    headers: { 'X-Client-Type': 'browser' },
    ...config
  };
}

export function nodePreset(config: Partial<MultiModalConfig> = {}): MultiModalConfig {
  return {
    apiUrl: process.env.LANONASIS_API_URL || 'https://api.lanonasis.com',
    timeout: 30000,
    headers: { 'X-Client-Type': 'node' },
    openaiApiKey: process.env.OPENAI_API_KEY
    ...config
  };
}

export function edgePreset(config: Partial<MaaSClientConfig> = {}): MaaSClientConfig {
  return {
    apiUrl: 'https://api.lanonasis.com',
    timeout: 5000,
    headers: { 'X-Client-Type': 'edge' },
    ...config
  };
}

export const presets = {
  browser: browserPreset,
  node: nodePreset,
  edge: edgePreset
} as const;
```

## Step 6: Update Build System

### 6.1: Install Rollup Dependencies
```bash
npm install --save-dev \
  rollup \
  @rollup/plugin-node-resolve \
  @rollup/plugin-commonjs \
  @rollup/plugin-typescript \
  rollup-plugin-dts
```

### 6.2: Create rollup.config.js
**File:** `rollup.config.js`

```javascript
// Copy from packages/memory-client/rollup.config.js
// Adapt for memory-sdk structure
```

## Step 7: Update package.json

```json
{
  "name": "@lanonasis/memory-sdk",
  "version": "2.0.0",
  "description": "Universal Memory SDK - Multi-modal, Context Building, Enterprise Features",
  "type": "module",
  "main": "dist/index.js",
  "module": "dist/index.esm.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.esm.js",
      "require": "./dist/index.js",
      "default": "./dist/index.esm.js"
    },
    "./core": {
      "types": "./dist/core/index.d.ts",
      "import": "./dist/core/index.js",
      "browser": "./dist/core/index.js",
      "default": "./dist/core/index.js"
    },
    "./node": {
      "types": "./dist/node/index.d.ts",
      "node": "./dist/node/index.js",
      "import": "./dist/node/index.js",
      "default": null
    },
    "./react": {
      "types": "./dist/react/index.d.ts",
      "import": "./dist/react/index.js",
      "default": "./dist/react/index.js"
    },
    "./vue": {
      "types": "./dist/vue/index.d.ts",
      "import": "./dist/vue/index.js",
      "default": "./dist/vue/index.js"
    },
    "./presets": {
      "types": "./dist/presets/index.d.ts",
      "import": "./dist/presets/index.js",
      "default": "./dist/presets/index.js"
    }
  },
  "browser": {
    "./dist/node/index.js": false,
    "fs": false,
    "os": false
  },
  "scripts": {
    "build": "rollup -c",
    "dev": "rollup -c -w",
    "type-check": "tsc --noEmit",
    "test": "jest",
    "prepublishOnly": "npm run build"
  },
  "dependencies": {
    "zod": "^4.1.12"
  },
  "peerDependencies": {
    "react": ">=16.8.0",
    "vue": ">=3.0.0"
  },
  "peerDependenciesMeta": {
    "react": { "optional": true },
    "vue": { "optional": true }
  },
  "devDependencies": {
    "@rollup/plugin-commonjs": "^29.0.0",
    "@rollup/plugin-node-resolve": "^16.0.3",
    "@rollup/plugin-typescript": "^12.3.0",
    "rollup": "^4.53.3",
    "rollup-plugin-dts": "^6.2.3",
    "typescript": "^5.9.3"
  }
}
```

**Remove:** `axios`, `eventsource`, `tsc-alias` (no longer needed with Rollup)

## Step 8: Update Main Index

**File:** `src/index.ts`

```typescript
/**
 * @lanonasis/memory-sdk v2.0
 * Universal Memory SDK with Multi-Modal Capabilities
 */

// Core exports (browser-safe)
export { MaaSClient, createMaaSClient } from './core/client';
export { MultiModalMemoryClient } from './core/multimodal';

export type {
  MaaSClientConfig,
  ApiResponse,
  ApiError,
  PaginatedResponse
} from './core/client';

export type {
  MultiModalConfig,
  MultiModalMemory
} from './core/multimodal';

// Types
export * from './core/types';

// Constants
export const VERSION = '2.0.0';
export const SDK_NAME = '@lanonasis/memory-sdk';

// Backward compatibility aliases
export { MaaSClient as MemoryClient } from './core/client';
export { createMaaSClient as createMemoryClient } from './core/client';
```

## Step 9: Build and Test

```bash
# Install dependencies
npm install

# Build all modules
npm run build

# Verify bundle sizes
du -h dist/core/index.js dist/node/index.js dist/react/index.js

# Check for Node.js imports in core
grep -i "import.*process\|require.*fs\|import.*child_process" dist/core/index.js
# Should return nothing

# Test in browser
# Import from /core and verify it works
```

## Step 10: Documentation

Create `UNIVERSAL_SDK_GUIDE.md` similar to memory-client with examples for:

1. Browser usage with multimodal features
2. Node.js with automatic env loading
3. React hooks with context building
4. Vue composables
5. Edge runtime (Cloudflare Workers)
6. Advanced features:
   - Image OCR with `createImageMemory()`
   - Audio transcription with `createAudioMemory()`
   - Code analysis with `createCodeMemory()`
   - Context building with `buildContext()`

## 📊 Expected Bundle Sizes

| Module | Size | Features |
|--------|------|----------|
| **core** | ~25KB | Full SDK + Multimodal (browser-safe) |
| **node** | ~27KB | + Server-side features |
| **react** | ~12KB | React hooks + provider |
| **vue** | ~12KB | Vue composables + plugin |
| **presets** | ~2KB | Configuration presets |

## 🔑 Key Differences from memory-client

1. **Multimodal Features**: Keep in core, but make API keys configurable
2. **Context Building**: Part of core (browser-safe)
3. **API Key Management**: Part of core (browser-safe)
4. **File Uploads**: Use browser-compatible FormData
5. **Buffer Handling**: Provide polyfills or alternatives for browser

## ✅ Migration Checklist

- [ ] Create modular directory structure
- [ ] Move types to `src/core/types.ts`
- [ ] Create `src/core/client.ts` (browser-safe MaaSClient)
- [ ] Create `src/core/multimodal.ts` (configurable, no process.env)
- [ ] Create `src/core/errors.ts`
- [ ] Create `src/core/index.ts`
- [ ] Create `src/node/index.ts` (Node-specific features)
- [ ] Create `src/react/` (provider + hooks)
- [ ] Create `src/vue/` (plugin + composables)
- [ ] Create `src/presets/index.ts`
- [ ] Update `src/index.ts` (main entry)
- [ ] Create `rollup.config.js`
- [ ] Update `package.json` (modular exports, remove axios)
- [ ] Build and test
- [ ] Create documentation
- [ ] Commit and push

## 🚀 Usage After Migration

### Browser
```ts
import { createMaaSClient } from '@lanonasis/memory-sdk/core';

const client = createMaaSClient({
  apiUrl: 'https://api.lanonasis.com',
  apiKey: import.meta.env.VITE_LANONASIS_KEY
});
```

### Node.js
```ts
import { createNodeMemoryClient } from '@lanonasis/memory-sdk/node';

const client = createNodeMemoryClient({
  apiKey: process.env.LANONASIS_KEY,
  autoLoadEnv: true // Automatically loads OPENAI_API_KEY=REDACTED_OPENAI_API_KEY
});
```

### React
```tsx
import { MemoryProvider, useMemories, useBuildContext } from '@lanonasis/memory-sdk/react';
```

### Vue
```ts
import { createMemoryPlugin, useMemories, useBuildContext } from '@lanonasis/memory-sdk/vue';
```

---

## 📚 Reference Implementation

See `/home/user/lanonasis-maas/packages/memory-client` for complete working reference of Universal SDK v2.0 architecture.

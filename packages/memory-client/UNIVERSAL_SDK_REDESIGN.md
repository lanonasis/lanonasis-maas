# Universal SDK Redesign - "Drop In and Sleep" Architecture

**Goal:** Ship a truly universal package that works EVERYWHERE with ZERO configuration hassles  
**Date:** 2025-11-24  
**Philosophy:** "Configure once, works everywhere, zero surprises"

---

## 🎯 **The Real Problem You Experienced**

### What Happened in Your Web App:
```typescript
// You tried to use the SDK in a browser/web app
import { createMemoryClient } from '@lanonasis/memory-client';

// ❌ Webpack/Vite throws errors:
// - "Can't resolve 'child_process'"
// - "Can't resolve 'fs'"
// - CLI integration code tries to run in browser
// - Bundle size explodes with Node.js polyfills
```

### Root Causes:
1. **CLI dependencies leak into browser builds**
2. **No clean separation between environments**
3. **Tree-shaking doesn't work properly**
4. **`optionalDependencies` still cause bundler issues**

---

## 🏗️ **Universal Architecture: The Solution**

### Core Principle: **Modular Exports with Environment Isolation**

```
@lanonasis/memory-client/
├─ core          → Pure browser-safe client (NO Node.js deps)
├─ node          → Node.js-specific features (CLI integration)
├─ react         → React hooks & components
├─ vue           → Vue composables
└─ presets       → Ready-to-use configurations
```

---

## 📦 **New Package Structure**

### 1. **Core Module** (Browser-Safe, Universal)

**File:** `src/core/client.ts`

```typescript
/**
 * Pure browser-safe Memory Client
 * NO Node.js dependencies, NO CLI code, NO child_process
 * Works in: Browser, React Native, Cloudflare Workers, Edge Functions
 */

export interface CoreMemoryClientConfig {
  apiUrl: string;
  apiKey?: string;
  authToken?: string;
  timeout?: number;
  headers?: Record<string, string>;
  
  // Advanced options (all optional)
  retry?: {
    maxRetries?: number;
    retryDelay?: number;
    backoff?: 'linear' | 'exponential';
  };
  cache?: {
    enabled?: boolean;
    ttl?: number;
  };
  
  // Hooks for custom behavior
  onError?: (error: ApiError) => void;
  onRequest?: (endpoint: string) => void;
  onResponse?: (endpoint: string, duration: number) => void;
}

export class CoreMemoryClient {
  // Pure HTTP client with fetch API
  // NO imports from 'child_process', 'fs', 'os', etc.
  // 100% browser-safe
}
```

**Why This Works:**
- ✅ **Zero Node.js imports** - Pure web standards (fetch, AbortController)
- ✅ **Small bundle** - Only HTTP logic (~15KB gzipped)
- ✅ **Works everywhere** - Browser, Deno, Bun, Workers, Edge
- ✅ **Tree-shakeable** - Bundlers can optimize easily

---

### 2. **Node.js Module** (CLI Integration)

**File:** `src/node/enhanced-client.ts`

```typescript
/**
 * Node.js-enhanced client with CLI integration
 * ONLY import this in Node.js environments
 */

import { CoreMemoryClient } from '../core/client';
import type { CLIIntegration } from './cli-integration';

// This file CAN import child_process because it's in /node
import { exec } from 'child_process';

export interface NodeMemoryClientConfig extends CoreMemoryClientConfig {
  preferCLI?: boolean;
  enableMCP?: boolean;
  cliPath?: string;
}

export class NodeMemoryClient extends CoreMemoryClient {
  private cliIntegration?: CLIIntegration;
  
  // CLI-specific methods here
}
```

**Why This Works:**
- ✅ **Isolated Node.js code** - Never imported in browser builds
- ✅ **Optional enhancement** - Core client works without it
- ✅ **Clean imports** - Explicit `/node` path signals intent

---

### 3. **Export Strategy** (package.json)

```json
{
  "name": "@lanonasis/memory-client",
  "version": "2.0.0",
  "type": "module",
  
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "default": "./dist/index.js"
    },
    
    "./core": {
      "types": "./dist/core/index.d.ts",
      "import": "./dist/core/index.js",
      "browser": "./dist/core/browser.js",
      "default": "./dist/core/index.js"
    },
    
    "./node": {
      "types": "./dist/node/index.d.ts",
      "node": "./dist/node/index.js",
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
    "@types/node": "^24.10.1"
  },
  
  "browser": {
    "./dist/node/index.js": false,
    "child_process": false,
    "fs": false,
    "os": false
  }
}
```

**Why This Works:**
- ✅ **Explicit imports** - Users choose what they need
- ✅ **Bundler-friendly** - Browser field prevents Node.js code
- ✅ **Tree-shakeable** - Unused modules never bundled
- ✅ **Framework-specific** - React/Vue only loaded when needed

---

## 💻 **Usage Examples: Drop-In Ready**

### 1. **Browser / Web App** (Vite, Webpack, etc.)

```typescript
// ✅ Import ONLY the core client
import { createMemoryClient } from '@lanonasis/memory-client/core';

// Zero bundler configuration needed!
const client = createMemoryClient({
  apiUrl: 'https://api.lanonasis.com',
  apiKey: import.meta.env.VITE_LANONASIS_KEY
});

// Works immediately - no CLI code, no Node.js deps
const memories = await client.listMemories();
```

**Bundle Size:** ~15KB gzipped (vs ~45KB with CLI code)

---

### 2. **Node.js / Server**

```typescript
// ✅ Import the enhanced client with CLI support
import { createNodeMemoryClient } from '@lanonasis/memory-client/node';

// Automatically detects CLI and uses MCP when available
const client = createNodeMemoryClient({
  apiUrl: 'https://api.lanonasis.com',
  apiKey: process.env.LANONASIS_KEY,
  preferCLI: true,  // Will use CLI if available, fallback to API
  enableMCP: true   // Enable high-performance MCP channels
});

// Intelligent routing - CLI when possible, API as fallback
const memories = await client.listMemories();
console.log(`Source: ${memories.source}`);  // 'cli' or 'api'
```

---

### 3. **React App** (Hooks Ready)

```typescript
// ✅ Import React-specific hooks
import { MemoryProvider, useMemories } from '@lanonasis/memory-client/react';

// Provider setup (once in App.tsx)
function App() {
  return (
    <MemoryProvider apiKey={process.env.REACT_APP_KEY}>
      <MemoryList />
    </MemoryProvider>
  );
}

// Use in components - works like react-query
function MemoryList() {
  const { memories, loading, error, refresh } = useMemories();
  
  if (loading) return <Spinner />;
  if (error) return <Error message={error.message} />;
  
  return (
    <div>
      {memories.map(m => <MemoryCard key={m.id} memory={m} />)}
      <button onClick={refresh}>Refresh</button>
    </div>
  );
}
```

---

### 4. **Vue 3 App** (Composables Ready)

```typescript
// ✅ Import Vue-specific composables
import { createMemoryPlugin, useMemories } from '@lanonasis/memory-client/vue';

// Plugin setup (once in main.ts)
const app = createApp(App);
app.use(createMemoryPlugin({
  apiKey: import.meta.env.VITE_KEY
}));

// Use in components
export default {
  setup() {
    const { memories, loading, error, refresh } = useMemories();
    
    return { memories, loading, error, refresh };
  }
};
```

---

### 5. **Cloudflare Workers / Edge Functions**

```typescript
// ✅ Core client works in edge environments
import { createMemoryClient } from '@lanonasis/memory-client/core';

export default {
  async fetch(request: Request, env: Env) {
    const client = createMemoryClient({
      apiUrl: 'https://api.lanonasis.com',
      apiKey: env.LANONASIS_KEY,
      timeout: 5000  // Lower timeout for edge
    });
    
    const memories = await client.searchMemories({
      query: new URL(request.url).searchParams.get('q')!,
      limit: 10
    });
    
    return Response.json(memories.data);
  }
};
```

---

### 6. **Next.js (Server + Client)**

```typescript
// ✅ Use different imports for server vs client

// app/api/memories/route.ts (Server Component)
import { createNodeMemoryClient } from '@lanonasis/memory-client/node';

export async function GET() {
  const client = createNodeMemoryClient({
    apiKey: process.env.LANONASIS_KEY,
    preferCLI: true  // Use CLI on server
  });
  
  const memories = await client.listMemories();
  return Response.json(memories.data);
}

// app/components/MemoryList.tsx (Client Component)
'use client';
import { useMemories } from '@lanonasis/memory-client/react';

export function MemoryList() {
  const { memories } = useMemories();
  // Client-side hooks use core client (no Node.js deps)
}
```

---

## 🔧 **Implementation Plan**

### Phase 1: Core Refactor (Week 1)

#### 1. Restructure Source

```
src/
├─ core/
│  ├─ client.ts           → Pure HTTP client (browser-safe)
│  ├─ types.ts            → Shared types
│  ├─ errors.ts           → Error definitions
│  ├─ validation.ts       → Zod schemas
│  └─ index.ts            → Core exports
│
├─ node/
│  ├─ enhanced-client.ts  → CLI integration
│  ├─ cli-integration.ts  → CLI detection & execution
│  ├─ mcp-channels.ts     → MCP protocol
│  └─ index.ts            → Node exports
│
├─ react/
│  ├─ provider.tsx        → Context provider
│  ├─ hooks.ts            → useMemories, useMemory, etc.
│  └─ index.ts            → React exports
│
├─ vue/
│  ├─ plugin.ts           → Vue plugin
│  ├─ composables.ts      → useMemories, useMemory, etc.
│  └─ index.ts            → Vue exports
│
├─ presets/
│  ├─ browser.ts          → Browser preset
│  ├─ node.ts             → Node preset
│  ├─ edge.ts             → Edge runtime preset
│  └─ index.ts            → Preset exports
│
└─ index.ts               → Main entry (auto-detects environment)
```

#### 2. Update Build Configuration

**rollup.config.js:**
```javascript
export default [
  // Core bundle (browser-safe)
  {
    input: 'src/core/index.ts',
    output: [
      { file: 'dist/core/index.js', format: 'esm' },
      { file: 'dist/core/index.cjs', format: 'cjs' }
    ],
    external: ['zod'],
    plugins: [
      typescript(),
      resolve({ browser: true }),
      commonjs()
    ]
  },
  
  // Node bundle (with CLI)
  {
    input: 'src/node/index.ts',
    output: [
      { file: 'dist/node/index.js', format: 'esm' },
      { file: 'dist/node/index.cjs', format: 'cjs' }
    ],
    external: ['zod', 'child_process', 'fs', 'os'],
    plugins: [
      typescript(),
      resolve({ preferBuiltins: true }),
      commonjs()
    ]
  },
  
  // React bundle
  {
    input: 'src/react/index.ts',
    output: { file: 'dist/react/index.js', format: 'esm' },
    external: ['react', 'zod', '../core/client'],
    plugins: [typescript(), resolve(), commonjs()]
  },
  
  // Vue bundle
  {
    input: 'src/vue/index.ts',
    output: { file: 'dist/vue/index.js', format: 'esm' },
    external: ['vue', 'zod', '../core/client'],
    plugins: [typescript(), resolve(), commonjs()]
  }
];
```

---

### Phase 2: React Integration (Week 2)

**src/react/hooks.ts:**
```typescript
import { useContext, useEffect, useState, useCallback } from 'react';
import { MemoryContext } from './provider';
import type { MemoryEntry, SearchMemoryRequest } from '../core/types';
import type { ApiError } from '../core/errors';

export interface UseMemoriesResult {
  memories: MemoryEntry[];
  loading: boolean;
  error: ApiError | null;
  refresh: () => Promise<void>;
}

export function useMemories(options?: {
  page?: number;
  limit?: number;
  memory_type?: string;
}): UseMemoriesResult {
  const client = useContext(MemoryContext);
  const [memories, setMemories] = useState<MemoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  
  const loadMemories = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    const result = await client.listMemories(options);
    
    if (result.error) {
      setError(result.error);
    } else if (result.data) {
      setMemories(result.data.data);
    }
    
    setLoading(false);
  }, [client, options]);
  
  useEffect(() => {
    loadMemories();
  }, [loadMemories]);
  
  return { memories, loading, error, refresh: loadMemories };
}

export function useMemory(id: string) {
  // Single memory management
}

export function useCreateMemory() {
  // Memory creation with optimistic updates
}

export function useSearchMemories() {
  // Debounced search with caching
}
```

**src/react/provider.tsx:**
```typescript
import React, { createContext, useMemo } from 'react';
import { createMemoryClient } from '../core/client';
import type { CoreMemoryClient, CoreMemoryClientConfig } from '../core/client';

export const MemoryContext = createContext<CoreMemoryClient>(null!);

export interface MemoryProviderProps {
  children: React.ReactNode;
  config?: CoreMemoryClientConfig;
  apiKey?: string;
  apiUrl?: string;
}

export function MemoryProvider({ 
  children, 
  config,
  apiKey,
  apiUrl = 'https://api.lanonasis.com'
}: MemoryProviderProps) {
  const client = useMemo(() => {
    return createMemoryClient({
      apiUrl,
      apiKey,
      ...config
    });
  }, [apiUrl, apiKey, config]);
  
  return (
    <MemoryContext.Provider value={client}>
      {children}
    </MemoryContext.Provider>
  );
}
```

---

### Phase 3: Vue Integration (Week 2)

**src/vue/composables.ts:**
```typescript
import { ref, computed, onMounted } from 'vue';
import { inject } from 'vue';
import { MEMORY_CLIENT_KEY } from './plugin';
import type { CoreMemoryClient } from '../core/client';
import type { MemoryEntry } from '../core/types';

export function useMemories(options?: {
  page?: number;
  limit?: number;
  memory_type?: string;
}) {
  const client = inject<CoreMemoryClient>(MEMORY_CLIENT_KEY);
  
  if (!client) {
    throw new Error('Memory client not provided. Did you install the plugin?');
  }
  
  const memories = ref<MemoryEntry[]>([]);
  const loading = ref(true);
  const error = ref<Error | null>(null);
  
  async function loadMemories() {
    loading.value = true;
    error.value = null;
    
    const result = await client.listMemories(options);
    
    if (result.error) {
      error.value = new Error(result.error.message);
    } else if (result.data) {
      memories.value = result.data.data;
    }
    
    loading.value = false;
  }
  
  onMounted(loadMemories);
  
  return {
    memories: computed(() => memories.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    refresh: loadMemories
  };
}
```

---

### Phase 4: Testing & Documentation (Week 3-4)

#### 1. **Browser Compatibility Tests**
```typescript
// tests/browser.test.ts
import { createMemoryClient } from '@lanonasis/memory-client/core';

describe('Browser Compatibility', () => {
  it('should not import Node.js modules', () => {
    // This should not throw in browser environment
    const client = createMemoryClient({
      apiUrl: 'https://api.test.com',
      apiKey: 'test'
    });
    
    expect(client).toBeDefined();
  });
  
  it('should work with different bundlers', async () => {
    // Test with Webpack, Vite, Rollup, esbuild
  });
});
```

#### 2. **Node.js CLI Integration Tests**
```typescript
// tests/node.test.ts
import { createNodeMemoryClient } from '@lanonasis/memory-client/node';

describe('Node.js CLI Integration', () => {
  it('should detect CLI when available', async () => {
    const client = createNodeMemoryClient({
      apiUrl: 'https://api.test.com',
      apiKey: 'test',
      preferCLI: true
    });
    
    const caps = await client.getCapabilities();
    expect(caps.cliAvailable).toBe(true);
  });
});
```

#### 3. **Bundle Size Tests**
```javascript
// tests/bundle-size.test.js
const { getPackageStats } = require('package-size');

test('core bundle should be under 20KB', async () => {
  const stats = await getPackageStats('@lanonasis/memory-client/core');
  expect(stats.minifiedSize).toBeLessThan(20 * 1024);
});

test('node bundle should be under 50KB', async () => {
  const stats = await getPackageStats('@lanonasis/memory-client/node');
  expect(stats.minifiedSize).toBeLessThan(50 * 1024);
});
```

---

## 📚 **Documentation Updates**

### 1. **Quick Start (Drop-In Examples)**

```markdown
# Quick Start

## Browser / Web App

```bash
npm install @lanonasis/memory-client
```

```typescript
import { createMemoryClient } from '@lanonasis/memory-client/core';

const client = createMemoryClient({
  apiUrl: 'https://api.lanonasis.com',
  apiKey: 'your-key-here'
});

// That's it! Start using:
const memories = await client.listMemories();
```

## Node.js Server

```bash
npm install @lanonasis/memory-client
```

```typescript
import { createNodeMemoryClient } from '@lanonasis/memory-client/node';

const client = createNodeMemoryClient({
  apiKey: process.env.LANONASIS_KEY,
  preferCLI: true  // Automatically uses CLI if available
});

const memories = await client.listMemories();
console.log(`Using: ${memories.source}`);  // 'cli' or 'api'
```

## React

```bash
npm install @lanonasis/memory-client react
```

```tsx
import { MemoryProvider, useMemories } from '@lanonasis/memory-client/react';

function App() {
  return (
    <MemoryProvider apiKey="your-key">
      <MemoryList />
    </MemoryProvider>
  );
}

function MemoryList() {
  const { memories, loading } = useMemories();
  
  if (loading) return <div>Loading...</div>;
  return <div>{memories.map(m => <div key={m.id}>{m.title}</div>)}</div>;
}
```
```

---

## 🎯 **Success Criteria**

### Before Shipping v2.0, Verify:

- [ ] ✅ **Browser test**: Bundle with Vite, no errors, <20KB
- [ ] ✅ **Node test**: CLI integration works, API fallback works
- [ ] ✅ **React test**: Hooks work, no hydration issues
- [ ] ✅ **Vue test**: Composables work, SSR compatible
- [ ] ✅ **Edge test**: Works in Cloudflare Workers
- [ ] ✅ **TypeScript**: All types exported correctly
- [ ] ✅ **Tree-shaking**: Unused code eliminated
- [ ] ✅ **Docs**: 5-minute quick start for each platform

---

## 📊 **Bundle Size Comparison**

| Package | v1.0 (Current) | v2.0 (Proposed) | Improvement |
|---------|----------------|-----------------|-------------|
| **Browser** | ~45KB + polyfills | ~15KB | **67% smaller** |
| **Node.js** | ~45KB | ~35KB | **22% smaller** |
| **React** | ~45KB + React | ~18KB + React | **60% smaller** |
| **Edge** | ❌ Doesn't work | ✅ ~15KB | **Now works!** |

---

## 🚀 **Migration Guide for Existing Users**

### v1.x → v2.0 Migration

```typescript
// v1.x (old - still works!)
import { createMemoryClient } from '@lanonasis/memory-client';
const client = createMemoryClient({ ... });

// v2.0 (new - environment-specific)
// Browser:
import { createMemoryClient } from '@lanonasis/memory-client/core';

// Node.js:
import { createNodeMemoryClient } from '@lanonasis/memory-client/node';

// Auto-detect (works but larger bundle):
import { createMemoryClient } from '@lanonasis/memory-client';
```

**Backward Compatibility:**
- ✅ Main import still works (auto-detects environment)
- ✅ All APIs remain the same
- ✅ Only import paths change (optional optimization)

---

## 💡 **Key Decisions Made**

### 1. **Modular Architecture**
✅ **Decision:** Split into `/core`, `/node`, `/react`, `/vue`  
📝 **Reason:** Clean separation prevents bundler issues  
🎯 **Result:** Works everywhere, optimal bundle size

### 2. **Browser-First Core**
✅ **Decision:** Core client has ZERO Node.js dependencies  
📝 **Reason:** Most users deploy to web/edge environments  
🎯 **Result:** Universal compatibility

### 3. **Framework Integrations**
✅ **Decision:** Built-in React/Vue support  
📝 **Reason:** 80% of users use these frameworks  
🎯 **Result:** Better DX, less boilerplate

### 4. **Backward Compatible**
✅ **Decision:** Keep main import working with auto-detection  
📝 **Reason:** Don't break existing users  
🎯 **Result:** Smooth migration path

---

## 📅 **Timeline**

| Week | Phase | Deliverables |
|------|-------|--------------|
| **1** | Core Refactor | `/core` and `/node` modules, build config |
| **2** | Framework Integration | React hooks, Vue composables |
| **3** | Testing | Browser, Node, Edge tests |
| **4** | Documentation & Beta | Docs, examples, beta release |
| **5** | Feedback & Polish | Address beta feedback |
| **6** | v2.0 Stable Release | Production-ready, announce |

---

## ✅ **Checklist Before Launch**

### Code Quality
- [ ] All tests passing (unit + integration)
- [ ] Type checking passes
- [ ] Zero lint warnings
- [ ] Bundle size targets met

### Compatibility
- [ ] Works in Chrome, Firefox, Safari
- [ ] Works in Node 16, 18, 20
- [ ] Works in Deno
- [ ] Works in Cloudflare Workers
- [ ] Works with Webpack, Vite, Rollup, esbuild

### Documentation
- [ ] Quick start for each environment
- [ ] API reference complete
- [ ] Migration guide
- [ ] TypeScript examples
- [ ] Framework integration examples

### Developer Experience
- [ ] Install and run in <5 minutes
- [ ] Clear error messages
- [ ] TypeScript autocomplete works
- [ ] Source maps available

---

## 🎓 **Lessons Applied from Your Web App Experience**

### Problem You Had:
```typescript
// You tried this in a web app:
import { createMemoryClient } from '@lanonasis/memory-client';

// ❌ Result: Bundler errors, CLI code in browser, massive bundle
```

### New Solution:
```typescript
// Now you do this:
import { createMemoryClient } from '@lanonasis/memory-client/core';

// ✅ Result: Works immediately, small bundle, no Node.js code
```

### What Changed:
1. ✅ **Clean separation** - CLI code never imported in browser
2. ✅ **Explicit imports** - You choose what you need
3. ✅ **Smart defaults** - Core is browser-first
4. ✅ **Tree-shakeable** - Bundlers can optimize

---

## 🏆 **Final Product Vision**

```typescript
// GOAL: This should "just work" EVERYWHERE

// Browser
import { createMemoryClient } from '@lanonasis/memory-client/core';
✅ Works - No config needed

// Node.js
import { createNodeMemoryClient } from '@lanonasis/memory-client/node';
✅ Works - Auto-detects CLI

// React
import { MemoryProvider } from '@lanonasis/memory-client/react';
✅ Works - Drop-in provider

// Vue
import { createMemoryPlugin } from '@lanonasis/memory-client/vue';
✅ Works - Standard plugin

// Cloudflare Workers
import { createMemoryClient } from '@lanonasis/memory-client/core';
✅ Works - Edge-optimized

// Next.js (Server + Client)
import { createNodeMemoryClient } from '@lanonasis/memory-client/node';
import { useMemories } from '@lanonasis/memory-client/react';
✅ Works - Both contexts

// Deno
import { createMemoryClient } from 'npm:@lanonasis/memory-client/core';
✅ Works - Standard fetch

// Bun
import { createNodeMemoryClient } from '@lanonasis/memory-client/node';
✅ Works - Node-compatible
```

---

**Next Step:** Review this redesign and confirm you want to proceed with the modular architecture. This will take 6 weeks but results in a truly universal, "drop-in-and-sleep" SDK that never causes refactor stress for users.

*Ready to build the gold standard Memory SDK?* 🚀

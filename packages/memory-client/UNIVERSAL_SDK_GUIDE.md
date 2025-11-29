# Universal SDK v2.0 - Complete Guide

## 🎯 What Changed?

The Universal SDK Redesign solves the **bundler nightmare** where Node.js dependencies leaked into browser builds. Now you get:

- ✅ **Browser-safe core** - Zero Node.js deps, works everywhere
- ✅ **Optimal bundle sizes** - 67% smaller for browsers
- ✅ **Framework integrations** - Built-in React & Vue support
- ✅ **Edge runtime support** - Works in Cloudflare Workers, Vercel Edge
- ✅ **Backward compatible** - v1.x code still works

## 📦 Installation

```bash
npm install @lanonasis/memory-client
```

## 🚀 Quick Start by Environment

### 1. Browser / Web App (Vite, Webpack, etc.)

**Before (v1.x):** ❌ Bundle errors, polyfills, ~45KB
```ts
import { createMemoryClient } from '@lanonasis/memory-client';
// ❌ Webpack: "Can't resolve 'child_process'"
// ❌ Bundle includes Node.js polyfills
```

**After (v2.0):** ✅ Zero config, ~14KB
```ts
import { createMemoryClient } from '@lanonasis/memory-client/core';

const client = createMemoryClient({
  apiUrl: 'https://api.lanonasis.com',
  apiKey: import.meta.env.VITE_LANONASIS_KEY
});

// Works immediately - no bundler configuration needed!
const memories = await client.listMemories();
```

### 2. Node.js Server

**With CLI Integration:**
```ts
import { createNodeMemoryClient } from '@lanonasis/memory-client/node';

const client = await createNodeMemoryClient({
  apiKey: process.env.LANONASIS_KEY,
  preferCLI: true, // Automatically uses CLI if available
  enableMCP: true  // Enable high-performance MCP channels
});

const result = await client.listMemories();
console.log(`Using: ${result.source}`); // 'cli' or 'api'
console.log(`MCP: ${result.mcpUsed}`);   // true/false
```

### 3. React App

**Provider Setup (App.tsx):**
```tsx
import { MemoryProvider } from '@lanonasis/memory-client/react';

function App() {
  return (
    <MemoryProvider
      apiUrl="https://api.lanonasis.com"
      apiKey={import.meta.env.VITE_LANONASIS_KEY}
    >
      <MemoryList />
    </MemoryProvider>
  );
}
```

**Using Hooks (MemoryList.tsx):**
```tsx
import { useMemories, useCreateMemory } from '@lanonasis/memory-client/react';

function MemoryList() {
  const { memories, loading, error, refresh } = useMemories({
    memory_type: 'project',
    limit: 20
  });

  const { createMemory } = useCreateMemory();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {memories.map(m => (
        <div key={m.id}>{m.title}</div>
      ))}
      <button onClick={refresh}>Refresh</button>
      <button onClick={() => createMemory({
        title: 'New Memory',
        content: 'Content here'
      })}>
        Add Memory
      </button>
    </div>
  );
}
```

**Search Component:**
```tsx
import { useSearchMemories } from '@lanonasis/memory-client/react';
import { useState, useEffect } from 'react';

function MemorySearch() {
  const [query, setQuery] = useState('');
  const { results, loading, search, totalResults, searchTime } = useSearchMemories();

  useEffect(() => {
    if (query.length > 2) {
      search(query, { limit: 10 });
    }
  }, [query, search]);

  return (
    <div>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search memories..."
      />
      {loading && <div>Searching...</div>}
      {results.map(r => (
        <div key={r.id}>
          <h3>{r.title}</h3>
          <span>Similarity: {r.similarity_score.toFixed(2)}</span>
        </div>
      ))}
      {totalResults > 0 && (
        <div>Found {totalResults} results in {searchTime}ms</div>
      )}
    </div>
  );
}
```

### 4. Vue 3 App

**Plugin Setup (main.ts):**
```ts
import { createApp } from 'vue';
import { createMemoryPlugin } from '@lanonasis/memory-client/vue';
import App from './App.vue';

const app = createApp(App);

app.use(createMemoryPlugin({
  apiUrl: 'https://api.lanonasis.com',
  apiKey: import.meta.env.VITE_LANONASIS_KEY
}));

app.mount('#app');
```

**Using Composables (MemoryList.vue):**
```vue
<script setup lang="ts">
import { useMemories, useCreateMemory } from '@lanonasis/memory-client/vue';

const { memories, loading, error, refresh } = useMemories({
  memory_type: 'project',
  limit: 20
});

const { createMemory } = useCreateMemory();

async function handleCreate() {
  await createMemory({
    title: 'New Memory',
    content: 'Content here'
  });
  refresh();
}
</script>

<template>
  <div v-if="loading">Loading...</div>
  <div v-else-if="error">Error: {{ error.message }}</div>
  <div v-else>
    <div v-for="memory in memories" :key="memory.id">
      {{ memory.title }}
    </div>
    <button @click="refresh">Refresh</button>
    <button @click="handleCreate">Add Memory</button>
  </div>
</template>
```

**Search Component (MemorySearch.vue):**
```vue
<script setup lang="ts">
import { ref, watch } from 'vue';
import { useSearchMemories } from '@lanonasis/memory-client/vue';

const query = ref('');
const { results, loading, search, totalResults, searchTime } = useSearchMemories();

watch(query, (newQuery) => {
  if (newQuery.length > 2) {
    search(newQuery, { limit: 10 });
  }
});
</script>

<template>
  <div>
    <input v-model="query" placeholder="Search memories..." />
    <div v-if="loading">Searching...</div>
    <div v-for="result in results" :key="result.id">
      <h3>{{ result.title }}</h3>
      <span>Similarity: {{ result.similarity_score.toFixed(2) }}</span>
    </div>
    <div v-if="totalResults > 0">
      Found {{ totalResults }} results in {{ searchTime }}ms
    </div>
  </div>
</template>
```

### 5. Cloudflare Workers / Edge Functions

```ts
import { createMemoryClient } from '@lanonasis/memory-client/core';
import { edgePreset } from '@lanonasis/memory-client/presets';

export default {
  async fetch(request: Request, env: Env) {
    const client = createMemoryClient(edgePreset({
      apiKey: env.LANONASIS_KEY
    }));

    const url = new URL(request.url);
    const query = url.searchParams.get('q');

    if (!query) {
      return Response.json({ error: 'Missing query parameter' }, { status: 400 });
    }

    const result = await client.searchMemories({
      query,
      limit: 10
    });

    if (result.error) {
      return Response.json({ error: result.error }, { status: 500 });
    }

    return Response.json(result.data);
  }
};
```

### 6. Next.js (Server + Client Components)

**Server Component (app/api/memories/route.ts):**
```ts
import { createNodeMemoryClient } from '@lanonasis/memory-client/node';

export async function GET() {
  const client = await createNodeMemoryClient({
    apiKey: process.env.LANONASIS_KEY,
    preferCLI: true // Use CLI on server when available
  });

  const result = await client.listMemories({ limit: 20 });

  if (result.error) {
    return Response.json({ error: result.error }, { status: 500 });
  }

  return Response.json(result.data);
}
```

**Client Component (app/components/MemoryList.tsx):**
```tsx
'use client';

import { MemoryProvider, useMemories } from '@lanonasis/memory-client/react';

export function MemoryListClient() {
  return (
    <MemoryProvider apiUrl="/api/memories">
      <MemoryListInner />
    </MemoryProvider>
  );
}

function MemoryListInner() {
  const { memories, loading } = useMemories();
  // Client-side rendering with hooks
}
```

### 7. React Native

```tsx
import { createMemoryClient } from '@lanonasis/memory-client/core';
import { reactNativePreset } from '@lanonasis/memory-client/presets';

const client = createMemoryClient(reactNativePreset({
  apiKey: 'your-key-here'
}));

// Or use React hooks
import { MemoryProvider, useMemories } from '@lanonasis/memory-client/react';

function App() {
  return (
    <MemoryProvider apiKey="your-key">
      <MemoryList />
    </MemoryProvider>
  );
}
```

## 🎨 Configuration Presets

Use presets for optimal configuration per environment:

```ts
import { createMemoryClient } from '@lanonasis/memory-client/core';
import {
  browserPreset,
  nodePreset,
  edgePreset,
  developmentPreset,
  productionPreset,
  reactNativePreset,
  testingPreset,
  autoPreset
} from '@lanonasis/memory-client/presets';

// Browser
const browserClient = createMemoryClient(browserPreset({
  apiKey: 'your-key'
}));

// Node.js
const nodeClient = createMemoryClient(nodePreset({
  apiKey: process.env.KEY
}));

// Auto-detect
const autoClient = createMemoryClient(autoPreset({
  apiKey: 'your-key'
}));
```

## 📊 Bundle Sizes

| Package | Size | Use Case |
|---------|------|----------|
| **core** | ~14KB | Browser, Edge, React Native |
| **node** | ~21KB | Node.js with CLI support |
| **react** | ~9.5KB | React hooks (+ React) |
| **vue** | ~10KB | Vue composables (+ Vue) |
| **presets** | ~6.5KB | Configuration helpers |
| **main** | ~18KB | Auto-detection (larger) |

## 🔄 Migration Guide: v1.x → v2.0

### Main Import (Still Works)
```ts
// v1.x (still works in v2.0)
import { createMemoryClient } from '@lanonasis/memory-client';

// But this is larger because it includes backward compatibility
```

### Optimized Imports (Recommended)
```ts
// Browser - optimized
import { createMemoryClient } from '@lanonasis/memory-client/core';

// Node.js - optimized
import { createNodeMemoryClient } from '@lanonasis/memory-client/node';

// React - new in v2.0
import { MemoryProvider, useMemories } from '@lanonasis/memory-client/react';

// Vue - new in v2.0
import { createMemoryPlugin, useMemories } from '@lanonasis/memory-client/vue';
```

## ✨ Advanced Features

### Custom Error Handling
```ts
import { createMemoryClient } from '@lanonasis/memory-client/core';

const client = createMemoryClient({
  apiUrl: 'https://api.lanonasis.com',
  apiKey: 'your-key',
  onError: (error) => {
    console.error('Memory Client Error:', error);
    // Send to error tracking service
  },
  onRequest: (endpoint) => {
    console.log('Request to:', endpoint);
  },
  onResponse: (endpoint, duration) => {
    console.log(`${endpoint} took ${duration}ms`);
  }
});
```

### Retry Configuration
```ts
const client = createMemoryClient({
  apiUrl: 'https://api.lanonasis.com',
  apiKey: 'your-key',
  retry: {
    maxRetries: 3,
    retryDelay: 1000,
    backoff: 'exponential'
  }
});
```

### Custom Headers
```ts
const client = createMemoryClient({
  apiUrl: 'https://api.lanonasis.com',
  apiKey: 'your-key',
  headers: {
    'X-Custom-Header': 'value',
    'X-Request-ID': crypto.randomUUID()
  }
});
```

## 🧪 Testing

```ts
import { createMemoryClient } from '@lanonasis/memory-client/core';
import { testingPreset } from '@lanonasis/memory-client/presets';

// In your tests
const testClient = createMemoryClient(testingPreset({
  apiUrl: 'http://localhost:3001',
  apiKey: 'test-key'
}));
```

## 📚 API Reference

All methods return `ApiResponse<T>`:
```ts
interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}
```

### Memory Operations
- `createMemory(memory: CreateMemoryRequest): Promise<ApiResponse<MemoryEntry>>`
- `getMemory(id: string): Promise<ApiResponse<MemoryEntry>>`
- `updateMemory(id: string, updates: UpdateMemoryRequest): Promise<ApiResponse<MemoryEntry>>`
- `deleteMemory(id: string): Promise<ApiResponse<void>>`
- `listMemories(options): Promise<ApiResponse<PaginatedResponse<MemoryEntry>>>`
- `searchMemories(request: SearchMemoryRequest): Promise<ApiResponse<SearchResults>>`
- `bulkDeleteMemories(ids: string[]): Promise<ApiResponse<BulkResult>>`

### Topic Operations
- `createTopic(topic: CreateTopicRequest): Promise<ApiResponse<MemoryTopic>>`
- `getTopics(): Promise<ApiResponse<MemoryTopic[]>>`
- `getTopic(id: string): Promise<ApiResponse<MemoryTopic>>`
- `updateTopic(id: string, updates): Promise<ApiResponse<MemoryTopic>>`
- `deleteTopic(id: string): Promise<ApiResponse<void>>`

### Utility Methods
- `healthCheck(): Promise<ApiResponse<{ status: string; timestamp: string }>>`
- `getMemoryStats(): Promise<ApiResponse<UserMemoryStats>>`
- `setAuthToken(token: string): void`
- `setApiKey(apiKey: string): void`
- `clearAuth(): void`

## 🐛 Troubleshooting

### "Can't resolve 'child_process'" in browser
✅ Use `@lanonasis/memory-client/core` instead of main import

### React hooks not working
✅ Ensure you wrapped your app with `<MemoryProvider>`

### Vue composables throwing errors
✅ Make sure you installed the plugin with `app.use(createMemoryPlugin(...))`

### Edge functions timing out
✅ Use `edgePreset()` for lower timeout values

## 🔗 Links

- **Documentation:** https://docs.lanonasis.com/sdk
- **API Reference:** https://docs.lanonasis.com/api
- **Examples:** https://github.com/lanonasis/examples
- **Issues:** https://github.com/lanonasis/memory-client/issues
- **Changelog:** [CHANGELOG.md](./CHANGELOG.md)

## 📝 License

MIT © Lanonasis Team

# @lanonasis/memory-client

[![npm version](https://badge.fury.io/js/@lanonasis%2Fmemory-client.svg)](https://www.npmjs.com/package/@lanonasis/memory-client)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Memory as a Service (MaaS) Client SDK** - Intelligent memory management with semantic search capabilities for JavaScript/TypeScript applications.

## 🚀 Features

- **🧠 Semantic Search** - Find memories by meaning, not just keywords
- **🏷️ Smart Tagging** - Organize memories with tags and topics
- **📊 Analytics** - Track memory usage and access patterns  
- **🔐 Secure** - API key and token-based authentication
- **⚡ Performance** - Optimized with gateway routing and caching
- **📱 Universal** - Works in Node.js, browsers, and React applications
- **🎯 TypeScript** - Full type safety with comprehensive type definitions

## 📦 Installation

```bash
npm install @lanonasis/memory-client
```

```bash
yarn add @lanonasis/memory-client
```

```bash
pnpm add @lanonasis/memory-client
```

## 🏁 Quick Start

### Basic Usage

```typescript
import { createMemoryClient } from '@lanonasis/memory-client';

// Initialize the client
const memoryClient = createMemoryClient({
  apiUrl: 'https://api.lanonasis.com',
  apiKey: 'your-api-key-here'
});

// Create a memory
const memory = await memoryClient.createMemory({
  title: 'Important Code Pattern',
  content: 'Use React.memo() for expensive components to prevent unnecessary re-renders',
  memory_type: 'knowledge',
  tags: ['react', 'performance', 'optimization']
});

// Search memories
const results = await memoryClient.searchMemories({
  query: 'React performance optimization',
  limit: 10
});

console.log('Found memories:', results.data?.results);
```

### Production Setup

```typescript
import { createProductionClient } from '@lanonasis/memory-client';

const client = createProductionClient(process.env.LANONASIS_API_KEY!);

// Test connection
const health = await client.healthCheck();
console.log('Service health:', health.data?.status);
```

### Development Setup

```typescript
import { createDevelopmentClient } from '@lanonasis/memory-client';

const client = createDevelopmentClient('dev-api-key');
```

## 🛠️ API Reference

### Client Configuration

```typescript
interface MemoryClientConfig {
  apiUrl: string;           // API endpoint URL
  apiKey?: string;          // API key for authentication
  authToken?: string;       // Bearer token (alternative to API key)
  timeout?: number;         // Request timeout in milliseconds (default: 30000)
  useGateway?: boolean;     // Enable gateway mode (default: true)
  headers?: Record<string, string>; // Custom headers
}
```

### Memory Operations

#### Create Memory

```typescript
const memory = await client.createMemory({
  title: 'Memory Title',
  content: 'Memory content goes here...',
  memory_type: 'context', // 'context' | 'project' | 'knowledge' | 'reference' | 'personal' | 'workflow'
  tags: ['tag1', 'tag2'],
  metadata: { source: 'api', version: '1.0' }
});
```

#### Search Memories

```typescript
const results = await client.searchMemories({
  query: 'search terms',
  memory_types: ['knowledge', 'reference'],
  tags: ['important'],
  limit: 20,
  threshold: 0.7 // Similarity threshold (0-1)
});
```

#### List Memories

```typescript
const memories = await client.listMemories({
  page: 1,
  limit: 50,
  memory_type: 'project',
  tags: ['work', 'important'],
  sort: 'updated_at',
  order: 'desc'
});
```

#### Update Memory

```typescript
const updated = await client.updateMemory('memory-id', {
  title: 'Updated Title',
  tags: ['new-tag']
});
```

#### Delete Memory

```typescript
await client.deleteMemory('memory-id');
```

### Topic Operations

#### Create Topic

```typescript
const topic = await client.createTopic({
  name: 'Project Alpha',
  description: 'Memories related to Project Alpha',
  color: '#3B82F6',
  icon: 'project'
});
```

#### Get Topics

```typescript
const topics = await client.getTopics();
```

### Statistics

```typescript
const stats = await client.getMemoryStats();
console.log('Total memories:', stats.data?.total_memories);
console.log('By type:', stats.data?.memories_by_type);
```

## 🎯 Memory Types

- **`context`** - General contextual information
- **`project`** - Project-specific knowledge
- **`knowledge`** - Educational or reference material
- **`reference`** - Quick reference information
- **`personal`** - User-specific private memories
- **`workflow`** - Process and procedure documentation

## 🔐 Authentication

### API Key (Recommended)

```typescript
const client = createMemoryClient({
  apiUrl: 'https://api.lanonasis.com',
  apiKey: 'your-api-key'
});
```

### Bearer Token

```typescript
const client = createMemoryClient({
  apiUrl: 'https://api.lanonasis.com',
  authToken: 'your-bearer-token'
});
```

### Runtime Authentication Updates

```typescript
// Update API key
client.setApiKey('new-api-key');

// Update auth token
client.setAuthToken('new-token');

// Clear authentication
client.clearAuth();
```

## ⚙️ Gateway Mode

Gateway mode provides enhanced performance through optimized routing and caching:

```typescript
// Enable gateway mode (default)
const client = createMemoryClient({
  apiUrl: 'https://api.lanonasis.com',
  apiKey: 'your-key',
  useGateway: true
});

// Direct API mode (for debugging)
const directClient = createMemoryClient({
  apiUrl: 'https://api.lanonasis.com',
  apiKey: 'your-key',
  useGateway: false
});
```

## ⚛️ React Integration

### Custom Hook

```typescript
import { useMemoryClient } from '@lanonasis/memory-client';

function MyComponent() {
  const client = useMemoryClient({
    apiUrl: process.env.NEXT_PUBLIC_API_URL!,
    apiKey: process.env.NEXT_PUBLIC_API_KEY!
  });

  const [memories, setMemories] = useState([]);

  useEffect(() => {
    const loadMemories = async () => {
      const result = await client.listMemories({ limit: 10 });
      if (result.data) {
        setMemories(result.data.data);
      }
    };
    loadMemories();
  }, [client]);

  return <div>{/* Your component */}</div>;
}
```

## 🚨 Error Handling

All methods return a standardized response format:

```typescript
interface ApiResponse<T> {
  data?: T;      // Success data
  error?: string; // Error message
  message?: string; // Additional info
}

// Example error handling
const result = await client.getMemory('invalid-id');
if (result.error) {
  console.error('Failed to get memory:', result.error);
} else {
  console.log('Memory:', result.data);
}
```

## 🔧 Configuration Examples

### Environment-specific Configs

```typescript
// Production
const prodClient = createMemoryClient({
  apiUrl: 'https://api.lanonasis.com',
  apiKey: process.env.LANONASIS_API_KEY,
  timeout: 10000,
  useGateway: true
});

// Development
const devClient = createMemoryClient({
  apiUrl: 'http://localhost:3001',
  apiKey: 'dev-key',
  timeout: 30000,
  useGateway: false
});

// Custom headers
const customClient = createMemoryClient({
  apiUrl: 'https://api.lanonasis.com',
  apiKey: 'your-key',
  headers: {
    'X-Client-Version': '1.0.0',
    'X-Environment': 'production'
  }
});
```

## 📋 TypeScript Support

Full TypeScript support with comprehensive type definitions:

```typescript
import type { 
  MemoryEntry, 
  CreateMemoryRequest,
  SearchMemoryRequest,
  MemoryType,
  ApiResponse 
} from '@lanonasis/memory-client';

// Strongly typed memory creation
const memory: CreateMemoryRequest = {
  title: 'TypeScript Tips',
  content: 'Use strict mode for better type safety',
  memory_type: 'knowledge' as MemoryType,
  tags: ['typescript', 'tips']
};

// Typed responses
const response: ApiResponse<MemoryEntry> = await client.createMemory(memory);
```

## 🌍 Browser Support

- ✅ Chrome 88+
- ✅ Firefox 85+
- ✅ Safari 14+
- ✅ Edge 88+
- ✅ Node.js 16+

## 📚 Examples

Check out the [examples directory](./examples) for complete implementation examples:

- [Basic Usage](./examples/basic.js)
- [React Integration](./examples/react-app.tsx)
- [Node.js Server](./examples/server.js)
- [Search Implementation](./examples/search.js)

## 📖 Documentation

- [API Reference](https://docs.lanonasis.com/sdk/api)
- [Getting Started Guide](https://docs.lanonasis.com/sdk/quickstart)
- [Migration Guide](https://docs.lanonasis.com/sdk/migration)

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## 📄 License

MIT © [Lanonasis Team](https://lanonasis.com)

## 🆘 Support

- **Documentation**: [docs.lanonasis.com](https://docs.lanonasis.com)
- **Issues**: [GitHub Issues](https://github.com/lanonasis/memory-client/issues)
- **Discussions**: [GitHub Discussions](https://github.com/lanonasis/memory-client/discussions)
- **Email**: support@lanonasis.com

---

**Made with ❤️ by the Lanonasis Team**
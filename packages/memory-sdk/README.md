# @lanonasis/memory-sdk

Official TypeScript SDK for Lanonasis Memory as a Service (MaaS)

## 🚀 Quick Start

### Installation

```bash
# NPM
npm install @lanonasis/memory-sdk

# Yarn
yarn add @lanonasis/memory-sdk

# Bun
bun add @lanonasis/memory-sdk
```

### Basic Usage

```typescript
import MemoryClient from '@lanonasis/memory-sdk';

// Initialize client
const memory = new MemoryClient({
  apiUrl: 'https://api.lanonasis.com',
  apiKey: 'your-api-key-here'
});

// Create a memory
const newMemory = await memory.createMemory({
  title: 'Important Meeting Notes',
  content: 'Discussed Q4 strategy and budget allocation...',
  type: 'context',
  tags: ['meeting', 'strategy', 'q4']
});

// Search memories
const results = await memory.searchMemories({
  query: 'Q4 strategy',
  limit: 10,
  type: 'context'
});

// Get user stats
const stats = await memory.getUserStats();
```

## 🚀 Multi-Modal Memory

Unlike traditional LLMs limited by context windows, Lanonasis Memory Service stores unlimited content across multiple formats:

```typescript
import { MultiModalMemoryClient } from '@lanonasis/memory-sdk';

const memory = new MultiModalMemoryClient({
  apiUrl: 'https://api.lanonasis.com',
  apiKey: 'your-api-key'
});

// Store an image with OCR and AI description
const imageMemory = await memory.createImageMemory(
  'Product Screenshot',
  imageFile,
  { extractText: true, generateDescription: true }
);

// Store audio with transcription
const audioMemory = await memory.createAudioMemory(
  'Meeting Recording',
  audioFile
);

// Store code with semantic analysis
const codeMemory = await memory.createCodeMemory(
  'Authentication Helper',
  codeString,
  'typescript',
  { extractFunctions: true, generateDocs: true }
);

// Store documents with full-text extraction
const docMemory = await memory.createDocumentMemory(
  'Project Requirements',
  pdfFile,
  'pdf'
);

// Search across all modalities
const results = await memory.getMultiModalContext('user authentication', {
  includeImages: true,
  includeAudio: true,
  includeDocuments: true,
  includeCode: true
});
```

## 🎯 Features

- **Multi-Modal Memory**: Store images, audio, documents, and code with full content extraction
- **Semantic Search**: Vector-based similarity search across all content types
- **Memory Types**: Context, project, knowledge, reference, personal, workflow
- **AI-Powered Analysis**: OCR, transcription, code analysis, and summarization
- **Unlimited Context**: No token limits - store and search unlimited content
- **Real-time Updates**: SSE support for live memory updates
- **TypeScript**: Full type safety and IntelliSense
- **Authentication**: API key and JWT token support
- **Error Handling**: Comprehensive error types and messages

## 📚 API Reference

### Client Configuration

```typescript
interface MaaSClientConfig {
  apiUrl: string;           // Your MaaS API endpoint
  apiKey?: string;          // API key for authentication
  authToken?: string;       // JWT token (alternative to API key)
  timeout?: number;         // Request timeout in milliseconds
}
```

### Memory Operations

#### Create Memory
```typescript
await memory.createMemory({
  title: 'Memory Title',
  content: 'Memory content here...',
  type: 'context',              // context | project | knowledge | reference | personal | workflow
  tags: ['tag1', 'tag2'],
  topic_id: 'optional-topic-id',
  metadata: { custom: 'data' }
});
```

#### Search Memories
```typescript
await memory.searchMemories({
  query: 'search terms',
  limit: 10,
  type: 'context',
  tags: ['filter-tag'],
  similarity_threshold: 0.7
});
```

#### Get Memory by ID
```typescript
const memory = await memory.getMemory('memory-id');
```

#### Update Memory
```typescript
await memory.updateMemory('memory-id', {
  title: 'Updated Title',
  content: 'Updated content...'
});
```

#### Delete Memory
```typescript
await memory.deleteMemory('memory-id');
```

### Topic Management

#### Create Topic
```typescript
await memory.createTopic({
  name: 'Project Alpha',
  description: 'All memories related to Project Alpha',
  color: '#3B82F6'
});
```

#### Get Topics
```typescript
const topics = await memory.getTopics();
```

### Analytics

#### Get User Stats
```typescript
const stats = await memory.getUserStats();
// Returns: { total_memories, memories_by_type, recent_activity, etc. }
```

## 🔧 Advanced Usage

### Error Handling
```typescript
import { MemoryClient, MemoryError } from '@lanonasis/memory-sdk';

try {
  const result = await memory.createMemory({...});
} catch (error) {
  if (error instanceof MemoryError) {
    console.error('Memory API Error:', error.message);
    console.error('Status Code:', error.statusCode);
  }
}
```

### Real-time Updates
```typescript
// Subscribe to memory updates
const unsubscribe = memory.onMemoryUpdate((update) => {
  console.log('Memory updated:', update);
});

// Unsubscribe when done
unsubscribe();
```

### Pagination
```typescript
const memories = await memory.getAllMemories({
  page: 1,
  limit: 20,
  type: 'context'
});
```

## 🛠️ Integration Examples

### React Hook
```typescript
import { useState, useEffect } from 'react';
import MemoryClient from '@lanonasis/memory-sdk';

const useMemory = (apiKey: string) => {
  const [client] = useState(() => new MemoryClient({
    apiUrl: 'https://api.lanonasis.com',
    apiKey
  }));

  return {
    createMemory: client.createMemory.bind(client),
    searchMemories: client.searchMemories.bind(client),
    // ... other methods
  };
};
```

### Node.js Server
```typescript
import MemoryClient from '@lanonasis/memory-sdk';

const memory = new MemoryClient({
  apiUrl: 'https://api.lanonasis.com',
  apiKey: process.env.LANONASIS_API_KEY
});

// Use in API routes
app.post('/api/memories', async (req, res) => {
  try {
    const result = await memory.createMemory(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### Next.js App
```typescript
// lib/memory.ts
import MemoryClient from '@lanonasis/memory-sdk';

export const memory = new MemoryClient({
  apiUrl: process.env.NEXT_PUBLIC_LANONASIS_API_URL!,
  apiKey: process.env.LANONASIS_API_KEY!
});

// pages/api/search.ts
import { memory } from '../../lib/memory';

export default async function handler(req, res) {
  const results = await memory.searchMemories({
    query: req.body.query,
    limit: 10
  });
  res.json(results);
}
```

## 🔐 Authentication

The SDK supports multiple authentication methods:

### API Key (Recommended)
```typescript
const memory = new MemoryClient({
  apiUrl: 'https://api.lanonasis.com',
  apiKey: 'sk_live_...'
});
```

### JWT Token
```typescript
const memory = new MemoryClient({
  apiUrl: 'https://api.lanonasis.com',
  authToken: 'your-jwt-token'
});
```

## 📖 Memory Types

- **`context`**: General contextual information and notes
- **`project`**: Project-specific knowledge and documentation
- **`knowledge`**: Educational content and reference materials
- **`reference`**: Quick reference information and code snippets
- **`personal`**: User-specific private memories
- **`workflow`**: Process and procedure documentation

## 🌐 Environment Variables

Create a `.env` file in your project:

```env
LANONASIS_API_URL=https://api.lanonasis.com
LANONASIS_API_KEY=your-api-key-here
```

## 🧠 Why Choose Lanonasis Over Traditional LLMs?

| Feature | Traditional LLMs | Lanonasis Memory Service |
|---------|------------------|-------------------------|
| **Context Window** | Limited (4K-128K tokens) | ♾️ Unlimited |
| **Memory Persistence** | ❌ Ephemeral | ✅ Permanent |
| **Multi-Modal Support** | ⚠️ Limited | ✅ Images, Audio, Documents, Code |
| **Content Processing** | ❌ Basic | ✅ OCR, Transcription, Analysis |
| **Search Capabilities** | ❌ None | ✅ Vector Similarity + Metadata |
| **Cross-Session Memory** | ❌ None | ✅ Full History |
| **File Storage** | ❌ None | ✅ Permanent URLs |
| **Content Extraction** | ❌ Limited | ✅ Full Text + Semantic Analysis |

**Lanonasis transforms how AI systems work with information** - instead of forgetting everything after each conversation, it builds a persistent, searchable knowledge base that grows more valuable over time.

## 📞 Support

- **Documentation**: https://docs.lanonasis.com/sdk
- **API Reference**: https://api.lanonasis.com/docs  
- **Support**: support@lanonasis.com
- **GitHub**: https://github.com/lanonasis/memory-sdk

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.
# Lanonasis Memory SDK - Standalone Bundle

**Drop-in SDK for any JavaScript/TypeScript project**

This standalone bundle contains everything you need to integrate Lanonasis Memory Service into your project without any installation or package manager setup.

## 🚀 Quick Start

### 1. Copy Files to Your Project

Copy the entire `standalone` folder to your project:

```bash
# Copy standalone folder to your project
cp -r standalone/ your-project/lib/memory-sdk/
```

### 2. Import and Use

#### ES Modules (Modern JavaScript/TypeScript)
```javascript
import MemoryClient, { MultiModalMemoryClient } from './lib/memory-sdk/lanonasis-memory-sdk.js';

const memory = new MemoryClient({
  apiUrl: 'https://api.lanonasis.com',
  apiKey: 'your-api-key-here'
});

// Create a memory
const result = await memory.createMemory({
  title: 'Project Note',
  content: 'This is important information...',
  memory_type: 'context',
  tags: ['project', 'important']
});
```

#### CommonJS (Node.js)
```javascript
const { default: MemoryClient, MultiModalMemoryClient } = require('./lib/memory-sdk/lanonasis-memory-sdk.cjs');

const memory = new MemoryClient({
  apiUrl: 'https://api.lanonasis.com',
  apiKey: process.env.LANONASIS_API_KEY
});
```

#### HTML Script Tag (Browser)
```html
<!DOCTYPE html>
<html>
<head>
  <title>Memory SDK Example</title>
</head>
<body>
  <script type="module">
    import MemoryClient from './lib/memory-sdk/lanonasis-memory-sdk.js';
    
    const memory = new MemoryClient({
      apiUrl: 'https://api.lanonasis.com',
      apiKey: 'your-api-key'
    });
    
    // Use the SDK...
    window.memory = memory;
  </script>
</body>
</html>
```

## 🎯 Multi-Modal Examples

### Store Different Content Types
```javascript
import { MultiModalMemoryClient } from './lib/memory-sdk/lanonasis-memory-sdk.js';

const memory = new MultiModalMemoryClient({
  apiUrl: 'https://api.lanonasis.com',
  apiKey: 'your-api-key'
});

// Store image with OCR
const imageFile = new File([imageBuffer], 'screenshot.png');
const imageMemory = await memory.createImageMemory(
  'Dashboard Screenshot',
  imageFile,
  { extractText: true, generateDescription: true }
);

// Store audio with transcription  
const audioFile = new File([audioBuffer], 'meeting.mp3');
const audioMemory = await memory.createAudioMemory(
  'Team Meeting',
  audioFile
);

// Store code with analysis
const codeMemory = await memory.createCodeMemory(
  'Login Component',
  `const LoginForm = () => { /* code */ }`,
  'javascript',
  { extractFunctions: true, generateDocs: true }
);

// Search across all content
const results = await memory.getMultiModalContext('user authentication', {
  includeImages: true,
  includeAudio: true,
  includeCode: true
});
```

## 📁 Project Integration Examples

### React App
```javascript
// src/lib/memory.js
import MemoryClient from '../lib/memory-sdk/lanonasis-memory-sdk.js';

export const memory = new MemoryClient({
  apiUrl: process.env.REACT_APP_LANONASIS_API_URL,
  apiKey: process.env.REACT_APP_LANONASIS_API_KEY
});

// src/components/MemorySearch.jsx
import React, { useState } from 'react';
import { memory } from '../lib/memory';

export const MemorySearch = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  
  const search = async () => {
    const response = await memory.searchMemories({
      query,
      limit: 10,
      status: 'active',
      threshold: 0.7
    });
    setResults(response.data?.results || []);
  };
  
  return (
    <div>
      <input 
        value={query} 
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search memories..."
      />
      <button onClick={search}>Search</button>
      
      {results.map(result => (
        <div key={result.id}>
          <h3>{result.title}</h3>
          <p>{result.content.substring(0, 200)}...</p>
        </div>
      ))}
    </div>
  );
};
```

### Next.js API Route
```javascript
// pages/api/memories.js
import { MemoryClient } from '../../lib/memory-sdk/lanonasis-memory-sdk.cjs';

const memory = new MemoryClient({
  apiUrl: process.env.LANONASIS_API_URL,
  apiKey: process.env.LANONASIS_API_KEY
});

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const result = await memory.createMemory(req.body);
    res.json(result);
  } else if (req.method === 'GET') {
    const results = await memory.searchMemories({
      query: req.query.q,
      limit: 20,
      status: 'active',
      threshold: 0.7
    });
    res.json(results);
  }
}
```

### Vue.js Composition API
```javascript
// composables/useMemory.js
import MemoryClient from '../lib/memory-sdk/lanonasis-memory-sdk.js';
import { ref } from 'vue';

const memory = new MemoryClient({
  apiUrl: import.meta.env.VITE_LANONASIS_API_URL,
  apiKey: import.meta.env.VITE_LANONASIS_API_KEY
});

export function useMemory() {
  const memories = ref([]);
  const loading = ref(false);
  
  const searchMemories = async (query) => {
    loading.value = true;
    try {
      const response = await memory.searchMemories({
        query,
        limit: 10,
        status: 'active',
        threshold: 0.7
      });
      memories.value = response.data?.results || [];
    } finally {
      loading.value = false;
    }
  };
  
  const createMemory = async (memoryData) => {
    const response = await memory.createMemory(memoryData);
    return response.data;
  };
  
  return {
    memories,
    loading,
    searchMemories,
    createMemory
  };
}
```

### Node.js Express Server
```javascript
// server.js
const express = require('express');
const { default: MemoryClient } = require('./lib/memory-sdk/lanonasis-memory-sdk.cjs');

const app = express();
const memory = new MemoryClient({
  apiUrl: process.env.LANONASIS_API_URL,
  apiKey: process.env.LANONASIS_API_KEY
});

app.use(express.json());

// Store memory endpoint
app.post('/memories', async (req, res) => {
  try {
    const result = await memory.createMemory(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Search memories endpoint
app.get('/memories/search', async (req, res) => {
  try {
    const results = await memory.searchMemories({
      query: req.query.q,
      limit: parseInt(req.query.limit) || 20,
      status: 'active',
      threshold: 0.7
    });
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

## 🔧 Environment Setup

Create a `.env` file in your project root:

```env
# Required
LANONASIS_API_URL=https://api.lanonasis.com
LANONASIS_API_KEY=your-api-key-here

# For specific frameworks
REACT_APP_LANONASIS_API_URL=https://api.lanonasis.com
REACT_APP_LANONASIS_API_KEY=your-api-key-here

VITE_LANONASIS_API_URL=https://api.lanonasis.com
VITE_LANONASIS_API_KEY=your-api-key-here

NEXT_PUBLIC_LANONASIS_API_URL=https://api.lanonasis.com
# Don't expose API key in public env vars for Next.js
```

## 📦 Bundle Contents

- **`lanonasis-memory-sdk.js`** - ES modules bundle (for modern browsers/Node.js)
- **`lanonasis-memory-sdk.cjs`** - CommonJS bundle (for older Node.js)
- **`types.d.ts`** - TypeScript definitions
- **`package.json`** - Package metadata
- **`*.map`** - Source maps for debugging

## 🚀 Features

- ✅ **Zero Dependencies** - Everything bundled
- ✅ **TypeScript Support** - Full type definitions included
- ✅ **Multi-Modal Memory** - Images, audio, documents, code
- ✅ **Unlimited Context** - No token limits
- ✅ **Persistent Memory** - Cross-session knowledge
- ✅ **Vector Search** - Semantic similarity search
- ✅ **Production Ready** - Minified and optimized

## 📞 Support

- **Documentation**: https://docs.lanonasis.com
- **API Reference**: https://api.lanonasis.com/docs
- **Support**: support@lanonasis.com

## 📄 License

MIT License - Drop into any project, commercial or personal.
// Usage Example
import MemoryClient, { MultiModalMemoryClient } from './lanonasis-memory-sdk.js';

// Basic client
const memory = new MemoryClient({
  apiUrl: 'https://api.lanonasis.com',
  apiKey: 'your-api-key'
});

// Multi-modal client
const multiModal = new MultiModalMemoryClient({
  apiUrl: 'https://api.lanonasis.com', 
  apiKey: 'your-api-key'
});

// Use the clients...
const result = await memory.createMemory({
  title: 'Test Memory',
  content: 'This is a test memory',
  memory_type: 'context'
});

console.log('Memory created:', result.data?.id);

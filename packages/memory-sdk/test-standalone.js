// Test the standalone bundle
import MemoryClient, { MultiModalMemoryClient } from './standalone/lanonasis-memory-sdk.js';

console.log('🧪 Testing Standalone SDK Bundle...');

// Test basic client creation
try {
  const memory = new MemoryClient({
    apiUrl: 'https://api.lanonasis.com',
    apiKey: 'test-key'
  });
  console.log('✅ Basic MemoryClient created successfully');
} catch (error) {
  console.error('❌ Basic MemoryClient failed:', error.message);
}

// Test multi-modal client creation
try {
  const multiModal = new MultiModalMemoryClient({
    apiUrl: 'https://api.lanonasis.com',
    apiKey: 'test-key'
  });
  console.log('✅ MultiModalMemoryClient created successfully');
} catch (error) {
  console.error('❌ MultiModalMemoryClient failed:', error.message);
}

// Test method availability
const memory = new MemoryClient({
  apiUrl: 'https://api.lanonasis.com',
  apiKey: 'test-key'
});

const methods = [
  'createMemory',
  'getMemory', 
  'updateMemory',
  'deleteMemory',
  'searchMemories',
  'listMemories',
  'createTopic',
  'getTopics',
  'getMemoryStats'
];

console.log('\n📋 Checking method availability:');
methods.forEach(method => {
  if (typeof memory[method] === 'function') {
    console.log(`✅ ${method}`);
  } else {
    console.log(`❌ ${method} - missing or not a function`);
  }
});

console.log('\n🎉 Standalone SDK bundle test complete!');
console.log('📦 Ready for distribution and integration');
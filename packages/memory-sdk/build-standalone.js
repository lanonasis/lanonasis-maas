/**
 * Build standalone SDK bundle
 */
import { build } from 'esbuild';
import fs from 'fs';
import path from 'path';

// Build the main bundle
await build({
  entryPoints: ['src/index.ts'],
  outfile: 'standalone/lanonasis-memory-sdk.js',
  bundle: true,
  platform: 'neutral',
  format: 'esm',
  target: ['es2020'],
  minify: true,
  sourcemap: true,
  external: [], // Bundle everything
  define: {
    'process.env.NODE_ENV': '"production"'
  }
});

// Build CommonJS version
await build({
  entryPoints: ['src/index.ts'],
  outfile: 'standalone/lanonasis-memory-sdk.cjs',
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: ['node16'],
  minify: true,
  sourcemap: true,
  external: [], // Bundle everything
  define: {
    'process.env.NODE_ENV': '"production"'
  }
});

// Create standalone package.json
const standalonePackage = {
  "name": "@lanonasis/memory-sdk-standalone",
  "version": "1.0.0",
  "description": "Standalone Memory SDK - drop into any project",
  "main": "lanonasis-memory-sdk.cjs",
  "module": "lanonasis-memory-sdk.js",
  "types": "types.d.ts",
  "files": ["*"],
  "keywords": ["memory", "ai", "sdk", "multimodal", "search"],
  "author": "Lanonasis",
  "license": "MIT"
};

fs.writeFileSync('standalone/package.json', JSON.stringify(standalonePackage, null, 2));

// Copy TypeScript definitions
fs.copyFileSync('dist/index.d.ts', 'standalone/types.d.ts');

// Create usage example
const usageExample = `// Usage Example
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
`;

fs.writeFileSync('standalone/example.js', usageExample);

console.log('✅ Standalone SDK bundle created in ./standalone/ directory');
console.log('📦 Files created:');
console.log('  - lanonasis-memory-sdk.js (ES modules)');
console.log('  - lanonasis-memory-sdk.cjs (CommonJS)');
console.log('  - types.d.ts (TypeScript definitions)');
console.log('  - package.json (standalone package info)');
console.log('  - example.js (usage example)');
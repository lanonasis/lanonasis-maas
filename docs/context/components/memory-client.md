# @lanonasis/memory-client - Component Context

**Package:** `@lanonasis/memory-client`
**Version:** 2.2.1
**Published:** Yes (npm registry)

---

## Purpose

Universal Memory as a Service client SDK that works everywhere: Browser, Node.js, React, Vue, and Edge Functions. The most widely-compatible client for integrating LanOnasis memory into any JavaScript/TypeScript project.

---

## Exports

The SDK uses multiple export conditions for platform-specific optimizations:

| Export | Condition | Description |
|--------|-----------|-------------|
| Main | Default | Universal entry (ESM) |
| Core | Browser/Node | Shared core logic |
| Node | Node.js only | Node-specific optimizations |
| React | React 16.8+ | React hooks and components |
| Vue | Vue 3+ | Vue composables |
| Presets | - | Pre-configured setups |

---

## Key Files

| File | Purpose |
|------|---------|
| `src/index.ts` | Main entry point |
| `src/core/index.ts` | Core client logic |
| `src/node/index.ts` | Node.js specific |
| `src/react/index.ts` | React hooks |
| `src/vue/index.ts` | Vue composables |
| `src/presets/index.ts` | Pre-configured clients |

---

## Browser Compatibility

```javascript
// Works in:
- Chrome/Edge 88+
- Firefox 78+
- Safari 14+
- Node.js 16+
- React 16.8+ / 17 / 18 / 19
- Vue 3+
- Edge Functions
- Cloudflare Workers
```

---

## Usage Examples

### Browser
```typescript
import { createClient } from '@lanonasis/memory-client';

const client = createClient({
  apiKey: 'your-api-key',
  apiUrl: 'https://api.lanonasis.com'
});

const memory = await client.createMemory({ title: 'Test', content: '...' });
```

### React
```typescript
import { useMemory, MemoryProvider } from '@lanonasis/memory-client/react';

// In your app
<MemoryProvider apiKey="your-key">
  <MyComponent />
</MemoryProvider>

// In a component
function MyComponent() {
  const { memories, createMemory } = useMemory();
  // ...
}
```

### Node.js
```typescript
import { createNodeClient } from '@lanonasis/memory-client/node';

const client = createNodeClient({
  apiKey: 'your-key',
  // Node-specific options
});
```

---

## Dependencies

### External
- `zod` (4.1.12) - Runtime validation

### Peer Dependencies (optional)
- `react` (>=16.8.0) - For React integration
- `vue` (>=3.0.0) - For Vue integration

---

## Build Output

```
dist/
├── index.esm.js       # ES Module (main)
├── index.cjs          # CommonJS
├── index.d.ts         # TypeScript definitions
├── core/
│   └── index.js       # Core logic
├── node/
│   └── index.js       # Node.js bundle
├── react/
│   └── index.js       # React bundle
├── vue/
│   └── index.js       # Vue bundle
└── presets/
    └── index.js       # Presets bundle
```

---

## Development

```bash
npm run build          # Rollup build
npm run build:watch    # Watch mode
npm run type-check     # TypeScript checking
npm run lint           # ESLint
npm test               # Vitest tests
npm run test:coverage  # With coverage
npm run test:ui        # Vitest UI
```

---

## Integration Points

| Platform | How it works |
|----------|--------------|
| Claude Code | Hook-based integration via `claude-memory` |
| OpenClaw | Via `recall-forge` plugin |
| Web apps | Direct browser import |
| Node.js services | Node-specific bundle |
| Edge functions | Lightweight ESM build |

---

## Architecture Decisions

- **Platform-specific bundles**: Each platform gets optimized code
- **Zod v4**: Latest Zod for validation
- **Conditional exports**: Browser field prevents Node.js code in browser
- **Hooks pattern**: React integration via hooks API
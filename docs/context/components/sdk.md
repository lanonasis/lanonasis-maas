# @lanonasis/sdk - Component Context

**Package:** `@lanonasis/sdk`
**Version:** 1.2.0
**Published:** Yes (npm registry)

> **Naming gotcha.** The folder name `packages/lanonasis-sdk/` does **not** match the npm package name — the registry name is `@lanonasis/sdk` (no `lanonasis-` prefix, no `standalone` suffix). The folder → package mapping for the confusing ones:
>
> 1. **`@lanonasis/sdk`** lives at `packages/lanonasis-sdk/` (this package).
> 2. **`@lanonasis/memory-sdk-standalone`** lives at `packages/memory-sdk/` — folder name and npm name diverge here too; see `memory-sdk-standalone.md` for the dual-manifest (`standalone/` subfolder) caveat.
>
> **Best practice.** When importing or bumping versions, always trust the `"name"` field in the package's `package.json`, not the folder name.

---

## Purpose

Enterprise-grade SDK providing Memory as a Service and API Key Management. The comprehensive SDK with full feature access including memory operations, API key management, and MCP (Model Context Protocol) integration.

---

## Exports

The SDK uses subpath exports for tree-shaking:

| Export | Path | Description |
|--------|------|-------------|
| Main | `./dist/index.js` | Full SDK entry |
| Memory | `./dist/memory/index.js` | Memory operations only |
| API Keys | `./dist/api-keys/index.js` | API key management only |
| MCP | `./dist/mcp/index.js` | Model Context Protocol |

---

## Key Files

| File | Purpose |
|------|---------|
| `src/index.ts` | Main SDK entry point |
| `src/memory/` | Memory operations module |
| `src/api-keys/` | API key management module |
| `src/mcp/` | MCP integration module |
| `src/types.ts` | TypeScript types |

---

## Dependencies

### External
- `axios` (1.6.0) - HTTP client
- `ws` (8.14.2) - WebSocket support
- `zod` (3.24.4) - Validation
- `jsonwebtoken` (9.0.3) - JWT handling
- `crypto-js` (4.2.0) - Cryptographic utilities
- `@modelcontextprotocol/sdk` (1.25.2) - MCP protocol

### Peer Dependencies
- `openai` (>=4.0.0) - Optional, for embeddings

---

## Usage Example

```typescript
import { LanOnasis } from '@lanonasis/sdk';

// Initialize client
const client = new LanOnasis({
  apiKey: 'your-api-key',
  supabaseUrl: 'your-supabase-url',
  supabaseKey: 'your-supabase-key'
});

// Create memory
const memory = await client.memory.create({
  title: 'My Memory',
  content: 'Important information',
  type: 'context'
});

// Search memories
const results = await client.memory.search('query text', {
  limit: 10,
  threshold: 0.8
});

// Manage API keys
const keys = await client.apiKeys.list();
```

---

## Features

- **Full Memory Operations**: Create, read, update, delete, search
- **API Key Management**: Create, rotate, revoke API keys
- **MCP Integration**: Model Context Protocol support for AI agents
- **TypeScript**: Full type definitions included
- **Tree-shaking**: Import only what you need

---

## Development

```bash
npm run build       # Compile TypeScript
npm run dev         # Watch mode
npm run type-check  # TypeScript checking
npm run lint        # ESLint
npm test            # Run tests
npm run prepublishOnly  # Build before publish
```

---

## Integration Points

| Component | Connection |
|-----------|------------|
| `memory-service` | API backend for all operations |
| MCP agents | Protocol integration for AI assistants |
| Enterprise apps | Full SDK for complex integrations |

---

## Architecture Decisions

- **Subpath exports**: Enable tree-shaking for bundle size optimization
- **Zod validation**: Runtime type safety for API inputs
- **MCP support**: First-class AI agent integration
- **Axios HTTP**: Universal HTTP support (browser + node)
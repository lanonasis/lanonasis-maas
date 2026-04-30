# ADR-003: SDK Export Strategy

**Status:** Accepted
**Date:** 2025-03-20 (original), Updated 2026-04-30

## Context

The LanOnasis SDK packages need to support multiple use cases: full SDK usage, individual modules, and platform-specific builds. We needed a strategy that enables tree-shaking while maintaining backward compatibility.

## Decision

**Use subpath exports with conditional exports** for all SDK packages.

### Export Strategy

```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    },
    "./memory": {
      "import": "./dist/memory/index.js",
      "types": "./dist/memory/index.d.ts"
    },
    "./api-keys": {
      "import": "./dist/api-keys/index.js",
      "types": "./dist/api-keys/index.d.ts"
    },
    "./mcp": {
      "import": "./dist/mcp/index.js",
      "types": "./dist/mcp/index.d.ts"
    }
  }
}
```

## Platform-Specific Exports (memory-client)

```json
{
  "exports": {
    ".": { "import": "./dist/index.esm.js", "types": "./dist/index.d.ts" },
    "./core": { "browser": "./dist/core/index.js", "import": "./dist/core/index.js" },
    "./node": { "node": "./dist/node/index.js", "import": "./dist/node/index.js" },
    "./react": { "import": "./dist/react/index.js" },
    "./vue": { "import": "./dist/vue/index.js" }
  },
  "browser": {
    "./dist/node/index.js": false
  }
}
```

## Alternatives Considered

### Single Default Export
- Simple but forces importing everything
- No tree-shaking benefit
- Larger bundle sizes

### Multiple Entry Points (pkg.main, pkg.module)
- Works for basic cases
- Doesn't support subpath selection
- Less flexible for modular SDKs

## Consequences

**Positive:**
- Tree-shaking works correctly
- Users pay only for what they import
- TypeScript types available for all exports
- Clear module boundaries

**Negative:**
- More complex build configuration (Rollup multi-entry)
- Need to maintain multiple output formats
- Subpath exports require `exports` field (Node 12.20+)

## Packages Using This Strategy

| Package | Subpath Exports |
|---------|-----------------|
| `@lanonasis/sdk` | `./memory`, `./api-keys`, `./mcp` |
| `@lanonasis/memory-client` | `./core`, `./node`, `./react`, `./vue` |
| `@lanonasis/memory-sdk-standalone` | Main only |

## Build Configuration

Each package uses Rollup with multiple entry points:
```javascript
// rollup.config.js
export default {
  input: {
    'dist/index': 'src/index.ts',
    'dist/memory': 'src/memory/index.ts',
    'dist/api-keys': 'src/api-keys/index.ts'
  },
  // ... output configs
};
```
# Legacy v1 Files (Archived)

These files were part of the v1.x Memory Client SDK architecture.

## Why Archived?

The v2.0 SDK reorganized into a modular structure:

```
v1 (archived)          →  v2 (current)
─────────────────────────────────────────
src/client.ts          →  src/core/client.ts
src/enhanced-client.ts →  src/node/client.ts (future)
src/cli-integration.ts →  src/node/cli-integration.ts
src/types.ts           →  src/core/types.ts
src/config.ts          →  src/core/config.ts (merged into client)
```

## Key Changes in v2

1. **Modular Structure**: Browser-safe core vs Node-specific modules
2. **Typed Errors**: `ApiErrorResponse` replaces plain strings
3. **Zod Validation**: Runtime validation with schemas
4. **Retry Logic**: Exponential backoff with jitter
5. **Auto-Detection**: Environment-aware client factory

## Migration Path

```typescript
// v1.x (deprecated)
import { MemoryClient } from '@lanonasis/memory-client';
import { EnhancedMemoryClient } from '@lanonasis/memory-client';

// v2.0 (current)
import { CoreMemoryClient } from '@lanonasis/memory-client/core';
import { createNodeMemoryClient } from '@lanonasis/memory-client/node';
```

## Archived Date

2025-01-16

## Related

- SDK_IMPROVEMENTS_ANALYSIS.md
- CHANGELOG.md

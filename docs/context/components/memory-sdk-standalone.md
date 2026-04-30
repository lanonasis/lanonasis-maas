# @lanonasis/memory-sdk-standalone - Component Context

**Package:** `@lanonasis/memory-sdk-standalone`
**Version:** 1.1.0
**Published:** Yes (npm registry)

---

## Purpose

Standalone Memory SDK designed for multi-agent orchestration with persistent memory. A self-contained SDK that can be dropped into any project without requiring the full LanOnasis stack. Ideal for agent systems that need memory capabilities independently.

---

## Key Features

- **Self-contained**: No external dependencies on LanOnasis services beyond API
- **Multi-agent ready**: Designed for systems with multiple AI agents
- **Persistent memory**: Long-term context storage across agent sessions
- **Lightweight**: Minimal footprint for resource-constrained environments

---

## Key Files

| File | Purpose |
|------|---------|
| `src/index.ts` | Main SDK entry point |
| `src/agent.ts` | Agent-specific utilities |
| `src/storage.ts` | Memory storage abstractions |

---

## Usage Example

```typescript
import { MemoryOrchestrator } from '@lanonasis/memory-sdk-standalone';

// Create orchestrator for multi-agent system
const orchestrator = new MemoryOrchestrator({
  apiKey: 'your-api-key',
  agents: ['agent-1', 'agent-2', 'agent-3']
});

// Each agent gets persistent memory
const agent1Memory = orchestrator.getAgentMemory('agent-1');
await agent1Memory.store({ role: 'coordinator', context: '...' });

// Agents can share context
const sharedContext = await orchestrator.getSharedContext();
```

---

## Dependencies

### External
- `axios` (1.7.9) - HTTP client
- `eventsource` (4.0.0) - Server-Sent Events for real-time updates

---

## Differences from @lanonasis/memory-client

| Aspect | Standalone | memory-client |
|--------|------------|---------------|
| Target | Multi-agent systems | General purpose |
| Size | Lightweight | Full-featured |
| Exports | Single entry | Multiple (React, Vue, etc.) |
| Agent support | Built-in | Via additional setup |
| Use case | Independent integration | Part of larger SDK |

---

## Development

```bash
npm run build          # Compile with tsc and tsc-alias
npm run dev           # Development with tsx
npm run type-check    # TypeScript checking
npm run lint          # ESLint
npm test              # Run tests
npm run prepublishOnly  # Build before publish
```

---

## Integration Points

| Component | Connection |
|-----------|------------|
| `memory-service` | API backend |
| `memory-client` | Different target use case |
| Agent frameworks | Direct integration with agent orchestrators |

---

## Architecture Decisions

- **Standalone focus**: No peer dependencies on other LanOnasis packages
- **Agent-first design**: Built-in multi-agent orchestration concepts
- **SSE support**: Real-time updates via Server-Sent Events
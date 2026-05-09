# LanOnasis MaaS - Project Overview

**Generated:** 2026-04-30
**Last Updated:** 2026-05-09 (aligned to monorepo architecture reset)
**Source of Truth:** Monorepo context-engineering (`/.devops/context-engineering/`)
**Relationship:** This app is a submodule of `lan-onasis-monorepo`. Architecture truth lives in the monorepo.

---

## ⚠️ ARCHITECTURE STATUS: ALIGNED TO MONOREPO TRUTH RESET (2026-05-09)

This document previously described the Express server as the production API path.
This is **incorrect**. The following corrections apply:

1. **Express server is standalone-only.** Production intelligence API traffic bypasses
   `src/server.ts` entirely and routes directly to Supabase Edge Functions in
   `apps/onasis-core/supabase/functions/`.
2. **Package manager is `bun`** (not npm). This is a Bun workspace.
3. **Backend logic lives in onasis-core** — not in lanonasis-maas/src/.
4. **Public repo claim is conditional** — perform a secrets/history audit before publishing.
5. **Auth model:** X-API-Key via `_shared/auth.ts` in onasis-core (NOT OAuth2 PKCE from Express).

---

## Quick Navigation for AI

This is the master context file. Based on your task, refer to:

| Task | Context File |
|------|-------------|
| API server (standalone/self-hosted) | `components/memory-service.md` |
| CLI tool changes | `components/cli.md` |
| SDK development | `components/sdk.md` |
| Universal client (Browser/Node/React) | `components/memory-client.md` |
| Standalone SDK | `components/memory-sdk-standalone.md` |
| Claude Code integration | `components/claude-memory.md` |
| OpenClaw plugin | `components/recall-forge.md` |
| IDE extension shared library | `components/ide-extension-core.md` |
| VSCode extension | `components/ide-extensions/vscode.md` |
| Cursor extension | `components/ide-extensions/cursor.md` |
| Windsurf extension | `components/ide-extensions/windsurf.md` |
| Dev/build/test/deploy | `workflows/development.md` |
| Architecture decisions | `architecture/decisions/` |

For platform-level architecture (VPS gateways, Supabase EFs, DB rules), see the monorepo context-engineering at `/.devops/context-engineering/`.

---

## Quick Navigation for AI

This is the master context file. Based on your task, refer to:

| Task | Context File |
|------|-------------|
| API server development | `components/memory-service.md` |
| CLI tool changes | `components/cli.md` |
| SDK development | `components/sdk.md` |
| Universal client (Browser/Node/React) | `components/memory-client.md` |
| Standalone SDK | `components/memory-sdk-standalone.md` |
| Claude Code integration | `components/claude-memory.md` |
| OpenClaw plugin | `components/recall-forge.md` |
| IDE extension shared library | `components/ide-extension-core.md` |
| VSCode extension | `components/ide-extensions/vscode.md` |
| Cursor extension | `components/ide-extensions/cursor.md` |
| Windsurf extension | `components/ide-extensions/windsurf.md` |
| Dev/build/test/deploy | `workflows/development.md` |
| Architecture decisions | `architecture/decisions/` |

---

## Project Essentials

**Name:** LanOnasis Memory as a Service (MaaS)
**Type:** Enterprise microservice monorepo with SDKs, CLI, and IDE extensions
**Repository:** `https://github.com/lanonasis/lanonasis-maas`

### Purpose
Provides semantic memory storage and retrieval via API, SDKs, CLI, and IDE extensions. Enables AI agents and human developers to persist and recall context across sessions.

### Tech Stack
| Component | Technology |
|-----------|------------|
| Package manager | Bun (not npm) |
| Language | TypeScript (strict) |
| API Server (standalone) | Express 5.2.1 — standalone/self-hosted path only |
| Database | Supabase (PostgreSQL + pgvector) — via onasis-core EFs |
| Production auth | X-API-Key via `_shared/auth.ts` (onasis-core) — NOT OAuth2 PKCE |
| Production routing | Intelligence bypasses Express → Supabase EFs direct |
| Monitoring | Prometheus metrics, Winston logging |
| Vector Embeddings | OpenAI text-embedding-ada-002 via onasis-core EFs |

### Production vs Standalone Path

**Production API (`api.lanonasis.com`):**
```
Client → api.lanonasis.com → Supabase EFs (onasis-core/supabase/functions/)
```
The Express server in `src/server.ts` is **NOT** in the production path for
intelligence or memory routes. It only serves standalone/self-hosted deployments.

**Standalone path (`src/server.ts`):**
```
Client → Express :3000 → Supabase Edge Functions (standalone mode)
```

### Packages Published to npm
| Package | Version | Description |
|---------|---------|-------------|
| `@lanonasis/memory-sdk` | 1.0.0 | Memory-as-a-Service TypeScript SDK |
| `@lanonasis/cli` | 3.9.14+ | CLI with MCP server + interactive commands |
| `@lanonasis/mcp-core` | 1.0.0 | Production MCP server (17+ tools) |
| `@lanonasis/ai-sdk` | 0.2.2 | Drop-in AI SDK |
| `@lanonasis/claude-memory` | (in packages/) | Claude session memory enrichment |
| `@lanonasis/recall-forge` | (in packages/) | OpenClaw plugin |

### IDE Extensions
| Extension | Path |
|-----------|------|
| VSCode | `IDE-EXTENSIONS/vscode-extension/` |
| Cursor | `IDE-EXTENSIONS/cursor-extension/` |
| Windsurf | `IDE-EXTENSIONS/windsurf-extension/` |

### CLI Tool
- **Command:** `memory`
- **Location:** `cli/`
- **Commands:** init, login, create, search, list, get, update, delete, stats

---

## Architecture

### Production Path (api.lanonasis.com)

```
Client → api.lanonasis.com → Supabase Edge Functions (onasis-core)
                                                    ↑
                              (Express standalone server NOT in path)
```

Intelligence and memory routes bypass `src/server.ts` entirely.

### Standalone/Development Path

```
┌─────────────────────────────────────────────────────────────┐
│                        LanOnasis MaaS                       │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   CLI Tool  │  │  IDE Exts   │  │   External Clients  │ │
│  │  (memory)   │  │ VSCode/Cursor│  │  (Browser/Node/etc) │ │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘ │
│         │                │                     │             │
│  ┌──────▼────────────────▼─────────────────────▼──────────┐ │
│  │              SDK packages (@lanonasis/*)                │ │
│  └──────────────────────────┬──────────────────────────────┘ │
│                             │                                │
│  ┌──────────────────────────▼──────────────────────────────┐ │
│  │              memory-service (API Server)                 │ │
│  │       Express 5 + TypeScript — STANDALONE PATH ONLY      │ │
│  └──────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Note:** The Express server is the standalone path only. Production intelligence
routes go directly to Supabase Edge Functions in `apps/onasis-core`.

---

## Key Context Files

| Directory | Contents |
|-----------|----------|
| `architecture/decisions/` | Architecture Decision Records (ADRs) - why decisions were made |
| `components/` | Detailed context for each package and extension |
| `workflows/` | Development, testing, and deployment processes |

---

## AI Collaboration Notes

### Coding Standards
- TypeScript strict mode on all packages
- Zod for runtime validation
- Winston for structured logging
- Express middleware for auth, rate limiting, metrics

### Common Patterns
- **Subpath exports:** Each SDK uses `exports` field for tree-shaking
- **MCP integration:** Model Context Protocol support in SDKs
- **Vector search:** pgvector similarity search with configurable thresholds
- **Multi-tenant:** Organization-based isolation with RLS policies

### Constraints
- Node.js 18+ required
- Supabase project needed for database
- OpenAI API key required for embeddings
- JWT secret required for auth

---

## Development Commands

**Package manager:** Bun (not npm). This is a Bun workspace.

### Main Service (standalone testing only)
```bash
bun run dev        # Start Express server for standalone testing only
bun run build       # Build all packages
bun run test        # Run tests
bun run type-check  # TypeScript checking
bun run lint        # ESLint
```

### Workspace (all packages)
```bash
bun run build      # Build all packages
bun run test       # Test all packages
bun run lint       # Lint all packages
```

### CLI Tool (from cli/ directory)
```bash
bun run dev          # Development
bun run build        # Build
memory --help        # Test after build
```

### Docker
```bash
docker-compose up              # Local development
docker build -t memory-service  # Build image
```

**Note:** Database migrations use `apply_migration` MCP tool or reviewed SQL only.
NEVER run `supabase db push` against the production database.

---

## API Base URL

**Production:** `https://api.lanonasis.com` (routes to Supabase EFs via VPS nginx)
**Standalone/Development:** `http://localhost:3000` (Express server — standalone path only)

### Key Endpoints (Production)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/memories` | Create memory |
| GET | `/api/v1/memories` | List memories |
| POST | `/api/v1/memories/search` | Semantic search |
| GET | `/api/v1/memories/:id` | Get memory |
| PUT | `/api/v1/memories/:id` | Update memory |
| DELETE | `/api/v1/memories/:id` | Delete memory |
| POST | `/api/v1/intelligence/suggest-tags` | AI tag suggestions |
| POST | `/api/v1/intelligence/find-related` | Find related memories |

### Key Endpoints (Standalone/Local)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/login` | Login (standalone) |
| POST | `/api/v1/memory` | Create memory (standalone) |
| GET | `/api/v1/memory` | List memories (standalone) |

**Authentication (Production):** `X-API-Key` header with `lano_*` prefix (canonical).
**Authentication (Standalone):** `Authorization: Bearer <token>` via JWT.

**Important:** For SDK/CLI calling production intelligence features, call
`api.lanonasis.com` endpoints — not the local Express server.

---

## Environment Variables

### Required
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_KEY` - Supabase anon key
- `SUPABASE_SERVICE_KEY` - Supabase service role key
- `JWT_SECRET` - JWT signing secret
- `OPENAI_API_KEY` - OpenAI API key for embeddings

### Optional
- `REDIS_URL` - Redis for caching
- `LOG_LEVEL` - debug, info, warn, error
- `RATE_LIMIT_WINDOW_MS` - Rate limit window
- `RATE_LIMIT_MAX_REQUESTS` - Max requests per window
- `ENABLE_METRICS` - Enable Prometheus metrics

---

## Recent Changes (from git log)

| Commit | Description |
|--------|-------------|
| f819640 | plugin update |
| 3798869 | feat: update project configuration and enhance API request handling |
| 4fe7494 | update cli and repl |
| 058da7a | fix(memory-client): align route fallbacks and harden cli output |
| c09162f | fix(memory): restore prefix compatibility across cli and recall-forge |

---

## Status

**Documentation Status:** Phase 2 in progress
**Last Updated:** 2026-04-30
**Next Task:** Create component documentation files
**Progress File:** `context-engineering-progress.md`
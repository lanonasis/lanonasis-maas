# LanOnasis MaaS - Project Overview

**Generated:** 2026-04-30
**Source of Truth:** `docs/context/` (this directory)
**Previous Doc:** `CLAUDE.md` (superseded)

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
| Runtime | Node.js 18+ |
| Language | TypeScript (strict) |
| API Server | Express 5.2.1 |
| Database | Supabase (PostgreSQL + pgvector) |
| Authentication | JWT, multi-tenant organizations |
| Monitoring | Prometheus metrics, Winston logging |
| Vector Embeddings | OpenAI text-embedding-ada-002 |

### Packages Published to npm
| Package | Version | Description |
|---------|---------|-------------|
| `@lanonasis/sdk` | 1.2.0 | Enterprise SDK (Memory + API Keys + MCP) |
| `@lanonasis/memory-client` | 2.2.1 | Universal (Browser/Node/React/Vue/Edge) |
| `@lanonasis/memory-sdk-standalone` | 1.1.0 | Standalone multi-agent SDK |
| `@lanonasis/claude-memory` | 0.1.0 | Claude Code cross-session memory |
| `@lanonasis/recall-forge` | 1.1.1 | OpenClaw plugin (memory + contextEngine) |
| `@lanonasis/ide-extension-core` | 1.0.0 | Shared IDE extension library |
| `@lanonasis/cli` | 3.9.15 | Command-line memory tool (memory) |

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
│  │                     @lanonasis/sdk                       │ │
│  │              @lanonasis/memory-client                    │ │
│  │            @lanonasis/memory-sdk-standalone             │ │
│  │              @lanonasis/claude-memory                   │ │
│  │               @lanonasis/recall-forge                   │ │
│  └──────────────────────────┬──────────────────────────────┘ │
│                             │                                │
│  ┌──────────────────────────▼──────────────────────────────┐ │
│  │              memory-service (API Server)                 │ │
│  │                   Express 5 + TypeScript                  │ │
│  │              JWT Auth │ Rate Limiting │ Metrics          │ │
│  └──────────────────────────┬──────────────────────────────┘ │
│                             │                                │
│  ┌──────────────────────────▼──────────────────────────────┐ │
│  │              Supabase (PostgreSQL + pgvector)            │ │
│  │         Vector Storage │ Multi-tenant RLS │ Audit        │ │
│  └──────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

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

### Main Service
```bash
npm run dev        # Development with hot reload
npm run build       # Compile TypeScript
npm start           # Production server
npm run type-check  # TypeScript checking
npm run lint        # ESLint
npm test            # Run tests
```

### Workspace (all packages)
```bash
npm run workspace:install   # Install all dependencies
npm run workspace:build      # Build all packages
npm run workspace:test       # Test all packages
npm run workspace:lint      # Lint all packages
```

### CLI Tool (from cli/ directory)
```bash
npm run dev          # Development
npm run build        # Build
memory --help        # Test after build
```

### Database
```bash
npm run db:migrate   # Apply migrations
npm run db:seed       # Seed test data
```

### Docker
```bash
docker-compose up              # Local development
docker build -t memory-service  # Build image
```

---

## API Base URL

**Development:** `http://localhost:3000`
**Staging/Production:** Configured via `SUPABASE_URL` environment variable

### Key Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/auth/oauth/authorize` | OAuth2 authorization flow |
| POST | `/auth/oauth/token` | Get OAuth2 access token |
| POST | `/api/v1/memory` | Create memory |
| GET | `/api/v1/memory` | List memories |
| POST | `/api/v1/memory/search` | Semantic search |
| GET | `/api/v1/memory/:id` | Get memory |
| PUT | `/api/v1/memory/:id` | Update memory |
| DELETE | `/api/v1/memory/:id` | Delete memory |

**Authentication**: Uses OAuth2 PKCE flow (not basic auth). All memory endpoints require `Authorization: Bearer <token>` header from OAuth token.

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
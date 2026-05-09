# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---
## True Role (as of 2026)

This app evolved from the original standalone MaaS server into the **intended public-facing
artifact warehouse** for the Lan Onasis platform. Only publishable artifacts live here:
npm packages, SDKs, CLI, IDE extensions.

**Before making this repo public, perform a separate secrets/history audit.**
Verify no leaked `.env`, internal URLs, private configs, or sensitive historical commits.
Do not claim it is safe to publish merely because this documentation says so.

### Published Artifacts

- `packages/` — npm packages including `@lanonasis/memory-sdk`, `@lanonasis/cli`, etc.
- `cli/` — `@lanonasis/cli` command-line tool
- `IDE-EXTENSIONS/` — VS Code, Cursor, Windsurf extensions

### Express Server (`src/server.ts`) — Standalone Path Only

The Express server is valid for standalone/self-hosted deployments only.
In production (`api.lanonasis.com`), intelligence routes bypass this server entirely
and go directly to Supabase Edge Functions in `apps/onasis-core`.
Do NOT add intelligence EF routes here expecting them to work in production.
For SDK/CLI methods calling intelligence features, call `api.lanonasis.com` endpoints
(which proxy to Supabase EFs) — not the local Express server.

---

## Development Commands

### Package Manager
**Use `bun`** (not npm) — this is a Bun workspace.

### Main Service
- **Development**: `bun run dev` — start Express server for standalone testing only
- **Build**: `bun run build` — build all packages
- **Test**: `bun run test` — run tests
- **Type Check**: `bun run type-check`
- **Lint**: `bun run lint`

### CLI Tool
- **Development**: `bun run dev` (from `cli/` directory)
- **Build**: `bun run build` (from `cli/` directory)
- **Test CLI**: `memory --help` after building
- **Publish**: `npm publish` (from `cli/` directory)

---

## Architecture Overview

### 1. Artifact Publishing (`packages/`, `cli/`, `IDE-EXTENSIONS/`)
- **packages/**: TypeScript packages for memory SDK, shared utilities
- **cli/**: `@lanonasis/cli` — CLI with MCP server + interactive commands
- **IDE-EXTENSIONS/**: VS Code, Cursor, Windsurf extensions (.vsix)

### 2. Express Server (`src/server.ts`) — Standalone Path Only
- **Express.js** with TypeScript for the REST API
- Valid for self-hosted/enterprise deployments
- **NOT** the production API path for intelligence or memory routes

### 3. Memory Service (`src/services/memoryService.ts`)
- Vector-based storage using OpenAI embeddings
- Semantic search with configurable similarity thresholds
- Memory types: context, project, knowledge, reference, personal, workflow

### 4. Database Layer (`src/db/schema.sql`)
- Supabase (PostgreSQL + pgvector) for vector storage
- Multi-tenant schema with organizations and users
- RLS policies for data isolation

---

## Database

The system uses Supabase (PostgreSQL + pgvector) for vector storage.
Primary project: `mxtsdg*********.supabase.co`

**Database safety: NEVER run `supabase db push` against production.**
The remote ledger has diverged from local migrations. Apply new migrations via
the Supabase MCP tool `apply_migration` or explicit reviewed SQL with operator approval.

---

## Adding New Features

| Feature Type | Where to Add |
|---|---|
| New intelligence/memory backend logic | `apps/onasis-core/supabase/functions/` (new EF) |
| New SDK methods | `packages/memory-client/src/` |
| New CLI commands | `packages/repl-cli/src/commands/` |
| New npm package | `packages/<name>/` |

**DO NOT add backend logic to `src/` expecting production routing.** The Express
server is standalone/self-hosted only — production traffic bypasses it for
intelligence routes.

---

## CLI Usage Examples

```bash
# Initialize and authenticate
memory init
memory login

# Memory operations
memory create -t "Title" -c "Content" --type context
memory search "query text" --limit 10
memory list --type project --tags "work,important"
memory get <memory-id>
memory update <memory-id> -t "New Title"
memory delete <memory-id>

# Admin operations
memory stats  # Memory statistics
memory config show  # Show configuration
```

## API Usage Examples (for SDK/CLI calling api.lanonasis.com)

All API endpoints require authentication via `Authorization: Bearer <token>` or `X-API-Key` header.

### Memory Operations
- `POST /api/v1/memories` - Create memory
- `GET /api/v1/memories` - List memories (paginated)
- `POST /api/v1/memories/search` - Semantic search
- `GET /api/v1/memories/:id` - Get specific memory
- `PUT /api/v1/memories/:id` - Update memory
- `DELETE /api/v1/memories/:id` - Delete memory

### Intelligence Operations
- `POST /api/v1/intelligence/suggest-tags` - AI-powered tag suggestions
- `POST /api/v1/intelligence/find-related` - Find related memories
- `POST /api/v1/intelligence/detect-duplicates` - Detect duplicate content

---

## Environment Variables

### Required
- `SUPABASE_URL=https://<project-ref>.supabase.co`
- `SUPABASE_KEY`: Supabase anon key
- `SUPABASE_SERVICE_KEY`: Supabase service role key
- `OPENAI_API_KEY`: OpenAI API key for embeddings

### Optional
- `REDIS_URL`: Redis for caching (optional)
- `LOG_LEVEL`: debug, info, warn, error
- `RATE_LIMIT_WINDOW_MS`: Rate limiting window
- `RATE_LIMIT_MAX_REQUESTS`: Max requests per window
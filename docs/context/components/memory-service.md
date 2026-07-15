# Memory Service - Component Context

**Package:** `@lanonasis/memory-service-maas`
**Last verified:** 2026-05-16
**Role:** standalone MaaS server and local route surface
**Production note:** not the canonical production execution path for intelligence

## Purpose

This component is the app-local Express server for standalone and self-hosted MaaS behavior.

Use it when the task involves:
- local/server route behavior under `src/routes/`
- standalone auth and middleware behavior
- local memory/intelligence/profile endpoints in this app
- local development or self-hosted deployment concerns

Do not treat it as the sole source of truth for production intelligence behavior across the platform.

## Key Files

| File | Purpose |
|------|---------|
| `src/server.ts` | standalone Express entrypoint |
| `src/config/environment.ts` | env parsing and config |
| `src/routes/memory.ts` | app-local memory routes |
| `src/routes/intelligence.ts` | app-local intelligence route surface |
| `src/routes/profiles.ts` | profile-related routes |
| `src/routes/auth-router.ts` | centralized OAuth proxy/auth discovery routes |
| `src/routes/auth-basic.ts` | basic login/register routes for standalone use |
| `src/middleware/auth-aligned.ts` | current auth, project-scope, and request middleware |
| `src/services/` | service-layer behavior |

## Boundary To Remember

### What this component owns

- standalone HTTP server behavior
- local auth and request processing behavior
- local route wiring
- app-local service composition

### What this component does not own by itself

- platform production routing truth
- all production memory/intelligence execution behavior
- shared live Supabase migration policy

Those require monorepo-level context and source.

## Authentication Reality

This server supports multiple auth-related paths for standalone usage:

- `Authorization: Bearer <token>` flows
- `X-API-Key` flows through aligned middleware
- local auth routes under `auth-basic.ts`
- centralized OAuth proxy/discovery routes under `auth-router.ts`

That does not mean this app defines the full production auth contract for the platform. For production questions, confirm against monorepo-level docs and source.

## Integration Points

| Component | Connection |
|-----------|------------|
| `cli/` | CLI can target the standalone server for local workflows |
| `packages/*` | SDKs and helpers depend on this route surface in standalone scenarios |
| `apps/onasis-core` | production platform behavior supersedes this server for intelligence concerns |
| Supabase | used for storage/auth integrations in standalone flows |

## Commands

Verified from `apps/lanonasis-maas/package.json`:

```bash
bun run dev
bun run build
bun start
bun run test
bun run lint
bun run type-check
bun run db:migrate
bun run db:seed
```

## Environment Inputs

Common standalone variables referenced by this component include:

- `SUPABASE_URL`
- `SUPABASE_KEY`
- `SUPABASE_SERVICE_KEY`
- `JWT_SECRET`
- `OPENAI_API_KEY`
- `ALLOWED_ORIGINS`

Treat these as standalone/server inputs, not a complete description of platform production secrets.

## Memory Embeddings & Search

### Embedding model

The default embedding model used by `src/services/memoryService.ts` is:

- `text-embedding-3-small` (1536-dimensional vectors)

It is overridable via environment variables:

- `OPENAI_MODEL` — model name (defaults to `text-embedding-3-small`)
- `EMBEDDING_PROVIDER` — provider key into `PROVIDER_CONFIG` (defaults to `openai`)

> **Cautions.**
> - Legacy aligned/enhanced service variants (`memoryService-aligned.ts`, `memoryService-enhanced.ts`) still hard-code `text-embedding-ada-002`. If you depend on those paths, vector dimensions and cost differ.
> - The `match_memories(...)` RPC signature below assumes `vector(1536)`. Swapping to a different embedding model requires a schema migration (`ALTER FUNCTION match_memories ... query_embedding vector(<dim>)`).

### `match_memories(...)` RPC signature

From `src/db/schema.sql`:

```sql
match_memories(
  query_embedding        vector(1536),
  match_threshold        float     DEFAULT 0.7,
  match_count            int       DEFAULT 20,
  organization_id_param  uuid      DEFAULT NULL,
  memory_types_param     memory_type[] DEFAULT NULL,
  tags_param             text[]    DEFAULT NULL,
  topic_id_param         uuid      DEFAULT NULL,
  user_id_param          uuid      DEFAULT NULL
)
RETURNS TABLE (
  id uuid, title varchar(200), content text,
  memory_type memory_type, tags text[],
  topic_id uuid, user_id uuid, organization_id uuid,
  metadata jsonb,
  created_at timestamptz, updated_at timestamptz, last_accessed timestamptz,
  access_count integer,
  relevance_score float
)
```

Notes for callers:
- `match_threshold` is a cosine-similarity floor; 0.7 is a reasonable starting point for `text-embedding-3-small`.
- `match_count` caps the returned row count.
- All filter params (`organization_id_param`, `memory_types_param`, `tags_param`, `topic_id_param`, `user_id_param`) are AND-combined with `NULL` meaning "do not filter on this dimension".
- `relevance_score` is included in the returned rows; sort by it descending on the client.

## Known Cautions

- Older docs in the repo may overstate this server's role in production.
- Older file references may point to `src/middleware/auth.ts`; current middleware lives in `src/middleware/auth-aligned.ts`.
- Older prose may describe OAuth2 PKCE as the primary truth for the whole platform; this component only exposes part of the auth picture.

## Verification Shortcuts

When in doubt, inspect:

```bash
sed -n '1,220p' src/server.ts
find src/routes -maxdepth 1 -type f | sort
find src/middleware -maxdepth 1 -type f | sort
```

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
npm run dev
npm run build
npm start
npm run test
npm run lint
npm run type-check
npm run db:migrate
npm run db:seed
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

# Lan Onasis — Artifact Warehouse & SDK Distribution

> **Intended public repository.** This repo contains published npm packages, SDK,
> CLI, and IDE extensions. The Express server (`src/server.ts`) is valid for
> standalone/self-hosted deployments only — production API traffic at `api.lanonasis.com`
> bypasses it entirely and routes directly to Supabase Edge Functions.

## Published Artifacts

| Package | Version | Description |
|---------|---------|-------------|
| `@lanonasis/cli` | 3.9.x | CLI with MCP server + interactive commands |
| `@lanonasis/mcp-core` | 1.0.0 | Production MCP server (17+ tools) |
| `@lanonasis/memory-sdk` | 1.0.0 | Memory-as-a-Service TypeScript SDK |
| `@lanonasis/ai-sdk` | 0.2.2 | Drop-in AI SDK |

## Repository Structure

```
lanonasis-maas/
├── packages/               # Published npm packages
│   ├── memory-sdk/         # @lanonasis/memory-sdk
│   ├── claude-memory/      # Claude session memory enrichment
│   └── recall-forge/       # OpenClaw plugin
├── cli/                    # @lanonasis/cli command-line tool
├── IDE-EXTENSIONS/         # VS Code, Cursor, Windsurf extensions
├── src/                    # Express server — standalone path ONLY
└── docs/                   # Context documentation
```

## Production API Path (what NOT to expect here)

Production intelligence API at `api.lanonasis.com` routes **directly to Supabase Edge Functions** in `apps/onasis-core/supabase/functions/`. The Express server in `src/` is **NOT** in the production path for memory/intelligence routes.

For SDK/CLI calling production endpoints, use `https://api.lanonasis.com` — not the local Express server.

## Development

**Package manager: bun** (not npm).

```bash
bun install              # Install dependencies
bun run build            # Build all packages
bun run dev              # Start Express server (standalone testing only)
bun test                 # Run tests
```

## Express Server — Standalone Path Only

`src/server.ts` is a valid standalone Express server for:
- Self-hosted/enterprise deployments
- Local development without cloud dependencies
- Testing SDK functionality against local endpoints

**It is NOT the production API server.** Production routes go directly to Supabase Edge Functions.

## Authentication

Production (`api.lanonasis.com`): X-API-Key with `lano_*` prefix via Supabase EFs.
Standalone (`localhost:3000`): JWT/Bearer token via Express auth middleware.

## Database

Supabase (PostgreSQL + pgvector) — same project as the platform
(`mxtsdg*********.supabase.co`). Connect via `SUPABASE_URL` env var.

**Never run `supabase db push` against production.** Use reviewed SQL or MCP tool.

## Adding New Features

| Feature | Location |
|---------|----------|
| New SDK methods | `packages/memory-sdk/src/` |
| New CLI commands | `cli/src/commands/` |
| New npm package | `packages/<name>/` |
| New backend logic | `apps/onasis-core/supabase/functions/` (EF) — NOT here |

## Status

- **Intended public repo** — perform secrets audit before publishing
- **Package manager: bun**
- **Express server: standalone/self-hosted only**
- **Production API: Supabase EFs in onasis-core**
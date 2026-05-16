# LanOnasis MaaS - Project Overview

**Last verified:** 2026-05-16
**Primary source for platform truth:** `/.devops/context-engineering/`
**Role of this document:** MaaS-specific orientation and handoff

## What This App Owns

`apps/lanonasis-maas` is best understood as a mixed workspace that contains:

- a standalone Express server in `src/`
- the published CLI in `cli/`
- published and internal packages in `packages/`
- IDE extension assets and support code
- app-local docs and release context

It is not the final source of truth for all production memory/intelligence behavior across the platform.

## Canonical Boundaries

### Production path

For production memory and intelligence behavior, the important logic lives outside this app in `apps/onasis-core/supabase/functions/`.

In practice, this means:
- production API behavior should be verified against monorepo platform docs and current source
- the standalone Express app here is not the canonical production execution path for intelligence

### Standalone path

The local/self-hosted server in `src/server.ts` still matters for:
- app-local development
- standalone/self-hosted deployments
- local auth and route behavior
- CLI and package integration testing against a local endpoint

## Current Mental Model

Use this split when reasoning about the app:

| Area | What it is |
|------|-------------|
| `src/` | Standalone MaaS server and app-local routes/services |
| `cli/` | Published CLI and MCP entrypoint packaging |
| `packages/` | SDKs, extension helpers, plugin-facing packages |
| `IDE-EXTENSIONS/` | editor integrations and packaging support |
| `docs/context/` | MaaS-specific handoff layer |

## Key Files And Folders

| Path | Why it matters |
|------|----------------|
| `src/server.ts` | standalone Express entrypoint |
| `src/routes/` | local route surface including memory, intelligence, profiles, auth, metrics |
| `src/middleware/auth-aligned.ts` | current standalone auth and request-shaping middleware |
| `src/services/` | app-local service layer |
| `cli/package.json` | current published CLI metadata and binaries |
| `package.json` | source of truth for app-local scripts |
| `packages/` | SDK/package ownership map |

## Navigation

| If you are working on... | Read... |
|--------------------------|---------|
| standalone server behavior | `components/memory-service.md` |
| CLI commands and packaging | `components/cli.md` |
| SDK/package changes | `components/sdk.md`, `components/memory-client.md`, `components/memory-sdk-standalone.md` |
| Claude/OpenClaw integrations | `components/claude-memory.md`, `components/recall-forge.md` |
| editor integration support | `components/ide-extension-core.md` and `components/ide-extensions/*.md` |
| local commands and workflows | `workflows/development.md` |

## Tooling Reality

This app contains both Bun-era and npm-era workflow traces.

For reliable execution:
- prefer the exact scripts defined in `apps/lanonasis-maas/package.json`
- treat `package.json` and package-local manifests as more trustworthy than older narrative docs
- do not assume every package follows one identical package-manager pattern

## Commands That Matter Most

These are the app-level commands verified from `apps/lanonasis-maas/package.json`:

```bash
npm run dev
npm run build
npm run test
npm run type-check
npm run lint
npm run db:migrate
npm run db:seed
```

CLI package commands verified from `apps/lanonasis-maas/cli/package.json`:

```bash
npm run build --prefix cli
npm test --prefix cli
```

## Auth Notes

Keep the distinction clear:

- standalone MaaS still has local auth-related routes and middleware
- production/platform auth contracts are broader than this app and should be validated from monorepo-level context and source
- when docs disagree, current route/middleware code wins over older prose

## Environment Notes

Common standalone environment inputs referenced by app-local code and scripts include:

- `SUPABASE_URL`
- `SUPABASE_KEY`
- `SUPABASE_SERVICE_KEY`
- `JWT_SECRET`
- `OPENAI_API_KEY`

Treat environment docs in this folder as guidance for standalone flows, not as a complete description of platform production secrets or routing.

## Known Cautions

- Older examples may still refer to `memory` as the CLI command name; current published binaries in `cli/package.json` are `onasis`, `lanonasis`, and `lanonasis-mcp`.
- Some repo text still describes auth in overly broad terms; verify against current code before making claims.
- Do not use this folder as evidence for live production routing on its own.

## Handoff Summary

This folder is now reliable for one job: getting a new session oriented around the MaaS app quickly without confusing standalone ownership with platform ownership.

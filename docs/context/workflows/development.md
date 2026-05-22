# Development Workflow

**Last verified:** 2026-05-16
**Source checked against:** `apps/lanonasis-maas/package.json`, `apps/lanonasis-maas/cli/package.json`

## Purpose

This document is the operational handoff for working inside `apps/lanonasis-maas`.
It describes the commands and workflow patterns that are actually supported by the checked-in manifests.

## Working Rules

1. Use `package.json` scripts as the source of truth.
2. Distinguish standalone MaaS work from platform production behavior.
3. When a doc command and a manifest disagree, trust the manifest.

## Repository Shape

```text
apps/lanonasis-maas/
├── src/                standalone Express server
├── cli/                published CLI and MCP entrypoint
├── packages/           SDKs and supporting packages
├── IDE-EXTENSIONS/     editor integrations
└── docs/context/       MaaS handoff docs
```

## App-Level Commands

Verified from `apps/lanonasis-maas/package.json`:

```bash
npm run dev
npm run build
npm start
npm run test
npm run test:conformance
npm run test:coverage
npm run lint
npm run type-check
npm run db:migrate
npm run db:seed
```

Useful grouped scripts:

```bash
npm run build:all
npm run publish:all
npm run workspace:install
npm run workspace:build
npm run workspace:test
npm run workspace:lint
```

## CLI Commands

Verified from `apps/lanonasis-maas/cli/package.json`:

```bash
npm run build --prefix cli
npm test --prefix cli
npm run test:coverage --prefix cli
```

Notes:
- `cli/package.json` does not define a `dev` script right now.
- Published binaries are `onasis`, `lanonasis`, and `lanonasis-mcp`.
- Older docs and examples may still refer to `memory`; treat that as historical naming drift unless the local install provides an alias.

## Typical Local Workflow

### 1. Install

```bash
npm run workspace:install
```

### 2. Set env

Use `.env` / `.env.example` for standalone work and verify the values you need before running local services.

Common standalone variables:
- `SUPABASE_URL`
- `SUPABASE_KEY`
- `SUPABASE_SERVICE_KEY`
- `JWT_SECRET`
- `OPENAI_API_KEY`

### 3. Run the standalone server

```bash
npm run dev
```

### 4. Build or test what you changed

```bash
npm run build
npm run test
```

For CLI-specific work:

```bash
npm run build --prefix cli
npm test --prefix cli
```

## Testing Guidance

Use the narrowest command that matches the change:

- standalone server behavior: `npm run test`
- MCP conformance surface: `npm run test:conformance`
- CLI behavior: `npm test --prefix cli`
- broader workspace checks: `npm run workspace:test`

## Database And Migration Safety

For standalone/local work, app-level migration scripts exist:

```bash
npm run db:migrate
npm run db:seed
```

For live platform databases:
- do not rely on this app-local workflow doc alone
- follow monorepo-level database safety rules
- never use `supabase db push` against the shared live Supabase project

## Deployment Commands

Verified from `apps/lanonasis-maas/package.json`:

```bash
npm run deploy:staging
npm run deploy:production
```

Treat these as app-local deployment helpers, not proof of the full production platform route topology.

## Troubleshooting

### Clean rebuild

```bash
npm run clean
npm run workspace:install
npm run workspace:build
```

### Port 3000 already in use

```bash
lsof -ti:3000 | xargs kill -9
```

### Verify the command surface before trusting docs

```bash
sed -n '1,240p' package.json
sed -n '1,220p' cli/package.json
```

## Handoff Note

If a future session gets conflicting signals from this folder, the intended tie-breaker is:

1. current source files
2. current package manifests
3. monorepo context in `/.devops/context-engineering/`
4. older narrative docs

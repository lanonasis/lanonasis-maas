# CLI Tool - Component Context

**Package:** `@lanonasis/cli`
**Last verified:** 2026-05-16
**Type:** published command-line interface and MCP entry packaging

## Purpose

The CLI is the user-facing command surface for memory operations, auth flows, and MCP-oriented usage.

For platform questions, separate:
- CLI packaging and command behavior owned here
- production API/platform behavior owned elsewhere in the monorepo

## Key Files

| File | Purpose |
|------|---------|
| `cli/src/index.ts` | main CLI entrypoint |
| `cli/src/commands/` | command implementations |
| `cli/src/utils/api.ts` | API client wrapper |
| `cli/src/utils/config.ts` | local config handling |
| `cli/src/mcp-server-entry.ts` | MCP entrypoint binary |
| `cli/package.json` | published metadata, scripts, and binary names |

## Current Binary Names

Verified from `cli/package.json`:

- `onasis`
- `lanonasis`
- `lanonasis-mcp`

Important drift note:
- older repo docs and code comments still sometimes use `memory`
- prefer `onasis` or `lanonasis` when documenting the currently published interface unless you have verified a local alias/wrapper

## Commands

Representative command surface in current docs/code:

- `onasis guide`
- `onasis init`
- `onasis login`
- `onasis memory create`
- `onasis memory search`
- `onasis auth status`
- `lanonasis-mcp`

## Development Commands

Verified from `cli/package.json`:

```bash
npm run build --prefix cli
npm test --prefix cli
npm run test:coverage --prefix cli
```

Notes:
- there is no `dev` script in `cli/package.json` right now
- if a doc tells you to run `npm run dev --prefix cli`, treat that as stale

## Integration Points

| Component | Connection |
|-----------|------------|
| standalone MaaS server | local testing target |
| production API | command execution target for real usage |
| `packages/*` | shared SDK and helper dependencies |
| Claude/MCP tooling | packaged through `lanonasis-mcp` entrypoint |

## Environment And Config

Common config inputs mentioned in current CLI docs/code:

- `MEMORY_API_URL`
- `MEMORY_API_KEY`
- local config storage under the user's config directory

Auth mode can vary by target environment; do not infer the entire platform auth contract from CLI docs alone.

## Known Cautions

- CLI naming has drifted over time; examples using `memory` may still exist.
- README-level guidance may be newer than this context folder for some auth examples, so check `cli/README.md` if command naming seems off.
- For endpoint/routing truth, validate against live manifests and monorepo context rather than CLI prose.

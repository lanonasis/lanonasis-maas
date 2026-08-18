---
name: lanonasis-cli
description: Use when working with the published @lanonasis/cli package, the lanonasis/onasis/memory/maas command surface, MCP server/client behavior, authentication, memory commands, prescan, published package metadata, npm release prep, or docs drift for docs.lanonasis.com/cli.
---

# LanOnasis CLI

Use this skill to work on the published `@lanonasis/cli` package and its agent-facing command surface. Prefer concrete command output over assumptions; the CLI, docs, and live service routes have drifted before.

## First checks

From the repository root:

```bash
cd cli
bun install --no-save
bun run build
node dist/index.js -h
node dist/index.js repl -h
npm pack --dry-run
```

For the companion concierge REPL:

```bash
cd packages/repl-cli
bun install --no-save
bun run build
node dist/index.js -h
node dist/index.js config
npm pack --dry-run
```

## Usage guide (agent-facing)

This is the command surface an AI agent needs to drive the published CLI. It is derived from `cli/src/index.ts` + `cli/src/commands/*`; when in doubt, run `node dist/index.js <cmd> -h` and trust that over this summary.

### Binaries

- `lanonasis` (canonical), `onasis`, `lanonasis-mcp` — actual package.json bins.
- `memory`, `maas` — commander root aliases, NOT package.json bins.

### Global options

- `-h, --help`, `-V, --version`, `-v, --verbose`
- `--api-url <url>` — override API base URL
- `--output <format>` — `table` (default) | `json` | `yaml`
- `--no-mcp` — disable MCP route, use direct API

> ⚠️ **Do NOT use `--no-mcp` for memory operations.** Verified live (2026-08-03): `--no-mcp` sets `forceDirectApi`, which forces `baseURL` to `config.getApiUrl()` → default `https://api.lanonasis.com` (the vendor AI proxy). That host returns an empty HTML page for `/api/v1/memories/<id>` → CLI error `Request failed with status code 500`. Memory ops must stay on the default MCP route → `https://mcp.lanonasis.com/api/v1/memory/<id>` (real memory service, returns JSON). Source anchor: `cli/src/utils/api.ts:638-640`.

### Top-level commands

`init`, `auth` (login/logout/status/diagnose), `mcp` (init/connect/disconnect/status/tools/call/config/server/diagnose), `memory` (alias `mem`), `repl`, `topic` (alias `topics`), `config`, `org` (alias `organization`), `api-keys` (alias `keys`), `prescan`, `completion`, `dashboard` (alias `dash`), `documentation` (alias `doc`), `sdk`, `api` (alias `rest`), `deploy` (alias `deployment`), `service` (alias `services`), `status`, `whoami`, `health` (alias `check`), `docs`.

### `memory` subcommands

- `create` (alias `add`) — `-t/--title`, `-c/--content`, `--type`, `--tags`, `--topic-id`, `-i/--interactive`, `--json <json>` (accepts title, content, type/memory_type, tags[], topic_id), `--content-file <path>`
- `save-session` — `-t/--title` (default `Session summary`), `--type` (default `project`), `--tags`, `--test-summary`
- `list-sessions` — `-p/--page`, `-l/--limit`, `--type`, `--tags`, `--sort`, `--order`
- `load-session <id>`, `delete-session <id>` (`-f/--force`)
- `list` (alias `ls`) — `-p/--page`, `-l/--limit`, `--type`, `--tags`, `--user-id`, `--sort`, `--order`
- `search <query...>` — `-l/--limit`, `--threshold`, `--type`, `--tags`, `--fallback-mode`, `--no-fallback`, `--fail-on-fallback`, `--ci`, `--json`
- `get` (alias `show`) `<id>`, `update <id>`, `delete` (alias `rm`) `<id>`
- `stats`
- `intelligence` — `health`, `suggest-tags <memory-id>`, `related <memory-id>`, `detect-duplicates` (shared: `--organization-id`, `--topic-id`, `--scope`, `--json`)

### Field naming contract (`memory_type` vs `type`)

- Wire format is **`memory_type`** everywhere the CLI talks to MaaS: REST client `cli/src/utils/api.ts`, server schema `src/types/memory-aligned.ts`, CLI MCP server `cli/src/mcp/server/lanonasis-server.ts`, mem-intel-sdk MCP server.
- `type` is accepted as an **alias only by the Supabase Edge Function layer**: `memory-create` (`body.memory_type || body.type`) and `memory-search` (`url.searchParams.get("type")`).
- The CLI `--type` flag / `--json '{"type": ...}'` input is coerced to `memory_type` before send (`cli/src/commands/memory.ts:681-690`).
- Search rows may come back with `type`; the CLI normalizes to `memory_type` (`cli/src/commands/memory.ts:1170`).

## Package boundaries

- Main CLI package: `cli/`, published as `@lanonasis/cli`.
- Main binaries: `lanonasis`, `onasis`, `lanonasis-mcp`.
- Concierge REPL package: `packages/repl-cli/`, published as `@lanonasis/repl-cli`.
- REPL binaries: `lrepl`, `onasis-repl`.
- `lanonasis repl` should bridge into `@lanonasis/repl-cli`, preserving REPL-specific options such as `--ai-router`, `--model`, and `--config`.
- Do not collapse the REPL into generic MCP behavior unless the MCP tool contract is explicitly implemented and tested.

## Preferred verification

Run focused checks for the area changed, then publish-shape checks:

```bash
cd cli
bun run build
node --experimental-vm-modules node_modules/jest/bin/jest.js tests/cli-smoke.test.js --runInBand
npm pack --dry-run

cd ../packages/repl-cli
bun run type-check
bun run test
bun run build
npm pack --dry-run
```

For live CLI/doc audits, compare:

```bash
lanonasis -h
lanonasis repl -h
lrepl -h
lrepl config
```

against:

- `cli/README.md`
- `cli/CHANGELOG.md`
- `packages/repl-cli/README.md`
- `packages/repl-cli/CLI_COMMANDS.md`
- `packages/repl-cli/CHANGELOG.md`
- `https://docs.lanonasis.com/cli/reference`
- `https://docs.lanonasis.com/changelog`

## Release rules

- Patch bump for bridge fixes, metadata corrections, docs updates, and non-breaking command additions.
- Publish `@lanonasis/repl-cli` before `@lanonasis/cli` when the main CLI references a new REPL version.
- Keep `dist/` updated for `@lanonasis/cli`; its package ships built files.
- Include `SKILL.md` in package `files` when changing the published skill.
- Confirm `npm pack --dry-run --json` includes every intended publish artifact and excludes tests and internal docs.

## Drift hotspots

Check these first during audits:

- README version badge/text versus `package.json`.
- Live docs version references versus package versions.
- `lanonasis repl` bridge options versus `lrepl start` options.
- API key command routes versus server mounts in `src/server.ts`.
- MCP docs versus `cli/src/commands/mcp.ts` and `cli/src/mcp/server/lanonasis-server.ts`.
- Prescan docs versus `cli/src/commands/prescan.ts` and bundled `@lanonasis/secret-prescan`.
- Auth examples versus `cli/src/commands/auth.ts` and `cli/src/utils/config.ts`.
- Global installed binaries versus local `dist/` output; do not treat stale global installs as source of truth.
- `--no-mcp` + memory commands: memory ops are never routed to `api.lanonasis.com` (vendor AI proxy → 500); they always stay on `mcp.lanonasis.com` (memory service), even under `--no-mcp` / `forceApi`. `--no-mcp` only affects non-memory endpoints. Do not document `--no-mcp` as a memory-command escape hatch.
- `memory_type` vs `type`: wire format is `memory_type`; `type` is an alias only on the Supabase EF layer. The CLI sends BOTH `memory_type` and `type` on create/update/list so the deployed gateway (which persists via `type`) and the MaaS schema (which reads `memory_type`) both apply the value. Do not send `type` INSTEAD of `memory_type`.

## Safety

- Never print raw vendor keys, tokens, API keys, or prescan findings.
- Prefer value-stripped reports for security/prescan work.
- If a live endpoint check is needed, state the endpoint and avoid destructive commands unless the user explicitly asks.
- Treat docs tests and smoke tests as evidence of a slice, not proof of full end-to-end reliability.

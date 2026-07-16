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

## Safety

- Never print raw vendor keys, tokens, API keys, or prescan findings.
- Prefer value-stripped reports for security/prescan work.
- If a live endpoint check is needed, state the endpoint and avoid destructive commands unless the user explicitly asks.
- Treat docs tests and smoke tests as evidence of a slice, not proof of full end-to-end reliability.

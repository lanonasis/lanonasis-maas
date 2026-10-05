# LanOnasis CLI — maintainer notes

**Repo-only. Deliberately NOT published to npm** — this file is absent from `package.json` `"files"`, because a maintainer working in the monorepo and an agent that installed `@lanonasis/cli` need different things, and shipping monorepo paths to npm consumers is misleading.

Operator-facing guide (shipped in the package): [`SKILL.md`](./SKILL.md).

## 1. Repo paths

The main CLI package lives at `cli/`; the Concierge REPL package lives at `packages/repl-cli/`. Run each command block below from the repository root.

```bash
cd cli
bun install --no-save
bun run build
node dist/index.js -h
node dist/index.js repl -h
npm pack --dry-run

```

```bash
cd packages/repl-cli
bun install --no-save
bun run build
node dist/index.js -h
node dist/index.js config
npm pack --dry-run
```

## 2. Package boundaries

- Main CLI package: `cli/`, published as `@lanonasis/cli`.
- Main binaries: `lanonasis`, `onasis`, `lanonasis-mcp`.
- Concierge REPL package: `packages/repl-cli/`, published as `@lanonasis/repl-cli`.
- REPL binaries: `lrepl`, `onasis-repl`.
- `lanonasis repl` bridges into `@lanonasis/repl-cli`, preserving `--ai-router`, `--model`, `--config`, `--token`, `--api`, `--mcp`.
- Do not collapse the REPL into generic MCP behavior unless the MCP tool contract is explicitly implemented and tested.

## 3. Preferred verification

Run each command block from the repository root.

```bash
cd cli
bun run build
node --experimental-vm-modules node_modules/jest/bin/jest.js tests/cli-smoke.test.js --runInBand
npm pack --dry-run --json

```

```bash
cd packages/repl-cli
bun run type-check && bun run test && bun run build && npm pack --dry-run
```

Live CLI/doc audits — compare output against:

- `cli/README.md`, `cli/CHANGELOG.md`
- `packages/repl-cli/README.md`, `CLI_COMMANDS.md`, `CHANGELOG.md`
- `https://docs.lanonasis.com/cli/reference`, `https://docs.lanonasis.com/changelog`

## 4. Release rules

- Patch bump for bridge fixes, metadata corrections, docs updates, non-breaking command additions.
- Publish `@lanonasis/repl-cli` **before** `@lanonasis/cli` when the main CLI references a new REPL version.
- Keep `dist/` updated — `@lanonasis/cli` ships built files.
- `SKILL.md` ships and must stay consumer-shaped (no monorepo paths, no release gating). `MAINTAINER.md` stays out of `"files"`.
- Confirm `npm pack --dry-run --json` includes every intended artifact and excludes tests and internal docs.

## 5. Drift hotspots

Check these first during audits:

- README version badge/text vs `package.json`.
- Live docs version references vs package versions.
- `lanonasis repl` bridge options vs `lrepl start` options.
- API key command routes vs server mounts in `src/server.ts`.
- MCP docs vs `cli/src/commands/mcp.ts` and `cli/src/mcp/server/lanonasis-server.ts`.
- Prescan docs vs `cli/src/commands/prescan.ts` and bundled `@lanonasis/secret-prescan`.
- Auth examples vs `cli/src/commands/auth.ts` and `cli/src/utils/config.ts`.
- Global installed binaries vs local `dist/` — never treat a stale global install as source of truth.
- Global flags: `-v/--version` vs `-V/--verbose` (previously documented inverted in both README and SKILL.md).
- `memory intelligence` subcommand names and the `memory behavior` group (previously misdocumented).
- Route-dependent memory results (`--no-mcp` vs MCP) — re-measure the totals before citing them.
- Headless noise on stdout (dotenv banner, keytar fallback) vs any doc claiming clean machine-readable output.
- `memory list --type` is a silent no-op on both routes (open defect, 2026-09-30).
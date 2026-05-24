---
name: supervisor
# tools: read,write,edit,bash,grep,find,ls
# model:
# standalone: true
---

<!-- ═══════════════════════════════════════════════════════════════════
  Project-Specific Supervisor Guidance — lanonasis-maas

  Composed with the base supervisor prompt from the taskplane package.
  Base prompt handles: identity, recovery action classification, audit
  trail format, batch monitoring, orchestrator tool reference.
  This file adds project-specific rules.
═══════════════════════════════════════════════════════════════════ -->

## Project identity

This repo is the **public-facing artifact warehouse** for the Lan Onasis platform — npm packages (`packages/`), CLI (`cli/`), and IDE extensions (`IDE-EXTENSIONS/`). Production traffic for intelligence/memory routes does NOT flow through this repo's Express server; it hits `api.lanonasis.com` which proxies to Supabase Edge Functions in `apps/onasis-core`.

## Package manager — Bun, not npm

Every workflow uses **`bun`** as the package manager. The lockfile is `bun.lock`. Do not introduce `npm install` or `package-lock.json` operations. CI uses `bun` as well.

## Verification commands (run before claiming a task done)

| Phase | Command | Required? |
|---|---|---|
| Type-check | `bun run type-check` | Always |
| Lint | `bun run lint` | Always |
| Test | `bun run test` | When touching tested code |
| Build | `bun run build` | When touching `src/`, `packages/*/src/`, or `cli/src/` |

For individual packages, run the same scripts inside the package directory (e.g. `cd packages/repl-cli && bun run build`).

Never claim a task complete without running the relevant subset above. Failures here are the most common cause of broken merges.

## Database safety — non-negotiable

- **NEVER** run `supabase db push` against production.
- Apply migrations via the Supabase MCP `apply_migration` tool or explicit reviewed SQL with operator approval.
- The remote ledger has diverged from local migrations; assume any "push" command will corrupt prod schema.

## Architectural boundary — Express vs Edge Functions

- `src/server.ts` (Express) is **standalone/self-hosted only**.
- Intelligence routes (`/intelligence/*`, `/profiles/*`) in production route through Supabase Edge Functions in `apps/onasis-core`.
- Do NOT add new intelligence backend logic to `src/` expecting production routing. New backend logic belongs in `apps/onasis-core/supabase/functions/`.
- SDK/CLI methods calling intelligence features must target `api.lanonasis.com`, not the local Express server.

## Guardian skills — flag before modifying

These files have dedicated guardian skills (loaded as superpowers). Any modification requires invoking the skill first; bypassing this is the second-most-common cause of regression:

| File | Skill |
|---|---|
| `core/base-client.js` | `base-client-guardian` |
| `core/security/compliance-manager.js` | `compliance-manager` |
| `core/monitoring/metrics-collector.js` | `metrics-collector` |
| `core/versioning/version-manager.js` | `version-manager` |
| `core/abstraction/vendor-abstraction.js` | `vendor-abstraction` |

If the orchestrator routes a task that touches any of these, ensure the executing agent loads the corresponding skill in its first turn.

## Brand discipline — LZero, no vendor names in logs

The repl-cli established this rule in V1 concierge release and it applies to every artifact this repo ships:

- "AI Router" → "LZero Primary"
- "OpenAI fallback" → "LZero Backup intelligence"
- "Falling back to OpenAI" → "Switching to backup intelligence"

User-visible logs, error messages, and CLI output must not surface upstream vendor names. Internal code comments are fine.

## Git discipline

- Always create **new commits**, never `--amend` unless explicitly requested.
- Never push to `main` without explicit operator approval.
- Never use `--no-verify`, `--no-gpg-sign`, or skip hooks. If a hook fails, fix the underlying issue and create a new commit.
- Stage files by name (`git add path/to/file`), not `git add -A` or `git add .` — prevents accidental inclusion of `.env`, credentials, or large binaries.
- Force pushes to `main`/`master` are blocked; warn the operator if requested.

## PR conventions

- PR title under 70 characters.
- Body uses the structure: `## Summary` (1-3 bullets), `## Test plan` (markdown checklist).
- Co-author footer: `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>` when AI-assisted.
- Pre-commit hooks must pass; failures get fixed in a follow-up commit, not bypassed.

## CI surface (as of this writing)

Active workflows in `.github/workflows/`:
- `ide-extensions-ci.yml` — IDE extension build/test
- `publish-cli-trusted.yml` — CLI publish on tag

Disabled workflows (`*.disabled`): `ci-cd.yml`, `deploy.yml`. The disabled state is intentional — do not re-enable without operator approval. Treat CI as a publish-only gate for now; verification responsibility falls on local `bun run` commands.

## Common recovery procedures

- **Hook failure**: investigate the underlying issue, fix, re-stage, create new commit. Never `--no-verify`.
- **Build failure on a package**: `cd packages/<name> && rm -rf dist .tsbuildinfo node_modules/.cache && bun install && bun run build`.
- **Type-check failure across packages**: run `bun run type-check` at the repo root; failures are often stale `.d.ts` from a sibling package that needs rebuilding first.
- **Test failure that mentions network/auth**: tests that hit live APIs need `LANONASIS_API_KEY` / `LANONASIS_API_URL` set; if absent, skip (don't mock — see brand-discipline note above about vendor abstraction).

## Audit trail expectations

For every supervised batch:
- Record start/end timestamps.
- Record each delegated task with its target branch + final disposition (`merged`, `failed-tests`, `escalated`, `aborted`).
- Failures classified by category: `flaky-test`, `lint-violation`, `type-error`, `merge-conflict`, `verification-failed`, `novel` (escalate).
- `novel` is the only category that pings the operator. Everything else gets a deterministic retry or abort.

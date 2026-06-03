# Context Engineering Progress

**Project:** LanOnasis MaaS context pack
**Started:** 2026-04-30
**Last verified:** 2026-05-26
**Status:** Handoff pack updated to match post-reorganization workspace reality

## Start Here

Use this folder as the MaaS-specific handoff layer, not as the ultimate source of platform truth.

Reading order for a new session:
1. `/.devops/context-engineering/` for platform architecture and deployment truth
2. `docs/context/project-overview.md` for MaaS-specific orientation
3. relevant file under `docs/context/components/`
4. `docs/context/workflows/development.md` for commands and local workflows

## Current Truth

The following points are the assumptions this handoff pack is built on (verified 2026-05-26):

1. `lanonasis-maas` (now at `Projects-Lanonasis/maas/lanonasis-maas/`) is the standalone/self-hosted service, SDK, CLI, and extension workspace.
2. Production memory and intelligence behavior is platform-owned — but `apps/onasis-core/` does NOT exist in this repo. Only `apps/mcp-core/` is present here.
3. The standalone Express server in `src/server.ts` still matters for local/self-hosted flows.
4. Production auth expectations are platform-owned; standalone MaaS still contains local auth surfaces.
5. Commands in this folder should follow the checked-in `package.json` scripts — prefer `bun` over `npm`.
6. Skill packages path moved: old `~/projects/packages/` → new `~/Projects-Lanonasis/packages/packages/`.
7. The `Docs/VISION-CONTINUITY-INTELLIGENCE.md` symlink in root `Docs/` points to the actual file at `docs/context/VISION-CONTINUITY-INTELLIGENCE.md` in this repo (symlink target was corrected).

## What Was Cleaned Up On 2026-05-16

- Removed stale "next step" and phase-in-progress language that no longer matched the folder state.
- Reframed the pack around handoff reliability instead of historical progress tracking.
- Aligned overview, workflow, and memory-service docs to current file paths and current standalone-vs-production responsibilities.
- Preserved important cautions without repeating superseded architecture claims inline.

## What Was Updated On 2026-05-26

- Post-reorganization path fixes: workspace moved from `~/projects/` to `~/Projects-Lanonasis/`.
- Package inventory table added to `project-overview.md` with verified names + versions.
- Removed false claim that `apps/onasis-core/` exists in this repo (only `apps/mcp-core/` is here).
- Fixed command runner docs to prefer `bun` (this is a Bun workspace).
- Added Paperclip org context and current active issue (PER-3) to overview navigation.
- Corrected stale config paths: `~/.claude/CLAUDE.md`, `kilo.json`, `blackbox_mcp_settings.json`.

## Recommended Use

Use this folder when the task is specifically about:
- the standalone MaaS server
- the MaaS CLI
- MaaS packages under `packages/`
- MaaS IDE extension support
- app-local documentation and release context

Do not use this folder alone when the task depends on:
- live production routing
- Supabase Edge Function behavior
- platform auth contracts
- shared monorepo deployment decisions

For those, go back to `/.devops/context-engineering/` and current source.

## Known Drift Risks

These are still worth sanity-checking during implementation:

- Some older app-local docs and code comments still use older command names such as `memory`.
- Some standalone auth language in the repo reflects local JWT/session flows, while production auth is enforced elsewhere.
- The repo contains both Bun and npm-era workflow artifacts; rely on current `package.json` scripts, not broad toolchain slogans.

## Next Useful Documentation Work

If we keep improving this handoff pack, the highest-value next steps are:

1. Add `components/mcp-core.md` — `apps/mcp-core/` has no component doc yet.
2. Normalize CLI naming guidance across app-local docs and README examples (some still say `memory`).
3. Add one compact map of package ownership for `cli/`, `src/`, and `packages/*`.
4. Add a `components/repl-cli.md` doc — `@lanonasis/repl-cli` v1.0.0 is now a first-class CLI package.
5. Verify and update `workflows/development.md` to match actual `bun`-first workflow.

## Historical Note

Earlier versions of this folder overstated the role of the standalone Express server in production, mixed current truth with superseded assumptions, and left completed tasks listed as future work. This file now acts as a current-state handoff note instead of a build log.

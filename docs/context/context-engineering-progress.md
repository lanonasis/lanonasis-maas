# Context Engineering Progress

**Project:** LanOnasis MaaS context pack
**Started:** 2026-04-30
**Last verified:** 2026-05-16
**Status:** Handoff pack stabilized and aligned to monorepo truth

## Start Here

Use this folder as the MaaS-specific handoff layer, not as the ultimate source of platform truth.

Reading order for a new session:
1. `/.devops/context-engineering/` for platform architecture and deployment truth
2. `docs/context/project-overview.md` for MaaS-specific orientation
3. relevant file under `docs/context/components/`
4. `docs/context/workflows/development.md` for commands and local workflows

## Current Truth

The following points are the assumptions this handoff pack is built on:

1. `apps/lanonasis-maas` is primarily a standalone/self-hosted service, SDK, CLI, and extension workspace.
2. Production memory and intelligence behavior is platform-owned and runs through `apps/onasis-core/supabase/functions/`.
3. The standalone Express server in `src/server.ts` still matters for local/self-hosted flows, but it is not the canonical production path for intelligence.
4. Production auth expectations are platform-owned; standalone MaaS still contains local auth surfaces and middleware for direct/self-hosted use.
5. Commands in this folder should follow the checked-in `package.json` scripts before any narrative doc text.

## What Was Cleaned Up On 2026-05-16

- Removed stale "next step" and phase-in-progress language that no longer matched the folder state.
- Reframed the pack around handoff reliability instead of historical progress tracking.
- Aligned overview, workflow, and memory-service docs to current file paths and current standalone-vs-production responsibilities.
- Preserved important cautions without repeating superseded architecture claims inline.

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

1. add a short "verified against source on <date>" footer to the remaining component docs
2. normalize CLI naming guidance across app-local docs and README examples
3. add one compact map of package ownership for `cli/`, `src/`, and `packages/*`

## Historical Note

Earlier versions of this folder overstated the role of the standalone Express server in production, mixed current truth with superseded assumptions, and left completed tasks listed as future work. This file now acts as a current-state handoff note instead of a build log.

# Discovered Issues — TODO (found during TestSprite coverage planning, 2026-06-21)

These were found while drafting test coverage for `apps/lanonasis-maas` against
production (`api.lanonasis.com`) and `mcp.lanonasis.com`). None of these were
visible except by attempting real runtime usage — that's the point of this
list: track them for resolution, and keep the corresponding TestSprite tests
in the suite (asserting the *correct* behavior) so they stay red until fixed,
rather than quietly excluding them.

## First real CI run results (2026-06-22)

`production-smoke-test.yml` confirmed working end-to-end after fixing a
submodule pointer issue (see below): checkout, install, and the contract
suite all ran against live production from GitHub Actions. **23 passed /
31 failed of 54** -- real signal, not a broken pipeline. Run:
https://github.com/thefixer3x/lan-onasis-monorepo/actions/runs/27923367955

- Matches already-tracked gaps exactly (no new info): H-02/H-03,
  I-02/I-03/I-01/I-05, MT-01/02/03, S-01/03/04/05/06, O-01.
- B-02/B-03/B-04 failures are a cascade of the known B-01 gap (no
  `/register` endpoint -> no real user -> login/refresh/logout can't
  succeed). Not a separate bug.
- B-05 got 429 (rate-limited) -- the suite was run 4+ times within an hour
  while debugging; auth-gateway's rate limiter is sensitive. Won't recur
  under the normal 6h schedule; not a real signal from this run.
- Several `intelligence-real.test.ts` tests (find-related, predictive-
  recall, intelligence/memories, behavior-record, behavior-suggest) got
  inconsistent 401/403/404 here despite passing cleanly in an earlier
  local run minutes before -- most likely the same rate-limiting noise.
  **Re-check once isolated from repeated runs** (e.g. via the next natural
  scheduled run) before treating any of these as real bugs.
- **New, needs follow-up:**
  - `M-11` (`/memories/admin/stats`) — **RESOLVED 2026-06-22**: route doesn't exist on
    production; requests fall through to the HTML landing page catchall (200).
    Test updated to `it.skip` pending implementation.
  - `O-08` (revoke without auth) — **RESOLVED 2026-06-22**: returns 403, not 401.
    Correct behavior confirmed; test updated to expect 403. Minor docs mismatch.
  - `P-01`/`P-03` (profile get/ask for self) — **RESOLVED 2026-06-22**: routes don't exist
    on production at `/api/v1/profile/*`. These are genuine missing routes, not empty-state.
    Profile feature needs to be implemented or marked self-hosted only.
  - `M-10` (bulk delete) — **RESOLVED 2026-06-22**: test was using wrong path
    (`/api/v1/memories/bulk/delete`). Actual working path is `/memories/bulk/delete`.
    Test updated with comment and explanation.

## Submodule pointer bug (fixed 2026-06-22)

`packages/memory-intelligence-engine`'s gitlink pointed at commit
`8e9c7825c190f4a5320b6652ed855b233c33f287`, which existed only in a local
working copy and was never pushed to
`github.com/lanonasis/memory-intelligence-engine`. This broke
`actions/checkout@v4`'s `submodules: recursive` step for **every** workflow
on the monorepo (confirmed via `nx-ci-test.yml`'s last several runs failing
identically, including ones from before this session's changes) --
`git fetch` for that exact commit failed with "not our ref." **Fixed** by
pushing the missing commit (`git push origin HEAD:main` from inside the
submodule). Root cause of how it got into this state wasn't investigated
further -- likely an automated submodule-pointer-bump commit ran against a
local working copy before that copy's own commit was pushed.

## Real production route map — Basic Auth / OAuth / API Keys / MCP Sessions (2026-06-22)

Found while running the new `apps/onasis-core/tests/contract/` Vitest suite
for the first time: most of the PRD's Basic Auth / OAuth / API Key / MCP
Session paths 404 on production. Root-caused via source mapping (not test
fixes) — many are **genuine missing production capability**, not just wrong
paths in the tests. `apps/lanonasis-maas/src/server.ts` (the standalone
Express app the PRD describes) is **not in the production request path at
all** — production's real backing service for `/api/v1/auth/*` is
`apps/onasis-core/services/auth-gateway/` (proxied via `_redirects`).

| Capability | PRD/assumed path | Real path | Implementing file | Live on production? |
|---|---|---|---|---|
| Basic register | `/api/v1/auth/basic/register` | none | n/a | **No — genuine gap.** `auth-gateway/src/routes/auth.routes.ts` has no `/register` (only `/login`, magic-link, OTP). |
| Basic login | `/api/v1/auth/basic/login` | `/api/v1/auth/login` | `auth-gateway/src/routes/auth.routes.ts:14` | Yes, at the real path — **test path was wrong** |
| Basic refresh | `/api/v1/auth/basic/refresh` | none | n/a | **No — genuine gap.** No standalone refresh endpoint exists. |
| Basic logout | `/api/v1/auth/basic/logout` | `/api/v1/auth/logout` | `auth-gateway/src/routes/auth.routes.ts:23` | Yes, at the real path — **test path was wrong** |
| OAuth client-info | `/api/v1/auth/oauth/client-info` | none on auth-gateway (`/client-info` only exists in the bypassed maas Express app) | `apps/lanonasis-maas/src/routes/auth-router.ts:164` | **No — bypassed app only** |
| OAuth authorize | `/api/v1/auth/oauth/authorize` | `/oauth/authorize` | `auth-gateway/src/routes/oauth.routes.ts`, via `_redirects` 146-147 | Yes, at the real path — **test path was wrong** |
| OAuth device | `/api/v1/auth/oauth/device` | `/oauth/device` | `auth-gateway/src/routes/device.routes.ts` | Yes, at the real path — **test path was wrong** |
| OAuth revoke | `/api/v1/auth/oauth/revoke` | `/oauth/revoke` | `auth-gateway/src/routes/oauth.routes.ts` | Yes, at the real path — **test path was wrong** |
| API key projects | `/api/v1/api-keys/projects` | `/api/v1/projects` (separate resource) | `auth-gateway/src/routes/projects.routes.ts` | Yes, at the real path — **test path was wrong** |
| API key CRUD | `/api/v1/api-keys/*` | matches | `auth-gateway/src/routes/api-keys.routes.ts`, `_redirects` 92-93 | Yes — path was correct |
| API key analytics (usage, security-events) | `/api/v1/api-keys/analytics/*` | none | n/a | **No — genuine gap.** No analytics routes anywhere in auth-gateway. |
| API key MCP tool grants | `/api/v1/api-keys/mcp/tools` | none on auth-gateway | `apps/lanonasis-maas/src/routes/api-keys.ts:770,826` | **No — bypassed app only** |
| MCP session request-access/status/proxy-token/resolve/end | `/api/v1/mcp/api-keys/*` | none | `apps/lanonasis-maas/src/routes/mcp-api-keys.ts` (bypassed) | **No — bypassed app only; auth-gateway's `mcp.routes.ts` only has `/mcp/auth` and `/mcp/health`** |

**Next step:** fix the contract test paths that were simply wrong (login,
logout, oauth authorize/device/revoke, projects). For the genuine gaps
(register, refresh, analytics, MCP tool grants, MCP session lifecycle),
keep the tests asserting documented behavior (red on purpose) and decide:
port these into `auth-gateway/src/routes/` (extend `auth.routes.ts`, add an
`analytics.routes.ts`, expand `mcp.routes.ts`) or as new Edge Functions, or
correct the PRD to mark them self-hosted-only like Intelligence/Metrics.

## BLOCKING — TestSprite backend execution itself appears broken (2026-06-22)

- [ ] **Backend test runs report `"passed"` regardless of actual assertion
      outcome.** A test asserting `False` (guaranteed failure) reported
      `"status": "passed"` three separate times. `H-02` (`GET
      /api/v1/health/ready`, confirmed 404 via direct curl run moments
      apart) also reported `"passed"` against an `assert r.status_code ==
      200`.
      **Evidence this isn't real execution:** a clean before/after credit
      check (`testsprite usage`) showed a run consumed only **0.2 of the
      stated 2 credits/run** (~10%) — consistent with the sandbox starting
      and bailing out early rather than completing a real Python execution
      that imports `requests` and makes HTTP calls. `startedAt` is always
      `null`; `finishedAt` lands 165–400ms after `createdAt`, too fast for
      a real cloud sandbox spin-up.
      **Status:** every "passed" result obtained via the CLI today —
      including the original health-check test created earlier in this
      session — should be treated as **unverified**, not confirmed-correct.
      Test *creation* was completed for Wave 0 (26 scripts at
      `/tmp/ts_*.py` — not in this repo, never committed, ephemeral), but
      only 4 were actually submitted before this was caught; the rest were
      paused.
      **Confirmed independently via the web dashboard (2026-06-22):** the
      dashboard shows the same 6 tests (the original health-check test +
      H-01 + H-02 + 3 sanity-fail tests) as **"6/6 executable tests
      passed, no failures or blocked"** — including the 3 tests that
      `assert False` unconditionally. This rules out a CLI-only display
      bug; the platform itself is recording/aggregating the wrong verdict.
      The dashboard's own AI summary explicitly concluded "no evidence of
      broken routes, auth issues, or schema drift" based on this false
      signal — which would have been actively misleading if treated as a
      real health signal for H-02 (the `/health/ready` 404 is real,
      confirmed via direct curl moments before and after the test run).
      **Reported to TestSprite support (2026-06-22)** — full report at
      `testsprite_support_report_draft.md`, with the 3 test IDs, the credit
      anomaly, and the dashboard corroboration.
      **Support response confirms this is a genuine defect, not a
      misunderstanding of documented behavior:** per their own status model
      (`passed` = ran + every assertion held; `failed` = ran + an assertion
      did not hold; `blocked` = rejected before a verdict), there is no
      documented path from "assertion evaluated to False" to "passed." They
      do not have a CLI/dashboard view exposing raw execution logs for
      *passed* runs, so they're escalating to check backend execution logs
      for the reported test IDs directly.
      **Status: waiting on TestSprite's internal log review.** Do not
      resume backend test creation for this project until they confirm
      execution is working correctly, or provide a workaround.

## Fixed this session

- [x] **`api-gateway.js` syntax break** (Netlify Function, `/api/*` catchall) —
      502 on `/api/v1/services` and others. Root cause: commit `cbb8103c`
      (2026-02-04 secret-scrub) stripped trailing punctuation along with the
      leaked secret values it correctly removed. Fixed, deployed, verified live.
      Commit: `66aef3c` (apps/onasis-core).
- [x] **`auth-health.js` same corruption pattern** — fixed in the same commit.
- [x] **`auth-verify.js`, `cli-auth.js` same corruption pattern** — dead code
      (not in current `_redirects`) but fixed for consistency. Commit: `8b70c9e`.

## Open — needs resolution

- [ ] **`memory-list` Edge Function deployed without `--no-verify-jwt`.**
      Root cause (confirmed via subagent investigation, source-code level):
      Supabase's platform-level JWT gate intercepts `Authorization: Bearer
      lano_*` and rejects it as `UNAUTHORIZED_INVALID_JWT_FORMAT` *before*
      `_shared/auth.ts`'s correct `lano_*`-aware logic ever runs. `X-API-Key`
      bypasses the gate entirely (different header, not inspected by
      Supabase's own JWT check), which is why it works.
      **Fix:** redeploy `memory-list` (and audit the rest of the memory EF
      suite) via `./scripts/deploy-memory-edge-suite.sh` with `--no-verify-jwt`.
      **Also:** `scripts/verify-memory-edge-auth.sh` only tests `X-API-Key`,
      never `Authorization: Bearer` — patch it to test both, so this class of
      regression doesn't go undetected again.
      Documented failure class: `apps/onasis-core/docs/supabase-api/MEMORY_EDGE_AUTH_DEPLOYMENT.md`.

- [ ] **`GET /api/v1/services` returns 404 — route not registered.**
      Separate from the syntax-crash bug (which is fixed; the function now
      loads and returns a clean 404 instead of crashing). The 2026-06-07
      MCP-tool test report listed this as a passing "true positive happy
      path," but the route doesn't exist in the current `api-gateway.js`'s
      routing table at all. Either the route was removed at some point after
      that report, or that report was hitting a different deployment/path.
      Needs: decide whether to re-add the route or update the PRD to drop it.

- [ ] **`GET /api/v1/health/ready` and `GET /api/v1/health/live` return 404.**
      PRD documents both (Health & Readiness feature, H-02/H-03) as real
      production routes. Neither exists on `api-gateway.js`'s routing table.
      Only the bare `/health` (no sub-path) responds. Needs: decide whether
      these were ever implemented, or the PRD is describing an aspirational/
      self-hosted-only feature that needs updating.

- [ ] **PRD's "Intelligence" feature (I-01–I-06: `jobs/:id`, `conclusions`,
      `flush`) does not exist on either `api.lanonasis.com` (REST, 404) or
      `mcp.lanonasis.com` (different protocol shape — MCP tool calls, not
      matching REST routes).** This feature is exclusively implemented in the
      self-hosted Express app (`apps/lanonasis-maas/src/`), which production
      bypasses entirely per `apps/onasis-core/CLAUDE.md`. The PRD doesn't flag
      this — it presents these routes as if they're live. Needs: either (a)
      decide this Express-app feature should be exposed in production somehow,
      or (b) correct the PRD to mark it self-hosted-only, separate from the
      real production Intelligence surface (see next item).

- [ ] **PRD doesn't document the real production Intelligence API at all.**
      16 actual Supabase Edge Functions exist under `/api/v1/intelligence/*`:
      `health-check`, `memories`, `suggest-tags`, `find-related`,
      `detect-duplicates`, `extract-insights`, `analyze-patterns`,
      `predictive-recall`, `prediction-feedback`, `behavior-record`,
      `behavior-recall`, `behavior-suggest`, plus 4 undocumented even in the
      OpenAPI spec: `ask-profile`, `reasoning-worker`, `profiles`,
      `flush-reasoning-queue`. The 3 `behavior-*` functions' OpenAPI schemas
      are `$ref`'d but never defined in `SUPABASE_REST_API_OPENAPI.yaml` —
      needs the schemas added (ground truth pulled from EF source this
      session: `intelligence-behavior-record/recall/suggest`'s `index.ts`).
      Needs: decide whether `ask-profile`/`reasoning-worker`/`profiles`/
      `flush-reasoning-queue` are public HTTP routes or internal/queue-only
      (confirm before writing tests or documenting them as public).
      Possible naming collision: `intelligence-profiles` vs.
      `apps/lanonasis-maas`'s own `/api/v1/profiles/:subject_id` — clarify
      which is canonical, or whether they're intentionally distinct.

- [ ] **PRD's "Metrics" feature (MT-01–MT-04: `/metrics`, `/metrics/json`)
      does not exist on `api.lanonasis.com`.** Both routes 404. Same
      self-hosted-Express-only pattern as Intelligence. Needs: decide if
      production should expose metrics somewhere (Prometheus scraping target?
      a different path?) or correct the PRD.

- [ ] **`/keys` vs `/api-keys` and `/memory` vs `/memories` double-mounting**
      in `apps/lanonasis-maas/src/server.ts` (lines ~285-286, ~291) — both
      pairs mount the identical router under two paths. Not a defect, but
      undocumented in the PRD. Low priority: add a parity test (both paths
      answer identically) or pick one canonical path and deprecate the alias.

## Architecture notes confirmed this session (for context, not action items)

- REST API (`api.lanonasis.com`) → mostly routed via `apps/onasis-core/_redirects`
  → Supabase Edge Functions (`/functions/v1/*`), with some Netlify Functions
  still in the mix (`netlify/functions/*.js`) per the transitional migration
  noted in `apps/onasis-core/CLAUDE.md`.
- MCP routes (`mcp.lanonasis.com`) → `mcp-core`, direct Postgres connection,
  JSON-RPC/tool-call protocol shape (not equivalent to REST routes — can't
  substitute one for the other when a feature is "missing" from REST).
- Auth: `lano_*` platform identity keys go via `X-API-Key`. `Authorization:
  Bearer` is for real JWTs (OAuth/basic-login tokens) — currently broken for
  `lano_*` keys specifically on memory routes due to the deploy-mode drift
  above, not because Bearer-for-lano_* was never supported.

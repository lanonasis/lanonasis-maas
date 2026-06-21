# Discovered Issues — TODO (found during TestSprite coverage planning, 2026-06-21)

These were found while drafting test coverage for `apps/lanonasis-maas` against
production (`api.lanonasis.com`) and `mcp.lanonasis.com`). None of these were
visible except by attempting real runtime usage — that's the point of this
list: track them for resolution, and keep the corresponding TestSprite tests
in the suite (asserting the *correct* behavior) so they stay red until fixed,
rather than quietly excluding them.

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

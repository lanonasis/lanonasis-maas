# TestSprite ↔ Local Suite Alignment Map

> Generated: 2026-08-05
> Target production URL: `https://api.lanonasis.com`
> TestSprite project: `lanonasis-maas` (`542110f0-cd9b-429b-91cc-79063664064b`)

## Critical architectural finding

`apps/lanonasis-maas/src/server.ts` is a **standalone/self-hosted Express server only**. In production, `api.lanonasis.com` is the **Onasis-CORE gateway**, which routes intelligence/memory/auth traffic directly to Supabase Edge Functions in `apps/onasis-core/supabase/functions/`.

**Consequence:** most of the MaaS Express endpoints in the original 10-TC plan do not exist on `api.lanonasis.com`. The TestSprite project has been running against the wrong target.

## Original 10 TCs — current reality

| TC | Endpoint | Exists on `api.lanonasis.com` | Local test coverage | TestSprite test status |
|---|---|---|---|---|
| TC001 | `GET /api/v1/health` | ✅ 200 | `tests/conformance/backend-contract.test.ts`, `tests/e2e/health.test.ts.skip` | ✅ `TC001 health endpoint reports ok with dependencies` |
| TC002 | `POST /api/v1/auth/oauth/token` | ❌ 404 | ❌ missing | ❌ not created — wrong target |
| TC003 | `POST /api/v1/auth/basic/login` | ❌ 404 | ❌ missing | ❌ not created — wrong target |
| TC004 | `POST /api/v1/memories` | ⚠️ 401 (auth gate) | `tests/unit/routes/memory.test.ts`, `tests/integration/memory.test.ts.skip` | ✅ covered as auth-gate test `TC-memory-gate` |
| TC005 | `GET /api/v1/intelligence/jobs/:id` | ❌ 404 | ❌ missing | ❌ not created — wrong target |
| TC006 | `GET /api/v1/profiles/:subject_id` | ❌ 404 | ❌ missing | ❌ not created — wrong target |
| TC007 | `POST /api/v1/api-keys` | ⚠️ 401 (auth gate) | ❌ missing | ✅ covered as auth-gate test `TC-apikeys-gate` |
| TC008 | `POST /api/v1/mcp/api-keys/sessions/:sessionId/keys/:keyName/proxy-token` | ❌ 404 | ❌ missing | ❌ not created — wrong target |
| TC009 | `GET /api/v1/metrics` | ❌ 404 | `tests/conformance/backend-contract.test.ts` | ❌ not created — wrong target |
| TC010 | `GET /api/v1/services` | ❌ 404 | `tests/conformance/backend-contract.test.ts` | ✅ converted to gap test `TC-ready-gap` (readiness probe 404) |

## What now exists in TestSprite (`lanonasis-maas`)

| TestSprite name | ID | Verdict | Purpose |
|---|---|---|---|
| TC001 health endpoint reports ok with dependencies | `0acdff40-8216-43ce-be0d-c15ba4c6c9e0` | passed | Smoke production health endpoint |
| TC-info info endpoint returns Onasis-CORE metadata | `46424879-d225-42d8-a830-494ce7c99314` | passed | Smoke production info endpoint |
| TC-auth-status unauthenticated request reports no identity | `672dec9f-4e30-467a-94ca-debd69651dc3` | passed | Verify auth/status behavior without creds |
| TC-memory-gate memory endpoint rejects unauthenticated requests | `5196a932-4d6a-4007-95d8-ac1b25d3526e` | passed | Verify /memory returns 401 when unauthenticated |
| TC-apikeys-gate api-keys endpoint rejects unauthenticated requests | `37b9327b-c11a-47c1-a41e-16150c5025c9` | passed | Verify /api-keys returns 401 when unauthenticated |
| TC-ready-gap readiness probe is not exposed in production | `c7f625c6-2b4e-4bad-9204-3a5215b48ae2` | passed | Documents /health/ready returns 404 on production |

Cleaned up (deleted):
- 3 bogus sanity-check tests that reported `passed` due to the old backend-execution bug.
- 2 redundant `/api/v1/health` tests (`H-01`, `API health endpoint reports ok`).

## Local suite gaps to close

High priority (no local tests at all):
1. `POST /api/v1/auth/oauth/token`
2. `POST /api/v1/auth/basic/login`
3. `GET /api/v1/intelligence/jobs/:id`
4. `GET /api/v1/profiles/:subject_id`
5. `POST /api/v1/api-keys`
6. `POST /api/v1/mcp/api-keys/sessions/:sessionId/keys/:keyName/proxy-token`

Medium priority:
7. `tests/e2e/health.test.ts.skip` — re-enable or delete.
8. `tests/integration/memory.test.ts.skip` — re-enable or delete.
9. `tests/integration/auth.test.ts` — currently tests `/api/v1/auth/login`, not `/api/v1/auth/basic/login`; align or add.

## Decision points

1. **TestSprite target**
   - *Option A — production Onasis-CORE (`api.lanonasis.com`)*: keep the current 6 smoke/auth-gate tests and add Onasis-CORE-specific endpoints (chat/completions, embeddings, models, edge functions).
   - *Option B — standalone MaaS Express*: deploy the Express server to a public URL and re-create the full 10 TC suite against it.
   - *Option C — hybrid*: keep production smoke tests in `lanonasis-maas`, create a separate TestSprite project for the standalone MaaS server.

2. **Backend auth tests**
   - Real happy-path tests for `/memory` and `/api-keys` require a valid API key or bearer token. Without seed credentials, only auth-gate (401) tests are possible.

3. **Execution verification**
   - The backend execution bug (assertions ignored, all tests reported passed) is confirmed fixed as of 2026-08-05. A deliberate `assert False` now correctly fails.

## Recommended next steps

1. Decide which target TestSprite should own (see decision point 1).
2. Close the 6 missing local test gaps above.
3. If testing standalone MaaS: deploy it somewhere public, then create the missing TestSprite backend tests.
4. If testing production Onasis-CORE: map the Supabase Edge Function endpoints and add smoke tests for them.
5. Store TestSprite test code in this repo under `testsprite_tests/backend/` so changes are version-controlled.

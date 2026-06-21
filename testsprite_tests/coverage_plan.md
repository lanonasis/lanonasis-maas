# TestSprite Backend Coverage Plan — `lanonasis-maas-backend`

**Status this plan addresses:** Use Case Flow 0, Data Flow 0, Endpoint Tests 1,
Workflows 0, Integration Tests Not Started, Cleanup Not Started.

**Scope:** CLI-driven backend (`type: backend`) tests against the Express
server described in `testsprite_tests/standard_prd.json` (9 features, ~50
endpoints). This is planning only — no `testsprite` commands were run, no
tests were created, no code/files outside this plan were touched.

---

## 0. Inputs read and how they were used

1. `testsprite_tests/standard_prd.json` — 9 features, each with `user_flows`
   (Step → Expected → Step chains) and a `code_summary` cross-reference
   (files, endpoints, `depends_on`, `known_limitations`).
2. `testsprite_tests/TC001..TC010_*.py` + `testsprite_backend_test_plan.json`
   + `testsprite-mcp-test-report.md` — prior MCP-era run (2026-06-07) against
   a **smoke environment**: server on `localhost:3000`, dummy/unreachable
   Supabase, no valid credentials. 9/10 "passed" by asserting
   *acceptable-status-and-well-formed-error-shape* (`{401,403,500,503}` +
   security headers), not real business outcomes. Only TC010
   (`GET /api/v1/services`, no auth) is a genuine happy-path pass. TC001
   "failed" only because the dummy DB is correctly reported unhealthy — not a
   product bug.
3. `.claude/skills/testsprite-verify/SKILL.md` — canonical CLI authoring
   workflow: backend tests are hand-written Python (`--code-file`), created
   one at a time (`create-batch` is FE-only), dependency chains declared at
   create time via `--produces`/`--needs` (immutable after creation —
   declarations are create-only), `teardown` category always runs last,
   `test run --all --project <id>` dispatches the full wave-ordered batch.
4. Actual route definitions: grepped `src/routes/*.ts` for every
   `router.get|post|put|delete|patch(...)` and cross-checked against
   `app.use(...)` mounts in `src/server.ts`. Confirmed `intelligence.ts` and
   `profiles.ts` route paths line-by-line (multi-line `router.get(` form
   obscured them in a flat grep).

### PRD drift found

| Finding | Detail |
|---|---|
| **No drift in covered features.** | Every endpoint listed in the PRD's `code_summary` for Health, OAuth, Basic Auth, Memory, Intelligence, Profiles, API Keys, MCP API Keys, Metrics, and Service Registry was found verbatim in the corresponding route file and is reachable via the `app.use` mounts in `src/server.ts`. No stale paths, no renamed params. |
| **Memory routes are double-mounted.** | `src/server.ts:285-286` mounts `memoryRoutes` at *both* `/api/v1/memory` and `/api/v1/memories`. The PRD only documents `/api/v1/memories`. Not a bug, but worth one explicit test asserting both mounts answer identically (low priority — see TM-09). |
| **PRD omits three whole route files that exist in code and are mounted:** | 1) `src/routes/emergency-admin.ts` → `POST /api/v1/emergency/bootstrap-admin`, `GET /api/v1/emergency/status`, conditionally mounted at `${API_PREFIX}/${API_VERSION}` only when an env flag enables it (`src/server.ts:277`). PRD's own `known_limitations` flags this as a "privileged break-glass surface; must be disabled outside controlled environments" — **do not test this without explicit operator sign-off on which environment has it enabled**; treat as out-of-scope unless requested. 2) `src/routes/sse.ts` → `GET /mcp` SSE stream (`alignedAuthMiddleware`), mounted at `app.use('/mcp', ...)`. 3) `src/routes/mcp-sse.ts` → `GET /mcp/sse`-style stream behind `authenticateApiKey`. Both are long-lived streaming connections, not request/response — TestSprite's HTTP-assertion model isn't a good fit; flagged as **out of scope for this plan**, noted for awareness only. |
| **`/api/v1/keys` alias undocumented.** | `src/server.ts:291` mounts `apiKeyRoutes` at both `/keys` and `/api-keys`. PRD only documents `/api-keys`. Same pattern as the memory alias — low-priority parity check, not a defect. |
| **`requirePlan(['pro','enterprise'])` gate on Metrics confirmed real.** | PRD flow "GET /api/v1/metrics/json for a plan without access → 403" matches `src/server.ts:295` exactly — this is a genuine 403 case to test, not speculative. |

No endpoint referenced in the PRD's 9 documented features is missing from
the code, and no documented-feature route has been renamed or removed.
Drift is purely **PRD under-documents** (3 extra route files), not stale.

---

## 1. Coverage matrix

Legend — **Existing?**: `MCP-TCxxx` = an existing TC001-10 file roughly
covers this already (smoke-only, see caveats below each); `NEW` = genuinely
new. **Pri**: p0/p1/p2/p3 per skill guidance (p0 = must-pass happy path or
core auth gate; p1 = important secondary path; p2 = edge/negative case; p3 =
cosmetic/parity). **Chain**: produces/needs vars.

### Feature: Health & Readiness

| # | Test name | Flow covered | Existing? | Pri | Chain |
|---|---|---|---|---|---|
| H-01 | `health endpoint reports overall status and dependency info` | `GET /health` → 200 + dependency info | MCP-TC001 *(smoke-only; asserted 503 due to dead DB — must be rewritten against a real env to assert 200)* | p0 | none |
| H-02 | `readiness probe reflects dependency reachability` | `GET /health/ready` → 200 when deps reachable | NEW | p1 | none |
| H-03 | `liveness probe always returns 200 regardless of dependency state` | `GET /health/live` → 200 always | NEW | p1 | none |
| H-04 | ~~readiness probe returns non-200 when a dependency is down~~ | degraded-dependency flow | **DROPPED 2026-06-21** — no fault-injection capability against production target | p2 | none |

### Feature: OAuth Authentication

| # | Test name | Flow covered | Existing? | Pri | Chain |
|---|---|---|---|---|---|
| O-01 | `oauth client-info returns public client metadata` | `GET /auth/oauth/client-info` → 200 | NEW | p1 | none |
| O-02 | `oauth authorize redirects to provider for valid request` | `GET /auth/oauth/authorize` → redirect | NEW | p1 | none |
| O-03 | `oauth authorize rejects invalid or incomplete parameters` | invalid authorize → 4xx | NEW | p2 | none |
| O-04 | `oauth token exchange succeeds with a valid authorization code` | `POST /auth/oauth/token` happy path → 200 + access_token | MCP-TC002 *(smoke-only; asserted "well-formed response/error," not an actual 200 token — needs real provider/code fixture to assert success)* | p0 | produces: `oauth_access_token` |
| O-05 | `oauth token exchange fails for expired or invalid code` | bad code → 4xx | NEW | p2 | none |
| O-06 | `device authorization flow returns verification details` | `POST /auth/device` → 200 | NEW | p1 | none |
| O-07 | `token revoke succeeds with a valid bearer token` | `POST /auth/revoke` (authed) → 200 | NEW | p1 | needs: `oauth_access_token` (or `basic_auth_token`, whichever is cheaper to mint — see note below) |
| O-08 | `token revoke without authentication is rejected` | `POST /auth/revoke` unauth → 401 | NEW | p1 | none |

> Note on O-07: revoking a token consumes it. Mint a **dedicated** token for
> this test (don't reuse the shared `auth_token` producer other suites
> depend on) so revocation doesn't starve consumers in the same wave.

### Feature: Basic Authentication

| # | Test name | Flow covered | Existing? | Pri | Chain |
|---|---|---|---|---|---|
| B-01 | `register creates a new account with valid email and password` | `POST /auth/basic/register` → 201 | NEW | p0 | produces: `registered_user_email`, `registered_user_password` |
| B-02 | `login with valid credentials returns a JWT and user object` | `POST /auth/basic/login` happy path | MCP-TC003 *(smoke-only; asserted "200/401/403," not an actual successful login — needs real seeded user)* | p0 | needs: `registered_user_email`, `registered_user_password`; produces: `basic_auth_token`, `basic_refresh_context` |
| B-03 | `refresh exchanges a valid refresh context for a new access token` | `POST /auth/basic/refresh` → 200 | NEW | p1 | needs: `basic_refresh_context`; produces: `refreshed_auth_token` |
| B-04 | `logout with bearer token invalidates the session` | `POST /auth/basic/logout` → 200 | NEW | p1 | needs: `basic_auth_token` |
| B-05 | `login with incorrect password is rejected` | wrong password → 401 | NEW | p1 | needs: `registered_user_email` |
| B-06 | `register rejects invalid email or weak password` | validation → 4xx | NEW | p2 | none |
| B-07 | `logout without bearer token is rejected` | unauth logout → 401 | NEW | p2 | none |

> **`basic_auth_token` is the primary shared producer** for every downstream
> authenticated suite (Memory, Intelligence, Profiles, API Keys, MCP,
> Metrics). All of those declare `--needs basic_auth_token` (or an API-key
> derived from it) rather than re-implementing login.

### Feature: Memory Management

| # | Test name | Flow covered | Existing? | Pri | Chain |
|---|---|---|---|---|---|
| M-01 | `memory create succeeds with valid title, content, and memory_type` | `POST /memories` happy path → 201 | MCP-TC004 *(smoke-only; got 403 INVALID_PROJECT_SCOPE — confirms the guard works, not creation; needs real project-scope header + DB)* | p0 | needs: `basic_auth_token`, `project_scope_header`; produces: `memory_id` |
| M-02 | `memory list returns a paginated list including the created memory` | `GET /memories` → 200 | NEW | p0 | needs: `basic_auth_token`, `memory_id` |
| M-03 | `memory search returns the created memory for a semantically relevant query` | `POST /memories/search` → 200 with match | NEW | p0 | needs: `basic_auth_token`, `memory_id` |
| M-04 | `memory get by id returns full details of the created memory` | `GET /memories/:id` → 200 | NEW | p0 | needs: `basic_auth_token`, `memory_id` |
| M-05 | `memory update applies field changes and returns the updated memory` | `PUT /memories/:id` → 200 | NEW | p1 | needs: `basic_auth_token`, `memory_id` |
| M-06 | `memory delete removes the memory and confirms deletion` | `DELETE /memories/:id` → 200 | NEW | p0 | needs: `basic_auth_token`, `memory_id`; category: `teardown` |
| M-07 | `memory create rejects missing required fields` | missing fields → 400 | NEW | p2 | needs: `basic_auth_token` |
| M-08 | `memory search rejects empty query or invalid limit` | invalid search → 4xx | NEW | p2 | needs: `basic_auth_token` |
| M-09 | `memory get for a non-existent id returns 404` | unknown id → 404 | NEW | p2 | needs: `basic_auth_token` |
| M-10 | `bulk delete removes a list of memory ids and reports the result` | `POST /memories/bulk/delete` → 200 | NEW | p1 | needs: `basic_auth_token`; produces own throwaway ids inline (self-contained, don't consume `memory_id` so M-04/M-05/M-06 aren't starved) |
| M-11 | `admin stats rejects a non-admin user` | `GET /memories/admin/stats` (free-plan token) → 403 | NEW | p2 | needs: `basic_auth_token` — **resolved 2026-06-21: no admin-grant path exists, so this asserts the 403 `requireRole(['admin'])` rejection, not the 200 success path** |
| M-12 *(p3, optional)* | `memory mount alias /memory and /memories serve identical responses` | undocumented dual-mount parity | NEW | p3 | needs: `basic_auth_token` |

### Feature: Intelligence

| # | Test name | Flow covered | Existing? | Pri | Chain |
|---|---|---|---|---|---|
| I-01 | `intelligence job status returns progress details for an existing job` | `GET /intelligence/jobs/:id` happy path | MCP-TC005 *(smoke-only; got auth/scope rejection, not a real job — needs a real job id fixture)* | p1 | needs: `basic_auth_token`, `job_id` — **resolved 2026-06-21: run after I-03; `flush()` is what enqueues jobs (`intelligenceService.ts:171` returns `job_ids[]`), there's no dedicated create-job endpoint** |
| I-02 | `intelligence conclusions list returns available conclusions` | `GET /intelligence/conclusions` → 200 | NEW | p1 | needs: `basic_auth_token` |
| I-03 | `intelligence flush confirms queue flush` | `POST /intelligence/flush` → 200 | NEW | p2 | needs: `basic_auth_token`; **produces: `job_id`** (first entry of returned `job_ids[]`) — run before I-01 |
| I-04 | `intelligence job status for an unknown id returns 404` | unknown job → 404 | NEW | p1 | needs: `basic_auth_token` |
| I-05 | `intelligence conclusions without bearer token is rejected` | unauth → 401 | NEW | p1 | none |
| I-06 | ~~intelligence flush failure when queue unreachable returns 5xx or error~~ | queue-down flow | **DROPPED 2026-06-21** — no fault-injection capability against production target | p3 | needs: `basic_auth_token` |

> Per the PRD's own `known_limitations`, this server's intelligence routes
> are a **self-hosted-only path** — production (`api.lanonasis.com`) bypasses
> this Express server for intelligence and routes to Supabase Edge
> Functions instead. **These tests are only meaningful against a
> self-hosted/staging deployment of this Express app, not against
> `api.lanonasis.com`.** Flag this to whoever picks `--target-url`.

### Feature: Memory Profiles

| # | Test name | Flow covered | Existing? | Pri | Chain |
|---|---|---|---|---|---|
| P-01 | `profile get returns the current subject profile` | `GET /profiles/:subject_id` happy path | MCP-TC006 *(smoke-only; auth/scope rejection, not a real profile — needs a real subject_id with data)* | p1 | needs: `basic_auth_token`, a `subject_id` with prior memory/intelligence data (likely the authenticated user's own id for the "personal subject" boundary case) |
| P-02 | `profile versions returns version history` | `GET /profiles/:subject_id/versions` → 200 | NEW | p2 | needs: `basic_auth_token`, `subject_id` |
| P-03 | `profile ask answers a natural-language question grounded in profile data` | `POST /profiles/:subject_id/ask` → 200 | NEW | p1 | needs: `basic_auth_token`, `subject_id` |
| P-04 | `profile get for an unknown subject returns 404` | unknown subject → 404 | NEW | p2 | needs: `basic_auth_token` |
| P-05 | `profile ask with empty question text is rejected` | empty question → 4xx | NEW | p2 | needs: `basic_auth_token`, `subject_id` |
| P-06 | `profile versions without bearer token is rejected` | unauth → 401 | NEW | p2 | none |

### Feature: API Key Management

| # | Test name | Flow covered | Existing? | Pri | Chain |
|---|---|---|---|---|---|
| K-01 | `project create succeeds with valid details` | `POST /api-keys/projects` → 201 | NEW | p0 | needs: `basic_auth_token`; produces: `project_id` |
| K-02 | `project list includes the created project` | `GET /api-keys/projects` → 200 | NEW | p1 | needs: `basic_auth_token`, `project_id` |
| K-03 | `api key create succeeds with a valid project association` | `POST /api-keys` happy path → 201 | MCP-TC007 *(smoke-only; got 403 INVALID_PROJECT_SCOPE — confirms guard, not creation; needs real `project_id`)* | p0 | needs: `basic_auth_token`, `project_id`; produces: `api_key_id`, `api_key_secret` |
| K-04 | `api key list includes the created key` | `GET /api-keys` → 200 | NEW | p1 | needs: `basic_auth_token`, `api_key_id` |
| K-05 | `api key get returns details for the created key` | `GET /api-keys/:keyId` → 200 | NEW | p1 | needs: `basic_auth_token`, `api_key_id` |
| K-06 | `api key update applies metadata changes` | `PUT /api-keys/:keyId` → 200 | NEW | p1 | needs: `basic_auth_token`, `api_key_id` |
| K-07 | `api key usage analytics returns metrics` | `GET /api-keys/analytics/usage` → 200 | NEW | p2 | needs: `basic_auth_token` |
| K-08 | `api key security-events analytics returns events` | `GET /api-keys/analytics/security-events` → 200 | NEW | p2 | needs: `basic_auth_token` |
| K-09 | `api key create rejects missing project context or invalid fields` | validation → 4xx | NEW | p2 | needs: `basic_auth_token` |
| K-10 | `api key delete revokes an existing key` | `DELETE /api-keys/:keyId` → 200 | NEW | p0 | needs: `basic_auth_token`, `api_key_id`; category: `teardown` |
| K-11 | `mcp tool grant succeeds and appears in the grant list` | `POST /api-keys/mcp/tools` → 200 then `GET .../mcp/tools` → 200 | NEW | p1 | needs: `basic_auth_token`, `api_key_id` |
| K-12 | `mcp request-access without authorization context is rejected` | unauth/forbidden → 401/403 | NEW | p2 | none |
| K-13 | `mcp session proxy-token issued for a valid session` | `POST /api-keys/mcp/sessions/:sessionId/proxy-token` → 200 | NEW | p1 | needs: `basic_auth_token`, a `session_id` (see MCP Sessions feature below — likely shares a producer with MK-01) |

### Feature: MCP API Keys & Proxy Tokens

| # | Test name | Flow covered | Existing? | Pri | Chain |
|---|---|---|---|---|---|
| MK-01 | `mcp request-access grants access and returns a session id` | `POST /mcp/api-keys/request-access` → 200 | NEW | p0 | needs: `basic_auth_token`; produces: `mcp_session_id` |
| MK-02 | `proxy-token issued for a named key in a session is resolvable` | `POST /mcp/api-keys/sessions/:sessionId/keys/:keyName/proxy-token` → 200 | MCP-TC008 *(smoke-only; auth/scope rejection only, no real session — needs real `mcp_session_id` + key name)* | p0 | needs: `basic_auth_token`, `mcp_session_id`, `api_key_id` (key name); produces: `proxy_token` |
| MK-03 | `proxy-token resolve returns the underlying secret or key metadata` | `POST /mcp/api-keys/proxy-tokens/:proxyToken/resolve` → 200 | NEW | p0 | needs: `basic_auth_token`, `proxy_token` |
| MK-04 | `session status reflects an active session` | `GET /mcp/api-keys/sessions/:sessionId/status` → 200 | NEW | p1 | needs: `basic_auth_token`, `mcp_session_id` |
| MK-05 | `session end terminates an active session` | `POST /mcp/api-keys/sessions/:sessionId/end` → 200 | NEW | p1 | needs: `basic_auth_token`, `mcp_session_id`; category: `teardown` |
| MK-06 | `proxy-token resolve rejects an invalid or expired token` | bad token → 4xx | NEW | p2 | needs: `basic_auth_token` |
| MK-07 | `session status without bearer token is rejected` | unauth → 401 | NEW | p2 | none |
| MK-08 | `ending an already-closed session is handled gracefully` | re-end → 4xx or 200-already-ended | NEW | p3 | needs: `basic_auth_token`, `mcp_session_id` (run strictly after MK-05 in dependency order, or use a second disposable session) |

> K-13, MK-01..MK-08 all touch the same MCP-session concept from two router
> files (`api-keys.ts` mounts a proxy-token issuance path too, separate from
> `mcp-api-keys.ts`'s session lifecycle). Treat `mcp_session_id` from MK-01
> as the **single shared producer**; K-13 should `--needs mcp_session_id`
> rather than minting its own to avoid duplicate session-creation side
> effects.

### Feature: Metrics

| # | Test name | Flow covered | Existing? | Pri | Chain |
|---|---|---|---|---|---|
| MT-01 | `prometheus metrics endpoint returns text exposition for an authorized pro/enterprise user` | `GET /metrics` happy path → 200 | MCP-TC009 *(smoke-only; accepted 200/401/403/5xx broadly — didn't confirm an actual pro-plan 200)* | p1 | needs: dev `X-API-Key` (confirmed premium-tier 2026-06-21 via a successful premium-gated Intelligence EF call) — **author to assert 200; `GET /api/v1/metrics` currently 404s in production (see discovered_issues_todo.md), so this test is expected to fail/surface that gap, not be skipped** |
| MT-02 | `metrics json endpoint returns JSON-formatted metrics for an authorized user` | `GET /metrics/json` → 200 | NEW | p1 | needs: dev `X-API-Key` — same expected-failure note as MT-01 (`/metrics/json` also 404s) |
| MT-03 | `metrics endpoint without bearer token is rejected` | unauth → 401 | NEW | p1 | none |
| MT-04 | `metrics json for a plan without access is forbidden` | free-plan user → 403 | NEW | p1 | needs: `basic_auth_token` (default/free-plan account — this is the **negative-plan-gate** case, the mirror of MT-01/02) |

### Feature: Service Registry

| # | Test name | Flow covered | Existing? | Pri | Chain |
|---|---|---|---|---|---|
| S-01 | `services list returns registered services without authentication` | `GET /services` → 200, no auth | MCP-TC010 *(genuine happy-path pass already — server live, no DB needed; can likely be reused/extended as-is rather than rewritten)* | p0 | none |
| S-02 | `services health returns aggregated downstream health` | `GET /services/health` → 200 | NEW | p1 | none |
| S-03 | `services auth/test reports auth connectivity status` | `GET /services/auth/test` → 200 | NEW | p2 | none |
| S-04 | `services mcp/test reports MCP connectivity status` | `GET /services/mcp/test` → 200 | NEW | p2 | none |
| S-05 | `services sync triggers registry synchronization for an authenticated caller` | `POST /services/sync` → 200 | NEW | p1 | needs: `basic_auth_token` |
| S-06 | `services sync without bearer token is rejected` | unauth → 401 | NEW | p2 | needs: none |
| S-07 | ~~services health reflects degraded status when a downstream dependency fails~~ | degraded flow | **DROPPED 2026-06-21** — no fault-injection capability against production target | p3 | none |

---

## 2. Totals

- **Planned tests: 54** (across 9 features)
- **Carried forward / reusable as-is:** 1 (S-01 / MCP-TC010)
- **Rewrite required (existing TC file is smoke-only, doesn't assert real success):** 8 (H-01, O-04, B-02, M-01, I-01, P-01, K-03, MK-02, MT-01) — these 9 old TC ids map to genuinely new tests above because the old assertions accept failure states as "pass"; reusing the old Python files as-is would under-test the real behavior. Treat TC001-TC009 (excluding TC010) as **reference material**, not test bodies to keep.
- **Genuinely new: 45**
- **Explicitly out of scope (flagged, not counted above):** emergency-admin routes (2 endpoints — break-glass, needs operator sign-off), `sse.ts`/`mcp-sse.ts` streaming endpoints (2 endpoints — not HTTP-assertion shaped).
- **Genuinely un-authorable, not just expected-to-fail (2026-06-21):** H-04, I-06, S-07 (3 tests) — these need an actual mechanism to *trigger* a dependency outage; there's no way to assert anything meaningful without one. Different from the next point: this isn't "the route is broken," it's "we cannot construct the precondition for this test at all" against the only target available. Revisit if a fault-injection-capable staging env becomes available.
- **Decision 2026-06-21 — create every other test, including ones expected to currently fail:** H-02, H-03, I-01–I-06 (PRD version), MT-01–MT-04 are all authored to assert the *correct* documented behavior, even though `/health/ready`, `/health/live`, the PRD's intelligence routes, and both metrics routes currently 404 in production (see `discovered_issues_todo.md`). These tests are **meant to go red and stay red** until the underlying gaps are resolved — that's the point of running this suite: surface gaps that are otherwise invisible until a real runtime failure. Do not skip or exclude them.
- **Executable (created and run) now: 51** (54 − 3 un-authorable).

This maps roughly to dashboard buckets as:
- **Endpoint Tests** ≈ every row above (54) — one `test create --type backend` per row.
- **Workflows** ≈ the producer→consumer chains within one feature (e.g. register→login→refresh→logout; project→key→grant→delete) — roughly 9 chains, one per feature section.
- **Integration Tests** ≈ cross-feature chains that span multiple features' producers (e.g. Basic Auth's `basic_auth_token` feeding Memory, Intelligence, Profiles, API Keys, MCP, Metrics, Service Registry) — this is the backbone of the whole plan, not a separate set of tests to write.
- **Cleanup** ≈ the `category: teardown` rows: M-06, K-10, MK-05 (3 explicit teardown tests), plus any test-local cleanup folded into self-contained scripts (M-10's bulk-delete is already self-cleaning).

---

## 3. Dependency graph (producers → consumers → teardown)

```
B-01 (register)
  └─produces→ registered_user_email, registered_user_password
       └─needs B-02 (login)
            └─produces→ basic_auth_token, basic_refresh_context
                 ├─needs→ B-03 (refresh) →produces→ refreshed_auth_token
                 ├─needs→ B-04 (logout)            [terminal — uses token, doesn't produce]
                 ├─needs→ B-05 (wrong password)    [uses registered_user_email only]
                 ├─needs→ M-01 (memory create) →produces→ memory_id
                 │     ├─needs→ M-02 list
                 │     ├─needs→ M-03 search
                 │     ├─needs→ M-04 get-by-id
                 │     ├─needs→ M-05 update
                 │     └─needs→ M-06 delete            [category: teardown]
                 ├─needs→ M-07..M-09, M-10, M-11, M-12  [self-contained, basic_auth_token only]
                 ├─needs→ I-03 (flush) →produces→ job_id
                 │     └─needs→ I-01 (job status, resolved 2026-06-21)
                 ├─needs→ I-02, I-04, I-05               [basic_auth_token only]
                 ├─needs→ K-01 (project create) →produces→ project_id
                 │     ├─needs→ K-02 list
                 │     └─needs→ K-03 (api key create) →produces→ api_key_id, api_key_secret
                 │           ├─needs→ K-04 list, K-05 get, K-06 update
                 │           ├─needs→ K-11 (mcp tool grant)
                 │           └─needs→ K-10 (delete)        [category: teardown]
                 ├─needs→ K-07, K-08, K-09, K-12          [basic_auth_token only]
                 ├─needs→ MK-01 (mcp request-access) →produces→ mcp_session_id
                 │     ├─needs→ K-13 (proxy-token via api-keys.ts path)
                 │     ├─needs→ MK-02 (proxy-token via mcp-api-keys.ts path; also needs api_key_id) →produces→ proxy_token
                 │     │     └─needs→ MK-03 (resolve)
                 │     ├─needs→ MK-04 (status)
                 │     ├─needs→ MK-08 (re-end check, runs after MK-05)
                 │     └─needs→ MK-05 (end)               [category: teardown]
                 ├─needs→ MK-06, MK-07                    [no real session needed]
                 ├─needs→ P-01..P-06                       [basic_auth_token + subject_id = own user id]
                 └─needs→ S-05                             [basic_auth_token]

O-04 (oauth token exchange) →produces→ oauth_access_token
  └─needs→ O-07 (revoke)                                   [dedicated token, not shared with basic_auth flow]

MT: resolved 2026-06-21 — dev `X-API-Key` confirmed premium-tier, use it directly
  for MT-01/MT-02; MT-04 needs the regular (free-plan) `basic_auth_token` from
  the B-01/B-02 chain to test the negative case properly; MT-03 needs none.
  All 4 authored normally — expect MT-01/MT-02/MT-04 to fail with 404 against
  current production (see discovered_issues_todo.md), that's the intended signal.

Independent, no auth needed at all:
  H-01, H-02, H-03, O-01, O-02, O-03, O-05, O-06, O-08, B-06, B-07,
  S-01, S-02, S-03, S-04, S-06
  (H-02, H-03 expected to fail with 404 against current production — author anyway)
  (H-04, S-07 genuinely un-authorable — no fault-injection mechanism exists; excluded)
```

---

## 4. Suggested creation & execution order (waves)

Create tests in this order so each producer exists before its consumers
reference it via `--needs` (the CLI's wave engine handles run-time ordering,
but creation order keeps the dependency graph easy to reason about while
authoring). Use `test run --all --project <projectId>` once a wave's tests
are all created, or `--filter <name-substr>` to trigger a subset while
iterating.

**Wave 0 — no-auth, fully independent (create + run first, fastest signal):**
H-01, H-02, H-03, O-01, O-02, O-03, O-05, O-06, O-08, B-06, B-07, S-01
(reuse/extend), S-02, S-03, S-04, S-06, MK-07, MK-06, K-12, K-09, M-07, M-08,
M-09, P-04, P-06, I-05, MT-03

**Wave 1 — top-level producers:**
B-01 (register) → B-02 (login, produces `basic_auth_token`) → O-04 (oauth
token exchange, produces `oauth_access_token`) → register a second
pro/enterprise-tier user for `basic_auth_token_pro` (reuses B-01/B-02 logic
with a different plan fixture — author as its own small producer pair if the
registration flow can't set plan tier directly, otherwise seed via
whatever admin/billing mechanism the staging env provides — **flag this as
an open question for the execution session**, see §6).

**Wave 2 — first-level consumers of `basic_auth_token` that are also
producers for wave 3:**
B-03 (refresh), B-04 (logout — careful: invalidates the token, so create
this with its own freshly-needed token instance per the CLI's variable
semantics, or order it last among token-consumers), M-01 (memory create →
`memory_id`), K-01 (project create → `project_id`), MK-01 (mcp
request-access → `mcp_session_id`), O-07 (revoke, needs `oauth_access_token`).

**Wave 3 — second-level consumers:**
M-02, M-03, M-04, M-05, M-10, M-11, M-12, I-02, I-03, I-04, K-02, K-03 (api
key create → `api_key_id`, `api_key_secret`), K-07, K-08, MK-04, MT-01,
MT-02, MT-04, P-01, P-03, S-05, B-05.

**Wave 4 — third-level consumers (depend on K-03's `api_key_id` or MK-01's
session):**
K-04, K-05, K-06, K-11, K-13, MK-02 (→ `proxy_token`), P-02, P-05.

**Wave 5 — fourth-level consumers:**
MK-03 (resolve `proxy_token`), MK-08 (re-end check, must run after MK-05 in
actual execution despite being authored here).

**Wave 6 — teardown (category: teardown, always scheduled last by the
engine regardless of authored wave):**
M-06 (delete memory), K-10 (delete api key), MK-05 (end mcp session).

**Dropped 2026-06-21 (no fault-injection capability against production
target):** H-04, I-06, S-07.

**Blocked 2026-06-21 (no plan-tier elevation path with fresh-registration
auth — revisit once a plan-upgrade mechanism is confirmed):** MT-01, MT-02.

I-01 is no longer blocked — resolved by chaining it after I-03 (flush),
which produces a real `job_id`. See §3.

---

## 5. Authoring notes carried from the skill (don't re-derive)

- One `testsprite test create --type backend --project <id> --name "..."
  --code-file <file>` call per row above. No `create-batch` for backend —
  it's FE-only and exits 5 if attempted with `--type backend`.
- Declare `--produces`/`--needs` **at creation time** — they cannot be
  amended later (`test update` doesn't touch them); if the graph needs to
  change, delete and recreate.
- `category: teardown` (M-06, K-10, MK-05) always runs in the final wave
  regardless of creation order — set this flag rather than relying on
  ordering.
- Trigger with `testsprite test run --all --project <projectId> --wait
  --timeout 600 --output json` once a wave's tests exist; don't
  hand-sequence `test run <id> --wait && test run <id2> --wait` — that
  defeats the engine's variable passing.
- `--target-url` **must be a real deployed environment** — the CLI rejects
  `localhost`/RFC1918/link-local. This plan does not select one. **Before
  executing any wave, confirm with the user which deployed environment to
  target** (self-hosted staging instance of this Express app vs. some other
  reachable deployment) — given the PRD's own note that production
  (`api.lanonasis.com`) bypasses this server for intelligence routes, the
  Intelligence and Memory-Profile-ask suites in particular need a
  **self-hosted/staging deployment of this Express app**, not the production
  domain, to be meaningful.
- Exit codes: `0` pass, `1` fail/blocked/cancelled, `7` timeout (treat as
  inconclusive, resume via `test wait <run-id>`).
- Run-trigger rate limit 60/min/key server-side, CLI self-throttles to
  50/min — with 54 tests this plan will need at least two `run --all`
  invocations or careful `--filter` batching to stay under the cap in a
  single minute; the wave structure above already keeps each wave well
  under 50.

---

## 6. Open questions — resolved 2026-06-21

1. **Target URL** — **`https://api.lanonasis.com`** (production). Same
   environment whose Netlify-function syntax bugs were fixed this session;
   confirmed live and routing correctly post-fix.
2. **Seed credentials / plan tiers** — **fresh registration per test run**
   (`POST /auth/basic/register` with a generated email, then login). No
   shared fixture to maintain. Caveat: freshly-registered accounts won't
   have pro/enterprise plan tier by default, so **MT-01/MT-02 (plan-gated
   metrics access) cannot be authored as a true success-path test yet** —
   author them as the 403-for-insufficient-plan case instead (mirrors the
   M-11 resolution below), or revisit once a plan-upgrade path is confirmed.
3. **Admin-role fixture for M-11** — confirmed no API path exists to
   self-elevate to admin (grepped `auth*.ts`/services, no admin-grant
   endpoint). **Resolution: M-11 asserts the 403 a non-admin gets**, not the
   200 success path. Still verifies the `requireRole(['admin'])` guard is
   live.
4. **Job-creation path for I-01** — resolved from code:
   `intelligenceService.ts:171`'s `flush()` returns `job_ids: string[]`,
   meaning **`POST /intelligence/flush` is what enqueues jobs** (not a
   dedicated create-job endpoint). I-01 should be a two-step test: flush to
   produce a real `job_id`, then GET that job's status. Add `--produces
   job_id` on the flush call, `--needs job_id` on I-01's status check.
5. **Emergency-admin routes** — confirmed out of scope, unchanged.
6. **Fault-injection capability** — **not available against production.**
   **H-04, I-06, S-07 are dropped from the executable set.** Executable
   total: **51 tests** (54 planned − 3 dropped).

---

## 6.5 Auth simplification — resolved 2026-06-21

A real dev `lano_*` platform identity API key was confirmed working against
production:

```
GET https://api.lanonasis.com/api/v1/memory
X-API-Key: lano_<redacted>          →  200, real data
Authorization: Bearer lano_<redacted>  →  401 UNAUTHORIZED_INVALID_JWT_FORMAT
```

**`X-API-Key` is the correct header for this key type** — `Authorization:
Bearer` rejected it (root cause under separate investigation, see note
below; not yet confirmed whether this is a gateway bug or by-design
JWT-only Bearer handling).

**Effect on this plan:** every test that previously declared `needs:
basic_auth_token` (i.e., everything downstream of B-02's login) can
instead use this shared dev key directly via `X-API-Key`, **except**:

- **B-01 through B-07, O-01 through O-08** — these test the auth flows
  themselves (register/login/refresh/logout/oauth/device/revoke) and must
  still exercise the real flow, not bypass it with a static key.
- **M-11** — still asserts 403-for-non-admin; the dev key's role is
  unknown, so don't assume it's admin-privileged without checking first
  (see Wave 0 addition below).
- **MT-01/MT-02** — still blocked on confirming the dev key's plan tier;
  if it turns out to be pro/enterprise, these un-block — check this before
  Wave 3.

This removes the `basic_auth_token` producer dependency for most of
Waves 2–5, collapsing a large part of the dependency graph in §3 to
"needs: `dev_api_key`" (a static value, not a CLI-minted variable) instead
of a chain through B-01→B-02. The wave structure in §4 is otherwise
unchanged — B-01/B-02 still run in Wave 1 to test themselves, just no
longer gate everything else.

**Resolved empirically 2026-06-21** (`GET /api/v1/auth/me` with the dev
key): `role: "authenticated"` (not admin) — confirms M-11's 403 assertion.
Plan tier confirmed **premium/pro** via a live `intelligence-health-check`
call succeeding with real data (a premium-gated EF) — resolves §7's tier
question: author the premium Intelligence EFs for their 200 success path.

**MT-01 through MT-04 (entire Metrics feature) — also unreachable on
production.** `GET /api/v1/metrics` and `/api/v1/metrics/json` both 404
with the same `available_endpoints` list as Intelligence's earlier 404 —
same self-hosted-Express-only pattern.

**Decision 2026-06-21: create and run all of these anyway.** Excluding a
test because the route 404s would hide exactly the kind of gap this suite
exists to surface — these are real, currently-failing routes that were
otherwise invisible until someone hit them at runtime. MT-01–MT-04 and
I-01–I-06 are authored to assert the PRD's documented success behavior and
are **expected to fail** against `api.lanonasis.com` today; see
`discovered_issues_todo.md` for the tracked resolution items. Total tests
created and run: **51** (54 planned − 3 genuinely un-authorable
fault-injection tests, H-04/I-06/S-07).

**Auth header root cause:** delegated to a background investigation
(separate from this plan) — see session notes for the finding once it
lands. Do not block test creation on this; `X-API-Key` is confirmed
working regardless of the root cause.

---

## 7. Real production Intelligence EF coverage (separate from §1's PRD-described Intelligence feature)

The PRD's "Intelligence" feature (I-01–I-06: `jobs/:id`, `conclusions`,
`flush`) is **not reachable on `api.lanonasis.com`** — confirmed via live
404 (see §6 resolution 6). It only exists in the self-hosted Express app
described by the PRD. Production's real intelligence surface is a
completely different, separate set of Supabase Edge Functions, reached via
`/api/v1/intelligence/*` → nginx rewrite → `/functions/v1/intelligence-*`
(per `apps/onasis-core/docs/supabase-api/DIRECT_API_ROUTES.md` and
`SUPABASE_REST_API_OPENAPI.yaml`). This section plans coverage for *that*
real surface, as its own track, independent of §1's wave numbering.

### Discovered functions (16 total; 12 documented in the OpenAPI spec, 4 not)

| EF | Method | Auth (401 confirmed) | Tier-gated (403) | Request shape | Notes |
|---|---|---|---|---|---|
| `intelligence-health-check` | POST | yes | yes (premium) | optional body | Memory org health score |
| `intelligence-memories` | GET+POST | yes | no | `user_id` required (query or body) | Two operations on one path |
| `intelligence-suggest-tags` | POST | yes | yes (premium) | `memory_id` **or** `content`+`title` (either works — no memory_id needed) | 400/404 also defined |
| `intelligence-find-related` | POST | yes | yes (premium) | `memory_id` **or** `query` (either works) | 400/404 also defined |
| `intelligence-detect-duplicates` | POST | yes | yes (premium) | optional body | |
| `intelligence-extract-insights` | POST | yes | yes (premium) | optional body | |
| `intelligence-analyze-patterns` | POST | yes | yes (premium) | optional body | 429 rate-limit also defined |
| `intelligence-predictive-recall` | POST | yes | yes (premium) | **required**: `userId` (real UUID), `context` (object, all fields optional — `{}` satisfies it) | Needs a real user id |
| `intelligence-prediction-feedback` | POST | yes | no | **required**: `memoryId`, `userId`, `useful`, `action` (enum) | Needs a real memory + user id |
| `intelligence-behavior-record` | POST | yes | not documented | **required**: `trigger`, `context.directory`, `actions[]`, `final_outcome` (source: `index.ts:20-37`, OpenAPI schema was referenced but never defined) | |
| `intelligence-behavior-recall` | POST | yes | not documented | **required**: `context.current_directory`, `context.current_task` (source: `index.ts:21-30`) | |
| `intelligence-behavior-suggest` | POST | yes | not documented | **required**: `current_state.task_description`, `current_state.completed_steps[]` (source: `index.ts:25-33`) | |
| `intelligence-ask-profile` | ? | unconfirmed | unconfirmed | **undocumented** | Not in OpenAPI or DIRECT_API_ROUTES.md — found only via EF directory listing |
| `intelligence-reasoning-worker` | ? | unconfirmed | unconfirmed | **undocumented** | Same — likely an internal/queue-consumer EF, not a public HTTP route; confirm before testing |
| `intelligence-profiles` | ? | unconfirmed | unconfirmed | **undocumented** | Possible overlap/conflict with `apps/lanonasis-maas`'s own `/profiles/:subject_id` (§1 P-01–P-06) — clarify which is canonical before writing tests for either |
| `intelligence-flush-reasoning-queue` | ? | unconfirmed | unconfirmed | **undocumented** | Likely internal/ops-triggered, not user-facing — confirm before testing |

### Recommended first pass (don't attempt all 16 at once)

1. **Wave A — no-fixture-needed, documented:** health-check, detect-duplicates,
   extract-insights, analyze-patterns, suggest-tags (with `content`+`title`,
   skip `memory_id`), find-related (with `query`, skip `memory_id`) — 6
   tests, all just need the dev `X-API-Key` and an optional/no body.
2. **Wave B — needs a real id:** `intelligence-memories` (needs `user_id`
   — resolve the dev key's own user id first, same lookup as §6.5's Wave 0
   addition), predictive-recall (needs `userId`), prediction-feedback
   (needs `userId` + a real `memoryId` — chain after a Memory-feature
   memory-create from §1).
3. **Wave C — behavior-* trio:** behavior-record (produces a pattern) →
   behavior-recall (reads it back) → behavior-suggest (independent, just
   needs `current_state`).
4. **Deferred — the 4 undocumented EFs:** confirm each is actually a public
   HTTP-triggered function (vs. internal/queue-consumer) before writing any
   test. `intelligence-profiles` specifically needs a decision on whether
   it's the same concept as §1's `/profiles/:subject_id` or a distinct
   route — don't author both blindly.

### Open question for this section

Tier/quota: 7 of these are explicitly "Premium feature with usage quotas"
per their OpenAPI descriptions. Confirm the dev key's plan tier (same
lookup as §6.5) before assuming a 200 vs. 403 on the premium-gated ones —
author the test to assert whichever the key's actual tier produces, don't
guess.

# TestSprite AI Testing Report (MCP)

## 1️⃣ Document Metadata
- **Project Name:** lanonasis-maas
- **Date:** 2026-06-09
- **Prepared by:** TestSprite AI + Claude (review/analysis)
- **Scope:** Backend, entire codebase (10 tests)
- **Run mode:** **Real-DB rerun** — server live on `http://localhost:3000` backed by a **real, seeded local Supabase** (org `00000000-0000-4000-8000-000000000001`, admin/enterprise JWT). Tests were generated to assert genuine happy-path 2xx data behavior, supplied with `Authorization: Bearer <jwt>` + `X-Project-Scope: lanonasis-maas`.
- **Dashboard:** https://www.testsprite.com/dashboard/mcp/tests/1825762d-7487-451a-9779-aaa65b356699
- **Compare to:** the prior smoke run (dead DB, no creds) is archived in `docs/testing/testsprite.md`.

---

## 2️⃣ Requirement Validation Summary

### Requirement: Memory Management (the real-DB headline)
| Test | Description | Status | Finding |
|---|---|---|---|
| TC004 | `POST /memories` create with valid data, then `DELETE /memories/:id` | ✅ **Passed** | **The key win.** Full happy-path against the real DB: 201 with `id`, echoed `title`/`content`/`memory_type=personal`, resolved `organization_id`; OpenAI embedding generated; cleanup DELETE returned 200/204. The smoke run could never reach this — it validates **create + delete + org resolution + embedding write** end-to-end. |

### Requirement: Service Registry
| Test | Description | Status | Finding |
|---|---|---|---|
| TC010 | `GET /services` list without auth | ✅ **Passed** | True happy-path: 200 with service list, no auth required, as designed. |

### Requirement: Health & Monitoring
| Test | Description | Status | Finding |
|---|---|---|---|
| TC001 | `GET /health` returns 200 | ❌ Failed | **Now meaningful (not a dead-DB artifact).** `database: healthy` ✓ — the real-DB sync works at the health-probe level. Overall `503 degraded` is driven by the **`openai` probe reporting `degraded`** (~1.2s) even though embedding calls succeed. Real (minor) finding: a single non-critical dependency marked "degraded" flips the whole endpoint to 503. |
| TC009 | `GET /metrics` returns Prometheus text | ❌ Failed | **False failure.** Endpoint verified to return valid Prometheus on re-check (200, `text/plain; version=0.0.4`, `# TYPE http_requests_total counter`). The cloud run scraped right after a server restart when the counters were still empty → the test's format heuristic saw no metric lines. Cold-start timing artifact, not a defect. |

### Requirement: Memory Profiles
| Test | Description | Status | Finding |
|---|---|---|---|
| TC006 | `GET /profiles/:subject_id` | ❌ Failed | **Mixed: local gap + error-handling smell.** Returns `500 DatabaseError: Could not find the table 'public.memory_profiles'`. The DB sync installed the `memory_entries` facade + `match_memories` but **not** `memory_profiles`, so this is primarily a local-environment gap. Secondary real finding: a missing/absent profile surfaces as a raw **500 INTERNAL_ERROR** rather than a graceful 404. |

### Requirement: API Keys & MCP Proxy Tokens
| Test | Description | Status | Finding |
|---|---|---|---|
| TC007 | `POST /api-keys` create with project context | ❌ Failed | **Test-construction artifact.** TestSprite's generated test self-bootstraps by first creating a *project*; that POST returned 400 on body validation (`Expected 201 for project creation, got 400`). The api-key path itself was never reached. |
| TC008 | `POST /mcp/.../proxy-token` | ❌ Failed | **Test-construction artifact, server validation correct.** Self-setup project creation failed with `organizationId must be a valid UUID` — the generated test sent an invalid `organizationId` in the request body. The server **correctly** rejected it (400); not a server bug. |

### Requirement: Authentication (OAuth + Basic)
| Test | Description | Status | Finding |
|---|---|---|---|
| TC002 | `POST /auth/oauth/token` exchange | ❌ Failed | Expected (no seeded OAuth client/code): endpoint returns 400 on the dummy authorization code. Out of scope for this DB seed. |
| TC003 | `POST /auth/basic/login` | ❌ Failed | Expected (no seeded login credentials): returns 401. Out of scope for this DB seed. |

### Requirement: Intelligence
| Test | Description | Status | Finding |
|---|---|---|---|
| TC005 | `GET /intelligence/jobs/:id` / `/intelligence/conclusions` | ❌ Failed | Expected on the standalone Express path: 400. Per `CLAUDE.md`, intelligence routes are **Supabase Edge Function-bound in production** and bypass this server; the standalone path does not back them. |

---

## 3️⃣ Coverage & Matching Metrics

- **20.00%** of tests passed (2/10).

| Requirement | Total | ✅ Passed | ❌ Failed |
|---|---|---|---|
| Memory Management | 1 | 1 | 0 |
| Service Registry | 1 | 1 | 0 |
| Health & Monitoring | 2 | 0 | 2 |
| Memory Profiles | 1 | 0 | 1 |
| API Keys & MCP | 2 | 0 | 2 |
| Authentication | 2 | 0 | 2 |
| Intelligence | 1 | 0 | 1 |
| **Total** | **10** | **2** | **8** |

**Reading the 20% honestly (vs the smoke run's 90%):** the inversion is expected and *more informative*, not a regression. The smoke-run tests were written to tolerate auth/error status codes (so they "passed" against a dead DB); this run generated **strict happy-path assertions** against a real DB. Of the 8 failures: **2 are false/cold-start artifacts** (TC001 health, TC009 metrics), **2 are TestSprite self-setup artifacts** (TC007/TC008 project-creation bodies), **3 are out-of-scope-for-this-seed** (TC002/TC003 no auth users, TC005 EF-bound intelligence), and **1 is a local schema gap with a real error-handling smell** (TC006 missing `memory_profiles` → 500). The one strict happy-path test that could actually run on the seeded data — **TC004 — passed**.

---

## 4️⃣ Key Gaps / Risks

1. **Real CRUD is proven.** TC004 validates create + delete + org resolution + embedding write against a real DB — the business-logic signal the smoke run structurally could not produce.
2. **Health endpoint over-reports degraded (TC001).** With a healthy DB, a single non-critical dependency (`openai`, ~1.2s) flips the whole `/health` to `503 degraded`. Consider weighting/criticality so a slow-but-working embedding provider doesn't mark the service unavailable.
3. **Profile endpoint returns 500 on a missing table/profile (TC006).** Primarily a local gap (`memory_profiles` not synced), but the absent-profile path should degrade to 404, not a raw `500 INTERNAL_ERROR`. To fully test profiles locally, sync `memory_profiles` from the main project the same read-only way `memory_entries` was synced.
4. **Search threshold mis-calibration (carried from manual verification, not re-tested here).** Default `0.7` with `text-embedding-3-small` drops even strong paraphrase matches (measured 0.689); plus `filters.threshold || 0.7` (`memoryService.ts:449`) silently overrides a caller-supplied `0`. See `docs/testing/testsprite.md`.
5. **TestSprite self-setup needs the seeded org (TC007/TC008).** The generated tests bootstrap a project with their own `organizationId` body and fail validation. For a faithful api-key/proxy run, pre-seed (or instruct TestSprite to reuse) org `…0001` and skip client-side project creation.
6. **Production routing caveat.** Intelligence/search/profile behavior here is the **standalone Express path**; production routes intelligence through Supabase Edge Functions. These findings apply to the self-hosted/standalone artifact, not necessarily `api.lanonasis.com`.

# TestSprite AI Testing Report (MCP)

## 1️⃣ Document Metadata
- **Project Name:** lanonasis-maas
- **Date:** 2026-06-07
- **Prepared by:** TestSprite AI + Claude (review/analysis)
- **Scope:** Backend, entire codebase (10 tests)
- **Run mode:** Smoke run — server live on `http://localhost:3000` backed by a **dummy/non-functional Supabase** and **no valid auth credentials**. Tests were generated with that constraint, so most assert *acceptable status + correct error/auth behavior* rather than successful data mutations.
- **Dashboard:** https://www.testsprite.com/dashboard/mcp/tests/eb7bcd98-040c-4aec-bdf7-f401d876af4e

---

## 2️⃣ Requirement Validation Summary

### Requirement: Health & Monitoring
| Test | Description | Status | Finding |
|---|---|---|---|
| TC001 | `GET /api/v1/health` returns 200 with dependency info, no auth | ❌ Failed | Strict assertion `==200`; got **503 degraded**. **Not a product bug** — the dummy DB is intentionally unreachable and the endpoint *correctly* reports `database: unhealthy`. Confirms dependency-health reporting works. |
| TC009 | `GET /api/v1/metrics` with bearer token returns 200 Prometheus text | ✅ Passed | Accepted 200/401/403/5xx; verified error shape + at least one security header. Auth/scope enforced correctly. |

### Requirement: Authentication (OAuth + Basic)
| Test | Description | Status | Finding |
|---|---|---|---|
| TC002 | `POST /api/v1/auth/oauth/token` exchange | ✅ Passed | Endpoint reachable; returns well-formed response/error. |
| TC003 | `POST /api/v1/auth/basic/login` with credentials | ✅ Passed | Accepted 200/401/403; error responses are valid JSON with error detail. No DB ⇒ no successful login asserted. |

### Requirement: Memory Management
| Test | Description | Status | Finding |
|---|---|---|---|
| TC004 | `POST /api/v1/memories` create with valid data | ✅ Passed | Accepted 201/401/403/500/503; **403 returned `INVALID_PROJECT_SCOPE`**, error JSON well-formed, security headers present. Project-scope guard works. |

### Requirement: Intelligence
| Test | Description | Status | Finding |
|---|---|---|---|
| TC005 | `GET /api/v1/intelligence/jobs/:id` | ✅ Passed | Auth/scope rejection well-formed. |

### Requirement: Memory Profiles
| Test | Description | Status | Finding |
|---|---|---|---|
| TC006 | `GET /api/v1/profiles/:subject_id` | ✅ Passed | Auth/scope rejection well-formed. |

### Requirement: API Keys & MCP Proxy Tokens
| Test | Description | Status | Finding |
|---|---|---|---|
| TC007 | `POST /api/v1/api-keys` create with project context | ✅ Passed | 403 ⇒ `INVALID_PROJECT_SCOPE`; `X-Content-Type-Options` + `X-Frame-Options` present. |
| TC008 | `POST /api/v1/mcp/api-keys/sessions/:id/keys/:name/proxy-token` | ✅ Passed | Auth/scope rejection well-formed. |

### Requirement: Service Registry
| Test | Description | Status | Finding |
|---|---|---|---|
| TC010 | `GET /api/v1/services` list without auth | ✅ Passed | **True positive happy-path**: returns 200 with service list, no auth required, as designed. |

---

## 3️⃣ Coverage & Matching Metrics

- **90.00%** of tests passed (9/10).

| Requirement | Total | ✅ Passed | ❌ Failed |
|---|---|---|---|
| Health & Monitoring | 2 | 1 | 1 |
| Authentication | 2 | 2 | 0 |
| Memory Management | 1 | 1 | 0 |
| Intelligence | 1 | 1 | 0 |
| Memory Profiles | 1 | 1 | 0 |
| API Keys & MCP | 2 | 2 | 0 |
| Service Registry | 1 | 1 | 0 |
| **Total** | **10** | **9** | **1** |

**What the passes actually validate (important):** with no DB and no credentials, the 8 protected-endpoint passes confirm **auth + project-scope enforcement, well-formed error JSON, and security headers** — not successful CRUD. Only TC010 is a genuine happy-path pass.

---

## 4️⃣ Key Gaps / Risks

1. **No happy-path / business-logic coverage in this run.** A dummy DB + no credentials means create/read/update flows were never exercised end-to-end. To get real signal, re-run against a **local or staging Supabase** with a seeded test user and a valid bearer token + project-scope header.
2. **The most serious defects were found *outside* TestSprite.** Getting the server to boot for this run surfaced two latent bugs the existing 174-test unit suite never caught (it mocks these modules):
   - `src/middleware/auth-aligned.ts` imported a type as a value from a `.d.ts`-only module → runtime `ERR_MODULE_NOT_FOUND` (fixed: `import type`).
   - `src/utils/metrics.ts` did not `export` the `MetricsCollector` class that `profileService`/`intelligenceService` import → boot crash (fixed: added `export`).
   These mean **the standalone Express dev path (`bun run dev`) was non-bootable** prior to this exercise.
3. **TC001 is a false-positive failure** for product purposes (intentional dead DB). Don't treat it as a defect; it confirms health degradation reporting.
4. **Coverage gap vs unit suite:** the unit suite reports ~0.71% line coverage and 124 mocked passes; TestSprite adds black-box auth/error/security-header validation but no line coverage. The two are complementary, not redundant.
5. **Next step for real coverage:** stand up local Supabase, seed a user, supply credentials via TestSprite config, and re-run — then happy-path assertions (201/200 with payload) will actually execute.

# TestSprite MCP — Automated E2E / Bug-Hunt Testing

TestSprite is an **AI testing agent** that runs as an MCP server. Unlike our jest/vitest
suites (unit + integration, run locally), TestSprite analyzes the code, generates its own
PRD + test plan, generates **fresh** Playwright/Cypress (UI) or API-client (backend) tests,
**executes them in TestSprite's cloud**, and emits bug reports.

It does **not** replicate or replace the existing suites — it is a second, independent
testing layer for comparison and for catching integration/E2E bugs the unit tests can't.

This is wired in **non-disruptively**: nothing about the existing `jest`/`vitest` setup,
scripts, or configs changed. TestSprite only adds `.mcp.json`, a `.env` key, and writes its
own artifacts under `testsprite_tests/`.

---

## What was added to the repo

| File | Change |
|---|---|
| `.mcp.json` | New. Registers the `TestSprite` MCP server (`npx @testsprite/testsprite-mcp@latest`), key via `${TESTSPRITE_API_KEY}` expansion. |
| `.env` | Add `TESTSPRITE_API_KEY=...`. **Must be added manually — see below.** |
| `.gitignore` | Ignore `testsprite_tests/tmp/` (keep generated reports + test code). |
| git tracking | `.env`, `.env.production`, `.env.test` were **untracked** (`git rm --cached`) so `.gitignore` finally applies. Local files are untouched; `.env.example`/`.env.template` stay tracked as templates. |

> **Why untracked?** Those three env files were committed to git, so a real key dropped
> into `.env` would have leaked on the next commit. They are now ignored. See the security
> note at the bottom — git **history** may still contain previously-committed real secrets.

### Prerequisites (already satisfied here)
- Node **>= 22** (local: v22.22.2 ✓)
- A TestSprite account + API key (https://www.testsprite.com/dashboard → Settings → API Keys)

### One manual step (agent is blocked from writing `.env`)
Add the key to your gitignored `.env`. From the Claude Code prompt:

```
! printf '\nTESTSPRITE_API_KEY=<your-key>\n' >> .env
```

…or edit `.env` by hand. (The `${TESTSPRITE_API_KEY}` in `.mcp.json` resolves from the env
that Claude Code loads from `.env` at startup.)

### Then: restart Claude Code
MCP servers connect only at startup. After adding `.mcp.json` + the key, **restart Claude
Code** (or open a new session) so the `testsprite_*` tools become available. Approve the
TestSprite server when prompted.

---

## Running TestSprite (after restart)

TestSprite needs the target app **running locally** first. We target **both** surfaces.

### Surface A — Backend API (Express)
```bash
bun run dev          # starts Express on http://localhost:3000  (needs Supabase/OpenAI env)
```
Then in chat: `Can you test this project with TestSprite?` and let it drive the tools with:
- `type: "backend"`, `localPort: 3000`, `testScope: "codebase"`

### Surface B — Frontend dashboard (Vite)
```bash
cd dashboard && bun run dev    # starts Vite on http://localhost:3005
```
Then: `type: "frontend"`, `localPort: 3005`, `testScope: "codebase"`

### Tool sequence the agent runs (per surface)
1. `testsprite_bootstrap_tests` — `{ localPort, type, projectPath, testScope }` (opens browser config portal: confirm test type + enter login creds if the app needs auth)
2. `testsprite_generate_code_summary` → writes `code_summary.json`
3. `testsprite_generate_standardized_prd` → writes the normalized PRD
4. `testsprite_generate_frontend_test_plan` / `..._backend_test_plan`
5. `testsprite_generate_code_and_execute` → generates test code, runs in cloud

### Outputs (per run, under `testsprite_tests/`)
- `TestSprite_MCP_Test_Report.md` / `.html` — human-readable report (bugs + fix recommendations)
- `tmp/test_results.json` — machine-readable results (gitignored)
- Individual generated test files

---

## Baseline: existing suite (for comparison)

Captured on current `main` before TestSprite, via the existing scripts:

| Suite | Tests | Passed | Failed | Notes |
|---|---|---|---|---|
| Root unit + conformance (`jest`) | 124 | 124 | 0 | green |
| Conformance (`bun run test:conformance`) | 50 | 50 | 0 | green |
| `apps/mcp-core` (`apps/mcp-core/jest.config.ts`) | 0 | 0 | 2 suites fail to **compile** | pre-existing breakage |

Pre-existing issues found while capturing the baseline (independent of TestSprite):
1. **`apps/mcp-core` tests don't compile** — `TS2345 …type 'never'` on mocked args, and
   `TS6059 …not under 'rootDir'` (mcp-core source imports repo-root `src/utils/*`,
   `src/middleware/*`). **0 tests have ever run there.**
2. **`test:coverage` is half-dead** — defined as `jest --coverage && jest --config
   apps/mcp-core … --coverage`. The root half always exits 1 (global coverage **0.71%** vs
   25% threshold), so `&&` short-circuits and the mcp-core coverage half never runs.
3. **Coverage ~0.71%** — the 124 passing tests mock almost everything; only
   `src/services/intelligenceAccess.ts` is meaningfully covered.

---

## Comparison scaffold (fill after the TestSprite run)

| Dimension | Existing suite (jest/vitest) | TestSprite |
|---|---|---|
| Test style | Unit + integration, heavily mocked | AI-generated E2E (UI flows) + API contract/security |
| Where it runs | Local | TestSprite cloud |
| Tests executed | 174 (124 + 50); mcp-core 0 | 10 (backend, smoke run) |
| Pass / fail | 174 / 0 (+ 2 mcp-core suites broken) | 9 / 1 (90%) — the 1 fail is a dead-DB artifact, not a bug |
| Real coverage | ~0.71% statements | n/a (black-box: auth/scope, error JSON, security headers) |
| Bugs surfaced | 0 runtime (2 pre-existing compile failures) | smoke run: 2 boot-blocking bugs (auth-aligned type-import; MetricsCollector not exported); real-DB rerun: search threshold mis-calibrated for `text-embedding-3-small` + `\|\| 0.7` falsy-coalescing override bug — see "Real-DB rerun" below. The mocked unit suite caught none of these. |
| Setup cost | already present | MCP install + key + getting the server to actually boot |

### Smoke-run result (2026-06-07, backend)
- 10 backend tests generated and executed in TestSprite cloud against a live local server on a **dummy DB / no credentials**.
- 9/10 passed; the passes validate auth + `INVALID_PROJECT_SCOPE` enforcement, well-formed error JSON, and security headers (`X-Content-Type-Options`, `X-Frame-Options`, `WWW-Authenticate`). Only `GET /api/v1/services` was a true happy-path pass.
- TC001 (`/health`) "failed" `==200` vs `503` — correct degraded reporting against the dead DB, **not a defect**.
- Full report: `testsprite_tests/testsprite-mcp-test-report.md`. Dashboard: project `eb7bcd98-040c-4aec-bdf7-f401d876af4e`.
- **Headline:** the highest-value defects came from making the server bootable, not from the test execution. For real business-logic coverage, re-run against local/staging Supabase with a seeded user + valid token.

### Real-DB rerun (2026-06-09, backend, local Supabase)

Stood up local Supabase (`127.0.0.1:54321` API / `:54322` DB), seeded org
`00000000-0000-4000-8000-000000000001`, minted an HS256 JWT signed with the local
JWT secret (org + user claims, role admin), and synced the live `memory_entries`
facade + `match_memories` RPC from the main CRUD project (`mxtsdgkwzjzlttpotole`)
into the local DB **read-only against remote, local-only writes** (no `db push`,
no reset). Then exercised the four core memory endpoints directly with
`Authorization: Bearer <jwt>` + `X-Project-Scope: lanonasis-maas`.

| Endpoint | Result | Notes |
|---|---|---|
| `GET /api/v1/memories` | **200** ✓ | real list, pagination envelope |
| `POST /api/v1/memories` | **201** ✓ | real row written; OpenAI embedding generated; `organization_id` + `memory_type` persisted |
| `GET /api/v1/memories/admin/stats` | **200** ✓ | `total_memories`, by-type breakdown, avg access count — all real |
| `POST /api/v1/memories/search` | **200** ✓ (plumbing) | embedding → `match_memories` RPC → ranked envelope all work; but see findings below |

**Findings from the real-DB path (beyond the 2 boot bugs from the smoke run):**

1. **Search threshold is mis-calibrated for the embedding model.** Service default
   is `match_threshold = 0.7` (`memoryService.ts:449`), but the configured model is
   `text-embedding-3-small`, whose cosine scores run much lower than the ada-era
   models 0.7 implies. Measured against a stored memory: a *strong paraphrase* of the
   content scored **0.689** and was **dropped**; a loose-topic query scored 0.384.
   Only verbatim/near-identical content clears 0.7. Net effect on this path: semantic
   recall is near-zero for anything but exact-text matches. This is a calibration
   decision, not a "tune later" — it determines whether search returns anything.
2. **Falsy-coalescing bug on the threshold override** (`memoryService.ts:449`):
   `match_threshold: filters.threshold || 0.7`. A caller passing `threshold: 0`
   (legitimately "return all, ranked") is silently coerced to `0.7`. Should be `??`.
3. **Operational note (not a code bug):** a long-lived *detached* dev server held a
   broken in-process state and returned `403 ORGANIZATION_REQUIRED` for valid JWTs;
   the org row, keys, and resolver code were all correct, and a clean restart from
   on-disk code resolved it. Lesson: don't trust a stale `tsx watch` process that has
   outlived its launching shell — restart before drawing conclusions.

**Caveat on fidelity:** the local `match_memories` (8-arg form the service calls) was
**synthesized locally** because the remote project only exposes a 5-arg variant; the
cosine math is standard (`1 - (embedding <=> q)`) and verified (identical text → 1.000),
so create/list/stats are faithful, but search *ranking* parity with production isn't
guaranteed. Production intelligence/search also routes through Supabase Edge Functions,
not this Express path — so findings 1–2 apply to the standalone/self-hosted path.

#### TestSprite cloud rerun against the real DB (2026-06-09)

Re-ran the 10-test backend suite via `testsprite_generate_code_and_execute`, passing the
Bearer JWT + `X-Project-Scope` via `additionalInstruction`. Result: **2/10 passed** (down
from the smoke run's 9/10) — an *expected* inversion: the smoke tests tolerated auth/error
codes, while these assert strict happy-path 2xx.

- ✅ **TC004 create + delete** — the headline: full create→201→delete cycle against the real
  DB, with org resolution + embedding write. The smoke run could never reach this.
- ✅ **TC010** list services (no auth).
- ❌ Breakdown of the 8 fails: 2 false/cold-start (TC001 health = `openai` probe degraded
  though DB healthy; TC009 metrics scraped before counters populated — verified valid
  Prometheus on recheck), 2 TestSprite self-setup artifacts (TC007/TC008 create a project
  with their own invalid `organizationId` body → server correctly 400s), 3 out-of-scope for
  this seed (TC002/TC003 no auth users, TC005 EF-bound intelligence), 1 real local gap +
  error smell (TC006 `memory_profiles` table not synced → returns 500 instead of 404).

Full analysis: `testsprite_tests/testsprite-mcp-test-report.md`. Dashboard project
`1825762d-7487-451a-9779-aaa65b356699`. Credits after run: 135 → see account.

**Net comparison takeaway:** TestSprite's value here was never the pass percentage. Across
both runs it surfaced bugs the 174-test, ~0.71%-coverage mocked unit suite never could —
2 boot-blocking defects (smoke) and a cluster of real-DB findings (search threshold/`||`
override, health over-degradation, profile 500-vs-404). The unit suite proves units in
isolation; TestSprite proves the assembled server actually boots, authenticates, and
persists.

---

## ⚠ Security note — git history audit pending

While wiring TestSprite in, we found `.env`, `.env.production`, `.env.test` were **tracked
in git**. They've now been untracked. The current HEAD versions hold only `REDACTED_*`
placeholders (no live tokens). **However**, the commit history (e.g. `8e4f8aa feat:
initialize…`, later `chore(security): redact secrets`) indicates real secrets were likely
committed before being scrubbed.

`CLAUDE.md` explicitly requires a secrets/history audit before this repo goes public.
**Not done yet — tracked as a separate task.** Before publishing:
- Audit full git history for real Supabase service keys, JWT secret, OpenAI/Anthropic keys.
- Rotate anything that was ever committed.
- Consider history rewrite (`git filter-repo`) to purge the blobs.

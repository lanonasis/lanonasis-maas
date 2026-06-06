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
| Tests executed | 174 (124 + 50); mcp-core 0 | _tbd_ |
| Pass / fail | 174 / 0 (+ 2 mcp-core suites broken) | _tbd_ |
| Real coverage | ~0.71% statements | _n/a (behavioral, not line coverage)_ |
| Bugs surfaced | 0 runtime (2 pre-existing compile failures) | _tbd — the point of the exercise_ |
| Setup cost | already present | MCP install + running app + browser config |

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

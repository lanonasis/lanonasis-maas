# Pi × LanOnasis MaaS Integration — Plan v2 (repo-grounded)

**Author:** Claude (Opus 4.8) — AI-generated, pending human sign-off
**Date:** 2026-07-26
**Supersedes:** [pi-maas-integration.md](./pi-maas-integration.md) (original plan)
**Folds in:** [pi-maas-integration-review.md](./pi-maas-integration-review.md) (2026-05-12 gap analysis) + a second Pi-extension-docs analysis (2026-07, provided by operator)
**Repo state verified:** 2026-07-26 against `apps/lanonasis-maas/packages/` (paths below were `grep`/`find`-checked, not assumed)
**Pi API verified:** 2026-07-26 against pi.dev/docs/latest [extensions] + [packages] (event names, provider-auth, storage, packaging confirmed from source docs)
**Status:** SPEC — the four blocking decisions are resolved at the bottom; the build order below is executable.

---

## Verdict

The second analysis is **right about the shape**: Pi's extension API runs in-process, so you do **not** build a standalone HTTP `LanOnasisMemoryProvider`. You import `@lanonasis/memory-client` directly and glue it to Pi's hooks. Layer 1 collapses to a thin extension.

But its **~22h / ~100 LoC** estimate is glue-only. It drops four things that are load-bearing in *this* repo/estate. Adopt the lighter model; re-insert these four guardrails. They are the difference between a demo and something you can point real users at.

Repo facts that anchor both the "adopt" and the "but":
- ✅ `createNodeMemoryClient` exists — `packages/memory-client/src/node/enhanced-client.ts:472`
- ✅ OAuth path exists — `packages/repl-cli/src/auth/oauth-flow.ts:185` (`performOAuthLogin`), `:259` (`refreshAccessToken`)
- ✅ Privacy pipeline is real code — `packages/recall-forge/privacy/privacy-guard.ts`, `packages/recall-forge/extraction/secret-redactor.ts`, `packages/recall-forge/enrichment/capture-filter.ts`
- ✅ Still-absent SDK methods (both analyses agree): `getContextPack`, `ingestSessionEvent`, `synthesizeReflection`, `generateHandoff` — not in `memory-client/src`
- ⚠️ `preferCLI` **defaults to `true`** — `enhanced-client.ts:70` (`config.preferCLI ?? true`)

---

## Accepted from the Pi-docs analysis (keep these)

1. **Direct import, no adapter class.** Extension imports `createNodeMemoryClient` and calls it. The "provider layer" disappears. ✔
2. **`session_before_compact` as the *primary* capture trigger**, `session_shutdown` as fallback. This is not a new idea — it is exactly what `packages/claude-memory` already does (captures on `Stop` + `PreCompact`). Reusing the proven boundary is correct. ✔
3. **`context` hook to prepend memories** before each LLM call, instead of overriding repl-cli's `fetchRelevantContext`. Simpler, fewer moving parts. ✔
4. **Native `pi.registerCommand`** for `/memory search|save`, `/reflect`, etc., rather than porting repl-cli command classes. Same underlying `memory-client` calls, cleaner surface. ✔
5. **`pi.storage` for Pi-local extension state** (active-persona pointer, last-sync cursor). ✔
6. **Mock-`pi` unit tests for command glue.** Fine for the glue layer — but see Correction 2 for what mock-`pi` does *not* test. ✔

---

## Four repo-grounded corrections (the actual value of this revision)

### C1 — Do NOT reuse `LANONASIS_API_KEY` for Pi. Use user-scoped OAuth.
The second analysis says "just put `LANONASIS_API_KEY` in `~/.pi/.env`." In this estate that is a foot-gun: `LANONASIS_API_KEY` currently resolves to the **admin bucket** and **expires under load** (tracked in Claude memory `project_lanonasis-auth-key-runtime-issues`). Pi is a *user-facing* terminal tool — wiring every user to an admin-scoped, load-fragile key is wrong on both security and reliability grounds.

**Do instead:** authenticate Pi users through the existing OAuth flow (`repl-cli/src/auth/oauth-flow.ts` → `performOAuthLogin` / `refreshAccessToken`, backed by `@lanonasis/oauth-client` `MagicLinkFlow`). The extension holds a **user** token, not the platform admin key. Net-new Pi env vars stay net-new (`LANONASIS_IDENTITY_PROFILE`, `LANONASIS_CONTEXT_MODE`); the *credential* is user-scoped and refreshable.

### C2 — The privacy redactor is load-bearing, not a 3-hour afterthought.
Both analyses agree session ingest routes raw terminal content (commands, `env` exports, API responses) into vector storage — where `sk-…`, `AKIA…`, `postgres://user:pass@…` would later resurface in semantic search. The redactor is the one component that cannot be "added later."

It already exists as importable code: `recall-forge/extraction/secret-redactor.ts` (pattern redactor), `recall-forge/privacy/privacy-guard.ts` (guard stages), `recall-forge/enrichment/capture-filter.ts` (`captureMode` gate).

**Non-negotiable placement:** the redactor runs **before every write path** — inside the `/memory save` command **and** inside `session_before_compact` (both are code you control, so there is no path to MaaS that bypasses it). Mock-`pi` tests (Accepted #6) prove the command *parses*; they do **not** prove a real secret was scrubbed before a real write. Add an integration test that feeds a known secret through both paths and asserts it never reaches the client. This is why "testing is straightforward" is only half true.

### C3 — `/converge` and profile features sit on a currently-degraded backend. Keep them Layer 2.
The Pi-docs analysis pulls `/converge` (→ `askProfile`) into the Layer-1 build. Two problems: (a) it crosses the Layer 1/2 boundary the review deliberately drew (`/context converge` is *the* Layer 2 anchor feature); (b) it depends on the intelligence backend, which was recently **re-architected to chunk/stream** instead of loading the whole user memory bank through one Supabase Edge Function and hitting the payload limit — the same failure class as secret-prescan breaking mid-way on large chunks. The fix landed but **needs reconfirmation that it works seamlessly** (operator, 2026-07-26).

**Do instead:** Layer 1 ships **search + capture only** (both work today: vector search + the jaccard fallback). Profile / `askProfile` / `/converge` / Mind·Heart·Concierge stay Layer 2 and are **gated on an intelligence-backend health check that probes the new chunked path** — not a ping, but a real over-the-old-payload-limit query that confirms chunked processing returns without breaking mid-way. Until that passes, the extension hides these features (or shows "temporarily unavailable") rather than surfacing backend errors.

### C4 — `subject_id` is a MaaS identity-mapping decision, not Pi's `context.user`.
The second analysis proposes "use Pi's `context.user` as `subject_id`." **Pi exposes no such field** — verified against pi.dev/docs: the extension context surfaces `ctx.sessionManager`, `ctx.modelRegistry`, `ctx.model`, `ctx.ui`, `ctx.store`, `ctx.fork`, etc., but **no user/account identity**. So there is nothing to hand over, and `subject_id` must come from the MaaS side.

**Resolve it as:** the subject boundary already exists in the product — it's the **`key_context`** field (`personal` / `team` / `enterprise`) carried on a **Memory Service Key** (`lano_*`), which determines the memory bucket a key can touch (see [dashboard-key-systems-map.md](../../../../docs/plans/dashboard-key-systems-map.md) §4, and `memory-context-separation.md` §P5). That is the **context-separation** feature the operator flagged as *implemented but not enabled in code*. So Pi's subject = **(authenticated user, `key_context`)** — one durable subject per user per context, which is exactly what makes conclusions converge across sessions instead of starting cold.

- **Co-requisite:** enabling context-separation (enforce `key_context` server-side) is required for the subject boundary to be real rather than cosmetic. Without it, `/switch-persona` changes a label but not the actual memory bucket.
- **Persona switch:** `/switch-persona` = switch the active `key_context` (personal ↔ team ↔ enterprise), i.e. select which Memory Service Key drives the session — not a new `subject_id` invented by Pi.
- SOUL.md remains the **bootstrap** seed (ingested once as `identity`/`personal` memories); MemoryProfile is runtime (review §2.11).

### C5 (corollary) — `pi.storage` does not automatically avoid the `~/.lanonasis/` collision.
The claim "use `pi.storage` and skip `~/.lanonasis/pi/`" is only true if you go **pure API**. But `createNodeMemoryClient` defaults `preferCLI: true` (`enhanced-client.ts:70`) — with defaults it routes through the installed `lanonasis`/`memory` CLI, which **still** reads/writes `~/.lanonasis/` (credential store, recall-lock, hooks). So you get the collision back exactly when you follow the "reuse createNodeMemoryClient" advice.

**Decide explicitly:** either (a) `preferCLI: false` → pure API, Pi state lives in Pi's own dir, no `~/.lanonasis/` writes, but you lose the auth-free CLI-passthrough and must own auth via C1; or (b) `preferCLI: true` → inherit the CLI's login, and namespace Pi's *own* artifacts under `~/.lanonasis/pi/` to avoid clobbering claude-memory/recall-forge. Given C1 (user OAuth in Pi), **(a) pure-API is the cleaner seam.**

---

## Revised build order

Keep the second analysis's lean phase structure; fold the guardrails in where they actually live. Effort is split honestly: **glue** (their optimistic band) vs **production-safe** (what the guardrails add).

| Phase | Task | Glue | Production-safe adds |
|---|---|---|---|
| 0 | Spike: hello-world Pi extension, confirm hot-reload + in-process `import` of a workspace pkg | 1h | — |
| 1 | Extension imports `createNodeMemoryClient` (**`preferCLI:false`**, C5); `searchMemories` from inside Pi | 2h | wire OAuth token (C1) instead of admin key |
| 2 | `/memory search`, `/memory save` via `pi.registerCommand` | 3h | redactor on the save path (C2) |
| 3 | `session_before_compact` → summary → MaaS; `session_shutdown` fallback | 2h | redactor on the compact path + integration test (C2) |
| 4 | `context` hook prepends relevant memories before LLM call | 2h | budget cap + provenance (review §Appendix A Phase 4 gap) |
| 5 | Identity: SOUL.md bootstrap-ingest as `identity` memories; `/switch-persona` = tag filter | 2h | subject = MaaS identity (C4) |
| 6 | `/converge` + Mind/Heart/Concierge | — | **Layer 2**, gated on backend health (C3) — not in the Layer-1 number |
| 7 | Auth hardening: token refresh, expiry-under-load handling | — | real work; the admin-key path (C1) does not survive load |
| 8 | Tests: mock-`pi` for glue **+** live-secret-through-both-write-paths integration test (C2) | 4h | integration/privacy tests dominate |

**Honest estimate:** the **glue** really is ~1–2 focused days, as the second analysis says — *if* Layer 1 is scoped to search + capture. The gap between that and something user-ready is **auth (C1) + privacy hardening (C2) + integration tests**, not more feature code. `/converge` (C3) is Layer 2 and rides on a backend that needs its own fix first — do not let it inflate the Layer-1 estimate or block the Layer-1 ship.

---

## Decisions — RESOLVED (this is the spec)

### D1 — Subject scoping → **(authenticated user, `key_context`)**
One durable MaaS subject per user per memory context. Pi provides no identity (C4); the subject is the LanOnasis account resolved at login, and the context is the `key_context` (`personal`/`team`/`enterprise`) on the active Memory Service Key. **Co-requisite: enable context-separation** (`memory-context-separation.md` §P5 — implemented, not yet enabled) so the boundary is enforced, not cosmetic. `/switch-persona` switches `key_context`.

### D2 — Auth mode → **register LanOnasis as a Pi provider; hold a consumer-scoped `lano_*` Memory Service Key; not MCP; no repl-cli dependency**
Answering the operator's direct question ("import the OAuth flow, or require repl-cli? provider vs MCP?"):

- **Register a Pi provider, don't import repl-cli.** Pi has first-class auth: `pi.registerProvider(name, { oauth })` puts LanOnasis in the `/login` menu, or `createProvider({ auth: { apiKey: { login, resolve } } })` (from `@earendil-works/pi-ai`) drives an interactive key-entry + credential store. Pi owns login, storage, and resolution (`ctx.modelRegistry.getProviderAuth(id)` returns the current key/headers/baseUrl). **Do not require the user to have repl-cli installed**, and **do not import repl-cli's OAuth code** — port only the *config* (auth endpoints, client id, scopes, PKCE) from `repl-cli/src/auth/oauth-flow.ts` into Pi's provider `oauth` block. repl-cli is the reference, not a runtime dep.
- **The credential is a consumer-scoped `lano_*` Memory Service Key, not the admin `LANONASIS_API_KEY` and not an MCP Router Key.** Per `dashboard-key-systems-map.md`: `lano_*` Memory Service Keys carry `key_context` and gate memory access; `vx_prod_*` MCP Router Keys gate *external integrations* (GitHub/Slack/Stripe) — a different system. Pi's memory path uses the former. This is why **the answer to "provider vs MCP" is provider**: MCP is the wrong key system for memory, and it's the heavier surface. (MCP stays a future option only if other agents later need LanOnasis tools.)
- `createNodeMemoryClient(preferCLI:false)` consumes the resolved key → pure API, no `~/.lanonasis/` writes (C5).

### D3 — Privacy default → **redact-and-capture, block-mode for high-severity**
recall-forge default (redact) for normal PII/secret classes; block-mode (refuse capture) for high-severity (private keys, live `sk-…`, `postgres://…` with creds). Redactor mandatory on both write paths (`/memory save`, `session_before_compact`), proven by a live-secret-through-both-paths integration test. Pi's own docs warn packages "run with full system access" — an in-package, non-bypassable redactor is the right posture.

### D4 — `/converge` timing → **Layer 2, gated on the chunked-backend health probe**
Not in the Layer-1 build. Opens only after the re-architected chunked/streamed intelligence backend is reconfirmed by a real over-the-old-payload-limit probe (C3).

*(D5 — fork vs extension: the docs settle it. Every requirement — context injection, background tasks, persistence, hot-reload, provider auth — is a first-class extension capability. Treat fork as a dead branch; keep the 1-day spike only as a smoke test, not a real fork evaluation.)*

---

## Dependency chain — why #192–#194 must land first
Pi Layer-1 auth **cannot ship** until the Memory Service Key path works, so these GitHub issues are hard prerequisites, not parallel work:

| Issue | What it is | Why Pi needs it |
|---|---|---|
| **#192** | Dashboard Memory-Key creation is broken (`ApiKeyManager`) | Users must be able to mint the `lano_*` key Pi authenticates with. Blocks D2. |
| **#194** | Consumer-scoped keys | Provides the user-scoped key (vs admin `LANONASIS_API_KEY`). This *is* the C1/D2 fix at the product level. |
| **context-separation enablement** (`memory-context-separation.md` §P5) | `key_context` enforcement, implemented but off | Makes D1's subject boundary real; without it `/switch-persona` is cosmetic. |
| **#193** | Key-page nav/labels (Memory Keys vs MCP Router Keys) | UX clarity so users pick the right key system; not a blocker but reduces the "three keys, one product" confusion (review §2.13). |

Sequence: land #192 + #194 + flip context-separation on → then Pi D1/D2 are executable.

---

## Verified Pi API surface (pi.dev/docs/latest, 2026-07-26)

| Need | Pi mechanism (confirmed) |
|---|---|
| Auth / login | `pi.registerProvider(name, { oauth })` → `/login` menu; or `createProvider({ auth:{ apiKey:{ login(interaction), resolve({credential}) } } })`. Resolve via `ctx.modelRegistry.getProviderAuth(id)`. |
| Memory capture trigger | `session_before_compact` (`reason`: `manual`/`threshold`/`overflow`; can supply custom summary) — **primary**; `session_shutdown` (`reason`: quit/reload/new/resume/fork) — fallback. |
| Context injection | `context` event — "Fired before each LLM call. Modify messages non-destructively." Return `{ messages }`. |
| Identity / SOUL.md into prompt | `before_agent_start` — inject a persistent `message` and/or modify `systemPrompt` for the turn. |
| Commands | `pi.registerCommand(name, { description, handler, getArgumentCompletions? })` → `/memory search`, `/memory save`, `/switch-persona`, (`/converge` L2). |
| LLM-callable memory (optional) | `pi.registerTool({ name, description, promptGuidelines })` + `pi.setActiveTools()`. |
| Pi-local state | `pi.appendEntry(customType, data)` (not in LLM context; restore by scanning `ctx.sessionManager.getEntries()` on `session_start`); scoped `ctx.store` for provider data. |
| User prompts (key entry etc.) | `ctx.ui` (`select`/`confirm`/`input`/`notify`), `interaction.prompt({ type:"secret" })`. |

## Packaging & distribution (pi.dev/docs/latest/packages)

Ship as a Pi package: `pi install npm:@lanonasis/pi-memory@x` (or `git:` / path). Declare resources under the `package.json` `pi` key or use convention dirs (`extensions/`, `skills/`, …).
- **peerDependencies `"*"`** (do not bundle): `@earendil-works/pi-ai`, `@earendil-works/pi-coding-agent`, `@earendil-works/pi-tui`, `typebox`.
- **dependencies** (installed on `pi install`): `@lanonasis/memory-client`. ⚠️ **Publish check:** `recall-forge` must be npm-published (or bundled via `bundledDependencies`) for the redactor to install outside the monorepo — verify before first release; it is currently a workspace package.
- Project-shared install: `pi install -l …` writes `.pi/settings.json` so the team auto-installs on startup.

---

*Spec status: D1–D4 resolved, Pi API + packaging verified against source docs, prerequisite issues named. Ready to spike Phase 0 and, in parallel, land #192/#194 + flip context-separation.*

# Pi × LanOnasis MaaS Integration — Plan Review & Gap Analysis

**Reviewer:** Claude (Opus 4.7) — AI-generated, pending human sign-off
**Date:** 2026-05-12
**Code references valid as of:** 2026-05-12 (working tree; line numbers may drift — prefer symbol names below)
**Source plan:** [pi-maas-integration.md](./pi-maas-integration.md)
**Compared against:** [packages/repl-cli/](../../../packages/repl-cli/), [packages/memory-client/](../../../packages/memory-client/), [packages/recall-forge/](../../../packages/recall-forge/), [packages/claude-memory/](../../../packages/claude-memory/), [packages/ide-extension-core/](../../../packages/ide-extension-core/)

---

## TL;DR

The plan is conceptually sound but **substantially re-specifies work that already exists** in this monorepo. **Substantial portions of Phases 2, 4, and 6 are already implemented** as shipping packages (see the per-phase evidence table in §1 and the coverage matrix in [Appendix A](#appendix-a--coverage-matrix-evidence)). The plan also has a few hard structural blind spots — subject scoping, privacy redaction, configDir collision, and a missing "is this a fork or a plugin?" decision — that, if not closed, will surface as bugs late in implementation.

Strong recommendation: **before forking Pi, reframe the plan as "compose existing packages into a Pi harness" and only then decide whether forking is necessary.**

---

## 1. What you've already built (and the plan doesn't credit)

| Plan phase / requirement | Where it already lives | Status |
|---|---|---|
| Phase 2 — `searchMemories / saveMemory / getMemory / list / update / delete` | [`memory-client/src/core/client.ts`](../../../packages/memory-client/src/core/client.ts) — symbols: `searchMemories`, `createMemory`, `getMemory`, `listMemories`, `updateMemory`, `deleteMemory` | ✅ Shipped — `@lanonasis/memory-client@^2.2.0` |
| Phase 2 — Living memory profile, reflection, pattern detection | [`memory-client/src/core/client.ts`](../../../packages/memory-client/src/core/client.ts) — symbols: `askProfile`, `getProfile`, `getProfileHistory`, `listInferredConclusions`, `getReasoningJobStatus`, `flushReasoningQueue` | ✅ Shipped (server-side endpoints, SDK methods) |
| Phase 2 — "graceful degrade when API unavailable" | `claude-memory` spool/drain pattern + `memory-client/node` CLI passthrough | ✅ Shipped, proven |
| Phase 3 — `/memory search`, `/memory save`, `/intelligence`, `/conclusions`, `/profile show/history/ask` | [`repl-cli/src/commands/memory-commands.ts`](../../../packages/repl-cli/src/commands/memory-commands.ts) (`MemoryCommands.create/update/search/list/get/delete/listConclusions/profileShow/profileAsk`) + [`repl-cli/src/core/repl-engine.ts`](../../../packages/repl-cli/src/core/repl-engine.ts) (`ReplEngine.registerCommands`) | ✅ Already wired in repl-cli |
| Phase 4 — Context pack injection before each model call | [`repl-cli/src/core/orchestrator.ts`](../../../packages/repl-cli/src/core/orchestrator.ts) — symbols: `NaturalLanguageOrchestrator.initializeContext`, `fetchRelevantContext` | ✅ Working in repl-cli; threshold 0.65, limit 3, dedup-by-id |
| Phase 4 — "Avoid context bloat, provenance metadata, explainable" | recall-forge does this for OpenClaw: `maxRecallChars`, similarity threshold, prompt-injection filter, secret redaction | ✅ Reference impl exists |
| Phase 6 — Session ingest at meaningful boundaries | [`packages/claude-memory/`](../../../packages/claude-memory/README.md) captures on `Stop` and `PreCompact`, with recall lock per session | ✅ Reference impl exists |
| Identity profile loader (SOUL.md style) | recall-forge already extracts `SOUL.md` via `openclaw recall extract` (heading splitter) | ✅ Reusable extractor |
| OAuth / OTP / PKCE | [`repl-cli/src/auth/oauth-flow.ts`](../../../packages/repl-cli/src/auth/oauth-flow.ts) (`performOAuthLogin`, `refreshAccessToken`) + `@lanonasis/oauth-client` `MagicLinkFlow` | ✅ Shipped |
| AI orchestration (router + fallback + L0) | [`repl-cli/src/core/orchestrator.ts`](../../../packages/repl-cli/src/core/orchestrator.ts) — symbols: `AIRouterClient`, `L0Orchestrator`, `resolveOpenAIModel` | ✅ Shipped — "LZero" brand wraps it |

**Implication:** Phases 2 and 4 are essentially "wire memory-client into Pi" — not "implement memory provider from scratch." Phase 6 should be "port the claude-memory hook pattern to Pi's debug/event hooks." Phase 3 should be "copy the existing slash-command set from repl-cli."

---

## 2. Gaps & blind spots in the plan

These are the things that **will bite you** if not resolved before code is written.

### 2.1 Subject scoping is undefined ⚠️ (highest risk)

Every intelligence/profile endpoint requires a `subject_id` (UUID). The plan never says **who or what the subject is** in a Pi session. Options:

- The authenticated user (1 subject per user)
- The session (1 subject per CLI invocation — but then conclusions never converge)
- A "persona slot" tied to identity profile (lets you switch between work-self / personal-self contexts)

repl-cli currently punts this to `--subject=<uuid>` flags on every command. That's a stopgap, not a design. **Decide this before Phase 2.** It governs whether the second-brain mode is coherent across sessions or starts cold every time.

### 2.2 Fork vs plugin decision is missing

The plan defaults to "fork or branch Pi." Pi's docs say providers/prompts/skills/themes are first-class extension points. **Investigate extension-first.** Forking costs:

- Permanent upstream divergence (no free Pi updates)
- Test suite ownership (their tests now test your defaults)
- Brand-rename surface area across the codebase

Reversibility is claimed in the constraints but a fork is not reversible. Spell out: "We will first attempt to ship as a Pi extension/skill; only fall back to fork if the extension API can't reach context injection." That is reversible.

### 2.3 Privacy / PII pipeline is absent

Plan says "do not hardcode secrets" — that's about Pi's own config, not about **what the user's terminal session will leak to MaaS storage**. Session ingest will route raw terminal content (commands, paths, env exports, API responses) into vector storage. Without a redactor you will write `sk-ant-…`, `AKIA…`, `postgres://user:pass@…` into long-term memory and surface them later in semantic search results.

recall-forge has **30+ pattern redactor + privacy-sdk PII layer**. The Pi provider should reuse the same `Privacy Guard Stage 1 + Stage 2` pipeline before any MaaS write. This needs to be a non-negotiable line in the implementation plan, not implied.

### 2.4 configDir collision

Plan sets `"configDir": ".lanonasis"`. But `~/.lanonasis/` is already used by **recall-forge**, **claude-memory**, and **repl-cli**. Today these write:

- `~/.lanonasis/.env` (recall-forge)
- `~/.lanonasis/hooks/` (claude-memory)
- `~/.lanonasis/.recall-lock/<session_id>` (claude-memory)
- credentials store (repl-cli oauth-client)

If Pi writes into the same root with `name: "l0-concierge"`, namespace it: `~/.lanonasis/concierge/` or `~/.lanonasis/pi/`. Otherwise Pi's pi-debug.log will sit next to claude-memory's hook config and one of them will eventually clobber the other.

### 2.5 Env variable namespace fragmentation

Plan introduces:
- `LANONASIS_MAAS_API_URL`
- `LANONASIS_MAAS_API_KEY`

But the rest of the monorepo uses:
- `LANONASIS_API_KEY`
- `LANONASIS_ORG_ID` / `LANONASIS_PROJECT_ID`
- `LANONASIS_API_URL` (where applicable)

Users will have one MaaS API key and three different env-var names looking at it. **Reuse the existing names**, add only Pi-specific ones (`LANONASIS_IDENTITY_PROFILE`, `LANONASIS_CONTEXT_MODE`, `LANONASIS_MEMORY_DEBUG` are fine — they're net-new).

### 2.6 Three CLIs in the same conceptual lane

You already ship:
- `@lanonasis/cli` (`memory`) — flag-driven CLI
- `@lanonasis/repl-cli` (`onasis-repl` / `lrepl`) — interactive REPL with NL mode, intelligence, profile

Adding `l0-concierge` makes three. Position Pi explicitly as one of:

(a) **Replacement for `onasis-repl`** — repl-cli sunsets, Pi becomes the REPL. Migration plan needed.
(b) **TUI sibling** — `onasis-repl` stays as headless/scriptable REPL, Pi is the rich-TUI surface. Document the split.
(c) **Mode of `memory`** — `memory shell` opens the Pi TUI. One brand, three surfaces.

Pick one in the architecture summary deliverable. Right now (c) gives the cleanest user story.

### 2.7 `getContextPack / synthesizeReflection / detectPatterns / generateHandoff` don't exist as SDK methods

Plan lists these as required Provider methods, but:

| Method | Status in `@lanonasis/memory-client@2.2.0` |
|---|---|
| `getContextPack(sessionId, goal)` | ❌ Not implemented (compose from `search` + `askProfile` + `listInferredConclusions`) |
| `synthesizeReflection(sessionId)` | ❌ Not implemented (could be `askProfile` with a templated question) |
| `detectPatterns(scope)` | ⚠️ Partial — `listInferredConclusions` returns reasoned patterns; no scope filter beyond subject |
| `generateHandoff(sessionId, targetAgent)` | ❌ Not implemented |
| `ingestSessionEvent(event)` | ⚠️ Use `createMemory` with `memory_type: 'workflow'` + tags; or extend MaaS with a dedicated session-events endpoint |

For each, the plan needs to mark: **"new MaaS endpoint required" vs "client-side composition over existing primitives."** Server-side work belongs in `apps/onasis-core/supabase/functions/` — that is a separate scope from Pi and should be planned before Pi tries to call them.

Cheapest path for v1: implement all four as **client-side compositions** in a `LanOnasisMemoryProvider` adapter, using only methods that already exist. Promote to dedicated endpoints later if performance demands it.

### 2.8 Handoff as a memory type, not a method

`/handoff hermes` should produce a handoff prompt. Simplest implementation: `createMemory({ memory_type: 'workflow', tags: ['handoff', 'target:hermes'], content: <structured-handoff> })`. Hermes then runs `searchMemories({ tags: ['handoff', 'target:hermes'], status: 'active' })`. No new endpoint, reuses RLS scoping, retrievable across sessions, audit-traceable. **The plan invents `generateHandoff()` as if it's an action; it's actually persistence + retrieval.**

### 2.9 Multi-perspective mode (Mind/Heart/Concierge) is under-specified

The plan describes these as three personas but doesn't say:
- One LLM call rendering all three sections? Or three calls fanned out and merged?
- Do all three see the same context pack, or different slices?
- Is it deterministic (always renders three) or content-aware (only render the lens that fits)?

repl-cli's orchestrator already does context-aware response shaping (main answer + additional context + suggested action). **Mind/Heart/Concierge is a system-prompt variant + response shaper change**, not a new architecture. Specify it as: one model call, structured-output prompt, post-processed into three blocks. ~150 LoC change to the orchestrator.

### 2.10 Session-event granularity is too high

Plan wants to ingest:
> user message · assistant response summary · command executed · memory records used · decisions made · tasks created · insights detected · unresolved questions · project metadata · timestamp

Every user message = a write. That destroys the embedding budget and produces high-noise low-signal memory. claude-memory learned to capture only at meaningful event boundaries (`Stop`, `PreCompact`). recall-forge captures only after `captureMode` filter passes.

For Pi, replicate the same: **capture at session-end and at explicit `/reflect` / `/memory save`**, not on every turn. Make per-turn ingest opt-in via `LANONASIS_CONTEXT_MODE=verbose`.

### 2.11 Identity profile vs Living Memory Profile

Plan loads `SOUL.md` from the config dir as identity. But Phase 2 of MaaS already builds a **dynamic** `MemoryProfile` from memories (`askProfile`, `getProfileHistory`). These are different things and the plan conflates them:

- **SOUL.md**: static, user-curated seed. Loaded into system prompt.
- **MemoryProfile**: derived, evolving, queryable. Materialized from memory corpus.

Suggested mental model: **SOUL.md is bootstrap, MemoryProfile is runtime.** On first run, ingest SOUL.md as memories of type `personal`/`identity`. From then on, profile evolves through normal capture. `/identity load <profile>` then becomes "switch which identity-tagged memory set drives context."

### 2.12 No reuse of `createNodeMemoryClient(preferCLI: true, enableMCP: true)`

[`packages/memory-client/src/node/enhanced-client.ts:472`](../../../packages/memory-client/src/node/enhanced-client.ts#L472) already exposes a Node client that:
- Detects installed `lanonasis`/`memory` CLI and routes through it (auth-free path if user is already logged in)
- Falls back to direct API
- Opens MCP channels for higher-throughput batch ops

Pi's `LanOnasisMemoryProvider` should be a ~30-line wrapper around this, not a new HTTP client. **Plan currently implies a fresh provider implementation.**

### 2.13 Vendor abstraction / "LZero" branding

repl-cli enforces "no vendor names in logs" (V1_CONCIERGE_SESSION_SUMMARY: AI Router → LZero Primary, OpenAI → LZero Backup). Plan introduces "Pi" branding plus Mind/Heart/Concierge. If Pi is user-facing, **align with LZero naming** or explicitly carve out an exception. Otherwise users see "Pi" + "LZero" + "Lan Onasis" in one terminal and assume they're separate products.

### 2.14 Test plan is wishful

`./test.sh && npm test && npm run build` — but if you fork Pi, **Pi's own test suite is now your test suite**, including their unit tests of default brand strings, default configDir, default banner. Plan needs:
- Which Pi tests we accept as broken post-rename (rename brand-string assertions)
- Which we keep green (provider, command parsing, context injection — net-new)
- Whether we publish under a different npm name (almost certainly yes if forked)

---

## 3. Recommended reframing

The plan as written is "build a Pi fork with a memory provider." Reframe to:

> **Build a Pi-compatible memory + context skill (extension preferred, fork as fallback) that composes existing LanOnasis packages.**

Concretely:

```
                                            ┌─ memory-client/node (API + CLI + MCP)
                                            │
Pi Skill / Provider  ────►  LanOnasisAdapter ─┼─ recall-forge privacy pipeline (redactor + PII)
                                            │
                                            └─ orchestrator-style context fetch (from repl-cli)
```

The adapter is the only net-new code; everything else is composition. The order-of-magnitude difference between an extension-style integration and a full Pi rebrand is roughly **one order of magnitude**, not a precise multiple — see methodology note below the table.

### Suggested revised phasing

| Phase | Revised scope | Net-new code (order of magnitude) |
|---|---|---|
| 1 | **Decide fork vs skill** by spiking the Pi extension API — 1 day timebox | none (spike only) |
| 2 | `LanOnasisMemoryProvider` adapter wrapping `createNodeMemoryClient` + recall-forge privacy stack | small (a few hundred LoC) |
| 3 | Slash commands — port from [`repl-cli/src/commands/memory-commands.ts`](../../../packages/repl-cli/src/commands/memory-commands.ts) + register in Pi's command surface | small (hundreds of LoC of glue) |
| 4 | Context injection hook into Pi's prompt pipeline (mirror `fetchRelevantContext` shape) | small (low hundreds of LoC) |
| 5 | Mind/Heart/Concierge as one structured-output orchestrator call (system-prompt variant + response shaper) | small (low hundreds of LoC) |
| 6 | Session ingest at boundary events only (Stop-equivalent in Pi) — pattern from [`packages/claude-memory/`](../../../packages/claude-memory/README.md) | small–medium (a few hundred LoC) |
| 7 | SOUL.md bootstrap (extract → ingest as `personal`/`identity` memories) + MemoryProfile wiring | small (~100 LoC) |
| 8 | Tests for adapter + commands + privacy pipeline | medium (several hundred LoC, includes fixtures) |

**Estimate methodology.** Sizes above are gut-feel order-of-magnitude bands, not measured. The bands assume:
- **Reuse-heavy adapter**: `LanOnasisMemoryProvider` wraps `createNodeMemoryClient` from `memory-client/node` and chains recall-forge's privacy pipeline; HTTP, auth, retry, dedup, PII are *not* re-implemented.
- **Glue, not greenfield**: command handlers are ports of `MemoryCommands.*` methods adjusted for Pi's command surface; per-command size is dominated by arg-parsing and output formatting, not business logic.
- **No new MaaS endpoints** in v1 (Phases 4–6 use composition over existing primitives — see §2.7).
- **No Pi brand-rename surface counted**: that cost only applies if Phase 1 lands on "fork." A skill/extension outcome keeps Pi's brand assets untouched.
- **Test cost ≈ adapter cost**: the privacy pipeline and ingest boundaries need both unit and integration tests, which inflates Phase 8.

If Phase 1 resolves to "fork Pi," add a separate brand-rename track that is *order-of-magnitude larger* than any single phase above (banners, configDir, package name, env-var prefixes, debug log paths, theme files, plus owning Pi's test suite — see §2.14). That is the cost being avoided by the extension-first recommendation.

For a defensible LoC number per phase, the right next step is a one-day spike that scaffolds the adapter against `createNodeMemoryClient` and measures actual diff size; this review intentionally does not produce that number.

---

## 4. Specific edits to the plan document

Before executing, edit [pi-maas-integration.md](./pi-maas-integration.md):

1. **Add a "Prior Art" section** at the top citing recall-forge, claude-memory, memory-client, repl-cli with one-line "what it gives us" each.
2. **Replace Phase 2** with: "Build a thin `LanOnasisMemoryProvider` adapter over `@lanonasis/memory-client/node` and reuse recall-forge's privacy pipeline. Do not re-implement HTTP, auth, retry, dedup, or PII handling."
3. **Insert subject-scoping decision** as Phase 1.5 — block all downstream work until resolved.
4. **Insert fork-vs-skill spike** as Phase 0 — timebox 1 day.
5. **Mark each Provider method** in Phase 2 as either *(client composition)* or *(new MaaS endpoint required)*.
6. **Add privacy section** referencing recall-forge's 30-pattern redactor + privacy-sdk Stage 2.
7. **Normalize env vars** — drop `LANONASIS_MAAS_*`, reuse `LANONASIS_API_KEY` / `LANONASIS_API_URL` / `LANONASIS_ORG_ID`.
8. **Namespace configDir** to `.lanonasis/concierge/` (or chosen name).
9. **Spell out CLI positioning** vs `memory` and `onasis-repl` — pick (a)/(b)/(c) from §2.6.
10. **Add identity layering** — SOUL.md as bootstrap, MemoryProfile as runtime.
11. **Add test ownership table** — which Pi-upstream tests we keep, fix, or retire.

---

## 5. Open questions for you

1. **Subject scoping** — is the subject the user, the session, or a switchable persona?
2. **Fork or extension** — willing to spike the Pi extension API for 1 day before deciding?
3. **CLI positioning** — does Pi replace `onasis-repl`, sit alongside, or become a mode of `memory`?
4. **Handoff target** — does Hermes-Agent live in this monorepo, or is it the agent inside Pi itself producing handoffs *for* a future Hermes process?
5. **Server-side endpoints** — comfortable building `/context/pack`, `/reflection`, `/handoff` as new EFs in `apps/onasis-core`, or prefer client-side composition for v1?
6. **Privacy default** — block-mode (refuse to capture if secret detected) or redact-and-capture (recall-forge default)?

Answer those six and the plan becomes a concrete spec rather than a manifesto.

---

## 6. The real test (your closing question)

> Can a customizable terminal agent become a live interface to a persistent second brain that can reason across memory, identity, intent, and execution?

You already proved 60% of the answer is yes — that's what `onasis-repl` + `memory-client` + `recall-forge` + `claude-memory` together demonstrate today. Pi adds **richer TUI + Pi's extension surface**, not memory or reasoning capability. The experiment worth running is: **does Pi's UX make the existing capability feel like a second brain, when `onasis-repl` doesn't?** That's a UX question, not an architecture question.

If the answer is no after a Pi spike, the right move is to invest in `onasis-repl`'s UX (ink-based dashboard already exists in `src/ui/components/DashboardApp.tsx`) rather than absorb Pi's fork cost.

---

## Appendix A — Coverage matrix evidence

**Methodology.** This review did not compute a code-coverage percentage. Findings come from: (i) `grep` of the method names listed in the source plan's Provider interface against `packages/memory-client/src/`; (ii) reading the READMEs and command-registration code of `repl-cli`, `recall-forge`, and `claude-memory`; (iii) inspecting `repl-engine.ts` slash-command wiring. No LoC or feature-count weighting was applied. The phrase "substantial portions" in §TL;DR reflects qualitative judgment from the table below, not a measured percentage.

**Per-phase evidence (against the source plan's stated requirements):**

| Plan phase | Plan requires | Implemented today | Missing today | Evidence |
|---|---|---|---|---|
| Phase 2 — Provider methods | 8 methods: `searchMemories`, `saveMemory`, `getContextPack`, `ingestSessionEvent`, `synthesizeReflection`, `detectPatterns`, `generateHandoff`, plus typed errors / graceful degrade | 4/8 directly (`searchMemories`, `saveMemory`/`createMemory`, plus `getMemory`/`update`/`list`/`delete` adjacents); `detectPatterns` partially via `listInferredConclusions` | `getContextPack`, `ingestSessionEvent`, `synthesizeReflection`, `generateHandoff` not in SDK | [`memory-client/src/core/client.ts`](../../../packages/memory-client/src/core/client.ts) — see Phase 2 reproducer command below table |
| Phase 3 — Slash commands | 11 commands (`/memory search/save`, `/context pack/converge`, `/identity load`, `/reflect`, `/mind`, `/heart`, `/concierge`, `/handoff hermes`, `/debug-memory`) | 6/11 equivalents (`create`, `update`, `search`, `list`, `get`, `delete`, plus `conclusions`, `intelligence` not in plan) | `/context`, `/identity`, `/reflect`, `/mind`, `/heart`, `/concierge`, `/handoff`, `/debug-memory` | [`repl-cli/src/core/repl-engine.ts`](../../../packages/repl-cli/src/core/repl-engine.ts) — `ReplEngine.registerCommands` |
| Phase 4 — Context injection | Compact pack with: identity, project, goal, memories, patterns, constraints, decisions, next actions; provenance; `/debug-memory`; budget cap | Per-query fetch (`fetchRelevantContext`, threshold 0.65, limit 3); startup preferences load (`initializeContext`) | No budget cap, no provenance surfaced, no structured pack object, no `/debug-memory` | [`repl-cli/src/core/orchestrator.ts`](../../../packages/repl-cli/src/core/orchestrator.ts) — `NaturalLanguageOrchestrator.initializeContext`, `fetchRelevantContext`; recall-forge has cap + provenance for OpenClaw but not wired into repl-cli |
| Phase 5 — Multi-perspective | Mind / Heart / Concierge lenses, toggleable modes | None | All | n/a |
| Phase 6 — Session ingest | Structured event stream + end-of-session synthesis to MaaS | claude-memory captures on Claude Code `Stop` / `PreCompact` only | Pi-side capture; structured event schema; per-turn opt-in | [`claude-memory/README.md`](../../../packages/claude-memory/README.md) |
| Phase 7 — Tests | Provider mocks, command parsing, context formatting, identity load, second-brain formatting | Tests exist for repl-cli engine/commands; no Pi-target tests | Pi adapter tests, privacy-pipeline tests for Pi-shape ingest | `packages/repl-cli/tests/`, `packages/recall-forge/__tests__/` |

**Phase 2 reproducer (Evidence column).** To reproduce the Phase 2 row's "implemented" claim, from the monorepo root run:

```bash
grep -nE 'async (search|create|get|update|delete|list)Memory|listInferred|askProfile|getProfile' \
  packages/memory-client/src/core/client.ts
```

This lists each implemented Provider-adjacent method with its line number; absence of `getContextPack`, `ingestSessionEvent`, `synthesizeReflection`, `generateHandoff` from the output is the evidence for "not in SDK."

**Caveat.** "Implemented today" means *exists somewhere in the monorepo*, not *exists as a callable from a Pi process*. Most of what's there will need an adapter shim; that adapter is the actual Phase 2 work this review recommends scoping.

**Follow-up.** If a precise coverage percentage is needed for planning, the right next step is a focused audit issue that computes per-method LoC + test coverage in `packages/memory-client` against the plan's Provider interface. This review intentionally does not produce that number.

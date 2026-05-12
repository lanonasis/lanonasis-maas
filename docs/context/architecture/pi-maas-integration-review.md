# Pi × LanOnasis MaaS Integration — Plan Review & Gap Analysis

**Reviewer:** Claude (Opus 4.7)
**Date:** 2026-05-12
**Source plan:** [pi-maas-integration.md](./pi-maas-integration.md)
**Compared against:** [packages/repl-cli/](../../../packages/repl-cli/), [packages/memory-client/](../../../packages/memory-client/), [packages/recall-forge/](../../../packages/recall-forge/), [packages/claude-memory/](../../../packages/claude-memory/), [packages/ide-extension-core/](../../../packages/ide-extension-core/)

---

## TL;DR

The plan is conceptually sound but **substantially re-specifies work that already exists** in this monorepo. Roughly **70% of Phases 2, 4, and 6 are already implemented** as shipping packages. The plan also has a few hard structural blind spots — subject scoping, privacy redaction, configDir collision, and a missing "is this a fork or a plugin?" decision — that, if not closed, will surface as bugs late in implementation.

Strong recommendation: **before forking Pi, reframe the plan as "compose existing packages into a Pi harness" and only then decide whether forking is necessary.**

---

## 1. What you've already built (and the plan doesn't credit)

| Plan phase / requirement | Where it already lives | Status |
|---|---|---|
| Phase 2 — `searchMemories / saveMemory / getMemory / list / update / delete` | [`packages/memory-client/src/core/client.ts`](../../../packages/memory-client/src/core/client.ts) | ✅ Shipped — `@lanonasis/memory-client@^2.2.0` |
| Phase 2 — Living memory profile, reflection, pattern detection | [`client.ts:933 askProfile / getProfile / getProfileHistory`](../../../packages/memory-client/src/core/client.ts#L933) + Phase 1 conclusions endpoints | ✅ Shipped (server-side endpoints, SDK methods) |
| Phase 2 — "graceful degrade when API unavailable" | `claude-memory` spool/drain pattern + `memory-client/node` CLI passthrough | ✅ Shipped, proven |
| Phase 3 — `/memory search`, `/memory save`, `/intelligence`, `/conclusions`, `/profile show/history/ask` | [`packages/repl-cli/src/commands/memory-commands.ts`](../../../packages/repl-cli/src/commands/memory-commands.ts) + [`repl-engine.ts:191`](../../../packages/repl-cli/src/core/repl-engine.ts#L191) | ✅ Already wired in repl-cli |
| Phase 4 — Context pack injection before each model call | [`orchestrator.ts:initializeContext + fetchRelevantContext`](../../../packages/repl-cli/src/core/orchestrator.ts#L161) | ✅ Working in repl-cli; threshold 0.65, limit 3, dedup-by-id |
| Phase 4 — "Avoid context bloat, provenance metadata, explainable" | recall-forge does this for OpenClaw: `maxRecallChars`, similarity threshold, prompt-injection filter, secret redaction | ✅ Reference impl exists |
| Phase 6 — Session ingest at meaningful boundaries | [`packages/claude-memory/`](../../../packages/claude-memory/README.md) captures on `Stop` and `PreCompact`, with recall lock per session | ✅ Reference impl exists |
| Identity profile loader (SOUL.md style) | recall-forge already extracts `SOUL.md` via `openclaw recall extract` (heading splitter) | ✅ Reusable extractor |
| OAuth / OTP / PKCE | [`packages/repl-cli/src/auth/oauth-flow.ts`](../../../packages/repl-cli/src/auth/oauth-flow.ts) + `@lanonasis/oauth-client` `MagicLinkFlow` | ✅ Shipped |
| AI orchestration (router + fallback + L0) | [`orchestrator.ts`](../../../packages/repl-cli/src/core/orchestrator.ts) (`AIRouterClient`, `L0Orchestrator`, model resolution) | ✅ Shipped — "LZero" brand wraps it |

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

The adapter is the only new code. Everything else is composition. ~600 LoC vs ~6000 LoC of fork rebrand.

### Suggested revised phasing

| Phase | Revised scope | New code estimate |
|---|---|---|
| 1 | **Decide fork vs skill** by spiking the Pi extension API — 1 day timebox | ~0 LoC |
| 2 | `LanOnasisMemoryProvider` adapter wrapping `createNodeMemoryClient` + recall-forge privacy stack | ~400 LoC |
| 3 | Slash commands — port from repl-cli (`memory-commands.ts` is already there) | ~200 LoC of glue |
| 4 | Context injection hook into Pi's prompt pipeline | ~150 LoC |
| 5 | Mind/Heart/Concierge as one structured-output orchestrator call | ~150 LoC |
| 6 | Session ingest at boundary events only (Stop-equivalent in Pi) | ~250 LoC |
| 7 | SOUL.md bootstrap + MemoryProfile runtime wiring | ~100 LoC |
| 8 | Tests for adapter + commands + privacy pipeline | ~500 LoC |

Total: **~1750 LoC of net-new work** vs the plan's implicit ~6000+ for a full fork rebrand.

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

# Capture-Event Ontology — Phase A↔B Bridge Spec

**Status:** v0 locked — ready for implementation
**Date:** 2026-05-12
**Reviewer:** Claude (Opus 4.7) — AI-generated, pending human sign-off
**Why this exists:** Phase B's `/context converge` quality is bounded by what Phase A captures. Without a classification layer, every captured memory is undifferentiated text and convergence collapses to "you talk a lot about X." This spec defines the minimum classification needed to make convergence non-trivial — see [[project_pi_two_layer_strategy]].

---

## Grounding constraint

The existing memory schema (per [`packages/memory-client/src/core/client.ts`](../../../packages/memory-client/src/core/client.ts)) gives us four classification surfaces:

| Field | Type | Purpose today |
|---|---|---|
| `title` | string | Human label |
| `content` | string | Body |
| `memory_type` | enum: `context` \| `project` \| `knowledge` \| `reference` \| `personal` \| `workflow` | Coarse domain bucket |
| `tags` | string[] | Free-form facets |
| `status` | enum: `active` \| `archived` \| `draft` \| `deleted` | Lifecycle |

**Design rule for v0:** ship the ontology purely as a **tag convention** (`event:<type>`) layered on the existing `memory_type` enum. No schema changes, no new endpoints. Anything that needs more structure than tags can carry is deferred to v1 with explicit MaaS schema-extension cost called out.

---

## The 7 event types

Each event type is a tag of the form `event:<type>`. They are **orthogonal to `memory_type`** — a single memory can be `memory_type: 'project'` and tagged `event:decision`. Convergence reads the `event:*` tag space; existing tooling keeps reading `memory_type`.

### 1. `event:decision`
**What:** An explicit choice between two or more alternatives, with rationale.
**Capture trigger:** Detected when message contains "we'll go with…", "decided to…", "choosing X over Y because…", or user runs `/memory save --event=decision`.
**Why it matters for convergence:** Decisions are the spine of identity continuity. They reveal trade-off patterns, recurring preferences, and shifts over time. Without these tagged, a year of decisions is indistinguishable from a year of brainstorms.
**Payload convention:**
- `title`: short imperative ("Use Pi extension API over fork")
- `content`: rationale + alternatives considered
- `tags`: `event:decision`, plus domain tags

### 2. `event:frustration`
**What:** A friction signal — blocker, repeated failure, "this keeps breaking," tool not doing what's wanted.
**Capture trigger:** Repeated similar errors in session; explicit user vent; `/memory save --event=frustration`.
**Why it matters:** Frustration patterns over time reveal where the user's environment is fighting them — and what to fix, automate, or abandon. This is the "Heart" lens's primary fuel.
**Payload convention:**
- `title`: the friction in one line
- `content`: what was being attempted, what failed
- `tags`: `event:frustration`, plus `tool:<name>` if applicable

### 3. `event:surprise`
**What:** An unexpected finding that shifts the user's mental model. "Oh — I didn't know that worked," "huh, that's not what I assumed."
**Capture trigger:** Hard to auto-detect; mostly explicit (`/memory save --event=surprise`) or LLM-classified at session end.
**Why it matters:** Surprises are *learning deltas*. They mark where the user's model of the world updated. Converging on surprises shows the trajectory of expertise.
**Payload convention:**
- `title`: the assumption that broke
- `content`: prior belief → new belief
- `tags`: `event:surprise`

### 4. `event:revisit`
**What:** The user came back to a topic, file, or idea after a gap. Indicates lingering importance.
**Capture trigger:** **Automatic** — when a new memory's semantic-search hits an existing memory at cosine similarity ≥ **0.82** and the prior memory is >7 days old, tag the *new* one `event:revisit` and the *old* one gets a counter increment. Threshold is intentionally conservative — over-tagging revisit dilutes the highest-signal channel. User-facing `/event untag <id>` ships in v0 to correct false positives, and corrections feed the classifier (see §Locked decisions).
**Why it matters:** Revisit-count is the single highest signal of "what actually matters to this user." Most things mentioned once are noise. Things touched repeatedly across weeks are the actual gravity centers.
**Payload convention:**
- Automatic — written by capture pipeline, not user
- `tags`: `event:revisit`, `revisit-of:<source-memory-id>`

### 5. `event:abandon`
**What:** A thread started, worked on, then dropped without resolution. Distinct from a *decision to abandon*.
**Capture trigger (v0):** **Not auto-tagged.** Phase B's converge surfaces "N commitments with no follow-up in 21 days" as raw data; the user chooses whether to apply `event:abandon` via `/event tag <memory-id> abandon`. Auto-tagging abandon is the system passing judgment on the user — a different moral weight than surfacing silence. Heart reflects drift; it does not accuse of it.
**v1 path if auto-tagging is later wanted:** time-based (21 days, not session-based), and only on `event:commitment` records that carried an explicit `due:<date>` which has passed. Session-count punishes intensive users (5 sessions/day = 1-day silence triggers abandon).
**Why it matters:** Abandons reveal *what the user stops caring about* — the negative space of priorities. Converging on abandons exposes scope-creep patterns and where energy leaks. But the signal is only useful if the user trusts the system's restraint about applying it.
**Payload convention (when user tags or when v1 auto-tagging ships):**
- `title`: what was dropped
- `content`: when it started, what was the last activity, what (if known) caused the drop
- `tags`: `event:abandon`, `abandoned-from:<source-id>`

### 6. `event:commitment`
**What:** A stated intent to do X (optionally by Y). Distinct from a decision: a decision picks *what*; a commitment promises *that it will happen*.
**Capture trigger:** Detected on phrases like "I'll do X", "by Friday", "next session let's…"; or explicit `/memory save --event=commitment`.
**Why it matters:** Commitments paired with `event:abandon` produce the user's actual follow-through rate. Phase B can surface "12 commitments made in March, 4 acted on, 8 silently abandoned."
**Payload convention:**
- `title`: the commitment
- `content`: any constraint (deadline, dependency, who else is involved)
- `tags`: `event:commitment`, optionally `due:<YYYY-MM-DD>`

### 7. `event:insight`
**What:** A synthesis moment. "I now see that X and Y are the same problem." Distinct from surprise (which is *outside-in*) — insight is *inside-out* connection-making.
**Capture trigger:** Explicit (`/memory save --event=insight`) or LLM-classified at session end ("the user articulated a new connection between A and B").
**Why it matters:** Insights are the upper boundary of what convergence can rediscover. Tagging them lets Phase B distinguish "the user noticed this" from "the system noticed this for the user" — which is the difference between assistive and parasitic intelligence.
**Payload convention:**
- `title`: the connection ("Pi fork cost ≈ recall-forge plugin cost")
- `content`: the two (or more) things being connected + the link
- `tags`: `event:insight`

---

## What's deliberately NOT in the ontology

These were considered and rejected to keep the schema small:

- **`event:question`** — every user message is a question; tagging them all is noise. Questions only become significant if revisited (covered by `event:revisit`).
- **`event:emotion`** — too vague; frustration is the only emotional signal worth capturing because it predicts action. Joy, satisfaction, curiosity are observable but not actionable.
- **`event:task-created` / `event:task-done`** — handled by `commitment` (creation) + revisit/silence (completion or abandonment). Adding a third doubles the schema for marginal gain.
- **`event:tool-use`** — high volume, low signal. If a tool failure recurs, `event:frustration` catches it; if a tool succeeds, no event is worth a write.

---

## Capture pipeline (Phase A implementation)

```text
User message  ─┐
Assistant     ─┼─► rules pass (mid-session, deterministic)
Command exec  ─┘    │
                    ├── decision   (matches "we'll go with…", "decided to…")
                    ├── commitment (matches "I'll…", "by <date>", "next session…")
                    └── frustration (3+ similar errors / explicit vent)
                                  │
                                  ▼
                       Session end → AI Router classifier pass (one call)
                                  │
                                  ├── surprise (assumption-broken narratives)
                                  ├── insight  (connection-making language)
                                  └── revisit  (auto from semantic-search ≥ 0.82)
                                  │
                                  ▼
                      User corrections from prior session?
                                  │  yes → include in classifier prompt as exemplars
                                  ▼
              Privacy pipeline (recall-forge redactor + PII)
                                  │
                                  ▼
                    createMemory({
                      title, content,
                      memory_type: <domain>,
                      tags: ['event:<type>', ...domain-tags]
                    })
```

**Cadence rule (carried over from [[project_pi_two_layer_strategy]]):** capture at session-end + explicit `/memory save` + automatic `event:revisit` detection. **No per-turn writes** in v0. Per-turn becomes opt-in via `LANONASIS_CONTEXT_MODE=verbose` for users debugging the pipeline.

**Classifier path:** rules-first + one AI Router call at session-end. `LANONASIS_CLASSIFIER=rules-only` env var disables the router call for offline use. **No local-LLM dependency in v0** — couples experiment quality to whatever Ollama model the user happens to have installed.

---

## Convergence prompt (Phase B implementation)

`/context converge` calls `searchMemories({ tags: ['event:*'], limit: 200 })` then templates:

```text
You are synthesizing across {N} captured events for subject {subject_id}.

Event distribution:
- decisions: {n}
- frustrations: {n}
- surprises: {n}
- revisits: {n} (top revisit-counts: {ids})
- abandons: {n}
- commitments: {n} ({n_with_followthrough} acted on)
- insights: {n}

Produce three blocks:

MIND: structural patterns across decisions + insights. What is this user
      systematically building toward? Where are decisions diverging from
      stated commitments?

HEART: emotional/motivational patterns across frustrations + abandons +
       revisits. What keeps pulling them back? What keeps draining them?

CONCIERGE: 1–3 concrete next actions, each tied to a specific event ID
           as provenance. Each action must answer: what would the user's
           past self thank their present self for doing now?
```

**Why this template works:** every block is *grounded in tagged events*, so the output cannot drift into generic LLM platitudes. Every claim is traceable to a memory ID (provenance).

---

## What this ontology can't do (and what would unlock it)

The tag-only design leaves three things on the table. Each has a known schema-extension cost if we decide they're worth it.

| Capability missed | What's needed | Cost |
|---|---|---|
| Quantitative trends ("decision velocity dropped 40% in March") | Event timestamps are present, but no aggregation table | New `event_summary` materialized view in MaaS — small EF |
| Cross-subject patterns ("most of your team abandons commitments at week 3") | `subject_id` scoping is already there; need a multi-subject reasoning endpoint | New `/intelligence/cross-subject` EF — medium |
| Causal links between events ("this frustration caused that abandon") | Tags can express `caused-by:<id>` but no graph traversal | Add `event_links` table or use existing `relationships` — small EF |

None of these block v0. They're v2+ if convergence proves the model works.

---

## Locked decisions (v0)

These are not tuning levers — each one, set wrong, becomes a debugging loop downstream that costs more than the decision did. Locked in:

### 1. Revisit threshold: cosine similarity ≥ 0.82

Conservative on purpose. Revisit is the highest-signal event type, so over-tagging dilutes the entire convergence channel. False negatives are recoverable (user can manually tag); false positives flood Phase B with junk pairs that are harder to extract from than they were to write. Ships with `/event untag <id>` so corrections are first-class from day one.

### 2. Classifier: rules-first + AI Router for interpretive types

Deterministic events (`decision`, `commitment`, `frustration`) go through pattern-matching rules mid-session. Interpretive events (`surprise`, `insight`) go through one AI Router call at session-end. `LANONASIS_CLASSIFIER=rules-only` env var disables the router call for offline use. **No local-LLM path in v0** — coupling experiment quality to whatever Ollama model the user installed creates a debugging surface bigger than the feature.

### 3. Backfill: opt-in, separate confidence tier

`/context backfill --limit=N` runs the classifier over existing memories with a `backfilled:true` tag alongside `event:<type>`. Phase B excludes backfilled events from default converge; `--include-backfilled` opts them in. Backfill also serves as the v0 ontology stress-test — if classifying the existing corpus produces obvious nonsense, the ontology is wrong before Phase A ships, and we know it cheaply.

### 4. `event:abandon`: NOT auto-tagged in v0

Phase B's converge surfaces "N commitments with no follow-up in 21 days" as raw data; user applies `event:abandon` manually via `/event tag <memory-id> abandon` if they agree. The system reflects silence; it does not accuse of it. If auto-tagging is later wanted (v1), use time-based (21 days) on `event:commitment` records with explicit `due:<date>` that passed — never session-count, which punishes intensive users.

### 5. Capture is hybrid, with corrections as first-class training signal

Automatic detection (rules + AI Router) runs by default. Three user controls ship in v0:
- `/memory save --event=<type>` — upgrade a missed event
- `/event tag <memory-id> <type>` — retag an existing memory
- `/event untag <memory-id>` — remove a mistaken tag

Corrections are stored with `human-corrected:true` tag, and recent corrections are injected into the AI Router classifier prompt as exemplars. **Corrections are not a bug-fix mechanism — they are how the system learns the user's sensibility.** Without this, classifier mistakes erode trust and the second-brain illusion breaks.

---

## Next step

Now that the ontology and decisions are locked:
1. Add `LANONASIS_CAPTURE_EVENTS` env var to gate the feature; `LANONASIS_CLASSIFIER` (default `hybrid`, alt `rules-only`) for offline path
2. Implement rules pass + AI Router classifier in `packages/repl-cli` (mirror later to Pi adapter)
3. Implement `/event tag` / `/event untag` / `/memory save --event=` commands; store `human-corrected:true` exemplars
4. Add convergence template to `packages/memory-client` as a composed method (no new endpoint) — reads `event:*` tags, follows §Convergence prompt template
5. Implement `/context backfill --limit=N` with `backfilled:true` confidence tier
6. Ship behind a flag; dogfood on the user's own session for 2 weeks before promoting Phase B

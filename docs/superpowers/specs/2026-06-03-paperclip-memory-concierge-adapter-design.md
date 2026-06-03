# Paperclip Memory Concierge Adapter Design

**Date:** 2026-06-03
**Status:** Draft for review

## Overview

Build an external Paperclip adapter that lets Paperclip run LanOnasis as a continuity-aware memory concierge. The adapter is not a coding agent, task executor, or generic retrieval bot. It is a Paperclip-facing runtime for LanOnasis Continuity Intelligence: it searches, captures, briefs, and synthesizes memory with provenance.

The adapter should preserve the interaction model from `@lanonasis/repl-cli`: natural language first, explicit commands when useful, persistent session state, and persona-driven interpretation. Paperclip runs become conversational turns. `sessionParams` carries continuity between turns.

## Product Frame

LanOnasis is a Continuity Intelligence Platform, not "chat with notes" or memory CRUD. This adapter should make that visible inside Paperclip.

Paperclip supplies operational signals: tasks, issues, run outputs, approvals, comments, agent activity, and decision traces. The adapter turns those signals into memory-aware answers and, when instructed, durable reference records.

The user experience should feel like an oracle with receipts:

- It knows what has been stored.
- It explains which memories informed the answer.
- It captures new facts as structured references.
- It notices continuity, drift, recurring themes, and unresolved questions.
- It gives Paperclip agents context without pretending to be a worker that executes tasks.

## Adapter Modes

Expose four Paperclip models. These are operating modes, not separate LLM providers.

| Mode | Purpose |
|------|---------|
| `memory-concierge` | Default continuity oracle. Answers with synthesis, citations, and next action. |
| `memory-search` | Retrieval-first mode. Finds relevant facts, memories, IDs, and source snippets. |
| `memory-capture` | Ingestion-first mode. Saves, updates, tags, or refines memories from Paperclip context. |
| `memory-briefing` | Digest-first mode. Summarizes recent context, decisions, deltas, and unresolved questions. |

These modes map to the existing LZero persona direction:

- `memory-concierge` uses the Concierge/LZero lens.
- `memory-search` uses a provenance-first Mind lens.
- `memory-capture` uses a reference curator lens.
- `memory-briefing` uses a continuity synthesis lens.

## Package Shape

Create a self-contained external adapter package, likely under:

```text
packages/paperclip-memory-concierge-adapter/
```

Recommended layout:

```text
packages/paperclip-memory-concierge-adapter/
  package.json
  tsconfig.json
  src/
    index.ts
    server/
      index.ts
      execute.ts
      test.ts
      session.ts
      config.ts
      formatter.ts
    ui-parser.ts
```

The package root exports dependency-light metadata and `createServerAdapter()` so Paperclip can load it through the external adapter plugin store.

## Configuration

The adapter reads configuration from Paperclip agent config and environment variables.

Required:

- `apiUrl` or `LANONASIS_API_URL`
- `apiKey`, `authToken`, `LANONASIS_API_KEY`, or `MEMORY_API_KEY`

Optional:

- `aiRouterUrl` or `AI_ROUTER_URL`
- `aiRouterApiKey` or `AI_ROUTER_API_KEY`
- `persona`
- `defaultMode`
- `memoryLimit`
- `similarityThreshold`
- `captureEnabled`
- `captureTags`
- `projectId`
- `organizationId`

Secrets stay in environment variables or Paperclip secret refs, not prompts.

## Execution Flow

1. Read Paperclip execution context and adapter config.
2. Restore session state from `runtime.sessionParams`.
3. Resolve the selected mode from the Paperclip model ID.
4. Build the user prompt from issue/task/run context.
5. Search LanOnasis memory for relevant continuity context.
6. Route the prompt through the LZero-style orchestrator.
7. Execute approved memory actions:
   - search
   - create
   - update
   - list
   - get
   - delete only when explicit
8. Format the result as:
   - main answer
   - cited memory references
   - actions taken
   - continuity signals
   - next suggested action
9. Serialize updated session state back into `sessionParams`.

The adapter should not spawn the interactive `lrepl start` process. It should reuse or port the REPL's orchestration model so each Paperclip run behaves like a single REPL turn.

## Session Persistence

Persist the minimum useful state:

- conversation history summary
- active mode
- active persona
- last relevant memory IDs
- last capture IDs
- user/profile context cache metadata
- adapter version

Do not store raw secrets or unnecessary full transcripts in session state. If session state becomes too large, store a summarized continuity note in the memory service and keep only the reference ID.

## Environment Test

`testEnvironment()` should return readable checks for:

- Node version support
- adapter config shape
- memory API URL presence
- auth presence
- memory service health
- optional AI router health
- selected mode validity

Warnings are acceptable for optional AI routing. Missing memory service auth is an error.

## UI Parser

Ship a lightweight, browser-safe `ui-parser.ts` in v1 if Paperclip needs richer rendering. It should parse adapter output into sections:

- Main Answer
- Memory References
- Actions Taken
- Continuity Signals
- Next Action

If Paperclip's generic parser is enough during implementation, keep this as a simple pass-through export and improve it later.

## Context Engine Pipeline

The context engine slot is a follow-on track, not part of v1 adapter execution.

Future hooks and harnesses should gather Paperclip activity into the memory bank:

- issue created/updated/completed
- approval requested/approved/rejected
- agent run started/completed
- comments and handoffs
- decisions and blockers
- recurring operational patterns

Those captured facts become structured reference memories. The concierge then synthesizes from that reference layer. This creates the bridge from Paperclip operations to LanOnasis continuity intelligence.

## Security

- Treat Paperclip context and adapter output as untrusted.
- Never execute stdout or model output.
- Redact credentials before capture.
- Require explicit delete intent before deleting memories.
- Prefer reference citations over hidden prompt context.
- Keep user and organization isolation explicit in config.

## Testing

Unit tests:

- config resolution
- mode resolution
- session serialization
- response formatting
- memory action mapping

Integration-style tests:

- successful memory search run with mocked client
- capture run with mocked client
- briefing run with mocked client
- missing auth environment test
- AI router unavailable fallback behavior

Manual verification:

- register adapter by local path with Paperclip
- run each mode once
- verify memory references are visible
- verify session continuity across two runs

## Success Criteria

- Paperclip can load the adapter as an external adapter package.
- The four modes are visible as Paperclip models.
- A Paperclip run can query LanOnasis memory and return cited context.
- Capture mode can create durable reference memories from Paperclip context.
- Briefing mode can summarize recent operational context.
- Session state preserves continuity across runs.
- The adapter reinforces Continuity Intelligence instead of reducing LanOnasis to CRUD or generic RAG.

## Open Implementation Decisions

- Whether to depend directly on `@lanonasis/repl-cli` internals or extract shared orchestration into a reusable package.
- Whether v1 uses `@lanonasis/memory-client` only, or also supports `@lanonasis/recall-forge`.
- Whether the UI parser is worth implementing immediately or should wait for first Paperclip transcript feedback.

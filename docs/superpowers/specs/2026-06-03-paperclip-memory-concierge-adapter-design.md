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

Create a self-contained external adapter package under:

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
      parse.ts
      test.ts
      session.ts
      config.ts
      formatter.ts
    ui-parser.ts
    cli/
      format-event.ts
```

The package root exports dependency-light metadata and `createServerAdapter()` so Paperclip can load it through the external adapter plugin store.

`package.json` should use ESM and expose the Paperclip entrypoints explicitly:

```json
{
  "name": "@lanonasis/paperclip-memory-concierge-adapter",
  "type": "module",
  "paperclip": {
    "adapterUiParser": "1.0.0"
  },
  "exports": {
    ".": "./dist/index.js",
    "./server": "./dist/server/index.js",
    "./ui-parser": "./dist/ui-parser.js"
  },
  "files": ["dist"]
}
```

Required dependencies:

- `@paperclipai/adapter-utils`
- `@lanonasis/memory-client`
- shared LanOnasis orchestration code, extracted from `@lanonasis/repl-cli` if direct imports would pull terminal UI dependencies into the adapter

Optional dependencies:

- AI router transport code, if synthesis should call the router instead of a local/shared orchestration implementation.

## Root Metadata

`src/index.ts` must stay dependency-light. It should export the adapter identity, modes, configuration help, and server factory:

```ts
export const type = "lanonasis_memory";
export const label = "LanOnasis Memory Concierge";
export const models = [
  { id: "memory-concierge", label: "Memory Concierge" },
  { id: "memory-search", label: "Memory Search" },
  { id: "memory-capture", label: "Memory Capture" },
  { id: "memory-briefing", label: "Memory Briefing" },
];
export const agentConfigurationDoc = `# LanOnasis Memory Concierge configuration

Use when:
- The agent needs continuity-aware memory, recall, capture, or briefing.

Do not use when:
- The agent needs to execute code, edit files, or run task automation.

Core fields:
- apiUrl
- authToken or apiKey
- defaultMode
- memoryLimit
- similarityThreshold
- captureEnabled
`;

export { createServerAdapter } from "./server/index.js";
```

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

1. Read `AdapterExecutionContext`: `runId`, `agent`, `runtime`, `config`, `context`, `onLog`, and `onMeta`.
2. Resolve config with explicit safe helpers. Do not rely on magic defaults for auth or tenant scope.
3. Restore session state from `runtime.sessionParams`.
4. Resolve the selected mode from the Paperclip model ID.
5. Build the prompt from task/run context, wake reason, comment ID, and any prompt template fields.
6. Search LanOnasis memory for relevant continuity context.
7. Route the prompt through the LZero-style orchestrator.
8. Execute approved memory actions:
   - search
   - create
   - update
   - list
   - get
   - delete only when explicit
9. Stream structured progress through `onLog` or `onMeta`:
   - mode selected
   - memory search started/completed
   - capture action created/updated/skipped
   - citations prepared
10. Format the result as:
   - main answer
   - cited memory references
   - actions taken
   - continuity signals
   - next suggested action
11. Serialize updated state into an `AdapterExecutionResult` with:
   - `exitCode`
   - `timedOut`
   - `errorMessage`
   - `usage` when available
   - `sessionParams`
   - `clearSession` when the stored state cannot be resumed safely

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
- local package export validity for `.`, `./server`, and `./ui-parser`

Warnings are acceptable for optional AI routing. Missing memory service auth is an error.

## UI Parser

Ship a lightweight, browser-safe `ui-parser.ts` in v1. It should export `parseStdoutLine(line, ts)` and return Paperclip transcript entries. Keep the parser free of Node and DOM APIs.

The adapter should emit parseable stdout prefixes so the run viewer can separate:

- Main Answer
- Memory References
- Actions Taken
- Continuity Signals
- Next Action

Unrecognized lines should fall back to `{ kind: "assistant", ts, text: line }`.

The package must declare:

- `paperclip.adapterUiParser: "1.0.0"`
- `exports["./ui-parser"]: "./dist/ui-parser.js"`

## Installation

Paperclip should be able to install the adapter from either npm or a local path.

Local development install:

```sh
curl -X POST http://localhost:3102/api/adapters \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"localPath": "/Users/vortexcore/Projects-Lanonasis/maas/lanonasis-maas/packages/paperclip-memory-concierge-adapter"}'
```

Published install:

```sh
curl -X POST http://localhost:3102/api/adapters \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"packageName": "@lanonasis/paperclip-memory-concierge-adapter"}'
```

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
- UI parser line classification

Integration-style tests:

- successful memory search run with mocked client
- capture run with mocked client
- briefing run with mocked client
- missing auth environment test
- AI router unavailable fallback behavior
- `createServerAdapter()` returns `type`, `execute`, `testEnvironment`, `models`, and `agentConfigurationDoc`

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

- Whether to depend directly on `@lanonasis/repl-cli` internals or extract shared orchestration into a reusable package. Prefer extracting shared orchestration if importing REPL internals would pull terminal UI dependencies into the adapter.
- Whether v1 uses `@lanonasis/memory-client` only, or also supports `@lanonasis/recall-forge`.

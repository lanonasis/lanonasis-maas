# @lanonasis/pi-lanonasis-memory

A [Pi](https://github.com/badlogic/pi) extension that brings
[LanOnasis MaaS](https://docs.lanonasis.com) persistent memory into a coding
session. **Phase 6 ships automatic hook-driven ingestion** — the extension
automatically classifies and stores facts from assistant responses as you code.
See
[`docs/context/architecture/pi-maas-integration-review.md`](../../../../docs/context/architecture/pi-maas-integration-review.md)
for the full 10-phase plan.

## Phase 6 status

What this release adds:

- **Automatic hook ingestion** at `src/hooks/ingest.ts` — Pi lifecycle hooks
  (`session_start`, `turn_end`, `session_shutdown`) are wired so session content
  is automatically classified and persisted without requiring a slash command.
- `buildIngestPipeline()` — composable hook builder that wires a `MemoryStore`
  into the three lifecycle events.
- **Signal-based classification** — assistant responses are matched against
  7 signal categories: `explicit` (remember, note that), `preference`
  (I prefer, I usually), `config` (export const), `errorDiag` (the issue was,
  root cause), `insight` (interesting, TIL), `correction` (that's wrong),
  `convention` (always, never). Only assistant messages with matching signals
  and ≥20 chars are stored.
- **Tool error gating** — responses with `isError: true` tool results are
  never stored (too noisy; user already saw the error).
- **Scanner gating inherited** — every ingested memory passes through the
  Phase 2 pre-write scanner before hitting SQLite. Secrets and threat patterns
  are blocked or redacted before storage.
- **Session-scoped tagging** — memories are tagged with `session:<dirname>`
  derived from `ctx.cwd` at `session_start`, giving per-project memory scoping
  naturally.

Phase 1 + 2 + 3 still in place:

- The extension loads in a Pi session without runtime errors.
- The Pi `ExtensionAPI` surface (`registerCommand`, `pi.on(...)`, `ctx.ui`)
  is reachable at the declared `pi-coding-agent@>=0.80.1` floor.
- A single slash command, `/echo`, is registered and callable.
- `npm run check:min-sdk` type-checks `src/` against the declared Pi SDK
  minimum — no more silent `ERR_PACKAGE_PATH_NOT_EXPORTED` for users on
  Pi 0.80.0 or older.
- **Pre-write scanner** at `src/scanner/` — 39+ regex rules across
  2 detection engines + 1 redact engine, block-mode default.
- **SQLite FTS5 memory store** at `src/store/` — local-first, scanner-gated.

What it does NOT yet do (Phase 4+):

- `@lanonasis/privacy-sdk` Stage 2 PII integration.

## Sync to LanOnasis MaaS

v1.0.1 wires the live sync path (LANA-026 follow-up). The contract:

- **Explicit saves only by default.** `/memory save`, `/reflect`, and the
  `memory_add` / `memory_replace` / `memory_remove` tools emit
  `origin: explicit` enqueues; the MaaS worker pushes them as soon as the
  API is reachable.
- **Auto-captured memories stay local** unless `LANONASIS_PI_MEMORY_AUTO_SYNC=1`
  is set. The auto-ingest pipeline tags writes with `origin: auto` and the
  `shouldSync()` policy (`src/sync/policy.ts`) drops them when the env var
  is absent. Operators opt in per session, never by accident.
- **API key.** Read once, in `createMaasClient()` (`src/sync/maas-client.ts`).
  Sent only as the `X-API-Key` request header. Not logged. Not persisted in
  `sync.db` (the queue payload carries title / content / tags / type / maasId
  only).
- **`preferCLI: false` is mandatory.** The CLI path in
  `@lanonasis/memory-client` shell-interpolates title and content into an
  `exec` call, which is a command-injection vector the sync layer cannot
  tolerate. The wrapper pins `preferCLI: false` and routes everything
  through fetch.
- **API URL.** `LANONASIS_API_URL` overrides the default
  `https://api.lanonasis.com`.
- **Files.** Both `memories.db` and `sync.db` live under
  `~/.pi/agent/lanonasis-pi-memory/` with `chmod 0600`. The queue cap is
  10,000 rows (override with `LANONASIS_PI_MEMORY_MAX_QUEUE`, positive ints
  only). When the cap is exceeded the OLDEST row is evicted to
  `sync_queue_dropped` with `last_error='queue-cap'`; the newest intent
  always wins.
- **`/memory-sync status`** reports queue depth, dropped-row count, online /
  offline state, and `client configured: yes/no`. **Never** prints the API
  key.
- **`/memory-sync prune [days]`** clears the dropped audit log and removes
  queued rows older than `days` (default 30). Returns the number of rows
  removed from each table.

## Commands and tools

| Type     | Name                          | Notes |
| -------- | ----------------------------- | ----- |
| Command  | `/memory search <q> [limit]`  | Local FTS5 + best-effort MaaS enrichment. |
| Command  | `/memory save <text>`         | Explicit save. Alias: `/memory-save`. |
| Command  | `/reflect`                    | Structured reflection; explicit save. |
| Command  | `/memory-skills [list]`       | List installed skills (from `src/store/skills.ts`). |
| Command  | `/memory-pin <id-or-query>`   | Toggle the `pinned` tag. |
| Command  | `/memory-preview-context`     | Recent 10 entries. |
| Command  | `/memory-interview`           | First-run 3-question interview. |
| Command  | `/memory-index-sessions`      | Per-session tag counts. |
| Command  | `/memory-sync status \| prune [days]` | Queue housekeeping. |
| Tool     | `memory_add`                  | Pre-scanned write. Always tags `origin: explicit`. |
| Tool     | `memory_search`               | Local FTS5 + best-effort MaaS enrichment. |
| Tool     | `memory_replace`              | Pre-scanned update. |
| Tool     | `memory_remove`               | Hard delete by id. No scanner gate. |

## Environment variables

| Var                                 | Default                  | Effect |
| ----------------------------------- | ------------------------ | ------ |
| `LANONASIS_API_KEY`                 | (unset)                  | When unset, sync is disabled. |
| `LANONASIS_API_URL`                 | `https://api.lanonasis.com` | API base URL. |
| `LANONASIS_PI_MEMORY_AUTO_SYNC`     | `0`                      | `1` = auto-captures sync to MaaS. |
| `LANONASIS_PI_MEMORY_MODE`          | `policy-only`            | `legacy-inject` adds a `<memory-context>` block. |
| `LANONASIS_PI_MEMORY_REDACT`        | `0`                      | `1` = redacts detected secrets instead of blocking. |
| `LANONASIS_PI_MEMORY_MAX_QUEUE`     | `10000`                  | SyncQueue depth cap (positive integers only). |

## Quick start

```bash
# from the lanonasis-maas monorepo root
cd apps/lanonasis-maas
npm install --prefix packages/pi-lanonasis-memory

# unit tests (502/502 pass as of v1.0.1)
npm test --prefix packages/pi-lanonasis-memory

# build dist/
npm run build --prefix packages/pi-lanonasis-memory

# typecheck
npm run typecheck --prefix packages/pi-lanonasis-memory

# validate against the declared minimum Pi SDK
npm run check:min-sdk --prefix packages/pi-lanonasis-memory
```

### Use it inside Pi

After `npm run build`, Pi can load the extension two ways:

```bash
# 1. Direct load (development):
pi -e apps/lanonasis-maas/packages/pi-lanonasis-memory/src/index.ts

# 2. From the installed package:
pi -e "$(node -p 'require.resolve("@lanonasis/pi-lanonasis-memory/package.json")')"
```

Once Pi is up, run `/echo hello` to confirm the extension is active. You
should see `echo: olleh` in the Pi UI.

## File layout

```
packages/pi-lanonasis-memory/
├── pi-extension.json         Descriptor file: entry, commands, storage roots,
│                            min SDK. Single source of truth for non-Pi
│                            consumers (CI, packaging).
├── package.json              npm metadata; declares `peerDependencies` floor.
├── tsconfig.json             Editor / typecheck config (incl. tests, scripts).
├── tsconfig.build.json       Build config (no tests, emits dist/, declarations).
├── vitest.config.ts          Vitest setup.
├── src/
│   ├── index.ts             Extension entry — `export default function (pi)`.
│   │                          Also re-exports the scanner API + MemoryStore
│   │                          + SCHEMA_VERSION for downstream callers.
│   ├── commands/
│   │   └── echo.ts          `/echo` slash command + `runEcho` (testable).
│   ├── hooks/
│   │   └── ingest.ts        Phase 6: hook ingestion pipeline.
│   │                          buildIngestPipeline() + signal classifiers.
│   ├── scanner/             Phase 2: pre-write scanner.
│   │   ├── content-scanner.ts  Block-mode gate. 11 threat + 20 secret
│   │   │                       patterns + 10 invisible-Unicode code points.
│   │   ├── redactor.ts         Redact-mode replacement. 19 credential
│   │   │                       patterns + 1 env-var assignment regex.
│   │   └── scanner.ts          Top-level orchestrator. Resolves
│   │                            LANONASIS_PI_MEMORY_REDACT and routes to
│   │                            block or redact mode.
│   └── store/               Phase 3: local-first SQLite FTS5 store.
│       ├── sqlite.ts             Runtime-priority opener: bun:sqlite →
│       │                         node:sqlite (via createRequire, no native
│       │                         module dependency).
│       ├── schema.ts             FTS5 schema + 3 sync triggers (mirror of
│       │                         pi-hermes-memory shape, scoped down to
│       │                         memories-only).
│       └── memory.ts             MemoryStore class. add/get/list/search/
│                                replace/remove/stats. Every write gated
│                                by the scanner.
├── tests/
│   ├── echo.test.ts         Vitest spec for runEcho.
│   ├── hooks/
│   │   └── ingest.test.ts  Phase 6: 25 signal-classification cases +
│   │                          tool-error gating + session_shutdown lifecycle.
│   ├── scanner/             Phase 2: scanner tests.
│   │   ├── content-scanner.test.ts
│   │   ├── redactor.test.ts
│   │   └── scanner.test.ts
│   └── store/               Phase 3: store integration tests.
│       └── memory.test.ts
├── scripts/
│   └── check-min-sdk.mjs    Min-SDK checker.
├── CHANGELOG.md             Phase 1–6 entries + the deferred backlog.
├── README.md                This file.
├── LICENSE                  MIT.
└── .gitignore
```

## Storage roots (declared in `pi-extension.json`)

These are reserved for Phase 3 (SQLite) and Phase 4 (markdown mirror).
Phase 1–5 does not write to them all — there is nothing to persist yet.

| Root                   | Path                                         | Phase | Owner                              |
| ---------------------- | -------------------------------------------- | ----- | ---------------------------------- |
| `storage_roots.global` | `~/.pi/agent/lanonasis-pi-memory/`           | 3–6  | SQLite sessions DB, MEMORY.md mirror |
| `storage_roots.project`| `.pi/memory/`                               | 4     | Per-project MEMORY.md / USER.md      |
| `storage_roots.sessions_db` | `~/.pi/agent/lanonasis-pi-memory/memories.db` | 3 | SQLite FTS5 session index           |

## Out of scope (Layer-1)

Anything touching customer data, payments, KYC, credentials, or PHI is
explicitly **out of scope** for this release beyond the scanner. The
extension writes only to its local SQLite database (and the optional
markdown mirror); sync to MaaS is opt-in per the contract above.

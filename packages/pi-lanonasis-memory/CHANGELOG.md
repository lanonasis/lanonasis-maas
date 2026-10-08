## [1.0.2] — 2026-10-08

Hygiene release. No runtime behaviour change unless
`LANONASIS_PI_MEMORY_DEBUG=1` is set.

### Added
- **ESLint.** Flat `eslint.config.js` (eslint 9 + typescript-eslint
  recommended) over `src/` and `tests/`, plus `lint` / `lint:fix` scripts.
  Leading-underscore names count as intentionally unused, and
  `no-non-null-assertion` is off for `tests/**` only. No Prettier.
- **Coverage.** A `test:coverage` script uses `@vitest/coverage-v8` 5.0.3,
  scoped to `src/**`. Measured: statements 86.45%, branches 75.27%,
  functions 86.99%, lines 87.89%. Thresholds sit about 5 points lower
  (81/70/82/82) and act as a regression guard. The default `test` script
  is unchanged.
- **`LANONASIS_PI_MEMORY_DEBUG=1`.** A new `src/debug.ts` `debugLog()`
  writes errors that would otherwise be swallowed to stderr, one line each,
  after passing them through the scanner redactor. It is wired into 20
  catch blocks (MaaS search/health, sync enqueue, worker tick, SQLite
  binding fallback, skills listing, SOUL bootstrap, and others). Off by
  default; the helper never throws.

### Changed
- **`engines.node` is now `>=22.5`** (was `>=18`). `src/store/sqlite.ts`
  only loads `bun:sqlite` or `node:sqlite`, with no `better-sqlite3`
  path, and `node:sqlite` first shipped in Node 22.5.0. The README now
  documents the supported runtimes and the `--experimental-sqlite` flag
  needed on Node 22.5–22.12.
- **`prepublishOnly`** now runs `bun run build && bun run test` (was npm),
  matching the canonical `bun.lock`.
- **`noUncheckedIndexedAccess: true`** in `tsconfig.json`. Two src sites
  got real guards (`store/memory.ts` validation-message map,
  `scanner/content-scanner.ts` first-secret-hit lookup); no `!` was added.
- Removed unused imports and two inline `require("node:fs")` calls.

### Corrected
- The 1.0.1 entry below says `vitest.config.ts` forwards
  `--experimental-sqlite` to workers. It does not, and never did. Tests
  pick up `node:sqlite` unflagged on Node >= 22.13 (CI uses Node 22 LTS).

## [1.0.1] — 2026-10-06

### Fixed
- **Wiring fix (LANA-026-v1.0.1).** After PRs #167-#172 merged on `main`,
  `src/deps.ts` resolved peer modules via `tryImport()` + export-name
  lookups that silently missed every time — the real modules export
  classes (`MirroredStore`, `SyncQueue`, `SyncWorker`) and differently-named
  factories (`createCorrectionCapture`, `createMaasClient`). Every adapter
  fell back to a no-op, so at runtime correction capture, the markdown
  mirror, MaaS sync and MaaS search were all dead. v1.0.1 deletes the
  indirection: a new `src/runtime.ts` statically composes the real modules
  into a `Runtime` container that `src/index.ts` wires into the
  ExtensionAPI. Verified end-to-end by a new `tests/integration/runtime-wiring.test.ts`.

### Added
- **`/memory-sync` slash command** with subcommands `status` and `prune [days]`.
  `status` reports queue depth, dropped-row count, online/offline state and
  client-configured (never prints the API key). `prune` defaults to clearing
  the dropped audit log and queued rows older than 30 days; the threshold is
  configurable.
- **Queue depth cap (VERA R2).** `SyncQueue` now caps `sync_queue` at 10_000
  rows by default; override via `LANONASIS_PI_MEMORY_MAX_QUEUE` (positive
  integers only). When a row would overflow the cap, the OLDEST row is
  evicted to `sync_queue_dropped` with `last_error='queue-cap'`.
- **`SyncQueue.prune()`** with `{ olderThanDays, dropped }` returns counts.
- **`tests/sync/maas-client.test.ts` fetch-stub hardening (NORA Q4).**
  The "real wrapper, no network" block now spies on `globalThis.fetch`,
  rejects with a deterministic `ECONNREFUSED`, and asserts the API key
  never appears in the normalised error string. The 8s race is gone.

### Changed
- **`vitest.config.ts`** forwards `--experimental-sqlite` to workers so
  `node:sqlite` always loads. The runtime still prefers `bun:sqlite` under
  Bun.
- **`src/sync/worker.ts`** `flush()` runs `HealthMonitor.tick()` before
  every row so a queue drains on shutdown even when the periodic probe has
  not yet run.
- **`@lanonasis/memory-client`** is constructed with explicit short
  retries + `cliDetectionTimeout: 0` so offline first-runs no longer stall.
- **Lockfile canonicalised (NORA Q1).** `bun.lock` on `main` was missing the
  `vite` devDep required by `vitest@5`'s peer. v1.0.1 commits the lockfile
  after `bun install`; `bun install --frozen-lockfile` is now a no-op.

### Security notes for VERA
- The now-live sync path (`SyncWorker` → `MaasClient.create/update/delete`)
  carries the API key only in request headers. `MaasClient.create/update`
  run the error string through the package redactor AND strip `sk-…` shaped
  substrings so no key leak path remains if a future SDK change introduces
  one.
- `SyncQueue` payloads contain ONLY the documented memory fields (title,
  content, tags, type, maasId). The API key is never persisted.
- `chmod 0600` on `memories.db` and `sync.db` (PR1/PR5) is still in place.
- `/memory-sync status` never reads `LANONASIS_API_KEY`; the report only
  says whether a client was configured.

## [Unreleased] — PR1/6 cadence, correction capture, and manifest cleanup
# Changelog

All notable changes to `@lanonasis/pi-lanonasis-memory` are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased] — PR1/6 cadence, correction capture, and manifest cleanup

### Added
- **`src/hooks/cadence.ts`** — `ReviewCadence({ everyTurns, everyToolCalls })`
  state machine. Pure, unit-tested. Threshold defaults: 10 turns or 15 tool
  calls since the last flush, whichever lands first. Records turn and tool
  counts, exposes `shouldReview()` and `reset()`. Negative / non-finite
  tool-call counts are ignored so a buggy caller can't poison the counter.
- **`src/hooks/correction.ts`** — user-correction cue detector
  (`detectCorrectionCue`) + assistant-acknowledgement detector
  (`detectCorrectionAck`) + `createCorrectionCapture(getStore)` factory
  that wires the `input` / `turn_end` hooks. Privacy contract: the user
  prompt text is **never** stored — only the assistant's acknowledgement
  is, with `category: 'correction'` and tags `['origin:auto', 'correction']`.
  Extension-sourced input is ignored.
- **`tests/hooks/cadence.test.ts`** (8 cases) and
  **`tests/hooks/correction.test.ts`** (32 cases).

### Changed
- **`src/hooks/ingest.ts`** — classification is no longer one-shot per
  `turn_end`. Assistant text is buffered across turns and flushed only
  when `ReviewCadence.shouldReview()` flips, or on `session_shutdown`.
  The store is closed by the **host** (`src/index.ts`) rather than by the
  pipeline's `onSessionShutdown` so the shutdown ordering is explicit.
  Auto-captured memories now carry the `origin:auto` tag (downstream sync
  policy in PR5 keeps `origin:auto` memories local by default).
  Classifier buckets are mapped to the locked SQLite category enum so
  writes succeed without a schema change (`explicit|config|insight → insight`,
  `errorDiag → failure`).
- **`src/index.ts`** — `pi.on("input")` now arms a pending-correction flag
  (text never persisted); `pi.on("turn_end")` runs the ingest pipeline
  and the correction capture back-to-back so corrections land immediately.
  Removed the dead `openStore()` helper and stale phase comments.
- **`pi-extension.json`** — `version` bumped to `0.2.0`; description no
  longer mentions "Phase 1 scaffold"; `storage_roots.global` and
  `sessions_db` corrected to `~/.pi/agent/lanonasis-pi-memory`
  (matches the runtime `DEFAULT_STORE_PATH`); `storage_roots.project`
  normalised to `~/.pi/agent/projects-memory/<project>`.
- **`package.json`** — `pi.displayName` drops "Phase 1 scaffold"; dev
  `vite` added (vitest 5 requires `vite@^6|7|8`; the committed `bun.lock`
  was stale and CI was failing at the Install step).
- **`.gitignore`** — `package-lock.json` added (bun.lock is canonical).

### Tests
- `npx vitest run` → **178 passed (8 files)** (was 133 in baseline).

## [Unreleased] — PR-A.2 metadata normalization

### Changed
- **Repository URL canonicalised.** `repository.url` now uses
  `git+https://github.com/lanonasis/lanonasis-maas.git` with the `.git`
  suffix and `git+` prefix (was `https://github.com/lanonasis/lanonasis-maas.git`
  without the `git+` prefix). Directory, homepage, bugs already canonical.
- `engines.node` normalised to `>=18` (was `>=18.0.0`).
- Keywords expanded (`semantic-search`, `mcp`).

## [Unreleased] — Phase 3 (SQLite FTS5 store)

### Added

- `src/store/sqlite.ts` — minimal SQLite opener.
  - Runtime priority: `bun:sqlite` (Bun) → `node:sqlite` (Node.js >= 22.5).
  - Both bindings loaded via `createRequire(import.meta.url)` so the
    built-in `node:` specifier resolves naturally under vite/vitest
    (the dynamic `await import('node:sqlite')` form is broken by vite's
    import-analysis pass — see inline comment).
  - Throws a clear Error if neither binding is available.
  - Wraps both runtimes behind a tiny `SqliteDatabase` interface so the
    MemoryStore can stay runtime-agnostic.
  - **No native module dependency.** Same pattern as recall-forge's
    extraction layer (review C.4 evidence anchor).
- `src/store/schema.ts` — FTS5 schema mirroring pi-hermes-memory.
  - `memories` table (id, target, category, title, content, tags JSON,
    failure_reason, created_at, updated_at, maas_synced_at, maas_id,
    last_accessed_at).
  - `memories_fts` virtual table (title, content, tags, content='memories',
    content_rowid='rowid', tokenize='porter unicode61').
  - 3 sync triggers (insert / delete / update) keep FTS in lockstep with
    the base table.
  - `extension_metadata` table records `schema_version` for future
    migration branching.
  - Reserved `maas_synced_at` / `maas_id` columns so Phase 5 sync has
    nothing to migrate.
  - Scoped down from upstream: no `messages` / `sessions` tables yet
    (Phase 6 brings those with hook ingest).
- `src/store/memory.ts` — `MemoryStore` class.
  - `add(input)` — validates input, runs `scanForWrite(content, mode)`,
    runs `scanForWrite(title, mode)`, blocks or redacts, inserts.
    Block-mode (default) refuses on any secret or threat; redact-mode
    replaces detected secrets and persists cleaned text.
  - `get(id)` — touches `last_accessed_at` (cheap audit trail).
  - `list({ limit, cursor, target })` — newest first, target filter,
    cursor pagination.
  - `search({ query, limit, target, category })` — FTS5 MATCH with
    per-token quoting, BM25-derived rank inverted to 0..1 score, FTS5
    `snippet()` highlights, target/category filters.
  - `replace(id, patch)` — fetches existing, merges patch, re-runs
    scanner, blocks or redacts.
  - `remove(id)` — returns whether a row was deleted; FTS5 trigger keeps
    the search index in sync.
  - `stats()` — total memory count.
  - `close()` — WAL checkpoint then close.
  - Prepared statements cached at `prepareAll()` time (after schema
    apply, so bind-to-schema correctness holds).
- Wired into `src/index.ts` — re-exports `MemoryStore` and `SCHEMA_VERSION`
  so Phase 4 (markdown mirror) and Phase 5 (MaaS sync) can compose with
  it.
- `tests/store/memory.test.ts` (26 tests) — covers schema, validation,
  round-trip (add → get → list → search → replace → remove), scanner
  gating (block + redact), FTS5 trigger sync, cursor pagination.

### Scope guard

- ✗ No edits to `repl-cli/`, `openclaw-plugin/`, `recall-forge/`,
  `claude-memory/`, `memory-client/`.
- ✗ No MaaS sync yet (Phase 5) — `maas_synced_at` / `maas_id` columns
  are reserved but always NULL.
- ✗ No markdown mirror yet (Phase 4) — writes hit SQLite only.
- ✗ No per-project scoping yet — single-user storage root.

### Test results

- 108 / 108 vitest cases pass (4 Phase 1 + 78 Phase 2 + 26 Phase 3).
- `npm run typecheck` exits 0.
- `npm run build` emits `dist/store/{sqlite,memory,schema}.{js,d.ts}`.
- All 26 Phase 3 store tests run against a real SQLite database
  (`node:sqlite` under vitest on Node 22.5+) — not mocked.

### Deferred (per Phase 3 scope guard)

- Phase 4 — Markdown mirror (MEMORY.md / USER.md / STANDING.md). Scanner
  gates every write.
- Phase 5 — MaaS sync queue (background drain). Reserved columns filled
  by a new `SyncQueue` that reads `maas_synced_at IS NULL`.
- Phase 6 — Pi hook ingestion (session_start, session_shutdown,
  message_end). The scanner gates every persisted hook event.
- Phase 7 — Real slash commands. The scanner gates every
  `/memory save` invocation.
- Phase 8 — `@lanonasis/privacy-sdk` integration for Stage 2 PII
  detection (currently scoped to a follow-up; the SDK is a dependency
  candidate but not wired into this phase).

## [Unreleased] — Phase 2 (pre-write scanner)

### Added

- `src/scanner/content-scanner.ts` — block-mode pre-write gate.
  - 11 prompt-injection / exfiltration / role-hijack patterns
    (e.g. "ignore previous instructions", "you are now…",
    `curl $KEY`, `cat ~/.aws/credentials`, etc.).
  - 20 credential patterns at two severity levels: high (Anthropic,
    OpenAI, OpenRouter, AWS, GitHub, Slack, Notion, JWT, Bearer,
    SSH private keys) and medium (env-var names like
    `OPENAI_API_KEY`, inline `password=…` / `secret=…` / `token=…`
    assignments).
  - 10 invisible-Unicode code points (ZWS, ZWNJ, ZWJ, word joiner,
    BOM, 5 bidi controls) — flagged as likely injection.
  - Exports `scanContent(content): ScanVerdict` and
    `scanSecrets(content): string[]`. `scanContent` returns a verdict
    with `blocked: string | null` plus the full list of `secretHits`;
    `scanSecrets` returns just the matched IDs (non-blocking probe).
  - Ported from
    [`chandra447/pi-hermes-memory`](https://github.com/chandra447/pi-hermes-memory)
    `src/store/content-scanner.ts` (MIT).
- `src/scanner/redactor.ts` — redact-mode replacement.
  - 19 credential patterns covering Anthropic, OpenAI, OpenRouter,
    GitHub, Supabase, Stripe (key + webhook), AWS, Google, Notion,
    Slack, LanOnasis, JWT, Bearer, database URLs, private keys,
    hex secrets, ElevenLabs, Telegram bot tokens.
  - 1 env-var assignment regex (catches `export TOKEN=…`,
    `PASSWORD=…`, etc., beyond the credential-shape patterns).
  - Exports `redactContent(input): RedactionResult` returning the
    redacted text + `secretsFound` + unique `types`. Also
    `containsSecrets(input): boolean` for cheap probes.
  - Ported from
    [`@lanonasis/recall-forge`](https://github.com/lanonasis/lanonasis-maas/tree/main/packages/recall-forge)
    `extraction/secret-redactor.ts` (MIT).
- `src/scanner/scanner.ts` — top-level orchestrator with mode selection.
  - `scanForWrite(content, mode): ScannerDecision` returns a tagged
    union: `{ decision: "block", reason, secretHits? }` for
    blocked content, `{ decision: "redact", text, types, secretsFound }`
    for redacted content, or `{ decision: "pass", secretHits }`.
  - Threat patterns and invisible Unicode always block, regardless of
    mode (redact mode cannot safely remove a prompt-injection payload).
  - Mode resolves from `LANONASIS_PI_MEMORY_REDACT=1` (default `block`).
  - `scanSecretsOnly(content): string[]` — non-blocking probe for
    tool-call guards and pre-fill warnings.
  - `defaultScannerConfig(env)` and `resolveScannerMode(env)` —
    helpers for slash commands and the write path.
- Wired into `src/index.ts` — re-exports `scanForWrite`,
  `scanSecretsOnly`, `defaultScannerConfig`, plus the
  `ScannerConfig` and `ScannerDecision` types, so Phase 3-5 callers
  (SQLite store, markdown mirror, sync queue) can import from the
  package root.
- `tests/scanner/content-scanner.test.ts` (42 tests) — every pattern
  category is exercised against a known-good and known-bad input.
- `tests/scanner/redactor.test.ts` (26 tests) — every credential
  pattern plus the env-var assignment regex; idempotence check.
- `tests/scanner/scanner.test.ts` (10 tests) — mode selection,
  threat-vs-secret distinction, env resolution.

### Test results

- 82 / 82 vitest cases pass (4 from Phase 1 + 78 new).
- `npm run typecheck` exits 0.
- `npm run build` emits `dist/scanner/{content-scanner,redactor,scanner}.{js,d.ts}`.
- `npm run check:min-sdk` continues to type-check `src/` against
  `@earendil-works/pi-coding-agent@0.80.1`.

### Deferred (per Phase 2 scope guard)

- Phase 3 — SQLite FTS5 schema + memory table. The scanner is ready
  to gate every write.
- Phase 4 — markdown mirror (MEMORY.md / USER.md). Scanner gates
  every write.
- Phase 5 — MaaS sync queue (background drain). Scanner gates
  every enqueued payload.
- Phase 6 — Pi hook ingestion (session_start, session_shutdown,
  message_end). The scanner gates every persisted hook event.
- Phase 7 — Real slash commands. The scanner gates every
  `/memory save` invocation.
- Phase 8 — `@lanonasis/privacy-sdk` integration for Stage 2 PII
  detection (currently scoped to a follow-up; the SDK is a
  dependency candidate but not wired into this phase).

## [0.1.0] - 2026-09-06

### Added (Phase 1 scaffold — see apps/lanonasis-maas/docs/context/architecture/pi-maas-integration-review.md §3)

- Extension entry point (`src/index.ts`) — exports a default function that
  Pi's loader can invoke with an `ExtensionAPI` instance.
- `/echo` slash command (`src/commands/echo.ts`) — Phase 1 smoke command.
  Reverses its argument. Phase 7 will replace it with real `memory`-family
  commands wrapping `@lanonasis/memory-client`.
- `pi-extension.json` descriptor — declares entry, command surface, min Pi
  SDK, and the storage roots Phases 3 (SQLite) and 4 (markdown mirror) will
  own. Not used by Pi's loader today (it reads `package.json#pi.extensions`),
  but shipped so `pi install <path>` and CI consumers can discover the same
  metadata in a single file.
- `npm run check:min-sdk` (`scripts/check-min-sdk.mjs`) — type-checks
  `src/` against the minimum Pi SDK declared in `peerDependencies`, with
  full `node_modules` restore on exit. Adapted from
  chandra447/pi-hermes-memory#149 (the lesson the task body cites).
- Vitest config, README.md, LICENSE, .gitignore.

### Deferred (per Phase 1 scope guard)

- Phase 2 — `LanOnasisMemoryProvider` adapter over `@lanonasis/memory-client/node`.
- Phase 3 — SQLite FTS5 session index.
- Phase 4 — markdown mirror (MEMORY.md / USER.md).
- Phase 5 — MaaS sync (background drain).
- Phase 6 — Pi hook ingestion (session_start, session_shutdown, message_end).
- Phase 7 — Real slash commands (`/memory-search`, `/memory-recall`, etc.).
- Phase 8 — CI job beyond `check:min-sdk`.
- Phase 9 — Adapter/privacy pipeline test coverage.
- Phase 10 — Manual smoke in real Pi session.

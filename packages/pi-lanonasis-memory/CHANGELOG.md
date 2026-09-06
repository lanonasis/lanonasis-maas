# Changelog

All notable changes to `@lanonasis/pi-lanonasis-memory` are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

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

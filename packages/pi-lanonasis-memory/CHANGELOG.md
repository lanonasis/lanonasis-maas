# Changelog

All notable changes to `@lanonasis/pi-lanonasis-memory` are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

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

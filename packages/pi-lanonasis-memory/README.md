# @lanonasis/pi-lanonasis-memory

A [Pi](https://github.com/badlogic/pi) extension that brings
[LanOnasis MaaS](https://docs.lanonasis.com) persistent memory into a coding
session. **Phase 2 ships the pre-write scanner** (block-mode by default) —
see
[`docs/context/architecture/pi-maas-integration-review.md` Appendix C](../../../../docs/context/architecture/pi-maas-integration-review.md)
for the full 10-phase plan.

## Phase 2 status

What this release adds:

- **Pre-write scanner** at `src/scanner/` — block-mode by default, refuses
  any memory entry that contains prompt-injection patterns, invisible
  Unicode, or credential secrets. The scanner is the non-negotiable
  pre-write gate per review §2.3; nothing lands in SQLite, the markdown
  mirror, or the MaaS sync queue without passing it first.
- **Redact-mode opt-in** via `LANONASIS_PI_MEMORY_REDACT=1` — replaces
  detected secrets with `[REDACTED:<type>]` markers and persists the
  cleaned text. Threat patterns still block even in redact mode.
- **Non-blocking pre-fill probe** via `scanSecretsOnly()` — surfaces
  secret IDs without raising. Useful for tool-call guards and
  `/memory-interview` warnings.
- **Pattern coverage**: 11 prompt-injection threats, 10 invisible-Unicode
  code points, 20 secret patterns (high + medium severity) — ported from
  [`chandra447/pi-hermes-memory`](https://github.com/chandra447/pi-hermes-memory)
  `src/store/content-scanner.ts`. 19 credential patterns + 1 env-var
  assignment regex — ported from
  [`@lanonasis/recall-forge`](https://github.com/lanonasis/lanonasis-maas/tree/main/packages/recall-forge)
  `extraction/secret-redactor.ts`. Total: **39 distinct regex rules**
  across 2 detection engines + 1 redact engine.

Phase 1 still in place:

- The extension loads in a Pi session without runtime errors.
- The Pi `ExtensionAPI` surface (`registerCommand`, `pi.on(...)`, `ctx.ui`)
  is reachable from `@lanonasis/pi-lanonasis-memory` at the declared
  `pi-coding-agent@>=0.80.1` floor.
- A single slash command, `/echo`, is registered and callable.
- `npm run check:min-sdk` type-checks `src/` against the declared Pi SDK
  minimum — no more silent `ERR_PACKAGE_PATH_NOT_EXPORTED` for users on
  Pi 0.80.0 or older.

What it does NOT yet do (Phase 3+):

- Read or write real memories. The MaaS wiring arrives in Phase 3
  (`LanOnasisMemoryProvider` over `@lanonasis/memory-client/node`).
- Persist anything to disk or push to MaaS.
- Wire any of Pi's prompt-injection hooks (`before_provider_request`,
  `session_start`, `session_shutdown`, `message_end`).
- Wire the real slash commands (`/memory search`, `/memory save`,
  `/reflect`, `/memory-skills`, etc.).

## Quick start

```bash
# from the lanonasis-maas monorepo root
cd apps/lanonasis-maas
npm install --prefix packages/pi-lanonasis-memory

# unit tests
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
│                             min SDK. Single source of truth for non-Pi
│                             consumers (CI, packaging).
├── package.json              npm metadata; declares `peerDependencies` floor.
├── tsconfig.json             Editor / typecheck config (incl. tests, scripts).
├── tsconfig.build.json       Build config (no tests, emits dist/, declarations).
├── vitest.config.ts          Vitest setup.
├── src/
│   ├── index.ts              Extension entry — `export default function (pi)`.
│   │                         Also re-exports the scanner API for downstream
│   │                         Phase 3-5 callers.
│   ├── commands/
│   │   └── echo.ts           `/echo` slash command + `runEcho` (testable).
│   └── scanner/              Phase 2: pre-write scanner.
│       ├── content-scanner.ts   Block-mode gate. 11 threat + 20 secret
│       │                        patterns + 10 invisible-Unicode code points.
│       ├── redactor.ts          Redact-mode replacement. 19 credential
│       │                        patterns + 1 env-var assignment regex.
│       └── scanner.ts           Top-level orchestrator. Resolves
│                                LANONASIS_PI_MEMORY_REDACT and routes to
│                                block or redact mode.
├── tests/
│   ├── echo.test.ts          Vitest spec for runEcho.
│   └── scanner/              Phase 2: scanner tests.
│       ├── content-scanner.test.ts
│       ├── redactor.test.ts
│       └── scanner.test.ts
├── scripts/
│   └── check-min-sdk.mjs     Min-SDK checker (see lesson in chandra447#149).
├── CHANGELOG.md              Phase 1 + Phase 2 entries + the deferred backlog.
├── README.md                 This file.
├── LICENSE                   MIT.
└── .gitignore
```

## Storage roots (declared in `pi-extension.json`)

These are reserved for Phase 3 (SQLite) and Phase 4 (markdown mirror).
Phase 1 does not write to them — there is nothing to persist yet.

| Root                  | Path                                      | Phase | Owner                                |
| --------------------- | ----------------------------------------- | ----- | ------------------------------------ |
| `storage_roots.global`    | `~/.pi/agent/pi-lanonasis-memory/`    | 3     | SQLite sessions DB, MEMORY.md mirror |
| `storage_roots.project`   | `.pi/memory/`                        | 4     | Per-project MEMORY.md / USER.md      |
| `storage_roots.sessions_db` | `~/.pi/agent/pi-lanonasis-memory/sessions.db` | 3 | SQLite FTS5 session index            |

## Related packages (do NOT edit from here; scope-guard for Phase 1+2)

- `@lanonasis/memory-client` (consumed at runtime — wired in Phase 3)
- `@lanonasis/recall-forge` (privacy pipeline references — read-only;
  `@lanonasis/privacy-sdk` integration is a Phase 8 follow-up)
- `@lanonasis/repl-cli` (slash-command reference — read-only)
- `@lanonasis/claude-memory` (session ingest reference — read-only)

## Out of scope (Phase 1 + Phase 2)

Anything touching customer data, payments, KYC, credentials, or PHI is
explicitly **out of scope** for this release beyond the scanner. The
extension does no I/O beyond argument reversal and in-memory regex
evaluation — no SQLite writes, no markdown mirror writes, no MaaS
sync. See the
[review doc](../../../../docs/context/architecture/pi-maas-integration-review.md)
for the deferred Layer-1 storage work and the Layer-2 vision.

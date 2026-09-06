# @lanonasis/pi-lanonasis-memory

A [Pi](https://github.com/badlogic/pi) extension that brings
[LanOnasis MaaS](https://docs.lanonasis.com) persistent memory into a coding
session. **This is the Phase 1 scaffold** — see
[`docs/context/architecture/pi-maas-integration-review.md` §3](../../../../docs/context/architecture/pi-maas-integration-review.md)
for the full 10-phase plan.

## Phase 1 status

What this release proves:

- The extension loads in a Pi session without runtime errors.
- The Pi `ExtensionAPI` surface (`registerCommand`, `pi.on(...)`, `ctx.ui`)
  is reachable from `@lanonasis/pi-lanonasis-memory` at the declared
  `pi-coding-agent@>=0.80.1` floor.
- A single slash command, `/echo`, is registered and callable.
- `npm run check:min-sdk` type-checks `src/` against the declared Pi SDK
  minimum — no more silent `ERR_PACKAGE_PATH_NOT_EXPORTED` for users on
  Pi 0.80.0 or older.

What it does NOT yet do (Phase 2+):

- Read or write real memories. The MaaS wiring arrives in Phase 2
  (`LanOnasisMemoryProvider` over `@lanonasis/memory-client/node`).
- Scan Pi sessions, persist anything to disk, or push to MaaS.
- Wire any of Pi's prompt-injection hooks (`before_provider_request`,
  `session_start`, `session_shutdown`, `message_end`).

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
│   └── commands/
│       └── echo.ts           `/echo` slash command + `runEcho` (testable).
├── tests/
│   └── echo.test.ts          Vitest spec for runEcho.
├── scripts/
│   └── check-min-sdk.mjs     Min-SDK checker (see lesson in chandra447#149).
├── CHANGELOG.md              Phase 1 entry + the deferred backlog.
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

## Related packages (do NOT edit from here; scope-guard for Phase 1)

- `@lanonasis/memory-client` (consumed at runtime — wired in Phase 2)
- `@lanonasis/recall-forge` (privacy pipeline — wired in Phase 2)
- `@lanonasis/repl-cli` (slash-command reference — read-only)
- `@lanonasis/claude-memory` (session ingest reference — read-only)

## Out of scope (Phase 1)

Anything touching customer data, payments, KYC, credentials, or PHI is
explicitly **out of scope** for this release. The extension does no I/O
beyond in-process argument reversal. See the
[review doc](../../../../docs/context/architecture/pi-maas-integration-review.md)
§5 for the unanswered questions (subject scoping, fork vs skill, CLI
positioning) that Phase 0 spike is meant to resolve.

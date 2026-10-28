# Changelog

All notable changes to @lanonasis/repl-cli will be documented in this file.

## [Unreleased]

### Changed
- **Metadata normalization (PR-A.2).** Homepage re-pointed at the canonical
  `tree/main/packages/repl-cli#readme` URL (was `docs.lanonasis.com/cli/repl`).
  Repository, bugs, engines, keywords, and files allowlist already canonical.

## [1.2.0] - 2026-10-28

Adds a gated live behaviour suite that drives the real MaaS client against
api.lanonasis.com, and lands the router credential-ranking fix already on main.

### Added
- **Gated live MaaS behaviour suite** (`tests/live/maas-service.test.ts`).
  Exercises the real `createMemoryClient` and `MaaSClientAdapter` against
  api.lanonasis.com. Run it with `npm run test:live`; the README documents
  the credentials and environment it needs.

### Fixed
- **A stale credential can no longer shadow a fresh login.** Router credential
  ranking now prefers the newest credential instead of the first one found.

### Tests
- 255 passed / 8 skipped; typecheck clean.

## [1.1.2] - 2026-10-20

Persists the in-memory command history to `~/.lanonasis/repl-history.txt`
so `↑` / `↓` navigation picks up across REPL restarts. Defaults to enabled;
opt-out via `historyPersistence: false` in `repl-config.json` or by setting
`LANONASIS_REPL_HISTORY=0` before launch.

### Added
- **History persistence** (`PR P5`). On startup, the REPL now reads
  `~/.lanonasis/repl-history.txt` back into the in-memory `inputHistory`
  buffer (newest kept, capped at `maxHistorySize`). After a command
  completes or is recognised, its input is appended to the file — one
  line per entry. When the buffer exceeds `maxHistorySize`, the file is
  rewritten (temp + rename) so the on-disk size tracks the in-memory cap.
  Missing file → empty history, no error. Garbage or unreadable file →
  warn once, continue with empty history. The file is created with mode
  `0600` inside a `0700` directory.
- **Credential filter.** Inputs that look like credentials (OpenAI,
  Anthropic, GitHub, Stripe, AWS, LanOnasis, JWT, Bearer, AWS access
  keys, database URLs, SSH private-key blocks, hex secrets, Telegram
  tokens, and `KEY=value` env assignments) are detected via the existing
  `containsSecrets()` in `src/local-memory/privacy.ts` and **never
  written to disk**. Inputs longer than 2 000 characters and inputs
  containing literal newlines (multi-line pastes) are likewise skipped,
  so the file never holds anything a careful user wouldn't want logged.
- **`historyPersistence` config field** (defaults to `true`). Set to
  `false` in `~/.lanonasis/repl-config.json` to disable every disk
  write. The env override `LANONASIS_REPL_HISTORY=0` is also accepted.
- **`core/history-store.ts`.** New dedicated module owning load,
  append, trim, permissions, and the sanitiser. ReplEngine stays
  thin — a 25-line constructor block + a small `persistCompletedInput`
  helper.

### Changed
- **Fail-safe persistence.** Any FS error during read, append, or
  rewrite is caught and reported via a one-line warning. The REPL
  continues to run; the user is never blocked from typing.
- **De-dup rule.** The existing in-memory dedup
  ("don't push if identical to the immediately-previous entry")
  extends to the on-disk file via a `lastPersistedEntry` anchor — a
  repeat submission no longer grows the file.

### Tests
- 33 new tests across `tests/history-store.test.ts` (22) and
  `tests/history-persistence.test.ts` (11). Cover: load + chronological
  order, missing file, garbage file, trim at the cap, de-dup,
  credential / length / multi-line rejection, opt-out via config and
  env, and POSIX permissions on the file and its directory.

## [1.1.1] - 2026-09-27

Makes `lrepl` / `onasis-repl` work against the Onasis AI router
(`https://ai.vortexcore.app/api/v1/ai-chat`). Before this release every chat
turn got a 400, and the REPL hid the reason.

### Fixed
- **No `system` or `developer` messages go to the router.** The router rejects
  them with `400 system_role_not_permitted`, so every chat failed. The persona
  prompt now stays local: it is only used when calling OpenAI directly. The
  router's `repl-nlp` use case supplies the prompt. The prompt optimiser no
  longer sends a system message either. As a backstop, `AIRouterClient.chat()`
  refuses these roles before making any network call.
- **Opaque OAuth access tokens are accepted.** The auth-gateway issues 64-char
  base64url access tokens with no dots, and the client used to reject them with
  "unrecognised credential format". It now sends any non-empty token other than
  `lano_*` as `Authorization: Bearer`. `lano_*` goes in `X-API-Key`, never both.
  `lms_*` and `vx_*` keys are still refused because they only work for MaaS.
- **Token expiry is computed properly.** Every login and refresh saved
  `expires_at: 0`, and `??` does not replace 0, so each stored token looked
  expired, triggered a refresh on every start, and a failed refresh logged the
  user out without saying so. The expiry now comes from `expires_in`. If the
  server gives no expiry it is recorded as unknown (0), and the token is used
  until the server rejects it. Credential files written by older versions work
  as they are. A failed refresh now prints the reason.
- **Router errors are shown to the user.** A new `AIRouterError` keeps the HTTP
  status, `error.code`, `error.message` and `Retry-After`. The REPL prints
  these instead of a generic message. Requests time out after 45s, which is
  under the router's 60s proxy limit.
- **Errors are classified by HTTP status.** Before, a 429 reported as "Too
  Many Requests" did not match the text check and showed "Something went wrong".

### Changed
- **Direct OpenAI fallback is off by default.** If the router is configured
  and fails, the REPL no longer quietly retries against api.openai.com. To opt
  in, set `openaiFallback: true` in `repl-config.json` or
  `LANONASIS_OPENAI_FALLBACK=1`. When both backends fail, both errors are
  shown. With no router configured, OpenAI is still called directly.
- **`health` now checks that chat works.** It sends a small authenticated
  `/api/v1/ai-chat` request (`use_case: repl-nlp`) with the same credential a
  session would use. Each check says what it proves: reachability,
  authenticated chat, or OpenAI key only. If chat fails, `health` prints
  "AI chat is NOT working" even when the reachability checks pass. The OpenAI
  check no longer counts a 401 as healthy.
- `config` now masks `aiRouterApiKey`.
- `auth-status` shows "unknown" when the expiry is unknown.

## [1.1.0] - 2026-08-18

### Added
- **Session Memory** - Conversation history now persists across REPL restarts, proxied through `onasis-ai-router`'s `/api/v1/session-memory/*` routes instead of holding a raw storage credential in the published package. Automatic once `aiRouterUrl` is configured (the default) — a stable session id is generated and saved to `~/.lanonasis/repl-config.json` on first connect, with no new required config or env var.
  - Hydrates prior conversation turns (including any auto-generated summary of older history) at startup.
  - Persists each user/assistant turn as the conversation happens; failures degrade silently to the previous in-process-only behavior.
  - `reset` now starts a brand-new session (previously it only cleared local, in-process history).
  - Entirely backward compatible: with no `aiRouterUrl` configured, or if the router doesn't support these routes, behavior is unchanged from 1.0.1.

### Testing
- Added `tests/smoke/session-memory.mjs`, a live (non-mocked) functional smoke test verifying session hydration and `reset` behavior against a real router.

## [1.0.1] - 2026-07-16

### Fixed
- Added the advertised `health` command to both top-level `lrepl health` / `onasis-repl health` and the in-session REPL command registry.
- Corrected package repository, directory, and bug tracker metadata to point at `lanonasis/lanonasis-maas`.
- Updated the CLI version fallback to match the published package version.
- Preserved explicit `expires_at` values when saving credentials, including `0`.

### Changed
- Promoted `nlMode` to a real config field so saved configuration and runtime behavior stay aligned.

### Testing
- Added regression coverage for health command registration, `nlMode` config initialization, and credential expiry preservation.

## [1.0.0] - 2026-03-21

### 🎉 Major Release: LZero Concierge Edition

This major release transforms the REPL CLI into a true concierge service with enhanced UX, vendor abstraction, and comprehensive monitoring.

### ✨ Added

#### Concierge Enhancements
- **Command History** - Navigate 1000 previous commands with ↑/↓ arrows
- **Tab Completion** - Auto-complete all commands and registered aliases
- **Multi-line Input** - Auto-detect unclosed quotes, braces, brackets, code blocks
- **History Command** - `history [search]` to view/filter past commands with preserved indexes
- **Health Monitoring** - `lrepl health` command for real-time AI endpoint diagnostics
- **Enhanced Logging** - Real-time LZero processing status with latency measurements

#### Vendor Abstraction
- **LZero Branding** - All AI routing shown as "LZero" (no vendor names exposed)
- **Backup Intelligence** - Fallback shown as "backup intelligence" not vendor names
- **Vendor Isolation** - Per organization blueprint SKILL.md
- **Log Security** - Confirmed logs are gitignored (*.log, logs/)

#### Documentation
- `CLI_COMMANDS.md` - Complete command reference
- `AI_ROUTER_VALIDATION.md` - Comprehensive AI endpoint validation guide
- `QUICK_REFERENCE.md` - Fast lookup card for validation
- Updated `README.md` with v1.0.0 features

### 🔧 Fixed

#### Critical Bug Prevention
- **Spinner/Readline Coordination** - Prevents session cutoff after first response
  - Created `spinner-utils.ts` with `pauseReadline()`, `resumeReadline()`, `withSpinner()`
  - All memory commands use readline-safe spinner operations
  - Orchestrator pauses readline before AI processing

#### CodeRabbit Review Fixes (PR #99)
- **historySize Divergence** - readline and inputHistory now use same config value
- **History Index Preservation** - Filtered history preserves original indexes
- **Backslash Stripping** - Trailing backslashes removed in multi-line mode
- **Brace Detection** - Only checks positive (unmatched opening) delimiters
- **Completer Registry** - Tab completion uses registered commands + aliases
- **Unused Dependencies** - Removed @types/figlet

#### Error Handling
- **Close Handler Race** - Fixed with `closeHandled` flag
- **Async Line Handler** - Properly wrapped with IIFE and `.catch()`
- **Safe Prompt** - Stream state checking before `rl.prompt()`
- **Global Error Handlers** - Added at entry point for uncaught exceptions

### 🔒 Security

- **Vulnerability Patches** - 8 security issues fixed via `overrides`:
  - minimatch ReDoS (3 issues) → ^10.0.3
  - qs DoS (2 issues) → ^6.15.0
  - @hono/node-server auth bypass → ^1.19.10
  - ajv ReDoS → ^8.18.0
  - rollup path traversal → ^4.59.0
- **Engine Constraint** - Updated to `node: >=20.0.0` for ink@6.8.0 compatibility

### 📊 Testing

- **78 tests passing** (2 skipped)
- Tests for REPL enhancements (history, completion, multi-line)
- AI endpoint health check tests
- Dashboard component tests (optional)

### 📦 Dependencies

#### Added
- `ink@^6.8.0` - React-based TUI (optional dashboard)
- `react@^19.2.4`, `react-dom@^19.2.4` - Dashboard UI
- `ink-testing-library@^4.0.0` - Dashboard testing

#### Updated
- `@modelcontextprotocol/sdk@^1.27.1`
- `chalk@^5.6.2`
- `commander@^14.0.3`
- `dotenv@^17.3.1`
- `inquirer@^13.3.2`
- `open@^11.0.0`
- `ora@^9.3.0`
- `uuid@^13.0.0`
- `zod@^4.3.6`

### 🎯 Features Summary

**From Main (Bug Fixes):**
- ✅ Spinner/readline coordination (prevents session cutoff)
- ✅ Close handler race condition fix
- ✅ Async line handler error wrapping
- ✅ Safe prompt with stream state checking
- ✅ Security vulnerability patches (8 fixed)

**From Concierge (New Features):**
- ✅ Command history (1000 commands, up/down navigation)
- ✅ Tab completion for all commands
- ✅ Multi-line input with auto-detection
- ✅ `history` command with search (fixed indexes)
- ✅ Health check utility
- ✅ Comprehensive test suite (78 tests)
- ✅ Vendor abstraction (LZero branding)

---

## [0.9.3] - 2026-02-25

### Fixed
- **AI Router Default Path**: REPL now routes natural language requests through AI Router by default, even when `OPENAI_API_KEY` is not configured.
- **Auth Token Reuse**: Main auth token is now reused for AI Router auth when `aiRouterAuthToken` is not explicitly set.
- **Header Compatibility**: `lano_...` credentials are sent as `X-API-Key` (instead of Bearer) for AI Router requests.
- **Wiring Bug**: `ReplEngine` now passes `aiRouterUrl` and `aiRouterAuthToken` into the orchestrator (previously omitted).
- **Error UX**: Improved object-error formatting to prevent `Error: [object Object]` output.
- **Login Diagnostics**: Added clearer guidance when OTP/magic-link delivery fails.

### Added
- `start --ai-router <url>` to override AI Router endpoint at runtime.
- `login --callback-port <port>` and `login --no-open` for OAuth over remote/SSH workflows.

## [0.9.2] - 2026-02-25

### Fixed
- **Global Install Runtime Crash**: Replaced local file dependency `vortexai-l0` with published npm dependency (`^1.2.2`), fixing `ERR_MODULE_NOT_FOUND` after `npm i -g @lanonasis/repl-cli`.
- **CLI Version Flag**: `onasis-repl -v` now works as expected.
- **Type Build Stability**: Resolved local d.ts build issue for `@lanonasis/oauth-client`.

## [0.9.0] - 2026-01-23

### Added
- **VortexAI L0 Integration**: Dual-layer orchestration with L0 fallback
  - L0 provides universal work orchestration when OpenAI is unavailable
  - Memory Services Plugin (priority 100) for memory operations
  - `convertL0Response()` method for consistent response formatting
  - Workflow and agent information displayed in responses

- **LZero Persona**: Context-aware conversational identity
  - Personalized greetings based on time of day
  - Contextual responses integrating memory insights
  - Maintains conversational continuity

- **Enhanced Memory Operations**: Full CRUD support via L0 plugin
  - Natural language intent routing to memory operations
  - Intelligence features: tag suggestions, related memories, duplicates
  - Behavioral features: pattern recall, next action suggestions

### Changed
- `Orchestrator` class now initializes `L0Orchestrator` with memory plugin
- Fallback chain: OpenAI → L0 → Conversational response
- Bundle size: 71KB (includes L0 integration)

### Dependencies
- Added `vortexai-l0@^1.2.2`

---

## Migration Guide (v0.9.3 → v1.0.0)

### Breaking Changes
- **Node.js Requirement**: Now requires Node.js >=20.0.0 (was >=18.0.0)

### New Commands
```bash
lrepl health              # Check AI endpoint health
history [search]          # View command history (inside REPL)
```

### New Keyboard Shortcuts
- `↑` / `↓` - Navigate command history
- `Tab` - Auto-complete commands

### Logging Changes
- Vendor names replaced with "LZero" branding
- Fallback shown as "backup intelligence"

### Dashboard (Optional)
The Ink-based dashboard is temporarily excluded from the default build due to React/Ink TypeScript compatibility. To enable:

```bash
bun add -D ink-testing-library
# Fix React type compatibility
# Re-enable in tsup.config.ts
```

---

**Release Notes**: This is a major release focusing on UX improvements, vendor abstraction, and critical bug fixes. All users should upgrade to benefit from session stability improvements and security patches.

# Changelog

All notable changes to @lanonasis/repl-cli will be documented in this file.

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

# Changelog

All notable changes to @lanonasis/repl-cli will be documented in this file.

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
- Added `vortexai-l0` (file reference to monorepo)
- Uses L0's memory-plugin for MaaS integration

## [0.8.1] - 2026-01-11

### Fixed
- Minor stability fixes for REPL session handling
- Improved error recovery in streaming mode

## [0.8.0] - 2026-01-11

### Added
- Streaming response support
- Enhanced prompt handling
- Memory context injection

## [0.7.0] - 2026-01-09

### Added
- Initial intelligent orchestration
- OpenAI integration for natural language processing
- Basic memory service integration

## [0.2.0] - 2024-11-18

### Added
- Core REPL infrastructure
- Command parsing and execution
- Configuration management

## [0.1.0] - 2024-11-18

### Added
- Initial release
- Basic REPL functionality
- Authentication flow

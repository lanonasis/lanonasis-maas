# Changelog

All notable changes to @lanonasis/repl-cli will be documented in this file.

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

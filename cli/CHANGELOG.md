# Changelog - @lanonasis/cli

## [3.9.6] - 2026-02-21

### 🐛 Bug Fixes

- **Reliable Memory Auth Routing**: Memory CRUD and search operations now consistently route through the API gateway (`https://api.lanonasis.com`) to avoid MCP endpoint contract mismatches.
- **Legacy Endpoint Compatibility**: Added fallback support for deployments that still expose RPC-style memory routes (`/api/v1/memory/*`) when REST routes return `400/405`.
- **Auth Status Accuracy**: `status` now validates live auth state against the auth verify endpoint before reporting authenticated session state.
- **OAuth Session Stability**: Requests proactively refresh OAuth/JWT sessions to reduce intermittent `memory login required` errors during long-running CLI usage.
- **Response Normalization**: Memory get/list/search handlers normalize wrapped gateway responses (`{ data: ... }`) for consistent CLI behavior across environments.

### 📚 Documentation

- Clarified auth flow behavior for vendor keys and bearer tokens.
- Added release notes for endpoint override guidance and memory transport behavior.

## [3.9.3] - 2026-02-02

### ✨ Features

- **Non-Interactive Vendor Key Auth**: Added `-k, --vendor-key <key>` option to `auth login` command
  - Enables non-interactive authentication in CI/CD pipelines and automation scripts
  - Example: `onasis auth login --vendor-key <your-key>`

### 🐛 Bug Fixes

- **JWT Authentication Routing**: Fixed API routing for JWT/OAuth authenticated sessions
  - JWT tokens from username/password or OAuth login now correctly route to MCP server
  - Memory operations (list, create, search, update, delete) work with JWT authentication
  - Path translation handles endpoint differences between API and MCP servers
  - Vendor key authentication continues to route to main API server

- **Frozen Terminal During Text Input**: Fixed SSE/WebSocket event handlers interfering with inline text editor
  - Real-time update messages (📡) now only display in verbose mode
  - Prevents terminal freeze during interactive prompts (memory create, update)
  - Raw terminal mode no longer conflicts with background MCP events

- **Missing CLI Option**: The `--vendor-key` option was defined in code but not exposed in CLI
  - Now properly registered in command-line interface

### ⚠️ Known Limitations

- `memory stats` command not available with JWT authentication (MCP server limitation)
- For full API access including stats, use vendor key authentication

## [3.9.2] - 2026-02-02

### 🐛 Bug Fixes

- **Auth Method Override**: Fixed vendor key authentication not overriding previous OAuth `authMethod`
  - When users explicitly authenticate with vendor key after OAuth, the `authMethod` is now correctly set to `vendor_key`
  - This fixes "Authenticated: No" status after successful vendor key authentication
  - Reverted changes from 3.9.1 that incorrectly removed vendor key storage from OAuth flow

## [3.9.1] - 2026-02-01

### 🔐 Authentication Fixes

- **OAuth Scope Clarification**: OAuth login now clearly states it enables MCP integration only
- **Improved Error Messages**: 401 errors for OAuth users include specific guidance for direct API access
- **Removed Misleading Storage**: OAuth tokens are no longer incorrectly stored as vendor keys
- **Documentation Updates**: README and in-CLI help clarify authentication method differences

### 🐛 Bug Fixes

- Fixed confusing error message when OAuth users try to use direct CLI commands
- Removed `.lanonasis/mcp-config.json` from version control

## [3.9.0] - 2026-02-01

### 🎨 CLI UX Revolution

#### Seamless Multi-Line Text Input
- **Inline Text Editor**: Professional multi-line text input without external editors
  - Raw terminal mode for keystroke capture
  - Full editing support (arrow keys, backspace, newlines)
  - Visual feedback with line numbers and cursor indicators
  - Submit with Ctrl+D, cancel with Ctrl+C
  - Configurable fallback to external editors

#### Intelligent MCP Server Connection Management
- **Auto-Configuration**: Automatically detects and configures embedded MCP servers
- **Connection Lifecycle**: Smart server process management with health monitoring
- **Persistent Configuration**: Saves and loads user preferences across sessions
- **Connection Verification**: Validates server connectivity before operations
- **Graceful Error Handling**: Clear error messages with actionable resolution steps

#### First-Run Onboarding Experience
- **Guided Setup**: Interactive onboarding flow for new users
- **Connectivity Testing**: Automatic testing of API endpoints and services
- **Smart Defaults**: Configures optimal settings based on environment
- **User Preferences**: Captures and persists input mode, editor choice, and behavior preferences
- **Troubleshooting Guidance**: Context-aware help when issues are detected

### 🔐 Authentication Clarifications

#### OAuth vs Direct API Access
- **Clear Scope Documentation**: OAuth2 login now explicitly states it enables MCP integration
- **Improved Error Messages**: 401 errors for OAuth users include specific guidance for direct API access
- **Authentication Method Guidance**: CLI provides clear instructions for:
  - **OAuth**: Use for MCP integration and real-time features
  - **Vendor Key**: Obtain from dashboard for direct API access (`lanonasis auth login --vendor`)
  - **Credentials**: Use username/password for direct API access (`lanonasis auth login --credentials`)

#### Secure Storage Fallback
- **Keytar Optional**: When keytar (native secure storage) is unavailable, CLI gracefully falls back to encrypted file storage
- **Cross-Platform**: Encrypted storage works consistently across all platforms
- **No Data Loss**: Credentials are preserved in `~/.lanonasis/api-key.enc` with AES-256-GCM encryption

### 🐛 Critical Bug Fixes (PR #93)

#### P1: Connection Verification False Positive
- **Issue**: `verifyConnection()` returned `true` even when server was in error/stopped state
- **Fix**: Added explicit checks for error and stopped states before declaring success
- **Impact**: Users will now see accurate connection status instead of false positives

#### P2: Configuration Not Loaded Before Use
- **Issue**: `ConnectionManager.init()` method existed but was never called
- **Fix**: Added `init()` to ConnectionManager interface and call it before `connectLocal()`
- **Impact**: User configuration is now properly loaded and respected

#### P2: Empty Content Overwrites in Inline Updates
- **Issue**: When updating memories in inline mode, `defaultContent` wasn't passed to TextInputHandler
- **Fix**: Added `defaultContent` support throughout the text input pipeline
- **Impact**: Memory updates preserve existing content instead of starting with blank slate

### 🧪 Testing & Quality

- **Comprehensive Test Suite**: 168 passing tests including property-based tests
- **Zero TypeScript Errors**: All compilation errors resolved
- **No Regressions**: All existing tests continue to pass
- **Professional Documentation**: Complete inline documentation and type definitions

### 📦 Package Cleanup

- **npmignore**: Excludes test files and development artifacts from published package
- **Directory Reorganization**: Cleaner structure with examples moved to `docs/examples/`
- **Build Optimization**: Reduced package size by excluding unnecessary files

### 🔄 Breaking Changes
None - Fully backward compatible

### 📝 Technical Details

**New Implementations**:
- `TextInputHandlerImpl` ([cli/src/ux/implementations/TextInputHandlerImpl.ts](cli/src/ux/implementations/TextInputHandlerImpl.ts))
- `ConnectionManagerImpl` ([cli/src/ux/implementations/ConnectionManagerImpl.ts](cli/src/ux/implementations/ConnectionManagerImpl.ts))
- `OnboardingFlowImpl` ([cli/src/ux/implementations/OnboardingFlowImpl.ts](cli/src/ux/implementations/OnboardingFlowImpl.ts))

**Integration Points**:
- Memory commands now use inline text input by default ([cli/src/commands/memory.ts](cli/src/commands/memory.ts:116-119))
- MCP connect command uses ConnectionManager ([cli/src/commands/mcp.ts](cli/src/commands/mcp.ts:130-137))
- Init command includes onboarding flow ([cli/src/commands/init.ts](cli/src/commands/init.ts))

## [3.7.0] - 2025-11-23

### 🔐 Security Infrastructure Upgrade

#### Enhanced API Key Security with SHA-256
- **Cross-Platform SHA-256 Hashing**: Unified hash utilities for consistent API key hashing across all platforms
- **Local Hash Implementation**: Isolated hash utilities (`src/utils/hash-utils.ts`) for CLI independence
- **Double-Hash Prevention**: Smart detection of pre-hashed keys to prevent double-hashing errors
- **Server-Side Validation**: Constant-time comparison for timing-attack prevention
- **Future NPM Package Ready**: Designed for eventual migration to `@lanonasis/security` npm package

#### Technical Improvements
- **Build Stability**: Fixed TypeScript `rootDir` compilation errors
- **Zero Deprecation Warnings**: All dependencies verified for production readiness
- **Cross-Platform Compatibility**: Node.js crypto for server-side, Web Crypto API fallback for browser contexts
- **Type Safety**: Full TypeScript support with exported hash types (`ApiKeyHash`, `ApiKey`)

#### Hash Utility Functions
```typescript
// Available in CLI
ensureApiKeyHash(apiKey: string): string  // Smart hash normalization
hashApiKey(apiKey: string): string        // SHA-256 hashing
isSha256Hash(value: string): boolean      // Hash detection
```

### 🛡️ Security Features
- ✅ SHA-256 cryptographic hashing for all API keys
- ✅ Prevents plaintext key transmission
- ✅ Constant-time hash comparison
- ✅ Automatic hash detection and normalization
- ✅ Compatible with existing vendor key authentication

### 🔄 Breaking Changes
None - Fully backward compatible

### 📦 Dependencies
- No new external dependencies
- Uses native Node.js `crypto` module
- Clean build with zero deprecation warnings

## [3.0.1] - 2025-10-08

### 🚀 Major Version Bump
This is a major version release (3.0) due to the significant MCP architectural changes and new capabilities that may affect existing integrations.

### 🎉 Major Features
*Same as 2.0.9 but republished as 3.0.1 due to npm version conflict*

## [2.0.9] - 2025-10-08 (npm publish conflict)

### 🎉 Major Features

#### Enhanced Model Context Protocol (MCP) Support
- **Multi-Server Connections**: Connect to multiple MCP servers simultaneously with automatic failover
- **Advanced Error Handling**: Exponential backoff retry logic and graceful degradation  
- **Health Monitoring**: Automatic health checks with latency tracking and auto-reconnection
- **Connection Pooling**: Efficient resource management for multiple connections
- **Tool Chain Execution**: Support for sequential and parallel tool execution

#### New MCP Infrastructure
- **Enhanced MCP Client** (`src/mcp/client/enhanced-client.ts`)
  - Multi-server management with priority-based selection
  - Event-driven architecture with connection status tracking
  - Automatic failover to backup servers

- **MCP Server Implementation** (`src/mcp/server/lanonasis-server.ts`)
  - Full MCP protocol compliance (tools, resources, prompts)
  - 16 registered tools for memory, topic, and system operations
  - Resource providers for data access
  - Interactive prompts for user guidance

- **Transport Support** (`src/mcp/transports/transport-manager.ts`)
  - StdIO transport for local processes
  - WebSocket transport with auto-reconnection
  - SSE (Server-Sent Events) for streaming
  - Authentication support (Bearer, API Key, Basic)

- **Schema Validation** (`src/mcp/schemas/tool-schemas.ts`)
  - Zod-based validation for all MCP tools
  - Type-safe operations with clear error messages
  - Comprehensive schemas for memory, topic, API key, and system operations

### 🛠 Technical Improvements
- **Build System**: New MCP-specific build scripts (`build:mcp`, `dev:mcp`, `test:mcp`)
- **Module Structure**: Dedicated `/src/mcp/` directory with clean separation of concerns
- **Error Recovery**: Improved error handling throughout the MCP stack
- **Type Safety**: Full TypeScript support with proper type definitions

### 🐛 Bug Fixes
- Fixed authentication flow issues with proper token validation
- Resolved double slash URL construction in CLI auth
- Fixed memory command authentication requirements
- Corrected error messages to show correct authentication command

### 📚 Documentation
- Enhanced README with MCP usage examples
- Added MCP Server Mode documentation
- Updated command reference with new MCP features
- Created comprehensive MCP enhancement summary

### ⚠️ Breaking Changes
- HTTP transport temporarily disabled in favor of WebSocket/StdIO (more reliable)
- Some API key operations pending full implementation

### 🔄 Dependencies
- Updated to latest @modelcontextprotocol/sdk
- Added ws for WebSocket support
- Added zod for schema validation

## [2.0.8] - Previous Version
- Authentication system improvements
- CLI guided setup enhancements
- Performance optimizations

## [2.0.7] - Previous Version
- Memory management improvements
- Topic organization features
- Bug fixes and stability improvements

---

For full release notes and migration guides, visit: https://docs.lanonasis.com/cli/changelog

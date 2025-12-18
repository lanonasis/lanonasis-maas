# Changelog - @lanonasis/cli

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

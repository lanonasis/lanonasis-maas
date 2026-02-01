# CLI Directory Structure

## Overview
Professional directory organization for @lanonasis/cli package.

```
cli/
├── src/                          # TypeScript source code
│   ├── commands/                 # CLI command implementations
│   │   ├── api-keys.ts          # API key management commands
│   │   ├── auth.ts              # Authentication commands
│   │   ├── completion.ts        # Shell completion setup
│   │   ├── config.ts            # Configuration management
│   │   ├── enhanced-memory.ts   # Enhanced memory operations
│   │   ├── guide.ts             # Interactive user guide
│   │   ├── init.ts              # Initialization and onboarding
│   │   ├── mcp.ts               # MCP server connection commands
│   │   ├── memory.ts            # Core memory CRUD operations
│   │   ├── organization.ts      # Organization management
│   │   └── topics.ts            # Topic management
│   │
│   ├── core/                    # Core CLI infrastructure
│   │   ├── achievements.ts      # Achievement tracking system
│   │   ├── architecture.ts      # System architecture utilities
│   │   ├── dashboard.ts         # CLI dashboard rendering
│   │   ├── error-handler.ts    # Global error handling
│   │   ├── power-mode.ts        # Power user features
│   │   ├── progress.ts          # Progress indicators
│   │   └── welcome.ts           # Welcome screen and onboarding
│   │
│   ├── mcp/                     # Model Context Protocol implementation
│   │   ├── client/              # MCP client implementations
│   │   │   └── enhanced-client.ts
│   │   ├── server/              # MCP server implementations
│   │   │   └── lanonasis-server.ts
│   │   ├── schemas/             # Zod validation schemas
│   │   │   └── tool-schemas.ts
│   │   ├── transports/          # Transport layer implementations
│   │   │   └── transport-manager.ts
│   │   ├── access-control.ts    # Access control and permissions
│   │   ├── enhanced-server.ts   # Enhanced server features
│   │   ├── logger.ts            # MCP-specific logging
│   │   ├── memory-state.ts      # Memory state management
│   │   └── vector-store.ts      # Vector storage interface
│   │
│   ├── ux/                      # UX Enhancement Layer (v3.9.0)
│   │   ├── implementations/     # Concrete implementations
│   │   │   ├── ConnectionManagerImpl.ts   # MCP connection management
│   │   │   ├── OnboardingFlowImpl.ts      # First-run onboarding
│   │   │   ├── TextInputHandlerImpl.ts    # Inline text editor
│   │   │   └── index.ts                    # Barrel export
│   │   ├── interfaces/          # TypeScript interfaces
│   │   │   ├── ConnectionManager.ts       # Connection manager contract
│   │   │   ├── OnboardingFlow.ts          # Onboarding flow contract
│   │   │   ├── TextInputHandler.ts        # Text input contract
│   │   │   └── index.ts                    # Barrel export
│   │   ├── __tests__/           # UX component tests
│   │   │   ├── ConnectionManager.test.ts
│   │   │   ├── OnboardingFlow.test.ts
│   │   │   ├── TextInputHandler.test.ts
│   │   │   └── index.test.ts
│   │   └── index.ts             # Public UX API
│   │
│   ├── utils/                   # Utility functions
│   │   ├── api.ts               # API client utilities
│   │   ├── config.ts            # Configuration management
│   │   ├── crypto-utils.ts      # Cryptographic utilities
│   │   ├── formatting.ts        # Output formatting
│   │   ├── hash-utils.ts        # SHA-256 hashing utilities
│   │   └── mcp-client.ts        # MCP client helpers
│   │
│   ├── __tests__/               # Integration and E2E tests
│   │   ├── mocks/               # Test mocks
│   │   ├── api-client-auth-header.test.ts
│   │   ├── auth-integration.test.ts
│   │   ├── auth-integration-mocked.test.ts
│   │   ├── auth-persistence.test.ts
│   │   ├── cross-device-integration.test.ts
│   │   ├── hash-utils.test.ts
│   │   ├── hash-utils-sdk.test.ts
│   │   ├── mcp-connection-reliability.test.ts
│   │   ├── mcp-integration.test.ts
│   │   └── setup.ts
│   │
│   ├── types/                   # TypeScript type definitions
│   │   └── boxen.d.ts
│   │
│   ├── enhanced-cli.ts          # Enhanced CLI wrapper
│   ├── index.ts                 # Main CLI entry point
│   ├── index-simple.ts          # Simple CLI entry point
│   ├── mcp-server.ts            # MCP server standalone
│   └── mcp-server-entry.ts      # MCP server binary entry
│
├── scripts/                     # Build and utility scripts
│   └── postinstall.js           # Post-installation setup
│
├── docs/                        # Documentation
│   └── examples/                # Configuration examples
│       ├── claude-code-config.example.json
│       ├── claude_desktop_config_example.json
│       └── claude_desktop_config_WORKING.json
│
├── tests/                       # Additional test suites
│   └── cli-smoke.test.js        # Smoke tests
│
├── dist/                        # Compiled JavaScript (gitignored)
│
├── node_modules/                # Dependencies (gitignored)
│
├── .npmignore                   # NPM publish exclusions
├── .gitignore                   # Git exclusions
├── CHANGELOG.md                 # Version history
├── DIRECTORY_STRUCTURE.md       # This file
├── README.md                    # Package documentation
├── RELEASE_CHECKLIST.md         # Release preparation guide
├── SECURITY.md                  # Security policies
├── eslint.config.js             # ESLint configuration
├── jest.config.js               # Jest test configuration
├── package.json                 # NPM package manifest
├── package-lock.json            # Dependency lock file
└── tsconfig.json                # TypeScript configuration
```

## Key Directories

### `/src/commands/`
Contains all user-facing CLI commands. Each file exports a Commander.js command definition.

**Organization**:
- Authentication: `auth.ts`
- Core operations: `memory.ts`, `topics.ts`, `api-keys.ts`
- System: `init.ts`, `config.ts`, `guide.ts`
- MCP: `mcp.ts`

### `/src/core/`
Core CLI infrastructure shared across commands.

**Key Components**:
- Error handling framework
- Progress indicators and UI elements
- User achievement tracking
- Welcome screens and onboarding

### `/src/mcp/`
Complete Model Context Protocol implementation.

**Architecture**:
- `client/`: MCP client with multi-server support
- `server/`: Full MCP server with 16 registered tools
- `transports/`: StdIO, WebSocket, SSE support
- `schemas/`: Zod validation for all MCP operations

### `/src/ux/` (New in v3.9.0)
Professional UX enhancement layer.

**Components**:
- `TextInputHandler`: Inline multi-line text editor
- `ConnectionManager`: Intelligent MCP connection management
- `OnboardingFlow`: First-run user experience

**Design Pattern**: Interface + Implementation + Tests
- `interfaces/`: TypeScript contracts
- `implementations/`: Concrete classes
- `__tests__/`: Unit and property-based tests

### `/src/utils/`
Shared utility functions.

**Key Utilities**:
- `hash-utils.ts`: SHA-256 cryptographic hashing
- `api.ts`: HTTP client with authentication
- `config.ts`: Configuration persistence
- `mcp-client.ts`: MCP connection helpers

## Build Artifacts

### `/dist/` (Generated)
TypeScript compilation output. Excluded from git via `.gitignore`.

**Contents**:
- Transpiled JavaScript (.js)
- Type definitions (.d.ts)
- Source maps (.js.map)

**Note**: Test files (`__tests__/`, `*.test.*`) are excluded from NPM package via `package.json` `files` field.

## Configuration Files

### Root Level
- `.npmignore`: Excludes dev files from NPM package
- `.gitignore`: Excludes build artifacts from git
- `tsconfig.json`: TypeScript compiler options
- `jest.config.js`: Test runner configuration
- `eslint.config.js`: Linting rules
- `package.json`: Package manifest and scripts

### Documentation
- `README.md`: User-facing documentation
- `CHANGELOG.md`: Version history
- `SECURITY.md`: Security policies
- `RELEASE_CHECKLIST.md`: Release procedures
- `DIRECTORY_STRUCTURE.md`: This file

## NPM Package Contents

When published to NPM, the package includes:

✅ **Included**:
- `dist/**/*.js` - Compiled JavaScript
- `dist/**/*.d.ts` - Type definitions
- `scripts/` - Post-install scripts
- `README.md` - Documentation
- `CHANGELOG.md` - Version history
- `LICENSE` - MIT license

❌ **Excluded**:
- `src/` - Source TypeScript files
- `**/__tests__/` - Test directories
- `**/*.test.*` - Test files
- `node_modules/` - Dependencies
- `.env` - Environment variables
- Development config files

## Test Organization

### Unit Tests
Located in `src/ux/__tests__/`:
- Component-level tests
- Property-based tests using fast-check
- Mock-heavy for isolation

### Integration Tests
Located in `src/__tests__/`:
- Multi-component interactions
- API integration tests
- Authentication flow tests
- MCP connection reliability

### Smoke Tests
Located in `tests/`:
- Basic CLI functionality
- Command availability
- Version checking

## Best Practices

### File Naming
- **Commands**: Descriptive nouns (memory.ts, topics.ts)
- **Utilities**: Descriptive-utils.ts pattern
- **Tests**: *.test.ts pattern
- **Implementations**: *Impl.ts pattern
- **Interfaces**: Descriptive without suffix

### Import Organization
1. Node.js built-ins
2. External dependencies
3. Internal utilities
4. Type imports (using `import type`)

### Export Strategy
- Use barrel exports (`index.ts`) for public APIs
- Keep internal modules private
- Explicit exports over `export *`

## Version Control

### Ignored by Git
- `node_modules/`
- `dist/`
- `*.tgz`
- `.env`
- `.DS_Store`
- IDE config (`.vscode/`, `.idea/`)

### Tracked by Git
- All source code
- Configuration files
- Documentation
- Test suites
- Build scripts

## Development Workflow

### Local Development
```bash
npm run build        # Compile TypeScript
npm test            # Run test suite
npm test:watch      # Watch mode
npm test:coverage   # Coverage report
```

### Publishing
```bash
npm run build       # Compile first
npm publish         # Publish to NPM
```

### Testing Locally
```bash
npm link            # Link globally
lanonasis --version # Test linked version
npm unlink          # Unlink when done
```

## Architecture Principles

1. **Separation of Concerns**: Commands, core, utils, MCP, UX are distinct
2. **Interface-First**: UX layer uses interfaces + implementations
3. **Test Coverage**: Comprehensive unit, integration, and smoke tests
4. **Type Safety**: Full TypeScript with strict mode
5. **Professional UX**: First-class user experience with inline editing and onboarding

## Migration Notes

### From v3.8.x to v3.9.0
- New `src/ux/` directory with UX components
- No breaking changes to existing commands
- Test files now excluded from NPM package
- Documentation moved to `docs/examples/`

---

**Last Updated**: 2026-02-01
**CLI Version**: 3.9.0

# Development Workflows

**Location:** `docs/context/workflows/development.md`

---

## Overview

This document describes the development, testing, and deployment workflows for the LanOnasis MaaS monorepo.

---

## Repository Structure

```
lanonasis-maas/
├── src/                    # memory-service (main API)
├── cli/                    # CLI tool
├── packages/               # SDK packages
│   ├── lanonasis-sdk/
│   ├── memory-client/
│   ├── memory-sdk-standalone/
│   ├── claude-memory/
│   ├── recall-forge/
│   ├── ide-extension-core/
│   └── repl-cli/
├── apps/                   # Applications
│   └── mcp-core/
├── IDE-EXTENSIONS/         # IDE extensions
│   ├── vscode-extension/
│   ├── cursor-extension/
│   └── windsurf-extension/
└── docs/                   # Documentation
```

---

## Common Commands

**Package manager:** Bun (not npm). This is a Bun workspace.

### All Packages (Workspace)

```bash
bun run build      # Build all packages
bun run test       # Test all packages
bun run lint       # Lint all packages
```

### Main Service (standalone testing only)

```bash
bun run dev           # Start Express server for standalone testing
bun run build         # Build all packages
bun run test          # Run tests
bun run type-check    # TypeScript checking
bun run lint          # ESLint
```

### CLI Tool

```bash
# From root
npm run dev --prefix cli
npm run build --prefix cli

# From cli/ directory
npm run dev           # Watch mode
npm run build         # Build
memory --help         # Test
```

### Individual Packages

```bash
# lanonasis-sdk
npm run build --prefix packages/lanonasis-sdk

# memory-client
npm run build --prefix packages/memory-client

# claude-memory (uses Bun)
bun run build --prefix packages/claude-memory
```

---

## Development Workflow

### 1. Setup

```bash
# Clone and install
git clone https://github.com/lanonasis/lanonasis-maas.git
cd lanonasis-maas
npm run workspace:install
```

### 2. Environment

Copy `.env.example` to `.env` and configure:
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_KEY` - Supabase anon key
- `SUPABASE_SERVICE_KEY` - Service role key
- `JWT_SECRET` - JWT signing secret
- `OPENAI_API_KEY` - OpenAI API key

### 3. Database

```bash
# Apply migrations
npm run db:migrate

# Seed test data
npm run db:seed
```

### 4. Running

```bash
# Main service
npm run dev

# CLI (separate terminal)
npm run dev --prefix cli

# Or run both with docker-compose
docker-compose up
```

---

## Testing

### Test Types

| Type | Command | Coverage Target |
|------|---------|-----------------|
| Unit | `npm test` | Services, utils |
| Integration | `npm run test --prefix packages/<pkg>` | API endpoints |
| E2E | `npm run test:e2e --prefix IDE-EXTENSIONS/<ext>` | Extensions |
| Conformance | `npm run test:conformance` | MCP protocol |

### Running Tests

```bash
# All tests
npm run test:all

# Specific package
npm run test --prefix packages/lanonasis-sdk

# Conformance tests (MCP)
npm run test:conformance

# MCP discovery conformance
npm run test:conformance:discovery

# MCP auth headers conformance
npm run test:conformance:auth

# IDE extension tests
npm run test:unit --prefix IDE-EXTENSIONS/vscode-extension
```

### Coverage

```bash
npm run test:coverage
```

---

## Building

### Build All

```bash
npm run build:all
```

### Build Individual

```bash
# SDK packages
npm run build --prefix packages/lanonasis-sdk
npm run build --prefix packages/memory-client
npm run build --prefix packages/recall-forge

# CLI
npm run build --prefix cli

# IDE extensions
npm run package --prefix IDE-EXTENSIONS/vscode-extension
npm run package --prefix IDE-EXTENSIONS/cursor-extension
npm run package --prefix IDE-EXTENSIONS/windsurf-extension
```

---

## Publishing

### Publish All Packages

```bash
npm run publish:all
```

### Publish Individual

```bash
# SDK
npm run publish:sdk

# CLI
npm run publish:cli
```

### IDE Extensions

```bash
# VSCode
cd IDE-EXTENSIONS/vscode-extension
npm run package
npm run publish

# Cursor
cd IDE-EXTENSIONS/cursor-extension
npm run package
npm run publish

# Windsurf
cd IDE-EXTENSIONS/windsurf-extension
npm run package
npm run publish
```

---

## Docker

### Local Development

```bash
docker-compose up
```

### Production

```bash
docker-compose -f docker-compose.prod.yml up
```

### Build and Run

```bash
docker build -t memory-service .
docker run -p 3000:3000 memory-service
```

---

## Deployment

### Staging

```bash
npm run deploy:staging
```

### Production

```bash
npm run deploy:production
```

---

## Code Quality

### Linting

```bash
npm run lint              # Main service
npm run lint --prefix cli # CLI
npm run lint --prefix packages/lanonasis-sdk  # SDK
```

### Type Checking

```bash
npm run type-check        # Main service
```

### Pre-commit Hooks

See `.husky/` directory for pre-commit hooks (if configured).

---

## Troubleshooting

### Port Already in Use

```bash
# Find and kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

### Clean Build

```bash
npm run clean
npm run workspace:install
npm run workspace:build
```

### Reset Database

```bash
# Drop and recreate
npm run db:migrate
npm run db:seed
```
# Context Engineering Progress

**Project:** LanOnasis MaaS Context Documentation
**Started:** 2026-04-30
**Last Updated:** 2026-05-09 (aligned to monorepo architecture truth reset)
**Status:** Phase 2 — Aligned to monorepo truth

## Workflow Instructions

To continue this work in a new chat session:
1. Read `docs/context/project-overview.md` to understand the full project context
2. Read `docs/context/context-engineering-progress.md` (this file) for current status
3. Continue from where we left off based on the status below

## ⚠️ CRITICAL ALIGNMENT (2026-05-09)

This document previously described the Express server as the production API path.
**This was incorrect.** After the monorepo CLAUDE.md alignment pass, the following
facts are now canonical:

1. **Express server is standalone-only.** Production intelligence routes bypass it.
2. **Package manager is `bun`** (not npm).
3. **Backend logic lives in `apps/onasis-core/supabase/functions/`** (74+ EFs).
4. **Auth is X-API-Key** via `_shared/auth.ts` in onasis-core — NOT OAuth2 PKCE.
5. **NEVER run `supabase db push`** — use `apply_migration` MCP tool.

For full architecture truth, see monorepo at `/.devops/context-engineering/`.

## Workflow Instructions

To continue this work in a new chat session:
1. Read `docs/context/project-overview.md` to understand the full project context
2. Read `docs/context/context-engineering-progress.md` (this file) for current status
3. Continue from where we left off based on the status below

## Documentation Guidelines

### Naming Conventions
- ADR files: `adr-XXX-descriptive-title.md` (e.g., `adr-001-monorepo-structure.md`)
- Component files: `component-name.md` (e.g., `memory-service.md`, `cli.md`)
- Workflow files: `workflow-name.md` (e.g., `development.md`)

### Template Locations
- ADR template: See `docs/superpowers/specs/2026-04-30-context-engineering-design.md`
- Component template: Framework standard (purpose, files, dependencies, integration, commands)
- Project overview: Master navigation index format

### File Locations
All context documents are stored in: `docs/context/`

## Project Specifications

### Tech Stack
- **Runtime:** Node.js 18+
- **Language:** TypeScript (strict mode)
- **API Server:** Express 5.2.1
- **Database:** Supabase (PostgreSQL + pgvector)
- **Auth:** JWT with multi-tenant organizations
- **Monitoring:** Prometheus metrics, Winston logging

### Packages (published to npm)
| Package | Version | Description |
|---------|---------|-------------|
| @lanonasis/memory-sdk | 1.0.0 | Memory-as-a-Service TypeScript SDK |
| @lanonasis/cli | 3.9.14+ | CLI with MCP server + interactive commands |
| @lanonasis/mcp-core | 1.0.0 | Production MCP server (17+ tools) |
| @lanonasis/ai-sdk | 0.2.2 | Drop-in AI SDK |
| @lanonasis/claude-memory | (in packages/) | Claude Code cross-session memory |
| @lanonasis/recall-forge | (in packages/) | OpenClaw plugin |
| @lanonasis/ide-extension-core | 1.0.0 | Shared IDE extension library |

### IDE Extensions
| Extension | Path |
|-----------|------|
| VSCode | `IDE-EXTENSIONS/vscode-extension/` |
| Cursor | `IDE-EXTENSIONS/cursor-extension/` |
| Windsurf | `IDE-EXTENSIONS/windsurf-extension/` |

### CLI Tool
- Command: `memory`
- Location: `cli/`
- Supports: init, login, create, search, list, get, update, delete, stats

## Completed Phases

### Phase 1: Discovery & Setup ✓
- [x] Create directory structure
- [x] Create context-engineering-progress.md
- [x] Create spec design document

### Phase 2: Core Documentation ✓
- [x] Create project-overview.md (master navigation)
- [x] Create memory-service.md
- [x] Create cli.md
- [x] Create sdk.md
- [x] Create memory-client.md
- [x] Create memory-sdk-standalone.md
- [x] Create claude-memory.md
- [x] Create recall-forge.md
- [x] Create ide-extension-core.md
- [x] Create ide-extensions/vscode.md
- [x] Create ide-extensions/cursor.md
- [x] Create ide-extensions/windsurf.md

### Phase 3: Integration & Refinement ✓
- [x] Create adr-001-monorepo-structure.md
- [x] Create adr-002-vector-storage.md
- [x] Create adr-003-sdk-export-strategy.md
- [x] Create workflows/development.md
- [x] Verify cross-references
- [x] Commit all documentation ✓

## Current Status

**Phase 2 in progress:** Creating component documentation for all packages and IDE extensions.

**Next task:** Create `docs/context/project-overview.md` (master navigation file)

**File to create next:** `docs/context/project-overview.md` - This is the master index that AI reads first to understand the entire project.

## Key Architectural Decisions

1. **Monorepo:** All packages in single repo for atomic changes
2. **Subpath exports:** Each SDK uses `exports` field for tree-shaking
3. **TypeScript-first:** All packages use TypeScript
4. **pgvector:** Supabase PostgreSQL with pgvector for vector embeddings
5. **MCP:** Model Context Protocol integration across SDKs

## Commands Reference

### Build All
```bash
npm run workspace:build
```

### Test All
```bash
npm run workspace:test
```

### Publish Packages
```bash
npm run publish:all
```
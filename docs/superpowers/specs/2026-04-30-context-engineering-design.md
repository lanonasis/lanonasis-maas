# Context Engineering Design - LanOnasis MaaS

**Date:** 2026-04-30
**Status:** Approved

## Overview

Create a comprehensive context documentation system for the LanOnasis MaaS monorepo, replacing the stale CLAUDE.md as the source of truth. The new system uses the Context Engineering Master framework with structured files optimized for AI collaboration.

## Project Structure

```
docs/context/
├── project-overview.md              # Master navigation index (AI reads first)
├── context-engineering-progress.md   # Workflow tracking for multi-chat continuity
├── architecture/
│   └── decisions/                   # Architecture Decision Records
│       └── adr-001-project-structure.md
├── components/
│   ├── memory-service.md            # Main MaaS API backend
│   ├── cli.md                        # memory CLI tool
│   ├── sdk.md                        # @lanonasis/sdk (full SDK)
│   ├── memory-client.md              # @lanonasis/memory-client (universal)
│   ├── memory-sdk-standalone.md      # Standalone variant
│   ├── claude-memory.md              # Claude Code cross-session memory
│   ├── recall-forge.md               # OpenClaw plugin
│   ├── ide-extension-core.md          # Shared extension library
│   └── ide-extensions/
│       ├── vscode.md
│       ├── cursor.md
│       └── windsurf.md
└── workflows/
    └── development.md                # Dev/test/build/deploy processes
```

## Packages to Document

| Package | Version | Purpose |
|---------|---------|---------|
| @lanonasis/sdk | 1.2.0 | Enterprise SDK with Memory + API Key Management |
| @lanonasis/memory-client | 2.2.1 | Universal client (Browser, Node.js, React, Vue, Edge) |
| @lanonasis/memory-sdk-standalone | 1.1.0 | Standalone SDK for multi-agent orchestration |
| @lanonasis/claude-memory | 0.1.0 | Claude Code cross-session semantic memory |
| @lanonasis/recall-forge | 1.1.1 | OpenClaw plugin for memory + contextEngine slots |
| @lanonasis/ide-extension-core | 1.0.0 | Shared core for IDE extensions |
| memory (CLI) | - | Professional CLI for memory operations |
| memory-service (MaaS) | 1.2.0-dev | Main API backend service |

## IDE Extensions

| Extension | Location |
|-----------|----------|
| VSCode | IDE-EXTENSIONS/vscode-extension/ |
| Cursor | IDE-EXTENSIONS/cursor-extension/ |
| Windsurf | IDE-EXTENSIONS/windsurf-extension/ |

## Phase Execution

### Phase 1: Discovery & Setup
- Create directory structure
- Create `context-engineering-progress.md` with workflow tracking
- Create `project-overview.md` (master navigation)

### Phase 2: Core Documentation
- Create component docs for all 8 packages
- Document IDE extensions (VSCode, Cursor, Windsurf)
- Add integration points and dependency info

### Phase 3: Integration & Refinement
- Create Architecture Decision Records (ADRs)
- Document development workflows
- Verify cross-references and completeness

## Key Technical Decisions

1. **Monorepo structure**: All packages in single repo for atomic changes
2. **Subpath exports**: Each SDK uses `exports` field for tree-shaking
3. **TypeScript-first**: All packages use TypeScript with strict mode
4. **pgvector for storage**: Supabase PostgreSQL with pgvector for embeddings
5. **MCP integration**: Model Context Protocol support across SDKs

## Success Criteria

- AI can answer project-aware questions without re-explaining architecture
- New developers can understand the system quickly from docs
- Documentation stays current via version-controlled updates
- Multi-chat continuity via progress tracking file
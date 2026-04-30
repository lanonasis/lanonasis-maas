# ADR-001: Monorepo Structure

**Status:** Accepted
**Date:** 2025-01-15 (original), Updated 2026-04-30

## Context

The LanOnasis MaaS project started as a single memory service API but expanded to include multiple SDKs, CLI tools, and IDE extensions. The question arose: should these be separate repositories or combined into a monorepo?

## Decision

**Use a monorepo structure** - All packages, extensions, and the main service live in a single repository (`lanonasis-maas`).

### Structure
```
lanonasis-maas/
├── src/                    # Main memory-service API
├── cli/                    # memory CLI tool
├── packages/               # Published npm packages
│   ├── lanonasis-sdk/
│   ├── memory-client/
│   ├── claude-memory/
│   ├── recall-forge/
│   └── ide-extension-core/
├── apps/                   # Applications
│   └── mcp-core/
├── IDE-EXTENSIONS/         # IDE extensions
│   ├── vscode-extension/
│   ├── cursor-extension/
│   └── windsurf-extension/
└── docs/                   # Documentation
```

## Alternatives Considered

### Separate Repositories
- **Pros:** Independent versioning, smaller clones, clearer boundaries
- **Cons:** Atomic cross-package changes impossible, version sync painful, more CI overhead

### PNPM Workspaces
- Chosen approach - native monorepo support with `pnpm-workspace.yaml`
- Advantages: Fast linking, disk space savings, consistent tooling

## Consequences

**Positive:**
- Atomic commits across related packages
- Shared tooling and CI/CD
- Easier cross-package refactoring
- Single `npm run workspace:*` commands for all packages

**Negative:**
- Larger repository overall
- Slower clones for contributors only needing one package
- Need discipline to avoid coupling between packages

## Implementation Notes

- Use `workspace:` protocol for internal dependencies
- Each package has its own `package.json` with independent versioning
- Shared ESLint/TypeScript configs where beneficial
- CI validates all packages on any change
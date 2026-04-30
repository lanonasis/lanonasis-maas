# @lanonasis/claude-memory - Component Context

**Package:** `@lanonasis/claude-memory`
**Version:** 0.1.0
**Type:** Claude Code integration plugin

---

## Purpose

Cross-session semantic memory for Claude Code via LanOnasis MaaS. Enables Claude Code to persist context across sessions, remember decisions, and recall project-specific information using semantic search.

---

## Key Features

- **Cross-session persistence**: Memories survive Claude Code restarts
- **Semantic recall**: Find relevant memories using natural language queries
- **Hook-based integration**: Seamless Claude Code hook system
- **Enrichment pipeline**: Context enrichment for better memory organization
- **Skill system**: Claude Code skill framework integration

---

## Key Files

| File | Purpose |
|------|---------|
| `src/index.ts` | Main entry point |
| `src/client.ts` | LanOnasis API client |
| `src/config.ts` | Configuration management |
| `src/spool.ts` | Memory spool for session management |
| `hooks/` | Claude Code hook scripts |
| `scripts/` | Installation and migration scripts |
| `skills/` | Claude Code skill definitions |
| `enrichment/` | Context enrichment modules |

---

## CLI Commands

| Command | Description |
|---------|-------------|
| `claude-memory install-hooks` | Install Claude Code hooks |
| `claude-memory migrate` | Migrate session data |
| `claude-memory drain` | Drain spool (Phase 6 - not yet implemented) |

---

## Usage

After installation, Claude Code automatically:
1. Stores important context after each conversation
2. Recalls relevant memories at session start
3. Enriches memories with project context
4. Provides skill-based memory commands

---

## Dependencies

### External
- `undici` (6.0.0) - HTTP client

---

## Development

```bash
bun install           # Install dependencies (uses Bun)
bun run build         # Compile TypeScript
bun run typecheck     # Type checking
bun run test          # Run tests (vitest)
bun run install-hooks # Install Claude Code hooks
bun run migrate       # Run migration scripts
```

---

## Integration Points

| Component | How it works |
|-----------|--------------|
| `memory-service` | API backend for storage |
| `memory-client` | Base client functionality |
| Claude Code | Hook system + skills framework |
| `rtk` (RTK) | Token optimization hook |

---

## Architecture Decisions

- **Bun-first**: Primary runtime is Bun (not Node.js)
- **Hook integration**: Uses Claude Code hook system for session lifecycle
- **Enrichment pipeline**: Automatic context enrichment on store
- **Skill-based UX**: User-facing commands via Claude Code skills
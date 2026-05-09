# CLI Tool - Component Context

**Package:** `memory` CLI
**Type:** Command-line interface
**Package manager:** Bun (not npm)

---

## Purpose

Professional CLI for LanOnasis Memory as a Service. Provides commands for
authentication, memory CRUD operations, and search.

**For production intelligence calls:** SDK/CLI calls `api.lanonasis.com` endpoints
(which route to Supabase EFs) — not the local Express server.

---

## Key Files

| File | Purpose |
|------|---------|
| `cli/src/index.ts` | Main CLI entry point |
| `cli/src/commands/` | All command implementations |
| `cli/src/utils/config.ts` | Configuration management |
| `cli/src/utils/api.ts` | API client wrapper |
| `cli/src/core/` | Core CLI functionality |
| `cli/src/ux/` | User experience (output formatting)

---

## Commands

| Command | Description |
|---------|-------------|
| `memory init` | Initialize CLI configuration |
| `memory login` | Authenticate with API |
| `memory create -t <title> -c <content> [--type <type>]` | Create memory |
| `memory search <query> [--limit <n>]` | Semantic search |
| `memory list [--type <type>] [--tags <tags>]` | List memories |
| `memory get <id>` | Get specific memory |
| `memory update <id> -t <title>` | Update memory |
| `memory delete <id>` | Delete memory |
| `memory stats` | Show memory statistics |
| `memory config show` | Display configuration |
| `memory --help` | Show all commands |

---

## Key Features

### Interactive Mode
- Inquirer prompts for missing arguments
- Colored terminal output
- Table formatting for list results

### Configuration
- Local config storage (`~/.config/memory/`)
- API key storage with secure handling
- Platform key support (Claude Code, OpenClaw, etc.)

### Output Formats
- **Table** - Human-readable with colors
- **JSON** - Machine-parseable output

---

## Dependencies

### Internal
- `@lanonasis/memory-client` - API communication

### External
- `commander` - CLI argument parsing
- `inquirer` - Interactive prompts
- `axios` - HTTP client

---

## Development

```bash
# From cli/ directory
npm run dev       # Development with watch
npm run build     # Compile TypeScript
memory --help     # Test after build

# From root
npm run dev --prefix cli
npm run build --prefix cli
```

---

## Integration Points

| Platform | Integration |
|----------|------------|
| `@lanonasis/claude-memory` | Uses CLI for memory operations |
| `@lanonasis/recall-forge` | Uses CLI for context retrieval |
| Claude Code | Hook-based token optimization via `rtk` |

---

## Build Output

```
cli/dist/
├── core/
├── commands/
├── utils/
├── mcp/
├── ux/
└── index.js  (entry point)
```

---

## Environment

Uses environment variables:
- `MEMORY_API_URL` - API endpoint (default: http://localhost:3000)
- `MEMORY_API_KEY` - Authentication token
- `MEMORY_CONFIG_DIR` - Config directory path
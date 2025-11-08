# LanOnasis REPL

Lightweight REPL for LanOnasis Memory Service.

## Installation

```bash
npm install -g @lanonasis/repl-cli
```

Or use from the monorepo:

```bash
cd packages/repl-cli
bun install
bun run build
```

## Usage

```bash
# Start REPL in remote mode (default)
lrepl

# Start in MCP mode
lrepl --mcp

# With custom API
lrepl --api https://custom.api.com

# With authentication token
lrepl --token your-token-here
```

## Commands

### Memory Operations
- `create <title> <content>` - Create a memory
- `search <query>` - Search memories
- `list [limit]` - List memories (default: 10)
- `get <id>` - Get a specific memory
- `delete <id>` - Delete a memory (aliases: `del`, `rm`)

### System Commands
- `mode <remote|local>` - Switch operation mode
- `status` - Show current status
- `clear` - Clear screen
- `help` - Show help (aliases: `?`, `h`)
- `exit` - Exit REPL (aliases: `quit`, `q`)

## Configuration

Configuration is stored in `~/.lanonasis/repl-config.json`. You can override settings via:

- Environment variables:
  - `MEMORY_API_URL` - API endpoint URL
  - `LANONASIS_API_KEY` or `MEMORY_API_KEY` - Authentication token
  - `LANONASIS_VENDOR_KEY` - Vendor key for authentication

- Command line options:
  - `--api <url>` - Override API URL
  - `--token <token>` - Override auth token
  - `--mcp` - Enable MCP mode

## Examples

```bash
# Start REPL
$ lrepl
🚀 LanOnasis REPL v0.1.0
Mode: remote | API: https://api.lanonasis.com
Type "help" for commands, "exit" to quit

onasis> create "My First Memory" "This is the content of my memory"
✓ Memory created: abc123-def456-ghi789

onasis> search first
[1] My First Memory
    This is the content of my memory...

onasis> list 5
[1] My First Memory (abc123-def456-ghi789)

onasis> get abc123-def456-ghi789
Title: My First Memory
ID: abc123-def456-ghi789

This is the content of my memory

onasis> status
REPL Status
════════════════════════════════════════
Mode: remote
API: https://api.lanonasis.com
MCP: Disabled
Auth: Configured

onasis> exit
👋 Goodbye!
```

## Development

```bash
# Build
bun run build

# Development mode with watch
bun run dev

# Type check
bun run type-check

# Run tests
bun run test
```

## License

MIT

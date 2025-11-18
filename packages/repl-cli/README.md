# @lanonasis/repl-cli

[![NPM Version](https://img.shields.io/npm/v/@lanonasis/repl-cli)](https://www.npmjs.com/package/@lanonasis/repl-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Lightweight REPL (Read-Eval-Print Loop) for LanOnasis Memory Service - Interactive command-line interface for memory operations with semantic search, MCP support, and intuitive commands.

## ✨ Features

- 🚀 **Interactive REPL** - Intuitive command-line interface
- 🔍 **Semantic Search** - AI-powered memory search
- 💾 **Memory Operations** - Create, search, list, get, and delete memories
- 🔌 **MCP Support** - Model Context Protocol integration
- 🎨 **Colored Output** - Beautiful terminal experience
- ⚡ **Fast & Lightweight** - Only 12.5 KB
- 🔐 **Multiple Auth Methods** - API keys, tokens, vendor keys
- 📝 **Config Persistence** - Settings saved between sessions

## 📦 Installation

### Global Installation (Recommended)

```bash
npm install -g @lanonasis/repl-cli
```

### Local Installation

```bash
npm install @lanonasis/repl-cli
```

### Verify Installation

```bash
onasis-repl --version
# or
lrepl --version
```

## 🚀 Quick Start

### Start REPL

```bash
# Using onasis-repl command
onasis-repl start

# Or using lrepl shorthand
lrepl start

# With authentication
LANONASIS_API_KEY=your_key onasis-repl start

# With custom API endpoint
onasis-repl start --api https://custom.api.com --token your_token

# Enable MCP mode
onasis-repl start --mcp
```

### First Commands

```bash
onasis> help              # Show all available commands
onasis> status            # Display current REPL status
onasis> create "Welcome" "My first memory"  # Create a memory
onasis> search welcome    # Search for memories
onasis> list 10          # List recent memories
onasis> exit             # Exit REPL
```

## 📚 Commands Reference

### Memory Operations

| Command                    | Description                  | Example                                       |
| -------------------------- | ---------------------------- | --------------------------------------------- |
| `create <title> <content>` | Create a new memory          | `create "Meeting Notes" "Discussed Q4 goals"` |
| `search <query>`           | Search memories semantically | `search project planning`                     |
| `list [limit]`             | List recent memories         | `list 20`                                     |
| `get <id>`                 | Retrieve specific memory     | `get abc123-def456`                           |
| `delete <id>`              | Delete a memory              | `delete abc123-def456`                        |

**Aliases**: `delete` can also be used as `del` or `rm`

### System Commands

| Command                | Description           | Aliases     |
| ---------------------- | --------------------- | ----------- |
| `help`                 | Show all commands     | `?`, `h`    |
| `status`               | Display REPL status   | -           |
| `mode <remote\|local>` | Switch operation mode | -           |
| `clear`                | Clear terminal screen | -           |
| `exit`                 | Exit REPL             | `quit`, `q` |

## ⚙️ Configuration

### Configuration File

Settings are automatically saved to `~/.lanonasis/repl-config.json`

### Environment Variables

```bash
export MEMORY_API_URL=https://api.lanonasis.com
export LANONASIS_API_KEY=your_api_key
# or
export MEMORY_API_KEY=your_api_key
# Vendor key (optional)
export LANONASIS_VENDOR_KEY=your_vendor_key
```

### Command Line Options

```bash
onasis-repl start [options]

Options:
  --mcp            Use local MCP mode (default: false)
  --api <url>      Override API URL
  --token <token>  Authentication token
  -h, --help       Display help for command
```

### Default Configuration

```json
{
  "apiUrl": "https://api.lanonasis.com",
  "useMCP": false,
  "historyFile": "~/.lanonasis/repl-history.txt",
  "maxHistorySize": 1000
}
```

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

## 🔐 Authentication

### Method 1: Environment Variable (Recommended)

```bash
export LANONASIS_API_KEY=your_api_key
onasis-repl start
```

### Method 2: Command Line

```bash
onasis-repl start --token your_api_key
```

### Method 3: Config File

Edit `~/.lanonasis/repl-config.json`:

```json
{
  "authToken": "your_api_key"
}
```

## 🛠️ Development

### Building from Source

```bash
# Clone the repository
git clone https://github.com/thefixer3x/lan-onasis-monorepo.git
cd lan-onasis-monorepo/apps/lanonasis-maas/packages/repl-cli

# Install dependencies
npm install

# Build
npm run build

# Test locally
npm link
onasis-repl start
```

### Development Commands

```bash
npm run build        # Build for production
npm run dev          # Development mode with watch
npm run type-check   # TypeScript type checking
npm run test         # Run tests
```

## 📖 Documentation

- **Full Documentation**: https://docs.lanonasis.com/cli/repl
- **API Reference**: https://docs.lanonasis.com/api
- **Main CLI**: https://www.npmjs.com/package/@lanonasis/cli
- **Memory Client SDK**: https://www.npmjs.com/package/@lanonasis/memory-client

## 🤝 Related Packages

- [`@lanonasis/cli`](https://www.npmjs.com/package/@lanonasis/cli) - Main CLI tool
- [`@lanonasis/memory-client`](https://www.npmjs.com/package/@lanonasis/memory-client) - Memory service SDK

## 📝 License

MIT © 2025 Lanonasis Team

## 🐛 Issues & Support

- **Bug Reports**: https://github.com/thefixer3x/lan-onasis-monorepo/issues
- **Email**: team@lanonasis.com
- **Documentation**: https://docs.lanonasis.com

## 🎯 Roadmap

- [ ] Command history with arrow keys
- [ ] Tab completion for commands
- [ ] Multi-line input support
- [ ] Result caching
- [ ] Batch operations
- [ ] Export/import functionality

---

**Made with ❤️ by the Lanonasis Team**

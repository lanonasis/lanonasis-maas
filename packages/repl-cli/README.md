# @lanonasis/repl-cli

[![NPM Version](https://img.shields.io/npm/v/@lanonasis/repl-cli)](https://www.npmjs.com/package/@lanonasis/repl-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Intelligent REPL (Read-Eval-Print Loop) for LanOnasis Memory Service - Natural language interactive assistant with semantic search, AI orchestration, MCP support, and intuitive commands.

## ✨ Features

- 🧠 **Natural Language Interface** - Talk naturally to your memory system
- 🤖 **LZero AI Orchestration** - Enhanced OpenAI-powered intent understanding with personalization
- 🚀 **Interactive REPL** - Dual-mode: natural language OR commands
- 🔍 **Enhanced Semantic Search** - AI-powered memory search with main answer + additional context
- 💾 **Full Memory Operations** - Create, search, list, get, and delete
- ✨ **Prompt Optimization** - Refine and enhance prompts for better AI results
- 🎯 **Model Configuration** - User-configurable AI model selection (GPT-4, GPT-3.5, etc.)
- 👤 **Personalized Experience** - Context-aware welcome messages and user personalization
- 🔌 **MCP Support** - Model Context Protocol integration
- 🎨 **Beautiful Output** - Colored, formatted terminal experience with rich responses
- ⚡ **Fast & Lightweight** - Only ~15 KB
- 🔐 **Multiple Auth Methods** - API keys, tokens, vendor keys
- 📝 **Config Persistence** - Settings saved between sessions
- 💬 **Context Awareness** - Maintains conversation history

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

# With OpenAI for natural language (recommended)
OPENAI_API_KEY=sk-... LANONASIS_API_KEY=your_key onasis-repl start

# With custom API endpoint
onasis-repl start --api https://custom.api.com --token your_token

# With custom AI model
onasis-repl start --model gpt-4

# Enable MCP mode
onasis-repl start --mcp
```

### Natural Language Interactions

```bash
💭 Remember that I prefer TypeScript over JavaScript
💭 What do I know about my API project?
💭 Show me my recent memories
💭 Find information about authentication
💭 Save this: The meeting is on Friday at 3pm
💭 Please refine this prompt: "Write a function"
```

### Traditional Commands

```bash
💭 help              # Show all available commands
💭 status            # Display current REPL status
💭 create "Welcome" "My first memory"  # Create a memory
💭 search welcome    # Search for memories
💭 list 10          # List recent memories
💭 exit             # Exit REPL
```

## 🧠 Natural Language Mode

The REPL supports intelligent natural language interactions powered by OpenAI. Just talk naturally!

### How It Works

1. **Intent Recognition** - AI understands what you want to do
2. **Action Execution** - Automatically performs memory operations
3. **Context Awareness** - Remembers conversation history
4. **Smart Fallback** - Works without OpenAI using pattern matching

### Natural Language Examples

```bash
# Creating memories
💭 Remember that I prefer dark mode in my IDE
💭 Save this for later: API key is in .env file
💭 Store this note: Team meeting every Monday at 10am

# Searching & retrieving
💭 What do I know about TypeScript?
💭 Find my notes about the authentication system
💭 Show me information about project deployment
💭 remind me the url i setup for security sdk?

# Prompt optimization
💭 Please refine this prompt for better results: "Write code"
💭 Optimize this prompt: "Create a function"

# Listing & browsing
💭 Show me my recent memories
💭 What have I saved recently?
💭 List my memories
```

### Toggle Natural Language Mode

```bash
💭 nl on      # Enable natural language (default)
💭 nl off     # Use commands only
💭 nl         # Check current mode
💭 reset      # Clear conversation history
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

| Command                | Description                    | Aliases     |
| ---------------------- | ------------------------------ | ----------- |
| `help`                 | Show all commands              | `?`, `h`    |
| `nl [on\|off]`         | Toggle natural language mode   | -           |
| `reset`                | Clear conversation history     | -           |
| `status`               | Display REPL status            | -           |
| `mode <remote\|local>` | Switch operation mode          | -           |
| `clear`                | Clear terminal screen          | -           |
| `exit`                 | Exit REPL                      | `quit`, `q` |

## ⚙️ Configuration

### Configuration File

Settings are automatically saved to `~/.lanonasis/repl-config.json`

### Environment Variables

```bash
# Memory service authentication
export MEMORY_API_URL=https://api.lanonasis.com
export LANONASIS_API_KEY=your_api_key
# or
export MEMORY_API_KEY=your_api_key

# OpenAI for natural language (optional, recommended)
export OPENAI_API_KEY=sk-your-openai-key
export OPENAI_MODEL=gpt-4-turbo-preview  # Optional: specify AI model

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
  --model <model>  OpenAI model to use (e.g., gpt-4-turbo-preview, gpt-4, gpt-3.5-turbo)
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

## 💡 Examples

### Example Session with Natural Language

```bash
$ lrepl
🚀 LanOnasis Interactive Memory Assistant
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Mode: remote | API: https://api.lanonasis.com
Natural Language: ON
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 You can interact naturally or use commands:
   • Natural: "Remember that I prefer TypeScript"
   • Natural: "What do I know about my projects?"
   • Command: create <title> <content>
   • Type "help" for all commands

💭 Remember that I prefer using TypeScript over JavaScript

I'll save that for you.

✓ Memory created: abc123-def456-ghi789

💭 What do I know about TypeScript?

Searching your memories...

Found 1 result(s):

[1] TypeScript Preference
    I prefer using TypeScript over JavaScript
    Relevance: 98.5%

💭 list

Here are your recent memories:

Showing 1 memories:

[1] TypeScript Preference
    ID: abc123-def456-ghi789 | Type: context
    I prefer using TypeScript over JavaScript

💭 help
🌟 LanOnasis REPL - Help
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 Natural Language Mode (default):
  Just type naturally!
  • "Remember that I prefer dark mode"
  • "What do I know about TypeScript?"
  • "Show me my recent memories"
  ...

💭 exit
👋 Goodbye!
```

### Example Session with Commands Only

```bash
💭 nl off
⚙️  Natural Language mode disabled
Switched to command-only mode

💭 create "My First Memory" "This is the content of my memory"
✓ Memory created: abc123-def456-ghi789

💭 search first
[1] My First Memory
    This is the content of my memory...

💭 status
REPL Status
════════════════════════════════════════
Mode: remote
API: https://api.lanonasis.com
MCP: Disabled
Auth: Configured
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

- [x] Natural language interface with AI orchestration
- [x] OpenAI-powered intent recognition
- [x] Context-aware conversations
- [x] Enhanced system prompt with personalization
- [x] Prompt optimization function
- [x] Custom AI model selection
- [x] Enhanced response format (main answer + context)
- [x] Personalized welcome experience
- [ ] Command history with arrow keys
- [ ] Tab completion for commands
- [ ] Multi-line input support
- [ ] Result caching
- [ ] Batch operations
- [ ] Export/import functionality
- [ ] Voice input support
- [ ] Additional AI model support (Claude, Gemini, etc.)

---

**Made with ❤️ by the Lanonasis Team**

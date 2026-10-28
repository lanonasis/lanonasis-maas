# @lanonasis/repl-cli

[![NPM Version](https://img.shields.io/npm/v/@lanonasis/repl-cli)](https://www.npmjs.com/package/@lanonasis/repl-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**LZero Concierge** - Intelligent REPL for LanOnasis Memory Service with natural language AI orchestration, command history, tab completion, multi-line input, and health monitoring.

## ✨ Features

### 🎯 Core Intelligence
- 🧠 **Natural Language Interface** - Talk naturally to your memory system
- 🤖 **LZero AI Orchestration** - Vendor-abstracted AI with automatic fallback (Primary → Backup → Local)
- 🔍 **Enhanced Semantic Search** - AI-powered search with main answer + additional context
- 💾 **Full Memory Operations** - Create, search, list, get, and delete memories
- ✨ **Prompt Optimization** - Refine prompts for better AI results
- 🎯 **Model Configuration** - User-configurable AI model selection

### 🚀 Concierge Enhancements (v1.0.0)
- 📜 **Command History** - Navigate 1000 previous commands with ↑/↓ arrows
- ⌨️ **Tab Completion** - Auto-complete all commands and aliases
- 📖 **Multi-line Input** - Auto-detect unclosed quotes, braces, code blocks
- 🏥 **Health Monitoring** - Real-time AI endpoint health checks with `lrepl health`
- 🎨 **Interactive Dashboard** - Beautiful Ink-based TUI with keyboard navigation (optional)
- 🛡️ **Vendor Abstraction** - LZero-branded logging (no vendor names exposed)

### 🔧 Developer Experience
- 🔌 **MCP Support** - Model Context Protocol integration
- 🎨 **Beautiful Output** - Colored, formatted terminal experience
- ⚡ **Fast & Lightweight** - ~95 KB bundled
- 🔐 **Multiple Auth Methods** - OAuth 2.1, OTP/magic link, API keys, vendor keys
- 📝 **Config Persistence** - Settings saved between sessions
- 💬 **Context Awareness** - Maintains conversation history
- 📊 **Enhanced Logging** - Real-time LZero processing status with latency

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

### 1. Login (First Time)

```bash
# Standard OAuth
lrepl login

# Passwordless OTP
lrepl login --otp

# Lonasis/Supabase
lrepl login --lonasis
```

### 2. Start REPL

```bash
# Classic REPL (default)
lrepl start

# With custom API
lrepl start --api https://api.lanonasis.com

# With AI Router override
lrepl start --ai-router https://ai.vortexcore.app

# With model selection
lrepl start --model gpt-4
```

### 3. Interact Naturally

```
💭 Remember that I prefer TypeScript over JavaScript
💭 What do I know about my API project?
💭 Show me my recent memories
💭 Find information about authentication
💭 Please refine this prompt: "Write a function"
```

### 4. Use Commands

```
💭 create Project Notes API architecture details...
💭 search authentication --type=project
💭 list 10
💭 get <memory-id>
💭 history
💭 help
```

## 🎮 Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `↑` / `↓` | Navigate command history (1000 commands) |
| `Tab` | Auto-complete commands |
| `Enter` | Submit command |
| `Ctrl+C` | Cancel input / Exit REPL |

### Multi-line Input

Leave these open to continue on next line:
- Quotes: `"text` or `'text`
- Braces: `{code`
- Brackets: `[text`
- Code blocks: ` ``` `
- Backslash: `text\`

## 📋 Command Reference

### Main Commands

```bash
lrepl start              # Launch REPL session
lrepl login              # Authenticate with OAuth
lrepl login --otp        # Passwordless OTP login
lrepl logout             # Clear credentials
lrepl auth-status        # Show auth status (alias: whoami)
lrepl config             # Show configuration
lrepl health             # Check AI endpoint health
lrepl --version          # Show version
```

### REPL Internal Commands

**Memory Operations:**
- `create <title> <content>` - Create a memory
- `update <id> [--content=...]` - Update a memory
- `search <query> [--type=<type>]` - Search memories
- `list [limit]` - List recent memories
- `get <id>` - Get specific memory
- `delete <id>` - Delete a memory

**System Commands:**
- `nl [on|off]` - Toggle natural language mode
- `reset` - Clear conversation history
- `mode <remote|local>` - Switch operation mode
- `status` - Show current status
- `clear` - Clear screen
- `history [search]` - Show command history
- `help`, `?`, `h` - Show help
- `exit`, `quit`, `q` - Exit REPL

## 🏥 Health Monitoring

Check AI endpoint health and fallback status:

```bash
lrepl health
```

**Output:**
```
- Checking AI endpoints...
✔ Health check complete: 2/3 healthy

LZero Primary:    ✓ Healthy   (45ms)
LZero Backup:     ✓ Healthy   (120ms)
Local Pattern:    ✓ Available

Status: All systems operational
```

## 🔍 Logging & Validation

### Real-time Logging

```bash
# Capture session logs
lrepl start 2>&1 | tee session.log

# Watch for LZero processing
grep "\[LZero\]" session.log
```

**Log Output:**
```
[LZero] Processing request...
[LZero] ✓ Processed (145ms)

OR (backup active):
[LZero] Using enhanced mode (5000ms)
  → Switching to backup intelligence...
[LZero] Backup intelligence active
```

### Analyze Logs

```bash
# Count primary vs backup usage
echo "Primary: $(grep -c '\[LZero\] ✓ Processed' session.log)"
echo "Backup: $(grep -c 'Backup' session.log)"
```

## 🛡️ Vendor Abstraction

Per organization blueprint, **all AI routing is handled by LZero**:
- Users see "LZero" branding (not vendor names)
- Fallback shown as "backup intelligence"
- Vendor isolation maintained
- No vendor identifiers in logs

## 🔐 Authentication

### OAuth 2.1 (Recommended)
```bash
lrepl login
```

### Passwordless OTP
```bash
lrepl login --otp
```

### Lonasis/Supabase
```bash
lrepl login --lonasis
```

### Check Status
```bash
lrepl auth-status
# or
lrepl whoami
```

### Logout
```bash
lrepl logout
lrepl logout --revoke  # Revoke on server first
```

## ⚙️ Configuration

### Config File
Location: `~/.lanonasis/repl-config.json`

```json
{
  "apiUrl": "https://api.lanonasis.com",
  "aiRouterUrl": "https://ai.vortexcore.app",
  "useMCP": false,
  "maxHistorySize": 1000,
  "historyPersistence": true,
  "nlMode": true
}
```

### Environment Variables

```bash
# Authentication
export LANONASIS_API_KEY="your-key"
export MEMORY_API_KEY="your-key"

# AI Configuration
export AI_ROUTER_API_KEY="lano_xxx"
export AI_ROUTER_URL="https://ai.vortexcore.app"
export OPENAI_API_KEY="sk-xxx"
export OPENAI_MODEL="gpt-4o-mini"

# Command history
# Set to 0 to disable writing ~/.lanonasis/repl-history.txt.
export LANONASIS_REPL_HISTORY=1

# Debug Logging
export DEBUG=lanonasis:*
export LOG_LEVEL=debug
```

### Command history

The REPL remembers what you typed between sessions. Press `↑` / `↓` to
navigate to a previous command, just like in your shell.

| Where | What |
|---|---|
| **File** | `~/.lanonasis/repl-history.txt` |
| **Permissions** | `0600` on the file, `0700` on its parent directory (POSIX) |
| **Capacity** | Up to `maxHistorySize` entries (default `1000`). Excess is trimmed atomically (temp + rename). |
| **Format** | One entry per line, UTF-8, no quoting. |

#### What's saved, what isn't

Saved:

- Recognised commands (e.g. `help`, `search TypeScript`, `create MyTitle SomeContent`).
- Natural-language input that the orchestrator processed without error.

**Never saved** (the REPL applies this filter before touching disk):

- **Credentials.** OpenAI, Anthropic, GitHub, Stripe, AWS, Google,
  LanOnasis, JWT, Bearer, Telegram tokens, SSH private-key blocks,
  database URLs, hex secrets, and `KEY=value` env assignments — all
  detected via the existing `local-memory/privacy.ts` pattern matcher.
- Multi-line inputs (anything containing a literal newline).
- Inputs longer than 2 000 characters.
- Repeated submissions identical to the entry just persisted (no
  point growing the file with duplicates).

The in-memory history still shows the secret for the current session
so `↑` / `↓` inside the REPL still works — the filter only governs
what lands on disk. In-memory history is cleared when the process
exits.

#### Opting out

Two ways to keep the REPL session-only:

```jsonc
// ~/.lanonasis/repl-config.json
{ "historyPersistence": false }
```

```bash
LANONASIS_REPL_HISTORY=0 lrepl start
```

`LANONASIS_REPL_HISTORY=0` always wins over the saved config: it is
applied after `repl-config.json` is loaded, on every launch, so a
`"historyPersistence": true` in that file cannot re-enable persistence
while the variable is set. The variable is never written into the
config file.

When persistence is disabled, the **history file** is never created and
no command is ever written to disk. The CLI does still create
`~/.lanonasis/` and `repl-config.json` on first launch — the config is
the one file that gets written regardless of this setting.

#### Clearing

```bash
rm ~/.lanonasis/repl-history.txt
```

The history file is created on the first input that is persisted, not at
startup — so the next `lrepl start` does **not** recreate it. The REPL
starts with empty history, and the file reappears (mode `0600`) as soon
as you enter a command worth saving. The in-memory history is always
cleared on process exit.

## 📊 AI Fallback Flow

```
User Query
    ↓
LZero Primary (ai.vortexcore.app) ← Default
    ↓ ✗ Failed?
LZero Backup (api.openai.com) ← Automatic fallback
    ↓ ✗ Failed?
Local Pattern Matching ← Final fallback
```

**Validation:** See `AI_ROUTER_VALIDATION.md` and `QUICK_REFERENCE.md`

## 📚 Documentation

| File | Description |
|------|-------------|
| `CLI_COMMANDS.md` | Complete command reference |
| `AI_ROUTER_VALIDATION.md` | AI endpoint validation guide |
| `QUICK_REFERENCE.md` | Fast lookup card |
| `CHANGELOG.md` | Version history |

## 🧪 Testing

```bash
npm test
```

### Live service tests

The default suite mocks `@lanonasis/memory-client`. The live suite builds the
real client the REPL uses and talks to the deployed REST API:

```bash
export LANO_TEST_API_KEY=lano_...
npm run test:live
```

`tests/live/maas-service.test.ts` covers `createMemoryClient` list/create/get/
delete round-trips, `MaaSClientAdapter` save/search/health mapping, and a control
that proves the key itself works over plain `fetch`. Tests prefixed
`[known-gap]` assert correct behaviour and fail while the corresponding client
defect is open. Override the target with `LANO_TEST_REST_BASE`.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm test`
5. Submit a PR

## 📝 License

MIT © [Lanonasis Team](https://lanonasis.com)

## 🔗 Links

- [NPM Package](https://www.npmjs.com/package/@lanonasis/repl-cli)
- [Documentation](https://docs.lanonasis.com/cli/repl)
- [Issues](https://github.com/thefixer3x/lan-onasis-monorepo/issues)
- [Monorepo](https://github.com/thefixer3x/lan-onasis-monorepo)

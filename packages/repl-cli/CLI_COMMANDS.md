# 🚀 REPL CLI - Complete Command Reference

## Binary Aliases

After installation, you can use any of these:

```bash
onasis-repl    # Full name
lrepl          # Short alias
```

---

## Main Commands

### 1. **start** - Launch the REPL (default)

```bash
# Basic usage
onasis-repl start
onasis-repl           # 'start' is default
lrepl                 # Short alias

# With options
onasis-repl start --api https://api.lanonasis.com
onasis-repl start --ai-router https://ai.vortexcore.app
onasis-repl start --token YOUR_TOKEN
onasis-repl start --model gpt-4
onasis-repl start --mcp   # Local MCP mode
```

**Options:**
| Option | Description |
|--------|-------------|
| `--mcp` | Use local MCP mode |
| `--api <url>` | Override API URL |
| `--ai-router <url>` | Override AI router URL |
| `--token <token>` | Authentication token |
| `--model <model>` | Model override (default: L-Zero) |

---

### 2. **login** - Authenticate

```bash
# Standard OAuth login
onasis-repl login
lrepl login

# Passwordless OTP login
onasis-repl login --otp

# Login with Lonasis (Supabase)
onasis-repl login --lonasis

# Custom auth server
onasis-repl login --auth-url https://custom.auth.com
onasis-repl login --callback-port 9000
onasis-repl login --no-open  # Don't auto-open browser
```

**Options:**
| Option | Description | Default |
|--------|-------------|---------|
| `--auth-url <url>` | Auth server URL | https://auth.lanonasis.com |
| `--callback-port <port>` | OAuth callback port | 8899 |
| `--no-open` | Don't auto-open browser | false |
| `--lonasis` | Login with Lonasis/Supabase | false |
| `--otp` | Passwordless OTP login | false |

---

### 3. **logout** - Clear credentials

```bash
# Basic logout
onasis-repl logout
lrepl logout

# Revoke tokens on server first
onasis-repl logout --revoke
```

**Options:**
| Option | Description |
|--------|-------------|
| `--revoke` | Revoke tokens on server before clearing |

---

### 4. **auth-status** / **whoami** - Check auth status

```bash
onasis-repl auth-status
onasis-repl whoami      # Alias
lrepl auth-status
```

**Shows:**
- Authentication status (authenticated/not)
- Email address
- Auth method used
- Token expiration

---

### 5. **config** - Show configuration

```bash
onasis-repl config
lrepl config
```

**Shows:**
- API URL
- AI Router URL
- Current mode (remote/local)
- User profile

---

### 6. **health** - Check AI endpoints

```bash
onasis-repl health
lrepl health
```

**Shows:**
- AI Router health status
- OpenAI fallback status
- Local pattern matching availability
- Response latencies

---

## REPL Internal Commands

Once inside the REPL (`onasis-repl start`), use these:

### Memory Operations

```
create <title> <content>              Create a memory
update <id> [--content=...]           Update a memory
search <query> [--type=<type>]        Search memories
list [limit]                          List recent memories
get <id>                              Get specific memory
delete <id>                           Delete a memory
```

### System Commands

```
nl [on|off]          Toggle natural language mode
reset                Clear conversation history
mode <remote|local>  Switch operation mode
status               Show current status
clear                Clear screen
history [search]     Show command history
help, ?, h           Show help
exit, quit, q        Exit REPL
```

### Keyboard Shortcuts

```
↑ / ↓      Navigate command history (1000 commands)
Tab        Auto-complete commands
Enter      Submit command
Ctrl+C     Cancel input / Exit REPL
```

### Multi-line Input

Leave these open to continue on next line:
- Quotes: `"text` or `'text`
- Braces: `{code`
- Brackets: `[text`
- Code blocks: ` ``` `
- Backslash: `text\`

---

## Quick Usage Examples

### First Time Setup
```bash
# 1. Login
onasis-repl login

# 2. Verify auth
onasis-repl whoami

# 3. Start using REPL
onasis-repl start
```

### Daily Usage
```bash
# Quick start
lrepl

# Check AI health first
lrepl health

# Start with custom API
lrepl start --api https://custom.api.com
```

### Troubleshooting
```bash
# Check configuration
lrepl config

# Re-login if needed
lrepl login --otp

# Logout and clear everything
lrepl logout --revoke
```

---

## Environment Variables

```bash
# Authentication
export LANONASIS_API_KEY="your-key"
export MEMORY_API_KEY="your-key"

# AI Configuration
export AI_ROUTER_API_KEY="lano_xxx"
export AI_ROUTER_URL="https://ai.vortexcore.app"
export OPENAI_API_KEY="sk-xxx"
export OPENAI_MODEL="gpt-4o-mini"

# Debug Logging
export DEBUG=lanonasis:*
export LOG_LEVEL=debug
```

---

## Configuration File

Location: `~/.lanonasis/repl-config.json`

```json
{
  "apiUrl": "https://api.lanonasis.com",
  "aiRouterUrl": "https://ai.vortexcore.app",
  "useMCP": false,
  "maxHistorySize": 1000,
  "nlMode": true
}
```

---

## Version

```bash
onasis-repl --version
lrepl -v
```

---

**📚 Full Documentation**: See `README.md` and `AI_ROUTER_VALIDATION.md`

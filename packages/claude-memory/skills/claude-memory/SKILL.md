---
name: claude-memory
description: This skill should be used when the user asks to "set up claude-memory", "configure memory hooks for Claude Code", "install @lanonasis/claude-memory", "enable cross-session memory", "why isn't my memory hook working", "how do I use LANONASIS_API_KEY with claude-memory", "drain the memory spool", or asks about how session memories are captured and recalled. Use when troubleshooting recall, spool, or hook installation issues.
version: 0.1.0
---

# @lanonasis/claude-memory

Cross-session semantic memory for Claude Code via LanOnasis Memory-as-a-Service (MaaS).

## What It Does

`@lanonasis/claude-memory` hooks into Claude Code's lifecycle events to automatically capture decisions, tag them, and persist them to LanOnasis MaaS. On the first tool call of each new session, it recalls semantically related context and injects it before Claude responds.

**Data flow:**

```
Stop / SubagentStop → transcript extraction → enrichment → MaaS createMemory
                                                               ↓ on API failure
                                                         local spool write

PreCompact → strict extraction → enrichment → MaaS createMemory

PreToolUse (first call per session only)
  → recall lock at ~/.lanonasis/.recall-lock/<session_id>
  → semantic search
  → inject <recalled-context> block into Claude's context
```

Auto Memory (Claude's local `.claude/` notepad) is never touched. This package writes exclusively to LanOnasis MaaS.

---

## Prerequisites

- Node.js 20+ or Bun runtime
- Claude Code installed (`claude` CLI available)
- A valid LanOnasis API key (obtain from the LanOnasis dashboard or MaaS API)

---

## Install

```bash
bun add @lanonasis/claude-memory
# or
npm install @lanonasis/claude-memory
```

---

## Environment Variables

Set these before running `install-hooks` and before Claude Code launches.

| Variable | Required | Default | Description |
|---|---|---|---|
| `LANONASIS_API_KEY` | **Yes** (for network ops) | — | MaaS auth key (`lano_...`) |
| `LANONASIS_ORG_ID` | No | — | Explicit org scope override |
| `LANONASIS_PROJECT_ID` | No | — | Legacy alias for `LANONASIS_ORG_ID` |
| `CLAUDE_MEMORY_AGENT_TYPE` | No | `claude-code` | Tag written to memory metadata |
| `CLAUDE_MEMORY_SPOOL_DIR` | No | `~/.lanonasis/maas-spool/claude-code` | Offline queue path |

If neither `LANONASIS_ORG_ID` nor `LANONASIS_PROJECT_ID` is set, the client omits scope override headers and uses the org associated with the API key.

**Persist the key across shells** by adding to your shell secrets file:

```bash
export LANONASIS_API_KEY=lano_<your_key>
```

---

## Setup

### Step 1: Export environment variables

Export `LANONASIS_API_KEY` in the current shell (and persist it in your shell startup file).

### Step 2: Install hooks

```bash
bun run install-hooks
```

This script:
1. Writes hook runner scripts to `~/.lanonasis/hooks/` (`stop.sh`, `subagent_stop.sh`, `precompact.sh`, `pretooluse.sh`)
2. Patches `~/.claude/settings.json` with `hooks` entries pointing to those scripts (backs up original to `.bak`)

Verify by checking `~/.claude/settings.json` — it should contain entries under the `hooks` key for `Stop`, `SubagentStop`, `PreCompact`, and `PreToolUse`.

### Step 3: Verify

```bash
claude-memory status
```

Expected output:
```
Connected | v1.x.x | 42 memories | spool: 0 pending
```

---

## CLI Reference

The `claude-memory` binary is included in the package. After global install or `bun link`, it is available as:

```bash
claude-memory <command>
```

| Command | Description |
|---|---|
| `status` | Connection health, memory count, pending spool entries |
| `search <query>` | Semantic search across stored memories (top 10) |
| `list` | Show 20 most recent memories |
| `spool` | Show pending offline queue entries |
| `drain` | Retry sending spooled entries to MaaS |
| `stats` | Local config summary (spool dir, agent type, API URL) |

### Make the binary globally available

```bash
# Option A — bun link (recommended in monorepos)
cd packages/claude-memory && bun link

# Option B — global install from npm
npm install -g @lanonasis/claude-memory
```

---

## Hook Architecture

Four lifecycle hooks are installed into Claude Code:

### Stop / SubagentStop

Fires when a Claude Code session ends (or a subagent completes). The handler:

1. Reads the session transcript from stdin (`StopInput.transcript`)
2. Runs `shouldCapture()` — filters trivial or non-informative turns
3. Runs `extractDecisionChains()` — identifies decision trees in the conversation
4. Runs `redactSecrets()` — strips API keys, tokens, passwords before persistence
5. Runs `extractTags()` and `detectMemoryType()` — auto-classifies the memory
6. Calls `client.createMemory()` with content-addressed idempotency key (`sha256(scope + agentType + type + normalizedContent[:500])`)
7. On API failure: writes entry to local spool (`SpoolQueue.write()`)
8. Clears the session recall lock file

### PreCompact

Fires before Claude Code compacts the context window. Stricter extraction than Stop — only captures content above a quality threshold. Uses `"default"` scope if no project ID is set and leaves scope semantics to MaaS auth / explicit header override rather than hardcoding metadata.

### PreToolUse (first call per session)

Fires before the first tool use in a new session. The handler:

1. Checks for an existing recall lock at `~/.lanonasis/.recall-lock/<session_id>`
2. If lock exists, exits silently (recall already done this session)
3. Writes the lock file
4. Calls `client.searchMemories()` with the session's initial user prompt
5. Formats results as `<recalled-context>` XML block
6. Returns the block as `assistantMessage` in the hook response — Claude sees this before the first tool call

---

## Offline Spool

When the MaaS API is unreachable, memories are queued locally:

- **Queue path**: `~/.lanonasis/maas-spool/claude-code/` (configurable via `CLAUDE_MEMORY_SPOOL_DIR`)
- **Format**: NDJSON files, one entry per spooled session
- **Drain manually**: `claude-memory drain`
- **Check queue depth**: `claude-memory spool` or `claude-memory status`

Auto-drain on next successful session is not yet implemented (Phase 6). Use `claude-memory drain` after connectivity is restored.

---

## Security

- Secrets are redacted from content before persistence (`redactSecrets()` in `enrichment/prompt-safety.ts`)
- Recalled context is sanitized against prompt injection before injection
- Recall lock files are session-scoped and cleaned up on `Stop`
- No credentials are written to repo files or committed to git
- The package never modifies `.claude/` memory files — only `settings.json` hooks entries

---

## Additional Resources

### Reference Files

For detailed technical documentation, consult:

- **`references/hooks-reference.md`** — Full hook event schema, StopInput fields, response format, and enrichment pipeline internals
- **`references/troubleshooting.md`** — Common setup issues, debugging steps, spool recovery, and API error diagnosis

---

## Quick Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| `claude-memory: command not found` | Binary not in PATH | Run `bun link` in package dir or `npm install -g @lanonasis/claude-memory` |
| `LANONASIS_API_KEY not set` | Env var missing | Export key; verify with `echo $LANONASIS_API_KEY` |
| `Disconnected: ...` on status | API unreachable | Check network; run `claude-memory spool` to see queued entries |
| `[undefined]` type in search results | Old API response format | Update package — `type` field backfilled from `memory_type` |
| Hooks not firing | Hook install not run | Re-run `bun run install-hooks`; check `~/.claude/settings.json` |
| Recall not injecting context | No memories yet, or threshold too high | Run `claude-memory list` to verify memories exist |

See `references/troubleshooting.md` for deeper diagnosis steps.

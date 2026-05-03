# @lanonasis/claude-memory

Cross-session semantic memory for Claude Code using LanOnasis Memory-as-a-Service (MaaS).

## What it does

- Captures important decisions from Claude Code transcripts on `Stop` and `PreCompact`.
- Performs semantic recall on the first `PreToolUse` call per session.
- Queues writes to local spool storage if the API is unavailable, then drains later.
- Keeps Auto Memory untouched; this package writes to LanOnasis MaaS only.

## Architecture

```text
Claude Code session
  |
  +-- Stop/SubagentStop ----> extraction ----> MaaS createMemory
  |                                |               |
  |                                |               +-- fallback spool write
  |                                |
  +-- PreCompact ---------> strict extraction --> MaaS createMemory
  |
  +-- PreToolUse (first call only per session)
            |
            +-- recall lock ~/.lanonasis/.recall-lock/<session_id>
            +-- semantic search
            +-- inject <recalled-context>
```

## Prerequisites

- Node.js 20+ (or Bun runtime for local hook execution).
- Claude Code installed.
- A valid LanOnasis API key.

## Install

```bash
bun add @lanonasis/claude-memory
```

## Setup

1. Export environment variables (see table below).
2. Install hooks:

```bash
bun run install-hooks
```

This creates hook wrapper scripts under `~/.lanonasis/hooks` and patches `~/.claude/settings.json` (with `.bak` backup).

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `LANONASIS_API_KEY` | Yes (for network operations) | API key used for MaaS auth. |
| `LANONASIS_ORG_ID` | No | Preferred explicit scope override. |
| `LANONASIS_PROJECT_ID` | No | Backward-compatible alias for `LANONASIS_ORG_ID`. |
| `CLAUDE_MEMORY_AGENT_TYPE` | No | Agent label in metadata (`claude-code` default). |
| `CLAUDE_MEMORY_SPOOL_DIR` | No | Custom spool path override. |

If neither `LANONASIS_ORG_ID` nor `LANONASIS_PROJECT_ID` is set, the client omits scope override headers.

## CLI usage

```bash
claude-memory status
claude-memory search "retry strategy"
claude-memory list
claude-memory spool
claude-memory drain
claude-memory stats
```

## Security

- The hook pipeline redacts likely secrets before persistence.
- Recall output filters prompt-injection-like content before injection.
- Recall lock files are session-scoped and removed when Stop/SubagentStop completes.
- The package never writes plaintext credentials to repo files.

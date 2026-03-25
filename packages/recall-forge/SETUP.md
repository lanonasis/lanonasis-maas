# RecallForge — Operator Setup Guide

RecallForge adds cloud-backed semantic memory and a context engine to OpenClaw via LanOnasis MaaS. It registers in both the `memory` and `contextEngine` plugin slots.

## Requirements

- OpenClaw `2026.3.1` or newer
- A LanOnasis API key ([dashboard](https://app.lanonasis.com))
- A LanOnasis project ID

## Install From npm

```bash
openclaw plugins install @lanonasis/recall-forge
```

Then configure in `~/.openclaw/openclaw.json` (see below), or through the OpenClaw install flow if your UI supports manifest prompts.

## Local Development Install

```bash
cd apps/lanonasis-maas/packages/recall-forge
npm install
npm run build
openclaw plugins install "$(pwd)" --link
```

After editing source files, re-run `npm run build` before testing — `dist/` must stay current.

Or use the helper script:

```bash
bash setup/install.sh
```

## Minimal Configuration

Add to `~/.openclaw/openclaw.json`:

```json
{
  "plugins": {
    "allow": ["recall-forge"],
    "slots": {
      "memory": "recall-forge",
      "contextEngine": "recall-forge"
    },
    "entries": {
      "recall-forge": {
        "enabled": true,
        "config": {
          "apiKey": "YOUR_LANONASIS_API_KEY",
          "projectId": "YOUR_PROJECT_ID",
          "captureMode": "hybrid",
          "localFallback": true,
          "autoRecall": true,
          "agentId": "main",
          "dedupeThreshold": 0.985
        }
      }
    }
  }
}
```

Note: Both slots (`memory` and `contextEngine`) must point to `recall-forge` for full dual-slot functionality.

## Verify the Install

```bash
openclaw lanonasis status
openclaw lanonasis create --title "RecallForge test" --content "Hello from RecallForge"
openclaw lanonasis list --page 1 --sort created_at --order desc
openclaw lanonasis stats
```

Expected behavior:
- `status` — prints connection status, project ID, and server version
- `create` — prints stored memory ID, title, type, tags, and preview
- `list` — prints a table of memories
- `stats` — prints server-side memory stats

## Workspace Snippets

```bash
cat "$(openclaw plugins path recall-forge)/setup/agents-memory.md" >> ~/.openclaw/workspace/AGENTS.md
cat "$(openclaw plugins path recall-forge)/setup/heartbeat-memory.md" >> ~/.openclaw/workspace/HEARTBEAT.md
```

## CLI Commands

Core CRUD:

```bash
openclaw lanonasis create --title "..." --content "..."
openclaw lanonasis get <id-or-prefix>
openclaw lanonasis update <id-or-prefix> --title "..."
openclaw lanonasis delete <id-or-prefix> --force
```

Search and listing:

```bash
openclaw lanonasis search "query" --threshold 0.7 --type knowledge --tags alpha,beta
openclaw lanonasis list --page 1 --sort created_at --order desc --tags alpha,beta
openclaw lanonasis stats
```

Extraction (secret-redacted before storing):

```bash
openclaw lanonasis extract ./sessions.jsonl --dry-run
openclaw lanonasis extract ./SOUL.md --dry-run
openclaw lanonasis extract ~/.openclaw/memory/main.sqlite --dry-run
```

## Confirming Dual-Slot Registration

When the plugin loads successfully, the startup log shows both slots:

```
[recall-forge] Ready — slots: memory+contextEngine | mode: hybrid | memory: hybrid | recall: active | shared: off | fallback: true | project: <project-id>
```

If only the memory slot is needed, remove `"contextEngine": "recall-forge"` from the slots config — the contextEngine will still be registered internally, but OpenClaw will not route context-build calls to it.

## Secret Redaction Verification

To confirm redaction is active before a UAT run:

```bash
openclaw lanonasis create \
  --title "Redaction test" \
  --content "API_KEY=sk-ant-api03-test123456789012345678 postgres://user:password123@localhost/db"
openclaw lanonasis list --page 1
```

The stored memory content should show `[REDACTED_ENV_SECRET]` and `[REDACTED_DATABASE_URL]` — not the original values.

## Publish Checklist

Before publishing a new version:

```bash
npm run typecheck
npm run build
npm pack --dry-run
```

The tarball must contain `dist/`, `openclaw.plugin.json`, setup assets, README, CHANGELOG, and LICENSE. No `.env` files, local configs, or workspace data.

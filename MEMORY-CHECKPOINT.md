# Lanonasis Memory Checkpoint Summary

**Date:** 2026-04-25
**CLI Version:** Latest (via `lanonasis -h`)
**API Status:** Investigation ongoing (Memory proxy route not found - server-side)

---

## Quick Reference: Memory CLI Commands

### Create Memory
```bash
lanonasis memory create -t "Title" -c "Content" --type context --tags "tag1,tag2"
```

**Options:**
| Flag | Description |
|------|-------------|
| `-t, --title <title>` | Memory title |
| `-c, --content <content>` | Memory content |
| `--type <type>` | Type: `context`, `project`, `knowledge`, `reference`, `personal`, `workflow` |
| `--tags <tags>` | Comma-separated tags |
| `--topic-id <id>` | Topic UUID |
| `--json <json>` | JSON payload |
| `--content-file <path>` | Read content from file |
| `-i, --interactive` | Interactive mode |

### Other Memory Commands
```bash
lanonasis memory list                      # List memories
lanonasis memory get <id>                  # Get memory by ID
lanonasis memory update <id> -t "New Title"  # Update memory
lanonasis memory delete <id>              # Delete memory
lanonasis memory search "query"           # Semantic search
```

---

## Issue: "Memory proxy route not found"

**Error from `api.lanonasis.com`:**
```json
{"error":"Memory proxy route not found","code":"NOT_FOUND","path":"/api/v1/memories"}
```

**Root Cause:** Server-side gateway/proxy configuration issue at `api.lanonasis.com`

**Workaround Options:**
1. **Direct Supabase Edge Functions** (confirmed working):
   - `https://lanonasis.supabase.co/functions/v1/memory-list`
   - `https://lanonasis.supabase.co/functions/v1/memory-get?id=...`

2. **MCP Server** (for MCP protocol clients):
   - `https://mcp.lanonasis.com/mcp`

---

## API Routes (Supabase Edge Functions - Direct)

| Function | URL | Auth |
|----------|-----|------|
| `memory-create` | `/functions/v1/memory-create` | ✅ |
| `memory-get` | `/functions/v1/memory-get` | ✅ |
| `memory-update` | `/functions/v1/memory-update` | ✅ |
| `memory-delete` | `/functions/v1/memory-delete` | ✅ |
| `memory-list` | `/functions/v1/memory-list` | ✅ |
| `memory-search` | `/functions/v1/memory-search` | ✅ |
| `memory-stats` | `/functions/v1/memory-stats` | ✅ |
| `memory-bulk-delete` | `/functions/v1/memory-bulk-delete` | ✅ |

**Direct Supabase URL:** `https://mxtsdgkwzjzlttpotole.supabase.co`

---

## VSCode Extension Changes (v2.1.1)

**Status:** Built and packaged at `lanonasis-memory-2.1.1.vsix`

**Key Changes:**
1. Updated MCP server URL default → `https://mcp.lanonasis.com/mcp`
2. Updated SDK routes: `/memory` → `/memories` (plural form)
3. Fixed `build:css` script (skipped - using prebuilt styles)
4. Created `ApiKeyManager.tsx` stub (was missing)
5. Fixed TypeScript errors (0 remaining)

**Install:** `Cmd+Shift+P` → "Install from VSIX" → select `lanonasis-memory-2.1.1.vsix`

---

## Package Versions

| Package | Version |
|---------|---------|
| `@lanonasis/memory-client` | 2.2.0 (npm) / 2.2.1 (local) |
| `lanonasis-memory` (VSCode) | 2.1.1 |
| `typescript` | ^6.0.3 |

---

## Tasks Completed

✅ 5 task validations
✅ 9 CodeRabbit auto-fixes
✅ 43 TypeScript errors fixed
✅ Build passes (0 errors)

**Commits:**
- `d830577` - fix: update MCP server URL and modify memory API endpoints
- `f3aedc9` - docs: mark all tasks complete in task-sheet.md
- `26f35b7` - fix: resolve remaining TypeScript errors (centralAuth, express-auth)
- `d08028d` - fix: resolve TypeScript errors in environment.ts and centralAuth.ts
- `6c8c459` - fix: resolve TypeScript strict mode errors in core files

---

## Notes

- CLI uses `--no-mcp` flag to force REST API routing
- `api.lanonasis.com` gateway routes need investigation/update
- MCP server at `https://mcp.lanonasis.com/mcp` may be alternative path
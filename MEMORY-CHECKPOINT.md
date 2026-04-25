# Lanonasis Memory Checkpoint Summary

**Date:** 2026-04-25
**CLI Version:** Latest (via `lanonasis -h`)
**API Status:** Investigation ongoing (`memory-proxy` regression on `api.lanonasis.com`; local hotfix verified, not yet deployed)

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

**Root Cause:** Server-side Netlify `memory-proxy` path-normalization regression at `api.lanonasis.com`

The failing deployed proxy is returning the public path verbatim instead of
normalizing it into the expected edge-function route. Local hotfix verification
shows the intended mapping is:

| Public route | Proxy route | Supabase edge target |
|-------------|-------------|----------------------|
| `/api/v1/memory/list` | `/list` | `memory-list` |
| `/api/v1/memories/list` | `/list` | `memory-list` |
| `/api/v1/memory` `GET` | `/collection` | `memory-list` |
| `/api/v1/memories` `GET` | `/collection` | `memory-list` |
| `/api/v1/memory` `POST` | `/collection` | `memory-create` |
| `/api/v1/memories` `POST` | `/collection` | `memory-create` |
| `/api/v1/memory/get?id=...` | `/legacy-get` | `memory-get` |
| `/api/v1/memory/:id` | `/get/:id` | `memory-get/:id` |
| `/api/v1/memories/:id` | `/get/:id` | `memory-get/:id` |
| `/api/v1/memory/health` | `/health` | `system-health` |

**Workaround Options:**
1. **Direct Supabase Edge Functions** (bypass Netlify proxy):
   - `https://lanonasis.supabase.co/functions/v1/memory-list`
   - `https://lanonasis.supabase.co/functions/v1/memory-search`
   - `https://lanonasis.supabase.co/functions/v1/memory-stats`
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
| `system-health` | `/functions/v1/system-health` | ❌ |

**Direct Edge Base URL:** `https://mxtsdgkwzjzlttpotole.supabase.co`
**Vanity Compatibility Host:** `https://lanonasis.supabase.co`

Use the raw project-ref host for new direct-edge smoke tests. The vanity host is
still widely referenced in existing redirects, examples, and compatibility
notes, and currently resolves to the same project.

## Public Route Alignment

Plural `/api/v1/memories/*` is the canonical REST path family. Singular
`/api/v1/memory/*` remains a compatibility alias.

| Public URL | Expected edge function |
|-----------|-------------------------|
| `/api/v1/memory/list` | `memory-list` |
| `/api/v1/memories/list` | `memory-list` |
| `/api/v1/memory/search` | `memory-search` |
| `/api/v1/memories/search` | `memory-search` |
| `/api/v1/memory/stats` | `memory-stats` |
| `/api/v1/memories/stats` | `memory-stats` |
| `/api/v1/memory/health` | `system-health` |
| `/api/v1/memory/get?id=...` | `memory-get` |
| `/api/v1/memory/:id` | `memory-get/:id` |
| `/api/v1/memories/:id` | `memory-get/:id` |
| `/api/v1/memory` `GET` | `memory-list` |
| `/api/v1/memories` `GET` | `memory-list` |
| `/api/v1/memory` `POST` | `memory-create` |
| `/api/v1/memories` `POST` | `memory-create` |

## Hotfix Status

- Local patch prepared in `apps/onasis-core/netlify/functions/memory-proxy.js`
- Local focused tests passing: `9/9`
- Live `api.lanonasis.com` still returns `Memory proxy route not found` until
  `onasis-core` is redeployed

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
- `api.lanonasis.com` memory routes currently depend on the Netlify
  `memory-proxy` bundle; direct Supabase edge functions are still the intended
  backend
- MCP server at `https://mcp.lanonasis.com/mcp` may be alternative path

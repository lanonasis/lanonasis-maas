# LanOnasis Memory Context-Engine Upgrade — Phase 0 Audit

**Status:** Phase 0 Complete  
**Sources:** `lanonasis/lanonasis-maas` repo, `thefixer3x/Onasis-CORE`  
**Audit date:** 2026-05-06  
**Classification:** Source of truth — all claims traceable to verified repo files

---

## 1. REST Surface — Server-Mounted Routes

All memory routes mount on **both** `/api/v1/memory` and `/api/v1/memories` (dual mount in `server.ts` lines 283-284). This is an existing inconsistency that predates this upgrade.

### 1.1 Memory CRUD — Category A (usable, minor normalization needed)

| Method | Route | Handler | Auth | Status |
|--------|-------|---------|------|--------|
| POST | `/api/v1/memory/` | createMemory | Plan limits (free:100, pro:10k, ent:∞) | A — production-ready |
| GET | `/api/v1/memory/` | listMemories | Role-based filtering | A — production-ready |
| POST | `/api/v1/memory/search` | searchMemories | Role-based user filtering | A — production-ready |
| GET | `/api/v1/memory/:id` | getMemory | Personal memory ACL | A — production-ready |
| PUT | `/api/v1/memory/:id` | updateMemory | Ownership check | A — production-ready |
| DELETE | `/api/v1/memory/:id` | deleteMemory | Ownership check | A — production-ready |
| GET | `/api/v1/memory/admin/stats` | getMemoryStats | `requireRole(['admin'])` | A — production-ready |
| POST | `/api/v1/memory/bulk/delete` | bulkDeleteMemories | `requireRole(['admin'])` + `requirePlan(['pro','enterprise'])` | A — production-ready |

### 1.2 Topics — Category C (server missing entirely)

| Method | Route | Handler | Status |
|--------|-------|---------|--------|
| GET | `/api/v1/topics/` | **NOT MOUNTED** | C — missing entirely |
| POST | `/api/v1/topics/` | **NOT MOUNTED** | C — missing entirely |
| GET | `/api/v1/topics/:id` | **NOT MOUNTED** | C — missing entirely |
| PUT | `/api/v1/topics/:id` | **NOT MOUNTED** | C — missing entirely |
| DELETE | `/api/v1/topics/:id` | **NOT MOUNTED** | C — missing entirely |
| GET | `/api/v1/topics/:id/memories` | **NOT MOUNTED** | C — missing entirely |
| GET | `/api/v1/topics/hierarchy` | **NOT MOUNTED** | C — missing entirely |

> **Phase-0 finding:** The SDK has full topic CRUD. The server has zero topic routes. This is a contract gap that must be closed before or alongside the context-engine work.

### 1.3 Analytics/Intelligence — Category C (server missing entirely)

| Method | Route | SDK Method | Status |
|--------|-------|-----------|--------|
| GET | `/api/v1/memory/analytics/search` | `getSearchAnalytics` | C — missing entirely |
| GET | `/api/v1/memory/analytics/access` | `getAccessPatterns` | C — missing entirely |
| GET | `/api/v1/memory/analytics/extended` | `getExtendedStats` | C — missing entirely |
| POST | `/api/v1/memory/build-context` | `buildContext` | C — missing entirely |
| POST | `/api/v1/memory/preprocess` | `createMemoryWithPreprocessing` | C — missing entirely |
| PUT | `/api/v1/memory/:id/preprocess` | `updateMemoryWithPreprocessing` | C — missing entirely |
| GET | `/api/v1/memory/search/enhanced` | `enhancedSearch` | C — missing entirely |

### 1.4 Context-Engine Routes — Category C (none exist yet)

These routes are the core deliverable of this upgrade:

| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/v1/context` | Compile LLM-ready context bundle |
| POST | `/api/v1/context/compile` | Same as above, explicit verb |
| GET | `/api/v1/context/views/:session_id/:viewer_id/:subject_id` | Participant view |
| GET | `/api/v1/profiles/:subject_id` | Memory profile (living) |
| GET | `/api/v1/profiles/:subject_id/history` | Profile version history |
| GET | `/api/v1/profiles/:subject_id/conflicts` | Profile contradictions |
| GET | `/api/v1/conclusions` | List inferred conclusions |
| GET | `/api/v1/conclusions/:id` | Get single conclusion |
| POST | `/api/v1/reasoning/flush` | Force flush reasoning queue |
| GET | `/api/v1/reasoning/jobs/:job_id` | Get reasoning job status |

### 1.5 Auth, Keys, Health, MCP — Category A (existing, stable)

| Method | Route | Status |
|--------|-------|--------|
| POST | `/api/v1/auth/basic/login` | A |
| POST | `/api/v1/auth/basic/register` | A |
| POST | `/api/v1/auth/basic/refresh` | A |
| POST | `/api/v1/auth/basic/logout` | A |
| GET/POST | `/api/v1/api-keys/*` | A |
| GET | `/api/v1/health[/ready|/live]` | A |
| GET | `/api/v1/metrics[/json]` | A |
| GET | `/sse` | A |
| GET | `/mcp` | A |

---

## 2. SDK Surface — TypeScript

Package: `packages/memory-sdk` and `packages/memory-client`

### 2.1 Methods with Server Support — Category A

```
createMemory         → POST /api/v1/memory/         ✅
getMemory           → GET /api/v1/memory/:id        ✅
updateMemory        → PUT /api/v1/memory/:id        ✅
deleteMemory        → DELETE /api/v1/memory/:id      ✅
listMemories        → GET /api/v1/memory/            ✅
searchMemories      → POST /api/v1/memory/search     ✅
bulkDeleteMemories  → POST /api/v1/memory/bulk/delete ✅
getMemoryStats      → GET /api/v1/memory/admin/stats  ✅
getHealth           → GET /api/v1/health             ✅
createProject / getProjects / createApiKey / listApiKeys / getApiKey / updateApiKey / deleteApiKey → /api/v1/api-keys/* ✅
registerMCPTool / getMCPTools → /api/v1/api-keys/mcp/* ✅
createMCPAccessRequest / createMCPSession / getProxyToken → /api/v1/mcp/* ✅
```

### 2.2 Methods with No Server Route — Category C

```
buildContext                      → /api/v1/memory/build-context      ❌ NOT MOUNTED
searchWithContext                 → calls buildContext internally       ❌ NOT MOUNTED
createMemoryWithPreprocessing     → /api/v1/memory/preprocess           ❌ NOT MOUNTED
updateMemoryWithPreprocessing     → /api/v1/memory/:id/preprocess       ❌ NOT MOUNTED
enhancedSearch                    → /api/v1/memory/search/enhanced       ❌ NOT MOUNTED
getSearchAnalytics                → /api/v1/memory/analytics/search     ❌ NOT MOUNTED
getAccessPatterns                 → /api/v1/memory/analytics/access     ❌ NOT MOUNTED
getExtendedStats                  → /api/v1/memory/analytics/extended   ❌ NOT MOUNTED
createTopic                       → /api/v1/topics/                     ❌ NOT MOUNTED
getTopic / getTopics              → /api/v1/topics/                     ❌ NOT MOUNTED
updateTopic                       → /api/v1/topics/:id                  ❌ NOT MOUNTED
deleteTopic                       → /api/v1/topics/:id                  ❌ NOT MOUNTED
getTopicWithMemories              → /api/v1/topics/:id/memories         ❌ NOT MOUNTED
getTopicsHierarchy                → /api/v1/topics/hierarchy            ❌ NOT MOUNTED
```

### 2.3 SDK Methods Partially Implemented

```
rotateApiKey     → PUT /api/v1/api-keys/:keyId (server supports) but NOT exposed in SDK
getSecurityEvents → server has no /security-events route
```

---

## 3. MCP Tool Surface

Package: `cli/src/mcp/server/lanonasis-server.ts`, `cli/src/mcp/schemas/tool-schemas.ts`

### 3.1 MCP Tools with Working Backend — Category A

| Tool | Underlying Route | Status |
|------|-----------------|--------|
| `memory_create` | POST /api/v1/memory/ | A |
| `memory_search` | POST /api/v1/memory/search | A |
| `memory_list` | GET /api/v1/memory/ | A |
| `memory_get` | GET /api/v1/memory/:id | A |
| `memory_update` | PUT /api/v1/memory/:id | A |
| `memory_delete` | DELETE /api/v1/memory/:id | A |
| `topic_create` | (no route — broken) | B |
| `topic_list` | (no route — broken) | B |
| `system_health` | GET /api/v1/health | A |
| `system_config` | internal | A |
| `connection_stats` | internal | A |
| `connection_auth_status` | internal | A |
| `transport_status` | internal | A |
| `transport_test` | internal | A |

### 3.2 MCP Tools Not Yet Implemented

| Tool | Status |
|------|--------|
| `apikey_create` | Returns `{ error: 'not yet implemented' }` — backend route exists but MCP layer stubs it |
| `apikey_list` | Returns `{ error: 'not yet implemented' }` — same |

### 3.3 New MCP Tools Required by Context Engine

```
memory_get_context              → POST /api/v1/context
memory_get_profile              → GET /api/v1/profiles/:subject_id
memory_list_conclusions         → GET /api/v1/conclusions
memory_get_participant_view     → GET /api/v1/context/views/:session_id/:viewer_id/:subject_id
memory_flush_reasoning_queue    → POST /api/v1/reasoning/flush
memory_get_reasoning_job        → GET /api/v1/reasoning/jobs/:job_id
```

---

## 4. CLI Surface

Command file: `cli/src/commands/memory.ts`

### 4.1 CLI Commands — Category A

```
memory create / memory add   → memory_create MCP tool ✅
memory list / memory ls      → memory_list MCP tool ✅
memory search                → memory_search MCP tool ✅
memory get / memory show     → memory_get MCP tool ✅
memory update                → memory_update MCP tool ✅
memory delete / memory rm    → memory_delete MCP tool ✅
memory stats                 → getMemoryStats ✅
```

### 4.2 CLI Commands — Enhancement Needed

```
memory-enhanced bulk-pause   → feature-flaggable, needs backend support
memory-enhanced analytics    → requires analytics routes (C above)
```

---

## 5. Auth and Context Boundary Surface

### 5.1 Existing Auth Primitives — Preserved

| Primitive | Location | Use in Upgrade |
|-----------|----------|----------------|
| `user_id` | Supabase auth | Subject identifier |
| `organization_id` | `security_service.org_members` | Scope boundary |
| `X-Project-Scope` | Request header | Context boundary selector |
| `key_context` | `security_service.api_keys.key_context` | Profile/view determination |
| `permissions` | `security_service.permissions` | Capability enforcement |
| `org_members` | `security_service.org_members` | Participant resolution |

### 5.2 Boundary Resolution — Existing (reuse)

The existing memory boundary resolver already derives: `personal | team | enterprise | none` from `key_context` + `scopes`. This is the enforcement surface for participant-view isolation.

---

## 6. Route and Envelope Drift — Phase-0 Issues

### 6.1 Singular/Plural Inconsistency

- Server mounts on **both** `/memory` and `/memories` (same router)
- SDK uses plural `/memories` for list, singular `/memory/:id` for specific
- MCP tools use singular form (`memory_create`, `memory_list`)
- CLI accepts both singular and plural

**Resolution:** Normalize to `/api/v1/memory` (plural base) with singular resource names in paths. Document this in the upgrade spec.

### 6.2 Response Envelope Drift

- SDK expects `{ data: T }` wrapper for list responses
- Server returns bare arrays for `listMemories`
- `searchMemories` returns `{ results: T[] }` or similar

**Resolution:** Add consistent envelope wrapper behind a feature flag `ENABLE_UNIFIED_ENVELOPE`.

### 6.3 SDK/Server Contract Gap (most critical)

**15+ SDK methods** call routes that don't exist on the server. This is the most significant phase-0 finding. The SDK has contract ambitions the server hasn't implemented. This must be resolved before the context-engine routes are added, otherwise the SDK will accumulate another layer of drift on top of existing drift.

---

## 7. Summary Classification

### Category A — Reuse as-is (enhancement minimal)

- Core memory CRUD (8 endpoints)
- Auth routes (4 endpoints)
- API key routes (9 endpoints)
- Health/metrics routes (5 endpoints)
- MCP transport layer (working, not broken)
- CLI memory commands (working)

### Category B — Storage/transport only, needs enhancement

- `topic_create` / `topic_list` MCP tools (stub — backend routes missing)
- `apikey_create` / `apikey_list` MCP tools (stub — backend route exists but MCP layer returns error)
- Dual `/memory`+`/memories` mount (normalization needed)

### Category C — Missing entirely, must build

- All topic routes (6 routes)
- All analytics/intelligence routes (7 routes)
- Context compilation routes (2 routes)
- Profile routes (3 routes)
- Conclusions routes (2 routes)
- Reasoning queue/flush routes (2 routes)
- Participant view routes (1 route)
- All context-engine SDK methods (7+ methods)
- All context-engine MCP tools (6 tools)

---

## 8. Phase-0 Actions (must complete before Phase 1)

- [x] Audit complete — this document
- [ ] Mount topic router: `POST/GET/PUT/DELETE /api/v1/topics`, `GET /api/v1/topics/:id/memories`, `GET /api/v1/topics/hierarchy`
- [ ] Normalize dual-memory-mount to single base path
- [ ] Standardize SDK response envelope (feature-flag `ENABLE_UNIFIED_ENVELOPE`)
- [ ] Wire `apikey_create`/`apikey_list` MCP stubs to real backend routes
- [ ] Create migration: `memory_inference_jobs`, `memory_inference_batches`, `memory_inferred_conclusions`, `memory_profiles`, `memory_profile_versions`, `memory_profile_conflicts`, `memory_context_views` (additive, no existing table splits)

---

## 9. Upgrade Roadmap (running)

| Phase | Item | Status |
|-------|------|--------|
| 0 | Audit (this document) | ✅ DONE |
| 0 | Mount topic router | BLOCKED — must do before Phase 1 |
| 0 | Normalize dual memory mount | BLOCKED — must do before Phase 1 |
| 0 | Standardize SDK envelope | BLOCKED — must do before Phase 1 |
| 0 | Wire apikey MCP stubs | BLOCKED — must do before Phase 1 |
| 0 | Design additive inference migrations | BLOCKED — must do before Phase 1 |
| 1 | Reasoning pipeline spec + implementation | PENDING |
| 2 | Living memory profile spec + implementation | PENDING |
| 3 | /context endpoint spec + implementation | PENDING |
| 4 | Batching + queue spec + implementation | PENDING |
| 5 | Participant-view layer spec + implementation | PENDING |
| 6 | SDK + MCP + CLI integration | PENDING |

**Decision record DR-001:** Topics are confirmed as the highest-priority gap. The SDK has full topic CRUD but zero topic routes exist on the server. This is a prerequisite for the context engine because topic hierarchies are used in context bundle assembly. Topics must be the first thing mounted.

**Decision record DR-002:** Route normalization takes priority over new route addition. Adding context-engine routes on top of the current dual-mount + envelope-drift situation would compound existing problems. Phase 0 fixes must ship with Phase 1 or before.

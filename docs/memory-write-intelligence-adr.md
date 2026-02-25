# Memory Write Intelligence — Architecture Decision

## Problem Statement

Two distinct failures in the current memory write path:

### Failure 1: Session Flooding (Create vs Update)
Agents (Codex, Claude, Cursor) call `create_memory` for every task action instead of
`update_memory` on an existing session entry. Result: 331 memories, 8 entries for a
single CLI auth fix session, 0 updates in last 24h.

### Failure 2: Weak Content → Weak Embeddings
64 memories have very short content. Thin writes produce poor Voyage-4 embeddings,
degrading vector search precision. The enrichment middleware draft addresses this.

### Failure 3: Tag Entropy
393 unique tags across 331 entries. No normalization. `auth`, `auth-fix`,
`authentication`, `auth-gateway` all mean overlapping things.

---

## Architecture Options

### Option A: Client-Side Only (Agent Prompt Instructions)

```
Agent Prompt: "Search before you write. Update if exists, create if new."
```

**Where it runs**: In the agent's system prompt / project instructions
**What it solves**: Session flooding (if agents comply)
**What it doesn't solve**: Tag entropy, content quality, non-compliant agents

| Pro | Con |
|-----|-----|
| Zero backend changes | Agents don't reliably follow instructions |
| No latency added | Every new agent needs the prompt |
| Agent can make nuanced decisions | Codex proved this doesn't work consistently |
| Free (no LLM cost) | No enforcement — honor system only |

**Verdict**: Necessary but insufficient. Keep as a layer, but don't rely on it alone.

---

### Option B: Backend Middleware — Smart Write Gate

Add a dedup + enrichment layer in the server write path that intercepts ALL memory
creates, regardless of which client sent them.

```
CLIENT (any)
  │
  ▼
POST /api/v1/memories (create)
  │
  ▼
┌─────────────────────────────────────────────────┐
│ WRITE INTELLIGENCE MIDDLEWARE                    │
│                                                 │
│ 1. Schema Validation        (existing)          │
│ 2. Injection Filter         (existing)          │
│ 3. ★ Similarity Gate (NEW)                      │
│    → Search user's recent memories (7d window)  │
│    → If similarity > 0.88 found:                │
│       • REDIRECT to update_memory(existing_id)  │
│       • Merge new content into existing          │
│       • Return 200 + { action: "merged",        │
│         merged_into: existing_id }              │
│    → If no match: proceed to create             │
│ 4. ★ Content Density Gate (NEW - enrichment)    │
│    → Reject if content < 80 chars               │
│    → Route thin content to LLM Reconstructor    │
│ 5. ★ Tag Normalizer (NEW)                       │
│    → Map synonyms: auth-fix → auth              │
│    → Enforce minimum 3 tags                     │
│    → Auto-suggest from content if < 3 provided  │
│ 6. ★ LLM Reconstructor (conditional)            │
│    → Only fires on density gate failure          │
│    → Structures content per Semantic Template    │
│    → Preserves original in metadata              │
│ 7. Post-reconstruction Validation               │
│ 8. Voyage-4 Embedding Generation  (existing)    │
│ 9. pgvector Storage               (existing)    │
└─────────────────────────────────────────────────┘
```

**Where it runs**: Memory API server (onasis-core or memory service)
**What it solves**: ALL three failures — flooding, quality, tags
**Works for**: Every client — MCP, CLI, SDK, API, future agents

| Pro | Con |
|-----|-----|
| Enforced for ALL clients | Adds write latency (~200-500ms for similarity search) |
| Agents don't need to be smart | LLM calls add cost (~$0.001-0.005 per enrichment) |
| Tag normalization is automatic | Similarity threshold tuning needed (false merges risk) |
| Solves flooding permanently | More complex backend to maintain |
| Backward compatible (same API) | Merge logic needs careful design |

**Verdict**: This is the correct long-term solution. Solves it at the source.

---

### Option C: Hybrid Endpoint — `smart-write`

New endpoint alongside existing create:

```
POST /api/v1/memories/smart-write
{
  "title": "...",
  "content": "...",
  "type": "project",
  "tags": ["auth", "cli"],
  "session_hint": "2026-02-21-cli-auth",  // optional continuity hint
  "intent": "continue"                     // "new" | "continue" | "auto"
}
```

Backend decides create vs update based on intent + similarity search.
Returns `{ action: "created" | "merged", id: "..." }`.

**Where it runs**: New API endpoint, backend intelligence
**What it solves**: Flooding (with explicit client cooperation), quality (via enrichment)

| Pro | Con |
|-----|-----|
| Explicit client intent signal | Requires client changes (new endpoint) |
| Session hints improve accuracy | Two code paths to maintain (create + smart-write) |
| Backward compatible (old create still works) | Agents using old create still flood |
| Can be adopted incrementally | Doesn't solve the problem for non-upgraded clients |

**Verdict**: Good stepping stone, but doesn't solve it for existing clients.

---

### Option D: Backend + LLM Merge Intelligence

Extend Option B with LLM-powered content merging (not just redirect):

```
When similarity > 0.88:
  1. Fetch existing memory content
  2. Send to LLM: "Merge these two entries into one coherent summary.
     Preserve all unique information. Remove redundancy."
  3. Update existing entry with merged content
  4. Re-embed the merged content
  5. Return { action: "merged", id: existing_id }
```

| Pro | Con |
|-----|-----|
| Intelligent merging, not just append | Higher LLM cost per merge (~$0.01-0.03) |
| Handles overlapping content gracefully | Latency: 1-3s for LLM merge |
| Produces cleaner entries over time | Risk of LLM dropping important details |
| Self-healing memory bank | More complex error handling |

**Verdict**: Best quality outcome, but cost/latency may not justify for every write.

---

## Recommended Architecture: Option B + Selective D

### Core: Backend Middleware (Option B) — always runs
- Similarity Gate: fast vector search, ~200ms
- Content Density Gate: character count check, ~0ms
- Tag Normalizer: lookup table + LLM fallback, ~50ms
- Total added latency for clean writes: ~250ms

### Conditional: LLM Intelligence (Option D) — only when needed
- LLM Reconstructor: only for thin content (< 80 chars) — estimated 15-25% of writes
- LLM Merge: only for high-similarity matches (> 0.88) — estimated 10-20% of writes
- Skip LLM entirely for clean, unique, dense writes — estimated 60-75% of writes

### Always: Client Prompt (Option A) — defense in depth
- Agents still instructed to search before write
- Reduces the number of writes that hit the similarity gate
- Falls back gracefully when agents don't comply

```
COST ESTIMATE (per 1000 memory writes):
├── 650 clean writes: $0 LLM cost (middleware only, ~250ms each)
├── 200 thin content: ~$0.20-0.50 (reconstructor, ~800ms each)
├── 150 merge candidates: ~$1.50-3.00 (merge + re-embed, ~2s each)
└── Total: ~$1.70-3.50 per 1000 writes
    At current rate (~8/day): ~$0.01-0.03/day
```

---

## Re-embedding Triggers

When should existing embeddings be regenerated?

### Trigger on:
1. **Content update** (any update_memory with changed content) — always re-embed
2. **LLM merge** (similarity gate merged new content into existing) — always re-embed
3. **Tag normalization change** (if tags are included in embedding input) — re-embed
4. **Enrichment reconstruction** (thin content expanded) — re-embed (already new content)

### Do NOT trigger on:
1. Metadata-only updates (access_count, last_accessed)
2. Tag additions that don't change content
3. Title-only changes (unless title is part of embedding input)

### Batch re-embedding (maintenance):
- Monthly job: find entries with outdated embeddings (model version changed,
  or content updated but embedding not regenerated)
- Use `intelligence_detect_duplicates` to find and merge near-dupes
- Re-embed merged entries

---

## Implementation Priority

### Phase 1 — Quick Wins (this week)
1. Tag normalization lookup table (config, no LLM needed)
2. Content density gate (reject/warn on < 80 chars)
3. Similarity gate on create (search + redirect to update)
4. Updated agent prompts (the guide we already drafted)

### Phase 2 — LLM Intelligence (next sprint)
5. LLM Reconstructor for thin content
6. LLM Merge for high-similarity entries
7. Auto-tag suggestion from content

### Phase 3 — Self-Healing (ongoing)
8. Scheduled duplicate detection + merge job
9. Tag consolidation migration
10. Re-embedding pipeline for stale entries
11. Memory health dashboard / alerting

---

## Tag Normalization Map (starter)

```json
{
  "synonyms": {
    "auth": ["authentication", "auth-fix", "auth-chain", "auth-gateway", "oauth", "requireAuth"],
    "cli": ["lanonasis-cli", "cli-fix"],
    "supabase": ["supabase-db", "supabase-migration"],
    "mcp": ["mcp-server", "enterprise-mcp", "vortex-mcp"],
    "database": ["db", "sql", "postgres", "pgvector"],
    "testing": ["test", "e2e", "unit-test", "test-suite"],
    "deployment": ["release", "deploy", "ci-cd"],
    "search": ["vector-search", "semantic-search", "search_memories_voyage"]
  },
  "rules": {
    "normalize_to_primary": true,
    "preserve_specific_as_secondary": true,
    "max_tags_per_entry": 8,
    "min_tags_per_entry": 3
  }
}
```

With `preserve_specific_as_secondary: true`:
- Input tags: `["auth-fix", "oauth", "cli"]`
- Normalized: `["auth", "oauth", "cli"]` (auth-fix → auth, oauth kept as specific variant)

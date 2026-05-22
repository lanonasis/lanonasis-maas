# Memory Service Enhancement — Context Pipeline Patterns

**Created:** 2026-05-19  
**Status:** Brainstorm — Ready for Pipeline Injection  
**Scope:** Cross-session memory capture, recall, and enrichment improvements

---

## Overview

This document captures patterns and improvements identified through a brainstorming session on memory service architecture. The goal is to enhance cross-session semantic memory capabilities without disrupting active development streams. All items are **non-invasive** — they augment existing behavior rather than replacing it.

---

## Pattern 1: Pluggable Format Adapters

### What It Does

Separates format detection and parsing from the core extraction logic. Instead of hardcoding support for one agent format, the service becomes format-agnostic and can detect and parse multiple input formats through a shared interface.

### Runtime Behavior

```
Agent produces session transcript
    ↓
Format detector inspects first JSONL line
    ↓
Matched against registered FormatAdapters
    ├─ Adapter A: claude-code format → matched
    ├─ Adapter B: openclaw format → no match
    └─ Adapter C: pi-agent format → no match (extensible for future)
    ↓
Selected adapter.extract() → ExtractionRecord[]
    ↓
Remaining pipeline: shouldCapture → redact → enrich → store
```

### Expected Behavior

| Scenario | Result |
|----------|--------|
| Claude Code session | Parse via claudeCodeAdapter |
| OpenClaw session | Parse via openclawCacheAdapter |
| Unknown format | Skip gracefully, log warning, continue |
| Malformed JSONL line | Skip line, increment errors, continue processing |

### Implementation Notes

- No changes to hooks required
- Format adapters registered at module load
- Existing JSONL parser becomes the default/fallback adapter
- New adapters added via `addFormatAdapter(adapter)` function

### Success Criteria

- [ ] Existing Claude Code sessions parse identically
- [ ] New adapter can be added without modifying core extraction
- [ ] Unknown formats logged but don't crash the pipeline

---

## Pattern 2: Vector-Based Semantic Deduplication

### What It Does

Before storing a memory, perform a semantic similarity search against existing memories. If a memory with >0.92 similarity already exists, skip the store operation to avoid duplicate memories.

### Runtime Behavior

```
Memory prepared for storage
    ↓
Build query from memory content (first 200 chars)
    ↓
searchMemories({ query, threshold: 0.92, limit: 1 })
    ↓
├─ Results found → similar memory exists → SKIP store
└─ No results → proceed to createMemory()
```

### Expected Behavior

| Scenario | Result |
|----------|--------|
| Exact duplicate content | Skipped (idempotency key handles this) |
| Same decision, different phrasing | Skipped via vector similarity |
| Similar but different topic | Stored (similarity < 0.92) |
| Search API unavailable | Proceed with store (fail-open) |

### Implementation Notes

- Similarity threshold configurable (default 0.92)
- Uses existing MaaS search API — no new infrastructure
- Fail-open: if search fails, proceed with store rather than blocking
- Idempotency key still used as primary dedup (vector dedup is secondary)

### Success Criteria

- [ ] Duplicate decisions not re-stored
- [ ] Fail-open behavior doesn't block new memories
- [ ] Performance: search adds <500ms to store operation

---

## Pattern 3: Tiered Recall Search

### What It Does

On recall, try multiple query formulations before returning empty. Fall through queries from specific to general until results are found.

### Runtime Behavior

```
Recall triggered with user input
    ↓
Build query variants
    ├─ Tier 1: [original user input]
    ├─ Tier 2: [project name] + [original input]
    ├─ Tier 3: [git branch] + [original input]
    └─ Tier 4: fallback to general "session context"
    ↓
For each tier (in order):
    searchMemories({ query: tier, threshold: 0.5, limit: 5 })
    ├─ Results found → return results
    └─ No results → try next tier
    ↓
No results from any tier → return empty
```

### Expected Behavior

| Scenario | Result |
|----------|--------|
| User asks about specific file they edited | Tier 2 includes project context → finds it |
| User asks about git branch work | Tier 3 includes branch name → finds it |
| User asks vague question | Tier 4 general search → finds context |
| No related memories | Returns empty (no error) |

### Implementation Notes

- Search threshold lowered to 0.5 for recall (vs 0.92 for dedup)
- Timeout: 5 seconds max across all tiers
- Only user input is searched — not full transcript
- Project name extracted from CWD basename

### Success Criteria

- [ ] Recall succeeds more often on first attempt
- [ ] No increased latency visible to agent (>5s hard timeout)
- [ ] Empty recall doesn't break agent flow

---

## Pattern 4: Mid-Session Decision Capture

### What It Does

Capture user decisions and corrections as they happen, not just at session end. Detects decision patterns in user messages and writes them to spool immediately.

### Runtime Behavior

```
User sends message
    ↓
UserPromptSubmit hook fires
    ↓
Check against decision patterns:
    ├─ /don't do that again/i
    ├─ /use approach [A-Z]/i
    ├─ /remember that/i
    ├─ /I prefer/i
    ├─ /I always/i, /I never/i
    └─ [configurable additional patterns]
    ↓
├─ No match → no-op, continue normally
└─ Match found → write to spool immediately, tag as "personal"
    ↓
Optional: immediate MaaS store if API available
```

### Expected Behavior

| Scenario | Result |
|----------|--------|
| User says "don't do that again" | Captured immediately |
| User says "use approach B instead" | Captured immediately |
| User says "remember X is Y" | Captured immediately |
| Regular conversation | No capture, no overhead |
| API unavailable | Written to spool for later drain |

### Implementation Notes

- Patterns configurable via environment variable
- Uses existing spool infrastructure
- No changes to Stop/PreCompact hooks
- Low priority: if spool write fails, continue without blocking user

### Success Criteria

- [ ] User corrections captured before session ends
- [ ] No false positives on regular conversation
- [ ] Spool drain includes mid-session captures

---

## Pattern 5: Local Markdown Fallback

### What It Does

Write memories to a local markdown file alongside the spool JSONL, creating human-readable backup that works offline.

### Runtime Behavior

```
Memory prepared for storage
    ↓
┌─ Primary: createMemory() via MaaS API
│       ↓
│   ├─ Success → done
│   └─ Failure → write to spool
└─ Secondary (optional local fallback):
    append to memories-{YYYY-MM-DD}.md
    ↓
Markdown entry format:
    ## {title (first 80 chars)}

    {content}

    *{type}* | {tags}
    ──────────────────────
    captured: {timestamp}
```

### Expected Behavior

| Scenario | Result |
|----------|--------|
| MaaS API available | Memory stored to cloud, markdown updated |
| MaaS API down | Memory written to spool AND markdown |
| Offline session | Markdown accumulates, syncs on reconnect |
| Markdown file exists | Entry appended |
| Markdown file doesn't exist | Created automatically |

### Implementation Notes

- Markdown path configurable: `MEMORY_FALLBACK_DIR`
- One file per day, rotated daily
- No changes to existing hooks
- Optional feature (enabled by env var)

### Success Criteria

- [ ] Markdown file created in correct location
- [ ] Entries readable by human
- [ ] Offline scenarios preserved in markdown

---

## Pattern 6: Recall-Time Prompt Injection Filter

### What It Does

Double-check memories for prompt injection patterns at recall time (before injecting into agent context), not just at capture time.

### Runtime Behavior

```
Memories retrieved from MaaS search
    ↓
Filter: looksLikePromptInjection(m.content)
    ├─ Clean memory → proceed
    └─ Injection detected → skip, don't inject
    ↓
If all memories filtered out → return empty
If some memories filtered → return remaining
    ↓
Format and inject into context
```

### Expected Behavior

| Scenario | Result |
|----------|--------|
| Normal memory | Injected into context |
| Injection attempt in memory | Filtered out, not injected |
| All memories are injections | Empty recall (safe) |
| Mixed clean/injection | Only clean memories injected |

### Implementation Notes

- Uses existing `looksLikePromptInjection()` function
- Runs at recall time, not capture time (defense in depth)
- Log filtered memories for audit trail
- No changes to capture pipeline

### Success Criteria

- [ ] Injection attempts never reach agent context
- [ ] Legitimate memories still injected
- [ ] Audit log captures filtered items

---

## Pattern 7: Session Continuity Snapshots

### What It Does

Before a context compaction event, write a snapshot of current session state that the next session can restore from.

### Runtime Behavior

```
PreCompact hook fires
    ↓
Build session snapshot:
    ├─ Project context (CWD, git branch, recent files)
    ├─ Active tasks (from current conversation)
    ├─ User preferences mentioned in session
    └─ Last tool call and result
    ↓
Write snapshot to: ~/.memory/snapshots/{session_id}.json
    ↓
On next session start (PreToolUse first call):
    Check for recent snapshot
    ├─ Snapshot exists → inject summary into context
    └─ No snapshot → continue normally
    ↓
After injection → delete snapshot (one-time use)
```

### Expected Behavior

| Scenario | Result |
|----------|--------|
| Agent context about to compact | Snapshot written |
| Next session starts | Snapshot found and injected |
| Agent resumes work | Context restored from snapshot |
| No prior session | Normal session start |

### Implementation Notes

- Snapshot expires after 24 hours (cleanup on startup)
- Stored locally, not sent to MaaS
- Size limit: snapshot capped at 4KB
- Does not include full transcript — only summary

### Success Criteria

- [ ] Agent can resume after compaction
- [ ] Snapshot cleans up after use
- [ ] No sensitive data in snapshots

---

## Pattern 8: Local FTS5 Search for Spool

### What It Does

Index spool entries locally using SQLite FTS5 so that recall can work offline without calling MaaS API.

### Runtime Behavior

```
Memory written to spool
    ↓
┌─ Write JSONL entry to spool (existing behavior)
└─ Also: index content in local FTS5 database
    ↓
Recall triggered:
    ┌─ If MaaS API available:
    │   Use MaaS search (existing behavior)
    └─ If MaaS API unavailable:
        Use local FTS5 search
        ├─ query: BM25 ranked
        ├─ limit: 5 results
        └─ return formatted as memory objects
    ↓
Merge results (dedup if MaaS returned)
```

### Expected Behavior

| Scenario | Result |
|----------|--------|
| MaaS available | Cloud search used |
| MaaS down | Local FTS5 search used |
| Offline entire session | Spool recalled via FTS5 |
| MaaS comes back mid-session | Switch back to cloud |

### Implementation Notes

- FTS5 database: `~/.memory/search.db`
- Schema: memories(content, type, tags, timestamp, source)
- BM25 ranking via SQLite FTS5 MATCH query
- No changes to capture pipeline

### Success Criteria

- [ ] Recall works offline
- [ ] FTS5 search returns relevant results
- [ ] Offline and online results merge without duplicates

---

## Pattern 9: Privacy Sanitization at Injection Time

### What It Does

Sanitize recalled content before injecting into agent context — not just at capture time. Prevents any secrets that slipped through capture from reaching the agent.

### Runtime Behavior

```
Memory retrieved from MaaS or FTS5
    ↓
Run sanitization pipeline:
    ├─ Remove API key patterns (sk-, lano_, ghp_, etc.)
    ├─ Remove Bearer token patterns
    ├─ Remove .env style KEY=VALUE lines
    └─ Replace matches with [REDACTED]
    ↓
Check result against injection patterns
    ├─ Clean → format and inject
    └─ Suspicious → log, skip, don't inject
```

### Expected Behavior

| Scenario | Result |
|----------|--------|
| Memory with clean content | Injected normally |
| Memory with API key | Key redacted, content injected |
| Memory with suspicious injection | Skipped entirely |
| Redaction results in empty content | Skip memory |

### Implementation Notes

- Uses existing `redactSecrets()` function
- Additional check at injection time (defense in depth)
- Log redactions for audit
- No changes to capture-time redaction

### Success Criteria

- [ ] API keys never appear in agent context
- [ ] Suspicious content never injected
- [ ] Audit log captures all redactions

---

## Pattern 10: Think-in-Code Paradigm Enforcement

### What It Does

When the service needs to analyze data (count memories, aggregate stats, find patterns), it should emit structured data rather than freeform text. This aligns with the broader agent paradigm of "program the analysis, don't compute mentally."

### Runtime Behavior

```
Service internal analysis task (count, aggregate, filter)
    ↓
┌─ Old approach: read multiple entries, compute in head, write result
└─ New approach: emit structured JSON to internal buffer
    ↓
Analysis functions output:
    {
      "type": "analysis",
      "operation": "count_by_type",
      "result": { "knowledge": 5, "project": 2, "personal": 1 },
      "metadata": { "scope": "spool", "count": 8 }
    }
    ↓
Only final structured output enters service state
Raw data stays in analysis buffer
```

### Expected Behavior

| Scenario | Result |
|----------|--------|
| Counting memories by type | Structured JSON, no mental counting |
| Aggregating tags | Tag counts in object |
| Finding patterns | Pattern matches in array |
| Any analysis > 100 items | Always uses code, never manual |

### Implementation Notes

- Applies to internal service operations
- Does not affect memory content format
- Uses existing analysis functions
- Logging output still human-readable

### Success Criteria

- [ ] Analysis functions emit structured data
- [ ] Internal stats accurate
- [ ] No manual computation in service code

---

## Pattern 11: User Controls and Feature Flags

### What It Does

Exposes configurable controls to users so they can enable, disable, or tune specific service behaviors without code changes. Acts as a single config layer that maps user intents to feature flags.

### Runtime Behavior

```
Service starts
    ↓
Load user controls from environment/config
    ↓
Apply controls to service behavior:
    ├─ OVERRIDE_MAX_CONTENT_SIZE: reject | chunk | warn
    ├─ ENABLE_DECISION_CAPTURE: true | false
    ├─ ENABLE_MID_SESSION_CAPTURE: true | false
    ├─ RECALL_THRESHOLD: 0.0 - 1.0
    ├─ MAX_MEMORIES_PER_SESSION: 1-10
    ├─ ENABLE_LOCAL_FTS5: true | false
    └─ [future: additional controls]
    ↓
Controls applied at module initialization
Runtime changes require service restart (or hot reload)
```

### Expected Behavior

| Control | Options | Default | Effect |
|---------|---------|---------|--------|
| `MEMORY_OVERRIDE_MAX_CONTENT_SIZE` | `reject` \| `chunk` \| `warn` | `chunk` | Behavior when content exceeds limit |
| `MEMORY_ENABLE_DECISION_CAPTURE` | `true` \| `false` | `true` | Enable/disable decision chain extraction |
| `MEMORY_ENABLE_MID_SESSION_CAPTURE` | `true` \| `false` | `false` | Enable/disable mid-session capture |
| `MEMORY_RECALL_THRESHOLD` | `0.0-1.0` | `0.5` | Search similarity threshold |
| `MEMORY_MAX_MEMORIES_PER_SESSION` | `1-10` | `5` | Cap on memories extracted per session |
| `MEMORY_ENABLE_LOCAL_FTS5` | `true` \| `false` | `false` | Enable local FTS5 offline search |
| `MEMORY_ENABLE_REJECTION_LOGGING` | `true` \| `false` | `true` | Log rejection reasons to audit |

### Implementation Notes

- Controls loaded from env vars with `MEMORY_` prefix
- Can also be loaded from config file (`~/.memory/config.json`)
- All controls documented with examples
- Defaults chosen to match current behavior (no breaking changes)
- Controls printed to stderr on startup for debugging

### Success Criteria

- [ ] All behaviors controllable via env vars
- [ ] Default behavior unchanged
- [ ] CLI can display current controls: `memory config show`

---

## Pattern 12: Oversized Content Handling

### What It Does

Defines behavior when a memory exceeds the maximum allowed content size. Provides three modes: reject the oversized memory, chunk it into smaller pieces, or warn but accept anyway.

### Runtime Behavior

```
Memory prepared for storage
    ↓
Check content length vs MAX_CONTENT_SIZE (default: 4000 chars)
    ↓
├─ Under limit → store normally
└─ Over limit → check OVERRIDE_MAX_CONTENT_SIZE setting
    ├─ `reject` → skip memory, log rejection, return
    ├─ `chunk` → split into max-sized chunks, store each as separate memory
    └─ `warn` → store with warning flag, log warning
    ↓
Chunk strategy (if chunk mode):
    ├─ Split on sentence boundary (。！？.!?)
    ├─ Each chunk ≤ MAX_CONTENT_SIZE
    └─ Chunks tagged with `chunk_index` and `chunk_total`
```

### Expected Behavior

| Scenario | `reject` | `chunk` | `warn` |
|----------|----------|---------|--------|
| 5000-char decision | Skipped | Stored as 2 chunks | Stored with warning |
| 12000-char transcript summary | Skipped | Stored as 3 chunks | Stored with warning |
| 500-char memory | Stored normally | Stored normally | Stored normally |

### Implementation Notes

- MAX_CONTENT_SIZE configurable (default 4000 chars)
- Chunk mode preserves meaning — splits on sentence boundaries, not arbitrary cuts
- Chunk index metadata allows reconstruction
- Rejection logged with reason for audit

### Success Criteria

- [ ] Oversized content handled per user preference
- [ ] Chunk mode preserves readability
- [ ] Rejected content logged with reason

---

## Pattern 13: Rejection Reason Logging

### What It Does

Logs the specific reason why a memory was rejected, filtered, or chunked. Creates an audit trail that helps users understand what the service is doing and why.

### Runtime Behavior

```
Memory decision point reached
    ↓
Determine rejection/filter reason:
    ├─ `SIZE_EXCEEDED`: content > MAX_CONTENT_SIZE (reject mode)
    ├─ `SEMANTIC_DUPLICATE`: similarity > 0.92 to existing
    ├─ `INJECTION_DETECTED`: looksLikePromptInjection() returned true
    ├─ `NO_DECISION_CHAIN`: extractDecisionChains() returned empty
    ├─ `CAPTURE_FILTER_FAILED`: shouldCapture() returned false
    ├─ `TOO_SHORT`: content < minLength (10 chars standard, 30 strict)
    ├─ `TYPE_UNKNOWN`: detectMemoryType() returned default with low confidence
    └─ `API_ERROR`: createMemory() failed
    ↓
Write to rejection log (~/.memory/logs/rejections-{YYYY-MM}.jsonl)
    ↓
Log entry format:
    {
      "timestamp": "ISO8601",
      "session_id": "...",
      "reason": "SIZE_EXCEEDED",
      "content_preview": "first 100 chars...",
      "metadata": { ... }
    }
```

### Expected Behavior

| Scenario | Logged | Log Detail |
|----------|--------|------------|
| 5000-char memory rejected | ✅ | reason: SIZE_EXCEEDED, limit: 4000, actual: 5000 |
| Duplicate decision skipped | ✅ | reason: SEMANTIC_DUPLICATE, match_id: "..." |
| Injection attempt filtered | ✅ | reason: INJECTION_DETECTED, pattern: "..." |
| Clean memory stored | ❌ | No log (success case) |

### Implementation Notes

- Logs stored in `~/.memory/logs/rejections-{YYYY-MM}.jsonl`
- One file per month, rotated automatically
- Content preview capped at 100 chars for privacy
- Logs consumable by `memory rejections` CLI command
- Can be disabled via `MEMORY_ENABLE_REJECTION_LOGGING=false`

### Success Criteria

- [ ] Every rejected memory has a logged reason
- [ ] Logs parseable for analytics
- [ ] CLI can display recent rejections: `memory rejections --last 10`

---

## Pattern 14: Session Index Linking PreCompact Runs

### What It Does

Maintains a persistent index that links all PreCompact events across sessions. Allows the service to track when compaction occurred, what was captured, and how sessions relate to each other.

### Runtime Behavior

```
PreCompact hook fires
    ↓
Build index entry:
    ├─ session_id (current session)
    ├─ timestamp
    ├─ captured_memory_ids (IDs of memories stored this run)
    ├─ session_duration
    ├─ memory_count
    └─ prior_session_id (link to previous session if contiguous)
    ↓
Write to session index (~/.memory/session-index.jsonl)
    ↓
Session index entry:
    {
      "session_id": "abc-123",
      "timestamp": "2026-05-19T14:27:00Z",
      "prior_session_id": "xyz-789",
      "duration_seconds": 2700,
      "memories_captured": 3,
      "memory_ids": ["mem_1", "mem_2", "mem_3"],
      "trigger": "PreCompact"
    }
    ↓
On recall, if session continuity enabled:
    Look up prior_session_id chain
    Inject context: "You were working on project X in session xyz-789"
```

### Expected Behavior

| Scenario | Result |
|----------|--------|
| PreCompact fires | Session index entry written |
| Next session starts | Index checked for prior_session_id |
| Session chain exists | Inject brief context about prior work |
| No prior session | Continue normally |

### Implementation Notes

- Index stored in `~/.memory/session-index.jsonl`
- One entry per PreCompact run
- `prior_session_id` links form a chain for context continuity
- Privacy: index entries are lightweight, no transcript content
- Retention: index entries expire after 90 days

### Success Criteria

- [ ] Every PreCompact run creates an index entry
- [ ] Session chain links traceable via prior_session_id
- [ ] CLI can show session history: `memory sessions --last 5`

---

## Pattern 15: Unified CLI Control Surface

### What It Does

Provides a single CLI entry point (`memory` or `lanonasis-memory`) that surfaces all controls, logs, and status information in a consistent interface.

### Runtime Behavior

```
User runs: memory <command> [options]
    ↓
Command router:
    ├─ `memory config show` → display current controls
    ├─ `memory config set KEY VALUE` → update a control
    ├─ `memory status` → service health, memory count
    ├─ `memory rejections --last N` → show recent rejections
    ├─ `memory sessions --last N` → show session index
    ├─ `memory spool` → show pending spool entries
    ├─ `memory search <query>` → semantic search
    └─ `memory list` → show recent memories
```

### CLI Commands Surface

| Command | What It Shows |
|---------|---------------|
| `memory config show` | All current control values |
| `memory config set KEY VALUE` | Update a control (requires restart) |
| `memory status` | Connected/disconnected, memory count, spool depth |
| `memory rejections --last 10` | 10 most recent rejections with reasons |
| `memory sessions --last 5` | 5 most recent sessions with PreCompact links |
| `memory spool` | Contents of pending spool |
| `memory search "query"` | Search memories |
| `memory list` | List recent memories |

### Implementation Notes

- Single binary, commands are subcommands
- Consistent `--json` flag for machine-readable output
- `--help` on every command
- No breaking changes to existing commands

### Success Criteria

- [ ] All patterns accessible via CLI
- [ ] Human-readable and machine-readable output
- [ ] Commands don't require agent restart to query

---

## Implementation Phases

### Phase 1: Low-Risk, High-Value (Start Here)
1. **Pattern 6: Recall-Time Filter** — Already exists, verify it fires
2. **Pattern 3: Tiered Recall** — Improves recall without changing capture
3. **Pattern 5: Local Markdown** — Offline backup, no agent impact

### Phase 2: Mid-Risk, Mid-Value
4. **Pattern 2: Vector Dedup** — Secondary dedup, fail-open
5. **Pattern 1: Format Adapters** — Extensible, backward-compatible
6. **Pattern 9: Privacy at Injection** — Defense in depth

### Phase 3: Higher-Risk, Future-Value
7. **Pattern 4: Mid-Session Capture** — New hook behavior
8. **Pattern 7: Snapshots** — Requires PreCompact coordination
9. **Pattern 8: Local FTS5** — Infrastructure change
10. **Pattern 10: Think-in-Code** — Internal refactor

### Phase 4: User-Facing Controls
11. **Pattern 11: User Controls** — Feature flags for all behaviors
12. **Pattern 12: Oversized Handling** — reject/chunk/warn modes
13. **Pattern 13: Rejection Logging** — Audit trail for why memories rejected
14. **Pattern 14: Session Index** — Link PreCompact runs across sessions
15. **Pattern 15: Unified CLI** — Single control surface for all features

---

## Rollout Guidance

- All patterns are **opt-in** via environment variables
- Default behavior unchanged — existing users unaffected
- Each pattern includes feature flag for gradual enable
- Monitoring: track recall success rate, storage dedup rate
- No breaking changes to existing APIs or hooks

---

## Open Questions

1. Should Pattern 7 (snapshots) include encrypted sensitive fields?
2. What is the max spool size before cleanup triggers?
3. Should Pattern 4 (mid-session capture) respect a do-not-capture flag?
4. For Pattern 8 (FTS5), should we index on first write or lazily on first search?
5. Should Pattern 12 (chunking) preserve semantic boundaries or use hard cuts?
6. Should Pattern 14 (session index) include memory type breakdown per session?

---

*Document status: Ready for pipeline injection — last updated 2026-05-19*
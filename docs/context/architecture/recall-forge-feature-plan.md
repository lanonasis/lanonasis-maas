# RecallForge Feature Development Plan

**Status:** Planning
**Date:** 2026-07-06
**Author:** Gap Analysis vs. Memory-Mechanism Best Practices + LanOnasis Architecture Docs
**Related:**
- `docs/context/architecture/capture-event-ontology.md` — Phase A↔B Bridge Spec (episodic events)
- `docs/context/VISION-CONTINUITY-INTELLIGENCE.md` — Product vision and build sequence
- `packages/recall-forge/` — Existing implementation

---

## Executive Summary

Comparing RecallForge's current implementation against:
1. The memory-mechanism best practices documentation (Claude Code's memory architecture guide)
2. LanOnasis's own `capture-event-ontology.md` (episodic event layer)
3. LanOnasis's `VISION-CONTINUITY-INTELLIGENCE.md` (product direction)

**Finding:** 4 gaps are already addressed by existing spec documents. 5 gaps require new implementation work.

| Gap | Covered By | Implementation Required |
|-----|------------|------------------------|
| #1 Episodic Memory | `capture-event-ontology.md` | Yes — implement the 7 event types |
| #2 Procedural Memory | VISION (partial) | Yes — add workflow template schema |
| #3 Memory Consolidation | `event:abandon` (partial) | Yes — add lifecycle management |
| #4 Layered Scoping (5 tiers) | Not covered | Yes — new namespace model |
| #5 Instruction vs. Learning | Not covered | Yes — add `memory_origin` field |
| #6 File Size Management | Not covered | Yes — priority and size constraints |
| #7 Rule Packages | Not covered | Yes — add import/share mechanism |
| #8 Hybrid Retrieval | Convergence (partial) | Yes — add keyword/bm25 option |
| #9 Memory Provenance | Not covered | Yes — add versioning/audit trail |

---

## Gap #1: Episodic Memory Layer

### Status: SPEC EXISTING — IMPLEMENTATION NEEDED

**Spec location:** `docs/context/architecture/capture-event-ontology.md`

The capture-event-ontology.md already defines the episodic layer as **7 event types** tagged with `event:<type>`:

| Event Type | Description | Capture Trigger |
|------------|-------------|-----------------|
| `event:decision` | Explicit choice between alternatives with rationale | Pattern: "we'll go with...", "decided to..." |
| `event:frustration` | Friction signal — blockers, repeated failures | 3+ similar errors or explicit vent |
| `event:surprise` | Unexpected finding that shifted mental model | Explicit `/memory save --event=surprise` or AI Router |
| `event:revisit` | Topic returned to after 7+ day gap | Auto: cosine similarity ≥ 0.82 to existing memory |
| `event:abandon` | Thread dropped without resolution | Manual tag (not auto — v0 decision) |
| `event:commitment` | Stated intent to do X by Y | Pattern: "I'll...", "by Friday", "next session..." |
| `event:insight` | Synthesis moment — connecting X and Y | Explicit or AI Router at session end |

### Convergence Integration

The ontology feeds into `/context converge` with three synthesized blocks:

```
MIND:   structural patterns from decisions + insights
HEART:  emotional patterns from frustrations + abandons + revisits  
CONCIERGE: 1-3 concrete next actions tied to event IDs
```

### Implementation Requirements

- [ ] Implement rules pass in capture pipeline (decision, commitment, frustration)
- [ ] Implement AI Router classifier at session end (surprise, insight)
- [ ] Implement auto `event:revisit` detection with ≥0.82 cosine similarity
- [ ] Add `/event tag`, `/event untag`, `/memory save --event=` commands
- [ ] Store corrections with `human-corrected:true` tag as training exemplars
- [ ] Add convergence template to memory-client
- [ ] Add `LANONASIS_CAPTURE_EVENTS` and `LANONASIS_CLASSIFIER` env vars
- [ ] Implement `/context backfill --limit=N` with `backfilled:true` confidence tier

### Locked Decisions (from spec)

1. Revisit threshold: cosine similarity ≥ 0.82 (conservative — false positives worse than false negatives)
2. Classifier: rules-first + AI Router for interpretive types; `LANONASIS_CLASSIFIER=rules-only` for offline
3. Backfill: opt-in, separate `backfilled:true` confidence tier
4. `event:abandon`: NOT auto-tagged in v0 — system reflects silence, does not accuse

---

## Gap #2: Procedural Memory for Workflow Templates

### Status: NOT COVERED — NEW IMPLEMENTATION

**Spec location:** None existing

The VISION document mentions "workflows and how they evolved" as input depth, but RecallForge only captures descriptions of workflows, not reusable procedural templates.

### Current State

- `memory_type: "workflow"` exists and is auto-detected from numbered steps, arrows, "how-to" patterns
- Content is stored as plain text
- No structure for reusable step sequences

### Proposed Schema

```typescript
interface ProceduralMemory {
  id: string;
  name: string;                    // "Debug_Workflow"
  steps: string[];                 // ["read error log", "locate file", "write patch", "run tests"]
  trigger_conditions?: string[];   // ["If CI fails with exit code 1"]
  applicable_context?: string[];   // ["typescript", "jest", "CI/CD"]
  success_rate?: number;           // Track empirically
  last_used?: string;              // ISO timestamp
  use_count: number;
}
```

### Implementation Requirements

- [ ] Extend memory schema to support procedural type with structured steps
- [ ] Add workflow template creation via `/memory save --type=workflow --steps`
- [ ] Add workflow retrieval with context matching
- [ ] Track `use_count` and `last_used` on successful application
- [ ] Integrate with convergence to suggest relevant workflows

---

## Gap #3: Memory Consolidation Lifecycle

### Status: PARTIAL — NEEDS LIFECYCLE MANAGEMENT

**Spec location:** `event:abandon` (partial coverage)

Currently:
- Memories persist indefinitely
- `event:abandon` tracks threads dropped without resolution
- No explicit archival, decay, or quality scoring

### Proposed Lifecycle States

```typescript
type MemoryLifecycle = "active" | "archived" | "draft" | "deleted" | "consolidated";

// Add to existing schema:
interface MemoryWithLifecycle {
  // ... existing fields
  lifecycle: MemoryLifecycle;
  quality_score?: number;          // 0-1, affects retrieval ranking
  consolidation_reason?: string;    // Why was it consolidated
  consolidated_into?: string;       // ID of the memory it was merged into
  last_accessed?: string;          // ISO timestamp
  access_count: number;
}
```

### Consolidation Triggers

1. **Semantic merge**: Two memories with ≥0.95 similarity → prompt user to consolidate
2. **Age-based archival**: Memories not accessed in 90 days → move to archived tier
3. **Quality decay**: Low quality scores + no access → auto-archive after 180 days
4. **Staleness flag**: Memories with contradicting newer decisions → flag as stale

### Implementation Requirements

- [ ] Add lifecycle field to memory schema
- [ ] Implement quality scoring based on: access_count, revisit events, convergence mentions
- [ ] Add `/memory consolidate` command for manual merging
- [ ] Add auto-consolidation job (daily) for semantic duplicates
- [ ] Add `/memory archive` and `/memory restore` commands
- [ ] Update retrieval to exclude archived unless `--include-archived` specified

---

## Gap #4: Layered Memory Scoping (5 Tiers)

### Status: NOT COVERED — NEW IMPLEMENTATION

**Spec location:** None existing

The memory-mechanism documentation defines 5 distinct layers:

```
Organization-level → Project-level → User-level → Local-level → Role/Agent-level
```

### Current State

RecallForge has:
- Personal tier (agent-scoped)
- Shared tier (sharedNamespace)
- No other tiers

### Proposed Namespace Model

| Tier | Scope | Priority | Mutable By |
|------|-------|----------|------------|
| Organization | Team/company-wide rules | 1 (highest) | Org admins only |
| Project | Team-shared project context | 2 | Project members |
| User | Personal preferences (cross-project) | 3 | Individual user |
| Local | Machine-specific (not committed) | 4 | Local user only |
| Role | Subagent-specific rules | 5 | Subagent owner |

### Implementation Requirements

- [ ] Extend config with new namespace tiers:
  ```typescript
  interface LanonasisConfig {
    // existing:
    // sharedNamespace?: string;
    
    // new:
    organizationNamespace?: string;
    projectNamespace?: string;
    userNamespace?: string;       // cross-project, home directory
    localNamespace?: string;      // machine-specific, not committed
    roleNamespace?: string;       // subagent-specific
  }
  ```
- [ ] Implement priority-ordered retrieval across tiers
- [ ] Add tier indicators to memory metadata
- [ ] Restrict organization-tier writes based on permissions
- [ ] Support `.gitignore`-style exclusion for local namespace

---

## Gap #5: Instruction vs. Learning Memory Separation

### Status: NOT COVERED — NEW IMPLEMENTATION

**Spec location:** None existing

The memory-mechanism documentation distinguishes:
- **Instruction memory**: Human-written rules, behavioral constraints (stable, predictable)
- **Learning memory**: Agent-captured preferences, discoveries, experiences (evolving)

### Current State

RecallForge mixes both in the same storage with no origin distinction.

### Proposed Solution

```typescript
type MemoryOrigin = "instruction" | "learning" | "imported";

interface MemoryWithOrigin {
  // ... existing fields
  origin: MemoryOrigin;
  
  // For instruction memory:
  instruction_version?: string;   // Semantic version
  instruction_author?: string;    // Who wrote it
  instruction_provenance?: string; // e.g., "AGENTS.md", "team-rules.md"
  
  // For learning memory:
  learning_confidence?: number;    // 0-1, can decay over time
  learning_feedback_count?: number; // Human corrections
}
```

### Behavioral Differences

| Aspect | Instruction | Learning |
|--------|-------------|----------|
| Update authority | Humans only | Agent + human |
| Versioning | Strict (semantic) | Lenient |
| Decay | None | Optional (configurable) |
| Deduplication | Strict | Flexible |
| Priority in retrieval | Higher | Lower |

### Implementation Requirements

- [ ] Add `memory_origin` field to schema
- [ ] Auto-detect origin during capture:
  - Explicit `/memory save` → instruction
  - Auto-capture → learning
  - From import → imported
- [ ] Add version tracking for instruction memories
- [ ] Implement confidence decay for learning memories
- [ ] Add correction tracking to improve learning confidence

---

## Gap #6: Memory File Size Management

### Status: NOT COVERED — NEW IMPLEMENTATION

**Spec location:** None existing

The memory-mechanism documentation recommends:
- Keep main memory files under 200 lines
- Load specialized rules on-demand
- Prioritize by importance within char budget

### Current State

RecallForge has:
- `maxRecallChars` budget (default 1500)
- No prioritization within budget
- No size-based consolidation

### Proposed Priority System

```typescript
type MemoryPriority = "transient" | "normal" | "critical";

interface MemoryWithPriority {
  // ... existing fields
  priority: MemoryPriority;
  
  // Computed at retrieval time:
  retrieval_score?: number;  // Based on: similarity + priority + recency + quality
}
```

### Retrieval Order Within Budget

1. Critical priority (always included)
2. Recent critical-context matches
3. High-quality learning memories
4. Normal priority by similarity
5. Transient only if budget allows

### Implementation Requirements

- [ ] Add `priority` field with auto-detection:
  - Explicit `/memory save --priority=critical` → critical
  - Decision/insight events → critical
  - Auto-capture → normal or transient (based on quality)
- [ ] Implement retrieval scoring algorithm
- [ ] Add size-based consolidation trigger during compaction
- [ ] Add `/memory prioritize` command for manual adjustment

---

## Gap #7: Cross-Project Rule Packages

### Status: NOT COVERED — NEW IMPLEMENTATION

**Spec location:** None existing

The memory-mechanism documentation describes reusable rule packages:
- `company-security-rules`
- `frontend-react-rules`
- `backend-api-rules`

Imported via symlinks or explicit reference.

### Proposed Package Model

```typescript
interface MemoryPackage {
  id: string;
  name: string;                    // "company-security-rules"
  version: string;                 // Semantic version
  source: string;                  // URL or path
  memory_ids: string[];            // Memories in this package
  description?: string;
  tags: string[];                  // ["security", "organization", "required"]
  required_for?: string[];         // Projects that must include this
  imported_at?: string;            // ISO timestamp
}
```

### Implementation Requirements

- [ ] Add `memory_package` metadata field
- [ ] Implement `/memory import --package=<id>` command
- [ ] Implement package versioning with update checks
- [ ] Add package registry (could reuse sharedNamespace)
- [ ] Support `memory_source: "local" | "shared_package" | "imported"` tracking
- [ ] Add conflict resolution for imported vs local rules

---

## Gap #8: Hybrid Retrieval Strategy

### Status: PARTIAL — NEEDS KEYWORD/B25

**Spec location:** Convergence uses semantic + tag filtering (partial)

Current: Pure vector similarity search.

### Proposed Hybrid Options

```typescript
type RecallStrategy = "semantic" | "keyword" | "hybrid";

interface RetrievalOptions {
  // existing:
  recallStrategy?: RecallStrategy;
  
  // new:
  keywordBoost?: number;           // 0-1, weight for keyword match
  semanticBoost?: number;          // 0-1, weight for vector similarity
  recencyBoost?: boolean;          // Boost recent memories
  qualityBoost?: boolean;          // Boost high-quality memories
}
```

### Use Cases

| Strategy | When to Use |
|----------|-------------|
| `semantic` | Exploratory, vague queries ("what were we thinking about X?") |
| `keyword` | Precise technical queries ("function `foo` in `bar.ts`") |
| `hybrid` | Balanced — default for most queries |

### Implementation Requirements

- [ ] Add keyword indexing alongside vector embeddings
- [ ] Implement BM25 or similar ranking algorithm
- [ ] Add `recallStrategy` to config and retrieval options
- [ ] Score fusion: combine semantic + keyword scores
- [ ] Update convergence to use hybrid by default

---

## Gap #9: Memory Provenance and Audit Trail

### Status: NOT COVERED — NEW IMPLEMENTATION

**Spec location:** None existing

### Current State

- `created_at`, `updated_at` timestamps exist
- No version history
- No change attribution
- No rollback capability

### Proposed Versioning Model

```typescript
interface MemoryVersion {
  id: string;
  memory_id: string;
  version: number;
  content: string;
  changed_by: "user" | "agent" | "system";
  change_type: "create" | "update" | "merge" | "archive" | "delete";
  change_reason?: string;
  created_at: string;
  diff?: string;                   // Computed diff from previous version
}

interface MemoryAuditEntry {
  id: string;
  memory_id: string;
  action: "viewed" | "used" | "cited" | "corrected" | "updated" | "deleted";
  actor: string;                   // agent_id or user_id
  context?: string;                // Where/how it was used
  timestamp: string;
}
```

### Implementation Requirements

- [ ] Add `memory_versions` table (similar to MaaS schema)
- [ ] Track change attribution: who/what triggered updates
- [ ] Implement diff computation on update
- [ ] Add `/memory history <id>` command
- [ ] Add `/memory rollback <id> --to-version=<n>` command
- [ ] Add audit logging for memory access/usage
- [ ] Integrate with convergence to show provenance

---

## Implementation Phases

### Phase 1: Core Episodic Events (Quick Wins)
**Timeline:** 1-2 sprints
**Priority:** 🔴 Critical

1. Implement Gap #1: Episodic Memory Layer (existing spec, just needs implementation)
   - Rules pass + AI Router classifier
   - 7 event types with auto-detection
   - Convergence prompt integration

### Phase 2: Memory Quality (Next Sprint)
**Timeline:** 2-3 sprints
**Priority:** 🟡 High

2. Gap #6: Memory Priority System
3. Gap #3: Memory Consolidation Lifecycle
4. Gap #5: Instruction vs. Learning Separation

### Phase 3: Multi-Tenant Memory (Future)
**Timeline:** 3-4 sprints
**Priority:** 🟡 Medium

5. Gap #4: Layered Memory Scoping (5 tiers)
6. Gap #7: Cross-Project Rule Packages

### Phase 4: Enhanced Retrieval (Future)
**Timeline:** 2 sprints
**Priority:** 🟢 Low

7. Gap #8: Hybrid Retrieval Strategy
8. Gap #2: Procedural Memory Templates

### Phase 5: Audit & Governance (Future)
**Timeline:** 2 sprints
**Priority:** 🟢 Low

9. Gap #9: Memory Provenance and Audit Trail

---

## Dependencies

| Gap | Depends On | Blocking |
|-----|------------|----------|
| #5 Instruction/Learning | #1 Episodic Events | No |
| #6 Memory Priority | #1 Episodic Events | No |
| #8 Hybrid Retrieval | #6 Memory Priority | No |
| #7 Rule Packages | #4 Layered Scoping | Yes |
| #9 Audit Trail | #3 Consolidation | No |

---

## Metrics for Success

After Phase 1:
- [ ] Decision events captured at >80% accuracy
- [ ] Convergence MIND/HEART/CONCIERGE blocks are actionable
- [ ] User corrections improve classifier accuracy over time

After Phase 2:
- [ ] Memory quality scores correlate with retrieval satisfaction
- [ ] Consolidation reduces duplicate memories by >50%
- [ ] Instruction vs learning memory has measurable behavior difference

---

## Open Questions

1. **Organization-tier permissions:** Who can write to org namespace? How is this enforced?
2. **Learning memory decay:** Should low-confidence learnings auto-expire, or require explicit archival?
3. **Rule package conflicts:** If local rule contradicts imported rule, which wins?
4. **Episodic retention:** How long should event history be kept? Forever, or age-based archival?
5. **Cross-agent memory visibility:** Should all subagents see all tiers, or scoped to role?

---

*This document tracks the 9 identified improvements. Update status as phases complete.*

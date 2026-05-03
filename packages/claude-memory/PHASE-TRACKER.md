# claude-memory — Phase Tracker (Rewired)

**Package**: `@lanonasis/claude-memory`
**Design**: `README.md`
**Vision**: `VORTEX-LIVE-WIRE.md`

> "We're not duplicating memory stores; we're separating layers:
> Auto Memory is local UX, MaaS is remote truth built from transcripts."

## Design Hardening (H1-H5)

- **H1**: Content-addressed idempotency key: `sha256(scope + agentType + memory_type + normalized_content[:500])`
- **H2**: Every memory includes `metadata.hook`: "stop" | "subagent_stop" | "precompact" | "migration"
- **H3**: `redactSecrets()` mandatory before any createMemory() or spool.write()
- **H4**: Recall fires on first PreToolUse only — documented, covers >95% of sessions
- **H5**: VPS archivist processes spool entries (structured units), not raw transcripts by default

---

## Architecture

```
Claude Code session
      |
      +-- Stop/SubagentStop --> chain extraction --> MaaS API
      +-- PreCompact ---------> strict extraction -> MaaS API (cap 3)
      |                               |
      |                               +-- spool queue (if offline)
      |                                   ~/.lanonasis/maas-spool/claude-code/
      |
      +-- PreToolUse (recall) -> semantic search MaaS -> inject context

VPS archivist (async):
      +-- drains spool from any agent type
      +-- LLM re-processing for deeper extraction

Migration [OPTIONAL]:
      ~/.claude/projects/**/*.jsonl -> enrichment -> MaaS (idempotent)
```

Auto Memory is untouched. We read raw `.jsonl` transcripts only.

---

## Phases

### Phase 0 — Scaffold [x] DONE
- [ ] `config.ts` — ClaudeMemoryConfig with agentType, spoolDir, capture settings
- [ ] `client.ts` — fork LanonasisClient from openclaw-plugin, source: "claude-code"
- [ ] `spool.ts` — writeSpool(), drainSpool(), listSpool() stubs
- [ ] `enrichment/` — fork from openclaw-plugin, source tag: "claude-code"
- [ ] `enrichment/chain-extractor.ts` — empty stub for decision chain extraction
- [ ] `hooks/` — update imports, keep stdin scaffolds
- [ ] `scripts/` — stubs for install-hooks, migrate-sessions, drain-spool
- [ ] `bun run typecheck` passes, zero runtime behavior

---

### Phase 1 — Stop Hook (Session End Capture) [x] DONE

**File**: `hooks/stop.ts`

Input: `{ session_id, transcript_path, num_turns, total_cost? }`

1. Read transcript JSONL
2. Extract user + assistant messages
3. chain-extractor: decision pairs, failure chains, synthesis moments
4. shouldCapture(text, { strict: false })
5. detectMemoryType() + extractTags()
6. Cap at maxMemoriesPerSession (default 5)
7. createMemory() with idempotency_key: sha256(content)
8. On failure: writeSpool(). Opportunistic drainSpool()
9. NEVER throw

SubagentStop: same hook, same logic.

---

### Phase 2 — PreCompact Hook [x] DONE

**File**: `hooks/precompact.ts`
**Priority**: Highest value — saves context before lossy compaction

1. Same extraction as Stop but strict: true
2. Prioritize "knowledge" and "project" types
3. Cap at maxMemoriesPerCompaction (default 3)
4. source: "claude-code-precompact"
5. On failure: spool. NEVER throw.

---

### Phase 3 — Install Script [x] DONE

**File**: `scripts/install-hooks.ts`

```bash
bun run install-hooks
```

1. Read/create ~/.claude/settings.json, back up first
2. Add Stop, SubagentStop, PreCompact hook entries
3. Hook scripts at ~/.lanonasis/hooks/ (NOT ~/.claude/hooks/)
4. Create spool dir ~/.lanonasis/maas-spool/claude-code/

---

### Phase 4 — Recall Injector [x] DONE

**File**: `hooks/recall.ts`
**Hook**: PreToolUse (first tool call only)

1. Build query from cwd + git branch + prompt context
2. searchMemories({ threshold: 0.7, limit: 5 })
3. Format as <recalled-context> block
4. Return via HookResult.result
5. Timeout 3s. Unreachable = return empty. Never block.

---

### Phase 5 — CLI [x] DONE

```bash
claude-memory status | search | list | stats | spool | drain
```

---

### Phase 6 — VPS Archivist Daemon [ ] TODO

1. Spool drain: watches ~/.lanonasis/maas-spool/*/ (any agent type)
2. LLM re-processing: Haiku for structured extraction
3. Optional HTTP endpoint: POST /archive
4. Multi-platform: reads agentType from spool JSON

---

### Phase 7 — Migration Script [OPTIONAL] [ ] TODO

**File**: `scripts/migrate-sessions.ts`

```bash
bun run migrate [--dry-run] [--days 30] [--verbose] [--project <path>]
```

1. Scan ~/.claude/projects/**/*.jsonl
2. Same enrichment pipeline
3. Deduplicate via sha256 idempotency_key
4. source: "claude-code-migration"

---

## Key Facts

- **Spool path**: `~/.lanonasis/maas-spool/<agent-type>/<session_id>.json`
- **Hook scripts**: `~/.lanonasis/hooks/{stop,subagent-stop,precompact,recall}.sh`
- **API base**: `https://api.lanonasis.com`
- **Scope override**: optional via `LANONASIS_ORG_ID` (`LANONASIS_PROJECT_ID` alias)
- **Node v24**: use undici fetch with `Agent({ connect: { family: 4 } })`
- **API quirk**: returns `memory_type` not `type`
- **Auth**: `X-API-Key` header, org/project inferred server-side
- **agentType**: `"claude-code"` (extensible to `"cursor"`, `"windsurf"` later)

---

## Definition of Done

- [ ] `bun run install-hooks` runs without error
- [ ] Claude Code session ends -> memory appears in MaaS
- [ ] Vortex Core CQ score increases after a session
- [ ] Spool queue drains when MaaS comes back online
- [ ] `claude-memory status` shows connection + stats
- [ ] `bun run migrate --dry-run` shows historical session count
- [ ] Hooks never crash Claude Code under any failure condition

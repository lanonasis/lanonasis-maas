# RecallForge — AGENTS.md Snippet

Paste this section into your workspace AGENTS.md to declare RecallForge memory tools as always-available capabilities. These tools are registered by the `recall-forge` plugin and do NOT require the `optional` flag — they are persistent by default.

---

## Memory Tools (RecallForge / LanOnasis MaaS)

You have access to cloud-backed semantic memory via RecallForge. All content stored or retrieved passes through secret redaction — credentials, tokens, and connection strings are never written to memory storage.

### Available Tools

| Tool | Purpose | When to Use |
|------|---------|-------------|
| `memory_search` | Semantic search through stored memories | Before starting work — check what you already know about this topic |
| `memory_store` | Store a new memory or update an existing one | After discovering insights, decisions, or patterns worth preserving |
| `memory_get` | Fetch full memory content by ID | When search results show a relevant memory you need in full |
| `memory_forget` | Delete a memory by ID or semantic query | When a memory is outdated, wrong, or superseded |

### Memory Workflow

1. **Recall before acting** — At session start, `memory_search` for context related to the current workspace and task. This prevents re-learning what was already established.
2. **Capture during work** — When you make architectural decisions, solve non-obvious bugs, or discover project conventions, use `memory_store` to persist them.
3. **Deduplicate automatically** — `memory_store` checks for 0.985+ similarity duplicates before creating a new memory. When called with an `id`, it updates that memory directly.
4. **Forget stale knowledge** — If you discover a stored memory is wrong or outdated, use `memory_forget` to clean it up.

### Memory Types

When storing, the type is auto-detected but you can override:
- `context` — Session context, current task state
- `project` — Project-specific conventions, architecture decisions
- `knowledge` — Reusable technical knowledge
- `reference` — External references, documentation links
- `personal` — User preferences, workflow habits
- `workflow` — Process patterns, command sequences

### Secret Protection

RecallForge redacts 30+ credential patterns before any content is stored or injected into context. You do not need to manually sanitize content before calling `memory_store`. If a stored memory shows `[REDACTED_<TYPE>]`, that value was a detected secret and was intentionally removed.

### Constraints

- Memories are scoped to the configured project ID and agent ID
- Context engine injects relevant memories into the prompt window on demand
- Auto-recall also injects memories before each session (configurable via `recallMode`)
- `maxRecallChars` caps the total injected block size

### Small-Context / Ollama Users — On-Demand Mode

For models with < 8K context, disable automatic recall injection:

**Plugin config:**
```json
"recallMode": "ondemand",
"maxRecallChars": 500,
"searchThreshold": 0.80,
"maxRecallResults": 3
```

**Add to your AGENTS.md session start instruction:**
> At the start of every session, call `memory_search` with a short query describing the current task before doing anything else. Example: `memory_search("current project conventions and recent decisions")`.

On-demand mode keeps all four tools available — only the automatic pre-session injection is disabled.

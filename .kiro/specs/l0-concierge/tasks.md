# Implementation Plan: L0 Memory Concierge

Deep-fork Pi (v0.82.0) into a natural memory concierge runtime branded as `l0`, with LanOnasis MaaS memory service as the default backend.

---

## Phase 1 - Rebrand & Extension Skeleton

- [ ] 1.1 Rebrand `pi` to `l0`

  - **UPDATE**: `packages/coding-agent/package.json` - set `piConfig.name` to `"l0"`, `piConfig.configDir` to `".l0"`, `bin.pi` to `"l0"`
  - **UPDATE**: `packages/coding-agent/src/config.ts` - `APP_NAME`, `CONFIG_DIR_NAME`, `ENV_AGENT_DIR`, `ENV_SESSION_DIR`, `getShareViewerUrl` all derive from piConfig automatically
  - **UPDATE**: `packages/coding-agent/src/modes/interactive/interactive-mode.ts:728` - logo text uses `APP_NAME` so it auto-updates
  - **CONSIDER**: `packages/coding-agent/src/modes/interactive/interactive-mode.ts:767` - hardcoded "Pi" in onboarding text, update to use `APP_NAME`
  - _Effect: Config dir becomes `~/.l0/agent/`, binary becomes `l0`, prompts show "l0" branding_

- [ ] 1.2 Add `@lanonasis/memory-client` dependency

  - **UPDATE**: `packages/coding-agent/package.json` - add `"@lanonasis/memory-client": "2.2.1"` to dependencies
  - **RUN**: `npm install --ignore-scripts` from repo root to hydrate
  - _Effect: Extension code can import memory client classes_

- [ ] 1.3 Create MaaS extension skeleton

  - **CREATE**: `packages/coding-agent/src/extensions/maas/index.ts` - main extension factory
    - `export default function (pi: ExtensionAPI): void`
    - Subscribe to `session_start` (init client from env/api key)
    - Subscribe to `session_shutdown` (capture session memories)
    - Subscribe to `before_agent_start` (inject memory context)
    - Register `/memory` commands and `memory_search` tool
  - **CREATE**: `packages/coding-agent/src/extensions/maas/client.ts` - memory client wrapper
    - `createMemoryClient()` - reads `LANONASIS_API_KEY` env var, instantiates `EnhancedMemoryClient`
    - `getClient()` - singleton accessor
    - Wraps CRUD with error handling
  - **CREATE**: `packages/coding-agent/src/extensions/maas/privacy.ts` - privacy redactor
    - `redactSensitiveData(input: string): string` - scrubs API keys, Bearer tokens, passwords, connection strings
    - Called before any `createMemory()` call
  - **CREATE**: `packages/coding-agent/src/extensions/maas/tools.ts` - `memory_search` tool
    - TypeBox schema: `{ query: string, limit?: number }`
    - `execute()` calls `client.searchMemories()` and returns formatted results
    - `renderCall` and `renderResult` for TUI display
  - **CREATE**: `packages/coding-agent/src/extensions/maas/commands.ts` - memory commands
    - `/memory save <title> <content>` (with `--type`, `--tags`)
    - `/memory search <query>` (with `--limit`)
    - `/memory delete <id>`
  - _Effect: Extension initializes on session start, provides memory access to AI and user_

- [ ] 1.4 Register extension in built-in extensions

  - **UPDATE**: `packages/coding-agent/src/extensions/index.ts`
    - Import maas extension
    - Add to `builtInExtensions` array (NOT hidden)
  - _Effect: Extension loads automatically on every startup_

---

## Phase 2 - Memory Tools & Commands

- [ ] 2.1 `memory_search` tool for AI

  - **UPDATE**: `packages/coding-agent/src/extensions/maas/tools.ts`
    - Tool name: `memory_search`
    - Description: "Search your memory store for relevant context from past conversations, decisions, and notes"
    - Parameters: `{ query: Type.String, limit: Type.Optional(Type.Number({ default: 5 })), memory_type: Type.Optional(Type.String) }`
    - `execute()`: calls `client.searchMemories(query, { limit, memory_type })`, returns formatted text with title, content snippet, similarity score
  - _Effect: AI naturally calls memory_search to retrieve relevant context_

- [ ] 2.2 Memory slash commands

  - **UPDATE**: `packages/coding-agent/src/extensions/maas/commands.ts`
    - `/memory save <content>` - captures freeform text, auto-extracts title
    - `/memory search <query>` - interactive search results
    - `/memory list` - recent memories
    - `/memory delete <id>` - confirm + delete
  - _Effect: User can manually interact with memory store_

- [ ] 2.3 Auto-capture on session events

  - **UPDATE**: `packages/coding-agent/src/extensions/maas/index.ts` handlers
    - `turn_end`: capture meaningful exchanges (Q&A pairs, important decisions)
    - `session_before_compact`: capture context before compaction summarizes it
    - `session_shutdown`: capture final state
    - Privacy redactor applied before each capture
    - Dedup guard: skip if content is similar to recent memories
  - _Effect: Memory is automatically populated without explicit commands_

---

## Phase 3 - Persona System

- [ ] 3.1 Persona types and registry

  - **CREATE**: `packages/coding-agent/src/extensions/maas/personas/types.ts`
    - `Persona` interface: `{ name, label, description, lens, systemPromptAdditions }`
    - `PersonaRegistry` class: `get(name)`, `list()`, `active()`, `switch(name)`
  - **CREATE**: `packages/coding-agent/src/extensions/maas/personas/prompts.ts`
    - System prompt additions for each persona (lens instructions + memory capability block)
  - _Effect: Foundation for persona switching_

- [ ] 3.2 Built-in personas

  - **CREATE**: `packages/coding-agent/src/extensions/maas/personas/index.ts`
    - `LZero` (default): warm, contextual, memory-aware generalist
    - `Mind`: analytical, structural, pattern-surfacing. Precision over warmth
    - `Heart`: reflective, motivational interpretation. Surfaces emotional signals
    - `Concierge`: action-oriented. Every interaction ends with concrete next steps
    - Each persona system prompt is injected via `before_agent_start` as `{ systemPrompt: string }`
  - _Effect: Four distinct interaction modalities_

- [ ] 3.3 Persona commands

  - **UPDATE**: `packages/coding-agent/src/extensions/maas/commands.ts`
    - `/persona` - show current persona
    - `/persona list` - list all personas
    - `/persona switch <name>` - switch active persona
    - `/reflect [query]` - invoke Heart lens on recent context
    - `/concierge [goal]` - invoke Concierge lens for action plan
  - _Effect: User explicitly controls interaction lens_

- [ ] 3.4 Event ontology

  - **CREATE**: `packages/coding-agent/src/extensions/maas/events/types.ts`
    - 7 event types: `decision`, `commitment`, `frustration`, `surprise`, `insight`, `revisit`, `abandon`
    - Types stored as tags (`event:decision`, etc.)
  - **CREATE**: `packages/coding-agent/src/extensions/maas/events/rules.ts`
    - Pattern-matching detector for 3 types (decision, commitment, frustration)
  - **CREATE**: `packages/coding-agent/src/extensions/maas/events/tags.ts`
    - Tag construction, parsing, merge/strip utilities
  - **INTEGRATE**: Auto-tag captured memories using event detector
  - _Effect: Memories automatically classified by interaction type_

---

## Phase 4 - Polish

- [ ] 4.1 Profile and context convergence

  - **UPDATE**: `packages/coding-agent/src/extensions/maas/commands.ts`
    - `/profile [subject]` - show memory profile for the current user
    - `/profile ask <question>` - ask profile a question (intelligence endpoint)
    - `/context converge` - synthesize event-tagged memories using Mind/Heart/Concierge
  - _Effect: High-level insights and synthesis from accumulated memory_

- [ ] 4.2 Theme and branding refresh

  - **UPDATE**: `packages/coding-agent/src/modes/interactive/theme/` - new theme files
    - Purple/magenta accent color (LanOnasis brand)
    - Refined background and text colors
  - **UPDATE**: Header rendering to use new theme + show "l0 memory concierge"
  - _Effect: Visual identity matches memory concierge experience_

- [ ] 4.3 Smart capture

  - **ENHANCE**: Auto-capture logic in `turn_end` handler
    - Dedup: skip if content is >80% similar to recent memory
    - Significance filter: skip trivial interactions ("hello", "ok", "thanks")
    - Auto-title: extract first meaningful phrase as title
  - _Effect: Only meaningful content is stored, no noise_

---

## Supplementary - Tool Display Upgrade

- [ ] S.1 Upgrade bash tool rendering to tree format

  - **MODIFY**: `packages/coding-agent/src/core/tools/bash.ts` - `BashResultRenderComponent`
    - Show hierarchical progress: `● build  <tool> · <tokens> · <t/s>`
    - Indented sub-tasks: ` ├─ aim ▸ upgrade context-mode plugin`
    - Real-time streaming output with structured prefix
    - Elapsed timer integrated into tree header

- [ ] S.2 Add progress component for tool execution display

  - **CREATE**: `packages/coding-agent/src/core/tools/render-hierarchy.ts`
    - `TreeRenderNode` for building hierarchical tool displays
    - `formatProgress(current, total)` for t/s metrics
    - `formatSubtask(label, status)` for indented children
  - _Effect: All tools can display structured progress trees_

- [ ] S.3 Wire sub-task display into interactive-mode.ts

  - **UPDATE**: `packages/coding-agent/src/modes/interactive/interactive-mode.ts` tool execution handlers
    - Pass `tool_execution_update` structured data to render components
    - Support multi-line progress rendering in tool output area
  - _Effect: Terminal shows beautiful hierarchical real-time progress_

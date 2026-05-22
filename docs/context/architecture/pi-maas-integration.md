You are Hermes-Agent acting as senior TypeScript systems architect and implementation lead.

Objective:
Create an experimental fork/customization of Pi Coding Agent that uses Pi strictly as an interactive harness for the LanOnasis Memory-as-a-Service system. The goal is not to rebuild memory inside Pi. The goal is to make Pi the personalized terminal/session interface for LanOnasis memory, identity, context convergence, and second-brain intelligence.

Repository Context:
- Pi documentation: https://pi.dev/docs/latest/development
- Pi supports forking/rebranding through package.json piConfig:
  {
    "piConfig": {
      "name": "pi",
      "configDir": ".pi"
    }
  }
- Pi package structure includes:
  packages/ai
  packages/agent
  packages/tui
  packages/coding-agent
- Pi has customizable providers, prompt templates, skills/extensions, themes, SDK/RPC/JSON modes.
- Pi debug command writes to ~/.pi/agent/pi-debug.log with rendered TUI lines and LLM messages.
- Path resolution should use src/config.ts helpers such as getPackageDir and getThemeDir. Do not use __dirname directly for package assets.

LanOnasis Direction:
Use the existing LanOnasis MaaS/memory microservices as the source of truth. Pi should remain a harness, not the memory database. The memory system should provide:
- memory search
- memory save
- session ingest
- context pack generation
- context convergence
- identity loading
- reflection synthesis
- pattern detection
- handoff prompt generation

Core Product Concept:
Build a “Memory Concierge Harness” where Pi becomes a live second-brain interface. The assistant should support a multi-perspective mode inspired by:
- Mind: analytical, strategic, architectural reasoning
- Heart: reflective, purpose-driven, emotional/contextual interpretation
- Concierge: action translator that turns insights into tasks, memories, issues, or execution prompts

Implementation Plan:

Phase 1 — Fork/Rebrand Harness
1. Fork or create a branch of Pi.
2. Rename the CLI identity to one of:
   - l0-concierge
   - lanonasis-concierge
   - memory-concierge
3. Configure package.json:
   {
     "piConfig": {
       "name": "l0-concierge",
       "configDir": ".lanonasis"
     }
   }
4. Update bin names, CLI banner, config paths, and environment variable naming accordingly.
5. Add a LanOnasis-themed TUI theme.
6. Add support for loading an identity file such as SOUL.md or identity profiles from the config directory.

Phase 2 — Memory Provider
Create a LanOnasisMemoryProvider module that wraps existing MaaS APIs.

Required interface:
- searchMemories(query, filters)
- saveMemory(input)
- getContextPack(sessionId, goal)
- ingestSessionEvent(event)
- synthesizeReflection(sessionId)
- detectPatterns(scope)
- generateHandoff(sessionId, targetAgent)

The provider should:
- use environment variables for API URL and token
- support local/dev endpoints
- include typed request/response interfaces
- gracefully degrade when memory API is unavailable
- log failures without breaking normal Pi chat flow

Suggested environment variables:
- LANONASIS_MAAS_API_URL
- LANONASIS_MAAS_API_KEY
- LANONASIS_IDENTITY_PROFILE
- LANONASIS_CONTEXT_MODE
- LANONASIS_MEMORY_DEBUG

Phase 3 — Commands
Add the following slash commands:
- /memory search <query>
- /memory save <text>
- /context pack
- /context converge
- /identity load <profile>
- /reflect
- /mind <topic>
- /heart <topic>
- /concierge <topic>
- /handoff hermes
- /debug-memory

Command behavior:
- /memory search should fetch relevant memory records from LanOnasis MaaS.
- /memory save should save an explicit user-approved memory.
- /context pack should show the current injected context pack.
- /context converge should synthesize patterns from current session + relevant long-term memory.
- /reflect should summarize what the current session reveals strategically, emotionally, and operationally.
- /handoff hermes should produce an execution-ready prompt for Hermes-Agent.

Phase 4 — Context Injection
Before each model call, request a compact Context Pack from LanOnasis MaaS.

The Context Pack should include:
- active identity profile
- current project
- session goal
- relevant memories
- recent patterns
- known constraints
- unresolved decisions
- recommended next actions

Rules:
- Keep injected context compact.
- Do not dump raw memory unless explicitly requested.
- Include provenance metadata for memory items.
- Make context explainable through /debug-memory.
- Avoid context bloat.

Phase 5 — Second Brain Co-Host Mode
Implement a response mode where the assistant can answer as:
- Mind
- Heart
- Concierge

Expected output format:

Mind:
[Analytical reasoning, architecture, strategy, trade-offs]

Heart:
[Meaning, motivation, recurring emotional/contextual signal]

Concierge:
[Actionable next step, memory/task/handoff recommendation]

This mode should be toggleable:
- /mode second-brain
- /mode normal
- /mode technical
- /mode reflection

Phase 6 — Session Ingest
Capture structured session events:
- user message
- assistant response summary
- command executed
- memory records used
- decisions made
- tasks created
- insights detected
- unresolved questions
- project/repo metadata
- timestamp

At session end or on /reflect, send a session summary to LanOnasis MaaS.

Phase 7 — Testing
Add non-LLM tests for:
- config loading
- provider failure handling
- command parsing
- context pack formatting
- identity profile loading
- memory search/save mocks
- second-brain response formatting

Run:
./test.sh
npm test
npm run build

Deliverables:
1. Architecture summary.
2. Modified package/config files.
3. LanOnasisMemoryProvider implementation.
4. Slash commands.
5. Context injection hook.
6. Second-brain mode.
7. Example SOUL.md profile.
8. Example .env file.
9. Test coverage.
10. Final implementation report with risks and next steps.

Important Constraints:
- Do not store memory directly inside Pi except temporary cache/session metadata.
- Do not hardcode secrets.
- Do not use __dirname directly for package assets.
- Do not break existing Pi execution modes.
- Keep the first implementation thin and reversible.
- Prefer extension/provider architecture over deep invasive rewrites.


This plan outlines a structured approach to integrating Pi with LanOnasis MaaS while maintaining clear boundaries between the interactive harness and the memory system. The phased implementation allows for incremental development and testing, ensuring that each component is functional before moving on to the next.

The key experiment should answer one question:

Can a customizable terminal agent become a live interface to a persistent second brain that can reason across memory, identity, intent, and execution?


---

## Strategic Framing

This plan executes a **two-layer strategy**:

| Layer | Scope | Validates |
|-------|-------|-----------|
| **Layer 1 — Thin Harness** | Infrastructure: Pi fork, MaaS provider, context injection, commands, session persist | Transport, ergonomics, extensibility |
| **Layer 2 — Convergence Engine** | Intelligence: `/context converge`, pattern emergence, identity evolution, longitudinal synthesis | **Emergent intelligence** ← the actual product |


**The trap this plan avoids:**

```
What It Looks Like    What It Actually Is
─────────────────────────────────────────────
Second brain          Fancy memory CLI
Context intelligence  Retrieval layer
Convergence          Summarization
Identity              Static system prompt
```

`/context converge` is the anchor feature that proves this transcends "memory search." Build it as the first Layer 2 proof, not as an afterthought.


**Do not wire agent files to AI router yet.** Build the convergence engine first.

**The question every feature must answer:** *Does it validate emergent intelligence, or just plumbing?*

---

## The Real Test

> Can a customizable terminal agent become a live interface to a persistent second brain that can reason across memory, identity, intent, and execution?


That is the real test.

That is the real test.
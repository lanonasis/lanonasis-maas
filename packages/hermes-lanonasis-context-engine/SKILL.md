---
name: lanonasis-context-engine
description: "Install, configure, activate, and extend the LanOnasis Hermes context engine plugin (wireframe ContextEngine). Use when setting up context.engine=lanonasis, porting secret-prescan filtering, or wiring DAG compaction."
version: 0.1.0
author: LanOnasis
license: MIT
metadata:
  hermes:
    tags: [hermes, plugin, context-engine, lanonasis, maas, compaction]
    related_skills: [hermes-agent, lanonasis-memory-provider, hermes-memory-providers]
---

# LanOnasis Context Engine Plugin (wireframe)

Skeleton `ContextEngine` for Hermes Agent, source of truth at
`apps/lanonasis-maas/packages/hermes-lanonasis-context-engine/`.
Conforms to the full ABC; every backend hook fails open.

## Key facts

- **Single-slot**: only ONE context engine active at a time
  (`context.engine` in config.yaml). Registering a second is rejected
  with a warning — the built-in `ContextCompressor` is the default.
- **Never auto-activated.** Set `hermes config set context.engine lanonasis`.
- **Fail-open contract**: `select_context()` must return `None` (no-op)
  and must NEVER mutate persisted history; `compress()` may return the
  list unchanged. Activation before the backend is wired is therefore
  safe (compaction just does nothing) but takes ownership of compaction
  policy — so don't activate casually.
- **Token fields are host-read**: keep `last_prompt_tokens`,
  `last_completion_tokens`, `last_total_tokens`, `threshold_tokens`,
  `context_length`, `compression_count` maintained.

## Install + activate

```bash
HERMES_PY=$(dirname "$(readlink -f "$(command -v hermes)")")/python
$HERMES_PY -m pip install -e <repo>/packages/hermes-lanonasis-context-engine
mkdir -p ~/.hermes/plugins
ln -sfn <repo>/packages/hermes-lanonasis-context-engine/hermes_lanonasis_context_engine \
        ~/.hermes/plugins/lanonasis-context
hermes config set context.engine lanonasis
$HERMES_PY -m pytest <repo>/packages/hermes-lanonasis-context-engine/tests -v
```

## The secret-prescan port (framing)

`secret-prescan` (TS, MIRA gate) filters secrets pre-LLM. In Hermes that
is a **context-engine** concern — the engine holds the message list at
the compaction/selection egress boundary. The port slot is
`filter_turn_for_egress(text)`; wire it into `compress()` (and optionally
`select_context()`) when implemented. Do NOT try to express content
filtering as a `SecretSource` — that contract is read-only startup env
materialization by design.

## Roadmap

1. `compress()` → `POST /api/v1/memories/compact` (DAG summary handoff;
   honor `memory_context` param)
2. DAG tools: `lcm_grep`, `lcm_describe`, `lcm_expand`
3. secret-prescan port into `filter_turn_for_egress()`

## Verify

```bash
hermes plugins list | grep -A2 lanonasis-context   # entrypoint registered
$HERMES_PY -c "from hermes_lanonasis_context_engine import LanonasisContextEngine as E; e=E(); print(e.name, e.is_available)"
```

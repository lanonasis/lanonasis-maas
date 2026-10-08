# hermes-lanonasis-context-engine

LanOnasis context engine plugin for **Hermes Agent** — a wireframe
`ContextEngine` that conforms to the full ABC contract while its backend
calls remain stubbed.

- **Contract docs:** https://hermes-agent.nousresearch.com/docs/developer-guide/context-engine-plugin
- **Kind:** `context-engine` (single-slot: only one engine can be active)
- **Status:** wireframe — installs, registers, fails open; no backend calls yet

## What it does today

| Hook | Behavior |
|---|---|
| `update_from_response(usage)` | Tracks prompt/completion/total tokens |
| `should_compress(prompt_tokens)` | Threshold-based vs `threshold_tokens` |
| `compress(messages, ...)` | **Fail-open**: returns messages unchanged until backend wired |
| `select_context(...)` | No-op (`None`) — never mutates persisted history |
| `on_turn_complete(...)` | No-op (observation slot) |
| `get_tool_schemas()` | Declares `lcm_grep` (DAG search) — errors until implemented |
| `filter_turn_for_egress(text)` | Pass-through slot for the future **secret-prescan port** |

## Why a context engine and not a secret source?

The legacy `secret-prescan` package filters secrets **before they reach an
LLM**. That is a content-filtering job, which belongs to the context
engine (it holds the message list in `select_context()`/`compress()`).
The `SecretSource` contract is deliberately **not** that:
"read-only, startup-time env materialization, no arbitrary secret
objects, no mid-session secret API" (`agent/secret_sources/base.py`).
See the sibling package `hermes-lanonasis-secret-source` for the
credential-materialization surface.

## Installation

```bash
# inside the Hermes venv
HERMES_PY=$(dirname "$(readlink -f "$(command -v hermes)")")/python
$HERMES_PY -m pip install -e /path/to/hermes-lanonasis-context-engine

# flat symlink so directory-based discovery sees it
mkdir -p ~/.hermes/plugins
ln -sfn /path/to/hermes-lanonasis-context-engine/hermes_lanonasis_context_engine \
        ~/.hermes/plugins/lanonasis-context
```

## Activation

Context engines are **never auto-activated** — select one explicitly:

```bash
hermes config set context.engine lanonasis
```

> Replacing the built-in `ContextCompressor` takes ownership of the
> session's compaction policy. Until the backend is wired, the engine
> fails open (returns messages unchanged), so activation is safe but
> means compaction does nothing.

## Configuration

- Secret: `LANONASIS_API_KEY` → `$HERMES_HOME/.env` (mode 0600)
- Non-secret → `$HERMES_HOME/plugins/lanonasis-context/config.json`:

```json
{
  "api_url": "https://api.lanonasis.com",
  "threshold_percent": 0.75
}
```

## Roadmap (wireframe → live)

1. Wire `compress()` → `POST /api/v1/memories/compact` (DAG summarization)
2. Implement `lcm_grep` / `lcm_describe` / `lcm_expand` tools over the DAG
3. Port `secret-prescan` filtering into `filter_turn_for_egress()` and
   invoke it from `compress()`/`select_context()` egress paths

## Tests

```bash
$HERMES_PY -m pip install -e '.[test]'
$HERMES_PY -m pytest tests/ -v
```

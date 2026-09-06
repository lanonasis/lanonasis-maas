# hermes-lanonasis-secret-source

LanOnasis secret source plugin for **Hermes Agent** — a wireframe that
conforms to the `SecretSource` ABC while the backend remains unwired.

- **Contract docs:** https://hermes-agent.nousresearch.com/docs/developer-guide/secret-source-plugin#the-secretsource-abc
- **Kind:** `secret-source`
- **Status:** wireframe — registers, discovers, fails closed; fetch() returns `NOT_CONFIGURED`

## What it does today

| Surface | Behavior |
|---|---|
| `fetch(cfg, home_path)` | **Never raises, never prompts** (contract). Returns `FetchResult(error, error_kind=NOT_CONFIGURED)` until backend wired |
| `is_enabled(cfg)` | **Fail-closed**: requires `secrets.lanonasis.enabled: true` |
| `protected_env_vars(cfg)` | Protects `LANONASIS_SECRETS_TOKEN` from self-clobbering |
| `config_schema()` | Full schema for setup surfaces |
| `remediation(kind, cfg)` | Actionable hint for `hermes secrets status` |
| `scheme` | Owns `lano://` secret-reference URIs |

## The contract this honors (from `agent/secret_sources/base.py`)

- **Read-only** — resolve refs → values; no write-back, no rotation,
  no mid-session secret API.
- **Startup-time, synchronous** — one `fetch()` per process, under the
  orchestrator's wall-clock timeout. No background refreshers.
- **Never raises, never prompts** — errors live in `FetchResult.error`
  with a machine-readable `ErrorKind`. Interactive auth belongs in a
  future `hermes secrets lanonasis setup` flow, never on the startup path.
- **Sources fetch; the orchestrator applies** — precedence, conflicts,
  and `os.environ` writes belong to `agent.secret_sources.registry.apply_all`.

## Why this is NOT the secret-prescan port

`secret-prescan` filters secrets **before they reach an LLM** — that is
content filtering, which belongs in a **context engine**
(see `hermes-lanonasis-context-engine`, the `filter_turn_for_egress()`
slot). A secret source's job is narrower: materialize *credentials* into
env vars at process startup. Both packages exist because they are
different surfaces, and neither can substitute for the other.

## Installation

```bash
# inside the Hermes venv
HERMES_PY=$(dirname "$(readlink -f "$(command -v hermes)")")/python
$HERMES_PY -m pip install -e /path/to/hermes-lanonasis-secret-source
```

Secret sources register through the entry-point group; directory-based
discovery is not the primary path (the orchestrator scans registered
sources). No symlink required unless a future Hermes version needs it.

## Configuration (fail-closed)

```yaml
# config.yaml
secrets:
  lanonasis:
    enabled: false        # MUST be true to activate — wireframe default is off
    access_token: ""      # bootstrap token (backend not live yet)
    api_url: "https://api.lanonasis.com"
    map: {}               # env-var → lano://secret-ref bindings
    override_existing: false
    timeout_seconds: 30
```

Until the secrets-manager backend is stable, leave `enabled: false` —
`fetch()` will report `NOT_CONFIGURED` with a wireframe marker, never a
half-materialized env.

## Roadmap (wireframe → live)

1. Freeze the `POST /api/v1/secrets/resolve` request/response contract
2. Implement the HTTP resolve path in `fetch()` (mapped shape: resolve
   each `lano://` ref, return the env-var mapping)
3. Add `hermes secrets lanonasis setup` interactive auth (CLI side)
4. Enable `secrets.lanonasis.enabled` default behind a feature flag once
   the backend proves stable end-to-end

## Tests

```bash
$HERMES_PY -m pip install -e '.[test]'
$HERMES_PY -m pytest tests/ -v
```

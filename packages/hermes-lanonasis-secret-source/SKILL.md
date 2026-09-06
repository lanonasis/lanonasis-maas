---
name: lanonasis-secret-source
description: "Install, configure, and extend the LanOnasis Hermes secret source plugin (wireframe SecretSource). Use when wiring secrets.lanonasis, materializing provider credentials at startup, or deciding what belongs in a secret source vs a context engine."
version: 0.1.0
author: LanOnasis
license: MIT
metadata:
  hermes:
    tags: [hermes, plugin, secret-source, lanonasis, maas, credentials]
    related_skills: [hermes-agent, lanonasis-memory-provider, lanonasis-context-engine]
---

# LanOnasis Secret Source Plugin (wireframe)

Skeleton `SecretSource` for Hermes Agent, source of truth at
`apps/lanonasis-maas/packages/hermes-lanonasis-secret-source/`.
Conforms to the ABC; `fetch()` fails closed with `NOT_CONFIGURED`.

## Hard contract (from agent/secret_sources/base.py)

- NEVER raise, NEVER prompt in `fetch()`. Errors → `FetchResult.error` +
  `ErrorKind`. Interactive auth belongs in a `setup` CLI, never startup.
- Startup-time, synchronous, once per process. No background refreshers.
- Read-only: resolve refs → values. No write-back / rotation / mid-session API.
- Sources fetch; `registry.apply_all` owns precedence, conflicts, writes.
- `api_version` must equal `SECRET_SOURCE_API_VERSION` or the registry
  skips the source with a warning (not a crash).

## Status

Wireframe by design — the LanOnasis secrets-manager backend
(`/api/v1/secrets/resolve`) is fragmented/untested, so nothing is
materialized until it stabilizes. `is_enabled()` is fail-closed:
`secrets.lanonasis.enabled: true` is required, and even then `fetch()`
returns NOT_CONFIGURED with a wireframe marker + warning.

## Wire it up

```bash
HERMES_PY=$(dirname "$(readlink -f "$(command -v hermes)")")/python
$HERMES_PY -m pip install -e <repo>/packages/hermes-lanonasis-secret-source
# config.yaml:
#   secrets:
#     lanonasis:
#       enabled: true
#       access_token: <bootstrap-token>
#       map: { OPENAI_API_KEY: "lano://openai/key" }
$HERMES_PY -m pytest <repo>/packages/hermes-lanonasis-secret-source/tests -v
hermes secrets status   # lists lanonasis with a NOT_CONFIGURED hint
```

## Do NOT port secret-prescan here

Pre-LLM secret *filtering* is a context-engine concern
(`lanonasis-context-engine` → `filter_turn_for_egress()`). A secret
source only *materializes credentials into env at startup*. If a request
sounds like "filter content before the model sees it", route it to the
context engine, not here.

## Roadmap

1. Freeze `/api/v1/secrets/resolve` contract
2. Implement HTTP resolve in `fetch()` (mapped shape)
3. `hermes secrets lanonasis setup` CLI auth
4. Feature-flag `enabled` default once backend is stable

## Verify

```bash
hermes plugins list | grep -A2 lanonasis-secrets   # entrypoint registered
hermes secrets status                               # shows lanonasis source
$HERMES_PY -c "from hermes_lanonasis_secret_source import LanonasisSecretSource as S; s=S(); print(s.name, s.shape, s.api_version)"
```

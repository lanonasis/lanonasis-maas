---
name: lanonasis-memory-provider
description: "Install, configure, verify, and troubleshoot the LanOnasis Hermes memory provider plugin (hermes-lanonasis-memory). Covers the flat-symlink discovery requirement, the pip entry-point gap, the dead-editable-install trap, and the config schema. Use when setting up, migrating, or debugging LanOnasis memory on a Hermes host."
version: 1.0.0
author: LanOnasis
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [hermes, plugin, memory, lanonasis, maas, integration, diagnostics]
    related_skills: [hermes-agent, hermes-memory-providers]
---

# LanOnasis Memory Provider Plugin

Operational skill for the LanOnasis Memory-as-a-Service (MaaS) plugin for
Hermes Agent. This plugin gives Hermes persistent cross-session memory
backed by the LanOnasis cloud API.

- **Source of truth:** `apps/lanonasis-maas/packages/hermes-lanonasis-memory/`
  (public repo: `lanonasis/lanonasis-maas`), installed into the Hermes venv
  via pip, exposed to discovery via a flat symlink under `$HERMES_HOME/plugins/`.
- **Contract docs:** https://hermes-agent.nousresearch.com/docs/developer-guide/memory-provider-plugin
- **Generic provider skill:** load `hermes-memory-providers` for the general
  MemoryProvider ABC contract, threading rules, and the discovery heuristics.
  This skill is the LanOnasis-specific operational layer on top.

## When to Load

- Setting up LanOnasis memory on a new Hermes host or profile.
- `hermes memory status` does not list `lanonasis`, or says "not enabled".
- Migrating the package (repo restructure, submodule move) and re-wiring
  the install.
- Reviewing or extending the provider code.
- Debugging "plugin not found" / "Provider: (none)" / import errors.

## Install (3 steps, this exact order)

```bash
# 1. pip-editable install into the HERMES venv (NOT a side venv)
HERMES_PY=$(dirname "$(readlink -f "$(command -v hermes)")")/python
$HERMES_PY -m pip install -e \
  /opt/lanonasis/lan-onasis-monorepo/apps/lanonasis-maas/packages/hermes-lanonasis-memory

# 2. FLAT symlink into the user plugins dir — required for `hermes memory setup`
mkdir -p ~/.hermes/plugins
ln -sfn /opt/lanonasis/lan-onasis-monorepo/apps/lanonasis-maas/packages/hermes-lanonasis-memory/hermes_lanonasis_memory \
        ~/.hermes/plugins/lanonasis

# 3. Activate + verify
hermes config set memory.provider lanonasis
cd /opt/lanonasis/lan-onasis-monorepo/apps/lanonasis-maas/packages/hermes-lanonasis-memory
./scripts/verify-install.sh          # asserts import + discovery, exit 0 = green
hermes memory status                # Provider: lanonasis, Status: available ✓
```

> **The symlink target is the INNER package directory** (the one whose root
> holds `__init__.py`), and the link path is **flat**
> (`~/.hermes/plugins/lanonasis`), NOT `~/.hermes/plugins/memory/lanonasis/`.
> Hermes' discovery scans `$HERMES_HOME/plugins/<name>/__init__.py` on disk
> for the strings `MemoryProvider` / `register_memory_provider`. The pip
> entry point (`hermes_agent.plugins`) alone is INVISIBLE to
> `hermes memory setup` — both the import path AND the symlink must exist.

## Config

Secrets → `$HERMES_HOME/.env` (mode 0600): `LANONASIS_API_KEY=lano_...`
Non-secrets → `$HERMES_HOME/plugins/lanonasis/config.json` (mode 0600):

```json
{ "api_url": "https://api.lanonasis.com", "tool_policy": "read_only", "privacy_mode": false }
```

`tool_policy` gates model-callable tools: `read_only` (default) = search/get;
`write` adds store; `full_access` adds forget. Lifecycle hooks
(`sync_turn`, `on_pre_compress`, ...) run regardless of policy.
`privacy_mode: true` adds PII masking on top of the always-on credential
redaction. There is NO `--rest` flag on `hermes memory setup` — write the
config.json directly for non-interactive setup.

## Verification (after ANY change)

```bash
./scripts/verify-install.sh          # exit 0 = import + discovery both green
hermes memory status                 # Provider: lanonasis, Status: available
hermes plugins list | grep -A2 lanonasis
# Live API roundtrip:
$HERMES_PY - <<'EOF'
import os
from pathlib import Path
for line in (Path.home()/'.hermes'/'.env').read_text().splitlines():
    if '=' in line and not line.startswith('#'):
        k, v = line.split('=', 1); os.environ.setdefault(k, v)
from hermes_lanonasis_memory import LanonasisMemoryProvider
p = LanonasisMemoryProvider()
print('is_available:', p.is_available())          # True with key present
p.initialize('verify', hermes_home=str(Path.home()/'.hermes'))
print('tools:', [s['name'] for s in p.get_tool_schemas()])
import json; print(json.loads(p.handle_tool_call('memory_search', {'query':'smoke','limit':2})))
p.shutdown()
EOF
```

## Troubleshooting

| Symptom | Root cause | Fix |
|---|---|---|
| `hermes memory setup lanonasis` → "not found" | discovery only scans `$HERMES_HOME/plugins/` on disk; pip entry point alone is invisible | add the flat symlink (step 2) |
| `hermes plugins list` shows `lanonasis ... entrypoint` but `memory status` says "Provider: (none)" | dead editable install — `.pth` in the Hermes venv maps to a deleted source tree (kanban workspace torn down, repo moved) | `$HERMES_PY -m pip uninstall -y hermes-lanonasis-memory && $HERMES_PY -m pip install -e <current-source-path>` then re-symlink |
| Import works in package `.venv` but not Hermes | installed into the wrong venv | reinstall with `$HERMES_PY -m pip install -e .` (the `hermes` shim's venv) |
| `is_available()` False with key set | `.env` not loaded in that process, or key missing | confirm `LANONASIS_API_KEY` in `$HERMES_HOME/.env`, mode 0600 |
| Provider listed but tools never called | `tool_policy` too restrictive, or schema descriptions too generic | check `get_tool_schemas()` output; raise policy deliberately |
| `memory_search` returns `[]` with `_degraded: true` | API unreachable / auth failed | check `api.lanonasis.com` reachability; key validity; httpx error in `_error` |
| Fallback files growing in `$HERMES_HOME/workspace/memory/*.jsonl` | API refused writes; buffered locally, replayed on next `initialize()` | fix the API-side cause; entries with `_replayed: true` are never re-sent |

## Contract Quick Map (code → docs hooks table)

| Code | Contract hook | Non-blocking? |
|---|---|---|
| `provider.py :: prefetch()` | `prefetch(query, *, session_id="") -> str` | yes (inline) |
| `provider.py :: sync_turn()` | `sync_turn(user, assistant, *, session_id="", messages=None)` | yes — daemon thread chain, <50 ms dispatch |
| `provider.py :: on_pre_compress()` | `on_pre_compress(messages) -> str` | yes (write in background, returns summary) |
| `provider.py :: on_session_end()` | `on_session_end(messages)` | yes |
| `provider.py :: shutdown()` | `shutdown()` | drains ≤10 s then closes client |
| `provider.py :: get_config_schema()` | config fields for `hermes memory setup` | n/a |
| `provider.py :: save_config()` | non-secret config to `{hermes_home}/plugins/lanonasis/config.json` | n/a |
| `__init__.py :: register(ctx)` | `ctx.register_memory_provider(...)` | n/a |

Security pipeline (always-on on recall path): `redact_secrets()` →
prompt-injection filter → `CONTEXT BLOCK` defensive wrapper →
embedding-profile-mismatch warning. `privacy_mode` additionally masks
PII (email/phone/SSN). Never logs message bodies.

## Tests

```bash
cd <package-root>
$HERMES_PY -m pip install -e '.[test]'
$HERMES_PY -m pytest tests/ -v          # ~150 tests; test_install.py asserts the
                                        # import + discovery integration traps
```

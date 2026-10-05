---
name: lanonasis-cli
description: Use when operating the LanOnasis CLI (@lanonasis/cli) — the lanonasis/onasis/memory/maas command surface. Covers first-run auth, memory create/list/search/get examples, JSON output, MCP vs direct-API routing, prescan, and headless stdout gotchas.
---

# LanOnasis CLI

Operating guide for the published `@lanonasis/cli`. Prefer live command output over any statement here — this CLI, its docs, and its live routes have drifted before.

> Repo-internal maintenance notes (build, release, package boundaries, docs-drift hotspots) live in `MAINTAINER.md` in the source repository. It is deliberately **not** published to npm.

## Verified baseline

| Fact | Value |
|---|---|
| Verified against | `@lanonasis/cli` **3.11.2**, global bin `/usr/bin/lanonasis` → `../lib/node_modules/@lanonasis/cli/dist/index.js` |
| Verified on | 2026-09-30 |
| Config file | `~/.maas/config.json` |
| REPL binaries installed | `lrepl`, `onasis-repl` |
| Rule | Any live-behaviour claim below carries a date. Re-verify before trusting it; re-stamp when you do. |

## 0. Headless hygiene (read this first)

On a headless host, **every** invocation prepends noise to stdout:

```
◇ injected env (0) from .env // tip: ⌘ custom filepath { path: '/custom/path/.env' }
Keytar retrieval failed, trying file: [Error: The name org.freedesktop.secrets was not provided by any .service files]
```

Keytar has no secret service on such hosts, so it falls back to the file store — this is **expected, not an error**. It does not break auth. Any script parsing output must strip it, along with the `Memories` heading and `Page N of M` preamble. Keep stderr visible and enable `pipefail` so a failed list request fails the pipeline:

```bash
set -o pipefail
lanonasis memory list -l 1 --output json |
  grep -v '^◇\|^Keytar\|^📚 Memories (\|^Page [0-9][0-9]* of [0-9][0-9]*$' |
  jq .
```

## 1. Authenticate (step zero)

Nothing works before this. The CLI never says so, but `whoami`, `status`, `health`, and every `memory` call assume a session.

```bash
lanonasis auth login -e <email> -p <password>      # interactive-ish login
lanonasis auth login -k <vendor-key>               # vendor-key API access
lanonasis auth status                              # → Method: vendor_key, ✓ accessible
lanonasis auth diagnose                            # when status is not ✓
lanonasis whoami                                   # identity + role + provider
```

Never echo the vendor key, token, or password into logs or reports.

## 2. Global options (correct as of 3.11.2)

| Flag | Meaning |
|---|---|
| `-h, --help` | help |
| `-v, --version` | print version |
| `-V, --verbose` | verbose logging |
| `--api-url <url>` | override API base URL |
| `--output <format>` | `table` (default) \| `json` \| `yaml` — **global** flag |
| `--no-mcp` | disable MCP route, use direct API |

⚠️ **`-v` is version, `-V` is verbose.** `lanonasis -v` prints the version, `lanonasis -V` prints the startup banner. An earlier revision documented these inverted.

⚠️ **Two different JSON switches.** `--output json` is global (works on any command). `memory search --json` is command-local. `search` also has `--ci`, which implies no-fallback + JSON + non-zero exit on backend error.

⚠️ **`--output json` is not clean on the forced-direct route** — it emits the human table banner and `Page N of M` before the JSON payload. The default MCP route is cleaner.

## 3. The commands you will actually run

```bash
# create
lanonasis memory create -t "Title" -c "Body" --type project --tags a,b
lanonasis memory create --content-file ./notes.md -t "Title"
lanonasis memory create --json '{"title":"T","content":"C","memory_type":"project","tags":["a"]}'
lanonasis memory create -i                       # interactive

# list  (page/limit/sort/order)
lanonasis memory list -l 5 --output json
lanonasis memory list -p 2 -l 20 --sort updated_at --order desc

# search (semantic; threshold default 0.55)
lanonasis memory search "query terms" -l 5 --json
lanonasis memory search "query" --threshold 0.7 --type knowledge --ci

# get / update / delete
lanonasis memory get <id>
lanonasis memory update <id> -t "New title"
lanonasis memory delete <id>                     # -f/--force to skip confirm

# topics
lanonasis topic list
lanonasis topic create -t "Topic name"

# session continuity (agent-friendly)
lanonasis memory save-session -t "Session summary" --tags run,cli
lanonasis memory list-sessions -l 10
lanonasis memory load-session <id>
```

`memory` also accepts alias `mem`; `list`→`ls`, `create`→`add`, `get`→`show`, `delete`→`rm`.

> ⚠️ **Known defect — `memory list --type <x>` is a silent no-op.** Verified 2026-09-30 on 3.11.2: `--type project` returns rows of every type, and a nonsense value returns the full unfiltered set with no error. Do not rely on `--type` for `list`; filter client-side or use `search --type`.

## 4. Command surface (verified 3.11.2)

**Top level:** `init`, `auth`, `mcp`, `mcp-server`, `memory`, `repl`, `topic`, `config`, `org`, `api-keys`, `prescan`, `completion`, `dashboard`, `documentation`, `sdk`, `api`, `deploy`, `service`, `status`, `whoami`, `health`, `docs`.

Aliases (verified): `memory|mem`, `topic|topics`, `org|organization`, `api-keys|keys`, `health|check`, `dashboard|dash`, `documentation|doc`, `api|rest`, `deploy|deployment`, `service|services`.

Binaries from `package.json`: `lanonasis`, `onasis`, `lanonasis-mcp`. `memory`/`maas` are commander root aliases, **not** installed bins.

**`memory` subcommands:** `create|add`, `save-session`, `list-sessions`, `load-session <id>`, `delete-session <id>`, `list|ls`, `search <query...>`, `get|show <id>`, `update <id>`, `delete|rm <id>`, `stats` (admin only), `intelligence`, `behavior`.

**`memory intelligence`:** `health-check`, `suggest-tags <memory-id>`, `find-related <memory-id>`, `detect-duplicates`, `extract-insights`, `analyze-patterns`.

**`memory behavior`:** `record`, `recall`, `suggest` — learned workflow-pattern intelligence.

> ⚠️ **Known defects — `memory intelligence`.** Verified 2026-10-04 on 3.11.2. Every subcommand is served by the Supabase edge functions on **both** routes: `--no-mcp` changes the transport, not the backend, so the results below are the same with or without it.

| Subcommand | Result (2026-10-04) | Notes |
|---|---|---|
| `health-check` | works | `recommendations` can come back as one string wrapped in a ` ```json ` fence instead of a list |
| `suggest-tags <id>` | works | `--max` is not honoured: `--max 3` returned 5 |
| `find-related <id>` | works | semantic; the source memory is returned as its own top match (similarity ~1.0) |
| `detect-duplicates` | **fails**: `canceling statement due to statement timeout` | succeeds when narrowed, e.g. `--memory-types reference` |
| `extract-insights` | **fails**: `Internal server error` on every call, any options | server bug, fix in Onasis-CORE #139 (not deployed as of this date) |
| `analyze-patterns` | works | `insights` can come back as one fenced string, as with `health-check` |

- **Always pass `--no-mcp` when scripting `memory intelligence`.** On the default route the command prints its result and then **does not exit**: the MCP connection it opened stays up (observed >45 s, killed by hand). With `--no-mcp` it exits normally.
- `--json` output is preceded by a spinner line (`- Detecting duplicates...`); strip everything before the first `{`.
- The MCP **tools** of the same name (`intelligence_suggest_tags`, `intelligence_find_related`, …, called by an MCP client rather than this CLI) are a different implementation in mcp-core with different defects: as of 2026-10-04 `suggest_tags` by id and `find_related` fail with `organization_id is required for non-master memory reads` (fix in mcp-core #48, not deployed).

**`mcp`:** `connect`, `disconnect`, `status`, `tools`, `call <tool>`, `memory`, `config`, `start`, `diagnose`.
**`mcp-server`:** `init`.
**`config`:** `set`, `get`, `show`, `list`, `set-url`, `test`, `discover`, `endpoints`, `set-endpoint <type> <url>` (`auth|memory|mcp-http|mcp-ws|mcp-sse`), `clear-overrides`, `validate`, `backup`, `restore`, `reset`.
**`prescan`:** `run <path>` (`--exclude`, `--json`, `--save`, `--fail-on none|quarantined|flagged`, `--ci`), `status`. Reports are value-stripped by design.
**`auth`:** `login` (`-e/--email`, `-p/--password`, `-k/--vendor-key`), `logout`, `status`, `diagnose`.

## 5. Which route are you on? (the dataset differs)

Memory ops default to the MCP route; `--no-mcp` forces the direct API. **The two routes do not return the same rows.**

| Route | Endpoint | `memory list` total (measured 2026-09-30) |
|---|---|---|
| default (MCP) | `mcp.lanonasis.com/api/v1` → mcp-core | **868** |
| `--no-mcp` (direct) | `api.lanonasis.com` → Supabase edge functions | **927** |

Measured cause: the direct route fenced by organization only, while the MCP route additionally fenced by `user_id`. The 59-row gap was other users' `scope=organization`, `access_mode=shared` memories. Both routes read the same table in the same project. (Fixed in mcp-core 2026-09-30 — the MCP route now reads org-wide too, so the totals converge. Re-measure before citing any count.)

An earlier revision warned that `--no-mcp` + memory → HTTP 500 against a vendor AI proxy. **That no longer reproduces**: `GET /api/v1/memories` returns 405 (`Use POST`), the CLI then falls back to `POST /api/v1/memory/list` → 200. `list`, `get`, and `search` all work on the forced-direct route.

## 6. Diagnosing "it's broken"

```bash
lanonasis status                 # API URL, auth state, user/role
lanonasis health                 # auth + API connectivity + MCP server + config location
lanonasis config validate        # config sanity
lanonasis config endpoints       # effective service endpoints
lanonasis config discover        # re-discover endpoints
lanonasis config clear-overrides # drop manual endpoint overrides
lanonasis auth diagnose
lanonasis mcp diagnose
```

Observed healthy-but-uneven baseline (2026-09-30): `health` reported API **connected**, MCP server **⚠️ disconnected**, org `org-admin`, plan `enterprise`, config found. MCP-disconnected while memory calls still succeed is normal for the direct route.

## 7. Field contract: `memory_type` vs `type`

- Wire format is **`memory_type`** everywhere the CLI talks to MaaS: REST client `src/utils/api.ts`, server schema `src/types/memory-aligned.ts`, CLI MCP server `src/mcp/server/lanonasis-server.ts`, mem-intel-sdk MCP server.
- `type` is accepted as an **alias only by the Supabase Edge Function layer**: `memory-create` (`body.memory_type || body.type`) and `memory-search` (`url.searchParams.get("type")`).
- The CLI `--type` flag / `--json '{"type": ...}'` input is coerced to `memory_type` before send (`src/commands/memory.ts:681-690`).
- Search rows may return `type`; the CLI normalizes to `memory_type` (`src/commands/memory.ts:1170`).
- Create/update and GET-list requests use `memory_type`; the current REST client does not add a `type` alias (`src/utils/api.ts`). The POST-list fallback in `getMemories` also sends **only `memory_type`** for the type filter, without `type`. Never send `type` *instead of* `memory_type`.
- Read-path divergence to be aware of: mcp-core filters `.eq('type', …)` while the edge filters `.eq('memory_type', …)` on the same table.

## 8. Safety

- Never print raw vendor keys, tokens, API keys, passwords, or prescan findings. Value-stripped reports only.
- State the endpoint before any live check; no destructive commands without explicit user request.
- Docs tests and smoke tests prove a slice, not end-to-end reliability.
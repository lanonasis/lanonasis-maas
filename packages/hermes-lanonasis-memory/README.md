# LanOnasis Memory Provider for Hermes

A Hermes Agent `MemoryProvider` plugin backed by the LanOnasis
Memory-as-a-Service (MaaS) API. Conforms to the
[Hermes Memory Provider contract](https://hermes-agent.nousresearch.com/docs/developer-guide/memory-provider-plugin).

## Installation

Three install paths — pick whichever suits your setup. All three
converge on the same `register(ctx)` entry point, but **only the
directory-symlink path (Option B) is seen by `hermes memory setup`**
today (Hermes' memory discovery scans `$HERMES_HOME/plugins/` on disk;
it does not read the `hermes_agent.plugins` entry-point group).

> **Always run `scripts/verify-install.sh` after installing.** It checks
> both the runtime import and on-disk discovery, and prints exactly which
> path is broken if one is.

### Option A — pip-install (entry-point registration)

```bash
# inside the Hermes venv
pip install -e /path/to/hermes-lanonasis-memory
```

Registers the `hermes_agent.plugins` entry point so `hermes plugins list`
shows the plugin. **This alone is not enough for `hermes memory status`**
— pair it with Option B's symlink.

> Entry-point format: `lanonasis = "hermes_lanonasis_memory"` (the MODULE,
> not `module:register`). The plugin manager calls `ep.load()` and then
> looks up `.register` on the result; pointing at `:register` makes
> `ep.load()` return the function itself, which breaks discovery with
> "no register() function" warnings.

### Option B — flat symlink into the user plugins dir (required for discovery)

```bash
# NOTE: flat path, and target the INNER package dir (contains __init__.py).
# The nested ~/.hermes/plugins/memory/<name>/ layout is NOT scanned.
mkdir -p ~/.hermes/plugins
ln -s /absolute/path/to/hermes-lanonasis-memory/hermes_lanonasis_memory \
      ~/.hermes/plugins/lanonasis
```

`hermes memory setup` / `hermes memory status` route through
`plugins.memory.discover_memory_providers()`, which scans
`$HERMES_HOME/plugins/<name>/__init__.py` for the literal strings
`MemoryProvider` / `register_memory_provider`. The symlink target must be
the package directory whose root holds `__init__.py`.

### Option C — install from GitHub / Git URL

From the Hermes dashboard plugin installer, or pip:

```bash
pip install "git+https://github.com/lanonasis/lanonasis-maas.git#subdirectory=packages/hermes-lanonasis-memory"
```

`owner/repo/path/to/plugin` shorthand (e.g. `lanonasis/lanonasis-maas/
packages/hermes-lanonasis-memory`) also works in the dashboard's
"Install from GitHub / Git URL" field. After install, still add the
Option B symlink so discovery sees it. Only user-installed plugins under
`~/.hermes/plugins/` can be removed from the dashboard.

### Verify discovery

```bash
hermes memory status    # lanonasis appears under "Installed plugins"
hermes plugins list     # full provider entry, hooks, and tool list
scripts/verify-install.sh   # asserts both import + discovery paths
```

## Configuration

```bash
hermes memory setup lanonasis
```

You will be prompted for:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `api_url` | URL | yes | defaults to `https://api.lanonasis.com` |
| `api_key` | secret | yes | stored in `$HERMES_HOME/.env` as `LANONASIS_API_KEY` |
| `organization_id` | UUID | no | optional team isolation |
| `project_scope` | tag | no | applied to every stored memory |
| `subject_id_strategy` | enum | no | `current_user` (default) or `explicit` |
| `subject_id` | UUID | if explicit | required when strategy is `explicit` |
| `tool_policy` | enum | no | model-callable tools: `read_only` (default), `write`, or `full_access` |
| `privacy_mode` | bool | no | enables PII masking in addition to credential redaction |
| `embedding_model` | string | no | enables profile-mismatch detection |

Secrets go to `$HERMES_HOME/.env` (mode `0600`). Non-secret values go to
`$HERMES_HOME/plugins/lanonasis/config.json` (mode `0600`).

To configure non-interactively (the `--rest` flag does not exist in this
Hermes version; write the non-secret config file directly instead):

```bash
hermes config set memory.provider lanonasis
: "${HERMES_HOME:?Set HERMES_HOME to the active Hermes profile directory}"
umask 077
touch "$HERMES_HOME/.env" && chmod 600 "$HERMES_HOME/.env"
sed '/^LANONASIS_API_KEY=/d' "$HERMES_HOME/.env" > "$HERMES_HOME/.env.tmp"
printf '%s\n' 'LANONASIS_API_KEY=<your-key>' >> "$HERMES_HOME/.env.tmp"
mv "$HERMES_HOME/.env.tmp" "$HERMES_HOME/.env"

# Non-secret defaults -> $HERMES_HOME/plugins/lanonasis/config.json
mkdir -p "$HERMES_HOME/plugins/lanonasis" && chmod 700 "$HERMES_HOME/plugins/lanonasis"
cat > "$HERMES_HOME/plugins/lanonasis/config.json" <<'EOF'
{
  "api_url": "https://api.lanonasis.com",
  "tool_policy": "read_only",
  "privacy_mode": false
}
EOF
chmod 600 "$HERMES_HOME/plugins/lanonasis/config.json"
```

## Tool Schemas

| Tool | Policy | Description |
|------|--------|-------------|
| `memory_search` | all | Semantic search over persistent memory (uses `POST /api/v1/memories/search`) |
| `memory_get` | all | Retrieve a specific memory by UUID |
| `memory_store` | `write`, `full_access` | Save important information (uses `POST /api/v1/memories`) |
| `memory_forget` | `full_access` only | Delete a memory by UUID |

`tool_policy` controls tools exposed directly to the model. It defaults to
`read_only`, and direct dispatch also fails closed if a hidden tool name is
called manually. `full_access` is an explicit operator capability grant; the
current Hermes provider API does not provide a per-call confirmation prompt for
external provider tools. Automatic lifecycle hooks such as `sync_turn` remain
active independently of this tool-exposure policy.

Schema payloads only include `name`, `description`, and `parameters`.
Internal result annotations (`_security`, `_formatted_context`) live in
TOOL RESULTS, never in the schema, per the
[context-engine contract](https://hermes-agent.nousresearch.com/docs/developer-guide/context-engine-plugin).

## Hooks Implemented

- `system_prompt_block` — static capability instructions only; recalled data is
  returned exclusively by `prefetch()`
- `prefetch(query, *, session_id="") -> str` — returns the recall block; never raises
- `queue_prefetch(query, *, session_id="")` — post-turn pre-warm hook (no-op)
- `sync_turn(user, assistant, *, session_id="", messages=None)` — non-blocking (`< 50 ms`),
  daemon-thread chain where a new worker waits for the previous worker
- `on_session_end(messages)` — non-blocking reasoning flush in the background
- `on_pre_compress(messages) -> str` — writes a summary memory and returns the summary text
- `shutdown()` — drains all tracked background writes (≤ 10 s) and closes the HTTP client

## Data Storage & Off-Device Data

This provider is a **cloud (off-device)** backend. What is sent to
`api.lanonasis.com`:

| Path | Sent off-device | Notes |
|------|-----------------|-------|
| `memory_store(title, content, memory_type)` | title + content (always) | secrets redacted before send (always-on credential strip); **only default-remote write path** |
| `sync_turn(user_content, assistant_content)` | both messages (off only with opt-in) | by default local-only; opt-in via `LANONASIS_HERMES_REMOTE_RAW_TURNS=1`. redaction + PrivacyGuard PII pass (`privacy_mode=true`) |
| `memory_search(query)` | the query string | credentials are redacted; PII is masked when `privacy_mode=true` |
| `on_pre_compress(messages)` | nothing off-device | the summary is local `working_context` only — pre-compress never writes remotely |
| `on_session_end` | at most one synthesis (opt-in) | local `summary` by default; opt-in remote via `LANONASIS_HERMES_REMOTE_SESSION_SUMMARY=1`. The reasoning flush (subject id) is unchanged |

**Always-on credential redaction** runs before any off-device send.
Setting `privacy_mode: true` also masks emails / phones / SSNs from
the payload. PII-masking is opt-in.

Search queries and stored content are stripped of known credentials before
transmission; when `privacy_mode=true`, PII is masked as well. Tool **results**
returned to the model pass through defensive HTML escaping, a prompt-injection
filter, and a `CONTEXT BLOCK` wrapper before they reach the system prompt.

### What gets stored where (H2 write policy)

Every write carries a **scope envelope** so the remote bank is searchable
and the local working state is separable from canonical knowledge.

| Event | Default destination | Remote only with |
|-------|---------------------|------------------|
| Explicit `memory_store` tool call | local + remote (canonical) | (always) |
| Raw turn (`sync_turn`) | local `raw_event` | `LANONASIS_HERMES_REMOTE_RAW_TURNS=1` |
| Pre-compress summary (`on_pre_compress`) | local `working_context` | **never** |
| Session-end synthesis (`on_session_end`) | one local `summary` | `LANONASIS_HERMES_REMOTE_SESSION_SUMMARY=1` |

### Scope envelope

Every **remote** write carries these fields in `metadata`:

```jsonc
{
  "scope_type": "project",          // personal | project | workspace | agent | session | organization
  "scope_id":   "lanonasis-monorepo",
  "source":     "hermes",
  "memory_class": "canonical",      // canonical | raw_event | session_context | summary | conclusion | profile | working_context
  "visibility": "private",          // private | project | organization | shared
  "session_id": "<hermes-session>",
  "source_memory_id": null          // optional, for promotions from local → remote
}
```

and the same fields are mirrored as tags for indexability:

```
source:hermes
scope:project:lanonasis-monorepo
class:canonical
```

`project` scope is derived from `git rev-parse --show-toplevel` of the
current working directory (no `shell=True` — list-form subprocess with a
2-second timeout, cached per path). Operators can override via
`LANONASIS_HERMES_SCOPE_TYPE` / `LANONASIS_HERMES_SCOPE_ID`. The safe
default when no project context is available is `("agent", "agent:hermes")`.

Caller tags are merged in (de-duped, order-preserving). The legacy
literal titles `Context (user)`, `Context (assistant)`,
`Session summary (pre-compress)`, `user turn`, `response`, and
`pre-compaction` are **rejected** at the `memory_store` boundary with
a clear error asking for a descriptive title.

A process-local dedup guard (last 50 remote writes, sha256 of content +
normalized title) skips identical repeats and debug-logs same-session
title collisions.

**Local cache.** `LocalMemoryStore` keeps a per-profile SQLite FTS5
file at `$HERMES_HOME/workspace/lanonasis-memory.db` and is the
default destination for every non-explicit hook. Rows carry the
`source:hermes`, `scope:<type>:<id>`, and `class:<memory_class>` tags
so the FTS5 search can filter by envelope.

**Replay fallback.** `LocalFallbackWriter` writes a JSONL file per UTC
day to `$HERMES_HOME/workspace/memory/YYYY-MM-DD.jsonl` (mode `0600`,
directory `0700`). The file holds only payloads the API refused (the
explicit `memory_store` tool is the only path that can still hit the
remote bank by default). It is replayed on the next `initialize()`;
entries that succeed are marked `_replayed: true` and never re-sent.

**Never logs.** The provider never logs message contents — only
operational warnings (`[lanonasis] handle_tool_call(memory_search) raised: …`).

## Profile Isolation

This provider refuses to run without a `hermes_home`:

```text
RuntimeError: LanonasisMemoryProvider.initialize() requires `hermes_home`
```

This is deliberate. The previous behaviour silently defaulted to
`~/.hermes`, which caused cross-profile leakage in the user's 8-profile
setup. With this version, all paths (config file lookup, fallback
directory, save target) derive from the active `$HERMES_HOME` passed by
the MemoryManager.

## Testing

```bash
pip install -e ".[test]"
python -m pytest tests/
```

The suite enforces the contract:

- `register(ctx)` registers exactly one provider with a `MemoryProvider`
  ABC instance.
- `is_available()` makes **zero** network calls.
- `sync_turn()` returns in `< 50 ms` even with a slow API.
- `handle_tool_call()` returns a JSON string for known and unknown tools.
- `prefetch()` returns a string and accepts `session_id=` as a kwarg.
- Model-callable tools default to search/get, and disabled write/delete calls
  fail closed without network traffic.
- `system_prompt_block()` never retains or duplicates prefetched recall.
- Fallback files land inside `$HERMES_HOME/workspace/memory`, never
  beneath a hardcoded `~/.hermes` literal (static source check).

## Security Pipeline (Phase 2)

These run on the recall path regardless of `privacy_mode`:

1. `redact_secrets()` — credential redaction (OpenAI / Anthropic / AWS /
   GitHub / Stripe / private keys / database URLs / JWTs).
2. `looks_like_prompt_injection()` — filters memory content that tries to
   override the system prompt.
3. `format_recalled_memories()` — wraps output in a defensive `CONTEXT
   BLOCK` so the model treats recalled memories as data, never instructions.
4. `detect_embedding_profile_mismatch()` — warns when stored memories
   used a different embedder than the current query.
5. `escape_memory_for_prompt()` — HTML-escapes memory content before it
   enters the system prompt.

## Hooks Reference

```python
register(ctx)  # top-level entry; ctx.register_memory_provider(LanonasisMemoryProvider())
```

See [`hermes_lanonasis_memory/provider.py`](hermes_lanonasis_memory/provider.py)
for the full implementation; section headers map 1:1 to the contract
hooks table in the docs.

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
| `memory_store(title, content, memory_type)` | title + content (always) | secrets redacted before send (always-on credential strip) |
| `sync_turn(user_content, assistant_content)` | both messages (always) | redaction + PrivacyGuard PII pass (`privacy_mode=true`) |
| `memory_search(query)` | the query string | credentials are redacted; PII is masked when `privacy_mode=true` |
| `on_pre_compress(messages)` | the last ~10 turns (truncated to 200 chars each) | the summariser is local; the storage of the summary is off-device |
| `on_session_end` | the resolved subject id | no message bodies |

**Always-on credential redaction** runs before any off-device send.
Setting `privacy_mode: true` also masks emails / phones / SSNs from
the payload. PII-masking is opt-in.

Search queries and stored content are stripped of known credentials before
transmission; when `privacy_mode=true`, PII is masked as well. Tool **results**
returned to the model pass through defensive HTML escaping, a prompt-injection
filter, and a `CONTEXT BLOCK` wrapper before they reach the system prompt.

**Local cache.** `LocalFallbackWriter` writes a JSONL file per UTC day
to `$HERMES_HOME/workspace/memory/YYYY-MM-DD.jsonl` (mode `0600`,
directory `0700`). The file holds only payloads the API refused.
It is replayed on the next `initialize()`; entries that succeed are
marked `_replayed: true` and never re-sent.

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

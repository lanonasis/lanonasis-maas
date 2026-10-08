# Cleanup of legacy Hermes-written memories

> **Read this before doing anything destructive.** This document is a
> *plan*, not an action. It gives the operator the read-only
> identification queries and the non-destructive remediation choice.
> Per the operator direction in the closeout brief, no production data
> was mutated by the H2 write-policy refactor, and none should be
> mutated by this document either.

## Background

Before the H2 write-policy refactor (this release), the plugin wrote
~20 junk rows per active session into the remote MaaS bank, titled
like:

* `Context (user)`
* `Context (assistant)`
* `Session summary (pre-compress)`
* `user turn`
* `response`
* `pre-compaction` / `pre-compaction summary`

The legacy classifier (`_STORE_SIGNALS` with the `credential` class)
selected many chatty turns for storage, and `on_pre_compress` always
wrote a `Session summary (pre-compress)` row. None of these carried
tags. The `memory_type` field was always `context`. The remote bank
ended up with hundreds of these rows and they were unsearchable.

The H2 refactor (this release) prevents *new* junk from being
written. This document tells you how to find the *old* junk without
deleting anything.

## Recommended remediation: re-tag, do not delete

The non-destructive option is to **re-tag** matching rows with
`class:legacy_context` and `visibility: private` so they drop out of
the active search index but remain recoverable. The MaaS API exposes
`PATCH /api/v1/memories/{id}` for this; the operator can dry-run the
query first and then run a single re-tag pass with a clear audit log.

> We do NOT recommend hard deletion as the first move. Legacy content
> is accepted (per the operator direction) — never panic-deleted.

## Read-only identification queries

These queries are read-only. They are the dry-run before any
mutation. They run against the remote MaaS bank using the existing
operator credentials.

### 1. Title-regex query (preferred)

A single search call whose query matches the legacy title patterns.
The MaaS `/api/v1/memories/search` endpoint does full-text search over
title + content, so an OR of the title patterns is a good first cut:

```bash
# Dry-run. The response is JSON; pipe through jq to count.
curl -sS \
  -H "Authorization: Bearer $LANONASIS_API_KEY" \
  -H "X-Lanonasis-Client-Id: hermes" \
  -G "https://api.lanonasis.com/api/v1/memories/search" \
  --data-urlencode 'query="Context (user)" OR "Context (assistant)" OR "Session summary (pre-compress)" OR "user turn" OR response OR "pre-compact" OR "pre-compaction"' \
  --data-urlencode 'limit=200' \
  | jq '.memories | length, .memories[].title'
```

Expected output: a number of rows whose titles match the regex set in
`scope.JUNK_TITLE_PATTERNS` and an enumerated list of the matches.

### 2. Memory-type / tag filter (supplementary)

For workspaces where the FTS search above is too noisy, use a
type-filter list. The MaaS endpoint may not expose tag-filtered search
in every version, so this is a fallback:

```bash
# List memories of type=context, paginated, newest first.
for page in 1 2 3 4 5; do
  curl -sS \
    -H "Authorization: Bearer $LANONASIS_API_KEY" \
    -H "X-Lanonasis-Client-Id: hermes" \
    "https://api.lanonasis.com/api/v1/memories?type=context&page=$page&per_page=100" \
    | jq '.memories[] | select(.tags == null or (.tags | length == 0)) | {id, title, created_at}'
done
```

This catches every `context` row that has no tags, which is the
"unsearchable junk" signature.

### 3. Empty-tags + metadata-source filter (most precise)

The pre-H2 `_run_sync_turn` payload always wrote
`metadata.source = "hermes_sync_turn"` and `metadata.role` =
`user|assistant`, and `_start_background_store` always wrote
`metadata.source = "hermes_on_pre_compress"`. Filter on those exact
metadata fields for a precise identification:

> The MaaS public API may not expose metadata filtering in every
> version. The pattern below shows the *shape* of the filter; adapt
> to whatever query DSL the live API exposes.

```python
# Operator-side helper — does NOT mutate; only lists ids.
import os, json, urllib.request

api_key = os.environ["LANONASIS_API_KEY"]
sentinels = {
    "metadata.source": ["hermes_sync_turn", "hermes_on_pre_compress"],
}
# Iterate pages and return ids whose metadata matches.
# (Trim the loop body to the live API's actual schema.)
```

### 4. Cross-check via the local FTS5 store

The local store at
`$HERMES_HOME/workspace/lanonasis-memory.db` is the source of truth
for new junk-shaped rows going forward (the H2 refactor writes raw
turns, working contexts, and session summaries into the local store
with proper envelope tags). Use it to confirm the H2 refactor is
working:

```bash
sqlite3 "$HERMES_HOME/workspace/lanonasis-memory.db" \
  "SELECT title, substr(content, 1, 80), created_at
     FROM memories
     WHERE tags LIKE '%class:raw_event%'
        OR tags LIKE '%class:working_context%'
        OR tags LIKE '%class:summary%'
     ORDER BY created_at DESC
     LIMIT 30;"
```

You should see titles like:

* `raw_event (user) abc12345`  (local only, by default)
* `working_context 2026-10-08 (pre-compress)`  (local only, always)
* `summary 2026-10-08 (session-end)`  (local only, by default)

You should NEVER see a row titled `Session summary (pre-compress)`.

## Re-tag procedure (the non-destructive option)

Once the dry-run has produced an `id` list, run a single re-tag pass:

```bash
# Re-tag every match as class:legacy_context / visibility: private.
# Replace <id> with the ids from the dry-run; do NOT use this loop
# without first reading the audit list.
for id in <id1> <id2> <id3>; do
  curl -sS -X PATCH \
    -H "Authorization: Bearer $LANONASIS_API_KEY" \
    -H "Content-Type: application/json" \
    -H "X-Lanonasis-Client-Id: hermes" \
    "https://api.lanonasis.com/api/v1/memories/$id" \
    -d '{"tags": ["class:legacy_context", "visibility:private", "source:hermes", "retired:2026-10-08"], "metadata": {"retired_at": "2026-10-08T00:00:00Z", "retired_reason": "pre-h2-junk-title"}}'
done
```

After re-tagging, the rows drop out of any
`tags ∋ "class:canonical"` or
`tags ∋ "class:raw_event"` search filter and are visible only to
explicit `memory_get` calls or `tag:retired:2026-10-08` searches.

## Hard delete (NOT recommended)

If, after a re-tag grace period of at least 30 days, the operator
wants to hard-delete the re-tagged rows, the call is:

```bash
curl -sS -X DELETE \
  -H "Authorization: Bearer $LANONASIS_API_KEY" \
  -H "X-Lanonasis-Client-Id: hermes" \
  "https://api.lanonasis.com/api/v1/memories/<id>"
```

We do not document a one-liner for bulk delete on purpose. Each row
should be a deliberate operator action.

## What this plugin will NOT do

* The H2 refactor will never read, query, mutate, or delete rows
  matching the legacy junk patterns. Legacy content is accepted
  per the operator direction.
* The plugin will not enable a "cleanup" tool or command. The
  queries above are operator-side scripts.
* The plugin will not run any of the queries in this document.

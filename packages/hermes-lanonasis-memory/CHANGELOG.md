# Changelog

All notable changes to `hermes-lanonasis-memory` are documented in this file.

## [0.3.0] — 2026-10-08

### H2 write-policy refactor

The remote MaaS bank was being polluted by 20+ rows titled like
`Context (user)`, `Context (assistant)`, and `Session summary (pre-compress)`
per active session — unsearchable junk caused by the
`sync_turn` and `on_pre_compress` hooks auto-storing every turn that
passed a "store signal" classifier. This release rewrites the write
policy per the operator direction in
`docs/Voyage Semantic Retrieval Baseline` (see also
`docs/cleanup-legacy-hermes-memories.md`).

### Added

- `hermes_lanonasis_memory/scope.py` — scope envelope, dedup guard,
  and project-scope resolution helpers.
- Every **remote** write now carries a scope envelope in both
  `metadata` and as tags:
  `source:hermes`, `scope:<scope_type>:<scope_id>`, `class:<memory_class>`.
  Caller-supplied tags are merged in (de-duped, order-preserving).
- `memory_class` taxonomy: `canonical`, `raw_event`, `session_context`,
  `summary`, `conclusion`, `profile`, `working_context`.
- `scope_type` taxonomy: `personal`, `project`, `workspace`, `agent`,
  `session`, `organization`. `project` is derived from
  `git rev-parse --show-toplevel` of the current working directory
  (list-form `subprocess.run` with a 2-second timeout — no `shell=True`).
  Operators can override via `LANONASIS_HERMES_SCOPE_TYPE` and
  `LANONASIS_HERMES_SCOPE_ID`. The safe default is
  `("agent", "agent:hermes")`.
- `visibility` (`private` default, also `project`, `organization`, `shared`)
  is carried in the envelope; the explicit `memory_store` tool accepts
  a `visibility` argument.
- `source_memory_id` is plumbed through the envelope for local → remote
  promotions.
- A process-local `DedupGuard` (last 50 remote writes, sha256 of content
  + normalized title) skips identical repeats and debug-logs
  same-session title collisions.
- The explicit `memory_store` tool rejects legacy junk titles with a
  clear error: `Context`, `Context (...)`, `Session summary`,
  `Session summary (pre-compress)`, `user turn`, `response`,
  `pre-compact*` (case-insensitive regex set).

### Changed

- **`sync_turn` is local-only by default.** Raw turns are written to
  the local FTS5 store as `memory_class=raw_event`. The remote bank is
  only touched when `LANONASIS_HERMES_REMOTE_RAW_TURNS=1` is set
  (explicit opt-in for the few workflows that actually need the
  raw turn on the MaaS side).
- **`on_pre_compress` is local-only, always.** The summary is still
  returned as a string (the contract with the compression prompt is
  unchanged), but the local-only write uses `memory_class=working_context`
  and a date-suffixed title. The literal
  `Session summary (pre-compress)` title is no longer emitted.
- **`on_session_end` writes at most ONE local synthesis** per session
  (`memory_class=summary`). The remote write is opt-in via
  `LANONASIS_HERMES_REMOTE_SESSION_SUMMARY=1`; when opted in, the
  title is a real synthesis title
  (`Hermes session <date> — <project>: <first meaningful topic>`).
- The `credential` store-signal class was removed from `_STORE_SIGNALS`.
  A turn that mentions an `api_key=…`, `secret=…`, or `token=…` is no
  longer selected for storage (even as `raw_event`). Credential
  redaction is unaffected.
- `_tool_store` payload now carries the envelope + caller tags and
  writes the on-disk fallback when the API call fails (preserves the
  local-first / never-lose contract).
- `LocalMemoryStore` SQLite connection is now
  `check_same_thread=False` so the background write threads can use
  the same store. The brief FTS5 add path is still serialized by
  SQLite at the file level.

### Migration

- Existing remote memories that match the junk-title regexes above
  are **not** touched by this release. The operator can run the
  read-only identification queries in
  `docs/cleanup-legacy-hermes-memories.md` to triage. The recommended
  non-destructive action is to re-tag them as
  `class:legacy_context / visibility: private` rather than delete.
- Set the new H2 env vars in your active Hermes profile's `.env` only
  if you want raw turns or session summaries to leave the local
  store.

### Tests

- +30 new tests in `tests/test_write_policy.py` covering the scope
  envelope, local-by-default turn writes, pre-compress local-only,
  session-end at-most-one, junk-title rejection, dedup guard,
  redaction wiring, and project-scope resolution.
- 190 passed, 3 skipped in `hermes-lanonasis-memory/tests/`
  (up from 160/3 baseline). Context-engine and secret-source suites
  unchanged (22 passed, 10 skipped).
- `gitleaks dir packages/hermes-lanonasis-memory --redact --no-banner`
  shows only the 4 known fixture hits in `tests/test_security.py`.

## [0.2.0] — 2026-10-08 (fix/hermes-packages-restore baseline)

Restored the three Hermes Python packages after the IDE-extension PR
displaced them. See the `fix/hermes-packages-restore` branch for the
roll-up. CI: `hermes-python-packages` pytest job green.

## feat(pi-lanonasis-memory): MaaS sync layer via @lanonasis/memory-client (5/6)

Part 5/6 of pi-memory Layer 1 (LANA-2026-10-06).

Implements the PR5 contract: explicit-only sync by default with `LANONASIS_PI_MEMORY_AUTO_SYNC=1` opt-in; a SQLite-backed FIFO queue with exponential backoff (capped at 300s); a MaaS client wrapper around `createNodeMemoryClient`; a health probe; and a drain worker with `flush()` for `session_shutdown`.

### Changes

| File | What |
|---|---|
| `src/sync/policy.ts` | `SyncOrigin` + `shouldSync(origin, env)`. Explicit always; auto only when `LANONASIS_PI_MEMORY_AUTO_SYNC==='1'`. |
| `src/sync/sync-queue.ts` | FIFO SQLite queue (`sync_queue`, `sync_queue_dropped`, `sync_meta`). Backoff `min(2^attempts, 300)`s. 4xx (except 408/429) drops; 5xx/408/429/network retries. Errors are redacted with the same `redactContent()` the scanner uses before they land in SQLite. |
| `src/sync/maas-client.ts` | `createMaasClient(env)` returns `null` when `LANONASIS_API_KEY` is absent. Forces `preferCLI: false` (memory-client's CLI path shell-interpolates `title`/`content` into `exec` — injection vector). Always appends `source:pi-lanonasis-memory` tag. |
| `src/sync/health.ts` | Probes every 60s (default) but only while `depth > 0`. Timers `unref()`'d. |
| `src/sync/worker.ts` | 1/sec drain; `onSynced(localId, maasId)` callback (PR4 will wire to `MemoryStore.markSynced`); `flush(timeoutMs)`; `stop()`. Never throws. |
| `src/store/memory.ts` | Adds `markSynced(id, maasId, syncedAt?)` — the only edit to this file permitted by the ownership contract. |
| `tests/sync/*.test.ts` | 63 new tests. |

### Tests

- Before: **133** passing
- After:  **196** passing (+63 sync tests)
- `npx vitest run` green
- `npx tsc --noEmit --skipLibCheck` clean
- `bun run build` clean (`dist/sync/*.{js,d.ts}` produced)

### Security notes for VERA

- **Where the key is read:** `createMaasClient()` reads `LANONASIS_API_KEY` (and optionally `LANONASIS_API_URL`) from `process.env` and forwards it directly to `createNodeMemoryClient({ apiKey, … })`. The key is never written to disk, never logged, and never placed on the `SyncQueue` `payload` column.
- **What is sent over the wire:** title, content, the user-supplied `tags`, the mapped `memory_type`, the local row id as `metadata.continuity_key` (so re-syncs are idempotent), and the auto-appended `source:pi-lanonasis-memory` tag. The request body is built by memory-client and sent over `fetch` to `LANONASIS_API_URL` (default `https://api.lanonasis.com`).
- **What is persisted locally:** only the memory fields the operator already approved (title/content/tags/type) and two bookkeeping columns (`maas_id`, `maas_synced_at`). The dropped-log (`sync_queue_dropped.last_error`) and the live queue (`sync_queue.last_error`) both pass through `redactContent()` so any API key that ever leaks into an upstream error message is masked before the SQLite write. A dedicated test (`sync-queue.test.ts → "dropped row's last_error is sanitized"`) pins this contract.
- **CLI path disabled:** memory-client's `preferCLI: true` would shell-interpolate title and content into an `exec` call against `onasis`/`lanonasis` CLIs. We force `preferCLI: false` and rely on the API path so the scanner's content contract is preserved end-to-end.
- **`createMaasClient` returns `null` when no key is present** rather than throwing. The worker simply does not drain until the operator sets a key — this matches the LANA-2026-10-06 operator decision ("queue accumulates, nothing throws").

### Deviations from the contract

- `SyncQueue.enqueue(input, dueAt = Date.now())` adds an optional `dueAt` so tests can pin backoff math. Production callers omit it; the row is still due immediately on the first worker tick.
- `SyncQueue.markFailed(err, status?, id?, now?)` likewise takes an optional `id` (the row returned by `next()`) and `now` for the same reason. Without an id, the head due row is used.
- `HealthMonitor.tick()` is exposed so tests and the wiring layer can force a probe on session_start.
- `bun.lock` and `package.json` are intentionally untouched — PR1 owns those, and the current `package.json` already pins `vitest ^5.0.3` which the local `bun install` resolves against `vite ^7` (the `bun.lock` snapshot in `origin/main` is stale and triggers the frozen-lockfile error in CI today; that's a pre-existing condition, not a regression of this PR).

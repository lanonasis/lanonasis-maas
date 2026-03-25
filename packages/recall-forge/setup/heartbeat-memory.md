# RecallForge — HEARTBEAT.md Snippet

Paste this section into your workspace HEARTBEAT.md to add periodic MaaS health monitoring.

---

## RecallForge Health

Check LanOnasis MaaS connectivity and memory stats:

```
openclaw lanonasis status
```

Expected: `Status: ok | v1.0.0 | project: <project-id>`

If status returns an error:

| Error | Cause | Action |
|-------|-------|--------|
| `ETIMEDOUT` | Network issue or DNS resolution failure | Plugin forces IPv4 via undici — restart the agent if it persists |
| `401 Unauthorized` | API key expired or revoked | Regenerate at the LanOnasis dashboard, update `openclaw.json` |
| `503 Service Unavailable` | MaaS backend down | Local fallback active — memories written to `workspace/memory/YYYY-MM-DD.md` |

### Memory Stats Check

```
openclaw lanonasis stats
```

Monitor for:
- Memory count trending upward (healthy capture)
- No memories added in 7+ days (capture may be broken or `captureMode` is `explicit`)
- Type distribution — mostly `context` suggests capture filter is too loose

### Context Engine Check

When the agent loads, confirm both slots appear in the startup log:

```
[recall-forge] Ready — slots: memory+contextEngine | ...
```

If `contextEngine` is missing from the log, check that `"contextEngine": "recall-forge"` is declared in your `plugins.slots` config.

### Alert Conditions

| Condition | Severity | Action |
|-----------|----------|--------|
| MaaS unreachable for 3+ heartbeats | WARN | Check network, verify API key |
| Zero memories stored in 7+ days | INFO | Review `captureMode`, check hooks |
| Memory count > 1000 with no cleanup | INFO | Consider archival or type-based pruning |
| `[recall-forge]` not in plugin startup log | ERROR | Plugin may not have loaded — check `openclaw.json` and `allow` list |

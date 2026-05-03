# Troubleshooting — @lanonasis/claude-memory

## Diagnosis Checklist

Run these in order before deeper investigation:

```bash
# 1. Verify API key is set
echo $LANONASIS_API_KEY

# 2. Check connectivity and memory count
claude-memory status

# 3. Check offline queue
claude-memory spool

# 4. Verify hooks are installed in Claude Code settings
cat ~/.claude/settings.json | grep -A 20 '"hooks"'
```

---

## Issue: `claude-memory: command not found`

**Cause:** The package binary is not registered in the system PATH.

**Fix A — bun link (monorepo/local install):**
```bash
cd /path/to/packages/claude-memory
bun link
```

**Fix B — global npm install:**
```bash
npm install -g @lanonasis/claude-memory
```

**Fix C — direct invocation (no install needed):**
```bash
node /path/to/packages/claude-memory/dist/cli.js status
```

**Verify:**
```bash
which claude-memory
claude-memory --help
```

---

## Issue: `LANONASIS_API_KEY not set`

**Cause:** The environment variable is not exported in the shell running Claude Code.

**Fix — temporary (current shell only):**
```bash
export LANONASIS_API_KEY=lano_<your_key>
```

**Fix — persistent (all shells):**
Add to your shell startup file (e.g., `~/.zshrc`, `~/.bashrc`, or a sourced secrets file):
```bash
export LANONASIS_API_KEY=lano_<your_key>
```

Then reload:
```bash
source ~/.zshrc
```

**Verify:**
```bash
claude-memory status
```

---

## Issue: `Disconnected: ...` on `claude-memory status`

**Possible causes:**

1. **Network unreachable** — check DNS and firewall for `api.lanonasis.com`
2. **Invalid API key** — key may be revoked or malformed
3. **Rate limit** — too many requests in a short period
4. **IPv6 issue** — undici is configured for IPv4; if routing is misconfigured, requests may fail

**Diagnosis:**
```bash
# Test direct API connectivity
curl -H "X-API-Key: $LANONASIS_API_KEY" https://api.lanonasis.com/v1/health

# Check spool to see if offline queue is growing
claude-memory spool
```

**If the API is down but you have a spool backlog:** memories are safe locally. Run `claude-memory drain` once connectivity is restored.

---

## Issue: Hooks not firing (no memories being stored)

**Check 1 — settings.json has hooks entries:**
```bash
cat ~/.claude/settings.json | python3 -m json.tool | grep -A 5 "Stop"
```

Expected output includes entries for `Stop`, `SubagentStop`, `PreCompact`, `PreToolUse`.

**Check 2 — hook scripts exist:**
```bash
ls -la ~/.lanonasis/hooks/
```

Expected: `stop.sh`, `subagent_stop.sh`, `precompact.sh`, `pretooluse.sh` (all executable).

**Check 3 — hook scripts are executable:**
```bash
chmod +x ~/.lanonasis/hooks/*.sh
```

**Fix — re-run install:**
```bash
cd packages/claude-memory
bun run install-hooks
```

**Check 4 — hook scripts reference correct dist path:**
```bash
cat ~/.lanonasis/hooks/stop.sh
```

The path to `cli.js` or the hook entry must point to where the package is actually installed.

---

## Issue: `[undefined]` type in `claude-memory search` results

**Cause:** Older versions of the MaaS API return `memory_type` instead of `type` on list/search responses.

**Fix:** Update to the latest version of `@lanonasis/claude-memory` — the CLI now handles both field names:
```typescript
m.type ?? m.memory_type ?? "unknown"
```

If already on latest, the `?` score and `[unknown]` type indicate the MaaS response is missing similarity/type fields for those specific records.

---

## Issue: Recall not injecting context into new sessions

**Check 1 — Are there memories stored?**
```bash
claude-memory list
```

If empty, Stop hooks haven't captured any sessions yet. Run a full Claude Code session and check again.

**Check 2 — Recall threshold may be too high:**
Default threshold is `0.7`. If stored memories don't match the session's opening prompt closely enough, recall returns nothing. Lower via `CLAUDE_MEMORY_SEARCH_THRESHOLD=0.5` (if the config supports it).

**Check 3 — Stale recall lock:**
If the PreToolUse hook ran once but recall failed silently, the lock file may be preventing a retry:
```bash
ls ~/.lanonasis/.recall-lock/
# If files from old sessions exist:
rm ~/.lanonasis/.recall-lock/<stale_session_id>
```

**Check 4 — Hook response format:**
The PreToolUse hook must return `{"assistantMessage": "..."}`. Check hook script output manually:
```bash
echo '{"session_id":"test","tool_name":"Bash","tool_input":{}}' | ~/.lanonasis/hooks/pretooluse.sh
```

---

## Issue: Spool growing but `drain` failing

**Check API key is set:**
```bash
echo $LANONASIS_API_KEY
claude-memory drain
```

**Inspect spool entries:**
```bash
cat ~/.lanonasis/maas-spool/claude-code/*.ndjson | head -5
```

**Manual retry with verbose output:**
```bash
LANONASIS_API_KEY=lano_<key> claude-memory drain
```

**Clear corrupt spool entries** (last resort — entries will be lost):
```bash
rm ~/.lanonasis/maas-spool/claude-code/*.ndjson
```

---

## Issue: `invalid_credential` or `401` from auth-gateway

**Cause:** The LanOnasis auth-gateway `introspectIdentity` returned an error. This typically means:
- The API key was not found in `security_service.api_keys`
- The user associated with the key has no `organization_id`

**Diagnosis:**
```bash
curl -H "X-API-Key: $LANONASIS_API_KEY" https://api.lanonasis.com/v1/auth/status
```

If the response is `401 invalid_credential`, contact LanOnasis support to verify your API key is active and your account has an organization assigned.

If the response is `503 gateway_unavailable`, it indicates a server-side configuration issue — not a client problem.

---

## Debug Mode

To see raw hook output during a session, run Claude Code with debug flags:

```bash
claude --debug
```

Hook stdout/stderr appears in the debug log. Look for entries from `stop.sh`, `pretooluse.sh`, etc.

---

## Resetting Hook Installation

To remove all installed hooks and start fresh:

```bash
# Remove hook scripts
rm -rf ~/.lanonasis/hooks/

# Restore original settings.json from backup
cp ~/.claude/settings.json.bak ~/.claude/settings.json

# Re-run install
cd packages/claude-memory
bun run install-hooks
```

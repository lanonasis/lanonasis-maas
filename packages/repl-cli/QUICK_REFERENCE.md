# 🚀 AI Router Quick Reference

## Validate AI Router is Working

### 1. Run Health Check
```bash
onasis-repl health
```

### 2. Watch Live Logging
```bash
onasis-repl start 2>&1 | tee session.log
```

**Look for:**
- ✅ `[LZero] ✓ Processed (XXms)` - Router working!
- ⚠️ `[LZero] Using enhanced mode` → `[OpenAI]` - Fallback triggered
- ⚠️ `Falling back to pattern matching` - Both failed

### 3. Check Logs
```bash
# Search for fallback events
grep -i "router\|fallback\|failed" session.log

# Count success vs fallback
echo "LZero Primary: $(grep -c '\[LZero\] ✓ Processed' session.log)"
echo "LZero Backup: $(grep -c 'Backup' session.log)"
echo "Pattern Matching: $(grep -c 'pattern matching' session.log)"
```

---

## Log File Locations

| Type | Location | How to Capture |
|------|----------|----------------|
| **CLI Console** | stdout/stderr | `onasis-repl start > log.txt 2>&1` |
| **Server Logs** | `logs/app.log` | Check server deployment |
| **Turbo Logs** | `.turbo/turbo-*.log` | Monorepo builds |

---

## Fallback Flow

```
User Query
    ↓
[AI Router] ← Primary (ai.vortexcore.app)
    ↓ ✗ Failed?
[OpenAI] ← Fallback 1 (api.openai.com)
    ↓ ✗ Failed?
[Pattern Matching] ← Fallback 2 (Local)
```

---

## Test Scenarios

### Test 1: Normal Operation
```bash
onasis-repl start
> "Hello"
# Should show: [AI Router] ✓ Success
```

### Test 2: Force OpenAI Fallback
```bash
onasis-repl start --ai-router http://invalid
> "Hello"
# Should show: [LZero] Using enhanced mode → [OpenAI]
```

### Test 3: Force Local Fallback
```bash
unset OPENAI_API_KEY AI_ROUTER_API_KEY
onasis-repl start
> "Hello"
# Should show: Falling back to pattern matching
```

---

## Key Metrics

| Metric | Command | Good Value |
|--------|---------|------------|
| **Success Rate** | `grep -c '\[AI Router\] ✓' log.txt` | >95% |
| **Fallback Rate** | `grep -c '\[OpenAI\]' log.txt` | <5% |
| **Avg Latency** | Check timestamps in logs | <500ms |

---

## Environment Variables

```bash
# Set AI Router
export AI_ROUTER_API_KEY="your-key"
export AI_ROUTER_URL="https://ai.vortexcore.app"

# Set OpenAI fallback
export OPENAI_API_KEY="sk-..."
export OPENAI_MODEL="gpt-4o-mini"

# Enable debug logging
export DEBUG=lanonasis:*
export LOG_LEVEL=debug
```

---

## Troubleshooting Commands

```bash
# Check current config
onasis-repl status

# Test AI Router connectivity
curl -H "X-API-Key: $AI_ROUTER_API_KEY" https://ai.vortexcore.app/health

# View last 10 fallback events
grep -i "fallback\|failed" session.log | tail -10

# Count requests by type
echo "Router: $(grep -c '\[AI Router\]' session.log)"
echo "OpenAI: $(grep -c '\[OpenAI\]' session.log)"
echo "Local: $(grep -c 'pattern matching' session.log)"
```

---

## Enhanced Logging Output Example

```
💭 Hello
[AI Router] Attempting primary endpoint...
[AI Router] ✓ Success (145ms)

Hey there! 👋 I'm LZero, your memory assistant...

💭 What do I know about TypeScript?
[AI Router] Attempting primary endpoint...
[LZero] Using enhanced mode (5000ms)
  → Falling back to OpenAI...
[OpenAI] Using fallback endpoint...
[OpenAI] ✓ Success (890ms)

Based on your memories, here's what I found...
```

---

**📝 Full documentation**: See `AI_ROUTER_VALIDATION.md`

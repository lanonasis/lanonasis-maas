# 🔄 AI Router Validation Guide

## Overview

The REPL CLI uses a **tiered AI fallback system**:

```
AI Router (Primary) → OpenAI (Fallback 1) → Local Pattern Matching (Fallback 2)
```

---

## 🎯 How to Validate AI Router is Working

### Method 1: Use the `health` Command

```bash
onasis-repl health
```

**Expected Output:**
```
- Checking AI endpoints...
✔ Health check complete: 2/3 healthy

AI Router (Primary):    ✓ Healthy   (45ms)
OpenAI (Fallback):      ✓ Healthy   (120ms)
Local Pattern Matching: ✓ Available

Status: All systems operational
```

### Method 2: Enable Verbose Logging

Start REPL with debug output:

```bash
DEBUG=* onasis-repl start
```

**Look for these indicators:**

✅ **AI Router Working:**
```
AI Router: Using primary endpoint
AI Router response received (XXms)
```

⚠️ **Fallback to OpenAI:**
```
AI Router request failed, falling back to OpenAI: [error]
OpenAI API: Using fallback
```

⚠️ **Fallback to Local:**
```
⚠️  AI Router authentication failed.
  Falling back to pattern matching...
```

### Method 3: Check Response Metadata

When AI Router responds, it includes metadata:

```typescript
// In orchestrator.ts response
{
  onasis_metadata?: {
    service: 'ai-router',
    use_case: 'repl-nlp',
    privacy_level: 'standard',
    vendor_masked: boolean
  }
}
```

---

## 📊 Log File Locations

### CLI Logs (Console Output)

The REPL CLI logs to **stdout/stderr** by default. To capture logs:

```bash
# Save all output to file
onasis-repl start > repl-session.log 2>&1

# Or use tee to see and save
onasis-repl start 2>&1 | tee repl-session.log
```

### Server-Side Logs (AI Router)

If you're running the AI Router locally, check:

```bash
# Main application logs
apps/lanonasis-maas/logs/app.log

# AI Router specific logs
apps/lanonasis-maas/logs/ai-router.log

# Turbo logs (if using monorepo)
apps/lanonasis-maas/.turbo/turbo-*.log
```

### Environment Variable for Logging

Set verbose logging:

```bash
export DEBUG=lanonasis:*
export LOG_LEVEL=debug  # or info, warn, error
```

---

## 🔍 Fallback Flow Validation

### Test 1: AI Router Working (Normal Flow)

```bash
onasis-repl start
> "Remember that I prefer TypeScript"
```

**Expected Console Output:**
```
Processing...
✓ Memory created: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

**Log Indicator:**
```
AI Router: Request successful (XXms)
```

---

### Test 2: Force Fallback to OpenAI

```bash
# Start with invalid AI Router URL
onasis-repl start --ai-router http://invalid-url

> "What do I know about my projects?"
```

**Expected Console Output:**
```
Processing...
AI Router request failed, falling back to OpenAI: ...
[Response from OpenAI]
```

---

### Test 3: Force Fallback to Local Pattern Matching

```bash
# Start without any AI keys
unset OPENAI_API_KEY
unset AI_ROUTER_API_KEY
onasis-repl start

> "hello"
```

**Expected Console Output:**
```
Hey there! 👋 I'm LZero, your memory assistant. What can I help you with today?
```

**Log Indicator:**
```
No AI service available, using pattern matching
```

---

## 🛠️ Enhanced Logging (Add to Code)

To add detailed fallback logging, modify `orchestrator.ts`:

```typescript
// In callOpenAI() method, line ~512
if (this.aiRouterClient) {
  console.log(chalk.cyan('[AI Router]') + chalk.gray(' Attempting primary endpoint...'));
  const startTime = Date.now();
  
  try {
    const response = await this.aiRouterClient.chat({...});
    const latency = Date.now() - startTime;
    console.log(chalk.green('[AI Router]') + chalk.gray(` Success (${latency}ms)`));
    message = response.message;
    toolCalls = message.tool_calls;
  } catch (error) {
    const latency = Date.now() - startTime;
    console.log(chalk.yellow('[AI Router]') + chalk.red(` Failed (${latency}ms): ${error.message}`));
    console.log(chalk.gray('  → Falling back to OpenAI...'));
  }
}

// In OpenAI fallback, line ~530
if (!message && this.openaiApiKey) {
  console.log(chalk.cyan('[OpenAI]') + chalk.gray(' Using fallback endpoint...'));
  const startTime = Date.now();
  
  // ... OpenAI call ...
  
  const latency = Date.now() - startTime;
  console.log(chalk.green('[OpenAI]') + chalk.gray(` Success (${latency}ms)`));
}
```

---

## 📈 Monitoring Efficiency

### Key Metrics to Track

| Metric | How to Measure | Target |
|--------|----------------|--------|
| **AI Router Success Rate** | `(AI Router successes / Total requests) * 100` | >95% |
| **Fallback Rate** | `(Fallback requests / Total requests) * 100` | <5% |
| **Average Latency** | Sum of all request times / count | <500ms |
| **Error Rate** | `(Failed requests / Total requests) * 100` | <1% |

### Quick Health Check Script

```bash
#!/bin/bash
# ai-router-monitor.sh

echo "=== AI Router Health Monitor ==="
echo ""

# Test 1: Health endpoint
echo "1. Testing health endpoint..."
curl -s https://ai.vortexcore.app/health | jq '.'

# Test 2: Response time
echo ""
echo "2. Testing response time..."
time curl -s -X POST https://ai.vortexcore.app/api/v1/ai-chat \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $AI_ROUTER_API_KEY" \
  -d '{"messages":[{"role":"user","content":"Hello"}]}' > /dev/null

echo ""
echo "3. Check REPL logs for fallback events:"
grep -i "fallback\|failed" repl-session.log | tail -10
```

---

## 🐛 Troubleshooting

### AI Router Not Responding

**Symptoms:**
- Console shows "AI Router request failed"
- All requests fall back to OpenAI

**Check:**
1. API key is set: `echo $AI_ROUTER_API_KEY`
2. Router URL is correct: `echo $AI_ROUTER_URL`
3. Network connectivity: `curl -v https://ai.vortexcore.app/health`

**Fix:**
```bash
export AI_ROUTER_API_KEY="your-key-here"
export AI_ROUTER_URL="https://ai.vortexcore.app"
```

---

### Fallback Always Triggered

**Symptoms:**
- Always using OpenAI or local pattern matching
- AI Router never used

**Check:**
```bash
# In REPL, run status
onasis-repl status

# Check configuration
cat ~/.lanonasis/repl-config.json
```

**Fix:**
```bash
# Re-login with correct credentials
onasis-repl login

# Or specify AI Router explicitly
onasis-repl start --ai-router https://ai.vortexcore.app --token YOUR_TOKEN
```

---

### Logs Not Showing Expected Output

**Symptoms:**
- No "AI Router" or "Fallback" messages in logs

**Fix:**
```bash
# Enable verbose logging
export DEBUG=lanonasis:*
export LOG_LEVEL=debug

# Run with output capture
onasis-repl start 2>&1 | tee debug-session.log
```

---

## 📝 Summary

| Check | Command | Expected Result |
|-------|---------|-----------------|
| **Health** | `onasis-repl health` | 2/3 or 3/3 healthy |
| **Verbose** | `DEBUG=* onasis-repl start` | Shows AI Router attempts |
| **Logs** | `grep -i "router\|fallback" *.log` | Shows fallback events |
| **Config** | `onasis-repl status` | Shows AI Router URL |

**AI Router is working if:**
- ✅ Health check shows "Healthy"
- ✅ Verbose logs show "AI Router: Success"
- ✅ No fallback messages in logs
- ✅ Response times < 500ms average


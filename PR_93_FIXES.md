# PR #93 Code Review Fixes - Implementation Guide

## Status Summary

**Date:** February 1, 2026
**PR:** #93 - CLI UX Improvements
**Current State:** ✅ All tests passing, ✅ Build succeeds with 0 errors

---

## Completed Fixes (9/13)

### ✅ 1. oauth-client.ts - Memory Leak in Tests

**Status:** FIXED
**File:** `cli/src/__tests__/mocks/oauth-client.ts`

### ✅ 2. init.ts - forEach Expression Body

**Status:** FIXED
**File:** `cli/src/commands/init.ts`

### ✅ 3. mcp.ts - Config Init Outside Try/Catch

**Status:** FIXED
**File:** `cli/src/commands/mcp.ts`

### ✅ 4. memory.ts - Empty Content Validation

**Status:** FIXED
**File:** `cli/src/commands/memory.ts`

### ✅ 5. memory.ts - DefaultContent Not Forwarded

**Status:** VERIFIED - NO CHANGE NEEDED
**File:** `cli/src/commands/memory.ts`

### ✅ 6. ConnectionManager.test.ts - Kill Mock Return Value

**Status:** FIXED
**File:** `cli/src/ux/__tests__/ConnectionManager.test.ts`

### ✅ 7. ConnectionManager.test.ts - Unused mockPaths

**Status:** FIXED
**File:** `cli/src/ux/__tests__/ConnectionManager.test.ts`

### ✅ 10. ConnectionManagerImpl.ts - Constructor Config Loading

**Status:** VERIFIED - init() method exists and is called
**File:** `cli/src/ux/implementations/ConnectionManagerImpl.ts`

### ✅ 12. TextInputHandlerImpl.ts - Block Scope for 'right' Case

**Status:** FIXED
**File:** `cli/src/ux/implementations/TextInputHandlerImpl.ts`

### ✅ 13. README.md - Missing Language Identifier

**Status:** FIXED
**File:** `cli/src/ux/README.md`

---

## Remaining Fixes (3/13)

### ⚠️ Issue #8: stopLocalServer Listener Accumulation

**File:** `cli/src/ux/implementations/ConnectionManagerImpl.ts` (lines 324-348)

**Problem:**

```typescript
async stopLocalServer(): Promise<void> {
  if (this.serverProcess) {
    return new Promise((resolve) => {
      const forceKillTimeout = setTimeout(() => {
        if (this.serverProcess) {
          this.serverProcess.kill('SIGKILL');
        }
      }, 5000);

      this.serverProcess!.on('exit', () => {  // ⚠️ Uses .on() - accumulates listeners
        clearTimeout(forceKillTimeout);
        this.serverProcess = null;
        if (this.connectionStatus.serverInstance) {
          this.connectionStatus.serverInstance.status = 'stopped';
        }
        this.connectionStatus.isConnected = false;
        resolve();
      });

      this.serverProcess!.kill('SIGTERM');
    });
  }
}
```

**Issue:**

- Using `.on('exit')` instead of `.once('exit')` can accumulate listeners if stopLocalServer is called multiple times
- If the process doesn't exit within 5 seconds, the timeout fires but the listener remains

**Fix:**

```typescript
async stopLocalServer(): Promise<void> {
  if (this.serverProcess) {
    return new Promise((resolve) => {
      const forceKillTimeout = setTimeout(() => {
        if (this.serverProcess) {
          this.serverProcess.kill('SIGKILL');
        }
      }, 5000);

      this.serverProcess!.once('exit', () => {  // ✅ Use .once() instead of .on()
        clearTimeout(forceKillTimeout);
        this.serverProcess = null;
        if (this.connectionStatus.serverInstance) {
          this.connectionStatus.serverInstance.status = 'stopped';
        }
        this.connectionStatus.isConnected = false;
        resolve();
      });

      this.serverProcess!.kill('SIGTERM');
    });
  }
}
```

**Impact:** Low - Only affects scenarios where stopLocalServer is called multiple times

---

### ⚠️ Issue #9: Undefined PID Handling

**File:** `cli/src/ux/implementations/ConnectionManagerImpl.ts` (line 237)

**Problem:**

```typescript
const serverInstance: ServerInstance = {
  pid: serverProcess.pid!, // ⚠️ Non-null assertion - pid can be undefined
  port: this.config.serverPort || 3000,
  status: 'starting',
  startTime: new Date(),
  logPath: join(dirname(this.configPath), 'mcp-server.log'),
};
```

**Issue:**

- `serverProcess.pid` can be `undefined` if the process hasn't spawned yet
- Using non-null assertion (`!`) bypasses TypeScript's safety checks
- Could cause runtime errors when accessing `pid` later

**Fix:**

```typescript
const serverInstance: ServerInstance = {
  pid: serverProcess.pid ?? 0, // ✅ Provide default value
  port: this.config.serverPort || 3000,
  status: 'starting',
  startTime: new Date(),
  logPath: join(dirname(this.configPath), 'mcp-server.log'),
};
```

Or better yet, check explicitly:

```typescript
if (!serverProcess.pid) {
  reject(new Error('Failed to get process ID for server'));
  return;
}

const serverInstance: ServerInstance = {
  pid: serverProcess.pid,
  port: this.config.serverPort || 3000,
  status: 'starting',
  startTime: new Date(),
  logPath: join(dirname(this.configPath), 'mcp-server.log'),
};
```

**Impact:** Low - Most spawned processes will have a PID, but edge cases exist

---

### ⚠️ Issue #11: TextInputHandler Cleanup on Error

**File:** `cli/src/ux/implementations/TextInputHandlerImpl.ts` (lines 100-104)

**Problem:**

```typescript
// Store handlers for special key processing
(this as any)._completeHandler = complete;
(this as any)._cancelHandler = cancel;

process.stdin.on('data', handleKeypress);  // Line 100 - Listener registered
} catch (error) {
  this.disableRawMode();  // ⚠️ Only disables raw mode, doesn't remove listener
  reject(error);
}
```

**Issue:**

- If an error is thrown after line 100, the listener is not removed
- This can cause memory leaks and unexpected behavior
- The `cleanup()` function exists but isn't called in the catch block

**Fix:**

```typescript
// Store handlers for special key processing
(this as any)._completeHandler = complete;
(this as any)._cancelHandler = cancel;

process.stdin.on('data', handleKeypress);
} catch (error) {
  cleanup();  // ✅ Call cleanup() instead of just disableRawMode()
  reject(error);
}
```

**Impact:** Low - Only affects error scenarios, but important for proper cleanup

---

## Implementation Plan

### Step 1: Fix Issue #8 (stopLocalServer)

1. Open `cli/src/ux/implementations/ConnectionManagerImpl.ts`
2. Navigate to line 337
3. Change `.on('exit')` to `.once('exit')`
4. Run tests: `npm test`
5. Verify ConnectionManager.test.ts passes

### Step 2: Fix Issue #9 (PID Handling)

1. Open `cli/src/ux/implementations/ConnectionManagerImpl.ts`
2. Navigate to line 237
3. Add explicit check for undefined PID
4. Run tests: `npm test`
5. Verify ConnectionManager.test.ts passes

### Step 3: Fix Issue #11 (TextInputHandler Cleanup)

1. Open `cli/src/ux/implementations/TextInputHandlerImpl.ts`
2. Navigate to line 102
3. Change `this.disableRawMode()` to `cleanup()`
4. Run tests: `npm test`
5. Verify TextInputHandler.test.ts passes

### Step 4: Final Verification

1. Run full test suite: `npm test`
2. Run build: `npm run build`
3. Verify 0 errors
4. Update PRE_MERGE_FIXES.md with completion status

---

## Testing Checklist

- [x] ConnectionManager.test.ts passes (16 tests)
- [x] TextInputHandler.test.ts passes
- [x] OnboardingFlow.test.ts passes
- [x] Build succeeds with 0 errors
- [ ] Issue #8 fix verified
- [ ] Issue #9 fix verified
- [ ] Issue #11 fix verified
- [ ] All tests pass after fixes
- [ ] Build succeeds after fixes

---

## Notes

- All three remaining issues are low-impact edge cases
- Current implementation is functional and all tests pass
- Fixes improve code robustness and follow best practices
- No breaking changes to public APIs
- Backward compatible

---

## Time Estimate

| Task      | Estimated Time  |
| --------- | --------------- |
| Fix #8    | 5 minutes       |
| Fix #9    | 10 minutes      |
| Fix #11   | 5 minutes       |
| Testing   | 5 minutes       |
| **Total** | **~25 minutes** |

---

**Last Updated:** February 1, 2026
**Status:** 9/13 fixes complete, 3 remaining
**Next Action:** Implement remaining 3 fixes

# PR #93 Refactoring Plan

## Overview

This document tracks all refactoring tasks identified in the PR #93 code review comments.

## Status: In Progress

---

## Issues to Fix

### 1. ✅ oauth-client.ts - Memory Leak in Tests

**File:** `cli/src/__tests__/mocks/oauth-client.ts`
**Issue:** In-memory `storedKey` variable can leak between tests
**Fix:** Update `ApiKeyStorage.initialize()` to reset `storedKey = undefined`
**Status:** FIXED

### 2. ✅ init.ts - forEach Expression Body

**File:** `cli/src/commands/init.ts`
**Issue:** forEach callback uses expression-body arrow that returns a value
**Fix:** Change to block-body arrow `forEach((issue) => { console.log(...); })`
**Status:** FIXED

### 3. ✅ mcp.ts - Config Init Outside Try/Catch

**File:** `cli/src/commands/mcp.ts`
**Issue:** `await config.init()` is outside try/catch, bypassing error handling
**Fix:** Move `await config.init()` inside the try block
**Status:** FIXED

### 4. ✅ memory.ts - Empty Content Validation

**File:** `cli/src/commands/memory.ts`
**Issue:** Update flow doesn't validate empty title/content
**Fix:** Add non-empty checks before constructing updateData
**Status:** FIXED

### 5. ✅ memory.ts - DefaultContent Not Forwarded

**File:** `cli/src/commands/memory.ts`
**Issue:** defaultContent not passed to TextInputHandler in inline mode
**Fix:** Already implemented - defaultContent is passed on line 118
**Status:** VERIFIED - NO CHANGE NEEDED

### 6. ✅ ConnectionManager.test.ts - Kill Mock Return Value

**File:** `cli/src/ux/__tests__/ConnectionManager.test.ts`
**Issue:** forEach callback in kill mock returns a value (code smell)
**Fix:** Use block-bodied arrow and return true after loop
**Status:** FIXED

### 7. ✅ ConnectionManager.test.ts - Unused mockPaths

**File:** `cli/src/ux/__tests__/ConnectionManager.test.ts`
**Issue:** mockPaths array computed but never used
**Fix:** Remove unused mockPaths construction
**Status:** FIXED

### 8. ⚠️ ConnectionManagerImpl.ts - stopLocalServer Listener Accumulation

**File:** `cli/src/ux/implementations/ConnectionManagerImpl.ts`
**Issue:** Accumulating 'exit' listeners and orphaned timeouts (lines 324-348)
**Fix:** Use `once` instead of `on`, add pendingStop promise state
**Status:** NEEDS FIX - Current code uses `.on('exit')` which can accumulate listeners

### 9. ⚠️ ConnectionManagerImpl.ts - Undefined PID Handling

**File:** `cli/src/ux/implementations/ConnectionManagerImpl.ts`
**Issue:** serverProcess.pid may be undefined (line 237), needs explicit handling
**Fix:** Check for undefined pid and handle appropriately
**Status:** NEEDS FIX - Current code uses `pid: serverProcess.pid!` with non-null assertion

### 10. ✅ ConnectionManagerImpl.ts - Constructor Config Loading

**File:** `cli/src/ux/implementations/ConnectionManagerImpl.ts`
**Issue:** Constructor never restores persisted settings
**Fix:** Call loadConfig() in constructor or require async init()
**Status:** VERIFIED - init() method exists (line 56-58) and is called in connectLocal (line 67)

### 11. ⚠️ TextInputHandlerImpl.ts - Cleanup on Error

**File:** `cli/src/ux/implementations/TextInputHandlerImpl.ts`
**Issue:** stdin listener not removed if error thrown after registration (line 100)
**Fix:** Call cleanup() in catch block instead of just disableRawMode()
**Status:** NEEDS FIX - catch block (line 102-104) only calls disableRawMode(), doesn't remove listener

### 12. ✅ TextInputHandlerImpl.ts - Block Scope for 'right' Case

**File:** `cli/src/ux/implementations/TextInputHandlerImpl.ts`
**Issue:** currentLineLength declaration leaks into other cases
**Fix:** Wrap case 'right' logic in block { ... }
**Status:** FIXED

### 13. ✅ README.md - Missing Language Identifier

**File:** `cli/src/ux/README.md`
**Issue:** Fenced code block missing language identifier (MD040)
**Fix:** Add language identifier to code fence (```text)
**Status:** FIXED

---

## Testing Checklist

- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Build succeeds with 0 errors
- [ ] No linting errors
- [ ] Manual testing completed

---

## Notes

- All fixes maintain backward compatibility
- No breaking changes to public APIs
- Existing functionality preserved

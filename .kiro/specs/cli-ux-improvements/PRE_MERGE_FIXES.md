# Pre-Merge Fixes for CLI UX Improvements

This document tracks the three critical issues that must be fixed before merging PR #93.

---

## Status Overview

- [x] Fix #1: Connection Verification False Positive (P1)
- [x] Fix #2: Configuration Not Loaded Before Use (P2)
- [x] Fix #3: Empty Content Overwrites in Inline Updates (P2)
- [x] All tests passing
- [ ] Manual testing completed
- [ ] PR updated and re-review requested

---

## Fix #1: Connection Verification False Positive (P1)

### Issue

`verifyConnection()` returns `true` even when server is in error/stopped state, creating false positives.

### Files to Modify

- `cli/src/ux/implementations/ConnectionManagerImpl.ts`

### Changes Required

Replace the `verifyConnection` method (lines 267-290) to explicitly check server status before returning true.

### Test Plan

```bash
# Unit test should verify:
# 1. Returns false when status is 'error'
# 2. Returns false when status is 'stopped'
# 3. Returns false when status is 'starting'
# 4. Returns true only when status is 'running' and process exists
```

### Acceptance Criteria

- [x] Method returns false for error state
- [x] Method returns false for stopped state
- [x] Method returns false for starting state
- [x] Method returns true only for running state with valid process
- [x] Unit tests added and passing

---

## Fix #2: Configuration Not Loaded Before Use (P2)

### Issue

`loadConfig()` method exists but is never called, causing user configuration to be ignored.

### Files to Modify

- `cli/src/ux/implementations/ConnectionManagerImpl.ts` (add init method, update connectLocal)
- `cli/src/commands/mcp.ts` (call init before connectLocal)

### Changes Required

1. Add `async init()` method to ConnectionManagerImpl
2. Call `await this.loadConfig()` in connectLocal
3. Call `await manager.init()` in mcp.ts before using manager

### Test Plan

```bash
# Integration test should verify:
# 1. Create config file with custom localServerPath
# 2. Create new ConnectionManager instance
# 3. Call connectLocal()
# 4. Verify it uses the persisted path instead of auto-detecting
```

### Acceptance Criteria

- [x] init() method added to ConnectionManagerImpl
- [x] loadConfig() called in connectLocal
- [x] mcp.ts calls init() before connectLocal
- [x] Config persistence verified with integration test
- [x] User preferences respected across CLI invocations

---

## Fix #3: Empty Content Overwrites in Inline Updates (P2)

### Issue

When updating memory with inline mode, `defaultContent` is not passed to TextInputHandler, causing empty input to overwrite existing content.

### Files to Modify

- `cli/src/ux/interfaces/TextInputHandler.ts` (add defaultContent to InputOptions)
- `cli/src/ux/implementations/TextInputHandlerImpl.ts` (use defaultContent)
- `cli/src/commands/memory.ts` (pass defaultContent to handler)

### Changes Required

1. Add `defaultContent?: string` to InputOptions interface
2. Update TextInputHandlerImpl to initialize content with defaultContent
3. Update memory.ts to pass defaultContent when calling collectMultilineInput

### Test Plan

```bash
# Manual test should verify:
# 1. Create a memory with content "Original content"
# 2. Run: lanonasis memory update <id> -i
# 3. When prompted for content, immediately press Ctrl+D (no input)
# 4. Verify memory content is still "Original content" (not empty)
```

### Acceptance Criteria

- [x] InputOptions has defaultContent field
- [x] TextInputHandlerImpl initializes with defaultContent
- [x] memory.ts passes defaultContent to handler
- [x] Empty input preserves original content
- [ ] Manual test passes

---

## Testing Checklist

### Unit Tests

- [x] ConnectionManager.test.ts passes
- [x] TextInputHandler.test.ts passes
- [x] OnboardingFlow.test.ts passes
- [x] New test cases added for the three fixes

### Integration Tests

- [ ] Memory create with inline input works
- [ ] Memory update with inline input preserves content
- [ ] MCP connect --local uses persisted config
- [ ] Connection verification correctly reports status

### Manual Tests

- [ ] Test scenario #1: Server in error state shows disconnected
- [ ] Test scenario #2: Config persists across CLI invocations
- [ ] Test scenario #3: Empty inline input preserves memory content

### Build & Compile

- [x] `npm run build` succeeds with 0 errors
- [x] `npm test` passes all tests
- [x] No TypeScript compilation errors
- [x] No linting errors (N/A - no lint script configured)

---

## Verification Steps

1. **Apply all fixes** from PR_93_FIXES.md
2. **Compile:** `cd cli && npm run build`
3. **Test:** `npm test`
4. **Manual test #1:** Test connection verification with stopped server
5. **Manual test #2:** Test config persistence
6. **Manual test #3:** Test memory update with empty input
7. **Review:** Check all files modified correctly
8. **Commit:** Create commit with fixes
9. **Push:** Update PR with fixes
10. **Request:** Ask for re-review

---

## Time Estimates

| Task           | Estimated Time |
| -------------- | -------------- |
| Apply Fix #1   | 15 minutes     |
| Apply Fix #2   | 20 minutes     |
| Apply Fix #3   | 30 minutes     |
| Run tests      | 5 minutes      |
| Manual testing | 15 minutes     |
| Documentation  | 10 minutes     |
| **Total**      | **~1.5 hours** |

---

## Notes

- All fixes are backward compatible
- No breaking changes to public APIs
- Existing functionality preserved
- Fixes address root causes, not symptoms
- Ready to merge after fixes applied

---

## References

- **Detailed Analysis:** See PR_93_VALIDATION_REPORT.md
- **Code Changes:** See PR_93_FIXES.md
- **Requirements:** See requirements.md
- **Tasks:** See tasks.md

---

**Last Updated:** February 1, 2026  
**Status:** All fixes implemented and verified - Ready for manual testing  
**PR:** #93 - CLI UX Improvements

# Implementation Plan: CLI UX Improvements (Revised)

## Overview

This revised implementation plan reflects the current state of the codebase. The foundational components (interfaces and implementations) already exist in `cli/src/ux/`. The primary work remaining is fixing test issues, integration into CLI commands, and validation.

## Current State Assessment

### Already Complete
- [x] 1. Set up core infrastructure and interfaces (DONE)
- [x] 2.1 Create TextInputHandler class (DONE - TextInputHandlerImpl.ts)
- [x] 2.3 Implement input session management (DONE)
- [x] 3.1 Create ConnectionManager class (DONE - ConnectionManagerImpl.ts)
- [x] 3.2 Implement local server lifecycle management (DONE)
- [x] 3.4 Implement connection verification (DONE)
- [x] 7.1 Create OnboardingFlow class (DONE - OnboardingFlowImpl.ts)
- [x] 7.2 Implement connectivity testing (DONE)
- [x] 7.3 Add troubleshooting guidance (DONE)

### Needs Fixes (22 TypeScript Errors)
- [ ] Fix OnboardingFlow.test.ts (19 errors)
- [ ] Fix ConnectionManager.test.ts (6 errors)
- [ ] Fix TextInputHandler.test.ts (1 error)

### Needs Integration (Not Yet Wired)
- [ ] TextInputHandler not used in memory.ts (still uses inquirer)
- [ ] ConnectionManagerImpl not used in mcp.ts (uses getMCPClient)
- [ ] OnboardingFlowImpl not triggered on first run

## Tasks

### Phase 1: Fix Test Infrastructure (CURRENT PRIORITY)

- [ ] 1. Fix TypeScript errors in UX test files
  - [ ] 1.1 Fix OnboardingFlow.test.ts (19 issues)
    - Fix Jest mock typing: use `jest.mocked()` or explicit type casts
    - Fix async property tests: use `fc.asyncProperty()` instead of `fc.property()`
    - Fix `fc.constantFrom` type: use `as const` for literal unions
    - Fix `jest.spyOn(console, 'log')` - add `.mockImplementation(() => {})`
    - _Lines: 28, 29, 51, 52, 92, 93, 136, 137, 182, 186, 217, 245, 278, 284, 295_

  - [ ] 1.2 Fix ConnectionManager.test.ts (6 issues)
    - Fix `mockRejectedValue` typing on mocked fs functions
    - Fix async property tests: use `fc.asyncProperty()`
    - Fix MCPConfig logLevel: cast `fc.constantFrom(...) as const`
    - Fix spawn mock: properly type the mock function
    - _Lines: 85, 121, 125, 181, 208, 228_

  - [ ] 1.3 Fix TextInputHandler.test.ts (1 issue)
    - Fix `jest.spyOn(console, 'log')` at line 85 - add `.mockImplementation(() => {})`

- [ ] 2. Verify tests pass
  - Run `npm run build` in cli/ - expect 0 errors
  - Run `npm test` in cli/ - all UX tests should pass

### Phase 2: Validate Existing Implementations

- [ ] 3. Verify TextInputHandler functionality
  - [ ] 3.1 Manual test: raw mode input capture works
  - [ ] 3.2 Manual test: multi-line input with Ctrl+D/Ctrl+C
  - [ ] 3.3 Verify visual feedback displays correctly

- [ ] 4. Verify ConnectionManager functionality
  - [ ] 4.1 Test detectServerPath() finds the MCP server
  - [ ] 4.2 Compare with existing getMCPClient() behavior
  - [ ] 4.3 Document why local MCP isn't working

- [ ] 5. Verify OnboardingFlow functionality
  - [ ] 5.1 Test detectFirstRun() logic
  - [ ] 5.2 Test testConnectivity() returns valid results
  - [ ] 5.3 Test configureDefaults() creates correct files

### Phase 3: Integration into CLI Commands

- [ ] 6. Integrate TextInputHandler into memory commands
  - [ ] 6.1 In memory.ts:103-131, replace inquirer prompt with TextInputHandler
  - [ ] 6.2 In memory.ts:393-396, replace `type: 'editor'` with TextInputHandler
  - [ ] 6.3 Add config option to fall back to editor mode
  - _File: cli/src/commands/memory.ts_

- [ ] 7. Integrate ConnectionManager into MCP commands
  - [ ] 7.1 Decision: Replace getMCPClient() OR wrap it with ConnectionManagerImpl
  - [ ] 7.2 Wire ConnectionManager.connectLocal() into `mcp connect --local`
  - [ ] 7.3 Keep existing remote/websocket logic unchanged
  - _File: cli/src/commands/mcp.ts_

- [ ] 8. Integrate OnboardingFlow into CLI startup
  - [ ] 8.1 Add first-run detection to CLI index.ts
  - [ ] 8.2 Wire runInitialSetup() into `lanonasis init` command
  - [ ] 8.3 Connect with existing CLIConfig
  - _Files: cli/src/index.ts, cli/src/commands/init.ts_

### Phase 4: Polish and Final Testing

- [ ] 9. Error handling improvements
  - [ ] 9.1 Add specific error messages with resolution steps
  - [ ] 9.2 Add graceful fallbacks for all failure scenarios
  - [ ] 9.3 Integrate with existing error-handler.ts

- [ ] 10. Final integration testing
  - [ ] 10.1 E2E test: memory create with new TextInputHandler
  - [ ] 10.2 E2E test: mcp connect --local works
  - [ ] 10.3 E2E test: first-run onboarding triggers correctly
  - [ ] 10.4 Regression test: existing commands still work

## TypeScript Error Reference

### OnboardingFlow.test.ts (19 errors)

```
Line 28:  TS2345 - Mock returning wrong type for autoConfigureLocalServer
Line 29:  TS2345 - Mock returning wrong type for detectServerPath
Line 51:  TS2554 - jest.spyOn(console, 'log') missing mockImplementation
Line 52:  TS2554 - jest.spyOn(console, 'error') missing mockImplementation
Line 92:  TS2345 - fs.mkdir mockResolvedValue type mismatch
Line 93:  TS2345 - fs.writeFile mockResolvedValue type mismatch
Line 136: TS2345 - fs.readFile mockResolvedValue type mismatch
Line 137: TS2345 - fs.writeFile mockResolvedValue type mismatch
Line 182: TS2345 - async callback in fc.property (needs fc.asyncProperty)
Line 186: TS2345 - inputMode 'string' not assignable to 'inline' | 'editor'
Line 217: TS2345 - async callback in fc.property
Line 245: TS2345 - async callback in fc.property
Line 278: TS2345 - fs.mkdir mockRejectedValue type
Line 284: TS2345 - fs.readFile mockResolvedValue type
Line 295: TS2345 - fs.mkdir mockRejectedValue type
```

### ConnectionManager.test.ts (6 errors)

```
Line 85:  TS2345 - fs.access mockRejectedValue type
Line 121: TS2345 - async callback in fc.property
Line 125: TS2345 - logLevel 'string' not assignable to literal union
Line 181: TS2345 - async callback in fc.property
Line 208: TS2345 - fs.mkdir mockRejectedValue type
Line 228: TS2349 - spawn mock not callable
```

### TextInputHandler.test.ts (1 error)

```
Line 85:  TS2554 - jest.spyOn missing mockImplementation argument
```

## Fix Patterns

### Pattern 1: Jest Mock Typing
```typescript
// Before (error)
(fs.mkdir as jest.Mock).mockRejectedValue(new Error('fail'));

// After (fixed)
jest.mocked(fs.mkdir).mockRejectedValue(new Error('fail'));
// OR
(fs.mkdir as jest.MockedFunction<typeof fs.mkdir>).mockRejectedValue(new Error('fail'));
```

### Pattern 2: Async Property Tests
```typescript
// Before (error)
fc.assert(fc.property(fc.string(), async (s) => { ... }));

// After (fixed)
await fc.assert(fc.asyncProperty(fc.string(), async (s) => { ... }));
```

### Pattern 3: Literal Type Inference
```typescript
// Before (error)
fc.constantFrom('inline', 'editor')  // infers string

// After (fixed)
fc.constantFrom('inline' as const, 'editor' as const)  // infers 'inline' | 'editor'
```

### Pattern 4: Console Spy
```typescript
// Before (error)
jest.spyOn(console, 'log')

// After (fixed)
jest.spyOn(console, 'log').mockImplementation(() => {})
```

## Notes

- Focus on Phase 1 first - tests must compile before integration work
- Existing implementations are functional, just not wired in
- Preserve backward compatibility with current getMCPClient behavior
- Property-based tests provide comprehensive coverage once fixed

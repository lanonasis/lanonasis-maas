# Critical Authentication Persistence Fix

## Problem Identified
The CLI authentication doesn't persist between commands because `CLIConfig` is never initialized with `await config.init()` which loads the saved config from disk.

## Root Cause
In `cli/src/index.ts`:
- Line 36: `const cliConfig = new CLIConfig();` creates instance
- **MISSING**: `await cliConfig.init()` is never called
- Result: Config file `~/.maas/config.json` is never loaded

## Solution
Add `await cliConfig.init()` in the preAction hook so config is loaded before every command.

## Files to Fix

### 1. cli/src/index.ts - Line 48 (in preAction hook)
**Add this line at the start of the preAction hook:**
```typescript
.hook('preAction', async (thisCommand, actionCommand) => {
  // CRITICAL FIX: Initialize config to load saved authentication
  await cliConfig.init();
  
  const opts = thisCommand.opts();
  // ... rest of hook
})
```

### 2. cli/src/index.ts - Line 511 (in status command)
**Add this line at the start of the status action:**
```typescript
.action(async () => {
  // CRITICAL FIX: Initialize config to load saved authentication
  await cliConfig.init();
  
  const isAuth = await cliConfig.isAuthenticated();
  // ... rest of action
})
```

## Testing
After fix:
```bash
# Build CLI
cd cli && npm run build

# Test authentication persistence
lanonasis auth login
# Enter credentials

# Check status (should show "Authenticated: Yes")
lanonasis status

# Test memory command (should work without re-auth)
lanonasis memory list
```

## Impact
- Fixes authentication not persisting between commands
- Enables proper testing of CLI flows
- Unblocks v3.0.2 deployment

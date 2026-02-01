# PR #93 - Required Fixes

This document contains the exact code changes needed to fix the three critical issues identified in the PR review.

---

## Fix #1: Connection Verification False Positive (P1)

**File:** `cli/src/ux/implementations/ConnectionManagerImpl.ts`

**Replace lines 267-290 with:**

```typescript
  /**
   * Verify that the MCP server connection is working
   */
  async verifyConnection(serverPath: string): Promise<boolean> {
    try {
      // Simple verification - check if server path exists and is accessible
      await fs.access(serverPath);

      // If we have a running server instance, check if it's responsive
      if (this.connectionStatus.serverInstance) {
        const { status, pid } = this.connectionStatus.serverInstance;

        // Explicitly check for error/stopped states
        if (status === 'error' || status === 'stopped') {
          return false;
        }

        // Only verify process for running servers
        if (status === 'running') {
          try {
            process.kill(pid, 0); // Signal 0 checks if process exists
            return true;
          } catch {
            // Process doesn't exist despite status being 'running'
            this.connectionStatus.serverInstance.status = 'stopped';
            return false;
          }
        }

        // Starting state is not yet ready
        if (status === 'starting') {
          return false;
        }
      }

      // No server instance means we haven't started it yet
      // This is okay for initial connection attempts
      return true;
    } catch {
      return false;
    }
  }
```

---

## Fix #2: Configuration Not Loaded Before Use (P2)

**File:** `cli/src/ux/implementations/ConnectionManagerImpl.ts`

### Part A: Add init method after constructor

**Add after line 48 (after constructor):**

```typescript
  /**
   * Initialize the connection manager by loading persisted configuration
   */
  async init(): Promise<void> {
    await this.loadConfig();
  }
```

### Part B: Update connectLocal to load config

**Replace lines 54-61 with:**

```typescript
  /**
   * Connect to the local embedded MCP server
   */
  async connectLocal(): Promise<ConnectionResult> {
    try {
      // Load persisted configuration first
      await this.loadConfig();

      // First, try to detect the server path
      const configuredPath = this.config.localServerPath?.trim();
      const serverPath = configuredPath || (await this.detectServerPath());
```

### Part C: Update usage in mcp.ts

**File:** `cli/src/commands/mcp.ts`

**Find this code (around line 130):**

```typescript
        if (connectionMode === 'local' && !options.localArgs && !options.url) {
          const configDir = dirname(config.getConfigPath());
          const manager = createConnectionManager(join(configDir, 'mcp-config.json'));

          if (options.server) {
            await manager.updateConfig({ localServerPath: options.server });
          }

          const result = await manager.connectLocal();
```

**Replace with:**

```typescript
        if (connectionMode === 'local' && !options.localArgs && !options.url) {
          const configDir = dirname(config.getConfigPath());
          const manager = createConnectionManager(join(configDir, 'mcp-config.json'));

          // Initialize manager to load persisted config
          await manager.init();

          if (options.server) {
            await manager.updateConfig({ localServerPath: options.server });
          }

          const result = await manager.connectLocal();
```

---

## Fix #3: Empty Content Overwrites in Inline Updates (P2)

### Part A: Update InputOptions interface

**File:** `cli/src/ux/interfaces/TextInputHandler.ts`

**Replace lines 18-24 with:**

```typescript
export interface InputOptions {
  placeholder?: string;
  defaultContent?: string;
  maxLines?: number;
  submitKeys?: string[];
  cancelKeys?: string[];
  showLineNumbers?: boolean;
}
```

### Part B: Update TextInputHandlerImpl to use defaultContent

**File:** `cli/src/ux/implementations/TextInputHandlerImpl.ts`

**Replace lines 38-50 with:**

```typescript
  /**
   * Collect multi-line text input from the user
   */
  async collectMultilineInput(prompt: string, options?: InputOptions): Promise<string> {
    const mergedOptions = { ...DEFAULT_INPUT_OPTIONS, ...options };

    // Initialize content with defaultContent if provided
    const initialContent = mergedOptions.defaultContent
      ? mergedOptions.defaultContent.split('\n')
      : [''];

    // Create new input session
    this.currentSession = {
      id: `session_${Date.now()}`,
      prompt,
      content: initialContent,
      cursorPosition: {
        line: initialContent.length - 1,
        column: initialContent[initialContent.length - 1].length
      },
      startTime: new Date(),
      options: mergedOptions,
      status: 'active',
    };
```

### Part C: Update memory.ts to pass defaultContent

**File:** `cli/src/commands/memory.ts`

**Replace lines 100-118 with:**

```typescript
const collectMemoryContent = async (
  prompt: string,
  inputMode: InputMode,
  defaultContent?: string,
): Promise<string> => {
  if (inputMode === 'editor') {
    const { content } = await inquirer.prompt<{ content: string }>([
      {
        type: 'editor',
        name: 'content',
        message: prompt,
        default: defaultContent,
      },
    ]);
    return content;
  }

  const handler = createTextInputHandler();
  return handler.collectMultilineInput(prompt, {
    defaultContent,
  });
};
```

---

## Testing the Fixes

After applying all fixes, run these tests:

### 1. Test Fix #1 (Connection Verification)

```bash
cd cli
npm test -- ConnectionManager.test.ts
```

Add this test case to verify the fix:

```typescript
it('should return false when server is in error state', async () => {
  const connectionManager = new ConnectionManagerImpl();
  connectionManager['connectionStatus'].serverInstance = {
    pid: 12345,
    port: 3000,
    status: 'error',
    startTime: new Date(),
    logPath: '/tmp/test.log',
  };

  const isValid = await connectionManager.verifyConnection('/valid/path/server.js');
  expect(isValid).toBe(false);
});

it('should return false when server is stopped', async () => {
  const connectionManager = new ConnectionManagerImpl();
  connectionManager['connectionStatus'].serverInstance = {
    pid: 12345,
    port: 3000,
    status: 'stopped',
    startTime: new Date(),
    logPath: '/tmp/test.log',
  };

  const isValid = await connectionManager.verifyConnection('/valid/path/server.js');
  expect(isValid).toBe(false);
});
```

### 2. Test Fix #2 (Config Loading)

```bash
# Create a test config file
mkdir -p /tmp/test-cli/.lanonasis
echo '{"localServerPath":"/custom/path/server.js"}' > /tmp/test-cli/.lanonasis/mcp-config.json

# Run CLI from that directory
cd /tmp/test-cli
lanonasis mcp connect --local

# Should use /custom/path/server.js instead of auto-detecting
```

### 3. Test Fix #3 (Default Content)

```bash
# Create a memory
lanonasis memory create -t "Test Memory" -c "Original content"

# Update it with inline mode (should preserve content if you just press Ctrl+D)
lanonasis memory update <memory-id> -i

# When prompted for content, immediately press Ctrl+D
# Content should remain "Original content", not become empty
```

### 4. Run Full Test Suite

```bash
cd cli
npm run build
npm test
```

All tests should pass.

---

## Verification Checklist

- [ ] Fix #1 applied to ConnectionManagerImpl.ts
- [ ] Fix #2 Part A applied (init method added)
- [ ] Fix #2 Part B applied (connectLocal updated)
- [ ] Fix #2 Part C applied (mcp.ts updated)
- [ ] Fix #3 Part A applied (InputOptions updated)
- [ ] Fix #3 Part B applied (TextInputHandlerImpl updated)
- [ ] Fix #3 Part C applied (memory.ts updated)
- [ ] All TypeScript compilation errors resolved
- [ ] Unit tests pass
- [ ] Manual testing completed for all three scenarios
- [ ] PR updated with fixes
- [ ] Re-review requested

---

## Estimated Time

- Applying fixes: 30 minutes
- Testing: 30 minutes
- Documentation: 15 minutes
- **Total: ~1.5 hours**

---

## Notes

- All fixes are backward compatible
- No breaking changes to public APIs
- Existing tests should continue to pass
- Consider adding the new test cases shown above for better coverage

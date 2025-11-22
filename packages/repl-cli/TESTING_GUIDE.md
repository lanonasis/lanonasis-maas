# Testing LZero REPL v0.3.1 Enhanced Features

## Installation Test
```bash
npm install -g @lanonasis/repl-cli@0.3.1
# or
bun install -g @lanonasis/repl-cli@0.3.1
```

## Enhanced Features Verification Checklist

### 1. Project Compartments
- [ ] `workspace list` - Should show available workspaces
- [ ] `workspace create test-project` - Should create new workspace  
- [ ] `workspace switch test-project` - Should switch to workspace
- [ ] `switch test-project` - Should work as alias
- [ ] `compartments` - Should list all workspaces

### 2. End-to-End Encryption
- [ ] `encrypt "test secret"` - Should encrypt and display result
- [ ] `decrypt [output from above]` - Should decrypt back to "test secret"

### 3. Context Orchestrator
- [ ] `context /path/to/some/file.txt` - Should process file and extract insights
- [ ] Should identify different content types (logs, code, text)

### 4. Natural Language Interface (Existing)
- [ ] "Remember that I prefer TypeScript" - Should create memory
- [ ] "What do I know about my projects?" - Should search memories
- [ ] All existing natural language features should work

### 5. Memory Operations (Existing)
- [ ] `create "title" "content"` - Should create memory
- [ ] `search query` - Should find memories
- [ ] `list` - Should list memories
- [ ] `get [id]` - Should retrieve memory
- [ ] `delete [id]` - Should delete memory

### 6. System Commands (Existing)
- [ ] `help` - Should show all commands including new ones
- [ ] `status` - Should show REPL status
- [ ] `nl on/off` - Should toggle natural language mode
- [ ] `exit` - Should exit cleanly

## Expected Behavior
- All new features should work without errors
- All existing functionality should remain intact
- Enhanced features should be clearly documented in help
- Encryption should securely store keys in `~/.lanonasis/security/master.key`
- Workspaces should isolate data appropriately
- File processing should extract meaningful insights

## Quick Test Commands
```bash
# Start REPL
lrepl start

# Test encryption
encrypt "my secret"
# Note the output

# Test workspace
workspace create test
workspace list

# Test context processing (if you have a text file to test)
context README.md

# Test existing functionality
create "test" "content"
list
search test

# Exit
exit
```
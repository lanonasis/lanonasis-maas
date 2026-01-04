# IDE Extensions Testing Guide

## Current Status

### ✅ Windsurf Extension
- **Build:** SUCCESS
- **Package:** `lanonasis-memory-windsurf-1.3.1.vsix` created
- **Size:** 160.8KB, 19 files

## Installation & Testing

### Install Locally
```bash
# Windsurf/VS Code
code --install-extension IDE-EXTENSIONS/windsurf-extension/lanonasis-memory-windsurf-1.3.1.vsix

# Or via UI: Extensions > ... > Install from VSIX
```

## Functionality Checklist

### Phase 1: Core Features (Test First)
- [ ] **Extension Activation**
  - Open VS Code/Windsurf
  - Check if "LanOnasis Memory" appears in activity bar or explorer
  - Verify no activation errors in Output > Extension Host

- [ ] **Authentication**
  - Command: `LanOnasis: Authenticate with Lanonasis`
  - Does browser OAuth flow work?
  - Does API key input work?
  - Check stored credentials in secrets

- [ ] **Memory Tree View**
  - Does the memories panel load?
  - Can you see memory categories (context, project, etc.)?
  - Click to expand - does it fetch memories?

- [ ] **Create Memory**
  - Select text in editor
  - Command: `LanOnasis: Create Memory from Selection`
  - Does it prompt for title?
  - Does it save successfully?

- [ ] **Search Memory**
  - Command: `LanOnasis: Search Memories`
  - Enter query
  - Do results appear?
  - Can you open a memory?

### Phase 2: Advanced Features
- [ ] **Completion Provider**
  - Type `@` in editor
  - Do memory suggestions appear?
  - Try `#` and `//` triggers

- [ ] **AI Assistant**
  - Command: `LanOnasis: AI Memory Assistant`
  - Does web-view panel open?
  - Can you search from panel?

- [ ] **API Key Management**
  - Does API Keys tree-view show?
  - Can you create/view projects?

### Phase 3: Settings & Config
- [ ] **Settings**
  - Open Settings > Extensions > LanOnasis Memory
  - Verify all config options appear
  - Test toggling features

- [ ] **Keybindings**
  - `Cmd+Shift+M` (search)
  - `Cmd+Shift+Alt+M` (create from selection)
  - `Cmd+Shift+Alt+A` (AI assist)

## Known Issues to Fix

### Critical (Blocks Usage)
1. **Activation Events** - Extension may not load on startup
2. **Auth Flow** - OAuth callback server may fail
3. **API Endpoints** - Hardcoded URLs need service discovery

### High Priority (UX Issues)
4. **Icons** - Generic icons, need custom ones
5. **Error Messages** - Too technical, need user-friendly text
6. **Empty States** - No guidance when no memories exist

### Medium Priority (Polish)
7. **Completion Triggers** - Multi-char triggers (`//`, `/*`) don't work
8. **Status Bar** - No auth status indicator
9. **Refresh** - Manual refresh needed, no auto-sync

### Low Priority (Nice-to-Have)
10. **Diagnostics** - No "diagnose connection" command
11. **CLI Sync** - No detection of local CLI
12. **MCP Tools** - 17 tools not exposed in UI

## Test Results Template

```markdown
### Test Session: [Date]
**Tester:** [Name]
**Environment:** [VS Code/Windsurf version, OS]

#### Working ✅
- Feature X works as expected
- Feature Y partially works (describe)

#### Broken ❌
- Feature Z fails with error: [error message]
- Feature A missing from UI

#### Observations 💡
- UX issue: [describe]
- Suggestion: [describe]
```

## Next Steps Based on Test Results

1. **If auth works:** Focus on Phase 3 (Activation & UX) - issue #32
2. **If auth fails:** Port CLI auth logic first - issue #31
3. **If nothing loads:** Fix activation events immediately

## Quick Fixes to Try

### If extension doesn't activate:
```json
// Add to package.json
"activationEvents": [
  "onStartupFinished",
  "onCommand:lanonasis.authenticate"
]
```

### If auth fails:
- Check API URL in settings
- Try manual API key instead of OAuth
- Check browser console for callback errors

### If no memories show:
- Verify API key is valid
- Check network tab for 401/403 errors
- Try creating a test memory first

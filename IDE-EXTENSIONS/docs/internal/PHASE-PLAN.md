# Phased Extension Fix Plan

## Current State
- ✅ Windsurf extension builds & packages successfully
- ✅ TypeScript compiles without errors
- ⏳ CI workflow exists but has issues (can skip for now)
- ❓ Runtime functionality untested

## Immediate Actions (Next 2 Hours)

### 1. Manual Testing Session
**Goal:** Identify what actually works vs. what's broken

**Steps:**
1. Install `lanonasis-memory-windsurf-1.3.1.vsix` in Windsurf
2. Follow `TESTING.md` checklist
3. Document results in a test report
4. Prioritize fixes based on severity

**Expected Findings:**
- Auth likely broken (needs OAuth server fix)
- Tree views may not populate (activation issue)
- Commands probably registered but may fail

### 2. Quick Wins (Fix First)
Based on code review, these are likely broken and easy to fix:

#### A. Activation Events (30 min)
**File:** `package.json` in each extension
**Issue:** `"activationEvents": []` means extension only loads on startup
**Fix:**
```json
"activationEvents": [
  "onStartupFinished",
  "onCommand:lanonasis.authenticate",
  "onView:lanonasisMemories"
]
```

#### B. Async Auth Bug (15 min)
**File:** `AuthenticationService.ts`
**Issue:** `isAuthenticated()` returns Promise comparison (always truthy)
**Fix:** Make method async and await the Promise

#### C. Completion Triggers (10 min)
**File:** `package.json`
**Issue:** Multi-char triggers (`//`, `/*`) ignored by VS Code
**Fix:** Use single chars only: `@`, `#`, `/`

### 3. Port CLI Auth Logic (2-3 hours)
**Goal:** Reuse battle-tested CLI authentication

**Files to Port:**
- `cli/src/commands/auth.ts` → shared auth util
- `cli/src/utils/config.ts` → credential storage
- Service discovery logic

**Benefits:**
- OAuth PKCE with retry logic
- Vendor key validation
- Error categorization
- Diagnostic commands

## Phase Execution Strategy

### Week 1: Foundation (Issues #30, #31)
**Focus:** Make extensions installable and authenticatable

- [x] CI pipeline (skip for now, manual builds work)
- [ ] Fix activation events
- [ ] Port CLI auth to extensions
- [ ] Add "Diagnose Connection" command
- [ ] Test on all 3 IDEs (VS Code, Cursor, Windsurf)

**Success Criteria:**
- Extension loads on startup
- OAuth flow completes successfully
- API key auth works as fallback
- Status bar shows auth state

### Week 2: UX & Discovery (Issue #32)
**Focus:** Make extensions discoverable and intuitive

- [ ] Custom activity bar container
- [ ] Proper icons (128x128 for marketplace)
- [ ] Side-panel integration
- [ ] Empty state guidance
- [ ] User-friendly error messages
- [ ] Welcome tour (first-time users)

**Success Criteria:**
- Extension appears in activity bar with custom icon
- Tree views show helpful empty states
- Errors explain what to do next
- New users complete setup in <3 minutes

### Week 3: MCP Integration (Issue #33)
**Focus:** Expose 17 MCP tools and CLI sync

- [ ] Detect local CLI installation
- [ ] MCP tool registry in tree-view
- [ ] Run/test buttons for each tool
- [ ] Live sync when CLI creates memories
- [ ] Cross-device context sharing

**Success Criteria:**
- CLI detected and version shown
- All 17 tools listed with descriptions
- Can run tools from VS Code
- Memories auto-refresh on CLI changes

### Week 4: Polish & Publish (Issues #34, #35)
**Focus:** Marketplace presence and auto-updates

- [ ] README with GIFs and quick-start
- [ ] CHANGELOG auto-generation
- [ ] Screenshots for marketplace
- [ ] GitHub Actions auto-publish
- [ ] Semver discipline
- [ ] Update notifications

**Success Criteria:**
- Extensions discoverable via marketplace search
- Auto-update delivers new versions
- Documentation clear and helpful
- 95%+ users authenticate successfully

## Decision Points

### After Testing Session
**If auth works:**
→ Skip to Phase 2 (UX), auth is good enough

**If auth fails:**
→ Prioritize Phase 1 (port CLI auth first)

**If nothing loads:**
→ Emergency fix: activation events + basic auth

### After Week 1
**If adoption is blocked by UX:**
→ Accelerate Phase 2, delay Phase 3

**If users want CLI sync immediately:**
→ Swap Phase 2 and Phase 3 priorities

## Metrics to Track

### Usage Metrics
- Install count (marketplace)
- Activation rate (loads successfully)
- Auth completion rate
- Daily active users
- Command usage frequency

### Quality Metrics
- Crash rate
- Auth failure rate
- API error rate (401/403/500)
- Time to first memory created
- User-reported issues

## Resources

### Testing
- `IDE-EXTENSIONS/TESTING.md` - Manual test checklist
- `IDE-EXTENSIONS/windsurf-extension/*.vsix` - Built packages

### Issues
- #30: CI & Build Pipeline
- #31: OAuth + API Key Auth
- #32: Activation & UX
- #33: MCP Tools & CLI Sync
- #34: Docs & Onboarding
- #35: Marketplace Publishing

### Code References
- CLI auth: `cli/src/commands/auth.ts`
- Extension entry: `IDE-EXTENSIONS/*/src/extension.ts`
- Auth service: `IDE-EXTENSIONS/*/src/auth/AuthenticationService.ts`

## Next Command
```bash
# Install and test Windsurf extension
code --install-extension IDE-EXTENSIONS/windsurf-extension/lanonasis-memory-windsurf-1.3.1.vsix

# Then follow TESTING.md checklist
```

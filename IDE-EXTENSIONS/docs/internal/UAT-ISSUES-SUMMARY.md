# VS Code Extension v1.5.4 - UAT Issues Summary

**Repository:** `lanonasis/lanonasis-maas`  
**Extension Version:** 1.5.4  
**Date:** UAT Findings

## Issue Summary

| # | Title | Priority | Labels | Type |
|---|-------|----------|--------|------|
| 1 | Search button non-functional | Critical | bug, critical, vscode-extension | Bug |
| 2 | Create button only works with editor selection | High | bug, vscode-extension | Bug |
| 3 | Memory entries load slowly | High | bug, performance, vscode-extension | Performance |
| 4 | Cache ineffective on focus change | High | bug, vscode-extension, performance | Bug |
| 5 | Missing essential UI elements | High | enhancement, vscode-extension, ui | Feature |
| 6 | No welcome message for authenticated user | Medium | enhancement, vscode-extension, ux | UX |
| 7 | Default base URL fails (api.lanonasis) | Critical | bug, critical, vscode-extension, configuration | Bug |
| 8 | Auto-update and version install non-functional | Medium | bug, vscode-extension | Bug |
| 9 | API key feature generates errors despite auth | Critical | bug, critical, vscode-extension, authentication | Bug |
| 10 | Dashboard key scoping restricted to in-house | Medium | enhancement, vscode-extension, api-keys | Feature |

## Detailed Issues

### Issue #1: Search Button Non-Functional
**Priority:** Critical  
**Type:** Bug

The search button in the VS Code extension sidebar is completely non-functional. Users cannot perform memory searches through the UI.

**Impact:** Blocks core functionality - users cannot search their memories.

---

### Issue #2: Create Button Limited Functionality
**Priority:** High  
**Type:** Bug

The create memory button only works when text is selected in the editor. It should also support:
- Manual input
- Paste from clipboard
- Other input methods

**Impact:** Limits workflow flexibility and user experience.

---

### Issue #3: Slow Memory List Loading
**Priority:** High  
**Type:** Performance

Memory entries from the historical list load slowly, causing:
- UI freezes
- Poor scrolling experience
- No loading indicators

**Recommendations:**
- Implement pagination
- Add virtual scrolling
- Implement lazy loading
- Add caching strategies

---

### Issue #4: Cache Ineffective on Focus Change
**Priority:** High  
**Type:** Bug

Cache is cleared when VS Code loses/regains focus, causing:
- Extension reloads
- Lost state
- Unnecessary API calls
- Performance degradation

**Impact:** Poor user experience and unnecessary resource usage.

---

### Issue #5: Missing UI Elements
**Priority:** High  
**Type:** Feature Request

Multiple essential UI elements are missing:

1. **Settings Button** - Cannot access settings from sidebar
2. **Logout Option** - Cannot log out easily
3. **Paste Context Feature** - Cannot paste from clipboard
4. **Default Context Types List** - Must manually type memory types
5. **Post-Setup User Guide** - No onboarding for new users

**Impact:** Significantly impacts usability and onboarding.

---

### Issue #6: No Welcome Message
**Priority:** Medium  
**Type:** UX Enhancement

After authentication, there is no:
- Welcome message
- User identification
- Clear authentication status indicator

**Impact:** Users unclear about their authentication state.

---

### Issue #7: Default Base URL Fails
**Priority:** Critical  
**Type:** Configuration Bug

Extension fails with default URL (`api.lanonasis.com`) but works with `mcp.lanonasis.com`.

**Impact:** Affects all new users - requires manual configuration.

**Action Required:**
- Fix default URL to working endpoint, OR
- Fix api.lanonasis.com endpoint

---

### Issue #8: Auto-Update Non-Functional
**Priority:** Medium  
**Type:** Bug

Auto-update and specific version installation features do not work.

**Impact:** Users cannot easily update or manage extension versions.

**Possible Causes:**
- Marketplace configuration
- Version numbering
- Update mechanism setup

---

### Issue #9: API Key Errors Despite Authentication
**Priority:** Critical  
**Type:** Bug

API key management generates errors even when user is properly authenticated.

**Impact:** Blocks API key management functionality.

**Possible Causes:**
- Endpoint permissions
- Token validation
- Service integration
- Error handling

---

### Issue #10: Restricted API Key Scoping
**Priority:** Medium  
**Type:** Feature Request

Dashboard API key scoping is limited to in-house services only, excluding vendor services.

**Impact:** Limits flexibility for users needing vendor service access.

**Considerations:**
- May be intentional for security
- Should be configurable or documented
- Clear error messages needed

---

## Execution Instructions

### To Create All Issues:

```bash
cd /opt/lanonasis/lanonasis-maas/IDE-EXTENSIONS
./create-uat-issues.sh
```

### Prerequisites:

1. Install GitHub CLI:
   ```bash
   sudo apt install gh
   ```

2. Authenticate:
   ```bash
   gh auth login
   ```

3. Verify access:
   ```bash
   gh repo view lanonasis/lanonasis-maas
   ```

### Manual Review:

Before running the script, you can review each issue by examining the script file:
```bash
cat create-uat-issues.sh
```

### Individual Issue Creation:

If you prefer to create issues one at a time, you can extract individual `gh issue create` commands from the script.

---

## Priority Breakdown

- **Critical (3 issues):** #1, #7, #9
- **High (4 issues):** #2, #3, #4, #5
- **Medium (3 issues):** #6, #8, #10

## Next Steps

1. Review the issues summary above
2. Run the script to create GitHub issues
3. Assign issues to appropriate team members
4. Set up project board or milestones for tracking
5. Begin resolution with critical issues first

---

## Related Files

- Script: `create-uat-issues.sh`
- Extension Package: `IDE-EXTENSIONS/vscode-extension/package.json`
- Extension Version: 1.5.4 (current), 1.5.8 (package.json shows)

**Note:** Package.json shows version 1.5.8, but UAT was performed on 1.5.4. Verify which version these issues apply to.


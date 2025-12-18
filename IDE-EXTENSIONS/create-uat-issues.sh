#!/bin/bash
# Create GitHub issues for VS Code Extension v1.5.4 UAT findings
# Usage: ./create-uat-issues.sh

REPO="lanonasis/lanonasis-maas"

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) not found. Install with: sudo apt install gh"
    echo "Then authenticate with: gh auth login"
    exit 1
fi

echo "Creating UAT issues for VS Code Extension v1.5.4 in $REPO..."
echo ""

# Issue 1: Search button non-functional
gh issue create \
  --repo "$REPO" \
  --title "[Critical] Search button non-functional in VS Code Extension v1.5.4" \
  --label "bug,critical,vscode-extension" \
  --body "**Version:** 1.5.4
**Priority:** Critical
**Component:** VS Code Extension - Search Functionality

## Description
The search button in the VS Code extension sidebar is non-functional. Users cannot perform memory searches through the UI.

## Steps to Reproduce
1. Open VS Code with Lanonasis Memory extension installed
2. Open the Lanonasis Memory sidebar
3. Click the search button
4. Observe: No search functionality is triggered

## Expected Behavior
- Search button should open a search input or dialog
- Users should be able to search their memories
- Search results should be displayed

## Actual Behavior
- Search button does nothing when clicked
- No search interface appears
- No error messages shown

## Environment
- Extension Version: 1.5.4
- VS Code Version: [Please specify]
- OS: [Please specify]

## Additional Context
This is a critical blocker for core functionality. Users cannot search their memories through the extension UI.

## Related Files
- \`IDE-EXTENSIONS/vscode-extension/src/services/EnhancedMemoryService.ts\`
- \`IDE-EXTENSIONS/vscode-extension/src/panels/MemorySidebarProvider.ts\`"

# Issue 2: Create button only works with editor selection
gh issue create \
  --repo "$REPO" \
  --title "[Bug] Create button only works when copying prompts from editor section" \
  --label "bug,vscode-extension" \
  --body "**Version:** 1.5.4
**Priority:** High
**Component:** VS Code Extension - Memory Creation

## Description
The create memory button only functions when text is selected in the editor. It should also allow manual input or creation from other sources.

## Steps to Reproduce
1. Open VS Code with Lanonasis Memory extension
2. Open the Lanonasis Memory sidebar
3. Click the create button without any editor selection
4. Observe: Create functionality does not work

## Expected Behavior
- Create button should open a memory creation dialog/form
- Users should be able to manually enter memory content
- Users should be able to create memories from clipboard
- Users should be able to create memories from selected text

## Actual Behavior
- Create button only works when text is selected in editor
- No manual input option available
- No paste/context options available

## Environment
- Extension Version: 1.5.4
- VS Code Version: [Please specify]

## Additional Context
This limits user workflow flexibility. Users should be able to create memories from various sources, not just editor selections.

## Related Files
- \`IDE-EXTENSIONS/vscode-extension/src/services/EnhancedMemoryService.ts\`
- \`IDE-EXTENSIONS/vscode-extension/src/extension.ts\`"

# Issue 3: Slow loading of historical memory entries
gh issue create \
  --repo "$REPO" \
  --title "[Performance] Memory entries from historical list load slowly" \
  --label "bug,performance,vscode-extension,performance" \
  --body "**Version:** 1.5.4
**Priority:** High
**Component:** VS Code Extension - Memory List Performance

## Description
Memory entries from the historical list take a long time to load, causing poor user experience.

## Steps to Reproduce
1. Open VS Code with Lanonasis Memory extension
2. Open the Memories list in sidebar
3. Scroll through historical memory entries
4. Observe: Slow loading times, especially for older entries

## Expected Behavior
- Memory entries should load quickly (< 500ms)
- Pagination or lazy loading should be implemented
- Smooth scrolling experience

## Actual Behavior
- Memory entries load slowly
- UI freezes or becomes unresponsive during loading
- No loading indicators shown

## Environment
- Extension Version: 1.5.4
- Number of memories: [Please specify if known]

## Additional Context
This impacts user experience significantly, especially for users with many memories. Consider implementing:
- Pagination
- Virtual scrolling
- Lazy loading
- Caching strategies

## Related Files
- \`IDE-EXTENSIONS/vscode-extension/src/providers/MemoryTreeProvider.ts\`
- \`IDE-EXTENSIONS/vscode-extension/src/services/EnhancedMemoryService.ts\`"

# Issue 4: Cache ineffective on focus change
gh issue create \
  --repo "$REPO" \
  --title "[Bug] Cache implementation ineffective on focus change, causing IDE reload" \
  --label "bug,vscode-extension,performance" \
  --body "**Version:** 1.5.4
**Priority:** High
**Component:** VS Code Extension - Caching & Performance

## Description
The cache implementation does not persist when VS Code loses and regains focus, causing the extension to reload and lose state.

## Steps to Reproduce
1. Open VS Code with Lanonasis Memory extension
2. Load some memories in the sidebar
3. Switch to another application (lose focus)
4. Switch back to VS Code (regain focus)
5. Observe: Extension reloads, cache is lost

## Expected Behavior
- Cache should persist across focus changes
- Extension state should be maintained
- No unnecessary reloads

## Actual Behavior
- Cache is cleared on focus change
- Extension reloads unnecessarily
- User loses their place in the memory list
- Performance degrades due to reload

## Environment
- Extension Version: 1.5.4
- VS Code Version: [Please specify]
- OS: [Please specify]

## Additional Context
This causes poor user experience and unnecessary API calls. The cache should use VS Code's persistent storage mechanisms.

## Related Files
- \`IDE-EXTENSIONS/vscode-extension/src/services/EnhancedMemoryService.ts\`
- \`packages/memory-client/src/enhanced-client.ts\`"

# Issue 5: Missing UI elements
gh issue create \
  --repo "$REPO" \
  --title "[Feature] Missing essential UI elements in VS Code Extension" \
  --label "enhancement,vscode-extension,ui" \
  --body "**Version:** 1.5.4
**Priority:** High
**Component:** VS Code Extension - User Interface

## Description
Multiple essential UI elements are missing from the extension interface, limiting functionality and user experience.

## Missing Elements

### 1. Settings Button
- **Impact:** Users cannot access extension settings from the sidebar
- **Expected:** Settings button/icon in sidebar header or toolbar
- **Workaround:** Users must use VS Code settings UI

### 2. Logout Option
- **Impact:** Users cannot log out without clearing all VS Code settings
- **Expected:** Logout button in sidebar or user menu
- **Workaround:** Manual API key clearing required

### 3. Paste Context Feature
- **Impact:** Users cannot paste context from clipboard
- **Expected:** Paste button or context menu option
- **Use Case:** Quick memory creation from clipboard content

### 4. Default List of Context Types
- **Impact:** Users must manually type memory types
- **Expected:** Dropdown or list of predefined context types
- **Types:** context, project, knowledge, reference, personal, workflow

### 5. Post-Setup User Guide
- **Impact:** New users don't know how to use the extension
- **Expected:** Welcome screen or onboarding flow after first setup
- **Content:** Quick start guide, feature overview, tips

## Steps to Reproduce
1. Install and authenticate VS Code extension
2. Open the Lanonasis Memory sidebar
3. Observe: Missing UI elements listed above

## Expected Behavior
All listed UI elements should be present and functional.

## Actual Behavior
UI elements are missing, requiring workarounds or manual configuration.

## Environment
- Extension Version: 1.5.4

## Additional Context
These missing elements significantly impact usability and onboarding experience. Consider implementing a comprehensive UI audit.

## Related Files
- \`IDE-EXTENSIONS/vscode-extension/src/panels/MemorySidebarProvider.ts\`
- \`IDE-EXTENSIONS/vscode-extension/src/extension.ts\`
- \`IDE-EXTENSIONS/vscode-extension/package.json\` (commands/menus)"

# Issue 6: No welcome message for authenticated user
gh issue create \
  --repo "$REPO" \
  --title "[UX] No welcome message identifies authenticated user" \
  --label "enhancement,vscode-extension,ux" \
  --body "**Version:** 1.5.4
**Priority:** Medium
**Component:** VS Code Extension - User Experience

## Description
After authentication, there is no welcome message or user identification in the extension UI, making it unclear if the user is logged in and who they are.

## Steps to Reproduce
1. Install VS Code extension
2. Authenticate (OAuth or API key)
3. Open the Lanonasis Memory sidebar
4. Observe: No welcome message or user identification

## Expected Behavior
- Welcome message showing authenticated user's name/email
- User profile indicator or avatar
- Clear indication of authentication status
- User information in sidebar header

## Actual Behavior
- No welcome message
- No user identification
- Unclear authentication status

## Environment
- Extension Version: 1.5.4

## Additional Context
This is a basic UX improvement that helps users understand their authentication state and provides a more personalized experience.

## Related Files
- \`IDE-EXTENSIONS/vscode-extension/src/panels/MemorySidebarProvider.ts\`
- \`IDE-EXTENSIONS/vscode-extension/src/services/EnhancedMemoryService.ts\`
- \`IDE-EXTENSIONS/vscode-extension/src/auth/AuthenticationService.ts\`"

# Issue 7: Default base URL fails
gh issue create \
  --repo "$REPO" \
  --title "[Critical] IDE fails with default base URL (api.lanonasis) but works with mcp.lanonasis" \
  --label "bug,critical,vscode-extension,configuration" \
  --body "**Version:** 1.5.4
**Priority:** Critical
**Component:** VS Code Extension - API Configuration

## Description
The extension fails to connect when using the default base URL (\`api.lanonasis.com\`) but works correctly when manually changed to \`mcp.lanonasis.com\`.

## Steps to Reproduce
1. Install VS Code extension (fresh install)
2. Use default configuration (api.lanonasis.com)
3. Attempt to authenticate or use extension
4. Observe: Connection failures, errors
5. Change base URL to mcp.lanonasis.com in settings
6. Observe: Extension works correctly

## Expected Behavior
- Default base URL should work out of the box
- No manual configuration required for standard use
- Clear error messages if URL is incorrect

## Actual Behavior
- Default URL (api.lanonasis.com) fails
- Manual change to mcp.lanonasis.com required
- No clear indication of the issue

## Environment
- Extension Version: 1.5.4
- Default URL: api.lanonasis.com
- Working URL: mcp.lanonasis.com

## Additional Context
This is a critical configuration issue that affects all new users. The default should be set to the working endpoint, or the api.lanonasis.com endpoint should be fixed.

## Related Files
- \`IDE-EXTENSIONS/vscode-extension/package.json\` (default config)
- \`IDE-EXTENSIONS/vscode-extension/src/services/EnhancedMemoryService.ts\`
- \`IDE-EXTENSIONS/vscode-extension/src/utils/config.ts\`"

# Issue 8: Auto-update and version install features non-functional
gh issue create \
  --repo "$REPO" \
  --title "[Bug] Auto-update and install specific version features non-functional" \
  --label "bug,vscode-extension" \
  --body "**Version:** 1.5.4
**Priority:** Medium
**Component:** VS Code Extension - Update Management

## Description
Auto-update functionality and the ability to install specific extension versions are not working.

## Steps to Reproduce
1. Install VS Code extension
2. Check for updates or attempt to install specific version
3. Observe: Features do not work

## Expected Behavior
- Auto-update should check for and install new versions
- Users should be able to install specific versions
- Update notifications should appear
- Version management should work through VS Code marketplace

## Actual Behavior
- Auto-update does not function
- Cannot install specific versions
- No update notifications

## Environment
- Extension Version: 1.5.4
- VS Code Version: [Please specify]

## Additional Context
This may be related to VS Code marketplace configuration or extension packaging. Verify:
- Extension is properly published to marketplace
- Version numbers are correctly formatted
- Update mechanism is configured

## Related Files
- \`IDE-EXTENSIONS/vscode-extension/package.json\`
- \`IDE-EXTENSIONS/vscode-extension/.vscodeignore\`
- Extension publishing configuration"

# Issue 9: API key feature generates errors despite authentication
gh issue create \
  --repo "$REPO" \
  --title "[Bug] API key feature generates errors despite authentication" \
  --label "bug,critical,vscode-extension,authentication" \
  --body "**Version:** 1.5.4
**Priority:** Critical
**Component:** VS Code Extension - API Key Management

## Description
The API key management feature generates errors even when the user is properly authenticated via OAuth or other methods.

## Steps to Reproduce
1. Authenticate via OAuth in VS Code extension
2. Navigate to API Key management section
3. Attempt to view, create, or manage API keys
4. Observe: Errors are generated despite valid authentication

## Expected Behavior
- API key management should work when user is authenticated
- No errors should occur for authenticated users
- Clear error messages if API key management is unavailable

## Actual Behavior
- Errors occur when accessing API key features
- Errors occur even with valid authentication
- Unclear error messages

## Environment
- Extension Version: 1.5.4
- Authentication Method: OAuth (or API key)

## Error Details
[Please provide specific error messages from console/logs]

## Additional Context
This suggests a problem with:
- API key endpoint permissions
- Authentication token validation
- API key management service integration
- Error handling in API key operations

## Related Files
- \`IDE-EXTENSIONS/vscode-extension/src/services/ApiKeyService.ts\`
- \`IDE-EXTENSIONS/vscode-extension/src/providers/ApiKeyTreeProvider.ts\`
- \`IDE-EXTENSIONS/vscode-extension/src/services/EnhancedMemoryService.ts\`"

# Issue 10: Dashboard key scoping restricted
gh issue create \
  --repo "$REPO" \
  --title "[Feature] Dashboard key scoping restricted to in-house services, excluding vendor services" \
  --label "enhancement,vscode-extension,api-keys" \
  --body "**Version:** 1.5.4
**Priority:** Medium
**Component:** VS Code Extension - API Key Scoping

## Description
Dashboard API key scoping is currently restricted to in-house services only, excluding vendor/integration services. This limits flexibility for users who need to access vendor services.

## Steps to Reproduce
1. Authenticate in VS Code extension
2. Navigate to API Key management
3. Create or view API key scopes
4. Observe: Only in-house services available for scoping

## Expected Behavior
- API keys should support scoping to vendor services
- Users should be able to create keys with vendor service access
- Clear indication of available scopes (in-house and vendor)

## Actual Behavior
- Only in-house services available for scoping
- Vendor services excluded
- No option to enable vendor service access

## Environment
- Extension Version: 1.5.4

## Additional Context
This is a feature limitation that may be intentional for security reasons, but should be configurable or at least documented. Consider:
- Adding vendor service scopes
- Making scoping configurable
- Documenting scope limitations
- Providing clear error messages when vendor services are needed

## Related Files
- \`IDE-EXTENSIONS/vscode-extension/src/services/ApiKeyService.ts\`
- Backend API key management endpoints
- API key scope configuration"

echo ""
echo "✅ All UAT issues created successfully!"
echo ""
echo "View issues at: https://github.com/$REPO/issues"
echo ""
echo "Summary:"
echo "  - 4 Critical issues"
echo "  - 4 High priority issues"
echo "  - 2 Medium priority issues"
echo ""
echo "Total: 10 issues created"


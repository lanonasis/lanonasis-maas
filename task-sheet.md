# Task sheet

## Task 1: Transport Settings Issue

The extension defines transport settings (transportPreference, websocketUrl, enableRealtime) and TransportManager class but the active runtime is not using them.

Per VSCODE_EXTENSION_CURRENT_STATE_ANALYSIS.md section 'Partial', these should be either:

Wired into the active runtime, OR
Marked as deprecated and removed from settings with proper diagnostics warnings
Recommended: Add diagnostics warnings for these deprecated settings and remove from active runtime to avoid confusion.

Files:

package.json:547-566 (deprecated settings)
src/services/transports/TransportManager.ts:1-260
src/services/EnhancedMemoryService.ts:153-195
src/extension.ts:81-100


## Task 2: Fix the authentication issue where API keys work for memory services but fail for Projects API.

Problem: Memory services accept X-API-Key header but Projects API requires Authorization: Bearer <JWT>.

Solution: Update the requireAuth middleware in backend or fix IDE extension to use OAuth tokens for projects endpoints. The recommended approach per IDE-EXTENSION-AUTH-ISSUE-ANALYSIS.md is to update requireAuth middleware to accept both JWT tokens and API keys.

Files referenced:

mcp-core/src/index.ts:933-981 (memory services)
auth-gateway/src/middleware/auth.ts:16-36 (projects API auth)
IDE-EXTENSIONS/vscode-extension/src/services/ApiKeyService.ts:76-78 (VSCode extension)
IDE-EXTENSIONS/cursor-extension/src/services/ApiKeyService.ts:90-100 (Cursor extension)
IDE-EXTENSIONS/windsurf-extension/src/services/ApiKeyService.ts (Windsurf extension)

## Task 3: The extension has local chat sessions (React sidebar useChatHistory hook) while CLI has save-session, list-sessions, load-session, delete-session commands. These are different concepts causing confusion.

Per VSCODE_EXTENSION_CURRENT_STATE_ANALYSIS.md section 'Gap analysis', solution is either:

Add CLI session integration into extension, OR
Rename local chat concept to avoid confusion
Recommended: Add CLI session commands to extension for parity. The CLI commands are in cli/src/commands/memory.ts:751-972.

Files:

src/hooks/useChatHistory.tsx:54-156, 199-242 (local sessions)
cli/src/commands/memory.ts:751-972 (CLI sessions)
package.json:44-263 (extension commands)
src/extension.ts:298-665 (command registration)

## Task 4: Review and ensure the @lanonasis/memory-client package (packages/memory-client) is production ready:

Check version and publish status
Verify build and type definitions
Check documentation
Ensure exports are correct for all entry points
Current version: 1.0.0 published as tgz

Files:

packages/memory-client/package.json
packages/memory-client/src/*

## Task 5: Review and ensure the @lanonasis/sdk package (packages/lanonasis-sdk) is production ready:

Check version: 1.2.0
Review exports configuration
Check peer dependencies
Verify build scripts
Update to latest if needed
Current version in packages/lanonasis-sdk/package.json: 1.2.0

Files:

packages/lanonasis-sdk/package.json
packages/lanonasis-sdk/src/*

## Tasks

## Fix authentication: API key not accepted by Projects API

## Fix deprecated transport settings: remove or wire TransportManager

## Add session parity: integrate CLI sessions into extension or rename local chat

## Fix version drift in extensions and SDK packages

## Ensure lanonasis-sdk package is production ready

## Ensure memory-client package is production ready


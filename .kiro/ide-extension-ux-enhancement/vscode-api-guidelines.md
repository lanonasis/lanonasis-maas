# VSCode API Guidelines and Best Practices

## Overview

This document extracts key guidelines from the official VSCode Extension API documentation and applies them to our IDE Extension UX Enhancement project. These guidelines ensure our extensions follow VSCode best practices and integrate seamlessly with the native interface.

**Source**: [VSCode Extension API Documentation](https://code.visualstudio.com/api)

---

## Core Concepts

### 1. Activation Events

**What**: Events that trigger extension activation

**Best Practices for Our Project**:

- ✅ Use `onStartupFinished` for non-critical initialization (already implemented)
- ✅ Use `onView:lanonasis.sidebar` for sidebar activation (already implemented)
- ⚠️ **Important**: As of VSCode 1.74+, commands in `contributes.commands` automatically activate the extension - no need for explicit `onCommand` entries
- Remove redundant `activationEvents` entries to reduce bundle size

**Application to Our Spec**:

```json
// Current (can be simplified)
"activationEvents": [
    "onStartupFinished",
    "onView:lanonasis.sidebar",
    "onView:lanonasisMemories"
]

// Recommended (VSCode 1.74+)
"activationEvents": [
    "onStartupFinished"
]
// Commands will auto-activate when invoked
```

**Task Reference**: Phase 1, Task 1.2 - Update activation events configuration

---

### 2. Contribution Points

**What**: Static declarations in `package.json` that extend VSCode

**Key Contribution Points for Our Project**:

#### Commands

```json
"contributes": {
    "commands": [
        {
            "command": "lanonasis.authenticate",
            "title": "Authenticate",
            "category": "Lanonasis",
            "icon": "$(key)"  // Use codicons for consistency
        }
    ]
}
```

**Best Practices**:

- Always use a category prefix (e.g., "Lanonasis:")
- Use codicons (`$(icon-name)`) for built-in icons
- Provide clear, action-oriented titles
- Group related commands with same category

**Application to Our Spec**: ✅ Already following this pattern

#### Views and View Containers

```json
"viewsContainers": {
    "activitybar": [
        {
            "id": "lanonasis",
            "title": "Lanonasis Memory",
            "icon": "images/icon.svg"  // Custom SVG icon
        }
    ]
}
```

**Best Practices**:

- Use SVG icons for Activity Bar (better scaling)
- Keep icon simple and recognizable
- Title should be concise (2-3 words max)

**Application to Our Spec**: ✅ Already implemented correctly

#### Webview Views

```json
"views": {
    "lanonasis": [
        {
            "type": "webview",
            "id": "lanonasis.sidebar",
            "name": "Memory Assistant",
            "icon": "$(brain)",
            "contextualTitle": "Lanonasis Memory"
        }
    ]
}
```

**Best Practices**:

- Use `type: "webview"` for custom UI
- Provide contextual title for better UX
- Use codicons for view icons

**Application to Our Spec**: ✅ Already implemented

---

### 3. Extension Manifest Structure

**Required Fields**:

```json
{
  "name": "lanonasis-memory",
  "displayName": "LanOnasis Memory Assistant",
  "description": "Memory as a Service integration...",
  "version": "1.5.0",
  "publisher": "LanOnasis",
  "engines": {
    "vscode": "^1.74.0" // Minimum version
  },
  "categories": ["Other", "Snippets", "Machine Learning"],
  "keywords": ["memory", "ai", "knowledge"],
  "icon": "images/icon.png", // 128x128 PNG
  "repository": {
    "type": "git",
    "url": "https://github.com/..."
  }
}
```

**Best Practices**:

- Use semantic versioning (MAJOR.MINOR.PATCH)
- Set minimum `engines.vscode` to version you actually need
- Provide 3-5 relevant categories
- Include 5-10 searchable keywords
- Icon should be 128x128 PNG with transparent background

**Application to Our Spec**: ✅ Already following these practices

---

## UI Architecture Guidelines

### Container Hierarchy

```
Activity Bar → View Container → Primary Sidebar → Views
                              ↓
                         Secondary Sidebar → Views
                              ↓
                            Panel → Views
```

**Best Practices for Our Project**:

1. **Activity Bar Item**:
   - ✅ We have one Activity Bar item for "Lanonasis Memory"
   - Should open Primary Sidebar with our views
   - Icon should be distinctive and recognizable

2. **Primary Sidebar**:
   - ✅ Contains our webview (Memory Assistant)
   - ✅ Contains tree views (Memories, API Keys)
   - Should be the primary interaction surface

3. **Views**:
   - Use webview for rich, custom UI (our sidebar)
   - Use tree views for hierarchical data (our memory list)
   - Allow users to drag views to different containers

**Application to Our Spec**:

- Phase 4: Modern Sidebar Interface - follows these patterns
- Requirement 16: Integration with IDE Features - ensures proper container usage

---

## UX Guidelines Application

### 1. Command Palette

**Guidelines**:

- Commands should be discoverable and searchable
- Use clear, action-oriented names
- Group related commands with categories
- Provide keyboard shortcuts for frequent actions

**Application to Our Spec**:

```typescript
// Good: Clear, categorized, action-oriented
"Lanonasis: Search Memories";
"Lanonasis: Create Memory from Selection";
"Lanonasis: Authenticate";

// Bad: Vague, no category
"Search";
"Create";
"Login";
```

**Task Reference**: Phase 4, Task 4.2 - Ensure all commands follow naming conventions

---

### 2. Quick Picks

**Guidelines**:

- Use for single/multiple selections
- Support fuzzy search
- Show descriptions for clarity
- Allow keyboard navigation

**Application to Our Spec**:

```typescript
// Authentication method selection (already implemented)
const choice = await vscode.window.showQuickPick(
  [
    {
      label: "$(key) OAuth (Browser)",
      description: "Authenticate using OAuth2 with browser (Recommended)",
      value: "oauth",
    },
    {
      label: "$(key) API Key",
      description: "Enter API key directly",
      value: "apikey",
    },
  ],
  {
    placeHolder: "Choose authentication method",
  }
);
```

**Task Reference**: Phase 2, Task 2.3 - Authentication UI follows Quick Pick patterns

---

### 3. Notifications

**Guidelines**:

- Use sparingly (don't spam users)
- Provide actionable buttons
- Use appropriate severity (info, warning, error)
- Include progress for long operations

**Application to Our Spec**:

```typescript
// Good: Actionable, clear severity
vscode.window.showInformationMessage(
  "✅ Successfully authenticated with Lanonasis Memory",
  "View Memories",
  "Settings"
);

// Good: Progress indication
vscode.window.withProgress(
  {
    location: vscode.ProgressLocation.Notification,
    title: "Creating memory...",
    cancellable: false,
  },
  async () => {
    await memoryService.createMemory(data);
  }
);
```

**Task Reference**: Phase 9, Task 9.1 - Error notifications with recovery actions

---

### 4. Webviews

**Guidelines**:

- Use for custom UI beyond native API
- Implement proper Content Security Policy (CSP)
- Use nonce for inline scripts
- Restrict resource loading
- Handle state persistence
- Support theming (light/dark/high contrast)

**Application to Our Spec**:

```typescript
// CSP implementation (already in design)
const csp = [
  "default-src 'none'",
  `script-src 'nonce-${nonce}'`,
  `style-src ${webview.cspSource} 'unsafe-inline'`,
  `img-src ${webview.cspSource} https: data:`,
  "connect-src https://api.lanonasis.com",
].join("; ");
```

**Task Reference**:

- Phase 4: Modern Sidebar Interface - webview implementation
- Security Considerations section - CSP and input sanitization

---

### 5. Walkthroughs

**Guidelines**:

- Use for onboarding new users
- Break into logical steps
- Include rich media (images, videos)
- Make steps actionable
- Allow skipping

**Application to Our Spec**:

```json
// Recommended addition to package.json
"contributes": {
    "walkthroughs": [
        {
            "id": "lanonasis.gettingStarted",
            "title": "Get Started with Lanonasis Memory",
            "description": "Learn how to use Lanonasis Memory Assistant",
            "steps": [
                {
                    "id": "authenticate",
                    "title": "Authenticate",
                    "description": "Connect to your Lanonasis account",
                    "media": { "image": "media/walkthrough/authenticate.png" },
                    "completionEvents": ["onCommand:lanonasis.authenticate"]
                },
                {
                    "id": "createMemory",
                    "title": "Create Your First Memory",
                    "description": "Save code snippets as memories",
                    "media": { "image": "media/walkthrough/create.png" },
                    "completionEvents": ["onCommand:lanonasis.createMemory"]
                }
            ]
        }
    ]
}
```

**Task Reference**: Phase 3, Task 3.3 - Interactive feature tour (should use Walkthrough API)

---

### 6. Settings

**Guidelines**:

- Use clear, descriptive names
- Provide markdown descriptions
- Set sensible defaults
- Group related settings
- Use enums for fixed choices
- Mark deprecated settings

**Application to Our Spec**:

```json
// Good: Clear description, sensible default, enum for choices
"lanonasis.defaultMemoryType": {
    "type": "string",
    "enum": ["context", "project", "knowledge", "reference"],
    "default": "context",
    "markdownDescription": "Default memory type for new memories. [Learn more](https://docs.lanonasis.com/memory-types)"
}

// Good: Deprecation notice
"lanonasis.apiKey": {
    "type": "string",
    "deprecationMessage": "API keys are now stored securely. Use 'Lanonasis: Authenticate' command instead."
}
```

**Task Reference**: Phase 12: Settings and Customization - follows these patterns

---

## Extension Entry Point Best Practices

### Activation Function

**Guidelines**:

- Keep activation fast (< 500ms)
- Register all commands in activate()
- Push disposables to context.subscriptions
- Handle errors gracefully
- Log activation for debugging

**Application to Our Spec**:

```typescript
export async function activate(context: vscode.ExtensionContext) {
  console.log("Lanonasis Memory Extension is now active");

  // Fast initialization
  const outputChannel = vscode.window.createOutputChannel("Lanonasis");
  const secureApiKeyService = new SecureApiKeyService(context, outputChannel);
  await secureApiKeyService.initialize();

  // Register all commands
  const commands = [
    vscode.commands.registerCommand("lanonasis.authenticate", async () => {
      // Command implementation
    }),
    // ... more commands
  ];

  // Push to subscriptions for cleanup
  context.subscriptions.push(...commands);

  // Lazy load heavy dependencies
  if (needsEnhancedService) {
    const enhancedService = await import("./services/EnhancedMemoryService");
    // Use enhanced service
  }
}
```

**Task Reference**: Phase 7, Task 7.3 - Lazy loading implementation

---

### Deactivation Function

**Guidelines**:

- Clean up resources
- Cancel pending operations
- Save state if needed
- Can be omitted if no cleanup needed

**Application to Our Spec**:

```typescript
export function deactivate() {
  // Cleanup if needed
  if (memoryService instanceof EnhancedMemoryService) {
    memoryService.dispose();
  }
}
```

**Task Reference**: Already implemented in current codebase

---

## Accessibility Guidelines

### Keyboard Navigation

**Requirements**:

- All interactive elements must be keyboard accessible
- Logical tab order
- Visible focus indicators
- No keyboard traps
- Support standard shortcuts (Escape, Enter, Arrow keys)

**Application to Our Spec**:

```typescript
// Webview keyboard handling
webview.onDidReceiveMessage(async (message) => {
  switch (message.type) {
    case "keydown":
      if (message.key === "Escape") {
        // Close modal or cancel action
      }
      break;
  }
});
```

**Task Reference**: Phase 4, Task 4.1 - Accessibility features implementation

---

### Screen Reader Support

**Requirements**:

- ARIA labels for all interactive elements
- ARIA live regions for dynamic content
- Semantic HTML structure
- Descriptive link text

**Application to Our Spec**:

```html
<!-- Good: Proper ARIA labels -->
<button aria-label="Create new memory" aria-describedby="create-memory-help">
  <span class="codicon codicon-add"></span>
</button>
<div id="create-memory-help" class="sr-only">
  Creates a new memory from selected code
</div>

<!-- Good: Live region for search results -->
<div role="region" aria-live="polite" aria-label="Search results">
  Found 5 memories matching "authentication"
</div>
```

**Task Reference**: Phase 4, Task 4.1 - Add ARIA labels and screen reader support

---

### Color and Contrast

**Requirements**:

- Minimum 4.5:1 contrast ratio for text
- Don't rely solely on color to convey information
- Support high contrast themes
- Use semantic colors from theme

**Application to Our Spec**:

```css
/* Good: Use theme colors */
.memory-item {
  color: var(--vscode-foreground);
  background-color: var(--vscode-editor-background);
  border: 1px solid var(--vscode-panel-border);
}

.memory-item:hover {
  background-color: var(--vscode-list-hoverBackground);
}

.memory-item:focus {
  outline: 2px solid var(--vscode-focusBorder);
  outline-offset: 2px;
}
```

**Task Reference**: Phase 4, Task 4.1 - Ensure 4.5:1 contrast ratio

---

## Performance Best Practices

### Bundle Size Optimization

**Guidelines**:

- Use webpack or esbuild for bundling
- Enable tree-shaking
- Minify production code
- Use dynamic imports for optional features
- Exclude devDependencies from bundle

**Application to Our Spec**:

```javascript
// webpack.config.js
module.exports = {
  target: "node",
  entry: "./src/extension.ts",
  output: {
    path: path.resolve(__dirname, "out"),
    filename: "extension.js",
    libraryTarget: "commonjs2",
  },
  externals: {
    vscode: "commonjs vscode", // Don't bundle vscode module
  },
  optimization: {
    minimize: true,
    usedExports: true,
  },
};
```

**Task Reference**: Phase 7, Task 7.2 - Optimize bundle size

---

### Lazy Loading

**Guidelines**:

- Load heavy dependencies on demand
- Defer non-critical initialization
- Use dynamic imports
- Cache loaded modules

**Application to Our Spec**:

```typescript
// Good: Lazy load heavy dependency
let enhancedMemoryClient: typeof import("@lanonasis/memory-client") | null =
  null;

async function getMemoryClient() {
  if (!enhancedMemoryClient) {
    enhancedMemoryClient = await import("@lanonasis/memory-client");
  }
  return enhancedMemoryClient;
}

// Use when needed
const client = await getMemoryClient();
```

**Task Reference**: Phase 7, Task 7.3 - Implement lazy loading

---

### Caching

**Guidelines**:

- Cache expensive operations
- Use appropriate TTL
- Implement cache invalidation
- Consider memory limits

**Application to Our Spec**:

```typescript
// Already in design - multi-level cache
class MemoryCache {
  private cache = new Map<string, CacheEntry>();
  private maxSize = 100;
  private ttl = 300000; // 5 minutes

  set(key: string, data: any) {
    if (this.cache.size >= this.maxSize) {
      // LRU eviction
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, {
      data,
      expires: Date.now() + this.ttl,
    });
  }
}
```

**Task Reference**: Phase 7, Task 7.1 - Implement caching strategy

---

## Testing Best Practices

### Unit Testing

**Guidelines**:

- Test services and utilities
- Mock VSCode API
- Use Jest or Mocha
- Aim for 80%+ coverage

**Application to Our Spec**:

```typescript
import * as assert from "assert";
import * as vscode from "vscode";

suite("SecureApiKeyService Tests", () => {
  test("Should generate valid PKCE parameters", () => {
    const service = new SecureApiKeyService(mockContext, mockChannel);
    const verifier = service["generateCodeVerifier"]();

    assert.strictEqual(verifier.length, 43);
    assert.match(verifier, /^[A-Za-z0-9_-]+$/);
  });
});
```

**Task Reference**: Phase 16, Task 16.1 - Write comprehensive unit tests

---

### Integration Testing

**Guidelines**:

- Test extension activation
- Test command execution
- Test UI interactions
- Use Extension Test Runner

**Application to Our Spec**:

```typescript
import * as vscode from "vscode";

suite("Extension Integration Tests", () => {
  test("Should activate extension", async () => {
    const ext = vscode.extensions.getExtension("LanOnasis.lanonasis-memory");
    await ext?.activate();
    assert.ok(ext?.isActive);
  });

  test("Should register all commands", async () => {
    const commands = await vscode.commands.getCommands();
    assert.ok(commands.includes("lanonasis.authenticate"));
    assert.ok(commands.includes("lanonasis.searchMemory"));
  });
});
```

**Task Reference**: Phase 16, Task 16.2 - Create integration tests

---

## Security Best Practices

### Credential Storage

**Guidelines**:

- Never store credentials in plaintext
- Use SecretStorage API
- Implement token refresh
- Clear credentials on logout

**Application to Our Spec**:

```typescript
// Good: Use SecretStorage
await context.secrets.store("lanonasis.apiKey", apiKey);

// Bad: Don't use workspace configuration
// await config.update('apiKey', apiKey); // ❌ Insecure
```

**Task Reference**: Phase 2: Unified Secure Authentication - already follows this

---

### Content Security Policy

**Guidelines**:

- Implement strict CSP for webviews
- Use nonces for inline scripts
- Restrict resource origins
- Validate all user input

**Application to Our Spec**:

```typescript
// Already in design
const csp = [
  "default-src 'none'",
  `script-src 'nonce-${nonce}'`,
  `style-src ${webview.cspSource}`,
  `img-src ${webview.cspSource} https:`,
  "connect-src https://api.lanonasis.com",
].join("; ");
```

**Task Reference**: Security Considerations section - already documented

---

## Recommendations for Our Project

### Immediate Actions

1. **Simplify Activation Events** (Phase 1, Task 1.2)
   - Remove redundant `onCommand` entries
   - Keep only `onStartupFinished`
   - Commands will auto-activate in VSCode 1.74+

2. **Implement Walkthrough API** (Phase 3, Task 3.3)
   - Replace custom onboarding with native Walkthrough
   - Better integration with VSCode
   - Consistent user experience

3. **Add Codicons** (Phase 4, Task 4.2)
   - Use `$(icon-name)` for all icons
   - Consistent with VSCode theme
   - Better accessibility

4. **Optimize Bundle** (Phase 7, Task 7.2)
   - Configure webpack/esbuild
   - Enable tree-shaking
   - Target < 100KB bundle size

### Long-term Improvements

1. **Telemetry Integration**
   - Use VSCode's built-in telemetry if available
   - Follow privacy guidelines
   - Opt-in by default

2. **Testing Infrastructure**
   - Set up Extension Test Runner
   - Automate testing in CI/CD
   - Maintain 80%+ coverage

3. **Documentation**
   - Follow VSCode documentation patterns
   - Include code samples
   - Provide troubleshooting guides

---

## Conclusion

These guidelines ensure our IDE extensions:

- ✅ Follow VSCode best practices
- ✅ Integrate seamlessly with native UI
- ✅ Provide excellent user experience
- ✅ Meet accessibility standards
- ✅ Maintain high performance
- ✅ Ensure security and privacy

All guidelines have been mapped to specific tasks in our implementation plan, ensuring comprehensive coverage during development.

**Next Steps**: Review these guidelines during implementation of each phase to ensure compliance with VSCode standards.

# VSCode Extension Issues - Root Cause Analysis & Fixes

## 🔴 Critical Issue Identified

**Root Cause:** VSIX packaging fails due to `@lanonasis/memory-client` local file dependency having uninstalled devDependencies.

**Error:**
```
npm error missing: @rollup/plugin-commonjs@^28.0.1, required by memory-client
npm error missing: @rollup/plugin-node-resolve@^15.3.0, required by memory-client
[... 14 more missing dependencies ...]
```

**Impact:**
- ❌ VSIX cannot be packaged properly
- ❌ Extension fails to activate in VSCode
- ❌ Commands like `lanonasis.refreshMemories` not registered
- ❌ Webview shows blank screen after authentication

---

## 📋 Issues Breakdown

### Issue 1: Command Not Found Error
```
Error: command 'lanonasis.refreshMemories' not found
```

**Cause:** Extension never fully activates due to packaging errors, so commands are never registered.

**Evidence:**
- Command IS registered in `src/extension.ts:181`
- Command IS in `package.json` activation events
- But VSIX packaging fails, creating broken extension bundle

### Issue 2: Blank Interface After Login

**Cause:** Multiple potential issues:
1. Extension activation fails silently
2. Webview loses state due to errors during refresh
3. Media files might not be loaded correctly in packaged VSIX

**From VSCode Docs:** Setting `webview.html` multiple times resets state. The code correctly sets HTML only once in `resolveWebviewView`, but errors during `refresh()` could cause blank display.

### Issue 3: Welcome Interface Disappears

**Cause:** The `refresh()` method in `MemorySidebarProvider` is called after authentication, but if the extension is in a bad state, the `postMessage` calls fail silently.

---

## 🔧 Solutions

### Solution 1: Use Pre-built Memory Client (RECOMMENDED)

The memory-client package has a pre-built tarball available. Use it instead of the file: reference.

**Steps:**
1. Navigate to memory-client directory
2. Install the tarball in the extension

```bash
cd /home/user/lan-onasis-monorepo/apps/lanonasis-maas/IDE-EXTENSIONS/vscode-extension
npm uninstall @lanonasis/memory-client
npm install ../../packages/memory-client/lanonasis-memory-client-1.0.0.tgz
```

**Why this works:** Packaged tarballs don't include devDependencies in the dependency tree validation.

---

### Solution 2: Use --no-dependencies Flag

Package the VSIX without bundling dependencies (they're already compiled in dist).

**Update package.json script:**
```json
"build:package": "npm run compile && vsce package --no-dependencies"
```

**Why this works:** Skips dependency validation entirely.

---

### Solution 3: Create Webpack Bundle (BEST LONG-TERM)

Bundle everything into a single file to avoid dependency issues.

**Create `webpack.config.js`:**
```javascript
//@ts-check
'use strict';

const path = require('path');

/**@type {import('webpack').Configuration}*/
const config = {
    target: 'node',
    entry: './src/extension.ts',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'extension.js',
        libraryTarget: 'commonjs2',
        devtoolModuleFilenameTemplate: '../[resource-path]'
    },
    devtool: 'source-map',
    externals: {
        vscode: 'commonjs vscode'
    },
    resolve: {
        extensions: ['.ts', '.js']
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: 'ts-loader'
                    }
                ]
            }
        ]
    }
};

module.exports = config;
```

**Update package.json:**
```json
{
    "main": "./dist/extension.js",
    "scripts": {
        "vscode:prepublish": "npm run package",
        "compile": "webpack",
        "watch": "webpack --watch",
        "package": "webpack --mode production --devtool hidden-source-map",
        "build:vsix": "vsce package"
    }
}
```

---

### Solution 4: Fix Activation Events (CLEANUP)

Remove duplicate activation event:

**In `package.json`, remove the duplicate:**
```json
"activationEvents": [
    "onStartupFinished",
    "onView:lanonasis.sidebar",
    "onView:lanonasisMemories",
    "onCommand:lanonasis.searchMemory",  // <-- Duplicate appears twice
    ...
]
```

**NOTE:** Modern VSCode (1.74+) doesn't require explicit `onCommand:` events. You can simplify to:
```json
"activationEvents": [
    "onStartupFinished"
]
```

---

## 🔍 Additional Issues Found

### 1. WebView localResourceRoots Too Broad

**Current code:**
```typescript
webviewView.webview.options = {
    enableScripts: true,
    localResourceRoots: [this._extensionUri]  // <-- Gives access to entire extension
};
```

**Best Practice from VSCode Docs:**
```typescript
webviewView.webview.options = {
    enableScripts: true,
    localResourceRoots: [
        vscode.Uri.joinPath(this._extensionUri, 'media'),
        vscode.Uri.joinPath(this._extensionUri, 'out')
    ]
};
```

### 2. No Error Handling in resolveWebviewView

**Current code:**
```typescript
public resolveWebviewView(webviewView: vscode.WebviewView, ...) {
    // No try-catch wrapper
    this._view = webviewView;
    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
    // Initial load
    this.refresh();  // <-- If this fails, user sees nothing
}
```

**Recommended:**
```typescript
public resolveWebviewView(webviewView: vscode.WebviewView, ...) {
    try {
        this._view = webviewView;
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Initial load with error handling
        this.refresh().catch(error => {
            console.error('[Lanonasis] Failed to load sidebar:', error);
            this._view?.webview.postMessage({
                type: 'error',
                message: 'Failed to load extension. Please reload VSCode.'
            });
        });
    } catch (error) {
        console.error('[Lanonasis] Fatal error in resolveWebviewView:', error);
    }
}
```

### 3. Webview State Not Persisted

From VSCode docs: Use `getState()`/`setState()` for low-overhead state persistence.

**In `media/sidebar.js`, add:**
```javascript
// Save state
function saveState() {
    vscode.setState(state);
}

// Restore state on load
const previousState = vscode.getState();
if (previousState) {
    state = { ...state, ...previousState };
}
```

---

## 🎯 Immediate Action Plan

**Priority 1: Fix Packaging (Choose ONE)**
1. ✅ Use pre-built tarball (quickest)
2. ✅ Use `--no-dependencies` flag
3. ✅ Implement webpack bundling (best long-term)

**Priority 2: Add Error Handling**
1. Wrap `resolveWebviewView` in try-catch
2. Add error handling to `refresh()` method
3. Show user-friendly error messages in webview

**Priority 3: Testing**
1. Test VSIX installation in clean VSCode
2. Verify all commands register
3. Test authentication flow
4. Verify webview doesn't go blank

**Priority 4: Cleanup**
1. Remove duplicate activation event
2. Restrict localResourceRoots
3. Add state persistence to webview

---

## 🧪 Testing Commands

```bash
# Fix dependency issue (Option 1)
cd /home/user/lan-onasis-monorepo/apps/lanonasis-maas/IDE-EXTENSIONS/vscode-extension
npm uninstall @lanonasis/memory-client
npm install ../../packages/memory-client/lanonasis-memory-client-1.0.0.tgz

# Compile
npm run compile

# Package with no dependencies (Option 2)
npm run compile && vsce package --no-dependencies

# Install and test
code --install-extension lanonasis-memory-1.4.8.vsix
```

---

## 📚 References

- [VSCode Webview API Guide](https://code.visualstudio.com/api/extension-guides/webview)
- [Extension Packaging](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [Bundling Extensions](https://code.visualstudio.com/api/working-with-extensions/bundling-extension)

---

**Status:** Root cause identified, multiple solutions provided
**Next Step:** Choose and implement one of the packaging solutions

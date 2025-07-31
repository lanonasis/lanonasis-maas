# VSCode Extension Testing Guide

## 🧪 Testing the Lanonasis Memory Extension

### Prerequisites
- VSCode 1.102.0 or higher
- Node.js 16+ and npm
- API key from [api.lanonasis.com](https://api.lanonasis.com)

## 🚀 Method 1: Extension Development Host (Recommended)

1. **Open Extension Project**:
   ```bash
   cd vscode-extension
   code .
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Compile Extension**:
   ```bash
   npm run compile
   ```

4. **Launch Development Host**:
   - Press `F5` in VSCode
   - Or Run → Start Debugging
   - New VSCode window opens with extension loaded

5. **Test Features**:
   - Tree view appears in Explorer panel
   - Commands available in Command Palette (`F1`)
   - Keyboard shortcuts work (`Ctrl+Shift+M`, `Ctrl+Shift+Alt+M`)

## 📦 Method 2: Install VSIX Package

1. **Install Extension**:
   ```bash
   code --install-extension lanonasis-memory-1.0.0.vsix
   ```

2. **Reload VSCode**:
   - Command Palette → "Developer: Reload Window"

3. **Verify Installation**:
   - Extensions view → Search "Lanonasis"
   - Should show "Lanonasis Memory Assistant"

## ⚙️ Configuration

1. **Open Settings** (`Ctrl+,`)
2. **Search for "lanonasis"**
3. **Configure**:
   - `Lanonasis: Api Key` - Your API key
   - `Lanonasis: Api Url` - Default: https://api.lanonasis.com
   - `Lanonasis: Default Memory Type` - Default: context

## 🔍 Manual Test Cases

### Authentication Flow
1. **First Activation**:
   - ✅ Welcome message appears
   - ✅ Prompts for API key setup
   - ✅ Tree view shows "not authenticated" state

2. **Configure API Key**:
   - ✅ Command "Lanonasis: Authenticate" works
   - ✅ API key input dialog appears
   - ✅ Connection test validates key
   - ✅ Success message on valid key
   - ✅ Error message on invalid key

### Memory Search (`Ctrl+Shift+M`)
1. **Search Dialog**:
   - ✅ Input box appears with prompt
   - ✅ Search executes on Enter
   - ✅ Progress indicator shows during search

2. **Search Results**:
   - ✅ Quick pick list shows results
   - ✅ Results show title, type, content preview
   - ✅ Selecting result opens memory in editor
   - ✅ "No results" message when empty

### Create Memory (`Ctrl+Shift+Alt+M`)
1. **From Selection**:
   - ✅ Select text in editor
   - ✅ Keyboard shortcut works
   - ✅ Title input pre-filled with filename:line
   - ✅ Memory created with selection content
   - ✅ Metadata includes source info

2. **From File**:
   - ✅ Command "Create Memory from File" works
   - ✅ Entire file content captured
   - ✅ Title pre-filled with filename

### Tree View
1. **Structure**:
   - ✅ Memories grouped by type
   - ✅ Expandable type folders
   - ✅ Individual memory items
   - ✅ Icons for different types

2. **Actions**:
   - ✅ Click memory opens in editor
   - ✅ Refresh button works
   - ✅ Authenticate button (when not auth'd)

### Code Completion
1. **Trigger Characters**:
   - ✅ `@` shows memory references
   - ✅ `#` shows comment-formatted memories
   - ✅ `//` shows code snippets

2. **Suggestions**:
   - ✅ Relevant memories appear
   - ✅ Similarity scores shown
   - ✅ Selecting inserts appropriate format

## 🐛 Common Issues

### Extension Not Loading
- Check VSCode version (1.102.0+)
- Reload window after installation
- Check developer console for errors

### API Connection Fails
- Verify API key is correct
- Check network connectivity
- Ensure api.lanonasis.com is accessible
- Try different API URL if self-hosted

### Commands Not Working
- Check keyboard shortcuts in settings
- Use Command Palette as alternative
- Verify extension is enabled

### Tree View Empty
- Ensure authenticated
- Check if memories exist in account
- Try refresh button
- Verify API permissions

## 🔧 Development Testing

### Debug Mode
```bash
# Watch mode for auto-compile
npm run watch

# Debug with breakpoints
# F5 to launch, set breakpoints in .ts files
```

### Manual Testing Script
```bash
#!/bin/bash
echo "Testing VSCode Extension..."

# Install extension
code --install-extension lanonasis-memory-1.0.0.vsix --force

# Open test workspace
code test-workspace/

echo "✅ Extension installed and test workspace opened"
echo "📝 Manual testing required - see TESTING.md"
```

## 📊 Test Results Log

Date: ___________
Tester: ___________

| Feature | Status | Notes |
|---------|--------|--------|
| Authentication | ☐ Pass ☐ Fail | |
| Search (Ctrl+Shift+M) | ☐ Pass ☐ Fail | |  
| Create from Selection | ☐ Pass ☐ Fail | |
| Create from File | ☐ Pass ☐ Fail | |
| Tree View | ☐ Pass ☐ Fail | |
| Code Completion | ☐ Pass ☐ Fail | |
| Settings Integration | ☐ Pass ☐ Fail | |
| Error Handling | ☐ Pass ☐ Fail | |

---

**Need Help?** Check [docs.lanonasis.com](https://docs.lanonasis.com) or create an issue on GitHub.
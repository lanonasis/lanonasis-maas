# Lanonasis Memory Assistant for Cursor

🧠 **Intelligent Memory Management for Cursor IDE**

The Lanonasis Memory Assistant brings powerful AI-powered memory management directly to your Cursor IDE, enabling you to store, search, and manage knowledge seamlessly while coding.

## ✨ Key Features

### 🔐 **Auto-Redirect Authentication**
- **OAuth2 with Browser Redirect**: Seamless authentication via browser redirect
- **Secure Token Management**: Encrypted token storage with automatic refresh
- **Fallback API Key Support**: Manual API key entry for advanced users
- **Session Persistence**: Stay logged in across Cursor sessions

### 🧠 **Smart Memory Management**
- **Semantic Search**: AI-powered vector search across your memories
- **Memory Types**: Organize with context, project, knowledge, reference, personal, workflow
- **Auto-Categorization**: Smart tagging and organization
- **Rich Metadata**: Track source files, line numbers, and timestamps

### ⚡ **Cursor Integration**
- **Selection to Memory**: Convert code selections to searchable memories
- **File to Memory**: Save entire files as memories
- **Auto-Completion**: Memory-based code suggestions
- **Tree View**: Organized sidebar with memory categories
- **Keyboard Shortcuts**: Quick access via hotkeys

### 🌐 **Enhanced Performance**
- **Gateway Mode**: Optimized routing through Onasis Gateway
- **Auto-Refresh**: Keep memories updated automatically
- **Caching**: Smart caching for faster access
- **Real-time Sync**: Synchronized across all your devices

## 🚀 Quick Start

### Installation

1. **Install the Extension**
   ```bash
   # From Cursor marketplace (when published)
   # Or install from .vsix file
   ```

2. **First Time Setup**
   - Open Cursor and look for the Lanonasis Memory icon in the sidebar
   - Click "Get Started" in the welcome message
   - Choose authentication method:
     - **Auto Login**: Browser-based OAuth2 (recommended)
     - **Manual Setup**: Enter API key manually

3. **Start Using**
   - Select code and press `Ctrl+Shift+Alt+M` (or `Cmd+Shift+Alt+M` on Mac)
   - Search memories with `Ctrl+Shift+M` (or `Cmd+Shift+M` on Mac)
   - Browse memories in the sidebar tree view

## 🎯 Usage Guide

### Creating Memories

#### From Code Selection
1. Select any text in your editor
2. Press `Ctrl+Shift+Alt+M` or right-click → "Create Memory from Selection"
3. Enter a title and optionally adjust the memory type
4. Your code snippet is saved with context (file, line number, etc.)

#### From Entire File
1. Open any file
2. Run "Create Memory from Current File" command
3. The entire file content is saved as a memory

### Searching Memories

#### Quick Search
1. Press `Ctrl+Shift+M` anywhere in Cursor
2. Type your search query
3. Browse results and click to open

#### Browse by Category
1. Open the Memories sidebar
2. Expand memory type categories (Context, Project, etc.)
3. Click any memory to view in a new tab

### Memory Types

- **Context**: General contextual information and background knowledge
- **Project**: Project-specific documentation and notes
- **Knowledge**: Educational content, tutorials, and how-to guides
- **Reference**: Quick reference materials, APIs, code snippets
- **Personal**: Private notes and personal knowledge
- **Workflow**: Process documentation and procedures

## ⚙️ Configuration

Access settings via `File > Preferences > Settings > Extensions > Lanonasis Memory`

### Authentication Settings
```json
{
  "lanonasis.useAutoAuth": true,          // Enable browser-based OAuth2
  "lanonasis.authUrl": "https://auth.lanonasis.com",
  "lanonasis.apiUrl": "https://api.lanonasis.com"
}
```

### Connection Settings
```json
{
  "lanonasis.useGateway": true,           // Use Onasis Gateway (recommended)
  "lanonasis.gatewayUrl": "https://api.lanonasis.com"
}
```

### Behavior Settings
```json
{
  "lanonasis.defaultMemoryType": "context",     // Default type for new memories
  "lanonasis.searchLimit": 10,                  // Max search results
  "lanonasis.enableAutoCompletion": true,       // Memory-based completions
  "lanonasis.autoRefreshInterval": 300000       // Auto-refresh interval (5 min)
}
```

## 🎮 Commands & Shortcuts

| Command | Shortcut | Description |
|---------|----------|-------------|
| Search Memories | `Ctrl+Shift+M` | Open memory search |
| Create Memory from Selection | `Ctrl+Shift+Alt+M` | Save selected code as memory |
| Create Memory from File | - | Save entire file as memory |
| Authenticate | - | Login to Lanonasis |
| Logout | - | Sign out from Lanonasis |
| Refresh Memories | - | Refresh memory list |
| Switch Mode | - | Toggle Gateway/Direct mode |

## 🔒 Security & Privacy

### Authentication Security
- **OAuth2 PKCE**: Industry-standard secure authentication flow
- **Encrypted Storage**: Tokens stored in Cursor's secure credential store
- **Automatic Refresh**: Seamless token renewal without re-authentication
- **Secure Cleanup**: Complete token removal on logout

### Data Privacy
- **End-to-End Encryption**: All memories encrypted in transit and at rest
- **Multi-Tenant Isolation**: Your data is completely isolated from other users
- **GDPR Compliant**: Full compliance with data protection regulations
- **Local Caching**: Smart caching without compromising security

## 🛠️ Development & Contributing

### Building from Source

```bash
# Clone repository
git clone https://github.com/lanonasis/lanonasis-maas
cd lanonasis-maas/cursor-extension

# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Package extension
npm run package
```

### Project Structure
```
cursor-extension/
├── src/
│   ├── extension.ts                 # Main extension entry point
│   ├── auth/
│   │   └── AuthenticationService.ts # OAuth2 & API key auth
│   ├── services/
│   │   └── MemoryService.ts         # Memory API integration
│   ├── providers/
│   │   ├── MemoryTreeProvider.ts    # Sidebar tree view
│   │   └── MemoryCompletionProvider.ts # Auto-completion
│   └── types/
│       └── memory-aligned.ts        # Type definitions
├── package.json                     # Extension manifest
└── README.md                        # This file
```

## 📚 API Reference

The extension integrates with the Lanonasis Memory as a Service (MaaS) API. For detailed API documentation, visit:

- **API Documentation**: https://docs.lanonasis.com/api
- **SDK Documentation**: https://docs.lanonasis.com/sdk
- **OAuth2 Guide**: https://docs.lanonasis.com/auth

## 🆘 Support & Feedback

### Getting Help
- **Documentation**: https://docs.lanonasis.com
- **Support Email**: support@lanonasis.com
- **GitHub Issues**: https://github.com/lanonasis/lanonasis-maas/issues

### Known Issues
- OAuth2 flow requires system browser access
- Some corporate firewalls may block authentication redirects
- Memory search requires active internet connection

### Troubleshooting

#### Authentication Issues
1. Ensure system browser is available
2. Check firewall settings for localhost:8080
3. Try manual API key authentication as fallback

#### Connection Issues
1. Verify internet connection
2. Check API endpoint configuration
3. Try switching between Gateway and Direct modes

## 📄 License

This extension is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

Built with ❤️ by the Lanonasis team, powered by:
- **Cursor IDE**: Next-generation code editor
- **OpenAI**: Semantic search capabilities
- **Supabase**: Scalable backend infrastructure
- **TypeScript**: Type-safe development

---

**Ready to supercharge your coding workflow with intelligent memory management?**

[Get your API key](https://api.lanonasis.com) • [View Documentation](https://docs.lanonasis.com) • [Join Community](https://discord.gg/lanonasis)
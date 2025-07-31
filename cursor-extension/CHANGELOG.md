# Changelog

All notable changes to the Lanonasis Memory Assistant for Cursor extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-07-30

### 🎉 Initial Release for Cursor IDE

#### Added
- **Auto-Redirect Authentication**: OAuth2 with browser redirect authentication
- **Secure Token Management**: Encrypted storage with automatic token refresh
- **Enhanced Memory Management**: Full CRUD operations for memories
- **Smart Search**: AI-powered semantic search across all memories
- **Memory Categorization**: Six memory types (context, project, knowledge, reference, personal, workflow)
- **Cursor-Specific Integration**: Optimized for Cursor IDE workflows
- **Tree View Provider**: Organized sidebar with memory categories and search
- **Code Selection Memories**: Convert selected code to searchable memories
- **File-Based Memories**: Save entire files as memories with metadata
- **Auto-Completion**: Memory-based code suggestions
- **Gateway Mode**: Enhanced performance through Onasis Gateway
- **Auto-Refresh**: Automatic memory list updates
- **Rich Metadata**: Track source files, line numbers, timestamps
- **Keyboard Shortcuts**: Quick access to all features
- **Configuration Options**: Comprehensive settings for all features

#### Security
- **OAuth2 PKCE**: Industry-standard secure authentication flow
- **Encrypted Token Storage**: Secure credential management via Cursor's keychain
- **Automatic Token Refresh**: Seamless session management
- **Secure Logout**: Complete credential cleanup

#### Performance
- **Smart Caching**: Optimized memory loading with caching
- **Gateway Integration**: Enhanced routing and performance
- **Async Operations**: Non-blocking UI with progress indicators
- **Error Handling**: Comprehensive error management and recovery

#### Developer Experience
- **TypeScript Support**: Full type safety and IntelliSense
- **Modular Architecture**: Clean separation of concerns
- **Extensible Design**: Easy to extend and maintain
- **Comprehensive Logging**: Detailed logging for debugging

### 🔧 Technical Details

#### Dependencies
- **VSCode Engine**: ^1.102.0 (Cursor compatible)
- **@lanonasis/memory-client**: ^1.0.0
- **TypeScript**: ^5.8.3
- **Node.js**: ^16.0.0+

#### Supported Platforms
- **Windows 10/11**: Full feature support
- **macOS 10.15+**: Full feature support  
- **Linux**: Full feature support
- **Cursor IDE**: v0.32.0+

#### Configuration Schema
```json
{
  "lanonasis.useAutoAuth": true,
  "lanonasis.authUrl": "https://auth.lanonasis.com",
  "lanonasis.apiUrl": "https://api.lanonasis.com",
  "lanonasis.gatewayUrl": "https://api.lanonasis.com",
  "lanonasis.useGateway": true,
  "lanonasis.defaultMemoryType": "context",
  "lanonasis.searchLimit": 10,
  "lanonasis.enableAutoCompletion": true,
  "lanonasis.autoRefreshInterval": 300000
}
```

### 📝 Migration Notes

#### From VSCode Extension
- **Configuration Migration**: Existing VSCode extension settings are preserved
- **Authentication Upgrade**: Automatic upgrade to OAuth2 authentication
- **Feature Parity**: All VSCode features available plus Cursor-specific enhancements
- **Data Compatibility**: Seamless access to existing memories

#### Installation Process
1. Install extension in Cursor
2. Choose authentication method (OAuth2 recommended)
3. Existing users: automatic token migration
4. New users: guided setup process

### 🚀 Getting Started

1. **Install Extension**
   - Install from Cursor marketplace or .vsix file
   
2. **First-Time Setup**
   - Click "Get Started" in welcome message
   - Choose "Auto Login" for OAuth2 authentication
   - Authorize in browser when redirected
   
3. **Start Using**
   - Select code and press `Ctrl+Shift+Alt+M`
   - Search memories with `Ctrl+Shift+M`
   - Browse memories in sidebar

### 🐛 Known Issues

- OAuth2 flow requires system browser access
- Corporate firewalls may block localhost:8080 redirect
- First authentication requires internet connection

### 🔮 Coming Soon

- **Bulk Memory Operations**: Select and manage multiple memories
- **Advanced Filtering**: Complex search filters and sorting
- **Memory Sharing**: Collaborate on memories with team members
- **Workspace Integration**: Project-specific memory collections
- **AI Suggestions**: Smart memory recommendations
- **Export/Import**: Backup and restore memory collections

---

For support and feedback:
- **Documentation**: https://docs.lanonasis.com
- **Support**: support@lanonasis.com
- **Issues**: https://github.com/lanonasis/lanonasis-maas/issues
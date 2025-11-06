# Change Log

## [1.4.4] - 2025-11-05

### Maintenance
- 🔄 Version alignment across all IDE extensions (VSCode, Cursor, Windsurf)
- 📦 Package manager standardization fixes
- 🐛 Consistency improvements for marketplace releases

## [1.4.2] - 2025-11-04

### Fixed
- 🐛 Extension activation events for sidebar and tree views
- 🎨 Activity bar icon visibility improvements

## [1.4.0] - 2025-11-02

### Security
- 🔐 Applied OAuth timeout race condition fixes (Issues #43, #44, #45)
- 🔐 Implemented proper timeout tracking to prevent double-rejection
- 🔐 Added clearTimeout on all authentication exit paths
- 🔐 Maintained backward-compatible legacy API key fallback

### Technical
- ♻️ Standardized authentication patterns across VSCode, Cursor, and Windsurf extensions
- 📝 Updated type definitions for consistent interface usage
- ⚡ Improved error handling in OAuth flows

## [1.3.2] - 2025-10-18

### Added
- ✅ Web extension support (works in vscode.dev, GitHub.dev)
- ✅ Virtual workspace compatibility
- ✅ Untrusted workspace support

### Changed
- 🔄 Updated CLI integration to v3.0.6+ (with auth persistence)
- 📝 Updated description to reflect CLI v3.0.6 compatibility
- 🌐 Added browser entry point for web compatibility

### Fixed
- 🐛 Fixed "extension not available in VS Code for Web" warning
- 🔧 Updated CLI version references from v1.5.2+ to v3.0.6+

## [1.0.0] - 2025-01-30

### Added
- 🔍 **Semantic Memory Search** - Search memories by meaning with Ctrl+Shift+M
- 📝 **Create from Selection** - Turn code snippets into memories with Ctrl+Shift+Alt+M  
- 🌳 **Memory Tree View** - Browse memories organized by type in Explorer panel
- 💡 **Code Completion** - Get memory suggestions while typing (@, #, //)
- 🔐 **Secure Authentication** - API key integration with api.lanonasis.com
- ⚡ **Real-time Sync** - Always up-to-date with your memory service
- 🎯 **Memory Types** - Support for context, project, knowledge, reference, personal, workflow
- 📊 **Rich Metadata** - File paths, line numbers, source tracking
- 🔧 **Configurable Settings** - Customize API URL, memory types, search limits

### Features
- **Keyboard Shortcuts**: Quick access to all memory functions
- **Context Menus**: Right-click integration for selected text
- **Settings Integration**: Native VSCode settings for configuration
- **Tree View Actions**: Refresh, authenticate, and browse memories
- **Progress Indicators**: Visual feedback for all operations
- **Error Handling**: Comprehensive error messages and recovery

### Technical
- TypeScript implementation with strict mode
- VSCode Extension API v1.102.0 compatibility
- Memory as a Service (MaaS) SDK integration
- Secure API key storage in VSCode settings
- Multi-tenant authentication support
# Lanonasis Memory Assistant for VSCode

**Transform your coding experience with intelligent memory management and secure authentication directly in VSCode.**

## 🔐 Security & Authentication Enhancements

### 🔐 Secure Authentication
- **OAuth2 with PKCE** - Secure browser-based authentication flow (Recommended)
- **SecretStorage Integration** - Credentials stored in OS keychain (macOS Keychain, Windows Credential Manager)
- **Manual API Key Option** - Alternative authentication method for automation/CI
- **Automatic Token Refresh** - No manual re-authentication needed
- **Console Redaction** - Prevents credential leaks in logs

### 🎯 Authentication Options
Choose your preferred method when running **"Lanonasis: Authenticate"**:
1. **OAuth (Browser)** - Opens browser for secure sign-in with automatic token management
2. **API Key** - Direct API key entry with secure storage

### ⚠️ Breaking Changes
- **Deprecated**: `lanonasis.apiKey` setting in plaintext is now deprecated
- **Migration**: Run `Lanonasis: Authenticate` to migrate to secure storage
- **Note**: Old API keys still work but will show deprecation warning

## Previous Updates

### v1.3.2
- **🌐 Web Extension Support** - Works in VS Code for Web (vscode.dev, github.dev)
- **🔧 CLI Integration** - Enhanced integration with @lanonasis/cli for advanced features
- **📦 Virtual Workspaces** - Full support for virtual workspaces

### v1.2.0
- **🔑 API Key Management** - Create and manage API keys directly
- **📁 Project Organization** - Organize API keys by projects
- **🔄 Key Rotation** - Rotate API keys for enhanced security

## 🧠 Features

### Memory Management
- **🔍 Semantic Search** - Find memories by meaning, not just keywords (Ctrl+Shift+M)
- **📝 Create from Selection** - Turn code snippets into searchable memories (Ctrl+Shift+Alt+M)  
- **🌳 Memory Tree View** - Browse memories organized by type in the Explorer
- **💡 Code Completion** - Get memory suggestions while typing (@, #, //)
- **⚡ Real-time Sync** - Always up-to-date with your memory service

### API Key Management (NEW!)
- **🔑 Manage API Keys** - Full API key lifecycle management (Ctrl+Shift+K)
- **📁 Create Projects** - Organize keys by project or environment
- **🔄 Rotate Keys** - Secure key rotation with one click
- **👁️ View Projects** - See all your projects and their keys
- **🌍 Multi-Environment** - Support for dev, staging, and production

## 🚀 Getting Started

### Prerequisites
- VS Code 1.74.0 or higher (Desktop or Web)
- Lanonasis account (sign up at [auth.lanonasis.com](https://auth.lanonasis.com))
- Compatible @lanonasis/cli (optional, for enhanced features)
- Internet connection for API access

### Quick Start
1. **Install Extension**:
   - Search "LanOnasis" in VS Code Extensions
   - Or: `code --install-extension LanOnasis.lanonasis-memory`

2. **Authenticate** (Choose one method):
   - **Method A - OAuth (Recommended)**:
     - Press `Cmd+Shift+P` → `Lanonasis: Authenticate`
     - Select "OAuth (Browser)"
     - Browser opens → Sign in → Done!

   - **Method B - API Key**:
     - Press `Cmd+Shift+P` → `Lanonasis: Authenticate`
     - Select "API Key"
     - Enter your API key from [api.lanonasis.com](https://api.lanonasis.com)

3. **Start Using**:
   - Press `Ctrl+Shift+M` to search memories
   - Press `Ctrl+Shift+K` to manage API keys
   - Select code and press `Ctrl+Shift+Alt+M` to create memories
   - Click Lanonasis icon in Activity Bar for sidebar view

## 🎯 Use Cases

### Memory Management
- **Code Documentation** - Store explanations for complex code patterns
- **Project Knowledge** - Keep project-specific context and decisions
- **Learning Notes** - Save code examples and explanations  
- **Team Collaboration** - Share knowledge across team members
- **Reference Library** - Build a searchable code snippet collection

### API Key Management
- **Secure Key Storage** - Manage all your API keys in one place
- **Project Organization** - Group keys by project or service
- **Environment Management** - Separate keys for dev/staging/prod
- **Team Access Control** - Share keys securely with team members
- **Audit Trail** - Track key usage and rotation history

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+M` | Search memories |
| `Ctrl+Shift+Alt+M` | Create memory from selection |
| `Ctrl+Shift+K` | Manage API keys |
| `F1` → "Lanonasis" | Access all commands |

## 🔧 Configuration

### Memory Settings
- `lanonasis.apiKey` - Your API key from api.lanonasis.com
- `lanonasis.useGateway` - Use Onasis Gateway for enhanced performance (default: true)
- `lanonasis.gatewayUrl` - Gateway endpoint (default: https://api.lanonasis.com)
- `lanonasis.apiUrl` - Direct API endpoint (default: https://api.lanonasis.com)
- `lanonasis.defaultMemoryType` - Default type for new memories
- `lanonasis.searchLimit` - Number of search results to show
- `lanonasis.enableAutoCompletion` - Enable memory-based code completion

### API Key Management Settings
- `lanonasis.enableApiKeyManagement` - Enable API key management features (default: true)
- `lanonasis.defaultEnvironment` - Default environment for new keys (dev/staging/production)
- `lanonasis.organizationId` - Your organization ID for team features

### CLI Integration Settings
- `lanonasis.preferCLI` - Prefer CLI integration when available (default: true)
- `lanonasis.enableMCP` - Enable Model Context Protocol channels (default: true)
- `lanonasis.cliDetectionTimeout` - CLI detection timeout in ms (default: 2000)
- `lanonasis.verboseLogging` - Enable verbose logging for debugging (default: false)

### Gateway vs Direct API
- **Gateway Mode** (recommended): Uses Onasis Gateway for optimized routing, caching, and enhanced performance
- **Direct API Mode**: Connects directly to memory service for simple setups

## 🏢 Enterprise Features

- Multi-tenant isolation with organization support
- GDPR compliance with data export/deletion
- Advanced search with vector similarity
- Team collaboration with shared memories
- API key management with project organization
- Role-based access control
- Custom deployment options
- Audit logging and compliance

## 📊 Commands

### Authentication Commands
- `Lanonasis: Authenticate` - Configure OAuth or API key authentication
- `Lanonasis: Configure Authentication` - Set up secure credentials
- `Lanonasis: Check API Key Status` - Verify authentication status
- `Lanonasis: Clear API Key` - Remove stored credentials
- `Lanonasis: Test Connection` - Verify API connectivity

### Memory Commands
- `Lanonasis: Search Memory` - Search through all memories (`Ctrl+Shift+M`)
- `Lanonasis: Create Memory` - Create memory from selection (`Ctrl+Shift+Alt+M`)
- `Lanonasis: Create Memory from File` - Create memory from entire file
- `Lanonasis: Refresh Memories` - Sync with server
- `Lanonasis: Switch Gateway/Direct API Mode` - Toggle connection mode

### API Key Commands
- `Lanonasis: Manage API Keys` - Open API key management (`Ctrl+Shift+K`)
- `Lanonasis: Create API Key Project` - Create new project
- `Lanonasis: View API Key Projects` - List all projects

## 🔐 Security

### Credential Storage
- **SecretStorage API** - Credentials stored in OS-level keychain
  - macOS: Keychain
  - Windows: Credential Manager
  - Linux: Secret Service API
- **OAuth2 with PKCE** - Industry-standard secure authentication
- **Automatic Token Refresh** - No credential re-entry needed
- **Console Redaction** - Credentials never appear in logs

### API Security
- All API keys encrypted at rest and in transit
- Support for key rotation and expiration
- Audit trail for all key operations
- TLS 1.3 encrypted communication
- Credentials stored in OS-level secure storage (SecretStorage API); legacy plaintext settings are automatically migrated to secure storage

## 📞 Support

- **Documentation**: [docs.lanonasis.com](https://docs.lanonasis.com)
- **API Reference**: [api.lanonasis.com/docs](https://api.lanonasis.com/docs)
- **Issues**: [GitHub Issues](https://github.com/lanonasis/lanonasis-maas/issues)
- **Enterprise**: Contact enterprise@lanonasis.com

## 🎉 What's Next

- Workspace memory sharing
- AI-powered memory suggestions
- Memory analytics dashboard
- Team collaboration features
- More language support

---

**Made with ❤️ by the Lanonasis Team**

*Memory as a Service - Making knowledge persistent and searchable*
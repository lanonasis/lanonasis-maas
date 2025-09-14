# LanOnasis Memory Assistant for VSCode

**Transform your coding experience with intelligent memory management and API key management directly in VSCode.**

## 🆕 New in v1.2.0

- **🔑 API Key Management** - Create and manage API keys directly from VSCode
- **📁 Project Organization** - Organize API keys by projects
- **🌳 API Key Tree View** - Browse projects and keys in Explorer panel
- **🔄 Key Rotation** - Rotate API keys for enhanced security
- **⚡ Enhanced Performance** - Improved memory search and creation

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

1. **Get API Key**: Visit [api.LanOnasis.com](https://api.LanOnasis.com) to get your free API key
2. **Configure Extension**: Open VSCode settings and add your API key to `LanOnasis.apiKey`
3. **Start Using**: 
   - Press `Ctrl+Shift+M` to search memories
   - Press `Ctrl+Shift+K` to manage API keys
   - Select code and press `Ctrl+Shift+Alt+M` to create memories

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
| `F1` → "LanOnasis" | Access all commands |

## 🔧 Configuration

### Memory Settings
- `LanOnasis.apiKey` - Your API key from api.LanOnasis.com
- `LanOnasis.useGateway` - Use Onasis Gateway for enhanced performance (default: true)
- `LanOnasis.gatewayUrl` - Gateway endpoint (default: https://api.LanOnasis.com)
- `LanOnasis.apiUrl` - Direct API endpoint (default: https://api.LanOnasis.com)
- `LanOnasis.defaultMemoryType` - Default type for new memories
- `LanOnasis.searchLimit` - Number of search results to show
- `LanOnasis.enableAutoCompletion` - Enable memory-based code completion

### API Key Management Settings (NEW!)
- `LanOnasis.enableApiKeyManagement` - Enable API key management features (default: true)
- `LanOnasis.defaultEnvironment` - Default environment for new keys (dev/staging/production)
- `LanOnasis.organizationId` - Your organization ID for team features

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

### Memory Commands
- `LanOnasis: Search Memory` - Search through all memories
- `LanOnasis: Create Memory` - Create memory from selection
- `LanOnasis: List Memories` - View all memories
- `LanOnasis: Delete Memory` - Remove a memory
- `LanOnasis: Update Memory` - Edit existing memory
- `LanOnasis: Refresh Memories` - Sync with server
- `LanOnasis: Switch Gateway/Direct API Mode` - Toggle connection mode

### API Key Commands (NEW!)
- `LanOnasis: Manage API Keys` - Open API key management
- `LanOnasis: Create API Key Project` - Create new project
- `LanOnasis: View API Key Projects` - List all projects
- `LanOnasis: Refresh API Keys` - Update key list

## 🔐 Security

- All API keys are stored securely in VSCode's secret storage
- Keys are never logged or exposed in code
- Support for key rotation and expiration
- Audit trail for all key operations
- Encrypted communication with TLS 1.3

## 📞 Support

- **Documentation**: [docs.LanOnasis.com](https://docs.LanOnasis.com)
- **API Reference**: [api.LanOnasis.com/docs](https://api.LanOnasis.com/docs)
- **Issues**: [GitHub Issues](https://github.com/LanOnasis/LanOnasis-maas/issues)
- **Enterprise**: Contact enterprise@LanOnasis.com

## 🎉 What's Next

- Workspace memory sharing
- AI-powered memory suggestions
- Memory analytics dashboard
- Team collaboration features
- More language support

---

**Made with ❤️ by the LanOnasis Team**

*Memory as a Service - Making knowledge persistent and searchable*
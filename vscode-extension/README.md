# Lanonasis Memory Assistant for VSCode

**Transform your coding experience with intelligent memory management directly in VSCode.**

## 🧠 Features

- **🔍 Semantic Search** - Find memories by meaning, not just keywords (Ctrl+Shift+M)
- **📝 Create from Selection** - Turn code snippets into searchable memories (Ctrl+Shift+Alt+M)  
- **🌳 Memory Tree View** - Browse memories organized by type in the Explorer
- **💡 Code Completion** - Get memory suggestions while typing (@, #, //)
- **🔐 Secure Authentication** - API key integration with api.lanonasis.com
- **⚡ Real-time Sync** - Always up-to-date with your memory service

## 🚀 Getting Started

1. **Get API Key**: Visit [api.lanonasis.com](https://api.lanonasis.com) to get your free API key
2. **Configure Extension**: Open VSCode settings and add your API key to `lanonasis.apiKey`
3. **Start Using**: Press `Ctrl+Shift+M` to search or select code and press `Ctrl+Shift+Alt+M` to create memories

## 🎯 Use Cases

- **Code Documentation** - Store explanations for complex code patterns
- **Project Knowledge** - Keep project-specific context and decisions
- **Learning Notes** - Save code examples and explanations  
- **Team Collaboration** - Share knowledge across team members
- **Reference Library** - Build a searchable code snippet collection

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+M` | Search memories |
| `Ctrl+Shift+Alt+M` | Create memory from selection |
| `F1` → "Lanonasis" | Access all commands |

## 🔧 Configuration

- `lanonasis.apiKey` - Your API key from api.lanonasis.com
- `lanonasis.useGateway` - Use Onasis Gateway for enhanced performance (default: true)
- `lanonasis.gatewayUrl` - Gateway endpoint (default: https://api.lanonasis.com)
- `lanonasis.apiUrl` - Direct API endpoint (default: https://api.lanonasis.com)
- `lanonasis.defaultMemoryType` - Default type for new memories
- `lanonasis.searchLimit` - Number of search results to show

### Gateway vs Direct API
- **Gateway Mode** (recommended): Uses Onasis Gateway for optimized routing, caching, and enhanced performance
- **Direct API Mode**: Connects directly to memory service for simple setups

## 🏢 Enterprise Features

- Multi-tenant isolation
- GDPR compliance
- Advanced search capabilities
- Team collaboration features
- Custom deployment options

## 📞 Support

- **Documentation**: [docs.lanonasis.com](https://docs.lanonasis.com)
- **Issues**: [GitHub Issues](https://github.com/lanonasis/lanonasis-maas/issues)
- **Enterprise**: Contact enterprise@lanonasis.com

---

**Made with ❤️ by the Lanonasis Team**
# Lanonasis Memory Assistant for Windsurf

🚀 **Next-Generation AI Memory Management for Windsurf IDE**

The Lanonasis Memory Assistant brings intelligent, AI-powered memory management directly to your Windsurf IDE, with enhanced context awareness and seamless authentication.

## ✨ Key Features

### 🔐 **Auto-Redirect OAuth2 Authentication**
- **Seamless Browser Login**: OAuth2 with PKCE for maximum security
- **Automatic Token Management**: Encrypted storage with auto-refresh
- **Fallback API Key Support**: Manual authentication for enterprise users
- **Session Persistence**: Stay logged in across Windsurf sessions

### 🤖 **AI-Powered Memory Management**
- **Semantic Search**: Vector-based similarity search with relevance scoring
- **Smart Suggestions**: Context-aware memory recommendations
- **Code Analysis**: Analyze code patterns and find similar memories
- **Interactive AI Assistant**: Dedicated panel for memory operations

### 🧠 **Windsurf-Specific Enhancements**
- **Context Awareness**: Smart tracking of current work and files
- **Workspace Integration**: Create memories from entire workspace context
- **Language Intelligence**: Enhanced support for all programming languages
- **Real-time Sync**: Live updates and memory suggestions

### 📚 **Rich Memory Types**
- **Context**: General contextual information and background
- **Project**: Project-specific documentation and notes
- **Knowledge**: Educational content and tutorials
- **Reference**: Quick reference materials and code snippets
- **Personal**: Private notes and personal knowledge
- **Workflow**: Process documentation and procedures

## 🚀 Quick Start

### Installation

1. **Install Extension**
   - Download `lanonasis-memory-windsurf-1.0.0.vsix`
   - In Windsurf: Extensions → Install from VSIX
   - Or drag and drop the .vsix file into Windsurf

2. **First Launch**
   - Extension activates automatically
   - Welcome message guides setup process
   - Choose authentication method

3. **Authentication Setup**
   - **Auto Login** (Recommended): Browser-based OAuth2
   - **Manual Setup**: Enter API key from api.lanonasis.com
   - **Settings**: Configure via Windsurf preferences

## 🎯 Usage Guide

### 🔍 **Searching Memories**

#### Quick Search
- **Keyboard**: `Ctrl+Shift+M` (or `Cmd+Shift+M` on Mac)
- **Command Palette**: "Search Memories"
- **AI Assistant**: Use the dedicated AI panel

#### AI-Powered Suggestions
- **Keyboard**: `Ctrl+Shift+Alt+A` for AI Assistant
- Get context-aware suggestions based on current work
- Automatic relevance scoring and ranking

### 📝 **Creating Memories**

#### From Code Selection
- Select any code in the editor
- **Keyboard**: `Ctrl+Shift+Alt+M` (or `Cmd+Shift+Alt+M` on Mac)
- **Context Menu**: Right-click → "Create Memory from Selection"
- Automatically captures file context, line numbers, and language

#### From Entire File
- **Command Palette**: "Create Memory from Current File"
- Saves complete file content with metadata
- Includes language, file size, and timestamp

#### From Workspace Context
- **Explorer Context Menu**: Right-click in Explorer → "Create Memory from Workspace Context"
- Captures current workspace state
- Includes open files, project structure, and workspace settings

### 🤖 **AI Assistant Panel**

The AI Assistant provides an interactive interface for memory operations:

#### **Search & Discovery**
- Natural language search queries
- Real-time results with relevance scoring
- Click any result to open in editor

#### **Smart Suggestions**
- Context-aware memory recommendations
- Based on current file, language, and work patterns
- Suggests relevant memories as you code

#### **Code Analysis**
- Analyze selected code or entire file
- Find similar patterns in your memory collection
- Get insights and suggestions for improvements

#### **Quick Memory Creation**
- Create memories directly from the AI panel
- Choose memory type and add rich content
- Immediate sync with main memory collection

## ⚙️ Configuration

### Authentication Settings
```json
{
  "lanonasis.useAutoAuth": true,
  "lanonasis.authUrl": "https://auth.lanonasis.com",
  "lanonasis.apiUrl": "https://api.lanonasis.com"
}
```

### Memory Management
```json
{
  "lanonasis.defaultMemoryType": "context",
  "lanonasis.searchLimit": 10,
  "lanonasis.autoRefreshInterval": 300000
}
```

### Windsurf-Specific Features
```json
{
  "lanonasis.enableAiAssist": true,
  "lanonasis.windsurf.enableContextAwareness": true,
  "lanonasis.enableAutoCompletion": true
}
```

### Connection Options
```json
{
  "lanonasis.useGateway": true,
  "lanonasis.gatewayUrl": "https://api.lanonasis.com"
}
```

## 🎮 Commands & Shortcuts

| Command | Shortcut | Description |
|---------|----------|-------------|
| **Search Memories** | `Ctrl+Shift+M` | Open memory search with AI ranking |
| **Create Memory** | `Ctrl+Shift+Alt+M` | Create from selection with context |
| **AI Assistant** | `Ctrl+Shift+Alt+A` | Open interactive AI panel |
| **Create from File** | - | Save entire file as memory |
| **Create from Workspace** | - | Capture workspace context |
| **Authenticate** | - | Login with OAuth2/API key |
| **Logout** | - | Sign out and clear credentials |
| **Refresh Memories** | - | Sync with cloud service |
| **Switch Mode** | - | Toggle Gateway/Direct API |

## 🧠 Memory Types & Use Cases

### **Context Memories**
- General background information
- Project context and history
- Meeting notes and decisions
- Architecture overviews

### **Project Memories**
- Project-specific documentation
- Setup instructions
- Configuration details
- Team knowledge

### **Knowledge Memories**
- Tutorials and learning materials
- Best practices and patterns
- Technology explanations
- How-to guides

### **Reference Memories**
- Code snippets and templates
- API documentation
- Command references
- Quick lookups

### **Personal Memories**
- Private notes and thoughts
- Personal reminders
- Individual learning progress
- Custom workflows

### **Workflow Memories**
- Process documentation
- Step-by-step procedures
- Deployment guides
- Troubleshooting steps

## 🔒 Security & Privacy

### **Authentication Security**
- **OAuth2 with PKCE**: Industry-standard secure flow
- **Encrypted Token Storage**: Secure credential management
- **Automatic Token Refresh**: Seamless session management
- **Secure Logout**: Complete credential cleanup

### **Data Privacy**
- **End-to-End Encryption**: All data encrypted in transit and at rest
- **Multi-Tenant Isolation**: Complete data separation
- **GDPR Compliant**: Full privacy regulation compliance
- **Local Caching**: Smart caching without security compromise

### **Windsurf Integration**
- **No Data Collection**: Extension doesn't collect usage data
- **Secure API Communication**: All requests encrypted
- **Context Isolation**: Workspace data stays private
- **Permission-Based Access**: Only accesses authorized resources

## 🛠️ Advanced Features

### **Context Awareness**
- Monitors file changes and workspace activity
- Suggests relevant memories based on current work
- Learns from usage patterns
- Adapts suggestions to coding style

### **AI-Powered Insights**
- Code pattern recognition
- Similar memory detection
- Intelligent content suggestions
- Automated tagging and categorization

### **Performance Optimization**
- Smart caching for fast access
- Efficient search algorithms
- Minimal resource usage
- Background sync and updates

### **Extensibility**
- Plugin-ready architecture
- Custom memory types
- API integration capabilities
- Webhook support for automation

## 📚 API Integration

The extension integrates with the Lanonasis Memory Service API:

- **Memory CRUD**: Full create, read, update, delete operations
- **Semantic Search**: AI-powered vector similarity search
- **User Management**: Authentication and authorization
- **Analytics**: Usage tracking and insights
- **Real-time Sync**: Live updates across devices

### **API Endpoints Used**
- `POST /api/v1/memory` - Create memories
- `GET /api/v1/memory` - List and filter memories
- `POST /api/v1/memory/search` - Semantic search
- `PUT /api/v1/memory/:id` - Update memories
- `DELETE /api/v1/memory/:id` - Delete memories

## 🆘 Support & Troubleshooting

### **Common Issues**

#### **Authentication Problems**
1. Ensure system browser is accessible
2. Check firewall settings for localhost:8080
3. Try manual API key as fallback
4. Verify API endpoint configuration

#### **Search Not Working**
1. Check internet connection
2. Verify authentication status
3. Try refreshing memories
4. Check API endpoint settings

#### **Memory Creation Fails**
1. Ensure you're authenticated
2. Check plan limits (free: 100 memories)
3. Verify file access permissions
4. Try creating simpler content first

### **Performance Tips**
- Use specific search queries for better results
- Regularly clean up unused memories
- Optimize auto-refresh interval
- Use Gateway mode for better performance

### **Support Channels**
- **Documentation**: https://docs.lanonasis.com
- **Support Email**: support@lanonasis.com
- **GitHub Issues**: https://github.com/lanonasis/lanonasis-maas/issues
- **Community Discord**: https://discord.gg/lanonasis

## 🔮 Roadmap

### **Coming Soon**
- **Team Collaboration**: Share memories with teammates
- **Advanced Filtering**: Complex search filters and sorting
- **Bulk Operations**: Manage multiple memories at once
- **Export/Import**: Backup and restore memory collections
- **Custom Templates**: Predefined memory templates
- **Integration Plugins**: Connect with external tools

### **Future Enhancements**
- **Machine Learning**: Smarter suggestions and categorization
- **Visual Memory Maps**: Graph-based memory visualization
- **Voice Input**: Create memories via voice commands
- **Mobile Companion**: Access memories on mobile devices
- **Enterprise Features**: Advanced admin and compliance tools

## 📄 License

This extension is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

Built with ❤️ for the Windsurf community by the Lanonasis team.

**Powered by:**
- **Windsurf IDE**: Next-generation development environment
- **OpenAI**: Semantic search and AI capabilities
- **Supabase**: Scalable backend infrastructure
- **TypeScript**: Type-safe development experience

---

**Ready to supercharge your Windsurf workflow with AI-powered memory management?**

[Get Started](https://api.lanonasis.com) • [Documentation](https://docs.lanonasis.com) • [Community](https://discord.gg/lanonasis)

*Experience the future of intelligent coding with Lanonasis Memory Assistant for Windsurf!* 🚀
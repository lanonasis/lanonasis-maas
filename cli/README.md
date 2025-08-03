# Lanonasis CLI - Enterprise Infrastructure Management

[![npm version](https://img.shields.io/npm/v/@lanonasis/cli)](https://www.npmjs.com/package/@lanonasis/cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![MCP Integration](https://img.shields.io/badge/MCP-Model%20Context%20Protocol-purple)](https://modelcontextprotocol.com)

🚀 **Professional CLI for Lanonasis Platform Services with MCP Integration**

The Lanonasis CLI provides a powerful command-line interface for interacting with the entire Lanonasis ecosystem, including Memory as a Service (MaaS), infrastructure management, and multi-service orchestration. Now with **Model Context Protocol (MCP)** integration for unified AI-agent communication. Manage your memories, search through knowledge bases, organize your thoughts, and control your infrastructure - all from the terminal.

## 🆕 New in v1.2.0 - API Key Management Integration
- **API Key Management**: Complete CLI commands for secure API key lifecycle management
- **MCP Tool Registration**: Register and manage MCP tools with scoped API access
- **Analytics & Security**: Track usage patterns and monitor security events
- **Project-based Organization**: Group API keys by projects for better organization
- **Zero-trust Security**: Encrypted key storage with proxy token generation
- **MCP Server Mode**: Run as MCP server for AI assistants (Claude, Cursor, Windsurf)
- **Hybrid Architecture**: Seamless switching between local MCP and remote API
- **Real-time Updates**: SSE streaming for live memory synchronization

## ⚡ Quick Start

```bash
# Install globally
npm install -g @lanonasis/cli

# Or use with npx (no installation needed)
npx -y @lanonasis/cli init

# Initialize Lanonasis services
lanonasis init

# Configure your services
lanonasis config set api-url https://your-lanonasis-service.com

# Authenticate
lanonasis auth login

# Memory operations (also available as 'memory' and 'maas' commands)
lanonasis memory create -t "My First Memory" -c "This is the content of my memory"
lanonasis memory search "search query"
lanonasis memory list

# Infrastructure management (future services)
lanonasis deploy status
lanonasis services list
```

## 🚀 Installation

### Global Installation (Recommended)
```bash
npm install -g @lanonasis/cli
```

### NPX Usage (No Installation)
```bash
npx -y @lanonasis/cli --help
npx -y @lanonasis/cli init
```

### Local Installation
```bash
npm install @lanonasis/cli
npx lanonasis --help
```

## 📋 Available Commands

### 🔧 Setup & Configuration
- `lanonasis init` - Initialize CLI and show setup instructions
- `lanonasis config set <key> <value>` - Set configuration values
- `lanonasis config get <key>` - Get configuration value
- `lanonasis config list` - List all configuration options
- `lanonasis status` - Show CLI status and configuration

### 🔐 Authentication
- `lanonasis auth login` - Authenticate with your services
- `lanonasis auth logout` - Sign out
- `lanonasis auth status` - Check authentication status

### 📝 Memory Operations
- `lanonasis create -t "Title" -c "Content" [--type <type>]` - Create new memory
- `lanonasis search <query> [-l <limit>]` - Search memories
- `lanonasis list [-l <limit>] [--type <type>]` - List memories
- `lanonasis help` - Show detailed help

### 🔑 API Key Management (NEW in v1.2.0)
- `lanonasis api-keys create` - Create a new API key with secure encryption
- `lanonasis api-keys list` - List all API keys with usage statistics
- `lanonasis api-keys get <keyId>` - Get details of a specific API key
- `lanonasis api-keys update <keyId>` - Update API key name, tags, or rotation policy
- `lanonasis api-keys delete <keyId>` - Securely delete an API key
- `lanonasis api-keys projects create` - Create a project for organizing keys
- `lanonasis api-keys projects list` - List all API key projects
- `lanonasis api-keys mcp register-tool` - Register MCP tools for API access
- `lanonasis api-keys mcp list-tools` - List registered MCP tools
- `lanonasis api-keys mcp request-access` - Request access to API keys via MCP
- `lanonasis api-keys analytics usage` - View API key usage analytics
- `lanonasis api-keys analytics security-events` - Monitor security events

#### Alternative Commands (Backwards Compatibility)
- `memory <command>` - Direct memory operations
- `maas <command>` - Memory as a Service operations

## 🧠 Memory Types

The CLI supports the following memory types:
- **conversation** - Chat and dialogue context
- **knowledge** - Educational and reference content
- **project** - Project-specific documentation
- **context** - General contextual information
- **reference** - Quick reference materials

## ⚙️ Configuration

Configure your CLI to connect to your Lanonasis services:

```bash
# Set your service endpoint
lanonasis config set api-url https://your-lanonasis-service.com

# View current configuration
lanonasis config list
```

## 🔒 Authentication

Authenticate with your Lanonasis platform:

```bash
# Login to your service
lanonasis auth login

# Check authentication status
lanonasis auth status

# Logout
lanonasis auth logout
```

## 📖 Usage Examples

```bash
# Create different types of memories
lanonasis create -t "Meeting Notes" -c "Project kickoff discussion" --type project
lanonasis create -t "API Reference" -c "POST /api/memories endpoint" --type reference
lanonasis create -t "Learning Notes" -c "Vector embeddings concepts" --type knowledge

# Using npx (no installation)
npx -y @lanonasis/cli create -t "Quick Note" -c "NPX usage example"

# Search with different options
lanonasis search "API endpoints" -l 5
lanonasis search "project meeting"

# List with filters
lanonasis list --type project -l 10
lanonasis list -l 20

# Alternative command usage
memory search "my query"  # Direct memory command
maas list --type knowledge  # MaaS command
```

## 🤖 MCP Integration (Model Context Protocol)

The CLI now includes full MCP support for AI agent integration:

### Start MCP Server Mode

```bash
# Start as MCP server for AI assistants
lanonasis mcp start                 # Default port 3002
lanonasis mcp start --port 8080     # Custom port
lanonasis mcp start --mode server   # Explicit server mode

# Or use npx without installation
npx -y @lanonasis/cli mcp start
```

### Configure AI Assistants

**Claude Desktop** (`~/Library/Application Support/Claude/claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "memory-service": {
      "command": "npx",
      "args": ["-y", "@lanonasis/cli", "mcp", "start"],
      "env": {
        "LANONASIS_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

**Cursor/Windsurf** (Settings):
```json
{
  "mcp.servers": {
    "memory-service": {
      "command": "lanonasis",
      "args": ["mcp", "start"],
      "env": {
        "LANONASIS_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### MCP Commands

```bash
# Server operations
lanonasis mcp start            # Start MCP server
lanonasis mcp stop             # Stop MCP server
lanonasis mcp status           # Check server status
lanonasis mcp logs             # View server logs

# Tool discovery
lanonasis mcp tools            # List all available MCP tools
lanonasis mcp tools --json     # Output as JSON

# Test connectivity
lanonasis mcp test             # Test MCP connection
lanonasis mcp test --tool <name> # Test specific tool
```

### Available MCP Tools

- `memory_create_memory` - Create new memories with embeddings
- `memory_search_memories` - Semantic search across memories
- `memory_list_memories` - List and filter memories
- `memory_get_memory` - Retrieve specific memory
- `memory_update_memory` - Update existing memories
- `memory_delete_memory` - Delete memories
- `memory_bulk_create` - Batch create multiple memories
- `memory_bulk_delete` - Batch delete memories
- `memory_get_stats` - Get memory statistics
- `memory_export_data` - Export memories (JSON/CSV/YAML)
- `memory_import_data` - Import memories from files

### MCP Features:
- **🔌 WebSocket Server**: Real-time bidirectional communication
- **🔄 Hybrid Mode**: Automatic fallback between local/remote
- **🔐 Secure Auth**: API key and JWT token support
- **📊 Real-time SSE**: Live updates in remote mode
- **🛠️ Tool Discovery**: Dynamic tool listing for AI agents
- **🎯 Auto-detection**: Intelligently chooses best mode
- **📝 Full Memory API**: All operations exposed as MCP tools

## 🌐 MaaS Service Integration

This CLI is designed to work with Memory as a Service platforms that provide:
- RESTful API endpoints
- JWT or API key authentication
- Vector-based memory search
- Multi-tenant memory storage

### Setting up your MaaS Service

1. **Deploy** a MaaS service using the provided backend
2. **Configure** the CLI with your service endpoint
3. **Authenticate** using your service credentials
4. **Start** managing your memories!

## 🛠️ Development

### Prerequisites
- Node.js 18+
- npm or yarn

### Local Development
```bash
git clone <repository-url>
cd memory-cli
npm install

# Development mode
npm run dev

# Build
npm run build

# Test locally
node dist/index-simple.js help
```

## 📦 What's Included

- **Full CLI Interface** - Complete command-line tool
- **Memory Management** - Create, search, list memories
- **Type System** - Organized memory categorization
- **Authentication** - Secure service integration
- **Configuration** - Flexible service setup
- **Help System** - Comprehensive documentation

## 📦 SDK & Related Packages

### Memory Client SDK
Install the TypeScript/JavaScript SDK for application integration:

```bash
# Install SDK for your applications
npm install @lanonasis/memory-client

# Use in your code
import { createMemoryClient } from '@lanonasis/memory-client';

const client = createMemoryClient({
  baseURL: 'https://api.lanonasis.com',
  apiKey: 'your-api-key-here'
});
```

### Complete Installation for Developers
```bash
# Install CLI globally for command-line usage
npm install -g @lanonasis/cli

# Install SDK locally for application development
npm install @lanonasis/memory-client

# Now you have both CLI and SDK available!
lanonasis --help                    # CLI commands
# SDK available for import in your code
```

## 🔗 Related Projects

- **Memory Service Backend** - Full MaaS API server ([GitHub](https://github.com/thefixer3x/vibe-memory))
- **Memory Client SDK** - JavaScript/TypeScript SDK (`@lanonasis/memory-client`)
- **Memory Visualizer** - Interactive memory exploration (included in backend)
- **VSCode Extension** - IDE integration (coming soon)

## 📄 License

MIT License - see LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🐛 Support

- **Issues**: [GitHub Issues](https://github.com/seyederick/memory-cli/issues)
- **Documentation**: [CLI Documentation](https://github.com/seyederick/memory-cli)

## 🎯 Use Cases

- **Personal Knowledge Management** - Organize your thoughts and notes
- **Team Knowledge Sharing** - Collaborative memory management
- **Project Documentation** - Context-aware project memories
- **Research Organization** - Academic and research note-taking
- **API Integration** - Programmatic memory management

## 🏆 Production Ready Features

### Enterprise Capabilities
- **🔐 Secure Authentication** - API key and JWT token support
- **🌐 Multi-tenant Support** - Isolated memory spaces per user/org
- **📊 Rate Limiting** - Built-in request throttling
- **🔄 Retry Logic** - Automatic retry with exponential backoff
- **📝 Comprehensive Logging** - Debug and audit trails
- **🚀 Performance Optimized** - Minimal overhead, fast responses

### Commercial Use Cases
- **💼 Enterprise Knowledge Management** - Company-wide memory system
- **🤝 Team Collaboration** - Shared project memories
- **🎓 Educational Platforms** - Student/teacher memory sharing
- **🏥 Healthcare Systems** - Patient context management
- **💰 Financial Services** - Transaction memory and audit trails
- **🛒 E-commerce** - Customer interaction history

### Integration Ready
- **REST API** - Standard HTTP/JSON interface
- **MCP Protocol** - AI assistant integration
- **WebSocket** - Real-time updates
- **SSE Streaming** - Live data synchronization
- **SDK Available** - TypeScript/JavaScript client library

---

**Built with ❤️ for the Memory as a Service ecosystem**

🚀 **Ready for Production** | 📚 [Documentation](https://docs.lanonasis.com) | 🌐 [Platform](https://api.lanonasis.com)
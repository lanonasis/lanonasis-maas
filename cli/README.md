# Lanonasis CLI - Enterprise Infrastructure Management

🚀 **Professional CLI for Lanonasis Platform Services**

The Lanonasis CLI provides a powerful command-line interface for interacting with the entire Lanonasis ecosystem, including Memory as a Service (MaaS), infrastructure management, and multi-service orchestration. Manage your memories, search through knowledge bases, organize your thoughts, and control your infrastructure - all from the terminal.

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

## 🔗 Related Projects

- **Memory Service Backend** - Full MaaS API server
- **Memory SDK** - JavaScript/TypeScript SDK for developers
- **Memory Visualizer** - Interactive memory exploration

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

---

**Built with ❤️ for the Memory as a Service ecosystem**
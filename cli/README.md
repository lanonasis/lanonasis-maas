# @lanonasis/cli v1.5.2 - Onasis-Core Golden Contract CLI

[![NPM Version](https://img.shields.io/npm/v/@lanonasis/cli)](https://www.npmjs.com/package/@lanonasis/cli)
[![Downloads](https://img.shields.io/npm/dt/@lanonasis/cli)](https://www.npmjs.com/package/@lanonasis/cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Golden Contract](https://img.shields.io/badge/Onasis--Core-v0.1%20Compliant-gold)](https://api.lanonasis.com/.well-known/onasis.json)

Professional command-line interface for LanOnasis Memory as a Service (MaaS) platform with **Golden Contract compliance**, comprehensive authentication, and enterprise-grade features.

## 🚀 Quick Start

### Installation
```bash
# Global installation (recommended)
npm install -g @lanonasis/cli

# Verify installation
lanonasis --version  # or onasis --version
```

### First Steps
```bash
# Interactive guided setup (recommended for new users)
onasis guide

# Quick manual setup
onasis init                                    # Initialize configuration
onasis login --vendor-key pk_xxx.sk_xxx      # Authenticate with vendor key
onasis health                                 # Verify system health

# Create your first memory
onasis memory create --title "Welcome" --content "My first memory"
```

## 🎯 Command Aliases

The CLI supports multiple command aliases for different use cases:

| Command | Purpose | Golden Contract |
|---------|---------|-----------------|
| `onasis` | Golden Contract compliant interface | ✅ Yes |
| `lanonasis` | Standard LanOnasis interface | ✅ Yes |
| `memory` | Memory-focused operations | ✅ Yes |
| `maas` | Memory as a Service operations | ✅ Yes |

```bash
# All of these are equivalent:
onasis memory list
lanonasis memory list
memory list
maas memory list
```

## 🔐 Authentication Methods

### 1. Vendor Key Authentication (Recommended)
Best for API integrations and automation:
```bash
onasis login --vendor-key pk_xxxxx.sk_xxxxx
```

### 2. OAuth Browser Authentication
Secure browser-based authentication:
```bash
onasis login --oauth
```

### 3. Interactive Credentials
Traditional username/password authentication:
```bash
onasis login  # Will prompt for email and password
```

### Authentication Status
```bash
onasis auth status    # Check current authentication
onasis auth logout    # Logout from current session
```

## 💻 Shell Completions

### Installation Guide
```bash
onasis completion  # Shows installation instructions for all shells
```

### Direct Installation
```bash
# Bash
echo 'source <(onasis --completion bash)' >> ~/.bashrc

# Zsh
echo 'source <(onasis --completion zsh)' >> ~/.zshrc

# Fish
echo 'onasis --completion fish | source' >> ~/.config/fish/config.fish
```

### Features
- ✅ Command and subcommand completion
- ✅ Option and flag completion  
- ✅ Context-aware suggestions
- ✅ Dynamic completion data via JSON API
- ✅ Support for all command aliases

## 📚 Core Commands

### System Management
```bash
onasis health           # Comprehensive system health check
onasis status          # Quick status overview  
onasis init            # Initialize CLI configuration
onasis guide           # Interactive setup guide
onasis quickstart      # Essential commands reference
```

### Memory Management
```bash
# List memories
onasis memory list
onasis memory list --memory-type context --limit 20 --sort-by created_at

# Create memories
onasis memory create --title "Project Notes" --content "Important information"
onasis memory create --title "Reference" --memory-type reference --tags "docs,api"

# Search memories
onasis memory search "api integration"
onasis memory search "meeting notes" --memory-types context,reference

# Memory operations
onasis memory get <id>                    # Get specific memory
onasis memory update <id> --title "New Title"
onasis memory delete <id>                 # Delete memory
onasis memory stats                       # Memory statistics
```

### Topic Management
```bash
onasis topic list                         # List all topics
onasis topic create --name "Development" --color blue --icon "💻"
onasis topic get <id>                     # Get specific topic
onasis topic update <id> --description "New description"
onasis topic delete <id>                  # Delete topic
```

### API Key Management
```bash
onasis api-keys list                      # List API keys
onasis api-keys create --name "Integration Key" --scope "memory:read"
onasis api-keys revoke <id>               # Revoke API key
onasis api-keys rotate <id>               # Rotate API key
```

### MCP Integration
```bash
onasis mcp status                         # MCP server status
onasis mcp connect --remote              # Connect to remote MCP server
onasis mcp disconnect                     # Disconnect from MCP
onasis mcp tools                          # List available MCP tools
onasis mcp resources                      # List MCP resources
```

### Configuration Management  
```bash
onasis config list                        # List all configuration
onasis config get <key>                   # Get configuration value
onasis config set <key> <value>           # Set configuration value
onasis config reset                       # Reset configuration
```

### Service Management
```bash
onasis service list                       # List all services
onasis service status                     # Service status overview
onasis service restart <service>          # Restart specific service
onasis deploy status                      # Deployment status
onasis deploy health                      # Deployment health check
```

## ⚙️ Global Options

```bash
# Available for all commands
--help              # Show command help
--version           # Show version information
--verbose           # Enable verbose logging
--output <format>   # Output format: table, json, yaml, csv
--api-url <url>     # Override API URL
--no-mcp           # Disable MCP and use direct API
```

## 🎯 Advanced Usage

### JSON Output for Automation
```bash
onasis memory list --output json | jq '.data[].title'
onasis health --output json | jq '.status'
```

### Environment Variables
```bash
export MEMORY_API_URL="https://api.lanonasis.com/api/v1"
export CLI_OUTPUT_FORMAT="json"
export CLI_VERBOSE="true"
```

### Configuration File
Location: `~/.maas/config.json`
```json
{
  "apiUrl": "https://api.lanonasis.com/api/v1",
  "defaultOutputFormat": "table",
  "mcpPreference": "auto",
  "vendorKey": "pk_xxxxx.sk_xxxxx"
}
```

## 🔧 Development & Debugging

### Verbose Mode
```bash
onasis --verbose memory list    # Detailed operation logs
onasis -V health               # Short flag version
```

### Configuration Debugging
```bash
onasis config list             # Check current configuration
onasis auth status            # Verify authentication
onasis health --verbose       # Detailed health information
```

### MCP Debugging
```bash
onasis mcp status --verbose    # Detailed MCP diagnostics
onasis --no-mcp memory list   # Bypass MCP, use direct API
```

## 🌐 Golden Contract Compliance

### Onasis-Core v0.1 Standards
- ✅ Service discovery via `/.well-known/onasis.json`
- ✅ Vendor key authentication (`pk_*.sk_*` format)
- ✅ Request correlation with UUID tracking
- ✅ Enhanced CORS security compliance
- ✅ Uniform error envelope standardization
- ✅ WebSocket path alignment (`/mcp/ws`)

### Service Discovery Integration
The CLI automatically discovers service endpoints:
```bash
# Service discovery happens automatically
onasis health  # Uses discovered endpoints for health checks
```

### Request Correlation
Every API request includes correlation headers:
- `X-Request-ID`: UUID for request tracking
- `X-Project-Scope`: Project scope validation
- `X-Auth-Method`: Authentication method used

## 🧪 Testing & Quality

### Command Validation
```bash
onasis --help                  # Validate CLI installation
onasis completion              # Test completion system
onasis guide                   # Test interactive guidance
```

### API Integration Testing
```bash
onasis health                  # Test API connectivity
onasis memory list --limit 1  # Test memory service
onasis mcp status             # Test MCP integration
```

## 🚨 Troubleshooting

### Common Issues

#### Authentication Failures
```bash
# Check authentication status
onasis auth status

# Re-authenticate
onasis auth logout
onasis login --vendor-key pk_xxx.sk_xxx
```

#### Connection Issues
```bash
# Check system health
onasis health --verbose

# Test API connectivity
onasis --api-url https://api.lanonasis.com/api/v1 health
```

#### MCP Connection Issues
```bash
# Check MCP status
onasis mcp status --verbose

# Disable MCP temporarily
onasis --no-mcp memory list
```

### Debug Mode
```bash
# Enable maximum verbosity
CLI_VERBOSE=true onasis --verbose health
```

## 🤝 Contributing

### Development Setup
```bash
# Clone CLI source
git clone https://github.com/lanonasis/lanonasis-maas.git
cd lanonasis-maas/cli

# Install dependencies
npm install

# Build CLI
npm run build

# Link for local development
npm link
```

### Testing Changes
```bash
# Test build
npm run build

# Test CLI functionality
onasis --help
onasis health
```

## 📝 Version History

### v1.5.2 (Current)
- ✅ Golden Contract compliance (Onasis-Core v0.1)
- ✅ Professional shell completions (bash/zsh/fish)
- ✅ Enhanced authentication (vendor keys, OAuth, credentials)
- ✅ Interactive user guidance system
- ✅ Dual command support (lanonasis/onasis)
- ✅ Service discovery integration
- ✅ Request correlation and enhanced security

### Previous Versions
- v1.4.x: Basic CLI functionality
- v1.3.x: MCP integration
- v1.2.x: Memory management
- v1.1.x: Initial authentication
- v1.0.x: Core CLI framework

## 📄 License

MIT License - see [LICENSE](../LICENSE) for details.

## 🔗 Related Links

- **NPM Package**: [https://www.npmjs.com/package/@lanonasis/cli](https://www.npmjs.com/package/@lanonasis/cli)
- **Main Repository**: [https://github.com/lanonasis/lanonasis-maas](https://github.com/lanonasis/lanonasis-maas)
- **Documentation**: [https://docs.lanonasis.com/cli](https://docs.lanonasis.com/cli)
- **API Documentation**: [https://api.lanonasis.com/docs](https://api.lanonasis.com/docs)
- **Service Discovery**: [https://api.lanonasis.com/.well-known/onasis.json](https://api.lanonasis.com/.well-known/onasis.json)
- **Dashboard**: [https://api.lanonasis.com/dashboard](https://api.lanonasis.com/dashboard)

---

*Professional CLI for Enterprise Memory as a Service - Golden Contract Compliant*
# @lanonasis/cli v3.7.0 - Enterprise Security & MCP Experience

[![NPM Version](https://img.shields.io/npm/v/@lanonasis/cli)](https://www.npmjs.com/package/@lanonasis/cli)
[![Downloads](https://img.shields.io/npm/dt/@lanonasis/cli)](https://www.npmjs.com/package/@lanonasis/cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Golden Contract](https://img.shields.io/badge/Onasis--Core-v0.1%20Compliant-gold)](https://api.lanonasis.com/.well-known/onasis.json)

🚀 **NEW IN v3.0**: Advanced Model Context Protocol (MCP) support with multi-server connections, enhanced error handling, and enterprise-grade transport protocols. Revolutionary interactive CLI experience with guided workflows, smart suggestions, achievement system, and power user mode. Professional command-line interface for LanOnasis Memory as a Service (MaaS) platform with **Golden Contract compliance**.

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
onasis init                                      # Initialize configuration
onasis login --vendor-key <your-vendor-key>      # Authenticate with vendor key
onasis health                                   # Verify system health

# Create your first memory
onasis memory create --title "Welcome" --content "My first memory"
```

## 🤖 Claude Desktop Integration

For instant Claude Desktop MCP integration with OAuth2 authentication, see our [Claude Desktop Setup Guide](./CLAUDE_DESKTOP_SETUP.md).

**Quick Links**:
- **Authorization Endpoint**: `https://auth.lanonasis.com/oauth/authorize`
- **Client ID**: `claude-desktop`
- **Scopes**: `mcp:full memories:read memories:write`

The guide includes complete OAuth2 configuration, available MCP tools, and troubleshooting steps.

## 🎯 Command Aliases

The CLI supports multiple command aliases for different use cases:

| Command     | Purpose                             | Golden Contract |
| ----------- | ----------------------------------- | --------------- |
| `onasis`    | Golden Contract compliant interface | ✅ Yes          |
| `lanonasis` | Standard LanOnasis interface        | ✅ Yes          |
| `memory`    | Memory-focused operations           | ✅ Yes          |
| `maas`      | Memory as a Service operations      | ✅ Yes          |

```bash
# All of these are equivalent:
onasis memory list
lanonasis memory list
memory list
maas memory list
```

## 🔐 Security & Authentication

### Enterprise-Grade SHA-256 Security (v3.7.0+)

All API keys are now secured with SHA-256 cryptographic hashing:

- ✅ **Automatic Hash Normalization**: Keys are automatically hashed before transmission
- ✅ **Double-Hash Prevention**: Smart detection prevents re-hashing already hashed keys
- ✅ **Cross-Platform Compatibility**: Works seamlessly across Node.js and browser environments
- ✅ **Zero Configuration**: Security is automatic and transparent

```typescript
// Hash utilities are built-in and automatic
// Your vendor keys are automatically secured
onasis login --vendor-key pk_xxxxx.sk_xxxxx  // ✅ Automatically hashed
```

### Authentication Methods

### 1. Vendor Key Authentication (Recommended)

Best for API integrations and automation. Copy the vendor key value exactly as shown in your LanOnasis dashboard (keys may vary in format):

```bash
onasis login --vendor-key <your-vendor-key>
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

### MCP Integration (Enhanced in v2.0.9)

```bash
# Connection Management
onasis mcp status                         # MCP server status with health info
onasis mcp connect --remote              # Connect to remote MCP server
onasis mcp connect --local               # Connect to local MCP server
onasis mcp disconnect                     # Disconnect from MCP
onasis mcp list-servers                   # List all connected servers

# Tool & Resource Management
onasis mcp tools                          # List available MCP tools
onasis mcp resources                      # List MCP resources
onasis mcp call <tool> --args             # Execute MCP tool directly

# Advanced Features (v3.0)
onasis mcp health                         # Detailed health check with latency
onasis mcp server start                   # Start local MCP server
onasis mcp server stop                    # Stop local MCP server
```

### 🆕 MCP Server Mode (v3.0)

Run the CLI as a standalone MCP server:

```bash
# Start MCP server for IDE integrations
lanonasis-mcp-server --verbose

# Use with environment variables
LANONASIS_API_URL=https://api.lanonasis.com \
LANONASIS_TOKEN=your-token \
lanonasis-mcp-server
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
  "vendorKey": "<your-vendor-key>"
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
onasis login --vendor-key <your-vendor-key>
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

### v2.0.0 (Current)

- 🎯 **Interactive Dashboard**: Central command center for all operations
- 🎉 **Welcome Experience**: Guided onboarding for new users
- ⚡ **Power Mode**: Streamlined interface for expert users
- 🤖 **Smart Suggestions**: Context-aware command recommendations
- 🏆 **Achievement System**: Gamification to track progress
- 🛡️ **Enhanced Error Handling**: Intelligent error messages with recovery
- 📊 **Progress Indicators**: Visual feedback for operations

### v1.5.2

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

_Professional CLI for Enterprise Memory as a Service - Golden Contract Compliant_

## OAuth2 Authentication (v3.5.0+)

### Browser Login with OAuth2 PKCE

The CLI now supports secure OAuth2 authentication with PKCE (Proof Key for Code Exchange) for browser-based login:

```bash
onasis auth login
# Choose: 🌐 Browser Login (Get token from web page)
```

**How it works:**
1. CLI starts a local callback server on port 8888
2. Opens your browser to the OAuth2 authorization page
3. You authenticate in the browser
4. Authorization code is sent back to the CLI
5. CLI exchanges code for access and refresh tokens
6. Tokens are securely stored locally

**Benefits:**
- ✅ More secure (PKCE prevents code interception)
- ✅ Automatic token refresh
- ✅ Revocable access
- ✅ Industry-standard OAuth2 flow

### Authentication Methods

The CLI supports three authentication methods:

1. **🔑 Vendor Key** (Recommended for API access)
   - Long-lived API key from dashboard
   - Best for automation and CI/CD

2. **🌐 Browser Login** (OAuth2 PKCE)
   - Secure browser-based authentication
   - Automatic token refresh
   - Best for interactive use

3. **⚙️ Username/Password** (Direct credentials)
   - Traditional email/password login
   - Returns JWT token
   - Legacy method

### Token Management

OAuth2 tokens are automatically refreshed when expired:

```bash
# Check authentication status
onasis auth status

# Force re-authentication
onasis auth logout
onasis auth login
```

### Troubleshooting

**Port 8888 already in use:**
The CLI needs port 8888 for the OAuth callback. If it's in use, close the application using it or use the Vendor Key method instead.

**Browser doesn't open:**
The CLI will show the authorization URL - copy and paste it into your browser manually.

**Token refresh failed:**
Run `onasis auth login` to re-authenticate.


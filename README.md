# Lanonasis Memory as a Service (MaaS) - Onasis-Core Golden Contract v0.1

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/lanonasis/lanonasis-maas)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![MCP Integration](https://img.shields.io/badge/MCP-Model%20Context%20Protocol-purple)](https://modelcontextprotocol.com)
[![Golden Contract](https://img.shields.io/badge/Onasis--Core-v0.1%20Compliant-gold)](https://api.lanonasis.com/.well-known/onasis.json)
[![CLI Version](https://img.shields.io/npm/v/@lanonasis/cli?label=CLI%20v1.5.2&color=blue)](https://www.npmjs.com/package/@lanonasis/cli)

Enterprise-grade Memory as a Service platform with **Golden Contract compliance**, professional CLI interface, and multi-domain deployment capabilities.

## 🎯 CLI v1.5.2 - Professional Interface

### Installation
```bash
# Install globally for immediate access
npm install -g @lanonasis/cli

# Use with either command
lanonasis --help    # Standard interface
onasis --help       # Golden Contract compliant interface
```

### Quick Start
```bash
# Interactive guided setup
onasis guide

# Or quick manual setup
onasis init                                      # Initialize configuration
onasis login --vendor-key <your-vendor-key>      # Authenticate with vendor key
onasis health                                   # Verify system health

# Essential operations
onasis memory create --title "My Memory" --content "Content"
onasis memory list
onasis memory search "query"
```

### Professional Features

#### 🔐 Multiple Authentication Methods
```bash
# Vendor Key (Recommended for API integration)
onasis login --vendor-key <your-vendor-key>

# OAuth Browser Flow
onasis login --oauth

# Interactive Credentials
onasis login
```

#### 🚀 Shell Completions
```bash
# Installation guide
onasis completion

# Direct installation
source <(onasis --completion bash)      # Bash
source <(onasis --completion zsh)       # Zsh
onasis --completion fish | source       # Fish
```

#### 📋 Comprehensive Commands
```bash
# System Management
onasis health           # System health check
onasis status          # Quick status overview
onasis guide           # Interactive setup guide
onasis quickstart      # Essential commands reference

# Memory Management
onasis memory list --memory-type context --sort-by created_at
onasis memory create --title "Project Notes" --tags "work,project"
onasis memory search "api integration" --limit 10

# Topic Organization
onasis topic create --name "Development" --color blue
onasis topic list

# API Key Management
onasis api-keys list
onasis api-keys create --name "Integration Key"

# MCP Integration
onasis mcp status
onasis mcp connect --remote
onasis mcp tools
```

## 🌐 Deployment Options

### 1. Quick Vercel Deployment
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/lanonasis/lanonasis-maas)

**Single Domain Structure** (`developer.lanonasis.com`):
- `/` - Landing page
- `/dashboard` - Main dashboard
- `/api/v1/*` - API endpoints  
- `/mcp/sse` - MCP Server-Sent Events
- `/docs/*` - Documentation

### 2. Production Netlify Deployment
**Multi-Domain Structure** (Current Production):
- `api.lanonasis.com` - API and landing
- `dashboard.lanonasis.com` - Dashboard  
- `docs.lanonasis.com` - Documentation

### 3. CLI-Based Deployment
```bash
# Check deployment status
onasis deploy status

# Health check all services
onasis deploy health

# Service management
onasis service list
onasis service restart memory-service
```

## ⚡ Golden Contract Compliance (Onasis-Core v0.1)

### Service Discovery
The platform implements automatic service discovery via:
```
GET https://api.lanonasis.com/.well-known/onasis.json
```

### Authentication Standards
- **Vendor Keys**: Copy the value from your dashboard (format may vary)
- **JWT Tokens**: Project-scoped authentication
- **Request Correlation**: UUID-based request tracking
- **Security Headers**: `X-Project-Scope`, `X-Auth-Method`, `X-Request-ID`

### API Compliance
- Uniform error envelopes with request correlation
- Enhanced CORS security (no wildcards)
- WebSocket path alignment (`/mcp/ws`)
- RESTful endpoint standards

## 📁 Project Architecture

```
lanonasis-maas/
├── cli/                     # CLI v1.5.2 (Golden Contract)
│   ├── src/
│   │   ├── commands/       # CLI command implementations
│   │   ├── completions/    # Shell completion scripts
│   │   └── utils/          # Utilities and configuration
│   └── dist/               # Built CLI artifacts
├── src/                     # Core platform source
│   ├── middleware/         # Authentication & routing
│   ├── services/           # Business logic
│   └── utils/              # Shared utilities
├── netlify/functions/       # Serverless API functions
├── dashboard/              # React dashboard
├── docs/                   # VitePress documentation
└── archive/                # Legacy documentation
    ├── legacy-docs/        # Archived documentation
    ├── legacy-scripts/     # Archived shell scripts
    ├── deployment-history/ # Migration history
    ├── auth-migration/     # Authentication evolution
    └── extension-docs/     # Extension documentation
```

## 🔧 Development Setup

### Prerequisites
- Node.js 18+ 
- npm/yarn
- Supabase account
- Optional: OpenAI API key

### Local Development
```bash
# Clone repository
git clone https://github.com/lanonasis/lanonasis-maas.git
cd lanonasis-maas

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Start development
npm run dev

# CLI development
cd cli
npm install
npm run build
npm link  # Makes onasis/lanonasis available globally
```

### Environment Configuration
```env
# Required
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_public_key

# Optional
OPENAI_API_KEY=your_openai_api_key
MEMORY_API_URL=https://api.lanonasis.com/api/v1
CLI_OUTPUT_FORMAT=table
```

## 📚 Documentation

### CLI Documentation
- **Interactive Guide**: `onasis guide`
- **Quick Reference**: `onasis quickstart`
- **Help System**: `onasis <command> --help`
- **Completions**: `onasis completion`

### Platform Documentation
- **Live Docs**: [https://docs.lanonasis.com/memory-services](https://docs.lanonasis.com/memory-services)
- **Dashboard**: [https://api.lanonasis.com/dashboard](https://api.lanonasis.com/dashboard)
- **API Reference**: [https://api.lanonasis.com/docs](https://api.lanonasis.com/docs)
- **MCP Integration**: [MCP Configuration Guide](cli/MCP_INTEGRATION_README.md)

## 🔒 Security & Compliance

### 🛡️ Enterprise-Grade Security
Lanonasis MaaS implements comprehensive security controls and compliance frameworks:

- **🚫 No Training on Your Data**: Contractual agreements prohibit AI subprocessors from using customer data for model training
- **🔐 Secure Encryption**: TLS 1.2+ encryption for all data in transit
- **✅ Advanced Permissions**: Granular access control with role-based permissions
- **🌍 GDPR & CCPA Compliant**: Full privacy regulation compliance with data subject rights
- **🛡️ SOC 2 Type 2**: Continuous compliance with highest industry security standards
- **📋 ISO 27001 Certified**: Information security management system certification

### 🔧 Security Features
- **CLI Security**: Golden Contract v1.5.2+ with secure local processing
- **Zero Data Retention**: No persistent storage with LLM providers (30-day retention for non-Enterprise)
- **Request Correlation**: Complete audit trails with UUID tracking
- **Multi-Factor Authentication**: Enhanced authentication including CLI-based auth
- **API Key Lifecycle**: Secure generation, rotation, and revocation
- **Real-time Monitoring**: Security event detection and anomaly monitoring

### 📋 Compliance Certifications
- **SOC 2 (Type 2)**: Annual third-party security audits ✅
- **ISO 27001**: Information security management certification ✅
- **GDPR/CCPA**: Global privacy regulation compliance ✅
- **Security Assessments**: Quarterly security reviews and penetration testing ✅

### 🔍 Security Resources
- **[📖 Complete Security Documentation](./SECURITY_COMPLIANCE.md)**: Comprehensive security and compliance guide
- **🚨 Security Reporting**: security@lanonasis.com
- **📋 Compliance Inquiries**: compliance@lanonasis.com
- **🔍 Vulnerability Disclosure**: Responsible disclosure program available

### 🎯 Developer Security Checklist
- [ ] Use secure API key storage (environment variables)
- [ ] Implement proper error handling
- [ ] Use latest SDK versions for security updates
- [ ] Enable audit logging in production
- [ ] Follow [CLI Security Best Practices](./docs/security/cli-security.md)

## 🧪 Testing

```bash
# Run all tests
npm test

# CLI tests
cd cli && npm test

# Specific test suites
npm run test:auth
npm run test:memory
npm run test:mcp
```

## 🤝 Contributing

### Development Workflow
1. **Setup**: `onasis guide` for development environment
2. **CLI Changes**: Follow CLI v1.5.2 standards
3. **Testing**: Ensure Golden Contract compliance
4. **Documentation**: Update relevant docs

### Pull Request Guidelines
- Use CLI v1.5.2 for all operations
- Ensure Golden Contract compliance
- Include comprehensive testing
- Update documentation as needed

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🔗 Links

- **NPM Package**: [@lanonasis/cli](https://www.npmjs.com/package/@lanonasis/cli)
- **Production API**: [https://api.lanonasis.com](https://api.lanonasis.com)
- **Dashboard**: [https://api.lanonasis.com/dashboard](https://api.lanonasis.com/dashboard)  
- **Documentation**: [https://docs.lanonasis.com/memory-services](https://docs.lanonasis.com/memory-services)
- **Service Discovery**: [https://api.lanonasis.com/.well-known/onasis.json](https://api.lanonasis.com/.well-known/onasis.json)

---

## Migration from Legacy Methods

**Legacy shell scripts have been archived** to `/archive/legacy-scripts/`. All functionality is now available through CLI v1.5.2:

| Legacy Script | CLI v1.5.2 Command |
|--------------|---------------------|
| `verify-services.sh` | `onasis health` |
| `setup-essential-secrets.sh` | `onasis init && onasis login` |
| `deploy.sh` | `onasis deploy status` |
| Manual auth setup | `onasis login --vendor-key <your-vendor-key>` |

**📖 Migration Guide**: See [ARCHIVE_MIGRATION_LOG.md](ARCHIVE_MIGRATION_LOG.md) for complete transition details.

---

*CLI v1.5.2 - Golden Contract Compliant | Onasis-Core v0.1 Standards*
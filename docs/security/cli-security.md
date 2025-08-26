# ⚡ CLI Security Best Practices

## Lanonasis CLI v1.5.2+ Security Guide

### 🛡️ Golden Contract Security Features

#### Secure Local Processing
```bash
# CLI v1.5.2+ processes data locally when possible
onasis memory create --title "Sensitive Data" --content "Private information"
# ✅ Local validation and processing before API transmission

# Enhanced security with MCP channels
onasis memory search "query" --use-mcp
# ✅ Model Context Protocol for secure AI interactions
```

#### Authentication Security
```bash
# ✅ GOOD: Use vendor keys (recommended for CLI)
onasis login --vendor-key pk_xxxxx.sk_xxxxx

# ✅ GOOD: OAuth for interactive sessions
onasis login --oauth

# ✅ GOOD: Environment variable authentication
export LANONASIS_VENDOR_KEY="pk_xxxxx.sk_xxxxx"
onasis memory list
```

### 🔐 Configuration Security

#### Secure Config Storage
```bash
# CLI stores configuration securely in user directory
# Location: ~/.lanonasis/config.json
# Permissions: 600 (user read/write only)

# Check configuration security
onasis config show --security
```

#### Environment Variables
```bash
# Recommended environment variables for CLI
export LANONASIS_VENDOR_KEY="pk_xxxxx.sk_xxxxx"
export LANONASIS_API_URL="https://api.lanonasis.com"
export LANONASIS_ENVIRONMENT="production"
export LANONASIS_LOG_LEVEL="info"  # Don't use "debug" in production
```

### 🚀 IDE Extension Security

#### VSCode Extension Security
```json
// settings.json - Secure configuration
{
  "lanonasis.preferCLI": true,
  "lanonasis.enableMCP": true,
  "lanonasis.verboseLogging": false,  // Disable in production
  "lanonasis.cliDetectionTimeout": 2000,
  "lanonasis.showPerformanceFeedback": false
}
```

#### Cursor Extension Security
```json
// Cursor configuration with OAuth + CLI
{
  "lanonasis.useAutoAuth": true,
  "lanonasis.preferCLI": true,
  "lanonasis.enableMCP": true,
  "lanonasis.verboseLogging": false
}
```

### 🔍 Security Monitoring

#### Audit Logging
```bash
# Enable comprehensive audit logging
onasis config set audit.enabled true
onasis config set audit.level detailed

# View audit logs (sanitized output)
onasis logs audit --since="1 hour ago"
```

#### Security Status
```bash
# Check CLI security status
onasis security status

# Verify Golden Contract compliance
onasis health --security

# Check for CLI updates
onasis update check
```

### 🛡️ Network Security

#### Secure Communications
```bash
# All CLI communications use HTTPS with certificate validation
# TLS 1.2+ encryption enforced

# Verify SSL certificate
onasis health --verify-ssl

# Use specific API endpoint
onasis config set api.url "https://api.lanonasis.com"
onasis config set api.verify_ssl true
```

#### Proxy Configuration
```bash
# Corporate proxy support with authentication
onasis config set proxy.url "https://proxy.company.com:8080"
onasis config set proxy.auth "username:password"

# Proxy with certificate validation
onasis config set proxy.verify_cert true
```

### 🔧 Development vs Production

#### Development Settings
```bash
# Development configuration
onasis config set environment development
onasis config set log.level debug
onasis config set api.timeout 30000
onasis config set cli.verbose true
```

#### Production Settings
```bash
# Production configuration (secure defaults)
onasis config set environment production
onasis config set log.level info
onasis config set api.timeout 15000
onasis config set cli.verbose false
onasis config set audit.enabled true
```

### 🚨 Security Best Practices

#### Command Line Security
```bash
# ✅ GOOD: Use configuration files
onasis login --config-file ~/.lanonasis/prod.json

# ❌ BAD: Credentials in command history
onasis login --vendor-key pk_xxxxx.sk_xxxxx  # Visible in shell history

# ✅ GOOD: Clear command history after sensitive operations
history -d $(history 1)
```

#### Script Security
```bash
#!/bin/bash
# Secure CLI script example

set -euo pipefail  # Exit on error, undefined vars, pipe failures

# Load credentials from secure location
if [ -f ~/.lanonasis/credentials ]; then
  source ~/.lanonasis/credentials
else
  echo "Credentials file not found!" >&2
  exit 1
fi

# Verify authentication before proceeding
if ! onasis health --quiet; then
  echo "Authentication failed!" >&2
  exit 1
fi

# Your operations here...
onasis memory list --format json
```

### 📋 Security Checklist

#### Installation Security
- [ ] Download CLI from official npm registry only
- [ ] Verify package integrity with npm audit
- [ ] Use specific version pinning in production
- [ ] Regular security updates via npm update

#### Configuration Security
- [ ] Credentials stored in environment variables
- [ ] Configuration files have proper permissions (600)
- [ ] No credentials in command history
- [ ] Audit logging enabled in production
- [ ] SSL certificate validation enabled

#### Operational Security
- [ ] Regular CLI updates applied
- [ ] Security status monitored
- [ ] Audit logs reviewed regularly
- [ ] Incident response procedures documented
- [ ] Team access properly managed

### 🔄 Security Updates

#### Automatic Updates
```bash
# Enable automatic security updates (recommended)
onasis config set updates.auto_security true
onasis config set updates.check_interval "24h"

# Manual security updates
onasis update security
```

#### Version Management
```bash
# Check current version and security status
onasis version --security

# Verify Golden Contract compliance version
onasis compliance check

# Update to latest secure version
onasis update --security-only
```

### 📞 Security Contacts

#### Immediate Security Issues
- **Security Team**: security@lanonasis.com
- **CLI Security**: cli-security@lanonasis.com
- **24/7 Response**: Available for Enterprise customers

#### Security Resources
- **Documentation**: https://docs.lanonasis.com/security/cli
- **Security Blog**: https://blog.lanonasis.com/security
- **CVE Database**: https://security.lanonasis.com/cve
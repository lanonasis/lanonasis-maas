# CLI v3.0.11 Publish Checklist

## ✅ Completed

### Infrastructure

- [x] Nginx configured for mcp.lanonasis.com
- [x] REST API proxied to port 3001
- [x] WebSocket proxied with upgrade headers
- [x] SSE configured with long-lived connections
- [x] Service discovery JSON created at /.well-known/onasis.json
- [x] All endpoints tested and responding

### Code Changes

- [x] Updated service discovery URL to mcp.lanonasis.com
- [x] Fixed all hardcoded api.lanonasis.com references for MCP
- [x] Updated fallback URLs in config.ts
- [x] Updated mcp-client.ts endpoints
- [x] Fixed all CLI help text and messages
- [x] Added proper discovery JSON mapping
- [x] TypeScript compilation successful
- [x] No diagnostics errors

### Documentation

- [x] Created TRANSPORT_CONFIGURATION.md
- [x] Created MCP_ENDPOINT_TEST_RESULTS.md
- [x] Updated MCP_CONFIG_ANALYSIS.md
- [x] Documented all transport options
- [x] Added testing commands
- [x] Added troubleshooting guide

### Version Control
- [x] Version bumped to 3.0.11
- [x] Changes committed with detailed message
- [x] Ready to push to main

## 🚀 Ready to Publish

### Pre-Publish Tests
```bash
# Build check
npm run build --prefix cli

# Local test
node cli/dist/index-simple.js --version

# Test MCP connection
node cli/dist/index-simple.js mcp connect --remote
```

### Publish Commands
```bash
# Push to GitHub
git push origin main

# Publish to npm
cd cli && npm publish --access public

# Verify published
npm view @lanonasis/cli@latest version
```

### Post-Publish Verification
```bash
# Install globally
npm install -g @lanonasis/cli@latest

# Clear old config
onasis config set discoveredServices ""

# Test auth
onasis auth login --email <user> --password <pass>

# Test MCP
onasis mcp connect --remote
onasis mcp tools

# Test all transports
onasis mcp connect --local
onasis mcp connect --websocket
onasis mcp status
```

## 📋 Endpoint Summary

### Auth (api.lanonasis.com)
- Login: `https://api.lanonasis.com/auth/login`
- Register: `https://api.lanonasis.com/auth/register`
- Health: `https://api.lanonasis.com/auth/health`

### Memory (api.lanonasis.com)
- Base: `https://api.lanonasis.com/api/v1`
- Memories: `https://api.lanonasis.com/api/v1/memories`
- Topics: `https://api.lanonasis.com/api/v1/topics`

### MCP (mcp.lanonasis.com) ⭐ NEW
- REST: `https://mcp.lanonasis.com/api/v1`
- WebSocket: `wss://mcp.lanonasis.com/ws`
- SSE: `https://mcp.lanonasis.com/api/v1/events`
- Discovery: `https://mcp.lanonasis.com/.well-known/onasis.json`

## 🎯 Key Features

1. **Multi-Transport Support**
   - STDIO for local clients
   - HTTP/REST for standard API calls
   - WebSocket for real-time bidirectional
   - SSE for server push events

2. **Auto-Discovery**
   - Fetches endpoints from /.well-known/onasis.json
   - Falls back to hardcoded defaults
   - Caches discovered services

3. **Flexible Auth**
   - JWT tokens
   - Vendor keys (pk_*.sk_*)
   - OAuth flow
   - Browser-based CLI login

4. **NPX Support**
   - Works without global install
   - `npx @lanonasis/cli <command>`

## 🔧 Breaking Changes

Users upgrading from v3.0.10 or earlier need to:

1. Clear cached discovery:
   ```bash
   onasis config set discoveredServices ""
   ```

2. Reconnect to MCP:
   ```bash
   onasis mcp connect --remote
   ```

3. Verify endpoints:
   ```bash
   onasis config show
   ```

## 📝 Release Notes

**v3.0.11** - MCP Endpoint Migration

- Migrated MCP services to dedicated mcp.lanonasis.com domain
- Added full multi-transport support (STDIO, HTTP, WebSocket, SSE)
- Implemented service discovery via /.well-known/onasis.json
- Fixed all hardcoded endpoint references
- Added comprehensive transport configuration guide
- Improved error messages and help text
- Enhanced MCP connection reliability

## ✅ Sign-Off

- [ ] Code reviewed
- [ ] Tests passed
- [ ] Documentation complete
- [ ] Ready to publish

**Approved by**: _____________
**Date**: 2025-10-19

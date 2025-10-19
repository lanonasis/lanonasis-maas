#!/bin/bash

echo "🔍 Verifying @lanonasis/cli v3.0.12 Deployment"
echo "=============================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check CLI version
echo "📦 CLI Version:"
VERSION=$(onasis --version 2>&1 | tail -1)
if [[ "$VERSION" == "3.0.12" ]]; then
    echo -e "${GREEN}✓${NC} Version: $VERSION"
else
    echo -e "${RED}✗${NC} Version mismatch: $VERSION (expected 3.0.12)"
fi
echo ""

# Check service discovery
echo "🔍 Service Discovery:"
DISCOVERY=$(curl -s https://mcp.lanonasis.com/.well-known/onasis.json)
if echo "$DISCOVERY" | jq -e '.endpoints.http' > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Discovery JSON available"
    echo "  HTTP: $(echo $DISCOVERY | jq -r '.endpoints.http')"
    echo "  WebSocket: $(echo $DISCOVERY | jq -r '.endpoints.websocket')"
    echo "  SSE: $(echo $DISCOVERY | jq -r '.endpoints.sse')"
else
    echo -e "${RED}✗${NC} Discovery JSON not available"
fi
echo ""

# Check MCP health
echo "🏥 MCP Health:"
MCP_HEALTH=$(curl -s https://mcp.lanonasis.com/health)
if echo "$MCP_HEALTH" | jq -e '.status' > /dev/null 2>&1; then
    STATUS=$(echo $MCP_HEALTH | jq -r '.status')
    echo -e "${GREEN}✓${NC} MCP Server: $STATUS"
    echo "  Version: $(echo $MCP_HEALTH | jq -r '.version')"
    echo "  Uptime: $(echo $MCP_HEALTH | jq -r '.uptime')"
else
    echo -e "${RED}✗${NC} MCP health check failed"
fi
echo ""

# Check Auth health
echo "🔐 Auth Health:"
AUTH_HEALTH=$(curl -s https://api.lanonasis.com/auth/health)
if echo "$AUTH_HEALTH" | jq -e '.status' > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Auth Service: $(echo $AUTH_HEALTH | jq -r '.status')"
    echo "  Login: $(echo $AUTH_HEALTH | jq -r '.endpoints.login')"
    echo "  Register: $(echo $AUTH_HEALTH | jq -r '.endpoints.register')"
else
    echo -e "${RED}✗${NC} Auth health check failed"
fi
echo ""

# Test SSE connection
echo "📡 SSE Connection:"
SSE_TEST=$(timeout 2 curl -s -N https://mcp.lanonasis.com/api/v1/events 2>&1 | head -1)
if [[ "$SSE_TEST" == *"event: connected"* ]]; then
    echo -e "${GREEN}✓${NC} SSE streaming works"
else
    echo -e "${YELLOW}⚠${NC} SSE test inconclusive (may need auth)"
fi
echo ""

# Check CLI config
echo "⚙️  CLI Configuration:"
if onasis config show > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} CLI config accessible"
    
    # Check if using new endpoints
    CONFIG_OUTPUT=$(onasis config show 2>&1)
    if echo "$CONFIG_OUTPUT" | grep -q "mcp.lanonasis.com"; then
        echo -e "${GREEN}✓${NC} Using mcp.lanonasis.com endpoints"
    else
        echo -e "${YELLOW}⚠${NC} May need to clear cached discovery:"
        echo "  onasis config set discoveredServices \"\""
    fi
else
    echo -e "${RED}✗${NC} CLI config not accessible"
fi
echo ""

# Summary
echo "=============================================="
echo "📊 Deployment Summary:"
echo ""
echo "Endpoints:"
echo "  Auth:   https://api.lanonasis.com/auth/*"
echo "  Memory: https://api.lanonasis.com/api/v1/*"
echo "  MCP:    https://mcp.lanonasis.com/api/v1/*"
echo "  WS:     wss://mcp.lanonasis.com/ws"
echo "  SSE:    https://mcp.lanonasis.com/api/v1/events"
echo ""
echo "Next Steps:"
echo "  1. Clear cached discovery: onasis config set discoveredServices \"\""
echo "  2. Test MCP connection: onasis mcp connect --remote"
echo "  3. List MCP tools: onasis mcp tools"
echo ""

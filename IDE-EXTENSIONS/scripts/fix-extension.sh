#!/bin/bash
set -e

echo "======================================================================"
echo "🔧 Lanonasis VSCode Extension - Automated Fix Script"
echo "======================================================================"
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
EXTENSION_DIR="$SCRIPT_DIR/vscode-extension"
MEMORY_CLIENT_DIR="$SCRIPT_DIR/../packages/memory-client"

echo -e "${BLUE}📂 Directories:${NC}"
echo "   Extension: $EXTENSION_DIR"
echo "   Memory Client: $MEMORY_CLIENT_DIR"
echo ""

# Step 1: Clean old artifacts
echo -e "${YELLOW}Step 1/6: Cleaning old build artifacts...${NC}"
cd "$EXTENSION_DIR"
rm -rf out/ 2>/dev/null || true
rm -rf node_modules/ 2>/dev/null || true
echo -e "${GREEN}✅ Cleaned${NC}"
echo ""

# Step 2: Build memory-client dependency
echo -e "${YELLOW}Step 2/6: Building memory-client package...${NC}"
if [ -d "$MEMORY_CLIENT_DIR" ]; then
    cd "$MEMORY_CLIENT_DIR"

    # Check if we should use bun or npm
    if command -v bun &> /dev/null; then
        echo "   Using bun..."
        bun install
        bun run build
    else
        echo "   Using npm..."
        npm install
        npm run build
    fi

    echo -e "${GREEN}✅ Memory client built${NC}"
else
    echo -e "${RED}⚠️  Memory client directory not found at $MEMORY_CLIENT_DIR${NC}"
    echo "   Skipping... will try to use published version"
fi
echo ""

# Step 3: Install extension dependencies
echo -e "${YELLOW}Step 3/6: Installing extension dependencies...${NC}"
cd "$EXTENSION_DIR"

# Check if we should use bun or npm (prefer npm for VSCode extensions)
if [ -f "package-lock.json" ]; then
    echo "   Using npm (package-lock.json found)..."
    npm install
elif command -v bun &> /dev/null && [ -f "bun.lock" ]; then
    echo "   Using bun (bun.lock found)..."
    bun install
else
    echo "   Using npm (default)..."
    npm install
fi

echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

# Step 4: Fix tsconfig.json if needed
echo -e "${YELLOW}Step 4/6: Checking TypeScript configuration...${NC}"
if ! grep -q '"types"' tsconfig.json 2>/dev/null; then
    echo "   Adding types configuration..."
    # Backup original
    cp tsconfig.json tsconfig.json.backup

    # Use sed to add types and moduleResolution
    sed -i.tmp 's/"resolveJsonModule": true/"resolveJsonModule": true,\n    "types": ["vscode", "node"],\n    "moduleResolution": "node"/' tsconfig.json
    rm tsconfig.json.tmp 2>/dev/null || true

    echo -e "${GREEN}✅ TypeScript config updated${NC}"
else
    echo -e "${GREEN}✅ TypeScript config OK${NC}"
fi
echo ""

# Step 5: Compile TypeScript
echo -e "${YELLOW}Step 5/6: Compiling TypeScript...${NC}"
npm run compile 2>&1 | tee compile.log

# Check if compilation succeeded
if [ -f "out/extension.js" ]; then
    ERROR_COUNT=$(grep -c "error TS" compile.log 2>/dev/null || echo "0")
    if [ "$ERROR_COUNT" -gt 0 ]; then
        echo -e "${YELLOW}⚠️  Compiled with $ERROR_COUNT errors (check compile.log)${NC}"
    else
        echo -e "${GREEN}✅ Compilation successful!${NC}"
    fi
    rm compile.log 2>/dev/null || true
else
    echo -e "${RED}❌ Compilation failed!${NC}"
    echo "Check compile.log for details"
    exit 1
fi
echo ""

# Step 6: Package extension
echo -e "${YELLOW}Step 6/6: Creating extension package...${NC}"
npm run package 2>&1 | tee package.log

# Find the created VSIX file
VSIX_FILE=$(ls -t *.vsix 2>/dev/null | head -1)

if [ -n "$VSIX_FILE" ]; then
    echo -e "${GREEN}✅ Extension packaged successfully!${NC}"
    rm package.log 2>/dev/null || true
    echo ""
    echo "======================================================================"
    echo -e "${GREEN}🎉 SUCCESS!${NC}"
    echo "======================================================================"
    echo ""
    echo -e "${BLUE}📦 Package created:${NC} $VSIX_FILE"
    echo ""
    echo -e "${BLUE}📍 To install in VS Code:${NC}"
    echo "   code --install-extension $VSIX_FILE"
    echo ""
    echo -e "${BLUE}📍 To install in Cursor:${NC}"
    echo "   cursor --install-extension $VSIX_FILE"
    echo ""
    echo -e "${BLUE}📍 Or install manually:${NC}"
    echo "   VS Code → Extensions → ... → Install from VSIX → Select $VSIX_FILE"
    echo ""
    echo "======================================================================"
else
    echo -e "${RED}❌ Packaging failed!${NC}"
    echo "Check package.log for details"
    exit 1
fi

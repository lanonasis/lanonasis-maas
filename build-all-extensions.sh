#!/bin/bash

# Build and Package All IDE Extensions
# Version 1.3.0 - With 17 Enterprise Tools

echo "🚀 Building LanOnasis-MAAS Extensions v1.3.0"
echo "==========================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if vsce is installed
if ! command -v vsce &> /dev/null; then
    echo -e "${YELLOW}Installing vsce (Visual Studio Code Extension manager)...${NC}"
    npm install -g vsce
fi

# Function to build extension
build_extension() {
    local dir=$1
    local name=$2
    
    echo -e "\n${GREEN}Building $name...${NC}"
    cd "$dir" || exit 1
    
    # Install dependencies
    echo "Installing dependencies..."
    npm install
    
    # Compile TypeScript
    echo "Compiling TypeScript..."
    npm run compile
    
    # Package extension
    echo "Packaging extension..."
    vsce package --no-dependencies
    
    # Check if package was created
    if ls *.vsix 1> /dev/null 2>&1; then
        echo -e "${GREEN}✅ $name packaged successfully${NC}"
        # Move to output directory
        mkdir -p ../../../dist/extensions
        mv *.vsix ../../../dist/extensions/
    else
        echo -e "${RED}❌ Failed to package $name${NC}"
    fi
    
    cd ..
}

# Start from the right directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR" || exit 1

# Build VS Code Extension
build_extension "vscode-extension" "VS Code Extension"

# Build Cursor Extension  
build_extension "cursor-extension" "Cursor Extension"

# Build Windsurf Extension
build_extension "windsurf-extension" "Windsurf Extension"

echo -e "\n${GREEN}===========================================
✅ All extensions built successfully!
===========================================

📦 Extension packages created in dist/extensions/:
  - lanonasis-memory-1.3.0.vsix (VS Code)
  - lanonasis-memory-cursor-1.3.0.vsix (Cursor)
  - lanonasis-memory-windsurf-1.3.0.vsix (Windsurf)

🎯 All 17 tools included:
  Memory: 6 tools
  API Keys: 4 tools
  System: 3 tools
  Projects: 2 tools
  Config: 2 tools

🔐 Security features:
  ✅ Secure API key storage
  ✅ Console log redaction
  ✅ OAuth authentication support

📝 Next steps:
  1. Test extensions locally
  2. Publish to marketplace
  3. Update documentation
${NC}"

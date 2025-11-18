#!/bin/bash

# LanOnasis VS Code Extension - Build and Publish Script
# This script builds, tests, and publishes the extension to VS Code Marketplace

set -e

echo "🚀 LanOnasis VS Code Extension - Build & Publish"
echo "=================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get current version from package.json
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo -e "${BLUE}Current version: ${CURRENT_VERSION}${NC}"
echo ""

# Step 1: Clean previous builds
echo -e "${YELLOW}Step 1: Cleaning previous builds...${NC}"
rm -rf out/
rm -f *.vsix
echo -e "${GREEN}✓ Cleaned${NC}"
echo ""

# Step 2: Install dependencies
echo -e "${YELLOW}Step 2: Installing dependencies...${NC}"
if command -v bun &> /dev/null; then
    echo "Using bun..."
    bun install
else
    echo "Using npm..."
    npm install
fi
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Step 3: Lint code
echo -e "${YELLOW}Step 3: Linting code...${NC}"
npm run lint || {
    echo -e "${RED}✗ Linting failed. Please fix errors before publishing.${NC}"
    exit 1
}
echo -e "${GREEN}✓ Linting passed${NC}"
echo ""

# Step 4: Compile TypeScript
echo -e "${YELLOW}Step 4: Compiling TypeScript...${NC}"
npm run compile || {
    echo -e "${RED}✗ Compilation failed${NC}"
    exit 1
}
echo -e "${GREEN}✓ Compilation successful${NC}"
echo ""

# Step 5: Verify build
echo -e "${YELLOW}Step 5: Verifying build...${NC}"
if [ ! -f "out/extension.js" ]; then
    echo -e "${RED}✗ Build verification failed: out/extension.js not found${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Build verified${NC}"
echo ""

# Step 6: Package extension
echo -e "${YELLOW}Step 6: Packaging extension...${NC}"
npm run package || {
    echo -e "${RED}✗ Packaging failed${NC}"
    exit 1
}

VSIX_FILE="lanonasis-memory-${CURRENT_VERSION}.vsix"
if [ ! -f "$VSIX_FILE" ]; then
    echo -e "${RED}✗ Package file not found: ${VSIX_FILE}${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Package created: ${VSIX_FILE}${NC}"
echo ""

# Step 7: Test installation locally (optional)
echo -e "${YELLOW}Step 7: Testing local installation...${NC}"
echo "Would you like to test the extension locally before publishing? (y/n)"
read -r TEST_LOCAL

if [ "$TEST_LOCAL" = "y" ] || [ "$TEST_LOCAL" = "Y" ]; then
    code --install-extension "$VSIX_FILE" --force
    echo -e "${GREEN}✓ Extension installed locally for testing${NC}"
    echo -e "${BLUE}Please test the extension in VS Code, then return here to continue.${NC}"
    echo "Press Enter when ready to continue..."
    read -r
fi
echo ""

# Step 8: Publish to marketplace
echo -e "${YELLOW}Step 8: Publishing to VS Code Marketplace...${NC}"
echo "Are you sure you want to publish version ${CURRENT_VERSION}? (y/n)"
read -r CONFIRM_PUBLISH

if [ "$CONFIRM_PUBLISH" != "y" ] && [ "$CONFIRM_PUBLISH" != "Y" ]; then
    echo -e "${YELLOW}Publishing cancelled${NC}"
    echo -e "${BLUE}VSIX file saved: ${VSIX_FILE}${NC}"
    exit 0
fi

# Check if vsce token is configured
if ! vsce ls-publishers &> /dev/null; then
    echo -e "${RED}✗ Not logged in to vsce${NC}"
    echo "Please run: vsce login LanOnasis"
    exit 1
fi

npm run publish || {
    echo -e "${RED}✗ Publishing failed${NC}"
    echo "You can manually publish with: vsce publish"
    exit 1
}
echo -e "${GREEN}✓ Published to marketplace${NC}"
echo ""

# Step 9: Create git tag
echo -e "${YELLOW}Step 9: Creating git tag...${NC}"
echo "Create git tag v${CURRENT_VERSION}? (y/n)"
read -r CREATE_TAG

if [ "$CREATE_TAG" = "y" ] || [ "$CREATE_TAG" = "Y" ]; then
    git tag -a "vscode-v${CURRENT_VERSION}" -m "VS Code Extension v${CURRENT_VERSION}"
    echo "Push tag to remote? (y/n)"
    read -r PUSH_TAG
    
    if [ "$PUSH_TAG" = "y" ] || [ "$PUSH_TAG" = "Y" ]; then
        git push origin "vscode-v${CURRENT_VERSION}"
        echo -e "${GREEN}✓ Tag pushed to remote${NC}"
    fi
fi
echo ""

# Summary
echo "=================================================="
echo -e "${GREEN}🎉 Build and Publish Complete!${NC}"
echo "=================================================="
echo ""
echo "Version: ${CURRENT_VERSION}"
echo "Package: ${VSIX_FILE}"
echo "Marketplace: https://marketplace.visualstudio.com/items?itemName=LanOnasis.lanonasis-memory"
echo ""
echo "Next steps:"
echo "1. Verify extension on marketplace (may take 5-10 minutes)"
echo "2. Test installation: code --install-extension LanOnasis.lanonasis-memory"
echo "3. Update CHANGELOG.md for next version"
echo "4. Commit and push changes"
echo ""

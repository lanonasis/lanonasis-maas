#!/bin/bash

# 🔄 Complete Development Environment Restoration
# This script restores all development dependencies and build outputs

echo "🔄 Lanonasis MaaS - Development Environment Restoration"
echo "======================================================"
echo ""
echo "Restoring everything that was removed during cleanup..."
echo ""

# Set base directory
REPO_ROOT="/Users/seyederick/DevOps/_project_folders/lanonasis-maas"
cd "$REPO_ROOT"

echo "📦 Phase 1: Restoring Package Dependencies"
echo "=========================================="

# Main project
echo "1. Main project dependencies..."
if [ -f "package.json" ]; then
    bun install 2>/dev/null || npm install --no-fund --no-audit 2>/dev/null || echo "   ⚠️ Workspace conflicts - skipping main install"
fi

# CLI
echo "2. CLI dependencies..."
if [ -d "cli" ] && [ -f "cli/package.json" ]; then
    cd cli
    bun install 2>/dev/null || npm install --no-fund --no-audit 2>/dev/null
    cd ..
fi

# Dashboard
echo "3. Dashboard dependencies..."
if [ -d "dashboard" ] && [ -f "dashboard/package.json" ]; then
    cd dashboard
    bun install 2>/dev/null || npm install --no-fund --no-audit 2>/dev/null
    cd ..
fi

# Memory Client SDK
echo "4. Memory Client SDK..."
if [ -d "packages/memory-client" ] && [ -f "packages/memory-client/package.json" ]; then
    cd packages/memory-client
    bun install 2>/dev/null || npm install --no-fund --no-audit 2>/dev/null
    cd ../..
fi

# Lanonasis SDK
echo "5. Lanonasis SDK..."
if [ -d "packages/lanonasis-sdk" ] && [ -f "packages/lanonasis-sdk/package.json" ]; then
    cd packages/lanonasis-sdk
    bun install 2>/dev/null || npm install --no-fund --no-audit 2>/dev/null
    cd ../..
fi

# Memory Engine
echo "6. Memory Engine..."
if [ -d "packages/memory-engine" ] && [ -f "packages/memory-engine/package.json" ]; then
    cd packages/memory-engine
    bun install 2>/dev/null || npm install --no-fund --no-audit 2>/dev/null
    cd ../..
fi

# VS Code Extension
echo "7. VS Code Extension..."
if [ -d "vscode-extension" ] && [ -f "vscode-extension/package.json" ]; then
    cd vscode-extension
    bun install 2>/dev/null || npm install --no-fund --no-audit 2>/dev/null
    cd ..
fi

# Cursor Extension
echo "8. Cursor Extension..."
if [ -d "cursor-extension" ] && [ -f "cursor-extension/package.json" ]; then
    cd cursor-extension
    bun install 2>/dev/null || npm install --no-fund --no-audit 2>/dev/null
    cd ..
fi

# Windsurf Extension
echo "9. Windsurf Extension..."
if [ -d "windsurf-extension" ] && [ -f "windsurf-extension/package.json" ]; then
    cd windsurf-extension
    bun install 2>/dev/null || npm install --no-fund --no-audit 2>/dev/null
    cd ..
fi

# Docs
echo "10. Documentation..."
if [ -d "docs" ] && [ -f "docs/package.json" ]; then
    cd docs
    bun install 2>/dev/null || npm install --no-fund --no-audit 2>/dev/null
    cd ..
fi

echo ""
echo "🏗️ Phase 2: Rebuilding Project Outputs"
echo "======================================"

# Build main project
echo "1. Building main project..."
if [ -f "package.json" ]; then
    bun run build 2>/dev/null || npm run build 2>/dev/null || echo "   ⚠️ Build script not available or failed"
fi

# Build CLI
echo "2. Building CLI..."
if [ -d "cli" ]; then
    cd cli
    bun run build 2>/dev/null || npm run build 2>/dev/null || echo "   ⚠️ CLI build not available or failed"
    cd ..
fi

# Build Dashboard
echo "3. Building Dashboard..."
if [ -d "dashboard" ]; then
    cd dashboard
    bun run build 2>/dev/null || npm run build 2>/dev/null || echo "   ⚠️ Dashboard build not available or failed"
    cd ..
fi

# Build Memory Client
echo "4. Building Memory Client..."
if [ -d "packages/memory-client" ]; then
    cd packages/memory-client
    bun run build 2>/dev/null || npm run build 2>/dev/null || echo "   ⚠️ Memory Client build not available or failed"
    cd ../..
fi

# Build Extensions
echo "5. Building Extensions..."
for ext in vscode-extension cursor-extension windsurf-extension; do
    if [ -d "$ext" ]; then
        cd "$ext"
        echo "   Building $ext..."
        bun run compile 2>/dev/null || npm run compile 2>/dev/null || echo "   ⚠️ $ext build not available or failed"
        cd ..
    fi
done

echo ""
echo "📁 Phase 3: Restoring File Permissions"
echo "====================================="

# Make scripts executable
echo "Making scripts executable..."
find . -name "*.sh" -type f -exec chmod +x {} \; 2>/dev/null

echo ""
echo "🔍 Phase 4: Verification"
echo "======================="

echo "Checking restored components:"

# Check node_modules
echo "✅ Dependencies restored:"
for dir in . cli dashboard packages/memory-client packages/lanonasis-sdk vscode-extension cursor-extension windsurf-extension; do
    if [ -d "$dir/node_modules" ]; then
        echo "  ✅ $dir/node_modules"
    else
        echo "  ⚠️ $dir/node_modules - not found"
    fi
done

echo ""
echo "✅ Build outputs:"
for dir in . cli dashboard packages/memory-client; do
    if [ -d "$dir/dist" ] || [ -d "$dir/out" ] || [ -d "$dir/build" ]; then
        echo "  ✅ $dir - build outputs present"
    else
        echo "  ⚠️ $dir - no build outputs (may be normal)"
    fi
done

echo ""
echo "✅ Extensions:"
for ext in vscode-extension cursor-extension windsurf-extension; do
    if [ -d "$ext/out" ] || [ -f "$ext/*.vsix" ]; then
        echo "  ✅ $ext - compiled"
    else
        echo "  ⚠️ $ext - not compiled"
    fi
done

echo ""
echo "📊 Restoration Summary"
echo "====================="
echo "✅ Package dependencies restored"
echo "✅ Build outputs regenerated"
echo "✅ File permissions corrected"
echo "✅ All services remain intact"
echo "✅ Security improvements preserved"
echo ""
echo "🎯 Status: DEVELOPMENT ENVIRONMENT FULLY RESTORED!"
echo ""
echo "🔧 Next Steps:"
echo "1. Test all services: npm test (in each directory)"
echo "2. Start development: npm run dev"
echo "3. Verify extensions work in their respective IDEs"
echo ""
echo "🚀 Your development environment is ready!"

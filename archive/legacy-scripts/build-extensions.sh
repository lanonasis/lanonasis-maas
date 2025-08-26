#!/bin/bash

# Build all extensions with correct version numbers
echo "Building all Lanonasis extensions..."

# Function to build an extension
build_extension() {
    local ext_dir=$1
    local ext_name=$2
    
    echo "Building $ext_name extension..."
    cd "$ext_dir"
    
    # Find TypeScript compiler
    TSC_PATH="/usr/local/lib/node_modules/typescript/bin/tsc"
    if [ ! -f "$TSC_PATH" ]; then
        TSC_PATH="$(which tsc)"
    fi
    
    if [ ! -f "$TSC_PATH" ]; then
        echo "TypeScript compiler not found for $ext_name. Skipping compilation..."
        return 1
    fi
    
    # Compile TypeScript files
    echo "Compiling TypeScript for $ext_name..."
    $TSC_PATH -p .
    
    # Package extension
    echo "Packaging $ext_name..."
    if command -v vsce &> /dev/null; then
        vsce package --no-dependencies
    else
        echo "vsce not found. Extension compiled but not packaged."
    fi
    
    echo "$ext_name build complete!"
    echo ""
}

# Build all extensions
build_extension "/Users/seyederick/DevOps/_project_folders/lanonasis-maas/vscode-extension" "VSCode"
build_extension "/Users/seyederick/DevOps/_project_folders/lanonasis-maas/cursor-extension" "Cursor"
build_extension "/Users/seyederick/DevOps/_project_folders/lanonasis-maas/windsurf-extension" "Windsurf"

echo "All extensions build process complete!"

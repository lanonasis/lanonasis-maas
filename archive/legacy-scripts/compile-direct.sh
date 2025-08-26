#!/bin/bash

# Direct TypeScript compilation bypassing npm workspace conflicts
echo "Compiling VS Code extension directly..."

# Find TypeScript compiler
TSC_PATH="/usr/local/lib/node_modules/typescript/bin/tsc"
if [ ! -f "$TSC_PATH" ]; then
    TSC_PATH="$(which tsc)"
fi

if [ ! -f "$TSC_PATH" ]; then
    echo "TypeScript compiler not found. Attempting to use npx fallback..."
    TSC_PATH="npx tsc"
fi

# Compile TypeScript files
cd /Users/seyederick/DevOps/_project_folders/vibe-memory/vscode-extension
$TSC_PATH -p .

echo "Compilation complete!"
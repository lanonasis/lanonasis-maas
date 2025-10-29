#!/bin/bash

# VS Code Extension Icon Verification Script

echo "🔍 Checking VS Code Extension Icon Setup..."

EXTENSION_DIR="/Users/seyederick/DevOps/_project_folders/lanonasis-maas/IDE-EXTENSIONS/vscode-extension"
IMAGES_DIR="$EXTENSION_DIR/images"

echo ""
echo "📁 Current images directory contents:"
ls -la "$IMAGES_DIR"

echo ""
echo "📋 Required files:"
REQUIRED_FILES=("icon_128x128.png" "icon_L_24x24.png")

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$IMAGES_DIR/$file" ]; then
        echo "✅ $file - Found"
        
        # Check file size for basic validation
        SIZE=$(wc -c < "$IMAGES_DIR/$file")
        if [ $SIZE -gt 1000 ]; then
            echo "   📏 File size: ${SIZE} bytes (looks good)"
        else
            echo "   ⚠️  File size: ${SIZE} bytes (seems small, check if valid)"
        fi
    else
        echo "❌ $file - Missing"
    fi
done

echo ""
echo "📝 Package.json configuration:"
echo "Marketplace icon: $(grep '"icon":' "$EXTENSION_DIR/package.json" | head -1)"
echo "Activity bar icon: $(grep -A3 '"activitybar"' "$EXTENSION_DIR/package.json" | grep '"icon"')"

echo ""
echo "🚀 Next steps after adding icons:"
echo "1. Press F5 in VS Code to test the extension"
echo "2. Check Activity Bar for the Lanonasis icon"
echo "3. Run 'vsce package' to create .vsix file"
echo "4. Verify icons in the generated package"
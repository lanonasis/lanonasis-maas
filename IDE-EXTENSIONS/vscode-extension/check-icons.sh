#!/bin/bash

# VS Code Extension Icon Verification Script

echo "🔍 Checking VS Code Extension Icon Setup..."

EXTENSION_DIR="$(cd "$(dirname "$0")" && pwd)"
IMAGES_DIR="$EXTENSION_DIR/images"

echo ""
echo "📁 Current images directory contents:"
ls -lh "$IMAGES_DIR"

echo ""
echo "📋 Icon Files Status:"

# Check marketplace icon (icon.png)
if [ -f "$IMAGES_DIR/icon.png" ]; then
    SIZE=$(file "$IMAGES_DIR/icon.png" 2>/dev/null | grep -o '[0-9]* x [0-9]*' || echo "unknown size")
    BYTES=$(wc -c < "$IMAGES_DIR/icon.png")
    echo "✅ icon.png - Present ($SIZE, ${BYTES} bytes)"
else
    echo "❌ icon.png - Missing (Required for marketplace)"
fi

# Check activity bar icon (icon.svg)
if [ -f "$IMAGES_DIR/icon.svg" ]; then
    BYTES=$(wc -c < "$IMAGES_DIR/icon.svg")
    echo "✅ icon.svg - Present (${BYTES} bytes)"
else
    echo "❌ icon.svg - Missing (Required for activity bar)"
fi

# Check alternative icon
if [ -f "$IMAGES_DIR/icon1.svg" ]; then
    BYTES=$(wc -c < "$IMAGES_DIR/icon1.svg")
    echo "ℹ️  icon1.svg - Present (${BYTES} bytes, alternative design)"
fi

echo ""
echo "📝 Package.json configuration:"
MARKETPLACE_ICON=$(grep '"icon":' "$EXTENSION_DIR/package.json" | head -1 | sed 's/^[[:space:]]*//')
ACTIVITY_ICON=$(grep -A 5 '"viewsContainers"' "$EXTENSION_DIR/package.json" | grep '"icon"' | head -1 | sed 's/^[[:space:]]*//')

echo "Marketplace icon:  $MARKETPLACE_ICON"
echo "Activity bar icon: $ACTIVITY_ICON"

echo ""
echo "🎯 Validation:"
if [ -f "$IMAGES_DIR/icon.png" ] && [ -f "$IMAGES_DIR/icon.svg" ]; then
    echo "✅ All required icons are present"
    echo "✅ Extension is ready for packaging"
    echo ""
    echo "🚀 Next steps:"
    echo "1. Press F5 in VS Code to test the extension"
    echo "2. Check Activity Bar for the Lanonasis icon"
    echo "3. Run 'npm run compile' to build"
    echo "4. Run 'npx vsce package' to create .vsix file"
    echo "5. Verify icons in the generated package"
else
    echo "⚠️  Some required icons are missing"
    echo "📖 See ICON_UPDATE_README.md for details"
fi

echo ""
echo "📊 Summary:"
PNG_COUNT=$(find "$IMAGES_DIR" -name "*.png" -type f | wc -l | tr -d ' ')
SVG_COUNT=$(find "$IMAGES_DIR" -name "*.svg" -type f | wc -l | tr -d ' ')
echo "Total PNG files: $PNG_COUNT"
echo "Total SVG files: $SVG_COUNT"

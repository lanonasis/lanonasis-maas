#!/bin/bash

# Lanonasis Memory SDK - Quick Setup Script
echo "🚀 Setting up Lanonasis Memory SDK..."

# Check if target directory is provided
if [ -z "$1" ]; then
    echo "Usage: ./setup.sh <target-directory>"
    echo "Example: ./setup.sh ../my-project/lib/memory-sdk"
    exit 1
fi

TARGET_DIR="$1"

# Create target directory if it doesn't exist
mkdir -p "$TARGET_DIR"

# Copy all files
echo "📦 Copying SDK files to $TARGET_DIR"
cp lanonasis-memory-sdk.js "$TARGET_DIR/"
cp lanonasis-memory-sdk.cjs "$TARGET_DIR/"
cp lanonasis-memory-sdk.js.map "$TARGET_DIR/"
cp lanonasis-memory-sdk.cjs.map "$TARGET_DIR/"
cp types.d.ts "$TARGET_DIR/"
cp package.json "$TARGET_DIR/"
cp README.md "$TARGET_DIR/"
cp example.js "$TARGET_DIR/"

# Create env template
ENV_FILE="$TARGET_DIR/../.env.example"
echo "🔧 Creating environment template at $ENV_FILE"
cat > "$ENV_FILE" << 'EOL'
# Lanonasis Memory SDK Configuration
LANONASIS_API_URL=https://api.lanonasis.com
LANONASIS_API_KEY=your-api-key-here

# Framework-specific (uncomment as needed)
# REACT_APP_LANONASIS_API_URL=https://api.lanonasis.com
# REACT_APP_LANONASIS_API_KEY=your-api-key-here

# VITE_LANONASIS_API_URL=https://api.lanonasis.com
# VITE_LANONASIS_API_KEY=your-api-key-here

# NEXT_PUBLIC_LANONASIS_API_URL=https://api.lanonasis.com
# Note: Don't expose API key in public Next.js env vars
EOL

echo "✅ Setup complete!"
echo ""
echo "📁 Files copied to: $TARGET_DIR"
echo "🔑 Environment template: $ENV_FILE"
echo ""
echo "Next steps:"
echo "1. Copy .env.example to .env and add your API key"
echo "2. Import the SDK in your project:"
echo "   import MemoryClient from '$TARGET_DIR/lanonasis-memory-sdk.js'"
echo "3. Check the README.md for usage examples"
echo ""
echo "🎉 Ready to use Lanonasis Memory SDK!"
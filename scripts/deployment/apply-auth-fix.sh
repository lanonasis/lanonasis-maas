#!/bin/bash

# Apply authentication persistence fix to CLI

echo "Applying authentication persistence fix..."

# Backup original file
cp cli/src/index.ts cli/src/index.ts.backup

# Fix 1: Add init() call in preAction hook (after line 47)
sed -i '' '48 i\
    // CRITICAL FIX: Initialize config to load saved authentication\
    await cliConfig.init();\
' cli/src/index.ts

# Fix 2: Add init() call in status command (after line 511)
# First find the exact line number
STATUS_LINE=$(grep -n "\.command('status')" cli/src/index.ts | tail -1 | cut -d: -f1)
ACTION_LINE=$((STATUS_LINE + 2))

sed -i '' "${ACTION_LINE} i\
    // CRITICAL FIX: Initialize config to load saved authentication\
    await cliConfig.init();\
" cli/src/index.ts

echo "✅ Fix applied successfully!"
echo "Building CLI..."

cd cli && npm run build

if [ $? -eq 0 ]; then
  echo "✅ Build successful!"
  echo ""
  echo "Test with:"
  echo "  lanonasis auth login"
  echo "  lanonasis status"
else
  echo "❌ Build failed - restoring backup"
  mv cli/src/index.ts.backup cli/src/index.ts
fi

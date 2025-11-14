#!/bin/bash

echo "🔍 Verifying VSCode Extension Build..."
echo ""

REQUIRED_FILES=(
  "out/extension.js"
  "out/panels/MemorySidebarProvider.js"
  "out/providers/MemoryTreeProvider.js"
  "out/providers/ApiKeyTreeProvider.js"
  "out/providers/MemoryCompletionProvider.js"
  "out/services/MemoryService.js"
  "out/services/SecureApiKeyService.js"
  "out/services/ApiKeyService.js"
  "out/services/EnhancedMemoryService.js"
  "out/services/memory-client-sdk.js"
  "out/services/memory-aligned.js"
  "out/services/IMemoryService.js"
  "out/utils/errorRecovery.js"
  "out/utils/diagnostics.js"
  "out/types/memory-aligned.js"
  "media/sidebar.js"
  "media/sidebar.css"
)

MISSING=()
PRESENT=()

for file in "${REQUIRED_FILES[@]}"; do
  if [ ! -f "$file" ]; then
    MISSING+=("$file")
  else
    PRESENT+=("$file")
  fi
done

echo "📊 Build Status:"
echo "  ✅ Present: ${#PRESENT[@]} files"
echo "  ❌ Missing: ${#MISSING[@]} files"
echo ""

if [ ${#MISSING[@]} -eq 0 ]; then
  echo "✅ All required files present!"
  echo ""
  echo "📦 Total compiled files:"
  find out/ -name "*.js" | wc -l | xargs echo "  "
  echo ""
  echo "🎉 Build verification PASSED"
  exit 0
else
  echo "❌ Missing required files:"
  printf '  - %s\n' "${MISSING[@]}"
  echo ""
  echo "💡 Run: npm run compile"
  echo ""
  echo "🚨 Build verification FAILED"
  exit 1
fi

#!/bin/bash
# Extract hardcoded text for i18n conversion

echo "=== HARDCODED TEXT EXTRACTION REPORT ==="
echo "Generated: $(date)"
echo "Branch: $(git branch --show-current)"
echo

cd dashboard

echo "1. DASHBOARD COMPONENT STRINGS:"
echo "================================"
grep -rn "title=\"[^\"]*\"\|subtitle=\"[^\"]*\"" src/components/dashboard/ --include="*.tsx" | head -20

echo -e "\n2. JSX TEXT CONTENT:"
echo "===================="
grep -rn ">[A-Z][a-zA-Z ]*<" src/components/dashboard/ --include="*.tsx" | head -20

echo -e "\n3. BUTTON TEXT:"
echo "==============="
grep -rn "<[Bb]utton[^>]*>[A-Z][^<]*<" src/ --include="*.tsx" | head -15

echo -e "\n4. PLACEHOLDER TEXT:"  
echo "==================="
grep -rn "placeholder=\"[^\"]*\"" src/ --include="*.tsx" | head -15

echo -e "\n5. ARIA LABELS:"
echo "==============="
grep -rn "aria-label=\"[^\"]*\"" src/ --include="*.tsx" | head -15

echo -e "\n6. COMPONENTS WITHOUT useTranslation:"
echo "====================================="
find src/components -name "*.tsx" -exec grep -L "useTranslation" {} \; | grep -v "/ui/" | head -15

echo -e "\n7. FORM LABELS:"
echo "==============="
grep -rn "<[Ll]abel[^>]*>[A-Z][^<]*<" src/ --include="*.tsx" | head -10

echo -e "\n=== EXTRACTION COMPLETE ==="
echo "Next steps:"
echo "1. Update locales/en.json with extracted strings"  
echo "2. Replace hardcoded text with t('key') calls"
echo "3. Run 'bun run i18n' to generate translations"
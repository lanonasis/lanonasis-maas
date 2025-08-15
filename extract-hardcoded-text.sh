#!/bin/bash
# Extract hardcoded text for i18n conversion - Enhanced with improved regex patterns

echo "=== HARDCODED TEXT EXTRACTION REPORT ==="
echo "Generated: $(date)"
echo "Branch: $(git branch --show-current)"
echo

cd dashboard

echo "1. COMPONENT PROP STRINGS (title, subtitle, description):"
echo "========================================================="
grep -rn -E "(title|subtitle|description|label)=\"[^\"t(][^\"]*\"" src/components/ --include="*.tsx" | grep -v "t(" | head -20

echo -e "\n2. JSX TEXT CONTENT (improved pattern):"
echo "======================================="
grep -rn -E ">[[:space:]]*[A-Z][a-zA-Z0-9 .,!?:-]+[[:space:]]*<" src/components/ --include="*.tsx" | grep -v "t(" | head -20

echo -e "\n3. BUTTON AND LINK TEXT:"
echo "========================"
grep -rn -E "<(Button|button|Link|link|a)[^>]*>[[:space:]]*[A-Z][^<]+[[:space:]]*<" src/ --include="*.tsx" | grep -v "t(" | head -15

echo -e "\n4. PLACEHOLDER AND INPUT ATTRIBUTES:"
echo "===================================="
grep -rn -E "(placeholder|alt|title)=\"[^\"t(][^\"]*\"" src/ --include="*.tsx" | grep -v "t(" | head -15

echo -e "\n5. ARIA LABELS AND ACCESSIBILITY:"
echo "================================="
grep -rn -E "(aria-label|aria-labelledby|aria-describedby)=\"[^\"t(][^\"]*\"" src/ --include="*.tsx" | grep -v "t(" | head -15

echo -e "\n6. HARDCODED STRINGS IN OBJECTS/ARRAYS:"
echo "======================================="
grep -rn -E "(name|label|text|title|message):[[:space:]]*['\"][A-Z][^'\"t(]*['\"]" src/ --include="*.tsx" | grep -v "t(" | head -15

echo -e "\n7. TOAST AND NOTIFICATION MESSAGES:"
echo "==================================="
grep -rn -E "(toast|notification|alert|message)[^}]*['\"][A-Z][^'\"]*['\"]" src/ --include="*.tsx" | grep -v "t(" | head -10

echo -e "\n8. FORM VALIDATION MESSAGES:"
echo "============================"
grep -rn -E "(error|validation|required)[^}]*['\"][A-Z][^'\"]*['\"]" src/ --include="*.tsx" | grep -v "t(" | head -10

echo -e "\n9. COMPONENTS WITHOUT useTranslation:"
echo "====================================="
find src/components -name "*.tsx" -exec grep -L "useTranslation" {} \; | grep -v "/ui/" | head -15

echo -e "\n10. CONSOLE LOG MESSAGES (for debugging):"
echo "========================================="
grep -rn -E "console\.(log|warn|error)\([^)]*['\"][A-Z][^'\"]*['\"]" src/ --include="*.tsx" | head -10

echo -e "\n=== EXTRACTION COMPLETE ==="
echo "RECOMMENDED ACTIONS:"
echo "1. Review extracted strings above for i18n conversion"
echo "2. Update locales/en.json with new translation keys"  
echo "3. Replace hardcoded text with t('namespace.key') calls"
echo "4. Add useTranslation() hook to components without it"
echo "5. Test with different locales to verify translations"
echo "6. Run 'bun run i18n' to generate missing translations"
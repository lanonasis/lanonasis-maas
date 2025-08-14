# CLI-Based Translation Workflow (No Live API Keys)

## Overview
This workflow allows one-time translation generation via CLI without storing API keys in the project.

## Phase 1: Setup CLI Authentication (One-Time)
```bash
# Install Lingo.dev CLI globally (one-time setup)
npm install -g @lingo.dev/cli

# Authenticate once (stores token locally, not in project)
lingo.dev login

# Verify authentication
lingo.dev whoami
```

## Phase 2: Translation Generation Workflow

### Step 1: Update Source Language (en.json)
```bash
# Add all new translation keys to dashboard/locales/en.json
# Keys should follow the structure we created
```

### Step 2: Generate Translations
```bash
cd dashboard/

# Generate all missing translations at once
bun run i18n

# Or generate specific languages
bun run i18n --target es,fr,de

# Review generated translations
ls locales/
```

### Step 3: Review & Commit
```bash
# Review generated files
git diff locales/

# Commit translations
git add locales/
git commit -m "feat: generate translations for new i18n keys"
```

## Phase 3: Component Conversion Pattern

### Before (Hardcoded):
```tsx
export const MyComponent = () => {
  return (
    <div>
      <h1>API Dashboard</h1>
      <p>Manage and integrate with our suite of API services.</p>
      <Button>Save Changes</Button>
    </div>
  );
};
```

### After (Translatable):
```tsx
import { useTranslation } from 'react-i18next';

export const MyComponent = () => {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t('dashboard.title')}</h1>
      <p>{t('dashboard.subtitle')}</p>
      <Button>{t('common.buttons.save')}</Button>
    </div>
  );
};
```

## Phase 4: Quality Assurance

### Test Script:
```bash
#!/bin/bash
# test-translations.sh

echo "Testing translation completeness..."

# Check for missing keys
cd dashboard/
bun run i18n:check

# Test with different languages
echo "Testing Spanish..."
# Manually change language in browser and verify UI

echo "Testing German (longer text)..."
# Verify text doesn't overflow containers

echo "Testing Arabic (RTL)..."
# Verify RTL layout works correctly
```

## Phase 5: Future Project Template

### Project Setup Checklist:
- [ ] Install i18next dependencies
- [ ] Create i18n.ts configuration
- [ ] Create locales/ directory with en.json
- [ ] Add Lingo.dev i18n.json configuration
- [ ] Set up ESLint rules to prevent hardcoded text
- [ ] Add translation scripts to package.json
- [ ] Create component templates with useTranslation

### Pre-commit Hook (Prevent Hardcoded Text):
```bash
#!/bin/bash
# .git/hooks/pre-commit

echo "Checking for hardcoded text..."

# Find hardcoded strings in new commits
if git diff --cached --name-only | grep -E '\.(tsx|ts)$' | xargs grep -l ">[A-Z][a-zA-Z ]*<" 2>/dev/null; then
    echo "❌ Hardcoded text found! Please use translation keys."
    echo "Example: Replace 'Save Changes' with {t('common.buttons.saveChanges')}"
    exit 1
fi

echo "✅ No hardcoded text detected"
```

## CLI Commands Summary

```bash
# One-time authentication
lingo.dev login

# Generate all translations
cd dashboard/ && bun run i18n

# Generate specific languages
bun run i18n --target es,fr,de

# Check translation coverage
bun run i18n:coverage

# Validate translation files
bun run i18n:validate

# Extract translatable text (custom script)
./extract-hardcoded-text.sh
```

## Benefits of CLI-Only Approach:
✅ No API keys stored in repository  
✅ Translations generated once and committed  
✅ Full control over when translations update  
✅ No runtime API calls or dependencies  
✅ Works offline after initial generation  
✅ Perfect for enterprise/security-conscious projects  

## Complete Implementation Strategy:

1. **Current Branch (multi-lingual)**: Convert 3-5 critical components
2. **Generate translations**: Use CLI to create all language files
3. **Test thoroughly**: Verify UI works with different languages
4. **Merge to main**: Once stable and tested
5. **Apply to future projects**: Use as template/reference

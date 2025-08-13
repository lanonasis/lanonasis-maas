# I18n Conversion Strategy & Best Practices

## Overview
This document provides a systematic approach to convert hardcoded text to translatable formats and prevent future i18n debt.

## Phase 1: Discovery & Analysis

### 1.1 Text Pattern Detection
```bash
# Find hardcoded strings in React components
grep -r "\"[A-Z][a-zA-Z ]*\"" src/ --include="*.tsx" --include="*.ts"

# Find title/label attributes
grep -r "title=\"\|placeholder=\"\|aria-label=\"" src/ --include="*.tsx"

# Find button/link text
grep -r ">\s*[A-Z][a-zA-Z ]*\s*<" src/ --include="*.tsx"
```

### 1.2 Current State Assessment
- ✅ i18next infrastructure configured
- ✅ 11 target languages configured
- ✅ Lingo.dev integration setup
- ❌ Only LanguageSwitcher uses translations
- ❌ 98% of UI text is hardcoded

## Phase 2: Systematic Conversion Process

### 2.1 Key Extraction Strategy

#### A. Create Translation Key Structure
```json
{
  "common": {
    "buttons": {
      "save": "Save",
      "cancel": "Cancel",
      "submit": "Submit",
      "delete": "Delete",
      "edit": "Edit"
    },
    "labels": {
      "name": "Name",
      "email": "Email",
      "password": "Password"
    },
    "messages": {
      "loading": "Loading...",
      "error": "An error occurred",
      "success": "Operation completed successfully"
    }
  },
  "dashboard": {
    "title": "API Dashboard",
    "subtitle": "Manage and integrate with our suite of API services",
    "welcome": "Welcome, {{name}}"
  },
  "api": {
    "banking": {
      "title": "Bank Statements",
      "insights": {
        "title": "Financial Insights Engine",
        "subtitle": "Advanced analytics for financial data"
      }
    }
  }
}
```

#### B. Conversion Patterns
```tsx
// Before (hardcoded)
<h2>API Dashboard</h2>
<p>Manage and integrate with our suite of API services.</p>

// After (translatable)
import { useTranslation } from 'react-i18next';

const { t } = useTranslation();
<h2>{t('dashboard.title')}</h2>
<p>{t('dashboard.subtitle')}</p>
```

### 2.2 Component-by-Component Conversion

#### Priority Order:
1. **High-visibility components** (Dashboard, Headers, Navigation)
2. **User interaction components** (Forms, Buttons, Modals)
3. **Content components** (Cards, Lists, Tables)
4. **Utility components** (Tooltips, Placeholders, Error messages)

### 2.3 Automated Detection Script

```bash
#!/bin/bash
# find-hardcoded-text.sh

echo "=== HARDCODED TEXT AUDIT ==="

echo -e "\n1. String literals in JSX:"
grep -rn ">[A-Z][a-zA-Z ]*<" src/ --include="*.tsx" | head -20

echo -e "\n2. Title/aria-label attributes:"
grep -rn "title=\"[^\"]*\"\|aria-label=\"[^\"]*\"" src/ --include="*.tsx" | head -20

echo -e "\n3. Placeholder text:"
grep -rn "placeholder=\"[^\"]*\"" src/ --include="*.tsx" | head -20

echo -e "\n4. Components missing useTranslation:"
find src/ -name "*.tsx" -exec grep -L "useTranslation" {} \; | head -20
```

## Phase 3: Implementation Guidelines

### 3.1 Component Template Pattern

```tsx
import React from 'react';
import { useTranslation } from 'react-i18next';

export const MyComponent: React.FC = () => {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t('component.title')}</h1>
      <p>{t('component.description')}</p>
      <button aria-label={t('component.buttonLabel')}>
        {t('common.buttons.save')}
      </button>
    </div>
  );
};
```

### 3.2 Complex Content Handling

```tsx
// Dynamic content with interpolation
<p>{t('dashboard.welcome', { name: profile?.full_name })}</p>

// Rich text with components
<Trans 
  i18nKey="terms.agreement"
  components={{
    link: <Link to="/terms" className="underline" />
  }}
/>

// Pluralization
<p>{t('items.count', { count: items.length })}</p>
```

## Phase 4: Future-Proofing Strategies

### 4.1 Development Guidelines

#### **RULE 1: No Hardcoded Text Policy**
```tsx
// ❌ NEVER do this
<button>Save Changes</button>

// ✅ ALWAYS do this  
<button>{t('common.buttons.saveChanges')}</button>
```

#### **RULE 2: Component Creation Checklist**
- [ ] Import useTranslation hook
- [ ] Replace all visible text with t() calls
- [ ] Add translation keys to locales/en.json
- [ ] Test with different languages
- [ ] Handle text expansion (German/French are ~30% longer)

#### **RULE 3: Code Review Standards**
```bash
# Pre-commit hook to detect hardcoded text
grep -r ">[A-Z][a-zA-Z ]*<" src/ --include="*.tsx" && exit 1
grep -r "\"[A-Z][a-zA-Z ]*\"" src/ --include="*.tsx" | grep -v "useTranslation" && exit 1
```

### 4.2 ESLint Rules for I18n Enforcement

```json
// .eslintrc.js
{
  "rules": {
    "react/jsx-no-literals": ["error", {
      "noStrings": true,
      "allowedStrings": ["className", "key", "id"],
      "ignoreProps": false
    }],
    "@typescript-eslint/prefer-string-starts-ends-with": "error"
  }
}
```

### 4.3 Automated Translation Workflow

```yaml
# .github/workflows/i18n.yml
name: I18n Updates
on:
  push:
    paths:
      - 'src/**/*.tsx'
      - 'locales/en.json'

jobs:
  update-translations:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Extract new keys
        run: npm run i18n:extract
      - name: Generate translations
        run: npx lingo.dev@latest i18n
      - name: Create PR for new translations
        run: gh pr create --title "feat: update translations"
```

## Phase 5: Migration Plan for Current Project

### 5.1 Immediate Actions (Branch: multi-lingual)

1. **Update en.json with comprehensive keys**
2. **Convert 5 high-priority components first**:
   - ApiDashboard.tsx
   - Header.tsx
   - AuthForm.tsx
   - ApiKeyManager.tsx
   - UserProfile.tsx

3. **Test multilingual functionality**
4. **Run Lingo.dev generation**

### 5.2 Quality Assurance

#### Testing Checklist:
- [ ] All text displays correctly in English
- [ ] Language switcher works
- [ ] Text expands gracefully (test with German)
- [ ] RTL languages display properly (Arabic)
- [ ] No console errors for missing keys
- [ ] Pluralization works correctly

## Phase 6: Best Practices for Future Projects

### 6.1 Project Setup Template

```bash
# i18n-setup.sh - Run this for every new project
npm install i18next react-i18next i18next-browser-languagedetector
mkdir src/locales
touch src/locales/en.json
touch src/i18n.ts
touch i18n.json
echo "✅ I18n infrastructure ready"
```

### 6.2 Component Generator Template

```bash
# generate-component.sh
COMPONENT_NAME=$1
cat > src/components/${COMPONENT_NAME}.tsx << EOF
import React from 'react';
import { useTranslation } from 'react-i18next';

export const ${COMPONENT_NAME}: React.FC = () => {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t('${COMPONENT_NAME,,}.title')}</h1>
    </div>
  );
};
EOF
```

### 6.3 Translation Key Naming Convention

```
Format: [domain].[category].[specific]

Examples:
- common.buttons.save
- dashboard.api.title  
- forms.validation.required
- errors.network.timeout
- banking.statements.insights.title
```

## Conclusion

This strategy provides:
1. **Immediate solution** for current project
2. **Preventive measures** for future i18n debt
3. **Automated tooling** to enforce best practices
4. **Quality assurance** processes

**Next Step:** Begin Phase 1 implementation on the `multi-lingual` branch.
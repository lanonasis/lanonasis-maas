#!/usr/bin/env node

/**
 * Simple translation validator for standalone projects
 */

const fs = require('fs');
const path = require('path');

const languages = ['es', 'fr', 'de', 'ja', 'zh', 'pt', 'ar'];
const localesDir = path.join(__dirname, '..', 'locales');

// Check if source file exists
const sourceFile = path.join(localesDir, 'en.json');
if (!fs.existsSync(sourceFile)) {
  console.error('❌ Missing source file: locales/en.json');
  process.exit(1);
}

const sourceData = JSON.parse(fs.readFileSync(sourceFile, 'utf8'));
const sourceKeys = Object.keys(JSON.parse(JSON.stringify(sourceData, null, 2).replace(/\{[^}]+\}/g, '')));

let hasErrors = false;

for (const lang of languages) {
  const targetFile = path.join(localesDir, `${lang}.json`);
  
  if (!fs.existsSync(targetFile)) {
    console.warn(`⚠️  Missing translation: locales/${lang}.json`);
    continue;
  }
  
  try {
    const targetData = JSON.parse(fs.readFileSync(targetFile, 'utf8'));
    console.log(`✅ Valid JSON: ${lang}.json`);
  } catch (error) {
    console.error(`❌ Invalid JSON in ${lang}.json: ${error.message}`);
    hasErrors = true;
  }
}

if (hasErrors) {
  process.exit(1);
} else {
  console.log('\n✅ All translations are valid!');
}

# 🚧 VIBE-MEMORY DEVELOPMENT WORKSPACE 🚧

## ⚠️ IMPORTANT: This is a DEVELOPMENT/PROTOTYPE workspace

**DO NOT PUBLISH PACKAGES FROM THIS DIRECTORY**

This workspace is used for:
- 🧪 Prototyping new features
- 🔬 Testing experimental code
- 🛠️ Development before production migration

## 📦 Official Publishing

All npm packages should be published from the **lanonasis-maas** repository:
- Repository: `/Users/seyederick/DevOps/_project_folders/lanonasis-maas`
- Packages: `@lanonasis/cli`, `@lanonasis/memory-client`, `@lanonasis/sdk`
- Extensions: Published to respective marketplaces from production repo

## 🔄 Development Workflow

1. **Develop** features in this workspace
2. **Test** thoroughly with dev versions
3. **Migrate** code to lanonasis-maas
4. **Publish** from production repository

## 🛡️ Safety Measures

All packages in this workspace have:
- ✅ `"private": true` to prevent accidental publishing
- ✅ Version suffix `-dev` to indicate development
- ✅ Prepublish scripts that block publishing
- ✅ Clear [DEVELOPMENT] tags in descriptions

## 📝 Quick Commands

```bash
# Development work
npm run dev
npm test

# When ready to migrate to production
cd ../lanonasis-maas
# Copy tested code and publish from there
```

## 🚨 Publishing Checklist

Before publishing any package:
1. ❌ NOT from vibe-memory
2. ✅ Switch to lanonasis-maas  
3. ✅ Remove `-dev` version suffix
4. ✅ Remove `"private": true`
5. ✅ Run full test suite
6. ✅ Update changelog
7. ✅ Publish with proper version

Remember: **vibe-memory = development only!**
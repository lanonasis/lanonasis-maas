# Publishing Guide for @lanonasis/memory-client

## Package Information

- **Name**: @lanonasis/memory-client
- **Version**: 1.0.0
- **Registry**: npm (public)
- **License**: MIT

## Pre-publication Checklist

✅ **Build & Testing**
- [x] TypeScript compilation successful
- [x] ESLint passes with no errors
- [x] Package builds correctly (CJS + ESM)
- [x] Example runs successfully
- [x] Type definitions generated

✅ **Documentation**
- [x] README.md comprehensive
- [x] CHANGELOG.md created
- [x] LICENSE file included
- [x] API documentation complete

✅ **Package Configuration**
- [x] package.json properly configured
- [x] Files array includes only necessary files
- [x] Exports field configured for dual builds
- [x] Keywords for discoverability
- [x] Repository and homepage URLs

## Publishing Steps

### 1. Final Verification

```bash
npm run build
npm run type-check
npm run lint
```

### 2. Test Package Locally

```bash
# Test the built package
node example.js

# Pack to verify contents
npm pack
```

### 3. Publish to npm

```bash
# Login to npm (if not already logged in)
npm login

# Publish the package
npm publish

# Verify publication
npm info @lanonasis/memory-client
```

### 4. Post-publication

- [ ] Update documentation with installation instructions
- [ ] Create GitHub release
- [ ] Update dependent projects
- [ ] Announce release

## Package Contents

The published package includes:
- `dist/` - Built JavaScript and TypeScript definitions
- `README.md` - Documentation
- `LICENSE` - MIT license
- `CHANGELOG.md` - Version history

## Version Management

This package follows semantic versioning:
- **MAJOR**: Breaking changes to API
- **MINOR**: New features, backward compatible
- **PATCH**: Bug fixes, backward compatible

## Registry Information

- **Registry**: https://registry.npmjs.org/
- **Access**: Public
- **Scoped**: @lanonasis/memory-client

## Installation for Users

After publication, users can install with:

```bash
npm install @lanonasis/memory-client
yarn add @lanonasis/memory-client
pnpm add @lanonasis/memory-client
```

## Usage Verification

Basic usage test:
```javascript
import { createMemoryClient } from '@lanonasis/memory-client';

const client = createMemoryClient({
  apiUrl: 'https://api.lanonasis.com',
  apiKey: 'your-api-key'
});
```
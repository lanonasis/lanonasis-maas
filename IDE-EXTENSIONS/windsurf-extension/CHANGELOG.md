# Changelog

All notable changes to the Lanonasis Memory Assistant for Windsurf extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.4] - 2025-11-05

### Fixed
- 🐛 Added missing `isAuthenticated()` method to EnhancedMemoryService
- 🔧 Fixed extension activation errors in Windsurf

### Maintenance
- 🔄 Version alignment across all IDE extensions (VSCode, Cursor, Windsurf)
- 📦 Package manager standardization fixes
- 🐛 Consistency improvements for marketplace releases

## [1.4.0] - 2025-11-02

### Security
- 🔐 Fixed OAuth timeout race condition (Issue #45)
- 🔐 Added proper timeout tracking to prevent double-rejection
- 🔐 Implemented clearTimeout on all authentication exit paths
- 🔐 Maintained backward-compatible legacy API key fallback

### Fixed
- 🐛 Fixed client ID from 'cursor-extension' to 'windsurf-extension'
- 🐛 Fixed TypeScript compilation errors
- 🐛 Added missing EnhancedMemoryService and IMemoryService modules
- 🐛 Standardized package manager to npm (removed bun.lock)

### Technical
- ♻️ Aligned authentication patterns with VSCode and Cursor extensions
- 📝 Updated type definitions for IMemoryService interface
- ⚡ Improved error handling in OAuth flows

## [1.0.0] - 2025-10-27

### Initial Release
- 🎉 Windsurf IDE integration
- 🔐 OAuth2 authentication with PKCE
- 📝 Memory management tools
- 🔍 Semantic search capabilities

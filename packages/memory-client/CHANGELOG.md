# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.0] - 2026-01-16

### Added

- **Comprehensive Test Suite**:
  - Added Vitest configuration with v8 coverage
  - 107 unit tests across utils, errors, and types
  - 99%+ code coverage on core utilities
  - ESLint configuration for test files

### Fixed

- **Build Configuration**:
  - Fixed `composite: true` conflict with Rollup's declaration handling
  - Added `inlineDynamicImports` to handle dynamic Node.js imports
  - ESLint now properly handles test files with separate config block

## [2.0.0] - 2026-01-15

### Added

- **Universal SDK Architecture** - "Drop In and Sleep" design
  - Works in Browser, Node.js, React, Vue, and Edge Functions
  - Environment auto-detection with optimal defaults
  - Separate entry points for each platform

- **Intelligence Features (v2.0 Schema)**:
  - Content chunking strategies (semantic, fixed-size, paragraph, sentence, code-block)
  - Memory intelligence extraction (entities, keywords, sentiment, complexity)
  - Enhanced search with vector, text, and hybrid modes
  - Analytics (search analytics, access patterns, extended stats)

- **New Entry Points**:
  - `@lanonasis/memory-client/core` - Lightweight browser-safe client
  - `@lanonasis/memory-client/node` - Node.js with CLI/MCP integration
  - `@lanonasis/memory-client/react` - React hooks and provider
  - `@lanonasis/memory-client/vue` - Vue composables and plugin
  - `@lanonasis/memory-client/presets` - Configuration presets

- **New Client Methods**:
  - `createMemoryWithPreprocessing()` - Create with chunking/intelligence
  - `updateMemoryWithPreprocessing()` - Update with preprocessing
  - `enhancedSearch()` - Advanced search with filters and modes
  - `getSearchAnalytics()` - Search usage analytics
  - `getAccessPatterns()` - Memory access patterns
  - `getExtendedStats()` - Extended user statistics
  - `getTopicWithMemories()` - Topic with related memories
  - `getTopicsHierarchy()` - Full topic tree

- **Zod Validation Schemas**:
  - `createMemorySchema`, `updateMemorySchema`, `searchMemorySchema`
  - `createTopicSchema`, `enhancedSearchSchema`, `analyticsDateRangeSchema`
  - `preprocessingOptionsSchema`

- **Error Handling**:
  - Type-safe error classes with discriminated unions
  - `hasError()` and `hasData()` type guards
  - Retry logic with exponential/linear backoff

### Changed

- Upgraded from single-bundle to multi-bundle architecture
- Zod upgraded to v4.x for improved performance
- Better tree-shaking with separate entry points

### Migration Guide

See the migration section in `src/index.ts` for upgrading from v1.x.

## [1.0.0] - 2025-07-30

### Added

- **Initial Release** - Memory as a Service (MaaS) Client SDK
- **Core Features**:
  - Full TypeScript support with comprehensive type definitions
  - Memory CRUD operations (create, read, update, delete)
  - Semantic search with similarity scoring
  - Topic management for memory organization
  - User statistics and analytics
  - Bulk operations for enterprise use

- **Authentication**:
  - API key authentication
  - Bearer token authentication
  - Runtime authentication updates

- **Configuration**:
  - Gateway mode for enhanced performance (default)
  - Direct API mode for debugging
  - Environment-specific configurations
  - Custom headers support
  - Configurable timeouts

- **Memory Types**:
  - `context` - General contextual information
  - `project` - Project-specific knowledge
  - `knowledge` - Educational or reference material
  - `reference` - Quick reference information
  - `personal` - User-specific private memories
  - `workflow` - Process and procedure documentation

- **Build System**:
  - ES Module and CommonJS builds
  - TypeScript declaration files
  - Source maps for debugging
  - Tree-shakable exports

- **Quality Assurance**:
  - ESLint configuration
  - TypeScript strict mode
  - Comprehensive type safety
  - Clean build process

### Documentation

- Comprehensive README with examples
- Full API documentation
- TypeScript type definitions
- Usage examples for Node.js and browsers

### Developer Experience

- Universal compatibility (Node.js 16+, modern browsers)
- Environment detection utilities
- Developer-friendly error messages
- Configurable request/response handling

## Upcoming Features

- Integration tests with HTTP mocking
- WebSocket real-time subscriptions
- Offline-first with sync queue
- React Native support
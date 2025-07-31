# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

- React hooks for easier integration
- Utility functions for common patterns
- Extended error handling
- Performance optimizations
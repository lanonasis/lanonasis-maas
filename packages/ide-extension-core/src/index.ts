/**
 * @lanonasis/ide-extension-core
 * 
 * Shared core library for Lanonasis IDE extensions
 * Provides type-safe, platform-agnostic abstractions for:
 * - Memory management
 * - Secure authentication
 * - IDE integration
 * - Configuration management
 */

// Export all types
export * from './types';

// Export adapters
export * from './adapters/IIDEAdapter';
export { VSCodeAdapter, createVSCodeAdapter } from './adapters/VSCodeAdapter';

// Export services
export { SecureApiKeyService } from './services/SecureApiKeyService';

// Export utilities
export * from './utils/crypto';

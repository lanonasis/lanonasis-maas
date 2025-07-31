/**
 * @lanonasis/memory-client
 * 
 * Memory as a Service (MaaS) Client SDK for Lanonasis
 * Intelligent memory management with semantic search capabilities
 */

// Main client
export { MemoryClient, createMemoryClient } from './client';
export type { MemoryClientConfig, ApiResponse, PaginatedResponse } from './client';

// Types and schemas
export * from './types';

// Constants
export const VERSION = '1.0.0';
export const CLIENT_NAME = '@lanonasis/memory-client';

// Environment detection
export const isBrowser = typeof window !== 'undefined';
export const isNode = typeof globalThis !== 'undefined' && 'process' in globalThis && globalThis.process?.versions?.node;

// Default configurations for different environments
export const defaultConfigs = {
  development: {
    apiUrl: 'http://localhost:3001',
    timeout: 30000,
    useGateway: false
  },
  production: {
    apiUrl: 'https://api.lanonasis.com',
    timeout: 15000,
    useGateway: true
  },
  gateway: {
    apiUrl: 'https://api.lanonasis.com',
    timeout: 10000,
    useGateway: true
  }
} as const;

// Utility functions will be added in a future version to avoid circular imports
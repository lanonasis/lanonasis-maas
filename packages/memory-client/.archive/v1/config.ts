/**
 * Configuration utilities for Memory Client SDK
 * Provides smart defaults and environment detection for CLI/MCP integration
 */

import type { EnhancedMemoryClientConfig } from './enhanced-client';
import { MemoryClientConfig } from './client';

export interface SmartConfigOptions {
  /** Prefer CLI integration when available (default: true in Node.js environments) */
  preferCLI?: boolean;
  
  /** Minimum CLI version required for Golden Contract compliance (default: 1.5.2) */
  minCLIVersion?: string;
  
  /** Enable MCP channel detection (default: true) */
  enableMCP?: boolean;
  
  /** API fallback configuration */
  apiConfig?: Partial<MemoryClientConfig>;
  
  /** Timeout for CLI detection in milliseconds (default: 3000) */
  cliDetectionTimeout?: number;
  
  /** Enable verbose logging for troubleshooting (default: false) */
  verbose?: boolean;
}

/**
 * Environment detection utilities
 */
export const Environment = {
  isNode: typeof globalThis !== 'undefined' && 'process' in globalThis && globalThis.process?.versions?.node,
  isBrowser: typeof window !== 'undefined',
  isVSCode: typeof globalThis !== 'undefined' && 'vscode' in globalThis,
  isCursor: typeof globalThis !== 'undefined' && 'cursor' in globalThis,
  isWindsurf: typeof globalThis !== 'undefined' && 'windsurf' in globalThis,
  
  get isIDE() {
    return this.isVSCode || this.isCursor || this.isWindsurf;
  },
  
  get supportsCLI(): boolean {
    return Boolean(this.isNode && !this.isBrowser);
  }
};

/**
 * Create smart configuration with environment-aware defaults
 */
export function createSmartConfig(
  baseConfig: Partial<MemoryClientConfig>,
  options: SmartConfigOptions = {}
): EnhancedMemoryClientConfig {
  const defaults: SmartConfigOptions = {
    preferCLI: Environment.supportsCLI,
    minCLIVersion: '1.5.2',
    enableMCP: true,
    cliDetectionTimeout: 3000,
    verbose: false
  };
  
  const config = { ...defaults, ...options };
  const preferCLI = config.preferCLI ?? defaults.preferCLI ?? false;
  const minCLIVersion = config.minCLIVersion ?? defaults.minCLIVersion ?? '1.5.2';
  const enableMCP = config.enableMCP ?? defaults.enableMCP ?? true;
  const cliDetectionTimeout = config.cliDetectionTimeout ?? defaults.cliDetectionTimeout ?? 3000;
  const verbose = config.verbose ?? defaults.verbose ?? false;
  
  return {
    ...baseConfig,
    preferCLI,
    minCLIVersion,
    enableMCP,
    cliDetectionTimeout,
    verbose,
    
    // Smart API configuration with environment detection
    apiUrl: baseConfig.apiUrl || (
      process?.env?.NODE_ENV === 'development' 
        ? 'http://localhost:3001'
        : 'https://api.lanonasis.com'
    ),
    
    // Default timeout based on environment
    timeout: baseConfig.timeout || (Environment.isIDE ? 10000 : 15000)
  };
}

/**
 * Preset configurations for common scenarios
 */
export const ConfigPresets = {
  /**
   * Development configuration with local API and CLI preference
   */
  development: (apiKey?: string): EnhancedMemoryClientConfig => createSmartConfig({
    apiUrl: 'http://localhost:3001',
    apiKey,
    timeout: 30000
  }, {
    preferCLI: true,
    verbose: true
  }),
  
  /**
   * Production configuration optimized for performance
   */
  production: (apiKey?: string): EnhancedMemoryClientConfig => createSmartConfig({
    apiUrl: 'https://api.lanonasis.com',
    apiKey,
    timeout: 15000
  }, {
    preferCLI: Environment.supportsCLI,
    verbose: false
  }),
  
  /**
   * IDE extension configuration with MCP prioritization
   */
  ideExtension: (apiKey?: string): EnhancedMemoryClientConfig => createSmartConfig({
    apiUrl: 'https://api.lanonasis.com',
    apiKey,
    timeout: 10000
  }, {
    preferCLI: true,
    enableMCP: true,
    cliDetectionTimeout: 2000
  }),
  
  /**
   * Browser-only configuration (no CLI support)
   */
  browserOnly: (apiKey?: string): EnhancedMemoryClientConfig => createSmartConfig({
    apiUrl: 'https://api.lanonasis.com',
    apiKey,
    timeout: 15000
  }, {
    preferCLI: false,
    enableMCP: false
  }),
  
  /**
   * CLI-first configuration for server environments
   */
  serverCLI: (apiKey?: string): EnhancedMemoryClientConfig => createSmartConfig({
    apiUrl: 'https://api.lanonasis.com',
    apiKey,
    timeout: 20000
  }, {
    preferCLI: true,
    enableMCP: true,
    verbose: false
  })
};

/**
 * Migration helper for existing MemoryClient users
 */
export function migrateToEnhanced(
  existingConfig: MemoryClientConfig,
  enhancementOptions: SmartConfigOptions = {}
): EnhancedMemoryClientConfig {
  return createSmartConfig(existingConfig, {
    preferCLI: Environment.supportsCLI,
    ...enhancementOptions
  });
}

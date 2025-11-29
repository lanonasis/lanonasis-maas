/**
 * @lanonasis/memory-client/presets
 *
 * Ready-to-use configuration presets for different environments
 */

import type { CoreMemoryClientConfig } from '../core/client';

/**
 * Browser preset - Optimized for web applications
 *
 * @example
 * ```ts
 * import { createMemoryClient } from '@lanonasis/memory-client/core';
 * import { browserPreset } from '@lanonasis/memory-client/presets';
 *
 * const client = createMemoryClient(browserPreset({
 *   apiKey: 'your-key-here'
 * }));
 * ```
 */
export function browserPreset(config: Partial<CoreMemoryClientConfig> = {}): CoreMemoryClientConfig {
  return {
    apiUrl: 'https://api.lanonasis.com',
    timeout: 15000, // Lower timeout for better UX
    headers: {
      'X-Client-Type': 'browser',
    },
    ...config
  };
}

/**
 * Node.js preset - Optimized for server-side applications
 *
 * @example
 * ```ts
 * import { createNodeMemoryClient } from '@lanonasis/memory-client/node';
 * import { nodePreset } from '@lanonasis/memory-client/presets';
 *
 * const client = await createNodeMemoryClient(nodePreset({
 *   apiKey: process.env.LANONASIS_KEY
 * }));
 * ```
 */
export function nodePreset(config: Partial<CoreMemoryClientConfig> = {}): CoreMemoryClientConfig {
  return {
    apiUrl: process.env.LANONASIS_API_URL || 'https://api.lanonasis.com',
    timeout: 30000, // Higher timeout for server
    headers: {
      'X-Client-Type': 'node',
    },
    ...config
  };
}

/**
 * Edge preset - Optimized for edge runtimes (Cloudflare Workers, Vercel Edge, etc.)
 *
 * @example
 * ```ts
 * import { createMemoryClient } from '@lanonasis/memory-client/core';
 * import { edgePreset } from '@lanonasis/memory-client/presets';
 *
 * export default {
 *   async fetch(request: Request, env: Env) {
 *     const client = createMemoryClient(edgePreset({
 *       apiKey: env.LANONASIS_KEY
 *     }));
 *     // ...
 *   }
 * };
 * ```
 */
export function edgePreset(config: Partial<CoreMemoryClientConfig> = {}): CoreMemoryClientConfig {
  return {
    apiUrl: 'https://api.lanonasis.com',
    timeout: 5000, // Very low timeout for edge
    headers: {
      'X-Client-Type': 'edge',
    },
    ...config
  };
}

/**
 * Development preset - Optimized for local development
 *
 * @example
 * ```ts
 * import { createMemoryClient } from '@lanonasis/memory-client/core';
 * import { developmentPreset } from '@lanonasis/memory-client/presets';
 *
 * const client = createMemoryClient(developmentPreset({
 *   apiKey: 'test-key'
 * }));
 * ```
 */
export function developmentPreset(config: Partial<CoreMemoryClientConfig> = {}): CoreMemoryClientConfig {
  return {
    apiUrl: 'http://localhost:3001',
    timeout: 30000,
    headers: {
      'X-Client-Type': 'development',
    },
    onError: (error) => {
      console.error('[Memory Client Error]:', error);
    },
    onRequest: (endpoint) => {
      console.log('[Memory Client Request]:', endpoint);
    },
    onResponse: (endpoint, duration) => {
      console.log(`[Memory Client Response]: ${endpoint} (${duration}ms)`);
    },
    ...config
  };
}

/**
 * Production preset - Optimized for production environments
 *
 * @example
 * ```ts
 * import { createMemoryClient } from '@lanonasis/memory-client/core';
 * import { productionPreset } from '@lanonasis/memory-client/presets';
 *
 * const client = createMemoryClient(productionPreset({
 *   apiKey: process.env.LANONASIS_KEY
 * }));
 * ```
 */
export function productionPreset(config: Partial<CoreMemoryClientConfig> = {}): CoreMemoryClientConfig {
  return {
    apiUrl: 'https://api.lanonasis.com',
    timeout: 15000,
    headers: {
      'X-Client-Type': 'production',
    },
    ...config
  };
}

/**
 * React Native preset - Optimized for React Native applications
 *
 * @example
 * ```ts
 * import { createMemoryClient } from '@lanonasis/memory-client/core';
 * import { reactNativePreset } from '@lanonasis/memory-client/presets';
 *
 * const client = createMemoryClient(reactNativePreset({
 *   apiKey: 'your-key-here'
 * }));
 * ```
 */
export function reactNativePreset(config: Partial<CoreMemoryClientConfig> = {}): CoreMemoryClientConfig {
  return {
    apiUrl: 'https://api.lanonasis.com',
    timeout: 20000, // Account for mobile network variability
    headers: {
      'X-Client-Type': 'react-native',
    },
    ...config
  };
}

/**
 * Testing preset - Optimized for testing environments
 *
 * @example
 * ```ts
 * import { createMemoryClient } from '@lanonasis/memory-client/core';
 * import { testingPreset } from '@lanonasis/memory-client/presets';
 *
 * const client = createMemoryClient(testingPreset({
 *   apiUrl: 'http://localhost:3001',
 *   apiKey: 'test-key'
 * }));
 * ```
 */
export function testingPreset(config: Partial<CoreMemoryClientConfig> = {}): CoreMemoryClientConfig {
  return {
    apiUrl: 'http://localhost:3001',
    timeout: 5000, // Quick timeout for tests
    headers: {
      'X-Client-Type': 'testing',
    },
    ...config
  };
}

/**
 * Auto-detect preset - Automatically selects the best preset based on environment
 *
 * @example
 * ```ts
 * import { createMemoryClient } from '@lanonasis/memory-client/core';
 * import { autoPreset } from '@lanonasis/memory-client/presets';
 *
 * const client = createMemoryClient(autoPreset({
 *   apiKey: 'your-key-here'
 * }));
 * ```
 */
export function autoPreset(config: Partial<CoreMemoryClientConfig> = {}): CoreMemoryClientConfig {
  // Detect environment
  const isBrowser = typeof window !== 'undefined';
  const isNode = typeof process !== 'undefined' && process.versions && process.versions.node;
  const isDevelopment = process?.env?.NODE_ENV === 'development';
  const isTest = process?.env?.NODE_ENV === 'test';

  // Select appropriate preset
  if (isTest) {
    return testingPreset(config);
  } else if (isDevelopment) {
    return developmentPreset(config);
  } else if (isBrowser) {
    return browserPreset(config);
  } else if (isNode) {
    return nodePreset(config);
  } else {
    // Assume edge runtime
    return edgePreset(config);
  }
}

/**
 * All available presets
 */
export const presets = {
  browser: browserPreset,
  node: nodePreset,
  edge: edgePreset,
  development: developmentPreset,
  production: productionPreset,
  reactNative: reactNativePreset,
  testing: testingPreset,
  auto: autoPreset
} as const;

/**
 * Preset names
 */
export type PresetName = keyof typeof presets;

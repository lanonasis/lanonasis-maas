/**
 * Vue Plugin for Memory Client
 *
 * Provides a Memory Client instance to all components via Vue's provide/inject
 */

import { type App, type InjectionKey, inject } from 'vue';
import { createMemoryClient, type CoreMemoryClient, type CoreMemoryClientConfig } from '../core/client';

export const MEMORY_CLIENT_KEY: InjectionKey<CoreMemoryClient> = Symbol('MemoryClient');

export interface MemoryPluginOptions extends CoreMemoryClientConfig {
  // Plugin-specific options can be added here
}

/**
 * Vue plugin for Memory Client
 *
 * @example
 * ```ts
 * import { createApp } from 'vue';
 * import { createMemoryPlugin } from '@lanonasis/memory-client/vue';
 * import App from './App.vue';
 *
 * const app = createApp(App);
 *
 * app.use(createMemoryPlugin({
 *   apiUrl: 'https://api.lanonasis.com',
 *   apiKey: import.meta.env.VITE_LANONASIS_KEY
 * }));
 *
 * app.mount('#app');
 * ```
 */
export function createMemoryPlugin(options: MemoryPluginOptions) {
  return {
    install(app: App) {
      const client = createMemoryClient(options);
      app.provide(MEMORY_CLIENT_KEY, client);
    }
  };
}

/**
 * Hook to access the Memory Client instance
 *
 * @throws Error if used without installing the plugin
 */
export function useMemoryClient(): CoreMemoryClient {
  const client = inject(MEMORY_CLIENT_KEY);

  if (!client) {
    throw new Error('Memory client not provided. Did you install the createMemoryPlugin?');
  }

  return client;
}

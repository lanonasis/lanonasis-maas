/**
 * Memory Client - Wrapper for @lanonasis/memory-client
 * This is a compatibility layer that re-exports or wraps the memory client
 */

import type { AxiosInstance } from 'axios';
import type { LanonasisClientConfig } from '../client/LanonasisClient.js';

// For now, create a minimal interface that matches expected usage
// In production, this should import from @lanonasis/memory-client
export class MemoryClient {
  private httpClient: AxiosInstance;
  private config: LanonasisClientConfig;

  constructor(httpClient: AxiosInstance, config: LanonasisClientConfig) {
    this.httpClient = httpClient;
    this.config = config;
  }

  // Placeholder methods - these should delegate to actual memory client
  async search(query: string, options?: any): Promise<any> {
    throw new Error('MemoryClient methods not yet implemented. Use @lanonasis/memory-client directly.');
  }

  async create(data: any): Promise<any> {
    throw new Error('MemoryClient methods not yet implemented. Use @lanonasis/memory-client directly.');
  }
}


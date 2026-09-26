import { describe, expect, it, vi } from 'vitest';

import { MaaSClientAdapter } from '../../src/local-memory/maas-adapter.js';

function createClient() {
  return {
    listMemories: vi.fn().mockResolvedValue({ data: { data: [] } }),
    searchMemories: vi.fn(),
    getMemory: vi.fn(),
    createMemory: vi.fn(),
    deleteMemory: vi.fn(),
  };
}

describe('MaaSClientAdapter.list', () => {
  it('forwards the cursor with the page size and type', async () => {
    const client = createClient();
    const adapter = new MaaSClientAdapter(client);
    await adapter.list({ cursor: 'next-page', limit: 7, type: 'reference' });
    expect(client.listMemories).toHaveBeenCalledWith({ cursor: 'next-page', limit: 7, type: 'reference' });
  });

  it('keeps the default page size when no cursor is supplied', async () => {
    const client = createClient();
    const adapter = new MaaSClientAdapter(client);
    expect(await adapter.list()).toEqual([]);
    expect(client.listMemories).toHaveBeenCalledWith({ limit: 50, cursor: undefined, type: undefined });
  });
});

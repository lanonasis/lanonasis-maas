import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryCommands } from '../src/commands/memory-commands';
import type { CommandContext } from '../src/config/types';

vi.mock('ora', () => ({
  default: () => ({
    start: () => ({
      succeed: () => {},
      fail: () => {},
    }),
  }),
}));

describe('MemoryCommands', () => {
  let commands: MemoryCommands;
  let context: CommandContext;

  beforeEach(() => {
    commands = new MemoryCommands();
    context = {
      mode: 'remote',
      aliases: new Map(),
      config: {
        apiUrl: 'http://localhost:3000',
        useMCP: false,
        historyFile: '/tmp/repl-history',
        maxHistorySize: 100,
      },
    };
  });

  it('passes search --type filter to memory_types', async () => {
    const mockClient = {
      searchMemories: vi.fn().mockResolvedValue({
        data: { results: [], total_results: 0, search_time_ms: 1 },
      }),
    };

    (commands as any).client = mockClient;
    await commands.search(['project', 'plan', '--type=project'], context);

    expect(mockClient.searchMemories).toHaveBeenCalledTimes(1);
    expect(mockClient.searchMemories).toHaveBeenCalledWith({
      query: 'project plan',
      memory_types: ['project'],
      status: 'active',
      limit: 20,
      threshold: 0.7,
    });
  });

  it('updates a memory with parsed update flags', async () => {
    const memoryId = '11111111-2222-3333-4444-555555555555';
    const mockClient = {
      updateMemory: vi.fn().mockResolvedValue({
        data: { id: memoryId, title: 'New Title', content: 'Updated body' },
      }),
    };

    (commands as any).client = mockClient;
    await commands.update(
      [
        memoryId,
        '--title=New Title',
        '--content=Updated body',
        '--type=knowledge',
        '--status=active',
        '--tags=alpha,beta',
      ],
      context
    );

    expect(mockClient.updateMemory).toHaveBeenCalledTimes(1);
    expect(mockClient.updateMemory).toHaveBeenCalledWith(memoryId, {
      title: 'New Title',
      content: 'Updated body',
      memory_type: 'knowledge',
      status: 'active',
      tags: ['alpha', 'beta'],
    });
  });

  it('supports positional content update when no --content is provided', async () => {
    const memoryId = '11111111-2222-3333-4444-555555555555';
    const mockClient = {
      updateMemory: vi.fn().mockResolvedValue({
        data: { id: memoryId, content: 'replace this content' },
      }),
    };

    (commands as any).client = mockClient;
    await commands.update([memoryId, 'replace', 'this', 'content'], context);

    expect(mockClient.updateMemory).toHaveBeenCalledWith(memoryId, {
      content: 'replace this content',
    });
  });
});

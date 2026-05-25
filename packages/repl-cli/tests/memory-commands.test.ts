import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryCommands } from '../src/commands/memory-commands';
import type { CommandContext } from '../src/config/types';

vi.mock('ora', () => ({
  default: () => ({
    start: () => ({
      succeed: () => {},
      fail: () => {},
      get text() { return ''; },
      set text(_value: string) {},
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

  it('converges event-tagged memories through profile synthesis', async () => {
    const memoriesByTag: Record<string, any[]> = {
      'event:decision': [{
        id: 'mem-decision',
        title: 'Use event ontology',
        content: 'We decided to use event tags as the convergence spine.',
        memory_type: 'project',
        status: 'active',
        access_count: 0,
        user_id: 'user-1',
        tags: ['event:decision'],
        created_at: '2026-05-24T10:00:00Z',
        updated_at: '2026-05-24T10:00:00Z',
      }],
      'event:frustration': [{
        id: 'mem-frustration',
        title: 'Thin wrappers are not enough',
        content: 'The implementation keeps collapsing into memory search.',
        memory_type: 'project',
        status: 'active',
        access_count: 0,
        user_id: 'user-1',
        tags: ['event:frustration'],
        created_at: '2026-05-24T11:00:00Z',
        updated_at: '2026-05-24T11:00:00Z',
      }],
      'event:insight': [{
        id: 'mem-insight',
        title: 'Convergence needs provenance',
        content: 'Insight connects event IDs to next actions.',
        memory_type: 'knowledge',
        status: 'active',
        access_count: 0,
        user_id: 'user-1',
        tags: ['event:insight', 'backfilled:true'],
        created_at: '2026-05-24T12:00:00Z',
        updated_at: '2026-05-24T12:00:00Z',
      }],
      'event:commitment': [{
        id: 'mem-commitment',
        title: 'Ship convergence v0 this sprint',
        content: 'I will land the converge command before the next review.',
        memory_type: 'project',
        status: 'active',
        access_count: 0,
        user_id: 'user-1',
        tags: ['event:commitment'],
        created_at: '2026-05-24T13:00:00Z',
        updated_at: '2026-05-24T13:00:00Z',
      }],
    };
    const mockClient = {
      listMemories: vi.fn().mockImplementation(async (options: { tags?: string[] }) => ({
        data: { data: memoriesByTag[options.tags?.[0] ?? ''] ?? [] },
      })),
      listInferredConclusions: vi.fn().mockResolvedValue({
        data: { conclusions: [{ conclusion_type: 'pattern', confidence: 0.82, content: 'The user values substance over wrappers.' }] },
      }),
      askProfile: vi.fn().mockResolvedValue({
        data: { answer: 'MIND: Build toward convergence.\nHEART: Thin wrappers drain trust.\nCONCIERGE: Cite mem-decision.', confidence: 0.9 },
      }),
    };

    (commands as any).client = mockClient;
    await commands.contextConverge(['--subject=subject-1', '--limit=20'], context);

    expect(mockClient.listMemories).toHaveBeenCalledWith(expect.objectContaining({
      tags: ['event:decision'],
      status: 'active',
      limit: 20,
    }));
    expect(mockClient.listInferredConclusions).toHaveBeenCalledWith({
      subject_id: 'subject-1',
      limit: 12,
    });
    expect(mockClient.askProfile).toHaveBeenCalledTimes(1);
    expect(mockClient.askProfile.mock.calls[0][0]).toBe('subject-1');
    expect(mockClient.askProfile.mock.calls[0][1]).toContain('mem-decision');
    expect(mockClient.askProfile.mock.calls[0][1]).toContain('MIND: Structural patterns');
    expect(context.lastResult).toMatchObject({
      subject_id: 'subject-1',
      event_count: 3,
      distribution: {
        decision: 1,
        frustration: 1,
        commitment: 1,
        insight: 0,
      },
    });
  });

  it('converge: short-circuits with low_signal=true when corpus has no event-tagged memories', async () => {
    const mockClient = {
      listMemories: vi.fn().mockResolvedValue({ data: { data: [] } }),
      listInferredConclusions: vi.fn(),
      askProfile: vi.fn(),
    };
    (commands as any).client = mockClient;

    await commands.contextConverge(['--subject=subject-empty'], context);

    expect(mockClient.askProfile).not.toHaveBeenCalled();
    expect(mockClient.listInferredConclusions).not.toHaveBeenCalled();
    expect(context.lastResult).toMatchObject({
      events: [],
      distribution: {},
      low_signal: true,
    });
  });

  it('converge: skips synthesis on a single event (below MIN_EVENTS_FOR_CONVERGENCE)', async () => {
    const singleEvent = {
      id: 'mem-only',
      title: 'Solo commitment',
      content: 'I will revisit this next session.',
      memory_type: 'project',
      status: 'active',
      access_count: 0,
      user_id: 'user-1',
      tags: ['event:commitment'],
      created_at: '2026-05-24T10:00:00Z',
      updated_at: '2026-05-24T10:00:00Z',
    };
    const mockClient = {
      listMemories: vi.fn().mockImplementation(async (opts: { tags?: string[] }) => ({
        data: { data: opts.tags?.[0] === 'event:commitment' ? [singleEvent] : [] },
      })),
      listInferredConclusions: vi.fn(),
      askProfile: vi.fn(),
    };
    (commands as any).client = mockClient;

    await commands.contextConverge(['--subject=subject-low'], context);

    // Critical: askProfile must NOT be called — the prompt template would
    // fabricate Mind/Heart/Concierge blocks from a single event.
    expect(mockClient.askProfile).not.toHaveBeenCalled();
    expect(mockClient.listInferredConclusions).not.toHaveBeenCalled();
    expect(context.lastResult).toMatchObject({
      subject_id: 'subject-low',
      event_count: 1,
      low_signal: true,
      event_ids: ['mem-only'],
    });
  });

  it('converge: skips synthesis at exactly 2 events (boundary just below threshold)', async () => {
    const memoriesByTag: Record<string, any[]> = {
      'event:decision': [{
        id: 'mem-d',
        title: 'Decision one',
        content: 'we decided to wait',
        memory_type: 'project',
        status: 'active',
        access_count: 0,
        user_id: 'user-1',
        tags: ['event:decision'],
        created_at: '2026-05-24T09:00:00Z',
        updated_at: '2026-05-24T09:00:00Z',
      }],
      'event:frustration': [{
        id: 'mem-f',
        title: 'Frustration one',
        content: 'this is annoying',
        memory_type: 'project',
        status: 'active',
        access_count: 0,
        user_id: 'user-1',
        tags: ['event:frustration'],
        created_at: '2026-05-24T10:00:00Z',
        updated_at: '2026-05-24T10:00:00Z',
      }],
    };
    const mockClient = {
      listMemories: vi.fn().mockImplementation(async (opts: { tags?: string[] }) => ({
        data: { data: memoriesByTag[opts.tags?.[0] ?? ''] ?? [] },
      })),
      listInferredConclusions: vi.fn(),
      askProfile: vi.fn(),
    };
    (commands as any).client = mockClient;

    await commands.contextConverge(['--subject=subject-2'], context);

    expect(mockClient.askProfile).not.toHaveBeenCalled();
    expect(context.lastResult).toMatchObject({
      event_count: 2,
      low_signal: true,
    });
  });
});

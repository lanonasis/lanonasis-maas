import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { Command } from 'commander';

/**
 * List endpoints now return summary rows (memory-list edge function since
 * Onasis-CORE #167, mcp-core #58): no `content`, and `content_preview` only on
 * request. The lexical search fallback lists candidates and matches on their
 * text, so it has to ask for the preview and read it, or it can only ever
 * match on titles and tags.
 */

const mockSearchMemories = jest.fn();
const mockGetMemories = jest.fn();

jest.unstable_mockModule('../utils/api.js', () => ({
  apiClient: {
    searchMemories: mockSearchMemories,
    getMemories: mockGetMemories,
  },
}));

jest.unstable_mockModule('chalk', () => ({
  default: {
    blue: { bold: (str: string) => str },
    cyan: (str: string) => str,
    gray: (str: string) => str,
    green: (str: string) => str,
    red: (str: string) => str,
    yellow: (str: string) => str,
    white: (str: string) => str,
  },
}));

/** A summary row: title and tags say nothing about the query; only the preview does. */
const summaryRow = {
  id: '22222222-2222-4222-8222-222222222222',
  title: 'Weekly notes',
  content_preview: 'Rotate the dotenvx keys before the gateway restart.',
  memory_type: 'context',
  tags: ['notes'],
  user_id: 'user-1',
  organization_id: 'org-1',
  created_at: '2026-11-01T00:00:00.000Z',
  updated_at: '2026-11-01T00:00:00.000Z',
  access_count: 0,
};

describe('lexical fallback over summary list rows', () => {
  let logSpy: jest.SpiedFunction<typeof console.log>;
  let errorSpy: jest.SpiedFunction<typeof console.error>;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (process.exit as unknown as jest.Mock).mockClear();
    mockSearchMemories.mockReset();
    mockGetMemories.mockReset();
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  async function search(args: string[]) {
    const { memoryCommands } = await import('../commands/memory.js');
    const program = new Command();
    program.exitOverride();
    memoryCommands(program);
    await program.parseAsync(['node', 'test', 'search', ...args], { from: 'node' });
  }

  it('asks the list endpoint for content previews', async () => {
    mockSearchMemories.mockRejectedValueOnce(new Error('503 backend unavailable'));
    mockGetMemories.mockResolvedValueOnce({ memories: [summaryRow] });

    await search(['dotenvx', '--json']);

    expect(mockGetMemories).toHaveBeenCalledWith(expect.objectContaining({ include_preview: true }));
  });

  it('matches on content_preview when the row has no content', async () => {
    mockSearchMemories.mockRejectedValueOnce(new Error('503 backend unavailable'));
    mockGetMemories.mockResolvedValueOnce({ memories: [summaryRow] });

    await search(['dotenvx', '--json']);

    const payload = JSON.parse(logSpy.mock.calls.map((call) => String(call[0])).join('\n'));
    expect(payload.results).toHaveLength(1);
    expect(payload.results[0].id).toBe(summaryRow.id);
    expect(payload.results[0].content_preview).toContain('dotenvx');
  });
});

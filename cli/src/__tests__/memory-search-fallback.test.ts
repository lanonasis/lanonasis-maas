import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { Command } from 'commander';

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

const memoryFixture = {
  id: '11111111-1111-4111-8111-111111111111',
  title: 'Gateway migration note',
  content: 'Gateway routing should stay aligned across MCP and REST transports.',
  memory_type: 'context',
  tags: ['gateway'],
  user_id: 'user-1',
  organization_id: 'org-1',
  created_at: '2026-07-18T00:00:00.000Z',
  updated_at: '2026-07-18T00:00:00.000Z',
  access_count: 0,
};

const parseJsonOutput = (consoleLogSpy: jest.SpyInstance) => {
  const output = consoleLogSpy.mock.calls.map((call) => String(call[0])).join('\n');
  return JSON.parse(output);
};

describe('memory search fallback contract', () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let mockExit: jest.Mock;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockExit = process.exit as unknown as jest.Mock;
    mockExit.mockClear();
    mockSearchMemories.mockReset();
    mockGetMemories.mockReset();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  async function runSearchCmd(args: string[]) {
    const { memoryCommands } = await import('../commands/memory.js');
    const program = new Command();
    program.exitOverride();
    memoryCommands(program);
    await program.parseAsync(['node', 'test', 'search', ...args], { from: 'node' });
  }

  it('uses lexical fallback by default and reports fallback metadata in JSON', async () => {
    mockSearchMemories.mockRejectedValueOnce(new Error('503 backend unavailable Bearer secret-token'));
    mockGetMemories.mockResolvedValueOnce({ memories: [memoryFixture] });

    await runSearchCmd(['gateway', '--json']);

    const payload = parseJsonOutput(consoleLogSpy);
    expect(payload.search_strategy).toBe('cli_lexical_fallback');
    expect(payload.fallback_used).toBe(true);
    expect(payload.fallback_mode).toBe('auto');
    expect(payload.semantic_error).toContain('Bearer <redacted>');
    expect(payload.results).toHaveLength(1);
    expect(payload.results[0]).toEqual(expect.objectContaining({
      id: memoryFixture.id,
      title: memoryFixture.title,
      content_preview: expect.any(String),
    }));
    expect(mockGetMemories).toHaveBeenCalled();
    expect(mockExit).not.toHaveBeenCalled();
  });

  it('--fail-on-fallback emits results but exits non-zero when fallback is used', async () => {
    mockSearchMemories.mockRejectedValueOnce(new Error('503 backend unavailable'));
    mockGetMemories.mockResolvedValueOnce({ memories: [memoryFixture] });

    await runSearchCmd(['gateway', '--json', '--fail-on-fallback']);

    const payload = parseJsonOutput(consoleLogSpy);
    expect(payload.fallback_used).toBe(true);
    expect(payload.results).toHaveLength(1);
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('--no-fallback fails loudly on semantic backend errors without client-side fallback', async () => {
    mockSearchMemories.mockRejectedValueOnce(new Error('503 backend unavailable token=secret-token'));

    await runSearchCmd(['gateway', '--json', '--no-fallback']);

    const payload = parseJsonOutput(consoleLogSpy);
    expect(payload.search_strategy).toBe('semantic_failed');
    expect(payload.fallback_used).toBe(false);
    expect(payload.fallback_mode).toBe('never');
    expect(payload.semantic_error).toContain('token=<redacted>');
    expect(payload.results).toHaveLength(0);
    expect(mockGetMemories).not.toHaveBeenCalled();
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('--ci is a JSON no-fallback mode for parity checks', async () => {
    mockSearchMemories.mockRejectedValueOnce(new Error('503 backend unavailable lano_secretvalue'));

    await runSearchCmd(['gateway', '--ci']);

    const payload = parseJsonOutput(consoleLogSpy);
    expect(payload.search_strategy).toBe('semantic_failed');
    expect(payload.fallback_used).toBe(false);
    expect(payload.fallback_mode).toBe('never');
    expect(payload.semantic_error).toContain('lano_<redacted>');
    expect(mockGetMemories).not.toHaveBeenCalled();
    expect(mockExit).toHaveBeenCalledWith(1);
  });
});

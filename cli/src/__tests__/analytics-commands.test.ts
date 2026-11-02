import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

/**
 * `api-keys analytics usage|security-events` refused locally with "not exposed
 * by the current auth-gateway API" (guard written 2026-04-03). The gateway has
 * served /api/v1/{auth/,}api-keys/analytics/* since 2026-10-22 (Onasis-CORE
 * 526e119), so the commands must call it instead of exiting.
 */

const mockGet = jest.fn<(url: string) => Promise<unknown>>();

jest.unstable_mockModule('../utils/api.js', () => ({
  apiClient: { get: mockGet },
}));

const usageRows = [
  { key_id: 'key-a', operation: 'validate', success: true, timestamp: '2026-11-01T10:00:00Z' },
  { key_id: 'key-a', operation: 'validate', success: true, timestamp: '2026-11-01T09:00:00Z' },
  { key_id: 'key-a', operation: 'validate', success: false, error_message: 'API key expired', timestamp: '2026-10-31T09:00:00Z' },
  { key_id: 'key-b', operation: 'validate', success: true, timestamp: '2026-10-30T09:00:00Z' },
];

async function run(args: string[]) {
  const { default: apiKeysCommand } = await import('../commands/api-keys.js');
  apiKeysCommand.exitOverride();
  await apiKeysCommand.parseAsync(args, { from: 'user' });
}

const output = (spy: jest.SpiedFunction<typeof console.log>) =>
  spy.mock.calls.map((call) => String(call[0])).join('\n');

describe('api-keys analytics', () => {
  let logSpy: jest.SpiedFunction<typeof console.log>;
  let errorSpy: jest.SpiedFunction<typeof console.error>;
  const exit = process.exit as unknown as jest.Mock;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    exit.mockClear();
    mockGet.mockReset();
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('usage calls the gateway analytics route with days and keyId', async () => {
    mockGet.mockResolvedValueOnce({ success: true, data: usageRows });

    await run(['analytics', 'usage', '--days', '7', '--key-id', '11111111-1111-4111-8111-111111111111', '--json']);

    expect(mockGet).toHaveBeenCalledTimes(1);
    const url = mockGet.mock.calls[0][0];
    expect(url.startsWith('/api/v1/api-keys/analytics/usage?')).toBe(true);
    const params = new URLSearchParams(url.split('?')[1]);
    expect(params.get('days')).toBe('7');
    expect(params.get('keyId')).toBe('11111111-1111-4111-8111-111111111111');
    expect(exit).not.toHaveBeenCalled();
    expect(String(errorSpy.mock.calls.flat().join(' '))).not.toContain('not exposed');
  });

  it('usage --json prints a summary per key, not the raw event rows', async () => {
    mockGet.mockResolvedValueOnce({ success: true, data: usageRows });

    await run(['analytics', 'usage', '--json']);

    const payload = JSON.parse(output(logSpy));
    expect(payload.days).toBe(30);
    expect(payload.total_events).toBe(4);
    expect(payload.failed_events).toBe(1);
    expect(payload.keys).toEqual(expect.arrayContaining([
      expect.objectContaining({ key_id: 'key-a', events: 3, failed: 1, last_seen: '2026-11-01T10:00:00Z' }),
      expect.objectContaining({ key_id: 'key-b', events: 1, failed: 0 }),
    ]));
  });

  it('security-events calls the gateway route with severity', async () => {
    mockGet.mockResolvedValueOnce({ success: true, data: [] });

    await run(['analytics', 'security-events', '--severity', 'high', '--json']);

    const url = mockGet.mock.calls[0][0];
    expect(url).toBe('/api/v1/api-keys/analytics/security-events?severity=high');
    expect(JSON.parse(output(logSpy))).toEqual([]);
    expect(exit).not.toHaveBeenCalled();
  });

  it('rejects an unknown severity before calling the gateway', async () => {
    await run(['analytics', 'security-events', '--severity', 'urgent']);

    expect(mockGet).not.toHaveBeenCalled();
    expect(exit).toHaveBeenCalledWith(1);
  });
});

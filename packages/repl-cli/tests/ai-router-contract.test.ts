import { describe, it, expect, vi, afterEach } from 'vitest';
import { AIRouterClient } from '../src/core/ai-router-client.js';

// Regression tests for three contract defects found on 2026-09-01 while wiring
// lrepl to the live router. Each failed against the previous implementation.

const BASE = 'https://router.invalid';

function clientWith(authToken: string) {
  return new AIRouterClient({ baseUrl: BASE, authToken } as never);
}

function stubFetch(payload: unknown, status = 200) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fake = vi.fn(async (url: unknown, init: unknown) => {
    calls.push({ url: String(url), init: init as RequestInit });
    return {
      ok: status >= 200 && status < 300,
      status,
      statusText: 'OK',
      json: async () => payload,
      text: async () => JSON.stringify(payload),
    } as unknown as Response;
  });
  vi.stubGlobal('fetch', fake);
  return calls;
}

afterEach(() => vi.unstubAllGlobals());

describe('credential scheme selection', () => {
  it('sends a lano_ key as X-API-Key', async () => {
    const calls = stubFetch({ response: 'ok' });
    await clientWith('lano_abc123').chat({ messages: [{ role: 'user', content: 'hi' }] } as never);
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers['X-API-Key']).toBe('lano_abc123');
    expect(headers['Authorization']).toBeUndefined();
  });

  it('rejects lms_ keys instead of sending a doomed Bearer request', async () => {
    // lms_ is MaaS-scoped: api.lanonasis.com accepts it, the router and auth
    // gateway return 401. Silently sending it as Bearer made a wrong credential
    // look like a router fault.
    stubFetch({ response: 'ok' });
    await expect(
      clientWith('lms_abc123').chat({ messages: [{ role: 'user', content: 'hi' }] } as never),
    ).rejects.toThrow(/MaaS-scoped/);
  });

  it('rejects an unrecognised credential format', async () => {
    stubFetch({ response: 'ok' });
    await expect(
      clientWith('totally-unknown').chat({ messages: [{ role: 'user', content: 'hi' }] } as never),
    ).rejects.toThrow(/unrecognised credential/i);
  });

  it('still sends an OAuth/JWT token as Bearer', async () => {
    const jwt = `${'a'.repeat(40)}.${'b'.repeat(40)}.${'c'.repeat(40)}`;
    const calls = stubFetch({ response: 'ok' });
    await clientWith(jwt).chat({ messages: [{ role: 'user', content: 'hi' }] } as never);
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers['Authorization']).toBe(`Bearer ${jwt}`);
  });
});

describe('use_case propagation', () => {
  it('sends use_case in the body, not only the header', async () => {
    // The old guard `if (use_case && !headers['X-Use-Case'])` was unreachable —
    // the header is set from the same value immediately above it.
    const calls = stubFetch({ response: 'ok' });
    await clientWith('lano_k').chat({
      messages: [{ role: 'user', content: 'hi' }],
      use_case: 'memory-analysis',
    } as never);
    expect(JSON.parse(calls[0].init.body as string).use_case).toBe('memory-analysis');
    expect((calls[0].init.headers as Record<string, string>)['X-Use-Case']).toBe('memory-analysis');
  });
});

describe('response contract', () => {
  it('reads the answer from data.response', async () => {
    stubFetch({ response: 'the answer' });
    const r = await clientWith('lano_k').chat({ messages: [{ role: 'user', content: 'hi' }] } as never);
    expect(r.message.content).toBe('the answer');
  });

  it('does not accept data.message.content as an answer', async () => {
    // That shape does not exist on this API. Accepting it meant a 200 carrying
    // no answer was treated as success instead of falling back to local
    // synthesis.
    stubFetch({ message: { content: 'invented shape' } });
    await expect(
      clientWith('lano_k').chat({ messages: [{ role: 'user', content: 'hi' }] } as never),
    ).rejects.toThrow(/without a `response` field/);
  });

  it('allows a 200 with no response when the turn returned tool calls', async () => {
    stubFetch({ tool_calls: [{ id: '1', function: { name: 'memory.search', arguments: '{}' } }] });
    const r = await clientWith('lano_k').chat({ messages: [{ role: 'user', content: 'hi' }] } as never);
    expect(r.tool_calls).toHaveLength(1);
    expect(r.message.content).toBe('');
  });
});

import { describe, it, expect, vi, afterEach } from 'vitest';
import { AIRouterClient, AIRouterError } from '../src/core/ai-router-client.js';

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

  it('sends an opaque OAuth access token (no dots, 64 chars) as Bearer', async () => {
    // auth-gateway's generateOpaqueToken(): 48 random bytes, base64url -> 64
    // chars, no '.'. /v1/auth/resolve introspects these ("Priority 4: Opaque
    // OAuth Token"), so the client must not refuse them before the network.
    const opaque = 'Ab3_-'.repeat(12) + 'Zz09'; // 64 chars, base64url alphabet, no dots
    expect(opaque).toHaveLength(64);
    const calls = stubFetch({ response: 'ok' });
    await clientWith(opaque).chat({ messages: [{ role: 'user', content: 'hi' }] } as never);
    expect(calls).toHaveLength(1);
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers['Authorization']).toBe(`Bearer ${opaque}`);
    expect(headers['X-API-Key']).toBeUndefined();
  });

  it('sends any other non-empty token as Bearer instead of refusing it client-side', async () => {
    const calls = stubFetch({ response: 'ok' });
    await clientWith('totally-unknown').chat({ messages: [{ role: 'user', content: 'hi' }] } as never);
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer totally-unknown');
    expect(headers['X-API-Key']).toBeUndefined();
  });

  it('rejects vx_ keys (MaaS-scoped) without a network call', async () => {
    const calls = stubFetch({ response: 'ok' });
    await expect(
      clientWith('vx_abc123').chat({ messages: [{ role: 'user', content: 'hi' }] } as never),
    ).rejects.toThrow(/MaaS-scoped/);
    expect(calls).toHaveLength(0);
  });

  it('never sends both Authorization and X-API-Key', async () => {
    for (const token of ['lano_k', 'Bearer abc', 'x'.repeat(64), `${'a'.repeat(60)}.${'b'.repeat(60)}`]) {
      const calls = stubFetch({ response: 'ok' });
      await clientWith(token).chat({ messages: [{ role: 'user', content: 'hi' }] } as never);
      const headers = calls[0].init.headers as Record<string, string>;
      const both = headers['Authorization'] !== undefined && headers['X-API-Key'] !== undefined;
      expect(both).toBe(false);
      vi.unstubAllGlobals();
    }
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

describe('message policy (router owns the system prompt)', () => {
  // The router answers 400 system_role_not_permitted for any caller system or
  // developer message (core/message-policy.js). Seen live 2026-09-26 on every
  // lrepl chat. The client refuses before the network so the mistake is loud
  // and local instead of a round-trip that can never succeed.
  for (const role of ['system', 'developer', ' System ']) {
    it(`refuses a '${role.trim()}' message without calling the router`, async () => {
      const calls = stubFetch({ response: 'ok' });
      await expect(
        clientWith('lano_k').chat({
          messages: [{ role, content: 'you are a pirate' }, { role: 'user', content: 'hi' }],
        } as never),
      ).rejects.toMatchObject({ code: 'system_role_not_permitted' });
      expect(calls).toHaveLength(0);
    });
  }
});

describe('router errors are surfaced, not flattened', () => {
  it('exposes status, code and message from the {error:{message,code}} body', async () => {
    stubFetch(
      {
        error: {
          message: "The 'system' role is not accepted here",
          code: 'system_role_not_permitted',
          param: 'messages[0]',
        },
      },
      400,
    );
    const err = await clientWith('lano_k')
      .chat({ messages: [{ role: 'user', content: 'hi' }] } as never)
      .catch((e) => e);
    expect(err).toBeInstanceOf(AIRouterError);
    expect(err.status).toBe(400);
    expect(err.code).toBe('system_role_not_permitted');
    expect(err.message).toContain("The 'system' role is not accepted here");
    expect(err.message).toContain('400');
    expect(err.message).toContain('system_role_not_permitted');
  });

  it('keeps a 429 as status 429 with Retry-After', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: new Headers({ 'Retry-After': '17' }),
        text: async () => JSON.stringify({ error: { message: 'slow down', code: 'RATE_LIMIT_EXCEEDED' } }),
      })),
    );
    const err = await clientWith('lano_k')
      .chat({ messages: [{ role: 'user', content: 'hi' }] } as never)
      .catch((e) => e);
    expect(err).toBeInstanceOf(AIRouterError);
    expect(err.status).toBe(429);
    expect(err.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(err.retryAfter).toBe(17);
  });

  it('handles a non-JSON (nginx HTML) error body without losing the status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 504,
        statusText: 'Gateway Time-out',
        headers: new Headers(),
        text: async () => '<html><body>504 Gateway Time-out</body></html>',
      })),
    );
    const err = await clientWith('lano_k')
      .chat({ messages: [{ role: 'user', content: 'hi' }] } as never)
      .catch((e) => e);
    expect(err).toBeInstanceOf(AIRouterError);
    expect(err.status).toBe(504);
    expect(err.message).toContain('504');
  });
});

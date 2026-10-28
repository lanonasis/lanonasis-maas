import { describe, it, expect, vi, afterEach } from 'vitest';
import { AIRouterClient, AIRouterError } from '../src/core/ai-router-client.js';
import { quickHealthCheck, ROUTER_CHAT } from '../src/core/health-check.js';
import { routerCredentials } from '../src/config/loader.js';

// Regression (2026-10-28): a stale aiRouterApiKey in repl-config.json always
// outranked a fresh `lrepl login` session, so chat and `lrepl health` failed
// with 401 AUTH_REQUIRED while the login session worked. Credentials are now
// ranked: on a 401 the client moves to the next one and keeps the one that worked.

const BASE = 'https://router.invalid';

function stubRouter(accept: (headers: Record<string, string>) => boolean) {
  const calls: Record<string, string>[] = [];
  vi.stubGlobal('fetch', vi.fn(async (_url: unknown, init: RequestInit) => {
    const headers = init.headers as Record<string, string>;
    calls.push(headers);
    const ok = accept(headers);
    const payload = ok ? { response: 'OK' } : { success: false, error: 'Authentication required', code: 'AUTH_REQUIRED' };
    return {
      ok,
      status: ok ? 200 : 401,
      statusText: ok ? 'OK' : 'Unauthorized',
      headers: new Headers(),
      json: async () => payload,
      text: async () => JSON.stringify(payload),
    } as unknown as Response;
  }));
  return calls;
}

const onlySession = (h: Record<string, string>) => h['Authorization'] === 'Bearer session-token';
const msg = { messages: [{ role: 'user', content: 'hi' }] };

afterEach(() => vi.unstubAllGlobals());

describe('router credential fallback', () => {
  it('moves to the login session when the stored key is refused, then keeps using it', async () => {
    const calls = stubRouter(onlySession);
    const client = new AIRouterClient({ baseUrl: BASE, authToken: 'lano_dead', fallbackAuthTokens: ['session-token'] });
    await expect(client.chat(msg)).resolves.toMatchObject({ message: { content: 'OK' } });
    expect(calls.map((h) => h['X-API-Key'] ?? h['Authorization'])).toEqual(['lano_dead', 'Bearer session-token']);
    expect(client.refusedCredentialHint).toBe('lano_…dead');
    await client.chat(msg);
    expect(calls).toHaveLength(3);
    expect(calls[2]['Authorization']).toBe('Bearer session-token');
  });

  it('still throws the 401 when there is nothing to fall back to', async () => {
    stubRouter(onlySession);
    const client = new AIRouterClient({ baseUrl: BASE, authToken: 'lano_dead' });
    await expect(client.chat(msg)).rejects.toMatchObject({ status: 401 });
  });

  it('does not fall back on errors other than 401', async () => {
    const calls: unknown[] = [];
    vi.stubGlobal('fetch', vi.fn(async () => {
      calls.push(1);
      return { ok: false, status: 500, statusText: 'x', headers: new Headers(), json: async () => ({ error: 'boom' }), text: async () => '{"error":"boom"}' } as unknown as Response;
    }));
    const client = new AIRouterClient({ baseUrl: BASE, authToken: 'lano_a', fallbackAuthTokens: ['session-token'] });
    await expect(client.chat(msg)).rejects.toBeInstanceOf(AIRouterError);
    expect(calls).toHaveLength(1);
  });

  it('repl health reports chat working with a refused stored credential', async () => {
    stubRouter(onlySession);
    const results = await quickHealthCheck({ aiRouterUrl: BASE, aiRouterAuthTokens: ['lano_dead', 'session-token'] });
    const chat = results.find((r) => r.endpoint === ROUTER_CHAT)!;
    expect(chat.status).toBe('degraded');
    expect(chat.message).toMatch(/Chat OK/);
    expect(chat.message).toMatch(/a stored router credential \(lano_…dead\) was refused/);
  });
});

describe('routerCredentials', () => {
  it('ranks aiRouterApiKey, aiRouterAuthToken, then the login session, without duplicates', () => {
    expect(routerCredentials({ aiRouterApiKey: 'lano_k', aiRouterAuthToken: 'lano_k', authToken: 'session' } as never)).toEqual(['lano_k', 'session']);
    expect(routerCredentials({ authToken: ' session ' } as never)).toEqual(['session']);
    expect(routerCredentials({} as never)).toEqual([]);
  });
});

describe('router use case resolution', () => {
  function stubCapturing() {
    const seen: Array<{ headers: Record<string, string>; body: any }> = [];
    vi.stubGlobal('fetch', vi.fn(async (_url: unknown, init: RequestInit) => {
      seen.push({ headers: init.headers as Record<string, string>, body: JSON.parse(String(init.body)) });
      return {
        ok: true, status: 200, statusText: 'OK', headers: new Headers(),
        json: async () => ({ response: 'OK' }), text: async () => '{"response":"OK"}',
      } as unknown as Response;
    }));
    return seen;
  }

  it('ships the configured default use_case when the request omits one', async () => {
    const seen = stubCapturing();
    const client = new AIRouterClient({ baseUrl: BASE, authToken: 'lano_x', defaultUseCase: 'repl-nlp' });
    await client.chat(msg);
    expect(seen[0].headers['X-Use-Case']).toBe('repl-nlp');
    expect(seen[0].body.use_case).toBe('repl-nlp');
  });

  it('lets an explicit request use_case win over the default', async () => {
    const seen = stubCapturing();
    const client = new AIRouterClient({ baseUrl: BASE, authToken: 'lano_x', defaultUseCase: 'repl-nlp' });
    await client.chat({ ...msg, use_case: 'content-generation' });
    expect(seen[0].headers['X-Use-Case']).toBe('content-generation');
    expect(seen[0].body.use_case).toBe('content-generation');
  });

  it('sends no use_case when neither is set (router default applies)', async () => {
    const seen = stubCapturing();
    const client = new AIRouterClient({ baseUrl: BASE, authToken: 'lano_x' });
    await client.chat(msg);
    expect(seen[0].headers['X-Use-Case']).toBeUndefined();
    expect(seen[0].body.use_case).toBeUndefined();
  });
});

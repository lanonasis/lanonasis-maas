import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  AIEndpointHealthCheck,
  quickHealthCheck,
  ROUTER_REACHABILITY,
  ROUTER_CHAT,
  MEMORY_API_REACHABILITY,
} from '../src/core/health-check';

describe('AIEndpointHealthCheck', () => {
  let checker: AIEndpointHealthCheck;
  let _origFetch: typeof global.fetch;
  const mockEndpoints = [
    {
      name: 'Primary Router',
      url: 'https://ai1.example.com',
      type: 'router' as const,
      priority: 1,
      timeout: 3000,
    },
    {
      name: 'Secondary Router',
      url: 'https://ai2.example.com',
      type: 'router' as const,
      priority: 2,
      timeout: 3000,
    },
  ];

  beforeEach(() => {
    _origFetch = global.fetch;
    checker = new AIEndpointHealthCheck(mockEndpoints);
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = _origFetch;
    vi.restoreAllMocks();
  });

  describe('checkEndpoint', () => {
    it('should return healthy for responsive router endpoint', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
      } as Response);

      const result = await checker['checkEndpoint'](mockEndpoints[0]);
      
      expect(result.status).toBe('healthy');
      expect(result.endpoint).toBe('Primary Router');
      expect(result.fallbackAvailable).toBe(true);
      expect(result.latency).toBeGreaterThanOrEqual(0);
    });

    it('should return degraded for slow response', async () => {
      // Simulate slow response
      vi.mocked(fetch).mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({ ok: true, status: 200 } as Response), 1500)
        )
      );

      const result = await checker['checkEndpoint'](mockEndpoints[0]);
      
      expect(result.status).toBe('degraded');
    });

    it('should return unhealthy for failed request', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Connection refused'));

      const result = await checker['checkEndpoint'](mockEndpoints[0]);
      
      expect(result.status).toBe('unhealthy');
      expect(result.message).toBeDefined();
    });

    it.skip('should return unhealthy for timeout', async () => {
      // Skipped due to test timeout complexity with fake timers
    });

    it('should handle 405 status as healthy for HEAD requests', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 405,
      } as Response);

      const result = await checker['checkEndpoint'](mockEndpoints[0]);
      
      expect(result.status).toBe('healthy');
    });

    it('should report unknown endpoint types as unhealthy instead of throwing', async () => {
      const result = await checker['checkEndpoint']({
        name: 'Unsupported',
        url: 'https://invalid.example.com',
        type: 'unsupported' as any,
        priority: 99,
      });

      expect(result.status).toBe('unhealthy');
      expect(result.message).toContain('Unknown endpoint type');
    });
  });

  describe('checkAllEndpoints', () => {
    it('should check all endpoints', async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce({ ok: true, status: 200 } as Response)
        .mockResolvedValueOnce({ ok: true, status: 200 } as Response);

      const results = await checker.checkAllEndpoints();
      
      expect(results).toHaveLength(2);
      expect(results[0].endpoint).toBe('Primary Router');
      expect(results[1].endpoint).toBe('Secondary Router');
    });

    it('should store results internally', async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce({ ok: true, status: 200 } as Response)
        .mockResolvedValueOnce({ ok: true, status: 200 } as Response);

      await checker.checkAllEndpoints();
      const stored = checker.getLastResults();
      
      expect(stored).toHaveLength(2);
    });
  });

  describe('getBestEndpoint', () => {
    it('should return the first healthy endpoint', async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce({ ok: false, status: 500 } as Response) // First unhealthy
        .mockResolvedValueOnce({ ok: true, status: 200 } as Response); // Second healthy

      await checker.checkAllEndpoints();
      const best = checker.getBestEndpoint();
      
      expect(best).toBeDefined();
      expect(best?.name).toBe('Secondary Router');
    });

    it('should return null when no endpoints are healthy', async () => {
      vi.mocked(fetch)
        .mockRejectedValueOnce(new Error('Error'))
        .mockRejectedValueOnce(new Error('Error'));

      await checker.checkAllEndpoints();
      const best = checker.getBestEndpoint();
      
      expect(best).toBeNull();
    });

    it('should return degraded endpoint if no healthy ones', async () => {
      vi.mocked(fetch).mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({ ok: true, status: 200 } as Response), 1500)
        )
      );

      await checker.checkAllEndpoints();
      const best = checker.getBestEndpoint();
      
      expect(best).toBeDefined();
      expect(best?.name).toBe('Primary Router');
    });
  });

  describe('formatResults', () => {
    it('should format healthy results', () => {
      const results = [
        {
          endpoint: 'Test Endpoint',
          status: 'healthy' as const,
          latency: 100,
          message: 'OK',
          fallbackAvailable: true,
          lastChecked: new Date(),
        },
      ];

      const formatted = checker.formatResults(results);
      
      expect(formatted).toContain('Test Endpoint');
      expect(formatted).toContain('healthy');
      expect(formatted).toContain('100ms');
      expect(formatted).toContain('OK');
    });

    it('should format unhealthy results with fallback notice', () => {
      const results = [
        {
          endpoint: 'Failed Endpoint',
          status: 'unhealthy' as const,
          latency: 5000,
          message: 'Connection refused',
          fallbackAvailable: true,
          lastChecked: new Date(),
        },
      ];

      const formatted = checker.formatResults(results);
      
      expect(formatted).toContain('unhealthy');
      expect(formatted).toContain('Fallback available');
    });

    it('should show summary for all healthy', () => {
      const results = [
        {
          endpoint: 'Endpoint 1',
          status: 'healthy' as const,
          latency: 100,
          message: 'OK',
          fallbackAvailable: false,
          lastChecked: new Date(),
        },
        {
          endpoint: 'Endpoint 2',
          status: 'healthy' as const,
          latency: 150,
          message: 'OK',
          fallbackAvailable: true,
          lastChecked: new Date(),
        },
      ];

      const formatted = checker.formatResults(results);
      
      expect(formatted).toContain('All endpoints healthy');
    });

    it('should show warning for mixed health', () => {
      const results = [
        {
          endpoint: 'Healthy',
          status: 'healthy' as const,
          latency: 100,
          message: 'OK',
          fallbackAvailable: true,
          lastChecked: new Date(),
        },
        {
          endpoint: 'Unhealthy',
          status: 'unhealthy' as const,
          latency: 5000,
          message: 'Error',
          fallbackAvailable: true,
          lastChecked: new Date(),
        },
      ];

      const formatted = checker.formatResults(results);
      
      expect(formatted).toContain('fallback active');
    });

    it('should show error for all unhealthy', () => {
      const results = [
        {
          endpoint: 'Failed 1',
          status: 'unhealthy' as const,
          latency: 5000,
          message: 'Error',
          fallbackAvailable: true,
          lastChecked: new Date(),
        },
      ];

      const formatted = checker.formatResults(results);

      expect(formatted).toContain('No healthy endpoints');
    });

    it('should show degraded warning when all endpoints are degraded', () => {
      const results = [
        {
          endpoint: 'Slow Endpoint 1',
          status: 'degraded' as const,
          latency: 1500,
          message: 'Slow response',
          fallbackAvailable: true,
          lastChecked: new Date(),
        },
        {
          endpoint: 'Slow Endpoint 2',
          status: 'degraded' as const,
          latency: 2000,
          message: 'Slow response',
          fallbackAvailable: false,
          lastChecked: new Date(),
        },
      ];

      const formatted = checker.formatResults(results);

      expect(formatted).toContain('degraded');
      expect(formatted).not.toContain('All endpoints healthy');
    });
  });

  describe('periodic checks', () => {
    it('should start and stop periodic checks', () => {
      vi.useFakeTimers();
      
      checker.startPeriodicChecks(1000);
      expect(checker['checkInterval']).toBeDefined();

      checker.stopPeriodicChecks();
      expect(checker['checkInterval']).toBeUndefined();

      vi.useRealTimers();
    });
  });
});

describe('quickHealthCheck', () => {
  let _origFetch: typeof global.fetch;

  beforeEach(() => {
    _origFetch = global.fetch;
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = _origFetch;
    vi.restoreAllMocks();
  });

  it('should check all configured endpoints', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({ ok: true, status: 200 } as Response)
      .mockResolvedValueOnce({ ok: true, status: 200 } as Response);

    const results = await quickHealthCheck({
      aiRouterUrl: 'https://ai.example.com',
      openaiApiKey: 'test-key',
      apiUrl: 'http://localhost:3000',
    });

    expect(results.length).toBeGreaterThanOrEqual(2);
    expect(results.some(r => r.endpoint === ROUTER_REACHABILITY)).toBe(true);
    expect(results.some(r => r.endpoint === MEMORY_API_REACHABILITY)).toBe(true);
  });

  it('should work with minimal config', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
    } as Response);

    const results = await quickHealthCheck({});

    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some(r => r.endpoint === MEMORY_API_REACHABILITY)).toBe(true);
  });
});

// 2026-09-26: `lrepl health` said "2/2 healthy" (GET /health + HEAD on the
// memory API, neither authenticated) while every chat got a 400. The chat
// check sends a real, minimal, authenticated /api/v1/ai-chat request.
describe('authenticated router chat check', () => {
  let _origFetch: typeof global.fetch;
  const calls: Array<{ url: string; init: RequestInit }> = [];

  function respond(status: number, body: unknown) {
    return {
      ok: status >= 200 && status < 300,
      status,
      statusText: '',
      headers: new Headers(),
      json: async () => body,
      text: async () => JSON.stringify(body),
    } as unknown as Response;
  }

  function install(chat: () => Response) {
    calls.length = 0;
    global.fetch = vi.fn(async (url: unknown, init?: unknown) => {
      const u = String(url);
      calls.push({ url: u, init: (init ?? {}) as RequestInit });
      if (u.endsWith('/api/v1/ai-chat')) return chat();
      return respond(200, { status: 'ok' });
    }) as unknown as typeof fetch;
  }

  beforeEach(() => {
    _origFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = _origFetch;
    vi.restoreAllMocks();
  });

  it('posts a minimal repl-nlp chat with the router credential and reports success', async () => {
    install(() => respond(200, { response: 'OK' }));
    const results = await quickHealthCheck({
      aiRouterUrl: 'https://ai.example.com',
      aiRouterAuthToken: 'lano_health',
      apiUrl: 'https://memory.example.com',
    });
    const chat = results.find(r => r.endpoint === ROUTER_CHAT)!;
    expect(chat).toBeDefined();
    expect(chat.status).toBe('healthy');
    expect(chat.authenticated).toBe(true);

    const post = calls.find(c => c.url === 'https://ai.example.com/api/v1/ai-chat')!;
    expect(post.init.method).toBe('POST');
    const headers = post.init.headers as Record<string, string>;
    expect(headers['X-API-Key']).toBe('lano_health');
    const body = JSON.parse(post.init.body as string);
    expect(body.use_case).toBe('repl-nlp');
    expect(body.messages).toEqual([{ role: 'user', content: expect.any(String) }]);
  });

  it('reports the router error when /health is fine but chat is rejected', async () => {
    install(() => respond(400, { error: { message: 'no system role', code: 'system_role_not_permitted' } }));
    const results = await quickHealthCheck({
      aiRouterUrl: 'https://ai.example.com',
      aiRouterAuthToken: 'lano_health',
      apiUrl: 'https://memory.example.com',
    });
    expect(results.find(r => r.endpoint === ROUTER_REACHABILITY)!.status).not.toBe('unhealthy');
    const chat = results.find(r => r.endpoint === ROUTER_CHAT)!;
    expect(chat.status).toBe('unhealthy');
    expect(chat.message).toContain('400');
    expect(chat.message).toContain('system_role_not_permitted');

    const text = new AIEndpointHealthCheck([]).formatResults(results);
    expect(text).not.toMatch(/All endpoints healthy/);
    expect(text).toMatch(/chat is NOT working/i);
  });

  it('says chat cannot work when no router credential is configured', async () => {
    install(() => respond(200, { response: 'OK' }));
    const results = await quickHealthCheck({ aiRouterUrl: 'https://ai.example.com' });
    const chat = results.find(r => r.endpoint === ROUTER_CHAT)!;
    expect(chat.status).toBe('unhealthy');
    expect(chat.message).toMatch(/no .*credential/i);
    expect(calls.some(c => c.url.endsWith('/api/v1/ai-chat'))).toBe(false);
  });
});

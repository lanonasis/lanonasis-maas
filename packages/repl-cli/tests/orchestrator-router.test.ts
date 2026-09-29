import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NaturalLanguageOrchestrator, classifyAIError } from '../src/core/orchestrator';
import { AIRouterError } from '../src/core/ai-router-client';
import { getPersonaRegistry } from '../src/personas/registry';

// Regression tests for the 2026-09-26 live failures of lrepl against
// https://ai.vortexcore.app: every chat got 400 system_role_not_permitted,
// the error was swallowed, and the REPL then fell back to a direct OpenAI call
// that 429'd and was reported as "Something went wrong".

const ROUTER = 'https://router.invalid';

type Call = { url: string; init: RequestInit };

function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 429 ? 'Too Many Requests' : 'X',
    headers: new Headers(headers),
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

/**
 * Routes fetch by URL. Router and OpenAI responses are configurable; anything
 * else (memory API lookups done for context) answers 404 so it is ignored.
 */
function installFetch(opts: {
  router?: () => Response;
  openai?: () => Response;
}) {
  const calls: Call[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: unknown, init: unknown) => {
      const u = String(url);
      calls.push({ url: u, init: (init ?? {}) as RequestInit });
      if (u.startsWith(`${ROUTER}/api/v1/ai-chat`)) {
        return opts.router ? opts.router() : jsonResponse(200, { response: 'hello from router' });
      }
      if (u.startsWith('https://api.openai.com')) {
        return opts.openai
          ? opts.openai()
          : jsonResponse(200, { choices: [{ message: { role: 'assistant', content: 'from openai' } }] });
      }
      return jsonResponse(404, { error: 'not found' });
    }),
  );
  return calls;
}

const routerCalls = (calls: Call[]) => calls.filter((c) => c.url.startsWith(`${ROUTER}/api/v1/ai-chat`));
const openaiCalls = (calls: Call[]) => calls.filter((c) => c.url.startsWith('https://api.openai.com'));
const bodyRoles = (c: Call) =>
  (JSON.parse(c.init.body as string).messages as Array<{ role: string }>).map((m) => m.role);

function makeOrchestrator(extra: Record<string, unknown> = {}) {
  return new NaturalLanguageOrchestrator({
    apiUrl: 'https://memory.invalid',
    authToken: 'lano_memory_key',
    aiRouterUrl: ROUTER,
    aiRouterApiKey: 'lano_router_key',
    l0: { enabled: false },
    ...extra,
  } as never);
}

let logged: string[];
const originalLocalMemory = process.env.LANONASIS_LOCAL_MEMORY;
const originalOpenAIKey = process.env.OPENAI_API_KEY;
const originalFallback = process.env.LANONASIS_OPENAI_FALLBACK;

beforeEach(() => {
  process.env.LANONASIS_LOCAL_MEMORY = '0';
  delete process.env.OPENAI_API_KEY;
  delete process.env.LANONASIS_OPENAI_FALLBACK;
  logged = [];
  vi.spyOn(console, 'log').mockImplementation((...a: unknown[]) => {
    logged.push(a.map(String).join(' '));
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  const restore = (k: string, v: string | undefined) => {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  };
  restore('LANONASIS_LOCAL_MEMORY', originalLocalMemory);
  restore('OPENAI_API_KEY', originalOpenAIKey);
  restore('LANONASIS_OPENAI_FALLBACK', originalFallback);
});

describe('router-bound requests never carry system/developer roles', () => {
  it('a plain chat turn sends only user/assistant messages', async () => {
    const calls = installFetch({});
    const orch = makeOrchestrator();
    const r = await orch.processNaturalLanguage('hello');
    expect(r.response).toBe('hello from router');
    const rc = routerCalls(calls);
    expect(rc).toHaveLength(1);
    expect(bodyRoles(rc[0])).toEqual(['user']);
  });

  it('after a persona switch and a multi-turn conversation', async () => {
    const calls = installFetch({});
    const orch = makeOrchestrator();
    for (const p of getPersonaRegistry().list()) orch.setPersona(p);
    await orch.processNaturalLanguage('first');
    await orch.processNaturalLanguage('second');
    for (const c of routerCalls(calls)) {
      for (const role of bodyRoles(c)) expect(['user', 'assistant']).toContain(role);
    }
    expect(bodyRoles(routerCalls(calls)[1])).toEqual(['user', 'assistant', 'user']);
  });

  it('uses the repl-nlp use case in body and header', async () => {
    const calls = installFetch({});
    await makeOrchestrator().processNaturalLanguage('hello');
    const c = routerCalls(calls)[0];
    expect(JSON.parse(c.init.body as string).use_case).toBe('repl-nlp');
    expect((c.init.headers as Record<string, string>)['X-Use-Case']).toBe('repl-nlp');
  });

  it('prompt optimisation does not send a system message to the router', async () => {
    const calls = installFetch({ router: () => jsonResponse(200, { response: '{"optimized_prompt":"better"}' }) });
    const orch = makeOrchestrator();
    const out = await (orch as any).optimizePrompt('make this better');
    expect(out.data?.optimized_prompt).toBe('better');
    const rc = routerCalls(calls);
    expect(rc).toHaveLength(1);
    expect(bodyRoles(rc[0])).toEqual(['user']);
  });

  it('keeps the persona prompt locally (not in the router-bound history)', () => {
    const orch = makeOrchestrator();
    const mind = getPersonaRegistry().get('mind')!;
    orch.setPersona(mind);
    expect(orch.getSystemPrompt()).toBe(mind.systemPrompt);
    expect(orch.getHistory().some((m) => (m.role as string) === 'system')).toBe(false);
  });
});

describe('router errors reach the user; no silent direct-OpenAI fallback', () => {
  const policy400 = () =>
    jsonResponse(400, {
      error: {
        message: "The 'system' role is not accepted here",
        code: 'system_role_not_permitted',
        param: 'messages[0]',
      },
    });

  it('shows status, code and message of a router error', async () => {
    installFetch({ router: policy400 });
    await makeOrchestrator().processNaturalLanguage('hello');
    const out = logged.join('\n');
    expect(out).toContain('400');
    expect(out).toContain('system_role_not_permitted');
    expect(out).toContain("The 'system' role is not accepted here");
    expect(out).not.toMatch(/Something went wrong/);
  });

  it('does not call api.openai.com when a router is configured, even with an OpenAI key', async () => {
    const calls = installFetch({ router: policy400 });
    await makeOrchestrator({ openaiApiKey: 'sk-test' }).processNaturalLanguage('hello');
    expect(openaiCalls(calls)).toHaveLength(0);
  });

  it('direct OpenAI fallback is opt-in, and its failure is reported honestly', async () => {
    const calls = installFetch({
      router: policy400,
      openai: () =>
        jsonResponse(429, {
          error: { message: 'You exceeded your current quota', type: 'insufficient_quota', code: 'insufficient_quota' },
        }),
    });
    await makeOrchestrator({ openaiApiKey: 'sk-test', openaiFallback: true }).processNaturalLanguage('hello');
    expect(openaiCalls(calls)).toHaveLength(1);
    const out = logged.join('\n');
    // Both failures are named.
    expect(out).toContain('system_role_not_permitted');
    expect(out).toMatch(/OpenAI/);
    expect(out).toContain('429');
    expect(out).toContain('insufficient_quota');
  });

  it('opt-in fallback that succeeds answers the turn', async () => {
    installFetch({ router: policy400 });
    const r = await makeOrchestrator({ openaiApiKey: 'sk-test', openaiFallback: true }).processNaturalLanguage('hello');
    expect(r.response).toBe('from openai');
  });

  it('the direct OpenAI request (no router configured) keeps its system prompt', async () => {
    const calls = installFetch({});
    const orch = makeOrchestrator({ aiRouterUrl: undefined, openaiApiKey: 'sk-test' });
    await orch.processNaturalLanguage('hello');
    const oc = openaiCalls(calls);
    expect(oc).toHaveLength(1);
    expect(bodyRoles(oc[0])[0]).toBe('system');
  });
});

describe('error classification is by status, not by message text', () => {
  it('classifies an OpenAI 429 "Too Many Requests" as rate limited', () => {
    const e = Object.assign(new Error('OpenAI API error: Too Many Requests'), { status: 429 });
    expect(classifyAIError(e)).toBe('rate_limit');
  });

  it('classifies a router 429 as rate limited', () => {
    expect(classifyAIError(new AIRouterError('slow down', { status: 429, code: 'RATE_LIMIT_EXCEEDED' }))).toBe(
      'rate_limit',
    );
  });

  it('classifies 401/403 as auth', () => {
    expect(classifyAIError(new AIRouterError('nope', { status: 401, code: 'AUTH_REQUIRED' }))).toBe('auth');
    expect(classifyAIError(new AIRouterError('nope', { status: 403 }))).toBe('auth');
  });

  it('classifies 400 as a rejected request', () => {
    expect(classifyAIError(new AIRouterError('bad', { status: 400, code: 'system_role_not_permitted' }))).toBe(
      'rejected',
    );
  });

  it('classifies 5xx as a service failure and status 0 as network', () => {
    expect(classifyAIError(new AIRouterError('down', { status: 503 }))).toBe('service');
    expect(classifyAIError(new AIRouterError('timeout', { status: 0, code: 'TIMEOUT' }))).toBe('network');
  });

  it('a 429 answer produces the busy message, not the generic one', async () => {
    installFetch({
      router: () => jsonResponse(429, { error: { message: 'slow', code: 'RATE_LIMIT_EXCEEDED' } }, { 'Retry-After': '30' }),
    });
    await makeOrchestrator().processNaturalLanguage('hello');
    const out = logged.join('\n');
    expect(out).toMatch(/rate.?limit|busy/i);
    expect(out).toContain('429');
    expect(out).not.toMatch(/Something went wrong/);
  });
});

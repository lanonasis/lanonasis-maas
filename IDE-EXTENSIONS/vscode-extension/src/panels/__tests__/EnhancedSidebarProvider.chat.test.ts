import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { EnhancedSidebarProvider } from '../EnhancedSidebarProvider';
import type { IMemoryService } from '../../services/IMemoryService';
import type { ApiKeyService } from '../../services/ApiKeyService';

/**
 * Unit tests for the sidebar chat → onasis-ai-router wiring in
 * EnhancedSidebarProvider.handleChatQuery.
 *
 * Coverage:
 *  - synthesized answer from payload.response (router contract)
 *  - lano_* key sent as X-API-Key, OAuth JWT as Authorization: Bearer
 *  - use_case=memory-analysis, single user message, no client system prompt
 *  - graceful degradation to plain memory search on network error / non-200
 *  - 429 surfaces Retry-After (no hot-loop retry)
 *  - no credential ever leaks into posted messages or error text
 */

const LANO_KEY = 'lano_testkey1234567890abcdef';
const JWT = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';

function makeMemoryService(): IMemoryService {
    return {
        searchMemories: vi.fn().mockResolvedValue([
            { id: 'mem-1', title: 'Vendor Chain Fix', content: 'Fixed the fallback chain on 2026-08-19.', memory_type: 'knowledge', created_at: new Date().toISOString(), tags: ['ops'], status: 'active' },
        ]),
        listMemories: vi.fn().mockResolvedValue([]),
        getMemory: vi.fn(),
        createMemory: vi.fn(),
        updateMemory: vi.fn(),
        deleteMemory: vi.fn(),
        isAuthenticated: vi.fn().mockResolvedValue(true),
        refreshClient: vi.fn().mockResolvedValue(undefined),
        getConnectionInfo: vi.fn().mockResolvedValue({ authenticated: true, connectionMode: 'http' }),
    } as unknown as IMemoryService;
}

function makeApiKeyService(credential: { type: 'apiKey' | 'oauth'; token: string } | null): ApiKeyService {
    return {
        getCredentials: vi.fn().mockResolvedValue(credential),
    } as unknown as ApiKeyService;
}

function makeProvider(apiKeyService: ApiKeyService): EnhancedSidebarProvider {
    const provider = new EnhancedSidebarProvider(
        { scheme: 'file', path: '/ext' } as never,
        makeMemoryService(),
        apiKeyService,
        undefined,
        undefined,
        undefined,
        undefined,
    );
    const posted: Array<{ type: string; data?: unknown }> = [];
    (provider as unknown as { _view: unknown })._view = {
        webview: { postMessage: vi.fn((msg: { type: string; data?: unknown }) => posted.push(msg)) },
    } as never;
    (provider as unknown as { __postedForTest: unknown }).__postedForTest = posted;
    return provider;
}

function getPosted(provider: EnhancedSidebarProvider): Array<{ type: string; data?: unknown }> {
    return (provider as unknown as { __postedForTest: Array<{ type: string; data?: unknown }> }).__postedForTest;
}

function makeFetchResponse(status: number, body: unknown, headers: Record<string, string> = {}) {
    return {
        ok: status >= 200 && status < 300,
        status,
        statusText: status === 429 ? 'Too Many Requests' : 'OK',
        headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
        json: vi.fn().mockResolvedValue(body),
    } as unknown as Response;
}

const fetchMock = vi.fn();

beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('EnhancedSidebarProvider.handleChatQuery → onasis-ai-router', () => {
    test('posts the synthesized answer from payload.response with X-API-Key auth', async () => {
        fetchMock.mockResolvedValue(makeFetchResponse(200, {
            response: 'Here is a synthesized answer about your memories.',
            usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
            onasis_metadata: { service: 'ai-chat' },
        }));

        const provider = makeProvider(makeApiKeyService({ type: 'apiKey', token: LANO_KEY }));
        await (provider as unknown as { handleChatQuery(q: string): Promise<void> }).handleChatQuery('what changed in the vendor chain?');

        // Request shape: router contract, single user message, no system prompt.
        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe('https://ai.vortexcore.app/api/v1/ai-chat');
        const headers = (init as RequestInit).headers as Record<string, string>;
        expect(headers['X-API-Key']).toBe(LANO_KEY);
        expect(headers['Authorization']).toBeUndefined();
        const body = JSON.parse((init as RequestInit).body as string);
        expect(body.use_case).toBe('memory-analysis');
        expect(body.messages).toEqual([{ role: 'user', content: 'what changed in the vendor chain?' }]);

        const posted = getPosted(provider);
        const response = posted.find((m) => m.type === 'chatResponse');
        expect(response).toBeDefined();
        expect((response!.data as { response: string }).response).toContain('Here is a synthesized answer');
        // Top-5 memories still shipped alongside the answer.
        expect((response!.data as { memories: unknown[] }).memories).toHaveLength(1);
        // Loading toggled on then off.
        expect(posted.filter((m) => m.type === 'chatLoading' && m.data === true)).toHaveLength(1);
        expect(posted.filter((m) => m.type === 'chatLoading' && m.data === false)).toHaveLength(1);
        // No error posted on the happy path.
        expect(posted.find((m) => m.type === 'chatError')).toBeUndefined();
    });

    test('accepts message.content as an alias when response is absent', async () => {
        fetchMock.mockResolvedValue(makeFetchResponse(200, { message: { role: 'assistant', content: 'alias content answer' } }));

        const provider = makeProvider(makeApiKeyService({ type: 'apiKey', token: LANO_KEY }));
        await (provider as unknown as { handleChatQuery(q: string): Promise<void> }).handleChatQuery('hi');

        const posted = getPosted(provider);
        const response = posted.find((m) => m.type === 'chatResponse');
        expect((response!.data as { response: string }).response).toBe('alias content answer');
    });

    test('uses Authorization: Bearer for OAuth JWT credentials', async () => {
        fetchMock.mockResolvedValue(makeFetchResponse(200, { response: 'ok' }));

        const provider = makeProvider(makeApiKeyService({ type: 'oauth', token: JWT }));
        await (provider as unknown as { handleChatQuery(q: string): Promise<void> }).handleChatQuery('hi');

        const [, init] = fetchMock.mock.calls[0];
        const headers = (init as RequestInit).headers as Record<string, string>;
        expect(headers['Authorization']).toBe(`Bearer ${JWT}`);
        expect(headers['X-API-Key']).toBeUndefined();
    });

    test('includes attached memory content inside the user message', async () => {
        fetchMock.mockResolvedValue(makeFetchResponse(200, { response: 'answer with context' }));

        const provider = makeProvider(makeApiKeyService({ type: 'apiKey', token: LANO_KEY }));
        await (provider as unknown as {
            handleChatQuery(q: { query: string; attachedMemories: Array<{ id: string; title: string; content: string }> }): Promise<void>;
        }).handleChatQuery({
            query: 'summarize this',
            attachedMemories: [{ id: 'a1', title: 'Design Notes', content: 'The sidebar chat should never go silent.' }],
        });

        const [, init] = fetchMock.mock.calls[0];
        const body = JSON.parse((init as RequestInit).body as string);
        expect(body.messages[0].content).toContain('summarize this');
        expect(body.messages[0].content).toContain('Design Notes');
        expect(body.messages[0].content).toContain('never go silent');

        const posted = getPosted(provider);
        const response = posted.find((m) => m.type === 'chatResponse');
        expect((response!.data as { attachedMemoryIds: string[] }).attachedMemoryIds).toEqual(['a1']);
    });

    test('falls back to plain memory search on network failure — never silent', async () => {
        fetchMock.mockRejectedValue(new TypeError('fetch failed'));

        const provider = makeProvider(makeApiKeyService({ type: 'apiKey', token: LANO_KEY }));
        await (provider as unknown as { handleChatQuery(q: string): Promise<void> }).handleChatQuery('what do you remember?');

        const posted = getPosted(provider);
        const response = posted.find((m) => m.type === 'chatResponse');
        expect(response).toBeDefined();
        const text = (response!.data as { response: string }).response;
        // formatChatResponse template output (degraded-but-working), not a raw error.
        expect(text).toContain('Found');
        expect(text).toContain('Vendor Chain Fix');
        expect(posted.find((m) => m.type === 'chatError')).toBeUndefined();
    });

    test('falls back on non-200 (5xx) responses without leaking the key', async () => {
        fetchMock.mockResolvedValue(makeFetchResponse(503, { error: { message: 'vendor down' } }));

        const provider = makeProvider(makeApiKeyService({ type: 'apiKey', token: LANO_KEY }));
        await (provider as unknown as { handleChatQuery(q: string): Promise<void> }).handleChatQuery('hi');

        const posted = getPosted(provider);
        const response = posted.find((m) => m.type === 'chatResponse');
        expect((response!.data as { response: string }).response).toContain('Found');
        // The key must never appear in any posted message.
        for (const msg of posted) {
            expect(JSON.stringify(msg)).not.toContain(LANO_KEY);
        }
    });

    test('falls back when no credential is stored — no prompt, no fetch', async () => {
        const provider = makeProvider(makeApiKeyService(null));
        await (provider as unknown as { handleChatQuery(q: string): Promise<void> }).handleChatQuery('hi');

        expect(fetchMock).not.toHaveBeenCalled();
        const posted = getPosted(provider);
        const response = posted.find((m) => m.type === 'chatResponse');
        expect((response!.data as { response: string }).response).toContain('Found');
    });

    test('429 surfaces Retry-After instead of retrying in a hot loop', async () => {
        fetchMock.mockResolvedValue(makeFetchResponse(429, { error: { code: 'RATE_LIMIT_EXCEEDED', retry_after_seconds: 37 } }, { 'Retry-After': '37' }));

        const provider = makeProvider(makeApiKeyService({ type: 'apiKey', token: LANO_KEY }));
        await (provider as unknown as { handleChatQuery(q: string): Promise<void> }).handleChatQuery('hi');

        // Exactly one request — no retry loop.
        expect(fetchMock).toHaveBeenCalledTimes(1);
        const posted = getPosted(provider);
        const response = posted.find((m) => m.type === 'chatResponse');
        const text = (response!.data as { response: string }).response;
        expect(text).toContain('Rate limit reached');
        expect(text).toContain('~37s');
        // Degraded-but-working: memory search results still shown.
        expect(text).toContain('Found');
    });

    test('429 without a Retry-After value still degrades gracefully', async () => {
        fetchMock.mockResolvedValue(makeFetchResponse(429, { error: { code: 'RATE_LIMIT_EXCEEDED' } }));

        const provider = makeProvider(makeApiKeyService({ type: 'apiKey', token: LANO_KEY }));
        await (provider as unknown as { handleChatQuery(q: string): Promise<void> }).handleChatQuery('hi');

        expect(fetchMock).toHaveBeenCalledTimes(1);
        const posted = getPosted(provider);
        const response = posted.find((m) => m.type === 'chatResponse');
        expect((response!.data as { response: string }).response).toContain('Rate limit reached');
    });

    test('posts a clear chatError when BOTH router and search fail', async () => {
        fetchMock.mockRejectedValue(new TypeError('fetch failed'));
        const memoryService = makeMemoryService();
        (memoryService.searchMemories as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('search backend down'));

        const provider = new EnhancedSidebarProvider(
            { scheme: 'file', path: '/ext' } as never,
            memoryService,
            makeApiKeyService({ type: 'apiKey', token: LANO_KEY }),
            undefined,
            undefined,
            undefined,
            undefined,
        );
        const posted: Array<{ type: string; data?: unknown }> = [];
        (provider as unknown as { _view: unknown })._view = {
            webview: { postMessage: vi.fn((msg: { type: string; data?: unknown }) => posted.push(msg)) },
        } as never;

        await (provider as unknown as { handleChatQuery(q: string): Promise<void> }).handleChatQuery('hi');

        const err = posted.find((m) => m.type === 'chatError');
        expect(err).toBeDefined();
        expect(JSON.stringify(err)).not.toContain(LANO_KEY);
    });

    test('uses the configured aiRouterUrl when the setting is present', async () => {
        const { workspace } = await import('vscode');
        (workspace.getConfiguration as ReturnType<typeof vi.fn>).mockReturnValue({
            get: (key: string, fallback?: unknown) => (key === 'aiRouterUrl' ? 'https://router.example.test/' : fallback),
        });
        fetchMock.mockResolvedValue(makeFetchResponse(200, { response: 'custom router answer' }));

        const provider = makeProvider(makeApiKeyService({ type: 'apiKey', token: LANO_KEY }));
        await (provider as unknown as { handleChatQuery(q: string): Promise<void> }).handleChatQuery('hi');

        const [url] = fetchMock.mock.calls[0];
        expect(url).toBe('https://router.example.test/api/v1/ai-chat');
    });
});

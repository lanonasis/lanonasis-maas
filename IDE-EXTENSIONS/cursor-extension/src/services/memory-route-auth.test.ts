import assert from 'node:assert/strict';
import test from 'node:test';
import {
    formatMemoryApiError,
    resolveCustomApiKeyAuth,
} from './memory-route-auth';

test('resolves null when no credential is stored', () => {
    assert.equal(resolveCustomApiKeyAuth(null), null);
});

test('resolves null when the active credential is an OAuth token', () => {
    assert.equal(
        resolveCustomApiKeyAuth({ type: 'oauth', token: 'eyJhbGciOiJSUzI1NiJ9.abc.def' }),
        null,
    );
});

test('resolves null for an empty or whitespace-only API key', () => {
    assert.equal(resolveCustomApiKeyAuth({ type: 'apiKey', token: '' }), null);
    assert.equal(resolveCustomApiKeyAuth({ type: 'apiKey', token: '   ' }), null);
});

test('sends platform keys (lano_*) via X-API-Key only, never Bearer', () => {
    const auth = resolveCustomApiKeyAuth({ type: 'apiKey', token: '  lano_test_123  ' });
    assert.notEqual(auth, null);
    if (!auth) return;

    assert.equal(auth.apiKey, 'lano_test_123');
    assert.equal(auth.headers['Authorization'], undefined);
    assert.deepEqual(auth.headers, { 'X-API-Key': 'lano_test_123' });
});

test('sends vx_ router keys via both Authorization and X-API-Key', () => {
    const auth = resolveCustomApiKeyAuth({ type: 'apiKey', token: 'vx_test_abc123' });
    assert.notEqual(auth, null);
    if (!auth) return;

    assert.equal(auth.apiKey, 'vx_test_abc123');
    assert.equal(auth.headers['Authorization'], 'vx_test_abc123');
    assert.equal(auth.headers['X-API-Key'], 'vx_test_abc123');
});

test('builds an error message from a JSON error envelope', () => {
    const body = JSON.stringify({ error: 'Access denied', message: 'You can only update your own memories' });
    const message = formatMemoryApiError('update', 403, body);

    assert.equal(message, 'Failed to update memory: 403 — Access denied: You can only update your own memories');
});

test('falls back to raw response text when the body is not JSON', () => {
    const message = formatMemoryApiError('delete', 500, '  <html>Bad gateway</html>  ');

    assert.equal(message, 'Failed to delete memory: 500 — <html>Bad gateway</html>');
});

test('provides helpful defaults for common status codes with empty bodies', () => {
    assert.equal(formatMemoryApiError('update', 401, ''), 'Failed to update memory: 401 — Invalid or missing API key');
    assert.equal(formatMemoryApiError('update', 403, ''), 'Failed to update memory: 403 — The API key does not have permission for this memory');
    assert.equal(formatMemoryApiError('delete', 404, ''), 'Failed to delete memory: 404 — Memory not found');
});

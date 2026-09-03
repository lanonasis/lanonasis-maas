import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveRouterCredential } from './sidebar-credential-wiring';

test('returns a trimmed stored credential token', async () => {
    const token = await resolveRouterCredential({
        getStoredCredentials: async () => ({ token: '  lano_test  ' }),
    });

    assert.equal(token, 'lano_test');
});

test('returns null when the credential source is unavailable or fails', async () => {
    assert.equal(await resolveRouterCredential(null), null);
    assert.equal(
        await resolveRouterCredential({
            getStoredCredentials: async () => {
                throw new Error('secure storage unavailable');
            },
        }),
        null,
    );
});

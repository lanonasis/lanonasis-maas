import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

// CREDENTIALS_FILE is resolved from homedir() at module load, so every test
// re-imports the module after pointing HOME at a fresh temp dir.
async function loadModule() {
  vi.resetModules();
  return import('../src/auth/credentials');
}

describe('credentials', () => {
  const originalHome = process.env.HOME;
  let homeDir: string;

  beforeEach(() => {
    homeDir = mkdtempSync(join(tmpdir(), 'lanonasis-credentials-'));
    process.env.HOME = homeDir;
  });

  afterEach(() => {
    process.env.HOME = originalHome;
    rmSync(homeDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  function writeRaw(creds: Record<string, unknown>) {
    mkdirSync(join(homeDir, '.lanonasis'), { recursive: true });
    writeFileSync(join(homeDir, '.lanonasis', 'credentials.json'), JSON.stringify(creds));
  }

  it('computes expires_at from expires_in when expires_at is the 0 placeholder', async () => {
    // Every call site (login, OTP login, refresh) passes expires_at: 0 with a
    // real expires_in. `??` does not replace 0, so the stored expiry was 0 and
    // every start treated the token as expired.
    const { saveCredentials, loadCredentials, isExpired } = await loadModule();
    const before = Date.now();
    saveCredentials({
      access_token: 'access',
      refresh_token: 'refresh',
      token_type: 'Bearer',
      expires_in: 3600,
      expires_at: 0,
      auth_method: 'oauth',
    });
    const stored = loadCredentials()!;
    expect(stored.expires_at).toBeGreaterThanOrEqual(before + 3600 * 1000);
    expect(stored.expires_at).toBeLessThanOrEqual(Date.now() + 3600 * 1000);
    expect(isExpired(stored)).toBe(false);
  });

  it('computes expires_at from expires_in when expires_at is absent', async () => {
    const { saveCredentials, loadCredentials } = await loadModule();
    const before = Date.now();
    saveCredentials({
      access_token: 'access',
      token_type: 'Bearer',
      expires_in: 120,
      auth_method: 'oauth',
    } as never);
    expect(loadCredentials()!.expires_at).toBeGreaterThanOrEqual(before + 120 * 1000);
  });

  it('preserves an explicit positive expires_at', async () => {
    const { saveCredentials, loadCredentials } = await loadModule();
    const explicit = Date.now() + 42_000;
    saveCredentials({
      access_token: 'access',
      token_type: 'Bearer',
      expires_at: explicit,
      expires_in: 3600,
      auth_method: 'oauth',
    });
    expect(loadCredentials()!.expires_at).toBe(explicit);
  });

  it('stores unknown expiry as 0 and does not treat it as expired', async () => {
    const { saveCredentials, loadCredentials, isExpired } = await loadModule();
    saveCredentials({
      access_token: 'access',
      token_type: 'Bearer',
      expires_at: 0,
      auth_method: 'oauth',
    });
    const stored = loadCredentials()!;
    expect(stored.expires_at).toBe(0);
    expect(isExpired(stored)).toBe(false);
  });

  it('treats a genuinely past expiry as expired', async () => {
    const { isExpired } = await loadModule();
    expect(
      isExpired({
        access_token: 'a',
        token_type: 'Bearer',
        expires_at: Date.now() - 1000,
        auth_method: 'oauth',
        created_at: 0,
        updated_at: 0,
      }),
    ).toBe(true);
  });

  it('does not refresh on every start for a legacy file saved with expires_at: 0', async () => {
    // Files written by <=1.1.0 all carry expires_at: 0. They must be usable
    // as-is (the server decides validity) instead of forcing a refresh.
    writeRaw({
      access_token: 'legacy-access',
      refresh_token: 'legacy-refresh',
      token_type: 'Bearer',
      expires_at: 0,
      auth_method: 'oauth',
      created_at: 1,
      updated_at: 1,
    });
    const { getValidToken } = await loadModule();
    const refreshFn = vi.fn();
    await expect(getValidToken(refreshFn)).resolves.toBe('legacy-access');
    expect(refreshFn).not.toHaveBeenCalled();
  });

  it('refreshes an expired token and stores a real expiry so the next start does not refresh again', async () => {
    writeRaw({
      access_token: 'old',
      refresh_token: 'r1',
      token_type: 'Bearer',
      expires_at: Date.now() - 10_000,
      auth_method: 'oauth',
      created_at: 1,
      updated_at: 1,
    });
    const { getValidToken, loadCredentials, isExpired } = await loadModule();
    const refreshFn = vi.fn(async () => ({ access_token: 'new', refresh_token: 'r2', expires_in: 3600 }));
    await expect(getValidToken(refreshFn)).resolves.toBe('new');
    expect(refreshFn).toHaveBeenCalledWith('r1');

    const stored = loadCredentials()!;
    expect(stored.refresh_token).toBe('r2');
    expect(stored.expires_at).toBeGreaterThan(Date.now());
    expect(isExpired(stored)).toBe(false);

    // Second start: no refresh.
    const again = vi.fn();
    await expect(getValidToken(again)).resolves.toBe('new');
    expect(again).not.toHaveBeenCalled();
  });

  it('says why when a refresh fails instead of silently going unauthenticated', async () => {
    writeRaw({
      access_token: 'old',
      refresh_token: 'r1',
      token_type: 'Bearer',
      expires_at: Date.now() - 10_000,
      auth_method: 'oauth',
      created_at: 1,
      updated_at: 1,
    });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { getValidToken } = await loadModule();
    const refreshFn = vi.fn(async () => {
      throw new Error('invalid_grant');
    });
    await expect(getValidToken(refreshFn)).resolves.toBeNull();
    const printed = warn.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(printed).toMatch(/refresh failed/i);
    expect(printed).toContain('invalid_grant');
    expect(printed).toMatch(/login/);
  });
});

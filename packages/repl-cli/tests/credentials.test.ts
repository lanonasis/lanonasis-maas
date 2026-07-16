import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

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
  });

  it('preserves explicit expires_at values, including zero', async () => {
    const { saveCredentials, loadCredentials } = await import('../src/auth/credentials');

    saveCredentials({
      access_token: 'access',
      refresh_token: 'refresh',
      expires_at: 0,
      token_type: 'Bearer',
      scope: 'memory:read'
    });

    expect(loadCredentials()?.expires_at).toBe(0);
  });
});

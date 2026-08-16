/**
 * Vendor-key login command regression tests.
 *
 * Covers the bug where explicit vendor-key auth inherited stale OAuth/JWT
 * session state and could keep showing the wrong cached account.
 */

import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import * as fsPromises from 'fs/promises';
import * as os from 'os';
import * as path from 'path';

const mockHealthGet = jest.fn();
const mockGetUserProfile = jest.fn();

jest.unstable_mockModule('../utils/api.js', () => ({
  apiClient: {
    get: mockHealthGet,
  },
  APIClient: class MockAPIClient {
    noExit = false;

    async getUserProfile() {
      return mockGetUserProfile();
    }
  },
}));

jest.unstable_mockModule('ora', () => ({
  default: () => ({
    start: () => ({
      succeed: jest.fn(),
      fail: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
      text: '',
    }),
  }),
}));

const { loginCommand } = await import('../commands/auth.js');
const { CLIConfig } = await import('../utils/config.js');

describe('loginCommand vendor-key path', () => {
  let tempHome: string;
  let previousHome: string | undefined;
  let previousSkipValidation: string | undefined;

  beforeEach(async () => {
    previousHome = process.env.HOME;
    previousSkipValidation = process.env.SKIP_SERVER_VALIDATION;

    tempHome = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'lanonasis-auth-command-'));
    process.env.HOME = tempHome;
    process.env.SKIP_SERVER_VALIDATION = 'true';

    mockHealthGet.mockReset();
    mockGetUserProfile.mockReset();
    mockHealthGet.mockResolvedValue({ status: 200, data: { status: 'ok' } });
    mockGetUserProfile.mockResolvedValue({
      id: 'user-admin-1',
      email: 'admin@lanonasis.com',
      name: 'Admin User',
      avatar_url: null,
      organization_id: 'org-admin',
      role: 'admin',
      plan: 'enterprise',
      provider: 'vendor_key',
      project_scope: 'lanonasis-maas',
      platform: 'cli',
      created_at: null,
      last_sign_in_at: null,
      metadata: { locale: null, timezone: null },
    });
  });

  afterEach(async () => {
    process.env.HOME = previousHome;
    if (previousSkipValidation === undefined) {
      delete process.env.SKIP_SERVER_VALIDATION;
    } else {
      process.env.SKIP_SERVER_VALIDATION = previousSkipValidation;
    }

    await fsPromises.rm(tempHome, { recursive: true, force: true });
  });

  it('clears stale bearer-session fields and refreshes the cached profile for explicit vendor-key auth', async () => {
    const staleConfig = new CLIConfig();
    await staleConfig.init();
    await staleConfig.setToken('stale-oauth-token');
    staleConfig.set('refresh_token', 'stale-refresh-token');
    staleConfig.set('token_expires_at', Date.now() + 60_000);
    staleConfig.set('tokenExpiry', Math.floor(Date.now() / 1000) + 60);
    staleConfig.set('authMethod', 'oauth');
    staleConfig.set('user', {
      email: 'info@lanonasis.com',
      organization_id: 'org-info',
      role: 'viewer',
      plan: 'free',
    });
    await staleConfig.save();

    await loginCommand({ vendorKey: 'pk_test_explicit_vendor_key' });

    const reloadedConfig = new CLIConfig();
    await reloadedConfig.init();

    expect(reloadedConfig.get('authMethod')).toBe('vendor_key');
    expect(reloadedConfig.getToken()).toBeUndefined();
    expect(reloadedConfig.get('refresh_token')).toBeUndefined();
    expect(reloadedConfig.get('token_expires_at')).toBeUndefined();
    expect(reloadedConfig.get('tokenExpiry')).toBeUndefined();

    const currentUser = await reloadedConfig.getCurrentUser();
    expect(currentUser?.email).toBe('admin@lanonasis.com');
    expect(currentUser?.organization_id).toBe('org-admin');
    expect(currentUser?.role).toBe('admin');
    expect(currentUser?.plan).toBe('enterprise');

    expect(mockGetUserProfile).toHaveBeenCalledTimes(1);
    expect(mockHealthGet).toHaveBeenCalledWith('/health');
    expect(await reloadedConfig.getVendorKeyAsync()).toBe('pk_test_explicit_vendor_key');
  });
});

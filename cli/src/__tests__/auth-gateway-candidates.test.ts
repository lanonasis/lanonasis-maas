/**
 * Regression tests for the auth-gateway candidate probe and the short-lived
 * validation cache.
 *
 * Bug 1: `lanonasis mcp start --transport stdio` died at startup with
 *   "Vendor key validation failed: connect ECONNREFUSED 127.0.0.1:4000"
 * because vendor-key validation probed a hardcoded `http://localhost:4000`
 * candidate. A refused local candidate must fall through to the production
 * candidate, must never become the reported reason while a gateway answered,
 * and must never be fatal.
 *
 * Bug 2: every CLI invocation paid a `/v1/auth/verify` + `/v1/auth/verify-api-key`
 * pair. API keys now go straight to the authoritative path, and a successful
 * validation is cached on disk for a few minutes so a fresh process (an editor
 * plugin shelling out per message) does not re-verify.
 *
 * No real credentials appear here: the fixtures are obvious non-secrets.
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import * as fsPromises from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { createHash } from 'crypto';

const mockAxios = {
  get: jest.fn(),
  post: jest.fn()
};

jest.unstable_mockModule('axios', () => ({
  default: mockAxios
}));

const { CLIConfig } = await import('../utils/config.js');
const { hashApiKey } = await import('../utils/hash-utils.js');
const oauthClientMock = await import('./mocks/oauth-client.js');

const PROD_BASE = 'https://auth.lanonasis.com';
const LOCAL_BASE = 'http://localhost:4000';

// Obvious non-secret fixtures.
const TEST_KEY = 'test-not-a-real-key-0001';
const OTHER_TEST_KEY = 'test-not-a-real-key-0002';

type PostArgs = [string, unknown, unknown];

function postedUrls(): string[] {
  return mockAxios.post.mock.calls.map(call => (call as PostArgs)[0]);
}

function connectionRefused(address: string): Error {
  const error = new Error(`connect ECONNREFUSED ${address}`);
  (error as Error & { code?: string }).code = 'ECONNREFUSED';
  return error;
}

function httpError(status: number, data: Record<string, unknown>): Error {
  const error = new Error(`Request failed with status code ${status}`);
  (error as Error & { response?: unknown }).response = { status, data };
  return error;
}

/**
 * Routes mocked POSTs by URL. Anything not listed is treated as refused, which
 * is what an unreachable candidate looks like in the wild.
 */
function routePosts(routes: Array<{ match: string; respond: () => unknown }>): void {
  mockAxios.post.mockImplementation(((url: string) => {
    const route = routes.find(candidate => url.startsWith(candidate.match));
    if (!route) {
      return Promise.reject(connectionRefused('127.0.0.1:9'));
    }
    const result = route.respond();
    return result instanceof Error ? Promise.reject(result) : Promise.resolve(result);
  }) as never);
}

describe('auth gateway candidate probing', () => {
  let configDir: string;
  let config: InstanceType<typeof CLIConfig>;
  let previousNodeEnv: string | undefined;
  let previousAuthBase: string | undefined;

  beforeEach(async () => {
    previousNodeEnv = process.env.NODE_ENV;
    previousAuthBase = process.env.AUTH_BASE;
    delete process.env.AUTH_BASE;
    delete process.env.LANONASIS_AUTH_URL;
    delete process.env.LANONASIS_FALLBACK_AUTH_BASE;
    delete process.env.LANONASIS_DISABLE_AUTH_CACHE;
    delete process.env.SKIP_SERVER_VALIDATION;
    process.env.SKIP_SERVICE_DISCOVERY = 'true';

    oauthClientMock.__resetMockApiKeyStorage();
    mockAxios.get.mockReset();
    mockAxios.post.mockReset();

    configDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'cli-auth-candidates-'));
    config = new CLIConfig();
    config.setConfigDirectory(configDir);
    await config.init();
    // Discovery is irrelevant to these tests; keep it off the wire entirely.
    (config as unknown as { discoverServices: () => Promise<void> }).discoverServices =
      jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
  });

  afterEach(async () => {
    if (previousNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previousNodeEnv;
    }
    if (previousAuthBase === undefined) {
      delete process.env.AUTH_BASE;
    } else {
      process.env.AUTH_BASE = previousAuthBase;
    }
    delete process.env.SKIP_SERVICE_DISCOVERY;
    await fsPromises.rm(configDir, { recursive: true, force: true });
  });

  function endpointsFor(pathname: string): string[] {
    return (config as unknown as { getAuthVerificationEndpoints: (p: string) => string[] })
      .getAuthVerificationEndpoints(pathname);
  }

  describe('candidate list', () => {
    it('does not probe localhost:4000 outside a dev environment', () => {
      process.env.NODE_ENV = 'production';

      const endpoints = endpointsFor('/v1/auth/verify-api-key');

      expect(endpoints).toContain(`${PROD_BASE}/v1/auth/verify-api-key`);
      expect(endpoints.some(endpoint => endpoint.includes('localhost:4000'))).toBe(false);
      expect(endpoints.some(endpoint => endpoint.includes('127.0.0.1'))).toBe(false);
    });

    it('probes localhost:4000 last in a dev environment', () => {
      process.env.NODE_ENV = 'development';

      const endpoints = endpointsFor('/v1/auth/verify-api-key');

      expect(endpoints[endpoints.length - 1]).toBe(`${LOCAL_BASE}/v1/auth/verify-api-key`);
      expect(endpoints.indexOf(`${PROD_BASE}/v1/auth/verify-api-key`))
        .toBeLessThan(endpoints.length - 1);
    });

    it('lets an explicitly configured auth URL win over the production default', () => {
      process.env.NODE_ENV = 'production';
      process.env.AUTH_BASE = 'http://localhost:4000/';

      const endpoints = endpointsFor('/v1/auth/verify');

      expect(endpoints[0]).toBe(`${LOCAL_BASE}/v1/auth/verify`);
      expect(endpoints).toContain(`${PROD_BASE}/v1/auth/verify`);
    });

    it('ignores a stale loopback auth_base left in discovered services', () => {
      process.env.NODE_ENV = 'production';
      config.set('discoveredServices', { auth_base: 'http://127.0.0.1:4000' });

      const endpoints = endpointsFor('/v1/auth/verify');

      expect(endpoints).toEqual([`${PROD_BASE}/v1/auth/verify`]);
    });
  });

  describe('fall-through behaviour (bug 1)', () => {
    it('falls through a refused local candidate to the remote candidate', async () => {
      process.env.NODE_ENV = 'development'; // puts localhost:4000 in the list
      config.set('discoveredServices', { auth_base: LOCAL_BASE }); // probed first

      routePosts([
        { match: `${LOCAL_BASE}/`, respond: () => connectionRefused('127.0.0.1:4000') },
        { match: `${PROD_BASE}/v1/auth/verify-api-key`, respond: () => ({ status: 200, data: { valid: true } }) }
      ]);

      const verification = await (config as unknown as {
        verifyVendorKeyWithAuthGateway: (key: string) => Promise<{ valid: boolean; endpoint?: string }>;
      }).verifyVendorKeyWithAuthGateway(TEST_KEY);

      expect(verification.valid).toBe(true);
      expect(verification.endpoint).toBe(`${PROD_BASE}/v1/auth/verify-api-key`);
      // Proof the local candidate really was attempted first and simply fell through.
      expect(postedUrls()[0]).toBe(`${LOCAL_BASE}/v1/auth/verify-api-key`);
    });

    it('does not let a refused local candidate take down setVendorKey', async () => {
      process.env.NODE_ENV = 'development';
      config.set('discoveredServices', { auth_base: LOCAL_BASE });

      routePosts([
        { match: `${LOCAL_BASE}/`, respond: () => connectionRefused('127.0.0.1:4000') },
        { match: `${PROD_BASE}/v1/auth/verify-api-key`, respond: () => ({ status: 200, data: { valid: true } }) }
      ]);

      await expect(config.setVendorKey(TEST_KEY)).resolves.toBeUndefined();
      expect(await config.getVendorKeyAsync()).toBe(TEST_KEY);
    });

    it('reports the gateway reason, never the local connection error', async () => {
      process.env.NODE_ENV = 'development';

      routePosts([
        {
          match: `${PROD_BASE}/v1/auth/verify-api-key`,
          respond: () => httpError(401, {
            valid: false,
            code: 'API_KEY_INVALID',
            message: 'The provided API key is not valid'
          })
        },
        { match: `${LOCAL_BASE}/`, respond: () => connectionRefused('127.0.0.1:4000') }
      ]);

      await expect(config.setVendorKey(TEST_KEY)).rejects.toThrow(/The provided API key is not valid/);
      await expect(config.setVendorKey(TEST_KEY)).rejects.not.toThrow(/ECONNREFUSED/);
    });

    it('treats "every candidate unreachable" as unknown, not as rejected', async () => {
      process.env.NODE_ENV = 'development';

      mockAxios.post.mockImplementation(((url: string) =>
        Promise.reject(connectionRefused(url.includes('localhost') ? '127.0.0.1:4000' : '203.0.113.1:443'))
      ) as never);

      const verification = await (config as unknown as {
        verifyVendorKeyWithAuthGateway: (key: string) => Promise<{ valid: boolean; unreachable?: boolean; reason?: string }>;
      }).verifyVendorKeyWithAuthGateway(TEST_KEY);

      expect(verification.valid).toBe(false);
      expect(verification.unreachable).toBe(true);
      expect(verification.reason).toMatch(/Could not reach any Lanonasis auth gateway/);
      // Actionable: it names what it tried and what to do.
      expect(verification.reason).toMatch(/AUTH_BASE/);

      // ...and that must not be fatal to the `mcp start` path.
      await expect(config.setVendorKey(TEST_KEY)).resolves.toBeUndefined();
    });

    it('still rejects a credential the gateway refuses', async () => {
      process.env.NODE_ENV = 'production';

      routePosts([
        {
          match: `${PROD_BASE}/v1/auth/verify-api-key`,
          respond: () => httpError(401, { valid: false, code: 'API_KEY_REVOKED', message: 'Key has been revoked' })
        }
      ]);

      await expect(config.setVendorKey(TEST_KEY)).rejects.toThrow(/revoked/i);
    });
  });

  describe('per-invocation auth cost (bug 2)', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
      routePosts([
        { match: `${PROD_BASE}/v1/auth/verify-api-key`, respond: () => ({ status: 200, data: { valid: true } }) },
        { match: `${PROD_BASE}/v1/auth/verify`, respond: () => httpError(401, { error: 'No token provided', code: 'AUTH_TOKEN_MISSING' }) }
      ]);
    });

    it('verifies an API key with a single request, not a verify/verify-api-key pair', async () => {
      process.env.SKIP_SERVER_VALIDATION = 'true';
      await config.setVendorKey(TEST_KEY);
      delete process.env.SKIP_SERVER_VALIDATION;
      mockAxios.post.mockClear();

      await expect(config.isAuthenticated()).resolves.toBe(true);

      expect(postedUrls()).toEqual([`${PROD_BASE}/v1/auth/verify-api-key`]);
    });

    it('serves a second, separate CLI process from the on-disk cache', async () => {
      process.env.SKIP_SERVER_VALIDATION = 'true';
      await config.setVendorKey(TEST_KEY);
      delete process.env.SKIP_SERVER_VALIDATION;
      mockAxios.post.mockClear();

      await expect(config.isAuthenticated()).resolves.toBe(true);
      expect(postedUrls().length).toBe(1);
      mockAxios.post.mockClear();

      // A brand-new CLIConfig over the same config dir models the next
      // `lanonasis memory search ...` invocation: no in-memory cache at all.
      const nextInvocation = new CLIConfig();
      nextInvocation.setConfigDirectory(configDir);
      await nextInvocation.init();
      (nextInvocation as unknown as { discoverServices: () => Promise<void> }).discoverServices =
        jest.fn<() => Promise<void>>().mockResolvedValue(undefined);

      await expect(nextInvocation.isAuthenticated()).resolves.toBe(true);
      expect(mockAxios.post).not.toHaveBeenCalled();
    });

    it('revalidates once the cached entry has expired', async () => {
      process.env.SKIP_SERVER_VALIDATION = 'true';
      await config.setVendorKey(TEST_KEY);
      delete process.env.SKIP_SERVER_VALIDATION;
      await config.isAuthenticated();

      const cacheFile = path.join(configDir, 'auth-cache.json');
      const entry = JSON.parse(await fsPromises.readFile(cacheFile, 'utf-8')) as { validatedAt: number };
      entry.validatedAt = Date.now() - (10 * 60 * 1000); // TTL is 5 minutes
      await fsPromises.writeFile(cacheFile, JSON.stringify(entry));

      const nextInvocation = new CLIConfig();
      nextInvocation.setConfigDirectory(configDir);
      await nextInvocation.init();
      (nextInvocation as unknown as { discoverServices: () => Promise<void> }).discoverServices =
        jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
      mockAxios.post.mockClear();

      await expect(nextInvocation.isAuthenticated()).resolves.toBe(true);
      expect(postedUrls()).toEqual([`${PROD_BASE}/v1/auth/verify-api-key`]);
    });

    it('misses the cache when the credential changes', async () => {
      process.env.SKIP_SERVER_VALIDATION = 'true';
      await config.setVendorKey(TEST_KEY);
      delete process.env.SKIP_SERVER_VALIDATION;
      await config.isAuthenticated();

      const hasFresh = (key: string): Promise<boolean> =>
        (config as unknown as { hasFreshValidation: (k: string, m: string) => Promise<boolean> })
          .hasFreshValidation(key, 'vendor_key');

      expect(await hasFresh(TEST_KEY)).toBe(true);
      expect(await hasFresh(OTHER_TEST_KEY)).toBe(false);
    });

    it('misses the cache when the auth base changes', async () => {
      process.env.SKIP_SERVER_VALIDATION = 'true';
      await config.setVendorKey(TEST_KEY);
      delete process.env.SKIP_SERVER_VALIDATION;
      await config.isAuthenticated();

      const hasFresh = (): Promise<boolean> =>
        (config as unknown as { hasFreshValidation: (k: string, m: string) => Promise<boolean> })
          .hasFreshValidation(TEST_KEY, 'vendor_key');

      expect(await hasFresh()).toBe(true);
      process.env.AUTH_BASE = 'https://auth.staging.example.com';
      expect(await hasFresh()).toBe(false);
    });

    it('drops the cached entry when the gateway rejects the credential', async () => {
      process.env.SKIP_SERVER_VALIDATION = 'true';
      await config.setVendorKey(TEST_KEY);
      delete process.env.SKIP_SERVER_VALIDATION;
      await expect(config.isAuthenticated()).resolves.toBe(true);

      routePosts([
        {
          match: `${PROD_BASE}/v1/auth/verify-api-key`,
          respond: () => httpError(401, { valid: false, code: 'API_KEY_INVALID', message: 'Invalid API key' })
        }
      ]);

      const nextInvocation = new CLIConfig();
      nextInvocation.setConfigDirectory(configDir);
      await nextInvocation.init();
      (nextInvocation as unknown as { discoverServices: () => Promise<void> }).discoverServices =
        jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
      await nextInvocation.invalidateAuthCache();

      await expect(nextInvocation.isAuthenticated()).resolves.toBe(false);
      await expect(fsPromises.readFile(path.join(configDir, 'auth-cache.json'), 'utf-8')).rejects.toThrow();
    });

    it('stores no credential material in the cache file', async () => {
      process.env.SKIP_SERVER_VALIDATION = 'true';
      await config.setVendorKey(TEST_KEY);
      delete process.env.SKIP_SERVER_VALIDATION;
      await config.isAuthenticated();

      const raw = await fsPromises.readFile(path.join(configDir, 'auth-cache.json'), 'utf-8');

      expect(raw).not.toContain(TEST_KEY);
      // Domain-separated: not reusable as the api-key lookup hash.
      expect(raw).not.toContain(hashApiKey(TEST_KEY));
      expect(JSON.parse(raw).fingerprint).toBe(
        createHash('sha256')
          .update(`lanonasis-cli/auth-validation-cache/v1|vendor_key|${TEST_KEY}`)
          .digest('hex')
      );
    });

    it('keeps credential-shaped text out of the reported reason', async () => {
      process.env.NODE_ENV = 'production';
      routePosts([
        {
          match: `${PROD_BASE}/v1/auth/verify-api-key`,
          respond: () => httpError(401, {
            valid: false,
            code: 'API_KEY_INVALID',
            message: 'API key rejected: unknown prefix. Expected "lano_" (received lano_abc123def456...)'
          })
        }
      ]);

      const verification = await (config as unknown as {
        verifyVendorKeyWithAuthGateway: (key: string) => Promise<{ reason?: string }>;
      }).verifyVendorKeyWithAuthGateway(TEST_KEY);

      expect(verification.reason).toContain('unknown prefix');
      expect(verification.reason).not.toContain('abc123def456');
      expect(verification.reason).toContain('(received ***)');
    });

    it('can be disabled with LANONASIS_DISABLE_AUTH_CACHE', async () => {
      process.env.LANONASIS_DISABLE_AUTH_CACHE = 'true';
      process.env.SKIP_SERVER_VALIDATION = 'true';
      await config.setVendorKey(TEST_KEY);
      delete process.env.SKIP_SERVER_VALIDATION;

      await expect(config.isAuthenticated()).resolves.toBe(true);
      await config.invalidateAuthCache();
      mockAxios.post.mockClear();
      await expect(config.isAuthenticated()).resolves.toBe(true);

      expect(postedUrls()).toEqual([`${PROD_BASE}/v1/auth/verify-api-key`]);
    });
  });
});

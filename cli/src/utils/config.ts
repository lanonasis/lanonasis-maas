import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { jwtDecode } from 'jwt-decode';
import { createHash, randomUUID } from 'crypto';
import type { ApiKeyStorage } from '@lanonasis/oauth-client';
import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig } from 'axios';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const packageJson = require('../../package.json') as { version: string };

interface UserProfile {
  email: string;
  organization_id: string;
  role: string;
  plan: string;
}

interface CLIConfigData {
  // Configuration versioning for migration detection
  version?: string;
  apiUrl?: string;
  token?: string | undefined;
  user?: UserProfile | undefined;
  lastUpdated?: string;
  // MCP configuration
  mcpServerPath?: string;
  mcpServerUrl?: string;
  mcpUseRemote?: boolean;
  mcpPreference?: 'local' | 'remote' | 'websocket' | 'auto';
  // Service Discovery
  discoveredServices?: {
    auth_base: string;
    memory_base: string;
    mcp_base?: string;
    mcp_ws_base: string;
    mcp_sse_base?: string;
    project_scope: string;
  };
  lastServiceDiscovery?: string;
  manualEndpointOverrides?: boolean;
  lastManualEndpointUpdate?: string;
  // Enhanced Authentication
  vendorKey?: string | undefined; // Stored via ApiKeyStorage (encrypted automatically)
  authMethod?: 'jwt' | 'vendor_key' | 'oauth' | 'oauth2' | undefined;
  refresh_token?: string | undefined;
  token_expires_at?: number | string | undefined;
  // Enhanced authentication persistence
  tokenExpiry?: number | undefined;
  lastValidated?: string | undefined;
  deviceId?: string;
  authFailureCount?: number;
  lastAuthFailure?: string | undefined;
  [key: string]: unknown; // Allow dynamic properties
}

type ServiceDiscoveryError = {
  code?: string;
  message?: string;
  response?: {
    status?: number;
    data?: {
      error?: string;
      message?: string;
      code?: string;
      valid?: boolean;
      reason?: string;
    };
  };
};

export type RemoteAuthVerification = {
  valid: boolean;
  method: 'token' | 'vendor_key' | 'none';
  endpoint?: string;
  reason?: string;
  /**
   * True when *no* auth gateway candidate could be reached at all (every probe
   * failed at the connection level). Callers must treat this as "unknown",
   * never as "rejected" — a refused local gateway is not a bad credential.
   */
  unreachable?: boolean;
  /** Endpoints that were probed, for actionable diagnostics. */
  attempted?: string[];
  /** HTTP status from the verification request, when one was received. */
  status?: number;
  /** True when the gateway rate-limited the probe (429) rather than rejecting it. */
  throttled?: boolean;
};

type AuthVerificationPath = '/v1/auth/verify' | '/v1/auth/verify-token' | '/v1/auth/verify-api-key';

type AuthProbeAttempt = {
  path: AuthVerificationPath;
  headers: Record<string, string>;
  body: Record<string, unknown>;
  /** `/v1/auth/verify` answers with a decoded `payload` instead of `valid: true`. */
  treatPayloadAsValid?: boolean;
};

type AuthProbeOutcome = {
  /** Set only when a candidate answered conclusively (valid or rejected). */
  verification?: RemoteAuthVerification;
  /** Reason derived from an actual gateway response. Preferred when reporting. */
  gatewayReason?: string;
  /** Reason derived from a connection-level failure. Reported only as a last resort. */
  transportReason?: string;
  /** True once any candidate produced an HTTP response. */
  reachedGateway: boolean;
  attempted: string[];
};

/**
 * On-disk record of a *successful* credential verification. Holds a salted
 * digest of the credential, never the credential itself. Rejections are never
 * persisted, so a revoked credential is re-checked as soon as the short TTL
 * lapses, and a rotated credential misses the cache immediately.
 */
type AuthValidationCacheEntry = {
  fingerprint: string;
  method: 'token' | 'vendor_key';
  authBase: string;
  /** Verification path that answered, used to order the next probe. */
  verifiedVia?: AuthVerificationPath;
  validatedAt: number;
};

export class CLIConfig {
  private configDir: string;
  private configPath: string;
  private config: CLIConfigData = {};
  private lockFile: string;
  private static readonly CONFIG_VERSION = '1.0.0';
  private authCheckCache: { isValid: boolean; timestamp: number } | null = null;
  private readonly AUTH_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private apiKeyStorage?: ApiKeyStorage;
  private vendorKeyCache?: string;
  private authDiskCache: AuthValidationCacheEntry | null = null;
  private authDiskCacheLoaded = false;
  private lastSuccessfulAuthPath?: AuthVerificationPath;

  private static readonly PRODUCTION_AUTH_BASE = 'https://auth.lanonasis.com';
  private static readonly LOCAL_AUTH_BASE = 'http://localhost:4000';
  /** Service-discovery cache lifetime; mirrors the stale-cache window already used on failure. */
  private static readonly SERVICE_DISCOVERY_TTL_MS = 24 * 60 * 60 * 1000;
  /** Domain-separation label so the cached digest is not an api-key lookup hash. */
  private static readonly AUTH_CACHE_FINGERPRINT_LABEL = 'lanonasis-cli/auth-validation-cache/v1';
  private static readonly UNREACHABLE_ERROR_CODES = [
    'ECONNREFUSED',
    'ECONNRESET',
    'ECONNABORTED',
    'ENOTFOUND',
    'ETIMEDOUT',
    'EAI_AGAIN',
    'EHOSTUNREACH',
    'ENETUNREACH',
    'EPIPE',
    'ERR_NETWORK',
    'ERR_CANCELED'
  ];
  // Per-process memoization: once vendor-key auth succeeds in this process,
  // skip all subsequent server verification calls for the lifetime of this
  // process. Vendor keys are long-lived by construction (opaque 45-char
  // string, sent as X-API-Key, no JWT, no client-side TTL).
  // Bound: at most 1 verify request per process run for vendor-key sessions.
  private vendorKeyVerifiedThisProcess: boolean | null = null;
  // Tracks why the last `isAuthenticated()` call returned false so that
  // the CLI can surface an accurate message (e.g. "rate-limited" instead of
  // "Authentication required").
  private lastAuthFailureReason: string | null = null;

  private isLegacyHashedCredential(value: unknown): value is string {
    return typeof value === 'string' && /^[a-f0-9]{64}$/i.test(value.trim());
  }

  private getLegacyHashedVendorKeyReason(): string {
    return 'Stored vendor key is in legacy hashed format. Run "lanonasis auth login --vendor-key <your-key>" to refresh secure storage.';
  }

  private normalizeOptionalString(value: unknown): string | undefined {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    }

    if (value === null || value === undefined) {
      return undefined;
    }

    return String(value);
  }

  private extractOrganizationId(source: Record<string, unknown>): string | undefined {
    return this.normalizeOptionalString(source.organization_id)
      ?? this.normalizeOptionalString(source.organizationId);
  }

  private buildUserProfile(
    source: Record<string, unknown>,
    existing?: UserProfile
  ): UserProfile | undefined {
    const email = this.normalizeOptionalString(source.email) ?? existing?.email ?? '';
    const organization_id = this.extractOrganizationId(source) ?? existing?.organization_id ?? '';
    const role = this.normalizeOptionalString(source.role) ?? existing?.role ?? '';
    const plan = this.normalizeOptionalString(source.plan) ?? existing?.plan ?? '';

    if (!email && !organization_id && !role && !plan) {
      return existing;
    }

    return {
      email,
      organization_id,
      role,
      plan
    };
  }

  constructor() {
    this.configDir = path.join(os.homedir(), '.maas');
    this.configPath = path.join(this.configDir, 'config.json');
    this.lockFile = path.join(this.configDir, 'config.lock');
  }

  private async getApiKeyStorage(): Promise<ApiKeyStorage> {
    if (!this.apiKeyStorage) {
      const { ApiKeyStorage: ApiKeyStorageCtor } = await import('@lanonasis/oauth-client');
      this.apiKeyStorage = new ApiKeyStorageCtor();
    }

    return this.apiKeyStorage;
  }

  /**
   * Overrides the configuration storage directory. Primarily used for tests.
   */
  setConfigDirectory(configDir: string): void {
    this.configDir = configDir;
    this.configPath = path.join(configDir, 'config.json');
    this.lockFile = path.join(configDir, 'config.lock');
    this.vendorKeyCache = undefined;
    this.authDiskCache = null;
    this.authDiskCacheLoaded = false;
  }

  /**
   * Exposes the current config path for tests and diagnostics.
   */
  getConfigPath(): string {
    return this.configPath;
  }

  async init(): Promise<void> {
    try {
      await fs.mkdir(this.configDir, { recursive: true });
      await this.load();
    } catch {
      // Config doesn't exist yet, that's ok
    }
  }

  async load(): Promise<void> {
    // Reset in-memory cache; disk state may have changed
    this.vendorKeyCache = undefined;
    this.authDiskCache = null;
    this.authDiskCacheLoaded = false;

    try {
      const data = await fs.readFile(this.configPath, 'utf-8');
      this.config = JSON.parse(data);

      // Handle version migration if needed
      await this.migrateConfigIfNeeded();
    } catch {
      this.config = {};
      // Set version for new config
      this.config.version = CLIConfig.CONFIG_VERSION;
    }
  }

  private async migrateConfigIfNeeded(): Promise<void> {
    const currentVersion = this.config.version;

    if (!currentVersion) {
      // Legacy config without version, migrate to current version
      this.config.version = CLIConfig.CONFIG_VERSION;

      // Perform any necessary migrations for legacy configs
      // For now, just ensure the version is set
      await this.save();
    } else if (currentVersion !== CLIConfig.CONFIG_VERSION) {
      // Future version migrations would go here
      // For now, just update the version
      this.config.version = CLIConfig.CONFIG_VERSION;
      await this.save();
    }
  }

  async save(): Promise<void> {
    await this.atomicSave();
  }

  async atomicSave(): Promise<void> {
    await fs.mkdir(this.configDir, { recursive: true });

    // Acquire file lock to prevent concurrent access
    const lockAcquired = await this.acquireLock();
    if (!lockAcquired) {
      throw new Error('Could not acquire configuration lock. Another process may be modifying the config.');
    }

    try {
      // Set version and update timestamp
      this.config.version = CLIConfig.CONFIG_VERSION;
      this.config.lastUpdated = new Date().toISOString();

      // Create temporary file with unique name
      const tempPath = `${this.configPath}.tmp.${randomUUID()}`;

      // Write to temporary file first
      await fs.writeFile(tempPath, JSON.stringify(this.config, null, 2), 'utf-8');

      // Atomic rename - this is the critical atomic operation
      await fs.rename(tempPath, this.configPath);
    } finally {
      // Always release the lock
      await this.releaseLock();
    }
  }

  async backupConfig(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(this.configDir, `config.backup.${timestamp}.json`);

    try {
      // Check if config exists before backing up
      await fs.access(this.configPath);
      await fs.copyFile(this.configPath, backupPath);
      return backupPath;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // Config doesn't exist, create empty backup
        await fs.writeFile(backupPath, JSON.stringify({}, null, 2));
        return backupPath;
      }
      throw error;
    }
  }

  private async acquireLock(timeoutMs: number = 5000): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      try {
        // Try to create lock file exclusively
        await fs.writeFile(this.lockFile, process.pid.toString(), { flag: 'wx' });
        return true;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
          // Lock file exists, check if process is still running
          try {
            const pidStr = await fs.readFile(this.lockFile, 'utf-8');
            const pid = parseInt(pidStr.trim());

            if (!isNaN(pid)) {
              try {
                // Check if process is still running (works on Unix-like systems)
                process.kill(pid, 0);
                // Process is running, wait and retry
                await new Promise(resolve => setTimeout(resolve, 100));
                continue;
              } catch {
                // Process is not running, remove stale lock
                await fs.unlink(this.lockFile).catch(() => { });
                continue;
              }
            }
          } catch {
            // Can't read lock file, remove it and retry
            await fs.unlink(this.lockFile).catch(() => { });
            continue;
          }
        } else {
          throw error;
        }
      }
    }

    return false;
  }

  private async releaseLock(): Promise<void> {
    try {
      await fs.unlink(this.lockFile);
    } catch {
      // Lock file might not exist or already removed, ignore
    }
  }

  getApiUrl(): string {
    const baseUrl = process.env.MEMORY_API_URL ||
      this.config.apiUrl ||
      'https://api.lanonasis.com';  // Primary REST API endpoint
    // Ensure we don't double-append /api/v1 - strip it if present since APIClient adds it
    return baseUrl.replace(/\/api\/v1\/?$/, '');
  }

  // Get API URLs with fallbacks - try multiple endpoints
  getApiUrlsWithFallbacks(): string[] {
    const primary = this.getApiUrl();
    const fallbacks = [
      'https://api.lanonasis.com',
      'https://mcp.lanonasis.com'
    ];

    // Remove duplicates and return primary first
    return [primary, ...fallbacks.filter(url => url !== primary)];
  }

  // Enhanced Service Discovery Integration
  /**
   * @param force Re-fetch even when a recent discovery result is cached.
   *   Pass true only for user-initiated discovery (`config discover`,
   *   `mcp diagnose`), never from a hot path.
   */
  async discoverServices(verbose: boolean = false, force: boolean = false): Promise<void> {
    // Honour manually configured endpoints — skip auto-discovery so we don't clobber them.
    if (this.config.manualEndpointOverrides) {
      return;
    }

    const isTestEnvironment = process.env.NODE_ENV === 'test';
    const forceDiscovery = force || process.env.FORCE_SERVICE_DISCOVERY === 'true';

    // Reuse a recent discovery result instead of re-fetching .well-known on
    // every single CLI invocation. The failure path already accepts a cached
    // result for 24h; honouring the same window on the success path removes a
    // network round trip from every command.
    if (!forceDiscovery && this.config.discoveredServices && this.config.lastServiceDiscovery) {
      const age = Date.now() - new Date(this.config.lastServiceDiscovery).getTime();
      if (Number.isFinite(age) && age >= 0 && age < CLIConfig.SERVICE_DISCOVERY_TTL_MS) {
        if (verbose) {
          console.log('\u2713 Using cached service endpoints (less than 24 hours old)');
        }
        return;
      }
    }

    if ((isTestEnvironment && !forceDiscovery) || process.env.SKIP_SERVICE_DISCOVERY === 'true') {
      if (!this.config.discoveredServices) {
        this.config.discoveredServices = {
          auth_base: 'https://auth.lanonasis.com',
          memory_base: 'https://api.lanonasis.com', // Primary REST API (Supabase Edge Functions)
          mcp_base: 'https://mcp.lanonasis.com/api/v1', // MCP protocol REST path
          mcp_ws_base: 'wss://mcp.lanonasis.com/ws',
          mcp_sse_base: 'https://mcp.lanonasis.com/api/v1/events',
          project_scope: 'lanonasis-maas'
        };
      }
      return;
    }

    // Try multiple discovery URLs with fallbacks
    const discoveryUrls = [
      'https://api.lanonasis.com/.well-known/onasis.json',
      'https://mcp.lanonasis.com/.well-known/onasis.json'
    ];

    let response: any = null;
    let lastError: any = null;

    // Use axios instead of fetch for consistency
    const axios = (await import('axios')).default;

    for (const discoveryUrl of discoveryUrls) {
      try {
        if (verbose) {
          console.log(`🔍 Discovering services from ${discoveryUrl}...`);
        }

        response = await axios.get(discoveryUrl, {
          timeout: 10000,
          maxRedirects: 5,
          proxy: false, // Bypass proxy to avoid redirect loops
          headers: {
            'User-Agent': `Lanonasis-CLI/${packageJson.version}`
          }
        });

        if (verbose) {
          console.log(`✓ Successfully discovered services from ${discoveryUrl}`);
        }

        break; // Success, exit loop
      } catch (err) {
        lastError = err;
        if (verbose) {
          console.log(`⚠️  Failed to discover from ${discoveryUrl}, trying next...`);
        }
        continue;
      }
    }

    if (!response) {
      throw lastError || new Error('All service discovery URLs failed');
    }

    try {

      const discovered = response.data;

      let authBase = discovered.auth?.base || discovered.auth?.login?.replace('/auth/login', '') || '';
      if (authBase.includes('localhost') || authBase.includes('127.0.0.1')) {
        authBase = 'https://auth.lanonasis.com';
      }

      // Memory base should be the REST API URL without /api/v1 suffix
      // The API client will append the path as needed
      const rawMemoryBase = discovered.endpoints?.http || 'https://api.lanonasis.com/api/v1';
      const memoryBase = rawMemoryBase.replace(/\/api\/v1\/?$/, '') || 'https://api.lanonasis.com';

      this.config.discoveredServices = {
        auth_base: authBase || 'https://auth.lanonasis.com',
        memory_base: memoryBase,
        mcp_base: `${memoryBase}/api/v1`, // Full path for MCP REST calls
        mcp_ws_base: discovered.endpoints?.websocket || 'wss://mcp.lanonasis.com/ws',
        mcp_sse_base: discovered.endpoints?.sse || `${memoryBase}/api/v1/events`,
        project_scope: 'lanonasis-maas'
      };
      this.config.apiUrl = memoryBase;

      this.config.lastServiceDiscovery = new Date().toISOString();
      await this.save();

      if (verbose) {
        console.log('✓ Service discovery completed successfully');
        console.log(`  Auth: ${this.config.discoveredServices.auth_base}`);
        console.log(`  MCP: ${this.config.discoveredServices.mcp_base}`);
        console.log(`  WebSocket: ${this.config.discoveredServices.mcp_ws_base}`);
      }

    } catch (error: unknown) {
      const normalizedError = this.normalizeServiceError(error);
      await this.handleServiceDiscoveryFailure(normalizedError, verbose);
    }
  }

  private normalizeServiceError(error: unknown): ServiceDiscoveryError {
    if (error && typeof error === 'object') {
      if (error instanceof Error) {
        return {
          ...(error as ServiceDiscoveryError),
          message: error.message
        };
      }
      return error as ServiceDiscoveryError;
    }

    return {
      message: typeof error === 'string' ? error : JSON.stringify(error)
    };
  }

  private async handleServiceDiscoveryFailure(error: ServiceDiscoveryError, verbose: boolean): Promise<void> {
    const errorType = this.categorizeServiceDiscoveryError(error);

    if (verbose || process.env.CLI_VERBOSE === 'true') {
      console.log('⚠️  Service discovery failed, using cached/fallback endpoints');

      switch (errorType) {
        case 'network_error':
          console.log('   Reason: Network connection failed');
          console.log('   This is normal when offline or behind restrictive firewalls');
          break;
        case 'timeout':
          console.log('   Reason: Request timed out');
          console.log('   The discovery service may be temporarily slow');
          break;
        case 'server_error':
          console.log('   Reason: Discovery service returned an error');
          console.log('   The service may be temporarily unavailable');
          break;
        case 'invalid_response':
          console.log('   Reason: Invalid response format from discovery service');
          console.log('   Using known working endpoints instead');
          break;
        default:
          console.log(`   Reason: ${error.message || 'Unknown error'}`);
      }
    }

    if (this.config.discoveredServices && this.config.lastServiceDiscovery) {
      const lastDiscovery = new Date(this.config.lastServiceDiscovery);
      const hoursSinceDiscovery = (Date.now() - lastDiscovery.getTime()) / (1000 * 60 * 60);

      if (hoursSinceDiscovery < 24) {
        if (verbose) {
          console.log('✓ Using cached service endpoints (less than 24 hours old)');
        }
        return;
      }
    }

    const fallback = this.resolveFallbackEndpoints();
    this.config.discoveredServices = {
      ...fallback.endpoints,
      project_scope: 'lanonasis-maas'
    };
    this.config.apiUrl = fallback.endpoints.memory_base;

    await this.save();
    this.logFallbackUsage(fallback.source, this.config.discoveredServices);

    if (verbose) {
      console.log('✓ Using fallback service endpoints');
      console.log(`   Source: ${fallback.source === 'environment' ? 'environment overrides' : 'built-in defaults'}`);
    }
  }

  private categorizeServiceDiscoveryError(error: ServiceDiscoveryError): 'network_error' | 'timeout' | 'server_error' | 'invalid_response' | 'unknown' {
    if (error.code) {
      switch (error.code) {
        case 'ECONNREFUSED':
        case 'ENOTFOUND':
        case 'ECONNRESET':
        case 'ENETUNREACH':
          return 'network_error';
        case 'ETIMEDOUT':
          return 'timeout';
      }
    }

    if ((error.response?.status ?? 0) >= 500) {
      return 'server_error';
    }

    if (error.response?.status === 404) {
      return 'invalid_response';
    }

    const message = error.message?.toLowerCase() || '';
    if (message.includes('timeout')) {
      return 'timeout';
    }
    if (message.includes('network') || message.includes('connection')) {
      return 'network_error';
    }

    return 'unknown';
  }

  /**
   * Single source of truth for "is this plausibly a dev machine running the
   * stack locally". Used both for fallback endpoint defaults and for deciding
   * whether `http://localhost:4000` is worth probing at all.
   */
  private isDevEnvironment(): boolean {
    const nodeEnv = (process.env.NODE_ENV ?? '').toLowerCase();
    return nodeEnv === 'development' || nodeEnv === 'test';
  }

  private resolveFallbackEndpoints(): {
    endpoints: {
      auth_base: string;
      memory_base: string;
      mcp_base: string;
      mcp_ws_base: string;
      mcp_sse_base: string;
    };
    source: 'environment' | 'default';
  } {
    const envAuthBase = process.env.LANONASIS_FALLBACK_AUTH_BASE ?? process.env.AUTH_BASE;
    const envMemoryBase = process.env.LANONASIS_FALLBACK_MEMORY_BASE ?? process.env.MEMORY_BASE;
    const envMcpBase = process.env.LANONASIS_FALLBACK_MCP_BASE ?? process.env.MCP_BASE;
    const envMcpWsBase = process.env.LANONASIS_FALLBACK_MCP_WS_BASE ?? process.env.MCP_WS_BASE;
    const envMcpSseBase = process.env.LANONASIS_FALLBACK_MCP_SSE_BASE ?? process.env.MCP_SSE_BASE;

    const hasEnvOverrides = Boolean(envAuthBase || envMemoryBase || envMcpBase || envMcpWsBase || envMcpSseBase);
    const isDevEnvironment = this.isDevEnvironment();

    const defaultAuthBase = isDevEnvironment ? 'http://localhost:4000' : 'https://auth.lanonasis.com';
    const defaultMemoryBase = isDevEnvironment ? 'http://localhost:4000' : 'https://api.lanonasis.com'; // Primary REST API (Supabase Edge Functions)
    const defaultMcpBase = isDevEnvironment ? 'http://localhost:4100/api/v1' : 'https://mcp.lanonasis.com/api/v1'; // MCP protocol REST path
    const defaultMcpWsBase = isDevEnvironment ? 'ws://localhost:4100/ws' : 'wss://mcp.lanonasis.com/ws';
    const defaultMcpSseBase = isDevEnvironment ? 'http://localhost:4100/api/v1/events' : 'https://mcp.lanonasis.com/api/v1/events';

    const endpoints = {
      auth_base: envAuthBase ?? defaultAuthBase,
      memory_base: envMemoryBase ?? defaultMemoryBase,
      mcp_base: envMcpBase ?? defaultMcpBase,
      mcp_ws_base: envMcpWsBase ?? defaultMcpWsBase,
      mcp_sse_base: envMcpSseBase ?? defaultMcpSseBase
    };

    return {
      endpoints,
      source: hasEnvOverrides ? 'environment' : 'default'
    };
  }

  private logFallbackUsage(
    source: 'environment' | 'default',
    endpoints: {
      auth_base: string;
      memory_base: string;
      mcp_base?: string;
      mcp_ws_base: string;
      mcp_sse_base?: string;
    }
  ): void {
    const summary = {
      auth: endpoints.auth_base,
      mcp: endpoints.mcp_base,
      websocket: endpoints.mcp_ws_base,
      sse: endpoints.mcp_sse_base,
      source
    };

    const message = `Service discovery fallback activated using ${source === 'environment' ? 'environment overrides' : 'built-in defaults'}`;
    console.warn(`⚠️  ${message}`);
    console.info('📊 service_discovery_fallback', summary);

    if (typeof process.emitWarning === 'function') {
      process.emitWarning(message, 'ServiceDiscoveryFallback');
    }
  }

  private async pingAuthHealth(
    axiosInstance: AxiosInstance,
    authBase: string,
    headers: Record<string, string>,
    options: { timeout?: number; proxy?: boolean } = {}
  ): Promise<void> {
    const normalizedBase = authBase.replace(/\/$/, '');
    const endpoints = [
      `${normalizedBase}/health`,
      `${normalizedBase}/api/v1/health`
    ];

    let lastError: unknown;
    for (const endpoint of endpoints) {
      try {
        const requestConfig: AxiosRequestConfig = {
          headers,
          timeout: options.timeout ?? 10000
        };
        if (options.proxy === false) {
          requestConfig.proxy = false;
        }
        await axiosInstance.get(endpoint, requestConfig);
        return;
      } catch (error) {
        lastError = error;
      }
    }

    if (lastError instanceof Error) {
      throw lastError;
    }
    throw new Error('Auth health endpoints unreachable');
  }

  /**
   * An auth base the operator configured explicitly — via `AUTH_BASE` /
   * `LANONASIS_AUTH_URL` / `LANONASIS_FALLBACK_AUTH_BASE`, or via
   * `config set` (which sets `manualEndpointOverrides`). This wins over both
   * the production default and the local dev gateway, including when it points
   * at localhost: if someone asked for a local gateway, probe it.
   */
  private getExplicitAuthBase(): string | undefined {
    const fromEnv = process.env.LANONASIS_AUTH_URL
      ?? process.env.LANONASIS_FALLBACK_AUTH_BASE
      ?? process.env.AUTH_BASE;

    if (fromEnv) {
      return this.normalizeOptionalString(fromEnv);
    }

    if (this.config.manualEndpointOverrides) {
      return this.normalizeOptionalString(this.config.discoveredServices?.auth_base);
    }

    return undefined;
  }

  private isLoopbackUrl(url: string): boolean {
    return /^[a-z][a-z0-9+.-]*:\/\/(?:localhost|127(?:\.\d{1,3}){3}|\[::1\]|0\.0\.0\.0)(?::\d+)?(?:\/|$)/i
      .test(url.trim());
  }

  /**
   * Ordered, de-duplicated list of auth gateway bases to probe.
   *
   * Order matters:
   *   1. an explicitly configured base (env or `config set`),
   *   2. whatever service discovery returned (unless it is a loopback address
   *      left over from a dev session),
   *   3. the production gateway,
   *   4. `http://localhost:4000` — **only** in a dev environment.
   *
   * Nothing listens on port 4000 on a normal user machine. Probing it
   * unconditionally used to turn an instant ECONNREFUSED into the reported
   * failure reason (masking the gateway's real answer) and, through
   * `setVendorKey`, into a fatal `mcp start` error.
   */
  private getAuthCandidateBases(): string[] {
    const candidates: string[] = [];
    const add = (url: string | undefined): void => {
      if (!url) {
        return;
      }
      const normalized = url.trim().replace(/\/+$/, '');
      if (normalized && !candidates.includes(normalized)) {
        candidates.push(normalized);
      }
    };

    const isDev = this.isDevEnvironment();

    add(this.getExplicitAuthBase());

    const discovered = this.normalizeOptionalString(this.config.discoveredServices?.auth_base);
    if (discovered && (isDev || !this.isLoopbackUrl(discovered))) {
      add(discovered);
    }

    add(CLIConfig.PRODUCTION_AUTH_BASE);

    if (isDev) {
      add(CLIConfig.LOCAL_AUTH_BASE);
    }

    return candidates;
  }

  private getAuthVerificationEndpoints(pathname: AuthVerificationPath): string[] {
    return this.getAuthCandidateBases().map(base => `${base}${pathname}`);
  }

  /**
   * True when the request never reached an auth gateway (DNS/connect/timeout),
   * as opposed to reaching one and being told "no".
   */
  private isUnreachableError(error: ServiceDiscoveryError): boolean {
    if (typeof error.response?.status === 'number') {
      return false;
    }

    if (error.code && CLIConfig.UNREACHABLE_ERROR_CODES.includes(error.code)) {
      return true;
    }

    // Node collapses dual-stack connect failures into a single message such as
    // "connect ECONNREFUSED 127.0.0.1:4000; ::1:4000", sometimes with no `code`.
    const message = (error.message ?? '').toUpperCase();
    return CLIConfig.UNREACHABLE_ERROR_CODES.some(code => message.includes(code));
  }

  /**
   * Removes anything credential-shaped from a gateway-supplied message before
   * it reaches a console line or an error the user may paste into an issue.
   */
  private redactCredentials(text: string): string {
    return text
      .replace(/\(received[^)]*\)/gi, '(received ***)')
      .replace(/\b(lano|lns|sk|pk|onasis)_[A-Za-z0-9._-]+/gi, '$1_***')
      .replace(/\b[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g, '***.***.***');
  }

  private extractAuthErrorMessage(payload: unknown): string | undefined {
    if (!payload || typeof payload !== 'object') {
      return undefined;
    }

    const data = payload as Record<string, unknown>;
    const fields = ['message', 'error', 'reason', 'code'];
    for (const field of fields) {
      const value = data[field];
      if (typeof value === 'string' && value.trim().length > 0) {
        return value;
      }
    }

    return undefined;
  }

  /**
   * Probes one verification path across every auth candidate.
   *
   * Fall-through rules:
   *   - a refused/unreachable candidate is NEVER fatal and never becomes the
   *     reported reason while any other candidate or path remains;
   *   - an explicit rejection from a gateway that answered IS conclusive and
   *     stops the walk immediately, so the user sees the real reason;
   *   - reasons from a real HTTP response always outrank connection errors.
   */
  private async probeAuthEndpoints(
    attempt: AuthProbeAttempt,
    method: 'token' | 'vendor_key'
  ): Promise<AuthProbeOutcome> {
    const outcome: AuthProbeOutcome = { reachedGateway: false, attempted: [] };

    for (const endpoint of this.getAuthVerificationEndpoints(attempt.path)) {
      outcome.attempted.push(endpoint);

      try {
        const response = await axios.post(endpoint, attempt.body, {
          headers: attempt.headers,
          timeout: 5000,
          proxy: false
        });

        outcome.reachedGateway = true;
        const payload = (response?.data ?? {}) as Record<string, unknown>;

        if (payload.valid === true || (attempt.treatPayloadAsValid && Boolean(payload.payload))) {
          outcome.verification = { valid: true, method, endpoint };
          return outcome;
        }

        if (payload.valid === false) {
          outcome.verification = {
            valid: false,
            method,
            endpoint,
            reason: this.extractAuthErrorMessage(payload)
              || (method === 'token' ? 'Token is invalid' : 'API key is invalid')
          };
          return outcome;
        }

        // Reached a gateway, but it answered neither valid nor invalid.
        outcome.gatewayReason = outcome.gatewayReason
          ?? this.extractAuthErrorMessage(payload)
          ?? `Auth gateway returned an unexpected response from ${endpoint}`;
      } catch (error: unknown) {
        const normalizedError = this.normalizeServiceError(error);

        if (this.isUnreachableError(normalizedError)) {
          outcome.transportReason = outcome.transportReason
            ?? (normalizedError.message || 'Connection failed');
          continue;
        }

        const status = normalizedError.response?.status;
        // A 5xx means the gateway (or a proxy in front of it) failed; it says
        // nothing about the credential, so treat it like an unreachable candidate.
        if (typeof status === 'number' && status >= 500) {
          outcome.transportReason = outcome.transportReason
            ?? (normalizedError.message || `Auth gateway returned ${status}`);
          continue;
        }

        outcome.reachedGateway = true;
        const responsePayload = normalizedError.response?.data as Record<string, unknown> | undefined;
        const responseCode = typeof responsePayload?.code === 'string' ? responsePayload.code : undefined;
        const reason = this.extractAuthErrorMessage(responsePayload) || normalizedError.message;

        // `AUTH_TOKEN_MISSING` means "wrong path for this credential kind",
        // not "bad credential" — keep walking.
        if (
          (status === 401 || status === 403) &&
          responseCode &&
          responseCode !== 'AUTH_TOKEN_MISSING'
        ) {
          outcome.verification = {
            valid: false,
            method,
            endpoint,
            reason: reason || 'Credential was rejected by the auth gateway'
          };
          return outcome;
        }

        if (reason) {
          outcome.gatewayReason = outcome.gatewayReason ?? reason;
        }

        // 429 rate-limit — stop probing and report a throttle rather than a
        // rejection, so callers back off instead of discarding the credential.
        if (status === 429) {
          outcome.verification = {
            valid: false,
            method,
            endpoint,
            reason: reason || 'Authentication service rate-limited',
            status: 429,
            throttled: true
          };
          return outcome;
        }
      }
    }

    return outcome;
  }

  /**
   * Walks the ordered verification attempts and aggregates their outcomes into
   * a single verdict. Only reports failure once EVERY candidate of EVERY
   * attempt has been exhausted, and distinguishes "rejected" from "could not
   * reach any gateway".
   */
  private async runAuthProbes(
    method: 'token' | 'vendor_key',
    attempts: AuthProbeAttempt[],
    fallbackReason: string
  ): Promise<RemoteAuthVerification> {
    const attempted: string[] = [];
    let reachedGateway = false;
    let gatewayReason: string | undefined;
    let transportReason: string | undefined;

    for (const attempt of attempts) {
      const outcome = await this.probeAuthEndpoints(attempt, method);
      attempted.push(...outcome.attempted);
      reachedGateway = reachedGateway || outcome.reachedGateway;
      gatewayReason = gatewayReason ?? outcome.gatewayReason;
      transportReason = transportReason ?? outcome.transportReason;

      if (outcome.verification) {
        const verification = { ...outcome.verification, attempted };
        if (verification.reason) {
          verification.reason = this.redactCredentials(verification.reason);
        }
        if (verification.valid) {
          this.lastSuccessfulAuthPath = attempt.path;
        }
        return verification;
      }
    }

    if (!reachedGateway) {
      const bases = this.getAuthCandidateBases().join(', ');
      return {
        valid: false,
        method,
        unreachable: true,
        attempted,
        reason: `Could not reach any Lanonasis auth gateway (${transportReason ?? 'connection failed'}). `
          + `Tried: ${bases}. Check your network connection, or point AUTH_BASE at a reachable auth gateway.`
      };
    }

    return {
      valid: false,
      method,
      attempted,
      reason: this.redactCredentials(gatewayReason ?? fallbackReason)
    };
  }

  /**
   * Orders verification attempts so the path that worked last time goes first.
   */
  private orderAuthAttempts(attempts: AuthProbeAttempt[]): AuthProbeAttempt[] {
    const preferred = this.lastSuccessfulAuthPath;
    if (!preferred) {
      return attempts;
    }
    const first = attempts.filter(attempt => attempt.path === preferred);
    if (first.length === 0) {
      return attempts;
    }
    return [...first, ...attempts.filter(attempt => attempt.path !== preferred)];
  }

  private async verifyTokenWithAuthGateway(token: string): Promise<RemoteAuthVerification> {
    const attempts: AuthProbeAttempt[] = [
      // Primary check (required by auth contract): /v1/auth/verify
      {
        path: '/v1/auth/verify',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Project-Scope': 'lanonasis-maas'
        },
        body: {},
        treatPayloadAsValid: true
      },
      // Fallback for deployments where proxy layers strip Authorization headers.
      {
        path: '/v1/auth/verify-token',
        headers: {
          'Content-Type': 'application/json',
          'X-Project-Scope': 'lanonasis-maas'
        },
        body: { token }
      }
    ];

    return this.runAuthProbes('token', this.orderAuthAttempts(attempts), 'Unable to verify token with auth gateway');
  }

  private async verifyVendorKeyWithAuthGateway(vendorKey: string): Promise<RemoteAuthVerification> {
    // Detect whether the stored "vendor key" is actually an OAuth/JWT access token
    // (3-part base64url string separated by dots). OAuth tokens must be verified via the
    // Bearer token path (/v1/auth/verify-token), not as API keys (/v1/auth/verify-api-key),
    // because they are not stored in the api_keys table.
    const isJwtFormat = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(vendorKey.trim());

    if (isJwtFormat) {
      // Delegate to token verification — the auth gateway's UAI router accepts Bearer tokens
      // on /v1/auth/verify (requireAuth) and /v1/auth/verify-token (public, body-based).
      return this.verifyTokenWithAuthGateway(vendorKey);
    }

    const headers: Record<string, string> = {
      'X-API-Key': vendorKey,
      'X-Auth-Method': 'vendor_key',
      'X-Project-Scope': 'lanonasis-maas'
    };

    // API keys are authoritative on /v1/auth/verify-api-key. /v1/auth/verify
    // requires a Bearer token and answers `401 AUTH_TOKEN_MISSING` for an API
    // key, so probing it first cost every single CLI invocation an extra
    // round trip. It stays as a fallback for deployments that only expose
    // /verify (or that forward custom auth headers to it).
    const attempts: AuthProbeAttempt[] = [
      { path: '/v1/auth/verify-api-key', headers, body: {} },
      { path: '/v1/auth/verify', headers, body: {}, treatPayloadAsValid: true }
    ];

    return this.runAuthProbes('vendor_key', this.orderAuthAttempts(attempts), 'Unable to verify API key with auth gateway');
  }

  async verifyCurrentCredentialsWithServer(): Promise<RemoteAuthVerification> {
    await this.refreshTokenIfNeeded();
    await this.discoverServices();

    const token = this.getToken();
    const vendorKey = await this.getVendorKeyAsync();

    if (this.config.authMethod === 'vendor_key' && this.isLegacyHashedCredential(vendorKey)) {
      return {
        valid: false,
        method: 'vendor_key',
        reason: this.getLegacyHashedVendorKeyReason()
      };
    }

    if (this.config.authMethod === 'vendor_key' && vendorKey) {
      return this.verifyVendorKeyWithAuthGateway(vendorKey);
    }

    if (token) {
      return this.verifyTokenWithAuthGateway(token);
    }

    if (vendorKey) {
      return this.verifyVendorKeyWithAuthGateway(vendorKey);
    }

    return {
      valid: false,
      method: 'none',
      reason: 'No credentials configured'
    };
  }

  // Manual endpoint override functionality
  async setManualEndpoints(endpoints: Partial<CLIConfigData['discoveredServices']>): Promise<void> {
    if (!this.config.discoveredServices) {
      // Initialize with defaults first
      await this.discoverServices();
    }

    const currentServices = this.config.discoveredServices ?? {
      auth_base: 'https://auth.lanonasis.com',
      memory_base: 'https://api.lanonasis.com', // Primary REST API (Supabase Edge Functions)
      mcp_base: 'https://mcp.lanonasis.com/api/v1', // MCP protocol REST path
      mcp_ws_base: 'wss://mcp.lanonasis.com/ws',
      mcp_sse_base: 'https://mcp.lanonasis.com/api/v1/events',
      project_scope: 'lanonasis-maas'
    };

    // Merge manual overrides with existing endpoints
    this.config.discoveredServices = {
      ...currentServices,
      ...endpoints
    };

    // Mark as manually configured
    this.config.manualEndpointOverrides = true;
    this.config.lastManualEndpointUpdate = new Date().toISOString();

    await this.save();
  }

  hasManualEndpointOverrides(): boolean {
    return !!this.config.manualEndpointOverrides;
  }

  /**
   * Path of the short-lived, on-disk record of the last successful credential
   * verification. Derived from `configDir` on every call so that tests (and
   * `setConfigDirectory`) that relocate the config also relocate the cache.
   */
  private getAuthCacheFile(): string {
    return path.join(this.configDir, 'auth-cache.json');
  }

  private isAuthDiskCacheEnabled(): boolean {
    return process.env.LANONASIS_DISABLE_AUTH_CACHE !== 'true';
  }

  /**
   * Salted digest of a credential. Deliberately domain-separated from
   * `hashApiKey()` so this value is useless as an api-key lookup hash, and so
   * it can never be mistaken for the legacy hashed-credential format.
   */
  private credentialFingerprint(credential: string, method: 'token' | 'vendor_key'): string {
    return createHash('sha256')
      .update(`${CLIConfig.AUTH_CACHE_FINGERPRINT_LABEL}|${method}|${credential}`)
      .digest('hex');
  }

  private async readAuthValidationCache(): Promise<AuthValidationCacheEntry | null> {
    if (this.authDiskCacheLoaded) {
      return this.authDiskCache;
    }
    this.authDiskCacheLoaded = true;

    try {
      const raw = await fs.readFile(this.getAuthCacheFile(), 'utf-8');
      const parsed = JSON.parse(raw) as AuthValidationCacheEntry;
      this.authDiskCache = parsed
        && typeof parsed.fingerprint === 'string'
        && typeof parsed.validatedAt === 'number'
        ? parsed
        : null;
    } catch {
      this.authDiskCache = null;
    }

    if (this.authDiskCache?.verifiedVia && !this.lastSuccessfulAuthPath) {
      this.lastSuccessfulAuthPath = this.authDiskCache.verifiedVia;
    }

    return this.authDiskCache;
  }

  /**
   * True when `credential` was verified successfully against the same auth base
   * within `AUTH_CACHE_TTL`.
   *
   * This is what keeps a shell-out-per-keystroke integration from paying an
   * auth round trip every time. It cannot resurrect a bad credential: only
   * successes are ever written, the TTL is minutes, a rotated credential yields
   * a different fingerprint, and a changed auth base invalidates the entry.
   */
  private async hasFreshValidation(credential: string, method: 'token' | 'vendor_key'): Promise<boolean> {
    if (!this.isAuthDiskCacheEnabled()) {
      return false;
    }

    const entry = await this.readAuthValidationCache();
    if (!entry || entry.method !== method) {
      return false;
    }

    if (entry.authBase !== (this.getAuthCandidateBases()[0] ?? '')) {
      return false;
    }

    const age = Date.now() - entry.validatedAt;
    if (!Number.isFinite(age) || age < 0 || age >= this.AUTH_CACHE_TTL) {
      return false;
    }

    return entry.fingerprint === this.credentialFingerprint(credential, method);
  }

  private async recordValidationSuccess(
    credential: string,
    method: 'token' | 'vendor_key',
    verifiedVia?: AuthVerificationPath
  ): Promise<void> {
    if (!this.isAuthDiskCacheEnabled()) {
      return;
    }

    const entry: AuthValidationCacheEntry = {
      fingerprint: this.credentialFingerprint(credential, method),
      method,
      authBase: this.getAuthCandidateBases()[0] ?? '',
      validatedAt: Date.now(),
      ...(verifiedVia ? { verifiedVia } : {})
    };

    this.authDiskCache = entry;
    this.authDiskCacheLoaded = true;

    try {
      await fs.mkdir(this.configDir, { recursive: true });
      await fs.writeFile(this.getAuthCacheFile(), JSON.stringify(entry), { mode: 0o600 });
    } catch {
      // Best-effort cache; never fail an auth check because it could not be written.
    }
  }

  private async clearValidationCache(): Promise<void> {
    this.authDiskCache = null;
    this.authDiskCacheLoaded = true;
    this.lastSuccessfulAuthPath = undefined;

    try {
      await fs.unlink(this.getAuthCacheFile());
    } catch {
      // Nothing cached; nothing to clear.
    }
  }

  /** Maps a verification endpoint URL back to the path that answered. */
  private authPathFromEndpoint(endpoint?: string): AuthVerificationPath | undefined {
    if (!endpoint) {
      return undefined;
    }
    const paths: AuthVerificationPath[] = ['/v1/auth/verify-api-key', '/v1/auth/verify-token', '/v1/auth/verify'];
    return paths.find(candidate => endpoint.endsWith(candidate));
  }

  /**
   * Clears the in-memory auth cache so that the next `isAuthenticated()` call
   * performs a fresh server verification rather than returning a stale cached result.
   *
   * NOTE: `lastValidated` is intentionally NOT deleted here. Each auth path
   * (vendor_key, token) already correctly rejects 401 responses without relying
   * on `lastValidated`. Deleting it would destroy the offline grace period
   * (7-day for vendor keys, 24-hour for JWT tokens), causing auth failures
   * on transient network errors even when credentials are valid.
   */
  async invalidateAuthCache(): Promise<void> {
    this.authCheckCache = null;
    await this.clearValidationCache();
    // Also reset the per-process vendor-key memoization so that
    // invalidateAuthCache() truly forces a fresh server verification.
    this.vendorKeyVerifiedThisProcess = null;
  }

  /**
   * Returns the reason the last `isAuthenticated()` call returned false,
   * or `null` if the last check was successful or never attempted.
   * Currently returns 'throttled' when auth-gateway returned HTTP 429.
   */
  getAuthFailureReason(): string | null {
    return this.lastAuthFailureReason;
  }

  async clearManualEndpointOverrides(): Promise<void> {
    delete this.config.manualEndpointOverrides;
    delete this.config.lastManualEndpointUpdate;

    // Rediscover services
    await this.discoverServices(false, true);
    await this.save();
  }

  getDiscoveredApiUrl(): string {
    return process.env.AUTH_BASE ||
      this.config.discoveredServices?.auth_base ||
      'https://auth.lanonasis.com';
  }

  // Enhanced authentication support
  /**
   * Store a vendor key for the current user.
   *
   * IMPORTANT (VERA C-3, cli 3.11.4): this method has a destructive
   * side-effect that callers MUST be aware of. The provided `vendorKey` is
   * persisted via `@lanonasis/oauth-client`; in Node.js, the key is stored
   * with `keytar` if its write succeeds, or in the encrypted file
   * `~/.lanonasis/api-key.enc` otherwise. This method also overwrites the
   * `authMethod` marker in
   * `~/.maas/config.json` (unless the existing marker is already `oauth`,
   * `oauth2`, or `jwt`). This is true regardless of whether `vendorKey` was
   * supplied by the user (`auth login --vendor-key`) or read from
   * `LANONASIS_API_KEY` by `mcp-server-entry.ts` / `mcp start` — the
   * env-supplied key becomes the new persistent key on every successful
   * resolution.
   *
   * Implications:
   *   1. A user who alternates between env-supplied keys (e.g. CI) and
   *      saved keys (e.g. local development) will silently see their saved
   *      key replaced each time the env var is set.
   *   2. The proper long-term fix is a `--no-persist` flag on `lanonasis-mcp`
   *      that lets the caller use an env-supplied key without overwriting
   *      saved state. That flag is out of scope for 3.11.4 but should
   *      accompany the next transport PR.
   *
   * @param vendorKey    Vendor key string. Trimmed; non-empty.
   * @param options.skipServerValidation  Skip the auth-gateway validation
   *   probe. Set true for OAuth tokens that the auth-gateway would reject
   *   as vendor keys but the memory API recognises.
   */
  async setVendorKey(vendorKey: string, options: { skipServerValidation?: boolean } = {}): Promise<void> {
    const trimmedKey = typeof vendorKey === 'string' ? vendorKey.trim() : '';

    // Minimal format validation (non-empty); rely on server-side checks for everything else
    const formatValidation = this.validateVendorKeyFormat(trimmedKey);
    if (formatValidation !== true) {
      throw new Error(typeof formatValidation === 'string' ? formatValidation : 'Vendor key is invalid');
    }

    // Skip server-side validation when the caller already holds a valid auth credential
    // (e.g. an OAuth access token being stored for MCP/API access — auth-gateway won't
    // recognise it as a vendor key even though the memory API accepts it).
    const isOAuthContext = ['oauth', 'oauth2'].includes(this.config.authMethod || '');
    let validated = false;
    if (!options.skipServerValidation && !isOAuthContext) {
      validated = await this.validateVendorKeyWithServer(trimmedKey);
    }

    // Initialize and store using ApiKeyStorage from @lanonasis/oauth-client
    // This handles encryption automatically (AES-256-GCM with machine-derived key)
    const apiKeyStorage = await this.getApiKeyStorage();
    await apiKeyStorage.initialize();
    await apiKeyStorage.store({
      apiKey: trimmedKey,
      organizationId: this.config.user?.organization_id,
      userId: this.config.user?.email,
      environment: (process.env.NODE_ENV as 'development' | 'production' | 'staging') || 'production',
      createdAt: new Date().toISOString()
    });

    // Cache the vendor key for this process so synchronous callers can reuse it
    this.vendorKeyCache = trimmedKey;

    if (process.env.CLI_VERBOSE === 'true') {
      console.log('🔐 Vendor key stored securely via @lanonasis/oauth-client');
    }

    // Store a reference marker in config (not the actual key)
    this.config.vendorKey = 'stored_in_api_key_storage';
    // Only set authMethod to 'vendor_key' if not already set to OAuth
    // This prevents overwriting OAuth auth method when storing the token for MCP access
    if (!this.config.authMethod || !['oauth', 'oauth2', 'jwt'].includes(this.config.authMethod)) {
      this.config.authMethod = 'vendor_key';
    }
    if (validated) {
      this.config.lastValidated = new Date().toISOString();
      await this.resetFailureCount(); // Reset failure count on successful auth
    }
    await this.save();
  }

  validateVendorKeyFormat(vendorKey: string): string | boolean {
    const trimmed = typeof vendorKey === 'string' ? vendorKey.trim() : '';

    if (!trimmed) {
      return 'Vendor key is required';
    }

    return true;
  }

  /**
   * Maps a gateway rejection reason onto an actionable CLI message.
   */
  private describeVendorKeyRejection(reason?: string): string {
    const text = (reason ?? '').toLowerCase();

    if (text.includes('expired')) {
      return 'Vendor key validation failed: Key has expired. Please generate a new key from your dashboard.';
    }
    if (text.includes('revoked')) {
      return 'Vendor key validation failed: Key has been revoked. Please generate a new key from your dashboard.';
    }
    if (text.includes('too many') || text.includes('rate limit')) {
      return 'Vendor key validation failed: Too many validation attempts. Please wait a moment before trying again.';
    }
    if (text.includes('permission') || text.includes('forbidden') || text.includes('access denied')) {
      return 'Vendor key access denied. The key may not have sufficient permissions for this operation.';
    }

    return `Vendor key validation failed: ${reason
      || 'Authentication failed. The key may be invalid, expired, or revoked.'}`;
  }

  /**
   * Validates a vendor key against the auth gateway before it is persisted.
   * Returns true for a confirmed key (including a trusted cache hit), false
   * when validation is skipped.
   *
   * Two outcomes matter and they are no longer conflated:
   *   - the gateway answered and rejected the key  -> throw, with its reason;
   *   - no gateway could be reached at all         -> warn and continue.
   *
   * The second case is why `lanonasis mcp start --transport stdio` used to die
   * at startup: a refused `localhost:4000` probe surfaced as
   * "Vendor key validation failed: connect ECONNREFUSED 127.0.0.1:4000" and
   * killed the server before it served anything. Unreachable is not invalid —
   * `isAuthenticated()` still re-verifies on every cache miss, and the offline
   * grace period still applies.
   */
  private async validateVendorKeyWithServer(vendorKey: string): Promise<boolean> {
    if (process.env.SKIP_SERVER_VALIDATION === 'true') {
      return false;
    }

    // Already verified this exact key against this exact gateway a moment ago
    // (e.g. an MCP client restarting the stdio server) — don't pay for it again.
    if (await this.hasFreshValidation(vendorKey, 'vendor_key')) {
      return true;
    }

    try {
      await this.discoverServices();
    } catch (error: unknown) {
      // Discovery is advisory here — verification falls back to the built-in
      // auth candidates below rather than failing outright.
      if (process.env.CLI_VERBOSE === 'true') {
        console.warn(`⚠️  Service discovery unavailable: ${this.normalizeServiceError(error).message ?? 'unknown error'}`);
      }
    }

    let verification: RemoteAuthVerification;
    try {
      verification = await this.verifyVendorKeyWithAuthGateway(vendorKey);
    } catch (error: unknown) {
      const normalizedError = this.normalizeServiceError(error);
      verification = {
        valid: false,
        method: 'vendor_key',
        unreachable: this.isUnreachableError(normalizedError),
        reason: this.redactCredentials(normalizedError.message ?? 'Unknown error')
      };
    }

    if (verification.valid) {
      await this.recordValidationSuccess(
        vendorKey,
        'vendor_key',
        this.authPathFromEndpoint(verification.endpoint)
      );
      return true;
    }

    if (verification.unreachable) {
      // stderr: stdout belongs to the MCP protocol when running under `mcp start`.
      console.error('⚠️  Could not reach the auth gateway to validate the API key — continuing without server-side validation.');
      console.error(`   ${verification.reason ?? 'Connection failed'}`);
      return false;
    }

    throw new Error(this.describeVendorKeyRejection(verification.reason));
  }

  getVendorKey(): string | undefined {
    if (this.vendorKeyCache) {
      return this.vendorKeyCache;
    }

    try {
      // Retrieve from secure storage using ApiKeyStorage (synchronous wrapper)
      const stored = this.getVendorKeySync();
      if (stored) {
        this.vendorKeyCache = stored;
      }
      return this.vendorKeyCache;
    } catch (error) {
      if (process.env.CLI_VERBOSE === 'true') {
        console.error('⚠️  Failed to load vendor key from secure storage:', error);
      }
      return undefined;
    }
  }

  /**
   * Synchronous wrapper for async retrieve operation
   * Note: ApiKeyStorage.retrieve() is async but we need sync for existing code
   */
  private getVendorKeySync(): string | undefined {
    // For now, check legacy storage. We'll update callers to use async later
    if (this.config.vendorKey && this.config.vendorKey !== 'stored_in_api_key_storage') {
      if (process.env.CLI_VERBOSE === 'true') {
        console.log('ℹ️  Using legacy vendor key storage');
      }
      return this.config.vendorKey;
    }
    return undefined;
  }

  /**
   * Async method to get vendor key from secure storage
   */
  async getVendorKeyAsync(): Promise<string | undefined> {
    try {
      const apiKeyStorage = await this.getApiKeyStorage();
      await apiKeyStorage.initialize();
      const stored = await apiKeyStorage.retrieve();
      if (stored) {
        this.vendorKeyCache = stored.apiKey;
        return this.vendorKeyCache;
      }
    } catch (error) {
      if (process.env.CLI_VERBOSE === 'true') {
        console.error('⚠️  Failed to retrieve vendor key:', error);
      }
    }

    // Fallback: check for legacy plaintext storage in config
    if (this.config.vendorKey && this.config.vendorKey !== 'stored_in_api_key_storage') {
      if (process.env.CLI_VERBOSE === 'true') {
        console.log('ℹ️  Found legacy plaintext vendor key, will migrate on next auth');
      }
      this.vendorKeyCache = this.config.vendorKey;
      return this.vendorKeyCache;
    }

    return undefined;
  }

  hasVendorKey(): boolean {
    // Check for marker or legacy storage
    return !!(this.vendorKeyCache || this.config.vendorKey);
  }

  async setApiUrl(url: string): Promise<void> {
    this.config.apiUrl = url;
    await this.save();
  }

  async setToken(token: string): Promise<void> {
    this.config.token = token;
    this.config.authMethod = 'jwt';
    this.config.lastValidated = new Date().toISOString();
    await this.resetFailureCount(); // Reset failure count on successful auth

    // Decode token to get user info and expiry
    try {
      const decoded = jwtDecode(token) as Record<string, unknown>;

      // Store token expiry
      if (typeof decoded.exp === 'number') {
        this.config.tokenExpiry = decoded.exp;
      }

      // Store user info
      this.config.user = this.buildUserProfile(decoded, this.config.user);
    } catch {
      // Invalid token, don't store user info or expiry
      this.config.tokenExpiry = undefined;
      // Mark as non-JWT (e.g., OAuth/CLI token)
      this.config.authMethod = this.config.authMethod || 'oauth';
    }

    await this.save();
  }

  getToken(): string | undefined {
    return this.config.token;
  }

  getAuthMethod(): string | undefined {
    return this.config.authMethod;
  }

  async getCurrentUser(): Promise<UserProfile | undefined> {
    return this.config.user;
  }

  async updateCurrentUserProfile(profile: Record<string, unknown>): Promise<void> {
    const nextUser = this.buildUserProfile(profile, this.config.user);
    if (!nextUser) {
      return;
    }

    const currentUser = this.config.user;
    const changed = !currentUser
      || currentUser.email !== nextUser.email
      || currentUser.organization_id !== nextUser.organization_id
      || currentUser.role !== nextUser.role
      || currentUser.plan !== nextUser.plan;

    if (!changed) {
      return;
    }

    this.config.user = nextUser;
    await this.save();
  }

  async isAuthenticated(): Promise<boolean> {
    // Attempt refresh for OAuth sessions before checks (prevents intermittent auth dropouts).
    // This is safe to call even when not using OAuth; it will no-op.
    await this.refreshTokenIfNeeded();

    // Check if using vendor key authentication
    if (this.config.authMethod === 'vendor_key') {
      // Use async method to read from encrypted ApiKeyStorage
      const vendorKey = await this.getVendorKeyAsync();
      if (!vendorKey) return false;

      if (this.isLegacyHashedCredential(vendorKey)) {
        if (process.env.CLI_VERBOSE === 'true') {
          console.warn(`⚠️  ${this.getLegacyHashedVendorKeyReason()}`);
        }
        this.authCheckCache = { isValid: false, timestamp: Date.now() };
        this.lastAuthFailureReason = 'invalid_credential';
        return false;
      }

      // Per-process memoization: once vendor-key auth succeeds in this process,
      // skip all subsequent server verification calls for the lifetime of this
      // process. Vendor keys are long-lived by construction (opaque 45-char
      // string, sent as X-API-Key, no JWT, no client-side TTL).
      // Bound: at most 1 verify request per process run for vendor-key sessions.
      if (this.vendorKeyVerifiedThisProcess === true) {
        return true;
      }

      // Check in-memory cache first (5-minute TTL). A 429-throttled result is
      // cached here, so we don't re-probe the auth gateway within the TTL.
      if (this.authCheckCache && (Date.now() - this.authCheckCache.timestamp) < this.AUTH_CACHE_TTL) {
        return this.authCheckCache.isValid;
      }

      // Then the short-lived on-disk cache. A separate CLI process (an editor
      // plugin shelling out per message) gets no benefit from the in-memory
      // cache, so without this every invocation pays an auth round trip.
      if (await this.hasFreshValidation(vendorKey, 'vendor_key')) {
        this.authCheckCache = { isValid: true, timestamp: Date.now() };
        return true;
      }

      // Track lastValidated for the offline grace period used in the catch block.
      // The 24-hour skip-server-validation gate has been removed: it allowed expired/revoked
      // keys to appear valid as long as they had been validated within the past day.
      const lastValidated = this.config.lastValidated;

      // Verify with server on every cache-miss
      try {
        const verification = await this.verifyVendorKeyWithAuthGateway(vendorKey);
        if (!verification.valid) {
          if (verification.unreachable) {
            // No gateway answered. Treat it as a network failure so the
            // offline grace period below applies, exactly as it does for a
            // thrown connection error.
            throw Object.assign(new Error(verification.reason ?? 'Auth gateway unreachable'), {
              code: 'ECONNREFUSED'
            });
          }

          // Auth gateway explicitly rejected the key — no grace period applies.
          // A 429 is a transient throttle, not a rejection: keep the stored
          // validation so the next process does not add load while limited.
          if (verification.throttled) {
            this.lastAuthFailureReason = 'throttled';
          } else {
            this.lastAuthFailureReason = 'invalid_credential';
            await this.clearValidationCache();
          }
          this.authCheckCache = { isValid: false, timestamp: Date.now() };
          return false;
        }

        // Update last validated timestamp on success
        this.config.lastValidated = new Date().toISOString();
        await this.save().catch(() => {}); // Don't fail auth check if save fails

        await this.recordValidationSuccess(
          vendorKey,
          'vendor_key',
          this.authPathFromEndpoint(verification.endpoint)
        );
        this.authCheckCache = { isValid: true, timestamp: Date.now() };
        // Per-process memoization for vendor-key sessions.
        this.vendorKeyVerifiedThisProcess = true;
        return true;
      } catch (err: unknown) {
        // verifyVendorKeyWithAuthGateway throws only on network/timeout errors
        // (explicit 401/403 returns {valid:false} without throwing).
        // Apply the 7-day offline grace ONLY for genuine network failures.
        const normalizedErr = this.normalizeServiceError(err);
        const httpStatus = normalizedErr.response?.status ?? 0;

        if (httpStatus === 401 || httpStatus === 403) {
          // Explicit auth rejection propagated as an exception — definitely invalid.
          this.lastAuthFailureReason = 'invalid_credential';
          this.authCheckCache = { isValid: false, timestamp: Date.now() };
          return false;
        }

        // 429 rate-limit — don't apply grace period; the server is saying
        // "too many requests", not "bad credential".
        if (httpStatus === 429) {
          this.lastAuthFailureReason = 'throttled';
          this.authCheckCache = { isValid: false, timestamp: Date.now() };
          return false;
        }

        // Network / server error — apply offline grace period
        const gracePeriod = 7 * 24 * 60 * 60 * 1000;
        const withinGracePeriod = lastValidated &&
          (Date.now() - new Date(lastValidated).getTime()) < gracePeriod;

        if (withinGracePeriod) {
          if (process.env.CLI_VERBOSE === 'true') {
            console.warn('⚠️  Unable to validate vendor key with server, using cached validation');
          }
          this.authCheckCache = { isValid: true, timestamp: Date.now() };
          return true;
        }

        if (process.env.CLI_VERBOSE === 'true') {
          console.warn('⚠️  Vendor key validation failed and grace period expired');
        }
        this.authCheckCache = { isValid: false, timestamp: Date.now() };
        return false;
      }
    }

    // Handle token-based authentication
    const token = this.getToken();
    if (!token) return false;

    // OAuth tokens are often opaque (not JWT). Use local expiry metadata as a quick
    // pre-check, but do not treat it as authoritative for a "true" result. We still
    // run server verification on cache misses to avoid status/API drift.
    let oauthTokenLocallyValid: boolean | undefined;
    if (this.config.authMethod === 'oauth' || this.config.authMethod === 'oauth2') {
      const tokenExpiresAt = this.get<number>('token_expires_at');
      if (typeof tokenExpiresAt === 'number') {
        oauthTokenLocallyValid = Date.now() < tokenExpiresAt;
        if (!oauthTokenLocallyValid) {
          this.authCheckCache = { isValid: false, timestamp: Date.now() };
          return false;
        }
      }
      // Fall through to server validation path.
    }

    // Check cache first
    if (this.authCheckCache && (Date.now() - this.authCheckCache.timestamp) < this.AUTH_CACHE_TTL) {
      return this.authCheckCache.isValid;
    }

    // Then the short-lived on-disk cache, so a per-invocation CLI call does not
    // re-verify the same token with the gateway on every single command.
    if (await this.hasFreshValidation(token, 'token')) {
      this.authCheckCache = { isValid: true, timestamp: Date.now() };
      return true;
    }

    // Local expiry check first (fast)
    let locallyValid = false;

    if (typeof oauthTokenLocallyValid === 'boolean') {
      locallyValid = oauthTokenLocallyValid;
    } else if (token.startsWith('cli_')) {
      // Handle simple CLI tokens (format: cli_xxx_timestamp)
      const parts = token.split('_');
      if (parts.length >= 3) {
        const lastPart = parts[parts.length - 1];
        const timestamp = lastPart ? parseInt(lastPart) : NaN;
        if (!isNaN(timestamp)) {
          // CLI tokens are valid for 30 days
          const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
          locallyValid = (Date.now() - timestamp) < thirtyDaysInMs;
        }
      } else {
        locallyValid = true; // Fallback for old format
      }
    } else {
      // Handle JWT tokens
      try {
        const decoded = jwtDecode(token) as Record<string, unknown>;
        const now = Date.now() / 1000;
        locallyValid = typeof decoded.exp === 'number' && decoded.exp > now;
      } catch {
        locallyValid = false;
      }
    }

    // If not locally valid, attempt server verification before failing
    if (!locallyValid) {
      try {
        // Candidate order comes from getAuthCandidateBases(): explicit config,
        // then discovery, then production, with localhost only in dev.
        for (const endpoint of this.getAuthVerificationEndpoints('/v1/auth/verify-token')) {
          try {
            const resp = await axios.post(endpoint, { token }, { timeout: 3000 });
            if (resp?.data?.valid === true) {
              await this.recordValidationSuccess(token, 'token', '/v1/auth/verify-token');
              this.authCheckCache = { isValid: true, timestamp: Date.now() };
              return true;
            }
          } catch {
            // try next endpoint
            continue;
          }
        }
      } catch {
        // ignore, will fall back to failure below
      }
      await this.clearValidationCache();
      this.authCheckCache = { isValid: false, timestamp: Date.now() };
      return false;
    }

    // Token is locally valid - verify with server on cache miss for consistency
    try {
      // Candidate order comes from getAuthCandidateBases(): an explicitly
      // configured base, then service discovery, then the production gateway.
      // localhost:4000 is only probed in a dev environment, and a refused
      // candidate simply falls through to the next one.
      const endpoints = this.getAuthVerificationEndpoints('/v1/auth/verify-token');

      let response = null;
      let networkError = false;
      let authError = false;

      for (const endpoint of endpoints) {
        try {
          response = await axios.post(endpoint, { token }, { timeout: 3000 });
          if (response.data.valid === true) {
            break;
          }
          // Explicit auth rejection should always invalidate local auth state.
          if (response.status === 401 || response.status === 403 || response.data.valid === false) {
            authError = true;
          } else {
            // Non-auth failures (like 404/5xx) should behave like transient verification failures.
            networkError = true;
          }
        } catch (error: any) {
          // Check if this is a network/transient error vs explicit auth rejection.
          if (error.response) {
            const status = error.response.status;
            if (status === 401 || status === 403) {
              authError = true;
            } else if (status === 404) {
              // The auth-gateway returns 404 'Not found' when it cannot verify a
              // token (vs. a transient 5xx or connection error). Treat it as an
              // explicit verification failure so callers don't fall into the
              // offline-grace path with a token the server has rejected.
              authError = true;
            } else {
              networkError = true;
            }
          } else {
            // Network error (ECONNREFUSED, ETIMEDOUT, etc.)
            networkError = true;
          }
          // Try next endpoint
          continue;
        }
      }

      if (!response || response.data.valid !== true) {
        // If server explicitly rejected (auth error), don't trust local validation
        if (authError) {
          if (process.env.CLI_VERBOSE === 'true') {
            console.warn('⚠️  Server validation failed with authentication error - token is invalid');
          }
          await this.clearValidationCache();
          this.authCheckCache = { isValid: false, timestamp: Date.now() };
          return false;
        }

        // If purely network error AND locally valid AND recently validated (within 7 days)
        // allow offline usage with grace period
        if (networkError && locallyValid) {
          const gracePeriod = 7 * 24 * 60 * 60 * 1000; // 7 days
          const lastValidated = this.config.lastValidated;
          const withinGracePeriod = lastValidated &&
            (Date.now() - new Date(lastValidated).getTime()) < gracePeriod;

          if (withinGracePeriod) {
            if (process.env.CLI_VERBOSE === 'true') {
              console.warn('⚠️  Unable to reach server, using cached validation (offline mode)');
            }
            this.authCheckCache = { isValid: true, timestamp: Date.now() };
            return true;
          } else {
            if (process.env.CLI_VERBOSE === 'true') {
              console.warn('⚠️  Token validation grace period expired, server validation required');
            }
            this.authCheckCache = { isValid: false, timestamp: Date.now() };
            return false;
          }
        }

        // Default to invalid if we can't validate
        this.authCheckCache = { isValid: false, timestamp: Date.now() };
        return false;
      }

      // Update lastValidated on successful server validation
      this.config.lastValidated = new Date().toISOString();
      await this.save().catch(() => { }); // Don't fail auth check if save fails

      await this.recordValidationSuccess(token, 'token', '/v1/auth/verify-token');
      this.authCheckCache = { isValid: true, timestamp: Date.now() };
      return true;
    } catch {
      // If all server checks fail, fall back to local validation
      // This allows offline usage but is less secure
      if (process.env.CLI_VERBOSE === 'true') {
        console.warn('⚠️  Unable to verify token with server, using local validation');
      }
      this.authCheckCache = { isValid: locallyValid, timestamp: Date.now() };
      return locallyValid;
    }
  }

  async logout(): Promise<void> {
    this.authCheckCache = null;
    await this.clearValidationCache();
    this.config.token = undefined;
    this.config.user = undefined;
    this.vendorKeyCache = undefined;
    this.config.vendorKey = undefined;
    this.config.authMethod = undefined;
    this.config.refresh_token = undefined;
    this.config.token_expires_at = undefined;
    try {
      const apiKeyStorage = await this.getApiKeyStorage();
      await apiKeyStorage.initialize();
      // ApiKeyStorage may implement clear() to remove encrypted secrets
      const storage: any = apiKeyStorage;
      if (typeof storage.clear === 'function') {
        await storage.clear();
      }
    } catch {
      // Ignore storage cleanup errors during logout
    }
    await this.save();
  }

  async clear(): Promise<void> {
    this.config = {};
    this.vendorKeyCache = undefined;
    this.authCheckCache = null;
    await this.clearValidationCache();
    await this.save();
  }

  async exists(): Promise<boolean> {
    try {
      await fs.access(this.configPath);
      return true;
    } catch {
      return false;
    }
  }

  // Enhanced credential validation methods
  async validateStoredCredentials(): Promise<boolean> {
    try {
      const vendorKey = await this.getVendorKeyAsync();
      const token = this.getToken();

      if (!vendorKey && !token) {
        return false;
      }

      const verification = this.config.authMethod === 'vendor_key' && vendorKey
        ? await this.verifyVendorKeyWithAuthGateway(vendorKey)
        : token
          ? await this.verifyTokenWithAuthGateway(token)
          : await this.verifyVendorKeyWithAuthGateway(vendorKey as string);

      if (!verification.valid) {
        throw new Error(verification.reason || 'Stored credentials are invalid');
      }

      // Update last validated timestamp
      this.config.lastValidated = new Date().toISOString();
      await this.resetFailureCount();
      await this.save();

      return true;
    } catch {
      // Increment failure count
      await this.incrementFailureCount();

      return false;
    }
  }

  async refreshTokenIfNeeded(): Promise<void> {
    const token = this.getToken();
    if (!token) {
      return;
    }

    try {
      // Vendor-key sessions should never attempt token refresh.
      // Some environments retain stale token/refresh_token fields from older logins,
      // which can otherwise trip dead refresh routes during normal memory commands.
      if (String(this.config.authMethod || '').toLowerCase() === 'vendor_key') {
        return;
      }

      const refreshToken = this.get<string>('refresh_token');

      // OAuth token refresh (opaque tokens + refresh_token + token_expires_at)
      if (this.config.authMethod === 'oauth' || this.config.authMethod === 'oauth2') {
        if (!refreshToken) {
          return;
        }

        const tokenExpiresAtRaw = this.get<unknown>('token_expires_at');
        const tokenExpiresAt = (() => {
          const n = typeof tokenExpiresAtRaw === 'number'
            ? tokenExpiresAtRaw
            : typeof tokenExpiresAtRaw === 'string'
              ? Number(tokenExpiresAtRaw)
              : undefined;

          if (typeof n !== 'number' || !Number.isFinite(n) || n <= 0) {
            return undefined;
          }

          // Support both seconds and milliseconds since epoch.
          // Seconds are ~1.7e9; ms are ~1.7e12.
          return n < 1e11 ? n * 1000 : n;
        })();
        const nowMs = Date.now();
        const refreshWindowMs = 5 * 60 * 1000; // 5 minutes

        // If we don't know expiry, don't force a refresh.
        if (typeof tokenExpiresAt !== 'number' || nowMs < (tokenExpiresAt - refreshWindowMs)) {
          return;
        }

        await this.discoverServices();
        await this.refreshViaOAuthTokenEndpoint(refreshToken, this.getDiscoveredApiUrl(), 'oauth');
        return;
      }

      // Check if token is JWT and if it's close to expiry
      if (token.startsWith('cli_')) {
        // CLI tokens don't need refresh, they're long-lived
        return;
      }

      // Only attempt JWT refresh for tokens that look like JWTs.
      // OAuth access tokens in this system can be opaque strings; treating them as JWTs
      // creates noisy failures and can cause unwanted state writes.
      if (token.split('.').length !== 3) {
        return;
      }

      const decoded = jwtDecode(token) as Record<string, unknown>;
      const now = Date.now() / 1000;
      const exp = typeof decoded.exp === 'number' ? decoded.exp : 0;

      // Refresh if token expires within 5 minutes
      if (exp > 0 && (exp - now) < 300) {
        if (!refreshToken) {
          return;
        }

        await this.discoverServices();
        await this.refreshViaOAuthTokenEndpoint(refreshToken, this.getDiscoveredApiUrl(), 'jwt');
      }
    } catch (err) {
      // If refresh fails, mark credentials as potentially invalid
      await this.incrementFailureCount();

      if (process.env.CLI_VERBOSE === 'true' || process.env.NODE_ENV !== 'production') {
        console.debug('Token refresh failed:', (err as Error).message);
      }
    }
  }

  private async refreshViaOAuthTokenEndpoint(
    refreshToken: string,
    authBase: string,
    authMethod: 'jwt' | 'oauth'
  ): Promise<void> {
    const resp = await axios.post(`${authBase}/oauth/token`, {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: 'lanonasis-cli'
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000,
      proxy: false
    });

    const raw = (resp as any)?.data as unknown;
    const payload =
      raw && typeof raw === 'object' && (raw as any).data && typeof (raw as any).data === 'object'
        ? (raw as any).data
        : raw;

    const accessToken = (payload as any)?.access_token ?? (payload as any)?.token;
    const refreshedRefreshToken = (payload as any)?.refresh_token;
    const expiresIn = (payload as any)?.expires_in;

    if (typeof accessToken !== 'string' || accessToken.length === 0) {
      throw new Error('Token refresh response missing access_token');
    }

    await this.setToken(accessToken);
    this.config.authMethod = authMethod;

    if (typeof refreshedRefreshToken === 'string' && refreshedRefreshToken.length > 0) {
      this.config.refresh_token = refreshedRefreshToken;
    }
    if (typeof expiresIn === 'number' && Number.isFinite(expiresIn)) {
      this.config.token_expires_at = Date.now() + (expiresIn * 1000);
    }

    await this.save().catch(() => {});
  }

  async clearInvalidCredentials(): Promise<void> {
    this.authCheckCache = null;
    await this.clearValidationCache();
    this.config.token = undefined;
    this.config.vendorKey = undefined;
    this.config.user = undefined;
    this.config.authMethod = undefined;
    this.config.tokenExpiry = undefined;
    this.config.refresh_token = undefined;
    this.config.token_expires_at = undefined;
    this.config.lastValidated = undefined;
    this.config.authFailureCount = 0;
    this.config.lastAuthFailure = undefined;
    this.vendorKeyCache = undefined;
    try {
      const apiKeyStorage = await this.getApiKeyStorage();
      await apiKeyStorage.initialize();
      const storage: any = apiKeyStorage;
      if (typeof storage.clear === 'function') {
        await storage.clear();
      }
    } catch {
      // Ignore secure storage cleanup failures while invalidating credentials
    }
    await this.save();
  }

  async incrementFailureCount(): Promise<void> {
    this.config.authFailureCount = (this.config.authFailureCount || 0) + 1;
    this.config.lastAuthFailure = new Date().toISOString();
    await this.save();
  }

  async resetFailureCount(): Promise<void> {
    this.config.authFailureCount = 0;
    this.config.lastAuthFailure = undefined;
    await this.save();
  }

  getFailureCount(): number {
    return this.config.authFailureCount || 0;
  }

  getLastAuthFailure(): string | undefined {
    return this.config.lastAuthFailure;
  }

  shouldDelayAuth(): boolean {
    const failureCount = this.getFailureCount();
    return failureCount >= 3;
  }

  getAuthDelayMs(): number {
    const failureCount = this.getFailureCount();
    if (failureCount < 3) return 0;

    // Progressive delays: 3 failures = 2s, 4 = 4s, 5 = 8s, 6+ = 16s max
    const baseDelay = 2000; // 2 seconds
    const maxDelay = 16000; // 16 seconds max
    const delay = Math.min(baseDelay * Math.pow(2, failureCount - 3), maxDelay);
    return delay;
  }

  async getDeviceId(): Promise<string> {
    if (!this.config.deviceId) {
      // Generate a new device ID
      this.config.deviceId = randomUUID();
      await this.save();
    }
    return this.config.deviceId;
  }

  // Generic get/set methods for MCP and other dynamic config
  get<T = unknown>(key: string): T {
    return this.config[key] as T;
  }

  set(key: string, value: unknown): void {
    this.config[key] = value;
  }

  async setAndSave(key: string, value: unknown): Promise<void> {
    this.set(key, value);
    await this.save();
  }

  // MCP-specific helpers
  getMCPServerPath(): string {
    // Only return an explicitly configured path. No implicit bundled defaults.
    // Returning an empty string if unset helps callers decide how to proceed safely.
    return this.config.mcpServerPath || '';
  }

  getMCPServerUrl(): string {
    return this.config.discoveredServices?.mcp_ws_base ||
      this.config.mcpServerUrl ||
      'wss://mcp.lanonasis.com/ws';
  }

  getMCPRestUrl(): string {
    const configured = this.config.mcpServerUrl;
    if (typeof configured === 'string' && configured.trim().length > 0) {
      return configured.trim();
    }

    const discoveredMcpBase = this.config.discoveredServices?.mcp_base;
    if (typeof discoveredMcpBase === 'string' && discoveredMcpBase.trim().length > 0) {
      const normalizedMcpBase = discoveredMcpBase.trim().replace(/\/$/, '');
      const normalizedMemoryBase = (this.config.discoveredServices?.memory_base || '')
        .toString()
        .trim()
        .replace(/\/$/, '');

      // Guard against service-discovery payloads that map MCP REST to the memory API host.
      const pointsToMemoryBase =
        normalizedMemoryBase.length > 0 &&
        normalizedMcpBase.replace(/\/api\/v1$/, '') === normalizedMemoryBase;

      if (!pointsToMemoryBase) {
        return normalizedMcpBase;
      }
    }

    return 'https://mcp.lanonasis.com/api/v1';
  }

  getMCPSSEUrl(): string {
    return this.config.discoveredServices?.mcp_sse_base ||
      'https://mcp.lanonasis.com/api/v1/events';
  }

  shouldUseRemoteMCP(): boolean {
    const preference = this.config.mcpPreference || 'auto';

    switch (preference) {
      case 'websocket':
      case 'remote':
        return true;
      case 'local':
        return false;
      case 'auto':
      default:
        // Default to remote/websocket (production mode)
        // Local mode should only be used when explicitly configured
        return true;
    }
  }
}

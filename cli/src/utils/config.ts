import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { jwtDecode } from 'jwt-decode';
import { randomUUID } from 'crypto';

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
  mcpPreference?: 'local' | 'remote' | 'auto';
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
  vendorKey?: string | undefined;
  authMethod?: 'jwt' | 'vendor_key' | 'oauth' | undefined;
  // Enhanced authentication persistence
  tokenExpiry?: number | undefined;
  lastValidated?: string | undefined;
  deviceId?: string;
  authFailureCount?: number;
  lastAuthFailure?: string | undefined;
  [key: string]: unknown; // Allow dynamic properties
}

export class CLIConfig {
  private configDir: string;
  private configPath: string;
  private config: CLIConfigData = {};
  private lockFile: string;
  private static readonly CONFIG_VERSION = '1.0.0';
  private authCheckCache: { isValid: boolean; timestamp: number } | null = null;
  private readonly AUTH_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.configDir = path.join(os.homedir(), '.maas');
    this.configPath = path.join(this.configDir, 'config.json');
    this.lockFile = path.join(this.configDir, 'config.lock');
  }

  /**
   * Overrides the configuration storage directory. Primarily used for tests.
   */
  setConfigDirectory(configDir: string): void {
    this.configDir = configDir;
    this.configPath = path.join(configDir, 'config.json');
    this.lockFile = path.join(configDir, 'config.lock');
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
    return process.env.MEMORY_API_URL ||
      this.config.apiUrl ||
      'https://api.lanonasis.com/api/v1';
  }

  // Enhanced Service Discovery Integration
  async discoverServices(verbose: boolean = false): Promise<void> {
    const discoveryUrl = 'https://mcp.lanonasis.com/.well-known/onasis.json';

    try {
      // Use axios instead of fetch for consistency
      const axios = (await import('axios')).default;

      if (verbose) {
        console.log(`🔍 Discovering services from ${discoveryUrl}...`);
      }

      const response = await axios.get(discoveryUrl, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Lanonasis-CLI/3.0.13'
        }
      });

      // Map discovery response to our config format
      const discovered = response.data;
      this.config.discoveredServices = {
        auth_base: discovered.auth?.login?.replace('/auth/login', '') || 'https://api.lanonasis.com',
        memory_base: 'https://api.lanonasis.com/api/v1',
        mcp_base: discovered.endpoints?.http || 'https://mcp.lanonasis.com/api/v1',
        mcp_ws_base: discovered.endpoints?.websocket || 'wss://mcp.lanonasis.com/ws',
        mcp_sse_base: discovered.endpoints?.sse || 'https://mcp.lanonasis.com/api/v1/events',
        project_scope: 'lanonasis-maas'
      };

      // Mark discovery as successful
      this.config.lastServiceDiscovery = new Date().toISOString();
      await this.save();

      if (verbose) {
        console.log('✓ Service discovery completed successfully');
        console.log(`  Auth: ${this.config.discoveredServices.auth_base}`);
        console.log(`  MCP: ${this.config.discoveredServices.mcp_base}`);
        console.log(`  WebSocket: ${this.config.discoveredServices.mcp_ws_base}`);
      }

    } catch (error: any) {
      // Enhanced error handling with user-visible messages
      await this.handleServiceDiscoveryFailure(error, verbose);
    }
  }

  private async handleServiceDiscoveryFailure(error: any, verbose: boolean): Promise<void> {
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

    // Use cached endpoints if available and recent (within 24 hours)
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

    // Mark as fallback (don't set lastServiceDiscovery)
    await this.save();
    this.logFallbackUsage(fallback.source, this.config.discoveredServices);

    if (verbose) {
      console.log('✓ Using fallback service endpoints');
      console.log(`   Source: ${fallback.source === 'environment' ? 'environment overrides' : 'built-in defaults'}`);
    }
  }

  private categorizeServiceDiscoveryError(error: any): 'network_error' | 'timeout' | 'server_error' | 'invalid_response' | 'unknown' {
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

    if (error.response?.status >= 500) {
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
    const nodeEnv = (process.env.NODE_ENV ?? '').toLowerCase();
    const isDevEnvironment = nodeEnv === 'development' || nodeEnv === 'test';

    const defaultAuthBase = isDevEnvironment ? 'http://localhost:4000' : 'https://auth.lanonasis.com';
    const defaultMemoryBase = isDevEnvironment ? 'http://localhost:4000/api/v1' : 'https://api.lanonasis.com/api/v1';
    const defaultMcpBase = isDevEnvironment ? 'http://localhost:4100/api/v1' : 'https://mcp.lanonasis.com/api/v1';
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

  // Manual endpoint override functionality
  async setManualEndpoints(endpoints: Partial<CLIConfigData['discoveredServices']>): Promise<void> {
    if (!this.config.discoveredServices) {
      // Initialize with defaults first
      await this.discoverServices();
    }

    // Merge manual overrides with existing endpoints
    this.config.discoveredServices = {
      ...this.config.discoveredServices!,
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

  async clearManualEndpointOverrides(): Promise<void> {
    this.config.manualEndpointOverrides = undefined;
    this.config.lastManualEndpointUpdate = undefined;

    // Rediscover services
    await this.discoverServices();
  }

  getDiscoveredApiUrl(): string {
    return this.config.discoveredServices?.auth_base || this.getApiUrl();
  }

  // Enhanced authentication support
  async setVendorKey(vendorKey: string): Promise<void> {
    const trimmedKey = typeof vendorKey === 'string' ? vendorKey.trim() : '';

    // Minimal format validation (non-empty); rely on server-side checks for everything else
    const formatValidation = this.validateVendorKeyFormat(trimmedKey);
    if (formatValidation !== true) {
      throw new Error(typeof formatValidation === 'string' ? formatValidation : 'Vendor key is invalid');
    }

    // Server-side validation
    await this.validateVendorKeyWithServer(trimmedKey);

    this.config.vendorKey = trimmedKey;
    this.config.authMethod = 'vendor_key';
    this.config.lastValidated = new Date().toISOString();
    await this.resetFailureCount(); // Reset failure count on successful auth
    await this.save();
  }

  validateVendorKeyFormat(vendorKey: string): string | boolean {
    const trimmed = typeof vendorKey === 'string' ? vendorKey.trim() : '';

    if (!trimmed) {
      return 'Vendor key is required';
    }

    return true;
  }

  private async validateVendorKeyWithServer(vendorKey: string): Promise<void> {
    try {
      // Import axios dynamically to avoid circular dependency
      const axios = (await import('axios')).default;

      // Ensure service discovery is done
      await this.discoverServices();

      const authBase = this.config.discoveredServices?.auth_base || 'https://auth.lanonasis.com';

      // Test vendor key with health endpoint
      await axios.get(`${authBase}/health`, {
        headers: {
          'X-API-Key': vendorKey,
          'X-Auth-Method': 'vendor_key',
          'X-Project-Scope': 'lanonasis-maas'
        },
        timeout: 10000
      });
    } catch (error: any) {
      // Provide specific error messages based on response
      if (error.response?.status === 401) {
        const errorData = error.response.data;
        if (errorData?.error?.includes('expired') || errorData?.message?.includes('expired')) {
          throw new Error('Vendor key validation failed: Key has expired. Please generate a new key from your dashboard.');
        } else if (errorData?.error?.includes('revoked') || errorData?.message?.includes('revoked')) {
          throw new Error('Vendor key validation failed: Key has been revoked. Please generate a new key from your dashboard.');
        } else if (errorData?.error?.includes('invalid') || errorData?.message?.includes('invalid')) {
          throw new Error('Vendor key validation failed: Key is invalid. Please check the key format and ensure it was copied correctly.');
        } else {
          throw new Error('Vendor key validation failed: Authentication failed. The key may be invalid, expired, or revoked.');
        }
      } else if (error.response?.status === 403) {
        throw new Error('Vendor key access denied. The key may not have sufficient permissions for this operation.');
      } else if (error.response?.status === 429) {
        throw new Error('Too many validation attempts. Please wait a moment before trying again.');
      } else if (error.response?.status >= 500) {
        throw new Error('Server error during validation. Please try again in a few moments.');
      } else if (error.code === 'ECONNREFUSED') {
        throw new Error('Cannot connect to authentication server. Please check your internet connection and try again.');
      } else if (error.code === 'ENOTFOUND') {
        throw new Error('Authentication server not found. Please check your internet connection.');
      } else if (error.code === 'ETIMEDOUT') {
        throw new Error('Validation request timed out. Please check your internet connection and try again.');
      } else if (error.code === 'ECONNRESET') {
        throw new Error('Connection was reset during validation. Please try again.');
      } else {
        throw new Error(`Vendor key validation failed: ${error.message || 'Unknown error'}`);
      }
    }
  }

  getVendorKey(): string | undefined {
    return this.config.vendorKey;
  }

  hasVendorKey(): boolean {
    return !!this.config.vendorKey;
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
      this.config.user = {
        email: String(decoded.email || ''),
        organization_id: String(decoded.organizationId || ''),
        role: String(decoded.role || ''),
        plan: String(decoded.plan || '')
      };
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

  async getCurrentUser(): Promise<UserProfile | undefined> {
    return this.config.user;
  }

  async isAuthenticated(): Promise<boolean> {
    const token = this.getToken();
    if (!token) return false;

    // Check cache first
    if (this.authCheckCache && (Date.now() - this.authCheckCache.timestamp) < this.AUTH_CACHE_TTL) {
      return this.authCheckCache.isValid;
    }

    // Local expiry check first (fast)
    let locallyValid = false;

    // Handle simple CLI tokens (format: cli_xxx_timestamp)
    if (token.startsWith('cli_')) {
      // Extract timestamp from CLI token
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
        const axios = (await import('axios')).default;
        const endpoints = [
          'http://localhost:4000/v1/auth/verify-token',
          'https://auth.lanonasis.com/v1/auth/verify-token',
          'https://api.lanonasis.com/auth/verify'
        ];
        for (const endpoint of endpoints) {
          try {
            const resp = await axios.post(endpoint, { token }, { timeout: 3000 });
            if (resp.data?.valid === true) {
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
      this.authCheckCache = { isValid: false, timestamp: Date.now() };
      return false;
    }

    // Token is locally valid - check if we need server validation
    // Skip server validation if we have a recent lastValidated timestamp (within 24 hours)
    const lastValidated = this.config.lastValidated;
    const skipServerValidation = lastValidated &&
      (Date.now() - new Date(lastValidated).getTime()) < (24 * 60 * 60 * 1000); // 24 hours

    if (skipServerValidation) {
      // Trust the local validation if it was recently validated
      this.authCheckCache = { isValid: locallyValid, timestamp: Date.now() };
      return locallyValid;
    }

    // Verify with server (security check) for tokens that haven't been validated recently
    try {
      const axios = (await import('axios')).default;

      // Try auth-gateway first (port 4000), then fall back to Netlify function
      const endpoints = [
        'http://localhost:4000/v1/auth/verify-token',
        'https://auth.lanonasis.com/v1/auth/verify-token',
        'https://api.lanonasis.com/auth/verify'
      ];

      let response = null;
      for (const endpoint of endpoints) {
        try {
          response = await axios.post(endpoint, { token }, { timeout: 3000 });
          if (response.data.valid === true) {
            break;
          }
        } catch {
          // Try next endpoint
          continue;
        }
      }

      if (!response || response.data.valid !== true) {
        // Server says invalid - but if locally valid and recent, trust local
        if (locallyValid) {
          if (process.env.CLI_VERBOSE === 'true') {
            console.warn('⚠️  Server validation failed, but token is locally valid - using local validation');
          }
          this.authCheckCache = { isValid: locallyValid, timestamp: Date.now() };
          return locallyValid;
        }
        this.authCheckCache = { isValid: false, timestamp: Date.now() };
        return false;
      }

      // Update lastValidated on successful server validation
      this.config.lastValidated = new Date().toISOString();
      await this.save().catch(() => { }); // Don't fail auth check if save fails

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
    this.config.token = undefined;
    this.config.user = undefined;
    await this.save();
  }

  async clear(): Promise<void> {
    this.config = {};
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
      const vendorKey = this.getVendorKey();
      const token = this.getToken();

      if (!vendorKey && !token) {
        return false;
      }

      // Import axios dynamically to avoid circular dependency
      const axios = (await import('axios')).default;

      // Ensure service discovery is done
      await this.discoverServices();

      const authBase = this.config.discoveredServices?.auth_base || 'https://api.lanonasis.com';
      const headers: Record<string, string> = {
        'X-Project-Scope': 'lanonasis-maas'
      };

      if (vendorKey) {
        headers['X-API-Key'] = vendorKey;
        headers['X-Auth-Method'] = 'vendor_key';
      } else if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        headers['X-Auth-Method'] = 'jwt';
      }

      // Validate against server with health endpoint
      await axios.get(`${authBase}/api/v1/health`, {
        headers,
        timeout: 10000
      });

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
      // Check if token is JWT and if it's close to expiry
      if (token.startsWith('cli_')) {
        // CLI tokens don't need refresh, they're long-lived
        return;
      }

      const decoded = jwtDecode(token) as Record<string, unknown>;
      const now = Date.now() / 1000;
      const exp = typeof decoded.exp === 'number' ? decoded.exp : 0;

      // Refresh if token expires within 5 minutes
      if (exp > 0 && (exp - now) < 300) {
        // Import axios dynamically
        const axios = (await import('axios')).default;

        await this.discoverServices();
        const authBase = this.config.discoveredServices?.auth_base || 'https://api.lanonasis.com';

        // Attempt token refresh
        const response = await axios.post(`${authBase}/v1/auth/refresh`, {}, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Project-Scope': 'lanonasis-maas'
          },
          timeout: 10000
        });

        if (response.data.token) {
          await this.setToken(response.data.token);
        }
      }
    } catch (err) {
      // If refresh fails, mark credentials as potentially invalid
      await this.incrementFailureCount();

      if (process.env.CLI_VERBOSE === 'true' || process.env.NODE_ENV !== 'production') {
        console.debug('Token refresh failed:', (err as Error).message);
      }
    }
  }

  async clearInvalidCredentials(): Promise<void> {
    this.config.token = undefined;
    this.config.vendorKey = undefined;
    this.config.user = undefined;
    this.config.authMethod = undefined;
    this.config.tokenExpiry = undefined;
    this.config.lastValidated = undefined;
    this.config.authFailureCount = 0;
    this.config.lastAuthFailure = undefined;
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
    return this.config.discoveredServices?.mcp_base ||
      'https://mcp.lanonasis.com/api/v1';
  }

  getMCPSSEUrl(): string {
    return this.config.discoveredServices?.mcp_sse_base ||
      'https://mcp.lanonasis.com/api/v1/events';
  }

  shouldUseRemoteMCP(): boolean {
    const preference = this.config.mcpPreference || 'auto';

    switch (preference) {
      case 'remote':
        return true;
      case 'local':
        return false;
      case 'auto':
      default:
        // Use remote if authenticated, otherwise local
        return !!this.config.token;
    }
  }
}

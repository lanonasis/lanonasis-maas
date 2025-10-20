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

  constructor() {
    this.configDir = path.join(os.homedir(), '.maas');
    this.configPath = path.join(this.configDir, 'config.json');
    this.lockFile = path.join(this.configDir, 'config.lock');
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
                await fs.unlink(this.lockFile).catch(() => {});
                continue;
              }
            }
          } catch {
            // Can't read lock file, remove it and retry
            await fs.unlink(this.lockFile).catch(() => {});
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

  // Service Discovery Integration
  async discoverServices(): Promise<void> {
    try {
      // Use axios instead of fetch for consistency
      const axios = (await import('axios')).default;
      const discoveryUrl = 'https://mcp.lanonasis.com/.well-known/onasis.json';
      const response = await axios.get(discoveryUrl);
      
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
      await this.save();
    } catch {
      // Service discovery failed, use fallback defaults
      if (process.env.CLI_VERBOSE === 'true') {
        console.log('Service discovery failed, using fallback defaults');
      }
      
      // Set fallback service endpoints to prevent double slash issues
      // Use mcp.lanonasis.com for MCP services (proxied to port 3001)
      this.config.discoveredServices = {
        auth_base: 'https://api.lanonasis.com',  // CLI auth goes to central auth system
        memory_base: 'https://api.lanonasis.com/api/v1',  // Memory via onasis-core
        mcp_base: 'https://mcp.lanonasis.com/api/v1',  // MCP HTTP/REST
        mcp_ws_base: 'wss://mcp.lanonasis.com/ws',  // MCP WebSocket
        mcp_sse_base: 'https://mcp.lanonasis.com/api/v1/events',  // MCP SSE
        project_scope: 'lanonasis-maas'  // Correct project scope
      };
      await this.save();
    }
  }

  getDiscoveredApiUrl(): string {
    return this.config.discoveredServices?.auth_base || this.getApiUrl();
  }

  // Enhanced authentication support
  async setVendorKey(vendorKey: string): Promise<void> {
    // Validate vendor key format (pk_*.sk_*)
    if (!vendorKey.match(/^pk_[a-zA-Z0-9]+\.sk_[a-zA-Z0-9]+$/)) {
      throw new Error('Invalid vendor key format. Expected: pk_xxx.sk_xxx');
    }
    
    // Server-side validation
    await this.validateVendorKeyWithServer(vendorKey);
    
    this.config.vendorKey = vendorKey;
    this.config.authMethod = 'vendor_key';
    this.config.lastValidated = new Date().toISOString();
    this.config.authFailureCount = 0; // Reset failure count on successful auth
    await this.save();
  }

  private async validateVendorKeyWithServer(vendorKey: string): Promise<void> {
    try {
      // Import axios dynamically to avoid circular dependency
      const axios = (await import('axios')).default;
      
      // Ensure service discovery is done
      await this.discoverServices();
      
      const authBase = this.config.discoveredServices?.auth_base || 'https://api.lanonasis.com';
      
      // Test vendor key with health endpoint
      await axios.get(`${authBase}/api/v1/health`, {
        headers: {
          'X-API-Key': vendorKey,
          'X-Auth-Method': 'vendor_key',
          'X-Project-Scope': 'lanonasis-maas'
        },
        timeout: 10000
      });
    } catch (error: any) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        throw new Error('Invalid vendor key: Authentication failed with server');
      } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        throw new Error('Cannot validate vendor key: Server unreachable');
      } else {
        throw new Error(`Vendor key validation failed: ${error.message}`);
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
    this.config.authFailureCount = 0; // Reset failure count on successful auth
    
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
          return (Date.now() - timestamp) < thirtyDaysInMs;
        }
      }
      // If we can't parse timestamp, assume valid (fallback)
      return true;
    }

    // Handle JWT tokens
    try {
      const decoded = jwtDecode(token) as Record<string, unknown>;
      const now = Date.now() / 1000;
      return typeof decoded.exp === 'number' && decoded.exp > now;
    } catch {
      return false;
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

  getConfigPath(): string {
    return this.configPath;
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
      this.config.authFailureCount = 0;
      await this.save();
      
      return true;
    } catch (error: any) {
      // Increment failure count
      this.config.authFailureCount = (this.config.authFailureCount || 0) + 1;
      this.config.lastAuthFailure = new Date().toISOString();
      await this.save();
      
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
    } catch (error) {
      // If refresh fails, mark credentials as potentially invalid
      this.config.authFailureCount = (this.config.authFailureCount || 0) + 1;
      this.config.lastAuthFailure = new Date().toISOString();
      await this.save();
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
    return this.config.mcpServerPath || path.join(process.cwd(), 'onasis-gateway/mcp-server/server.js');
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
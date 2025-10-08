import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { jwtDecode } from 'jwt-decode';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface UserProfile {
  email: string;
  organization_id: string;
  role: string;
  plan: string;
}

interface CLIConfigData {
  apiUrl?: string;
  token?: string;
  user?: UserProfile;
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
    mcp_ws_base: string;
    project_scope: string;
  };
  // Enhanced Authentication
  vendorKey?: string;
  authMethod?: 'jwt' | 'vendor_key' | 'oauth';
  [key: string]: unknown; // Allow dynamic properties
}

export class CLIConfig {
  private configDir: string;
  private configPath: string;
  private config: CLIConfigData = {};

  constructor() {
    this.configDir = path.join(os.homedir(), '.maas');
    this.configPath = path.join(this.configDir, 'config.json');
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
    } catch {
      this.config = {};
    }
  }

  async save(): Promise<void> {
    await fs.mkdir(this.configDir, { recursive: true });
    this.config.lastUpdated = new Date().toISOString();
    await fs.writeFile(this.configPath, JSON.stringify(this.config, null, 2));
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
      const discoveryUrl = 'https://api.lanonasis.com/.well-known/onasis.json';
      const response = await axios.get(discoveryUrl);
      this.config.discoveredServices = response.data;
      await this.save();
    } catch {
      // Service discovery failed, use fallback defaults
      if (process.env.CLI_VERBOSE === 'true') {
        console.log('Service discovery failed, using fallback defaults');
      }
      
      // Set fallback service endpoints to prevent double slash issues
      // CORRECTED: CLI auth routes through central auth system (api.lanonasis.com)
      this.config.discoveredServices = {
        auth_base: 'https://api.lanonasis.com',  // CLI auth goes to central auth system
        memory_base: 'https://api.lanonasis.com/api/v1',  // Memory via onasis-core
        mcp_ws_base: 'wss://mcp.lanonasis.com/ws',  // MCP WebSocket separate
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
    this.config.vendorKey = vendorKey;
    await this.save();
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
    
    // Decode token to get user info
    try {
      const decoded = jwtDecode(token) as Record<string, unknown>;
      // We'll need to fetch full user details from the API
      // For now, store what we can decode
      this.config.user = {
        email: String(decoded.email || ''),
        organization_id: String(decoded.organizationId || ''),
        role: String(decoded.role || ''),
        plan: String(decoded.plan || '')
      };
    } catch {
      // Invalid token, don't store user info
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
        const timestamp = parseInt(parts[parts.length - 1]);
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
    return this.config.mcpServerPath || path.join(__dirname, '../../../../onasis-gateway/mcp-server/server.js');
  }

  getMCPServerUrl(): string {
    return this.config.discoveredServices?.mcp_ws_base || 
           this.config.mcpServerUrl || 
           'https://api.lanonasis.com';
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
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { jwtDecode } from 'jwt-decode';

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
           'http://localhost:3000/api/v1';
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
}
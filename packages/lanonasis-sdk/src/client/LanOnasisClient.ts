import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { ClientConfig, AuthToken } from '../types/common.js';
import { MemoryClient } from '../memory/MemoryClient.js';
import { ApiKeyClient } from '../api-keys/ApiKeyClient.js';
import { MCPClient } from '../mcp/MCPClient.js';
import { LanOnasisError, AuthenticationError } from '../errors/index.js';
import { DEFAULT_API_URL, DEFAULT_TIMEOUT } from '../constants.js';
import { parseJWT } from '../utils/index.js';

export interface LanOnasisClientConfig extends ClientConfig {
  /**
   * Base URL for the LanOnasis API
   * @default "https://api.lanonasis.com"
   */
  apiUrl?: string;
  
  /**
   * API key for authentication
   */
  apiKey?: string;
  
  /**
   * JWT token for authentication (alternative to apiKey)
   */
  token?: string;
  
  /**
   * Organization ID for multi-tenant setups
   */
  organizationId?: string;
  
  /**
   * Request timeout in milliseconds
   * @default 30000
   */
  timeout?: number;
  
  /**
   * Custom headers to include with requests
   */
  headers?: Record<string, string>;
  
  /**
   * Whether to enable debug logging
   * @default false
   */
  debug?: boolean;
  
  /**
   * Retry configuration
   */
  retry?: {
    attempts: number;
    delay: number;
  };
}

/**
 * Main LanOnasis client for Memory as a Service and API Key Management
 * 
 * @example
 * ```typescript
 * const client = new LanOnasisClient({
 *   apiUrl: 'https://api.lanonasis.com',
 *   apiKey: 'your-api-key',
 *   organizationId: 'your-org-id'
 * });
 * 
 * // Use sub-clients
 * const memories = await client.memory.search('AI development');
 * const apiKeys = await client.apiKeys.list();
 * const session = await client.mcp.requestAccess({...});
 * ```
 */
export class LanOnasisClient {
  private httpClient: AxiosInstance;
  private config: Required<LanOnasisClientConfig>;
  private authToken?: AuthToken;

  // Sub-clients
  public readonly memory: MemoryClient;
  public readonly apiKeys: ApiKeyClient;
  public readonly mcp: MCPClient;

  constructor(config: LanOnasisClientConfig = {}) {
    this.config = {
      apiUrl: config.apiUrl || DEFAULT_API_URL,
      apiKey: config.apiKey || '',
      token: config.token || '',
      organizationId: config.organizationId || '',
      timeout: config.timeout || DEFAULT_TIMEOUT,
      headers: config.headers || {},
      debug: config.debug || false,
      retry: config.retry || { attempts: 3, delay: 1000 }
    };

    this.httpClient = this.createHttpClient();
    
    // Initialize sub-clients
    this.memory = new MemoryClient(this.httpClient, this.config);
    this.apiKeys = new ApiKeyClient(this.httpClient, this.config);
    this.mcp = new MCPClient(this.httpClient, this.config);

    // Parse token if provided
    if (this.config.token) {
      try {
        this.authToken = parseJWT(this.config.token);
      } catch (error) {
        throw new AuthenticationError('Invalid JWT token provided');
      }
    }
  }

  /**
   * Create and configure the HTTP client
   */
  private createHttpClient(): AxiosInstance {
    const client = axios.create({
      baseURL: this.config.apiUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'LanOnasis-SDK/1.0.0',
        ...this.config.headers
      }
    });

    // Request interceptor for authentication
    client.interceptors.request.use((config) => {
      if (this.config.apiKey) {
        config.headers['X-API-Key'] = this.config.apiKey;
      }
      
      if (this.config.token) {
        config.headers['Authorization'] = `Bearer ${this.config.token}`;
      }
      
      if (this.config.organizationId) {
        config.headers['X-Organization-ID'] = this.config.organizationId;
      }

      if (this.config.debug) {
        console.log('[LanOnasis SDK] Request:', {
          method: config.method?.toUpperCase(),
          url: config.url,
          headers: { ...config.headers },
          data: config.data
        });
      }

      return config;
    });

    // Response interceptor for error handling
    client.interceptors.response.use(
      (response) => {
        if (this.config.debug) {
          console.log('[LanOnasis SDK] Response:', {
            status: response.status,
            statusText: response.statusText,
            data: response.data
          });
        }
        return response;
      },
      async (error) => {
        if (this.config.debug) {
          console.error('[LanOnasis SDK] Error:', {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            message: error.message
          });
        }

        // Handle specific error types
        if (error.response) {
          const { status, data } = error.response;
          
          switch (status) {
            case 401:
              throw new AuthenticationError(data.message || 'Authentication failed');
            case 403:
              throw new LanOnasisError(data.message || 'Access forbidden', status);
            case 404:
              throw new LanOnasisError(data.message || 'Resource not found', status);
            case 429:
              throw new LanOnasisError(data.message || 'Rate limit exceeded', status);
            case 500:
              throw new LanOnasisError(data.message || 'Internal server error', status);
            default:
              throw new LanOnasisError(data.message || 'API request failed', status);
          }
        }

        // Network or other errors
        throw new LanOnasisError(error.message || 'Request failed');
      }
    );

    return client;
  }

  /**
   * Update the authentication token
   */
  public setAuthToken(token: string): void {
    this.config.token = token;
    try {
      this.authToken = parseJWT(token);
    } catch (error) {
      throw new AuthenticationError('Invalid JWT token provided');
    }
  }

  /**
   * Update the API key
   */
  public setApiKey(apiKey: string): void {
    this.config.apiKey = apiKey;
  }

  /**
   * Update the organization ID
   */
  public setOrganizationId(organizationId: string): void {
    this.config.organizationId = organizationId;
  }

  /**
   * Get current authentication information
   */
  public getAuthInfo(): {
    hasApiKey: boolean;
    hasToken: boolean;
    tokenExpired?: boolean;
    organizationId?: string;
    userId?: string;
  } {
    const now = Date.now() / 1000;
    
    return {
      hasApiKey: !!this.config.apiKey,
      hasToken: !!this.config.token,
      tokenExpired: this.authToken ? this.authToken.exp < now : undefined,
      organizationId: this.config.organizationId || this.authToken?.organizationId,
      userId: this.authToken?.userId
    };
  }

  /**
   * Test the connection to the API
   */
  public async testConnection(): Promise<{
    success: boolean;
    latency: number;
    version: string;
    features: string[];
  }> {
    const start = Date.now();
    
    try {
      const response = await this.httpClient.get('/api/v1/health');
      const latency = Date.now() - start;
      
      return {
        success: response.data.status === 'healthy',
        latency,
        version: response.data.version || '1.0.0',
        features: response.data.features || ['memory', 'api-keys', 'mcp']
      };
    } catch (error) {
      throw new LanOnasisError('Connection test failed: ' + error.message);
    }
  }

  /**
   * Get current user information
   */
  public async getCurrentUser(): Promise<{
    id: string;
    email: string;
    organizationId: string;
    role: string;
    plan: string;
    lastLogin?: string;
    createdAt: string;
  }> {
    try {
      const response = await this.httpClient.get('/api/v1/auth/me');
      return response.data;
    } catch (error) {
      throw new LanOnasisError('Failed to get current user: ' + error.message);
    }
  }

  /**
   * Refresh the authentication token
   */
  public async refreshToken(): Promise<{ token: string; expiresAt: string }> {
    try {
      const response = await this.httpClient.post('/api/v1/auth/refresh');
      const { token, expiresAt } = response.data;
      
      this.setAuthToken(token);
      
      return { token, expiresAt };
    } catch (error) {
      throw new AuthenticationError('Failed to refresh token: ' + error.message);
    }
  }

  /**
   * Get usage statistics for the current organization
   */
  public async getUsageStats(days: number = 30): Promise<{
    memories: {
      total: number;
      created: number;
      searches: number;
    };
    apiKeys: {
      total: number;
      active: number;
      usage: number;
    };
    mcpSessions: {
      total: number;
      active: number;
      duration: number;
    };
    storage: {
      used: number;
      limit: number;
      unit: string;
    };
  }> {
    try {
      const response = await this.httpClient.get(`/api/v1/analytics/usage?days=${days}`);
      return response.data;
    } catch (error) {
      throw new LanOnasisError('Failed to get usage stats: ' + error.message);
    }
  }

  /**
   * Enable debug logging
   */
  public enableDebug(): void {
    this.config.debug = true;
  }

  /**
   * Disable debug logging
   */
  public disableDebug(): void {
    this.config.debug = false;
  }

  /**
   * Get the current configuration
   */
  public getConfig(): Readonly<LanOnasisClientConfig> {
    return { ...this.config };
  }

  /**
   * Create a new client instance with different configuration
   */
  public clone(overrides: Partial<LanOnasisClientConfig> = {}): LanOnasisClient {
    return new LanOnasisClient({
      ...this.config,
      ...overrides
    });
  }

  /**
   * Dispose of the client and clean up resources
   */
  public dispose(): void {
    // Clear sensitive data
    this.config.apiKey = '';
    this.config.token = '';
    this.authToken = undefined;
    
    // Cancel any pending requests
    // Note: Axios doesn't have a built-in way to cancel all requests,
    // but this would be where you'd implement cleanup if needed
  }
}
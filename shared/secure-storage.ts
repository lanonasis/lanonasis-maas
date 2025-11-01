/**
 * Secure Storage Implementation for IDE Extensions
 * Prevents API keys from being exposed in console logs
 */

import * as vscode from 'vscode';
import * as http from 'http';
import * as crypto from 'crypto';
import { URL, URLSearchParams } from 'url';

export interface SecureStorageProvider {
  store(key: string, value: string): Promise<void>;
  retrieve(key: string): Promise<string | undefined>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

/**
 * VS Code SecretStorage wrapper
 */
export class VSCodeSecureStorage implements SecureStorageProvider {
  constructor(private secretStorage: vscode.SecretStorage) {}

  async store(key: string, value: string): Promise<void> {
    await this.secretStorage.store(key, value);
  }

  async retrieve(key: string): Promise<string | undefined> {
    return await this.secretStorage.get(key);
  }

  async delete(key: string): Promise<void> {
    await this.secretStorage.delete(key);
  }

  async clear(): Promise<void> {
    // VS Code doesn't have a clear all method, so we track keys
    const keys = ['apiKey', 'refreshToken', 'organizationId', 'projectScope'];
    for (const key of keys) {
      await this.delete(key);
    }
  }
}

/**
 * Secure API Key Manager
 * Handles all API key operations with security best practices
 */
export class SecureApiKeyManager {
  private static readonly API_KEY_PREFIX = 'lanonasis_';
  private static readonly REDACTED_DISPLAY = '••••••••';
  
  constructor(private storage: SecureStorageProvider) {}

  /**
   * Store API key securely
   */
  async storeApiKey(key: string): Promise<void> {
    // Validate key format
    if (!this.isValidApiKey(key)) {
      throw new Error('Invalid API key format');
    }

    // Never log the actual key
    await this.storage.store('apiKey', key);
    this.logSecure('API key stored securely');
  }

  /**
   * Retrieve API key for use (never log it)
   */
  async getApiKey(): Promise<string | undefined> {
    const key = await this.storage.retrieve('apiKey');
    if (key) {
      this.logSecure('API key retrieved from secure storage');
    }
    return key;
  }

  /**
   * Get redacted API key for display
   */
  async getRedactedApiKey(): Promise<string> {
    const key = await this.storage.retrieve('apiKey');
    if (!key) {
      return 'Not configured';
    }
    
    // Show only first 3 and last 3 characters
    if (key.length > 10) {
      return `${key.substring(0, 3)}${SecureApiKeyManager.REDACTED_DISPLAY}${key.substring(key.length - 3)}`;
    }
    return SecureApiKeyManager.REDACTED_DISPLAY;
  }

  /**
   * Rotate API key
   */
  async rotateApiKey(newKey: string): Promise<void> {
    const oldKey = await this.getApiKey();
    if (oldKey) {
      // Store old key temporarily for rollback
      await this.storage.store('apiKey_old', oldKey);
    }
    
    await this.storeApiKey(newKey);
    this.logSecure('API key rotated successfully');
    
    // Clean up old key after successful rotation
    await this.storage.delete('apiKey_old');
  }

  /**
   * Delete API key
   */
  async deleteApiKey(): Promise<void> {
    await this.storage.delete('apiKey');
    this.logSecure('API key removed from secure storage');
  }

  /**
   * Validate API key format
   */
  private isValidApiKey(key: string): boolean {
    // Check for common patterns: pk_xxx, sk_xxx, or JWT format
    const patterns = [
      /^pk_[a-zA-Z0-9]{20,}$/,
      /^sk_[a-zA-Z0-9]{20,}$/,
      /^eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/ // JWT
    ];
    
    return patterns.some(pattern => pattern.test(key));
  }

  /**
   * Secure logging that never exposes sensitive data
   */
  private logSecure(message: string): void {
    // Use debug channel instead of console.log
    const timestamp = new Date().toISOString();
    // This should be connected to VS Code's output channel
    console.debug(`[${timestamp}] [SecureStorage] ${message}`);
  }
}

/**
 * Redaction middleware for all console operations
 */
export class ConsoleRedactor {
  private static sensitivePatterns = [
    /pk_[a-zA-Z0-9]{20,}/g,
    /sk_[a-zA-Z0-9]{20,}/g,
    /Bearer\s+[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g,
    /apiKey["\s:]+["']?[a-zA-Z0-9_-]{20,}["']?/gi,
    /password["\s:]+["']?[^"'\s,}]{8,}["']?/gi,
    /token["\s:]+["']?[a-zA-Z0-9_-]{20,}["']?/gi
  ];

  /**
   * Wrap console methods to redact sensitive data
   */
  static initialize(): void {
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalDebug = console.debug;

    console.log = (...args: any[]) => {
      originalLog(...this.redactArgs(args));
    };

    console.error = (...args: any[]) => {
      originalError(...this.redactArgs(args));
    };

    console.warn = (...args: any[]) => {
      originalWarn(...this.redactArgs(args));
    };

    console.debug = (...args: any[]) => {
      originalDebug(...this.redactArgs(args));
    };
  }

  /**
   * Redact sensitive data from arguments
   */
  private static redactArgs(args: any[]): any[] {
    return args.map(arg => {
      if (typeof arg === 'string') {
        return this.redactString(arg);
      }
      if (typeof arg === 'object' && arg !== null) {
        return this.redactObject(arg);
      }
      return arg;
    });
  }

  /**
   * Redact sensitive data from strings
   */
  private static redactString(str: string): string {
    let redacted = str;
    for (const pattern of this.sensitivePatterns) {
      redacted = redacted.replace(pattern, '[REDACTED]');
    }
    return redacted;
  }

  /**
   * Redact sensitive data from objects
   */
  private static redactObject(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map(item => 
        typeof item === 'string' ? this.redactString(item) : 
        typeof item === 'object' ? this.redactObject(item) : item
      );
    }

    const redacted: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Redact values for sensitive keys
      if (/apikey|password|token|secret|credential/i.test(key)) {
        redacted[key] = '[REDACTED]';
      } else if (typeof value === 'string') {
        redacted[key] = this.redactString(value);
      } else if (typeof value === 'object' && value !== null) {
        redacted[key] = this.redactObject(value);
      } else {
        redacted[key] = value;
      }
    }
    return redacted;
  }
}

/**
 * Extension Authentication Handler
 */
export class ExtensionAuthHandler {
  private apiKeyManager: SecureApiKeyManager;
  private isAuthenticated: boolean = false;

  constructor(private storage: SecureStorageProvider) {
    this.apiKeyManager = new SecureApiKeyManager(storage);
  }

  /**
   * Authenticate with OAuth flow
   * Uses PKCE (Proof Key for Code Exchange) for enhanced security
   */
  async authenticateOAuth(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        // Note: In VS Code extensions, process.env may not be available
        // Use vscode.workspace.getConfiguration instead
        const config = vscode.workspace.getConfiguration('lanonasis');
        const authUrl = config.get<string>('authUrl') || 'https://auth.lanonasis.com';
        const clientId = config.get<string>('clientId') || 'cursor-extension';
        const redirectUri = 'http://localhost:8080/callback';
        const CALLBACK_PORT = 8080;
        
        // Generate PKCE parameters
        const codeVerifier = this.generateCodeVerifier();
        const codeChallenge = this.generateCodeChallenge(codeVerifier);
        const state = this.generateState();
        
        // Store PKCE data temporarily
        this.storage.store('oauth_code_verifier', codeVerifier);
        this.storage.store('oauth_state', state);
        
        // Build authorization URL
        const authUrlObj = new URL('/oauth/authorize', authUrl);
        authUrlObj.searchParams.set('client_id', clientId);
        authUrlObj.searchParams.set('response_type', 'code');
        authUrlObj.searchParams.set('redirect_uri', redirectUri);
        authUrlObj.searchParams.set('scope', 'memories:read memories:write memories:delete');
        authUrlObj.searchParams.set('code_challenge', codeChallenge);
        authUrlObj.searchParams.set('code_challenge_method', 'S256');
        authUrlObj.searchParams.set('state', state);
        
        // Start callback server
        const server = http.createServer(async (req: http.IncomingMessage, res: http.ServerResponse) => {
          try {
            if (!req.url) {
              res.writeHead(400, { 'Content-Type': 'text/plain' });
              res.end('Missing URL');
              return;
            }
            const url = new URL(req.url, `http://localhost:${CALLBACK_PORT}`);
            
            if (url.pathname === '/callback') {
              const code = url.searchParams.get('code');
              const returnedState = url.searchParams.get('state');
              const error = url.searchParams.get('error');
              
              // Validate state
              const storedState = await this.storage.retrieve('oauth_state');
              if (returnedState !== storedState) {
                res.writeHead(400, { 'Content-Type': 'text/html' });
                res.end('<h1>Invalid state parameter</h1>');
                server.close();
                reject(new Error('Invalid state parameter'));
                return;
              }
              
              if (error) {
                res.writeHead(400, { 'Content-Type': 'text/html' });
                res.end(`<h1>OAuth Error: ${error}</h1>`);
                server.close();
                reject(new Error(`OAuth error: ${error}`));
                return;
              }
              
              if (code) {
                // Exchange code for token
                const token = await this.exchangeCodeForToken(code, codeVerifier, redirectUri, authUrl);
                
                // Store token securely
                await this.apiKeyManager.storeApiKey(token.access_token);
                if (token.refresh_token) {
                  await this.storage.store('refresh_token', token.refresh_token);
                }
                
                this.isAuthenticated = true;
                
                // Send success response
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(`
                  <html>
                    <head><title>Authentication Success</title></head>
                    <body>
                      <h1 style="color: green;">✅ Authentication Successful!</h1>
                      <p>You can close this window and return to Cursor.</p>
                      <script>setTimeout(() => window.close(), 2000);</script>
                    </body>
                  </html>
                `);
                
                // Cleanup
                await this.storage.delete('oauth_code_verifier');
                await this.storage.delete('oauth_state');
                server.close();
                resolve(true);
              }
            } else {
              res.writeHead(404, { 'Content-Type': 'text/plain' });
              res.end('Not found');
            }
          } catch (err) {
            res.writeHead(500, { 'Content-Type': 'text/html' });
            res.end(`<h1>Error: ${err instanceof Error ? err.message : 'Unknown error'}</h1>`);
            server.close();
            reject(err);
          }
        });
        
        server.listen(CALLBACK_PORT, 'localhost', () => {
          // Open browser
          vscode.env.openExternal(vscode.Uri.parse(authUrlObj.toString()));
        });
        
        // Timeout after 5 minutes
        setTimeout(() => {
          server.close();
          reject(new Error('OAuth authentication timeout'));
        }, 5 * 60 * 1000);
        
      } catch (error) {
        reject(error);
      }
    });
  }
  
  private generateCodeVerifier(): string {
    return crypto.randomBytes(32).toString('base64url');
  }
  
  private generateCodeChallenge(verifier: string): string {
    return crypto.createHash('sha256').update(verifier).digest('base64url');
  }
  
  private generateState(): string {
    return crypto.randomBytes(16).toString('hex');
  }
  
  private async exchangeCodeForToken(
    code: string, 
    codeVerifier: string, 
    redirectUri: string,
    authUrl: string
  ): Promise<{ access_token: string; refresh_token?: string }> {
    const tokenUrl = new URL('/oauth/token', authUrl);
    
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: 'cursor-extension',
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier
    });
    
    const response = await fetch(tokenUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: body.toString()
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token exchange failed: ${response.status} ${errorText}`);
    }
    
    const tokenData = await response.json() as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
    };
    
    return {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token
    };
  }

  /**
   * Authenticate with API key
   */
  async authenticateWithApiKey(apiKey: string): Promise<boolean> {
    try {
      await this.apiKeyManager.storeApiKey(apiKey);
      
      // Validate key with backend
      const isValid = await this.validateApiKey();
      this.isAuthenticated = isValid;
      return isValid;
    } catch (error) {
      console.error('API key authentication failed:', error);
      return false;
    }
  }

  /**
   * Validate API key with backend
   */
  private async validateApiKey(): Promise<boolean> {
    const apiKey = await this.apiKeyManager.getApiKey();
    if (!apiKey) return false;

    try {
      const response = await fetch('https://api.lanonasis.com/v1/auth/validate', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get authentication headers for API requests
   */
  async getAuthHeaders(): Promise<Record<string, string>> {
    const apiKey = await this.apiKeyManager.getApiKey();
    if (!apiKey) {
      throw new Error('Not authenticated');
    }

    return {
      'Authorization': `Bearer ${apiKey}`,
      'X-API-Key': apiKey,
      'X-Project-Scope': 'lanonasis-maas'
    };
  }

  /**
   * Logout and clear credentials
   */
  async logout(): Promise<void> {
    await this.apiKeyManager.deleteApiKey();
    await this.storage.clear();
    this.isAuthenticated = false;
  }

  /**
   * Check authentication status
   */
  getAuthStatus(): boolean {
    return this.isAuthenticated;
  }
}

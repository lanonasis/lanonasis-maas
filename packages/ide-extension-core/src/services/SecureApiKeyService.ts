/**
 * Secure API Key Service
 * 
 * Platform-agnostic authentication service that supports:
 * - OAuth2 with PKCE flow
 * - Direct API key authentication
 * - Automatic token refresh
 * - Secure credential storage
 * - Migration from legacy storage
 */

import * as http from 'http';
import { URL, URLSearchParams } from 'url';
import { IIDEAdapter } from '../adapters/IIDEAdapter';
import {
  ISecureAuthService,
  CredentialType,
  StoredCredential,
  OAuthToken,
  PKCEParams,
  AuthStatus
} from '../types/auth';
import {
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
  looksLikeJwt,
  ensureApiKeyHash,
  isSha256Hash
} from '../utils/crypto';

/**
 * Secure API Key Service Implementation
 */
export class SecureApiKeyService implements ISecureAuthService {
  private static readonly API_KEY_KEY = 'lanonasis.apiKey';
  private static readonly AUTH_TOKEN_KEY = 'lanonasis.authToken';
  private static readonly REFRESH_TOKEN_KEY = 'lanonasis.refreshToken';
  private static readonly CREDENTIAL_TYPE_KEY = 'lanonasis.credentialType';
  private static readonly CALLBACK_PORT = 8080;
  private static readonly OAUTH_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

  private adapter: IIDEAdapter;
  private migrationCompleted: boolean = false;

  constructor(adapter: IIDEAdapter) {
    this.adapter = adapter;
  }

  /**
   * Initialize and migrate from legacy configuration if needed
   */
  async initialize(): Promise<void> {
    await this.migrateFromLegacyStorage();
  }

  /**
   * Get API key or token, prompting if needed
   */
  async getApiKeyOrPrompt(): Promise<string | null> {
    // Try to get from secure storage first
    const apiKey = await this.getApiKey();
    if (apiKey) {
      return apiKey;
    }

    // Check OAuth token
    const credential = await this.getStoredCredentials();
    if (credential?.type === 'oauth') {
      return credential.token;
    }

    // Prompt user if not available
    return await this.promptForAuthentication();
  }

  /**
   * Get API key from secure storage
   * OAuth tokens are returned as-is (not hashed), API keys are hashed
   */
  async getApiKey(): Promise<string | null> {
    try {
      const apiKey = await this.adapter.secureStorage.get(SecureApiKeyService.API_KEY_KEY);
      if (!apiKey) {
        return null;
      }

      // Check if this is an OAuth token
      const storedType = await this.adapter.secureStorage.get(
        SecureApiKeyService.CREDENTIAL_TYPE_KEY
      ) as CredentialType | null;

      // OAuth tokens should NEVER be hashed - they are signed JWTs
      if (storedType === 'oauth' || looksLikeJwt(apiKey)) {
        this.log('Retrieved OAuth token from secure storage (unhashed)');
        return apiKey;
      }

      // Only hash regular API keys
      const normalized = isSha256Hash(apiKey) ? apiKey.toLowerCase() : ensureApiKeyHash(apiKey);

      // Persist migration from legacy plaintext to hashed form for API keys only
      if (normalized !== apiKey) {
        await this.adapter.secureStorage.store(SecureApiKeyService.API_KEY_KEY, normalized);
      }

      this.log('Retrieved API key hash from secure storage');
      return normalized;
    } catch (error) {
      this.logError('Failed to retrieve API key from secure storage', error);
      return null;
    }
  }

  /**
   * Check if API key is configured
   */
  async hasApiKey(): Promise<boolean> {
    const apiKey = await this.getApiKey();
    if (apiKey) return true;

    // Also check for OAuth token
    const credential = await this.getStoredCredentials();
    return credential !== null;
  }

  /**
   * Store API key in secure storage
   * OAuth tokens are stored as-is, API keys are hashed
   */
  async storeApiKey(apiKey: string, type: CredentialType = 'apiKey'): Promise<void> {
    // CRITICAL: Do not hash OAuth tokens! Only hash regular API keys
    const tokenToStore = type === 'oauth' ? apiKey : ensureApiKeyHash(apiKey);
    await this.adapter.secureStorage.store(SecureApiKeyService.API_KEY_KEY, tokenToStore);
    await this.adapter.secureStorage.store(SecureApiKeyService.CREDENTIAL_TYPE_KEY, type);
    this.log(`Stored ${type} credential securely`);
  }

  /**
   * Get stored credentials with type information
   */
  async getStoredCredentials(): Promise<StoredCredential | null> {
    // Prefer OAuth tokens when available
    const authToken = await this.adapter.secureStorage.get(SecureApiKeyService.AUTH_TOKEN_KEY);
    if (authToken) {
      try {
        const token = JSON.parse(authToken) as OAuthToken & { expires_at?: number };
        if (token?.access_token) {
          // Check if token is still valid
          if (this.isTokenValid(token)) {
            return {
              type: 'oauth',
              token: token.access_token,
              refreshToken: token.refresh_token,
              expiresAt: token.expires_at
            };
          }

          // Token expired - try to refresh
          this.log('Access token expired, attempting refresh...');
          const refreshedToken = await this.refreshAccessToken();
          if (refreshedToken) {
            const refreshedCredential = await this.getStoredCredentials();
            if (refreshedCredential) {
              return refreshedCredential;
            }
          }

          // Refresh failed - clear expired credentials
          this.log('Token refresh failed, clearing expired credentials');
          await this.clearCredentials();
          return null;
        }
      } catch (error) {
        this.logError('Failed to parse stored OAuth token', error);
      }
    }

    const apiKey = await this.getApiKey();
    if (apiKey) {
      const storedType = await this.adapter.secureStorage.get(
        SecureApiKeyService.CREDENTIAL_TYPE_KEY
      ) as CredentialType | null;
      
      const inferredType: CredentialType = 
        storedType === 'oauth' || storedType === 'apiKey'
          ? storedType
          : (looksLikeJwt(apiKey) ? 'oauth' : 'apiKey');
      
      return { type: inferredType, token: apiKey };
    }

    return null;
  }

  /**
   * Authenticate using OAuth flow
   */
  async authenticateWithOAuth(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      let timeoutId: NodeJS.Timeout | undefined;

      try {
        const config = this.adapter.getConfig();
        const authUrl = config.authUrl;
        const clientId = `${this.adapter.branding.ideName.toLowerCase()}-extension`;
        const redirectUri = `http://localhost:${SecureApiKeyService.CALLBACK_PORT}/callback`;

        // Generate PKCE parameters
        const codeVerifier = generateCodeVerifier();
        const codeChallenge = generateCodeChallenge(codeVerifier);
        const state = generateState();

        // Store PKCE data temporarily
        this.adapter.secureStorage.store('oauth_code_verifier', codeVerifier);
        this.adapter.secureStorage.store('oauth_state', state);

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
        const server = http.createServer(async (req, res) => {
          try {
            if (!req.url) {
              res.writeHead(400, { 'Content-Type': 'text/plain' });
              res.end('Missing URL');
              return;
            }

            const url = new URL(req.url, `http://localhost:${SecureApiKeyService.CALLBACK_PORT}`);

            if (url.pathname === '/callback') {
              const code = url.searchParams.get('code');
              const returnedState = url.searchParams.get('state');
              const error = url.searchParams.get('error');

              // Validate state
              const storedState = await this.adapter.secureStorage.get('oauth_state');
              if (returnedState !== storedState) {
                res.writeHead(400, { 'Content-Type': 'text/html' });
                res.end('<h1>Invalid state parameter</h1>');
                server.close();
                if (timeoutId) clearTimeout(timeoutId);
                reject(new Error('Invalid state parameter'));
                return;
              }

              if (error) {
                res.writeHead(400, { 'Content-Type': 'text/html' });
                res.end(`<h1>OAuth Error: ${error}</h1>`);
                server.close();
                if (timeoutId) clearTimeout(timeoutId);
                reject(new Error(`OAuth error: ${error}`));
                return;
              }

              if (code) {
                // Exchange code for token
                const token = await this.exchangeCodeForToken(
                  code,
                  codeVerifier,
                  redirectUri,
                  authUrl
                );

                // Store token securely
                await this.storeApiKey(token.access_token, 'oauth');
                if (token.refresh_token) {
                  await this.adapter.secureStorage.store(
                    SecureApiKeyService.REFRESH_TOKEN_KEY,
                    token.refresh_token
                  );
                }

                // Send success response
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(`
                  <html>
                    <head><title>Authentication Success</title></head>
                    <body>
                      <h1 style="color: green;">✓ Authentication Successful!</h1>
                      <p>You can close this window and return to ${this.adapter.branding.ideName}.</p>
                      <script>setTimeout(() => window.close(), 2000);</script>
                    </body>
                  </html>
                `);

                // Cleanup
                await this.adapter.secureStorage.delete('oauth_code_verifier');
                await this.adapter.secureStorage.delete('oauth_state');
                server.close();
                if (timeoutId) clearTimeout(timeoutId);
                
                // Show success notification
                await this.adapter.notification.showInformation(
                  'Authentication successful! You can now use LanOnasis Memory Assistant.'
                );
                
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
            if (timeoutId) clearTimeout(timeoutId);
            reject(err);
          }
        });

        // Add error handling for server
        server.on('error', (err: NodeJS.ErrnoException) => {
          if (timeoutId) clearTimeout(timeoutId);

          if (err.code === 'EADDRINUSE') {
            reject(
              new Error(
                `Port ${SecureApiKeyService.CALLBACK_PORT} is already in use. ` +
                `Please close any applications using this port and try again.`
              )
            );
          } else {
            reject(new Error(`Failed to start OAuth callback server: ${err.message}`));
          }
        });

        server.listen(SecureApiKeyService.CALLBACK_PORT, 'localhost', () => {
          this.log(`OAuth callback server listening on port ${SecureApiKeyService.CALLBACK_PORT}`);

          // Open browser only after server is ready
          this.adapter.browser.openExternal(authUrlObj.toString());
        });

        // Timeout after configured time
        timeoutId = setTimeout(() => {
          server.close();
          reject(new Error('OAuth authentication timeout'));
        }, SecureApiKeyService.OAUTH_TIMEOUT_MS);

      } catch (error) {
        if (timeoutId) clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  /**
   * Authenticate using API key
   */
  async authenticateWithApiKey(apiKey: string): Promise<boolean> {
    if (!apiKey || apiKey.trim().length === 0) {
      return false;
    }

    // Store API key securely
    await this.storeApiKey(apiKey, 'apiKey');
    
    // Clear OAuth tokens if they exist
    await this.adapter.secureStorage.delete(SecureApiKeyService.AUTH_TOKEN_KEY);
    await this.adapter.secureStorage.delete(SecureApiKeyService.REFRESH_TOKEN_KEY);
    
    this.log('API key stored securely');
    return true;
  }

  /**
   * Refresh OAuth token
   */
  async refreshToken(): Promise<boolean> {
    const token = await this.refreshAccessToken();
    return token !== null;
  }

  /**
   * Check if token needs refresh
   */
  async needsTokenRefresh(): Promise<boolean> {
    const authToken = await this.adapter.secureStorage.get(SecureApiKeyService.AUTH_TOKEN_KEY);
    if (!authToken) {
      return false;
    }

    try {
      const token = JSON.parse(authToken) as { expires_at?: number };
      if (!token.expires_at) {
        return false;
      }

      // Refresh if less than 5 minutes remaining
      return Date.now() >= token.expires_at - (5 * 60 * 1000);
    } catch {
      return false;
    }
  }

  /**
   * Clear all stored credentials
   */
  async clearCredentials(): Promise<void> {
    await this.adapter.secureStorage.delete(SecureApiKeyService.API_KEY_KEY);
    await this.adapter.secureStorage.delete(SecureApiKeyService.AUTH_TOKEN_KEY);
    await this.adapter.secureStorage.delete(SecureApiKeyService.REFRESH_TOKEN_KEY);
    await this.adapter.secureStorage.delete(SecureApiKeyService.CREDENTIAL_TYPE_KEY);
    this.log('All credentials cleared from secure storage');
  }

  /**
   * Get authentication status
   */
  async getAuthStatus(): Promise<AuthStatus> {
    const credential = await this.getStoredCredentials();
    if (!credential) {
      return { isAuthenticated: false };
    }

    const needsRefresh = await this.needsTokenRefresh();

    return {
      isAuthenticated: true,
      credentialType: credential.type,
      expiresAt: credential.expiresAt,
      needsRefresh
    };
  }

  /**
   * Migrate from legacy storage
   */
  async migrateFromLegacyStorage(): Promise<boolean> {
    if (this.migrationCompleted) {
      return false;
    }

    // Check if already in secure storage
    const hasSecureKey = await this.hasApiKey();
    if (hasSecureKey) {
      this.migrationCompleted = true;
      return false;
    }

    // Check configuration for legacy API key
    const legacyKey = this.adapter.configuration.get<string>('lanonasis.apiKey');

    if (legacyKey) {
      // Migrate to secure storage
      await this.storeApiKey(legacyKey, 'apiKey');
      this.log('Migrated API key from configuration to secure storage');

      // Notify user
      await this.adapter.notification.showInformation(
        'API key migrated to secure storage. Your credentials are now stored securely.',
        'OK'
      );

      this.migrationCompleted = true;
      return true;
    }

    this.migrationCompleted = true;
    return false;
  }

  /**
   * Prompt user for authentication
   * @private
   */
  private async promptForAuthentication(): Promise<string | null> {
    const choice = await this.adapter.input.showQuickPick(
      [
        {
          label: '$(key) OAuth (Browser)',
          description: 'Authenticate using OAuth2 with browser (Recommended)'
        },
        {
          label: '$(key) API Key',
          description: 'Enter API key directly'
        },
        {
          label: '$(circle-slash) Cancel',
          description: 'Cancel authentication'
        }
      ],
      {
        placeHolder: 'Choose authentication method'
      }
    );

    if (!choice) {
      return null;
    }

    // Handle both string and object returns
    let choiceLabel: string;
    if (typeof choice === 'string') {
      choiceLabel = choice;
    } else if (Array.isArray(choice)) {
      if (choice.length === 0) return null;
      const first = choice[0];
      choiceLabel = typeof first === 'string' ? first : (first as any).label;
    } else {
      choiceLabel = (choice as any).label;
    }

    if (choiceLabel.includes('Cancel')) {
      return null;
    }

    if (choiceLabel.includes('OAuth')) {
      const success = await this.authenticateWithOAuth();
      if (success) {
        return await this.getApiKey();
      }
    } else if (choiceLabel.includes('API Key')) {
      return await this.promptForApiKeyEntry();
    }

    return null;
  }

  /**
   * Prompt for API key entry
   * @private
   */
  private async promptForApiKeyEntry(): Promise<string | null> {
    const apiKey = await this.adapter.input.showInputBox({
      prompt: 'Enter your Lanonasis API Key',
      placeHolder: 'Get your API key from api.lanonasis.com',
      password: true,
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'API key is required';
        }
        if (value.length < 20) {
          return 'API key seems too short';
        }
        return null;
      }
    });

    if (apiKey) {
      await this.authenticateWithApiKey(apiKey);
      return apiKey;
    }

    return null;
  }

  /**
   * Refresh access token using stored refresh token
   * @private
   */
  private async refreshAccessToken(): Promise<string | null> {
    try {
      const refreshToken = await this.adapter.secureStorage.get(
        SecureApiKeyService.REFRESH_TOKEN_KEY
      );
      if (!refreshToken) {
        this.log('No refresh token available');
        return null;
      }

      const config = this.adapter.getConfig();
      const tokenUrl = new URL('/oauth/token', config.authUrl);

      this.log(`Refreshing token via ${tokenUrl.toString()}`);

      const body = new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: `${this.adapter.branding.ideName.toLowerCase()}-extension`,
        refresh_token: refreshToken
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
        this.logError(`Token refresh failed: ${response.status}`, errorText);

        // If refresh token is invalid/expired, clear it
        if (response.status === 400 || response.status === 401) {
          await this.adapter.secureStorage.delete(SecureApiKeyService.REFRESH_TOKEN_KEY);
        }
        return null;
      }

      const tokenData = await response.json() as {
        access_token: string;
        refresh_token?: string;
        expires_in?: number;
      };

      // Store new access token with expiration
      const newToken = {
        access_token: tokenData.access_token,
        expires_at: Date.now() + (tokenData.expires_in ? tokenData.expires_in * 1000 : 3600000)
      };
      await this.adapter.secureStorage.store(
        SecureApiKeyService.AUTH_TOKEN_KEY,
        JSON.stringify(newToken)
      );

      // Also update the API_KEY_KEY for backward compatibility
      await this.storeApiKey(tokenData.access_token, 'oauth');

      // Update refresh token if a new one was issued (token rotation)
      if (tokenData.refresh_token) {
        await this.adapter.secureStorage.store(
          SecureApiKeyService.REFRESH_TOKEN_KEY,
          tokenData.refresh_token
        );
        this.log('Refresh token rotated');
      }

      this.log('Access token refreshed successfully');
      return tokenData.access_token;

    } catch (error) {
      this.logError('Token refresh error', error);
      return null;
    }
  }

  /**
   * Exchange OAuth authorization code for token
   * @private
   */
  private async exchangeCodeForToken(
    code: string,
    codeVerifier: string,
    redirectUri: string,
    authUrl: string
  ): Promise<{ access_token: string; refresh_token?: string }> {
    const tokenUrl = new URL('/oauth/token', authUrl);

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: `${this.adapter.branding.ideName.toLowerCase()}-extension`,
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

    // Store token with expiration
    const token = {
      access_token: tokenData.access_token,
      expires_at: Date.now() + (tokenData.expires_in ? tokenData.expires_in * 1000 : 3600000)
    };
    await this.adapter.secureStorage.store(
      SecureApiKeyService.AUTH_TOKEN_KEY,
      JSON.stringify(token)
    );

    return {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token
    };
  }

  /**
   * Check if OAuth token is valid
   * @private
   */
  private isTokenValid(token: { expires_at?: number }): boolean {
    if (!token.expires_at) return true;
    return Date.now() < token.expires_at - 60000; // 1 minute buffer
  }

  /**
   * Log message to output channel
   * @private
   */
  private log(message: string): void {
    const timestamp = new Date().toISOString();
    this.adapter.outputChannel.appendLine(
      `[${timestamp}] [SecureApiKeyService] ${message}`
    );
  }

  /**
   * Log error to output channel
   * @private
   */
  private logError(message: string, error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    this.log(`${message}: ${errorMessage}`);
    console.error(message, error);
  }
}

import * as vscode from 'vscode';
import * as http from 'http';
import * as crypto from 'crypto';
import { URL, URLSearchParams } from 'url';
import { ensureApiKeyHash, isSha256Hash } from '../utils/hash-utils';

/**
 * Secure API Key Service
 * Manages API keys using VS Code SecretStorage API
 * Supports both OAuth and direct API key authentication
 */
export type CredentialType = 'oauth' | 'apiKey';

export interface StoredCredential {
    type: CredentialType;
    token: string;
}

export class SecureApiKeyService {
    private static readonly API_KEY_KEY = 'lanonasis.apiKey';
  private static readonly API_KEY_RAW_KEY = 'lanonasis.apiKey.raw';
    private static readonly AUTH_TOKEN_KEY = 'lanonasis.authToken';
    private static readonly REFRESH_TOKEN_KEY = 'lanonasis.refreshToken';
    private static readonly CREDENTIAL_TYPE_KEY = 'lanonasis.credentialType';
    private static readonly CALLBACK_PORT = 8080;

    private context: vscode.ExtensionContext;
    private outputChannel: vscode.OutputChannel;
    private migrationCompleted: boolean = false;

    constructor(context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel) {
        this.context = context;
        this.outputChannel = outputChannel;
    }

    /**
     * Initialize and migrate from legacy configuration if needed
     */
    async initialize(): Promise<void> {
        await this.migrateFromConfigIfNeeded();
    }

    /**
     * Get API key from secure storage, or prompt if not available
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
     * CRITICAL FIX: OAuth tokens must not be hashed - return them as-is
     */
    async getApiKey(): Promise<string | null> {
        try {
      const rawKey = await this.context.secrets.get(SecureApiKeyService.API_KEY_RAW_KEY);
      if (rawKey) {
        return rawKey;
      }

            const apiKey = await this.context.secrets.get(SecureApiKeyService.API_KEY_KEY);
            if (!apiKey) {
                return null;
            }

            // Check if this is an OAuth token (stored unhashed with credential type)
            const storedType = await this.context.secrets.get(SecureApiKeyService.CREDENTIAL_TYPE_KEY) as CredentialType | null;

            // OAuth tokens should NEVER be hashed - they are signed JWTs
            if (storedType === 'oauth' || this.looksLikeJwt(apiKey)) {
                this.log('Retrieved OAuth token from secure storage (unhashed)');
                return apiKey;
            }

      // If the stored value is a hash, prompt user to re-enter raw key to migrate
      if (isSha256Hash(apiKey)) {
        const selection = await vscode.window.showWarningMessage(
          'Your API key needs to be re-entered to finish authentication.',
          'Re-enter API Key',
          'Cancel'
        );

        if (selection === 'Re-enter API Key') {
          const newKey = await this.promptForApiKeyEntry();
          if (newKey) {
            // Ensure migration stores the raw key even if prompt was mocked
            await this.storeApiKey(newKey, 'apiKey');
            return newKey;
          }
        }

        return null;
      }

      // Legacy plaintext API key stored in API_KEY_KEY - migrate to raw slot
      await this.context.secrets.store(SecureApiKeyService.API_KEY_RAW_KEY, apiKey);
      this.log('Migrated plaintext API key to raw storage');
      return apiKey;
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
        const authHeader = await this.getAuthenticationHeader();
        return authHeader !== null;
    }

    /**
     * Prompt user for authentication (OAuth or API key)
     */
    async promptForAuthentication(): Promise<string | null> {
        const choice = await vscode.window.showQuickPick(
            [
                {
                    label: '$(key) OAuth (Browser)',
                    description: 'Authenticate using OAuth2 with browser (Recommended)',
                    value: 'oauth'
                },
                {
                    label: '$(key) API Key',
                    description: 'Enter API key directly',
                    value: 'apikey'
                },
                {
                    label: '$(circle-slash) Cancel',
                    description: 'Cancel authentication',
                    value: 'cancel'
                }
            ],
            {
                placeHolder: 'Choose authentication method'
            }
        );

        if (!choice || choice.value === 'cancel') {
            return null;
        }

        if (choice.value === 'oauth') {
            return await this.authenticateWithOAuthFlow();
        } else if (choice.value === 'apikey') {
            return await this.promptForApiKeyEntry();
        }

        return null;
    }

    /**
     * Run the OAuth authentication flow and return the stored API key/token
     */
    async authenticateWithOAuthFlow(): Promise<string | null> {
        const success = await this.authenticateOAuth();
        if (!success) {
            return null;
        }

        const apiKey = await this.getApiKey();
        if (apiKey) {
            return apiKey;
        }

        const authHeader = await this.getAuthenticationHeader();
        if (authHeader?.startsWith('Bearer ')) {
            return authHeader.replace('Bearer ', '');
        }

        return null;
    }

    /**
     * Prompt for raw API key entry and persist it securely
     */
    async promptForApiKeyEntry(): Promise<string | null> {
        const apiKey = await vscode.window.showInputBox({
            prompt: 'Enter your Lanonasis API Key',
            placeHolder: 'Get your API key from api.lanonasis.com',
            password: true,
            ignoreFocusOut: true,
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
            await this.storeApiKey(apiKey, 'apiKey');
            await this.context.secrets.delete(SecureApiKeyService.AUTH_TOKEN_KEY);
            await this.context.secrets.delete(SecureApiKeyService.REFRESH_TOKEN_KEY);
            this.log('API key stored securely');
            return apiKey;
        }

        return null;
    }

    /**
     * Authenticate using Device Code flow (RFC 8628)
     * This is the preferred method - works in SSH, containers, and remote environments
     * No localhost redirect server needed!
     */
    async authenticateOAuth(): Promise<boolean> {
        try {
            const config = vscode.workspace.getConfiguration('lanonasis');
            const authUrl = config.get<string>('authUrl') || 'https://auth.lanonasis.com';
            const clientId = 'vscode-extension';

            this.log('Starting Device Code authentication flow...');

            // Step 1: Request device code
            const deviceController = new AbortController();
            const deviceTimeoutId = setTimeout(() => deviceController.abort(), SecureApiKeyService.TOKEN_EXCHANGE_TIMEOUT_MS);

            let deviceResponse: Response;
            try {
                deviceResponse = await fetch(`${authUrl}/oauth/device`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        client_id: clientId,
                        scope: 'memories:read memories:write memories:delete'
                    }),
                    signal: deviceController.signal
                });
            } catch (error) {
                clearTimeout(deviceTimeoutId);
                if (error instanceof Error && error.name === 'AbortError') {
                    throw new Error(`Device code request timed out after ${SecureApiKeyService.TOKEN_EXCHANGE_TIMEOUT_MS / 1000} seconds. Please check your network connection.`);
                }
                throw error;
            } finally {
                clearTimeout(deviceTimeoutId);
            }

            if (!deviceResponse.ok) {
                const errorText = await deviceResponse.text();
                throw new Error(`Failed to request device code: ${deviceResponse.status} ${errorText}`);
            }

            const deviceData = await deviceResponse.json() as {
                device_code: string;
                user_code: string;
                verification_uri: string;
                verification_uri_complete: string;
                expires_in: number;
                interval: number;
            };

            this.log(`Device code received. User code: ${deviceData.user_code}`);

            // Step 2: Show user the code and open browser
            const openBrowser = await vscode.window.showInformationMessage(
                `Enter this code in your browser: ${deviceData.user_code}`,
                { modal: true },
                'Open Browser',
                'Copy Code'
            );

            if (openBrowser === 'Open Browser') {
                await vscode.env.openExternal(vscode.Uri.parse(deviceData.verification_uri_complete));
            } else if (openBrowser === 'Copy Code') {
                await vscode.env.clipboard.writeText(deviceData.user_code);
                await vscode.env.openExternal(vscode.Uri.parse(deviceData.verification_uri));
                vscode.window.showInformationMessage('Code copied! Paste it in the browser window.');
            } else {
                this.log('User cancelled device code flow');
                return false;
            }

            // Step 3: Poll for authorization
            const pollInterval = (deviceData.interval || 5) * 1000;
            const expiresAt = Date.now() + (deviceData.expires_in * 1000);
            const grantType = 'urn:ietf:params:oauth:grant-type:device_code';

            return await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Waiting for authorization...',
                cancellable: true
            }, async (progress, cancellationToken) => {
                while (Date.now() < expiresAt) {
                    if (cancellationToken.isCancellationRequested) {
                        this.log('User cancelled device code polling');
                        return false;
                    }

                    // Wait before polling
                    await new Promise(resolve => setTimeout(resolve, pollInterval));

                    try {
                        const pollController = new AbortController();
                        const pollTimeoutId = setTimeout(() => pollController.abort(), SecureApiKeyService.TOKEN_EXCHANGE_TIMEOUT_MS);

                        let tokenResponse: Response;
                        try {
                            tokenResponse = await fetch(`${authUrl}/oauth/token`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/x-www-form-urlencoded',
                                    'Accept': 'application/json'
                                },
                                body: new URLSearchParams({
                                    grant_type: grantType,
                                    device_code: deviceData.device_code,
                                    client_id: clientId
                                }).toString(),
                                signal: pollController.signal
                            });
                        } finally {
                            clearTimeout(pollTimeoutId);
                        }

                        const tokenData = await tokenResponse.json() as {
                            access_token?: string;
                            refresh_token?: string;
                            expires_in?: number;
                            error?: string;
                            error_description?: string;
                        };

                        if (tokenData.error === 'authorization_pending') {
                            // Still waiting for user to authorize
                            progress.report({ message: 'Waiting for you to authorize in browser...' });
                            continue;
                        }

                        if (tokenData.error === 'slow_down') {
                            // Server wants us to slow down
                            await new Promise(resolve => setTimeout(resolve, pollInterval));
                            continue;
                        }

                        if (tokenData.error === 'access_denied') {
                            this.log('User denied authorization');
                            vscode.window.showWarningMessage('Authorization was denied.');
                            return false;
                        }

                        if (tokenData.error === 'expired_token') {
                            this.log('Device code expired');
                            vscode.window.showWarningMessage('Authorization timed out. Please try again.');
                            return false;
                        }

                        if (tokenData.error) {
                            throw new Error(tokenData.error_description || tokenData.error);
                        }

                        if (tokenData.access_token) {
                            // Success! Store the token
                            await this.storeApiKey(tokenData.access_token, 'oauth');
                            if (tokenData.refresh_token) {
                                await this.context.secrets.store(SecureApiKeyService.REFRESH_TOKEN_KEY, tokenData.refresh_token);
                            }

                            // Store token with expiration info
                            const tokenInfo = {
                                access_token: tokenData.access_token,
                                expires_at: Date.now() + (tokenData.expires_in ? tokenData.expires_in * 1000 : 3600000)
                            };
                            await this.context.secrets.store(SecureApiKeyService.AUTH_TOKEN_KEY, JSON.stringify(tokenInfo));

                            this.log('Device code authentication successful!');
                            vscode.window.showInformationMessage('✓ Authentication successful!');
                            return true;
                        }
                    } catch (pollError) {
                        this.logError('Token polling error', pollError);
                        // Continue polling unless it's a fatal error
                    }
                }

                // Timeout
                this.log('Device code expired');
                vscode.window.showWarningMessage('Authorization timed out. Please try again.');
                return false;
            });

        } catch (error) {
            this.logError('Device code authentication failed', error);

            // Fallback to PKCE flow if device code fails
            this.log('Falling back to PKCE redirect flow...');
            return await this.authenticateOAuthPKCE();
        }
    }

    /**
     * Fallback: Authenticate with OAuth PKCE redirect flow
     * Used if Device Code flow fails (e.g., Redis not available on server)
     */
    private async authenticateOAuthPKCE(): Promise<boolean> {
        return new Promise((resolve, reject) => {
            // Store timeout reference to clear it on success/error
            let timeoutId: NodeJS.Timeout | undefined;

            try {
                const config = vscode.workspace.getConfiguration('lanonasis');
                const authUrl = config.get<string>('authUrl') || 'https://auth.lanonasis.com';
                const clientId = 'vscode-extension';
                const redirectUri = `http://localhost:${SecureApiKeyService.CALLBACK_PORT}/callback`;

                // Generate PKCE parameters
                const codeVerifier = this.generateCodeVerifier();
                const codeChallenge = this.generateCodeChallenge(codeVerifier);
                const state = this.generateState();

                // Store PKCE data temporarily
                this.context.secrets.store('oauth_code_verifier', codeVerifier);
                this.context.secrets.store('oauth_state', state);

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
                        const url = new URL(req.url, `http://localhost:${SecureApiKeyService.CALLBACK_PORT}`);

                        if (url.pathname === '/callback') {
                            const code = url.searchParams.get('code');
                            const returnedState = url.searchParams.get('state');
                            const error = url.searchParams.get('error');

                            // Validate state
                            const storedState = await this.context.secrets.get('oauth_state');
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
                                const token = await this.exchangeCodeForToken(code, codeVerifier, redirectUri, authUrl);

                                // Store token securely
                                await this.storeApiKey(token.access_token, 'oauth');
                                if (token.refresh_token) {
                                    await this.context.secrets.store(SecureApiKeyService.REFRESH_TOKEN_KEY, token.refresh_token);
                                }

                                // Send success response
                                res.writeHead(200, { 'Content-Type': 'text/html' });
                                res.end(`
                                  <html>
                                    <head><title>Authentication Success</title></head>
                                    <body>
                                      <h1 style="color: green;">✓ Authentication Successful!</h1>
                                      <p>You can close this window and return to VS Code.</p>
                                      <script>setTimeout(() => window.close(), 2000);</script>
                                    </body>
                                  </html>
                                `);

                                // Cleanup
                                await this.context.secrets.delete('oauth_code_verifier');
                                await this.context.secrets.delete('oauth_state');
                                server.close();
                                if (timeoutId) clearTimeout(timeoutId);
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
                        reject(new Error(`Port ${SecureApiKeyService.CALLBACK_PORT} is already in use. Please close any applications using this port and try again.`));
                    } else {
                        reject(new Error(`Failed to start OAuth callback server: ${err.message}`));
                    }
                });

                server.listen(SecureApiKeyService.CALLBACK_PORT, 'localhost', () => {
                    this.outputChannel.appendLine(`OAuth callback server listening on port ${SecureApiKeyService.CALLBACK_PORT}`);

                    // Open browser only after server is ready
                    vscode.env.openExternal(vscode.Uri.parse(authUrlObj.toString()));
                });

                // Timeout after 5 minutes
                timeoutId = setTimeout(() => {
                    server.close();
                    reject(new Error('OAuth authentication timeout'));
                }, 5 * 60 * 1000);

            } catch (error) {
                if (timeoutId) clearTimeout(timeoutId);
                reject(error);
            }
        });
    }

    /**
     * Get authentication header (OAuth token or API key)
     */
    async getAuthenticationHeader(): Promise<string | null> {
        const credential = await this.getStoredCredentials();
        if (credential?.type === 'oauth') {
            return `Bearer ${credential.token}`;
        }
        return null;
    }

    /**
     * Get the active credentials (OAuth token vs API key) for downstream services
     * Automatically refreshes expired OAuth tokens using stored refresh token
     */
    async getStoredCredentials(): Promise<StoredCredential | null> {
        // Prefer OAuth tokens when available
        const authToken = await this.context.secrets.get(SecureApiKeyService.AUTH_TOKEN_KEY);
        if (authToken) {
            try {
                const token = JSON.parse(authToken);
                if (token?.access_token) {
                    // Check if token is still valid
                    if (this.isTokenValid(token)) {
                        return { type: 'oauth', token: token.access_token };
                    }

                    // Token expired - try to refresh
                    this.log('Access token expired, attempting refresh...');
                    const refreshedToken = await this.refreshAccessToken();
                    if (refreshedToken) {
                        return { type: 'oauth', token: refreshedToken };
                    }

                    // Refresh failed - clear expired credentials
                    this.log('Token refresh failed, clearing expired credentials');
                    await this.deleteApiKey();
                    return null;
                }
            } catch (error) {
                this.logError('Failed to parse stored OAuth token', error);
            }
        }

        const apiKey = await this.getApiKey();
        if (apiKey) {
            const storedType = await this.context.secrets.get(SecureApiKeyService.CREDENTIAL_TYPE_KEY) as CredentialType | null;
            const inferredType: CredentialType = storedType === 'oauth' || storedType === 'apiKey'
                ? storedType
                : (this.looksLikeJwt(apiKey) ? 'oauth' : 'apiKey');
            return { type: inferredType, token: apiKey };
        }

        return null;
    }

    /**
     * Refresh access token using stored refresh token
     * Returns new access token on success, null on failure
     */
    private async refreshAccessToken(): Promise<string | null> {
        try {
            const refreshToken = await this.context.secrets.get(SecureApiKeyService.REFRESH_TOKEN_KEY);
            if (!refreshToken) {
                this.log('No refresh token available');
                return null;
            }

            // Get auth URL from configuration
            const config = vscode.workspace.getConfiguration('lanonasis');
            const authUrl = config.get<string>('authUrl') || 'https://auth.lanonasis.com';
            const tokenUrl = new URL('/oauth/token', authUrl);

            this.log(`Refreshing token via ${tokenUrl.toString()}`);

            const body = new URLSearchParams({
                grant_type: 'refresh_token',
                client_id: 'vscode-extension',
                refresh_token: refreshToken
            });

            const refreshController = new AbortController();
            const refreshTimeoutId = setTimeout(() => refreshController.abort(), SecureApiKeyService.TOKEN_EXCHANGE_TIMEOUT_MS);

            let response: Response;
            try {
                response = await fetch(tokenUrl.toString(), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Accept': 'application/json'
                    },
                    body: body.toString(),
                    signal: refreshController.signal
                });
            } catch (error) {
                clearTimeout(refreshTimeoutId);
                if (error instanceof Error && error.name === 'AbortError') {
                    this.logError('Token refresh timed out', `Timeout after ${SecureApiKeyService.TOKEN_EXCHANGE_TIMEOUT_MS / 1000} seconds`);
                    return null;
                }
                throw error;
            } finally {
                clearTimeout(refreshTimeoutId);
            }

            if (!response.ok) {
                const errorText = await response.text();
                this.logError(`Token refresh failed: ${response.status}`, errorText);

                // If refresh token is invalid/expired, clear it
                if (response.status === 400 || response.status === 401) {
                    await this.context.secrets.delete(SecureApiKeyService.REFRESH_TOKEN_KEY);
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
            await this.context.secrets.store(SecureApiKeyService.AUTH_TOKEN_KEY, JSON.stringify(newToken));

            // Also update the API_KEY_KEY for backward compatibility
            await this.storeApiKey(tokenData.access_token, 'oauth');

            // Update refresh token if a new one was issued (token rotation)
            if (tokenData.refresh_token) {
                await this.context.secrets.store(SecureApiKeyService.REFRESH_TOKEN_KEY, tokenData.refresh_token);
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
     * Delete API key from secure storage
     */
    async deleteApiKey(): Promise<void> {
        await this.context.secrets.delete(SecureApiKeyService.API_KEY_KEY);
    await this.context.secrets.delete(SecureApiKeyService.API_KEY_RAW_KEY);
        await this.context.secrets.delete(SecureApiKeyService.AUTH_TOKEN_KEY);
        await this.context.secrets.delete(SecureApiKeyService.REFRESH_TOKEN_KEY);
        await this.context.secrets.delete(SecureApiKeyService.CREDENTIAL_TYPE_KEY);
        this.log('API key removed from secure storage');
    }

    /**
     * Store API key securely
   *
   * Transport vs storage contract:
   * - Transport: always use RAW secret for outbound auth (X-API-Key or Bearer).
   * - Storage/DB compare: keep a hash only for at-rest verification, never send the hash as a credential.
     * NOTE: OAuth tokens should NOT be hashed - they are signed JWTs that must be sent as-is
     * Only regular API keys (lns_...) should be hashed for security
     */
    private async storeApiKey(apiKey: string, type: CredentialType): Promise<void> {
    // Store raw key for transport; store hash separately for legacy/backward-compat
    if (type === 'oauth') {
      await this.context.secrets.store(SecureApiKeyService.API_KEY_RAW_KEY, apiKey);
      await this.context.secrets.store(SecureApiKeyService.API_KEY_KEY, apiKey);
      await this.context.secrets.store(SecureApiKeyService.CREDENTIAL_TYPE_KEY, type);
      return;
    }

    await this.context.secrets.store(SecureApiKeyService.API_KEY_RAW_KEY, apiKey);
    await this.context.secrets.store(SecureApiKeyService.API_KEY_KEY, ensureApiKeyHash(apiKey));
        await this.context.secrets.store(SecureApiKeyService.CREDENTIAL_TYPE_KEY, type);
    }

    /**
     * Migrate API key from configuration to secure storage
     */
    private async migrateFromConfigIfNeeded(): Promise<void> {
        if (this.migrationCompleted) {
            return;
        }

        // Check if already in secure storage
        const hasSecureKey = await this.hasApiKey();
        if (hasSecureKey) {
            this.migrationCompleted = true;
            return;
        }

        // Check configuration for legacy API key
        const config = vscode.workspace.getConfiguration('lanonasis');
        const legacyKey = config.get<string>('apiKey');

        if (legacyKey) {
            // Migrate to secure storage
            await this.storeApiKey(legacyKey, 'apiKey');
            this.log('Migrated API key from configuration to secure storage');

            // Optionally clear from config (but keep it for now for backward compatibility)
            // await config.update('apiKey', undefined, vscode.ConfigurationTarget.Global);

            // Notify user
            vscode.window.showInformationMessage(
                'API key migrated to secure storage. Your credentials are now stored securely.',
                'OK'
            );
        }

        this.migrationCompleted = true;
    }

    /**
     * Exchange OAuth authorization code for token
     */
    private static readonly TOKEN_EXCHANGE_TIMEOUT_MS = 30000; // 30 seconds

    private async exchangeCodeForToken(
        code: string,
        codeVerifier: string,
        redirectUri: string,
        authUrl: string
    ): Promise<{ access_token: string; refresh_token?: string }> {
        const tokenUrl = new URL('/oauth/token', authUrl);

        const body = new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: 'vscode-extension',
            code,
            redirect_uri: redirectUri,
            code_verifier: codeVerifier
        });

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), SecureApiKeyService.TOKEN_EXCHANGE_TIMEOUT_MS);

        let response: Response;
        try {
            response = await fetch(tokenUrl.toString(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json'
                },
                body: body.toString(),
                signal: controller.signal
            });
        } catch (error) {
            clearTimeout(timeoutId);
            if (error instanceof Error && error.name === 'AbortError') {
                throw new Error(`Token exchange timed out after ${SecureApiKeyService.TOKEN_EXCHANGE_TIMEOUT_MS / 1000} seconds. Please check your network connection and try again.`);
            }
            throw error;
        } finally {
            clearTimeout(timeoutId);
        }

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
        await this.context.secrets.store(SecureApiKeyService.AUTH_TOKEN_KEY, JSON.stringify(token));

        return {
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token
        };
    }

    /**
     * Check if OAuth token is valid
     */
    private isTokenValid(token: { expires_at?: number }): boolean {
        if (!token.expires_at) return true;
        return Date.now() < token.expires_at - 60000; // 1 minute buffer
    }

    private looksLikeJwt(value: string): boolean {
        const parts = value.split('.');
        if (parts.length !== 3) {
            return false;
        }
        const jwtSegment = /^[A-Za-z0-9-_]+$/;
        return parts.every(segment => jwtSegment.test(segment));
    }

    /**
     * Generate PKCE code verifier
     */
    private generateCodeVerifier(): string {
        return crypto.randomBytes(32).toString('base64url');
    }

    /**
     * Generate PKCE code challenge
     */
    private generateCodeChallenge(verifier: string): string {
        return crypto.createHash('sha256').update(verifier).digest('base64url');
    }

    /**
     * Generate OAuth state parameter
     */
    private generateState(): string {
        return crypto.randomBytes(16).toString('hex');
    }

    /**
     * Log message to output channel
     */
    private log(message: string): void {
        const timestamp = new Date().toISOString();
        this.outputChannel.appendLine(`[${timestamp}] [SecureApiKeyService] ${message}`);
    }

    /**
     * Log error to output channel
     */
    private logError(message: string, error: unknown): void {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.log(`${message}: ${errorMessage}`);
        console.error(message, error);
    }
}

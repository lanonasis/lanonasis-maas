import * as vscode from 'vscode';
import * as crypto from 'crypto';
import * as http from 'http';
import { URL } from 'url';

export interface AuthToken {
    access_token: string;
    refresh_token?: string;
    expires_at: number;
    token_type: string;
    scope: string;
}

export class AuthenticationService {
    private static readonly AUTH_TOKEN_KEY = 'lanonasis.authToken';
    private static readonly API_KEY_KEY = 'lanonasis.apiKey';
    private static readonly CALLBACK_PORT = 8080;
    private static readonly CALLBACK_PATH = '/callback';
    
    private context: vscode.ExtensionContext;
    private authToken: AuthToken | null = null;
    private server: http.Server | null = null;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.loadStoredToken();
    }

    async checkAuthenticationStatus(): Promise<boolean> {
        // Check for valid OAuth token first
        if (this.authToken && this.isTokenValid(this.authToken)) {
            return true;
        }

        // Try to refresh expired token
        if (this.authToken?.refresh_token) {
            try {
                await this.refreshToken();
                return true;
            } catch (error) {
                console.warn('Token refresh failed:', error);
            }
        }

        // Fallback to API key authentication
        const apiKey = await this.getStoredApiKey();
        if (apiKey) {
            try {
                await this.validateApiKey(apiKey);
                return true;
            } catch (error) {
                console.warn('API key validation failed:', error);
            }
        }

        return false;
    }

    async authenticateWithBrowser(cancellationToken?: vscode.CancellationToken): Promise<boolean> {
        return new Promise((resolve, reject) => {
            const config = vscode.workspace.getConfiguration('lanonasis');
            const authUrl = config.get<string>('authUrl', 'https://auth.lanonasis.com');
            
            // Generate PKCE challenge
            const codeVerifier = this.generateCodeVerifier();
            const codeChallenge = this.generateCodeChallenge(codeVerifier);
            const state = crypto.randomBytes(32).toString('hex');
            
            // Start local callback server
            this.server = http.createServer((req, res) => {
                this.handleCallback(req, res, codeVerifier, state, resolve, reject);
            });

            this.server.listen(AuthenticationService.CALLBACK_PORT, 'localhost', () => {
                console.log(`Callback server listening on port ${AuthenticationService.CALLBACK_PORT}`);
                
                // Build OAuth2 authorization URL
                const authUrlObj = new URL('/oauth/authorize', authUrl);
                authUrlObj.searchParams.set('client_id', 'cursor-extension');
                authUrlObj.searchParams.set('response_type', 'code');
                authUrlObj.searchParams.set('scope', 'memories:read memories:write memories:delete');
                authUrlObj.searchParams.set('redirect_uri', `http://localhost:${AuthenticationService.CALLBACK_PORT}${AuthenticationService.CALLBACK_PATH}`);
                authUrlObj.searchParams.set('code_challenge', codeChallenge);
                authUrlObj.searchParams.set('code_challenge_method', 'S256');
                authUrlObj.searchParams.set('state', state);
                
                // Open browser
                vscode.env.openExternal(vscode.Uri.parse(authUrlObj.toString()));
            });

            // Handle cancellation
            if (cancellationToken) {
                cancellationToken.onCancellationRequested(() => {
                    this.cleanup();
                    reject(new Error('Authentication cancelled'));
                });
            }

            // Timeout after 5 minutes
            setTimeout(() => {
                this.cleanup();
                reject(new Error('Authentication timeout'));
            }, 5 * 60 * 1000);
        });
    }

    async authenticateWithApiKey(apiKey: string): Promise<boolean> {
        try {
            await this.validateApiKey(apiKey);
            await this.storeApiKey(apiKey);
            return true;
        } catch (error) {
            throw new Error(`API key authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async logout(): Promise<void> {
        // Clear OAuth token
        this.authToken = null;
        await this.context.secrets.delete(AuthenticationService.AUTH_TOKEN_KEY);
        
        // Clear API key
        await this.context.secrets.delete(AuthenticationService.API_KEY_KEY);
        
        // Clear any stored configuration
        const config = vscode.workspace.getConfiguration('lanonasis');
        await config.update('apiKey', undefined, vscode.ConfigurationTarget.Global);
        
        this.cleanup();
    }

    async getAuthenticationHeader(): Promise<string | null> {
        // Prefer OAuth token
        if (this.authToken && this.isTokenValid(this.authToken)) {
            return `Bearer ${this.authToken.access_token}`;
        }

        // Try to refresh token
        if (this.authToken?.refresh_token) {
            try {
                await this.refreshToken();
                return `Bearer ${this.authToken!.access_token}`;
            } catch (error) {
                console.warn('Token refresh failed:', error);
            }
        }

        // Fallback to API key
        const apiKey = await this.getStoredApiKey();
        if (apiKey) {
            return `Bearer ${apiKey}`;
        }

        return null;
    }

    isAuthenticated(): boolean {
        return (this.authToken && this.isTokenValid(this.authToken)) || 
               (this.getStoredApiKey() !== null);
    }

    private async handleCallback(
        req: http.IncomingMessage,
        res: http.ServerResponse,
        codeVerifier: string,
        expectedState: string,
        resolve: (value: boolean) => void,
        reject: (reason: any) => void
    ): Promise<void> {
        try {
            const url = new URL(req.url!, `http://localhost:${AuthenticationService.CALLBACK_PORT}`);
            
            if (url.pathname !== AuthenticationService.CALLBACK_PATH) {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>Not Found</h1>');
                return;
            }

            const code = url.searchParams.get('code');
            const state = url.searchParams.get('state');
            const error = url.searchParams.get('error');

            if (error) {
                throw new Error(`OAuth error: ${error}`);
            }

            if (!code || !state) {
                throw new Error('Missing authorization code or state');
            }

            if (state !== expectedState) {
                throw new Error('Invalid state parameter');
            }

            // Exchange code for tokens
            const token = await this.exchangeCodeForToken(code, codeVerifier);
            
            // Store the token
            this.authToken = token;
            await this.storeToken(token);

            // Send success response
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`
                <html>
                    <head>
                        <title>Authentication Success</title>
                        <style>
                            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; text-align: center; padding: 50px; }
                            .success { color: #28a745; font-size: 24px; margin-bottom: 20px; }
                            .message { color: #6c757d; }
                        </style>
                    </head>
                    <body>
                        <div class="success">✅ Authentication Successful!</div>
                        <div class="message">You can now close this window and return to Cursor.</div>
                        <script>setTimeout(() => window.close(), 3000);</script>
                    </body>
                </html>
            `);

            this.cleanup();
            resolve(true);
        } catch (error) {
            // Send error response
            res.writeHead(400, { 'Content-Type': 'text/html' });
            res.end(`
                <html>
                    <head>
                        <title>Authentication Failed</title>
                        <style>
                            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; text-align: center; padding: 50px; }
                            .error { color: #dc3545; font-size: 24px; margin-bottom: 20px; }
                            .message { color: #6c757d; }
                        </style>
                    </head>
                    <body>
                        <div class="error">❌ Authentication Failed</div>
                        <div class="message">${error instanceof Error ? error.message : 'Unknown error'}</div>
                        <div class="message">Please try again or contact support.</div>
                    </body>
                </html>
            `);

            this.cleanup();
            reject(error);
        }
    }

    private async exchangeCodeForToken(code: string, codeVerifier: string): Promise<AuthToken> {
        const config = vscode.workspace.getConfiguration('lanonasis');
        const authUrl = config.get<string>('authUrl', 'https://auth.lanonasis.com');
        
        const tokenUrl = new URL('/oauth/token', authUrl);
        
        const body = new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: 'cursor-extension',
            code,
            redirect_uri: `http://localhost:${AuthenticationService.CALLBACK_PORT}${AuthenticationService.CALLBACK_PATH}`,
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
            const errorData = await response.text();
            throw new Error(`Token exchange failed: ${response.status} ${errorData}`);
        }

        const tokenData = await response.json() as {
            access_token: string;
            refresh_token?: string;
            expires_in: number;
            token_type?: string;
            scope?: string;
        };
        
        return {
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            expires_at: Date.now() + (tokenData.expires_in * 1000),
            token_type: tokenData.token_type || 'Bearer',
            scope: tokenData.scope || ''
        };
    }

    private async refreshToken(): Promise<void> {
        if (!this.authToken?.refresh_token) {
            throw new Error('No refresh token available');
        }

        const config = vscode.workspace.getConfiguration('lanonasis');
        const authUrl = config.get<string>('authUrl', 'https://auth.lanonasis.com');
        
        const tokenUrl = new URL('/oauth/token', authUrl);
        
        const body = new URLSearchParams({
            grant_type: 'refresh_token',
            client_id: 'cursor-extension',
            refresh_token: this.authToken.refresh_token
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
            throw new Error(`Token refresh failed: ${response.status}`);
        }

        const tokenData = await response.json() as {
            access_token: string;
            refresh_token?: string;
            expires_in: number;
            token_type?: string;
            scope?: string;
        };
        
        this.authToken = {
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token || this.authToken.refresh_token,
            expires_at: Date.now() + (tokenData.expires_in * 1000),
            token_type: tokenData.token_type || 'Bearer',
            scope: tokenData.scope || this.authToken.scope
        };

        await this.storeToken(this.authToken);
    }

    private async validateApiKey(apiKey: string): Promise<void> {
        const config = vscode.workspace.getConfiguration('lanonasis');
        const apiUrl = config.get<string>('apiUrl', 'https://api.lanonasis.com');
        const useGateway = config.get<boolean>('useGateway', true);
        
        const baseUrl = useGateway ? config.get<string>('gatewayUrl', apiUrl) : apiUrl;
        const testUrl = new URL('/api/v1/health', baseUrl);
        
        const response = await fetch(testUrl.toString(), {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`API key validation failed: ${response.status}`);
        }
    }

    private generateCodeVerifier(): string {
        return crypto.randomBytes(32).toString('base64url');
    }

    private generateCodeChallenge(verifier: string): string {
        return crypto.createHash('sha256').update(verifier).digest('base64url');
    }

    private isTokenValid(token: AuthToken): boolean {
        return Date.now() < token.expires_at - 60000; // 1 minute buffer
    }

    private async loadStoredToken(): Promise<void> {
        try {
            const tokenData = await this.context.secrets.get(AuthenticationService.AUTH_TOKEN_KEY);
            if (tokenData) {
                this.authToken = JSON.parse(tokenData);
            }
        } catch (error) {
            console.warn('Failed to load stored token:', error);
        }
    }

    private async storeToken(token: AuthToken): Promise<void> {
        await this.context.secrets.store(AuthenticationService.AUTH_TOKEN_KEY, JSON.stringify(token));
    }

    private async getStoredApiKey(): Promise<string | null> {
        // Check secure storage first
        const storedKey = await this.context.secrets.get(AuthenticationService.API_KEY_KEY);
        if (storedKey) {
            return storedKey;
        }

        // Fallback to configuration (legacy)
        const config = vscode.workspace.getConfiguration('lanonasis');
        return config.get<string>('apiKey') || null;
    }

    private async storeApiKey(apiKey: string): Promise<void> {
        await this.context.secrets.store(AuthenticationService.API_KEY_KEY, apiKey);
    }

    private cleanup(): void {
        if (this.server) {
            this.server.close();
            this.server = null;
        }
    }
}
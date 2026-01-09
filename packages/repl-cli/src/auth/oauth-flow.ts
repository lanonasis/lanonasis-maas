/**
 * OAuth 2.1 Authentication Flow for CLI
 *
 * Implements Authorization Code + PKCE flow with local HTTP callback server.
 * Supports both Auth-Gateway and Supabase OAuth Server.
 */

import http from 'http';
import crypto from 'crypto';
import { URL } from 'url';
import open from 'open';
import chalk from 'chalk';

export interface OAuthConfig {
  authBaseUrl: string;
  clientId: string;
  scope: string;
  callbackPort?: number;
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

interface PKCEPair {
  codeVerifier: string;
  codeChallenge: string;
}

const DEFAULT_CONFIG: OAuthConfig = {
  authBaseUrl: 'https://auth.lanonasis.com',
  clientId: 'lanonasis-repl-cli',
  scope: 'memories:read memories:write mcp:connect api:access',
  callbackPort: 8899,
};

/**
 * Generate PKCE code verifier and challenge
 */
function generatePKCE(): PKCEPair {
  // Generate random 32-byte code verifier
  const codeVerifier = crypto.randomBytes(32)
    .toString('base64url')
    .replace(/[^a-zA-Z0-9\-._~]/g, '');

  // Generate S256 code challenge
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');

  return { codeVerifier, codeChallenge };
}

/**
 * Generate random state parameter
 */
function generateState(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Start local HTTP server to receive OAuth callback
 */
function startCallbackServer(
  port: number,
  expectedState: string
): Promise<{ code: string; state: string }> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url || '', `http://localhost:${port}`);

      if (url.pathname === '/callback') {
        const code = url.searchParams.get('code');
        const state = url.searchParams.get('state');
        const error = url.searchParams.get('error');
        const errorDescription = url.searchParams.get('error_description');

        // Send response to browser
        res.writeHead(200, { 'Content-Type': 'text/html' });
        if (error) {
          res.end(`
            <html>
              <head><title>Authentication Failed</title></head>
              <body style="font-family: monospace; background: #1a1a1a; color: #ff5f56; padding: 40px; text-align: center;">
                <h2>Authentication Failed</h2>
                <p>${errorDescription || error}</p>
                <p style="color: #888;">You can close this window.</p>
              </body>
            </html>
          `);
          server.close();
          reject(new Error(errorDescription || error));
        } else if (state !== expectedState) {
          res.end(`
            <html>
              <head><title>Security Error</title></head>
              <body style="font-family: monospace; background: #1a1a1a; color: #ff5f56; padding: 40px; text-align: center;">
                <h2>Security Error</h2>
                <p>State mismatch - possible CSRF attack</p>
                <p style="color: #888;">You can close this window.</p>
              </body>
            </html>
          `);
          server.close();
          reject(new Error('State mismatch - possible CSRF attack'));
        } else if (code) {
          res.end(`
            <html>
              <head><title>Authentication Successful</title></head>
              <body style="font-family: monospace; background: #1a1a1a; color: #27c93f; padding: 40px; text-align: center;">
                <h2>Authentication Successful!</h2>
                <p>You can close this window and return to the CLI.</p>
              </body>
            </html>
          `);
          server.close();
          resolve({ code, state: state || '' });
        } else {
          res.end('Invalid callback');
          server.close();
          reject(new Error('No authorization code received'));
        }
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
    });

    server.on('error', (err) => {
      reject(new Error(`Failed to start callback server: ${err.message}`));
    });

    server.listen(port, '127.0.0.1', () => {
      // Server is ready
    });

    // Timeout after 5 minutes
    setTimeout(() => {
      server.close();
      reject(new Error('Authentication timeout - no callback received'));
    }, 5 * 60 * 1000);
  });
}

/**
 * Exchange authorization code for tokens
 */
async function exchangeCodeForTokens(
  config: OAuthConfig,
  code: string,
  codeVerifier: string,
  redirectUri: string
): Promise<TokenResponse> {
  // Supabase OAuth requires application/x-www-form-urlencoded for token exchange
  const response = await fetch(`${config.authBaseUrl}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: config.clientId,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error_description || error.error || 'Token exchange failed');
  }

  return response.json();
}

/**
 * Perform OAuth 2.1 Authorization Code + PKCE flow
 */
export async function performOAuthLogin(
  userConfig?: Partial<OAuthConfig>
): Promise<TokenResponse> {
  const config = { ...DEFAULT_CONFIG, ...userConfig };
  const port = config.callbackPort || 8899;
  const redirectUri = `http://localhost:${port}/callback`;

  console.log(chalk.cyan('\n🔐 Starting OAuth 2.1 Authentication\n'));

  // Generate PKCE and state
  const pkce = generatePKCE();
  const state = generateState();

  // Build authorization URL
  const authParams = new URLSearchParams({
    client_id: config.clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: config.scope,
    code_challenge: pkce.codeChallenge,
    code_challenge_method: 'S256',
    state,
  });

  const authUrl = `${config.authBaseUrl}/oauth/authorize?${authParams}`;

  console.log(chalk.gray('Authorization URL:'));
  console.log(chalk.gray(authUrl.substring(0, 80) + '...\n'));

  // Start callback server
  const callbackPromise = startCallbackServer(port, state);

  // Open browser
  console.log(chalk.yellow('Opening browser for authentication...'));
  console.log(chalk.gray(`If browser doesn't open, visit:\n${authUrl}\n`));

  try {
    await open(authUrl);
  } catch {
    console.log(chalk.yellow('Could not open browser automatically.'));
    console.log(chalk.yellow('Please open the URL above manually.\n'));
  }

  console.log(chalk.cyan('Waiting for authentication...'));

  // Wait for callback
  const { code } = await callbackPromise;

  console.log(chalk.green('✓ Authorization code received'));
  console.log(chalk.cyan('Exchanging code for tokens...'));

  // Exchange code for tokens
  const tokens = await exchangeCodeForTokens(config, code, pkce.codeVerifier, redirectUri);

  console.log(chalk.green('✓ Authentication successful!\n'));

  return tokens;
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(
  refreshToken: string,
  userConfig?: Partial<OAuthConfig>
): Promise<TokenResponse> {
  const config = { ...DEFAULT_CONFIG, ...userConfig };

  // Supabase OAuth requires application/x-www-form-urlencoded for token refresh
  const response = await fetch(`${config.authBaseUrl}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: config.clientId,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error_description || error.error || 'Token refresh failed');
  }

  return response.json();
}

/**
 * Verify token is still valid
 */
export async function verifyToken(
  token: string,
  userConfig?: Partial<OAuthConfig>
): Promise<boolean> {
  const config = { ...DEFAULT_CONFIG, ...userConfig };

  try {
    const response = await fetch(`${config.authBaseUrl}/oauth/introspect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) return false;

    const data = await response.json();
    return data.active === true;
  } catch {
    return false;
  }
}

/**
 * Revoke token
 */
export async function revokeToken(
  token: string,
  tokenType: 'access_token' | 'refresh_token' = 'access_token',
  userConfig?: Partial<OAuthConfig>
): Promise<boolean> {
  const config = { ...DEFAULT_CONFIG, ...userConfig };

  try {
    const response = await fetch(`${config.authBaseUrl}/oauth/revoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, token_type_hint: tokenType }),
    });

    const data = await response.json();
    return data.revoked === true;
  } catch {
    return false;
  }
}

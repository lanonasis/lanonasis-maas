/**
 * OAuth 2.0 Authorization Server for MCP/Claude Desktop Integration
 * Implements Authorization Code flow with PKCE for secure authentication
 */

import { Router } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

const router = Router();

// OAuth configuration
const OAUTH_CONFIG = {
  clientId: process.env.OAUTH_CLIENT_ID || 'lanonasis_mcp_client_2024',
  clientSecret: process.env.OAUTH_CLIENT_SECRET || 'lmcp_secret_prod_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6',
  redirectUri: process.env.OAUTH_REDIRECT_URI || 'https://dashboard.lanonasis.com/auth/oauth/callback',
  scope: process.env.OAUTH_SCOPE || 'memory:read memory:write api:access mcp:connect',
  authorizationEndpoint: '/oauth/authorize',
  tokenEndpoint: '/oauth/token',
  expiresIn: '1h',
  clients: {
    'lanonasis_mcp_client_2024': {
      redirectUris: ['https://dashboard.lanonasis.com/auth/oauth/callback', 'https://api.lanonasis.com/auth/oauth/callback']
    }
  } as Record<string, { redirectUris: string[] }>
};

// In-memory store for authorization codes (use Redis in production)
const authorizationCodes = new Map<string, {
  clientId: string;
  redirectUri: string;
  scope: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
  userId?: string;
  expiresAt: number;
}>();

/**
 * OAuth Authorization Endpoint
 * GET /oauth/authorize
 */
router.get('/authorize', (req, res) => {
  const schema = z.object({
    client_id: z.string(),
    redirect_uri: z.string().url(),
    response_type: z.literal('code'),
    scope: z.string().optional(),
    state: z.string().optional(),
    code_challenge: z.string().optional(),
    code_challenge_method: z.enum(['S256', 'plain']).optional()
  });

  const validation = schema.safeParse(req.query);
  if (!validation.success) {
    res.status(400).json({
      error: 'invalid_request',
      error_description: 'Invalid authorization request parameters'
    });
    return;
  }

  const { 
    client_id, 
    redirect_uri, 
    response_type, 
    scope = OAUTH_CONFIG.scope, 
    state,
    code_challenge,
    code_challenge_method 
  } = validation.data;

  // Validate client_id
  const clientConfig = OAUTH_CONFIG.clients[client_id];
  if (!clientConfig) {
    res.status(400).json({
      error: 'invalid_client',
      error_description: 'Invalid client ID'
    });
    return;
  }

  // Validate redirect_uri
  if (!clientConfig.redirectUris.includes(redirect_uri)) {
    res.status(400).json({
      error: 'invalid_request',
      error_description: 'Invalid redirect URI'
    });
    return;
  }

  // Generate authorization code
  const authCode = crypto.randomBytes(32).toString('base64url');
  
  // Store authorization code
  authorizationCodes.set(authCode, {
    clientId: client_id,
    redirectUri: redirect_uri,
    scope,
    ...(code_challenge && { codeChallenge: code_challenge }),
    ...(code_challenge_method && { codeChallengeMethod: code_challenge_method }),
    expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes
  });

  // Redirect to auth page with authorization code
  const params = new URLSearchParams({
    code: authCode,
    ...(state && { state })
  });

  try {
    res.redirect(`${redirect_uri}?${params.toString()}`);
  } catch (err) {
    res.status(500).json({
      error: 'server_error',
      error_description: 'Internal server error'
    });
    return;
  }  
});

/**
 * OAuth Token Endpoint
 * POST /oauth/token
 */
router.post('/token', async (req, res) => {
  const schema = z.object({
    grant_type: z.literal('authorization_code'),
    code: z.string(),
    redirect_uri: z.string().url(),
    client_id: z.string(),
    client_secret: z.string().optional(),
    code_verifier: z.string().optional()
  });

  const validation = schema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({
      error: 'invalid_request',
      error_description: 'Invalid token request parameters'
    });
  }

  const {
    code,
    redirect_uri,
    client_id,
    client_secret,
    code_verifier
  } = validation.data;

  // Validate client credentials
  if (client_id !== OAUTH_CONFIG.clientId) {
    return res.status(401).json({
      error: 'invalid_client',
      error_description: 'Invalid client credentials'
    });
  }

  // For confidential clients, verify client_secret
  if (client_secret && client_secret !== OAUTH_CONFIG.clientSecret) {
    return res.status(401).json({
      error: 'invalid_client',
      error_description: 'Invalid client credentials'
    });
  }

  // Retrieve and validate authorization code
  const codeData = authorizationCodes.get(code);
  if (!codeData) {
    return res.status(400).json({
      error: 'invalid_grant',
      error_description: 'Invalid or expired authorization code'
    });
  }

  // Check if code is expired
  if (Date.now() > codeData.expiresAt) {
    authorizationCodes.delete(code);
    return res.status(400).json({
      error: 'invalid_grant',
      error_description: 'Authorization code has expired'
    });
  }

  // Validate redirect_uri
  if (redirect_uri !== codeData.redirectUri) {
    return res.status(400).json({
      error: 'invalid_grant',
      error_description: 'Redirect URI mismatch'
    });
  }

  // Validate PKCE if code_challenge was provided
  if (codeData.codeChallenge) {
    if (!code_verifier) {
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'Code verifier required for PKCE'
      });
    }

    let challenge = code_verifier;
    if (codeData.codeChallengeMethod === 'S256') {
      challenge = crypto.createHash('sha256').update(code_verifier).digest('base64url');
    }

    if (challenge !== codeData.codeChallenge) {
      return res.status(400).json({
        error: 'invalid_grant',
        error_description: 'Invalid code verifier'
      });
    }
  }

  // Clean up authorization code
  authorizationCodes.delete(code);

  // Generate access token
  const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key';
  const accessToken = jwt.sign(
    {
      client_id,
      scope: codeData.scope,
      aud: 'lanonasis-mcp-api',
      iss: 'https://api.lanonasis.com',
      jti: crypto.randomUUID()
    },
    jwtSecret,
    { 
      expiresIn: '1h'
    }
  );

  // Generate refresh token
  const refreshToken = jwt.sign(
    {
      client_id,
      type: 'refresh',
      aud: 'lanonasis-mcp-api',
      iss: 'https://api.lanonasis.com'
    },
    jwtSecret,
    { 
      expiresIn: '7d',
      jwtid: crypto.randomUUID()
    }
  );

  res.json({
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: 3600, // 1 hour
    refresh_token: refreshToken,
    scope: codeData.scope
  });
  return;
});

/**
 * OAuth Client Info Endpoint (for Claude Desktop discovery)
 * GET /oauth/client-info
 */
router.get('/client-info', (req, res) => {
  res.json({
    client_id: OAUTH_CONFIG.clientId,
    authorization_endpoint: `https://api.lanonasis.com/api/v1${OAUTH_CONFIG.authorizationEndpoint}`,
    token_endpoint: `https://api.lanonasis.com/api/v1${OAUTH_CONFIG.tokenEndpoint}`,
    redirect_uri: OAUTH_CONFIG.redirectUri,
    scope: OAUTH_CONFIG.scope,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code'],
    code_challenge_methods_supported: ['S256', 'plain']
  });
});

export default router;
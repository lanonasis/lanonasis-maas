/**
 * Centralized Authentication Router
 * Routes all authentication through oauth-client package for consistency
 */

import { Router } from 'express';
import { URL } from 'url';
// TODO: Import MCPClient when oauth-client package is built
// import { MCPClient } from '@lanonasis/oauth-client';
import { config } from '@/config/environment';
import { logger } from '@/utils/logger';

const router = Router();

// Centralized auth configuration
const AUTH_CONFIG = {
  authServer: config.AUTH_SERVER_URL || 'https://api.lanonasis.com',
  clientId: config.OAUTH_CLIENT_ID || 'lanonasis_mcp_client_2024',
  redirectUri: config.OAUTH_REDIRECT_URI || 'https://dashboard.lanonasis.com/auth/oauth/callback',
  scope: 'memory:read memory:write api:access mcp:connect'
};

/**
 * @swagger
 * /auth/oauth/authorize:
 *   get:
 *     summary: OAuth authorization endpoint (proxy to central auth server)
 *     description: Redirects to centralized oauth-client authorization
 */
router.get('/oauth/authorize', async (req, res) => {
  try {
    const authUrl = new URL(`${AUTH_CONFIG.authServer}/api/v1/oauth/authorize`);
    
    // Forward all query parameters to central auth server
    Object.entries(req.query).forEach(([key, value]) => {
      if (value) {
        authUrl.searchParams.set(key, String(value));
      }
    });

    // Ensure required parameters
    if (!authUrl.searchParams.has('client_id')) {
      authUrl.searchParams.set('client_id', AUTH_CONFIG.clientId);
    }
    if (!authUrl.searchParams.has('response_type')) {
      authUrl.searchParams.set('response_type', 'code');
    }
    if (!authUrl.searchParams.has('scope')) {
      authUrl.searchParams.set('scope', AUTH_CONFIG.scope);
    }
    if (!authUrl.searchParams.has('redirect_uri')) {
      authUrl.searchParams.set('redirect_uri', AUTH_CONFIG.redirectUri);
    }

    logger.info('Redirecting to central auth server', { 
      authUrl: authUrl.toString(),
      clientIp: req.ip 
    });

    res.redirect(authUrl.toString());
  } catch (error) {
    logger.error('OAuth authorize error', { error });
    res.status(500).json({
      error: 'server_error',
      error_description: 'Failed to process authorization request'
    });
  }
});

/**
 * @swagger
 * /auth/oauth/token:
 *   post:
 *     summary: OAuth token endpoint (proxy to central auth server)
 *     description: Proxies token requests to centralized oauth-client
 */
router.post('/oauth/token', async (req, res): Promise<void> => {
  try {
    const tokenResponse = await fetch(`${AUTH_CONFIG.authServer}/api/v1/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(req.body)
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      logger.warn('Token request failed', { 
        status: tokenResponse.status,
        error: tokenData 
      });
      res.status(tokenResponse.status).json(tokenData);
      return;
    }

    logger.info('Token issued successfully', { 
      clientId: req.body.client_id,
      scope: tokenData.scope 
    });

    res.json(tokenData);
  } catch (error) {
    logger.error('OAuth token error', { error });
    res.status(500).json({
      error: 'server_error',
      error_description: 'Failed to process token request'
    });
  }
});

/**
 * @swagger
 * /auth/oauth/callback:
 *   get:
 *     summary: OAuth callback handler
 *     description: Handles OAuth callbacks and exchanges codes for tokens
 */
router.get('/oauth/callback', async (req, res) => {
  try {
    const { code, state, error, error_description } = req.query;

    if (error) {
      logger.warn('OAuth callback error', { error, error_description });
      
      // URL-encode parameters to prevent XSS
      const safeError = encodeURIComponent(String(error || 'unknown_error'));
      const safeDescription = encodeURIComponent(String(error_description || 'An error occurred'));
      
      return res.redirect(`/auth/error?error=${safeError}&description=${safeDescription}`);
    }

    if (!code) {
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'Authorization code not provided'
      });
    }

    // TODO: Exchange code for tokens using centralized client when package is built
    // const mcpClient = new MCPClient({
    //   clientId: AUTH_CONFIG.clientId,
    //   authServer: AUTH_CONFIG.authServer,
    //   redirectUri: AUTH_CONFIG.redirectUri
    // });

    // For now, redirect to success page
    res.redirect(`/auth/success?code=${code}&state=${state}`);
  } catch (error) {
    logger.error('OAuth callback error', { error });
    res.redirect('/auth/error?error=server_error');
  }
});

/**
 * @swagger
 * /auth/client-info:
 *   get:
 *     summary: OAuth client information
 *     description: Returns OAuth client configuration for discovery
 */
router.get('/client-info', (req, res) => {
  res.json({
    client_id: AUTH_CONFIG.clientId,
    authorization_endpoint: `${AUTH_CONFIG.authServer}/api/v1/oauth/authorize`,
    token_endpoint: `${AUTH_CONFIG.authServer}/api/v1/oauth/token`,
    redirect_uri: AUTH_CONFIG.redirectUri,
    scope: AUTH_CONFIG.scope,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code'],
    code_challenge_methods_supported: ['S256', 'plain'],
    mcp_endpoints: {
      sse: '/api/v1/mcp/sse',
      ws: '/api/v1/mcp/ws'
    }
  });
});

/**
 * @swagger
 * /auth/device:
 *   post:
 *     summary: Device authorization for CLI clients
 *     description: Initiates device code flow for terminal authentication
 */
router.post('/device', async (req, res): Promise<void> => {
  try {
    const deviceResponse = await fetch(`${AUTH_CONFIG.authServer}/api/v1/oauth/device`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: AUTH_CONFIG.clientId,
        scope: AUTH_CONFIG.scope
      })
    });

    const deviceData = await deviceResponse.json();

    if (!deviceResponse.ok) {
      res.status(deviceResponse.status).json(deviceData);
      return;
    }

    logger.info('Device authorization initiated', { 
      device_code: deviceData.device_code?.substring(0, 8) + '...',
      user_code: deviceData.user_code 
    });

    res.json(deviceData);
  } catch (error) {
    logger.error('Device authorization error', { error });
    res.status(500).json({
      error: 'server_error',
      error_description: 'Failed to initiate device authorization'
    });
  }
});

/**
 * @swagger
 * /auth/revoke:
 *   post:
 *     summary: Token revocation
 *     description: Revokes access or refresh tokens
 */
router.post('/revoke', async (req, res): Promise<void> => {
  try {
    const revokeResponse = await fetch(`${AUTH_CONFIG.authServer}/api/v1/oauth/revoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(req.body)
    });

    if (!revokeResponse.ok) {
      const errorData = await revokeResponse.json();
      res.status(revokeResponse.status).json(errorData);
      return;
    }

    logger.info('Token revoked', { 
      token_type: req.body.token_type_hint,
      client_id: req.body.client_id 
    });

    res.status(200).json({ success: true });
  } catch (error) {
    logger.error('Token revocation error', { error });
    res.status(500).json({
      error: 'server_error',
      error_description: 'Failed to revoke token'
    });
  }
});

export default router;
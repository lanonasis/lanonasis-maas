/**
 * Basic Authentication Routes
 * Provides login/register endpoints for CLI and direct API access
 */

import { Router, Request, Response } from 'express';
import { supabase } from '@/integrations/supabase/client';
import { config } from '@/config/environment';
import { logger } from '@/utils/logger';
import jwt, { SignOptions } from 'jsonwebtoken';
import { z } from 'zod';

const router: Router = Router();

// Validation schemas
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  organization_name: z.string().optional()
});

function defaultWorkspaceName(email: string): string {
  const localPart = email.split('@')[0] || 'user';
  return `${localPart}'s Workspace`;
}

async function ensureOrganizationForUser(
  userId: string,
  email: string,
  organizationName?: string
): Promise<string> {
  const { data: existingUser, error: userError } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', userId)
    .single();

  if (userError || !existingUser) {
    throw new Error('Failed to resolve newly registered user');
  }

  if (existingUser.organization_id) {
    return existingUser.organization_id;
  }

  const workspaceName = organizationName?.trim() || defaultWorkspaceName(email);
  const { data: orgData, error: orgError } = await supabase
    .from('organizations')
    .insert({
      name: workspaceName,
      owner_id: userId,
      plan: 'free',
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (orgError || !orgData) {
    throw new Error('Failed to create organization for user');
  }

  const { error: updateError } = await supabase
    .from('users')
    .update({ organization_id: orgData.id })
    .eq('id', userId);

  if (updateError) {
    await supabase
      .from('organizations')
      .delete()
      .eq('id', orgData.id);

    await supabase.auth.admin.deleteUser(userId);

    throw new Error('Failed to associate user with organization');
  }

  return orgData.id;
}

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login with email and password
 *     description: Authenticates user and returns JWT token
 */
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    // Authenticate with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      logger.warn('Login failed', { email, error: error.message });
      res.status(401).json({
        error: 'invalid_credentials',
        message: 'Invalid email or password'
      });
      return;
    }

    if (!data.user || !data.session) {
      res.status(401).json({
        error: 'authentication_failed',
        message: 'Failed to authenticate user'
      });
      return;
    }

    if (!data.user.email) {
      logger.error('Authenticated user missing email', { userId: data.user.id });
      res.status(500).json({
        error: 'server_error',
        message: 'Authenticated user missing email'
      });
      return;
    }

    // Get user details from database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();

    // Check for user query errors
    if (userError || !userData) {
      logger.error('Failed to fetch user data:', {
        userId: data.user.id,
        error: userError?.message,
        code: userError?.code
      });
      res.status(404).json({
        error: 'User not found',
        message: 'Unable to retrieve user information'
      });
      return;
    }

    if (!userData.organization_id) {
      logger.warn('Login blocked because user has no organization assignment', {
        userId: data.user.id,
        email: data.user.email
      });
      res.status(403).json({
        error: 'organization_required',
        message: 'User account is missing organization assignment'
      });
      return;
    }

    // Create JWT token for API access
    const token = jwt.sign(
      {
        sub: data.user.id,
        user_id: data.user.id,
        organization_id: userData?.organization_id,
        userId: data.user.id,
        email: data.user.email,
        organizationId: userData?.organization_id,
        role: userData?.role || 'user',
        plan: userData?.plan || 'free'
      },
      config.JWT_SECRET,
      { expiresIn: config.JWT_EXPIRES_IN as string } as SignOptions
    );

    logger.info('User logged in successfully', { 
      userId: data.user.id,
      email: data.user.email 
    });

    res.json({
      user: {
        id: data.user.id,
        email: data.user.email,
        organization_id: userData.organization_id,
        role: userData?.role || 'user',
        plan: userData?.plan || 'free',
        created_at: data.user.created_at,
        updated_at: userData?.updated_at || data.user.updated_at
      },
      token,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    });
  } catch (error) {
    logger.error('Login error', { error });
    
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'validation_error',
        message: 'Invalid request data',
        details: error.errors
      });
      return;
    }

    res.status(500).json({
      error: 'server_error',
      message: 'An error occurred during login'
    });
  }
});

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     description: Creates a new user account and organization
 */
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, organization_name } = registerSchema.parse(req.body);

    // Create user in Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          organization_name
        }
      }
    });

    if (error) {
      logger.warn('Registration failed', { email, error: error.message });
      
      // Check for user already exists using Supabase error code
      if (error.code === 'user_already_exists') {
        res.status(409).json({
          error: 'user_exists',
          message: 'User with this email already exists'
        });
        return;
      }

      res.status(400).json({
        error: 'registration_failed',
        message: error.message
      });
      return;
    }

    if (!data.user) {
      res.status(400).json({
        error: 'registration_failed',
        message: 'Failed to create user account'
      });
      return;
    }

    if (!data.user.email) {
      logger.error('Registered user missing email', { userId: data.user.id });
      res.status(500).json({
        error: 'server_error',
        message: 'Registered user missing email'
      });
      return;
    }

    let organizationId: string;
    try {
      organizationId = await ensureOrganizationForUser(
        data.user.id,
        data.user.email,
        organization_name
      );
    } catch (organizationError) {
      logger.error('Failed to ensure organization for registered user', {
        userId: data.user.id,
        email: data.user.email,
        error: organizationError instanceof Error ? organizationError.message : organizationError
      });
      res.status(500).json({
        error: 'Registration failed',
        message: 'Failed to associate user with organization'
      });
      return;
    }

    // Create JWT token
    const token = jwt.sign(
      {
        sub: data.user.id,
        user_id: data.user.id,
        organization_id: organizationId,
        userId: data.user.id,
        email: data.user.email,
        organizationId,
        role: 'user',
        plan: 'free'
      },
      config.JWT_SECRET,
      { expiresIn: config.JWT_EXPIRES_IN as string } as SignOptions
    );

    logger.info('User registered successfully', { 
      userId: data.user.id,
      email: data.user.email 
    });

    res.status(201).json({
      user: {
        id: data.user.id,
        email: data.user.email,
        organization_id: organizationId,
        role: 'user',
        plan: 'free',
        created_at: data.user.created_at,
        updated_at: data.user.updated_at
      },
      token,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    });
  } catch (error) {
    logger.error('Registration error', { error });
    
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'validation_error',
        message: 'Invalid request data',
        details: error.errors
      });
      return;
    }

    res.status(500).json({
      error: 'server_error',
      message: 'An error occurred during registration'
    });
  }
});

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Refresh authentication token
 *     description: Refreshes JWT token using Supabase session
 */
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'missing_token',
        message: 'Authorization token required'
      });
      return;
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, config.JWT_SECRET);
      const decodedObj = typeof decoded === 'object' && decoded !== null ? (decoded as Record<string, unknown>) : {};
      
      // Generate new token with same claims
      const newToken = jwt.sign(
        {
          userId: decodedObj.userId,
          email: decodedObj.email,
          organizationId: decodedObj.organizationId,
          role: decodedObj.role,
          plan: decodedObj.plan
        },
        config.JWT_SECRET,
        { expiresIn: config.JWT_EXPIRES_IN as string } as SignOptions
      );

      res.json({
        token: newToken,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      });
    } catch {
      res.status(401).json({
        error: 'invalid_token',
        message: 'Invalid or expired token'
      });
    }
  } catch (error) {
    logger.error('Token refresh error', { error });
    res.status(500).json({
      error: 'server_error',
      message: 'An error occurred during token refresh'
    });
  }
});

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout user
 *     description: Signs out user from Supabase
 */
router.post('/logout', async (req: Request, res: Response): Promise<void> => {
  try {
    await supabase.auth.signOut();
    
    res.json({
      message: 'Logged out successfully'
    });
  } catch (error) {
    logger.error('Logout error', { error });
    res.status(500).json({
      error: 'server_error',
      message: 'An error occurred during logout'
    });
  }
});

export default router;

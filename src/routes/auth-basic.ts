/**
 * Basic Authentication Routes
 * Provides login/register endpoints for CLI and direct API access
 */

import { Router, Request, Response } from 'express';
import { supabase } from '@/integrations/supabase/client';
import { config } from '@/config/environment';
import { logger } from '@/utils/logger';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

const router = Router();

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
      return res.status(404).json({
        error: 'User not found',
        message: 'Unable to retrieve user information'
      });
    }

    // Create JWT token for API access
    const token = jwt.sign(
      {
        userId: data.user.id,
        email: data.user.email,
        organizationId: userData?.organization_id,
        role: userData?.role || 'user',
        plan: userData?.plan || 'free'
      },
      config.JWT_SECRET=REDACTED_JWT_SECRET
      { expiresIn: config.JWT_EXPIRES_IN }
    );

    logger.info('User logged in successfully', { 
      userId: data.user.id,
      email: data.user.email 
    });

    res.json({
      user: {
        id: data.user.id,
        email: data.user.email!,
        organization_id: userData?.organization_id || null,
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

    // Create organization if name provided
    if (organization_name) {
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: organization_name,
          owner_id: data.user.id,
          plan: 'free',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (!orgError && orgData) {
        // Update user with organization_id
        const { data: updateData, error: updateError } = await supabase
          .from('users')
          .update({ organization_id: orgData.id })
          .eq('id', data.user.id);

        if (updateError) {
          logger.error('Failed to update user with organization_id:', {
            userId: data.user.id,
            organizationId: orgData.id,
            error: updateError.message,
            code: updateError.code
          });
          
          // Try to clean up the created organization
          await supabase
            .from('organizations')
            .delete()
            .eq('id', orgData.id);
          
          return res.status(500).json({
            error: 'Registration failed',
            message: 'Failed to associate user with organization'
          });
        }
      }
    }

    // Create JWT token
    const token = jwt.sign(
      {
        userId: data.user.id,
        email: data.user.email,
        role: 'user',
        plan: 'free'
      },
      config.JWT_SECRET=REDACTED_JWT_SECRET
      { expiresIn: config.JWT_EXPIRES_IN }
    );

    logger.info('User registered successfully', { 
      userId: data.user.id,
      email: data.user.email 
    });

    res.status(201).json({
      user: {
        id: data.user.id,
        email: data.user.email!,
        organization_id: null,
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
      const decoded = jwt.verify(token, config.JWT_SECRET=REDACTED_JWT_SECRET
      
      // Generate new token with same claims
      const newToken = jwt.sign(
        {
          userId: decoded.userId,
          email: decoded.email,
          organizationId: decoded.organizationId,
          role: decoded.role,
          plan: decoded.plan
        },
        config.JWT_SECRET=REDACTED_JWT_SECRET
        { expiresIn: config.JWT_EXPIRES_IN }
      );

      res.json({
        token: newToken,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      });
    } catch (err) {
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
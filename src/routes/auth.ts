import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';

import { config } from '@/config/environment';
import { logger } from '@/utils/logger';
import { asyncHandler } from '@/middleware/errorHandler';
import { 
  loginSchema, 
  registerSchema, 
  AuthResponse, 
  User,
  LoginRequest,
  RegisterRequest,
  JWTPayload 
} from '@/types/auth';

const router = Router();
const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_KEY);

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user and organization
 *     description: Creates a new user account and organization
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: User successfully registered
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Validation error
 *       409:
 *         description: User already exists
 */
router.post('/register', asyncHandler(async (req: Request, res: Response) => {
  const validatedData = registerSchema.parse(req.body) as RegisterRequest;
  const { email, password, organization_name } = validatedData;

  // Check if user already exists
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .single();

  if (existingUser) {
    res.status(409).json({
      error: 'User already exists',
      message: 'An account with this email already exists'
    });
    return;
  }

  // Hash password
  const saltRounds = 12;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  // Create organization first
  const organizationId = uuidv4();
  const { error: orgError } = await supabase
    .from('organizations')
    .insert({
      id: organizationId,
      name: organization_name,
      plan: 'free',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

  if (orgError) {
    logger.error('Failed to create organization', { error: orgError, email });
    res.status(500).json({
      error: 'Registration failed',
      message: 'Could not create organization'
    });
    return;
  }

  // Create user
  const userId = uuidv4();
  const { error: userError } = await supabase
    .from('users')
    .insert({
      id: userId,
      email,
      password_hash: passwordHash,
      organization_id: organizationId,
      role: 'admin',
      plan: 'free',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

  if (userError) {
    logger.error('Failed to create user', { error: userError, email });
    
    // Cleanup: delete the organization if user creation failed
    await supabase.from('organizations').delete().eq('id', organizationId);
    
    res.status(500).json({
      error: 'Registration failed',
      message: 'Could not create user account'
    });
    return;
  }

  // Generate JWT token
  const tokenPayload = {
    userId,
    organizationId,
    role: 'admin',
    plan: 'free'
  };

  const token = jwt.sign(
    tokenPayload, 
    config.JWT_SECRET, 
    { expiresIn: config.JWT_EXPIRES_IN } as jwt.SignOptions
  );

  const expiresAt = new Date();
  expiresAt.setTime(expiresAt.getTime() + (24 * 60 * 60 * 1000)); // 24 hours

  const user: User = {
    id: userId,
    email,
    organization_id: organizationId,
    role: 'admin',
    plan: 'free',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const response: AuthResponse = {
    user,
    token,
    expires_at: expiresAt.toISOString()
  };

  logger.info('User registered successfully', { 
    userId, 
    email, 
    organizationId 
  });

  res.status(201).json(response);
}));

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login user
 *     description: Authenticates a user and returns a JWT token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: User successfully authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', asyncHandler(async (req: Request, res: Response) => {
  const validatedData = loginSchema.parse(req.body) as LoginRequest;
  const { email, password } = validatedData;

  // Get user with organization info
  const { data: user, error } = await supabase
    .from('users')
    .select(`
      id,
      email,
      password_hash,
      organization_id,
      role,
      plan,
      created_at,
      updated_at,
      organizations!inner(plan)
    `)
    .eq('email', email)
    .single();

  // Define types for user with nested organization (Supabase returns array for joins)
  type UserWithOrganization = {
    id: string;
    email: string;
    password_hash: string;
    organization_id: string;
    role: string;
    plan: string;
    created_at: string;
    updated_at: string;
    organizations: {
      plan: string;
    }[];
  };

  if (error || !user) {
    logger.warn('Login attempt with invalid email', { email });
    res.status(401).json({
      error: 'Invalid credentials',
      message: 'Email or password is incorrect'
    });
    return;
  }

  // Verify password
  const passwordValid = await bcrypt.compare(password, user.password_hash);
  if (!passwordValid) {
    logger.warn('Login attempt with invalid password', { email, userId: user.id });
    res.status(401).json({
      error: 'Invalid credentials',
      message: 'Email or password is incorrect'
    });
    return;
  }

  // Generate JWT token
  const userWithOrg = user as UserWithOrganization;
  const orgPlan = userWithOrg.organizations?.[0]?.plan || userWithOrg.plan;
  const tokenPayload = {
    userId: userWithOrg.id,
    organizationId: userWithOrg.organization_id,
    role: userWithOrg.role,
    plan: orgPlan
  };

  const token = jwt.sign(
    tokenPayload, 
    config.JWT_SECRET, 
    { expiresIn: config.JWT_EXPIRES_IN } as jwt.SignOptions
  );

  const expiresAt = new Date();
  expiresAt.setTime(expiresAt.getTime() + (24 * 60 * 60 * 1000)); // 24 hours

  const responseUser: User = {
    id: userWithOrg.id,
    email: userWithOrg.email,
    organization_id: userWithOrg.organization_id,
    role: userWithOrg.role as 'admin' | 'user' | 'viewer',
    plan: orgPlan as 'free' | 'pro' | 'enterprise',
    created_at: userWithOrg.created_at,
    updated_at: userWithOrg.updated_at
  };

  const response: AuthResponse = {
    user: responseUser,
    token,
    expires_at: expiresAt.toISOString()
  };

  logger.info('User logged in successfully', { 
    userId: user.id, 
    email,
    organizationId: user.organization_id 
  });

  res.json(response);
}));

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Refresh JWT token
 *     description: Generates a new JWT token for an authenticated user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token successfully refreshed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 expires_at:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Invalid or expired token
 */
router.post('/refresh', asyncHandler(async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

  if (!token) {
    res.status(401).json({
      error: 'Token required',
      message: 'Please provide a valid token'
    });
    return;
  }

  try {
    // Verify the current token (even if expired, we can still decode it)
    const decoded = jwt.verify(token, config.JWT_SECRET, { ignoreExpiration: true }) as JWTPayload;
    
    // Check if user still exists and is active
    const { data: user, error } = await supabase
      .from('users')
      .select('id, organization_id, role, plan, organizations!inner(plan)')
      .eq('id', decoded.userId)
      .single();

    // Define type for user with organization (Supabase returns array for joins)
    type RefreshUserWithOrganization = {
      id: string;
      organization_id: string;
      role: string;
      plan: string;
      organizations: {
        plan: string;
      }[];
    };

    if (error || !user) {
      res.status(401).json({
        error: 'Invalid token',
        message: 'User not found'
      });
      return;
    }

    // Generate new token
    const refreshUser = user as RefreshUserWithOrganization;
    const refreshOrgPlan = refreshUser.organizations?.[0]?.plan || refreshUser.plan;
    const newTokenPayload = {
      userId: refreshUser.id,
      organizationId: refreshUser.organization_id,
      role: refreshUser.role,
      plan: refreshOrgPlan
    };

    const newToken = jwt.sign(
      newTokenPayload, 
      config.JWT_SECRET, 
      { expiresIn: config.JWT_EXPIRES_IN } as jwt.SignOptions
    );

    const expiresAt = new Date();
    expiresAt.setTime(expiresAt.getTime() + (24 * 60 * 60 * 1000)); // 24 hours

    logger.info('Token refreshed successfully', { userId: user.id });

    res.json({
      token: newToken,
      expires_at: expiresAt.toISOString()
    });
    return;
  } catch (jwtError) {
    logger.warn('Token refresh failed', { error: jwtError });
    res.status(401).json({
      error: 'Invalid token',
      message: 'Token is invalid or malformed'
    });
    return;
  }
}));

export default router;
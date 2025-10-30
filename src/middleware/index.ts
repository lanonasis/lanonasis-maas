/**
 * Middleware exports for MaaS Core Alignment
 * 
 * This module provides centralized middleware for:
 * - Request tracking and debugging
 * - CORS protection with environment-based allowlists
 * - Uniform error handling and response envelopes
 * - Central authentication (JWT + API Key)
 * - Plan-based authorization and rate limiting
 */

import {
  attachRequestId,
  corsGuard,
  errorEnvelope,
  notFoundHandler,
  successEnvelope
} from './httpBasics';

import centralAuth, {
  requirePlan,
  planBasedRateLimit,
  optionalAuth
} from './centralAuth';

// HTTP Basics
export { attachRequestId, corsGuard, errorEnvelope, notFoundHandler, successEnvelope };

// Authentication & Authorization
export { centralAuth, requirePlan, planBasedRateLimit, optionalAuth };

// Default authentication middleware
export { centralAuth as auth };

/**
 * Standard middleware chain for protected routes
 */
export const protectedRouteMiddleware = [
  // These should be applied globally in server.ts:
  // attachRequestId,
  // corsGuard,
  // Then for protected routes:
  centralAuth,
  planBasedRateLimit()
];

/**
 * Standard middleware chain for public routes (with optional auth)
 */
export const publicRouteMiddleware = [
  // These should be applied globally in server.ts:
  // attachRequestId,
  // corsGuard,
  // Then for public routes:
  optionalAuth
];

/**
 * Middleware configuration for different route types
 */
export const middlewareConfig = {
  // Global middleware (apply to all routes)
  global: [
    'attachRequestId',    // Must be first
    'corsGuard',          // CORS and security headers
  ],

  // Protected API routes
  protected: [
    'centralAuth',        // JWT or API key required
    'planBasedRateLimit', // Plan-based rate limiting
  ],

  // Public API routes (optional auth)
  public: [
    'optionalAuth',       // Optional authentication
  ],

  // Admin routes (enterprise plan required)
  admin: [
    'centralAuth',
    'requirePlan("enterprise")',
  ],

  // Pro features
  pro: [
    'centralAuth',
    'requirePlan("pro")',
  ],

  // Error handling (apply last)
  error: [
    'errorEnvelope',      // Must be last
    'notFoundHandler',    // 404 handler
  ]
};

/**
 * Middleware application order (critical for correct functionality):
 * 
 * 1. attachRequestId    - Generate unique request ID (FIRST)
 * 2. corsGuard          - Handle CORS and security headers
 * 3. [route-specific]   - centralAuth, optionalAuth, requirePlan, etc.
 * 4. [route handlers]   - Actual route logic
 * 5. notFoundHandler    - Handle 404s
 * 6. errorEnvelope      - Handle all errors (LAST)
 */
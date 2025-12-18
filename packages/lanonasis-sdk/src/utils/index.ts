/**
 * Utility functions for LanOnasis SDK
 */

/**
 * Parse JWT token and extract payload
 */
export function parseJWT(token: string): {
  userId?: string;
  organizationId?: string;
  exp: number;
  iat: number;
  [key: string]: any;
} {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }
    
    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString('utf-8')
    );
    
    return payload;
  } catch (error) {
    throw new Error(`Failed to parse JWT: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate UUID format
 */
export function validateUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Sanitize input string
 */
export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

/**
 * Format date to ISO string
 */
export function formatDate(date: Date | string | number): string {
  if (typeof date === 'string' || typeof date === 'number') {
    return new Date(date).toISOString();
  }
  return date.toISOString();
}

/**
 * Generate secure random ID
 */
export function generateSecureId(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}


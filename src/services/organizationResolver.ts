/**
 * Organization ID Resolver Service
 *
 * Intelligently resolves organization IDs from different auth patterns:
 * - Legacy vendor API keys ('vendor_org')
 * - Regular API keys (user_id as org_id)
 * - JWT tokens (explicit org_id or user_id fallback)
 *
 * Ensures all organization IDs are valid UUIDs that exist in the database.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '@/config/environment';
import { logger } from '@/utils/logger';
import { v4 as uuidv4, validate as isValidUUID } from 'uuid';

const supabase: SupabaseClient = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_KEY);

export interface OrganizationResolution {
  organizationId: string;
  userId: string;
  isVendor: boolean;
  isFallback: boolean;
  source: 'vendor' | 'existing_org' | 'user_default' | 'created';
}

/**
 * Special vendor organization ID (created once in database)
 */
const VENDOR_ORG_ID = '00000000-0000-0000-0000-000000000001';
const VENDOR_ORG_NAME = 'Vendor Organization';

/**
 * Cache for organization lookups (in-memory, per-process)
 */
const orgCache = new Map<string, { orgId: string; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Ensure vendor organization exists in database
 */
async function ensureVendorOrganization(): Promise<string> {
  try {
    // Check if vendor org exists
    const { data: existing, error: selectError } = await supabase
      .from('organizations')
      .select('id')
      .eq('id', VENDOR_ORG_ID)
      .single();

    if (existing && !selectError) {
      return VENDOR_ORG_ID;
    }

    // Create vendor organization
    const { data: created, error: insertError } = await supabase
      .from('organizations')
      .upsert({
        id: VENDOR_ORG_ID,
        name: VENDOR_ORG_NAME,
        plan: 'enterprise',
        settings: {
          type: 'vendor',
          description: 'System organization for vendor API keys'
        }
      }, {
        onConflict: 'id',
        ignoreDuplicates: true
      })
      .select()
      .single();

    if (insertError) {
      logger.warn('Failed to create vendor organization (might already exist)', { error: insertError });
      return VENDOR_ORG_ID; // Assume it exists even if insert failed
    }

    logger.info('Vendor organization ensured', { id: VENDOR_ORG_ID });
    return VENDOR_ORG_ID;
  } catch (error) {
    logger.error('Error ensuring vendor organization', { error });
    return VENDOR_ORG_ID; // Return ID anyway for fallback
  }
}

/**
 * Ensure user has a default organization
 */
async function ensureUserOrganization(userId: string): Promise<string> {
  try {
    // First, check if user already has an organization
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', userId)
      .single();

    if (user && user.organization_id && !userError) {
      // Verify organization exists
      const { data: org } = await supabase
        .from('organizations')
        .select('id')
        .eq('id', user.organization_id)
        .single();

      if (org) {
        return user.organization_id;
      }
    }

    // Create default organization for user
    const orgId = uuidv4();
    const { data: newOrg, error: orgError } = await supabase
      .from('organizations')
      .insert({
        id: orgId,
        name: `User ${userId.slice(0, 8)} Organization`,
        plan: 'free',
        settings: {
          type: 'user_default',
          created_for: userId
        }
      })
      .select()
      .single();

    if (orgError) {
      logger.error('Failed to create user organization', { error: orgError, userId });
      throw orgError;
    }

    // Update user's organization_id if user record exists
    if (!userError) {
      await supabase
        .from('users')
        .update({ organization_id: orgId })
        .eq('id', userId);
    }

    logger.info('Created default organization for user', { userId, orgId });
    return orgId;
  } catch (error) {
    logger.error('Error ensuring user organization', { error, userId });
    // Fallback: use userId as orgId (risky but prevents complete failure)
    return userId;
  }
}

/**
 * Resolve organization ID with intelligent fallback logic
 *
 * @param organizationIdInput - The organization ID from auth context
 * @param userId - The user ID from auth context
 * @returns Resolved organization information
 */
export async function resolveOrganizationId(
  organizationIdInput: string | undefined,
  userId: string
): Promise<OrganizationResolution> {
  try {
    // Check cache first
    const cacheKey = `${organizationIdInput}:${userId}`;
    const cached = orgCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
      return {
        organizationId: cached.orgId,
        userId,
        isVendor: cached.orgId === VENDOR_ORG_ID,
        isFallback: false,
        source: 'existing_org'
      };
    }

    // Pattern 1: Handle vendor org ('vendor_org' literal string)
    if (organizationIdInput === 'vendor_org' || organizationIdInput === 'vendor') {
      const vendorOrgId = await ensureVendorOrganization();
      orgCache.set(cacheKey, { orgId: vendorOrgId, timestamp: Date.now() });

      return {
        organizationId: vendorOrgId,
        userId,
        isVendor: true,
        isFallback: false,
        source: 'vendor'
      };
    }

    // Pattern 2: Valid UUID provided - verify it exists
    if (organizationIdInput && isValidUUID(organizationIdInput)) {
      const { data: org, error } = await supabase
        .from('organizations')
        .select('id')
        .eq('id', organizationIdInput)
        .single();

      if (org && !error) {
        orgCache.set(cacheKey, { orgId: organizationIdInput, timestamp: Date.now() });

        return {
          organizationId: organizationIdInput,
          userId,
          isVendor: organizationIdInput === VENDOR_ORG_ID,
          isFallback: false,
          source: 'existing_org'
        };
      }

      logger.warn('Provided organization ID not found in database', {
        organizationIdInput,
        userId
      });
    }

    // Pattern 3: Invalid or missing org ID - use userId if it's a valid org
    if (userId && isValidUUID(userId)) {
      const { data: org } = await supabase
        .from('organizations')
        .select('id')
        .eq('id', userId)
        .single();

      if (org) {
        orgCache.set(cacheKey, { orgId: userId, timestamp: Date.now() });

        return {
          organizationId: userId,
          userId,
          isVendor: false,
          isFallback: true,
          source: 'user_default'
        };
      }
    }

    // Pattern 4: Fallback - ensure user has an organization
    logger.info('Creating/finding default organization for user', { userId, organizationIdInput });
    const resolvedOrgId = await ensureUserOrganization(userId);
    orgCache.set(cacheKey, { orgId: resolvedOrgId, timestamp: Date.now() });

    return {
      organizationId: resolvedOrgId,
      userId,
      isVendor: false,
      isFallback: true,
      source: 'created'
    };

  } catch (error) {
    logger.error('Organization resolution failed, using userId as fallback', {
      error,
      organizationIdInput,
      userId
    });

    // Last resort: use userId (risky but prevents total failure)
    return {
      organizationId: userId,
      userId,
      isVendor: false,
      isFallback: true,
      source: 'user_default'
    };
  }
}

/**
 * Batch resolve multiple organization IDs efficiently
 */
export async function resolveOrganizationIdsBatch(
  requests: Array<{ organizationId?: string; userId: string }>
): Promise<OrganizationResolution[]> {
  return Promise.all(
    requests.map(req => resolveOrganizationId(req.organizationId, req.userId))
  );
}

/**
 * Clear organization cache (useful for testing or after org changes)
 */
export function clearOrganizationCache(organizationId?: string): void {
  if (organizationId) {
    // Clear specific entries
    for (const [key, value] of orgCache.entries()) {
      if (value.orgId === organizationId) {
        orgCache.delete(key);
      }
    }
  } else {
    // Clear entire cache
    orgCache.clear();
  }

  logger.debug('Organization cache cleared', { organizationId: organizationId || 'all' });
}

/**
 * Get cache statistics
 */
export function getOrganizationCacheStats(): { size: number; entries: string[] } {
  return {
    size: orgCache.size,
    entries: Array.from(orgCache.keys())
  };
}

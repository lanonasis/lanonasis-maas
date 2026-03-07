/**
 * Organization ID Resolver Service
 *
 * Resolves an organization ID only when the caller supplies a valid UUID that
 * also exists in the database. Legacy vendor aliases and implicit fallbacks are
 * intentionally rejected.
 *
 * Ensures all organization IDs are valid UUIDs that exist in the database.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '@/config/environment';
import { logger } from '@/utils/logger';
import { validate as isValidUUID } from 'uuid';

const supabase: SupabaseClient = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_KEY);

export interface OrganizationResolution {
  organizationId: string;
  userId: string;
  isVendor: boolean;
  isFallback: boolean;
  source: 'existing_org' | 'unresolved';
}

/**
 * Legacy vendor organization paths are disabled until vendor/org mapping is
 * fully database-backed and validated.
 */
const VENDOR_ORG_DISABLED_REASON = 'Vendor organization routing requires validated DB-backed mapping';

/**
 * Cache for organization lookups (in-memory, per-process)
 */
const orgCache = new Map<string, { orgId: string; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Resolve organization ID without inventing tenant context
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
        isVendor: false,
        isFallback: false,
        source: 'existing_org'
      };
    }

    // Pattern 1: Handle vendor org ('vendor_org' literal string)
    if (organizationIdInput === 'vendor_org' || organizationIdInput === 'vendor') {
      logger.warn(VENDOR_ORG_DISABLED_REASON, { userId, organizationIdInput });
      return {
        organizationId: '',
        userId,
        isVendor: false,
        isFallback: false,
        source: 'unresolved'
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
          isVendor: false,
          isFallback: false,
          source: 'existing_org'
        };
      }

      logger.warn('Provided organization ID not found in database', {
        organizationIdInput,
        userId
      });
    }

    logger.warn('Organization resolution failed without a validated org mapping', {
      organizationIdInput,
      userId
    });
    return {
      organizationId: '',
      userId,
      isVendor: false,
      isFallback: false,
      source: 'unresolved'
    };

  } catch (error) {
    logger.error('Organization resolution failed without safe fallback', {
      error,
      organizationIdInput,
      userId
    });

    return {
      organizationId: '',
      userId,
      isVendor: false,
      isFallback: false,
      source: 'unresolved'
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

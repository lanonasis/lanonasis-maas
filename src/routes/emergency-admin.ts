/**
 * EMERGENCY ADMIN ROUTE - TEMPORARY BOOTSTRAP SOLUTION
 * 
 * This route allows generating the first admin API key without login.
 * SECURITY WARNING: Remove this file after initial setup!
 * 
 * Usage:
 * POST /api/v1/emergency/bootstrap-admin
 * Headers: 
 *   X-Emergency-Token: [SECRET_TOKEN from env]
 * Body:
 *   {
 *     "email": "admin@example.com",
 *     "organizationName": "Lanonasis Admin"
 *   }
 */

import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import bcrypt from 'bcrypt';

const router: Router = Router();

// Emergency token must be set in environment
const EMERGENCY_TOKEN = process.env.EMERGENCY_BOOTSTRAP_TOKEN || 'set-a-secure-token-here';
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Initialize Supabase with service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Generate API key with proper format
 */
function generateApiKey(isProduction: boolean = false): string {
  const prefix = isProduction ? 'sk_live_' : 'sk_test_';
  const randomBytes = crypto.randomBytes(32).toString('hex');
  return prefix + randomBytes;
}

/**
 * Emergency bootstrap endpoint
 */
router.post('/emergency/bootstrap-admin', async (req, res) => {
  try {
    // Verify emergency token
    const providedToken = req.headers['x-emergency-token'];
    if (!providedToken || providedToken !== EMERGENCY_TOKEN) {
      console.error('Invalid emergency token provided');
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { email, organizationName } = req.body;

    if (!email || !organizationName) {
      return res.status(400).json({ 
        error: 'Missing required fields: email, organizationName' 
      });
    }

    console.log(`[EMERGENCY] Creating bootstrap admin for: ${email}`);

    // 1. Atomically ensure the organization exists (race-safe via UNIQUE on name).
    // Requires migration: organizations_name_unique on organizations(name).
    let organizationId: string;
    {
      const nowIso = new Date().toISOString();
      const { data: orgRow, error: upsertErr } = await supabase
        .from('organizations')
        .upsert(
          { name: organizationName, plan: 'enterprise', created_at: nowIso, updated_at: nowIso },
          { onConflict: 'name' }
        )
        .select('id')
        .single();

      if (orgRow) {
        organizationId = orgRow.id;
      } else {
        // One retry: re-select after a possible race or transient upsert error.
        const { data: retryRow, error: retryErr } = await supabase
          .from('organizations')
          .select('id')
          .eq('name', organizationName)
          .single();

        if (!retryRow) {
          console.error('[EMERGENCY] Failed to ensure organization:', upsertErr ?? retryErr);
          return res.status(500).json({ error: 'Failed to ensure organization' });
        }
        organizationId = retryRow.id;
      }
      console.log(`[EMERGENCY] Organization ID: ${organizationId}`);
    }

    // 2. Check if user exists and ensure public.users has the same organization
    let userId: string;
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, organization_id')
      .eq('email', email)
      .single();

    if (existingUser) {
      userId = existingUser.id;
      console.log(`[EMERGENCY] User exists with ID: ${userId}`);

      const { error: updateUserError } = await supabase
        .from('users')
        .update({
          organization_id: organizationId,
          role: 'admin',
          plan: 'enterprise',
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (updateUserError) {
        console.error('[EMERGENCY] Failed to update user organization:', updateUserError);
        return res.status(500).json({ error: 'Failed to assign user to organization' });
      }
    } else {
      const temporaryPassword = crypto.randomBytes(16).toString('hex');
      const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({
          email,
          password_hash: hashedPassword,
          organization_id: organizationId,
          role: 'admin',
          plan: 'enterprise',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (userError) {
        console.error('[EMERGENCY] Failed to create user:', userError);
        return res.status(500).json({ error: 'Failed to create user' });
      }

      userId = newUser.id;
      console.log(`[EMERGENCY] Created new user with ID: ${userId}`);
    }

    // 3. Link user to organization if the optional membership table exists
    const { error: linkError } = await supabase
      .from('organization_users')
      .upsert({
        organization_id: organizationId,
        user_id: userId,
        role: 'admin',
        created_at: new Date().toISOString()
      }, {
        onConflict: 'organization_id,user_id'
      });

    if (linkError) {
      console.error('[EMERGENCY] Failed to link user to organization:', linkError);
    }

    // 4. Generate API key
    const apiKey = generateApiKey(process.env.NODE_ENV === 'production');
    const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex');

    // 5. Store API key
    const { data: apiKeyData, error: apiKeyError } = await supabase
      .from('api_keys')
      .insert({
        user_id: userId,
        organization_id: organizationId,
        name: 'Emergency Bootstrap Key',
        key_hash: hashedKey,
        // Legacy field consumed by src/middleware/auth-aligned.ts (selects `service`).
        // Schema default is 'all' but set explicitly to survive environments where the default migration hasn't run.
        service: 'all',
        permissions: {
          read: true,
          write: true,
          delete: true,
          admin: true
        },
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
        created_at: new Date().toISOString(),
        is_active: true
      })
      .select()
      .single();

    if (apiKeyError) {
      console.error('[EMERGENCY] Failed to create API key:', apiKeyError);
      return res.status(500).json({ error: 'Failed to create API key' });
    }

    // 6. Log this emergency action to core.logs if table exists
    try {
      await supabase.rpc('log_event', {
        p_project: 'lanonasis-maas',
        p_user_id: userId,
        p_action: 'emergency_bootstrap',
        p_target: 'api_keys',
        p_status: 'allowed',
        p_meta: {
          organization_id: organizationId,
          key_id: apiKeyData.id,
          emergency: true
        }
      });
    } catch (logError) {
      console.warn('[EMERGENCY] Could not log to core.logs:', logError);
    }

    // Return success with the API key
    console.log('[EMERGENCY] Successfully created bootstrap API key');

    res.json({
      success: true,
      message: 'Emergency admin API key created successfully',
      data: {
        api_key: apiKey, // Only time we return the full key
        key_id: apiKeyData.id,
        organization_id: organizationId,
        user_id: userId,
        expires_at: apiKeyData.expires_at
      },
      warning: 'SAVE THIS API KEY - IT WILL NOT BE SHOWN AGAIN',
      next_steps: [
        '1. Save the API key securely',
        '2. Use it to authenticate and fix the main auth system',
        '3. Delete this emergency route file after fixing auth',
        '4. Regenerate production keys through proper auth flow'
      ]
    });
    return;

  } catch (error) {
    console.error('[EMERGENCY] Bootstrap failed:', error);
    res.status(500).json({ 
      error: 'Emergency bootstrap failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
    return;
  }
});

// Health check for emergency route
router.get('/emergency/status', (req, res) => {
  res.json({
    status: 'active',
    warning: 'Emergency route is active - remove after initial setup',
    environment: process.env.NODE_ENV || 'unknown'
  });
});

export default router;

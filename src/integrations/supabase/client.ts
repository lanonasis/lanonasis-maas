/**
 * Supabase Client Configuration
 * Provides authenticated Supabase client for server-side operations
 */

import { createClient } from '@supabase/supabase-js';
import { config } from '@/config/environment';

// Create Supabase client with service role key for server-side operations
export const supabase = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  }
);

// Export types for TypeScript support
export type SupabaseClient = typeof supabase;
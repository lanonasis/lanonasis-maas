import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config/environment';

let client: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient => {
  if (!client) {
    client = createClient(config.supabaseUrl, config.supabaseServiceKey, {
      auth: {
        persistSession: false
      }
    });
  }

  return client;
};

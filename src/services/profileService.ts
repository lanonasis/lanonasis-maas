import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '@/config/environment';

export interface MemoryProfile {
  subject_id: string;
  organization_id: string | null;
  profile_summary: string | null;
  structured_fields: {
    preferences: string[];
    goals: string[];
    constraints: string[];
    tendencies: string[];
    facts: string[];
  };
  last_reasoned_at: string | null;
  freshness: string;
  confidence_by_field: Record<string, number>;
  head_version_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfileVersion {
  id: string;
  profile_id: string;
  diff: Record<string, unknown>;
  source_job_id: string | null;
  created_at: string;
}

export interface ProfileAnswer {
  answer: string;
  sources: string[];
  confidence: number;
}

export class ProfileService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false },
    });
  }

  async getProfile(subject_id: string): Promise<MemoryProfile | null> {
    const { data, error } = await this.supabase
      .from('memory_profiles')
      .select('*')
      .eq('subject_id', subject_id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`getProfile failed: ${error.message}`);
    }

    return data as MemoryProfile;
  }

  async getProfileHistory(subject_id: string, limit = 20): Promise<ProfileVersion[]> {
    const { data, error } = await this.supabase
      .from('memory_profile_versions')
      .select('*')
      .eq('profile_id', subject_id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`getProfileHistory failed: ${error.message}`);
    }

    return (data as ProfileVersion[]) ?? [];
  }

  async askProfile(subject_id: string, question: string): Promise<ProfileAnswer> {
    const res = await fetch(
      `${config.SUPABASE_URL}/functions/v1/intelligence-ask-profile`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ subject_id, question }),
      },
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`askProfile returned ${res.status}: ${text}`);
    }

    const envelope = await res.json() as { success: boolean; data?: ProfileAnswer; error?: string };

    if (!envelope.success || !envelope.data) {
      throw new Error(`askProfile EF error: ${envelope.error ?? 'unknown'}`);
    }

    return envelope.data;
  }
}

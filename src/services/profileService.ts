import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '@/config/environment';
import { logger } from '@/utils/logger';
import { MetricsCollector } from '@/utils/metrics';

// ---------------------------------------------------------------------------
// Typed Errors
// ---------------------------------------------------------------------------

export class DatabaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class ExternalServiceError extends Error {
  status: number;
  body?: string;
  constructor(message: string, status: number, body?: string) {
    super(message);
    this.name = 'ExternalServiceError';
    this.status = status;
    this.body = body;
  }
}

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// ProfileService
// ---------------------------------------------------------------------------

export class ProfileService {
  private supabase: SupabaseClient;
  private metrics = new MetricsCollector();

  constructor() {
    this.supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false },
    });
  }

  /**
   * Get a memory profile for a subject.
   * When organization_id is provided the query also filters by it, preventing
   * cross-tenant reads when the service-role client bypasses RLS.
   */
  async getProfile(subject_id: string, organization_id?: string): Promise<MemoryProfile | null> {
    const startTime = Date.now();

    let query = this.supabase
      .from('memory_profiles')
      .select('*')
      .eq('subject_id', subject_id);

    if (organization_id) {
      query = query.eq('organization_id', organization_id);
    }

    const { data, error } = await query.single();

    if (error) {
      if (error.code === 'PGRST116') {
        this.metrics.incrementCounter('profile.get.not_found', {}, 1);
        this.metrics.recordDuration('profile.get.duration', Date.now() - startTime, { outcome: 'not_found' });
        logger.info('getProfile profile not found', { subject_id });
        return null;
      }
      logger.error('getProfile failed', {
        subject_id,
        error: error.message,
      });
      this.metrics.incrementCounter('profile.get.error', {}, 1);
      throw new DatabaseError(`getProfile failed: ${error.message}`);
    }

    this.metrics.incrementCounter('profile.get.success', { subject_id }, 1);
    this.metrics.recordDuration('profile.get.duration', Date.now() - startTime, { subject_id });
    logger.info('Retrieved memory profile', { subject_id });

    return data as MemoryProfile;
  }

  /**
   * Get version history for a profile.
   * When organization_id is provided, a preliminary check verifies the parent
   * profile belongs to that org (memory_profile_versions has no org column).
   */
  async getProfileHistory(subject_id: string, limit = 20, organization_id?: string): Promise<ProfileVersion[]> {
    const startTime = Date.now();

    if (organization_id) {
      const { data: profileCheck } = await this.supabase
        .from('memory_profiles')
        .select('subject_id')
        .eq('subject_id', subject_id)
        .eq('organization_id', organization_id)
        .single();
      if (!profileCheck) {
        this.metrics.incrementCounter('profile.history.not_found', {}, 1);
        logger.info('getProfileHistory: profile not found under org', { subject_id });
        return [];
      }
    }

    const { data, error } = await this.supabase
      .from('memory_profile_versions')
      .select('*')
      .eq('profile_id', subject_id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('getProfileHistory failed', {
        subject_id,
        error: error.message,
      });
      this.metrics.incrementCounter('profile.history.error', {}, 1);
      throw new DatabaseError(`getProfileHistory failed: ${error.message}`);
    }

    this.metrics.incrementCounter('profile.history.success', {}, 1);
    this.metrics.recordDuration('profile.history.duration', Date.now() - startTime, { subject_id });
    logger.info('Retrieved profile history', {
      subject_id,
      count: (data as ProfileVersion[])?.length ?? 0,
    });

    return (data as ProfileVersion[]) ?? [];
  }

  /**
   * Ask a profile a question via the intelligence edge function.
   * Uses AbortController with 30s timeout to prevent indefinite hangs.
   */
  async askProfile(subject_id: string, question: string): Promise<ProfileAnswer> {
    const startTime = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    try {
      logger.info('askProfile starting', {
        subject_id,
        question_length: question.length,
      });

      const res = await fetch(
        `${config.SUPABASE_URL}/functions/v1/intelligence-ask-profile`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${config.SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ subject_id, question }),
          signal: controller.signal,
        },
      );

      clearTimeout(timeout);

      if (!res.ok) {
        const text = await res.text();
        logger.error('askProfile received error response', {
          subject_id,
          status: res.status,
          body: text,
        });
        this.metrics.incrementCounter('profile.ask.error', {}, 1);
        throw new ExternalServiceError(`askProfile returned ${res.status}: ${text}`, res.status, text);
      }

      const envelope = await res.json() as { success: boolean; data?: ProfileAnswer; error?: string };

      if (!envelope.success || !envelope.data) {
        logger.error('askProfile edge function returned error', {
          subject_id,
          ef_error: envelope.error ?? 'unknown',
        });
        this.metrics.incrementCounter('profile.ask.error', {}, 1);
        throw new ExternalServiceError(
          `askProfile EF error: ${envelope.error ?? 'unknown'}`,
          res.status,
          envelope.error ?? 'unknown',
        );
      }

      this.metrics.incrementCounter('profile.ask.success', {}, 1);
      this.metrics.recordDuration('profile.ask.duration', Date.now() - startTime, { subject_id });
      logger.info('askProfile completed', { subject_id });

      return envelope.data;
    } catch (err: unknown) {
      clearTimeout(timeout);

      if (err instanceof Error && err.name === 'AbortError') {
        logger.error('askProfile timed out', { subject_id });
        this.metrics.incrementCounter('profile.ask.timeout', {}, 1);
        throw new TimeoutError('askProfile timed out after 30s');
      }

      if (err instanceof ExternalServiceError) throw err;
      if (err instanceof TimeoutError) throw err;

      const message = err instanceof Error ? err.message : String(err);
      logger.error('askProfile unexpected error', { subject_id, error: message });
      this.metrics.incrementCounter('profile.ask.error', {}, 1);
      throw new ExternalServiceError(`askProfile failed: ${message}`, 0, message);
    }
  }
}
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

export interface InferredConclusion {
  id: string;
  subject_id: string;
  organization_id: string | null;
  conclusion_type: 'explicit' | 'deductive' | 'inductive' | 'abductive';
  content: string;
  confidence: number;
  evidence_memory_ids: string[];
  scope: string | null;
  freshness: string;
  superseded_by: string | null;
  contradiction_group_id: string | null;
  created_at: string;
  source_job_id: string | null;
}

export interface ReasoningJob {
  id: string;
  subject_id: string;
  organization_id: string | null;
  source_memory_ids: string[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  source_event: 'memory.create' | 'memory.update' | 'manual.flush' | 'reprocess';
  pending_token_count: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  error: string | null;
}

// ---------------------------------------------------------------------------
// IntelligenceService — queries conclusions and jobs from Supabase;
// flush delegates to the Edge Function via service role HTTP call.
// ---------------------------------------------------------------------------

export class IntelligenceService {
  private supabase: SupabaseClient;
  private metrics = new MetricsCollector();

  constructor() {
    this.supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false },
    });
  }

  /**
   * List inferred conclusions for a subject.
   * Reads from the public view of memory_inferred_conclusions.
   */
  async listInferredConclusions(opts: {
    subject_id: string;
    organization_id?: string;
    limit?: number;
    include_superseded?: boolean;
  }): Promise<{ conclusions: InferredConclusion[] }> {
    const startTime = Date.now();

    let query = this.supabase
      .from('memory_inferred_conclusions')
      .select('*')
      .eq('subject_id', opts.subject_id)
      .order('confidence', { ascending: false })
      .limit(opts.limit ?? 20);

    if (opts.organization_id) {
      query = query.eq('organization_id', opts.organization_id);
    }

    if (!opts.include_superseded) {
      query = query.is('superseded_by', null);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('listInferredConclusions failed', {
        subject_id: opts.subject_id,
        error: error.message,
      });
      this.metrics.incrementCounter('intelligence.conclusions.list.error', {}, 1);
      throw new DatabaseError(`listInferredConclusions failed: ${error.message}`);
    }

    this.metrics.incrementCounter('intelligence.conclusions.list.success', {}, 1);
    this.metrics.recordDuration('intelligence.conclusions.list.duration', Date.now() - startTime, {});
    logger.info('Listed inferred conclusions', {
      subject_id: opts.subject_id,
      count: (data as InferredConclusion[])?.length ?? 0,
    });

    return { conclusions: (data as InferredConclusion[]) ?? [] };
  }

  /**
   * Get a reasoning job by ID.
   */
  async getReasoningJobStatus(jobId: string): Promise<ReasoningJob | null> {
    const startTime = Date.now();

    const { data, error } = await this.supabase
      .from('memory_inference_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        logger.warn('getReasoningJobStatus job not found', { jobId });
        return null;
      }
      logger.error('getReasoningJobStatus failed', {
        jobId,
        error: error.message,
      });
      this.metrics.incrementCounter('intelligence.job.get.error', {}, 1);
      throw new DatabaseError(`getReasoningJobStatus failed: ${error.message}`);
    }

    this.metrics.incrementCounter('intelligence.job.get.success', {}, 1);
    this.metrics.recordDuration('intelligence.job.get.duration', Date.now() - startTime, {});
    logger.info('Retrieved reasoning job status', { jobId, status: (data as ReasoningJob).status });

    return data as ReasoningJob;
  }

  /**
   * Flush reasoning queue for a subject — calls the Edge Function.
   * The Edge Function does the actual inference work.
   * Uses AbortController with 30s timeout to prevent indefinite hangs.
   */
  async flushReasoningQueue(
    subject_id: string,
  ): Promise<{ flushed: boolean; job_ids: string[]; conclusion_count: number }> {
    const startTime = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    try {
      logger.info('flushReasoningQueue starting', { subject_id });

      const res = await fetch(
        `${config.SUPABASE_URL}/functions/v1/intelligence-flush-reasoning-queue`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${config.SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ subject_id }),
          signal: controller.signal,
        },
      );

      clearTimeout(timeout);

      if (!res.ok) {
        const text = await res.text();
        logger.error('flushReasoningQueue received error response', {
          subject_id,
          status: res.status,
          body: text,
        });
        this.metrics.incrementCounter('intelligence.flush.error', {}, 1);
        throw new ExternalServiceError(
          `flushReasoningQueue returned ${res.status}: ${text}`,
          res.status,
          text,
        );
      }

      this.metrics.incrementCounter('intelligence.flush.success', {}, 1);
      this.metrics.recordDuration('intelligence.flush.duration', Date.now() - startTime, {});
      logger.info('flushReasoningQueue completed', { subject_id });

      return res.json() as Promise<{ flushed: boolean; job_ids: string[]; conclusion_count: number }>;
    } catch (err: unknown) {
      clearTimeout(timeout);

      if (err instanceof Error && err.name === 'AbortError') {
        logger.error('flushReasoningQueue timed out', { subject_id });
        this.metrics.incrementCounter('intelligence.flush.timeout', {}, 1);
        throw new TimeoutError('flushReasoningQueue timed out after 30s');
      }

      if (err instanceof ExternalServiceError) throw err;
      if (err instanceof TimeoutError) throw err;

      const message = err instanceof Error ? err.message : String(err);
      logger.error('flushReasoningQueue unexpected error', { subject_id, error: message });
      this.metrics.incrementCounter('intelligence.flush.error', {}, 1);
      throw new ExternalServiceError(`flushReasoningQueue failed: ${message}`, 0, message);
    }
  }
}
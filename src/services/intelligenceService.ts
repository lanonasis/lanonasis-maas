import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '@/config/environment';

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
    let query = this.supabase
      .from('memory_inferred_conclusions')
      .select('*')
      .eq('subject_id', opts.subject_id)
      .order('confidence', { ascending: false })
      .limit(opts.limit ?? 20);

    if (!opts.include_superseded) {
      query = query.is('superseded_by', null);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`listInferredConclusions failed: ${error.message}`);
    }

    return { conclusions: (data as InferredConclusion[]) ?? [] };
  }

  /**
   * Get a reasoning job by ID.
   */
  async getReasoningJobStatus(jobId: string): Promise<ReasoningJob | null> {
    const { data, error } = await this.supabase
      .from('memory_inference_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // not found
      throw new Error(`getReasoningJobStatus failed: ${error.message}`);
    }

    return data as ReasoningJob;
  }

  /**
   * Flush reasoning queue for a subject — calls the Edge Function.
   * The Edge Function does the actual inference work.
   */
  async flushReasoningQueue(
    subject_id: string,
  ): Promise<{ flushed: boolean; job_ids: string[]; conclusion_count: number }> {
    const res = await fetch(
      `${config.SUPABASE_URL}/functions/v1/intelligence-flush-reasoning-queue`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ subject_id }),
      },
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`flushReasoningQueue returned ${res.status}: ${text}`);
    }

    return res.json() as Promise<{ flushed: boolean; job_ids: string[]; conclusion_count: number }>;
  }
}

import { z } from 'zod';

/**
 * Memory types supported by the service
 */
export const MEMORY_TYPES = ['context', 'project', 'knowledge', 'reference', 'personal', 'workflow'] as const;
export type MemoryType = typeof MEMORY_TYPES[number];

/**
 * Memory status values
 */
export const MEMORY_STATUSES = ['active', 'archived', 'draft', 'deleted'] as const;
export type MemoryStatus = typeof MEMORY_STATUSES[number];

/**
 * Core memory entry interface
 */
export interface MemoryEntry {
  id: string;
  title: string;
  content: string;
  summary?: string;
  memory_type: MemoryType;
  status: MemoryStatus;
  relevance_score?: number;
  access_count: number;
  last_accessed?: string;
  user_id: string;
  topic_id?: string;
  project_ref?: string;
  tags: string[];
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * Memory topic for organization
 */
export interface MemoryTopic {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  user_id: string;
  parent_topic_id?: string;
  is_system: boolean;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * Memory search result with similarity score
 */
export interface MemorySearchResult extends MemoryEntry {
  similarity_score: number;
}

/**
 * User memory statistics
 */
export interface UserMemoryStats {
  total_memories: number;
  memories_by_type: Record<MemoryType, number>;
  total_topics: number;
  most_accessed_memory?: string;
  recent_memories: string[];
}

/**
 * Intelligence API types
 */
export interface IntelligenceUsage {
  tokens_used: number;
  cost_usd: number;
  cached: boolean;
}

export interface IntelligenceTierInfo {
  tier: string;
  usage_remaining: number;
}

export interface IntelligenceApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
  usage?: IntelligenceUsage;
  tierInfo?: IntelligenceTierInfo;
  errorCode?: string;
  statusCode?: number;
  details?: unknown;
}

export interface IntelligenceEnvelope<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  usage?: IntelligenceUsage;
  tier_info?: IntelligenceTierInfo;
}

export interface TagSuggestionResult {
  suggestions: string[];
  existing_tags: string[];
  from_user_vocabulary: number;
  memory_id?: string;
}

export interface PatternAnalysisResult {
  total_memories?: number;
  time_range_days?: number;
  average_content_length?: number;
  memories_by_type?: Record<string, number>;
  memories_by_day_of_week?: Record<string, number>;
  peak_creation_hours?: number[];
  top_tags?: Array<{ tag: string; count: number }>;
  most_accessed?: Array<{ id: string; title: string; access_count: number }>;
  insights?: string[];
  generated_at?: string;
  message?: string;
  patterns?: null;
}

export interface HealthIssue {
  severity: 'high' | 'medium' | 'low';
  category: string;
  description: string;
  affected_count: number;
  recommendation: string;
}

export interface HealthCheckResult {
  health_score?: {
    overall: number;
    breakdown?: {
      organization: number;
      tagging: number;
      recency: number;
      completeness: number;
      diversity: number;
    } | null;
  };
  status?: 'excellent' | 'good' | 'needs_attention' | 'poor';
  statistics?: {
    total_memories: number;
    active_memories: number;
    archived_memories: number;
    memories_with_tags: number;
    unique_tags: number;
    memory_types: number;
    recent_memories_30d: number;
    stale_memories_90d: number;
  };
  issues?: HealthIssue[];
  recommendations?: string[];
  generated_at?: string;
  message?: string;
}

export interface RelatedMemory {
  id: string;
  title: string;
  type: string;
  tags: string[];
  similarity: number;
  snippet: string;
}

export interface FindRelatedResult {
  query: string;
  source_memory_id?: string;
  related_memories: RelatedMemory[];
  total_found: number;
  search_method: 'semantic' | 'keyword';
  threshold_used: number;
}

export interface DuplicateGroup {
  primary_id: string;
  primary_title: string;
  duplicates: Array<{
    id: string;
    title: string;
    similarity: number;
    created_at: string;
  }>;
  similarity_score: number;
}

export interface DetectDuplicatesResult {
  duplicate_groups: DuplicateGroup[];
  total_groups: number;
  total_duplicates: number;
  detection_method: 'semantic' | 'text';
  threshold_used: number;
  memories_analyzed: number;
  potential_storage_savings: string;
  message?: string;
}

export type InsightType = 'themes' | 'connections' | 'gaps' | 'actions' | 'summary';

export interface Insight {
  type: InsightType;
  content: string;
  confidence: number;
  related_memory_ids?: string[];
}

export interface ExtractInsightsResult {
  insights: Insight[];
  overall_summary?: string;
  memories_analyzed?: number;
  insight_types?: InsightType[];
  topic_filter?: string | null;
  generated_at?: string;
  message?: string;
}

/**
 * Validation schemas using Zod
 */

export const createMemorySchema = z.object({
  title: z.string().min(1).max(500),
  content: z.string().min(1).max(50000),
  summary: z.string().max(1000).optional(),
  memory_type: z.enum(MEMORY_TYPES).default('context'),
  topic_id: z.string().uuid().optional(),
  project_ref: z.string().max(100).optional(),
  tags: z.array(z.string().min(1).max(50)).max(20).default([]),
  metadata: z.record(z.string(), z.unknown()).optional()
});

export const updateMemorySchema = z.object({
  title: z.string().min(1).max(500).optional(),
  content: z.string().min(1).max(50000).optional(),
  summary: z.string().max(1000).optional(),
  memory_type: z.enum(MEMORY_TYPES).optional(),
  status: z.enum(MEMORY_STATUSES).optional(),
  topic_id: z.string().uuid().nullable().optional(),
  project_ref: z.string().max(100).nullable().optional(),
  tags: z.array(z.string().min(1).max(50)).max(20).optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
});

export const searchMemorySchema = z.object({
  query: z.string().min(1).max(1000),
  memory_types: z.array(z.enum(MEMORY_TYPES)).optional(),
  tags: z.array(z.string()).optional(),
  topic_id: z.string().uuid().optional(),
  project_ref: z.string().optional(),
  status: z.enum(MEMORY_STATUSES).default('active'),
  limit: z.number().int().min(1).max(100).default(20),
  threshold: z.number().min(0).max(1).default(0.7)
});

export const createTopicSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  icon: z.string().max(50).optional(),
  parent_topic_id: z.string().uuid().optional()
});

export const suggestTagsSchema = z
  .object({
    memory_id: z.string().uuid().optional(),
    content: z.string().min(1).optional(),
    title: z.string().optional(),
    existing_tags: z.array(z.string()).optional(),
    max_suggestions: z.number().int().min(1).max(10).optional()
  })
  .refine((data) => data.memory_id || data.content, {
    message: 'Either memory_id or content is required'
  });

export const analyzePatternsSchema = z.object({
  time_range_days: z.number().int().min(1).max(365).optional(),
  include_insights: z.boolean().optional(),
  response_format: z.enum(['json', 'markdown']).optional()
});

export const intelligenceHealthCheckSchema = z.object({
  include_recommendations: z.boolean().optional(),
  detailed_breakdown: z.boolean().optional()
});

export const findRelatedSchema = z
  .object({
    memory_id: z.string().uuid().optional(),
    query: z.string().min(1).optional(),
    limit: z.number().int().min(1).max(20).optional(),
    similarity_threshold: z.number().min(0).max(1).optional(),
    exclude_ids: z.array(z.string().uuid()).optional()
  })
  .refine((data) => data.memory_id || data.query, {
    message: 'Either memory_id or query is required'
  });

export const detectDuplicatesSchema = z.object({
  similarity_threshold: z.number().min(0).max(1).optional(),
  include_archived: z.boolean().optional(),
  limit: z.number().int().min(1).max(50).optional()
});

export const extractInsightsSchema = z.object({
  memory_ids: z.array(z.string().uuid()).optional(),
  topic: z.string().min(1).optional(),
  time_range_days: z.number().int().min(1).max(365).optional(),
  insight_types: z.array(z.enum(['themes', 'connections', 'gaps', 'actions', 'summary'])).optional(),
  detail_level: z.enum(['brief', 'detailed', 'comprehensive']).optional()
});

/**
 * Inferred types from schemas
 */
export type CreateMemoryRequest = z.infer<typeof createMemorySchema>;
export type UpdateMemoryRequest = z.infer<typeof updateMemorySchema>;
export type SearchMemoryRequest = z.infer<typeof searchMemorySchema>;
export type CreateTopicRequest = z.infer<typeof createTopicSchema>;
export type SuggestTagsRequest = z.infer<typeof suggestTagsSchema>;
export type AnalyzePatternsRequest = z.infer<typeof analyzePatternsSchema>;
export type IntelligenceHealthCheckRequest = z.infer<typeof intelligenceHealthCheckSchema>;
export type FindRelatedRequest = z.infer<typeof findRelatedSchema>;
export type DetectDuplicatesRequest = z.infer<typeof detectDuplicatesSchema>;
export type ExtractInsightsRequest = z.infer<typeof extractInsightsSchema>;

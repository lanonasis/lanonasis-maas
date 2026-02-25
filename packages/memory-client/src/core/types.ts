import { z } from 'zod';

/**
 * Memory types supported by the service
 */
export const MEMORY_TYPES = ['context', 'project', 'knowledge', 'reference', 'personal', 'workflow'] as const;
export type MemoryType = typeof MEMORY_TYPES[number];
export const WRITE_INTENTS = ['new', 'continue', 'auto'] as const;
export type WriteIntent = typeof WRITE_INTENTS[number];

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
  metadata: z.record(z.string(), z.unknown()).optional(),
  continuity_key: z.string().min(1).max(255).optional(),
  idempotency_key: z.string().min(1).max(255).optional(),
  write_intent: z.enum(WRITE_INTENTS).optional()
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
  metadata: z.record(z.string(), z.unknown()).optional(),
  continuity_key: z.string().min(1).max(255).optional(),
  idempotency_key: z.string().min(1).max(255).optional(),
  write_intent: z.enum(WRITE_INTENTS).optional()
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

// ========================================
// Intelligence Feature Types (v2.0)
// ========================================

/**
 * Chunking strategies for content preprocessing
 */
export const CHUNKING_STRATEGIES = ['semantic', 'fixed-size', 'paragraph', 'sentence', 'code-block'] as const;
export type ChunkingStrategy = typeof CHUNKING_STRATEGIES[number];

/**
 * Content types detected or specified
 */
export const CONTENT_TYPES = ['text', 'code', 'markdown', 'json', 'yaml'] as const;
export type ContentType = typeof CONTENT_TYPES[number];

/**
 * A chunk of content from a memory entry
 */
export interface ContentChunk {
  index: number;
  content: string;
  startChar: number;
  endChar: number;
  tokens: number;
  metadata?: {
    type: 'paragraph' | 'sentence' | 'code' | 'section';
    isComplete: boolean;
  };
}

/**
 * Extracted intelligence from memory content
 */
export interface MemoryIntelligence {
  entities: string[];
  keywords: string[];
  language: string;
  topics?: string[];
  sentiment?: 'positive' | 'neutral' | 'negative';
  complexity?: 'low' | 'medium' | 'high';
}

/**
 * Extended metadata with intelligence features
 */
export interface IntelligentMetadata extends Record<string, unknown> {
  // Chunking information
  chunks?: ContentChunk[];
  total_chunks?: number;
  chunking_strategy?: ChunkingStrategy;
  last_rechunked_at?: string;

  // Content intelligence
  intelligence?: MemoryIntelligence;

  // Content metadata
  content_type?: ContentType;
  language?: string;
  tokens?: number;

  // Custom metadata
  source?: string;
  priority?: 'high' | 'medium' | 'low';
}

/**
 * Preprocessing options for memory creation/update
 */
export interface PreprocessingOptions {
  chunking?: {
    strategy?: ChunkingStrategy;
    maxChunkSize?: number;
    overlap?: number;
  };
  cleanContent?: boolean;
  extractMetadata?: boolean;
}

/**
 * Extended create memory request with preprocessing
 */
export interface CreateMemoryWithPreprocessingRequest extends CreateMemoryRequest {
  preprocessing?: PreprocessingOptions;
  metadata?: IntelligentMetadata;
}

/**
 * Extended update memory request with re-chunking
 */
export interface UpdateMemoryWithPreprocessingRequest extends UpdateMemoryRequest {
  rechunk?: boolean;
  regenerate_embedding?: boolean;
}

// ========================================
// Enhanced Search Types
// ========================================

/**
 * Search modes for memory queries
 */
export const SEARCH_MODES = ['vector', 'text', 'hybrid'] as const;
export type SearchMode = typeof SEARCH_MODES[number];

/**
 * A matching chunk from search results
 */
export interface MatchingChunk {
  index: number;
  content: string;
  similarity: number;
}

/**
 * Enhanced search filters
 */
export interface SearchFilters {
  tags?: string[];
  project_id?: string;
  topic_id?: string;
  date_range?: {
    from?: string;
    to?: string;
  };
}

/**
 * Enhanced search request with hybrid mode
 */
export interface EnhancedSearchRequest {
  query: string;
  type?: MemoryType;
  threshold?: number;
  limit?: number;
  search_mode?: SearchMode;
  filters?: SearchFilters;
  include_chunks?: boolean;
}

/**
 * Enhanced search result with chunk matching
 */
export interface EnhancedMemorySearchResult extends MemorySearchResult {
  text_rank?: number;
  combined_score?: number;
  matching_chunks?: MatchingChunk[];
}

/**
 * Enhanced search response
 */
export interface EnhancedSearchResponse {
  results: EnhancedMemorySearchResult[];
  total: number;
  query: string;
  search_mode: SearchMode;
  threshold: number;
  execution_time_ms: number;
}

// ========================================
// Analytics Types
// ========================================

/**
 * Search analytics data point
 */
export interface SearchAnalyticsDataPoint {
  date: string;
  searches: number;
  avg_results: number;
  avg_time_ms: number;
}

/**
 * Popular query entry
 */
export interface PopularQuery {
  query: string;
  count: number;
  avg_results: number;
}

/**
 * Search analytics response
 */
export interface SearchAnalytics {
  total_searches: number;
  avg_results_count: number;
  avg_execution_time_ms: number;
  search_types: {
    vector: number;
    text: number;
    hybrid: number;
  };
  by_date: SearchAnalyticsDataPoint[];
  popular_queries: PopularQuery[];
}

/**
 * Most accessed memory entry
 */
export interface MostAccessedMemory {
  memory_id: string;
  title: string;
  access_count: number;
  last_accessed: string;
}

/**
 * Hourly access data
 */
export interface HourlyAccess {
  hour: number;
  count: number;
}

/**
 * Access patterns response
 */
export interface AccessPatterns {
  total_accesses: number;
  by_type: {
    read: number;
    update: number;
    delete: number;
  };
  by_method: {
    api: number;
    search: number;
    direct: number;
  };
  most_accessed: MostAccessedMemory[];
  access_by_hour: HourlyAccess[];
}

/**
 * Project memory count
 */
export interface ProjectMemoryCount {
  project_id: string;
  project_name: string;
  count: number;
}

/**
 * Tag count entry
 */
export interface TagCount {
  tag: string;
  count: number;
}

/**
 * Extended memory statistics
 */
export interface ExtendedMemoryStats {
  total_memories: number;
  by_type: Record<MemoryType, number>;
  by_project: ProjectMemoryCount[];
  storage: {
    total_size_mb: number;
    avg_memory_size_kb: number;
    total_chunks: number;
  };
  activity: {
    created_today: number;
    updated_today: number;
    searched_today: number;
  };
  top_tags: TagCount[];
}

/**
 * Analytics date range filter
 */
export interface AnalyticsDateRange {
  from?: string;
  to?: string;
  group_by?: 'day' | 'week' | 'month';
}

// ========================================
// Validation Schemas for Intelligence
// ========================================

export const preprocessingOptionsSchema = z.object({
  chunking: z.object({
    strategy: z.enum(CHUNKING_STRATEGIES).optional(),
    maxChunkSize: z.number().int().min(100).max(10000).optional(),
    overlap: z.number().int().min(0).max(500).optional()
  }).optional(),
  cleanContent: z.boolean().optional(),
  extractMetadata: z.boolean().optional()
}).optional();

export const enhancedSearchSchema = z.object({
  query: z.string().min(1).max(1000),
  type: z.enum(MEMORY_TYPES).optional(),
  threshold: z.number().min(0).max(1).default(0.7),
  limit: z.number().int().min(1).max(100).default(20),
  search_mode: z.enum(SEARCH_MODES).default('hybrid'),
  filters: z.object({
    tags: z.array(z.string()).optional(),
    project_id: z.string().uuid().optional(),
    topic_id: z.string().uuid().optional(),
    date_range: z.object({
      from: z.string().optional(),
      to: z.string().optional()
    }).optional()
  }).optional(),
  include_chunks: z.boolean().default(false)
});

export const analyticsDateRangeSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  group_by: z.enum(['day', 'week', 'month']).default('day')
});

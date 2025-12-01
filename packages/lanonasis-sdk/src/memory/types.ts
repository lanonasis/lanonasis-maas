/**
 * Memory types and interfaces
 */

export interface Memory {
  id: string;
  title: string;
  content: string;
  type: MemoryType;
  tags?: string[];
  metadata?: Record<string, any>;
  topic_id?: string;
  user_id?: string;
  organization_id?: string;
  created_at?: string;
  updated_at?: string;
}

export type MemoryType = 
  | 'context'
  | 'code_snippet'
  | 'document'
  | 'conversation'
  | 'note'
  | 'bookmark'
  | 'task'
  | 'idea'
  | 'project'
  | 'knowledge'
  | 'reference'
  | 'personal'
  | 'workflow';

export interface CreateMemoryRequest {
  title: string;
  content: string;
  type: MemoryType;
  tags?: string[];
  metadata?: Record<string, any>;
  topic_id?: string;
}

export interface UpdateMemoryRequest {
  title?: string;
  content?: string;
  type?: MemoryType;
  tags?: string[];
  metadata?: Record<string, any>;
  topic_id?: string;
}

export interface SearchMemoryRequest {
  query: string;
  type?: MemoryType | MemoryType[];
  tags?: string[];
  topic_id?: string;
  limit?: number;
  threshold?: number;
}

export interface SearchMemoryResponse {
  results: MemorySearchResult[];
  total: number;
  query: string;
}

export interface MemorySearchResult extends Memory {
  similarity?: number;
  score?: number;
}

export interface Topic {
  id: string;
  name: string;
  description?: string;
  user_id?: string;
  organization_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateTopicRequest {
  name: string;
  description?: string;
}

export interface UpdateTopicRequest {
  name?: string;
  description?: string;
}

export interface UsageAnalytics {
  total_memories: number;
  total_searches: number;
  memory_types: Record<MemoryType, number>;
  period: {
    start: string;
    end: string;
  };
}


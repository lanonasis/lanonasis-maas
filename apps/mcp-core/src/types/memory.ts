export type MemoryType = 'context' | 'project' | 'knowledge' | 'reference' | 'personal' | 'workflow';

export interface MemoryEntry {
  id: string;
  title: string;
  content: string;
  memory_type: MemoryType;
  tags: string[];
  topic_id?: string | null;
  user_id: string;
  organization_id: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  last_accessed?: string | null;
  access_count: number;
}

export interface MemorySearchResult extends MemoryEntry {
  relevance_score: number;
}

export interface CreateMemoryRequest {
  title: string;
  content: string;
  memory_type: MemoryType;
  tags?: string[];
  topic_id?: string | null;
  metadata?: Record<string, unknown>;
}

export interface UpdateMemoryRequest {
  title?: string;
  content?: string;
  memory_type?: MemoryType;
  tags?: string[];
  topic_id?: string | null;
  metadata?: Record<string, unknown>;
}

export interface SearchFilters {
  memory_types?: MemoryType[];
  tags?: string[];
  topic_id?: string | null;
  user_id?: string;
  limit?: number;
  threshold?: number;
}

export interface ListMemoryFilters {
  user_id?: string;
  memory_type?: MemoryType;
  tags?: string[];
  topic_id?: string | null;
}

export interface PaginationOptions {
  page: number;
  limit: number;
  sort?: 'created_at' | 'updated_at' | 'last_accessed' | 'title' | 'access_count';
  order?: 'asc' | 'desc';
}

export interface PaginatedMemories {
  memories: MemoryEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

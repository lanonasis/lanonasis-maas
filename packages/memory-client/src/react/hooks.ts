/**
 * React Hooks for Memory Client
 *
 * Provides convenient React hooks for working with memories
 */

import { useContext, useEffect, useState, useCallback, useRef } from 'react';
import { MemoryContext } from './provider';
import type {
  MemoryEntry,
  CreateMemoryRequest,
  UpdateMemoryRequest,
  SearchMemoryRequest,
  MemorySearchResult
} from '../core/types';
import type { ApiErrorResponse } from '../core/errors';

/**
 * Hook to access the Memory Client instance
 *
 * @throws Error if used outside of MemoryProvider
 */
export function useMemoryClient() {
  const client = useContext(MemoryContext);

  if (!client) {
    throw new Error('useMemoryClient must be used within a MemoryProvider');
  }

  return client;
}

/**
 * Result type for list/search hooks
 */
export interface UseMemoriesResult {
  memories: MemoryEntry[];
  loading: boolean;
  error: ApiErrorResponse | null;
  refresh: () => Promise<void>;
}

/**
 * Hook to list memories with optional filtering
 *
 * @example
 * ```tsx
 * function MemoryList() {
 *   const { memories, loading, error, refresh } = useMemories({
 *     memory_type: 'project',
 *     limit: 20
 *   });
 *
 *   if (loading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *
 *   return (
 *     <div>
 *       {memories.map(m => <div key={m.id}>{m.title}</div>)}
 *       <button onClick={refresh}>Refresh</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useMemories(options?: {
  page?: number;
  limit?: number;
  memory_type?: string;
  topic_id?: string;
  project_ref?: string;
  status?: string;
  tags?: string[];
  sort?: string;
  order?: 'asc' | 'desc';
}): UseMemoriesResult {
  const client = useMemoryClient();
  const [memories, setMemories] = useState<MemoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiErrorResponse | null>(null);

  const loadMemories = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await client.listMemories(options);

    if (result.error) {
      setError(result.error);
      setMemories([]);
    } else if (result.data) {
      setMemories(result.data.data);
    }

    setLoading(false);
  }, [client, JSON.stringify(options)]);

  useEffect(() => {
    loadMemories();
  }, [loadMemories]);

  return {
    memories,
    loading,
    error,
    refresh: loadMemories
  };
}

/**
 * Result type for single memory hook
 */
export interface UseMemoryResult {
  memory: MemoryEntry | null;
  loading: boolean;
  error: ApiErrorResponse | null;
  refresh: () => Promise<void>;
  update: (updates: UpdateMemoryRequest) => Promise<void>;
  deleteMemory: () => Promise<void>;
}

/**
 * Hook to fetch and manage a single memory by ID
 *
 * @example
 * ```tsx
 * function MemoryDetail({ id }: { id: string }) {
 *   const { memory, loading, error, update, deleteMemory } = useMemory(id);
 *
 *   if (loading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *   if (!memory) return <div>Memory not found</div>;
 *
 *   return (
 *     <div>
 *       <h1>{memory.title}</h1>
 *       <p>{memory.content}</p>
 *       <button onClick={() => update({ title: 'Updated Title' })}>Update</button>
 *       <button onClick={deleteMemory}>Delete</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useMemory(id: string): UseMemoryResult {
  const client = useMemoryClient();
  const [memory, setMemory] = useState<MemoryEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiErrorResponse | null>(null);

  const loadMemory = useCallback(async () => {
    if (!id) {
      setMemory(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const result = await client.getMemory(id);

    if (result.error) {
      setError(result.error);
      setMemory(null);
    } else if (result.data) {
      setMemory(result.data);
    }

    setLoading(false);
  }, [client, id]);

  useEffect(() => {
    loadMemory();
  }, [loadMemory]);

  const update = useCallback(async (updates: UpdateMemoryRequest) => {
    if (!id) return;

    const result = await client.updateMemory(id, updates);

    if (result.error) {
      setError(result.error);
    } else if (result.data) {
      setMemory(result.data);
    }
  }, [client, id]);

  const deleteMemory = useCallback(async () => {
    if (!id) return;

    const result = await client.deleteMemory(id);

    if (result.error) {
      setError(result.error);
    } else {
      setMemory(null);
    }
  }, [client, id]);

  return {
    memory,
    loading,
    error,
    refresh: loadMemory,
    update,
    deleteMemory
  };
}

/**
 * Result type for create memory hook
 */
export interface UseCreateMemoryResult {
  createMemory: (memory: CreateMemoryRequest) => Promise<MemoryEntry | null>;
  loading: boolean;
  error: ApiErrorResponse | null;
}

/**
 * Hook to create new memories
 *
 * @example
 * ```tsx
 * function CreateMemoryForm() {
 *   const { createMemory, loading, error } = useCreateMemory();
 *   const [title, setTitle] = useState('');
 *   const [content, setContent] = useState('');
 *
 *   const handleSubmit = async (e: React.FormEvent) => {
 *     e.preventDefault();
 *     const memory = await createMemory({ title, content });
 *     if (memory) {
 *       console.log('Created:', memory.id);
 *       setTitle('');
 *       setContent('');
 *     }
 *   };
 *
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       <input value={title} onChange={e => setTitle(e.target.value)} />
 *       <textarea value={content} onChange={e => setContent(e.target.value)} />
 *       <button type="submit" disabled={loading}>Create</button>
 *       {error && <div>Error: {error.message}</div>}
 *     </form>
 *   );
 * }
 * ```
 */
export function useCreateMemory(): UseCreateMemoryResult {
  const client = useMemoryClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiErrorResponse | null>(null);

  const createMemory = useCallback(async (memory: CreateMemoryRequest): Promise<MemoryEntry | null> => {
    setLoading(true);
    setError(null);

    const result = await client.createMemory(memory);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return null;
    }

    setLoading(false);
    return result.data || null;
  }, [client]);

  return {
    createMemory,
    loading,
    error
  };
}

/**
 * Result type for search memories hook
 */
export interface UseSearchMemoriesResult {
  results: MemorySearchResult[];
  loading: boolean;
  error: ApiErrorResponse | null;
  search: (query: string, options?: Omit<SearchMemoryRequest, 'query'>) => Promise<void>;
  totalResults: number;
  searchTime: number;
}

/**
 * Hook to search memories with debouncing
 *
 * @example
 * ```tsx
 * function MemorySearch() {
 *   const { results, loading, error, search } = useSearchMemories();
 *   const [query, setQuery] = useState('');
 *
 *   useEffect(() => {
 *     if (query.length > 2) {
 *       search(query, { limit: 10 });
 *     }
 *   }, [query, search]);
 *
 *   return (
 *     <div>
 *       <input
 *         value={query}
 *         onChange={e => setQuery(e.target.value)}
 *         placeholder="Search memories..."
 *       />
 *       {loading && <div>Searching...</div>}
 *       {error && <div>Error: {error.message}</div>}
 *       {results.map(r => (
 *         <div key={r.id}>
 *           <h3>{r.title}</h3>
 *           <span>Score: {r.similarity_score.toFixed(2)}</span>
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useSearchMemories(debounceMs: number = 300): UseSearchMemoriesResult {
  const client = useMemoryClient();
  const [results, setResults] = useState<MemorySearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiErrorResponse | null>(null);
  const [totalResults, setTotalResults] = useState(0);
  const [searchTime, setSearchTime] = useState(0);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (query: string, options?: Omit<SearchMemoryRequest, 'query'>) => {
    // Clear existing timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Set new timer
    debounceTimer.current = setTimeout(async () => {
      setLoading(true);
      setError(null);

      const result = await client.searchMemories({
        query,
        status: options?.status ?? 'active',
        limit: options?.limit ?? 20,
        threshold: options?.threshold ?? 0.7,
        ...options
      });

      if (result.error) {
        setError(result.error);
        setResults([]);
        setTotalResults(0);
        setSearchTime(0);
      } else if (result.data) {
        setResults(result.data.results);
        setTotalResults(result.data.total_results);
        setSearchTime(result.data.search_time_ms);
      }

      setLoading(false);
    }, debounceMs);
  }, [client, debounceMs]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  return {
    results,
    loading,
    error,
    search,
    totalResults,
    searchTime
  };
}

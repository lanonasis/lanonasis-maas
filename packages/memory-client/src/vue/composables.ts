/**
 * Vue Composables for Memory Client
 *
 * Provides convenient Vue composables for working with memories
 */

import { ref, computed, onMounted, watch, type Ref } from 'vue';
import { useMemoryClient } from './plugin';
import type {
  MemoryEntry,
  CreateMemoryRequest,
  UpdateMemoryRequest,
  SearchMemoryRequest,
  MemorySearchResult
} from '../core/types';
import type { ApiErrorResponse } from '../core/errors';

/**
 * Composable to list memories with optional filtering
 *
 * @example
 * ```vue
 * <script setup>
 * import { useMemories } from '@lanonasis/memory-client/vue';
 *
 * const { memories, loading, error, refresh } = useMemories({
 *   memory_type: 'project',
 *   limit: 20
 * });
 * </script>
 *
 * <template>
 *   <div v-if="loading">Loading...</div>
 *   <div v-else-if="error">Error: {{ error.message }}</div>
 *   <div v-else>
 *     <div v-for="memory in memories" :key="memory.id">
 *       {{ memory.title }}
 *     </div>
 *     <button @click="refresh">Refresh</button>
 *   </div>
 * </template>
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
}) {
  const client = useMemoryClient();
  const memories = ref<MemoryEntry[]>([]);
  const loading = ref(true);
  const error = ref<ApiErrorResponse | null>(null);

  async function loadMemories() {
    loading.value = true;
    error.value = null;

    const result = await client.listMemories(options);

    if (result.error) {
      error.value = result.error;
      memories.value = [];
    } else if (result.data) {
      memories.value = result.data.data;
    }

    loading.value = false;
  }

  onMounted(loadMemories);

  return {
    memories: computed(() => memories.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    refresh: loadMemories
  };
}

/**
 * Composable to fetch and manage a single memory by ID
 *
 * @example
 * ```vue
 * <script setup>
 * import { useMemory } from '@lanonasis/memory-client/vue';
 *
 * const props = defineProps<{ id: string }>();
 * const { memory, loading, error, update, deleteMemory } = useMemory(() => props.id);
 * </script>
 *
 * <template>
 *   <div v-if="loading">Loading...</div>
 *   <div v-else-if="error">Error: {{ error.message }}</div>
 *   <div v-else-if="memory">
 *     <h1>{{ memory.title }}</h1>
 *     <p>{{ memory.content }}</p>
 *     <button @click="update({ title: 'Updated Title' })">Update</button>
 *     <button @click="deleteMemory">Delete</button>
 *   </div>
 * </template>
 * ```
 */
export function useMemory(id: Ref<string> | (() => string) | string) {
  const client = useMemoryClient();
  const memory = ref<MemoryEntry | null>(null);
  const loading = ref(true);
  const error = ref<ApiErrorResponse | null>(null);

  const memoryId = computed(() => {
    if (typeof id === 'function') {
      return id();
    } else if (typeof id === 'string') {
      return id;
    } else {
      return id.value;
    }
  });

  async function loadMemory() {
    if (!memoryId.value) {
      memory.value = null;
      loading.value = false;
      return;
    }

    loading.value = true;
    error.value = null;

    const result = await client.getMemory(memoryId.value);

    if (result.error) {
      error.value = result.error;
      memory.value = null;
    } else if (result.data) {
      memory.value = result.data;
    }

    loading.value = false;
  }

  async function update(updates: UpdateMemoryRequest) {
    if (!memoryId.value) return;

    const result = await client.updateMemory(memoryId.value, updates);

    if (result.error) {
      error.value = result.error;
    } else if (result.data) {
      memory.value = result.data;
    }
  }

  async function deleteMemory() {
    if (!memoryId.value) return;

    const result = await client.deleteMemory(memoryId.value);

    if (result.error) {
      error.value = result.error;
    } else {
      memory.value = null;
    }
  }

  onMounted(loadMemory);

  // Watch for ID changes and reload
  watch(memoryId, loadMemory);

  return {
    memory: computed(() => memory.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    refresh: loadMemory,
    update,
    deleteMemory
  };
}

/**
 * Composable to create new memories
 *
 * @example
 * ```vue
 * <script setup>
 * import { ref } from 'vue';
 * import { useCreateMemory } from '@lanonasis/memory-client/vue';
 *
 * const title = ref('');
 * const content = ref('');
 * const { createMemory, loading, error } = useCreateMemory();
 *
 * async function handleSubmit() {
 *   const memory = await createMemory({
 *     title: title.value,
 *     content: content.value
 *   });
 *   if (memory) {
 *     console.log('Created:', memory.id);
 *     title.value = '';
 *     content.value = '';
 *   }
 * }
 * </script>
 *
 * <template>
 *   <form @submit.prevent="handleSubmit">
 *     <input v-model="title" placeholder="Title" />
 *     <textarea v-model="content" placeholder="Content" />
 *     <button type="submit" :disabled="loading">Create</button>
 *     <div v-if="error">Error: {{ error.message }}</div>
 *   </form>
 * </template>
 * ```
 */
export function useCreateMemory() {
  const client = useMemoryClient();
  const loading = ref(false);
  const error = ref<ApiErrorResponse | null>(null);

  async function createMemory(memory: CreateMemoryRequest): Promise<MemoryEntry | null> {
    loading.value = true;
    error.value = null;

    const result = await client.createMemory(memory);

    if (result.error) {
      error.value = result.error;
      loading.value = false;
      return null;
    }

    loading.value = false;
    return result.data || null;
  }

  return {
    createMemory,
    loading: computed(() => loading.value),
    error: computed(() => error.value)
  };
}

/**
 * Composable to search memories
 *
 * @example
 * ```vue
 * <script setup>
 * import { ref, watch } from 'vue';
 * import { useSearchMemories } from '@lanonasis/memory-client/vue';
 *
 * const query = ref('');
 * const { results, loading, error, search, totalResults, searchTime } = useSearchMemories();
 *
 * watch(query, (newQuery) => {
 *   if (newQuery.length > 2) {
 *     search(newQuery, { limit: 10 });
 *   }
 * });
 * </script>
 *
 * <template>
 *   <div>
 *     <input v-model="query" placeholder="Search memories..." />
 *     <div v-if="loading">Searching...</div>
 *     <div v-if="error">Error: {{ error.message }}</div>
 *     <div v-for="result in results" :key="result.id">
 *       <h3>{{ result.title }}</h3>
 *       <span>Score: {{ result.similarity_score.toFixed(2) }}</span>
 *     </div>
 *     <div v-if="totalResults > 0">
 *       Found {{ totalResults }} results in {{ searchTime }}ms
 *     </div>
 *   </div>
 * </template>
 * ```
 */
export function useSearchMemories(debounceMs: number = 300) {
  const client = useMemoryClient();
  const results = ref<MemorySearchResult[]>([]);
  const loading = ref(false);
  const error = ref<ApiErrorResponse | null>(null);
  const totalResults = ref(0);
  const searchTime = ref(0);
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  async function search(query: string, options?: Omit<SearchMemoryRequest, 'query'>) {
    // Clear existing timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    // Set new timer
    debounceTimer = setTimeout(async () => {
      loading.value = true;
      error.value = null;

      const result = await client.searchMemories({
        query,
        status: options?.status ?? 'active',
        limit: options?.limit ?? 20,
        threshold: options?.threshold ?? 0.7,
        ...options
      });

      if (result.error) {
        error.value = result.error;
        results.value = [];
        totalResults.value = 0;
        searchTime.value = 0;
      } else if (result.data) {
        results.value = result.data.results;
        totalResults.value = result.data.total_results;
        searchTime.value = result.data.search_time_ms;
      }

      loading.value = false;
    }, debounceMs);
  }

  return {
    results: computed(() => results.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    search,
    totalResults: computed(() => totalResults.value),
    searchTime: computed(() => searchTime.value)
  };
}

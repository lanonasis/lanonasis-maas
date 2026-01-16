import { describe, it, expect } from 'vitest';
import {
  MEMORY_TYPES,
  MEMORY_STATUSES,
  CHUNKING_STRATEGIES,
  CONTENT_TYPES,
  SEARCH_MODES,
  createMemorySchema,
  updateMemorySchema,
  searchMemorySchema,
  createTopicSchema,
  enhancedSearchSchema,
  analyticsDateRangeSchema
} from './types';

describe('Type Constants', () => {
  describe('MEMORY_TYPES', () => {
    it('contains all expected types', () => {
      expect(MEMORY_TYPES).toContain('context');
      expect(MEMORY_TYPES).toContain('project');
      expect(MEMORY_TYPES).toContain('knowledge');
      expect(MEMORY_TYPES).toContain('reference');
      expect(MEMORY_TYPES).toContain('personal');
      expect(MEMORY_TYPES).toContain('workflow');
    });
  });

  describe('MEMORY_STATUSES', () => {
    it('contains all expected statuses', () => {
      expect(MEMORY_STATUSES).toContain('active');
      expect(MEMORY_STATUSES).toContain('archived');
      expect(MEMORY_STATUSES).toContain('draft');
      expect(MEMORY_STATUSES).toContain('deleted');
    });
  });

  describe('CHUNKING_STRATEGIES', () => {
    it('contains all expected strategies', () => {
      expect(CHUNKING_STRATEGIES).toContain('semantic');
      expect(CHUNKING_STRATEGIES).toContain('fixed-size');
      expect(CHUNKING_STRATEGIES).toContain('paragraph');
      expect(CHUNKING_STRATEGIES).toContain('sentence');
      expect(CHUNKING_STRATEGIES).toContain('code-block');
    });
  });

  describe('CONTENT_TYPES', () => {
    it('contains all expected content types', () => {
      expect(CONTENT_TYPES).toContain('text');
      expect(CONTENT_TYPES).toContain('code');
      expect(CONTENT_TYPES).toContain('markdown');
      expect(CONTENT_TYPES).toContain('json');
      expect(CONTENT_TYPES).toContain('yaml');
    });
  });

  describe('SEARCH_MODES', () => {
    it('contains all expected search modes', () => {
      expect(SEARCH_MODES).toContain('vector');
      expect(SEARCH_MODES).toContain('text');
      expect(SEARCH_MODES).toContain('hybrid');
    });
  });
});

describe('Validation Schemas', () => {
  describe('createMemorySchema', () => {
    it('validates valid memory creation request', () => {
      const result = createMemorySchema.safeParse({
        title: 'Test Memory',
        content: 'This is test content',
        memory_type: 'knowledge',
        tags: ['test', 'example']
      });
      expect(result.success).toBe(true);
    });

    it('applies defaults for optional fields', () => {
      const result = createMemorySchema.safeParse({
        title: 'Test',
        content: 'Content'
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.memory_type).toBe('context');
        expect(result.data.tags).toEqual([]);
      }
    });

    it('rejects empty title', () => {
      const result = createMemorySchema.safeParse({
        title: '',
        content: 'Content'
      });
      expect(result.success).toBe(false);
    });

    it('rejects title over 500 chars', () => {
      const result = createMemorySchema.safeParse({
        title: 'a'.repeat(501),
        content: 'Content'
      });
      expect(result.success).toBe(false);
    });

    it('rejects content over 50000 chars', () => {
      const result = createMemorySchema.safeParse({
        title: 'Test',
        content: 'a'.repeat(50001)
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid memory type', () => {
      const result = createMemorySchema.safeParse({
        title: 'Test',
        content: 'Content',
        memory_type: 'invalid'
      });
      expect(result.success).toBe(false);
    });

    it('rejects more than 20 tags', () => {
      const tags = Array(21).fill('tag');
      const result = createMemorySchema.safeParse({
        title: 'Test',
        content: 'Content',
        tags
      });
      expect(result.success).toBe(false);
    });
  });

  describe('updateMemorySchema', () => {
    it('validates partial update', () => {
      const result = updateMemorySchema.safeParse({
        title: 'Updated Title'
      });
      expect(result.success).toBe(true);
    });

    it('allows updating status', () => {
      const result = updateMemorySchema.safeParse({
        status: 'archived'
      });
      expect(result.success).toBe(true);
    });

    it('allows nullable topic_id', () => {
      const result = updateMemorySchema.safeParse({
        topic_id: null
      });
      expect(result.success).toBe(true);
    });

    it('validates empty object (no changes)', () => {
      const result = updateMemorySchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe('searchMemorySchema', () => {
    it('validates basic search request', () => {
      const result = searchMemorySchema.safeParse({
        query: 'test search'
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('active');
        expect(result.data.limit).toBe(20);
        expect(result.data.threshold).toBe(0.7);
      }
    });

    it('rejects empty query', () => {
      const result = searchMemorySchema.safeParse({
        query: ''
      });
      expect(result.success).toBe(false);
    });

    it('rejects query over 1000 chars', () => {
      const result = searchMemorySchema.safeParse({
        query: 'a'.repeat(1001)
      });
      expect(result.success).toBe(false);
    });

    it('validates limit within range', () => {
      expect(searchMemorySchema.safeParse({ query: 'test', limit: 1 }).success).toBe(true);
      expect(searchMemorySchema.safeParse({ query: 'test', limit: 100 }).success).toBe(true);
      expect(searchMemorySchema.safeParse({ query: 'test', limit: 0 }).success).toBe(false);
      expect(searchMemorySchema.safeParse({ query: 'test', limit: 101 }).success).toBe(false);
    });

    it('validates threshold within range', () => {
      expect(searchMemorySchema.safeParse({ query: 'test', threshold: 0 }).success).toBe(true);
      expect(searchMemorySchema.safeParse({ query: 'test', threshold: 1 }).success).toBe(true);
      expect(searchMemorySchema.safeParse({ query: 'test', threshold: -0.1 }).success).toBe(false);
      expect(searchMemorySchema.safeParse({ query: 'test', threshold: 1.1 }).success).toBe(false);
    });
  });

  describe('createTopicSchema', () => {
    it('validates basic topic creation', () => {
      const result = createTopicSchema.safeParse({
        name: 'Test Topic'
      });
      expect(result.success).toBe(true);
    });

    it('validates topic with all fields', () => {
      const result = createTopicSchema.safeParse({
        name: 'Test Topic',
        description: 'A test topic description',
        color: '#FF5733',
        icon: 'folder'
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid color format', () => {
      const result = createTopicSchema.safeParse({
        name: 'Test',
        color: 'red' // Should be hex
      });
      expect(result.success).toBe(false);
    });

    it('validates hex color formats', () => {
      expect(createTopicSchema.safeParse({ name: 'Test', color: '#FFFFFF' }).success).toBe(true);
      expect(createTopicSchema.safeParse({ name: 'Test', color: '#000000' }).success).toBe(true);
      expect(createTopicSchema.safeParse({ name: 'Test', color: '#ff5733' }).success).toBe(true);
    });
  });

  describe('enhancedSearchSchema', () => {
    it('validates enhanced search with defaults', () => {
      const result = enhancedSearchSchema.safeParse({
        query: 'test'
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.search_mode).toBe('hybrid');
        expect(result.data.include_chunks).toBe(false);
      }
    });

    it('validates search with all options', () => {
      const result = enhancedSearchSchema.safeParse({
        query: 'authentication',
        type: 'knowledge',
        threshold: 0.8,
        limit: 50,
        search_mode: 'vector',
        filters: {
          tags: ['auth', 'security'],
          project_id: '550e8400-e29b-41d4-a716-446655440000',
          date_range: {
            from: '2025-01-01',
            to: '2025-12-31'
          }
        },
        include_chunks: true
      });
      expect(result.success).toBe(true);
    });

    it('validates all search modes', () => {
      expect(enhancedSearchSchema.safeParse({ query: 'test', search_mode: 'vector' }).success).toBe(true);
      expect(enhancedSearchSchema.safeParse({ query: 'test', search_mode: 'text' }).success).toBe(true);
      expect(enhancedSearchSchema.safeParse({ query: 'test', search_mode: 'hybrid' }).success).toBe(true);
      expect(enhancedSearchSchema.safeParse({ query: 'test', search_mode: 'invalid' }).success).toBe(false);
    });
  });

  describe('analyticsDateRangeSchema', () => {
    it('validates empty object with defaults', () => {
      const result = analyticsDateRangeSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.group_by).toBe('day');
      }
    });

    it('validates date range with group by', () => {
      const result = analyticsDateRangeSchema.safeParse({
        from: '2025-01-01',
        to: '2025-12-31',
        group_by: 'week'
      });
      expect(result.success).toBe(true);
    });

    it('validates all group_by options', () => {
      expect(analyticsDateRangeSchema.safeParse({ group_by: 'day' }).success).toBe(true);
      expect(analyticsDateRangeSchema.safeParse({ group_by: 'week' }).success).toBe(true);
      expect(analyticsDateRangeSchema.safeParse({ group_by: 'month' }).success).toBe(true);
      expect(analyticsDateRangeSchema.safeParse({ group_by: 'year' }).success).toBe(false);
    });
  });
});

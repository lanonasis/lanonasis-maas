/**
 * Tests for Memory Schemas
 */

import {
  MemoryType,
  MemoryEntrySchema,
  CreateMemoryRequestSchema,
  UpdateMemoryRequestSchema,
  SearchMemoryRequestSchema,
  ListMemoriesRequestSchema
} from '../src/types/memory-aligned';

describe('Memory Schemas', () => {
  describe('MemoryType', () => {
    it('should accept valid memory types', () => {
      const validTypes = ['context', 'project', 'knowledge', 'reference', 'personal', 'workflow'];
      validTypes.forEach(type => {
        const result = MemoryType.safeParse(type);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid memory types', () => {
      const result = MemoryType.safeParse('invalid');
      expect(result.success).toBe(false);
    });
  });

  describe('CreateMemoryRequestSchema', () => {
    it('should accept valid memory creation request', () => {
      const validRequest = {
        title: 'Test Memory',
        content: 'This is a test memory',
        type: 'context',
        tags: ['test', 'example']
      };

      const result = CreateMemoryRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe('Test Memory');
        expect(result.data.type).toBe('context');
        expect(result.data.tags).toEqual(['test', 'example']);
      }
    });

    it('should apply default values', () => {
      const minimalRequest = {
        title: 'Test',
        content: 'Content'
      };

      const result = CreateMemoryRequestSchema.safeParse(minimalRequest);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('context');
        expect(result.data.tags).toEqual([]);
      }
    });

    it('should reject empty title', () => {
      const invalidRequest = {
        title: '',
        content: 'Content'
      };

      const result = CreateMemoryRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should reject empty content', () => {
      const invalidRequest = {
        title: 'Title',
        content: ''
      };

      const result = CreateMemoryRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should reject title longer than 255 characters', () => {
      const invalidRequest = {
        title: 'x'.repeat(256),
        content: 'Content'
      };

      const result = CreateMemoryRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });
  });

  describe('SearchMemoryRequestSchema', () => {
    it('should accept valid search request', () => {
      const validRequest = {
        query: 'test search',
        type: 'context',
        tags: ['tag1'],
        limit: 20,
        threshold: 0.8
      };

      const result = SearchMemoryRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.query).toBe('test search');
        expect(result.data.limit).toBe(20);
        expect(result.data.threshold).toBe(0.8);
      }
    });

    it('should apply default values', () => {
      const minimalRequest = {
        query: 'test'
      };

      const result = SearchMemoryRequestSchema.safeParse(minimalRequest);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(10);
        expect(result.data.threshold).toBe(0.7);
      }
    });

    it('should reject empty query', () => {
      const invalidRequest = {
        query: ''
      };

      const result = SearchMemoryRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should reject limit out of range', () => {
      const invalidRequest1 = {
        query: 'test',
        limit: 0
      };
      const invalidRequest2 = {
        query: 'test',
        limit: 101
      };

      expect(SearchMemoryRequestSchema.safeParse(invalidRequest1).success).toBe(false);
      expect(SearchMemoryRequestSchema.safeParse(invalidRequest2).success).toBe(false);
    });

    it('should reject threshold out of range', () => {
      const invalidRequest1 = {
        query: 'test',
        threshold: -0.1
      };
      const invalidRequest2 = {
        query: 'test',
        threshold: 1.1
      };

      expect(SearchMemoryRequestSchema.safeParse(invalidRequest1).success).toBe(false);
      expect(SearchMemoryRequestSchema.safeParse(invalidRequest2).success).toBe(false);
    });
  });

  describe('ListMemoriesRequestSchema', () => {
    it('should accept valid list request', () => {
      const validRequest = {
        type: 'project',
        limit: 50,
        offset: 10,
        sortBy: 'createdAt',
        sortOrder: 'asc'
      };

      const result = ListMemoriesRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('project');
        expect(result.data.limit).toBe(50);
        expect(result.data.sortOrder).toBe('asc');
      }
    });

    it('should apply default values', () => {
      const result = ListMemoriesRequestSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(50);
        expect(result.data.offset).toBe(0);
        expect(result.data.sortBy).toBe('updatedAt');
        expect(result.data.sortOrder).toBe('desc');
      }
    });
  });
});

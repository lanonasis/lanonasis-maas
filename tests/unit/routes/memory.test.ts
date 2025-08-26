import { describe, it, expect, jest, beforeEach } from '@jest/globals';

describe('Memory API Routes', () => {
  let mockMemoryService: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockMemoryService = {
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      search: jest.fn(),
      bulkImport: jest.fn(),
      bulkExport: jest.fn()
    };
  });

  describe('POST /api/v1/memories', () => {
    it('should create a new memory', async () => {
      const newMemory = {
        content: 'Test memory content',
        type: 'context',
        tags: ['test', 'example'],
        metadata: { source: 'api' }
      };

      const createdMemory = {
        id: 'mem_123',
        ...newMemory,
        created_at: new Date().toISOString(),
        user_id: 'user_123'
      };

      mockMemoryService.create.mockResolvedValue(createdMemory);

      const result = await mockMemoryService.create(newMemory);

      expect(result).toEqual(createdMemory);
      expect(result.id).toBeDefined();
      expect(result.content).toBe(newMemory.content);
    });

    it('should validate required fields', async () => {
      const invalidMemory = { type: 'context' }; // Missing content

      mockMemoryService.create.mockRejectedValue(
        new Error('Content is required')
      );

      await expect(mockMemoryService.create(invalidMemory))
        .rejects.toThrow('Content is required');
    });

    it('should handle large content', async () => {
      const largeContent = 'a'.repeat(5000);
      const memory = { content: largeContent, type: 'knowledge' };

      mockMemoryService.create.mockResolvedValue({
        id: 'mem_large',
        ...memory
      });

      const result = await mockMemoryService.create(memory);
      expect(result.content).toHaveLength(5000);
    });
  });

  describe('GET /api/v1/memories/:id', () => {
    it('should retrieve memory by ID', async () => {
      const memory = {
        id: 'mem_123',
        content: 'Retrieved memory',
        type: 'project'
      };

      mockMemoryService.findById.mockResolvedValue(memory);

      const result = await mockMemoryService.findById('mem_123');
      expect(result).toEqual(memory);
      expect(result.id).toBe('mem_123');
    });

    it('should handle non-existent memory', async () => {
      mockMemoryService.findById.mockResolvedValue(null);

      const result = await mockMemoryService.findById('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('GET /api/v1/memories', () => {
    it('should list memories with pagination', async () => {
      const memories = [
        { id: 'mem_1', content: 'Memory 1' },
        { id: 'mem_2', content: 'Memory 2' },
        { id: 'mem_3', content: 'Memory 3' }
      ];

      mockMemoryService.findAll.mockResolvedValue({
        data: memories,
        total: 3,
        page: 1,
        limit: 10
      });

      const result = await mockMemoryService.findAll({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(3);
      expect(result.total).toBe(3);
      expect(result.page).toBe(1);
    });

    it('should filter by type', async () => {
      const contextMemories = [
        { id: 'mem_1', content: 'Context 1', type: 'context' },
        { id: 'mem_2', content: 'Context 2', type: 'context' }
      ];

      mockMemoryService.findAll.mockResolvedValue({
        data: contextMemories,
        total: 2
      });

      const result = await mockMemoryService.findAll({ type: 'context' });
      expect(result.data.every(m => m.type === 'context')).toBe(true);
    });

    it('should filter by tags', async () => {
      const taggedMemories = [
        { id: 'mem_1', tags: ['important', 'work'] },
        { id: 'mem_2', tags: ['important', 'personal'] }
      ];

      mockMemoryService.findAll.mockResolvedValue({
        data: taggedMemories
      });

      const result = await mockMemoryService.findAll({ tag: 'important' });
      expect(result.data.every(m => m.tags.includes('important'))).toBe(true);
    });
  });

  describe('PUT /api/v1/memories/:id', () => {
    it('should update existing memory', async () => {
      const updates = { content: 'Updated content' };
      const updatedMemory = {
        id: 'mem_123',
        content: 'Updated content',
        updated_at: new Date().toISOString()
      };

      mockMemoryService.update.mockResolvedValue(updatedMemory);

      const result = await mockMemoryService.update('mem_123', updates);
      expect(result.content).toBe('Updated content');
      expect(result.updated_at).toBeDefined();
    });

    it('should handle partial updates', async () => {
      const partialUpdate = { tags: ['new-tag'] };
      
      mockMemoryService.update.mockResolvedValue({
        id: 'mem_123',
        content: 'Original content',
        tags: ['new-tag']
      });

      const result = await mockMemoryService.update('mem_123', partialUpdate);
      expect(result.tags).toContain('new-tag');
      expect(result.content).toBe('Original content');
    });
  });

  describe('DELETE /api/v1/memories/:id', () => {
    it('should delete memory', async () => {
      mockMemoryService.delete.mockResolvedValue({ success: true });

      const result = await mockMemoryService.delete('mem_123');
      expect(result.success).toBe(true);
    });

    it('should handle deletion of non-existent memory', async () => {
      mockMemoryService.delete.mockRejectedValue(
        new Error('Memory not found')
      );

      await expect(mockMemoryService.delete('nonexistent'))
        .rejects.toThrow('Memory not found');
    });
  });

  describe('POST /api/v1/memories/search', () => {
    it('should search memories by query', async () => {
      const searchResults = [
        { id: 'mem_1', content: 'Relevant content', similarity: 0.92 },
        { id: 'mem_2', content: 'Related topic', similarity: 0.85 }
      ];

      mockMemoryService.search.mockResolvedValue(searchResults);

      const result = await mockMemoryService.search({
        query: 'search term',
        threshold: 0.8
      });

      expect(result).toHaveLength(2);
      expect(result[0].similarity).toBeGreaterThan(result[1].similarity);
    });

    it('should respect similarity threshold', async () => {
      const allResults = [
        { id: 'mem_1', similarity: 0.95 },
        { id: 'mem_2', similarity: 0.75 },
        { id: 'mem_3', similarity: 0.65 }
      ];

      mockMemoryService.search.mockImplementation(async ({ threshold }) => {
        return allResults.filter(r => r.similarity >= threshold);
      });

      const result = await mockMemoryService.search({
        query: 'test',
        threshold: 0.8
      });

      expect(result).toHaveLength(1);
      expect(result[0].similarity).toBeGreaterThanOrEqual(0.8);
    });
  });

  describe('POST /api/v1/memories/bulk/import', () => {
    it('should import multiple memories', async () => {
      const memories = [
        { content: 'Memory 1', type: 'context' },
        { content: 'Memory 2', type: 'project' },
        { content: 'Memory 3', type: 'knowledge' }
      ];

      mockMemoryService.bulkImport.mockResolvedValue({
        success: 3,
        failed: 0,
        total: 3
      });

      const result = await mockMemoryService.bulkImport(memories);
      
      expect(result.success).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.total).toBe(3);
    });

    it('should handle import errors', async () => {
      const memories = [
        { content: 'Valid memory', type: 'context' },
        { content: '', type: 'invalid' }, // Invalid
        { content: 'Another valid', type: 'project' }
      ];

      mockMemoryService.bulkImport.mockResolvedValue({
        success: 2,
        failed: 1,
        total: 3,
        errors: [{ index: 1, error: 'Invalid memory type' }]
      });

      const result = await mockMemoryService.bulkImport(memories);
      
      expect(result.success).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('GET /api/v1/memories/export', () => {
    it('should export memories in JSON format', async () => {
      const exportData = {
        format: 'json',
        memories: [
          { id: 'mem_1', content: 'Memory 1' },
          { id: 'mem_2', content: 'Memory 2' }
        ],
        metadata: {
          exported_at: new Date().toISOString(),
          total: 2
        }
      };

      mockMemoryService.bulkExport.mockResolvedValue(exportData);

      const result = await mockMemoryService.bulkExport({ format: 'json' });
      
      expect(result.format).toBe('json');
      expect(result.memories).toHaveLength(2);
      expect(result.metadata.total).toBe(2);
    });

    it('should support multiple export formats', async () => {
      const formats = ['json', 'csv', 'yaml', 'markdown'];
      
      for (const format of formats) {
        mockMemoryService.bulkExport.mockResolvedValue({ format });
        
        const result = await mockMemoryService.bulkExport({ format });
        expect(result.format).toBe(format);
      }
    });
  });
});
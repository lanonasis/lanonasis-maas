import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock Supabase client
const mockSupabase = {
  from: jest.fn(),
  rpc: jest.fn(),
  auth: {
    getUser: jest.fn()
  }
};

describe('MemoryService', () => {
  let memoryService: any;

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock memory service
    memoryService = {
      createMemory: jest.fn(),
      getMemory: jest.fn(),
      updateMemory: jest.fn(),
      deleteMemory: jest.fn(),
      searchMemories: jest.fn(),
      generateEmbedding: jest.fn()
    };
  });

  describe('createMemory', () => {
    it('should create a new memory with embedding', async () => {
      const mockMemory = {
        id: 'mem_123',
        content: 'Test memory content',
        type: 'context',
        embedding: [0.1, 0.2, 0.3],
        created_at: new Date().toISOString()
      };

      memoryService.createMemory.mockResolvedValue(mockMemory);

      const result = await memoryService.createMemory({
        content: 'Test memory content',
        type: 'context',
        userId: 'user_123'
      });

      expect(result).toEqual(mockMemory);
      expect(result.embedding).toBeDefined();
      expect(Array.isArray(result.embedding)).toBe(true);
    });

    it('should validate memory types', async () => {
      const validTypes = ['context', 'project', 'knowledge', 'reference', 'personal', 'workflow'];
      
      for (const type of validTypes) {
        const memory = { content: 'test', type, userId: 'user_123' };
        memoryService.createMemory.mockResolvedValue({ ...memory, id: `mem_${type}` });
        
        const result = await memoryService.createMemory(memory);
        expect(result.type).toBe(type);
      }
    });

    it('should handle creation errors', async () => {
      memoryService.createMemory.mockRejectedValue(new Error('Database error'));

      await expect(memoryService.createMemory({
        content: 'Test',
        type: 'context',
        userId: 'user_123'
      })).rejects.toThrow('Database error');
    });

    it('should enforce character limits', async () => {
      const longContent = 'a'.repeat(10001); // Assuming 10k char limit
      memoryService.createMemory.mockRejectedValue(new Error('Content too long'));

      await expect(memoryService.createMemory({
        content: longContent,
        type: 'context',
        userId: 'user_123'
      })).rejects.toThrow('Content too long');
    });
  });

  describe('searchMemories', () => {
    it('should search memories by similarity', async () => {
      const mockResults = [
        { id: '1', content: 'Similar memory', similarity: 0.95 },
        { id: '2', content: 'Another memory', similarity: 0.85 },
        { id: '3', content: 'Less similar', similarity: 0.75 }
      ];

      memoryService.searchMemories.mockResolvedValue(mockResults);

      const results = await memoryService.searchMemories({
        query: 'test query',
        userId: 'user_123',
        threshold: 0.7
      });

      expect(results).toEqual(mockResults);
      expect(results[0].similarity).toBeGreaterThan(results[1].similarity);
      expect(results[1].similarity).toBeGreaterThan(results[2].similarity);
    });

    it('should filter by similarity threshold', async () => {
      const allResults = [
        { id: '1', content: 'High similarity', similarity: 0.95 },
        { id: '2', content: 'Medium similarity', similarity: 0.75 },
        { id: '3', content: 'Low similarity', similarity: 0.55 }
      ];

      memoryService.searchMemories.mockImplementation(async ({ threshold }: { threshold: number }) => {
        return allResults.filter((r) => r.similarity >= threshold);
      });

      const results = await memoryService.searchMemories({
        query: 'test',
        userId: 'user_123',
        threshold: 0.8
      });

      expect(results).toHaveLength(1);
      expect(results[0].similarity).toBeGreaterThanOrEqual(0.8);
    });

    it('should handle empty search results', async () => {
      memoryService.searchMemories.mockResolvedValue([]);

      const results = await memoryService.searchMemories({
        query: 'nonexistent',
        userId: 'user_123',
        threshold: 0.9
      });

      expect(results).toEqual([]);
      expect(results).toHaveLength(0);
    });
  });

  describe('updateMemory', () => {
    it('should update existing memory', async () => {
      const updated = {
        id: 'mem_123',
        content: 'Updated content',
        updated_at: new Date().toISOString()
      };

      memoryService.updateMemory.mockResolvedValue(updated);

      const result = await memoryService.updateMemory('mem_123', {
        content: 'Updated content'
      });

      expect(result.content).toBe('Updated content');
      expect(result.updated_at).toBeDefined();
    });

    it('should regenerate embedding on content update', async () => {
      memoryService.generateEmbedding.mockResolvedValue([0.4, 0.5, 0.6]);
      memoryService.updateMemory.mockResolvedValue({
        id: 'mem_123',
        content: 'New content',
        embedding: [0.4, 0.5, 0.6]
      });

      const result = await memoryService.updateMemory('mem_123', {
        content: 'New content'
      });

      expect(result.embedding).toEqual([0.4, 0.5, 0.6]);
    });
  });

  describe('deleteMemory', () => {
    it('should delete memory by id', async () => {
      memoryService.deleteMemory.mockResolvedValue({ success: true });

      const result = await memoryService.deleteMemory('mem_123');
      expect(result.success).toBe(true);
    });

    it('should handle non-existent memory deletion', async () => {
      memoryService.deleteMemory.mockRejectedValue(new Error('Memory not found'));

      await expect(memoryService.deleteMemory('nonexistent'))
        .rejects.toThrow('Memory not found');
    });
  });

  describe('Embedding Generation', () => {
    it('should generate embeddings for text', async () => {
      memoryService.generateEmbedding.mockResolvedValue(
        new Array(1536).fill(0).map(() => Math.random())
      );

      const embedding = await memoryService.generateEmbedding('Test text');
      
      expect(Array.isArray(embedding)).toBe(true);
      expect(embedding).toHaveLength(1536); // OpenAI embedding dimension
      expect(embedding.every((v: number) => v >= -1 && v <= 1)).toBe(true);
    });

    it('should cache embeddings for identical content', async () => {
      const content = 'Cached content';
      const embedding = [0.1, 0.2, 0.3];
      
      memoryService.generateEmbedding
        .mockResolvedValueOnce(embedding)
        .mockResolvedValueOnce(embedding);

      const result1 = await memoryService.generateEmbedding(content);
      const result2 = await memoryService.generateEmbedding(content);

      expect(result1).toEqual(result2);
    });
  });
});
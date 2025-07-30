import { MemoryService } from '@/services/memoryService';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// Mock the dependencies
jest.mock('@supabase/supabase-js');
jest.mock('openai');

describe('MemoryService', () => {
  let memoryService: MemoryService;
  let mockSupabase: any;
  let mockOpenAI: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup Supabase mock
    mockSupabase = {
      from: jest.fn(() => ({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn(),
        range: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        overlaps: jest.fn().mockReturnThis()
      })),
      rpc: jest.fn()
    };

    (createClient as jest.Mock).mockReturnValue(mockSupabase);

    // Setup OpenAI mock
    mockOpenAI = {
      embeddings: {
        create: jest.fn().mockResolvedValue({
          data: [{
            embedding: new Array(1536).fill(0).map(() => Math.random())
          }]
        })
      }
    };

    (OpenAI as jest.Mock).mockImplementation(() => mockOpenAI);

    memoryService = new MemoryService();
  });

  describe('createMemory', () => {
    it('should create a memory entry successfully', async () => {
      const mockMemoryData = {
        id: 'test-id',
        title: 'Test Memory',
        content: 'Test content',
        memory_type: 'context' as const,
        tags: ['test'],
        user_id: 'user-id',
        organization_id: 'org-id'
      };

      const expectedResult = {
        ...mockMemoryData,
        created_at: expect.any(String),
        updated_at: expect.any(String),
        access_count: 0
      };

      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: expectedResult,
        error: null
      });

      const result = await memoryService.createMemory('test-id', mockMemoryData);

      expect(mockOpenAI.embeddings.create).toHaveBeenCalledWith({
        model: 'text-embedding-ada-002',
        input: 'Test content'
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('memory_entries');
      expect(result).toEqual(expectedResult);
    });

    it('should handle OpenAI API errors', async () => {
      const mockMemoryData = {
        id: 'test-id',
        title: 'Test Memory',
        content: 'Test content',
        memory_type: 'context' as const,
        tags: ['test'],
        user_id: 'user-id',
        organization_id: 'org-id'
      };

      mockOpenAI.embeddings.create.mockRejectedValue(new Error('OpenAI API error'));

      await expect(memoryService.createMemory('test-id', mockMemoryData))
        .rejects.toThrow('Failed to create text embedding');
    });

    it('should handle database errors', async () => {
      const mockMemoryData = {
        id: 'test-id',
        title: 'Test Memory',
        content: 'Test content',
        memory_type: 'context' as const,
        tags: ['test'],
        user_id: 'user-id',
        organization_id: 'org-id'
      };

      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      });

      await expect(memoryService.createMemory('test-id', mockMemoryData))
        .rejects.toThrow('Failed to create memory entry');
    });
  });

  describe('getMemoryById', () => {
    it('should retrieve a memory by ID', async () => {
      const mockMemory = {
        id: 'test-id',
        title: 'Test Memory',
        content: 'Test content',
        memory_type: 'context',
        user_id: 'user-id',
        organization_id: 'org-id'
      };

      mockSupabase.from().select().eq().eq().single.mockResolvedValue({
        data: mockMemory,
        error: null
      });

      const result = await memoryService.getMemoryById('test-id', 'org-id');

      expect(mockSupabase.from).toHaveBeenCalledWith('memory_entries');
      expect(result).toEqual(mockMemory);
    });

    it('should return null when memory is not found', async () => {
      mockSupabase.from().select().eq().eq().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }
      });

      const result = await memoryService.getMemoryById('non-existent', 'org-id');

      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      mockSupabase.from().select().eq().eq().single.mockResolvedValue({
        data: null,
        error: { code: 'OTHER_ERROR', message: 'Database error' }
      });

      await expect(memoryService.getMemoryById('test-id', 'org-id'))
        .rejects.toThrow('Failed to retrieve memory');
    });
  });

  describe('searchMemories', () => {
    it('should perform vector search successfully', async () => {
      const mockResults = [
        {
          id: 'memory-1',
          title: 'Test Memory 1',
          content: 'Test content 1',
          relevance_score: 0.95
        },
        {
          id: 'memory-2',
          title: 'Test Memory 2',
          content: 'Test content 2',
          relevance_score: 0.85
        }
      ];

      mockSupabase.rpc.mockResolvedValue({
        data: mockResults,
        error: null
      });

      const result = await memoryService.searchMemories(
        'test query',
        'org-id',
        { limit: 10, threshold: 0.7 }
      );

      expect(mockOpenAI.embeddings.create).toHaveBeenCalledWith({
        model: 'text-embedding-ada-002',
        input: 'test query'
      });

      expect(mockSupabase.rpc).toHaveBeenCalledWith('match_memories', {
        query_embedding: expect.any(String),
        match_threshold: 0.7,
        match_count: 10,
        organization_id_param: 'org-id',
        memory_types_param: null,
        tags_param: null,
        topic_id_param: null,
        user_id_param: null
      });

      expect(result).toEqual(mockResults);
    });

    it('should handle search errors', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Search error' }
      });

      await expect(memoryService.searchMemories('test query', 'org-id'))
        .rejects.toThrow('Failed to search memories');
    });
  });

  describe('updateMemory', () => {
    it('should update memory successfully', async () => {
      const updateData = {
        title: 'Updated Title',
        content: 'Updated content'
      };

      const updatedMemory = {
        id: 'test-id',
        title: 'Updated Title',
        content: 'Updated content',
        memory_type: 'context'
      };

      mockSupabase.from().update().eq().select().single.mockResolvedValue({
        data: updatedMemory,
        error: null
      });

      const result = await memoryService.updateMemory('test-id', updateData);

      expect(mockOpenAI.embeddings.create).toHaveBeenCalledWith({
        model: 'text-embedding-ada-002',
        input: 'Updated content'
      });

      expect(result).toEqual(updatedMemory);
    });

    it('should update without creating new embedding if content unchanged', async () => {
      const updateData = {
        title: 'Updated Title'
      };

      const updatedMemory = {
        id: 'test-id',
        title: 'Updated Title',
        content: 'Original content',
        memory_type: 'context'
      };

      mockSupabase.from().update().eq().select().single.mockResolvedValue({
        data: updatedMemory,
        error: null
      });

      await memoryService.updateMemory('test-id', updateData);

      expect(mockOpenAI.embeddings.create).not.toHaveBeenCalled();
    });
  });

  describe('deleteMemory', () => {
    it('should delete memory successfully', async () => {
      mockSupabase.from().delete().eq.mockResolvedValue({
        error: null
      });

      await expect(memoryService.deleteMemory('test-id'))
        .resolves.not.toThrow();

      expect(mockSupabase.from).toHaveBeenCalledWith('memory_entries');
    });

    it('should handle delete errors', async () => {
      mockSupabase.from().delete().eq.mockResolvedValue({
        error: { message: 'Delete error' }
      });

      await expect(memoryService.deleteMemory('test-id'))
        .rejects.toThrow('Failed to delete memory entry');
    });
  });

  describe('getMemoryCount', () => {
    it('should return memory count', async () => {
      mockSupabase.from().select.mockResolvedValue({
        count: 42,
        error: null
      });

      const count = await memoryService.getMemoryCount('org-id');

      expect(count).toBe(42);
      expect(mockSupabase.from).toHaveBeenCalledWith('memory_entries');
    });

    it('should handle count errors', async () => {
      mockSupabase.from().select.mockResolvedValue({
        count: null,
        error: { message: 'Count error' }
      });

      await expect(memoryService.getMemoryCount('org-id'))
        .rejects.toThrow('Failed to get memory count');
    });
  });
});
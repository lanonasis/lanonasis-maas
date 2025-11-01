import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '@/lib/api-client';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getMemories', () => {
    it('should fetch memories with default parameters', async () => {
      const mockResponse = {
        data: [
          {
            id: '1',
            title: 'Test Memory',
            content: 'Test content',
            type: 'context',
            tags: ['test'],
            created_at: '2023-01-01T00:00:00Z'
          }
        ],
        pagination: {
          page: 1,
          limit: 50,
          total: 1,
          total_pages: 1
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await apiClient.getMemories();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.lanonasis.com/api/v1/maas/memories',
        expect.objectContaining({
          credentials: 'include',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'x-project-scope': 'maas'
          })
        })
      );

      expect(result).toEqual(mockResponse);
    });

    it('should handle query parameters correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [] })
      });

      await apiClient.getMemories({
        page: 2,
        limit: 10,
        type: 'project',
        tags: ['important', 'work'],
        search: 'test query'
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.lanonasis.com/api/v1/maas/memories?page=2&limit=10&type=project&tags=important%2Cwork&search=test+query',
        expect.any(Object)
      );
    });

    it('should handle API errors', async () => {
      const errorResponse = {
        error: 'Unauthorized',
        code: 'AUTH_REQUIRED'
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve(errorResponse)
      });

      await expect(apiClient.getMemories()).rejects.toThrow('Unauthorized');
    });
  });

  describe('createMemory', () => {
    it('should create a new memory', async () => {
      const newMemory = {
        title: 'New Memory',
        content: 'New content',
        type: 'project' as const,
        tags: ['new']
      };

      const mockResponse = {
        data: {
          id: '2',
          ...newMemory,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await apiClient.createMemory(newMemory);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.lanonasis.com/api/v1/maas/memories',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(newMemory),
          credentials: 'include',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'x-project-scope': 'maas'
          })
        })
      );

      expect(result).toEqual(mockResponse);
    });
  });

  describe('searchMemories', () => {
    it('should perform semantic search', async () => {
      const searchQuery = {
        query: 'test search',
        limit: 5,
        similarity_threshold: 0.8
      };

      const mockResponse = {
        data: [
          {
            id: '1',
            title: 'Matching Memory',
            content: 'Content with test search terms',
            similarity: 0.9
          }
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await apiClient.searchMemories(searchQuery);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.lanonasis.com/api/v1/maas/memories/search',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(searchQuery)
        })
      );

      expect(result).toEqual(mockResponse);
    });
  });

  describe('getApiKeys', () => {
    it('should fetch API keys', async () => {
      const mockResponse = {
        data: [
          {
            id: '1',
            name: 'Test Key',
            key_preview: 'pk_test_***',
            permissions: ['memory:read'],
            is_active: true,
            created_at: '2023-01-01T00:00:00Z'
          }
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await apiClient.getApiKeys();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.lanonasis.com/api/v1/maas/api-keys',
        expect.objectContaining({
          credentials: 'include',
          headers: expect.objectContaining({
            'x-project-scope': 'maas'
          })
        })
      );

      expect(result).toEqual(mockResponse);
    });
  });

  describe('createApiKey', () => {
    it('should create a new API key', async () => {
      const keyData = {
        name: 'Test Key',
        permissions: ['memory:read', 'memory:write'],
        expires_at: '2024-01-01T00:00:00Z'
      };

      const mockResponse = {
        data: {
          id: '1',
          ...keyData,
          secret: 'sk_test_secret123',
          key_preview: 'pk_test_***'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await apiClient.createApiKey(keyData);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.lanonasis.com/api/v1/maas/api-keys',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(keyData)
        })
      );

      expect(result).toEqual(mockResponse);
    });
  });

  describe('healthCheck', () => {
    it('should check service health', async () => {
      const mockResponse = {
        data: {
          status: 'ok',
          service: 'Onasis-CORE MaaS API',
          version: '1.0.0',
          timestamp: '2023-01-01T00:00:00Z',
          capabilities: ['memory_management', 'semantic_search']
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await apiClient.healthCheck();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.lanonasis.com/api/v1/maas/health',
        expect.any(Object)
      );

      expect(result).toEqual(mockResponse);
    });
  });
});
import request from 'supertest';
import { app } from '@/server';

describe('Memory Integration Tests', () => {
  let authToken: string;
  let userId: string;
  let organizationId: string;

  const testUser = {
    email: 'memory-test@example.com',
    password: 'testpassword123',
    organization_name: 'Memory Test Organization'
  };

  beforeAll(async () => {
    // Register and login to get authentication token
    const registerResponse = await request(app)
      .post('/api/v1/auth/register')
      .send(testUser);

    authToken = registerResponse.body.token;
    userId = registerResponse.body.user.id;
    organizationId = registerResponse.body.user.organization_id;
  });

  describe('POST /api/v1/memory', () => {
    it('should create a memory entry successfully', async () => {
      const memoryData = {
        title: 'Test Memory',
        content: 'This is a test memory content',
        memory_type: 'context',
        tags: ['test', 'integration']
      };

      const response = await request(app)
        .post('/api/v1/memory')
        .set('Authorization', `Bearer ${authToken}`)
        .send(memoryData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe(memoryData.title);
      expect(response.body.content).toBe(memoryData.content);
      expect(response.body.memory_type).toBe(memoryData.memory_type);
      expect(response.body.tags).toEqual(memoryData.tags);
      expect(response.body.user_id).toBe(userId);
      expect(response.body.organization_id).toBe(organizationId);
    });

    it('should reject memory creation with invalid data', async () => {
      const invalidMemoryData = {
        // Missing required title
        content: 'Test content',
        memory_type: 'context'
      };

      const response = await request(app)
        .post('/api/v1/memory')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidMemoryData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject memory creation without authentication', async () => {
      const memoryData = {
        title: 'Test Memory',
        content: 'This is a test memory content'
      };

      const response = await request(app)
        .post('/api/v1/memory')
        .send(memoryData)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle large content', async () => {
      const largeContent = 'A'.repeat(10000); // 10KB content
      const memoryData = {
        title: 'Large Memory',
        content: largeContent,
        memory_type: 'knowledge'
      };

      const response = await request(app)
        .post('/api/v1/memory')
        .set('Authorization', `Bearer ${authToken}`)
        .send(memoryData)
        .expect(201);

      expect(response.body.content).toBe(largeContent);
    });
  });

  describe('GET /api/v1/memory', () => {
    let createdMemoryId: string;

    beforeAll(async () => {
      // Create a test memory
      const response = await request(app)
        .post('/api/v1/memory')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'List Test Memory',
          content: 'Content for list test',
          memory_type: 'project',
          tags: ['list', 'test']
        });

      createdMemoryId = response.body.id;
    });

    it('should list memories with pagination', async () => {
      const response = await request(app)
        .get('/api/v1/memory')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body).toHaveProperty('memories');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.memories)).toBe(true);
      expect(response.body.pagination).toHaveProperty('page');
      expect(response.body.pagination).toHaveProperty('limit');
      expect(response.body.pagination).toHaveProperty('total');
    });

    it('should filter memories by type', async () => {
      const response = await request(app)
        .get('/api/v1/memory')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ memory_type: 'project' })
        .expect(200);

      expect(response.body.memories.every((m: any) => m.memory_type === 'project')).toBe(true);
    });

    it('should filter memories by tags', async () => {
      const response = await request(app)
        .get('/api/v1/memory')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ tags: 'test' })
        .expect(200);

      expect(response.body.memories.every((m: any) => m.tags.includes('test'))).toBe(true);
    });

    it('should sort memories', async () => {
      const response = await request(app)
        .get('/api/v1/memory')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ sort: 'title', order: 'asc' })
        .expect(200);

      const titles = response.body.memories.map((m: any) => m.title);
      const sortedTitles = [...titles].sort();
      expect(titles).toEqual(sortedTitles);
    });
  });

  describe('GET /api/v1/memory/:id', () => {
    let createdMemoryId: string;

    beforeAll(async () => {
      const response = await request(app)
        .post('/api/v1/memory')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Get Test Memory',
          content: 'Content for get test',
          memory_type: 'reference'
        });

      createdMemoryId = response.body.id;
    });

    it('should retrieve a specific memory', async () => {
      const response = await request(app)
        .get(`/api/v1/memory/${createdMemoryId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.id).toBe(createdMemoryId);
      expect(response.body.title).toBe('Get Test Memory');
      expect(response.body.content).toBe('Content for get test');
    });

    it('should return 404 for non-existent memory', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      
      const response = await request(app)
        .get(`/api/v1/memory/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    it('should track access count', async () => {
      // Get the memory multiple times
      await request(app)
        .get(`/api/v1/memory/${createdMemoryId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      await request(app)
        .get(`/api/v1/memory/${createdMemoryId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const response = await request(app)
        .get(`/api/v1/memory/${createdMemoryId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.access_count).toBeGreaterThan(0);
    });
  });

  describe('POST /api/v1/memory/search', () => {
    beforeAll(async () => {
      // Create some test memories for search
      const testMemories = [
        {
          title: 'JavaScript Basics',
          content: 'JavaScript is a programming language used for web development',
          memory_type: 'knowledge',
          tags: ['javascript', 'programming']
        },
        {
          title: 'React Components',
          content: 'React components are reusable pieces of UI in React applications',
          memory_type: 'knowledge',
          tags: ['react', 'javascript', 'frontend']
        },
        {
          title: 'Database Design',
          content: 'Database design involves creating schemas and relationships between tables',
          memory_type: 'knowledge',
          tags: ['database', 'design']
        }
      ];

      for (const memory of testMemories) {
        await request(app)
          .post('/api/v1/memory')
          .set('Authorization', `Bearer ${authToken}`)
          .send(memory);
      }
    });

    it('should perform semantic search', async () => {
      const searchData = {
        query: 'programming languages and web development',
        limit: 10,
        threshold: 0.1 // Lower threshold for testing
      };

      const response = await request(app)
        .post('/api/v1/memory/search')
        .set('Authorization', `Bearer ${authToken}`)
        .send(searchData)
        .expect(200);

      expect(response.body).toHaveProperty('results');
      expect(response.body).toHaveProperty('query');
      expect(response.body).toHaveProperty('total_results');
      expect(response.body).toHaveProperty('search_time_ms');
      expect(Array.isArray(response.body.results)).toBe(true);

      // Check that results have relevance scores
      response.body.results.forEach((result: any) => {
        expect(result).toHaveProperty('relevance_score');
        expect(typeof result.relevance_score).toBe('number');
      });
    });

    it('should filter search by memory type', async () => {
      const searchData = {
        query: 'programming',
        memory_types: ['knowledge'],
        threshold: 0.1
      };

      const response = await request(app)
        .post('/api/v1/memory/search')
        .set('Authorization', `Bearer ${authToken}`)
        .send(searchData)
        .expect(200);

      response.body.results.forEach((result: any) => {
        expect(result.memory_type).toBe('knowledge');
      });
    });

    it('should filter search by tags', async () => {
      const searchData = {
        query: 'programming',
        tags: ['javascript'],
        threshold: 0.1
      };

      const response = await request(app)
        .post('/api/v1/memory/search')
        .set('Authorization', `Bearer ${authToken}`)
        .send(searchData)
        .expect(200);

      response.body.results.forEach((result: any) => {
        expect(result.tags).toContain('javascript');
      });
    });

    it('should respect similarity threshold', async () => {
      const searchData = {
        query: 'completely unrelated topic about cooking recipes',
        threshold: 0.9 // Very high threshold
      };

      const response = await request(app)
        .post('/api/v1/memory/search')
        .set('Authorization', `Bearer ${authToken}`)
        .send(searchData)
        .expect(200);

      // Should return few or no results with high threshold
      expect(response.body.results.length).toBeLessThanOrEqual(1);
    });
  });

  describe('PUT /api/v1/memory/:id', () => {
    let createdMemoryId: string;

    beforeAll(async () => {
      const response = await request(app)
        .post('/api/v1/memory')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Update Test Memory',
          content: 'Original content',
          memory_type: 'context'
        });

      createdMemoryId = response.body.id;
    });

    it('should update memory successfully', async () => {
      const updateData = {
        title: 'Updated Memory Title',
        content: 'Updated content',
        memory_type: 'project',
        tags: ['updated', 'test']
      };

      const response = await request(app)
        .put(`/api/v1/memory/${createdMemoryId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.title).toBe(updateData.title);
      expect(response.body.content).toBe(updateData.content);
      expect(response.body.memory_type).toBe(updateData.memory_type);
      expect(response.body.tags).toEqual(updateData.tags);
    });

    it('should allow partial updates', async () => {
      const updateData = {
        title: 'Partially Updated Title'
      };

      const response = await request(app)
        .put(`/api/v1/memory/${createdMemoryId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.title).toBe(updateData.title);
      // Other fields should remain unchanged
      expect(response.body.content).toBe('Updated content');
    });

    it('should return 404 for non-existent memory', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      
      const response = await request(app)
        .put(`/api/v1/memory/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'New Title' })
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /api/v1/memory/:id', () => {
    let createdMemoryId: string;

    beforeAll(async () => {
      const response = await request(app)
        .post('/api/v1/memory')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Delete Test Memory',
          content: 'This memory will be deleted',
          memory_type: 'context'
        });

      createdMemoryId = response.body.id;
    });

    it('should delete memory successfully', async () => {
      await request(app)
        .delete(`/api/v1/memory/${createdMemoryId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);

      // Verify memory is deleted
      await request(app)
        .get(`/api/v1/memory/${createdMemoryId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should return 404 for non-existent memory', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      
      const response = await request(app)
        .delete(`/api/v1/memory/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });
});
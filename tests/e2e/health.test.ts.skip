import request from 'supertest';
import { app } from '@/server';

describe('Health Check E2E Tests', () => {
  describe('GET /api/v1/health', () => {
    it('should return service health status', async () => {
      const response = await request(app)
        .get('/api/v1/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('dependencies');

      expect(response.body.status).toMatch(/healthy|degraded/);
      expect(typeof response.body.uptime).toBe('number');
      expect(response.body.dependencies).toHaveProperty('database');
      expect(response.body.dependencies).toHaveProperty('openai');
    });

    it('should include dependency health information', async () => {
      const response = await request(app)
        .get('/api/v1/health')
        .expect(200);

      const { database, openai } = response.body.dependencies;

      expect(database).toHaveProperty('status');
      expect(database).toHaveProperty('response_time');
      expect(typeof database.response_time).toBe('number');

      expect(openai).toHaveProperty('status');
      expect(openai).toHaveProperty('response_time');
      expect(typeof openai.response_time).toBe('number');
    });
  });

  describe('GET /api/v1/health/ready', () => {
    it('should return readiness status', async () => {
      const response = await request(app)
        .get('/api/v1/health/ready')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(['ready', 'not_ready']).toContain(response.body.status);
    });
  });

  describe('GET /api/v1/health/live', () => {
    it('should return liveness status', async () => {
      const response = await request(app)
        .get('/api/v1/health/live')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body.status).toBe('alive');
      expect(typeof response.body.uptime).toBe('number');
    });
  });

  describe('Health Check Performance', () => {
    it('should respond to health checks quickly', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/api/v1/health/live')
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
    });

    it('should handle multiple concurrent health checks', async () => {
      const promises = Array(10).fill(null).map(() => 
        request(app).get('/api/v1/health/live').expect(200)
      );

      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.body.status).toBe('alive');
      });
    });
  });
});
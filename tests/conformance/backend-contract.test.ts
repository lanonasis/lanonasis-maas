import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApiClient, type ApiClientInstance } from '../utils/test-api-client';

let apiClient: ApiClientInstance;
let closeClient: () => Promise<void> | void;

const validProjectScope = 'lanonasis-maas';
const testApiKey = process.env.TEST_API_KEY || 'test_api_key_123';
const testJwtToken = process.env.TEST_JWT_TOKEN || 'test_jwt_token_456';

describe('Backend Contract Coverage', () => {
  beforeAll(async () => {
    const { client, close } = await createTestApiClient({
      validApiKey: testApiKey,
      validJwt: testJwtToken,
      validProjectScope,
    });

    apiClient = client;
    closeClient = close;
  });

  afterAll(async () => {
    if (closeClient) {
      await closeClient();
    }
  });

  describe('Health & Readiness', () => {
    it('returns overall health with dependency details', async () => {
      const response = await apiClient.get('/api/v1/health').expect(200);

      expect(response.body.status).toBe('healthy');
      expect(response.body.dependencies.database.status).toBe('healthy');
      expect(response.body.dependencies.openai.status).toBe('healthy');
    });

    it('returns readiness details', async () => {
      const response = await apiClient.get('/api/v1/health/ready').expect(200);

      expect(response.body.status).toBe('ready');
      expect(response.body.dependencies.database).toBe('reachable');
    });

    it('returns liveness details', async () => {
      const response = await apiClient.get('/api/v1/health/live').expect(200);

      expect(response.body.status).toBe('alive');
      expect(response.body.uptime).toBeTypeOf('number');
    });
  });

  describe('Service Registry', () => {
    it('lists registered services without authentication', async () => {
      const response = await apiClient.get('/api/v1/services').expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.data.map((service: { id: string }) => service.id)).toContain('memory');
    });

    it('returns aggregated service health', async () => {
      const response = await apiClient.get('/api/v1/services/health').expect(200);

      expect(response.body.status).toBe('healthy');
      expect(response.body.services.memory).toBe('healthy');
    });

    it('returns auth connectivity status', async () => {
      const response = await apiClient.get('/api/v1/services/auth/test').expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.provider).toBe('mock-auth');
    });

    it('returns MCP connectivity status', async () => {
      const response = await apiClient.get('/api/v1/services/mcp/test').expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.transport).toBe('sse');
    });

    it('requires authentication for sync', async () => {
      await apiClient
        .post('/api/v1/services/sync')
        .set('X-Project-Scope', validProjectScope)
        .expect(401);
    });

    it('allows sync with valid project-scoped auth', async () => {
      const response = await apiClient
        .post('/api/v1/services/sync')
        .set('Authorization', `Bearer ${testJwtToken}`)
        .set('X-Project-Scope', validProjectScope)
        .expect(200);

      expect(response.body.status).toBe('synced');
      expect(response.body.actor).toBe('jwt');
    });
  });

  describe('Metrics', () => {
    it('requires authentication for Prometheus metrics', async () => {
      await apiClient.get('/api/v1/metrics').expect(401);
    });

    it('returns Prometheus text for authorized users', async () => {
      const response = await apiClient
        .get('/api/v1/metrics')
        .set('Authorization', `Bearer ${testJwtToken}`)
        .expect(200);

      expect(response.text).toContain('memory_requests_total');
      expect(response.headers['content-type']).toMatch(/text\/plain/);
    });

    it('forbids JSON metrics for plans without access', async () => {
      await apiClient
        .get('/api/v1/metrics/json')
        .set('Authorization', `Bearer ${testJwtToken}`)
        .expect(403);
    });

    it('returns JSON metrics for pro-plan access', async () => {
      const response = await apiClient
        .get('/api/v1/metrics/json')
        .set('Authorization', `Bearer ${testJwtToken}`)
        .set('X-Plan', 'pro')
        .expect(200);

      expect(response.body.metrics.memory_requests_total).toBe(42);
      expect(response.body.metrics.active_sessions).toBe(2);
    });
  });

  describe('Alias Parity', () => {
    it('keeps /memory accessible with the same auth contract as /memories', async () => {
      const response = await apiClient
        .get('/api/v1/memory')
        .set('X-API-Key', testApiKey)
        .set('X-Project-Scope', validProjectScope)
        .expect(200);

      expect(response.body.meta.alias).toBe('memory');
      expect(response.body.meta.request_id).toBeDefined();
    });
  });
});

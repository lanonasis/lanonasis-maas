import { describe, it, expect } from '@jest/globals';
import request from 'supertest';

const API_BASE = process.env.TEST_API_BASE || 'http://localhost:3000';

describe('Authentication Header Semantics Conformance', () => {
  const testApiKey = process.env.TEST_API_KEY || 'test_api_key_123';
  const testJwtToken = process.env.TEST_JWT_TOKEN || 'test_jwt_token_456';
  const validProjectScope = 'lanonasis-maas';

  describe('X-API-Key Authentication', () => {
    it('should accept valid X-API-Key header', async () => {
      const response = await request(API_BASE)
        .get('/api/v1/memories')
        .set('X-API-Key', testApiKey)
        .set('X-Project-Scope', validProjectScope);
      
      // Should not be 401 (authentication error)
      expect(response.status).not.toBe(401);
    });

    it('should reject missing X-API-Key for protected routes', async () => {
      const response = await request(API_BASE)
        .get('/api/v1/memories')
        .set('X-Project-Scope', validProjectScope)
        .expect(401);
      
      expect(response.body.error.code).toMatch(/AUTH|MISSING/i);
    });

    it('should reject invalid X-API-Key', async () => {
      const response = await request(API_BASE)
        .get('/api/v1/memories')
        .set('X-API-Key', 'invalid_key_123')
        .set('X-Project-Scope', validProjectScope)
        .expect(401);
      
      expect(response.body.error.code).toMatch(/INVALID|API_KEY/i);
    });

    it('should NOT accept API key in Authorization header', async () => {
      const response = await request(API_BASE)
        .get('/api/v1/memories')
        .set('Authorization', `Bearer ${testApiKey}`)
        .set('X-Project-Scope', validProjectScope)
        .expect(401);
      
      // Should fail because API key is in wrong header
      expect(response.body.error.message).toMatch(/authentication|API.*key/i);
    });

    it('should include X-Request-ID in API key response', async () => {
      const response = await request(API_BASE)
        .get('/api/v1/memories')
        .set('X-API-Key', testApiKey)
        .set('X-Project-Scope', validProjectScope);
      
      expect(response.headers['x-request-id']).toBeDefined();
      expect(response.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    });
  });

  describe('JWT Authentication', () => {
    it('should accept valid JWT in Authorization Bearer header', async () => {
      const response = await request(API_BASE)
        .get('/api/v1/memories')
        .set('Authorization', `Bearer ${testJwtToken}`)
        .set('X-Project-Scope', validProjectScope);
      
      // Should not be 401 (authentication error)  
      expect(response.status).not.toBe(401);
    });

    it('should reject malformed Authorization header', async () => {
      const testCases = [
        'Bearer',                    // Missing token
        testJwtToken,               // Missing Bearer prefix  
        `Basic ${testJwtToken}`,    // Wrong auth type
        `Bearer `,                  // Empty token
        `Bearer ${testJwtToken} extra` // Extra content
      ];

      for (const authHeader of testCases) {
        const response = await request(API_BASE)
          .get('/api/v1/memories')
          .set('Authorization', authHeader)
          .set('X-Project-Scope', validProjectScope)
          .expect(401);
        
        expect(response.body.error).toBeDefined();
      }
    });

    it('should reject expired JWT tokens', async () => {
      const expiredToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImp0aSI6IjEyMzQ1Njc4LTkwMWEtNGJjZC1iNGY0LTEyMzQ1Njc4OTBhYiIsImlhdCI6MTYwOTQ1OTIwMCwiZXhwIjoxNjA5NDU5MjYwfQ.invalid';
      
      const response = await request(API_BASE)
        .get('/api/v1/memories')
        .set('Authorization', `Bearer ${expiredToken}`)
        .set('X-Project-Scope', validProjectScope)
        .expect(401);
      
      expect(response.body.error.code).toMatch(/EXPIRED|INVALID|JWT/i);
    });

    it('should include X-Request-ID in JWT response', async () => {
      const response = await request(API_BASE)
        .get('/api/v1/memories')
        .set('Authorization', `Bearer ${testJwtToken}`)
        .set('X-Project-Scope', validProjectScope);
      
      expect(response.headers['x-request-id']).toBeDefined();
    });
  });

  describe('X-Project-Scope Header', () => {
    it('should require X-Project-Scope for all authenticated requests', async () => {
      const response = await request(API_BASE)
        .get('/api/v1/memories')
        .set('X-API-Key', testApiKey)
        // Intentionally omit X-Project-Scope
        .expect(401);
      
      expect(response.body.error.code).toMatch(/PROJECT.*SCOPE|MISSING/i);
    });

    it('should reject invalid project scope', async () => {
      const invalidScopes = [
        'wrong-project',
        'lanonasis-core',
        'malicious-project',
        ''
      ];

      for (const scope of invalidScopes) {
        const response = await request(API_BASE)
          .get('/api/v1/memories')
          .set('X-API-Key', testApiKey)
          .set('X-Project-Scope', scope)
          .expect(403);
        
        expect(response.body.error.code).toMatch(/INVALID.*PROJECT.*SCOPE/i);
      }
    });

    it('should accept valid project scope', async () => {
      const response = await request(API_BASE)
        .get('/api/v1/memories')
        .set('X-API-Key', testApiKey)
        .set('X-Project-Scope', validProjectScope);
      
      expect(response.status).not.toBe(403);
    });
  });

  describe('Mixed Authentication Scenarios', () => {
    it('should prefer X-API-Key over Authorization when both provided', async () => {
      const response = await request(API_BASE)
        .get('/api/v1/memories')
        .set('X-API-Key', testApiKey)
        .set('Authorization', `Bearer ${testJwtToken}`)
        .set('X-Project-Scope', validProjectScope);
      
      // Should succeed using API key (precedence)
      expect(response.status).not.toBe(401);
      
      // Response might indicate which auth method was used
      if (response.body.meta?.auth_method) {
        expect(response.body.meta.auth_method).toBe('api_key');
      }
    });

    it('should handle case-insensitive header names', async () => {
      const response = await request(API_BASE)
        .get('/api/v1/memories')
        .set('x-api-key', testApiKey)           // lowercase
        .set('x-project-scope', validProjectScope); // lowercase
      
      expect(response.status).not.toBe(401);
    });

    it('should handle additional whitespace in headers', async () => {
      const response = await request(API_BASE)
        .get('/api/v1/memories')
        .set('X-API-Key', `  ${testApiKey}  `)
        .set('X-Project-Scope', validProjectScope);
      
      expect(response.status).not.toBe(401);
    });
  });

  describe('Rate Limiting Headers', () => {
    it('should include rate limit headers for authenticated requests', async () => {
      const response = await request(API_BASE)
        .get('/api/v1/memories')
        .set('X-API-Key', testApiKey)
        .set('X-Project-Scope', validProjectScope);
      
      if (response.status !== 401) {
        expect(response.headers['x-ratelimit-limit']).toBeDefined();
        expect(response.headers['x-ratelimit-remaining']).toBeDefined();
        expect(response.headers['x-ratelimit-reset']).toBeDefined();
      }
    });

    it('should enforce plan-based rate limits', async () => {
      // Make multiple requests to test rate limiting
      const requests = [];
      for (let i = 0; i < 5; i++) {
        requests.push(
          request(API_BASE)
            .get('/api/v1/memories')
            .set('X-API-Key', testApiKey)
            .set('X-Project-Scope', validProjectScope)
        );
      }
      
      const responses = await Promise.all(requests);
      
      // At least first request should succeed
      expect(responses[0].status).not.toBe(429);
      
      // Check rate limit headers are present
      expect(responses[0].headers['x-ratelimit-limit']).toBeDefined();
    });
  });

  describe('Security Headers', () => {
    it('should include security headers in authenticated responses', async () => {
      const response = await request(API_BASE)
        .get('/api/v1/memories')
        .set('X-API-Key', testApiKey)
        .set('X-Project-Scope', validProjectScope);
      
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
      expect(response.headers['x-privacy-level']).toBe('standard');
    });

    it('should not leak sensitive information in error responses', async () => {
      const response = await request(API_BASE)
        .get('/api/v1/memories')
        .set('X-API-Key', 'invalid_key')
        .set('X-Project-Scope', validProjectScope)
        .expect(401);
      
      // Should not contain stack traces or internal paths
      const responseText = JSON.stringify(response.body);
      expect(responseText).not.toMatch(/\/home|\/usr|\/var|stack|trace/i);
      expect(responseText).not.toMatch(/password|secret|token.*:|key.*:/i);
    });
  });

  describe('Error Envelope Conformance', () => {
    it('should return uniform error envelope for auth failures', async () => {
      const response = await request(API_BASE)
        .get('/api/v1/memories')
        .set('X-API-Key', 'invalid_key')
        .set('X-Project-Scope', validProjectScope)
        .expect(401);
      
      // Must include error envelope fields
      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toBeDefined();
      expect(response.body.error.type).toBeDefined();
      expect(response.body.error.code).toBeDefined();
      expect(response.body.request_id).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
    });

    it('should include request context in error envelope', async () => {
      const response = await request(API_BASE)
        .get('/api/v1/memories/test')
        .set('X-API-Key', 'invalid_key')
        .set('X-Project-Scope', validProjectScope)
        .expect(401);
      
      expect(response.body.path).toBe('/api/v1/memories/test');
      expect(response.body.method).toBe('GET');
      expect(response.body.request_id).toMatch(/^[0-9a-f-]{36}$/);
    });
  });
});
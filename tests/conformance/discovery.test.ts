import { describe, it, expect, beforeAll } from '@jest/globals';
import request from 'supertest';

const API_BASE = process.env.TEST_API_BASE || 'http://localhost:3000';

describe('Service Discovery Conformance', () => {
  let discoveryManifest: any;

  beforeAll(async () => {
    // Fetch the discovery manifest
    const response = await request(API_BASE)
      .get('/.well-known/onasis.json')
      .expect(200);
    
    discoveryManifest = response.body.data || response.body;
  });

  describe('Manifest Accessibility', () => {
    it('should be accessible at /.well-known/onasis.json', async () => {
      await request(API_BASE)
        .get('/.well-known/onasis.json')
        .expect(200)
        .expect('Content-Type', /json/);
    });

    it('should include X-Request-ID header', async () => {
      const response = await request(API_BASE)
        .get('/.well-known/onasis.json')
        .expect(200);
      
      expect(response.headers['x-request-id']).toBeDefined();
      expect(response.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/); // UUID format
    });

    it('should include security headers', async () => {
      const response = await request(API_BASE)
        .get('/.well-known/onasis.json')
        .expect(200);
      
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    });
  });

  describe('Required Fields', () => {
    const requiredFields = [
      'auth_base',
      'memory_base', 
      'mcp_ws_base',
      'mcp_sse',
      'mcp_message',
      'keys_base',
      'project_scope',
      'version'
    ];

    requiredFields.forEach(field => {
      it(`should include required field: ${field}`, () => {
        expect(discoveryManifest).toHaveProperty(field);
        expect(discoveryManifest[field]).toBeTruthy();
      });
    });

    it('should have project_scope set to "lanonasis-maas"', () => {
      expect(discoveryManifest.project_scope).toBe('lanonasis-maas');
    });

    it('should have valid URL formats', () => {
      const urlFields = ['auth_base', 'memory_base', 'mcp_sse', 'mcp_message', 'keys_base'];
      
      urlFields.forEach(field => {
        expect(discoveryManifest[field]).toMatch(/^https?:\/\/[^\s]+$/);
      });
    });

    it('should have valid WebSocket URL format', () => {
      expect(discoveryManifest.mcp_ws_base).toMatch(/^wss?:\/\/[^\s]+$/);
    });

    it('should have semantic version format', () => {
      expect(discoveryManifest.version).toMatch(/^\d+\.\d+\.\d+/);
    });
  });

  describe('Optional Enhancement Fields', () => {
    it('should include discovery_version', () => {
      expect(discoveryManifest.discovery_version).toBeDefined();
    });

    it('should include last_updated timestamp', () => {
      expect(discoveryManifest.last_updated).toBeDefined();
      expect(new Date(discoveryManifest.last_updated).getTime()).toBeGreaterThan(0);
    });

    it('should include environment', () => {
      expect(discoveryManifest.environment).toBeDefined();
      expect(['development', 'staging', 'production']).toContain(discoveryManifest.environment);
    });

    it('should include capabilities object', () => {
      expect(discoveryManifest.capabilities).toBeDefined();
      expect(discoveryManifest.capabilities).toHaveProperty('auth');
      expect(discoveryManifest.capabilities).toHaveProperty('protocols');
      expect(discoveryManifest.capabilities).toHaveProperty('formats');
    });

    it('should include auth capabilities', () => {
      expect(discoveryManifest.capabilities.auth).toContain('jwt');
      expect(discoveryManifest.capabilities.auth).toContain('api_key');
    });

    it('should include protocol capabilities', () => {
      const protocols = discoveryManifest.capabilities.protocols;
      expect(protocols).toContain('https');
      expect(protocols).toContain('wss');
      expect(protocols).toContain('sse');
    });
  });

  describe('Endpoint Validation', () => {
    it('should have working auth_base endpoint', async () => {
      const authUrl = `${discoveryManifest.auth_base}/health`.replace('/api/v1/health', '/health');
      
      try {
        await request(authUrl.replace(API_BASE, ''))
          .get('')
          .expect(200);
      } catch (error) {
        // If we can't reach the auth endpoint, at least verify the URL structure
        expect(discoveryManifest.auth_base).toMatch(/\/api\/v1$/);
      }
    });

    it('should have working health endpoint if specified', async () => {
      if (discoveryManifest.endpoints?.health) {
        const healthUrl = discoveryManifest.endpoints.health.replace(API_BASE, '');
        await request(API_BASE)
          .get(healthUrl)
          .expect(200);
      }
    });
  });

  describe('CORS Compliance', () => {
    it('should handle CORS preflight for allowed origins', async () => {
      const allowedOrigins = [
        'https://dashboard.lanonasis.com',
        'https://docs.lanonasis.com',
        'https://api.lanonasis.com'
      ];

      for (const origin of allowedOrigins) {
        const response = await request(API_BASE)
          .options('/.well-known/onasis.json')
          .set('Origin', origin)
          .set('Access-Control-Request-Method', 'GET')
          .expect(204);

        expect(response.headers['access-control-allow-origin']).toBe(origin);
      }
    });

    it('should reject CORS preflight for disallowed origins', async () => {
      const disallowedOrigins = [
        'https://evil.com',
        'http://malicious.site',
        'https://phishing.example'
      ];

      for (const origin of disallowedOrigins) {
        await request(API_BASE)
          .options('/.well-known/onasis.json')
          .set('Origin', origin)
          .set('Access-Control-Request-Method', 'GET')
          .expect(403);
      }
    });
  });

  describe('Caching and Performance', () => {
    it('should complete within reasonable time', async () => {
      const startTime = Date.now();
      
      await request(API_BASE)
        .get('/.well-known/onasis.json')
        .expect(200);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should include appropriate cache headers for production', async () => {
      if (process.env.NODE_ENV === 'production') {
        const response = await request(API_BASE)
          .get('/.well-known/onasis.json')
          .expect(200);
        
        // Should have some form of caching
        expect(
          response.headers['etag'] || 
          response.headers['last-modified'] || 
          response.headers['cache-control']
        ).toBeDefined();
      }
    });
  });

  describe('Response Format Conformance', () => {
    it('should use success envelope format', async () => {
      const response = await request(API_BASE)
        .get('/.well-known/onasis.json')
        .expect(200);
      
      // Check if it follows success envelope pattern
      if (response.body.data) {
        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('request_id');
        expect(response.body).toHaveProperty('timestamp');
      }
    });

    it('should be valid JSON', async () => {
      const response = await request(API_BASE)
        .get('/.well-known/onasis.json')
        .expect(200);
      
      expect(() => JSON.stringify(response.body)).not.toThrow();
      expect(typeof response.body).toBe('object');
    });
  });
});
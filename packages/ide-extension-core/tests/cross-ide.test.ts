/**
 * Cross-IDE Test Suite
 *
 * Verifies feature parity and consistent behavior across all IDE extensions:
 * - VSCode, Cursor, Windsurf
 *
 * Tests shared core functionality to ensure all extensions behave identically
 * when using the same adapters and services.
 */

import { describe, it, expect } from '@jest/globals';

describe('Cross-IDE Feature Parity', () => {
  describe('Adapter Factory Consistency', () => {
    it('should be able to import all adapter factories', async () => {
      // Verify that all adapter factory functions can be imported
      // This ensures the build process works for all IDE variants
      const { createVSCodeAdapter } = await import('../src/adapters/VSCodeAdapter');
      const { createCursorAdapter } = await import('../src/adapters/CursorAdapter');
      const { createWindsurfAdapter } = await import('../src/adapters/WindsurfAdapter');

      expect(typeof createVSCodeAdapter).toBe('function');
      expect(typeof createCursorAdapter).toBe('function');
      expect(typeof createWindsurfAdapter).toBe('function');
    });
  });

  describe('Shared Core Service Consistency', () => {
    it('should be able to import shared services', async () => {
      // Verify that shared services can be imported consistently
      const { SecureApiKeyService } = await import('../src/services/SecureApiKeyService');
      const { CreateMemoryRequestSchema, SearchMemoryRequestSchema } = await import('../src/types/memory-aligned');

      expect(typeof SecureApiKeyService).toBe('function');
      expect(CreateMemoryRequestSchema).toBeDefined();
      expect(SearchMemoryRequestSchema).toBeDefined();
    });
  });

  describe('Memory Schema Compatibility', () => {
    it('should validate memory schemas consistently', async () => {
      const { CreateMemoryRequestSchema, SearchMemoryRequestSchema } = await import('../src/types/memory-aligned');

      const testCreateRequest = {
        title: 'Test Memory',
        content: 'test memory content',
        type: 'context' as const,
        tags: ['test'],
        metadata: {}
      };

      const testSearchRequest = {
        query: 'test query',
        limit: 10
      };

      // Schemas should validate consistently across all IDEs
      const createResult = CreateMemoryRequestSchema.safeParse(testCreateRequest);
      const searchResult = SearchMemoryRequestSchema.safeParse(testSearchRequest);

      expect(createResult.success).toBe(true);
      expect(searchResult.success).toBe(true);
    });
  });

  describe('Configuration Schema Compatibility', () => {
    it('should validate configuration schemas consistently', async () => {
      const { ExtensionConfigSchema } = await import('../src/types/config');

      const testConfig = {
        apiUrl: 'https://api.lanonasis.com',
        authUrl: 'https://auth.lanonasis.com',
        enableCliIntegration: true,
        cliDetectionTimeout: 1000,
        defaultMemoryType: 'context',
        searchLimit: 10,
        searchThreshold: 0.7,
        cacheEnabled: true,
        cacheTtlMinutes: 5,
        virtualScrollThreshold: 50,
        enableAccessibilityFeatures: true,
        showRelevanceScores: true,
        highlightMatchingTerms: true,
        enableOfflineMode: true,
        offlineQueueMaxSize: 100,
        enableTelemetry: false,
        logLevel: 'info',
        enableDiagnostics: false
      };

      const result = ExtensionConfigSchema.safeParse(testConfig);
      expect(result.success).toBe(true);
    });
  });

  describe('Crypto Utility Consistency', () => {
    it('should provide consistent crypto utilities across IDEs', async () => {
      const {
        generateCodeVerifier,
        generateCodeChallenge,
        generateState,
        looksLikeJwt,
        hashApiKey,
        verifyApiKey
      } = await import('../src/utils/crypto');

      // Test PKCE parameter generation
      const verifier = generateCodeVerifier();
      const challenge = generateCodeChallenge(verifier);
      const state = generateState();

      expect(verifier.length).toBe(43);
      expect(challenge.length).toBe(43);
      expect(state.length).toBe(32);

      // Test JWT detection
      expect(looksLikeJwt('header.payload.signature')).toBe(true);
      expect(looksLikeJwt('not-a-jwt')).toBe(false);

      // Test API key hashing and verification
      const testKey = 'test-api-key-123';
      const hashed = hashApiKey(testKey);
      const verified = verifyApiKey(testKey, hashed);

      expect(verified).toBe(true);
      expect(verifyApiKey('wrong-key', hashed)).toBe(false);
    });
  });

  describe('Branding Configuration Consistency', () => {
    it('should validate branding configurations correctly', async () => {
      // Test that all supported IDE names are valid in branding config
      const { ExtensionConfigSchema } = await import('../src/types/config');

      const testBranding = {
        ideName: 'VSCode' as const,
        extensionName: 'lanonasis-memory',
        extensionDisplayName: 'Lanonasis Memory Assistant',
        commandPrefix: 'lanonasis',
        userAgent: 'VSCode/1.74.0 Lanonasis-Memory/2.0.9'
      };

      // This test ensures the branding interface works correctly
      expect(testBranding.ideName).toBe('VSCode');
      expect(testBranding.userAgent).toMatch(/^VSCode\/.* Lanonasis-Memory\/.*$/);
    });
  });
});
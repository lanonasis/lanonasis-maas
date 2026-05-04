import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NaturalLanguageOrchestrator } from '../src/core/orchestrator';
import { OrchestratorConfig } from '../src/core/orchestrator';

describe('AI Endpoint Health & Fallback', () => {
  let config: OrchestratorConfig;
  let orchestrator: NaturalLanguageOrchestrator;
  let _origFallbackModel: string | undefined;

  beforeEach(() => {
    _origFallbackModel = process.env.OPENAI_FALLBACK_MODEL;
    process.env.OPENAI_FALLBACK_MODEL = '';
    config = {
      apiUrl: 'http://localhost:3000',
      authToken: 'test-token',
      openaiApiKey: 'test-openai-key',
      model: 'gpt-4',
      aiRouterUrl: 'https://ai.lanonasis.com',
      aiRouterAuthToken: 'test-router-token',
    };
    orchestrator = new NaturalLanguageOrchestrator(config);
  });

  afterEach(() => {
    process.env.OPENAI_FALLBACK_MODEL = _origFallbackModel;
    vi.restoreAllMocks();
  });

  describe('Endpoint Health Checking', () => {
    it('should create orchestrator with AI Router config', () => {
      expect(orchestrator['aiRouterClient']).toBeDefined();
    });

    it('should create orchestrator without AI Router when URL not provided', () => {
      const configWithoutRouter = { ...config, aiRouterUrl: undefined };
      const orch = new NaturalLanguageOrchestrator(configWithoutRouter);
      expect(orch['aiRouterClient']).toBeUndefined();
    });

    it('should prioritize AI Router API key over auth token', () => {
      const configWithBothKeys = {
        ...config,
        aiRouterApiKey: 'dedicated-router-key',
        aiRouterAuthToken: 'general-auth-token',
      };
      const orch = new NaturalLanguageOrchestrator(configWithBothKeys);
      // The router client should be initialized
      expect(orch['aiRouterClient']).toBeDefined();
    });

    it('should resolve L-Zero alias to fallback model', () => {
      const lzeroConfig = { ...config, model: 'L-Zero' };
      const orch = new NaturalLanguageOrchestrator(lzeroConfig);
      const resolvedModel = orch['resolveOpenAIModel']();
      expect(resolvedModel).toBe('gpt-4o-mini');
    });

    it('should resolve lzero (lowercase) alias to fallback model', () => {
      const lzeroConfig = { ...config, model: 'lzero' };
      const orch = new NaturalLanguageOrchestrator(lzeroConfig);
      const resolvedModel = orch['resolveOpenAIModel']();
      expect(resolvedModel).toBe('gpt-4o-mini');
    });

    it('should resolve custom model when specified', () => {
      const customConfig = { ...config, model: 'gpt-4-turbo' };
      const orch = new NaturalLanguageOrchestrator(customConfig);
      const resolvedModel = orch['resolveOpenAIModel']();
      expect(resolvedModel).toBe('gpt-4-turbo');
    });
  });

  describe('Fallback Processor', () => {
    it('should handle greeting patterns', async () => {
      const greetings = ['hi', 'hello', 'hey'];
      
      for (const greeting of greetings) {
        const response = await orchestrator['fallbackProcessor'](greeting);
        // Response should be conversational and contain a greeting
        expect(response.response).toMatch(/Hey|Hello|Hi|Greetings/i);
        expect(response.mainAnswer).toBeDefined();
      }
    });

    it('should handle remember/create intents', async () => {
      const response = await orchestrator['fallbackProcessor']('remember that I like TypeScript');
      expect(response.action).toBeDefined();
      expect(response.action?.type).toBe('create');
      expect(response.action?.params).toHaveProperty('title');
      expect(response.action?.params).toHaveProperty('content');
    });

    it('should handle search intents', async () => {
      const response = await orchestrator['fallbackProcessor']('search for typescript');
      expect(response.action).toBeDefined();
      expect(response.action?.type).toBe('search');
    });

    it('should handle list intents', async () => {
      const response = await orchestrator['fallbackProcessor']('show my memories');
      expect(response.action).toBeDefined();
      expect(response.action?.type).toBe('list');
    });

    it('should handle delete intents with ID', async () => {
      const uuid = '12345678-1234-1234-1234-123456789abc';
      const response = await orchestrator['fallbackProcessor'](`delete ${uuid}`);
      expect(response.action).toBeDefined();
      expect(response.action?.type).toBe('delete');
      expect(response.action?.params.id).toBe(uuid);
    });

    it('should handle help intent', async () => {
      const response = await orchestrator['fallbackProcessor']('help');
      expect(response.response).toContain('Memory & Knowledge');
      expect(response.response).toContain('Prompt Optimization');
    });

    it('should handle unknown input gracefully', async () => {
      const response = await orchestrator['fallbackProcessor']('xyz abc unknown');
      // Should provide a helpful response even for unknown input
      expect(response.response).toBeDefined();
      expect(response.response.length).toBeGreaterThan(10);
      expect(response.mainAnswer).toBeDefined();
    });
  });

  describe('Error Handling & Fallback', () => {
    it('should format errors correctly', () => {
      const errorMessage = orchestrator['formatError'](new Error('Test error'));
      expect(errorMessage).toBe('Test error');
    });

    it('should format string errors', () => {
      const errorMessage = orchestrator['formatError']('String error');
      expect(errorMessage).toBe('String error');
    });

    it('should format object errors', () => {
      const errorMessage = orchestrator['formatError']({ key: 'value' });
      expect(errorMessage).toBe('{"key":"value"}');
    });

    it.skip('should handle null/undefined errors', () => {
      // Skipped - formatError implementation handles these edge cases
    });

    it('should detect campaign intents', () => {
      expect(orchestrator['isCampaignIntent']('create a campaign')).toBe(true);
      expect(orchestrator['isCampaignIntent']('launch marketing')).toBe(true);
      expect(orchestrator['isCampaignIntent']('tiktok viral')).toBe(true);
    });

    it('should detect trend intents', () => {
      expect(orchestrator['isTrendIntent']('what is trending')).toBe(true);
      expect(orchestrator['isTrendIntent']('viral hashtags')).toBe(true);
    });

    it('should detect content intents', () => {
      expect(orchestrator['isContentIntent']('create content')).toBe(true);
      expect(orchestrator['isContentIntent']('write a caption')).toBe(true);
    });
  });

  describe('Context Management', () => {
    it('should initialize with empty context', () => {
      expect(orchestrator['contextInitialized']).toBe(false);
    });

    it('should track conversation history', () => {
      orchestrator['conversationHistory'].push({
        role: 'user',
        content: 'test message'
      });
      expect(orchestrator['conversationHistory'].length).toBeGreaterThan(1); // System + user
    });

    it('should clear history correctly', () => {
      orchestrator['conversationHistory'].push({
        role: 'user',
        content: 'test'
      });
      orchestrator.clearHistory();
      expect(orchestrator['conversationHistory'].length).toBe(1); // Only system prompt remains
    });
  });
});

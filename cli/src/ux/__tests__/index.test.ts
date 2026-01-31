/**
 * UX Module Integration Tests
 *
 * Integration tests for the complete UX improvements module
 * as specified in the CLI UX improvements design document.
 */

import { describe, it, expect } from '@jest/globals';
import * as fc from 'fast-check';
import {
  createTextInputHandler,
  createConnectionManager,
  createOnboardingFlow,
  TextInputHandlerImpl,
  ConnectionManagerImpl,
  OnboardingFlowImpl,
} from '../index.js';

describe('UX Module Integration', () => {
  describe('Factory Functions', () => {
    it('should create TextInputHandler instances', () => {
      const handler = createTextInputHandler();
      expect(handler).toBeInstanceOf(TextInputHandlerImpl);
      expect(handler.getCurrentSession()).toBeNull();
    });

    it('should create ConnectionManager instances', () => {
      const manager = createConnectionManager();
      expect(manager).toBeInstanceOf(ConnectionManagerImpl);
      expect(manager.getConnectionStatus()).toBeDefined();
    });

    it('should create OnboardingFlow instances', () => {
      const flow = createOnboardingFlow();
      expect(flow).toBeInstanceOf(OnboardingFlowImpl);
      expect(flow.getOnboardingState()).toBeDefined();
    });

    it('should create ConnectionManager with custom config path', () => {
      const customPath = '/custom/path/config.json';
      const manager = createConnectionManager(customPath);
      expect(manager).toBeInstanceOf(ConnectionManagerImpl);
    });

    it('should create OnboardingFlow with custom config path', () => {
      const customPath = '/custom/path/onboarding.json';
      const flow = createOnboardingFlow(customPath);
      expect(flow).toBeInstanceOf(OnboardingFlowImpl);
    });
  });

  describe('Module Exports', () => {
    it('should export all required interfaces and implementations', () => {
      // Check that implementations are exported
      expect(TextInputHandlerImpl).toBeDefined();
      expect(ConnectionManagerImpl).toBeDefined();
      expect(OnboardingFlowImpl).toBeDefined();

      // Check that factory functions are exported
      expect(createTextInputHandler).toBeDefined();
      expect(createConnectionManager).toBeDefined();
      expect(createOnboardingFlow).toBeDefined();
    });
  });

  describe('Integration Property Tests', () => {
    /**
     * **Feature: cli-ux-improvements, Integration Property: Component Interoperability**
     *
     * All UX improvement components should work together seamlessly without conflicts
     * or resource contention issues.
     */
    it('should handle multiple component instances without conflicts', () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 5 }), (instanceCount) => {
          // Property: Multiple instances should coexist without conflicts
          const handlers = Array(instanceCount)
            .fill(null)
            .map(() => createTextInputHandler());
          const managers = Array(instanceCount)
            .fill(null)
            .map(() => createConnectionManager());
          const flows = Array(instanceCount)
            .fill(null)
            .map(() => createOnboardingFlow());

          // All instances should be valid
          handlers.forEach((handler) => {
            expect(handler).toBeInstanceOf(TextInputHandlerImpl);
            expect(handler.getCurrentSession()).toBeNull();
          });

          managers.forEach((manager) => {
            expect(manager).toBeInstanceOf(ConnectionManagerImpl);
            expect(manager.getConnectionStatus().isConnected).toBe(false);
          });

          flows.forEach((flow) => {
            expect(flow).toBeInstanceOf(OnboardingFlowImpl);
            expect(flow.getOnboardingState().isFirstRun).toBe(true);
          });

          // Instances should be independent
          expect(new Set(handlers)).toHaveProperty('size', instanceCount);
          expect(new Set(managers)).toHaveProperty('size', instanceCount);
          expect(new Set(flows)).toHaveProperty('size', instanceCount);
        }),
        { numRuns: 20 },
      );
    });

    it('should maintain consistent behavior across factory functions', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 100 }), { minLength: 1, maxLength: 5 }),
          (configPaths) => {
            // Property: Factory functions should produce consistent results
            configPaths.forEach((configPath) => {
              const manager1 = createConnectionManager(configPath);
              const manager2 = createConnectionManager(configPath);
              const flow1 = createOnboardingFlow(configPath);
              const flow2 = createOnboardingFlow(configPath);

              // Different instances but same behavior
              expect(manager1).not.toBe(manager2);
              expect(flow1).not.toBe(flow2);

              // Same initial state
              expect(manager1.getConnectionStatus().isConnected).toBe(
                manager2.getConnectionStatus().isConnected,
              );
              expect(flow1.getOnboardingState().isFirstRun).toBe(
                flow2.getOnboardingState().isFirstRun,
              );
            });
          },
        ),
        { numRuns: 20 },
      );
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle component initialization errors gracefully', () => {
      // Test with invalid paths
      expect(() => createConnectionManager('/invalid/\0/path')).not.toThrow();
      expect(() => createOnboardingFlow('/invalid/\0/path')).not.toThrow();
      expect(() => createTextInputHandler()).not.toThrow();
    });

    it('should handle concurrent component operations', async () => {
      const handler = createTextInputHandler();
      const manager = createConnectionManager();
      const flow = createOnboardingFlow();

      // Concurrent operations should not interfere
      const operations = [
        Promise.resolve(handler.getCurrentSession()),
        Promise.resolve(manager.getConnectionStatus()),
        Promise.resolve(flow.getOnboardingState()),
        manager.detectServerPath(),
        flow.testConnectivity(),
      ];

      const results = await Promise.allSettled(operations);

      // All operations should complete
      expect(results).toHaveLength(5);
      results.forEach((result) => {
        expect(result.status).toBe('fulfilled');
      });
    });
  });
});

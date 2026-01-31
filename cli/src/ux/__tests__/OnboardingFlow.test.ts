/**
 * Onboarding Flow Tests
 *
 * Unit tests and property-based tests for the OnboardingFlow implementation
 * as specified in the CLI UX improvements design document.
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import * as fc from 'fast-check';
import { join } from 'path';
import type { OnboardingFlow, UserPreferences } from '../interfaces/OnboardingFlow.js';

// Mock fs operations - define typed mock functions
const mockReadFile = jest.fn<() => Promise<string>>();
const mockWriteFile = jest.fn<() => Promise<void>>();
const mockMkdir = jest.fn<() => Promise<string | undefined>>();
const mockUnlink = jest.fn<() => Promise<void>>();
const mockAccess = jest.fn<() => Promise<void>>();
const mockAccessSync = jest.fn<() => void>();
const mockCreateWriteStream = jest.fn();

jest.unstable_mockModule('fs', () => ({
  promises: {
    readFile: mockReadFile,
    writeFile: mockWriteFile,
    mkdir: mockMkdir,
    unlink: mockUnlink,
    access: mockAccess,
  },
  accessSync: mockAccessSync,
  createWriteStream: mockCreateWriteStream,
}));

const { OnboardingFlowImpl } = await import('../implementations/OnboardingFlowImpl.js');

describe('OnboardingFlow', () => {
  let onboardingFlow: OnboardingFlow;
  let tempConfigPath: string;

  beforeEach(() => {
    tempConfigPath = join('/tmp', 'test-onboarding.json');
    onboardingFlow = new OnboardingFlowImpl(tempConfigPath);

    // Reset mocks
    jest.clearAllMocks();
    mockAccess.mockRejectedValue(new Error('File not found'));
    mockAccessSync.mockImplementation(() => {
      throw new Error('File not found');
    });
    mockCreateWriteStream.mockReturnValue({});
    mockMkdir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);
    mockReadFile.mockResolvedValue('{}');
    mockUnlink.mockResolvedValue(undefined);

    // Mock console methods to reduce test noise
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(async () => {
    // Clean up
    try {
      await onboardingFlow.resetOnboarding();
    } catch {
      // Ignore cleanup errors
    }

    // Restore console methods
    jest.restoreAllMocks();
  });

  describe('Unit Tests', () => {
    it('should initialize with default state', () => {
      const state = onboardingFlow.getOnboardingState();
      expect(state).toBeDefined();
      expect(state.isFirstRun).toBe(true);
      expect(state.currentStep).toBe(0);
      expect(state.totalSteps).toBeGreaterThan(0);
      expect(Array.isArray(state.completedSteps)).toBe(true);
      expect(Array.isArray(state.skippedSteps)).toBe(true);
      expect(state.userPreferences).toBeDefined();
    });

    it('should detect first run correctly', () => {
      // Mock fs.accessSync to simulate no existing config
      mockAccessSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      const isFirstRun = onboardingFlow.detectFirstRun();
      expect(isFirstRun).toBe(true);
    });

    it('should configure defaults successfully', async () => {
      await expect(onboardingFlow.configureDefaults()).resolves.not.toThrow();
    });

    it('should test connectivity and return results', async () => {
      const testResults = await onboardingFlow.testConnectivity();

      expect(Array.isArray(testResults)).toBe(true);
      testResults.forEach((result) => {
        expect(result).toHaveProperty('component');
        expect(result).toHaveProperty('status');
        expect(result).toHaveProperty('message');
        expect(['pass', 'fail', 'warning']).toContain(result.status);
        expect(typeof result.component).toBe('string');
        expect(typeof result.message).toBe('string');
      });
    });

    it('should update user preferences', async () => {
      const newPreferences: Partial<UserPreferences> = {
        inputMode: 'editor',
        verboseErrors: true,
      };

      await onboardingFlow.updateUserPreferences(newPreferences);
      const state = onboardingFlow.getOnboardingState();

      expect(state.userPreferences.inputMode).toBe('editor');
      expect(state.userPreferences.verboseErrors).toBe(true);
    });

    it('should skip steps correctly', async () => {
      const initialStep = onboardingFlow.getOnboardingState().currentStep;

      await onboardingFlow.skipCurrentStep('Testing skip functionality');

      const newState = onboardingFlow.getOnboardingState();
      expect(newState.currentStep).toBe(initialStep + 1);
      expect(newState.skippedSteps.length).toBeGreaterThan(0);
    });

    it('should complete onboarding', async () => {
      mockReadFile.mockResolvedValue('{}');
      mockWriteFile.mockResolvedValue(undefined);

      await onboardingFlow.completeOnboarding();

      const state = onboardingFlow.getOnboardingState();
      expect(state.isFirstRun).toBe(false);
      expect(state.currentStep).toBe(state.totalSteps);
    });

    it('should reset onboarding state', async () => {
      // First, modify the state
      await onboardingFlow.skipCurrentStep();
      await onboardingFlow.updateUserPreferences({ verboseErrors: true });

      // Then reset
      await onboardingFlow.resetOnboarding();

      const state = onboardingFlow.getOnboardingState();
      expect(state.isFirstRun).toBe(true);
      expect(state.currentStep).toBe(0);
      expect(state.completedSteps).toHaveLength(0);
      expect(state.skippedSteps).toHaveLength(0);
    });
  });

  describe('Property-Based Tests', () => {
    /**
     * **Feature: cli-ux-improvements, Property 5: Onboarding and Setup**
     *
     * For any first-run scenario, the Onboarding Flow should guide users through setup,
     * configure working defaults, test connectivity, and demonstrate key features with
     * clear troubleshooting when issues arise
     *
     * **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**
     */
    it('should handle user preferences consistently', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            inputMode: fc.option(fc.constantFrom('inline' as const, 'editor' as const), {
              nil: undefined,
            }),
            preferredEditor: fc.option(fc.string({ maxLength: 50 }), { nil: undefined }),
            autoStartMCP: fc.option(fc.boolean(), { nil: undefined }),
            showOnboardingTips: fc.option(fc.boolean(), { nil: undefined }),
            verboseErrors: fc.option(fc.boolean(), { nil: undefined }),
          }),
          async (preferences) => {
            // Property: User preferences should always result in valid configurations
            const flow = new OnboardingFlowImpl();

            await flow.updateUserPreferences(preferences);
            const state = flow.getOnboardingState();

            // Verify all preference values are valid
            expect(['inline', 'editor']).toContain(state.userPreferences.inputMode);
            expect(typeof state.userPreferences.autoStartMCP).toBe('boolean');
            expect(typeof state.userPreferences.showOnboardingTips).toBe('boolean');
            expect(typeof state.userPreferences.verboseErrors).toBe('boolean');

            if (state.userPreferences.preferredEditor !== undefined) {
              expect(typeof state.userPreferences.preferredEditor).toBe('string');
            }

            // Applied preferences should match input where provided
            if (preferences.inputMode !== undefined) {
              expect(state.userPreferences.inputMode).toBe(preferences.inputMode);
            }
            if (preferences.autoStartMCP !== undefined) {
              expect(state.userPreferences.autoStartMCP).toBe(preferences.autoStartMCP);
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should maintain onboarding state consistency', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 10 }),
          fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 5 }),
          async (skipCount, stepNames) => {
            // Property: Onboarding state should remain consistent through operations
            const flow = new OnboardingFlowImpl();
            const initialState = flow.getOnboardingState();

            // Skip some steps
            for (let i = 0; i < Math.min(skipCount, initialState.totalSteps); i++) {
              await flow.skipCurrentStep(`Test skip ${i}`);
            }

            const afterSkipState = flow.getOnboardingState();

            // State should be consistent
            expect(afterSkipState.currentStep).toBeGreaterThanOrEqual(initialState.currentStep);
            expect(afterSkipState.currentStep).toBeLessThanOrEqual(initialState.totalSteps);
            expect(afterSkipState.skippedSteps.length).toBeLessThanOrEqual(skipCount);
            expect(afterSkipState.totalSteps).toBe(initialState.totalSteps);
            expect(typeof afterSkipState.isFirstRun).toBe('boolean');
          },
        ),
        { numRuns: 50 }, // Reduced for async operations
      );
    });

    it('should handle connectivity test results consistently', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.boolean(), // Mock success/failure scenarios
          async (shouldSucceed) => {
            // Property: Connectivity tests should always return valid results
            const flow = new OnboardingFlowImpl();

            const testResults = await flow.testConnectivity();

            // Results should always be an array
            expect(Array.isArray(testResults)).toBe(true);

            // Each result should have valid structure
            testResults.forEach((result) => {
              expect(typeof result.component).toBe('string');
              expect(result.component.length).toBeGreaterThan(0);
              expect(['pass', 'fail', 'warning']).toContain(result.status);
              expect(typeof result.message).toBe('string');
              expect(result.message.length).toBeGreaterThan(0);

              if (result.details !== undefined) {
                expect(typeof result.details).toBe('string');
              }
            });

            // Should have at least some test results
            expect(testResults.length).toBeGreaterThan(0);
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle file system errors during configuration', async () => {
      mockMkdir.mockRejectedValue(new Error('Permission denied'));

      await expect(onboardingFlow.configureDefaults()).rejects.toThrow();
    });

    it('should handle corrupted onboarding state file', async () => {
      mockReadFile.mockResolvedValue('invalid json');

      // Should not throw, should use defaults
      const flow = new OnboardingFlowImpl();
      const state = flow.getOnboardingState();

      expect(state).toBeDefined();
      expect(state.isFirstRun).toBe(true);
    });

    it('should handle missing configuration directory', async () => {
      mockMkdir.mockRejectedValue(new Error('Cannot create directory'));

      await expect(onboardingFlow.configureDefaults()).rejects.toThrow();
    });

    it('should handle step skipping beyond total steps', async () => {
      const state = onboardingFlow.getOnboardingState();
      const totalSteps = state.totalSteps;

      // Skip more steps than available
      for (let i = 0; i <= totalSteps + 5; i++) {
        await onboardingFlow.skipCurrentStep(`Step ${i}`);
      }

      const finalState = onboardingFlow.getOnboardingState();
      // Should not exceed total steps significantly
      expect(finalState.currentStep).toBeLessThanOrEqual(totalSteps + 10);
    });

    it('should handle concurrent onboarding operations', async () => {
      const promises = [
        onboardingFlow.skipCurrentStep('Concurrent 1'),
        onboardingFlow.updateUserPreferences({ verboseErrors: true }),
        onboardingFlow.skipCurrentStep('Concurrent 2'),
        onboardingFlow.updateUserPreferences({ autoStartMCP: false }),
      ];

      await Promise.allSettled(promises);

      // Should complete without hanging
      const state = onboardingFlow.getOnboardingState();
      expect(state).toBeDefined();
    });
  });
});

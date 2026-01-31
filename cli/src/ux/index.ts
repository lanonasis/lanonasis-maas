/**
 * CLI UX Improvements - Main Module
 *
 * This is the main entry point for the CLI UX improvements module.
 * It provides a clean API for accessing all the UX enhancement components
 * including interfaces and implementations.
 */

// Export all interfaces
export type {
  TextInputHandler,
  KeyEvent,
  CursorPosition,
  InputOptions,
  InputSession,
  ConnectionManager,
  ConnectionResult,
  ConfigResult,
  ServerInstance,
  ConnectionStatus,
  MCPConfig,
  OnboardingFlow,
  SetupResult,
  TestResult,
  UserPreferences,
  OnboardingState,
} from './interfaces/index.js';

// Export all implementations
export {
  TextInputHandlerImpl,
  ConnectionManagerImpl,
  OnboardingFlowImpl,
} from './implementations/index.js';

// Convenience factory functions
export function createTextInputHandler(): TextInputHandler {
  return new TextInputHandlerImpl();
}

export function createConnectionManager(configPath?: string): ConnectionManager {
  return new ConnectionManagerImpl(configPath);
}

export function createOnboardingFlow(configPath?: string): OnboardingFlow {
  return new OnboardingFlowImpl(configPath);
}

// Type imports for implementations
import type { TextInputHandler } from './interfaces/TextInputHandler.js';
import type { ConnectionManager } from './interfaces/ConnectionManager.js';
import type { OnboardingFlow } from './interfaces/OnboardingFlow.js';
import { TextInputHandlerImpl } from './implementations/TextInputHandlerImpl.js';
import { ConnectionManagerImpl } from './implementations/ConnectionManagerImpl.js';
import { OnboardingFlowImpl } from './implementations/OnboardingFlowImpl.js';

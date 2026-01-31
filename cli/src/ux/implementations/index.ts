/**
 * CLI UX Improvements - Core Implementations
 *
 * This module exports all the implementation classes for the CLI UX improvements
 * as specified in the design document. These implementations provide the concrete
 * functionality for the TextInputHandler, ConnectionManager, and OnboardingFlow interfaces.
 */

// Implementation classes
export { TextInputHandlerImpl } from './TextInputHandlerImpl.js';
export { ConnectionManagerImpl } from './ConnectionManagerImpl.js';
export { OnboardingFlowImpl } from './OnboardingFlowImpl.js';

// Re-export interfaces for convenience
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
} from '../interfaces/index.js';

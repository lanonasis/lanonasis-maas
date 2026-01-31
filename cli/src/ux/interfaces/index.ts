/**
 * CLI UX Improvements - Core Interfaces
 *
 * This module exports all the TypeScript interfaces for the CLI UX improvements
 * as specified in the design document. These interfaces define the contracts
 * for the TextInputHandler, ConnectionManager, and OnboardingFlow components.
 */

// Text Input Handler interfaces
export type {
  TextInputHandler,
  KeyEvent,
  CursorPosition,
  InputOptions,
  InputSession,
} from './TextInputHandler.js';

// Connection Manager interfaces
export type {
  ConnectionManager,
  ConnectionResult,
  ConfigResult,
  ServerInstance,
  ConnectionStatus,
  MCPConfig,
} from './ConnectionManager.js';

// Onboarding Flow interfaces
export type {
  OnboardingFlow,
  SetupResult,
  TestResult,
  UserPreferences,
  OnboardingState,
} from './OnboardingFlow.js';

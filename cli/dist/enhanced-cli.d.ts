#!/usr/bin/env node
/**
 * Enhanced CLI Entry Point
 * Integrates all the enhanced experience components
 */
import { CLIExperienceArchitecture } from './core/architecture.js';
import { ErrorHandler } from './core/error-handler.js';
import { AchievementSystem } from './core/achievements.js';
import { ProgressIndicator } from './core/progress.js';
declare const architecture: CLIExperienceArchitecture;
declare const stateManager: import("./core/architecture.js").StateManager;
declare const errorHandler: ErrorHandler;
declare const achievementSystem: AchievementSystem;
declare const progressIndicator: ProgressIndicator;
export { architecture, stateManager, errorHandler, achievementSystem, progressIndicator };

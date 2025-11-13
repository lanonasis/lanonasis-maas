/**
 * Achievement System and Engagement Features
 * Gamification elements to enhance user engagement
 */
import { StateManager } from './architecture.js';
import { EventEmitter } from 'events';
export interface Achievement {
    id: string;
    name: string;
    description: string;
    icon: string;
    points: number;
    category: 'usage' | 'milestone' | 'special' | 'hidden';
    unlocked: boolean;
    unlockedAt?: Date;
    progress?: number;
    maxProgress?: number;
    condition: (stats: UserStats) => boolean;
}
export interface UserStats {
    totalMemories: number;
    totalSearches: number;
    totalTopics: number;
    totalApiCalls: number;
    daysActive: number;
    longestStreak: number;
    currentStreak: number;
    powerModeUsage: number;
    memoriesCreatedToday: number;
    searchAccuracy: number;
}
export declare class AchievementSystem extends EventEmitter {
    private stateManager;
    private achievements;
    private userStats;
    private unlockedAchievements;
    constructor(stateManager: StateManager);
    /**
     * Initialize all available achievements
     */
    private initializeAchievements;
    /**
     * Check for new achievements
     */
    checkAchievements(): Achievement[];
    /**
     * Update achievement progress
     */
    private updateProgress;
    /**
     * Unlock an achievement
     */
    private unlockAchievement;
    /**
     * Show achievement celebration
     */
    celebrate(achievement: Achievement): void;
    /**
     * Show all achievements
     */
    showAchievements(): void;
    /**
     * Display single achievement
     */
    private displayAchievement;
    /**
     * Get category title
     */
    private getCategoryTitle;
    /**
     * Get total possible points
     */
    getTotalPoints(): number;
    /**
     * Get unlocked points
     */
    getUnlockedPoints(): number;
    /**
     * Update user stats
     */
    updateStats(updates: Partial<UserStats>): void;
    /**
     * Get leaderboard position
     */
    getLeaderboardPosition(): number;
    /**
     * Load user stats from storage
     */
    private loadUserStats;
    /**
     * Save user stats to storage
     */
    private saveUserStats;
    /**
     * Load unlocked achievements from storage
     */
    private loadUnlockedAchievements;
    /**
     * Save unlocked achievements to storage
     */
    private saveUnlockedAchievements;
}

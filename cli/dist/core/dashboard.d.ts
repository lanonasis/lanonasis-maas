/**
 * Main Dashboard Command Center
 * The central hub for all CLI operations after authentication
 */
import { StateManager } from './architecture.js';
export interface DashboardStats {
    totalMemories: number;
    totalTopics: number;
    apiKeys: number;
    recentActivity: ActivityItem[];
}
export interface ActivityItem {
    action: string;
    target: string;
    timestamp: string;
}
export declare class DashboardCommandCenter {
    private stateManager;
    private stats;
    constructor(stateManager: StateManager);
    show(): Promise<void>;
    private render;
    private renderHeader;
    private renderStatsAndActivity;
    private renderQuickStats;
    private renderRecentActivity;
    private renderMainMenu;
    private renderFooter;
    private handleUserInput;
    private processInput;
    private handleNumberedOption;
    private createMemory;
    private searchMemories;
    private browseTopics;
    private viewAnalytics;
    private manageApiKeys;
    private openSettings;
    private showHelp;
    private interpretSmartCommand;
    private loadStats;
}
/**
 * Interactive Memory Creator
 */
export declare class InteractiveMemoryCreator {
    private stateManager;
    constructor(stateManager: StateManager);
    create(): Promise<void>;
    createQuick(content: string): Promise<void>;
    private analyzeContent;
    private showPreview;
}
/**
 * Interactive Search Experience
 */
export declare class InteractiveSearch {
    private stateManager;
    constructor(stateManager: StateManager);
    search(initialQuery?: string): Promise<void>;
    private displayResults;
    private simulateDelay;
}
/**
 * Analytics View
 */
export declare class AnalyticsView {
    private stateManager;
    constructor(stateManager: StateManager);
    show(): Promise<void>;
    private renderChart;
}

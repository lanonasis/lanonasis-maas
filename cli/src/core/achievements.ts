/**
 * Achievement System and Engagement Features
 * Gamification elements to enhance user engagement
 */

import chalk from 'chalk';
import boxen from 'boxen';
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

export class AchievementSystem extends EventEmitter {
  private stateManager: StateManager;
  private achievements: Map<string, Achievement>;
  private userStats: UserStats;
  private unlockedAchievements: Set<string>;

  constructor(stateManager: StateManager) {
    super();
    this.stateManager = stateManager;
    this.achievements = new Map();
    this.unlockedAchievements = new Set();
    this.userStats = this.loadUserStats();

    this.initializeAchievements();
    this.loadUnlockedAchievements();
  }

  /**
   * Initialize all available achievements
   */
  private initializeAchievements(): void {
    const achievementList: Achievement[] = [
      // Usage achievements
      {
        id: 'first_memory',
        name: 'First Step',
        description: 'Create your first memory',
        icon: '🎯',
        points: 10,
        category: 'usage',
        unlocked: false,
        condition: (stats) => stats.totalMemories >= 1
      },
      {
        id: 'memory_collector',
        name: 'Memory Collector',
        description: 'Create 100 memories',
        icon: '📚',
        points: 50,
        category: 'milestone',
        unlocked: false,
        progress: 0,
        maxProgress: 100,
        condition: (stats) => stats.totalMemories >= 100
      },
      {
        id: 'memory_master',
        name: 'Memory Master',
        description: 'Create 1000 memories',
        icon: '🏆',
        points: 200,
        category: 'milestone',
        unlocked: false,
        progress: 0,
        maxProgress: 1000,
        condition: (stats) => stats.totalMemories >= 1000
      },

      // Search achievements
      {
        id: 'first_search',
        name: 'Explorer',
        description: 'Perform your first search',
        icon: '🔍',
        points: 10,
        category: 'usage',
        unlocked: false,
        condition: (stats) => stats.totalSearches >= 1
      },
      {
        id: 'search_pro',
        name: 'Search Professional',
        description: 'Perform 100 searches',
        icon: '🎓',
        points: 50,
        category: 'milestone',
        unlocked: false,
        progress: 0,
        maxProgress: 100,
        condition: (stats) => stats.totalSearches >= 100
      },
      {
        id: 'search_ninja',
        name: 'Search Ninja',
        description: 'Achieve 90% search accuracy',
        icon: '🥷',
        points: 100,
        category: 'special',
        unlocked: false,
        condition: (stats) => stats.searchAccuracy >= 90
      },

      // Streak achievements
      {
        id: 'week_streak',
        name: 'Consistent',
        description: 'Maintain a 7-day streak',
        icon: '🔥',
        points: 25,
        category: 'special',
        unlocked: false,
        progress: 0,
        maxProgress: 7,
        condition: (stats) => stats.currentStreak >= 7
      },
      {
        id: 'month_streak',
        name: 'Dedicated',
        description: 'Maintain a 30-day streak',
        icon: '💎',
        points: 100,
        category: 'special',
        unlocked: false,
        progress: 0,
        maxProgress: 30,
        condition: (stats) => stats.currentStreak >= 30
      },

      // API achievements
      {
        id: 'api_integrated',
        name: 'Connected',
        description: 'Successfully integrate API',
        icon: '🔌',
        points: 20,
        category: 'usage',
        unlocked: false,
        condition: (stats) => stats.totalApiCalls >= 1
      },
      {
        id: 'api_power_user',
        name: 'API Power User',
        description: 'Make 1000 API calls',
        icon: '⚡',
        points: 75,
        category: 'milestone',
        unlocked: false,
        progress: 0,
        maxProgress: 1000,
        condition: (stats) => stats.totalApiCalls >= 1000
      },

      // Special achievements
      {
        id: 'night_owl',
        name: 'Night Owl',
        description: 'Create memories after midnight',
        icon: '🦉',
        points: 15,
        category: 'special',
        unlocked: false,
        condition: () => new Date().getHours() >= 0 && new Date().getHours() < 5
      },
      {
        id: 'early_bird',
        name: 'Early Bird',
        description: 'Create memories before 6 AM',
        icon: '🐦',
        points: 15,
        category: 'special',
        unlocked: false,
        condition: () => new Date().getHours() >= 5 && new Date().getHours() < 6
      },
      {
        id: 'power_mode_pro',
        name: 'Power Mode Professional',
        description: 'Use power mode 50 times',
        icon: '⚡',
        points: 60,
        category: 'special',
        unlocked: false,
        progress: 0,
        maxProgress: 50,
        condition: (stats) => stats.powerModeUsage >= 50
      },

      // Hidden achievements
      {
        id: 'secret_finder',
        name: '???',
        description: 'Discover a hidden feature',
        icon: '🤫',
        points: 50,
        category: 'hidden',
        unlocked: false,
        condition: () => false // Triggered by specific action
      },
      {
        id: 'bug_reporter',
        name: 'Bug Hunter',
        description: 'Report a bug that gets fixed',
        icon: '🐛',
        points: 100,
        category: 'hidden',
        unlocked: false,
        condition: () => false
      }
    ];

    achievementList.forEach(achievement => {
      this.achievements.set(achievement.id, achievement);
    });
  }

  /**
   * Check for new achievements
   */
  checkAchievements(): Achievement[] {
    const newlyUnlocked: Achievement[] = [];

    this.achievements.forEach((achievement, id) => {
      if (!achievement.unlocked && !this.unlockedAchievements.has(id)) {
        // Update progress if applicable
        if (achievement.maxProgress) {
          this.updateProgress(achievement);
        }

        // Check if condition is met
        if (achievement.condition(this.userStats)) {
          this.unlockAchievement(achievement);
          newlyUnlocked.push(achievement);
        }
      }
    });

    return newlyUnlocked;
  }

  /**
   * Update achievement progress
   */
  private updateProgress(achievement: Achievement): void {
    switch (achievement.id) {
      case 'memory_collector':
        achievement.progress = Math.min(this.userStats.totalMemories, achievement.maxProgress || 0);
        break;
      case 'memory_master':
        achievement.progress = Math.min(this.userStats.totalMemories, achievement.maxProgress || 0);
        break;
      case 'search_pro':
        achievement.progress = Math.min(this.userStats.totalSearches, achievement.maxProgress || 0);
        break;
      case 'week_streak':
        achievement.progress = Math.min(this.userStats.currentStreak, achievement.maxProgress || 0);
        break;
      case 'month_streak':
        achievement.progress = Math.min(this.userStats.currentStreak, achievement.maxProgress || 0);
        break;
      case 'api_power_user':
        achievement.progress = Math.min(this.userStats.totalApiCalls, achievement.maxProgress || 0);
        break;
      case 'power_mode_pro':
        achievement.progress = Math.min(this.userStats.powerModeUsage, achievement.maxProgress || 0);
        break;
    }
  }

  /**
   * Unlock an achievement
   */
  private unlockAchievement(achievement: Achievement): void {
    achievement.unlocked = true;
    achievement.unlockedAt = new Date();
    this.unlockedAchievements.add(achievement.id);

    // Emit event
    this.emit('achievement:unlocked', achievement);

    // Save to storage
    this.saveUnlockedAchievements();

    // Show celebration
    this.celebrate(achievement);
  }

  /**
   * Show achievement celebration
   */
  celebrate(achievement: Achievement): void {
    const celebration = boxen(
      `${achievement.icon} ${chalk.bold.yellow('Achievement Unlocked!')}\n\n` +
      `${chalk.bold(achievement.name)}\n` +
      `${chalk.gray(achievement.description)}\n\n` +
      `${chalk.green(`+${achievement.points} points`)}`,
      {
        padding: 1,
        borderStyle: 'double',
        borderColor: 'yellow',
        textAlignment: 'center'
      }
    );

    console.log('\n' + celebration + '\n');
  }

  /**
   * Show all achievements
   */
  showAchievements(): void {
    console.clear();
    console.log(chalk.bold.yellow('🏆 Achievements\n'));

    const categories = ['usage', 'milestone', 'special', 'hidden'];
    const totalPoints = this.getTotalPoints();
    const unlockedPoints = this.getUnlockedPoints();

    // Summary
    console.log(boxen(
      `Points: ${chalk.bold.green(unlockedPoints)} / ${totalPoints}\n` +
      `Unlocked: ${chalk.bold(this.unlockedAchievements.size)} / ${this.achievements.size}\n` +
      `Completion: ${chalk.bold(Math.round((this.unlockedAchievements.size / this.achievements.size) * 100) + '%')}`,
      {
        padding: 1,
        borderStyle: 'single',
        borderColor: 'cyan'
      }
    ));

    // Achievements by category
    categories.forEach(category => {
      const categoryAchievements = Array.from(this.achievements.values())
        .filter(a => a.category === category);

      if (categoryAchievements.length === 0) return;

      console.log(`\n${chalk.bold(this.getCategoryTitle(category))}\n`);

      categoryAchievements.forEach(achievement => {
        this.displayAchievement(achievement);
      });
    });
  }

  /**
   * Display single achievement
   */
  private displayAchievement(achievement: Achievement): void {
    const unlocked = achievement.unlocked || this.unlockedAchievements.has(achievement.id);
    const icon = unlocked ? achievement.icon : '🔒';
    const name = unlocked ? chalk.bold(achievement.name) : chalk.dim(achievement.name);
    const description = unlocked ? achievement.description : chalk.dim(achievement.description);
    const points = chalk.green(`${achievement.points}pts`);

    let progressBar = '';
    if (achievement.maxProgress && !unlocked) {
      const progress = achievement.progress || 0;
      const percentage = Math.round((progress / achievement.maxProgress) * 100);
      const barLength = 20;
      const filled = Math.round((progress / achievement.maxProgress) * barLength);
      const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);
      progressBar = `\n     ${chalk.cyan(bar)} ${percentage}% (${progress}/${achievement.maxProgress})`;
    }

    console.log(`  ${icon} ${name} ${points}`);
    console.log(`     ${description}${progressBar}`);

    if (unlocked && achievement.unlockedAt) {
      console.log(chalk.dim(`     Unlocked: ${achievement.unlockedAt.toLocaleDateString()}`));
    }

    console.log();
  }

  /**
   * Get category title
   */
  private getCategoryTitle(category: string): string {
    const titles: Record<string, string> = {
      usage: '📊 Usage',
      milestone: '🎯 Milestones',
      special: '⭐ Special',
      hidden: '🔮 Hidden'
    };
    return titles[category] || category;
  }

  /**
   * Get total possible points
   */
  getTotalPoints(): number {
    return Array.from(this.achievements.values())
      .reduce((sum, a) => sum + a.points, 0);
  }

  /**
   * Get unlocked points
   */
  getUnlockedPoints(): number {
    return Array.from(this.achievements.values())
      .filter(a => a.unlocked || this.unlockedAchievements.has(a.id))
      .reduce((sum, a) => sum + a.points, 0);
  }

  /**
   * Update user stats
   */
  updateStats(updates: Partial<UserStats>): void {
    this.userStats = { ...this.userStats, ...updates };
    this.saveUserStats();

    // Check for new achievements
    const newAchievements = this.checkAchievements();

    // Show subtle notification for new achievements
    if (newAchievements.length > 0 && !this.stateManager.getPreferences().expertMode) {
      newAchievements.forEach(achievement => {
        console.log(chalk.yellow(`\n🎉 Achievement unlocked: ${achievement.name}!`));
      });
    }
  }

  /**
   * Get leaderboard position
   */
  getLeaderboardPosition(): number {
    // Simulated leaderboard position
    const points = this.getUnlockedPoints();
    if (points > 1000) return 1;
    if (points > 500) return Math.floor(Math.random() * 10) + 2;
    if (points > 100) return Math.floor(Math.random() * 50) + 11;
    return Math.floor(Math.random() * 900) + 101;
  }

  /**
   * Load user stats from storage
   */
  private loadUserStats(): UserStats {
    // Would load from storage
    return {
      totalMemories: 0,
      totalSearches: 0,
      totalTopics: 0,
      totalApiCalls: 0,
      daysActive: 0,
      longestStreak: 0,
      currentStreak: 0,
      powerModeUsage: 0,
      memoriesCreatedToday: 0,
      searchAccuracy: 0
    };
  }

  /**
   * Save user stats to storage
   */
  private saveUserStats(): void {
    // Would save to storage
  }

  /**
   * Load unlocked achievements from storage
   */
  private loadUnlockedAchievements(): void {
    // Would load from storage
  }

  /**
   * Save unlocked achievements to storage
   */
  private saveUnlockedAchievements(): void {
    // Would save to storage
  }
}

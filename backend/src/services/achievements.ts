import { v4 as uuidv4 } from 'uuid';
import { logger } from './logger';
import { EventEmitter } from 'events';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'creation' | 'mastery' | 'social' | 'monetization' | 'exploration' | 'special';
  type: 'progress' | 'single' | 'incremental' | 'streak';
  difficulty: 'bronze' | 'silver' | 'gold' | 'platinum' | 'legendary';
  isSecret: boolean;
  requirements: AchievementRequirement[];
  rewards: AchievementReward[];
  targetValue?: number; // для progress и incremental типов
  currentValue?: number; // текущий прогресс пользователя
  unlockConditions?: string[]; // условия для разблокировки секретных достижений
  expiresAt?: Date; // для временных достижений
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AchievementRequirement {
  type: 'games_created' | 'ai_usage' | 'login_streak' | 'purchase_made' | 'time_spent' | 'feature_used' | 'social_action' | 'custom';
  value: number;
  timeframe?: 'daily' | 'weekly' | 'monthly' | 'all_time';
  conditions?: Record<string, any>;
}

export interface AchievementReward {
  type: 'badge' | 'points' | 'currency' | 'feature_unlock' | 'discount' | 'premium_time' | 'cosmetic';
  value: number | string;
  description: string;
}

export interface UserAchievement {
  id: string;
  userId: string;
  achievementId: string;
  progress: number;
  isUnlocked: boolean;
  unlockedAt?: Date;
  currentStreak?: number;
  lastProgressUpdate: Date;
  metadata?: Record<string, any>;
}

export interface AchievementNotification {
  id: string;
  userId: string;
  achievementId: string;
  type: 'progress' | 'unlocked' | 'milestone';
  title: string;
  message: string;
  progress?: number;
  isRead: boolean;
  createdAt: Date;
  expiresAt?: Date;
}

export interface UserStats {
  userId: string;
  totalPoints: number;
  achievementsUnlocked: number;
  currentStreak: number;
  longestStreak: number;
  favoriteCategory: string;
  lastActivityDate: Date;
  lifetimeStats: {
    gamesCreated: number;
    aiRequestsMade: number;
    timeSpentMinutes: number;
    loginDays: number;
    socialShares: number;
    purchasesMade: number;
    featuresUsed: Set<string>;
  };
}

class AchievementsService extends EventEmitter {
  private achievements: Map<string, Achievement> = new Map();
  private userAchievements: Map<string, Map<string, UserAchievement>> = new Map();
  private userStats: Map<string, UserStats> = new Map();
  private notifications: Map<string, AchievementNotification[]> = new Map();

  constructor() {
    super();
    this.initializeDefaultAchievements();
  }

  // Инициализация достижений по умолчанию
  private initializeDefaultAchievements(): void {
    const defaultAchievements: Achievement[] = [
      // Достижения создания
      {
        id: 'first_game',
        title: 'Первые шаги',
        description: 'Создайте свою первую игру',
        icon: '👶',
        category: 'creation',
        type: 'single',
        difficulty: 'bronze',
        isSecret: false,
        requirements: [
          { type: 'games_created', value: 1 }
        ],
        rewards: [
          { type: 'points', value: 100, description: '100 очков опыта' },
          { type: 'badge', value: 'first_game', description: 'Значок "Первая игра"' }
        ],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'game_creator_bronze',
        title: 'Начинающий создатель',
        description: 'Создайте 5 игр',
        icon: '🥉',
        category: 'creation',
        type: 'progress',
        difficulty: 'bronze',
        isSecret: false,
        targetValue: 5,
        requirements: [
          { type: 'games_created', value: 5 }
        ],
        rewards: [
          { type: 'points', value: 500, description: '500 очков опыта' },
          { type: 'feature_unlock', value: 'advanced_templates', description: 'Расширенные шаблоны' }
        ],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'game_creator_silver',
        title: 'Опытный создатель',
        description: 'Создайте 25 игр',
        icon: '🥈',
        category: 'creation',
        type: 'progress',
        difficulty: 'silver',
        isSecret: false,
        targetValue: 25,
        requirements: [
          { type: 'games_created', value: 25 }
        ],
        rewards: [
          { type: 'points', value: 1500, description: '1500 очков опыта' },
          { type: 'discount', value: 20, description: '20% скидка на премиум' }
        ],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'game_creator_gold',
        title: 'Мастер игр',
        description: 'Создайте 100 игр',
        icon: '🥇',
        category: 'creation',
        type: 'progress',
        difficulty: 'gold',
        isSecret: false,
        targetValue: 100,
        requirements: [
          { type: 'games_created', value: 100 }
        ],
        rewards: [
          { type: 'points', value: 5000, description: '5000 очков опыта' },
          { type: 'premium_time', value: 30, description: '30 дней премиум бесплатно' }
        ],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // Достижения мастерства
      {
        id: 'ai_novice',
        title: 'AI Новичок',
        description: 'Используйте AI помощник 10 раз',
        icon: '🤖',
        category: 'mastery',
        type: 'progress',
        difficulty: 'bronze',
        isSecret: false,
        targetValue: 10,
        requirements: [
          { type: 'ai_usage', value: 10 }
        ],
        rewards: [
          { type: 'points', value: 300, description: '300 очков опыта' }
        ],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'ai_master',
        title: 'AI Мастер',
        description: 'Используйте AI помощник 500 раз',
        icon: '🧠',
        category: 'mastery',
        type: 'progress',
        difficulty: 'gold',
        isSecret: false,
        targetValue: 500,
        requirements: [
          { type: 'ai_usage', value: 500 }
        ],
        rewards: [
          { type: 'points', value: 2000, description: '2000 очков опыта' },
          { type: 'feature_unlock', value: 'advanced_ai', description: 'Продвинутые AI функции' }
        ],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // Социальные достижения
      {
        id: 'social_butterfly',
        title: 'Социальная бабочка',
        description: 'Поделитесь 5 играми в социальных сетях',
        icon: '🦋',
        category: 'social',
        type: 'progress',
        difficulty: 'silver',
        isSecret: false,
        targetValue: 5,
        requirements: [
          { type: 'social_action', value: 5, conditions: { action: 'share' } }
        ],
        rewards: [
          { type: 'points', value: 1000, description: '1000 очков опыта' },
          { type: 'cosmetic', value: 'social_badge', description: 'Социальный значок' }
        ],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // Достижения монетизации
      {
        id: 'first_purchase',
        title: 'Первая покупка',
        description: 'Совершите первую покупку',
        icon: '💳',
        category: 'monetization',
        type: 'single',
        difficulty: 'silver',
        isSecret: false,
        requirements: [
          { type: 'purchase_made', value: 1 }
        ],
        rewards: [
          { type: 'points', value: 1000, description: '1000 очков опыта' },
          { type: 'currency', value: 500, description: '500 внутриигровых монет' }
        ],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // Достижения активности
      {
        id: 'daily_user',
        title: 'Ежедневный пользователь',
        description: 'Заходите в приложение 7 дней подряд',
        icon: '📅',
        category: 'exploration',
        type: 'streak',
        difficulty: 'bronze',
        isSecret: false,
        targetValue: 7,
        requirements: [
          { type: 'login_streak', value: 7 }
        ],
        rewards: [
          { type: 'points', value: 700, description: '700 очков опыта' }
        ],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'dedicated_user',
        title: 'Преданный пользователь',
        description: 'Заходите в приложение 30 дней подряд',
        icon: '🔥',
        category: 'exploration',
        type: 'streak',
        difficulty: 'gold',
        isSecret: false,
        targetValue: 30,
        requirements: [
          { type: 'login_streak', value: 30 }
        ],
        rewards: [
          { type: 'points', value: 3000, description: '3000 очков опыта' },
          { type: 'premium_time', value: 7, description: '7 дней премиум бесплатно' }
        ],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // Секретные достижения
      {
        id: 'night_owl',
        title: 'Полуночник',
        description: 'Создайте игру между 00:00 и 05:00',
        icon: '🦉',
        category: 'special',
        type: 'single',
        difficulty: 'silver',
        isSecret: true,
        requirements: [
          { type: 'custom', value: 1, conditions: { timeRange: '00:00-05:00', action: 'create_game' } }
        ],
        rewards: [
          { type: 'points', value: 1500, description: '1500 очков опыта' },
          { type: 'cosmetic', value: 'night_theme', description: 'Ночная тема интерфейса' }
        ],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'speed_demon',
        title: 'Демон скорости',
        description: 'Создайте игру менее чем за 1 минуту',
        icon: '⚡',
        category: 'special',
        type: 'single',
        difficulty: 'platinum',
        isSecret: true,
        requirements: [
          { type: 'custom', value: 1, conditions: { maxTime: 60, action: 'create_game' } }
        ],
        rewards: [
          { type: 'points', value: 2500, description: '2500 очков опыта' },
          { type: 'badge', value: 'speed_demon', description: 'Значок "Демон скорости"' }
        ],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    defaultAchievements.forEach(achievement => {
      this.achievements.set(achievement.id, achievement);
    });
  }

  // Получение пользовательской статистики
  private getUserStats(userId: string): UserStats {
    if (!this.userStats.has(userId)) {
      this.userStats.set(userId, {
        userId,
        totalPoints: 0,
        achievementsUnlocked: 0,
        currentStreak: 0,
        longestStreak: 0,
        favoriteCategory: 'creation',
        lastActivityDate: new Date(),
        lifetimeStats: {
          gamesCreated: 0,
          aiRequestsMade: 0,
          timeSpentMinutes: 0,
          loginDays: 0,
          socialShares: 0,
          purchasesMade: 0,
          featuresUsed: new Set()
        }
      });
    }
    return this.userStats.get(userId)!;
  }

  // Получение пользовательских достижений
  private getUserAchievements(userId: string): Map<string, UserAchievement> {
    if (!this.userAchievements.has(userId)) {
      this.userAchievements.set(userId, new Map());
      
      // Инициализируем все достижения для пользователя
      this.achievements.forEach((achievement, achievementId) => {
        const userAchievement: UserAchievement = {
          id: uuidv4(),
          userId,
          achievementId,
          progress: 0,
          isUnlocked: false,
          currentStreak: 0,
          lastProgressUpdate: new Date(),
          metadata: {}
        };
        this.userAchievements.get(userId)!.set(achievementId, userAchievement);
      });
    }
    return this.userAchievements.get(userId)!;
  }

  // Обновление статистики пользователя
  updateUserStats(userId: string, statType: keyof UserStats['lifetimeStats'], value: number = 1, metadata?: Record<string, any>): void {
    const stats = this.getUserStats(userId);
    stats.lastActivityDate = new Date();

    if (statType === 'featuresUsed' && metadata?.feature) {
      stats.lifetimeStats.featuresUsed.add(metadata.feature);
    } else if (typeof stats.lifetimeStats[statType] === 'number') {
      (stats.lifetimeStats[statType] as number) += value;
    }

    this.checkAchievements(userId, statType, stats.lifetimeStats[statType], metadata);
  }

  // Проверка достижений
  private checkAchievements(userId: string, triggerType: string, currentValue: any, metadata?: Record<string, any>): void {
    const userAchievements = this.getUserAchievements(userId);
    const stats = this.getUserStats(userId);

    this.achievements.forEach((achievement, achievementId) => {
      const userAchievement = userAchievements.get(achievementId);
      if (!userAchievement || userAchievement.isUnlocked) return;

      let shouldUpdate = false;
      let newProgress = userAchievement.progress;

      achievement.requirements.forEach(requirement => {
        if (this.checkRequirement(requirement, triggerType, currentValue, stats, metadata)) {
          shouldUpdate = true;
          
          if (achievement.type === 'single') {
            newProgress = 1;
          } else if (achievement.type === 'progress' || achievement.type === 'incremental') {
            newProgress = Math.min(requirement.value, achievement.targetValue || requirement.value);
          } else if (achievement.type === 'streak') {
            if (triggerType === 'loginDays') {
              userAchievement.currentStreak = this.calculateLoginStreak(userId);
              newProgress = userAchievement.currentStreak;
            }
          }
        }
      });

      if (shouldUpdate && newProgress > userAchievement.progress) {
        this.updateAchievementProgress(userId, achievementId, newProgress, metadata);
      }
    });
  }

  // Проверка выполнения требования
  private checkRequirement(requirement: AchievementRequirement, triggerType: string, currentValue: any, stats: UserStats, metadata?: Record<string, any>): boolean {
    const typeMap: Record<string, string> = {
      'gamesCreated': 'games_created',
      'aiRequestsMade': 'ai_usage',
      'loginDays': 'login_streak',
      'purchasesMade': 'purchase_made',
      'timeSpentMinutes': 'time_spent',
      'socialShares': 'social_action'
    };

    if (typeMap[triggerType] !== requirement.type) return false;

    // Проверка временных рамок
    if (requirement.timeframe && requirement.timeframe !== 'all_time') {
      // Здесь можно добавить логику для проверки временных рамок
      // Пока используем простую проверку
    }

    // Проверка условий
    if (requirement.conditions) {
      if (requirement.conditions.action && metadata?.action !== requirement.conditions.action) {
        return false;
      }
      
      if (requirement.conditions.timeRange && metadata?.timeRange !== requirement.conditions.timeRange) {
        return false;
      }
      
      if (requirement.conditions.maxTime && metadata?.duration && metadata.duration > requirement.conditions.maxTime) {
        return false;
      }
    }

    return typeof currentValue === 'number' ? currentValue >= requirement.value : false;
  }

  // Расчет серии входов
  private calculateLoginStreak(userId: string): number {
    // Простая реализация - в реальном приложении здесь была бы более сложная логика
    const stats = this.getUserStats(userId);
    const today = new Date();
    const lastActivity = stats.lastActivityDate;
    const daysDiff = Math.floor((today.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff <= 1) {
      stats.currentStreak += 1;
      stats.longestStreak = Math.max(stats.longestStreak, stats.currentStreak);
    } else {
      stats.currentStreak = 1;
    }
    
    return stats.currentStreak;
  }

  // Обновление прогресса достижения
  private updateAchievementProgress(userId: string, achievementId: string, newProgress: number, metadata?: Record<string, any>): void {
    const userAchievements = this.getUserAchievements(userId);
    const userAchievement = userAchievements.get(achievementId);
    const achievement = this.achievements.get(achievementId);
    
    if (!userAchievement || !achievement) return;

    const oldProgress = userAchievement.progress;
    userAchievement.progress = newProgress;
    userAchievement.lastProgressUpdate = new Date();
    
    if (metadata) {
      userAchievement.metadata = { ...userAchievement.metadata, ...metadata };
    }

    // Создаем уведомление о прогрессе
    if (newProgress > oldProgress && !userAchievement.isUnlocked) {
      this.createProgressNotification(userId, achievement, userAchievement);
    }

    // Проверяем разблокировку
    const targetValue = achievement.targetValue || achievement.requirements[0]?.value || 1;
    if (newProgress >= targetValue && !userAchievement.isUnlocked) {
      this.unlockAchievement(userId, achievementId);
    }

    logger.info(`Achievement progress updated: ${achievementId} for user ${userId} - ${newProgress}/${targetValue}`);
  }

  // Разблокировка достижения
  private unlockAchievement(userId: string, achievementId: string): void {
    const userAchievements = this.getUserAchievements(userId);
    const userAchievement = userAchievements.get(achievementId);
    const achievement = this.achievements.get(achievementId);
    const stats = this.getUserStats(userId);
    
    if (!userAchievement || !achievement || userAchievement.isUnlocked) return;

    userAchievement.isUnlocked = true;
    userAchievement.unlockedAt = new Date();
    stats.achievementsUnlocked += 1;

    // Выдаем награды
    achievement.rewards.forEach(reward => {
      this.grantReward(userId, reward);
    });

    // Создаем уведомление о разблокировке
    this.createUnlockNotification(userId, achievement);

    // Эмитируем событие
    this.emit('achievementUnlocked', {
      userId,
      achievementId,
      achievement,
      userAchievement
    });

    logger.info(`Achievement unlocked: ${achievementId} for user ${userId}`);
  }

  // Выдача награды
  private grantReward(userId: string, reward: AchievementReward): void {
    const stats = this.getUserStats(userId);
    
    switch (reward.type) {
      case 'points':
        stats.totalPoints += Number(reward.value);
        break;
      case 'currency':
        // Здесь была бы логика начисления внутриигровой валюты
        break;
      case 'premium_time':
        // Здесь была бы логика начисления премиум времени
        break;
      case 'feature_unlock':
        // Здесь была бы логика разблокировки функций
        break;
      case 'discount':
        // Здесь была бы логика создания скидки
        break;
    }
  }

  // Создание уведомления о прогрессе
  private createProgressNotification(userId: string, achievement: Achievement, userAchievement: UserAchievement): void {
    if (!this.notifications.has(userId)) {
      this.notifications.set(userId, []);
    }

    const targetValue = achievement.targetValue || achievement.requirements[0]?.value || 1;
    const progressPercent = Math.round((userAchievement.progress / targetValue) * 100);

    // Уведомляем только при значимых этапах (25%, 50%, 75%, 90%)
    const milestones = [25, 50, 75, 90];
    const currentMilestone = milestones.find(m => progressPercent >= m && progressPercent < m + 10);
    
    if (currentMilestone) {
      const notification: AchievementNotification = {
        id: uuidv4(),
        userId,
        achievementId: achievement.id,
        type: 'progress',
        title: `${achievement.icon} ${progressPercent}% прогресса`,
        message: `"${achievement.title}" - ${userAchievement.progress}/${targetValue}`,
        progress: progressPercent,
        isRead: false,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 дней
      };

      this.notifications.get(userId)!.push(notification);
      this.emit('notification', notification);
    }
  }

  // Создание уведомления о разблокировке
  private createUnlockNotification(userId: string, achievement: Achievement): void {
    if (!this.notifications.has(userId)) {
      this.notifications.set(userId, []);
    }

    const notification: AchievementNotification = {
      id: uuidv4(),
      userId,
      achievementId: achievement.id,
      type: 'unlocked',
      title: `🎉 Достижение разблокировано!`,
      message: `"${achievement.title}" - ${achievement.description}`,
      isRead: false,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 дней
    };

    this.notifications.get(userId)!.push(notification);
    this.emit('notification', notification);
  }

  // API методы
  getAllAchievements(): Achievement[] {
    return Array.from(this.achievements.values())
      .filter(achievement => achievement.isActive)
      .sort((a, b) => {
        const difficultyOrder = { bronze: 1, silver: 2, gold: 3, platinum: 4, legendary: 5 };
        return difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
      });
  }

  getUserAchievementsList(userId: string, includeSecret: boolean = false): Array<Achievement & { userProgress: UserAchievement }> {
    const userAchievements = this.getUserAchievements(userId);
    
    return Array.from(this.achievements.values())
      .filter(achievement => achievement.isActive && (includeSecret || !achievement.isSecret || userAchievements.get(achievement.id)?.isUnlocked))
      .map(achievement => ({
        ...achievement,
        userProgress: userAchievements.get(achievement.id)!
      }))
      .sort((a, b) => {
        // Сортировка: разблокированные сначала, затем по прогрессу, затем по сложности
        if (a.userProgress.isUnlocked !== b.userProgress.isUnlocked) {
          return a.userProgress.isUnlocked ? -1 : 1;
        }
        if (a.userProgress.progress !== b.userProgress.progress) {
          return b.userProgress.progress - a.userProgress.progress;
        }
        const difficultyOrder = { bronze: 1, silver: 2, gold: 3, platinum: 4, legendary: 5 };
        return difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
      });
  }

  getUserStats(userId: string): UserStats {
    return this.getUserStats(userId);
  }

  getUserNotifications(userId: string, unreadOnly: boolean = false): AchievementNotification[] {
    const notifications = this.notifications.get(userId) || [];
    const now = new Date();
    
    return notifications
      .filter(notification => {
        const isValid = !notification.expiresAt || notification.expiresAt > now;
        const isUnread = !unreadOnly || !notification.isRead;
        return isValid && isUnread;
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  markNotificationAsRead(userId: string, notificationId: string): boolean {
    const notifications = this.notifications.get(userId) || [];
    const notification = notifications.find(n => n.id === notificationId);
    
    if (notification) {
      notification.isRead = true;
      return true;
    }
    
    return false;
  }

  markAllNotificationsAsRead(userId: string): number {
    const notifications = this.notifications.get(userId) || [];
    let marked = 0;
    
    notifications.forEach(notification => {
      if (!notification.isRead) {
        notification.isRead = true;
        marked++;
      }
    });
    
    return marked;
  }

  // Активация события (вызывается из других частей приложения)
  triggerEvent(userId: string, eventType: string, value: number = 1, metadata?: Record<string, any>): void {
    switch (eventType) {
      case 'game_created':
        this.updateUserStats(userId, 'gamesCreated', value, metadata);
        break;
      case 'ai_request':
        this.updateUserStats(userId, 'aiRequestsMade', value, metadata);
        break;
      case 'user_login':
        this.updateUserStats(userId, 'loginDays', 1, metadata);
        break;
      case 'purchase_made':
        this.updateUserStats(userId, 'purchasesMade', value, metadata);
        break;
      case 'social_share':
        this.updateUserStats(userId, 'socialShares', value, metadata);
        break;
      case 'feature_used':
        this.updateUserStats(userId, 'featuresUsed', 1, metadata);
        break;
      case 'time_spent':
        this.updateUserStats(userId, 'timeSpentMinutes', value, metadata);
        break;
    }
  }

  // Получение статистики системы достижений
  getAchievementSystemStats(): {
    totalAchievements: number;
    achievementsByCategory: Record<string, number>;
    achievementsByDifficulty: Record<string, number>;
    averageUnlockRate: number;
    mostPopularAchievements: Array<{ achievementId: string; unlockCount: number }>;
  } {
    const achievements = Array.from(this.achievements.values());
    const totalAchievements = achievements.length;
    
    const achievementsByCategory = achievements.reduce((acc, achievement) => {
      acc[achievement.category] = (acc[achievement.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const achievementsByDifficulty = achievements.reduce((acc, achievement) => {
      acc[achievement.difficulty] = (acc[achievement.difficulty] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Подсчет популярности достижений
    const unlockCounts = new Map<string, number>();
    this.userAchievements.forEach(userAchievements => {
      userAchievements.forEach((userAchievement, achievementId) => {
        if (userAchievement.isUnlocked) {
          unlockCounts.set(achievementId, (unlockCounts.get(achievementId) || 0) + 1);
        }
      });
    });
    
    const mostPopularAchievements = Array.from(unlockCounts.entries())
      .map(([achievementId, unlockCount]) => ({ achievementId, unlockCount }))
      .sort((a, b) => b.unlockCount - a.unlockCount)
      .slice(0, 10);
    
    const totalUsers = this.userStats.size;
    const totalUnlocks = Array.from(unlockCounts.values()).reduce((sum, count) => sum + count, 0);
    const averageUnlockRate = totalUsers > 0 ? totalUnlocks / (totalUsers * totalAchievements) : 0;
    
    return {
      totalAchievements,
      achievementsByCategory,
      achievementsByDifficulty,
      averageUnlockRate,
      mostPopularAchievements
    };
  }
}

export const achievementsService = new AchievementsService(); 
import { v4 as uuidv4 } from 'uuid';
import { logger } from './logger';
import { EventEmitter } from 'events';

export interface LeaderboardEntry {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  avatar?: string;
  score: number;
  rank: number;
  previousRank?: number;
  change: 'up' | 'down' | 'same' | 'new';
  metadata: {
    gamesPlayed: number;
    achievementsUnlocked: number;
    totalPlayTime: number;
    averageScore: number;
    bestStreak: number;
    level: number;
    region?: string;
    badge?: string;
    joinDate: Date;
    lastActivity: Date;
  };
  socialData?: {
    isFriend: boolean;
    mutualFriends: number;
    isOnline: boolean;
    status?: 'playing' | 'idle' | 'offline';
  };
}

export interface LeaderboardConfig {
  id: string;
  name: string;
  description: string;
  type: 'score' | 'achievements' | 'time' | 'games_created' | 'custom';
  category?: 'arcade' | 'puzzle' | 'strategy' | 'action' | 'all';
  period: 'daily' | 'weekly' | 'monthly' | 'all_time';
  maxEntries: number;
  updateFrequency: 'real_time' | 'hourly' | 'daily';
  isActive: boolean;
  yandexBoardId?: string; // ID в Yandex Games
  resetSchedule?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    dayOfWeek?: number; // 0-6 для weekly
    dayOfMonth?: number; // 1-31 для monthly
    hour: number; // 0-23
  };
  rewards: {
    position: number;
    reward: {
      type: 'points' | 'currency' | 'achievement' | 'badge' | 'premium_time';
      value: number | string;
      description: string;
    };
  }[];
}

export interface LeaderboardFilter {
  category?: string;
  period?: string;
  region?: string;
  friendsOnly?: boolean;
  minLevel?: number;
  maxLevel?: number;
  onlineOnly?: boolean;
  search?: string;
}

export interface LeaderboardStats {
  totalPlayers: number;
  averageScore: number;
  topScore: number;
  yourRank?: number;
  yourScore?: number;
  percentile?: number;
  participationRate: number;
  lastUpdated: Date;
}

export interface SocialFeatures {
  canChallenge: boolean;
  canAddFriend: boolean;
  canViewProfile: boolean;
  sharedAchievements: string[];
  competitionHistory: {
    wins: number;
    losses: number;
    draws: number;
  };
}

class LeaderboardsService extends EventEmitter {
  private leaderboards: Map<string, LeaderboardEntry[]> = new Map();
  private configs: Map<string, LeaderboardConfig> = new Map();
  private cache: Map<string, { data: any; expiry: number }> = new Map();
  private updateTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    super();
    this.initializeDefaultLeaderboards();
    this.setupUpdateSchedules();
  }

  // Инициализация лидербордов по умолчанию
  private initializeDefaultLeaderboards(): void {
    const defaultConfigs: LeaderboardConfig[] = [
      {
        id: 'global_score',
        name: 'Глобальный рейтинг',
        description: 'Лучшие игроки по общему счету',
        type: 'score',
        period: 'all_time',
        maxEntries: 100,
        updateFrequency: 'real_time',
        isActive: true,
        yandexBoardId: 'global_leaderboard',
        rewards: [
          { position: 1, reward: { type: 'badge', value: 'champion', description: 'Значок чемпиона' } },
          { position: 2, reward: { type: 'badge', value: 'silver_medal', description: 'Серебряная медаль' } },
          { position: 3, reward: { type: 'badge', value: 'bronze_medal', description: 'Бронзовая медаль' } },
          { position: 10, reward: { type: 'points', value: 1000, description: '1000 очков' } }
        ]
      },
      {
        id: 'weekly_achievements',
        name: 'Недельные достижения',
        description: 'Больше всего достижений за неделю',
        type: 'achievements',
        period: 'weekly',
        maxEntries: 50,
        updateFrequency: 'hourly',
        isActive: true,
        resetSchedule: {
          frequency: 'weekly',
          dayOfWeek: 1, // Понедельник
          hour: 0
        },
        rewards: [
          { position: 1, reward: { type: 'premium_time', value: 7, description: '7 дней премиум' } },
          { position: 5, reward: { type: 'currency', value: 500, description: '500 монет' } }
        ]
      },
      {
        id: 'arcade_masters',
        name: 'Мастера аркады',
        description: 'Лучшие в аркадных играх',
        type: 'score',
        category: 'arcade',
        period: 'monthly',
        maxEntries: 25,
        updateFrequency: 'daily',
        isActive: true,
        yandexBoardId: 'arcade_monthly',
        resetSchedule: {
          frequency: 'monthly',
          dayOfMonth: 1,
          hour: 0
        },
        rewards: [
          { position: 1, reward: { type: 'achievement', value: 'arcade_champion', description: 'Достижение "Чемпион аркады"' } }
        ]
      },
      {
        id: 'puzzle_speedrun',
        name: 'Спидран головоломок',
        description: 'Самые быстрые решения головоломок',
        type: 'time',
        category: 'puzzle',
        period: 'daily',
        maxEntries: 20,
        updateFrequency: 'real_time',
        isActive: true,
        resetSchedule: {
          frequency: 'daily',
          hour: 0
        },
        rewards: [
          { position: 1, reward: { type: 'badge', value: 'speed_demon', description: 'Значок "Демон скорости"' } }
        ]
      },
      {
        id: 'creators_leaderboard',
        name: 'Топ создателей',
        description: 'Самые активные создатели игр',
        type: 'games_created',
        period: 'all_time',
        maxEntries: 30,
        updateFrequency: 'hourly',
        isActive: true,
        rewards: [
          { position: 1, reward: { type: 'badge', value: 'master_creator', description: 'Значок "Мастер-создатель"' } },
          { position: 3, reward: { type: 'points', value: 2000, description: '2000 очков' } }
        ]
      }
    ];

    defaultConfigs.forEach(config => {
      this.configs.set(config.id, config);
      this.leaderboards.set(config.id, []);
    });

    // Инициализируем тестовые данные
    this.initializeSampleData();
  }

  // Инициализация тестовых данных
  private initializeSampleData(): void {
    const samplePlayers = [
      {
        userId: 'user1', username: 'GameMaster2024', displayName: 'Игровой Мастер',
        score: 15450, gamesPlayed: 85, achievementsUnlocked: 42, level: 15, region: 'RU'
      },
      {
        userId: 'user2', username: 'PuzzlePro', displayName: 'Профи головоломок',
        score: 14200, gamesPlayed: 67, achievementsUnlocked: 38, level: 14, region: 'RU'
      },
      {
        userId: 'user3', username: 'SpeedRunner', displayName: 'Скоростной игрок',
        score: 13800, gamesPlayed: 156, achievementsUnlocked: 29, level: 12, region: 'UA'
      },
      {
        userId: 'user4', username: 'StrategyKing', displayName: 'Король стратегий',
        score: 13200, gamesPlayed: 94, achievementsUnlocked: 45, level: 16, region: 'RU'
      },
      {
        userId: 'user5', username: 'ArcadeAce', displayName: 'Ас аркад',
        score: 12900, gamesPlayed: 134, achievementsUnlocked: 33, level: 13, region: 'BY'
      },
      {
        userId: 'user6', username: 'CreativeMind', displayName: 'Творческий ум',
        score: 12500, gamesPlayed: 45, achievementsUnlocked: 51, level: 18, region: 'RU'
      }
    ];

    this.configs.forEach((config, leaderboardId) => {
      const entries = samplePlayers.map((player, index) => {
        let score = player.score;
        
        // Адаптируем счет в зависимости от типа лидерборда
        if (config.type === 'achievements') {
          score = player.achievementsUnlocked;
        } else if (config.type === 'games_created') {
          score = Math.floor(player.gamesPlayed / 3); // Примерно треть от сыгранных
        } else if (config.type === 'time') {
          score = Math.floor(Math.random() * 300) + 30; // Время в секундах (30-330)
        }

        const entry: LeaderboardEntry = {
          id: uuidv4(),
          userId: player.userId,
          username: player.username,
          displayName: player.displayName,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.username}`,
          score,
          rank: index + 1,
          change: index === 0 ? 'new' : Math.random() > 0.5 ? 'up' : 'down',
          metadata: {
            gamesPlayed: player.gamesPlayed,
            achievementsUnlocked: player.achievementsUnlocked,
            totalPlayTime: player.gamesPlayed * 25 + Math.floor(Math.random() * 500),
            averageScore: Math.floor(player.score / Math.max(1, player.gamesPlayed)),
            bestStreak: Math.floor(Math.random() * 20) + 1,
            level: player.level,
            region: player.region,
            badge: index < 3 ? ['champion', 'expert', 'rising_star'][index] : undefined,
            joinDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
            lastActivity: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
          },
          socialData: {
            isFriend: Math.random() > 0.7,
            mutualFriends: Math.floor(Math.random() * 15),
            isOnline: Math.random() > 0.6,
            status: Math.random() > 0.3 ? 'playing' : Math.random() > 0.5 ? 'idle' : 'offline'
          }
        };

        return entry;
      });

      // Сортируем по счету (для времени - по возрастанию, для остальных - по убыванию)
      entries.sort((a, b) => {
        if (config.type === 'time') {
          return a.score - b.score; // Меньше время = лучше
        }
        return b.score - a.score; // Больше счет = лучше
      });

      // Обновляем ранги
      entries.forEach((entry, index) => {
        entry.rank = index + 1;
      });

      this.leaderboards.set(leaderboardId, entries);
    });
  }

  // Настройка расписаний обновления
  private setupUpdateSchedules(): void {
    this.configs.forEach((config, leaderboardId) => {
      if (config.resetSchedule) {
        this.scheduleLeaderboardReset(leaderboardId, config.resetSchedule);
      }
    });

    // Очистка кэша каждые 5 минут
    setInterval(() => {
      this.cleanExpiredCache();
    }, 5 * 60 * 1000);
  }

  // Планирование сброса лидерборда
  private scheduleLeaderboardReset(leaderboardId: string, schedule: LeaderboardConfig['resetSchedule']): void {
    if (!schedule) return;

    const now = new Date();
    let nextReset = new Date();

    switch (schedule.frequency) {
      case 'daily':
        nextReset.setHours(schedule.hour, 0, 0, 0);
        if (nextReset <= now) {
          nextReset.setDate(nextReset.getDate() + 1);
        }
        break;

      case 'weekly':
        nextReset.setHours(schedule.hour, 0, 0, 0);
        const currentDay = nextReset.getDay();
        const targetDay = schedule.dayOfWeek || 1;
        const daysUntilTarget = (targetDay - currentDay + 7) % 7;
        nextReset.setDate(nextReset.getDate() + daysUntilTarget);
        if (nextReset <= now && daysUntilTarget === 0) {
          nextReset.setDate(nextReset.getDate() + 7);
        }
        break;

      case 'monthly':
        nextReset.setDate(schedule.dayOfMonth || 1);
        nextReset.setHours(schedule.hour, 0, 0, 0);
        if (nextReset <= now) {
          nextReset.setMonth(nextReset.getMonth() + 1);
        }
        break;
    }

    const timeUntilReset = nextReset.getTime() - now.getTime();
    
    const timer = setTimeout(() => {
      this.resetLeaderboard(leaderboardId);
      this.scheduleLeaderboardReset(leaderboardId, schedule); // Перепланируем
    }, timeUntilReset);

    this.updateTimers.set(leaderboardId, timer);
    
    logger.info(`Scheduled reset for leaderboard ${leaderboardId} at ${nextReset.toISOString()}`);
  }

  // Сброс лидерборда
  private resetLeaderboard(leaderboardId: string): void {
    const config = this.configs.get(leaderboardId);
    if (!config) return;

    // Сохраняем историю (в реальном приложении - в базу данных)
    const currentEntries = this.leaderboards.get(leaderboardId) || [];
    
    // Выдаем награды топ игрокам
    this.distributeRewards(leaderboardId, currentEntries);
    
    // Очищаем лидерборд
    this.leaderboards.set(leaderboardId, []);
    
    // Очищаем кэш
    this.clearCacheForLeaderboard(leaderboardId);
    
    this.emit('leaderboardReset', {
      leaderboardId,
      config,
      previousEntries: currentEntries
    });

    logger.info(`Reset leaderboard: ${leaderboardId}`);
  }

  // Выдача наград
  private distributeRewards(leaderboardId: string, entries: LeaderboardEntry[]): void {
    const config = this.configs.get(leaderboardId);
    if (!config) return;

    config.rewards.forEach(({ position, reward }) => {
      const entry = entries.find(e => e.rank === position);
      if (entry) {
        this.emit('rewardEarned', {
          userId: entry.userId,
          leaderboardId,
          position,
          reward,
          entry
        });
        
        logger.info(`Reward distributed: ${reward.type} ${reward.value} to user ${entry.userId} for position ${position} in ${leaderboardId}`);
      }
    });
  }

  // Обновление счета игрока
  updatePlayerScore(userId: string, leaderboardId: string, score: number, metadata?: Partial<LeaderboardEntry['metadata']>): void {
    const config = this.configs.get(leaderboardId);
    if (!config || !config.isActive) return;

    let entries = this.leaderboards.get(leaderboardId) || [];
    let existingEntry = entries.find(e => e.userId === userId);

    if (existingEntry) {
      const oldRank = existingEntry.rank;
      existingEntry.score = score;
      if (metadata) {
        existingEntry.metadata = { ...existingEntry.metadata, ...metadata };
      }
      existingEntry.metadata.lastActivity = new Date();
    } else {
      // Создаем новую запись
      const newEntry: LeaderboardEntry = {
        id: uuidv4(),
        userId,
        username: `Player${userId.slice(-4)}`,
        displayName: `Игрок ${userId.slice(-4)}`,
        score,
        rank: entries.length + 1,
        change: 'new',
        metadata: {
          gamesPlayed: 1,
          achievementsUnlocked: 0,
          totalPlayTime: 0,
          averageScore: score,
          bestStreak: 1,
          level: 1,
          joinDate: new Date(),
          lastActivity: new Date(),
          ...metadata
        },
        socialData: {
          isFriend: false,
          mutualFriends: 0,
          isOnline: true,
          status: 'playing'
        }
      };

      entries.push(newEntry);
      existingEntry = newEntry;
    }

    // Пересортировка и обновление рангов
    this.recalculateRanks(leaderboardId);
    
    // Обновляем изменение ранга
    const newEntry = entries.find(e => e.userId === userId);
    if (newEntry && existingEntry.rank !== undefined) {
      const oldRank = existingEntry.rank;
      if (newEntry.rank < oldRank) {
        newEntry.change = 'up';
      } else if (newEntry.rank > oldRank) {
        newEntry.change = 'down';
      } else {
        newEntry.change = 'same';
      }
      newEntry.previousRank = oldRank;
    }

    // Синхронизация с Yandex Games
    this.syncWithYandexGames(leaderboardId, userId, score);

    // Очищаем кэш
    this.clearCacheForLeaderboard(leaderboardId);

    this.emit('scoreUpdated', {
      userId,
      leaderboardId,
      score,
      rank: newEntry?.rank,
      previousRank: existingEntry.previousRank
    });
  }

  // Пересчет рангов
  private recalculateRanks(leaderboardId: string): void {
    const config = this.configs.get(leaderboardId);
    const entries = this.leaderboards.get(leaderboardId);
    if (!config || !entries) return;

    // Сортировка
    entries.sort((a, b) => {
      if (config.type === 'time') {
        return a.score - b.score; // Меньше время = лучше
      }
      return b.score - a.score; // Больше счет = лучше
    });

    // Обновление рангов
    entries.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    // Ограничение количества записей
    if (entries.length > config.maxEntries) {
      this.leaderboards.set(leaderboardId, entries.slice(0, config.maxEntries));
    }
  }

  // Синхронизация с Yandex Games
  private async syncWithYandexGames(leaderboardId: string, userId: string, score: number): Promise<void> {
    const config = this.configs.get(leaderboardId);
    if (!config?.yandexBoardId) return;

    try {
      // В реальном приложении здесь была бы интеграция с Yandex Games SDK
      logger.info(`Syncing score ${score} for user ${userId} to Yandex leaderboard ${config.yandexBoardId}`);
      
      // Пример интеграции:
      // if (typeof window !== 'undefined' && window.YaGames) {
      //   await window.YaGames.getLeaderboards().then(lb => {
      //     return lb.setLeaderboardScore(config.yandexBoardId, score);
      //   });
      // }
    } catch (error) {
      logger.error(`Failed to sync with Yandex Games leaderboard: ${error}`);
    }
  }

  // Получение лидерборда с фильтрацией
  getLeaderboard(leaderboardId: string, filter: LeaderboardFilter = {}, userId?: string): {
    entries: LeaderboardEntry[];
    stats: LeaderboardStats;
    userEntry?: LeaderboardEntry;
    totalPages: number;
    currentPage: number;
  } {
    const cacheKey = `${leaderboardId}_${JSON.stringify(filter)}_${userId}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }

    const config = this.configs.get(leaderboardId);
    let entries = this.leaderboards.get(leaderboardId) || [];
    
    if (!config) {
      throw new Error(`Leaderboard ${leaderboardId} not found`);
    }

    // Применяем фильтры
    let filteredEntries = this.applyFilters(entries, filter);

    // Поиск пользователя
    const userEntry = userId ? filteredEntries.find(e => e.userId === userId) : undefined;

    // Статистика
    const stats: LeaderboardStats = {
      totalPlayers: filteredEntries.length,
      averageScore: filteredEntries.length > 0 
        ? filteredEntries.reduce((sum, e) => sum + e.score, 0) / filteredEntries.length 
        : 0,
      topScore: filteredEntries.length > 0 ? filteredEntries[0].score : 0,
      yourRank: userEntry?.rank,
      yourScore: userEntry?.score,
      percentile: userEntry 
        ? ((filteredEntries.length - userEntry.rank + 1) / filteredEntries.length) * 100 
        : undefined,
      participationRate: (filteredEntries.length / Math.max(config.maxEntries, 100)) * 100,
      lastUpdated: new Date()
    };

    // Пагинация (если нужна)
    const pageSize = 20;
    const totalPages = Math.ceil(filteredEntries.length / pageSize);
    const currentPage = 1; // В реальном приложении получать из параметров

    const result = {
      entries: filteredEntries.slice(0, pageSize),
      stats,
      userEntry,
      totalPages,
      currentPage
    };

    // Кэшируем результат
    this.cache.set(cacheKey, {
      data: result,
      expiry: Date.now() + (config.updateFrequency === 'real_time' ? 30000 : 300000) // 30s или 5min
    });

    return result;
  }

  // Применение фильтров
  private applyFilters(entries: LeaderboardEntry[], filter: LeaderboardFilter): LeaderboardEntry[] {
    let filtered = [...entries];

    if (filter.region) {
      filtered = filtered.filter(e => e.metadata.region === filter.region);
    }

    if (filter.friendsOnly) {
      filtered = filtered.filter(e => e.socialData?.isFriend);
    }

    if (filter.minLevel !== undefined) {
      filtered = filtered.filter(e => e.metadata.level >= filter.minLevel!);
    }

    if (filter.maxLevel !== undefined) {
      filtered = filtered.filter(e => e.metadata.level <= filter.maxLevel!);
    }

    if (filter.onlineOnly) {
      filtered = filtered.filter(e => e.socialData?.isOnline);
    }

    if (filter.search) {
      const query = filter.search.toLowerCase();
      filtered = filtered.filter(e => 
        e.username.toLowerCase().includes(query) ||
        e.displayName.toLowerCase().includes(query)
      );
    }

    return filtered;
  }

  // Получение списка лидербордов
  getLeaderboardConfigs(category?: string): LeaderboardConfig[] {
    const configs = Array.from(this.configs.values())
      .filter(config => config.isActive);

    if (category) {
      return configs.filter(config => !config.category || config.category === category);
    }

    return configs;
  }

  // Получение позиции пользователя
  getUserPosition(userId: string, leaderboardId: string): {
    rank?: number;
    score?: number;
    totalPlayers: number;
    percentile?: number;
  } {
    const entries = this.leaderboards.get(leaderboardId) || [];
    const userEntry = entries.find(e => e.userId === userId);

    return {
      rank: userEntry?.rank,
      score: userEntry?.score,
      totalPlayers: entries.length,
      percentile: userEntry 
        ? ((entries.length - userEntry.rank + 1) / entries.length) * 100 
        : undefined
    };
  }

  // Социальные функции
  getSocialFeatures(userId: string, targetUserId: string): SocialFeatures {
    // В реальном приложении здесь была бы более сложная логика
    return {
      canChallenge: true,
      canAddFriend: true,
      canViewProfile: true,
      sharedAchievements: ['first_win', 'collector'], // Пример общих достижений
      competitionHistory: {
        wins: Math.floor(Math.random() * 10),
        losses: Math.floor(Math.random() * 10),
        draws: Math.floor(Math.random() * 3)
      }
    };
  }

  // Вызов игрока на соревнование
  challengePlayer(challengerId: string, targetUserId: string, leaderboardId: string): {
    challengeId: string;
    status: 'sent' | 'accepted' | 'declined' | 'expired';
    expiresAt: Date;
  } {
    const challengeId = uuidv4();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 часа

    // В реальном приложении сохранять в базу данных
    this.emit('challengeSent', {
      challengeId,
      challengerId,
      targetUserId,
      leaderboardId,
      expiresAt
    });

    logger.info(`Challenge sent from ${challengerId} to ${targetUserId} for leaderboard ${leaderboardId}`);

    return {
      challengeId,
      status: 'sent',
      expiresAt
    };
  }

  // Очистка кэша
  private clearCacheForLeaderboard(leaderboardId: string): void {
    const keysToDelete: string[] = [];
    
    this.cache.forEach((value, key) => {
      if (key.startsWith(leaderboardId)) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  // Очистка истекшего кэша
  private cleanExpiredCache(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    this.cache.forEach((value, key) => {
      if (value.expiry <= now) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.cache.delete(key));
    
    if (keysToDelete.length > 0) {
      logger.info(`Cleaned ${keysToDelete.length} expired cache entries`);
    }
  }

  // Получение активных соревнований
  getActiveChallenges(userId: string): Array<{
    challengeId: string;
    challenger: LeaderboardEntry;
    target: LeaderboardEntry;
    leaderboardId: string;
    status: string;
    expiresAt: Date;
  }> {
    // В реальном приложении получать из базы данных
    return [];
  }

  // Экспорт в различные форматы
  exportLeaderboard(leaderboardId: string, format: 'json' | 'csv' | 'xml' = 'json'): string {
    const data = this.getLeaderboard(leaderboardId);
    
    switch (format) {
      case 'csv':
        const headers = 'Rank,Username,Score,Games Played,Achievements,Level';
        const rows = data.entries.map(e => 
          `${e.rank},${e.username},${e.score},${e.metadata.gamesPlayed},${e.metadata.achievementsUnlocked},${e.metadata.level}`
        );
        return [headers, ...rows].join('\n');
      
      case 'xml':
        const xmlEntries = data.entries.map(e => 
          `<entry rank="${e.rank}" username="${e.username}" score="${e.score}" />`
        ).join('\n  ');
        return `<leaderboard id="${leaderboardId}">\n  ${xmlEntries}\n</leaderboard>`;
      
      default:
        return JSON.stringify(data, null, 2);
    }
  }

  // Очистка ресурсов
  cleanup(): void {
    this.updateTimers.forEach(timer => clearTimeout(timer));
    this.updateTimers.clear();
    this.cache.clear();
    this.removeAllListeners();
  }
}

export const leaderboardsService = new LeaderboardsService(); 
import { AnalyticsService, AnalyticsEvent, UserSession } from './analytics';
import { logger } from './logger';
import { v4 as uuidv4 } from 'uuid';

interface CohortDefinition {
  id: string;
  name: string;
  description: string;
  cohortType: 'registration' | 'first_purchase' | 'first_game' | 'feature_usage' | 'custom';
  dateRange: {
    start: Date;
    end: Date;
  };
  filters: {
    country?: string[];
    platform?: string[];
    userAgent?: string[];
    referrer?: string[];
    customProperties?: Record<string, any>;
  };
  createdAt: Date;
  isActive: boolean;
}

interface CohortUser {
  userId: string;
  cohortDate: Date;
  acquisitionChannel: string;
  initialProperties: Record<string, any>;
  segments: string[];
  isActive: boolean;
  lastSeen: Date;
  totalSessions: number;
  totalRevenue: number;
  gamesCreated: number;
  achievements: string[];
}

interface RetentionData {
  day: number;
  totalUsers: number;
  returningUsers: number;
  retentionRate: number;
  newUsers: number;
  churnedUsers: number;
  reactivatedUsers: number;
}

interface CohortMetrics {
  cohortId: string;
  cohortSize: number;
  retentionCurve: RetentionData[];
  lifetimeValueCurve: Array<{
    day: number;
    avgLTV: number;
    medianLTV: number;
    totalRevenue: number;
  }>;
  engagementMetrics: Array<{
    day: number;
    avgSessionsPerUser: number;
    avgGamesPerUser: number;
    avgSessionDuration: number;
  }>;
  conversionFunnel: Array<{
    step: string;
    usersEntered: number;
    usersCompleted: number;
    conversionRate: number;
    dropoffRate: number;
  }>;
  segmentBreakdown: Record<string, {
    size: number;
    retention30: number;
    avgLTV: number;
  }>;
  channelPerformance: Record<string, {
    size: number;
    retention: RetentionData[];
    avgLTV: number;
    quality: 'high' | 'medium' | 'low';
  }>;
  behaviorPatterns: {
    powerUsers: number;
    casualUsers: number;
    churned: number;
    dormant: number;
    reactivated: number;
  };
  keyInsights: string[];
  recommendations: string[];
  healthScore: number;
  trendsVsPreviousCohort: {
    retentionChange: number;
    ltvChange: number;
    engagementChange: number;
  };
}

interface CohortComparison {
  cohorts: CohortMetrics[];
  benchmarks: {
    industryAverage: RetentionData[];
    competitorData?: RetentionData[];
    bestPerforming: CohortMetrics;
    worstPerforming: CohortMetrics;
  };
  trends: {
    retentionTrend: 'improving' | 'declining' | 'stable';
    ltvTrend: 'improving' | 'declining' | 'stable';
    qualityTrend: 'improving' | 'declining' | 'stable';
  };
  actionableInsights: Array<{
    insight: string;
    impact: 'high' | 'medium' | 'low';
    effort: 'high' | 'medium' | 'low';
    priority: number;
    suggestedActions: string[];
  }>;
}

interface RetentionForecast {
  cohortId: string;
  forecastDays: number;
  predictedRetention: Array<{
    day: number;
    predicted: number;
    confidenceInterval: {
      lower: number;
      upper: number;
    };
    factors: string[];
  }>;
  scenarioAnalysis: Array<{
    scenario: string;
    description: string;
    predictedImpact: number;
    confidence: number;
  }>;
  recommendations: string[];
}

export class CohortAnalyticsService {
  private analyticsService: AnalyticsService;
  private cohorts: Map<string, CohortDefinition> = new Map();
  private cohortUsers: Map<string, CohortUser[]> = new Map();
  private cohortMetrics: Map<string, CohortMetrics> = new Map();
  private retentionCache: Map<string, RetentionData[]> = new Map();

  constructor(analyticsService: AnalyticsService) {
    this.analyticsService = analyticsService;
    this.setupCohortTracking();
    this.initializeDefaultCohorts();
  }

  // Настройка отслеживания когорт
  private setupCohortTracking(): void {
    // Слушаем события регистрации для автоматического создания когорт
    this.analyticsService.on('event_tracked', (event: AnalyticsEvent) => {
      this.processEventForCohorts(event);
    });

    // Периодическое обновление метрик когорт
    setInterval(() => {
      this.updateAllCohortMetrics();
    }, 60 * 60 * 1000); // Каждый час

    // Ежедневное обновление retention данных
    setInterval(() => {
      this.calculateDailyRetention();
    }, 24 * 60 * 60 * 1000); // Каждые 24 часа
  }

  // Инициализация стандартных когорт
  private initializeDefaultCohorts(): void {
    const defaultCohorts: Omit<CohortDefinition, 'id' | 'createdAt'>[] = [
      {
        name: 'Еженедельные регистрации',
        description: 'Пользователи, сгруппированные по неделям регистрации',
        cohortType: 'registration',
        dateRange: {
          start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 дней назад
          end: new Date()
        },
        filters: {},
        isActive: true
      },
      {
        name: 'Первые покупки',
        description: 'Пользователи, сгруппированные по дате первой покупки',
        cohortType: 'first_purchase',
        dateRange: {
          start: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
          end: new Date()
        },
        filters: {},
        isActive: true
      },
      {
        name: 'Создатели игр',
        description: 'Пользователи, сгруппированные по дате создания первой игры',
        cohortType: 'first_game',
        dateRange: {
          start: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
          end: new Date()
        },
        filters: {},
        isActive: true
      },
      {
        name: 'Мобильные пользователи',
        description: 'Когорта пользователей с мобильных устройств',
        cohortType: 'registration',
        dateRange: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          end: new Date()
        },
        filters: {
          platform: ['mobile', 'tablet']
        },
        isActive: true
      }
    ];

    defaultCohorts.forEach(cohortData => {
      const cohort: CohortDefinition = {
        ...cohortData,
        id: uuidv4(),
        createdAt: new Date()
      };
      this.cohorts.set(cohort.id, cohort);
    });

    logger.info('Инициализированы стандартные когорты', { count: defaultCohorts.length });
  }

  // Создание новой когорты
  async createCohort(cohortData: Omit<CohortDefinition, 'id' | 'createdAt'>): Promise<CohortDefinition> {
    const cohort: CohortDefinition = {
      ...cohortData,
      id: uuidv4(),
      createdAt: new Date()
    };

    this.cohorts.set(cohort.id, cohort);

    // Сразу начинаем сбор данных для новой когорты
    await this.buildCohortUsers(cohort.id);
    await this.calculateCohortMetrics(cohort.id);

    logger.info('Создана новая когорта', { cohortId: cohort.id, name: cohort.name });
    return cohort;
  }

  // Обработка событий для когорт
  private async processEventForCohorts(event: AnalyticsEvent): Promise<void> {
    if (!event.userId) return;

    try {
      // Проверяем, является ли это событие триггером для создания когорты
      for (const cohort of this.cohorts.values()) {
        if (!cohort.isActive) continue;

        if (this.isEventCohortTrigger(event, cohort)) {
          await this.addUserToCohort(event.userId, cohort.id, event);
        }

        // Обновляем данные пользователя в существующих когортах
        await this.updateUserInCohort(event.userId, event);
      }
    } catch (error) {
      logger.error('Ошибка обработки события для когорт', { error, eventId: event.id });
    }
  }

  // Проверка, является ли событие триггером для когорты
  private isEventCohortTrigger(event: AnalyticsEvent, cohort: CohortDefinition): boolean {
    // Проверяем тип когорты
    switch (cohort.cohortType) {
      case 'registration':
        return event.eventName === 'user_registered' || event.eventName === 'user_signup';
      
      case 'first_purchase':
        return event.eventName === 'payment_completed' && event.properties.isFirstPurchase;
      
      case 'first_game':
        return event.eventName === 'game_created' && event.properties.isFirstGame;
      
      case 'feature_usage':
        return event.eventName === cohort.filters.customProperties?.featureName;
      
      default:
        return false;
    }
  }

  // Добавление пользователя в когорту
  private async addUserToCohort(userId: string, cohortId: string, triggerEvent: AnalyticsEvent): Promise<void> {
    const cohort = this.cohorts.get(cohortId);
    if (!cohort) return;

    // Проверяем, не добавлен ли уже пользователь в эту когорту
    const existingUsers = this.cohortUsers.get(cohortId) || [];
    if (existingUsers.some(user => user.userId === userId)) return;

    // Создаем запись о пользователе в когорте
    const cohortUser: CohortUser = {
      userId,
      cohortDate: triggerEvent.timestamp,
      acquisitionChannel: this.determineAcquisitionChannel(triggerEvent),
      initialProperties: {
        device: triggerEvent.deviceInfo,
        referrer: triggerEvent.referrer,
        page: triggerEvent.page,
        userAgent: triggerEvent.userAgent
      },
      segments: this.determineUserSegments(triggerEvent),
      isActive: true,
      lastSeen: triggerEvent.timestamp,
      totalSessions: 0,
      totalRevenue: 0,
      gamesCreated: 0,
      achievements: []
    };

    existingUsers.push(cohortUser);
    this.cohortUsers.set(cohortId, existingUsers);

    logger.info('Пользователь добавлен в когорту', { userId, cohortId, cohortDate: cohortUser.cohortDate });
  }

  // Обновление данных пользователя в когорте
  private async updateUserInCohort(userId: string, event: AnalyticsEvent): Promise<void> {
    for (const [cohortId, users] of this.cohortUsers.entries()) {
      const userIndex = users.findIndex(user => user.userId === userId);
      if (userIndex === -1) continue;

      const user = users[userIndex];
      user.lastSeen = event.timestamp;

      // Обновляем метрики в зависимости от типа события
      switch (event.eventName) {
        case 'session_start':
          user.totalSessions++;
          break;
        
        case 'payment_completed':
          user.totalRevenue += parseFloat(event.properties.amount || '0');
          break;
        
        case 'game_created':
          user.gamesCreated++;
          break;
        
        case 'achievement_unlocked':
          if (!user.achievements.includes(event.properties.achievementId)) {
            user.achievements.push(event.properties.achievementId);
          }
          break;
      }

      // Обновляем сегменты пользователя
      user.segments = this.determineUserSegments(event, user);
    }
  }

  // Построение списка пользователей когорты
  private async buildCohortUsers(cohortId: string): Promise<void> {
    const cohort = this.cohorts.get(cohortId);
    if (!cohort) return;

    const users: CohortUser[] = [];

    // Получаем все события за период когорты
    const allEvents = Array.from(this.analyticsService['events'].values()).flat();
    const cohortEvents = allEvents.filter(event => 
      event.timestamp >= cohort.dateRange.start &&
      event.timestamp <= cohort.dateRange.end &&
      this.isEventCohortTrigger(event, cohort) &&
      this.matchesCohortFilters(event, cohort.filters)
    );

    // Группируем по пользователям
    const userEvents = new Map<string, AnalyticsEvent[]>();
    cohortEvents.forEach(event => {
      if (!event.userId) return;
      const existing = userEvents.get(event.userId) || [];
      existing.push(event);
      userEvents.set(event.userId, existing);
    });

    // Создаем записи пользователей
    for (const [userId, events] of userEvents.entries()) {
      const firstEvent = events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())[0];
      
      const cohortUser: CohortUser = {
        userId,
        cohortDate: firstEvent.timestamp,
        acquisitionChannel: this.determineAcquisitionChannel(firstEvent),
        initialProperties: {
          device: firstEvent.deviceInfo,
          referrer: firstEvent.referrer,
          page: firstEvent.page,
          userAgent: firstEvent.userAgent
        },
        segments: this.determineUserSegments(firstEvent),
        isActive: true,
        lastSeen: firstEvent.timestamp,
        totalSessions: 0,
        totalRevenue: 0,
        gamesCreated: 0,
        achievements: []
      };

      users.push(cohortUser);
    }

    this.cohortUsers.set(cohortId, users);
    logger.info('Построен список пользователей когорты', { cohortId, userCount: users.length });
  }

  // Расчет метрик когорты
  async calculateCohortMetrics(cohortId: string): Promise<CohortMetrics> {
    const cohort = this.cohorts.get(cohortId);
    const users = this.cohortUsers.get(cohortId);
    
    if (!cohort || !users) {
      throw new Error(`Когорта не найдена: ${cohortId}`);
    }

    const metrics: CohortMetrics = {
      cohortId,
      cohortSize: users.length,
      retentionCurve: await this.calculateRetentionCurve(cohortId),
      lifetimeValueCurve: await this.calculateLTVCurve(cohortId),
      engagementMetrics: await this.calculateEngagementMetrics(cohortId),
      conversionFunnel: await this.calculateConversionFunnel(cohortId),
      segmentBreakdown: await this.calculateSegmentBreakdown(cohortId),
      channelPerformance: await this.calculateChannelPerformance(cohortId),
      behaviorPatterns: await this.calculateBehaviorPatterns(cohortId),
      keyInsights: [],
      recommendations: [],
      healthScore: 0,
      trendsVsPreviousCohort: {
        retentionChange: 0,
        ltvChange: 0,
        engagementChange: 0
      }
    };

    // Генерируем инсайты и рекомендации
    metrics.keyInsights = this.generateCohortInsights(metrics);
    metrics.recommendations = this.generateCohortRecommendations(metrics);
    metrics.healthScore = this.calculateCohortHealthScore(metrics);

    // Сравниваем с предыдущей когортой
    metrics.trendsVsPreviousCohort = await this.compareToPreviousCohort(cohortId, metrics);

    this.cohortMetrics.set(cohortId, metrics);
    logger.info('Рассчитаны метрики когорты', { cohortId, healthScore: metrics.healthScore });

    return metrics;
  }

  // Расчет кривой retention
  private async calculateRetentionCurve(cohortId: string): Promise<RetentionData[]> {
    const users = this.cohortUsers.get(cohortId) || [];
    if (users.length === 0) return [];

    const retentionData: RetentionData[] = [];
    const maxDays = 90; // Отслеживаем до 90 дней

    for (let day = 1; day <= maxDays; day++) {
      const dayData: RetentionData = {
        day,
        totalUsers: users.length,
        returningUsers: 0,
        retentionRate: 0,
        newUsers: 0,
        churnedUsers: 0,
        reactivatedUsers: 0
      };

      // Подсчитываем активных пользователей на конкретный день
      for (const user of users) {
        const targetDate = new Date(user.cohortDate.getTime() + day * 24 * 60 * 60 * 1000);
        const isActive = await this.wasUserActiveOnDate(user.userId, targetDate);
        
        if (isActive) {
          dayData.returningUsers++;
        }
      }

      dayData.retentionRate = dayData.returningUsers / dayData.totalUsers;
      retentionData.push(dayData);
    }

    // Кешируем результат
    this.retentionCache.set(cohortId, retentionData);
    return retentionData;
  }

  // Проверка активности пользователя на дату
  private async wasUserActiveOnDate(userId: string, date: Date): Promise<boolean> {
    const allEvents = Array.from(this.analyticsService['events'].values()).flat();
    const userEvents = allEvents.filter(event => 
      event.userId === userId &&
      event.timestamp.toDateString() === date.toDateString()
    );
    
    return userEvents.length > 0;
  }

  // Расчет кривой LTV
  private async calculateLTVCurve(cohortId: string): Promise<Array<{
    day: number;
    avgLTV: number;
    medianLTV: number;
    totalRevenue: number;
  }>> {
    const users = this.cohortUsers.get(cohortId) || [];
    const ltvCurve = [];
    const maxDays = 90;

    for (let day = 1; day <= maxDays; day++) {
      const revenues: number[] = [];
      let totalRevenue = 0;

      for (const user of users) {
        const userRevenue = await this.getUserRevenueUpToDay(user.userId, user.cohortDate, day);
        revenues.push(userRevenue);
        totalRevenue += userRevenue;
      }

      revenues.sort((a, b) => a - b);
      const median = revenues.length > 0 
        ? revenues[Math.floor(revenues.length / 2)]
        : 0;

      ltvCurve.push({
        day,
        avgLTV: revenues.length > 0 ? totalRevenue / revenues.length : 0,
        medianLTV: median,
        totalRevenue
      });
    }

    return ltvCurve;
  }

  // Получение выручки пользователя до определенного дня
  private async getUserRevenueUpToDay(userId: string, cohortDate: Date, days: number): Promise<number> {
    const endDate = new Date(cohortDate.getTime() + days * 24 * 60 * 60 * 1000);
    const allEvents = Array.from(this.analyticsService['events'].values()).flat();
    
    const revenueEvents = allEvents.filter(event =>
      event.userId === userId &&
      event.eventName === 'payment_completed' &&
      event.timestamp >= cohortDate &&
      event.timestamp <= endDate
    );

    return revenueEvents.reduce((sum, event) => sum + parseFloat(event.properties.amount || '0'), 0);
  }

  // Расчет метрик вовлеченности
  private async calculateEngagementMetrics(cohortId: string): Promise<Array<{
    day: number;
    avgSessionsPerUser: number;
    avgGamesPerUser: number;
    avgSessionDuration: number;
  }>> {
    const users = this.cohortUsers.get(cohortId) || [];
    const engagementMetrics = [];
    const maxDays = 30; // Первые 30 дней

    for (let day = 1; day <= maxDays; day++) {
      let totalSessions = 0;
      let totalGames = 0;
      let totalDuration = 0;
      let activeUsers = 0;

      for (const user of users) {
        const dayStats = await this.getUserStatsForDay(user.userId, user.cohortDate, day);
        if (dayStats.sessions > 0) {
          activeUsers++;
          totalSessions += dayStats.sessions;
          totalGames += dayStats.gamesCreated;
          totalDuration += dayStats.totalDuration;
        }
      }

      engagementMetrics.push({
        day,
        avgSessionsPerUser: activeUsers > 0 ? totalSessions / activeUsers : 0,
        avgGamesPerUser: activeUsers > 0 ? totalGames / activeUsers : 0,
        avgSessionDuration: totalSessions > 0 ? totalDuration / totalSessions : 0
      });
    }

    return engagementMetrics;
  }

  // Получение статистики пользователя за день
  private async getUserStatsForDay(userId: string, cohortDate: Date, day: number): Promise<{
    sessions: number;
    gamesCreated: number;
    totalDuration: number;
  }> {
    const targetDate = new Date(cohortDate.getTime() + day * 24 * 60 * 60 * 1000);
    const allEvents = Array.from(this.analyticsService['events'].values()).flat();
    
    const dayEvents = allEvents.filter(event =>
      event.userId === userId &&
      event.timestamp.toDateString() === targetDate.toDateString()
    );

    const sessions = dayEvents.filter(e => e.eventName === 'session_start').length;
    const gamesCreated = dayEvents.filter(e => e.eventName === 'game_created').length;
    
    const allSessions = Array.from(this.analyticsService['sessions'].values());
    const userSessions = allSessions.filter(session =>
      session.userId === userId &&
      session.startTime.toDateString() === targetDate.toDateString()
    );
    
    const totalDuration = userSessions.reduce((sum, session) => sum + (session.duration || 0), 0);

    return { sessions, gamesCreated, totalDuration };
  }

  // Расчет воронки конверсии
  private async calculateConversionFunnel(cohortId: string): Promise<Array<{
    step: string;
    usersEntered: number;
    usersCompleted: number;
    conversionRate: number;
    dropoffRate: number;
  }>> {
    const users = this.cohortUsers.get(cohortId) || [];
    
    const funnelSteps = [
      { name: 'Регистрация', event: 'user_registered' },
      { name: 'Первый вход', event: 'session_start' },
      { name: 'Просмотр туториала', event: 'tutorial_viewed' },
      { name: 'Создание игры', event: 'game_created' },
      { name: 'Публикация игры', event: 'game_published' },
      { name: 'Первая покупка', event: 'payment_completed' }
    ];

    const funnel = [];
    let previousUsers = users.length;

    for (let i = 0; i < funnelSteps.length; i++) {
      const step = funnelSteps[i];
      const usersCompleted = await this.countUsersWithEvent(cohortId, step.event);
      
      const conversionRate = previousUsers > 0 ? (usersCompleted / previousUsers) * 100 : 0;
      const dropoffRate = previousUsers > 0 ? ((previousUsers - usersCompleted) / previousUsers) * 100 : 0;

      funnel.push({
        step: step.name,
        usersEntered: previousUsers,
        usersCompleted,
        conversionRate,
        dropoffRate
      });

      previousUsers = usersCompleted;
    }

    return funnel;
  }

  // Подсчет пользователей с событием
  private async countUsersWithEvent(cohortId: string, eventName: string): Promise<number> {
    const users = this.cohortUsers.get(cohortId) || [];
    const allEvents = Array.from(this.analyticsService['events'].values()).flat();
    
    const usersWithEvent = new Set();
    
    for (const user of users) {
      const hasEvent = allEvents.some(event =>
        event.userId === user.userId &&
        event.eventName === eventName &&
        event.timestamp >= user.cohortDate
      );
      
      if (hasEvent) {
        usersWithEvent.add(user.userId);
      }
    }

    return usersWithEvent.size;
  }

  // Расчет разбивки по сегментам
  private async calculateSegmentBreakdown(cohortId: string): Promise<Record<string, {
    size: number;
    retention30: number;
    avgLTV: number;
  }>> {
    const users = this.cohortUsers.get(cohortId) || [];
    const segmentBreakdown: Record<string, { size: number; retention30: number; avgLTV: number; users: CohortUser[] }> = {};

    // Группируем пользователей по сегментам
    for (const user of users) {
      for (const segment of user.segments) {
        if (!segmentBreakdown[segment]) {
          segmentBreakdown[segment] = { size: 0, retention30: 0, avgLTV: 0, users: [] };
        }
        segmentBreakdown[segment].users.push(user);
        segmentBreakdown[segment].size++;
      }
    }

    // Рассчитываем метрики для каждого сегмента
    for (const segment in segmentBreakdown) {
      const segmentData = segmentBreakdown[segment];
      
      // Retention на 30 день
      let activeOn30 = 0;
      let totalLTV = 0;
      
      for (const user of segmentData.users) {
        const day30Date = new Date(user.cohortDate.getTime() + 30 * 24 * 60 * 60 * 1000);
        const isActive = await this.wasUserActiveOnDate(user.userId, day30Date);
        if (isActive) activeOn30++;
        
        totalLTV += user.totalRevenue;
      }
      
      segmentData.retention30 = segmentData.size > 0 ? (activeOn30 / segmentData.size) * 100 : 0;
      segmentData.avgLTV = segmentData.size > 0 ? totalLTV / segmentData.size : 0;
      
      // Удаляем массив пользователей из результата
      delete (segmentData as any).users;
    }

    return segmentBreakdown;
  }

  // Расчет производительности каналов
  private async calculateChannelPerformance(cohortId: string): Promise<Record<string, {
    size: number;
    retention: RetentionData[];
    avgLTV: number;
    quality: 'high' | 'medium' | 'low';
  }>> {
    const users = this.cohortUsers.get(cohortId) || [];
    const channels: Record<string, CohortUser[]> = {};

    // Группируем по каналам
    for (const user of users) {
      const channel = user.acquisitionChannel;
      if (!channels[channel]) channels[channel] = [];
      channels[channel].push(user);
    }

    const channelPerformance: Record<string, any> = {};

    for (const [channel, channelUsers] of Object.entries(channels)) {
      const avgLTV = channelUsers.reduce((sum, user) => sum + user.totalRevenue, 0) / channelUsers.length;
      const retention = await this.calculateChannelRetention(channelUsers);
      
      // Определяем качество канала
      let quality: 'high' | 'medium' | 'low' = 'low';
      const retention30 = retention.find(r => r.day === 30)?.retentionRate || 0;
      
      if (retention30 > 0.3 && avgLTV > 50) quality = 'high';
      else if (retention30 > 0.15 || avgLTV > 20) quality = 'medium';

      channelPerformance[channel] = {
        size: channelUsers.length,
        retention,
        avgLTV,
        quality
      };
    }

    return channelPerformance;
  }

  // Расчет retention для канала
  private async calculateChannelRetention(users: CohortUser[]): Promise<RetentionData[]> {
    const retentionData: RetentionData[] = [];
    const maxDays = 30;

    for (let day = 1; day <= maxDays; day++) {
      let returningUsers = 0;

      for (const user of users) {
        const targetDate = new Date(user.cohortDate.getTime() + day * 24 * 60 * 60 * 1000);
        const isActive = await this.wasUserActiveOnDate(user.userId, targetDate);
        if (isActive) returningUsers++;
      }

      retentionData.push({
        day,
        totalUsers: users.length,
        returningUsers,
        retentionRate: returningUsers / users.length,
        newUsers: 0,
        churnedUsers: users.length - returningUsers,
        reactivatedUsers: 0
      });
    }

    return retentionData;
  }

  // Расчет поведенческих паттернов
  private async calculateBehaviorPatterns(cohortId: string): Promise<{
    powerUsers: number;
    casualUsers: number;
    churned: number;
    dormant: number;
    reactivated: number;
  }> {
    const users = this.cohortUsers.get(cohortId) || [];
    let powerUsers = 0;
    let casualUsers = 0;
    let churned = 0;
    let dormant = 0;
    let reactivated = 0;

    const now = new Date();

    for (const user of users) {
      const daysSinceLastSeen = (now.getTime() - user.lastSeen.getTime()) / (24 * 60 * 60 * 1000);
      
      // Определяем категорию пользователя
      if (daysSinceLastSeen > 30) {
        churned++;
      } else if (daysSinceLastSeen > 7) {
        dormant++;
      } else if (user.totalSessions > 20 && user.gamesCreated > 5) {
        powerUsers++;
      } else if (user.totalSessions > 5) {
        casualUsers++;
      } else {
        casualUsers++;
      }

      // Проверяем реактивацию (возврат после длительного отсутствия)
      if (daysSinceLastSeen < 1 && await this.wasUserReactivated(user.userId)) {
        reactivated++;
      }
    }

    return { powerUsers, casualUsers, churned, dormant, reactivated };
  }

  // Проверка реактивации пользователя
  private async wasUserReactivated(userId: string): Promise<boolean> {
    const allEvents = Array.from(this.analyticsService['events'].values()).flat();
    const userEvents = allEvents
      .filter(event => event.userId === userId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (userEvents.length < 2) return false;

    const lastEvent = userEvents[0];
    const previousEvent = userEvents[1];
    
    const daysBetween = (lastEvent.timestamp.getTime() - previousEvent.timestamp.getTime()) / (24 * 60 * 60 * 1000);
    
    return daysBetween > 7; // Перерыв больше недели
  }

  // Вспомогательные методы
  private determineAcquisitionChannel(event: AnalyticsEvent): string {
    if (event.referrer) {
      if (event.referrer.includes('google')) return 'google';
      if (event.referrer.includes('facebook')) return 'facebook';
      if (event.referrer.includes('twitter')) return 'twitter';
      if (event.referrer.includes('youtube')) return 'youtube';
      return 'referral';
    }
    return 'direct';
  }

  private determineUserSegments(event: AnalyticsEvent, existingUser?: CohortUser): string[] {
    const segments: string[] = [];

    // Сегментация по устройству
    if (event.deviceInfo?.isMobile) {
      segments.push('mobile');
    } else {
      segments.push('desktop');
    }

    // Сегментация по времени
    const hour = event.timestamp.getHours();
    if (hour >= 9 && hour <= 17) {
      segments.push('business_hours');
    } else {
      segments.push('off_hours');
    }

    // Сегментация по поведению (для существующих пользователей)
    if (existingUser) {
      if (existingUser.gamesCreated > 5) {
        segments.push('active_creator');
      }
      if (existingUser.totalRevenue > 100) {
        segments.push('paying_user');
      }
      if (existingUser.totalSessions > 20) {
        segments.push('engaged_user');
      }
    }

    return segments;
  }

  private matchesCohortFilters(event: AnalyticsEvent, filters: CohortDefinition['filters']): boolean {
    if (filters.platform && event.deviceInfo?.platform) {
      if (!filters.platform.includes(event.deviceInfo.platform)) {
        return false;
      }
    }

    if (filters.referrer && event.referrer) {
      const matchesReferrer = filters.referrer.some(ref => 
        event.referrer?.includes(ref)
      );
      if (!matchesReferrer) return false;
    }

    // Дополнительные фильтры по необходимости

    return true;
  }

  // Генерация инсайтов когорты
  private generateCohortInsights(metrics: CohortMetrics): string[] {
    const insights: string[] = [];

    // Анализ retention
    const retention1 = metrics.retentionCurve.find(r => r.day === 1)?.retentionRate || 0;
    const retention7 = metrics.retentionCurve.find(r => r.day === 7)?.retentionRate || 0;
    const retention30 = metrics.retentionCurve.find(r => r.day === 30)?.retentionRate || 0;

    if (retention1 < 0.3) {
      insights.push('Низкий 1-дневный retention - критическая проблема онбординга');
    }

    if (retention7 < 0.1) {
      insights.push('Очень низкий 7-дневный retention - пользователи быстро теряют интерес');
    }

    if (retention30 > 0.2) {
      insights.push('Хороший долгосрочный retention - продукт создает привычку');
    }

    // Анализ LTV
    const ltv30 = metrics.lifetimeValueCurve.find(l => l.day === 30)?.avgLTV || 0;
    if (ltv30 > 50) {
      insights.push('Высокий LTV - эффективная монетизация');
    } else if (ltv30 < 10) {
      insights.push('Низкий LTV - необходимо улучшить монетизацию');
    }

    // Анализ вовлеченности
    const engagement7 = metrics.engagementMetrics.find(e => e.day === 7);
    if (engagement7 && engagement7.avgSessionsPerUser > 5) {
      insights.push('Высокая вовлеченность на первой неделе');
    }

    // Анализ воронки
    const gameCreationStep = metrics.conversionFunnel.find(f => f.step === 'Создание игры');
    if (gameCreationStep && gameCreationStep.conversionRate < 20) {
      insights.push('Низкая конверсия в создание игр - основная точка оттока');
    }

    return insights;
  }

  // Генерация рекомендаций
  private generateCohortRecommendations(metrics: CohortMetrics): string[] {
    const recommendations: string[] = [];

    const retention1 = metrics.retentionCurve.find(r => r.day === 1)?.retentionRate || 0;
    const retention7 = metrics.retentionCurve.find(r => r.day === 7)?.retentionRate || 0;

    if (retention1 < 0.4) {
      recommendations.push('Улучшить процесс онбординга и первое впечатление');
      recommendations.push('Добавить интерактивный туториал');
    }

    if (retention7 < 0.15) {
      recommendations.push('Внедрить push-уведомления для возврата пользователей');
      recommendations.push('Создать систему ежедневных заданий');
    }

    const ltv30 = metrics.lifetimeValueCurve.find(l => l.day === 30)?.avgLTV || 0;
    if (ltv30 < 20) {
      recommendations.push('Оптимизировать воронку монетизации');
      recommendations.push('Добавить freemium функции');
    }

    // Рекомендации по сегментам
    for (const [segment, data] of Object.entries(metrics.segmentBreakdown)) {
      if (data.retention30 < 10) {
        recommendations.push(`Создать специальную стратегию для сегмента "${segment}"`);
      }
    }

    return recommendations;
  }

  // Расчет health score когорты
  private calculateCohortHealthScore(metrics: CohortMetrics): number {
    const retention1 = metrics.retentionCurve.find(r => r.day === 1)?.retentionRate || 0;
    const retention7 = metrics.retentionCurve.find(r => r.day === 7)?.retentionRate || 0;
    const retention30 = metrics.retentionCurve.find(r => r.day === 30)?.retentionRate || 0;
    const ltv30 = metrics.lifetimeValueCurve.find(l => l.day === 30)?.avgLTV || 0;

    // Нормализуем метрики
    const normalizedRetention1 = Math.min(1, retention1 / 0.6);
    const normalizedRetention7 = Math.min(1, retention7 / 0.3);
    const normalizedRetention30 = Math.min(1, retention30 / 0.15);
    const normalizedLTV = Math.min(1, ltv30 / 100);

    // Взвешенный скор
    const healthScore = (
      normalizedRetention1 * 0.3 +
      normalizedRetention7 * 0.3 +
      normalizedRetention30 * 0.2 +
      normalizedLTV * 0.2
    );

    return Math.round(healthScore * 100);
  }

  // Сравнение с предыдущей когортой
  private async compareToPreviousCohort(cohortId: string, currentMetrics: CohortMetrics): Promise<{
    retentionChange: number;
    ltvChange: number;
    engagementChange: number;
  }> {
    // Упрощенная реализация - в реальности нужно найти предыдущую когорту
    return {
      retentionChange: Math.random() * 20 - 10, // -10% до +10%
      ltvChange: Math.random() * 30 - 15,
      engagementChange: Math.random() * 25 - 12.5
    };
  }

  // Обновление всех метрик когорт
  private async updateAllCohortMetrics(): Promise<void> {
    logger.info('Начинаем обновление метрик всех когорт');
    
    for (const cohortId of this.cohorts.keys()) {
      try {
        await this.calculateCohortMetrics(cohortId);
      } catch (error) {
        logger.error('Ошибка обновления метрик когорты', { error, cohortId });
      }
    }
  }

  // Ежедневный расчет retention
  private async calculateDailyRetention(): Promise<void> {
    logger.info('Выполняем ежедневный расчет retention');
    
    for (const cohortId of this.cohorts.keys()) {
      try {
        await this.calculateRetentionCurve(cohortId);
      } catch (error) {
        logger.error('Ошибка расчета retention', { error, cohortId });
      }
    }
  }

  // Публичные методы для API

  // Получение всех когорт
  getCohorts(): CohortDefinition[] {
    return Array.from(this.cohorts.values()).filter(c => c.isActive);
  }

  // Получение метрик когорты
  getCohortMetrics(cohortId: string): CohortMetrics | undefined {
    return this.cohortMetrics.get(cohortId);
  }

  // Сравнение когорт
  async compareCohorts(cohortIds: string[]): Promise<CohortComparison> {
    const cohorts: CohortMetrics[] = [];
    
    for (const id of cohortIds) {
      const metrics = this.cohortMetrics.get(id);
      if (metrics) cohorts.push(metrics);
    }

    if (cohorts.length === 0) {
      throw new Error('Когорты не найдены');
    }

    // Находим лучшую и худшую когорты
    const bestPerforming = cohorts.reduce((best, current) => 
      current.healthScore > best.healthScore ? current : best
    );
    
    const worstPerforming = cohorts.reduce((worst, current) => 
      current.healthScore < worst.healthScore ? current : worst
    );

    // Генерируем сравнительные инсайты
    const actionableInsights = this.generateComparisonInsights(cohorts);

    return {
      cohorts,
      benchmarks: {
        industryAverage: [], // Здесь должны быть industry benchmarks
        bestPerforming,
        worstPerforming
      },
      trends: {
        retentionTrend: 'stable',
        ltvTrend: 'stable',
        qualityTrend: 'stable'
      },
      actionableInsights
    };
  }

  // Генерация сравнительных инсайтов
  private generateComparisonInsights(cohorts: CohortMetrics[]): Array<{
    insight: string;
    impact: 'high' | 'medium' | 'low';
    effort: 'high' | 'medium' | 'low';
    priority: number;
    suggestedActions: string[];
  }> {
    const insights = [];

    // Анализ трендов retention
    const avgRetention7 = cohorts.reduce((sum, c) => {
      const retention7 = c.retentionCurve.find(r => r.day === 7)?.retentionRate || 0;
      return sum + retention7;
    }, 0) / cohorts.length;

    if (avgRetention7 < 0.15) {
      insights.push({
        insight: 'Критически низкий 7-дневный retention во всех когортах',
        impact: 'high',
        effort: 'medium',
        priority: 1,
        suggestedActions: [
          'Редизайн процесса онбординга',
          'Добавление геймификации',
          'Улучшение первого пользовательского опыта'
        ]
      });
    }

    return insights;
  }

  // Прогнозирование retention
  async forecastRetention(cohortId: string, forecastDays: number = 90): Promise<RetentionForecast> {
    const metrics = this.cohortMetrics.get(cohortId);
    if (!metrics) {
      throw new Error(`Когорта не найдена: ${cohortId}`);
    }

    // Простое прогнозирование на основе трендов
    const retentionData = metrics.retentionCurve;
    const predictedRetention = [];

    for (let day = retentionData.length + 1; day <= forecastDays; day++) {
      // Экспоненциальное затухание
      const baseRetention = retentionData[retentionData.length - 1]?.retentionRate || 0;
      const decayFactor = 0.98; // 2% ежедневное снижение
      const predicted = baseRetention * Math.pow(decayFactor, day - retentionData.length);
      
      predictedRetention.push({
        day,
        predicted,
        confidenceInterval: {
          lower: predicted * 0.8,
          upper: predicted * 1.2
        },
        factors: ['Естественное затухание', 'Отсутствие активности']
      });
    }

    return {
      cohortId,
      forecastDays,
      predictedRetention,
      scenarioAnalysis: [
        {
          scenario: 'Улучшение продукта',
          description: 'Внедрение новых функций и улучшение UX',
          predictedImpact: 15, // +15% к retention
          confidence: 0.7
        },
        {
          scenario: 'Маркетинговая кампания',
          description: 'Активная реактивация через email и push',
          predictedImpact: 8,
          confidence: 0.8
        }
      ],
      recommendations: [
        'Внедрить систему уведомлений для неактивных пользователей',
        'Создать программу лояльности',
        'Улучшить качество контента'
      ]
    };
  }

  // Получение статистики сервиса
  getServiceStats(): any {
    return {
      totalCohorts: this.cohorts.size,
      activeCohorts: Array.from(this.cohorts.values()).filter(c => c.isActive).length,
      totalUsers: Array.from(this.cohortUsers.values()).reduce((sum, users) => sum + users.length, 0),
      avgCohortSize: Array.from(this.cohortUsers.values()).reduce((sum, users) => sum + users.length, 0) / this.cohortUsers.size,
      lastUpdate: new Date()
    };
  }
}

export { CohortAnalyticsService }; 
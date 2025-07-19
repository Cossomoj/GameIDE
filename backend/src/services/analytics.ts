import { v4 as uuidv4 } from 'uuid';
import { logger } from './logger';
import { EventEmitter } from 'events';

export interface AnalyticsEvent {
  id: string;
  sessionId: string;
  userId?: string;
  eventType: string;
  eventName: string;
  properties: Record<string, any>;
  timestamp: Date;
  userAgent?: string;
  ip?: string;
  referrer?: string;
  page?: string;
  deviceInfo?: {
    isMobile: boolean;
    platform: string;
    browser: string;
    language: string;
    screenResolution: string;
    timeZone: string;
  };
  gameInfo?: {
    gameId?: string;
    gameType?: string;
    level?: number;
    duration?: number;
    score?: number;
  };
}

export interface ConversionFunnel {
  id: string;
  name: string;
  description: string;
  steps: FunnelStep[];
  isActive: boolean;
  createdAt: Date;
}

export interface FunnelStep {
  id: string;
  name: string;
  eventType: string;
  conditions?: Record<string, any>;
  order: number;
}

export interface MetricConfig {
  id: string;
  name: string;
  description: string;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  unit: string;
  aggregation: 'sum' | 'avg' | 'min' | 'max' | 'count';
  filters?: Record<string, any>;
  isActive: boolean;
}

export interface AnalyticsReport {
  id: string;
  type: 'overview' | 'user_behavior' | 'game_performance' | 'monetization' | 'custom';
  timeframe: {
    start: Date;
    end: Date;
    period: 'hour' | 'day' | 'week' | 'month';
  };
  metrics: {
    [key: string]: {
      value: number;
      change: number;
      trend: 'up' | 'down' | 'stable';
      previousValue?: number;
    };
  };
  charts: {
    [key: string]: {
      type: 'line' | 'bar' | 'pie' | 'funnel';
      data: Array<{ label: string; value: number; timestamp?: Date }>;
    };
  };
  generatedAt: Date;
}

export interface UserSession {
  id: string;
  userId?: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  pageViews: number;
  events: number;
  deviceInfo: AnalyticsEvent['deviceInfo'];
  isActive: boolean;
  lastActivity: Date;
  entryPage: string;
  exitPage?: string;
  referrer?: string;
  conversionEvents: string[];
}

class AnalyticsService extends EventEmitter {
  private events: Map<string, AnalyticsEvent[]> = new Map(); // sessionId -> events
  private sessions: Map<string, UserSession> = new Map();
  private funnels: Map<string, ConversionFunnel> = new Map();
  private metrics: Map<string, MetricConfig> = new Map();
  private metricsValues: Map<string, Map<string, number>> = new Map(); // metricId -> timekey -> value
  private realtimeData: Map<string, any> = new Map();

  // Yandex.Metrica integration
  private yandexMetricaId?: string;
  private yandexApiKey?: string;

  constructor(yandexMetricaId?: string, yandexApiKey?: string) {
    super();
    this.yandexMetricaId = yandexMetricaId;
    this.yandexApiKey = yandexApiKey;
    
    this.initializeDefaultFunnels();
    this.initializeDefaultMetrics();
    this.setupCleanupJobs();
  }

  // Инициализация воронок по умолчанию
  private initializeDefaultFunnels(): void {
    const defaultFunnels: ConversionFunnel[] = [
      {
        id: 'user_onboarding',
        name: 'Онбординг пользователя',
        description: 'Путь от первого визита до создания первой игры',
        steps: [
          { id: 'step1', name: 'Посещение сайта', eventType: 'page_view', order: 1 },
          { id: 'step2', name: 'Просмотр главной', eventType: 'page_view', conditions: { page: '/' }, order: 2 },
          { id: 'step3', name: 'Переход к созданию', eventType: 'navigation', conditions: { target: '/create' }, order: 3 },
          { id: 'step4', name: 'Создание игры', eventType: 'game_created', order: 4 },
          { id: 'step5', name: 'Завершение игры', eventType: 'game_completed', order: 5 }
        ],
        isActive: true,
        createdAt: new Date()
      },
      {
        id: 'monetization_funnel',
        name: 'Воронка монетизации',
        description: 'От интереса к покупке премиум подписки',
        steps: [
          { id: 'step1', name: 'Просмотр цен', eventType: 'page_view', conditions: { page: '/pricing' }, order: 1 },
          { id: 'step2', name: 'Клик на план', eventType: 'pricing_plan_clicked', order: 2 },
          { id: 'step3', name: 'Начало оплаты', eventType: 'payment_started', order: 3 },
          { id: 'step4', name: 'Успешная оплата', eventType: 'payment_completed', order: 4 }
        ],
        isActive: true,
        createdAt: new Date()
      },
      {
        id: 'game_engagement',
        name: 'Вовлеченность в игры',
        description: 'Активность пользователя в играх',
        steps: [
          { id: 'step1', name: 'Создание игры', eventType: 'game_created', order: 1 },
          { id: 'step2', name: 'Первый запуск', eventType: 'game_started', order: 2 },
          { id: 'step3', name: 'Игра 5+ минут', eventType: 'game_session', conditions: { duration_min: 300 }, order: 3 },
          { id: 'step4', name: 'Поделился игрой', eventType: 'game_shared', order: 4 },
          { id: 'step5', name: 'Создал еще игру', eventType: 'game_created', conditions: { count_min: 2 }, order: 5 }
        ],
        isActive: true,
        createdAt: new Date()
      }
    ];

    defaultFunnels.forEach(funnel => {
      this.funnels.set(funnel.id, funnel);
    });
  }

  // Инициализация метрик по умолчанию
  private initializeDefaultMetrics(): void {
    const defaultMetrics: MetricConfig[] = [
      {
        id: 'daily_active_users',
        name: 'Дневная активность',
        description: 'Количество уникальных пользователей за день',
        type: 'gauge',
        unit: 'users',
        aggregation: 'count',
        isActive: true
      },
      {
        id: 'games_created_daily',
        name: 'Игры созданы',
        description: 'Количество созданных игр за день',
        type: 'counter',
        unit: 'games',
        aggregation: 'sum',
        isActive: true
      },
      {
        id: 'session_duration',
        name: 'Длительность сессии',
        description: 'Средняя длительность пользовательской сессии',
        type: 'histogram',
        unit: 'seconds',
        aggregation: 'avg',
        isActive: true
      },
      {
        id: 'conversion_rate',
        name: 'Конверсия в покупку',
        description: 'Процент пользователей, совершивших покупку',
        type: 'gauge',
        unit: 'percent',
        aggregation: 'avg',
        isActive: true
      },
      {
        id: 'page_load_time',
        name: 'Время загрузки',
        description: 'Среднее время загрузки страниц',
        type: 'histogram',
        unit: 'ms',
        aggregation: 'avg',
        isActive: true
      },
      {
        id: 'error_rate',
        name: 'Частота ошибок',
        description: 'Процент запросов с ошибками',
        type: 'gauge',
        unit: 'percent',
        aggregation: 'avg',
        isActive: true
      },
      {
        id: 'feature_usage',
        name: 'Использование функций',
        description: 'Частота использования различных функций',
        type: 'counter',
        unit: 'events',
        aggregation: 'sum',
        isActive: true
      },
      {
        id: 'revenue_daily',
        name: 'Дневная выручка',
        description: 'Общая выручка за день',
        type: 'gauge',
        unit: 'rub',
        aggregation: 'sum',
        isActive: true
      }
    ];

    defaultMetrics.forEach(metric => {
      this.metrics.set(metric.id, metric);
      this.metricsValues.set(metric.id, new Map());
    });
  }

  // Настройка задач очистки
  private setupCleanupJobs(): void {
    // Очистка старых событий каждые 6 часов
    setInterval(() => {
      this.cleanupOldEvents();
    }, 6 * 60 * 60 * 1000);

    // Закрытие неактивных сессий каждые 30 минут
    setInterval(() => {
      this.closeInactiveSessions();
    }, 30 * 60 * 1000);

    // Агрегация метрик каждый час
    setInterval(() => {
      this.aggregateMetrics();
    }, 60 * 60 * 1000);
  }

  // Отслеживание события
  trackEvent(eventData: Partial<AnalyticsEvent>): string {
    const event: AnalyticsEvent = {
      id: uuidv4(),
      sessionId: eventData.sessionId || this.generateSessionId(),
      userId: eventData.userId,
      eventType: eventData.eventType || 'custom',
      eventName: eventData.eventName || 'unknown',
      properties: eventData.properties || {},
      timestamp: new Date(),
      userAgent: eventData.userAgent,
      ip: eventData.ip,
      referrer: eventData.referrer,
      page: eventData.page,
      deviceInfo: eventData.deviceInfo,
      gameInfo: eventData.gameInfo
    };

    // Сохраняем событие
    const sessionEvents = this.events.get(event.sessionId) || [];
    sessionEvents.push(event);
    this.events.set(event.sessionId, sessionEvents);

    // Обновляем сессию
    this.updateSession(event);

    // Обновляем метрики в реальном времени
    this.updateRealtimeMetrics(event);

    // Проверяем воронки конверсии
    this.checkConversionFunnels(event);

    // Отправляем в Yandex.Metrica
    this.sendToYandexMetrica(event);

    // Эмитируем событие для других сервисов
    this.emit('event_tracked', event);

    logger.info(`Analytics event tracked: ${event.eventType}.${event.eventName} for session ${event.sessionId}`);

    return event.id;
  }

  // Генерация ID сессии
  private generateSessionId(): string {
    return uuidv4();
  }

  // Обновление сессии
  private updateSession(event: AnalyticsEvent): void {
    let session = this.sessions.get(event.sessionId);

    if (!session) {
      session = {
        id: event.sessionId,
        userId: event.userId,
        startTime: event.timestamp,
        pageViews: 0,
        events: 0,
        deviceInfo: event.deviceInfo,
        isActive: true,
        lastActivity: event.timestamp,
        entryPage: event.page || '/',
        referrer: event.referrer,
        conversionEvents: []
      };
      this.sessions.set(event.sessionId, session);
    }

    // Обновляем данные сессии
    session.lastActivity = event.timestamp;
    session.events += 1;
    session.userId = session.userId || event.userId;

    if (event.eventType === 'page_view') {
      session.pageViews += 1;
      session.exitPage = event.page;
    }

    // Проверяем конверсионные события
    if (this.isConversionEvent(event)) {
      session.conversionEvents.push(event.eventName);
    }
  }

  // Проверка конверсионного события
  private isConversionEvent(event: AnalyticsEvent): boolean {
    const conversionEvents = [
      'game_created',
      'payment_completed',
      'subscription_started',
      'achievement_unlocked',
      'game_shared'
    ];
    return conversionEvents.includes(event.eventName);
  }

  // Обновление метрик в реальном времени
  private updateRealtimeMetrics(event: AnalyticsEvent): void {
    const now = new Date();
    const timeKey = this.getTimeKey(now, 'hour');

    // Активные пользователи
    const activeUsers = this.realtimeData.get('active_users') || new Set();
    if (event.userId) {
      activeUsers.add(event.userId);
    }
    this.realtimeData.set('active_users', activeUsers);

    // Счетчики событий
    const eventCounts = this.realtimeData.get('event_counts') || new Map();
    const currentCount = eventCounts.get(event.eventName) || 0;
    eventCounts.set(event.eventName, currentCount + 1);
    this.realtimeData.set('event_counts', eventCounts);

    // Ошибки
    if (event.eventType === 'error') {
      const errorCount = this.realtimeData.get('error_count') || 0;
      this.realtimeData.set('error_count', errorCount + 1);
    }

    // Выручка
    if (event.eventName === 'payment_completed' && event.properties.amount) {
      const revenue = this.realtimeData.get('revenue_today') || 0;
      this.realtimeData.set('revenue_today', revenue + parseFloat(event.properties.amount));
    }
  }

  // Проверка воронок конверсии
  private checkConversionFunnels(event: AnalyticsEvent): void {
    this.funnels.forEach(funnel => {
      if (!funnel.isActive) return;

      const sessionEvents = this.events.get(event.sessionId) || [];
      const completedSteps = this.getCompletedFunnelSteps(funnel, sessionEvents);

      if (completedSteps.length > 0) {
        this.emit('funnel_progress', {
          funnelId: funnel.id,
          sessionId: event.sessionId,
          userId: event.userId,
          completedSteps: completedSteps.length,
          totalSteps: funnel.steps.length,
          conversionRate: (completedSteps.length / funnel.steps.length) * 100
        });
      }
    });
  }

  // Получение завершенных шагов воронки
  private getCompletedFunnelSteps(funnel: ConversionFunnel, sessionEvents: AnalyticsEvent[]): FunnelStep[] {
    const completed: FunnelStep[] = [];

    funnel.steps.sort((a, b) => a.order - b.order).forEach(step => {
      const matchingEvent = sessionEvents.find(event => {
        if (event.eventType !== step.eventType) return false;

        if (step.conditions) {
          return Object.entries(step.conditions).every(([key, value]) => {
            if (key === 'page') return event.page === value;
            if (key === 'target') return event.properties.target === value;
            if (key === 'duration_min') return (event.properties.duration || 0) >= value;
            if (key === 'count_min') {
              const count = sessionEvents.filter(e => e.eventType === step.eventType).length;
              return count >= value;
            }
            return event.properties[key] === value;
          });
        }

        return true;
      });

      if (matchingEvent) {
        completed.push(step);
      } else {
        // Если шаг не завершен, останавливаем проверку (воронка последовательна)
        return;
      }
    });

    return completed;
  }

  // Отправка в Yandex.Metrica
  private async sendToYandexMetrica(event: AnalyticsEvent): Promise<void> {
    if (!this.yandexMetricaId) return;

    try {
      // В реальном приложении здесь была бы отправка через API Яндекс.Метрики
      const metricaEvent = {
        counterId: this.yandexMetricaId,
        eventName: `${event.eventType}.${event.eventName}`,
        eventParams: {
          ...event.properties,
          page: event.page,
          userId: event.userId,
          sessionId: event.sessionId
        },
        timestamp: event.timestamp.getTime()
      };

      // Пример отправки (в реальности через fetch или axios)
      logger.info(`Sending to Yandex.Metrica: ${JSON.stringify(metricaEvent)}`);

      // Также можем отправлять goals (цели)
      if (this.isConversionEvent(event)) {
        const goalData = {
          counterId: this.yandexMetricaId,
          goalName: event.eventName,
          goalValue: event.properties.value || 1,
          timestamp: event.timestamp.getTime()
        };
        logger.info(`Sending goal to Yandex.Metrica: ${JSON.stringify(goalData)}`);
      }

    } catch (error) {
      logger.error('Error sending to Yandex.Metrica:', error);
    }
  }

  // Получение ключа времени для агрегации
  private getTimeKey(date: Date, period: 'hour' | 'day' | 'week' | 'month'): string {
    switch (period) {
      case 'hour':
        return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}-${date.getHours()}`;
      case 'day':
        return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
      case 'week':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        return `${weekStart.getFullYear()}-W${Math.ceil(weekStart.getDate() / 7)}`;
      case 'month':
        return `${date.getFullYear()}-${date.getMonth() + 1}`;
      default:
        return date.toISOString().split('T')[0];
    }
  }

  // Агрегация метрик
  private aggregateMetrics(): void {
    const now = new Date();
    const hourKey = this.getTimeKey(now, 'hour');
    const dayKey = this.getTimeKey(now, 'day');

    // Дневная активность пользователей
    const activeUsers = this.realtimeData.get('active_users') || new Set();
    const dauMetrics = this.metricsValues.get('daily_active_users') || new Map();
    dauMetrics.set(dayKey, activeUsers.size);

    // Количество созданных игр
    const gameEvents = Array.from(this.events.values())
      .flat()
      .filter(e => e.eventName === 'game_created' && e.timestamp.toDateString() === now.toDateString());
    const gamesMetrics = this.metricsValues.get('games_created_daily') || new Map();
    gamesMetrics.set(dayKey, gameEvents.length);

    // Средняя длительность сессии
    const sessionsToday = Array.from(this.sessions.values())
      .filter(s => s.startTime.toDateString() === now.toDateString() && !s.isActive);
    const avgDuration = sessionsToday.length > 0
      ? sessionsToday.reduce((sum, s) => sum + (s.duration || 0), 0) / sessionsToday.length
      : 0;
    const durationMetrics = this.metricsValues.get('session_duration') || new Map();
    durationMetrics.set(dayKey, avgDuration);

    // Выручка
    const revenue = this.realtimeData.get('revenue_today') || 0;
    const revenueMetrics = this.metricsValues.get('revenue_daily') || new Map();
    revenueMetrics.set(dayKey, revenue);

    logger.info(`Metrics aggregated for ${dayKey}: DAU=${activeUsers.size}, Games=${gameEvents.length}, Revenue=${revenue}`);
  }

  // Очистка старых событий
  private cleanupOldEvents(): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30); // Храним 30 дней

    let cleanedCount = 0;
    this.events.forEach((events, sessionId) => {
      const filteredEvents = events.filter(event => event.timestamp >= cutoffDate);
      if (filteredEvents.length !== events.length) {
        this.events.set(sessionId, filteredEvents);
        cleanedCount += events.length - filteredEvents.length;
      }
      if (filteredEvents.length === 0) {
        this.events.delete(sessionId);
      }
    });

    if (cleanedCount > 0) {
      logger.info(`Cleaned up ${cleanedCount} old analytics events`);
    }
  }

  // Закрытие неактивных сессий
  private closeInactiveSessions(): void {
    const cutoffTime = new Date();
    cutoffTime.setMinutes(cutoffTime.getMinutes() - 30); // 30 минут неактивности

    let closedCount = 0;
    this.sessions.forEach(session => {
      if (session.isActive && session.lastActivity < cutoffTime) {
        session.isActive = false;
        session.endTime = session.lastActivity;
        session.duration = session.endTime.getTime() - session.startTime.getTime();
        closedCount++;
      }
    });

    if (closedCount > 0) {
      logger.info(`Closed ${closedCount} inactive sessions`);
    }
  }

  // API методы

  // Получение отчета
  generateReport(type: AnalyticsReport['type'], timeframe: AnalyticsReport['timeframe']): AnalyticsReport {
    const report: AnalyticsReport = {
      id: uuidv4(),
      type,
      timeframe,
      metrics: {},
      charts: {},
      generatedAt: new Date()
    };

    switch (type) {
      case 'overview':
        report.metrics = this.getOverviewMetrics(timeframe);
        report.charts = this.getOverviewCharts(timeframe);
        break;
      
      case 'user_behavior':
        report.metrics = this.getUserBehaviorMetrics(timeframe);
        report.charts = this.getUserBehaviorCharts(timeframe);
        break;
      
      case 'game_performance':
        report.metrics = this.getGamePerformanceMetrics(timeframe);
        report.charts = this.getGamePerformanceCharts(timeframe);
        break;
      
      case 'monetization':
        report.metrics = this.getMonetizationMetrics(timeframe);
        report.charts = this.getMonetizationCharts(timeframe);
        break;
    }

    return report;
  }

  // Получение метрик обзора
  private getOverviewMetrics(timeframe: AnalyticsReport['timeframe']): AnalyticsReport['metrics'] {
    const dauMetrics = this.metricsValues.get('daily_active_users') || new Map();
    const gamesMetrics = this.metricsValues.get('games_created_daily') || new Map();
    const revenueMetrics = this.metricsValues.get('revenue_daily') || new Map();

    const currentDAU = this.realtimeData.get('active_users')?.size || 0;
    const currentGames = Array.from(this.events.values())
      .flat()
      .filter(e => e.eventName === 'game_created' && e.timestamp >= timeframe.start).length;
    const currentRevenue = this.realtimeData.get('revenue_today') || 0;

    return {
      daily_active_users: {
        value: currentDAU,
        change: 0, // Вычислить изменение по сравнению с предыдущим периодом
        trend: 'stable'
      },
      games_created: {
        value: currentGames,
        change: 0,
        trend: 'stable'
      },
      revenue: {
        value: currentRevenue,
        change: 0,
        trend: 'stable'
      },
      active_sessions: {
        value: Array.from(this.sessions.values()).filter(s => s.isActive).length,
        change: 0,
        trend: 'stable'
      }
    };
  }

  // Получение графиков обзора
  private getOverviewCharts(timeframe: AnalyticsReport['timeframe']): AnalyticsReport['charts'] {
    const days = this.getDateRange(timeframe.start, timeframe.end);
    
    const dauData = days.map(date => ({
      label: date.toLocaleDateString(),
      value: Math.floor(Math.random() * 100) + 50, // Заглушка
      timestamp: date
    }));

    const gamesData = days.map(date => ({
      label: date.toLocaleDateString(),
      value: Math.floor(Math.random() * 20) + 5, // Заглушка
      timestamp: date
    }));

    return {
      daily_active_users: {
        type: 'line',
        data: dauData
      },
      games_created: {
        type: 'bar',
        data: gamesData
      },
      user_sources: {
        type: 'pie',
        data: [
          { label: 'Прямые заходы', value: 45 },
          { label: 'Поисковые системы', value: 30 },
          { label: 'Социальные сети', value: 15 },
          { label: 'Реферальные ссылки', value: 10 }
        ]
      }
    };
  }

  // Получение диапазона дат
  private getDateRange(start: Date, end: Date): Date[] {
    const dates: Date[] = [];
    const current = new Date(start);
    
    while (current <= end) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return dates;
  }

  // Получение метрик поведения пользователей
  private getUserBehaviorMetrics(timeframe: AnalyticsReport['timeframe']): AnalyticsReport['metrics'] {
    const sessions = Array.from(this.sessions.values())
      .filter(s => s.startTime >= timeframe.start && s.startTime <= timeframe.end);

    const avgSessionDuration = sessions.length > 0
      ? sessions.reduce((sum, s) => sum + (s.duration || 0), 0) / sessions.length / 1000
      : 0;

    const avgPageViews = sessions.length > 0
      ? sessions.reduce((sum, s) => sum + s.pageViews, 0) / sessions.length
      : 0;

    const bounceRate = sessions.length > 0
      ? (sessions.filter(s => s.pageViews === 1).length / sessions.length) * 100
      : 0;

    return {
      avg_session_duration: {
        value: Math.round(avgSessionDuration),
        change: 0,
        trend: 'stable'
      },
      avg_page_views: {
        value: Math.round(avgPageViews * 10) / 10,
        change: 0,
        trend: 'stable'
      },
      bounce_rate: {
        value: Math.round(bounceRate * 10) / 10,
        change: 0,
        trend: 'stable'
      }
    };
  }

  // Получение графиков поведения пользователей
  private getUserBehaviorCharts(timeframe: AnalyticsReport['timeframe']): AnalyticsReport['charts'] {
    return {
      session_duration_distribution: {
        type: 'bar',
        data: [
          { label: '0-1 мин', value: 25 },
          { label: '1-5 мин', value: 35 },
          { label: '5-15 мин', value: 20 },
          { label: '15-30 мин', value: 12 },
          { label: '30+ мин', value: 8 }
        ]
      },
      page_views_funnel: {
        type: 'funnel',
        data: [
          { label: 'Главная страница', value: 100 },
          { label: 'Создание игры', value: 45 },
          { label: 'Завершение игры', value: 30 },
          { label: 'Повторное создание', value: 15 }
        ]
      }
    };
  }

  // Остальные методы метрик и графиков (заглушки)
  private getGamePerformanceMetrics(timeframe: AnalyticsReport['timeframe']): AnalyticsReport['metrics'] {
    return {
      total_games_created: { value: 150, change: 15, trend: 'up' },
      avg_game_completion: { value: 67, change: -3, trend: 'down' },
      popular_game_type: { value: 0, change: 0, trend: 'stable' }
    };
  }

  private getGamePerformanceCharts(timeframe: AnalyticsReport['timeframe']): AnalyticsReport['charts'] {
    return {
      games_by_type: {
        type: 'pie',
        data: [
          { label: 'Аркада', value: 40 },
          { label: 'Головоломки', value: 30 },
          { label: 'Стратегия', value: 20 },
          { label: 'Экшн', value: 10 }
        ]
      }
    };
  }

  private getMonetizationMetrics(timeframe: AnalyticsReport['timeframe']): AnalyticsReport['metrics'] {
    return {
      total_revenue: { value: 25000, change: 12, trend: 'up' },
      conversion_rate: { value: 3.2, change: 0.5, trend: 'up' },
      avg_order_value: { value: 299, change: -15, trend: 'down' }
    };
  }

  private getMonetizationCharts(timeframe: AnalyticsReport['timeframe']): AnalyticsReport['charts'] {
    return {
      revenue_by_plan: {
        type: 'pie',
        data: [
          { label: 'Премиум месячный', value: 60 },
          { label: 'Премиум годовой', value: 35 },
          { label: 'Про игры', value: 5 }
        ]
      }
    };
  }

  // Получение воронок конверсии
  getFunnels(): ConversionFunnel[] {
    return Array.from(this.funnels.values()).filter(f => f.isActive);
  }

  // Анализ воронки
  analyzeFunnel(funnelId: string, timeframe: { start: Date; end: Date }): {
    funnel: ConversionFunnel;
    analysis: {
      totalSessions: number;
      stepsCompletion: Array<{
        step: FunnelStep;
        completed: number;
        rate: number;
        dropOff: number;
      }>;
      overallConversion: number;
    };
  } {
    const funnel = this.funnels.get(funnelId);
    if (!funnel) throw new Error(`Funnel ${funnelId} not found`);

    const relevantSessions = Array.from(this.sessions.values())
      .filter(s => s.startTime >= timeframe.start && s.startTime <= timeframe.end);

    const totalSessions = relevantSessions.length;
    const stepsCompletion = funnel.steps.map((step, index) => {
      const completed = relevantSessions.filter(session => {
        const sessionEvents = this.events.get(session.id) || [];
        const completedSteps = this.getCompletedFunnelSteps(funnel, sessionEvents);
        return completedSteps.length > index;
      }).length;

      const rate = totalSessions > 0 ? (completed / totalSessions) * 100 : 0;
      const previousCompleted = index > 0 ? stepsCompletion[index - 1]?.completed || totalSessions : totalSessions;
      const dropOff = previousCompleted > 0 ? ((previousCompleted - completed) / previousCompleted) * 100 : 0;

      return {
        step,
        completed,
        rate,
        dropOff
      };
    });

    const finalStepCompleted = stepsCompletion[stepsCompletion.length - 1]?.completed || 0;
    const overallConversion = totalSessions > 0 ? (finalStepCompleted / totalSessions) * 100 : 0;

    return {
      funnel,
      analysis: {
        totalSessions,
        stepsCompletion,
        overallConversion
      }
    };
  }

  // Получение реальных метрик
  getRealtimeMetrics(): {
    activeUsers: number;
    activeSessions: number;
    eventsLastHour: number;
    errorsLastHour: number;
    revenueToday: number;
    topEvents: Array<{ name: string; count: number }>;
  } {
    const activeUsers = this.realtimeData.get('active_users')?.size || 0;
    const activeSessions = Array.from(this.sessions.values()).filter(s => s.isActive).length;
    const eventCounts = this.realtimeData.get('event_counts') || new Map();
    const errorCount = this.realtimeData.get('error_count') || 0;
    const revenueToday = this.realtimeData.get('revenue_today') || 0;

    const topEvents = Array.from(eventCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      activeUsers,
      activeSessions,
      eventsLastHour: Array.from(eventCounts.values()).reduce((sum, count) => sum + count, 0),
      errorsLastHour: errorCount,
      revenueToday,
      topEvents
    };
  }

  // Получение пользовательских сессий
  getUserSessions(userId: string, limit: number = 50): UserSession[] {
    return Array.from(this.sessions.values())
      .filter(s => s.userId === userId)
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
      .slice(0, limit);
  }

  // Экспорт данных
  exportData(format: 'json' | 'csv', type: 'events' | 'sessions' | 'metrics', timeframe?: { start: Date; end: Date }): string {
    let data: any[] = [];

    switch (type) {
      case 'events':
        data = Array.from(this.events.values())
          .flat()
          .filter(e => !timeframe || (e.timestamp >= timeframe.start && e.timestamp <= timeframe.end));
        break;
      case 'sessions':
        data = Array.from(this.sessions.values())
          .filter(s => !timeframe || (s.startTime >= timeframe.start && s.startTime <= timeframe.end));
        break;
      case 'metrics':
        data = Array.from(this.metricsValues.entries()).map(([metricId, values]) => ({
          metricId,
          values: Array.from(values.entries()).map(([timeKey, value]) => ({ timeKey, value }))
        }));
        break;
    }

    if (format === 'csv') {
      // Простая CSV реализация
      if (data.length === 0) return '';
      const headers = Object.keys(data[0]);
      const csvRows = [headers.join(',')];
      data.forEach(row => {
        const values = headers.map(header => {
          const value = row[header];
          return typeof value === 'object' ? JSON.stringify(value) : value;
        });
        csvRows.push(values.join(','));
      });
      return csvRows.join('\n');
    }

    return JSON.stringify(data, null, 2);
  }

  // Очистка всех данных
  cleanup(): void {
    this.events.clear();
    this.sessions.clear();
    this.realtimeData.clear();
    this.removeAllListeners();
  }
}

export const analyticsService = new AnalyticsService(
  process.env.YANDEX_METRICA_ID,
  process.env.YANDEX_API_KEY
); 
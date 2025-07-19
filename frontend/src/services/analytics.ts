import { v4 as uuidv4 } from 'uuid';

export interface AnalyticsEvent {
  sessionId?: string;
  userId?: string;
  eventType: string;
  eventName: string;
  properties?: Record<string, any>;
  page?: string;
  referrer?: string;
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

export interface RealtimeMetrics {
  activeUsers: number;
  activeSessions: number;
  eventsLastHour: number;
  errorsLastHour: number;
  revenueToday: number;
  topEvents: Array<{ name: string; count: number }>;
}

export interface ConversionFunnel {
  id: string;
  name: string;
  description: string;
  steps: Array<{
    id: string;
    name: string;
    eventType: string;
    conditions?: Record<string, any>;
    order: number;
  }>;
  isActive: boolean;
  createdAt: Date;
}

export interface FunnelAnalysis {
  funnel: ConversionFunnel;
  analysis: {
    totalSessions: number;
    stepsCompletion: Array<{
      step: ConversionFunnel['steps'][0];
      completed: number;
      rate: number;
      dropOff: number;
    }>;
    overallConversion: number;
  };
}

class AnalyticsService {
  private baseURL = '/api/analytics';
  private sessionId: string;
  private userId?: string;
  private queue: AnalyticsEvent[] = [];
  private isOnline = navigator.onLine;
  private batchSize = 10;
  private flushInterval = 5000; // 5 секунд
  private deviceInfo: AnalyticsEvent['deviceInfo'];

  constructor() {
    this.sessionId = this.getOrCreateSessionId();
    this.deviceInfo = this.getDeviceInfo();
    this.setupEventListeners();
    this.startBatchProcessing();
  }

  // Получение или создание ID сессии
  private getOrCreateSessionId(): string {
    let sessionId = sessionStorage.getItem('analytics_session_id');
    if (!sessionId) {
      sessionId = uuidv4();
      sessionStorage.setItem('analytics_session_id', sessionId);
    }
    return sessionId;
  }

  // Получение информации об устройстве
  private getDeviceInfo(): AnalyticsEvent['deviceInfo'] {
    const userAgent = navigator.userAgent;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    
    let platform = 'Unknown';
    if (userAgent.includes('Win')) platform = 'Windows';
    else if (userAgent.includes('Mac')) platform = 'macOS';
    else if (userAgent.includes('Linux')) platform = 'Linux';
    else if (userAgent.includes('Android')) platform = 'Android';
    else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) platform = 'iOS';

    let browser = 'Unknown';
    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';

    return {
      isMobile,
      platform,
      browser,
      language: navigator.language,
      screenResolution: `${screen.width}x${screen.height}`,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  }

  // Настройка слушателей событий
  private setupEventListeners(): void {
    // Отслеживание перехода офлайн/онлайн
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.flushQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    // Отслеживание изменения страницы
    window.addEventListener('beforeunload', () => {
      this.flushQueue(true);
    });

    // Отслеживание видимости страницы
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.track('page_view', 'page_visible', {
          page: window.location.pathname
        });
      }
    });
  }

  // Запуск пакетной обработки
  private startBatchProcessing(): void {
    setInterval(() => {
      if (this.queue.length > 0) {
        this.flushQueue();
      }
    }, this.flushInterval);
  }

  // Установка пользователя
  setUser(userId: string): void {
    this.userId = userId;
  }

  // Основной метод отслеживания событий
  track(eventType: string, eventName: string, properties: Record<string, any> = {}): void {
    const event: AnalyticsEvent = {
      sessionId: this.sessionId,
      userId: this.userId,
      eventType,
      eventName,
      properties,
      page: window.location.pathname,
      referrer: document.referrer,
      deviceInfo: this.deviceInfo
    };

    this.addToQueue(event);
  }

  // Отслеживание просмотра страницы
  trackPageView(page?: string): void {
    this.track('page_view', 'page_loaded', {
      page: page || window.location.pathname,
      title: document.title,
      url: window.location.href
    });
  }

  // Отслеживание клика
  trackClick(element: string, properties: Record<string, any> = {}): void {
    this.track('interaction', 'click', {
      element,
      ...properties
    });
  }

  // Отслеживание отправки формы
  trackFormSubmit(formName: string, properties: Record<string, any> = {}): void {
    this.track('interaction', 'form_submit', {
      form: formName,
      ...properties
    });
  }

  // Отслеживание ошибок
  trackError(error: Error, context?: string): void {
    this.track('error', 'javascript_error', {
      message: error.message,
      stack: error.stack,
      context,
      url: window.location.href
    });
  }

  // Отслеживание времени на странице
  trackTimeOnPage(duration: number): void {
    this.track('engagement', 'time_on_page', {
      duration,
      page: window.location.pathname
    });
  }

  // Отслеживание событий игр
  trackGameEvent(eventName: string, gameInfo: AnalyticsEvent['gameInfo'], properties: Record<string, any> = {}): void {
    this.track('game', eventName, {
      ...properties,
      gameInfo
    });
  }

  // Отслеживание конверсионных событий
  trackConversion(goalName: string, value: number = 1, properties: Record<string, any> = {}): void {
    this.track('conversion', goalName, {
      value,
      ...properties
    });
  }

  // Добавление события в очередь
  private addToQueue(event: AnalyticsEvent): void {
    this.queue.push(event);

    // Отправляем сразу, если очередь заполнена или событие критично
    if (this.queue.length >= this.batchSize || this.isCriticalEvent(event)) {
      this.flushQueue();
    }
  }

  // Проверка критичности события
  private isCriticalEvent(event: AnalyticsEvent): boolean {
    const criticalEvents = ['error', 'conversion', 'payment_completed'];
    return criticalEvents.includes(event.eventType) || criticalEvents.includes(event.eventName);
  }

  // Отправка очереди на сервер
  private async flushQueue(sync = false): Promise<void> {
    if (this.queue.length === 0 || (!this.isOnline && !sync)) {
      return;
    }

    const events = [...this.queue];
    this.queue = [];

    try {
      const response = await fetch(`${this.baseURL}/track/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ events }),
        keepalive: sync // Для отправки при закрытии страницы
      });

      if (!response.ok) {
        // Возвращаем события в очередь при ошибке
        this.queue.unshift(...events);
        throw new Error(`Analytics request failed: ${response.status}`);
      }

      console.log(`Analytics: Sent ${events.length} events`);
    } catch (error) {
      console.error('Analytics: Failed to send events', error);
      
      // Возвращаем события в очередь если отправка не удалась
      if (!sync) {
        this.queue.unshift(...events);
      }
    }
  }

  // API методы для получения данных

  // Получение отчета
  async getReport(
    type: AnalyticsReport['type'],
    startDate?: Date,
    endDate?: Date,
    period: 'hour' | 'day' | 'week' | 'month' = 'day'
  ): Promise<AnalyticsReport> {
    const params = new URLSearchParams({
      period
    });

    if (startDate) params.append('startDate', startDate.toISOString());
    if (endDate) params.append('endDate', endDate.toISOString());

    const response = await fetch(`${this.baseURL}/reports/${type}?${params}`);
    
    if (!response.ok) {
      throw new Error(`Failed to get report: ${response.status}`);
    }

    const data = await response.json();
    return data.data;
  }

  // Получение реальных метрик
  async getRealtimeMetrics(): Promise<RealtimeMetrics> {
    const response = await fetch(`${this.baseURL}/realtime`);
    
    if (!response.ok) {
      throw new Error(`Failed to get realtime metrics: ${response.status}`);
    }

    const data = await response.json();
    return data.data;
  }

  // Получение воронок конверсии
  async getFunnels(): Promise<ConversionFunnel[]> {
    const response = await fetch(`${this.baseURL}/funnels`);
    
    if (!response.ok) {
      throw new Error(`Failed to get funnels: ${response.status}`);
    }

    const data = await response.json();
    return data.data;
  }

  // Анализ воронки
  async analyzeFunnel(
    funnelId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<FunnelAnalysis> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate.toISOString());
    if (endDate) params.append('endDate', endDate.toISOString());

    const response = await fetch(`${this.baseURL}/funnels/${funnelId}/analysis?${params}`);
    
    if (!response.ok) {
      throw new Error(`Failed to analyze funnel: ${response.status}`);
    }

    const data = await response.json();
    return data.data;
  }

  // Получение топ событий
  async getTopEvents(limit = 10): Promise<{ events: Array<{ name: string; count: number }>; total: number }> {
    const response = await fetch(`${this.baseURL}/events/top?limit=${limit}`);
    
    if (!response.ok) {
      throw new Error(`Failed to get top events: ${response.status}`);
    }

    const data = await response.json();
    return data.data;
  }

  // Получение статистики по страницам
  async getPageStats(startDate?: Date, endDate?: Date): Promise<{
    pages: Array<{
      page: string;
      pageViews: number;
      uniqueViews: number;
      avgTimeOnPage: number;
      bounceRate: number;
      exitRate: number;
    }>;
    timeframe: { start: Date; end: Date };
  }> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate.toISOString());
    if (endDate) params.append('endDate', endDate.toISOString());

    const response = await fetch(`${this.baseURL}/pages/stats?${params}`);
    
    if (!response.ok) {
      throw new Error(`Failed to get page stats: ${response.status}`);
    }

    const data = await response.json();
    return data.data;
  }

  // Получение статистики по устройствам
  async getDeviceStats(): Promise<{
    platforms: Array<{ name: string; value: number; sessions: number }>;
    browsers: Array<{ name: string; value: number; sessions: number }>;
    operatingSystems: Array<{ name: string; value: number; sessions: number }>;
    screenResolutions: Array<{ name: string; value: number; sessions: number }>;
  }> {
    const response = await fetch(`${this.baseURL}/devices/stats`);
    
    if (!response.ok) {
      throw new Error(`Failed to get device stats: ${response.status}`);
    }

    const data = await response.json();
    return data.data;
  }

  // Получение статистики по регионам
  async getGeoStats(): Promise<{
    countries: Array<{ name: string; code: string; value: number; sessions: number; flag: string }>;
    cities: Array<{ name: string; value: number; sessions: number }>;
    languages: Array<{ name: string; code: string; value: number; sessions: number }>;
  }> {
    const response = await fetch(`${this.baseURL}/geo/stats`);
    
    if (!response.ok) {
      throw new Error(`Failed to get geo stats: ${response.status}`);
    }

    const data = await response.json();
    return data.data;
  }

  // Отправка цели в Yandex.Metrica
  async trackGoal(goalName: string, value = 1, properties: Record<string, any> = {}): Promise<void> {
    const response = await fetch(`${this.baseURL}/goals/${goalName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        value,
        userId: this.userId,
        sessionId: this.sessionId,
        properties
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to track goal: ${response.status}`);
    }
  }

  // Очистка данных
  cleanup(): void {
    this.flushQueue(true);
  }
}

// Создаем единственный экземпляр сервиса
export const analyticsService = new AnalyticsService();

// Автоматическое отслеживание ошибок
window.addEventListener('error', (event) => {
  analyticsService.trackError(event.error, 'global_error_handler');
});

window.addEventListener('unhandledrejection', (event) => {
  analyticsService.trackError(new Error(event.reason), 'unhandled_promise_rejection');
});

// Автоматическое отслеживание времени на странице
let pageStartTime = Date.now();
window.addEventListener('beforeunload', () => {
  const timeOnPage = Date.now() - pageStartTime;
  analyticsService.trackTimeOnPage(timeOnPage);
});

// Автоматическое отслеживание переходов (для SPA)
let currentPath = window.location.pathname;
const observer = new MutationObserver(() => {
  if (window.location.pathname !== currentPath) {
    const timeOnPage = Date.now() - pageStartTime;
    analyticsService.trackTimeOnPage(timeOnPage);
    
    currentPath = window.location.pathname;
    pageStartTime = Date.now();
    analyticsService.trackPageView();
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

export default analyticsService; 
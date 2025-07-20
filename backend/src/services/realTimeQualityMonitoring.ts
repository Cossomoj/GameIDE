import { Server as SocketIOServer } from 'socket.io';
import { LoggerService } from './logger';
import { EventEmitter } from 'events';

interface QualityMetric {
  id: string;
  timestamp: Date;
  type: 'game_generation' | 'asset_generation' | 'code_quality' | 'performance';
  subType?: string; // sprite, background, ui, etc.
  qualityScore: number; // 0-100
  details: {
    technicalScore?: number;
    aestheticScore?: number;
    gameRelevanceScore?: number;
    performanceScore?: number;
    codeQuality?: number;
    issues: string[];
    recommendations: string[];
  };
  metadata: {
    gameId?: string;
    assetId?: string;
    generationTime: number;
    aiModel: string;
    promptLength?: number;
    retryCount?: number;
  };
}

interface QualityAlert {
  id: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: 'quality_drop' | 'performance_issue' | 'generation_failure' | 'anomaly';
  message: string;
  metric: QualityMetric;
  threshold: number;
  suggestedActions: string[];
}

interface QualityTrend {
  timeWindow: string; // '5m', '1h', '24h'
  averageQuality: number;
  qualityChange: number; // % change from previous window
  generationCount: number;
  issueFrequency: Map<string, number>;
  topIssues: Array<{ issue: string; count: number; percentage: number }>;
}

interface MonitoringSession {
  sessionId: string;
  userId: string;
  startTime: Date;
  filters: {
    types?: string[];
    minQuality?: number;
    gameIds?: string[];
  };
  subscriptions: string[]; // event types user subscribed to
}

export class RealTimeQualityMonitoring extends EventEmitter {
  private io: SocketIOServer | null = null;
  private logger: LoggerService;
  private metrics: Map<string, QualityMetric> = new Map();
  private alerts: QualityAlert[] = [];
  private sessions: Map<string, MonitoringSession> = new Map();
  private qualityThresholds = {
    critical: 30,
    high: 50,
    medium: 70,
    low: 85
  };
  private isMonitoring = false;
  private monitoringStats = {
    totalMetrics: 0,
    alertsGenerated: 0,
    averageQuality: 0,
    activeSessions: 0,
    uptime: new Date()
  };

  constructor() {
    super();
    this.logger = new LoggerService();
    this.startTrendAnalysis();
  }

  /**
   * Инициализация WebSocket сервера
   */
  public initializeWebSocket(io: SocketIOServer): void {
    this.io = io;
    this.isMonitoring = true;
    
    io.on('connection', (socket) => {
      this.logger.info(`📡 WebSocket подключение: ${socket.id}`);
      
      // Обработка подписки на мониторинг
      socket.on('subscribe_quality_monitoring', (data) => {
        this.handleSubscription(socket, data);
      });

      // Обработка отписки
      socket.on('unsubscribe_quality_monitoring', () => {
        this.handleUnsubscription(socket);
      });

      // Запрос текущих метрик
      socket.on('get_current_metrics', () => {
        this.sendCurrentMetrics(socket);
      });

      // Запрос истории алертов
      socket.on('get_alert_history', (data) => {
        this.sendAlertHistory(socket, data);
      });

      // Запрос трендов качества
      socket.on('get_quality_trends', (data) => {
        this.sendQualityTrends(socket, data);
      });

      socket.on('disconnect', () => {
        this.handleDisconnection(socket);
        this.logger.info(`📡 WebSocket отключение: ${socket.id}`);
      });
    });

    this.logger.info('📡 WebSocket сервер качества инициализирован');
  }

  /**
   * Добавление новой метрики качества
   */
  public addQualityMetric(metric: Omit<QualityMetric, 'id' | 'timestamp'>): void {
    const fullMetric: QualityMetric = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      ...metric
    };

    this.metrics.set(fullMetric.id, fullMetric);
    this.monitoringStats.totalMetrics++;
    
    // Обновляем средний показатель качества
    this.updateAverageQuality(fullMetric.qualityScore);
    
    // Проверяем на алерты
    this.checkForAlerts(fullMetric);
    
    // Отправляем метрику подписчикам
    this.broadcastMetric(fullMetric);
    
    // Логируем метрику
    this.logger.info(`📊 Новая метрика качества: ${fullMetric.type} - ${fullMetric.qualityScore}/100`);
    
    // Ограничиваем размер кеша
    if (this.metrics.size > 10000) {
      const oldestKey = this.metrics.keys().next().value;
      this.metrics.delete(oldestKey);
    }
  }

  /**
   * Проверка метрики на алерты
   */
  private checkForAlerts(metric: QualityMetric): void {
    const alerts: QualityAlert[] = [];

    // Проверка критического падения качества
    if (metric.qualityScore <= this.qualityThresholds.critical) {
      alerts.push({
        id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        severity: 'critical',
        type: 'quality_drop',
        message: `Критическое падение качества: ${metric.qualityScore}/100`,
        metric,
        threshold: this.qualityThresholds.critical,
        suggestedActions: [
          'Проверить конфигурацию AI модели',
          'Проанализировать входные данные',
          'Проверить состояние сервисов'
        ]
      });
    } else if (metric.qualityScore <= this.qualityThresholds.high) {
      alerts.push({
        id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        severity: 'high',
        type: 'quality_drop',
        message: `Значительное падение качества: ${metric.qualityScore}/100`,
        metric,
        threshold: this.qualityThresholds.high,
        suggestedActions: [
          'Проверить промпты и параметры генерации',
          'Анализировать частые проблемы'
        ]
      });
    }

    // Проверка проблем с производительностью
    if (metric.metadata.generationTime > 30000) { // > 30 секунд
      alerts.push({
        id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        severity: 'medium',
        type: 'performance_issue',
        message: `Медленная генерация: ${metric.metadata.generationTime}ms`,
        metric,
        threshold: 30000,
        suggestedActions: [
          'Проверить загрузку AI сервисов',
          'Оптимизировать промпты',
          'Проверить сетевое соединение'
        ]
      });
    }

    // Проверка частых повторов
    if (metric.metadata.retryCount && metric.metadata.retryCount > 3) {
      alerts.push({
        id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        severity: 'medium',
        type: 'generation_failure',
        message: `Много попыток регенерации: ${metric.metadata.retryCount}`,
        metric,
        threshold: 3,
        suggestedActions: [
          'Проанализировать причины неудач',
          'Проверить валидность входных данных',
          'Рассмотреть альтернативные параметры'
        ]
      });
    }

    // Сохраняем и отправляем алерты
    alerts.forEach(alert => {
      this.alerts.push(alert);
      this.monitoringStats.alertsGenerated++;
      this.broadcastAlert(alert);
      
      this.logger.warn(`🚨 Алерт качества: ${alert.message}`);
    });

    // Ограничиваем историю алертов
    if (this.alerts.length > 1000) {
      this.alerts = this.alerts.slice(-500);
    }
  }

  /**
   * Обработка подписки на мониторинг
   */
  private handleSubscription(socket: any, data: any): void {
    const sessionId = socket.id;
    const session: MonitoringSession = {
      sessionId,
      userId: data.userId || 'anonymous',
      startTime: new Date(),
      filters: data.filters || {},
      subscriptions: data.subscriptions || ['all']
    };

    this.sessions.set(sessionId, session);
    this.monitoringStats.activeSessions = this.sessions.size;
    
    socket.join('quality_monitoring');
    
    // Отправляем текущее состояние
    this.sendCurrentMetrics(socket);
    this.sendMonitoringStats(socket);
    
    this.logger.info(`📋 Новая подписка на мониторинг: ${session.userId}`);
  }

  /**
   * Обработка отписки
   */
  private handleUnsubscription(socket: any): void {
    this.sessions.delete(socket.id);
    this.monitoringStats.activeSessions = this.sessions.size;
    socket.leave('quality_monitoring');
  }

  /**
   * Обработка отключения
   */
  private handleDisconnection(socket: any): void {
    this.handleUnsubscription(socket);
  }

  /**
   * Отправка метрики подписчикам
   */
  private broadcastMetric(metric: QualityMetric): void {
    if (!this.io) return;

    // Фильтруем получателей по подпискам
    this.sessions.forEach((session, sessionId) => {
      if (this.shouldReceiveMetric(session, metric)) {
        this.io!.to(sessionId).emit('quality_metric', metric);
      }
    });
  }

  /**
   * Отправка алерта подписчикам
   */
  private broadcastAlert(alert: QualityAlert): void {
    if (!this.io) return;

    this.io.to('quality_monitoring').emit('quality_alert', alert);
  }

  /**
   * Проверка должен ли получатель получить метрику
   */
  private shouldReceiveMetric(session: MonitoringSession, metric: QualityMetric): boolean {
    const { filters, subscriptions } = session;

    // Проверяем подписки
    if (!subscriptions.includes('all') && !subscriptions.includes(metric.type)) {
      return false;
    }

    // Проверяем фильтры
    if (filters.types && !filters.types.includes(metric.type)) {
      return false;
    }

    if (filters.minQuality && metric.qualityScore < filters.minQuality) {
      return false;
    }

    if (filters.gameIds && metric.metadata.gameId && 
        !filters.gameIds.includes(metric.metadata.gameId)) {
      return false;
    }

    return true;
  }

  /**
   * Отправка текущих метрик
   */
  private sendCurrentMetrics(socket: any): void {
    const recentMetrics = Array.from(this.metrics.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 100);

    socket.emit('current_metrics', {
      metrics: recentMetrics,
      count: recentMetrics.length,
      timestamp: new Date()
    });
  }

  /**
   * Отправка истории алертов
   */
  private sendAlertHistory(socket: any, data: any): void {
    const limit = data.limit || 50;
    const severity = data.severity;
    
    let filteredAlerts = this.alerts;
    
    if (severity) {
      filteredAlerts = filteredAlerts.filter(alert => alert.severity === severity);
    }
    
    const recentAlerts = filteredAlerts
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);

    socket.emit('alert_history', {
      alerts: recentAlerts,
      count: recentAlerts.length,
      totalAlerts: this.alerts.length,
      timestamp: new Date()
    });
  }

  /**
   * Отправка трендов качества
   */
  private sendQualityTrends(socket: any, data: any): void {
    const timeWindow = data.timeWindow || '1h';
    const trends = this.calculateQualityTrends(timeWindow);
    
    socket.emit('quality_trends', {
      trends,
      timeWindow,
      timestamp: new Date()
    });
  }

  /**
   * Отправка статистики мониторинга
   */
  private sendMonitoringStats(socket: any): void {
    socket.emit('monitoring_stats', {
      ...this.monitoringStats,
      currentTime: new Date()
    });
  }

  /**
   * Расчет трендов качества
   */
  private calculateQualityTrends(timeWindow: string): QualityTrend {
    const windowMs = this.parseTimeWindow(timeWindow);
    const cutoffTime = new Date(Date.now() - windowMs);
    
    const recentMetrics = Array.from(this.metrics.values())
      .filter(metric => metric.timestamp >= cutoffTime);

    if (recentMetrics.length === 0) {
      return {
        timeWindow,
        averageQuality: 0,
        qualityChange: 0,
        generationCount: 0,
        issueFrequency: new Map(),
        topIssues: []
      };
    }

    const averageQuality = recentMetrics.reduce((sum, metric) => 
      sum + metric.qualityScore, 0) / recentMetrics.length;

    // Подсчет частоты проблем
    const issueFrequency = new Map<string, number>();
    recentMetrics.forEach(metric => {
      metric.details.issues.forEach(issue => {
        issueFrequency.set(issue, (issueFrequency.get(issue) || 0) + 1);
      });
    });

    const topIssues = Array.from(issueFrequency.entries())
      .map(([issue, count]) => ({
        issue,
        count,
        percentage: Math.round((count / recentMetrics.length) * 100)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Расчет изменения качества (упрощенно - сравнение с предыдущим окном)
    const previousWindowStart = new Date(cutoffTime.getTime() - windowMs);
    const previousMetrics = Array.from(this.metrics.values())
      .filter(metric => 
        metric.timestamp >= previousWindowStart && 
        metric.timestamp < cutoffTime
      );

    let qualityChange = 0;
    if (previousMetrics.length > 0) {
      const previousAverage = previousMetrics.reduce((sum, metric) => 
        sum + metric.qualityScore, 0) / previousMetrics.length;
      qualityChange = Math.round(((averageQuality - previousAverage) / previousAverage) * 100);
    }

    return {
      timeWindow,
      averageQuality: Math.round(averageQuality),
      qualityChange,
      generationCount: recentMetrics.length,
      issueFrequency,
      topIssues
    };
  }

  /**
   * Парсинг временного окна в миллисекунды
   */
  private parseTimeWindow(timeWindow: string): number {
    const value = parseInt(timeWindow);
    const unit = timeWindow.replace(/\d+/, '');
    
    switch (unit) {
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: return 60 * 60 * 1000; // 1 час по умолчанию
    }
  }

  /**
   * Обновление среднего качества
   */
  private updateAverageQuality(newScore: number): void {
    const currentTotal = this.monitoringStats.averageQuality * (this.monitoringStats.totalMetrics - 1);
    this.monitoringStats.averageQuality = Math.round(
      (currentTotal + newScore) / this.monitoringStats.totalMetrics
    );
  }

  /**
   * Запуск анализа трендов
   */
  private startTrendAnalysis(): void {
    // Отправляем обновления трендов каждые 5 минут
    setInterval(() => {
      if (this.io && this.sessions.size > 0) {
        const trends = this.calculateQualityTrends('1h');
        this.io.to('quality_monitoring').emit('trend_update', trends);
      }
    }, 5 * 60 * 1000);

    // Отправляем статистику каждую минуту
    setInterval(() => {
      if (this.io && this.sessions.size > 0) {
        this.io.to('quality_monitoring').emit('stats_update', this.monitoringStats);
      }
    }, 60 * 1000);
  }

  /**
   * Получение статистики мониторинга
   */
  public getMonitoringStats() {
    return {
      ...this.monitoringStats,
      recentAlerts: this.alerts.slice(-10),
      activeSessionsCount: this.sessions.size,
      metricsStoredCount: this.metrics.size
    };
  }

  /**
   * Установка порогов качества
   */
  public setQualityThresholds(thresholds: Partial<typeof this.qualityThresholds>): void {
    this.qualityThresholds = { ...this.qualityThresholds, ...thresholds };
    this.logger.info('📊 Пороги качества обновлены', this.qualityThresholds);
  }

  /**
   * Очистка старых данных
   */
  public cleanupOldData(maxAge: number = 24 * 60 * 60 * 1000): void { // 24 часа по умолчанию
    const cutoffTime = new Date(Date.now() - maxAge);
    
    // Очищаем старые метрики
    for (const [key, metric] of this.metrics.entries()) {
      if (metric.timestamp < cutoffTime) {
        this.metrics.delete(key);
      }
    }

    // Очищаем старые алерты
    this.alerts = this.alerts.filter(alert => alert.timestamp >= cutoffTime);
    
    this.logger.info(`🧹 Очищены данные старше ${maxAge / (60 * 60 * 1000)} часов`);
  }

  /**
   * Остановка мониторинга
   */
  public stopMonitoring(): void {
    this.isMonitoring = false;
    this.sessions.clear();
    this.monitoringStats.activeSessions = 0;
    this.logger.info('📡 Мониторинг качества остановлен');
  }
} 
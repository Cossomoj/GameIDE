import { api } from './api';
import { io, Socket } from 'socket.io-client';

export interface QualityMetric {
  id: string;
  timestamp: Date;
  type: 'game_generation' | 'asset_generation' | 'code_quality' | 'performance';
  subType?: string;
  qualityScore: number;
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

export interface QualityAlert {
  id: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: 'quality_drop' | 'performance_issue' | 'generation_failure' | 'anomaly';
  message: string;
  metric: QualityMetric;
  threshold: number;
  suggestedActions: string[];
}

export interface QualityTrend {
  timeWindow: string;
  averageQuality: number;
  qualityChange: number;
  generationCount: number;
  issueFrequency: Record<string, number>;
  topIssues: Array<{ issue: string; count: number; percentage: number }>;
}

export interface MonitoringStats {
  totalMetrics: number;
  alertsGenerated: number;
  averageQuality: number;
  activeSessions: number;
  uptime: Date;
  recentAlerts: QualityAlert[];
  activeSessionsCount: number;
  metricsStoredCount: number;
}

export interface DashboardData {
  stats: MonitoringStats & { uptime: number };
  trends: QualityTrend;
  recentAlerts: QualityAlert[];
  healthStatus: 'excellent' | 'good' | 'warning' | 'critical';
}

export interface SubscriptionFilters {
  types?: string[];
  minQuality?: number;
  gameIds?: string[];
}

export interface MonitoringSubscription {
  userId?: string;
  filters?: SubscriptionFilters;
  subscriptions?: string[];
}

type QualityEventCallback = (data: any) => void;

class QualityMonitoringService {
  private socket: Socket | null = null;
  private eventCallbacks: Map<string, QualityEventCallback[]> = new Map();
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor() {
    this.initializeWebSocket();
  }

  /**
   * Инициализация WebSocket соединения
   */
  private initializeWebSocket(): void {
    try {
      this.socket = io({
        transports: ['websocket'],
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000
      });

      this.socket.on('connect', () => {
        console.log('📡 Подключен к quality monitoring WebSocket');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.triggerEvent('connected', { timestamp: new Date() });
      });

      this.socket.on('disconnect', () => {
        console.log('📡 Отключен от quality monitoring WebSocket');
        this.isConnected = false;
        this.triggerEvent('disconnected', { timestamp: new Date() });
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ Ошибка подключения WebSocket:', error);
        this.reconnectAttempts++;
        this.triggerEvent('error', { error, attempt: this.reconnectAttempts });
      });

      // Обработчики событий мониторинга
      this.socket.on('quality_metric', (data: QualityMetric) => {
        this.triggerEvent('metric', data);
      });

      this.socket.on('quality_alert', (data: QualityAlert) => {
        this.triggerEvent('alert', data);
      });

      this.socket.on('trend_update', (data: QualityTrend) => {
        this.triggerEvent('trends', data);
      });

      this.socket.on('stats_update', (data: MonitoringStats) => {
        this.triggerEvent('stats', data);
      });

      this.socket.on('current_metrics', (data: { metrics: QualityMetric[]; count: number; timestamp: Date }) => {
        this.triggerEvent('current_metrics', data);
      });

      this.socket.on('alert_history', (data: { alerts: QualityAlert[]; count: number; totalAlerts: number }) => {
        this.triggerEvent('alert_history', data);
      });

      this.socket.on('quality_trends', (data: { trends: QualityTrend; timeWindow: string; timestamp: Date }) => {
        this.triggerEvent('quality_trends', data);
      });

      this.socket.on('monitoring_stats', (data: MonitoringStats) => {
        this.triggerEvent('monitoring_stats', data);
      });

    } catch (error) {
      console.error('Ошибка инициализации WebSocket:', error);
    }
  }

  /**
   * Подписка на мониторинг качества
   */
  public subscribeToMonitoring(subscription: MonitoringSubscription): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('subscribe_quality_monitoring', subscription);
    }
  }

  /**
   * Отписка от мониторинга
   */
  public unsubscribeFromMonitoring(): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('unsubscribe_quality_monitoring');
    }
  }

  /**
   * Запрос текущих метрик
   */
  public getCurrentMetrics(): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('get_current_metrics');
    }
  }

  /**
   * Запрос истории алертов
   */
  public getAlertHistory(params: { limit?: number; severity?: string } = {}): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('get_alert_history', params);
    }
  }

  /**
   * Запрос трендов качества
   */
  public getQualityTrends(timeWindow: string = '1h'): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('get_quality_trends', { timeWindow });
    }
  }

  /**
   * Добавление слушателя событий
   */
  public addEventListener(event: string, callback: QualityEventCallback): void {
    if (!this.eventCallbacks.has(event)) {
      this.eventCallbacks.set(event, []);
    }
    this.eventCallbacks.get(event)!.push(callback);
  }

  /**
   * Удаление слушателя событий
   */
  public removeEventListener(event: string, callback: QualityEventCallback): void {
    const callbacks = this.eventCallbacks.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Триггер события
   */
  private triggerEvent(event: string, data: any): void {
    const callbacks = this.eventCallbacks.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Ошибка в callback для события ${event}:`, error);
        }
      });
    }
  }

  /**
   * API методы
   */

  // Добавление метрики качества
  async addQualityMetric(metric: Omit<QualityMetric, 'id' | 'timestamp'>): Promise<void> {
    const response = await api.post('/api/quality-monitoring/metrics', metric);
    return response.data;
  }

  // Получение статистики мониторинга
  async getMonitoringStats(): Promise<MonitoringStats> {
    const response = await api.get('/api/quality-monitoring/stats');
    return response.data.data;
  }

  // Установка порогов качества
  async setQualityThresholds(thresholds: {
    critical?: number;
    high?: number;
    medium?: number;
    low?: number;
  }): Promise<void> {
    const response = await api.post('/api/quality-monitoring/thresholds', thresholds);
    return response.data;
  }

  // Получение трендов качества (через API)
  async getTrends(timeWindow: string = '1h'): Promise<QualityTrend> {
    const response = await api.get('/api/quality-monitoring/trends', {
      params: { timeWindow }
    });
    return response.data.data;
  }

  // Получение алертов (через API)
  async getAlerts(params: { limit?: number; severity?: string } = {}): Promise<{
    alerts: QualityAlert[];
    count: number;
    filters: any;
  }> {
    const response = await api.get('/api/quality-monitoring/alerts', { params });
    return response.data.data;
  }

  // Очистка старых данных
  async cleanupOldData(maxAge: number = 24): Promise<void> {
    const response = await api.post('/api/quality-monitoring/cleanup', { maxAge });
    return response.data;
  }

  // Симуляция метрик (для тестирования)
  async simulateMetrics(count: number = 10, type: string = 'asset_generation'): Promise<void> {
    const response = await api.post('/api/quality-monitoring/simulate', { count, type });
    return response.data;
  }

  // Получение данных для дашборда
  async getDashboardData(timeWindow: string = '1h'): Promise<DashboardData> {
    const response = await api.get('/api/quality-monitoring/dashboard-data', {
      params: { timeWindow }
    });
    return response.data.data;
  }

  // Массовое добавление метрик
  async addBulkMetrics(metrics: Array<Omit<QualityMetric, 'id' | 'timestamp'>>): Promise<{
    total: number;
    successful: number;
    failed: number;
    errors: any[];
  }> {
    const response = await api.post('/api/quality-monitoring/bulk-metrics', { metrics });
    return response.data.results;
  }

  /**
   * Утилиты
   */

  // Проверка подключения
  public isSocketConnected(): boolean {
    return this.isConnected;
  }

  // Переподключение
  public reconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket.connect();
    }
  }

  // Отключение
  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.isConnected = false;
    }
  }

  // Получение цвета для уровня качества
  public getQualityColor(score: number): string {
    if (score >= 90) return '#4caf50'; // Отличное качество
    if (score >= 75) return '#8bc34a'; // Хорошее качество
    if (score >= 60) return '#ff9800'; // Удовлетворительное
    if (score >= 40) return '#ff5722'; // Плохое
    return '#f44336'; // Критическое
  }

  // Получение иконки для типа метрики
  public getMetricIcon(type: string): string {
    switch (type) {
      case 'game_generation': return '🎮';
      case 'asset_generation': return '🎨';
      case 'code_quality': return '💻';
      case 'performance': return '⚡';
      default: return '📊';
    }
  }

  // Получение цвета для алерта
  public getAlertColor(severity: string): string {
    switch (severity) {
      case 'critical': return '#f44336';
      case 'high': return '#ff5722';
      case 'medium': return '#ff9800';
      case 'low': return '#2196f3';
      default: return '#757575';
    }
  }

  // Форматирование времени
  public formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
    return `${(ms / 3600000).toFixed(1)}h`;
  }

  // Форматирование uptime
  public formatUptime(ms: number): string {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }
}

export const qualityMonitoringService = new QualityMonitoringService(); 
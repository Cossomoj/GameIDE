import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { LoggerService } from './logger';
import { DeepSeekService } from './ai/deepseek';
import { OpenAIService } from './ai/openai';
import { ClaudeService } from './ai/claude';
import { 
  AIServiceHealth, 
  AIHealthReport, 
  AlertConfig, 
  Alert,
  AIResponse 
} from '@/types';

export class AIHealthMonitor extends EventEmitter {
  private logger: LoggerService;
  private services: Map<string, any> = new Map();
  private healthData: Map<string, AIServiceHealth> = new Map();
  private alerts: Map<string, Alert> = new Map();
  private alertConfigs: Map<string, AlertConfig> = new Map();
  private monitoringInterval?: NodeJS.Timeout;
  private cleanupInterval?: NodeJS.Timeout;
  
  // Failover конфигурация
  private failoverConfig = {
    enabled: true,
    primaryService: 'deepseek',
    fallbackOrder: ['claude', 'openai'],
    currentActiveService: 'deepseek',
    failoverThresholds: {
      errorRate: 50, // процент
      responseTime: 30000, // мс
      consecutiveFailures: 3
    }
  };

  private consecutiveFailures: Map<string, number> = new Map();

  constructor() {
    super();
    this.logger = new LoggerService();
    this.initializeServices();
    this.initializeDefaultAlertConfigs();
    this.startMonitoring();
    this.startCleanupJob();
  }

  private initializeServices(): void {
    try {
      // Регистрируем AI сервисы
      this.services.set('deepseek', new DeepSeekService());
      this.services.set('openai', new OpenAIService());
      this.services.set('claude', new ClaudeService());

      // Инициализируем health data
      for (const [name] of this.services) {
        this.healthData.set(name, {
          serviceName: name,
          status: 'healthy',
          responseTime: 0,
          uptime: 100,
          errorRate: 0,
          lastCheck: new Date(),
          metrics: {
            requestsPerMinute: 0,
            successRate: 100,
            averageResponseTime: 0,
            tokensPerSecond: 0,
            queueLength: 0
          },
          errors: []
        });
        
        this.consecutiveFailures.set(name, 0);
      }

      this.logger.info('✅ AI сервисы инициализированы для мониторинга', {
        services: Array.from(this.services.keys()),
        primaryService: this.failoverConfig.primaryService
      });
      
    } catch (error) {
      this.logger.error('❌ Ошибка инициализации AI сервисов:', error);
    }
  }

  private initializeDefaultAlertConfigs(): void {
    const defaultConfigs: AlertConfig[] = [
      {
        id: 'critical-alerts',
        name: 'Критические оповещения',
        type: 'email',
        enabled: true,
        triggers: {
          serviceDown: true,
          highErrorRate: true,
          slowResponse: true,
          failoverActivated: true
        },
        thresholds: {
          errorRatePercent: 25,
          responseTimeMs: 20000,
          uptimePercent: 95
        },
        recipients: ['admin@gameide.com']
      },
      {
        id: 'performance-alerts',
        name: 'Оповещения о производительности',
        type: 'webhook',
        enabled: true,
        triggers: {
          serviceDown: false,
          highErrorRate: true,
          slowResponse: true,
          failoverActivated: false
        },
        thresholds: {
          errorRatePercent: 15,
          responseTimeMs: 15000,
          uptimePercent: 98
        },
        recipients: ['https://hooks.slack.com/monitoring']
      }
    ];

    defaultConfigs.forEach(config => {
      this.alertConfigs.set(config.id, config);
    });
  }

  private startMonitoring(): void {
    // Проверяем здоровье каждые 30 секунд
    this.monitoringInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, 30000);

    this.logger.info('🔍 Мониторинг AI сервисов запущен');
  }

  private startCleanupJob(): void {
    // Очистка старых данных каждые 6 часов
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldData();
    }, 6 * 60 * 60 * 1000);
  }

  private async performHealthCheck(): Promise<void> {
    const checkPromises = Array.from(this.services.entries()).map(
      ([name, service]) => this.checkServiceHealth(name, service)
    );

    await Promise.allSettled(checkPromises);
    
    // Анализируем общее состояние и принимаем решения о failover
    await this.analyzeOverallHealth();
    
    // Отправляем отчет
    this.emit('health:updated', await this.generateHealthReport());
  }

  private async checkServiceHealth(serviceName: string, service: any): Promise<void> {
    const startTime = Date.now();
    const healthData = this.healthData.get(serviceName)!;
    
    try {
      // Тестовый запрос для проверки работоспособности
      const testPrompt = 'Ответь одним словом: "работает"';
      const response: AIResponse = await service.generateCode(testPrompt);
      
      const responseTime = Date.now() - startTime;
      const isHealthy = responseTime < this.failoverConfig.failoverThresholds.responseTime && 
                       response.content.length > 0;

      if (isHealthy) {
        this.consecutiveFailures.set(serviceName, 0);
        
        // Обновляем метрики успеха
        healthData.status = responseTime > 10000 ? 'degraded' : 'healthy';
        healthData.responseTime = responseTime;
        healthData.lastCheck = new Date();
        healthData.metrics.successRate = Math.min(100, healthData.metrics.successRate + 1);
        healthData.metrics.averageResponseTime = (healthData.metrics.averageResponseTime + responseTime) / 2;
        
        // Если сервис восстановился
        if (healthData.errorRate > 0) {
          healthData.errorRate = Math.max(0, healthData.errorRate - 5);
          this.createAlert('service_recovered', 'info', serviceName, 
            `Сервис ${serviceName} восстановлен`);
        }

      } else {
        throw new Error(`Неправильный ответ от сервиса: ${response.content}`);
      }

    } catch (error) {
      const responseTime = Date.now() - startTime;
      const currentFailures = this.consecutiveFailures.get(serviceName)! + 1;
      this.consecutiveFailures.set(serviceName, currentFailures);

      // Обновляем метрики ошибки
      healthData.status = currentFailures >= this.failoverConfig.failoverThresholds.consecutiveFailures 
        ? 'offline' : 'unhealthy';
      healthData.responseTime = responseTime;
      healthData.lastCheck = new Date();
      healthData.errorRate = Math.min(100, healthData.errorRate + 10);
      healthData.metrics.successRate = Math.max(0, healthData.metrics.successRate - 5);
      
      // Добавляем ошибку в историю
      healthData.errors.push({
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Неизвестная ошибка',
        context: { responseTime, consecutiveFailures: currentFailures }
      });

      // Ограничиваем количество ошибок в истории
      if (healthData.errors.length > 50) {
        healthData.errors = healthData.errors.slice(-50);
      }

      this.logger.warn(`⚠️ Проблема с сервисом ${serviceName}:`, {
        error: error instanceof Error ? error.message : error,
        consecutiveFailures: currentFailures,
        responseTime
      });

      // Создаем alert
      if (currentFailures === 1) {
        this.createAlert('high_error_rate', 'warning', serviceName, 
          `Высокий уровень ошибок в сервисе ${serviceName}`);
      } else if (currentFailures >= this.failoverConfig.failoverThresholds.consecutiveFailures) {
        this.createAlert('service_down', 'critical', serviceName, 
          `Сервис ${serviceName} недоступен`);
      }
    }

    this.healthData.set(serviceName, healthData);
  }

  private async analyzeOverallHealth(): Promise<void> {
    const currentActive = this.failoverConfig.currentActiveService;
    const currentHealth = this.healthData.get(currentActive);

    if (!currentHealth || currentHealth.status === 'offline') {
      await this.performFailover();
    }
  }

  private async performFailover(): Promise<void> {
    if (!this.failoverConfig.enabled) {
      this.logger.warn('Failover отключен, пропускаем переключение');
      return;
    }

    const currentActive = this.failoverConfig.currentActiveService;
    
    // Ищем здоровый fallback сервис
    for (const fallbackService of this.failoverConfig.fallbackOrder) {
      const fallbackHealth = this.healthData.get(fallbackService);
      
      if (fallbackHealth?.status === 'healthy' || fallbackHealth?.status === 'degraded') {
        this.failoverConfig.currentActiveService = fallbackService;
        
        this.logger.error(`🔄 Failover: переключение с ${currentActive} на ${fallbackService}`, {
          reason: 'service_unavailable',
          previousService: currentActive,
          newService: fallbackService
        });

        this.createAlert('failover_activated', 'critical', fallbackService, 
          `Активирован failover: переключение с ${currentActive} на ${fallbackService}`);

        this.emit('failover:activated', {
          from: currentActive,
          to: fallbackService,
          timestamp: new Date()
        });

        return;
      }
    }

    // Если все сервисы недоступны
    this.logger.error('🚨 Критическая ошибка: все AI сервисы недоступны!');
    this.createAlert('service_down', 'critical', 'all', 
      'Все AI сервисы недоступны - требуется немедленное вмешательство');
  }

  private createAlert(
    type: Alert['type'],
    severity: Alert['severity'],
    service: string,
    message: string,
    details?: any
  ): void {
    const alert: Alert = {
      id: uuidv4(),
      timestamp: new Date(),
      type,
      severity,
      service,
      message,
      details: details || {},
      resolved: false
    };

    this.alerts.set(alert.id, alert);
    
    // Отправляем alert через настроенные каналы
    this.sendAlert(alert);
    
    this.emit('alert:created', alert);
    this.logger.info(`🚨 Alert создан: ${alert.message}`, alert);
  }

  private async sendAlert(alert: Alert): Promise<void> {
    for (const [configId, config] of this.alertConfigs) {
      if (!config.enabled) continue;

      // Проверяем, должен ли этот alert быть отправлен согласно конфигурации
      const shouldSend = this.shouldSendAlert(alert, config);
      if (!shouldSend) continue;

      try {
        switch (config.type) {
          case 'email':
            await this.sendEmailAlert(alert, config);
            break;
          case 'webhook':
            await this.sendWebhookAlert(alert, config);
            break;
          case 'slack':
            await this.sendSlackAlert(alert, config);
            break;
          case 'telegram':
            await this.sendTelegramAlert(alert, config);
            break;
        }
      } catch (error) {
        this.logger.error(`Ошибка отправки alert через ${config.type}:`, error);
      }
    }
  }

  private shouldSendAlert(alert: Alert, config: AlertConfig): boolean {
    const healthData = this.healthData.get(alert.service);
    if (!healthData) return false;

    switch (alert.type) {
      case 'service_down':
        return config.triggers.serviceDown;
      case 'high_error_rate':
        return config.triggers.highErrorRate && 
               healthData.errorRate >= config.thresholds.errorRatePercent;
      case 'slow_response':
        return config.triggers.slowResponse && 
               healthData.responseTime >= config.thresholds.responseTimeMs;
      case 'failover_activated':
        return config.triggers.failoverActivated;
      default:
        return true;
    }
  }

  private async sendEmailAlert(alert: Alert, config: AlertConfig): Promise<void> {
    // Здесь будет интеграция с email сервисом
    this.logger.info(`📧 Email alert отправлен: ${alert.message}`, {
      recipients: config.recipients,
      severity: alert.severity
    });
  }

  private async sendWebhookAlert(alert: Alert, config: AlertConfig): Promise<void> {
    // Здесь будет отправка webhook
    this.logger.info(`🔗 Webhook alert отправлен: ${alert.message}`, {
      webhooks: config.recipients,
      severity: alert.severity
    });
  }

  private async sendSlackAlert(alert: Alert, config: AlertConfig): Promise<void> {
    // Здесь будет интеграция со Slack
    this.logger.info(`💬 Slack alert отправлен: ${alert.message}`, {
      channels: config.recipients,
      severity: alert.severity
    });
  }

  private async sendTelegramAlert(alert: Alert, config: AlertConfig): Promise<void> {
    // Здесь будет интеграция с Telegram
    this.logger.info(`📱 Telegram alert отправлен: ${alert.message}`, {
      chats: config.recipients,
      severity: alert.severity
    });
  }

  public async generateHealthReport(): Promise<AIHealthReport> {
    const services = Array.from(this.healthData.values());
    const healthyCount = services.filter(s => s.status === 'healthy').length;
    const degradedCount = services.filter(s => s.status === 'degraded').length;
    const unhealthyCount = services.filter(s => s.status === 'unhealthy' || s.status === 'offline').length;

    let overallStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (unhealthyCount > 0) {
      overallStatus = 'critical';
    } else if (degradedCount > 0) {
      overallStatus = 'degraded';
    }

    return {
      timestamp: new Date(),
      overallStatus,
      services,
      summary: {
        totalServices: services.length,
        healthyServices: healthyCount,
        degradedServices: degradedCount,
        unhealthyServices: unhealthyCount
      },
      failoverStatus: {
        isActive: this.failoverConfig.currentActiveService !== this.failoverConfig.primaryService,
        activeService: this.failoverConfig.currentActiveService,
        backupServices: this.failoverConfig.fallbackOrder
      },
      recommendations: this.generateRecommendations(services)
    };
  }

  private generateRecommendations(services: AIServiceHealth[]): Array<{
    priority: 'high' | 'medium' | 'low';
    message: string;
    action: string;
  }> {
    const recommendations = [];

    // Высокий уровень ошибок
    const highErrorServices = services.filter(s => s.errorRate > 20);
    if (highErrorServices.length > 0) {
      recommendations.push({
        priority: 'high' as const,
        message: `Высокий уровень ошибок в сервисах: ${highErrorServices.map(s => s.serviceName).join(', ')}`,
        action: 'Проверить API ключи и лимиты сервисов'
      });
    }

    // Медленный отклик
    const slowServices = services.filter(s => s.responseTime > 15000);
    if (slowServices.length > 0) {
      recommendations.push({
        priority: 'medium' as const,
        message: `Медленный отклик сервисов: ${slowServices.map(s => s.serviceName).join(', ')}`,
        action: 'Оптимизировать запросы или увеличить timeout'
      });
    }

    // Все сервисы работают нормально
    if (services.every(s => s.status === 'healthy')) {
      recommendations.push({
        priority: 'low' as const,
        message: 'Все AI сервисы работают стабильно',
        action: 'Продолжать мониторинг'
      });
    }

    return recommendations;
  }

  // Публичные методы для управления
  public async getActiveService(): Promise<string> {
    return this.failoverConfig.currentActiveService;
  }

  public async forceFailover(targetService: string): Promise<void> {
    if (!this.services.has(targetService)) {
      throw new Error(`Сервис ${targetService} не найден`);
    }

    const previousService = this.failoverConfig.currentActiveService;
    this.failoverConfig.currentActiveService = targetService;

    this.logger.info(`🔄 Принудительный failover с ${previousService} на ${targetService}`);
    this.createAlert('failover_activated', 'info', targetService, 
      `Принудительное переключение на сервис ${targetService}`);
  }

  public async getHealthData(serviceName?: string): Promise<AIServiceHealth | AIServiceHealth[]> {
    if (serviceName) {
      const health = this.healthData.get(serviceName);
      if (!health) {
        throw new Error(`Сервис ${serviceName} не найден`);
      }
      return health;
    }
    return Array.from(this.healthData.values());
  }

  public async getRecentAlerts(limit: number = 50): Promise<Alert[]> {
    return Array.from(this.alerts.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  public async resolveAlert(alertId: string): Promise<void> {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
      this.alerts.set(alertId, alert);
      this.emit('alert:resolved', alert);
    }
  }

  private cleanupOldData(): void {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    // Очистка старых alerts
    for (const [id, alert] of this.alerts) {
      if (alert.timestamp < oneDayAgo && alert.resolved) {
        this.alerts.delete(id);
      }
    }

    // Очистка старых ошибок в health data
    for (const [name, health] of this.healthData) {
      health.errors = health.errors.filter(error => error.timestamp > oneDayAgo);
      this.healthData.set(name, health);
    }

    this.logger.debug('🧹 Очистка старых данных мониторинга завершена');
  }

  public async stop(): Promise<void> {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.logger.info('⏹️ Мониторинг AI сервисов остановлен');
  }
}

export const aiHealthMonitor = new AIHealthMonitor(); 
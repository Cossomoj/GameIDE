import { EventEmitter } from 'events';
import { OpenAIService } from './openai';
import { ClaudeService } from './claude';
import { DeepSeekService } from './deepseek';
import { LoggerService } from '../logger';
import config from '@/config';
import { intelligentCache } from './intelligentCache';
import { aiHealthMonitor } from '../aiHealthMonitor';
import { AIServiceError } from '@/middleware/errorHandler';

interface AITaskRequest {
  id: string;
  type: 'game_design' | 'code_generation' | 'image_generation' | 'sound_generation' | 'text_generation';
  prompt: string;
  context?: any;
  requirements?: {
    quality?: 'fast' | 'balanced' | 'high';
    optimization?: 'cost' | 'speed' | 'quality';
    contentType?: string;
    targetAudience?: string;
  };
  maxRetries?: number;
  timeout?: number;
}

interface AIProvider {
  name: string;
  service: OpenAIService | ClaudeService | DeepSeekService;
  capabilities: AICapability[];
  status: ProviderStatus;
  metrics: ProviderMetrics;
  costs: ProviderCosts;
  priority: number;
  costPerToken: number;
  maxTokens: number;
  reliability: number;
  latency: number;
  rateLimits: {
    requestsPerMinute: number;
    tokensPerMinute: number;
    requestsPerDay: number;
  };
  healthScore: number;
  lastError?: Date;
  errorCount: number;
  successCount: number;
}

interface AICapability {
  type: AITaskRequest['type'];
  quality: number; // 0-100
  speed: number; // 0-100
  reliability: number; // 0-100
  costEfficiency: number; // 0-100
}

interface ProviderStatus {
  isAvailable: boolean;
  currentLoad: number; // 0-100
  responseTime: number; // ms
  errorRate: number; // 0-100
  lastCheck: Date;
  quotaRemaining?: number;
}

interface ProviderMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  averageQuality: number;
  uptime: number; // percentage
}

interface ProviderCosts {
  costPerRequest: number;
  costPerToken: number;
  dailySpent: number;
  monthlyLimit: number;
}

interface RoutingDecision {
  selectedProvider: string;
  confidence: number;
  reasoning: string;
  fallbackProviders: string[];
  estimatedCost: number;
  estimatedTime: number;
}

interface RequestOptions {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  capability?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  timeout?: number;
  retries?: number;
  fallbackProviders?: string[];
  cacheOptions?: {
    enabled?: boolean;
    ttl?: number;
    tags?: string[];
  };
}

interface AIResponse {
  content: string;
  provider: string;
  tokensUsed: number;
  latency: number;
  cost: number;
  cached: boolean;
  retryCount: number;
  metadata?: any;
}

interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half-open';
  failures: number;
  lastFailure: Date | null;
  successCount: number;
  nextAttempt: Date | null;
}

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitterEnabled: boolean;
  retryableErrors: string[];
}

interface MonitoringData {
  requests: {
    total: number;
    successful: number;
    failed: number;
    cached: number;
  };
  providers: {
    [key: string]: {
      requests: number;
      errors: number;
      avgLatency: number;
      totalCost: number;
      tokensUsed: number;
      reliability: number;
    };
  };
  errors: {
    [type: string]: {
      count: number;
      lastOccurrence: Date;
      examples: string[];
    };
  };
  performance: {
    avgResponseTime: number;
    p95ResponseTime: number;
    cacheHitRate: number;
  };
  costs: {
    total: number;
    byProvider: { [provider: string]: number };
    savedByCaching: number;
  };
}

export interface RouterConfig {
  retryAttempts: number;
  timeoutMs: number;
  loadBalancing: boolean;
  preferredServices: string[];
  emergencyFallback: boolean;
}

export class IntelligentAIRouter extends EventEmitter {
  private logger: LoggerService;
  private providers: Map<string, AIProvider> = new Map();
  private routingHistory: Map<string, RoutingDecision[]> = new Map();
  private loadBalancer: LoadBalancer;
  private healthChecker: HealthChecker;
  private contextAnalyzer: ContextAnalyzer;
  private costTracker: CostTracker;
  private cache: Map<string, any> = new Map();
  private circuitBreakers: Map<string, CircuitBreakerState>;
  private retryConfig: RetryConfig;
  private monitoring: MonitoringData;
  private healthCheckInterval: NodeJS.Timeout;
  private performanceWindow: number[] = [];
  private errorTypePatterns: Map<string, RegExp>;
  private config: RouterConfig;
  private requestQueue: Map<string, {
    resolve: (value: AIResponse) => void;
    reject: (error: Error) => void;
    retryCount: number;
    startTime: number;
  }> = new Map();

  constructor(config?: Partial<RouterConfig>) {
    super();
    this.logger = new LoggerService();
    this.loadBalancer = new LoadBalancer();
    this.healthChecker = new HealthChecker();
    this.contextAnalyzer = new ContextAnalyzer();
    this.costTracker = new CostTracker();
    this.circuitBreakers = new Map();
    
    this.retryConfig = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
      jitterEnabled: true,
      retryableErrors: [
        'timeout',
        'rate_limit',
        'server_error',
        'network_error',
        'connection_error',
        'service_unavailable'
      ]
    };

    this.monitoring = this.initializeMonitoring();
    this.errorTypePatterns = this.initializeErrorPatterns();
    
    this.initializeProviders();
    this.startHealthMonitoring();
    this.startPerformanceTracking();
    
    this.logger.info('🤖 Интеллектуальный AI роутер инициализирован');

    this.config = {
      retryAttempts: 3,
      timeoutMs: 45000, // 45 секунд
      loadBalancing: true,
      preferredServices: ['deepseek', 'claude', 'openai'],
      emergencyFallback: true,
      ...config
    };

    this.setupHealthMonitorListeners();
  }

  private setupHealthMonitorListeners(): void {
    // Слушаем события failover от health monitor
    aiHealthMonitor.on('failover:activated', (event) => {
      this.logger.info(`📡 Получено уведомление о failover: ${event.from} → ${event.to}`);
      this.emit('router:failover', event);
    });

    // Слушаем обновления здоровья сервисов
    aiHealthMonitor.on('health:updated', (report) => {
      this.emit('router:health-updated', report);
    });
  }

  /**
   * Основной метод для выполнения AI задач с интеллектуальной маршрутизацией
   */
  public async executeTask(request: AITaskRequest): Promise<any> {
    const startTime = Date.now();
    
    try {
      this.logger.info(`🧠 Интеллектуальная маршрутизация задачи: ${request.id} (${request.type})`);

      // Проверяем кеш
      const cacheKey = this.generateCacheKey(request);
      if (this.cache.has(cacheKey) && request.requirements?.optimization !== 'quality') {
        this.logger.info(`💾 Найден результат в кеше для задачи ${request.id}`);
        return this.cache.get(cacheKey);
      }

      // Анализируем контекст и требования
      const analysis = await this.contextAnalyzer.analyze(request);
      
      // Принимаем решение о маршрутизации
      const routingDecision = await this.selectOptimalProvider(request, analysis);
      
      // Выполняем задачу с fallback
      const result = await this.executeWithFallback(request, routingDecision);
      
      // Кешируем результат
      if (result && request.requirements?.optimization !== 'speed') {
        this.cache.set(cacheKey, result);
        // Очищаем кеш через час
        setTimeout(() => this.cache.delete(cacheKey), 3600000);
      }

      // Обновляем метрики
      const duration = Date.now() - startTime;
      await this.updateProviderMetrics(routingDecision.selectedProvider, true, duration, result);

      this.emit('task:completed', {
        taskId: request.id,
        provider: routingDecision.selectedProvider,
        duration,
        cacheHit: false
      });

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Ошибка выполнения AI задачи ${request.id}:`, error);
      
      this.emit('task:failed', {
        taskId: request.id,
        error: error.message,
        duration
      });

      throw error;
    }
  }

  /**
   * Выбор оптимального провайдера на основе анализа задачи
   */
  private async selectOptimalProvider(
    request: AITaskRequest, 
    analysis: any
  ): Promise<RoutingDecision> {
    const availableProviders = Array.from(this.providers.values())
      .filter(p => p.status.isAvailable && this.canHandleTask(p, request.type));

    if (availableProviders.length === 0) {
      throw new Error('Нет доступных AI провайдеров для выполнения задачи');
    }

    // Вычисляем оценки для каждого провайдера
    const scores = await Promise.all(
      availableProviders.map(provider => this.calculateProviderScore(provider, request, analysis))
    );

    // Выбираем лучшего провайдера
    const bestIndex = scores.indexOf(Math.max(...scores));
    const selectedProvider = availableProviders[bestIndex];

    // Формируем список fallback провайдеров
    const fallbackProviders = availableProviders
      .filter(p => p.name !== selectedProvider.name)
      .sort((a, b) => {
        const aScore = this.calculateProviderScore(a, request, analysis);
        const bScore = this.calculateProviderScore(b, request, analysis);
        return Number(bScore) - Number(aScore);
      })
      .map(p => p.name);

    const decision: RoutingDecision = {
      selectedProvider: selectedProvider.name,
      confidence: scores[bestIndex] / 100,
      reasoning: this.generateReasoning(selectedProvider, request, analysis),
      fallbackProviders,
      estimatedCost: this.estimateCost(selectedProvider, request),
      estimatedTime: this.estimateTime(selectedProvider, request)
    };

    this.logger.info(`🎯 Выбран провайдер: ${decision.selectedProvider} (доверие: ${Math.round(decision.confidence * 100)}%)`);
    this.logger.info(`💡 Причина: ${decision.reasoning}`);

    return decision;
  }

  /**
   * Выполнение задачи с системой fallback
   */
  private async executeWithFallback(
    request: AITaskRequest, 
    decision: RoutingDecision
  ): Promise<any> {
    const providersToTry = [decision.selectedProvider, ...decision.fallbackProviders];
    let lastError: Error | null = null;

    for (const providerName of providersToTry) {
      try {
        this.logger.info(`🚀 Попытка выполнения через ${providerName}`);
        
        const provider = this.providers.get(providerName);
        if (!provider || !provider.status.isAvailable) {
          continue;
        }

        // Проверяем загрузку провайдера
        if (provider.status.currentLoad > 90) {
          this.logger.warn(`⚠️ Провайдер ${providerName} перегружен (${provider.status.currentLoad}%)`);
          continue;
        }

        const result = await this.executeTaskWithProvider(provider, request);
        
        if (providerName !== decision.selectedProvider) {
          this.logger.info(`🔄 Fallback сработал: переключение на ${providerName}`);
          this.emit('fallback:used', {
            originalProvider: decision.selectedProvider,
            fallbackProvider: providerName,
            taskId: request.id
          });
        }

        return result;

      } catch (error) {
        lastError = error as Error;
        this.logger.warn(`❌ Провайдер ${providerName} недоступен: ${error.message}`);
        
        // Обновляем статус провайдера
        const provider = this.providers.get(providerName);
        if (provider) {
          await this.updateProviderMetrics(providerName, false, 0, null);
        }
      }
    }

    throw new Error(`Все AI провайдеры недоступны. Последняя ошибка: ${lastError?.message}`);
  }

  /**
   * Выполнение задачи конкретным провайдером
   */
  private async executeTaskWithProvider(provider: AIProvider, request: AITaskRequest): Promise<any> {
    const service = provider.service;

    switch (request.type) {
      case 'game_design':
        if ('generateGameDesign' in service) {
          return await service.generateGameDesign(request.prompt);
        }
        break;
        
      case 'code_generation':
        if ('generateCode' in service) {
          return await service.generateCode(request.prompt);
        }
        break;
        
      case 'image_generation':
        if ('generateImage' in service) {
          return await service.generateImage(request.prompt);
        }
        break;
        
      case 'sound_generation':
        if ('generateSound' in service) {
          return await service.generateSound(request.prompt);
        }
        break;
        
      case 'text_generation':
        if ('generateCode' in service) {
          return await service.generateCode(request.prompt);
        }
        break;
    }

    throw new Error(`Провайдер ${provider.name} не поддерживает тип задачи ${request.type}`);
  }

  /**
   * Расчет оценки провайдера для конкретной задачи
   */
  private async calculateProviderScore(
    provider: AIProvider, 
    request: AITaskRequest, 
    analysis: any
  ): Promise<number> {
    let score = 0;

    // Базовая совместимость с типом задачи (40%)
    const capability = provider.capabilities.find(c => c.type === request.type);
    if (!capability) return 0;

    // Качество для типа задачи
    const qualityWeight = request.requirements?.optimization === 'quality' ? 0.5 : 0.3;
    score += capability.quality * qualityWeight;

    // Скорость (20%)
    const speedWeight = request.requirements?.optimization === 'speed' ? 0.4 : 0.2;
    score += capability.speed * speedWeight;

    // Надежность (20%)
    score += capability.reliability * 0.2;

    // Стоимость (10%)
    const costWeight = request.requirements?.optimization === 'cost' ? 0.3 : 0.1;
    score += capability.costEfficiency * costWeight;

    // Текущая загрузка (штраф за высокую загрузку)
    const loadPenalty = provider.status.currentLoad / 100;
    score *= (1 - loadPenalty * 0.3);

    // Бонус за стабильную работу
    if (provider.metrics.uptime > 95) {
      score *= 1.1;
    }

    // Штраф за высокий процент ошибок
    if (provider.status.errorRate > 10) {
      score *= (1 - provider.status.errorRate / 200);
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Инициализация AI провайдеров
   */
  private initializeProviders(): void {
    // OpenAI
    const openaiService = new OpenAIService();
    this.providers.set('openai', {
      name: 'openai',
      service: openaiService,
      capabilities: [
        { type: 'image_generation', quality: 95, speed: 70, reliability: 90, costEfficiency: 60 },
        { type: 'sound_generation', quality: 85, speed: 80, reliability: 90, costEfficiency: 65 },
        { type: 'text_generation', quality: 88, speed: 85, reliability: 92, costEfficiency: 70 }
      ],
      status: {
        isAvailable: true,
        currentLoad: 0,
        responseTime: 0,
        errorRate: 0,
        lastCheck: new Date()
      },
      metrics: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        averageQuality: 0,
        uptime: 100
      },
      costs: {
        costPerRequest: 0.02,
        costPerToken: 0.0001,
        dailySpent: 0,
        monthlyLimit: 1000
      },
      priority: 1,
      costPerToken: 0.00003,
      maxTokens: 4000,
      reliability: 0.98,
      latency: 1500,
      rateLimits: {
        requestsPerMinute: 60,
        tokensPerMinute: 90000,
        requestsPerDay: 10000
      },
      healthScore: 100,
      errorCount: 0,
      successCount: 0
    });

    // Claude
    const claudeService = new ClaudeService();
    this.providers.set('claude', {
      name: 'claude',
      service: claudeService,
      capabilities: [
        { type: 'game_design', quality: 95, speed: 75, reliability: 95, costEfficiency: 75 },
        { type: 'code_generation', quality: 92, speed: 80, reliability: 94, costEfficiency: 80 },
        { type: 'text_generation', quality: 96, speed: 82, reliability: 96, costEfficiency: 78 }
      ],
      status: {
        isAvailable: true,
        currentLoad: 0,
        responseTime: 0,
        errorRate: 0,
        lastCheck: new Date()
      },
      metrics: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        averageQuality: 0,
        uptime: 100
      },
      costs: {
        costPerRequest: 0.015,
        costPerToken: 0.00008,
        dailySpent: 0,
        monthlyLimit: 1500
      },
      priority: 3,
      costPerToken: 0.00008,
      maxTokens: 4000,
      reliability: 0.97,
      latency: 1800,
      rateLimits: {
        requestsPerMinute: 50,
        tokensPerMinute: 40000,
        requestsPerDay: 5000
      },
      healthScore: 100,
      errorCount: 0,
      successCount: 0
    });

    // DeepSeek
    const deepseekService = new DeepSeekService();
    this.providers.set('deepseek', {
      name: 'deepseek',
      service: deepseekService,
      capabilities: [
        { type: 'code_generation', quality: 88, speed: 90, reliability: 85, costEfficiency: 95 },
        { type: 'game_design', quality: 82, speed: 88, reliability: 87, costEfficiency: 92 },
        { type: 'text_generation', quality: 85, speed: 92, reliability: 88, costEfficiency: 94 }
      ],
      status: {
        isAvailable: true,
        currentLoad: 0,
        responseTime: 0,
        errorRate: 0,
        lastCheck: new Date()
      },
      metrics: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        averageQuality: 0,
        uptime: 100
      },
      costs: {
        costPerRequest: 0.005,
        costPerToken: 0.00003,
        dailySpent: 0,
        monthlyLimit: 2000
      },
      priority: 2,
      costPerToken: 0.00002,
      maxTokens: 4000,
      reliability: 0.95,
      latency: 2000,
      rateLimits: {
        requestsPerMinute: 100,
        tokensPerMinute: 150000,
        requestsPerDay: 20000
      },
      healthScore: 100,
      errorCount: 0,
      successCount: 0
    });

    this.logger.info(`🤖 Инициализировано ${this.providers.size} AI провайдеров`);

    // Инициализируем circuit breakers
    for (const providerName of this.providers.keys()) {
      this.circuitBreakers.set(providerName, {
        state: 'closed',
        failures: 0,
        lastFailure: null,
        successCount: 0,
        nextAttempt: null
      });
    }
  }

  /**
   * Проверка возможности обработки задачи провайдером
   */
  private canHandleTask(provider: AIProvider, taskType: AITaskRequest['type']): boolean {
    return provider.capabilities.some(cap => cap.type === taskType);
  }

  /**
   * Генерация ключа для кеширования
   */
  private generateCacheKey(request: AITaskRequest): string {
    const contextHash = request.context ? 
      Buffer.from(JSON.stringify(request.context)).toString('base64').slice(0, 16) : '';
    
    return `${request.type}:${Buffer.from(request.prompt).toString('base64').slice(0, 32)}:${contextHash}`;
  }

  /**
   * Обновление метрик провайдера
   */
  private async updateProviderMetrics(
    providerName: string, 
    success: boolean, 
    responseTime: number, 
    result: any
  ): Promise<void> {
    const provider = this.providers.get(providerName);
    if (!provider) return;

    provider.metrics.totalRequests++;
    
    if (success) {
      provider.metrics.successfulRequests++;
      provider.status.errorRate = (provider.metrics.failedRequests / provider.metrics.totalRequests) * 100;
    } else {
      provider.metrics.failedRequests++;
      provider.status.errorRate = (provider.metrics.failedRequests / provider.metrics.totalRequests) * 100;
    }

    // Обновляем среднее время ответа
    provider.metrics.averageResponseTime = 
      (provider.metrics.averageResponseTime * (provider.metrics.totalRequests - 1) + responseTime) / 
      provider.metrics.totalRequests;

    provider.status.responseTime = responseTime;
    provider.status.lastCheck = new Date();

    // Обновляем загрузку (простая модель на основе частоты запросов)
    const recentRequests = this.getRecentRequests(providerName, 60000); // За последнюю минуту
    provider.status.currentLoad = Math.min(100, (recentRequests / 10) * 100);
  }

  /**
   * Получение количества недавних запросов
   */
  private getRecentRequests(providerName: string, timeWindow: number): number {
    // Простая реализация - в реальном проекте можно использовать более сложную логику
    return Math.floor(Math.random() * 5);
  }

  /**
   * Запуск мониторинга здоровья провайдеров
   */
  private startHealthMonitoring(): void {
    setInterval(async () => {
      await this.checkProvidersHealth();
    }, 30000); // Каждые 30 секунд

    this.logger.info('🏥 Запущен мониторинг здоровья AI провайдеров');
  }

  /**
   * Проверка здоровья всех провайдеров
   */
  private async checkProvidersHealth(): Promise<void> {
    for (const [name, provider] of this.providers) {
      try {
        await this.healthChecker.checkProvider(provider);
        provider.status.isAvailable = true;
      } catch (error) {
        provider.status.isAvailable = false;
        this.logger.warn(`💥 Провайдер ${name} недоступен: ${error.message}`);
      }
    }
  }

  /**
   * Получение статистики маршрутизации
   */
  public getRoutingStats(): any {
    const stats = {
      providers: {},
      totalRequests: 0,
      cacheHitRate: 0,
      averageResponseTime: 0
    };

    for (const [name, provider] of this.providers) {
      stats.providers[name] = {
        status: provider.status.isAvailable ? 'healthy' : 'unhealthy',
        load: provider.status.currentLoad,
        successRate: provider.metrics.totalRequests > 0 ? 
          (provider.metrics.successfulRequests / provider.metrics.totalRequests) * 100 : 0,
        averageResponseTime: provider.metrics.averageResponseTime,
        totalRequests: provider.metrics.totalRequests,
        dailyCost: provider.costs.dailySpent
      };
      
      stats.totalRequests += provider.metrics.totalRequests;
    }

    return stats;
  }

  /**
   * Генерация объяснения выбора провайдера
   */
  private generateReasoning(provider: AIProvider, request: AITaskRequest, analysis: any): string {
    const capability = provider.capabilities.find(c => c.type === request.type);
    if (!capability) return 'Провайдер не поддерживает данный тип задач';

    const reasons = [];
    
    if (capability.quality > 90) reasons.push('высокое качество');
    if (capability.speed > 85) reasons.push('быстрая обработка');
    if (capability.reliability > 90) reasons.push('высокая надежность');
    if (capability.costEfficiency > 80) reasons.push('оптимальная стоимость');
    if (provider.status.currentLoad < 50) reasons.push('низкая загрузка');

    return `Выбран за ${reasons.join(', ')}`;
  }

  /**
   * Оценка стоимости выполнения задачи
   */
  private estimateCost(provider: AIProvider, request: AITaskRequest): number {
    const baseCost = provider.costs.costPerRequest;
    const promptLength = request.prompt.length;
    const tokenCost = (promptLength / 4) * provider.costs.costPerToken; // Примерная оценка токенов
    
    return baseCost + tokenCost;
  }

  /**
   * Оценка времени выполнения задачи
   */
  private estimateTime(provider: AIProvider, request: AITaskRequest): number {
    const capability = provider.capabilities.find(c => c.type === request.type);
    if (!capability) return 30000; // 30 секунд по умолчанию

    // Базовое время в зависимости от скорости провайдера
    const baseTime = 10000 - (capability.speed * 100); // От 10 секунд до 100мс
    
    // Корректировка на основе загрузки
    const loadMultiplier = 1 + (provider.status.currentLoad / 100);
    
    return Math.max(1000, baseTime * loadMultiplier);
  }

  private initializeMonitoring(): MonitoringData {
    return {
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        cached: 0
      },
      providers: {},
      errors: {},
      performance: {
        avgResponseTime: 0,
        p95ResponseTime: 0,
        cacheHitRate: 0
      },
      costs: {
        total: 0,
        byProvider: {},
        savedByCaching: 0
      }
    };
  }

  private initializeErrorPatterns(): Map<string, RegExp> {
    return new Map([
      ['timeout', /timeout|timed out|connection timeout/i],
      ['rate_limit', /rate limit|quota exceeded|too many requests/i],
      ['server_error', /server error|internal error|5\d\d/i],
      ['network_error', /network error|connection refused|dns/i],
      ['authentication', /auth|unauthorized|invalid key|403/i],
      ['quota_exceeded', /quota|billing|payment|insufficient funds/i],
      ['model_error', /model not found|invalid model|unsupported/i]
    ]);
  }

  // =================== MAIN API ===================

  /**
   * Главный метод для выполнения AI запросов с интеллектуальной маршрутизацией
   */
  async generateResponse(options: RequestOptions): Promise<AIResponse> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();
    
    try {
      this.logger.info(`🚀 Запрос ${requestId} начат`, {
        capability: options.capability,
        priority: options.priority,
        tokens: options.maxTokens
      });

      this.monitoring.requests.total++;

      // 1. Проверяем кеш
      const cacheResult = await this.checkCache(options);
      if (cacheResult) {
        this.monitoring.requests.cached++;
        this.monitoring.costs.savedByCaching += this.estimateCost(options);
        
        this.logger.info(`💾 Кеш попадание для запроса ${requestId}`);
        return {
          ...cacheResult,
          cached: true,
          retryCount: 0
        };
      }

      // 2. Выбираем лучшего провайдера
      const selectedProvider = await this.selectBestProvider(options);
      if (!selectedProvider) {
        throw new Error('Нет доступных провайдеров');
      }

      // 3. Выполняем запрос с retry логикой
      const response = await this.executeWithRetry(selectedProvider, options, requestId);
      
      // 4. Сохраняем в кеш
      await this.cacheResponse(options, response);
      
      // 5. Обновляем метрики
      this.updateMetrics(selectedProvider.name, response, startTime);
      
      this.monitoring.requests.successful++;
      
      this.logger.info(`✅ Запрос ${requestId} завершен успешно`, {
        provider: selectedProvider.name,
        latency: response.latency,
        cost: response.cost
      });

      return response;

    } catch (error) {
      this.monitoring.requests.failed++;
      this.recordError(error, requestId);
      
      this.logger.error(`❌ Запрос ${requestId} завершился ошибкой:`, error);
      
      // Пытаемся fallback провайдеров
      if (options.fallbackProviders && options.fallbackProviders.length > 0) {
        return this.tryFallbackProviders(options, requestId, error);
      }
      
      throw error;
    }
  }

  // =================== PROVIDER SELECTION ===================

  /**
   * Выбор лучшего провайдера на основе множества факторов
   */
  private async selectBestProvider(options: RequestOptions): Promise<AIProvider | null> {
    const availableProviders = Array.from(this.providers.values())
      .filter(provider => this.isProviderAvailable(provider, options))
      .filter(provider => this.checkCircuitBreaker(provider.name));

    if (availableProviders.length === 0) {
      return null;
    }

    // Скоринг провайдеров
    const scoredProviders = availableProviders.map(provider => ({
      provider,
      score: this.calculateProviderScore(provider, options)
    }));

    // Сортируем по скору (больше = лучше)
    scoredProviders.sort((a, b) => b.score - a.score);

    this.logger.debug('🎯 Выбор провайдера:', {
      scores: scoredProviders.map(sp => ({
        name: sp.provider.name,
        score: sp.score.toFixed(2)
      }))
    });

    return scoredProviders[0].provider;
  }

  private isProviderAvailable(provider: AIProvider, options: RequestOptions): boolean {
    // Проверка capability
    if (options.capability && !provider.capabilities.includes(options.capability)) {
      return false;
    }

    // Проверка лимитов токенов
    if (options.maxTokens && options.maxTokens > provider.maxTokens) {
      return false;
    }

    // Проверка rate limits
    const rateLimitCheck = intelligentCache.checkRateLimit(
      provider.name,
      'requests',
      provider.rateLimits.requestsPerMinute,
      60000 // 1 минута
    );

    return rateLimitCheck.then(result => result.allowed);
  }

  // =================== CIRCUIT BREAKER ===================

  private checkCircuitBreaker(providerName: string): boolean {
    const breaker = this.circuitBreakers.get(providerName);
    if (!breaker) return true;

    const now = new Date();

    switch (breaker.state) {
      case 'closed':
        return true;

      case 'open':
        if (breaker.nextAttempt && now >= breaker.nextAttempt) {
          breaker.state = 'half-open';
          breaker.successCount = 0;
          this.logger.info(`🔓 Circuit breaker переходит в half-open: ${providerName}`);
          return true;
        }
        return false;

      case 'half-open':
        return true;

      default:
        return false;
    }
  }

  private updateCircuitBreaker(providerName: string, success: boolean): void {
    const breaker = this.circuitBreakers.get(providerName);
    if (!breaker) return;

    if (success) {
      if (breaker.state === 'half-open') {
        breaker.successCount++;
        if (breaker.successCount >= 3) {
          breaker.state = 'closed';
          breaker.failures = 0;
          breaker.lastFailure = null;
          this.logger.info(`✅ Circuit breaker закрыт: ${providerName}`);
        }
      } else if (breaker.state === 'closed') {
        breaker.failures = Math.max(0, breaker.failures - 1);
      }
    } else {
      breaker.failures++;
      breaker.lastFailure = new Date();

      if (breaker.state === 'closed' && breaker.failures >= 5) {
        breaker.state = 'open';
        breaker.nextAttempt = new Date(Date.now() + 60000); // 1 минута
        this.logger.warn(`🚫 Circuit breaker открыт: ${providerName}`);
      } else if (breaker.state === 'half-open') {
        breaker.state = 'open';
        breaker.nextAttempt = new Date(Date.now() + 120000); // 2 минуты
        this.logger.warn(`🚫 Circuit breaker снова открыт: ${providerName}`);
      }
    }
  }

  // =================== RETRY LOGIC ===================

  /**
   * Выполнение запроса с умной retry логикой
   */
  private async executeWithRetry(
    provider: AIProvider, 
    options: RequestOptions, 
    requestId: string
  ): Promise<AIResponse> {
    const maxRetries = options.retries ?? this.retryConfig.maxRetries;
    let lastError: Error;
    let attempt = 0;

    while (attempt <= maxRetries) {
      try {
        const startTime = Date.now();
        
        // Проверяем rate limits перед каждой попыткой
        const rateLimitCheck = await intelligentCache.checkRateLimit(
          provider.name,
          'requests',
          provider.rateLimits.requestsPerMinute,
          60000
        );

        if (!rateLimitCheck.allowed) {
          throw new Error(`Rate limit exceeded for ${provider.name}. Reset at ${new Date(rateLimitCheck.resetTime)}`);
        }

        this.logger.debug(`🔄 Попытка ${attempt + 1}/${maxRetries + 1} для ${provider.name}`, {
          requestId,
          remaining: rateLimitCheck.remaining
        });

        // Выполняем запрос
        const result = await this.executeProviderRequest(provider, options, requestId);
        
        const latency = Date.now() - startTime;
        const cost = this.calculateCost(provider, result.tokensUsed);

        // Успешное выполнение
        this.updateCircuitBreaker(provider.name, true);
        provider.successCount++;
        
        const response: AIResponse = {
          content: result.content,
          provider: provider.name,
          tokensUsed: result.tokensUsed,
          latency,
          cost,
          cached: false,
          retryCount: attempt,
          metadata: result.metadata
        };

        if (attempt > 0) {
          this.logger.info(`✅ Запрос успешен с ${attempt + 1} попытки`, {
            requestId,
            provider: provider.name
          });
        }

        return response;

      } catch (error) {
        lastError = error as Error;
        attempt++;
        
        const errorType = this.classifyError(error);
        const isRetryable = this.isRetryableError(errorType);
        
        this.logger.warn(`❌ Попытка ${attempt} неудачна для ${provider.name}:`, {
          requestId,
          errorType,
          isRetryable,
          error: error.message
        });

        // Обновляем circuit breaker
        this.updateCircuitBreaker(provider.name, false);
        provider.errorCount++;

        // Проверяем, стоит ли повторять
        if (!isRetryable || attempt > maxRetries) {
          break;
        }

        // Ждем перед следующей попыткой
        const delay = this.calculateRetryDelay(attempt, errorType);
        if (delay > 0) {
          this.logger.debug(`⏳ Ожидание ${delay}ms перед следующей попыткой`);
          await this.sleep(delay);
        }
      }
    }

    throw lastError;
  }

  private async executeProviderRequest(
    provider: AIProvider, 
    options: RequestOptions, 
    requestId: string
  ): Promise<{ content: string; tokensUsed: number; metadata?: any }> {
    const timeout = options.timeout || 30000;
    
    // Создаем promise с timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), timeout);
    });

    // Выбираем метод провайдера в зависимости от capability
    let providerPromise: Promise<any>;
    
    switch (options.capability) {
      case 'code':
        providerPromise = provider.service.generateCode(options.prompt);
        break;
      case 'creative':
        providerPromise = provider.service.generateCreative?.(options.prompt) || 
                         provider.service.generateCompletion(options.prompt);
        break;
      case 'analysis':
        providerPromise = provider.service.generateAnalysis?.(options.prompt) || 
                         provider.service.generateCompletion(options.prompt);
        break;
      default:
        providerPromise = provider.service.generateCompletion(options.prompt);
        break;
    }

    const result = await Promise.race([providerPromise, timeoutPromise]);
    
    return {
      content: result.content || result.text || result,
      tokensUsed: result.tokensUsed || this.estimateTokens(options.prompt + (result.content || result)),
      metadata: result.metadata || {}
    };
  }

  private classifyError(error: any): string {
    const errorMessage = error.message || error.toString();
    
    for (const [type, pattern] of this.errorTypePatterns) {
      if (pattern.test(errorMessage)) {
        return type;
      }
    }
    
    // Проверяем HTTP статус коды
    if (error.status) {
      if (error.status >= 500) return 'server_error';
      if (error.status === 429) return 'rate_limit';
      if (error.status === 401 || error.status === 403) return 'authentication';
      if (error.status === 404) return 'model_error';
    }
    
    return 'unknown_error';
  }

  private isRetryableError(errorType: string): boolean {
    return this.retryConfig.retryableErrors.includes(errorType);
  }

  private calculateRetryDelay(attempt: number, errorType: string): number {
    let baseDelay = this.retryConfig.baseDelay;
    
    // Увеличиваем задержку для rate limit
    if (errorType === 'rate_limit') {
      baseDelay *= 2;
    }
    
    // Экспоненциальная задержка
    let delay = baseDelay * Math.pow(this.retryConfig.backoffMultiplier, attempt - 1);
    
    // Ограничиваем максимальной задержкой
    delay = Math.min(delay, this.retryConfig.maxDelay);
    
    // Добавляем jitter для предотвращения thundering herd
    if (this.retryConfig.jitterEnabled) {
      delay += Math.random() * 1000;
    }
    
    return Math.floor(delay);
  }

  // =================== CACHING ===================

  private async checkCache(options: RequestOptions): Promise<AIResponse | null> {
    if (options.cacheOptions?.enabled === false) {
      return null;
    }

    try {
      const cacheKey = this.generateCacheKey(options);
      const cached = await intelligentCache.get<AIResponse>(cacheKey);
      
      if (cached) {
        // Обновляем метрики кеша
        this.monitoring.performance.cacheHitRate = 
          (this.monitoring.requests.cached + 1) / (this.monitoring.requests.total + 1);
        
        return cached;
      }
    } catch (error) {
      this.logger.warn('⚠️ Ошибка проверки кеша:', error);
    }

    return null;
  }

  private async cacheResponse(options: RequestOptions, response: AIResponse): Promise<void> {
    if (options.cacheOptions?.enabled === false) {
      return;
    }

    try {
      const cacheKey = this.generateCacheKey(options);
      const ttl = options.cacheOptions?.ttl || 3600; // 1 час по умолчанию
      
      await intelligentCache.set(cacheKey, response, {
        ttl,
        tags: ['ai-response', response.provider, ...(options.cacheOptions?.tags || [])],
        priority: this.getPriorityCacheScore(options.priority)
      });
    } catch (error) {
      this.logger.warn('⚠️ Ошибка кеширования:', error);
    }
  }

  private generateCacheKey(options: RequestOptions): string {
    const hash = require('crypto')
      .createHash('md5')
      .update(JSON.stringify({
        prompt: options.prompt,
        capability: options.capability,
        maxTokens: options.maxTokens,
        temperature: options.temperature
      }))
      .digest('hex');
    
    return `ai:${options.capability || 'completion'}:${hash}`;
  }

  private getPriorityCacheScore(priority?: string): number {
    switch (priority) {
      case 'critical': return 5;
      case 'high': return 4;
      case 'medium': return 3;
      case 'low': return 2;
      default: return 3;
    }
  }

  // =================== FALLBACK LOGIC ===================

  private async tryFallbackProviders(
    options: RequestOptions, 
    requestId: string, 
    originalError: Error
  ): Promise<AIResponse> {
    this.logger.info(`🔄 Пробуем fallback провайдеров для ${requestId}`);
    
    for (const fallbackName of options.fallbackProviders || []) {
      const fallbackProvider = this.providers.get(fallbackName);
      
      if (!fallbackProvider) {
        this.logger.warn(`⚠️ Fallback провайдер не найден: ${fallbackName}`);
        continue;
      }
      
      if (!this.checkCircuitBreaker(fallbackName)) {
        this.logger.warn(`🚫 Fallback провайдер недоступен (circuit breaker): ${fallbackName}`);
        continue;
      }
      
      try {
        this.logger.info(`🔄 Пробуем fallback: ${fallbackName}`);
        
        // Уменьшаем количество retry для fallback
        const fallbackOptions = {
          ...options,
          retries: Math.max(1, (options.retries || this.retryConfig.maxRetries) - 1)
        };
        
        const response = await this.executeWithRetry(fallbackProvider, fallbackOptions, requestId);
        
        this.logger.info(`✅ Fallback успешен: ${fallbackName}`);
        return response;
        
      } catch (fallbackError) {
        this.logger.warn(`❌ Fallback неудачен: ${fallbackName}`, fallbackError);
      }
    }
    
    // Если все fallback провайдеры не сработали, бросаем оригинальную ошибку
    throw originalError;
  }

  // =================== MONITORING & METRICS ===================

  private updateMetrics(providerName: string, response: AIResponse, startTime: number): void {
    const responseTime = Date.now() - startTime;
    
    // Обновляем производительность
    this.performanceWindow.push(responseTime);
    if (this.performanceWindow.length > 100) {
      this.performanceWindow.shift();
    }
    
    this.monitoring.performance.avgResponseTime = 
      this.performanceWindow.reduce((a, b) => a + b, 0) / this.performanceWindow.length;
    
    // P95 latency
    const sorted = [...this.performanceWindow].sort((a, b) => a - b);
    const p95Index = Math.floor(sorted.length * 0.95);
    this.monitoring.performance.p95ResponseTime = sorted[p95Index] || 0;
    
    // Метрики провайдера
    if (!this.monitoring.providers[providerName]) {
      this.monitoring.providers[providerName] = {
        requests: 0,
        errors: 0,
        avgLatency: 0,
        totalCost: 0,
        tokensUsed: 0,
        reliability: 1
      };
    }
    
    const providerStats = this.monitoring.providers[providerName];
    providerStats.requests++;
    providerStats.totalCost += response.cost;
    providerStats.tokensUsed += response.tokensUsed;
    providerStats.avgLatency = (providerStats.avgLatency * (providerStats.requests - 1) + response.latency) / providerStats.requests;
    providerStats.reliability = (providerStats.requests - providerStats.errors) / providerStats.requests;
    
    // Общие затраты
    this.monitoring.costs.total += response.cost;
    if (!this.monitoring.costs.byProvider[providerName]) {
      this.monitoring.costs.byProvider[providerName] = 0;
    }
    this.monitoring.costs.byProvider[providerName] += response.cost;
  }

  private recordError(error: any, requestId: string): void {
    const errorType = this.classifyError(error);
    
    if (!this.monitoring.errors[errorType]) {
      this.monitoring.errors[errorType] = {
        count: 0,
        lastOccurrence: new Date(),
        examples: []
      };
    }
    
    const errorStats = this.monitoring.errors[errorType];
    errorStats.count++;
    errorStats.lastOccurrence = new Date();
    
    // Сохраняем примеры ошибок (максимум 5)
    const errorMessage = error.message || error.toString();
    if (errorStats.examples.length < 5) {
      errorStats.examples.push(`${requestId}: ${errorMessage}`);
    }
    
    this.emit('error', {
      type: errorType,
      message: errorMessage,
      requestId,
      timestamp: new Date()
    });
  }

  // =================== HEALTH CHECKING ===================

  private startHealthChecking(): void {
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, 60000); // Каждую минуту
  }

  private async performHealthCheck(): Promise<void> {
    this.logger.debug('🏥 Проверка здоровья провайдеров...');
    
    for (const [name, provider] of this.providers) {
      try {
        const startTime = Date.now();
        
        // Простой тестовый запрос
        await provider.service.generateCompletion('ping', { maxTokens: 1 });
        
        const latency = Date.now() - startTime;
        
        // Обновляем показатели здоровья
        provider.healthScore = Math.min(100, provider.healthScore + 1);
        provider.latency = (provider.latency * 0.9) + (latency * 0.1); // Экспоненциальное сглаживание
        
        this.logger.debug(`✅ ${name} здоров (${provider.healthScore}/100, ${latency}ms)`);
        
      } catch (error) {
        provider.healthScore = Math.max(0, provider.healthScore - 10);
        provider.lastError = new Date();
        
        this.logger.warn(`⚠️ ${name} нездоров (${provider.healthScore}/100):`, error.message);
      }
    }
  }

  private startPerformanceTracking(): void {
    // Отправляем метрики каждые 5 минут
    setInterval(() => {
      this.emit('metrics', this.getMetrics());
    }, 5 * 60 * 1000);
  }

  // =================== UTILITY METHODS ===================

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateCost(provider: AIProvider, tokensUsed: number): number {
    return provider.costPerToken * tokensUsed;
  }

  private estimateCost(options: RequestOptions): number {
    const estimatedTokens = this.estimateTokens(options.prompt);
    const averageCost = Array.from(this.providers.values())
      .reduce((sum, p) => sum + p.costPerToken, 0) / this.providers.size;
    
    return averageCost * estimatedTokens;
  }

  private estimateTokens(text: string): number {
    // Простая оценка: ~4 символа на токен
    return Math.ceil(text.length / 4);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // =================== PUBLIC API ===================

  /**
   * Получение метрик мониторинга
   */
  getMetrics(): MonitoringData {
    return JSON.parse(JSON.stringify(this.monitoring));
  }

  /**
   * Получение статуса всех провайдеров
   */
  getProvidersStatus(): { [key: string]: any } {
    const status: { [key: string]: any } = {};
    
    for (const [name, provider] of this.providers) {
      const breaker = this.circuitBreakers.get(name);
      
      status[name] = {
        name: provider.name,
        healthScore: provider.healthScore,
        reliability: provider.reliability,
        latency: provider.latency,
        circuitBreakerState: breaker?.state || 'unknown',
        successCount: provider.successCount,
        errorCount: provider.errorCount,
        lastError: provider.lastError,
        rateLimits: provider.rateLimits,
        capabilities: provider.capabilities
      };
    }
    
    return status;
  }

  /**
   * Ручное управление circuit breaker
   */
  resetCircuitBreaker(providerName: string): boolean {
    const breaker = this.circuitBreakers.get(providerName);
    if (!breaker) return false;
    
    breaker.state = 'closed';
    breaker.failures = 0;
    breaker.lastFailure = null;
    breaker.successCount = 0;
    breaker.nextAttempt = null;
    
    this.logger.info(`🔧 Circuit breaker сброшен вручную: ${providerName}`);
    return true;
  }

  /**
   * Очистка кеша AI ответов
   */
  async clearCache(tags?: string[]): Promise<number> {
    if (tags && tags.length > 0) {
      let cleared = 0;
      for (const tag of tags) {
        cleared += await intelligentCache.clearByTag(tag);
      }
      return cleared;
    } else {
      await intelligentCache.clearByTag('ai-response');
      return 1; // Примерное значение
    }
  }

  /**
   * Закрытие сервиса
   */
  async close(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    this.logger.info('🤖 Интеллектуальный AI роутер остановлен');
  }

  // =================== NEW METHODS ===================

  public async generateCode(prompt: string, systemPrompt?: string): Promise<AIResponse> {
    return this.routeRequest('generateCode', [prompt, systemPrompt]);
  }

  public async generateGameDesign(prompt: string): Promise<AIResponse> {
    return this.routeRequest('generateGameDesign', [prompt]);
  }

  public async generatePhaserScene(sceneName: string, mechanics: string[], gameDesign: any): Promise<AIResponse> {
    return this.routeRequest('generatePhaserScene', [sceneName, mechanics, gameDesign]);
  }

  public async generateYandexIntegration(features: string[]): Promise<AIResponse> {
    return this.routeRequest('generateYandexIntegration', [features]);
  }

  private async routeRequest(method: string, args: any[]): Promise<AIResponse> {
    const requestId = `${method}-${Date.now()}-${Math.random()}`;
    const startTime = Date.now();

    this.logger.debug(`🚀 Маршрутизация запроса ${requestId}: ${method}`, { args: args.length });

    // Создаем promise для запроса
    return new Promise(async (resolve, reject) => {
      this.requestQueue.set(requestId, {
        resolve,
        reject,
        retryCount: 0,
        startTime
      });

      try {
        const result = await this.executeWithFailover(method, args, requestId);
        this.requestQueue.delete(requestId);
        resolve(result);
      } catch (error) {
        this.requestQueue.delete(requestId);
        reject(error);
      }
    });
  }

  private async executeWithFailover(method: string, args: any[], requestId: string): Promise<AIResponse> {
    let lastError: Error | null = null;
    const availableServices = await this.getAvailableServices();

    if (availableServices.length === 0) {
      throw new AIServiceError('Все AI сервисы недоступны', 'router', {
        requestId,
        method,
        availableServices: 0
      });
    }

    // Пытаемся выполнить запрос через доступные сервисы
    for (let attempt = 0; attempt < this.config.retryAttempts; attempt++) {
      for (const serviceName of availableServices) {
        try {
          this.logger.debug(`🔄 Попытка ${attempt + 1}/${this.config.retryAttempts} через ${serviceName}`, {
            requestId,
            method
          });

          const service = this.providers.get(serviceName);
          if (!service || !service[method]) {
            throw new Error(`Метод ${method} не поддерживается сервисом ${serviceName}`);
          }

          // Выполняем запрос с таймаутом
          const result = await this.executeWithTimeout(
            service[method].bind(service),
            args,
            this.config.timeoutMs
          );

          // Успешный запрос
          const duration = Date.now() - this.requestQueue.get(requestId)!.startTime;
          this.logger.info(`✅ Запрос ${requestId} выполнен через ${serviceName}`, {
            duration,
            method,
            tokensUsed: result.tokensUsed
          });

          this.emit('router:request-completed', {
            requestId,
            serviceName,
            method,
            duration,
            success: true
          });

          return result;

        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          
          this.logger.warn(`⚠️ Ошибка выполнения через ${serviceName}:`, {
            requestId,
            method,
            attempt: attempt + 1,
            error: lastError.message
          });

          this.emit('router:request-failed', {
            requestId,
            serviceName,
            method,
            attempt: attempt + 1,
            error: lastError.message
          });

          // Если это критическая ошибка сервиса, переходим к следующему сервису
          if (this.isCriticalError(lastError)) {
            break;
          }
        }
      }

      // Пауза между попытками
      if (attempt < this.config.retryAttempts - 1) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000); // Exponential backoff
        await this.delay(delay);
      }
    }

    // Если все попытки исчерпаны
    const finalError = new AIServiceError(
      `Не удалось выполнить запрос ${method} ни через один из доступных сервисов`,
      'router',
      {
        requestId,
        method,
        lastError: lastError?.message,
        attemptsExhausted: this.config.retryAttempts,
        availableServices: availableServices.length
      }
    );

    this.emit('router:request-exhausted', {
      requestId,
      method,
      error: finalError.message,
      availableServices
    });

    throw finalError;
  }

  private async getAvailableServices(): Promise<string[]> {
    try {
      // Получаем активный сервис от health monitor
      const activeService = await aiHealthMonitor.getActiveService();
      const healthData = await aiHealthMonitor.getHealthData() as any[];
      
      // Сортируем сервисы по приоритету и здоровью
      const sortedServices = healthData
        .filter(service => service.status === 'healthy' || service.status === 'degraded')
        .sort((a, b) => {
          // Приоритет: активный сервис всегда первый
          if (a.serviceName === activeService) return -1;
          if (b.serviceName === activeService) return 1;
          
          // Затем по статусу здоровья
          if (a.status === 'healthy' && b.status !== 'healthy') return -1;
          if (b.status === 'healthy' && a.status !== 'healthy') return 1;
          
          // Затем по времени отклика
          return a.responseTime - b.responseTime;
        })
        .map(service => service.serviceName);

      this.logger.debug('📊 Доступные сервисы:', {
        activeService,
        sortedServices,
        totalAvailable: sortedServices.length
      });

      return sortedServices;
      
    } catch (error) {
      this.logger.error('Ошибка получения доступных сервисов:', error);
      
      // Fallback к статической конфигурации
      return this.config.preferredServices.filter(name => this.providers.has(name));
    }
  }

  private async executeWithTimeout<T>(
    fn: (...args: any[]) => Promise<T>,
    args: any[],
    timeoutMs: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Превышен таймаут выполнения запроса (${timeoutMs}ms)`));
      }, timeoutMs);

      fn(...args)
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  private isCriticalError(error: Error): boolean {
    const criticalErrors = [
      'API key',
      'authentication',
      'unauthorized',
      'quota exceeded',
      'rate limit',
      'service unavailable'
    ];

    const errorMessage = error.message.toLowerCase();
    return criticalErrors.some(critical => errorMessage.includes(critical));
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Балансировщик нагрузки
 */
class LoadBalancer {
  public distributeLoad(providers: AIProvider[], request: AITaskRequest): AIProvider[] {
    // Сортируем по загрузке и качеству
    return providers.sort((a, b) => {
      const aScore = (100 - a.status.currentLoad) + a.capabilities[0]?.quality || 0;
      const bScore = (100 - b.status.currentLoad) + b.capabilities[0]?.quality || 0;
      return bScore - aScore;
    });
  }
}

/**
 * Проверка здоровья провайдеров
 */
class HealthChecker {
  public async checkProvider(provider: AIProvider): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Простой тест запрос
      if ('generateCode' in provider.service) {
        await provider.service.generateCode('Test prompt for health check');
      }
      
      const responseTime = Date.now() - startTime;
      provider.status.responseTime = responseTime;
      provider.status.lastCheck = new Date();
      
    } catch (error) {
      throw new Error(`Health check failed: ${error.message}`);
    }
  }
}

/**
 * Анализатор контекста
 */
class ContextAnalyzer {
  public async analyze(request: AITaskRequest): Promise<any> {
    const analysis = {
      complexity: this.estimateComplexity(request.prompt),
      domain: this.identifyDomain(request.prompt),
      urgency: request.requirements?.optimization === 'speed' ? 'high' : 'normal',
      qualityRequirement: request.requirements?.optimization === 'quality' ? 'high' : 'normal'
    };

    return analysis;
  }

  private estimateComplexity(prompt: string): 'low' | 'medium' | 'high' {
    if (prompt.length < 100) return 'low';
    if (prompt.length < 500) return 'medium';
    return 'high';
  }

  private identifyDomain(prompt: string): string {
    const gameKeywords = ['игра', 'game', 'платформер', 'аркада', 'головоломка'];
    const codeKeywords = ['код', 'code', 'function', 'class', 'javascript'];
    
    const lowerPrompt = prompt.toLowerCase();
    
    if (gameKeywords.some(keyword => lowerPrompt.includes(keyword))) {
      return 'gaming';
    }
    
    if (codeKeywords.some(keyword => lowerPrompt.includes(keyword))) {
      return 'programming';
    }
    
    return 'general';
  }
}

/**
 * Трекер стоимости
 */
class CostTracker {
  private dailyCosts = new Map<string, number>();

  public trackCost(providerName: string, cost: number): void {
    const today = new Date().toDateString();
    const key = `${providerName}:${today}`;
    
    const currentCost = this.dailyCosts.get(key) || 0;
    this.dailyCosts.set(key, currentCost + cost);
  }

  public getDailyCost(providerName: string): number {
    const today = new Date().toDateString();
    const key = `${providerName}:${today}`;
    return this.dailyCosts.get(key) || 0;
  }
}

// Singleton экземпляр
export const intelligentAIRouter = new IntelligentAIRouter();
export default intelligentAIRouter; 
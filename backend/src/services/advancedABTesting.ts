import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { LoggerService } from './logger';

// Типы A/B тестов
export type TestType = 
  | 'ui_ux'           // Тестирование элементов интерфейса
  | 'generation'      // Алгоритмы генерации
  | 'asset_quality'   // Настройки качества ассетов
  | 'user_flow'       // Пути пользователя
  | 'monetization'    // Монетизация
  | 'performance'     // Производительность
  | 'content';        // Контент и копирайтинг

// Конфигурация A/B теста
export interface ABTestConfig {
  id: string;
  name: string;
  description: string;
  type: TestType;
  category: string;
  
  // Настройки теста
  isActive: boolean;
  startDate: Date;
  endDate?: Date;
  
  // Варианты
  variants: TestVariant[];
  
  // Таргетинг
  targeting: TestTargeting;
  
  // Метрики
  primaryMetric: string;
  secondaryMetrics: string[];
  
  // Статистическая значимость
  confidenceLevel: number; // 95%, 99% и т.д.
  minSampleSize: number;
  
  // Результаты
  results?: TestResults;
  status: 'draft' | 'running' | 'paused' | 'completed' | 'stopped';
}

export interface TestVariant {
  id: string;
  name: string;
  description: string;
  weight: number; // Процент трафика 0-100
  isControl: boolean;
  
  // Настройки варианта в зависимости от типа теста
  config: VariantConfig;
}

export interface VariantConfig {
  // UI/UX настройки
  ui?: {
    theme?: 'light' | 'dark' | 'auto';
    primaryColor?: string;
    buttonStyle?: 'rounded' | 'square' | 'pill';
    layout?: 'compact' | 'spacious' | 'card';
    animationsEnabled?: boolean;
    showHelpTips?: boolean;
    navigationStyle?: 'tabs' | 'sidebar' | 'dropdown';
  };
  
  // Настройки генерации
  generation?: {
    aiProvider?: 'openai' | 'deepseek' | 'claude';
    temperature?: number;
    maxTokens?: number;
    enhancedPrompts?: boolean;
    useTemplates?: boolean;
    qualityThreshold?: number;
    iterations?: number;
    cacheEnabled?: boolean;
  };
  
  // Настройки качества ассетов
  assetQuality?: {
    aiModel?: 'dall-e-3' | 'dall-e-2';
    imageQuality?: 'standard' | 'hd';
    enhancedGeneration?: boolean;
    postProcessing?: boolean;
    retryOnLowQuality?: boolean;
    minQualityScore?: number;
    styleConsistency?: boolean;
  };
  
  // Пользовательский путь
  userFlow?: {
    skipOnboarding?: boolean;
    showTemplateGallery?: boolean;
    enableQuickStart?: boolean;
    autoSaveEnabled?: boolean;
    suggestionsEnabled?: boolean;
    progressIndicator?: boolean;
  };
  
  // Произвольные настройки
  custom?: Record<string, any>;
}

export interface TestTargeting {
  // Демография
  countries?: string[];
  languages?: string[];
  devices?: ('desktop' | 'mobile' | 'tablet')[];
  
  // Поведение пользователя
  newUsers?: boolean;
  returningUsers?: boolean;
  registeredUsers?: boolean;
  premiumUsers?: boolean;
  
  // Активность
  minGamesCreated?: number;
  maxGamesCreated?: number;
  lastActiveWithin?: number; // дней
  
  // Технические
  browsers?: string[];
  minLoadTime?: number;
  maxLoadTime?: number;
  
  // Процент охвата
  trafficAllocation?: number; // 0-100%
}

export interface TestResults {
  startedAt: Date;
  endedAt?: Date;
  
  // Общие метрики
  totalParticipants: number;
  variantResults: Map<string, VariantResults>;
  
  // Статистическая значимость
  isSignificant: boolean;
  pValue: number;
  confidenceInterval: [number, number];
  
  // Победитель
  winningVariant?: string;
  improvement?: number; // в процентах
  
  // Рекомендации
  recommendation: 'implement_winner' | 'continue_testing' | 'stop_test' | 'inconclusive';
  insights: string[];
}

export interface VariantResults {
  variantId: string;
  participants: number;
  
  // Основные метрики
  primaryMetricValue: number;
  primaryMetricChange?: number; // относительно контроля
  
  // Вторичные метрики
  secondaryMetrics: Map<string, number>;
  
  // Временные ряды
  dailyMetrics: Array<{
    date: Date;
    participants: number;
    primaryMetric: number;
    secondaryMetrics: Record<string, number>;
  }>;
  
  // Сегментированные результаты
  segmentedResults?: Map<string, VariantResults>;
}

export interface UserAssignment {
  userId: string;
  testId: string;
  variantId: string;
  assignedAt: Date;
  firstExposure?: Date;
  lastActivity?: Date;
  conversions: string[];
  metadata: Record<string, any>;
}

export interface MetricEvent {
  userId: string;
  testId?: string;
  variantId?: string;
  eventType: string;
  eventName: string;
  value: number;
  properties: Record<string, any>;
  timestamp: Date;
}

export class AdvancedABTestingService extends EventEmitter {
  private logger: LoggerService;
  private tests: Map<string, ABTestConfig> = new Map();
  private assignments: Map<string, Map<string, UserAssignment>> = new Map(); // userId -> testId -> assignment
  private metrics: Map<string, MetricEvent[]> = new Map(); // testId -> events
  private cache: Map<string, any> = new Map();

  constructor() {
    super();
    this.logger = new LoggerService();
    this.initializeDefaultTests();
  }

  /**
   * Создание нового A/B теста
   */
  public async createTest(config: Omit<ABTestConfig, 'id'>): Promise<ABTestConfig> {
    const test: ABTestConfig = {
      id: uuidv4(),
      ...config,
      status: 'draft'
    };

    // Валидация теста
    this.validateTestConfig(test);
    
    this.tests.set(test.id, test);
    this.metrics.set(test.id, []);
    
    this.logger.info(`🧪 A/B тест создан: ${test.name} (${test.type})`);
    this.emit('test:created', test);
    
    return test;
  }

  /**
   * Запуск A/B теста
   */
  public async startTest(testId: string): Promise<boolean> {
    const test = this.tests.get(testId);
    if (!test) {
      throw new Error(`Тест ${testId} не найден`);
    }

    if (test.status !== 'draft') {
      throw new Error(`Тест можно запустить только из статуса 'draft'`);
    }

    test.status = 'running';
    test.startDate = new Date();
    
    this.logger.info(`🚀 A/B тест запущен: ${test.name}`);
    this.emit('test:started', test);
    
    return true;
  }

  /**
   * Назначение пользователя в A/B тест
   */
  public async assignUserToTest(userId: string, testId: string): Promise<string | null> {
    const test = this.tests.get(testId);
    if (!test || test.status !== 'running') {
      return null;
    }

    // Проверяем, подходит ли пользователь под таргетинг
    if (!(await this.isUserEligible(userId, test))) {
      return null;
    }

    // Проверяем существующее назначение
    const userAssignments = this.assignments.get(userId) || new Map();
    const existingAssignment = userAssignments.get(testId);
    
    if (existingAssignment) {
      return existingAssignment.variantId;
    }

    // Назначаем вариант
    const variantId = this.selectVariant(userId, test);
    if (!variantId) {
      return null;
    }

    const assignment: UserAssignment = {
      userId,
      testId,
      variantId,
      assignedAt: new Date(),
      conversions: [],
      metadata: {}
    };

    userAssignments.set(testId, assignment);
    this.assignments.set(userId, userAssignments);

    this.logger.debug(`👤 Пользователь ${userId} назначен в вариант ${variantId} теста ${testId}`);
    this.emit('user:assigned', { userId, testId, variantId });

    return variantId;
  }

  /**
   * Получение конфигурации для пользователя
   */
  public async getUserConfig(userId: string, type: TestType): Promise<any> {
    const configs = {};
    const userAssignments = this.assignments.get(userId) || new Map();

    for (const [testId, assignment] of userAssignments) {
      const test = this.tests.get(testId);
      if (!test || test.type !== type || test.status !== 'running') {
        continue;
      }

      const variant = test.variants.find(v => v.id === assignment.variantId);
      if (!variant) {
        continue;
      }

      // Записываем первое воздействие
      if (!assignment.firstExposure) {
        assignment.firstExposure = new Date();
        this.emit('user:exposed', { userId, testId, variantId: assignment.variantId });
      }

      // Обновляем последнюю активность
      assignment.lastActivity = new Date();

      // Мержим конфигурации
      Object.assign(configs, variant.config);
    }

    return configs;
  }

  /**
   * Запись метрики/события
   */
  public trackEvent(event: Omit<MetricEvent, 'timestamp'>): void {
    const metricEvent: MetricEvent = {
      ...event,
      timestamp: new Date()
    };

    // Определяем A/B тест пользователя если не указан
    if (!metricEvent.testId && metricEvent.userId) {
      const userAssignments = this.assignments.get(metricEvent.userId);
      if (userAssignments) {
        for (const [testId, assignment] of userAssignments) {
          const test = this.tests.get(testId);
          if (test && test.status === 'running') {
            metricEvent.testId = testId;
            metricEvent.variantId = assignment.variantId;
            break;
          }
        }
      }
    }

    if (metricEvent.testId) {
      const testEvents = this.metrics.get(metricEvent.testId) || [];
      testEvents.push(metricEvent);
      this.metrics.set(metricEvent.testId, testEvents);

      // Проверяем конверсии
      this.checkConversion(metricEvent);
    }

    this.emit('metric:tracked', metricEvent);
  }

  /**
   * Получение результатов теста
   */
  public async getTestResults(testId: string): Promise<TestResults | null> {
    const test = this.tests.get(testId);
    if (!test) {
      return null;
    }

    const events = this.metrics.get(testId) || [];
    
    // Группируем события по вариантам
    const variantEvents = new Map<string, MetricEvent[]>();
    const variantParticipants = new Map<string, Set<string>>();

    for (const event of events) {
      if (!event.variantId) continue;
      
      if (!variantEvents.has(event.variantId)) {
        variantEvents.set(event.variantId, []);
        variantParticipants.set(event.variantId, new Set());
      }
      
      variantEvents.get(event.variantId)!.push(event);
      variantParticipants.get(event.variantId)!.add(event.userId);
    }

    // Вычисляем результаты для каждого варианта
    const variantResults = new Map<string, VariantResults>();
    
    for (const variant of test.variants) {
      const participants = variantParticipants.get(variant.id)?.size || 0;
      const variantEventList = variantEvents.get(variant.id) || [];
      
      // Основная метрика
      const primaryMetricEvents = variantEventList.filter(e => e.eventName === test.primaryMetric);
      const primaryMetricValue = this.calculateMetricValue(test.primaryMetric, primaryMetricEvents, participants);
      
      // Вторичные метрики
      const secondaryMetrics = new Map<string, number>();
      for (const metric of test.secondaryMetrics) {
        const metricEvents = variantEventList.filter(e => e.eventName === metric);
        const value = this.calculateMetricValue(metric, metricEvents, participants);
        secondaryMetrics.set(metric, value);
      }

      variantResults.set(variant.id, {
        variantId: variant.id,
        participants,
        primaryMetricValue,
        secondaryMetrics,
        dailyMetrics: this.calculateDailyMetrics(variantEventList, test.primaryMetric, test.secondaryMetrics)
      });
    }

    // Статистическая значимость
    const { isSignificant, pValue, confidenceInterval } = this.calculateStatisticalSignificance(
      variantResults,
      test.primaryMetric,
      test.confidenceLevel
    );

    // Определяем победителя
    const { winningVariant, improvement } = this.determineWinner(variantResults, test.variants);

    const results: TestResults = {
      startedAt: test.startDate,
      endedAt: test.status === 'completed' ? test.endDate : undefined,
      totalParticipants: Array.from(variantResults.values()).reduce((sum, r) => sum + r.participants, 0),
      variantResults,
      isSignificant,
      pValue,
      confidenceInterval,
      winningVariant,
      improvement,
      recommendation: this.generateRecommendation(variantResults, isSignificant, test),
      insights: this.generateInsights(variantResults, test)
    };

    test.results = results;
    return results;
  }

  /**
   * Получение всех активных тестов
   */
  public getActiveTests(): ABTestConfig[] {
    return Array.from(this.tests.values()).filter(test => test.status === 'running');
  }

  /**
   * Получение конфигурации UI/UX для пользователя
   */
  public async getUIConfig(userId: string): Promise<any> {
    return this.getUserConfig(userId, 'ui_ux');
  }

  /**
   * Получение конфигурации генерации для пользователя
   */
  public async getGenerationConfig(userId: string): Promise<any> {
    return this.getUserConfig(userId, 'generation');
  }

  /**
   * Получение конфигурации качества ассетов для пользователя
   */
  public async getAssetQualityConfig(userId: string): Promise<any> {
    return this.getUserConfig(userId, 'asset_quality');
  }

  /**
   * Остановка теста
   */
  public async stopTest(testId: string, reason: string = 'manual'): Promise<boolean> {
    const test = this.tests.get(testId);
    if (!test) {
      return false;
    }

    test.status = 'stopped';
    test.endDate = new Date();
    
    this.logger.info(`⏹️ A/B тест остановлен: ${test.name} (причина: ${reason})`);
    this.emit('test:stopped', { test, reason });
    
    return true;
  }

  // Приватные методы

  private validateTestConfig(test: ABTestConfig): void {
    if (test.variants.length < 2) {
      throw new Error('Тест должен содержать минимум 2 варианта');
    }

    const totalWeight = test.variants.reduce((sum, v) => sum + v.weight, 0);
    if (Math.abs(totalWeight - 100) > 0.01) {
      throw new Error('Общий вес вариантов должен быть равен 100%');
    }

    const controlVariants = test.variants.filter(v => v.isControl);
    if (controlVariants.length !== 1) {
      throw new Error('Должен быть ровно один контрольный вариант');
    }
  }

  private async isUserEligible(userId: string, test: ABTestConfig): Promise<boolean> {
    const targeting = test.targeting;
    
    // Проверка трафика
    if (targeting.trafficAllocation && targeting.trafficAllocation < 100) {
      const hash = this.hashUserId(userId + test.id);
      if (hash > targeting.trafficAllocation) {
        return false;
      }
    }

    // Здесь можно добавить дополнительные проверки:
    // - геолокация, устройство, поведение пользователя и т.д.
    
    return true;
  }

  private selectVariant(userId: string, test: ABTestConfig): string | null {
    const hash = this.hashUserId(userId + test.id + 'variant');
    let cumulative = 0;
    
    for (const variant of test.variants) {
      cumulative += variant.weight;
      if (hash <= cumulative) {
        return variant.id;
      }
    }
    
    return test.variants[0].id; // Fallback
  }

  private hashUserId(input: string): number {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash) % 100;
  }

  private checkConversion(event: MetricEvent): void {
    if (!event.testId || !event.variantId) return;

    const test = this.tests.get(event.testId);
    if (!test) return;

    // Проверяем, является ли событие конверсией
    const isConversion = test.primaryMetric === event.eventName || 
                        test.secondaryMetrics.includes(event.eventName);

    if (isConversion) {
      const userAssignments = this.assignments.get(event.userId);
      const assignment = userAssignments?.get(event.testId);
      
      if (assignment && !assignment.conversions.includes(event.eventName)) {
        assignment.conversions.push(event.eventName);
        this.emit('conversion', { userId: event.userId, testId: event.testId, eventName: event.eventName });
      }
    }
  }

  private calculateMetricValue(metricName: string, events: MetricEvent[], participants: number): number {
    if (participants === 0) return 0;

    switch (metricName) {
      case 'conversion_rate':
        return (events.length / participants) * 100;
      case 'average_value':
        return events.reduce((sum, e) => sum + e.value, 0) / participants;
      case 'total_value':
        return events.reduce((sum, e) => sum + e.value, 0);
      case 'unique_conversions':
        const uniqueUsers = new Set(events.map(e => e.userId));
        return (uniqueUsers.size / participants) * 100;
      default:
        return events.length / participants;
    }
  }

  private calculateDailyMetrics(events: MetricEvent[], primaryMetric: string, secondaryMetrics: string[]): Array<{
    date: Date;
    participants: number;
    primaryMetric: number;
    secondaryMetrics: Record<string, number>;
  }> {
    const dailyData = new Map<string, {
      participants: Set<string>;
      primaryEvents: MetricEvent[];
      secondaryEvents: Map<string, MetricEvent[]>;
    }>();

    // Группируем события по дням
    for (const event of events) {
      const dateKey = event.timestamp.toISOString().split('T')[0];
      
      if (!dailyData.has(dateKey)) {
        dailyData.set(dateKey, {
          participants: new Set(),
          primaryEvents: [],
          secondaryEvents: new Map()
        });
      }

      const dayData = dailyData.get(dateKey)!;
      dayData.participants.add(event.userId);

      if (event.eventName === primaryMetric) {
        dayData.primaryEvents.push(event);
      }

      if (secondaryMetrics.includes(event.eventName)) {
        if (!dayData.secondaryEvents.has(event.eventName)) {
          dayData.secondaryEvents.set(event.eventName, []);
        }
        dayData.secondaryEvents.get(event.eventName)!.push(event);
      }
    }

    // Конвертируем в результат
    return Array.from(dailyData.entries()).map(([dateStr, data]) => {
      const participantCount = data.participants.size;
      const secondaryMetricsData: Record<string, number> = {};

      for (const metric of secondaryMetrics) {
        const metricEvents = data.secondaryEvents.get(metric) || [];
        secondaryMetricsData[metric] = this.calculateMetricValue(metric, metricEvents, participantCount);
      }

      return {
        date: new Date(dateStr),
        participants: participantCount,
        primaryMetric: this.calculateMetricValue(primaryMetric, data.primaryEvents, participantCount),
        secondaryMetrics: secondaryMetricsData
      };
    }).sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  private calculateStatisticalSignificance(
    variantResults: Map<string, VariantResults>,
    primaryMetric: string,
    confidenceLevel: number
  ): { isSignificant: boolean; pValue: number; confidenceInterval: [number, number] } {
    // Упрощенный расчет статистической значимости
    // В реальной реализации следует использовать более сложные статистические методы
    
    const variants = Array.from(variantResults.values());
    if (variants.length < 2) {
      return { isSignificant: false, pValue: 1, confidenceInterval: [0, 0] };
    }

    const control = variants.find(v => {
      const test = Array.from(this.tests.values()).find(t => 
        t.variants.some(variant => variant.id === v.variantId && variant.isControl)
      );
      return !!test;
    });

    if (!control) {
      return { isSignificant: false, pValue: 1, confidenceInterval: [0, 0] };
    }

    // Находим лучший вариант
    const bestVariant = variants.reduce((best, current) => 
      current.primaryMetricValue > best.primaryMetricValue ? current : best
    );

    // Простой расчет значимости (в реальности нужен z-test или t-test)
    const improvement = ((bestVariant.primaryMetricValue - control.primaryMetricValue) / control.primaryMetricValue) * 100;
    const minSampleSize = 100; // Минимальный размер выборки
    
    const isSignificant = Math.abs(improvement) > 5 && // Минимум 5% улучшение
                         bestVariant.participants >= minSampleSize &&
                         control.participants >= minSampleSize;

    // Упрощенный p-value (в реальности нужен правильный расчет)
    const pValue = isSignificant ? 0.03 : 0.15;
    
    return {
      isSignificant,
      pValue,
      confidenceInterval: [improvement - 2, improvement + 2] // Упрощенный доверительный интервал
    };
  }

  private determineWinner(
    variantResults: Map<string, VariantResults>,
    variants: TestVariant[]
  ): { winningVariant?: string; improvement?: number } {
    const results = Array.from(variantResults.values());
    if (results.length === 0) {
      return {};
    }

    const control = results.find(r => {
      const variant = variants.find(v => v.id === r.variantId);
      return variant?.isControl;
    });

    const winner = results.reduce((best, current) => 
      current.primaryMetricValue > best.primaryMetricValue ? current : best
    );

    if (!control || winner === control) {
      return {};
    }

    const improvement = ((winner.primaryMetricValue - control.primaryMetricValue) / control.primaryMetricValue) * 100;

    return {
      winningVariant: winner.variantId,
      improvement: Math.round(improvement * 100) / 100
    };
  }

  private generateRecommendation(
    variantResults: Map<string, VariantResults>,
    isSignificant: boolean,
    test: ABTestConfig
  ): TestResults['recommendation'] {
    const totalParticipants = Array.from(variantResults.values())
      .reduce((sum, r) => sum + r.participants, 0);

    if (totalParticipants < test.minSampleSize) {
      return 'continue_testing';
    }

    if (!isSignificant) {
      return 'inconclusive';
    }

    const { winningVariant } = this.determineWinner(variantResults, test.variants);
    const controlVariant = test.variants.find(v => v.isControl);

    if (winningVariant && winningVariant !== controlVariant?.id) {
      return 'implement_winner';
    }

    return 'stop_test';
  }

  private generateInsights(variantResults: Map<string, VariantResults>, test: ABTestConfig): string[] {
    const insights: string[] = [];
    const results = Array.from(variantResults.values());
    
    if (results.length === 0) {
      return ['Недостаточно данных для анализа'];
    }

    // Анализ участия
    const totalParticipants = results.reduce((sum, r) => sum + r.participants, 0);
    if (totalParticipants < test.minSampleSize) {
      insights.push(`Требуется больше участников (${totalParticipants}/${test.minSampleSize})`);
    }

    // Анализ производительности вариантов
    const bestResult = results.reduce((best, current) => 
      current.primaryMetricValue > best.primaryMetricValue ? current : best
    );
    const worstResult = results.reduce((worst, current) => 
      current.primaryMetricValue < worst.primaryMetricValue ? current : worst
    );

    const performanceDiff = ((bestResult.primaryMetricValue - worstResult.primaryMetricValue) / worstResult.primaryMetricValue) * 100;
    insights.push(`Разница между лучшим и худшим вариантом: ${performanceDiff.toFixed(1)}%`);

    // Специфичные инсайты по типу теста
    switch (test.type) {
      case 'ui_ux':
        if (test.primaryMetric === 'conversion_rate') {
          insights.push('Изменения UI/UX показывают влияние на конверсию пользователей');
        }
        break;
      case 'generation':
        insights.push('Тестирование алгоритмов генерации может влиять на качество и скорость создания игр');
        break;
      case 'asset_quality':
        insights.push('Различные настройки качества ассетов влияют на удовлетворенность пользователей');
        break;
    }

    return insights;
  }

  private initializeDefaultTests(): void {
    // Создаем несколько примеров A/B тестов
    
    // 1. UI/UX тест
    this.createTest({
      name: 'Новый дизайн главной страницы',
      description: 'Тестирование нового дизайна с карточками vs список',
      type: 'ui_ux',
      category: 'interface',
      isActive: false,
      startDate: new Date(),
      variants: [
        {
          id: 'control',
          name: 'Текущий дизайн (список)',
          description: 'Существующий дизайн со списком игр',
          weight: 50,
          isControl: true,
          config: {
            ui: {
              layout: 'compact',
              theme: 'light'
            }
          }
        },
        {
          id: 'cards',
          name: 'Карточный дизайн',
          description: 'Новый дизайн с карточками игр',
          weight: 50,
          isControl: false,
          config: {
            ui: {
              layout: 'card',
              theme: 'light',
              animationsEnabled: true
            }
          }
        }
      ],
      targeting: {
        trafficAllocation: 20,
        newUsers: true
      },
      primaryMetric: 'conversion_rate',
      secondaryMetrics: ['time_on_page', 'games_created'],
      confidenceLevel: 95,
      minSampleSize: 200
    });

    // 2. Тест качества ассетов
    this.createTest({
      name: 'Высокое качество vs Скорость генерации ассетов',
      description: 'Тестирование влияния качества ассетов на удовлетворенность',
      type: 'asset_quality',
      category: 'generation',
      isActive: false,
      startDate: new Date(),
      variants: [
        {
          id: 'standard',
          name: 'Стандартное качество',
          description: 'Быстрая генерация со стандартным качеством',
          weight: 50,
          isControl: true,
          config: {
            assetQuality: {
              imageQuality: 'standard',
              enhancedGeneration: false,
              minQualityScore: 70
            }
          }
        },
        {
          id: 'enhanced',
          name: 'Улучшенное качество',
          description: 'Медленная генерация с высоким качеством',
          weight: 50,
          isControl: false,
          config: {
            assetQuality: {
              imageQuality: 'hd',
              enhancedGeneration: true,
              minQualityScore: 85,
              retryOnLowQuality: true
            }
          }
        }
      ],
      targeting: {
        trafficAllocation: 30,
        premiumUsers: true
      },
      primaryMetric: 'user_satisfaction',
      secondaryMetrics: ['generation_time', 'asset_quality_rating'],
      confidenceLevel: 95,
      minSampleSize: 150
    });

    this.logger.info('🧪 Инициализированы примеры A/B тестов');
  }
}

export const abTestingService = new AdvancedABTestingService(); 
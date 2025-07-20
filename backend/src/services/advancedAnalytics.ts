import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import { join } from 'path';
import { logger } from './logger';
import { analyticsService } from './analytics';
import { AnalyticsService, AnalyticsEvent, UserSession } from './analytics';
import { OpenAIService } from './ai/openai';
import { ClaudeService } from './ai/claude';
import { v4 as uuidv4 } from 'uuid';

export interface AnalyticsMetric {
  id: string;
  name: string;
  value: number;
  previousValue?: number;
  change?: number;
  changePercent?: number;
  trend: 'up' | 'down' | 'stable';
  unit: string;
  category: 'performance' | 'usage' | 'revenue' | 'user' | 'technical';
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface TimeSeriesData {
  timestamp: Date;
  value: number;
  label?: string;
  metadata?: Record<string, any>;
}

export interface ChartData {
  id: string;
  title: string;
  type: 'line' | 'bar' | 'pie' | 'area' | 'scatter' | 'heatmap' | 'funnel';
  data: TimeSeriesData[];
  config: {
    xAxis: string;
    yAxis: string;
    groupBy?: string;
    aggregation?: 'sum' | 'avg' | 'min' | 'max' | 'count';
    timeRange?: string;
    filters?: Record<string, any>;
  };
  insights?: string[];
}

export interface AnalyticsReport {
  id: string;
  title: string;
  description: string;
  type: 'dashboard' | 'export' | 'automated' | 'custom';
  
  // Временной период
  dateRange: {
    start: Date;
    end: Date;
    period: 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
  };
  
  // Метрики и данные
  metrics: AnalyticsMetric[];
  charts: ChartData[];
  
  // Анализ и инсайты
  insights: Array<{
    type: 'trend' | 'anomaly' | 'opportunity' | 'warning' | 'achievement';
    title: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
    actionable: boolean;
    recommendations?: string[];
  }>;
  
  // Сравнение
  comparison?: {
    previousPeriod: AnalyticsReport;
    benchmarks?: Record<string, number>;
    goals?: Record<string, number>;
  };
  
  // Метаданные
  generatedAt: Date;
  generatedBy: string;
  tags: string[];
  visibility: 'public' | 'private' | 'team';
  format: 'json' | 'pdf' | 'csv' | 'excel';
}

export interface UserSegment {
  id: string;
  name: string;
  description: string;
  criteria: Array<{
    field: string;
    operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains';
    value: any;
  }>;
  userCount: number;
  metrics: Record<string, number>;
  createdAt: Date;
}

export interface PerformanceAlert {
  id: string;
  type: 'threshold' | 'anomaly' | 'trend' | 'comparison';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  metric: string;
  currentValue: number;
  thresholdValue?: number;
  triggeredAt: Date;
  status: 'active' | 'acknowledged' | 'resolved';
  assignedTo?: string;
  actions: Array<{
    type: 'email' | 'slack' | 'webhook' | 'dashboard';
    config: Record<string, any>;
  }>;
}

export interface FunnelAnalysis {
  id: string;
  name: string;
  steps: Array<{
    name: string;
    users: number;
    conversionRate?: number;
    dropoffRate?: number;
    averageTime?: number;
  }>;
  totalUsers: number;
  overallConversion: number;
  bottlenecks: Array<{
    step: string;
    dropoffRate: number;
    impact: number;
  }>;
  insights: string[];
  recommendations: string[];
}

export interface CohortAnalysis {
  id: string;
  type: 'retention' | 'revenue' | 'engagement';
  periods: string[];
  cohorts: Array<{
    period: string;
    size: number;
    data: number[];
  }>;
  averageRetention: number[];
  insights: string[];
}

interface PredictiveModel {
  id: string;
  name: string;
  type: 'classification' | 'regression' | 'clustering' | 'time_series';
  description: string;
  features: string[];
  targetVariable: string;
  algorithm: string;
  accuracy: number;
  trainingData: any[];
  modelParams: any;
  lastTrained: Date;
  isActive: boolean;
}

interface Prediction {
  id: string;
  modelId: string;
  userId?: string;
  sessionId?: string;
  prediction: any;
  confidence: number;
  features: Record<string, any>;
  timestamp: Date;
  actualOutcome?: any;
  accuracy?: number;
}

interface UserInsight {
  userId: string;
  segments: string[];
  ltv: number; // Lifetime Value
  churnProbability: number;
  nextBestAction: string;
  engagementScore: number;
  personalizedRecommendations: string[];
  riskFactors: string[];
  opportunities: string[];
  behaviorPattern: 'new_user' | 'active_user' | 'power_user' | 'at_risk' | 'churned';
}

interface AnomalyDetection {
  id: string;
  type: 'metric_spike' | 'metric_drop' | 'unusual_pattern' | 'fraud_detection';
  metric: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  detectedAt: Date;
  description: string;
  expectedValue: number;
  actualValue: number;
  deviation: number;
  possibleCauses: string[];
  recommendedActions: string[];
  autoResolved: boolean;
}

interface IntelligentInsight {
  id: string;
  type: 'opportunity' | 'warning' | 'trend' | 'recommendation';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  confidence: number;
  data: any;
  actionable: boolean;
  suggestedActions: string[];
  createdAt: Date;
  relevantFor: string[]; // user segments or roles
}

interface ABTestOptimization {
  testId: string;
  optimizations: {
    trafficAllocation: number;
    segmentFilters: string[];
    expectedImprovement: number;
    riskAssessment: string;
  };
  personalizedVariants: {
    segment: string;
    variantId: string;
    reasoningScore: number;
  }[];
}

export class AdvancedAnalyticsService extends EventEmitter {
  private analyticsService: AnalyticsService;
  private openaiService: OpenAIService;
  private claudeService: ClaudeService;
  private models: Map<string, PredictiveModel> = new Map();
  private predictions: Map<string, Prediction[]> = new Map();
  private userInsights: Map<string, UserInsight> = new Map();
  private cohorts: Map<string, CohortAnalysis> = new Map();
  private anomalies: AnomalyDetection[] = [];
  private insights: IntelligentInsight[] = [];

  constructor(analyticsService: AnalyticsService) {
    super();
    this.analyticsService = analyticsService;
    this.openaiService = new OpenAIService();
    this.claudeService = new ClaudeService();
    
    this.initializePredictiveModels();
    this.setupRealTimeAnalysis();
  }

  // Инициализация предиктивных моделей
  private initializePredictiveModels(): void {
    const defaultModels: PredictiveModel[] = [
      {
        id: 'churn_prediction',
        name: 'Предсказание оттока пользователей',
        type: 'classification',
        description: 'Модель для предсказания вероятности ухода пользователя',
        features: ['session_frequency', 'avg_session_duration', 'games_created', 'last_activity_days', 'engagement_score'],
        targetVariable: 'will_churn',
        algorithm: 'gradient_boosting',
        accuracy: 0.85,
        trainingData: [],
        modelParams: {
          maxDepth: 10,
          learningRate: 0.1,
          nEstimators: 100
        },
        lastTrained: new Date(),
        isActive: true
      },
      {
        id: 'ltv_prediction',
        name: 'Предсказание жизненной ценности пользователя',
        type: 'regression',
        description: 'Модель для предсказания LTV пользователя',
        features: ['registration_days', 'total_sessions', 'games_created', 'avg_session_duration', 'purchases_count'],
        targetVariable: 'lifetime_value',
        algorithm: 'random_forest',
        accuracy: 0.78,
        trainingData: [],
        modelParams: {
          nEstimators: 150,
          maxFeatures: 'sqrt'
        },
        lastTrained: new Date(),
        isActive: true
      },
      {
        id: 'conversion_prediction',
        name: 'Предсказание конверсии',
        type: 'classification',
        description: 'Модель для предсказания вероятности покупки',
        features: ['page_views', 'time_on_site', 'feature_usage', 'referrer_type', 'device_type'],
        targetVariable: 'will_convert',
        algorithm: 'logistic_regression',
        accuracy: 0.72,
        trainingData: [],
        modelParams: {
          regularization: 'l2',
          C: 1.0
        },
        lastTrained: new Date(),
        isActive: true
      },
      {
        id: 'game_success_prediction',
        name: 'Предсказание успешности игры',
        type: 'classification',
        description: 'Модель для предсказания популярности создаваемой игры',
        features: ['game_type', 'complexity', 'creation_time', 'user_skill_level', 'market_trends'],
        targetVariable: 'will_be_popular',
        algorithm: 'neural_network',
        accuracy: 0.68,
        trainingData: [],
        modelParams: {
          hiddenLayers: [64, 32, 16],
          activation: 'relu',
          dropout: 0.2
        },
        lastTrained: new Date(),
        isActive: true
      },
      {
        id: 'user_segmentation',
        name: 'Сегментация пользователей',
        type: 'clustering',
        description: 'Модель для автоматической сегментации пользователей',
        features: ['session_count', 'games_created', 'engagement_score', 'spending', 'feature_usage_vector'],
        targetVariable: 'segment',
        algorithm: 'kmeans',
        accuracy: 0.75,
        trainingData: [],
        modelParams: {
          nClusters: 5,
          maxIter: 300
        },
        lastTrained: new Date(),
        isActive: true
      }
    ];

    defaultModels.forEach(model => {
      this.models.set(model.id, model);
    });

    logger.info('Инициализированы предиктивные модели', { count: defaultModels.length });
  }

  // Настройка анализа в реальном времени
  private setupRealTimeAnalysis(): void {
    // Слушаем события аналитики
    this.analyticsService.on('event_tracked', (event: AnalyticsEvent) => {
      this.processEventForPredictions(event);
      this.detectAnomalies(event);
    });

    // Периодический анализ
    setInterval(() => {
      this.performPeriodicAnalysis();
    }, 60 * 60 * 1000); // Каждый час

    // Обновление инсайтов каждые 6 часов
    setInterval(() => {
      this.generateIntelligentInsights();
    }, 6 * 60 * 60 * 1000);

    // Обучение моделей каждые 24 часа
    setInterval(() => {
      this.retrainModels();
    }, 24 * 60 * 60 * 1000);
  }

  // Обработка события для предсказаний
  private async processEventForPredictions(event: AnalyticsEvent): Promise<void> {
    try {
      if (event.userId) {
        // Обновляем инсайты пользователя
        await this.updateUserInsights(event.userId);
        
        // Делаем предсказания
        await this.makePredictions(event.userId, event.sessionId);
      }

      // Проверяем необходимость обновления когорт
      if (event.eventName === 'user_registered') {
        await this.updateCohortAnalysis(event.userId);
      }
    } catch (error) {
      logger.error('Ошибка обработки события для предсказаний', { error, eventId: event.id });
    }
  }

  // Создание предсказаний
  async makePredictions(userId: string, sessionId?: string): Promise<Prediction[]> {
    const predictions: Prediction[] = [];

    for (const model of this.models.values()) {
      if (!model.isActive) continue;

      try {
        const features = await this.extractFeatures(userId, model.features);
        const prediction = await this.runModel(model, features);

        const predictionRecord: Prediction = {
          id: uuidv4(),
          modelId: model.id,
          userId,
          sessionId,
          prediction: prediction.value,
          confidence: prediction.confidence,
          features,
          timestamp: new Date()
        };

        predictions.push(predictionRecord);

        // Сохраняем предсказание
        const userPredictions = this.predictions.get(userId) || [];
        userPredictions.push(predictionRecord);
        this.predictions.set(userId, userPredictions);

        logger.info('Создано предсказание', { 
          modelId: model.id, 
          userId, 
          prediction: prediction.value,
          confidence: prediction.confidence 
        });
      } catch (error) {
        logger.error('Ошибка создания предсказания', { error, modelId: model.id, userId });
      }
    }

    return predictions;
  }

  // Извлечение признаков для модели
  private async extractFeatures(userId: string, requiredFeatures: string[]): Promise<Record<string, any>> {
    const features: Record<string, any> = {};
    
    // Получаем данные пользователя из аналитики
    const userSessions = Array.from(this.analyticsService['sessions'].values())
      .filter(session => session.userId === userId);
    
    const userEvents = Array.from(this.analyticsService['events'].values())
      .flat()
      .filter(event => event.userId === userId);

    for (const feature of requiredFeatures) {
      switch (feature) {
        case 'session_frequency':
          const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          const recentSessions = userSessions.filter(s => s.startTime >= last30Days);
          features[feature] = recentSessions.length / 30;
          break;

        case 'avg_session_duration':
          const avgDuration = userSessions.length > 0 
            ? userSessions.reduce((sum, s) => sum + (s.duration || 0), 0) / userSessions.length
            : 0;
          features[feature] = avgDuration;
          break;

        case 'games_created':
          features[feature] = userEvents.filter(e => e.eventName === 'game_created').length;
          break;

        case 'last_activity_days':
          const lastSession = userSessions.sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime())[0];
          const daysSinceLastActivity = lastSession 
            ? (Date.now() - lastSession.lastActivity.getTime()) / (24 * 60 * 60 * 1000)
            : 999;
          features[feature] = daysSinceLastActivity;
          break;

        case 'engagement_score':
          features[feature] = await this.calculateEngagementScore(userId);
          break;

        case 'total_sessions':
          features[feature] = userSessions.length;
          break;

        case 'purchases_count':
          features[feature] = userEvents.filter(e => e.eventName === 'payment_completed').length;
          break;

        case 'page_views':
          features[feature] = userEvents.filter(e => e.eventType === 'page_view').length;
          break;

        case 'time_on_site':
          features[feature] = userSessions.reduce((sum, s) => sum + (s.duration || 0), 0);
          break;

        default:
          features[feature] = 0; // Дефолтное значение
      }
    }

    return features;
  }

  // Запуск модели (упрощенная версия)
  private async runModel(model: PredictiveModel, features: Record<string, any>): Promise<{ value: any; confidence: number }> {
    // В реальной реализации здесь был бы вызов ML библиотеки
    // Для демонстрации используем упрощенную логику
    
    let prediction: any;
    let confidence: number;

    switch (model.type) {
      case 'classification':
        // Логистическая регрессия или градиентный бустинг
        const score = this.calculateClassificationScore(features, model);
        prediction = score > 0.5 ? 1 : 0;
        confidence = Math.abs(score - 0.5) * 2;
        break;

      case 'regression':
        // Линейная регрессия или случайный лес
        prediction = this.calculateRegressionValue(features, model);
        confidence = Math.min(0.95, Math.max(0.5, model.accuracy));
        break;

      case 'clustering':
        // K-means или другие алгоритмы кластеризации
        prediction = this.assignCluster(features, model);
        confidence = 0.8;
        break;

      default:
        prediction = 0;
        confidence = 0.5;
    }

    return { value: prediction, confidence };
  }

  // Вспомогательные методы для моделей
  private calculateClassificationScore(features: Record<string, any>, model: PredictiveModel): number {
    // Упрощенная логика классификации
    let score = 0.5;
    
    if (model.id === 'churn_prediction') {
      const lastActivityDays = features.last_activity_days || 0;
      const sessionFreq = features.session_frequency || 0;
      const engagementScore = features.engagement_score || 0;
      
      score = 1 / (1 + Math.exp(-(
        -2 + 
        lastActivityDays * 0.1 - 
        sessionFreq * 0.5 - 
        engagementScore * 0.3
      )));
    } else if (model.id === 'conversion_prediction') {
      const pageViews = features.page_views || 0;
      const timeOnSite = features.time_on_site || 0;
      
      score = 1 / (1 + Math.exp(-(
        -3 + 
        Math.log(pageViews + 1) * 0.5 +
        Math.log(timeOnSite + 1) * 0.3
      )));
    }

    return Math.max(0, Math.min(1, score));
  }

  private calculateRegressionValue(features: Record<string, any>, model: PredictiveModel): number {
    if (model.id === 'ltv_prediction') {
      const sessions = features.total_sessions || 0;
      const gamesCreated = features.games_created || 0;
      const purchases = features.purchases_count || 0;
      
      return Math.max(0, 
        sessions * 0.5 + 
        gamesCreated * 2.0 + 
        purchases * 50.0 +
        Math.random() * 10 // Добавляем шум
      );
    }
    
    return Math.random() * 100;
  }

  private assignCluster(features: Record<string, any>, model: PredictiveModel): string {
    // Упрощенная кластеризация
    const engagementScore = features.engagement_score || 0;
    const gamesCreated = features.games_created || 0;
    
    if (engagementScore > 0.8 && gamesCreated > 10) return 'power_user';
    if (engagementScore > 0.6 && gamesCreated > 5) return 'active_user';
    if (engagementScore > 0.3) return 'casual_user';
    if (gamesCreated === 0) return 'new_user';
    return 'at_risk_user';
  }

  // Расчет скора вовлеченности
  private async calculateEngagementScore(userId: string): Promise<number> {
    const userEvents = Array.from(this.analyticsService['events'].values())
      .flat()
      .filter(event => event.userId === userId);
    
    const userSessions = Array.from(this.analyticsService['sessions'].values())
      .filter(session => session.userId === userId);

    if (userEvents.length === 0) return 0;

    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentEvents = userEvents.filter(e => e.timestamp >= last30Days);
    const recentSessions = userSessions.filter(s => s.startTime >= last30Days);

    // Частота использования
    const frequency = recentSessions.length / 30;
    
    // Разнообразие действий
    const uniqueEvents = new Set(recentEvents.map(e => e.eventName)).size;
    const diversity = Math.min(1, uniqueEvents / 10);
    
    // Глубина взаимодействия
    const avgEventsPerSession = recentSessions.length > 0 
      ? recentEvents.length / recentSessions.length 
      : 0;
    const depth = Math.min(1, avgEventsPerSession / 20);
    
    // Рецентность
    const lastActivity = Math.max(...userEvents.map(e => e.timestamp.getTime()));
    const daysSinceLastActivity = (Date.now() - lastActivity) / (24 * 60 * 60 * 1000);
    const recency = Math.max(0, 1 - daysSinceLastActivity / 30);
    
    // Итоговый скор
    const score = (frequency * 0.3 + diversity * 0.2 + depth * 0.3 + recency * 0.2);
    
    return Math.min(1, score);
  }

  // Обновление инсайтов пользователя
  private async updateUserInsights(userId: string): Promise<void> {
    try {
      const predictions = this.predictions.get(userId) || [];
      const latestPredictions = predictions.slice(-5); // Последние 5 предсказаний

      const churnPrediction = latestPredictions.find(p => p.modelId === 'churn_prediction');
      const ltvPrediction = latestPredictions.find(p => p.modelId === 'ltv_prediction');
      const segmentPrediction = latestPredictions.find(p => p.modelId === 'user_segmentation');

      const engagementScore = await this.calculateEngagementScore(userId);
      const behaviorPattern = this.determineBehaviorPattern(userId, predictions);
      
      const insight: UserInsight = {
        userId,
        segments: segmentPrediction ? [segmentPrediction.prediction] : ['unknown'],
        ltv: ltvPrediction ? ltvPrediction.prediction : 0,
        churnProbability: churnPrediction ? churnPrediction.prediction : 0.5,
        nextBestAction: await this.determineNextBestAction(userId, predictions),
        engagementScore,
        personalizedRecommendations: await this.generatePersonalizedRecommendations(userId),
        riskFactors: await this.identifyRiskFactors(userId, predictions),
        opportunities: await this.identifyOpportunities(userId, predictions),
        behaviorPattern
      };

      this.userInsights.set(userId, insight);
      
      logger.info('Обновлены инсайты пользователя', { userId, churnProbability: insight.churnProbability });
    } catch (error) {
      logger.error('Ошибка обновления инсайтов пользователя', { error, userId });
    }
  }

  // Определение паттерна поведения
  private determineBehaviorPattern(userId: string, predictions: Prediction[]): UserInsight['behaviorPattern'] {
    const userEvents = Array.from(this.analyticsService['events'].values())
      .flat()
      .filter(event => event.userId === userId);

    const registrationDays = this.getDaysSinceRegistration(userId);
    const totalSessions = Array.from(this.analyticsService['sessions'].values())
      .filter(session => session.userId === userId).length;

    if (registrationDays <= 7) return 'new_user';
    if (totalSessions > 50 && userEvents.length > 200) return 'power_user';
    if (totalSessions > 10 && userEvents.length > 50) return 'active_user';
    
    const churnPrediction = predictions.find(p => p.modelId === 'churn_prediction');
    if (churnPrediction && churnPrediction.prediction > 0.7) return 'at_risk';
    
    const lastActivity = Math.max(...userEvents.map(e => e.timestamp.getTime()));
    const daysSinceLastActivity = (Date.now() - lastActivity) / (24 * 60 * 60 * 1000);
    if (daysSinceLastActivity > 30) return 'churned';

    return 'active_user';
  }

  // Определение следующего лучшего действия
  private async determineNextBestAction(userId: string, predictions: Prediction[]): Promise<string> {
    const insight = this.userInsights.get(userId);
    const userEvents = Array.from(this.analyticsService['events'].values())
      .flat()
      .filter(event => event.userId === userId);

    const churnPrediction = predictions.find(p => p.modelId === 'churn_prediction');
    const conversionPrediction = predictions.find(p => p.modelId === 'conversion_prediction');

    // Высокий риск оттока
    if (churnPrediction && churnPrediction.prediction > 0.7) {
      return 'send_retention_email';
    }

    // Высокая вероятность конверсии
    if (conversionPrediction && conversionPrediction.prediction > 0.6) {
      return 'show_upgrade_offer';
    }

    // Новый пользователь
    const registrationDays = this.getDaysSinceRegistration(userId);
    if (registrationDays <= 3) {
      return 'show_onboarding_tutorial';
    }

    // Активный пользователь без покупок
    const hasPurchases = userEvents.some(e => e.eventName === 'payment_completed');
    if (!hasPurchases && userEvents.length > 20) {
      return 'offer_free_trial';
    }

    // Пользователь создал много игр
    const gamesCreated = userEvents.filter(e => e.eventName === 'game_created').length;
    if (gamesCreated > 5) {
      return 'suggest_advanced_features';
    }

    return 'engage_with_content';
  }

  // Генерация персонализированных рекомендаций
  private async generatePersonalizedRecommendations(userId: string): Promise<string[]> {
    const userEvents = Array.from(this.analyticsService['events'].values())
      .flat()
      .filter(event => event.userId === userId);

    const recommendations: string[] = [];

    // Анализируем предпочтения по типам игр
    const gameTypes = userEvents
      .filter(e => e.eventName === 'game_created')
      .map(e => e.gameInfo?.gameType)
      .filter(Boolean);

    const popularGameType = this.getMostFrequent(gameTypes);
    if (popularGameType) {
      recommendations.push(`Попробуйте создать еще одну ${popularGameType} игру`);
    }

    // Рекомендации на основе времени активности
    const activityHours = userEvents.map(e => e.timestamp.getHours());
    const peakHour = this.getMostFrequent(activityHours);
    if (peakHour !== undefined) {
      recommendations.push(`Лучшее время для вас - ${peakHour}:00`);
    }

    // Рекомендации на основе паттернов использования
    const insight = this.userInsights.get(userId);
    if (insight) {
      if (insight.engagementScore < 0.3) {
        recommendations.push('Попробуйте наши интерактивные туториалы');
      }
      
      if (insight.behaviorPattern === 'power_user') {
        recommendations.push('Ознакомьтесь с продвинутыми функциями');
      }
    }

    return recommendations.slice(0, 5); // Максимум 5 рекомендаций
  }

  // Выявление факторов риска
  private async identifyRiskFactors(userId: string, predictions: Prediction[]): Promise<string[]> {
    const riskFactors: string[] = [];
    const userEvents = Array.from(this.analyticsService['events'].values())
      .flat()
      .filter(event => event.userId === userId);

    // Анализ активности
    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentEvents = userEvents.filter(e => e.timestamp >= last7Days);
    
    if (recentEvents.length === 0) {
      riskFactors.push('Отсутствие активности в течение недели');
    }

    // Анализ ошибок
    const errorEvents = userEvents.filter(e => e.eventType === 'error');
    if (errorEvents.length > userEvents.length * 0.1) {
      riskFactors.push('Высокая частота ошибок');
    }

    // Анализ времени сессий
    const userSessions = Array.from(this.analyticsService['sessions'].values())
      .filter(session => session.userId === userId);
    
    const avgSessionDuration = userSessions.length > 0 
      ? userSessions.reduce((sum, s) => sum + (s.duration || 0), 0) / userSessions.length
      : 0;
    
    if (avgSessionDuration < 60) { // Менее минуты
      riskFactors.push('Очень короткие сессии');
    }

    // Анализ предсказаний
    const churnPrediction = predictions.find(p => p.modelId === 'churn_prediction');
    if (churnPrediction && churnPrediction.prediction > 0.6) {
      riskFactors.push('Высокий риск оттока по модели ML');
    }

    return riskFactors;
  }

  // Выявление возможностей
  private async identifyOpportunities(userId: string, predictions: Prediction[]): Promise<string[]> {
    const opportunities: string[] = [];
    const userEvents = Array.from(this.analyticsService['events'].values())
      .flat()
      .filter(event => event.userId === userId);

    // Анализ потенциала монетизации
    const conversionPrediction = predictions.find(p => p.modelId === 'conversion_prediction');
    if (conversionPrediction && conversionPrediction.prediction > 0.5) {
      opportunities.push('Высокий потенциал конверсии');
    }

    // Анализ активности создания игр
    const gamesCreated = userEvents.filter(e => e.eventName === 'game_created').length;
    if (gamesCreated > 3) {
      opportunities.push('Потенциальный power user');
    }

    // Анализ социального потенциала
    const socialEvents = userEvents.filter(e => e.eventName.includes('share') || e.eventName.includes('social'));
    if (socialEvents.length > 0) {
      opportunities.push('Активный пользователь в соцсетях');
    }

    // Анализ времени регистрации
    const registrationDays = this.getDaysSinceRegistration(userId);
    if (registrationDays <= 30 && userEvents.length > 10) {
      opportunities.push('Быстрое освоение платформы');
    }

    return opportunities;
  }

  // Вспомогательные методы
  private getMostFrequent<T>(array: T[]): T | undefined {
    if (array.length === 0) return undefined;
    
    const frequency = array.reduce((acc, item) => {
      acc[item as any] = (acc[item as any] || 0) + 1;
      return acc;
    }, {} as Record<any, number>);

    return Object.keys(frequency).reduce((a, b) => 
      frequency[a] > frequency[b] ? a : b
    ) as T;
  }

  private getDaysSinceRegistration(userId: string): number {
    const userEvents = Array.from(this.analyticsService['events'].values())
      .flat()
      .filter(event => event.userId === userId);

    if (userEvents.length === 0) return 0;

    const firstEvent = userEvents.reduce((earliest, event) => 
      event.timestamp < earliest.timestamp ? event : earliest
    );

    return (Date.now() - firstEvent.timestamp.getTime()) / (24 * 60 * 60 * 1000);
  }

  // Обнаружение аномалий
  private detectAnomalies(event: AnalyticsEvent): void {
    // Здесь должны быть алгоритмы обнаружения аномалий
    // Для демонстрации используем простые правила
    
    const anomalies: AnomalyDetection[] = [];

    // Детектор всплесков активности
    if (event.eventType === 'page_view') {
      const currentHour = new Date().getHours();
      const recentEvents = Array.from(this.analyticsService['events'].values())
        .flat()
        .filter(e => {
          const eventHour = e.timestamp.getHours();
          return Math.abs(eventHour - currentHour) <= 1 && e.eventType === 'page_view';
        });

      if (recentEvents.length > 100) { // Необычно высокая активность
        anomalies.push({
          id: uuidv4(),
          type: 'metric_spike',
          metric: 'page_views_per_hour',
          severity: 'medium',
          detectedAt: new Date(),
          description: 'Необычно высокая активность просмотров страниц',
          expectedValue: 50,
          actualValue: recentEvents.length,
          deviation: (recentEvents.length - 50) / 50,
          possibleCauses: ['Вирусный контент', 'Бот-активность', 'Маркетинговая кампания'],
          recommendedActions: ['Проверить источники трафика', 'Анализировать качество трафика'],
          autoResolved: false
        });
      }
    }

    // Детектор ошибок
    if (event.eventType === 'error') {
      const recentErrors = Array.from(this.analyticsService['events'].values())
        .flat()
        .filter(e => e.eventType === 'error' && 
          (Date.now() - e.timestamp.getTime()) < 60 * 60 * 1000); // Последний час

      if (recentErrors.length > 10) {
        anomalies.push({
          id: uuidv4(),
          type: 'metric_spike',
          metric: 'error_rate',
          severity: 'high',
          detectedAt: new Date(),
          description: 'Высокая частота ошибок',
          expectedValue: 2,
          actualValue: recentErrors.length,
          deviation: (recentErrors.length - 2) / 2,
          possibleCauses: ['Проблемы с сервером', 'Ошибка в коде', 'Проблемы с внешними сервисами'],
          recommendedActions: ['Проверить логи сервера', 'Откатить последние изменения'],
          autoResolved: false
        });
      }
    }

    // Сохраняем аномалии
    this.anomalies.push(...anomalies);
    
    // Уведомляем о критических аномалиях
    anomalies.forEach(anomaly => {
      if (anomaly.severity === 'critical' || anomaly.severity === 'high') {
        logger.warn('Обнаружена аномалия', anomaly);
      }
    });
  }

  // Периодический анализ
  private async performPeriodicAnalysis(): Promise<void> {
    try {
      // Обновляем когортный анализ
      await this.updateAllCohorts();
      
      // Очищаем старые аномалии
      this.cleanupOldAnomalies();
      
      // Обновляем модели при необходимости
      await this.checkModelPerformance();
      
      logger.info('Периодический анализ завершен');
    } catch (error) {
      logger.error('Ошибка периодического анализа', { error });
    }
  }

  // Когортный анализ
  private async updateCohortAnalysis(userId: string): Promise<void> {
    // Определяем когорту пользователя по дате регистрации
    const registrationDate = this.getRegistrationDate(userId);
    const cohortId = this.getCohortId(registrationDate);
    
    let cohort = this.cohorts.get(cohortId);
    if (!cohort) {
      cohort = {
        cohortId,
        startDate: registrationDate,
        userCount: 0,
        retentionRates: {},
        metrics: {
          averageLTV: 0,
          conversionRate: 0,
          engagementScore: 0,
          topFeatures: []
        },
        trends: {
          growth: 'stable',
          healthScore: 0.5,
          warnings: []
        }
      };
      this.cohorts.set(cohortId, cohort);
    }

    cohort.userCount++;
    
    // Обновляем метрики когорты
    await this.updateCohortMetrics(cohort);
  }

  private getRegistrationDate(userId: string): Date {
    const userEvents = Array.from(this.analyticsService['events'].values())
      .flat()
      .filter(event => event.userId === userId);

    if (userEvents.length === 0) return new Date();

    return userEvents.reduce((earliest, event) => 
      event.timestamp < earliest.timestamp ? event : earliest
    ).timestamp;
  }

  private getCohortId(date: Date): string {
    return `${date.getFullYear()}-${date.getMonth() + 1}`;
  }

  private async updateCohortMetrics(cohort: CohortAnalysis): Promise<void> {
    // Здесь должен быть расчет retention rates, LTV и других метрик
    // Для демонстрации используем упрощенную логику
    
    const daysSinceCohortStart = (Date.now() - cohort.startDate.getTime()) / (24 * 60 * 60 * 1000);
    
    // Retention rates (упрощенная версия)
    for (let day = 1; day <= Math.min(30, daysSinceCohortStart); day++) {
      cohort.retentionRates[day] = Math.max(0.1, 1 - (day * 0.05) + Math.random() * 0.1);
    }

    // Средний LTV
    cohort.metrics.averageLTV = 100 + Math.random() * 200;
    
    // Конверсия
    cohort.metrics.conversionRate = 0.05 + Math.random() * 0.1;
    
    // Скор здоровья когорты
    const retention7 = cohort.retentionRates[7] || 0;
    const retention30 = cohort.retentionRates[30] || 0;
    cohort.trends.healthScore = (retention7 + retention30 + cohort.metrics.conversionRate) / 3;
  }

  private async updateAllCohorts(): Promise<void> {
    for (const cohort of this.cohorts.values()) {
      await this.updateCohortMetrics(cohort);
    }
  }

  // Генерация умных инсайтов
  private async generateIntelligentInsights(): Promise<void> {
    try {
      const newInsights: IntelligentInsight[] = [];

      // Анализ трендов пользователей
      const userInsights = Array.from(this.userInsights.values());
      const highChurnUsers = userInsights.filter(u => u.churnProbability > 0.7);
      
      if (highChurnUsers.length > userInsights.length * 0.2) {
        newInsights.push({
          id: uuidv4(),
          type: 'warning',
          title: 'Высокий риск оттока пользователей',
          description: `${highChurnUsers.length} пользователей имеют высокий риск оттока`,
          impact: 'high',
          confidence: 0.85,
          data: { count: highChurnUsers.length, percentage: (highChurnUsers.length / userInsights.length) * 100 },
          actionable: true,
          suggestedActions: [
            'Запустить retention кампанию',
            'Персонализировать контент',
            'Провести опрос удовлетворенности'
          ],
          createdAt: new Date(),
          relevantFor: ['product_team', 'marketing_team']
        });
      }

      // Анализ успешных паттернов
      const powerUsers = userInsights.filter(u => u.behaviorPattern === 'power_user');
      if (powerUsers.length > 0) {
        const commonFeatures = this.findCommonPatterns(powerUsers);
        
        newInsights.push({
          id: uuidv4(),
          type: 'opportunity',
          title: 'Выявлены паттерны успешных пользователей',
          description: `Обнаружены общие характеристики у ${powerUsers.length} power users`,
          impact: 'medium',
          confidence: 0.75,
          data: { patterns: commonFeatures, userCount: powerUsers.length },
          actionable: true,
          suggestedActions: [
            'Оптимизировать онбординг под эти паттерны',
            'Создать целевую рекламу',
            'Добавить функции для поощрения таких действий'
          ],
          createdAt: new Date(),
          relevantFor: ['product_team', 'growth_team']
        });
      }

      // Добавляем инсайты
      this.insights.push(...newInsights);
      
      // Ограничиваем количество инсайтов
      this.insights = this.insights.slice(-100);
      
      logger.info('Сгенерированы умные инсайты', { count: newInsights.length });
    } catch (error) {
      logger.error('Ошибка генерации инсайтов', { error });
    }
  }

  private findCommonPatterns(users: UserInsight[]): string[] {
    // Упрощенный анализ общих паттернов
    const patterns: string[] = [];
    
    const avgEngagement = users.reduce((sum, u) => sum + u.engagementScore, 0) / users.length;
    if (avgEngagement > 0.8) {
      patterns.push('Высокая вовлеченность');
    }

    const avgLTV = users.reduce((sum, u) => sum + u.ltv, 0) / users.length;
    if (avgLTV > 100) {
      patterns.push('Высокая жизненная ценность');
    }

    return patterns;
  }

  // Очистка старых данных
  private cleanupOldAnomalies(): void {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    this.anomalies = this.anomalies.filter(a => a.detectedAt > oneWeekAgo);
  }

  // Проверка производительности моделей
  private async checkModelPerformance(): Promise<void> {
    for (const model of this.models.values()) {
      // Проверяем, нужно ли переобучить модель
      const daysSinceTraining = (Date.now() - model.lastTrained.getTime()) / (24 * 60 * 60 * 1000);
      
      if (daysSinceTraining > 7) { // Переобучаем раз в неделю
        await this.retrainModel(model.id);
      }
    }
  }

  // Переобучение моделей
  private async retrainModels(): Promise<void> {
    logger.info('Начинается переобучение моделей');
    
    for (const model of this.models.values()) {
      if (model.isActive) {
        await this.retrainModel(model.id);
      }
    }
  }

  private async retrainModel(modelId: string): Promise<void> {
    const model = this.models.get(modelId);
    if (!model) return;

    try {
      // В реальной реализации здесь был бы полный цикл переобучения
      // Для демонстрации просто обновляем timestamp и accuracy
      
      const newAccuracy = Math.min(0.95, model.accuracy + (Math.random() - 0.5) * 0.1);
      model.accuracy = Math.max(0.5, newAccuracy);
      model.lastTrained = new Date();
      
      logger.info('Модель переобучена', { modelId, newAccuracy: model.accuracy });
    } catch (error) {
      logger.error('Ошибка переобучения модели', { error, modelId });
    }
  }

  // Публичные методы для API

  // Получение предсказаний пользователя
  getUserPredictions(userId: string): Prediction[] {
    return this.predictions.get(userId) || [];
  }

  // Получение инсайтов пользователя
  getUserInsights(userId: string): UserInsight | undefined {
    return this.userInsights.get(userId);
  }

  // Получение всех моделей
  getModels(): PredictiveModel[] {
    return Array.from(this.models.values());
  }

  // Получение аномалий
  getAnomalies(severity?: AnomalyDetection['severity']): AnomalyDetection[] {
    return severity 
      ? this.anomalies.filter(a => a.severity === severity)
      : this.anomalies;
  }

  // Получение умных инсайтов
  getInsights(limit: number = 20): IntelligentInsight[] {
    return this.insights.slice(-limit).reverse();
  }

  // Получение когортного анализа
  getCohorts(): CohortAnalysis[] {
    return Array.from(this.cohorts.values());
  }

  // Получение статистики сервиса
  getServiceStats(): any {
    return {
      totalUsers: this.userInsights.size,
      totalPredictions: Array.from(this.predictions.values()).reduce((sum, preds) => sum + preds.length, 0),
      activeModels: Array.from(this.models.values()).filter(m => m.isActive).length,
      totalAnomalies: this.anomalies.length,
      totalInsights: this.insights.length,
      totalCohorts: this.cohorts.size,
      lastUpdate: new Date()
    };
  }

  // Создание персонализированного отчета
  async generatePersonalizedReport(userId: string): Promise<any> {
    const userInsight = this.userInsights.get(userId);
    const predictions = this.predictions.get(userId) || [];
    
    if (!userInsight) {
      return { error: 'User insights not found' };
    }

    return {
      userId,
      summary: {
        behaviorPattern: userInsight.behaviorPattern,
        engagementScore: userInsight.engagementScore,
        churnRisk: userInsight.churnProbability,
        ltv: userInsight.ltv
      },
      recommendations: userInsight.personalizedRecommendations,
      nextBestAction: userInsight.nextBestAction,
      riskFactors: userInsight.riskFactors,
      opportunities: userInsight.opportunities,
      predictions: predictions.slice(-5),
      generatedAt: new Date()
    };
  }
}

export { AdvancedAnalyticsService }; 
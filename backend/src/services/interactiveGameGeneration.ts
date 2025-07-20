import { v4 as uuidv4 } from 'uuid';
import { LoggerService } from './logger';
import { DeepSeekService } from './ai/deepseek';
import { OpenAIService } from './ai/openai';
import { GameGenerationPipeline } from './gameGeneration';
import {
  InteractiveGameSession,
  InteractiveGameStep,
  StepVariant,
  GenerateVariantsRequest,
  GenerateVariantsResponse
} from '../types/interactive';
import { GameDAO, InteractiveSessionDAO } from '../database';

const logger = new LoggerService();

// Новый интерфейс для анализа пользователя
interface UserPreferenceProfile {
  userId: string;
  preferredComplexity: 'simple' | 'medium' | 'complex';
  favoriteGenres: string[];
  preferredStyles: string[];
  sessionHistory: {
    totalSessions: number;
    completedSessions: number;
    averageStepTime: number;
    mostChosenVariants: string[];
  };
  adaptiveSettings: {
    suggestComplexity: boolean;
    customizePrompts: boolean;
    enablePersonalization: boolean;
  };
}

// Новый интерфейс для контекстуальной генерации
interface AdvancedGenerationContext {
  userProfile: UserPreferenceProfile;
  currentTrends: string[];
  seasonalFactors: string[];
  platformOptimizations: string[];
}

export class InteractiveGameGenerationService {
  private deepseek: DeepSeekService;
  private openai: OpenAIService;
  private gameDAO: GameDAO;
  private sessionDAO: InteractiveSessionDAO;
  private generationPipeline: GameGenerationPipeline;
  
  // Новые компоненты для адаптивности
  private userProfiles: Map<string, UserPreferenceProfile> = new Map();
  private adaptiveVariantCache: Map<string, StepVariant[]> = new Map();

  constructor() {
    this.deepseek = new DeepSeekService();
    this.openai = new OpenAIService();
    this.gameDAO = new GameDAO();
    this.sessionDAO = new InteractiveSessionDAO();
    this.generationPipeline = new GameGenerationPipeline();
    
    // Инициализация адаптивных компонентов
    this.initializeAdaptiveComponents();
  }

  /**
   * Инициализация адаптивных алгоритмов
   */
  private async initializeAdaptiveComponents(): Promise<void> {
    logger.info('🧠 Инициализация адаптивных алгоритмов...');
    
    // Загружаем профили пользователей из базы данных
    try {
      const sessions = await this.sessionDAO.getAllSessionsStatistics();
      this.buildUserProfiles(sessions);
      logger.info(`✅ Загружено ${this.userProfiles.size} пользовательских профилей`);
    } catch (error) {
      logger.warn('⚠️ Ошибка загрузки пользовательских профилей:', error.message);
    }
  }

  /**
   * Строит профили пользователей на основе статистики сессий
   */
  private buildUserProfiles(sessions: any[]): void {
    const userStats = new Map<string, any>();

    sessions.forEach(session => {
      if (!userStats.has(session.userId)) {
        userStats.set(session.userId, {
          totalSessions: 0,
          completedSessions: 0,
          totalStepTime: 0,
          stepCount: 0,
          chosenVariants: [],
          genres: [],
          complexities: []
        });
      }

      const stats = userStats.get(session.userId);
      stats.totalSessions++;
      
      if (session.completedAt) {
        stats.completedSessions++;
      }
      
      if (session.steps) {
        session.steps.forEach(step => {
          if (step.selectedVariant) {
            stats.stepCount++;
            stats.chosenVariants.push(step.selectedVariant);
          }
          if (step.timeSpent) {
            stats.totalStepTime += step.timeSpent;
          }
        });
      }
      
      if (session.genre) {
        stats.genres.push(session.genre);
      }
    });

    // Создаем профили пользователей
    userStats.forEach((stats, userId) => {
      const profile: UserPreferenceProfile = {
        userId,
        preferredComplexity: this.analyzePreferredComplexity(stats.complexities),
        favoriteGenres: this.getTopItems(stats.genres, 3),
        preferredStyles: this.analyzePreferredStyles(stats.chosenVariants),
        sessionHistory: {
          totalSessions: stats.totalSessions,
          completedSessions: stats.completedSessions,
          averageStepTime: stats.stepCount > 0 ? stats.totalStepTime / stats.stepCount : 0,
          mostChosenVariants: this.getTopItems(stats.chosenVariants, 5)
        },
        adaptiveSettings: {
          suggestComplexity: stats.totalSessions >= 3,
          customizePrompts: stats.completedSessions >= 2,
          enablePersonalization: stats.totalSessions >= 5
        }
      };

      this.userProfiles.set(userId, profile);
    });
  }

  /**
   * Анализирует предпочтительную сложность пользователя
   */
  private analyzePreferredComplexity(complexities: string[]): 'simple' | 'medium' | 'complex' {
    if (complexities.length === 0) return 'medium';
    
    const counts = complexities.reduce((acc, complexity) => {
      acc[complexity] = (acc[complexity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return (sorted[0]?.[0] as 'simple' | 'medium' | 'complex') || 'medium';
  }

  /**
   * Возвращает топ элементов по частоте использования
   */
  private getTopItems(items: string[], limit: number): string[] {
    const counts = items.reduce((acc, item) => {
      acc[item] = (acc[item] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([item]) => item);
  }

  /**
   * Анализирует предпочтительные стили на основе выбранных вариантов
   */
  private analyzePreferredStyles(chosenVariants: string[]): string[] {
    // Здесь можно добавить более сложную логику анализа стилей
    const styleKeywords = ['минималистичный', 'детализированный', 'классический', 'современный', 'экспериментальный'];
    
    return styleKeywords.filter(keyword => 
      chosenVariants.some(variant => 
        variant.toLowerCase().includes(keyword.toLowerCase())
      )
    ).slice(0, 3);
  }

  /**
   * Получает профиль пользователя или создает новый
   */
  private async getUserProfile(userId: string): Promise<UserPreferenceProfile> {
    if (this.userProfiles.has(userId)) {
      return this.userProfiles.get(userId)!;
    }

    // Создаем новый профиль для нового пользователя
    const newProfile: UserPreferenceProfile = {
      userId,
      preferredComplexity: 'medium',
      favoriteGenres: [],
      preferredStyles: [],
      sessionHistory: {
        totalSessions: 0,
        completedSessions: 0,
        averageStepTime: 0,
        mostChosenVariants: []
      },
      adaptiveSettings: {
        suggestComplexity: false,
        customizePrompts: false,
        enablePersonalization: false
      }
    };

    this.userProfiles.set(userId, newProfile);
    return newProfile;
  }

  /**
   * Создает адаптивные этапы игры на основе пользовательского профиля
   */
  private createAdaptiveGameSteps(userProfile: UserPreferenceProfile, genre: string): InteractiveGameStep[] {
    const baseSteps = this.createGameSteps();
    
    // Адаптируем этапы на основе предпочтений пользователя
    if (userProfile.adaptiveSettings.enablePersonalization) {
      // Добавляем дополнительные этапы для опытных пользователей
      const advancedSteps = [
        {
          stepId: 'advanced-mechanics',
          name: 'Продвинутые механики',
          description: 'Настройка сложных игровых систем и взаимодействий',
          type: 'advanced-mechanics',
          variants: [],
          order: 3.5
        },
        {
          stepId: 'monetization',
          name: 'Монетизация',
          description: 'Выбор стратегии монетизации и игровой экономики',
          type: 'monetization',
          variants: [],
          order: 5.5
        }
      ];

      // Вставляем дополнительные этапы
      baseSteps.splice(3, 0, advancedSteps[0]);
      baseSteps.splice(6, 0, advancedSteps[1]);
    }

    // Настраиваем описания этапов на основе предпочтений пользователя
    if (userProfile.favoriteGenres.includes(genre)) {
      baseSteps.forEach(step => {
        step.description += ` (оптимизировано для жанра ${genre})`;
      });
    }

    // Переупорядочиваем этапы
    return baseSteps.sort((a, b) => a.order - b.order);
  }

  /**
   * Создает расширенный контекст для генерации
   */
  private async createAdvancedGenerationContext(
    userProfile: UserPreferenceProfile, 
    params: any
  ): Promise<AdvancedGenerationContext> {
    // Получаем текущие тренды в игровой индустрии
    const currentTrends = this.getCurrentGameTrends();
    
    // Определяем сезонные факторы
    const seasonalFactors = this.getSeasonalFactors();
    
    // Оптимизации для платформы
    const platformOptimizations = this.getPlatformOptimizations('yandex_games');

    return {
      userProfile,
      currentTrends,
      seasonalFactors,
      platformOptimizations
    };
  }

  /**
   * Генерирует интеллектуальные варианты для этапа
   */
  private async generateIntelligentStepVariants(request: {
    stepType: string;
    count: number;
    basePrompt: string;
    gameContext: any;
    userProfile: UserPreferenceProfile;
    advancedContext: AdvancedGenerationContext;
  }): Promise<GenerateVariantsResponse> {
    const cacheKey = `${request.stepType}-${request.userProfile.userId}-${JSON.stringify(request.gameContext).slice(0, 100)}`;
    
    // Проверяем кэш адаптивных вариантов
    if (this.adaptiveVariantCache.has(cacheKey)) {
      logger.info(`🎯 Используем кэшированные адаптивные варианты для ${request.stepType}`);
      return {
        variants: this.adaptiveVariantCache.get(cacheKey)!,
        generationTime: 0,
        tokensUsed: 0
      };
    }

    const startTime = Date.now();
    
    try {
      // Создаем персонализированный промпт
      const personalizedPrompt = this.createPersonalizedPrompt(request);
      
      // Генерируем через ИИ с улучшенным контекстом
      const aiResponse = await this.deepseek.generateCode(
        personalizedPrompt.userPrompt,
        personalizedPrompt.systemPrompt
      );
      
      // Парсим и обогащаем варианты
      let variants = this.parseAIVariantsResponse(aiResponse.content, request.stepType);
      
      // Применяем адаптивные алгоритмы
      variants = this.applyAdaptiveAlgorithms(variants, request.userProfile, request.advancedContext);
      
      // Если мало качественных вариантов, дополняем базовыми
      if (variants.length < request.count) {
        const fallbackVariants = this.getIntelligentVariants({
          stepType: request.stepType,
          count: request.count - variants.length,
          gameContext: request.gameContext
        });
        variants.push(...fallbackVariants);
      }
      
      // Ограничиваем количество и кэшируем
      variants = variants.slice(0, request.count);
      this.adaptiveVariantCache.set(cacheKey, variants);
      
      const generationTime = Date.now() - startTime;
      logger.info(`🧠 Интеллектуальная генерация завершена за ${generationTime}ms (${variants.length} вариантов)`);
      
      return {
        variants,
        generationTime,
        tokensUsed: aiResponse.tokensUsed || 0
      };

    } catch (error) {
      logger.warn(`⚠️ Ошибка интеллектуальной генерации, используем fallback: ${error.message}`);
      
      // Fallback к улучшенным базовым вариантам
      const variants = this.getIntelligentVariants(request);
      const generationTime = Date.now() - startTime;
      
      return {
        variants,
        generationTime,
        tokensUsed: 0
      };
    }
  }

  /**
   * Получает текущие тренды в игровой индустрии
   */
  private getCurrentGameTrends(): string[] {
    // В реальном приложении можно подключить API игровых новостей
    return [
      'multiplayer-cooperation',
      'procedural-generation',
      'accessibility-features',
      'mobile-first-design',
      'retro-aesthetics',
      'environmental-storytelling',
      'micro-transactions',
      'cross-platform-play'
    ];
  }

  /**
   * Определяет сезонные факторы
   */
  private getSeasonalFactors(): string[] {
    const month = new Date().getMonth() + 1;
    const seasons = {
      'winter': [12, 1, 2],
      'spring': [3, 4, 5],
      'summer': [6, 7, 8],
      'autumn': [9, 10, 11]
    };

    for (const [season, months] of Object.entries(seasons)) {
      if (months.includes(month)) {
        return this.getSeasonalThemes(season);
      }
    }

    return [];
  }

  /**
   * Возвращает сезонные темы
   */
  private getSeasonalThemes(season: string): string[] {
    const themes = {
      'winter': ['snow-themes', 'cozy-gameplay', 'holiday-events', 'indoor-activities'],
      'spring': ['growth-mechanics', 'fresh-starts', 'nature-themes', 'renewal-concepts'],
      'summer': ['adventure-themes', 'outdoor-exploration', 'vacation-vibes', 'energetic-gameplay'],
      'autumn': ['harvest-mechanics', 'preparation-themes', 'nostalgic-elements', 'strategic-planning']
    };

    return themes[season] || [];
  }

  /**
   * Получает оптимизации для платформы
   */
  private getPlatformOptimizations(platform: string): string[] {
    const optimizations = {
      'yandex_games': [
        'touch-friendly-controls',
        'quick-loading',
        'minimal-file-size',
        'browser-compatibility',
        'russian-localization',
        'social-features',
        'leaderboards-integration'
      ],
      'mobile': [
        'gesture-controls',
        'portrait-orientation',
        'offline-capability',
        'battery-optimization'
      ]
    };

    return optimizations[platform] || [];
  }

  /**
   * Создает персонализированные промпты для ИИ
   */
  private createPersonalizedPrompt(request: {
    stepType: string;
    userProfile: UserPreferenceProfile;
    gameContext: any;
    advancedContext: AdvancedGenerationContext;
  }): { systemPrompt: string; userPrompt: string } {
    // Базовый системный промпт
    let systemPrompt = this.createSystemPromptForStep(request.stepType);
    
    // Дополняем промпт информацией о пользователе
    if (request.userProfile.adaptiveSettings.customizePrompts) {
      systemPrompt += `\n\nПЕРСОНАЛИЗАЦИЯ:
- Предпочтительная сложность: ${request.userProfile.preferredComplexity}
- Любимые жанры: ${request.userProfile.favoriteGenres.join(', ') || 'не определены'}
- Предпочтительные стили: ${request.userProfile.preferredStyles.join(', ') || 'не определены'}
- Опыт пользователя: ${request.userProfile.sessionHistory.completedSessions} завершенных сессий

УЧТИ ЭТИ ПРЕДПОЧТЕНИЯ при генерации вариантов.`;
    }

    // Добавляем тренды и контекст
    if (request.advancedContext.currentTrends.length > 0) {
      systemPrompt += `\n\nТЕКУЩИЕ ТРЕНДЫ: ${request.advancedContext.currentTrends.join(', ')}`;
    }

    if (request.advancedContext.seasonalFactors.length > 0) {
      systemPrompt += `\nСЕЗОННЫЕ ФАКТОРЫ: ${request.advancedContext.seasonalFactors.join(', ')}`;
    }

    if (request.advancedContext.platformOptimizations.length > 0) {
      systemPrompt += `\nОПТИМИЗАЦИИ ПЛАТФОРМЫ: ${request.advancedContext.platformOptimizations.join(', ')}`;
    }

    // Создаем пользовательский промпт
    const userPrompt = this.createUserPromptForStep({
      stepType: request.stepType,
      gameContext: request.gameContext,
      count: 3,
      basePrompt: ''
    });

    return { systemPrompt, userPrompt };
  }

  /**
   * Применяет адаптивные алгоритмы к вариантам
   */
  private applyAdaptiveAlgorithms(
    variants: StepVariant[],
    userProfile: UserPreferenceProfile,
    advancedContext: AdvancedGenerationContext
  ): StepVariant[] {
    return variants.map(variant => {
      // Корректируем сложность на основе пользовательских предпочтений
      if (userProfile.adaptiveSettings.suggestComplexity) {
        const preferredComplexity = userProfile.preferredComplexity;
        const currentComplexity = variant.metadata?.complexity || 'medium';
        
        // Если вариант не соответствует предпочтениям, корректируем его
        if (currentComplexity !== preferredComplexity) {
          variant.metadata = {
            ...variant.metadata,
            adaptedComplexity: preferredComplexity,
            originalComplexity: currentComplexity,
            adaptationNote: `Адаптировано под предпочтения пользователя (${preferredComplexity})`
          };
        }
      }

      // Добавляем персонализированные теги
      const personalizedTags = this.generatePersonalizedTags(variant, userProfile, advancedContext);
      variant.metadata = {
        ...variant.metadata,
        personalizedTags,
        adaptiveScore: this.calculateAdaptiveScore(variant, userProfile)
      };

      // Добавляем контекстуальные улучшения
      if (userProfile.sessionHistory.mostChosenVariants.includes(variant.title)) {
        variant.metadata.isFrequentChoice = true;
        variant.description += ' (похож на ваши предыдущие выборы)';
      }

      return variant;
    });
  }

  /**
   * Генерирует персонализированные теги для варианта
   */
  private generatePersonalizedTags(
    variant: StepVariant,
    userProfile: UserPreferenceProfile,
    advancedContext: AdvancedGenerationContext
  ): string[] {
    const tags: string[] = [];

    // Добавляем теги на основе предпочтений пользователя
    if (userProfile.preferredStyles.some(style => 
      variant.title.toLowerCase().includes(style.toLowerCase()) ||
      variant.description.toLowerCase().includes(style.toLowerCase())
    )) {
      tags.push('matched-style');
    }

    // Добавляем теги на основе трендов
    if (advancedContext.currentTrends.some(trend => 
      variant.description.toLowerCase().includes(trend.replace('-', ' '))
    )) {
      tags.push('trending');
    }

    // Добавляем теги на основе сезонных факторов
    if (advancedContext.seasonalFactors.some(factor => 
      variant.description.toLowerCase().includes(factor.replace('-', ' '))
    )) {
      tags.push('seasonal');
    }

    // Добавляем теги на основе опыта пользователя
    if (userProfile.sessionHistory.completedSessions > 5) {
      tags.push('experienced-user');
    } else if (userProfile.sessionHistory.completedSessions === 0) {
      tags.push('new-user');
    }

    return tags;
  }

  /**
   * Вычисляет адаптивный счет для варианта
   */
  private calculateAdaptiveScore(variant: StepVariant, userProfile: UserPreferenceProfile): number {
    let score = 50; // Базовый счет

    // Бонус за соответствие предпочтительной сложности
    const variantComplexity = variant.metadata?.complexity || 'medium';
    if (variantComplexity === userProfile.preferredComplexity) {
      score += 20;
    }

    // Бонус за соответствие предпочтительным стилям
    if (userProfile.preferredStyles.some(style => 
      variant.title.toLowerCase().includes(style.toLowerCase())
    )) {
      score += 15;
    }

    // Бонус за популярность у пользователя
    if (userProfile.sessionHistory.mostChosenVariants.includes(variant.title)) {
      score += 10;
    }

    // Штраф за слишком сложные варианты для новых пользователей
    if (userProfile.sessionHistory.totalSessions === 0 && variantComplexity === 'complex') {
      score -= 15;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Обновленный метод получения интеллектуальных вариантов
   */
  private getIntelligentVariants(request: any): StepVariant[] {
    const { stepType, gameContext, count = 3 } = request;
    const baseVariants = this.getVariantsByType(stepType, gameContext);
    
    // Преобразуем базовые варианты в полные объекты StepVariant
    return baseVariants.slice(0, count).map((variant, index) => ({
      id: `base-${stepType}-${Date.now()}-${index}`,
      title: variant.title,
      description: variant.description,
      details: {
        complexity: variant.complexity || 'medium',
        features: [],
        aiGenerated: false
      },
      aiGenerated: false,
      generatedAt: new Date(),
      metadata: {
        complexity: variant.complexity || 'medium',
        tags: [stepType],
        estimatedTime: this.getEstimatedTime(variant.complexity),
        quality: 'standard'
      }
    }));
  }

  async startInteractiveGeneration(params: {
    title: string;
    description: string;
    genre: string;
    userId: string;
    quality?: 'fast' | 'balanced' | 'high';
  }): Promise<InteractiveGameSession> {
    const gameId = `interactive-${Date.now()}-${uuidv4().slice(0, 8)}`;
    
    logger.info(`🎮 Запуск интерактивной генерации: ${gameId}`, {
      title: params.title,
      genre: params.genre,
      userId: params.userId
    });

    // Получаем профиль пользователя для адаптивной генерации
    const userProfile = await this.getUserProfile(params.userId);
    
    // Создаем адаптивные этапы генерации на основе профиля пользователя
    const steps = this.createAdaptiveGameSteps(userProfile, params.genre);

    // Создаем расширенный контекст для генерации
    const advancedContext = await this.createAdvancedGenerationContext(userProfile, params);

    // Генерируем варианты для первого этапа с учетом пользовательских предпочтений
    const firstStep = steps[0];
    const variants = await this.generateIntelligentStepVariants({
      stepType: firstStep.type,
      count: userProfile.adaptiveSettings.enablePersonalization ? 4 : 3,
      basePrompt: this.getStepPrompt(firstStep.type),
      gameContext: {
        title: params.title,
        description: params.description,
        genre: params.genre,
        previousChoices: []
      },
      userProfile,
      advancedContext
    });

    firstStep.variants = variants.variants;

    const sessionData: Omit<InteractiveGameSession, 'steps'> = {
      gameId,
      userId: params.userId,
      title: params.title,
      description: params.description,
      genre: params.genre,
      currentStep: 0,
      totalSteps: steps.length,
      isActive: true,
      isPaused: false,
      completedSteps: 0,
      startedAt: new Date(),
      lastActivityAt: new Date(),
      configuration: {
        quality: params.quality || 'balanced',
        aiProvider: 'deepseek',
        enabledFeatures: ['ai-generation', 'custom-prompts']
      },
      steps: steps
    };

    // Сохраняем сессию в базе данных
    const session = await this.sessionDAO.createSession(sessionData);

    logger.info(`✅ Интерактивная сессия создана: ${gameId}`);
    return session;
  }

  async getGameState(gameId: string): Promise<InteractiveGameSession | null> {
    const session = await this.sessionDAO.getSessionByGameId(gameId);
    if (session) {
      // Обновляем время последней активности
      await this.sessionDAO.updateSession(gameId, { lastActivityAt: new Date() });
      session.lastActivityAt = new Date();
    }
    return session;
  }

  async selectVariant(
    gameId: string,
    stepId: string,
    variantId: string
  ): Promise<{
    success: boolean;
    nextStep?: InteractiveGameStep;
    message: string;
  }> {
    const session = activeSessions.get(gameId);
    if (!session) {
      throw new Error(`Сессия ${gameId} не найдена`);
    }

    const currentStep = session.steps[session.currentStep];
    if (currentStep.stepId !== stepId) {
      throw new Error(`Неверный этап. Ожидался ${currentStep.stepId}, получен ${stepId}`);
    }

    const selectedVariant = currentStep.variants.find(v => v.id === variantId);
    if (!selectedVariant) {
      throw new Error(`Вариант ${variantId} не найден`);
    }

    // Сохраняем выбор
    currentStep.selectedVariant = variantId;
    session.completedSteps++;
    session.lastActivityAt = new Date();

    logger.info(`✅ Выбран вариант ${variantId} для этапа ${stepId}`, {
      gameId,
      variant: selectedVariant.title
    });

    // Проверяем, есть ли следующий этап
    if (session.currentStep + 1 < session.totalSteps) {
      session.currentStep++;
      const nextStep = session.steps[session.currentStep];

      // Генерируем варианты для следующего этапа на основе предыдущих выборов
      const previousChoices = session.steps
        .slice(0, session.currentStep)
        .filter(step => step.selectedVariant)
        .map(step => ({
          stepId: step.stepId,
          choice: step.variants.find(v => v.id === step.selectedVariant)?.title || ''
        }));

      const variants = await this.generateStepVariants({
        stepType: nextStep.type,
        count: 3,
        basePrompt: this.getStepPrompt(nextStep.type),
        gameContext: {
          title: session.title,
          description: session.description,
          genre: session.genre,
          previousChoices
        }
      });

      nextStep.variants = variants.variants;

      activeSessions.set(gameId, session);

      return {
        success: true,
        nextStep,
        message: `Переход к этапу: ${nextStep.name}`
      };
    } else {
      // Это был последний этап
      activeSessions.set(gameId, session);
      return {
        success: true,
        message: 'Все этапы завершены. Готово к финализации.'
      };
    }
  }

  async completeGeneration(gameId: string): Promise<{
    success: boolean;
    finalGameData: any;
    message: string;
  }> {
    const session = activeSessions.get(gameId);
    if (!session) {
      throw new Error(`Сессия ${gameId} не найдена`);
    }

    logger.info(`🎉 Завершение интерактивной генерации: ${gameId}`);

    try {
      // Собираем все выборы пользователя
      const gameChoices = session.steps
        .filter(step => step.selectedVariant)
        .map(step => {
          const selectedVariant = step.variants.find(v => v.id === step.selectedVariant);
          return {
            step: step.name,
            stepType: step.type,
            choice: selectedVariant?.title || '',
            details: selectedVariant?.details || {},
            metadata: selectedVariant?.metadata || {}
          };
        });

      // Создаем запрос для генерации на основе пользовательских выборов
      const generationRequest = this.createGenerationRequestFromChoices(session, gameChoices);

      // Сохраняем игру в базе данных
      const gameEntity = await this.gameDAO.createGame({
        id: gameId,
        title: session.title,
        description: session.description,
        genre: session.genre,
        status: 'processing' as any,
        progress: 0,
        config: {
          interactive: true,
          choices: gameChoices,
          sessionId: session.gameId
        },
        userId: session.userId,
        metadata: {
          interactiveSession: true,
          totalSteps: session.totalSteps,
          completedSteps: session.completedSteps
        }
      });

      logger.info(`💾 Игра сохранена в БД: ${gameEntity.id}`);

      // Запускаем полную генерацию через основной пайплайн
      logger.info(`🔥 Запуск полной генерации игры через пайплайн...`);
      
      const buildResult = await this.generationPipeline.execute(
        generationRequest,
        (step: string, progress: number, logs?: string[]) => {
          logger.info(`📊 Прогресс генерации ${gameId}: ${step} (${progress}%)`);
          
          // Обновляем прогресс в базе данных
          this.gameDAO.updateGame(gameId, { 
            progress,
            metadata: { 
              ...gameEntity.metadata,
              currentStep: step,
              logs: logs || []
            }
          });
        }
      );

      // Обновляем финальную информацию об игре
      await this.gameDAO.updateGame(gameId, {
        status: 'completed' as any,
        progress: 100,
        filePath: buildResult.outputPath,
        sizeBytes: buildResult.size,
        assets: buildResult.assets || {},
        metadata: {
          ...gameEntity.metadata,
          buildResult,
          validationResults: buildResult.validationResults,
          finalizedAt: new Date().toISOString()
        }
      });

      const finalGameData = {
        gameId,
        gamePath: buildResult.outputPath,
        downloadUrl: `/api/games/${gameId}/download`,
        size: buildResult.size,
        assets: buildResult.assets,
        choices: gameChoices,
        validationResults: buildResult.validationResults,
        generatedAt: new Date(),
        buildTime: buildResult.buildTime
      };

      session.finalGameData = finalGameData;
      session.completedAt = new Date();
      session.isActive = false;

      activeSessions.set(gameId, session);

      logger.info(`✅ Интерактивная генерация успешно завершена: ${gameId}`);

      return {
        success: true,
        finalGameData,
        message: 'Игра создана успешно! Процесс завершен.'
      };

    } catch (error) {
      logger.error(`❌ Ошибка при завершении генерации ${gameId}:`, error);

      // Обновляем статус игры как неудачный
      try {
        await this.gameDAO.updateGame(gameId, {
          status: 'failed' as any,
          metadata: {
            error: error.message,
            failedAt: new Date().toISOString()
          }
        });
      } catch (dbError) {
        logger.error('Ошибка обновления статуса в БД:', dbError);
      }

      session.isActive = false;
      session.error = error.message;
      activeSessions.set(gameId, session);

      return {
        success: false,
        finalGameData: null,
        message: `Ошибка генерации игры: ${error.message}`
      };
    }
  }

  /**
   * Создает запрос для генерации на основе пользовательских выборов
   */
  private createGenerationRequestFromChoices(session: InteractiveGameSession, gameChoices: any[]): any {
    // Анализируем выборы пользователя и создаем детальный промпт
    const conceptChoice = gameChoices.find(c => c.stepType === 'concept');
    const characterChoice = gameChoices.find(c => c.stepType === 'character');
    const levelChoice = gameChoices.find(c => c.stepType === 'level');
    const graphicsChoice = gameChoices.find(c => c.stepType === 'graphics');
    const audioChoice = gameChoices.find(c => c.stepType === 'audio');

    // Строим обогащенное описание игры
    let enhancedDescription = session.description;
    
    if (conceptChoice) {
      enhancedDescription += `\n\nКонцепция: ${conceptChoice.choice}`;
      if (conceptChoice.details?.features) {
        enhancedDescription += ` Особенности: ${conceptChoice.details.features.join(', ')}`;
      }
    }

    if (characterChoice) {
      enhancedDescription += `\nГлавный персонаж: ${characterChoice.choice}`;
    }

    if (levelChoice) {
      enhancedDescription += `\nДизайн уровней: ${levelChoice.choice}`;
    }

    if (graphicsChoice) {
      enhancedDescription += `\nГрафический стиль: ${graphicsChoice.choice}`;
    }

    if (audioChoice) {
      enhancedDescription += `\nЗвуковое оформление: ${audioChoice.choice}`;
    }

    // Определяем сложность на основе выборов
    const complexities = gameChoices.map(c => c.metadata?.complexity || 'medium');
    const avgComplexity = this.calculateAverageComplexity(complexities);

    return {
      id: session.gameId,
      prompt: {
        title: session.title,
        description: enhancedDescription,
        genre: session.genre,
        complexity: avgComplexity,
        targetPlatform: 'yandex_games',
        interactiveChoices: gameChoices
      },
      localization: {
        enabled: true,
        sourceLanguage: 'ru',
        targetLanguages: ['en']
      },
      quality: session.configuration?.quality || 'balanced'
    };
  }

  /**
   * Вычисляет среднюю сложность на основе выборов
   */
  private calculateAverageComplexity(complexities: string[]): 'simple' | 'medium' | 'complex' {
    const weights = { simple: 1, medium: 2, complex: 3 };
    const totalWeight = complexities.reduce((sum, c) => sum + (weights[c] || 2), 0);
    const avgWeight = totalWeight / complexities.length;

    if (avgWeight <= 1.5) return 'simple';
    if (avgWeight <= 2.5) return 'medium';
    return 'complex';
  }

  private createGameSteps(): InteractiveGameStep[] {
    return [
      {
        stepId: 'concept',
        name: 'Концепт игры',
        description: 'Выберите основную концепцию и механики игры',
        type: 'concept',
        variants: [],
        order: 1
      },
      {
        stepId: 'character',
        name: 'Главный персонаж',
        description: 'Определите внешний вид и способности персонажа',
        type: 'character',
        variants: [],
        order: 2
      },
      {
        stepId: 'level',
        name: 'Дизайн уровней',
        description: 'Выберите структуру и стиль уровней',
        type: 'level',
        variants: [],
        order: 3
      },
      {
        stepId: 'graphics',
        name: 'Графический стиль',
        description: 'Определите художественное направление',
        type: 'graphics',
        variants: [],
        order: 4
      },
      {
        stepId: 'audio',
        name: 'Звуковое оформление',
        description: 'Выберите музыку и звуковые эффекты',
        type: 'audio',
        variants: [],
        order: 5
      },
      {
        stepId: 'final',
        name: 'Финализация',
        description: 'Последние штрихи и балансировка',
        type: 'final',
        variants: [],
        order: 6
      }
    ];
  }

  private async generateStepVariants(request: GenerateVariantsRequest): Promise<GenerateVariantsResponse> {
    const startTime = Date.now();
    logger.info(`🤖 Генерация вариантов для этапа: ${request.stepType}`);

    try {
      // Создаем умный промпт для генерации вариантов
      const systemPrompt = this.createSystemPromptForStep(request.stepType);
      const userPrompt = this.createUserPromptForStep(request);

      logger.info(`📝 Отправляем запрос в DeepSeek для генерации вариантов`);

      // Используем DeepSeek для генерации вариантов
      const aiResponse = await this.deepseek.generateCode(userPrompt, systemPrompt);
      
      // Парсим ответ ИИ
      const parsedVariants = this.parseAIVariantsResponse(aiResponse.content, request.stepType);
      
      // Если ИИ не смог сгенерировать качественные варианты, используем fallback
      const variants = parsedVariants.length >= 2 ? parsedVariants : this.getIntelligentVariants(request);
      
      const generationTime = Date.now() - startTime;
      logger.info(`✅ Сгенерировано ${variants.length} вариантов за ${generationTime}ms (${parsedVariants.length > 0 ? 'ИИ' : 'fallback'})`);

      return {
        variants,
        generationTime,
        tokensUsed: aiResponse.tokensUsed || 0
      };

    } catch (error) {
      logger.warn(`⚠️ Ошибка генерации через ИИ, используем fallback: ${error.message}`);
      
      // Fallback к базовым вариантам
      const variants = this.getIntelligentVariants(request);
      const generationTime = Date.now() - startTime;
      
      return {
        variants,
        generationTime,
        tokensUsed: 0
      };
    }
  }

  private getVariantsByType(stepType: string, gameContext: any): Array<{title: string, description: string, complexity?: string}> {
    const { title, genre, previousChoices } = gameContext;
    
    const variantSets: Record<string, Array<{title: string, description: string, complexity?: string}>> = {
      concept: [
        {
          title: `Классический ${genre}`,
          description: `Традиционные механики ${genre} с проверенным геймплеем. Простое управление, понятные цели, постепенное усложнение.`,
          complexity: 'simple'
        },
        {
          title: `Современный ${genre}`,
          description: `Инновационный подход к ${genre} с современными механиками. Уникальные особенности, креативные решения.`,
          complexity: 'medium'
        },
        {
          title: `Экспериментальный ${genre}`,
          description: `Смелое переосмысление жанра ${genre}. Необычные механики, нестандартные решения, высокая сложность.`,
          complexity: 'complex'
        }
      ],
      character: [
        {
          title: 'Классический герой',
          description: 'Храбрый персонаж с сбалансированными способностями. Универсальные навыки, средняя скорость и сила.',
          complexity: 'simple'
        },
        {
          title: 'Специализированный боец',
          description: 'Персонаж с уникальными боевыми способностями. Особые навыки, комбо-атаки, тактические возможности.',
          complexity: 'medium'
        },
        {
          title: 'Трансформирующийся персонаж',
          description: 'Персонаж с возможностью кардинально менять способности. Множественные формы, адаптивный геймплей.',
          complexity: 'complex'
        }
      ],
      level: [
        {
          title: 'Линейные уровни',
          description: 'Последовательное прохождение уровней с ясными целями. Простая навигация, четкий прогресс.',
          complexity: 'simple'
        },
        {
          title: 'Разветвленные пути',
          description: 'Уровни с множественными маршрутами и секретными областями. Исследование, альтернативные пути.',
          complexity: 'medium'
        },
        {
          title: 'Открытый мир',
          description: 'Свободное исследование больших областей. Нелинейный прогресс, множество активностей.',
          complexity: 'complex'
        }
      ],
      graphics: [
        {
          title: 'Минималистичная графика',
          description: 'Простой, чистый визуальный стиль. Понятные формы, ограниченная палитра, высокая читаемость.',
          complexity: 'simple'
        },
        {
          title: 'Детализированная 2D графика',
          description: 'Богатая детализация, красочная палитра. Анимированные элементы, визуальные эффекты.',
          complexity: 'medium'
        },
        {
          title: 'Динамическая графика',
          description: 'Адаптивные визуальные эффекты, процедурная генерация элементов. Интерактивное окружение.',
          complexity: 'complex'
        }
      ],
      audio: [
        {
          title: 'Простое звуковое оформление',
          description: 'Базовые звуковые эффекты и фоновая музыка. Четкие аудио-сигналы для игровых событий.',
          complexity: 'simple'
        },
        {
          title: 'Адаптивная музыка',
          description: 'Динамическая музыка, реагирующая на игровые события. Разнообразные музыкальные темы.',
          complexity: 'medium'
        },
        {
          title: 'Иммерсивный звук',
          description: 'Пространственное аудио, интерактивная музыка. Звуковые ландшафты, адаптивные композиции.',
          complexity: 'complex'
        }
      ],
      final: [
        {
          title: 'Базовая оптимизация',
          description: 'Стандартная оптимизация производительности и исправление основных ошибок.',
          complexity: 'simple'
        },
        {
          title: 'Расширенная полировка',
          description: 'Детальная настройка баланса, добавление дополнительных функций и улучшений.',
          complexity: 'medium'
        },
        {
          title: 'Полная персонализация',
          description: 'Адаптивная сложность, персонализированный контент, интеллектуальные настройки.',
          complexity: 'complex'
        }
      ]
    };

    return variantSets[stepType] || variantSets.concept;
  }

  private getIntelligentVariants(request: GenerateVariantsRequest): StepVariant[] {
    const { stepType, gameContext } = request;
    const variants = this.getVariantsByType(stepType, gameContext);
    
    return variants.map((variant, index) => ({
      id: `${stepType}-${Date.now()}-${index}`,
      title: variant.title,
      description: variant.description,
      details: variant,
      aiGenerated: false,
      generatedAt: new Date(),
      metadata: {
        complexity: variant.complexity || 'medium',
        tags: [stepType, gameContext.genre],
        estimatedTime: this.getEstimatedTime(variant.complexity)
      }
    }));
  }

  private getDefaultVariants(stepType: string): StepVariant[] {
    const defaultVariants: Record<string, StepVariant[]> = {
      concept: [
        {
          id: 'concept-classic',
          title: 'Классический стиль',
          description: 'Традиционные игровые механики с проверенным геймплеем',
          details: {},
          aiGenerated: false,
          generatedAt: new Date(),
          metadata: { complexity: 'simple', tags: ['classic'] }
        },
        {
          id: 'concept-innovative',
          title: 'Инновационный подход',
          description: 'Современные механики с уникальными особенностями',
          details: {},
          aiGenerated: false,
          generatedAt: new Date(),
          metadata: { complexity: 'complex', tags: ['innovative'] }
        }
      ],
      character: [
        {
          id: 'char-hero',
          title: 'Классический герой',
          description: 'Храбрый персонаж с сбалансированными способностями',
          details: {},
          aiGenerated: false,
          generatedAt: new Date(),
          metadata: { complexity: 'simple', tags: ['hero'] }
        }
      ]
    };

    return defaultVariants[stepType] || [];
  }

  private getStepPrompt(stepType: string): string {
    const prompts: Record<string, string> = {
      concept: 'Создай варианты игровых концепций, включая основные механики, цели игрока и уникальные особенности.',
      character: 'Создай варианты дизайна главного персонажа, включая внешний вид, способности и характер.',
      level: 'Создай варианты дизайна уровней, включая структуру, препятствия и интерактивные элементы.',
      graphics: 'Создай варианты графического стиля, включая цветовую палитру, художественное направление и общую атмосферу.',
      audio: 'Создай варианты звукового оформления, включая музыкальный стиль, звуковые эффекты и атмосферу.',
      final: 'Создай варианты финальных улучшений игры, включая балансировку, дополнительные функции и полировку.'
    };

    return prompts[stepType] || 'Создай варианты для данного этапа разработки игры.';
  }

  private getEstimatedTime(complexity?: string): number {
    const times = {
      simple: 5,
      medium: 15,
      complex: 30
    };
    return times[complexity as keyof typeof times] || 15;
  }

  // Методы для управления сессиями
  async pauseGeneration(gameId: string): Promise<boolean> {
    const session = activeSessions.get(gameId);
    if (session) {
      session.isPaused = true;
      session.lastActivityAt = new Date();
      activeSessions.set(gameId, session);
      return true;
    }
    return false;
  }

  async resumeGeneration(gameId: string): Promise<boolean> {
    const session = activeSessions.get(gameId);
    if (session) {
      session.isPaused = false;
      session.lastActivityAt = new Date();
      activeSessions.set(gameId, session);
      return true;
    }
    return false;
  }

  async deleteSession(gameId: string): Promise<boolean> {
    return activeSessions.delete(gameId);
  }

  async getActiveSessions(): Promise<InteractiveGameSession[]> {
    return Array.from(activeSessions.values());
  }

  /**
   * Создает системный промпт для конкретного этапа генерации
   */
  private createSystemPromptForStep(stepType: string): string {
    const baseSystemPrompt = `
Ты - опытный геймдизайнер, который создает варианты для этапа разработки игры.

Твоя задача - сгенерировать 3 качественных варианта для этапа "${stepType}".

ВАЖНЫЕ ТРЕБОВАНИЯ:
1. Отвечай ТОЛЬКО в формате JSON
2. Каждый вариант должен иметь уникальное название и описание
3. Варианты должны различаться по сложности: простой, средний, сложный
4. Описания должны быть конкретными и понятными
5. Учитывай современные тренды в геймдизайне

Формат ответа:
{
  "variants": [
    {
      "title": "Название варианта",
      "description": "Подробное описание (2-3 предложения)",
      "complexity": "simple|medium|complex",
      "features": ["особенность1", "особенность2", "особенность3"]
    }
  ]
}
`;

    const stepSpecificPrompts = {
      concept: `
Фокус на игровых механиках и концепции:
- Уникальные игровые механики
- Инновационные подходы к жанру
- Баланс между простотой и глубиной
- Целевая аудитория и доступность
`,
      character: `
Фокус на дизайне персонажа:
- Внешний вид и стиль
- Уникальные способности
- Характер и предыстория
- Прогрессия и развитие
`,
      level: `
Фокус на дизайне уровней:
- Структура и навигация
- Сложность и прогрессия
- Интерактивные элементы
- Визуальная привлекательность
`,
      graphics: `
Фокус на графическом стиле:
- Художественное направление
- Цветовая палитра
- Стиль анимации
- Техническая реализация
`,
      audio: `
Фокус на звуковом дизайне:
- Музыкальный стиль
- Звуковые эффекты
- Адаптивное аудио
- Атмосфера и настроение
`,
      final: `
Фокус на финализации:
- Оптимизация и полировка
- Дополнительные функции
- Балансировка сложности
- Пользовательский опыт
`
    };

    return baseSystemPrompt + (stepSpecificPrompts[stepType] || stepSpecificPrompts.concept);
  }

  /**
   * Создает пользовательский промпт на основе контекста игры
   */
  private createUserPromptForStep(request: GenerateVariantsRequest): string {
    const { stepType, gameContext } = request;
    const { title, genre, description, previousChoices } = gameContext;

    let contextInfo = `
Создай 3 варианта для этапа "${stepType}" игры:

КОНТЕКСТ ИГРЫ:
- Название: "${title}"
- Жанр: ${genre}
- Описание: ${description}
`;

    if (previousChoices && previousChoices.length > 0) {
      contextInfo += `\nРАНЕЕ ВЫБРАННЫЕ РЕШЕНИЯ:\n`;
      previousChoices.forEach((choice, index) => {
        contextInfo += `${index + 1}. ${choice.stepId}: ${choice.choice}\n`;
      });
    }

    contextInfo += `\nСгенерируй 3 варианта с разной сложностью, учитывая весь контекст игры.`;

    return contextInfo;
  }

  /**
   * Парсит ответ ИИ и создает объекты вариантов
   */
  private parseAIVariantsResponse(content: string, stepType: string): StepVariant[] {
    try {
      // Пытаемся найти JSON в ответе
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        logger.warn('Не найден JSON в ответе ИИ');
        return [];
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      if (!parsed.variants || !Array.isArray(parsed.variants)) {
        logger.warn('Неверная структура ответа ИИ');
        return [];
      }

      return parsed.variants.map((variant: any, index: number) => {
        const stepVariant: StepVariant = {
          id: `ai-${stepType}-${Date.now()}-${index}`,
          title: variant.title || `Вариант ${index + 1}`,
          description: variant.description || 'Описание отсутствует',
          details: {
            complexity: variant.complexity || 'medium',
            features: variant.features || [],
            aiGenerated: true,
            originalResponse: variant
          },
          aiGenerated: true,
          generatedAt: new Date(),
          metadata: {
            complexity: variant.complexity || 'medium',
            tags: [stepType, ...(variant.features || [])],
            estimatedTime: this.getEstimatedTime(variant.complexity),
            aiModel: 'deepseek',
            quality: 'high'
          }
        };

        return stepVariant;
      }).filter(variant => variant.title && variant.description);

    } catch (error) {
      logger.error('Ошибка парсинга ответа ИИ:', error);
      return [];
    }
  }
} 
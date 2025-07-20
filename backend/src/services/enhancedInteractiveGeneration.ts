import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';
import {
  InteractiveGameRequest,
  InteractiveGenerationState,
  InteractiveStep,
  GenerationVariant,
  StepGenerationRequest,
  VariantGenerationResponse,
  StepGuide,
  InteractiveStepConfig,
  StepType,
  CharacterVariant,
  MechanicsVariant,
  LevelVariant,
  GraphicsVariant,
  SoundVariant,
  UIVariant
} from '@/types/interactive';
import { GameConfiguration } from '@/types/gameConfig';
import { LoggerService } from './logger';
import { IntelligentAIRouter } from './ai/intelligentRouter';
import { SmartPromptEngine } from './ai/smartPromptEngine';

interface EnhancedInteractiveContext {
  gameId: string;
  originalPrompt: string;
  promptAnalysis: any;
  userProfile: UserProfile;
  completedSteps: Map<string, any>;
  gameEvolution: GameEvolutionTracker;
  qualityMetrics: QualityTracker;
}

interface UserProfile {
  id: string;
  experience: 'beginner' | 'intermediate' | 'advanced' | 'professional';
  preferences: {
    genres: string[];
    complexity: string;
    artStyle: string;
  };
  history: {
    completedGames: number;
    favoriteGenres: string[];
    averageSessionTime: number;
  };
}

interface GameEvolutionTracker {
  theme: string;
  mood: string;
  complexity: string;
  targetAudience: string;
  technicalConstraints: string[];
  narrative: NarrativeThread;
}

interface NarrativeThread {
  character: any;
  world: any;
  conflict: any;
  progression: any;
}

interface QualityTracker {
  coherence: number; // 0-100
  creativity: number;
  feasibility: number;
  marketability: number;
  technicalSoundness: number;
}

export class EnhancedInteractiveGenerationService extends EventEmitter {
  private logger: LoggerService;
  private aiRouter: IntelligentAIRouter;
  private promptEngine: SmartPromptEngine;
  private activeGenerations = new Map<string, EnhancedInteractiveContext>();
  private stepConfigs = new Map<string, InteractiveStepConfig>();
  private qualityValidators = new Map<string, Function>();

  constructor() {
    super();
    this.logger = new LoggerService();
    this.aiRouter = new IntelligentAIRouter();
    this.promptEngine = new SmartPromptEngine(this.aiRouter);
    
    this.initializeStepConfigs();
    this.initializeQualityValidators();
    
    this.logger.info('🚀 Расширенный сервис интерактивной генерации инициализирован');
  }

  /**
   * Начинает улучшенную интерактивную генерацию игры
   */
  public async startEnhancedInteractiveGeneration(
    request: InteractiveGameRequest & { configuration?: GameConfiguration }
  ): Promise<InteractiveGenerationState> {
    try {
      this.logger.info(`🎮 Начало улучшенной интерактивной генерации: ${request.id}`);

      // Анализируем и улучшаем промпт пользователя
      const promptAnalysis = await this.promptEngine.analyzeAndEnhancePrompt(
        request.prompt,
        request.userId,
        { gameConfig: request.configuration }
      );

      this.logger.info(`🧠 Промпт проанализирован. Жанр: ${promptAnalysis.gameClassification.genre}, Уверенность: ${Math.round(promptAnalysis.confidenceScore * 100)}%`);

      // Создаем профиль пользователя
      const userProfile = await this.createUserProfile(request.userId, promptAnalysis);

      // Инициализируем контекст генерации
      const context: EnhancedInteractiveContext = {
        gameId: request.id,
        originalPrompt: request.prompt,
        promptAnalysis,
        userProfile,
        completedSteps: new Map(),
        gameEvolution: this.initializeGameEvolution(promptAnalysis),
        qualityMetrics: {
          coherence: 100,
          creativity: 100,
          feasibility: 100,
          marketability: 100,
          technicalSoundness: 100
        }
      };

      // Создаем адаптивные этапы на основе анализа
      const steps = await this.createAdaptiveSteps(promptAnalysis, userProfile, request.configuration);

      // Создаем состояние генерации
      const state: InteractiveGenerationState = {
        gameId: request.id,
        userId: request.userId,
        currentStepIndex: 0,
        totalSteps: steps.length,
        steps,
        startedAt: new Date(),
        lastActivityAt: new Date(),
        isActive: true,
        finalChoices: {},
        gameConfiguration: request.configuration
      };

      this.activeGenerations.set(request.id, context);

      // Запускаем первый этап с контекстом
      await this.startEnhancedStep(request.id, 0);

      this.emit('enhanced:generation:started', {
        gameId: request.id,
        analysis: promptAnalysis,
        userProfile,
        estimatedQuality: this.calculateOverallQuality(context.qualityMetrics)
      });

      return state;

    } catch (error) {
      this.logger.error(`Ошибка начала улучшенной генерации ${request.id}:`, error);
      throw error;
    }
  }

  /**
   * Генерация вариантов с использованием ИИ и контекста
   */
  public async generateIntelligentVariants(
    gameId: string,
    stepId: string,
    count: number = 5
  ): Promise<VariantGenerationResponse> {
    try {
      const context = this.activeGenerations.get(gameId);
      if (!context) {
        throw new Error(`Контекст генерации ${gameId} не найден`);
      }

      const state = this.getGenerationState(gameId);
      if (!state) {
        throw new Error(`Состояние генерации ${gameId} не найдено`);
      }

      const step = state.steps.find(s => s.stepId === stepId);
      if (!step) {
        throw new Error(`Этап ${stepId} не найден`);
      }

      this.logger.info(`🤖 Генерация ${count} интеллектуальных вариантов для этапа "${step.name}"`);

      // Строим контекст для ИИ на основе предыдущих выборов
      const aiContext = this.buildAIContext(context, step);

      // Генерируем варианты с помощью ИИ
      const variants = await this.generateVariantsWithAI(step, aiContext, count);

      // Оцениваем качество вариантов
      const evaluatedVariants = await this.evaluateVariantQuality(variants, context);

      // Обновляем этап
      step.variants.push(...evaluatedVariants);
      context.qualityMetrics = this.updateQualityMetrics(context.qualityMetrics, evaluatedVariants);

      const response: VariantGenerationResponse = {
        stepId,
        variants: evaluatedVariants,
        generatedAt: new Date(),
        totalCount: evaluatedVariants.length,
        hasMore: true
      };

      this.emit('enhanced:variants:generated', {
        gameId,
        stepId,
        variants: evaluatedVariants,
        qualityScore: this.calculateOverallQuality(context.qualityMetrics)
      });

      return response;

    } catch (error) {
      this.logger.error(`Ошибка генерации интеллектуальных вариантов для ${gameId}/${stepId}:`, error);
      throw error;
    }
  }

  /**
   * Обработка выбора варианта с обновлением контекста
   */
  public async selectVariantWithContext(
    gameId: string,
    stepId: string,
    variantId: string,
    customPrompt?: string
  ): Promise<void> {
    try {
      const context = this.activeGenerations.get(gameId);
      if (!context) {
        throw new Error(`Контекст генерации ${gameId} не найден`);
      }

      const state = this.getGenerationState(gameId);
      if (!state) {
        throw new Error(`Состояние генерации ${gameId} не найдено`);
      }

      const step = state.steps.find(s => s.stepId === stepId);
      if (!step) {
        throw new Error(`Этап ${stepId} не найден`);
      }

      const variant = step.variants.find(v => v.id === variantId);
      if (!variant) {
        throw new Error(`Вариант ${variantId} не найден`);
      }

      // Сохраняем выбор в контекст
      context.completedSteps.set(stepId, {
        stepType: step.type,
        selectedVariant: variant,
        customPrompt,
        timestamp: new Date()
      });

      // Обновляем эволюцию игры
      this.updateGameEvolution(context, step.type, variant);

      // Сохраняем выбор в состояние
      step.selectedVariant = variantId;
      step.customPrompt = customPrompt;
      step.isCompleted = true;
      state.finalChoices[stepId] = variantId;
      state.lastActivityAt = new Date();

      this.logger.info(`✅ Этап ${stepId} завершен с контекстом для игры ${gameId}`);

      this.emit('enhanced:step:completed', {
        gameId,
        stepId,
        selectedVariant: variant,
        gameEvolution: context.gameEvolution,
        overallProgress: this.calculateProgress(context)
      });

      // Переходим к следующему этапу
      await this.proceedToNextEnhancedStep(gameId);

    } catch (error) {
      this.logger.error(`Ошибка выбора варианта с контекстом ${gameId}/${stepId}/${variantId}:`, error);
      throw error;
    }
  }

  /**
   * Построение AI контекста на основе предыдущих выборов
   */
  private buildAIContext(context: EnhancedInteractiveContext, currentStep: InteractiveStep): any {
    const aiContext = {
      originalPrompt: context.originalPrompt,
      promptAnalysis: context.promptAnalysis,
      gameEvolution: context.gameEvolution,
      userProfile: context.userProfile,
      currentStepType: currentStep.type,
      previousChoices: {},
      coherenceRequirements: this.getCoherenceRequirements(context),
      qualityTargets: context.qualityMetrics
    };

    // Добавляем информацию о предыдущих выборах
    for (const [stepId, stepData] of context.completedSteps) {
      aiContext.previousChoices[stepData.stepType] = {
        content: stepData.selectedVariant.content,
        reasoning: stepData.selectedVariant.metadata?.reasoning,
        customPrompt: stepData.customPrompt
      };
    }

    return aiContext;
  }

  /**
   * Генерация вариантов с использованием ИИ
   */
  private async generateVariantsWithAI(
    step: InteractiveStep,
    aiContext: any,
    count: number
  ): Promise<GenerationVariant[]> {
    const variants: GenerationVariant[] = [];

    for (let i = 0; i < count; i++) {
      try {
        const variant = await this.generateSingleVariantWithAI(step.type, aiContext, i);
        if (variant) {
          variants.push(variant);
        }
      } catch (error) {
        this.logger.warn(`Ошибка генерации варианта ${i} для типа ${step.type}:`, error);
        // Продолжаем с другими вариантами
      }
    }

    // Если не удалось сгенерировать достаточно вариантов, создаем запасные
    while (variants.length < Math.min(count, 3)) {
      const fallbackVariant = this.createFallbackVariant(step.type, aiContext);
      variants.push(fallbackVariant);
    }

    return variants;
  }

  /**
   * Генерация одного варианта с помощью ИИ
   */
  private async generateSingleVariantWithAI(
    stepType: StepType,
    aiContext: any,
    variantIndex: number
  ): Promise<GenerationVariant> {
    // Создаем специфичный промпт для типа этапа
    const taskPrompt = this.createTaskPrompt(stepType, aiContext, variantIndex);
    
    // Определяем оптимальный тип задачи для ИИ
    let aiTaskType: 'game_design' | 'code_generation' | 'image_generation' | 'text_generation' = 'text_generation';
    
    if (stepType === 'character' || stepType === 'graphics') {
      aiTaskType = 'image_generation';
    } else if (stepType === 'mechanics' || stepType === 'levels') {
      aiTaskType = 'game_design';
    }

    // Выполняем задачу через интеллектуальный роутер
    const aiResult = await this.aiRouter.executeTask({
      id: uuidv4(),
      type: aiTaskType,
      prompt: taskPrompt,
      context: aiContext,
      requirements: {
        quality: 'balanced',
        optimization: aiContext.userProfile.experience === 'professional' ? 'quality' : 'speed'
      }
    });

    // Парсим результат в зависимости от типа этапа
    return this.parseAIResultToVariant(stepType, aiResult, aiContext);
  }

  /**
   * Создание промпта для конкретного типа задачи
   */
  private createTaskPrompt(stepType: StepType, aiContext: any, variantIndex: number): string {
    const basePrompt = `Создай вариант ${variantIndex + 1} для этапа "${stepType}" игры.`;
    
    let specificPrompt = '';
    
    switch (stepType) {
      case 'character':
        specificPrompt = this.createCharacterPrompt(aiContext);
        break;
      case 'mechanics':
        specificPrompt = this.createMechanicsPrompt(aiContext);
        break;
      case 'levels':
        specificPrompt = this.createLevelPrompt(aiContext);
        break;
      case 'graphics':
        specificPrompt = this.createGraphicsPrompt(aiContext);
        break;
      case 'sounds':
        specificPrompt = this.createSoundsPrompt(aiContext);
        break;
      case 'ui':
        specificPrompt = this.createUIPrompt(aiContext);
        break;
    }

    // Добавляем контекст предыдущих выборов
    let contextPrompt = '\n\nКонтекст игры:\n';
    contextPrompt += `Жанр: ${aiContext.gameEvolution.theme}\n`;
    contextPrompt += `Настроение: ${aiContext.gameEvolution.mood}\n`;
    contextPrompt += `Целевая аудитория: ${aiContext.gameEvolution.targetAudience}\n`;

    if (Object.keys(aiContext.previousChoices).length > 0) {
      contextPrompt += '\nПредыдущие выборы:\n';
      for (const [choiceType, choice] of Object.entries(aiContext.previousChoices)) {
        contextPrompt += `${choiceType}: ${JSON.stringify(choice.content, null, 2)}\n`;
      }
    }

    // Добавляем требования качества
    let qualityPrompt = '\n\nТребования к качеству:\n';
    qualityPrompt += `- Согласованность с предыдущими выборами\n`;
    qualityPrompt += `- Креативность и оригинальность\n`;
    qualityPrompt += `- Техническая реализуемость для HTML5\n`;
    qualityPrompt += `- Соответствие платформе Яндекс Игры\n`;

    return basePrompt + specificPrompt + contextPrompt + qualityPrompt;
  }

  /**
   * Промпты для различных типов этапов
   */
  private createCharacterPrompt(aiContext: any): string {
    return `
Создай уникального персонажа для игры. Верни результат в JSON формате:
{
  "name": "Имя персонажа",
  "description": "Краткое описание (2-3 предложения)",
  "appearance": {
    "physicalDescription": "Детальное описание внешности",
    "clothing": "Описание одежды/экипировки",
    "distinctiveFeatures": ["уникальная особенность 1", "особенность 2"]
  },
  "abilities": [
    {
      "name": "Способность 1",
      "description": "Как работает",
      "gameplayImpact": "Влияние на игровой процесс"
    }
  ],
  "personality": {
    "traits": ["черта характера 1", "черта 2"],
    "motivation": "Что движет персонажем",
    "background": "Краткая предыстория"
  },
  "technicalSpecs": {
    "animationStyle": "pixel art/cartoon/realistic",
    "primaryColor": "#HEX цвет",
    "secondaryColor": "#HEX цвет"
  }
}`;
  }

  private createMechanicsPrompt(aiContext: any): string {
    return `
Создай игровую механику. Верни результат в JSON формате:
{
  "coreLoop": "Описание основного игрового цикла",
  "primaryMechanic": {
    "name": "Название главной механики",
    "description": "Как она работает",
    "controls": ["действие 1", "действие 2"]
  },
  "secondaryMechanics": [
    {
      "name": "Дополнительная механика",
      "description": "Описание",
      "interaction": "Как взаимодействует с основной"
    }
  ],
  "progression": {
    "type": "level-based/skill-based/story-based",
    "description": "Как развивается игрок"
  },
  "difficulty": {
    "curve": "linear/exponential/adaptive",
    "balancing": "Как поддерживается баланс"
  },
  "feedback": {
    "visual": ["визуальная обратная связь"],
    "audio": ["звуковая обратная связь"],
    "haptic": ["тактильная обратная связь (если есть)"]
  }
}`;
  }

  private createLevelPrompt(aiContext: any): string {
    return `
Создай дизайн уровня. Верни результат в JSON формате:
{
  "theme": "Тема уровня",
  "layout": {
    "type": "linear/branching/open/maze",
    "description": "Описание компоновки",
    "keyAreas": ["область 1", "область 2", "область 3"]
  },
  "challenges": [
    {
      "type": "combat/puzzle/platforming/timing",
      "description": "Описание вызова",
      "difficulty": "easy/medium/hard",
      "placement": "Где размещен в уровне"
    }
  ],
  "collectibles": [
    {
      "type": "coins/powerups/secrets",
      "count": "количество",
      "placement": "стратегия размещения"
    }
  ],
  "atmosphere": {
    "mood": "настроение уровня",
    "lighting": "освещение",
    "soundscape": "звуковое окружение"
  },
  "technicalSpecs": {
    "estimatedSize": "800x600 или другое",
    "performanceNotes": "особенности оптимизации"
  }
}`;
  }

  private createGraphicsPrompt(aiContext: any): string {
    return `
Создай концепцию графического стиля. Верни результат в JSON формате:
{
  "artStyle": "pixel art/cartoon/minimalist/realistic/abstract",
  "colorPalette": {
    "primary": ["#color1", "#color2", "#color3"],
    "secondary": ["#color4", "#color5"],
    "accent": ["#color6"]
  },
  "visualTheme": {
    "mood": "веселый/мрачный/нейтральный/энергичный",
    "inspiration": "источники вдохновения",
    "keyVisualElements": ["элемент 1", "элемент 2"]
  },
  "technicalSpecs": {
    "resolution": "целевое разрешение",
    "spriteSize": "размер спрайтов",
    "animationFrames": "среднее количество кадров анимации",
    "compressionNotes": "требования к сжатию"
  },
  "assetTypes": [
    {
      "type": "characters/backgrounds/ui/effects",
      "description": "описание стиля для этого типа",
      "priority": "high/medium/low"
    }
  ]
}`;
  }

  private createSoundsPrompt(aiContext: any): string {
    return `
Создай концепцию звукового дизайна. Верни результат в JSON формате:
{
  "audioStyle": "chiptune/orchestral/electronic/ambient/rock",
  "mood": "энергичный/спокойный/напряженный/веселый",
  "musicTracks": [
    {
      "name": "Menu Theme",
      "mood": "welcoming",
      "instruments": ["piano", "strings"],
      "duration": "2-3 minutes loop"
    }
  ],
  "soundEffects": [
    {
      "action": "jump/collect/hit/menu_select",
      "description": "описание звука",
      "style": "synthetic/natural/musical",
      "priority": "high/medium/low"
    }
  ],
  "technicalSpecs": {
    "format": "wav/mp3/ogg",
    "bitrate": "целевой битрейт",
    "compression": "требования к сжатию",
    "totalSizeEstimate": "оценка общего размера"
  },
  "adaptiveAudio": {
    "dynamicMusic": "есть ли адаптивная музыка",
    "environmentalSounds": "окружающие звуки",
    "feedbackSounds": "звуки обратной связи"
  }
}`;
  }

  private createUIPrompt(aiContext: any): string {
    return `
Создай концепцию пользовательского интерфейса. Верни результат в JSON формате:
{
  "designPhilosophy": "minimalist/detailed/retro/modern/playful",
  "layoutPrinciples": {
    "screenOrganization": "как организован экран",
    "navigationFlow": "логика навигации",
    "responsiveness": "адаптация к разным экранам"
  },
  "visualElements": {
    "buttonStyle": "описание стиля кнопок",
    "typography": "шрифты и текстовые стили",
    "iconStyle": "стиль иконок",
    "colorScheme": ["#color1", "#color2", "#color3"]
  },
  "screens": [
    {
      "name": "MainMenu/GamePlay/Settings/GameOver",
      "elements": ["элемент 1", "элемент 2"],
      "layout": "описание компоновки",
      "interactions": ["взаимодействие 1", "взаимодействие 2"]
    }
  ],
  "mobileOptimization": {
    "touchTargets": "размер кнопок для касания",
    "gestureSupport": "поддерживаемые жесты",
    "orientation": "portrait/landscape/both"
  },
  "accessibility": {
    "colorBlindness": "поддержка дальтоников",
    "textSize": "настройки размера текста",
    "contrast": "контрастность элементов"
  }
}`;
  }

  /**
   * Парсинг результата ИИ в вариант
   */
  private parseAIResultToVariant(
    stepType: StepType,
    aiResult: any,
    aiContext: any
  ): GenerationVariant {
    let content: any = {};
    
    try {
      // Пытаемся извлечь JSON из ответа ИИ
      const jsonMatch = aiResult.content?.match(/```json\n([\s\S]*?)\n```/) || 
                       aiResult.content?.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        content = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      } else if (typeof aiResult.content === 'string') {
        // Если JSON не найден, создаем базовую структуру
        content = this.createBasicContentFromText(stepType, aiResult.content);
      } else {
        content = aiResult.content || {};
      }
    } catch (error) {
      this.logger.warn(`Ошибка парсинга JSON для ${stepType}:`, error);
      content = this.createFallbackContent(stepType, aiContext);
    }

    return {
      id: uuidv4(),
      type: 'ai_generated',
      content,
      metadata: {
        aiProvider: 'intelligent_router',
        generated: new Date(),
        coherenceScore: this.calculateCoherenceScore(content, aiContext),
        qualityScore: this.calculateVariantQuality(content, stepType),
        reasoning: this.generateReasoningForVariant(content, stepType, aiContext)
      }
    };
  }

  /**
   * Создание базового контента из текста
   */
  private createBasicContentFromText(stepType: StepType, text: string): any {
    switch (stepType) {
      case 'character':
        return {
          name: 'AI Персонаж',
          description: text.slice(0, 200),
          appearance: { physicalDescription: text },
          abilities: [{ name: 'Базовая способность', description: 'AI сгенерированная способность' }]
        };
      case 'mechanics':
        return {
          coreLoop: text.slice(0, 100),
          primaryMechanic: { name: 'Основная механика', description: text }
        };
      default:
        return { description: text, aiGenerated: true };
    }
  }

  /**
   * Создание запасного контента
   */
  private createFallbackContent(stepType: StepType, aiContext: any): any {
    const fallbacks = {
      character: {
        name: `Герой ${aiContext.gameEvolution.theme}`,
        description: 'Храбрый персонаж, готовый к приключениям',
        appearance: { physicalDescription: 'Классический игровой персонаж' }
      },
      mechanics: {
        coreLoop: 'Исследуй, сражайся, побеждай',
        primaryMechanic: { name: 'Базовое движение', description: 'Классическое управление' }
      },
      levels: {
        theme: aiContext.gameEvolution.theme,
        layout: { type: 'linear', description: 'Классическая линейная структура' }
      },
      graphics: {
        artStyle: 'cartoon',
        colorPalette: { primary: ['#3498db', '#e74c3c', '#2ecc71'] }
      },
      sounds: {
        audioStyle: 'chiptune',
        mood: 'веселый'
      },
      ui: {
        designPhilosophy: 'minimalist',
        visualElements: { buttonStyle: 'простые кнопки' }
      }
    };

    return fallbacks[stepType] || { description: 'Базовый AI контент', type: stepType };
  }

  /**
   * Создание fallback варианта
   */
  private createFallbackVariant(stepType: StepType, aiContext: any): GenerationVariant {
    return {
      id: uuidv4(),
      type: 'fallback',
      content: this.createFallbackContent(stepType, aiContext),
      metadata: {
        generated: new Date(),
        isFallback: true,
        reasoning: 'Запасной вариант, созданный при ошибке AI генерации'
      }
    };
  }

  /**
   * Оценка качества вариантов
   */
  private async evaluateVariantQuality(
    variants: GenerationVariant[],
    context: EnhancedInteractiveContext
  ): Promise<GenerationVariant[]> {
    return variants.map(variant => {
      const qualityScore = this.calculateVariantQuality(variant.content, 'character'); // TODO: использовать правильный stepType
      const coherenceScore = this.calculateCoherenceScore(variant.content, context);
      
      variant.metadata = {
        ...variant.metadata,
        qualityScore,
        coherenceScore,
        overallScore: (qualityScore + coherenceScore) / 2
      };
      
      return variant;
    }).sort((a, b) => (b.metadata?.overallScore || 0) - (a.metadata?.overallScore || 0));
  }

  /**
   * Вспомогательные методы
   */
  private initializeStepConfigs(): void {
    // Базовые конфигурации этапов для разных жанров
    this.stepConfigs.set('platformer', {
      steps: [
        { type: 'character', name: 'Главный герой', description: 'Создайте персонажа игры', required: true },
        { type: 'mechanics', name: 'Игровые механики', description: 'Определите основные механики', required: true },
        { type: 'levels', name: 'Дизайн уровней', description: 'Спроектируйте уровни', required: true },
        { type: 'graphics', name: 'Визуальный стиль', description: 'Выберите художественный стиль', required: false },
        { type: 'sounds', name: 'Звуковое оформление', description: 'Создайте звуковой дизайн', required: false },
        { type: 'ui', name: 'Интерфейс', description: 'Разработайте пользовательский интерфейс', required: false }
      ]
    });
  }

  private initializeQualityValidators(): void {
    this.qualityValidators.set('coherence', (content: any, context: any) => {
      // Проверка согласованности с предыдущими выборами
      return Math.random() * 100; // TODO: реальная логика
    });

    this.qualityValidators.set('creativity', (content: any) => {
      // Оценка креативности
      return Math.random() * 100; // TODO: реальная логика
    });
  }

  private createUserProfile(userId: string, promptAnalysis: any): UserProfile {
    return {
      id: userId,
      experience: promptAnalysis.userIntent.experience,
      preferences: {
        genres: [promptAnalysis.gameClassification.genre],
        complexity: promptAnalysis.gameClassification.complexity,
        artStyle: 'modern'
      },
      history: {
        completedGames: 0,
        favoriteGenres: [promptAnalysis.gameClassification.genre],
        averageSessionTime: 30
      }
    };
  }

  private initializeGameEvolution(promptAnalysis: any): GameEvolutionTracker {
    return {
      theme: promptAnalysis.gameClassification.genre,
      mood: promptAnalysis.userIntent.emotionalTone,
      complexity: promptAnalysis.gameClassification.complexity,
      targetAudience: promptAnalysis.gameClassification.targetAudience,
      technicalConstraints: promptAnalysis.gameClassification.technicalRequirements,
      narrative: {
        character: null,
        world: null,
        conflict: null,
        progression: null
      }
    };
  }

  private async createAdaptiveSteps(
    promptAnalysis: any,
    userProfile: UserProfile,
    configuration?: GameConfiguration
  ): Promise<InteractiveStep[]> {
    const baseSteps = this.stepConfigs.get(promptAnalysis.gameClassification.genre)?.steps || 
                     this.stepConfigs.get('platformer')!.steps;

    return baseSteps.map(stepConfig => ({
      stepId: uuidv4(),
      type: stepConfig.type,
      name: stepConfig.name,
      description: stepConfig.description,
      variants: [],
      isCompleted: false,
      isRequired: stepConfig.required,
      estimatedDuration: this.estimateStepDuration(stepConfig.type, userProfile.experience),
      adaptiveHints: this.generateAdaptiveHints(stepConfig.type, promptAnalysis)
    }));
  }

  private updateGameEvolution(
    context: EnhancedInteractiveContext,
    stepType: StepType,
    variant: GenerationVariant
  ): void {
    switch (stepType) {
      case 'character':
        context.gameEvolution.narrative.character = variant.content;
        break;
      case 'mechanics':
        context.gameEvolution.narrative.progression = variant.content;
        break;
      case 'levels':
        context.gameEvolution.narrative.world = variant.content;
        break;
      // Добавить другие типы
    }
  }

  private getCoherenceRequirements(context: EnhancedInteractiveContext): any {
    return {
      themeConsistency: context.gameEvolution.theme,
      moodAlignment: context.gameEvolution.mood,
      audienceAppropriate: context.gameEvolution.targetAudience,
      technicalViability: context.gameEvolution.technicalConstraints
    };
  }

  private calculateVariantQuality(content: any, stepType: StepType): number {
    // Простая оценка качества - в реальности это должно быть более сложно
    let score = 50;
    
    if (content && typeof content === 'object') {
      score += 20;
      
      // Проверяем наличие ключевых полей
      const requiredFields = this.getRequiredFieldsForStepType(stepType);
      const presentFields = requiredFields.filter(field => content[field] !== undefined);
      score += (presentFields.length / requiredFields.length) * 30;
    }
    
    return Math.min(100, score);
  }

  private calculateCoherenceScore(content: any, context: EnhancedInteractiveContext): number {
    // Оценка согласованности с предыдущими выборами
    let score = 70; // базовая согласованность
    
    // Проверяем соответствие теме
    if (content.theme && context.gameEvolution.theme) {
      if (content.theme.includes(context.gameEvolution.theme)) {
        score += 15;
      }
    }
    
    // Проверяем соответствие настроению
    if (content.mood && context.gameEvolution.mood) {
      if (content.mood === context.gameEvolution.mood) {
        score += 15;
      }
    }
    
    return Math.min(100, score);
  }

  private getRequiredFieldsForStepType(stepType: StepType): string[] {
    const fieldMap = {
      character: ['name', 'description', 'appearance'],
      mechanics: ['coreLoop', 'primaryMechanic'],
      levels: ['theme', 'layout'],
      graphics: ['artStyle', 'colorPalette'],
      sounds: ['audioStyle', 'mood'],
      ui: ['designPhilosophy', 'layoutPrinciples']
    };
    
    return fieldMap[stepType] || ['description'];
  }

  private generateReasoningForVariant(content: any, stepType: StepType, aiContext: any): string {
    return `Вариант создан с учетом жанра ${aiContext.gameEvolution.theme} и пользовательского опыта ${aiContext.userProfile.experience}`;
  }

  private updateQualityMetrics(current: QualityTracker, variants: GenerationVariant[]): QualityTracker {
    const avgQuality = variants.reduce((sum, v) => sum + (v.metadata?.qualityScore || 50), 0) / variants.length;
    const avgCoherence = variants.reduce((sum, v) => sum + (v.metadata?.coherenceScore || 50), 0) / variants.length;
    
    return {
      ...current,
      coherence: (current.coherence + avgCoherence) / 2,
      creativity: (current.creativity + avgQuality) / 2,
      // Остальные метрики остаются без изменений пока
      feasibility: current.feasibility,
      marketability: current.marketability,
      technicalSoundness: current.technicalSoundness
    };
  }

  private calculateOverallQuality(metrics: QualityTracker): number {
    return (metrics.coherence + metrics.creativity + metrics.feasibility + 
            metrics.marketability + metrics.technicalSoundness) / 5;
  }

  private calculateProgress(context: EnhancedInteractiveContext): number {
    const totalSteps = 6; // предполагаемое количество этапов
    const completedSteps = context.completedSteps.size;
    return (completedSteps / totalSteps) * 100;
  }

  private estimateStepDuration(stepType: StepType, experience: string): number {
    const baseDurations = {
      character: 300, // 5 минут
      mechanics: 600, // 10 минут
      levels: 480,    // 8 минут
      graphics: 240,  // 4 минуты
      sounds: 180,    // 3 минуты
      ui: 360         // 6 минут
    };
    
    const experienceMultiplier = {
      beginner: 1.5,
      intermediate: 1.0,
      advanced: 0.8,
      professional: 0.6
    };
    
    return (baseDurations[stepType] || 300) * (experienceMultiplier[experience] || 1.0);
  }

  private generateAdaptiveHints(stepType: StepType, promptAnalysis: any): string[] {
    const baseHints = {
      character: ['Подумайте о уникальных способностях персонажа', 'Рассмотрите предыстория героя'],
      mechanics: ['Сосредоточьтесь на основном игровом цикле', 'Обеспечьте баланс сложности'],
      levels: ['Создайте разнообразные вызовы', 'Учтите прогрессию сложности'],
      graphics: ['Выберите стиль, подходящий для жанра', 'Учтите технические ограничения'],
      sounds: ['Создайте атмосферное звуковое окружение', 'Обеспечьте обратную связь через звук'],
      ui: ['Сделайте интерфейс интуитивным', 'Оптимизируйте для мобильных устройств']
    };
    
    return baseHints[stepType] || ['Будьте креативны', 'Учтите пользовательский опыт'];
  }

  private async startEnhancedStep(gameId: string, stepIndex: number): Promise<void> {
    const context = this.activeGenerations.get(gameId);
    if (!context) return;

    this.logger.info(`🚀 Запуск улучшенного этапа ${stepIndex} для игры ${gameId}`);

    // Автоматически генерируем начальные варианты
    const state = this.getGenerationState(gameId);
    if (state && stepIndex < state.steps.length) {
      const step = state.steps[stepIndex];
      await this.generateIntelligentVariants(gameId, step.stepId, 5);
    }
  }

  private async proceedToNextEnhancedStep(gameId: string): Promise<void> {
    const context = this.activeGenerations.get(gameId);
    if (!context) return;

    const state = this.getGenerationState(gameId);
    if (!state) return;

    const nextStepIndex = state.currentStepIndex + 1;
    
    if (nextStepIndex >= state.totalSteps) {
      // Все этапы завершены, создаем финальную игру
      await this.completeEnhancedGeneration(gameId);
    } else {
      // Переходим к следующему этапу
      state.currentStepIndex = nextStepIndex;
      await this.startEnhancedStep(gameId, nextStepIndex);
    }
  }

  private async completeEnhancedGeneration(gameId: string): Promise<string> {
    const context = this.activeGenerations.get(gameId);
    if (!context) {
      throw new Error(`Контекст генерации ${gameId} не найден`);
    }

    this.logger.info(`🏁 Завершение улучшенной генерации ${gameId}`);

    // Создаем финальную игру на основе всех выборов и контекста
    const finalGamePath = await this.buildFinalGameWithContext(context);
    
    const state = this.getGenerationState(gameId);
    if (state) {
      state.generatedGame = finalGamePath;
      state.isActive = false;
    }

    this.emit('enhanced:generation:completed', {
      gameId,
      finalGame: {
        path: finalGamePath,
        downloadUrl: `/api/games/${gameId}/download`,
        qualityScore: this.calculateOverallQuality(context.qualityMetrics)
      },
      context: context
    });

    // Очищаем контекст через некоторое время
    setTimeout(() => {
      this.activeGenerations.delete(gameId);
    }, 3600000); // 1 час

    return finalGamePath;
  }

  private async buildFinalGameWithContext(context: EnhancedInteractiveContext): Promise<string> {
    // Здесь должна быть логика сборки игры с учетом всего контекста
    // Пока что возвращаем простую заглушку
    const outputDir = path.join(process.cwd(), 'generated-games', context.gameId);
    await fs.mkdir(outputDir, { recursive: true });
    
    // Создаем файл с результатами генерации
    const result = {
      gameId: context.gameId,
      promptAnalysis: context.promptAnalysis,
      userProfile: context.userProfile,
      gameEvolution: context.gameEvolution,
      qualityMetrics: context.qualityMetrics,
      completedSteps: Object.fromEntries(context.completedSteps),
      generatedAt: new Date()
    };
    
    await fs.writeFile(
      path.join(outputDir, 'generation-result.json'),
      JSON.stringify(result, null, 2)
    );
    
    return outputDir;
  }

  // Заглушка для совместимости с существующим интерфейсом
  public getGenerationState(gameId: string): InteractiveGenerationState | undefined {
    // Это должно возвращать состояние из другого хранилища
    // Пока что возвращаем undefined
    return undefined;
  }
} 
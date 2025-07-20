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
import { DeepSeekService } from './ai/deepseek';
import { OpenAIService } from './ai/openai';

export class InteractiveGenerationService extends EventEmitter {
  private logger: LoggerService;
  private deepseek: DeepSeekService;
  private openai: OpenAIService;
  private activeGenerations = new Map<string, InteractiveGenerationState>();
  private stepConfigs = new Map<string, InteractiveStepConfig>();

  constructor() {
    super();
    this.logger = new LoggerService();
    this.deepseek = new DeepSeekService();
    this.openai = new OpenAIService();
    this.initializeStepConfigs();
  }

  /**
   * Начинает интерактивную генерацию игры с учетом конфигурации
   */
  public async startInteractiveGeneration(
    request: InteractiveGameRequest & { configuration?: GameConfiguration }
  ): Promise<InteractiveGenerationState> {
    try {
      this.logger.info(`🎮 Начало интерактивной генерации игры: ${request.id}`);

      // Используем конфигурацию, если она предоставлена
      const gameConfig = request.configuration;
      const genre = gameConfig?.mainGenre || request.genre;

      this.logger.info(`📋 Конфигурация игры: жанр=${genre}, стиль=${gameConfig?.visualStyle?.graphicStyle}`);

      // Получаем конфигурацию этапов для жанра
      const stepConfig = this.stepConfigs.get(genre) || this.getDefaultStepConfig();
      
      // Создаем этапы на основе конфигурации и пользовательских предпочтений
      const steps = await this.createStepsFromConfig(stepConfig, request, gameConfig);

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
        gameConfiguration: gameConfig // Сохраняем конфигурацию в состоянии
      };

      this.activeGenerations.set(request.id, state);

      // Запускаем первый этап
      await this.startStep(request.id, 0);

      return state;
    } catch (error) {
      this.logger.error(`Ошибка начала интерактивной генерации ${request.id}:`, error);
      throw error;
    }
  }

  /**
   * Генерирует варианты для конкретного этапа
   */
  public async generateStepVariants(
    gameId: string,
    stepId: string,
    count: number = 5
  ): Promise<VariantGenerationResponse> {
    try {
      const state = this.activeGenerations.get(gameId);
      if (!state) {
        throw new Error(`Интерактивная генерация ${gameId} не найдена`);
      }

      const step = state.steps.find(s => s.stepId === stepId);
      if (!step) {
        throw new Error(`Этап ${stepId} не найден`);
      }

      this.emit('variants:generating', {
        gameId,
        stepId,
        progress: 0,
        message: `Генерируем ${count} вариантов для этапа "${step.name}"`
      });

      const variants = await this.generateVariantsForStep(step, state, count);

      // Добавляем варианты к этапу
      step.variants.push(...variants);

      // Обновляем состояние
      state.lastActivityAt = new Date();
      
      const response: VariantGenerationResponse = {
        stepId,
        variants,
        generatedAt: new Date(),
        totalCount: variants.length,
        hasMore: true // Всегда можно сгенерировать еще
      };

      this.emit('variants:generated', {
        gameId,
        stepId,
        variants
      });

      return response;
    } catch (error) {
      this.logger.error(`Ошибка генерации вариантов для ${gameId}/${stepId}:`, error);
      throw error;
    }
  }

  /**
   * Обрабатывает выбор пользователя для этапа
   */
  public async selectVariant(
    gameId: string,
    stepId: string,
    variantId: string,
    customPrompt?: string
  ): Promise<void> {
    try {
      const state = this.activeGenerations.get(gameId);
      if (!state) {
        throw new Error(`Интерактивная генерация ${gameId} не найдена`);
      }

      const step = state.steps.find(s => s.stepId === stepId);
      if (!step) {
        throw new Error(`Этап ${stepId} не найден`);
      }

      const variant = step.variants.find(v => v.id === variantId);
      if (!variant) {
        throw new Error(`Вариант ${variantId} не найден`);
      }

      // Сохраняем выбор
      step.selectedVariant = variantId;
      step.customPrompt = customPrompt;
      step.isCompleted = true;
      state.finalChoices[stepId] = variantId;
      state.lastActivityAt = new Date();

      this.emit('step:completed', {
        gameId,
        stepId,
        selectedVariant: variant
      });

      this.logger.info(`✅ Этап ${stepId} завершен для игры ${gameId}`);

      // Переходим к следующему этапу или завершаем генерацию
      await this.proceedToNextStep(gameId);
    } catch (error) {
      this.logger.error(`Ошибка выбора варианта ${gameId}/${stepId}/${variantId}:`, error);
      throw error;
    }
  }

  /**
   * Обрабатывает загрузку пользовательского файла
   */
  public async uploadCustomAsset(
    gameId: string,
    stepId: string,
    file: {
      buffer: Buffer;
      filename: string;
      mimetype: string;
      size: number;
    }
  ): Promise<GenerationVariant> {
    try {
      const state = this.activeGenerations.get(gameId);
      if (!state) {
        throw new Error(`Интерактивная генерация ${gameId} не найдена`);
      }

      // Создаем директорию для пользовательских файлов
      const uploadsDir = path.join(process.cwd(), 'temp', 'uploads', gameId);
      await fs.mkdir(uploadsDir, { recursive: true });

      // Сохраняем файл
      const fileExtension = path.extname(file.filename);
      const savedFilename = `${stepId}_${uuidv4()}${fileExtension}`;
      const filePath = path.join(uploadsDir, savedFilename);
      
      await fs.writeFile(filePath, file.buffer);

      // Создаем превью для изображений
      let preview: string | undefined;
      if (file.mimetype.startsWith('image/')) {
        preview = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
      }

      // Создаем вариант для загруженного файла
      const variant: GenerationVariant = {
        id: uuidv4(),
        type: 'user_uploaded',
        content: {
          filePath,
          originalName: file.filename,
          savedName: savedFilename
        },
        preview,
        metadata: {
          filename: file.filename,
          size: file.size,
          mimetype: file.mimetype
        }
      };

      // Добавляем к этапу
      const step = state.steps.find(s => s.stepId === stepId);
      if (step) {
        step.variants.push(variant);
      }

      this.logger.info(`📁 Файл загружен для ${gameId}/${stepId}: ${file.filename}`);

      return variant;
    } catch (error) {
      this.logger.error(`Ошибка загрузки файла для ${gameId}/${stepId}:`, error);
      throw error;
    }
  }

  /**
   * Получает состояние интерактивной генерации
   */
  public getGenerationState(gameId: string): InteractiveGenerationState | undefined {
    return this.activeGenerations.get(gameId);
  }

  /**
   * Приостанавливает генерацию
   */
  public pauseGeneration(gameId: string, reason: string = 'Пользователь приостановил'): void {
    const state = this.activeGenerations.get(gameId);
    if (state) {
      state.isActive = false;
      state.lastActivityAt = new Date();
      
      this.emit('generation:paused', { gameId, reason });
      this.logger.info(`⏸️ Генерация ${gameId} приостановлена: ${reason}`);
    }
  }

  /**
   * Возобновляет генерацию
   */
  public resumeGeneration(gameId: string): void {
    const state = this.activeGenerations.get(gameId);
    if (state) {
      state.isActive = true;
      state.lastActivityAt = new Date();
      
      this.emit('generation:resumed', { 
        gameId, 
        fromStep: state.currentStepIndex 
      });
      this.logger.info(`▶️ Генерация ${gameId} возобновлена с этапа ${state.currentStepIndex}`);
    }
  }

  /**
   * Завершает интерактивную генерацию и создает финальную игру
   */
  public async completeGeneration(gameId: string): Promise<string> {
    try {
      const state = this.activeGenerations.get(gameId);
      if (!state) {
        throw new Error(`Интерактивная генерация ${gameId} не найдена`);
      }

      this.logger.info(`🏁 Завершение интерактивной генерации ${gameId}`);

      // Создаем финальную игру на основе всех выборов
      const finalGamePath = await this.buildFinalGame(state);
      
      state.generatedGame = finalGamePath;
      state.isActive = false;

      // Очищаем активную генерацию через некоторое время
      setTimeout(() => {
        this.activeGenerations.delete(gameId);
      }, 3600000); // 1 час

      this.emit('generation:completed', {
        gameId,
        finalGame: {
          path: finalGamePath,
          downloadUrl: `/api/games/${gameId}/download`,
          size: 0 // TODO: рассчитать размер
        }
      });

      return finalGamePath;
    } catch (error) {
      this.logger.error(`Ошибка завершения генерации ${gameId}:`, error);
      throw error;
    }
  }

  /**
   * Генерирует варианты с учетом пользовательского промпта
   */
  public async generateVariantsWithCustomPrompt(
    gameId: string,
    stepId: string,
    customPrompt: string,
    count: number = 3
  ): Promise<VariantGenerationResponse> {
    try {
      const state = this.activeGenerations.get(gameId);
      if (!state) {
        throw new Error(`Интерактивная генерация ${gameId} не найдена`);
      }

      const step = state.steps.find(s => s.stepId === stepId);
      if (!step) {
        throw new Error(`Этап ${stepId} не найден`);
      }

      this.emit('variants:generating', {
        gameId,
        stepId,
        progress: 0,
        message: `Генерируем ${count} вариантов с учетом ваших требований: "${customPrompt}"`
      });

      // Добавляем контекст пользовательского промпта
      const context = this.buildContextFromCompletedSteps(state);
      context.userRequirements = customPrompt;

      const variants = await this.generateVariantsForStepWithContext(step, context, count);

      // Отмечаем варианты как созданные с пользовательским промптом
      variants.forEach(variant => {
        variant.metadata = {
          ...variant.metadata,
          userPrompt: customPrompt,
          isCustom: true
        };
      });

      // Добавляем варианты к этапу
      step.variants.push(...variants);
      state.lastActivityAt = new Date();

      const response: VariantGenerationResponse = {
        stepId,
        variants,
        generatedAt: new Date(),
        totalCount: variants.length,
        hasMore: true,
        customPrompt
      };

      this.emit('variants:generated', {
        gameId,
        stepId,
        variants,
        isCustomGeneration: true,
        customPrompt
      });

      return response;
    } catch (error) {
      this.logger.error(`Ошибка генерации кастомных вариантов для ${gameId}/${stepId}:`, error);
      throw error;
    }
  }

  /**
   * Получает детальный прогресс генерации с этапами
   */
  public getGenerationProgress(gameId: string): {
    currentStep: number;
    totalSteps: number;
    stepName: string;
    stepDescription: string;
    progress: number;
    variantsGenerated: number;
    isWaitingForSelection: boolean;
  } | null {
    const state = this.activeGenerations.get(gameId);
    if (!state) return null;

    const currentStep = state.steps[state.currentStepIndex];
    if (!currentStep) return null;

    return {
      currentStep: state.currentStepIndex + 1,
      totalSteps: state.totalSteps,
      stepName: currentStep.name,
      stepDescription: currentStep.description,
      progress: Math.round(((state.currentStepIndex + 1) / state.totalSteps) * 100),
      variantsGenerated: currentStep.variants.length,
      isWaitingForSelection: currentStep.variants.length > 0 && !currentStep.isCompleted
    };
  }

  /**
   * Генерирует предварительный просмотр для варианта
   */
  public async generateVariantPreview(
    gameId: string,
    stepId: string,
    variantId: string
  ): Promise<{ preview: string; type: 'image' | 'audio' | 'text' }> {
    try {
      const state = this.activeGenerations.get(gameId);
      if (!state) {
        throw new Error(`Генерация ${gameId} не найдена`);
      }

      const step = state.steps.find(s => s.stepId === stepId);
      if (!step) {
        throw new Error(`Этап ${stepId} не найден`);
      }

      const variant = step.variants.find(v => v.id === variantId);
      if (!variant) {
        throw new Error(`Вариант ${variantId} не найден`);
      }

      // Генерируем превью в зависимости от типа этапа
      switch (step.type) {
        case 'character':
        case 'graphics':
          // Генерируем изображение персонажа/графики
          const imageResult = await this.openai.generateSprite(
            `${variant.content.description} - превью для игры`,
            variant.content.style || 'pixel art',
            { width: 128, height: 128 }
          );
          return {
            preview: `data:image/png;base64,${imageResult.data.toString('base64')}`,
            type: 'image'
          };

        case 'sounds':
          // Генерируем короткий звуковой превью
          const audioResult = await this.openai.generateSound(
            variant.content.description,
            500 // 0.5 секунды превью
          );
          return {
            preview: `data:audio/wav;base64,${audioResult.data.toString('base64')}`,
            type: 'audio'
          };

        default:
          // Для остальных типов возвращаем текстовое описание
          return {
            preview: JSON.stringify(variant.content, null, 2),
            type: 'text'
          };
      }
    } catch (error) {
      this.logger.error(`Ошибка генерации превью для ${variantId}:`, error);
      throw error;
    }
  }

  // Приватные методы

  private async startStep(gameId: string, stepIndex: number): Promise<void> {
    const state = this.activeGenerations.get(gameId);
    if (!state || stepIndex >= state.steps.length) {
      return;
    }

    const step = state.steps[stepIndex];
    state.currentStepIndex = stepIndex;

    this.emit('step:started', {
      gameId,
      stepIndex,
      step
    });

    // Генерируем начальные варианты для этапа
    await this.generateStepVariants(gameId, step.stepId, 5);
  }

  private async proceedToNextStep(gameId: string): Promise<void> {
    const state = this.activeGenerations.get(gameId);
    if (!state) return;

    const nextStepIndex = state.currentStepIndex + 1;
    
    if (nextStepIndex >= state.totalSteps) {
      // Все этапы завершены, создаем финальную игру
      await this.completeGeneration(gameId);
    } else {
      // Переходим к следующему этапу
      await this.startStep(gameId, nextStepIndex);
    }
  }

  private async generateVariantsForStep(
    step: InteractiveStep,
    state: InteractiveGenerationState,
    count: number
  ): Promise<GenerationVariant[]> {
    const variants: GenerationVariant[] = [];

    // Получаем контекст от предыдущих этапов
    const context = this.buildContextFromCompletedSteps(state);

    switch (step.type) {
      case 'character':
        for (let i = 0; i < count; i++) {
          variants.push(await this.generateCharacterVariant(context));
        }
        break;
      case 'mechanics':
        for (let i = 0; i < count; i++) {
          variants.push(await this.generateMechanicsVariant(context));
        }
        break;
      case 'levels':
        for (let i = 0; i < count; i++) {
          variants.push(await this.generateLevelVariant(context));
        }
        break;
      case 'graphics':
        for (let i = 0; i < count; i++) {
          variants.push(await this.generateGraphicsVariant(context));
        }
        break;
      case 'sounds':
        for (let i = 0; i < count; i++) {
          variants.push(await this.generateSoundVariant(context));
        }
        break;
      case 'ui':
        for (let i = 0; i < count; i++) {
          variants.push(await this.generateUIVariant(context));
        }
        break;
      default:
        this.logger.warn(`Неизвестный тип этапа: ${step.type}`);
    }

    return variants;
  }

  private async generateCharacterVariant(context: any): Promise<CharacterVariant> {
    const prompt = `Создай персонажа для игры на основе контекста: ${JSON.stringify(context, null, 2)}`;
    
    const response = await this.deepseek.generateCode(prompt, `
      Создай JSON описание персонажа игры. Ответ должен содержать только JSON в следующем формате:
      {
        "name": "Имя персонажа",
        "description": "Краткое описание",
        "appearance": "Детальное описание внешности",
        "abilities": ["способность1", "способность2"],
        "primaryColor": "#FF0000",
        "style": "pixel art / cartoon / realistic"
      }
    `);

    const characterData = this.parseJSONResponse(response.content);

    return {
      id: uuidv4(),
      type: 'ai_generated',
      content: characterData,
      metadata: {
        prompt,
        style: characterData.style
      }
    };
  }

  private async generateMechanicsVariant(context: any): Promise<MechanicsVariant> {
    const prompt = `Создай игровую механику на основе контекста: ${JSON.stringify(context, null, 2)}`;
    
    const response = await this.deepseek.generateCode(prompt, `
      Создай JSON описание игровой механики. Ответ должен содержать только JSON в следующем формате:
      {
        "coreLoop": "Основной игровой цикл",
        "controls": ["управление1", "управление2"],
        "objectives": ["цель1", "цель2"],
        "progression": "Система прогрессии",
        "difficulty": "Кривая сложности",
        "specialFeatures": ["особенность1", "особенность2"]
      }
    `);

    const mechanicsData = this.parseJSONResponse(response.content);

    return {
      id: uuidv4(),
      type: 'ai_generated',
      content: mechanicsData,
      metadata: {
        prompt
      }
    };
  }

  private async generateLevelVariant(context: any): Promise<LevelVariant> {
    const prompt = `Создай дизайн уровня на основе контекста: ${JSON.stringify(context, null, 2)}`;
    
    const response = await this.deepseek.generateCode(prompt, `
      Создай JSON описание дизайна уровня. Ответ должен содержать только JSON в следующем формате:
      {
        "layout": "Описание компоновки уровня",
        "theme": "Тема уровня",
        "obstacles": ["препятствие1", "препятствие2"],
        "collectibles": ["предмет1", "предмет2"],
        "enemies": ["враг1", "враг2"],
        "backgroundElements": ["элемент1", "элемент2"],
        "size": {"width": 800, "height": 600}
      }
    `);

    const levelData = this.parseJSONResponse(response.content);

    return {
      id: uuidv4(),
      type: 'ai_generated',
      content: levelData,
      metadata: {
        prompt
      }
    };
  }

  private async generateGraphicsVariant(context: any): Promise<GraphicsVariant> {
    const prompt = `Создай графический стиль на основе контекста: ${JSON.stringify(context, null, 2)}`;
    
    const response = await this.deepseek.generateCode(prompt, `
      Создай JSON описание графического стиля. Ответ должен содержать только JSON в следующем формате:
      {
        "artStyle": "pixel art / cartoon / realistic / minimalist",
        "colorPalette": ["#FF0000", "#00FF00", "#0000FF"],
        "theme": "Тема визуального стиля",
        "mood": "Настроение",
        "examples": []
      }
    `);

    const graphicsData = this.parseJSONResponse(response.content);

    return {
      id: uuidv4(),
      type: 'ai_generated',
      content: graphicsData,
      metadata: {
        prompt,
        style: graphicsData.artStyle
      }
    };
  }

  private async generateSoundVariant(context: any): Promise<SoundVariant> {
    const prompt = `Создай звуковой дизайн на основе контекста: ${JSON.stringify(context, null, 2)}`;
    
    const response = await this.deepseek.generateCode(prompt, `
      Создай JSON описание звукового дизайна. Ответ должен содержать только JSON в следующем формате:
      {
        "style": "electronic / orchestral / chiptune / ambient",
        "mood": "Настроение музыки",
        "instruments": ["инструмент1", "инструмент2"],
        "tempo": "slow / medium / fast / variable"
      }
    `);

    const soundData = this.parseJSONResponse(response.content);

    return {
      id: uuidv4(),
      type: 'ai_generated',
      content: soundData,
      metadata: {
        prompt
      }
    };
  }

  private async generateUIVariant(context: any): Promise<UIVariant> {
    const prompt = `Создай дизайн интерфейса на основе контекста: ${JSON.stringify(context, null, 2)}`;
    
    const response = await this.deepseek.generateCode(prompt, `
      Создай JSON описание интерфейса. Ответ должен содержать только JSON в следующем формате:
      {
        "style": "modern / retro / minimalist / gaming",
        "layout": "Описание расположения элементов",
        "colorScheme": "Цветовая схема",
        "components": ["компонент1", "компонент2"]
      }
    `);

    const uiData = this.parseJSONResponse(response.content);

    return {
      id: uuidv4(),
      type: 'ai_generated',
      content: uiData,
      metadata: {
        prompt
      }
    };
  }

  private buildContextFromCompletedSteps(state: InteractiveGenerationState): any {
    const context: any = {
      gameId: state.gameId,
      genre: 'unknown', // TODO: взять из запроса
      completedSteps: {}
    };

    for (const step of state.steps) {
      if (step.isCompleted && step.selectedVariant) {
        const selectedVariant = step.variants.find(v => v.id === step.selectedVariant);
        if (selectedVariant) {
          context.completedSteps[step.type] = selectedVariant.content;
        }
      }
    }

    return context;
  }

  private async buildFinalGame(state: InteractiveGenerationState): Promise<string> {
    this.logger.info(`🎮 Собираем финальную игру из интерактивных выборов: ${state.gameId}`);
    
    const outputDir = path.join(process.cwd(), 'generated-games', state.gameId);
    await fs.mkdir(outputDir, { recursive: true });

    try {
      // Анализируем выборы пользователя и строим конфигурацию игры
      const gameConfig = this.buildGameConfiguration(state);
      
      // Генерируем основные файлы игры
      const gameFiles = await this.generateGameFiles(gameConfig, state);
      
      // Создаем структуру файлов
      await this.createGameStructure(outputDir, gameFiles);
      
      // Генерируем Yandex SDK интеграцию
      await this.generateYandexIntegration(outputDir, gameConfig);
      
      // Создаем манифест игры
      await this.createGameManifest(outputDir, gameConfig);
      
      this.logger.info(`✅ Интерактивная игра собрана: ${outputDir}`);
      return outputDir;
      
    } catch (error) {
      this.logger.error('Ошибка сборки интерактивной игры', { error, gameId: state.gameId });
      
      // В случае ошибки создаем простую игру-заглушку
      await this.createFallbackGame(outputDir, state);
      return outputDir;
    }
  }

  private buildGameConfiguration(state: InteractiveGenerationState): any {
    const config: any = {
      id: state.gameId,
      title: 'Интерактивно созданная игра',
      genre: 'platformer', // по умолчанию
      character: null,
      mechanics: null,
      levels: [],
      graphics: null,
      sounds: [],
      ui: null,
      story: null
    };

    // Проходим по завершенным шагам и собираем конфигурацию
    for (const step of state.steps) {
      if (step.isCompleted && step.selectedVariant) {
        const variant = step.variants.find(v => v.id === step.selectedVariant);
        if (!variant) continue;

        switch (step.type) {
          case 'character':
            config.character = variant.content;
            config.title = config.character.name ? `Приключения ${config.character.name}` : config.title;
            break;
            
          case 'mechanics':
            config.mechanics = variant.content;
            if (variant.content.coreLoop) {
              // Определяем жанр по механикам
              if (variant.content.coreLoop.includes('jump') || variant.content.coreLoop.includes('platform')) {
                config.genre = 'platformer';
              } else if (variant.content.coreLoop.includes('puzzle') || variant.content.coreLoop.includes('match')) {
                config.genre = 'puzzle';
              } else if (variant.content.coreLoop.includes('shoot') || variant.content.coreLoop.includes('enemy')) {
                config.genre = 'arcade';
              }
            }
            break;
            
          case 'levels':
            config.levels.push(variant.content);
            break;
            
          case 'graphics':
            config.graphics = variant.content;
            break;
            
          case 'sounds':
            config.sounds.push(variant.content);
            break;
            
          case 'ui':
            config.ui = variant.content;
            break;
            
          case 'story':
            config.story = variant.content;
            break;
        }
      }
    }

    return config;
  }

  private async generateGameFiles(gameConfig: any, state: InteractiveGenerationState): Promise<Record<string, string>> {
    const files: Record<string, string> = {};

    // Генерируем HTML файл
    files['index.html'] = this.generateIndexHTML(gameConfig);
    
    // Генерируем CSS стили
    files['styles.css'] = this.generateCSS(gameConfig);
    
    // Генерируем JavaScript код игры
    files['game.js'] = await this.generateGameJavaScript(gameConfig);
    
    // Генерируем конфигурационный файл
    files['config.json'] = JSON.stringify(gameConfig, null, 2);
    
    // Если есть персонаж, создаем файл персонажа
    if (gameConfig.character) {
      files['character.js'] = this.generateCharacterCode(gameConfig.character);
    }
    
    // Если есть уровни, создаем файлы уровней
    if (gameConfig.levels.length > 0) {
      gameConfig.levels.forEach((level: any, index: number) => {
        files[`level${index + 1}.js`] = this.generateLevelCode(level, index + 1);
      });
    }

    return files;
  }

  private generateIndexHTML(gameConfig: any): string {
    const title = gameConfig.title || 'Интерактивная игра';
    const backgroundColor = gameConfig.graphics?.colorPalette?.[0] || '#2c3e50';
    
    return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <link rel="stylesheet" href="styles.css">
    <script src="https://yandex.ru/games/sdk/v2"></script>
</head>
<body style="background-color: ${backgroundColor}; margin: 0; padding: 0;">
    <div id="game-container">
        <canvas id="gameCanvas" width="800" height="600"></canvas>
        
        <!-- UI элементы -->
        <div id="game-ui">
            <div id="score-display">Счет: <span id="score">0</span></div>
            <div id="lives-display">Жизни: <span id="lives">3</span></div>
            <div id="level-display">Уровень: <span id="level">1</span></div>
        </div>
        
        <!-- Мобильное управление -->
        <div id="mobile-controls" class="mobile-only">
            <button id="left-btn" class="control-btn">←</button>
            <button id="right-btn" class="control-btn">→</button>
            <button id="jump-btn" class="control-btn">↑</button>
        </div>
        
        <!-- Меню игры -->
        <div id="game-menu" class="menu hidden">
            <div class="menu-content">
                <h2>Игра окончена!</h2>
                <p>Ваш счет: <span id="final-score">0</span></p>
                <button id="restart-btn">Играть снова</button>
                <button id="share-btn">Поделиться</button>
            </div>
        </div>
        
        <!-- Загрузочный экран -->
        <div id="loading-screen">
            <div class="loading-content">
                <h1>${title}</h1>
                <div class="loading-spinner"></div>
                <p>Загрузка...</p>
            </div>
        </div>
    </div>

    <!-- Подключаем игровые скрипты -->
    ${gameConfig.character ? '<script src="character.js"></script>' : ''}
    ${gameConfig.levels.map((_: any, i: number) => `<script src="level${i + 1}.js"></script>`).join('\\n    ')}
    <script src="game.js"></script>
    
    <script>
        // Инициализация после загрузки Yandex SDK
        window.addEventListener('load', () => {
            initializeYandexSDK().then(() => {
                startGame();
            });
        });
    </script>
</body>
</html>`;
  }

  private generateCSS(gameConfig: any): string {
    const primaryColor = gameConfig.graphics?.colorPalette?.[0] || '#3498db';
    const secondaryColor = gameConfig.graphics?.colorPalette?.[1] || '#2ecc71';
    const backgroundColor = gameConfig.graphics?.colorPalette?.[2] || '#2c3e50';
    
    return `
/* Основные стили игры */
body {
    font-family: 'Arial', sans-serif;
    margin: 0;
    padding: 0;
    background-color: ${backgroundColor};
    color: white;
    overflow: hidden;
}

#game-container {
    position: relative;
    width: 100vw;
    height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
}

#gameCanvas {
    border: 2px solid ${primaryColor};
    border-radius: 8px;
    background-color: #000;
    max-width: 100%;
    max-height: 100%;
}

/* UI элементы */
#game-ui {
    position: absolute;
    top: 20px;
    left: 20px;
    z-index: 100;
}

#score-display, #lives-display, #level-display {
    background-color: rgba(0, 0, 0, 0.7);
    padding: 8px 16px;
    margin: 4px 0;
    border-radius: 4px;
    font-weight: bold;
    color: ${primaryColor};
}

/* Мобильное управление */
.mobile-only {
    display: none;
}

@media (max-width: 768px) {
    .mobile-only {
        display: block;
    }
}

#mobile-controls {
    position: absolute;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 20px;
    z-index: 100;
}

.control-btn {
    width: 60px;
    height: 60px;
    border: none;
    border-radius: 50%;
    background-color: ${primaryColor};
    color: white;
    font-size: 24px;
    font-weight: bold;
    cursor: pointer;
    user-select: none;
    touch-action: manipulation;
    transition: all 0.2s ease;
}

.control-btn:active {
    background-color: ${secondaryColor};
    transform: scale(0.95);
}

/* Меню игры */
.menu {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 200;
}

.menu-content {
    background-color: ${backgroundColor};
    padding: 40px;
    border-radius: 12px;
    text-align: center;
    border: 2px solid ${primaryColor};
}

.menu-content h2 {
    color: ${primaryColor};
    margin-bottom: 20px;
}

.menu-content button {
    background-color: ${primaryColor};
    color: white;
    border: none;
    padding: 12px 24px;
    margin: 8px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 16px;
    transition: background-color 0.3s ease;
}

.menu-content button:hover {
    background-color: ${secondaryColor};
}

/* Загрузочный экран */
#loading-screen {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: ${backgroundColor};
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 300;
}

.loading-content {
    text-align: center;
}

.loading-content h1 {
    color: ${primaryColor};
    margin-bottom: 30px;
    font-size: 2.5em;
}

.loading-spinner {
    width: 50px;
    height: 50px;
    border: 4px solid rgba(255, 255, 255, 0.3);
    border-top: 4px solid ${primaryColor};
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 20px;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

.hidden {
    display: none;
}

/* Адаптивность */
@media (max-width: 768px) {
    #game-ui {
        top: 10px;
        left: 10px;
    }
    
    #score-display, #lives-display, #level-display {
        padding: 6px 12px;
        font-size: 14px;
    }
    
    .menu-content {
        padding: 20px;
        margin: 20px;
    }
}
`;
  }

  private async generateGameJavaScript(gameConfig: any): string {
    // Базовый шаблон игры в зависимости от жанра
    let baseTemplate = '';
    
    switch (gameConfig.genre) {
      case 'platformer':
        baseTemplate = await this.generatePlatformerGame(gameConfig);
        break;
      case 'puzzle':
        baseTemplate = await this.generatePuzzleGame(gameConfig);
        break;
      case 'arcade':
        baseTemplate = await this.generateArcadeGame(gameConfig);
        break;
      default:
        baseTemplate = await this.generateGenericGame(gameConfig);
    }
    
    return baseTemplate;
  }

  private async generatePlatformerGame(gameConfig: any): string {
    const characterName = gameConfig.character?.name || 'Player';
    const characterSpeed = gameConfig.mechanics?.controls?.includes('fast') ? 300 : 200;
    const jumpPower = gameConfig.mechanics?.controls?.includes('high_jump') ? 600 : 450;
    
    return `
// Платформер игра на основе интерактивных выборов
class InteractivePlatformerGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.gameState = 'playing'; // playing, paused, gameOver
        
        // Конфигурация из выборов пользователя
        this.config = ${JSON.stringify(gameConfig, null, 8)};
        
        // Игрок
        this.player = {
            x: 50,
            y: 400,
            width: 32,
            height: 48,
            vx: 0,
            vy: 0,
            speed: ${characterSpeed},
            jumpPower: ${jumpPower},
            onGround: false,
            color: '${gameConfig.character?.primaryColor || '#3498db'}'
        };
        
        // Управление
        this.keys = {};
        this.mobileControls = {
            left: false,
            right: false,
            jump: false
        };
        
        // Игровые объекты
        this.platforms = [];
        this.enemies = [];
        this.collectibles = [];
        
        this.setupControls();
        this.createLevel();
        this.gameLoop();
    }
    
    setupControls() {
        // Клавиатура
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
        
        // Мобильное управление
        const leftBtn = document.getElementById('left-btn');
        const rightBtn = document.getElementById('right-btn');
        const jumpBtn = document.getElementById('jump-btn');
        
        if (leftBtn) {
            leftBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.mobileControls.left = true;
            });
            leftBtn.addEventListener('touchend', () => {
                this.mobileControls.left = false;
            });
        }
        
        if (rightBtn) {
            rightBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.mobileControls.right = true;
            });
            rightBtn.addEventListener('touchend', () => {
                this.mobileControls.right = false;
            });
        }
        
        if (jumpBtn) {
            jumpBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.mobileControls.jump = true;
            });
            jumpBtn.addEventListener('touchend', () => {
                this.mobileControls.jump = false;
            });
        }
    }
    
    createLevel() {
        // Создаем платформы на основе конфигурации уровня
        this.platforms = [
            { x: 0, y: 580, width: 800, height: 20 }, // Земля
            { x: 200, y: 450, width: 150, height: 20 },
            { x: 450, y: 350, width: 120, height: 20 },
            { x: 650, y: 250, width: 100, height: 20 }
        ];
        
        // Враги
        this.enemies = [
            { x: 300, y: 430, width: 30, height: 30, vx: -50, color: '#e74c3c' },
            { x: 500, y: 330, width: 30, height: 30, vx: 50, color: '#e74c3c' }
        ];
        
        // Коллектибли (монеты)
        this.collectibles = [
            { x: 250, y: 400, width: 20, height: 20, collected: false },
            { x: 500, y: 300, width: 20, height: 20, collected: false },
            { x: 700, y: 200, width: 20, height: 20, collected: false }
        ];
    }
    
    update(deltaTime) {
        if (this.gameState !== 'playing') return;
        
        // Обновляем игрока
        this.updatePlayer(deltaTime);
        
        // Обновляем врагов
        this.updateEnemies(deltaTime);
        
        // Проверяем коллизии
        this.checkCollisions();
        
        // Проверяем условия победы/поражения
        this.checkGameState();
    }
    
    updatePlayer(deltaTime) {
        const dt = deltaTime / 1000;
        
        // Горизонтальное движение
        if (this.keys['ArrowLeft'] || this.keys['KeyA'] || this.mobileControls.left) {
            this.player.vx = -this.player.speed;
        } else if (this.keys['ArrowRight'] || this.keys['KeyD'] || this.mobileControls.right) {
            this.player.vx = this.player.speed;
        } else {
            this.player.vx *= 0.8; // Торможение
        }
        
        // Прыжок
        if ((this.keys['ArrowUp'] || this.keys['KeyW'] || this.keys['Space'] || this.mobileControls.jump) && this.player.onGround) {
            this.player.vy = -this.player.jumpPower;
            this.player.onGround = false;
        }
        
        // Гравитация
        this.player.vy += 800 * dt; // Ускорение свободного падения
        
        // Обновляем позицию
        this.player.x += this.player.vx * dt;
        this.player.y += this.player.vy * dt;
        
        // Ограничения экрана
        if (this.player.x < 0) this.player.x = 0;
        if (this.player.x + this.player.width > this.canvas.width) {
            this.player.x = this.canvas.width - this.player.width;
        }
        
        // Смерть от падения
        if (this.player.y > this.canvas.height) {
            this.loseLife();
        }
    }
    
    updateEnemies(deltaTime) {
        const dt = deltaTime / 1000;
        
        this.enemies.forEach(enemy => {
            enemy.x += enemy.vx * dt;
            
            // Отражение от краев платформ
            if (enemy.x <= 0 || enemy.x + enemy.width >= this.canvas.width) {
                enemy.vx *= -1;
            }
        });
    }
    
    checkCollisions() {
        // Коллизии с платформами
        this.player.onGround = false;
        
        this.platforms.forEach(platform => {
            if (this.isColliding(this.player, platform)) {
                // Игрок сверху платформы
                if (this.player.vy > 0 && this.player.y < platform.y) {
                    this.player.y = platform.y - this.player.height;
                    this.player.vy = 0;
                    this.player.onGround = true;
                }
            }
        });
        
        // Коллизии с врагами
        this.enemies.forEach(enemy => {
            if (this.isColliding(this.player, enemy)) {
                this.loseLife();
            }
        });
        
        // Коллизии с коллектиблями
        this.collectibles.forEach(item => {
            if (!item.collected && this.isColliding(this.player, item)) {
                item.collected = true;
                this.score += 100;
                this.updateUI();
            }
        });
    }
    
    isColliding(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }
    
    loseLife() {
        this.lives--;
        this.updateUI();
        
        if (this.lives <= 0) {
            this.gameOver();
        } else {
            // Респавн
            this.player.x = 50;
            this.player.y = 400;
            this.player.vx = 0;
            this.player.vy = 0;
        }
    }
    
    gameOver() {
        this.gameState = 'gameOver';
        document.getElementById('final-score').textContent = this.score;
        document.getElementById('game-menu').classList.remove('hidden');
    }
    
    checkGameState() {
        // Победа - собрали все коллектибли
        const allCollected = this.collectibles.every(item => item.collected);
        if (allCollected) {
            this.level++;
            this.createLevel(); // Создаем новый уровень
            this.updateUI();
        }
    }
    
    render() {
        // Очищаем экран
        this.ctx.fillStyle = '${gameConfig.graphics?.colorPalette?.[2] || '#1a1a2e'}';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Рисуем платформы
        this.ctx.fillStyle = '${gameConfig.graphics?.colorPalette?.[1] || '#2ecc71'}';
        this.platforms.forEach(platform => {
            this.ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
        });
        
        // Рисуем игрока
        this.ctx.fillStyle = this.player.color;
        this.ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);
        
        // Рисуем врагов
        this.enemies.forEach(enemy => {
            this.ctx.fillStyle = enemy.color;
            this.ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
        });
        
        // Рисуем коллектибли
        this.ctx.fillStyle = '${gameConfig.graphics?.colorPalette?.[3] || '#f1c40f'}';
        this.collectibles.forEach(item => {
            if (!item.collected) {
                this.ctx.fillRect(item.x, item.y, item.width, item.height);
            }
        });
    }
    
    updateUI() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('lives').textContent = this.lives;
        document.getElementById('level').textContent = this.level;
    }
    
    gameLoop() {
        const now = performance.now();
        const deltaTime = now - (this.lastTime || now);
        this.lastTime = now;
        
        this.update(deltaTime);
        this.render();
        
        requestAnimationFrame(() => this.gameLoop());
    }
    
    restart() {
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.gameState = 'playing';
        
        this.player.x = 50;
        this.player.y = 400;
        this.player.vx = 0;
        this.player.vy = 0;
        
        this.createLevel();
        this.updateUI();
        document.getElementById('game-menu').classList.add('hidden');
    }
}

// Глобальная переменная игры
let game;

// Функция запуска игры
function startGame() {
    document.getElementById('loading-screen').classList.add('hidden');
    game = new InteractivePlatformerGame();
    
    // Обработчики кнопок меню
    document.getElementById('restart-btn').addEventListener('click', () => {
        game.restart();
    });
    
    document.getElementById('share-btn').addEventListener('click', () => {
        if (window.yandexSDK) {
            window.yandexSDK.shareScore(game.score);
        }
    });
}

// Yandex SDK инициализация
async function initializeYandexSDK() {
    try {
        if (typeof YaGames !== 'undefined') {
            window.yandexSDK = await YaGames.init();
            console.log('Yandex SDK готов');
        } else {
            console.log('Yandex SDK не найден, запуск в режиме разработки');
        }
    } catch (error) {
        console.warn('Ошибка инициализации Yandex SDK:', error);
    }
}
`;
  }

  private async generatePuzzleGame(gameConfig: any): string {
    return '/* Puzzle game implementation */';
  }

  private async generateArcadeGame(gameConfig: any): string {
    return '/* Arcade game implementation */';
  }

  private async generateGenericGame(gameConfig: any): string {
    return '/* Generic game implementation */';
  }

  private generateCharacterCode(character: any): string {
    return `
// Код персонажа: ${character.name}
class Character {
    constructor() {
        this.name = '${character.name}';
        this.description = '${character.description}';
        this.abilities = ${JSON.stringify(character.abilities || [])};
        this.primaryColor = '${character.primaryColor}';
        this.style = '${character.style}';
    }
    
    // Логика персонажа
    update(deltaTime) {
        // Обновление персонажа
    }
    
    render(ctx, x, y) {
        // Отрисовка персонажа
        ctx.fillStyle = this.primaryColor;
        ctx.fillRect(x, y, 32, 48);
    }
}
`;
  }

  private generateLevelCode(level: any, levelNumber: number): string {
    return `
// Уровень ${levelNumber}: ${level.theme || 'Обычный уровень'}
class Level${levelNumber} {
    constructor() {
        this.theme = '${level.theme || 'default'}';
        this.layout = '${level.layout || 'horizontal'}';
        this.obstacles = ${JSON.stringify(level.obstacles || [])};
        this.collectibles = ${JSON.stringify(level.collectibles || [])};
        this.enemies = ${JSON.stringify(level.enemies || [])};
        this.size = ${JSON.stringify(level.size || { width: 800, height: 600 })};
    }
    
    // Создание уровня
    create() {
        return {
            platforms: this.generatePlatforms(),
            enemies: this.generateEnemies(),
            collectibles: this.generateCollectibles()
        };
    }
    
    generatePlatforms() {
        // Генерация платформ на основе layout
        return [
            { x: 0, y: 580, width: 800, height: 20 },
            { x: 200, y: 450, width: 150, height: 20 },
            { x: 450, y: 350, width: 120, height: 20 }
        ];
    }
    
    generateEnemies() {
        return this.enemies.map((enemyType, index) => ({
            x: 200 + index * 200,
            y: 400,
            type: enemyType,
            width: 30,
            height: 30
        }));
    }
    
    generateCollectibles() {
        return this.collectibles.map((itemType, index) => ({
            x: 150 + index * 150,
            y: 350,
            type: itemType,
            width: 20,
            height: 20,
            collected: false
        }));
    }
}
`;
  }

  private async createGameStructure(outputDir: string, files: Record<string, string>): Promise<void> {
    // Создаем основные файлы
    for (const [filename, content] of Object.entries(files)) {
      await fs.writeFile(path.join(outputDir, filename), content);
    }
    
    // Создаем папки для ассетов
    await fs.mkdir(path.join(outputDir, 'assets'), { recursive: true });
    await fs.mkdir(path.join(outputDir, 'assets', 'images'), { recursive: true });
    await fs.mkdir(path.join(outputDir, 'assets', 'sounds'), { recursive: true });
  }

  private async generateYandexIntegration(outputDir: string, gameConfig: any): Promise<void> {
    const yandexConfig = {
      leaderboards: true,
      advertising: {
        rewarded: true,
        interstitial: true,
        sticky: true
      },
      achievements: true,
      social: true
    };

    // Импортируем YandexSDKIntegrator
    const { YandexSDKIntegrator } = await import('../yandex-sdk/integration');
    const sdkCode = YandexSDKIntegrator.generateSDKIntegration(yandexConfig);
    
    await fs.writeFile(path.join(outputDir, 'yandex-sdk.js'), sdkCode);
  }

  private async createGameManifest(outputDir: string, gameConfig: any): Promise<void> {
    const manifest = {
      name: gameConfig.title || 'Интерактивная игра',
      version: '1.0.0',
      description: `Игра созданная интерактивно с жанром ${gameConfig.genre}`,
      author: 'GameIDE Interactive Generator',
      main: 'index.html',
      yandex: {
        sdk_version: '2.0.0',
        orientation: 'landscape'
      },
      files: [
        'index.html',
        'styles.css', 
        'game.js',
        'config.json',
        'yandex-sdk.js'
      ]
    };

    await fs.writeFile(path.join(outputDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  }

  private async createFallbackGame(outputDir: string, state: InteractiveGenerationState): Promise<void> {
    const indexHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>Интерактивная игра</title>
    <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #2c3e50; color: white; }
        .game-container { max-width: 600px; margin: 0 auto; }
        .choices { text-align: left; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="game-container">
        <h1>🎮 Ваша интерактивная игра готова!</h1>
        <p>Игра была создана на основе ваших выборов:</p>
        
        <div class="choices">
            <h3>Выборы пользователя:</h3>
            <pre>${JSON.stringify(state.finalChoices, null, 2)}</pre>
        </div>
        
        <p><em>Простая демо-версия игры. Полная реализация будет доступна после завершения разработки всех компонентов.</em></p>
        
        <button onclick="alert('Игра в разработке!')" style="padding: 10px 20px; font-size: 16px; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer;">
            Играть
        </button>
    </div>
</body>
</html>`;

    await fs.writeFile(path.join(outputDir, 'index.html'), indexHtml);
  }
} 
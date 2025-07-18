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
    // TODO: Реализовать создание финальной игры на основе выборов
    // Этот метод должен собрать все выбранные варианты и создать полную игру

    const outputDir = path.join(process.cwd(), 'generated-games', state.gameId);
    await fs.mkdir(outputDir, { recursive: true });

    // Пока просто создаем заглушку
    const indexHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>Сгенерированная игра</title>
</head>
<body>
    <h1>Игра создана интерактивно!</h1>
    <p>Выборы пользователя: ${JSON.stringify(state.finalChoices, null, 2)}</p>
</body>
</html>
    `;

    await fs.writeFile(path.join(outputDir, 'index.html'), indexHtml);

    return outputDir;
  }

  private parseJSONResponse(response: string): any {
    try {
      // Пытаемся найти JSON в ответе
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // Если JSON не найден, пытаемся парсить весь ответ
      return JSON.parse(response);
    } catch (error) {
      this.logger.warn('Не удалось распарсить JSON ответ:', response);
      return {};
    }
  }

  private async createStepsFromConfig(
    config: InteractiveStepConfig, 
    request: InteractiveGameRequest,
    gameConfig?: GameConfiguration
  ): Promise<InteractiveStep[]> {
    return config.steps.map((stepGuide, index) => ({
      stepId: uuidv4(),
      name: stepGuide.title,
      description: stepGuide.description,
      type: stepGuide.stepType as StepType,
      variants: [],
      isCompleted: false,
      isSkippable: stepGuide.stepType !== 'character' // Персонаж обязателен
    }));
  }

  private initializeStepConfigs(): void {
    // Конфигурация для платформера
    this.stepConfigs.set('platformer', {
      genre: 'platformer',
      steps: [
        {
          stepType: 'character',
          title: 'Персонаж',
          description: 'Выберите главного героя вашей игры',
          aiGenerationPrompt: 'Создай персонажа для платформера'
        },
        {
          stepType: 'mechanics',
          title: 'Механики',
          description: 'Определите основные игровые механики',
          aiGenerationPrompt: 'Создай механики для платформера'
        },
        {
          stepType: 'levels',
          title: 'Уровни',
          description: 'Спроектируйте уровни игры',
          aiGenerationPrompt: 'Создай дизайн уровней для платформера'
        },
        {
          stepType: 'graphics',
          title: 'Графика',
          description: 'Выберите визуальный стиль',
          aiGenerationPrompt: 'Создай графический стиль для платформера'
        },
        {
          stepType: 'sounds',
          title: 'Звуки',
          description: 'Подберите музыку и звуковые эффекты',
          aiGenerationPrompt: 'Создай звуковой дизайн для платформера'
        }
      ]
    });

    // Конфигурация для аркады
    this.stepConfigs.set('arcade', {
      genre: 'arcade',
      steps: [
        {
          stepType: 'character',
          title: 'Игровой объект',
          description: 'Главный элемент аркадной игры',
          aiGenerationPrompt: 'Создай игровой объект для аркады'
        },
        {
          stepType: 'mechanics',
          title: 'Механики',
          description: 'Простые и захватывающие правила',
          aiGenerationPrompt: 'Создай простые аркадные механики'
        },
        {
          stepType: 'graphics',
          title: 'Графика',
          description: 'Яркий визуальный стиль',
          aiGenerationPrompt: 'Создай яркую аркадную графику'
        },
        {
          stepType: 'sounds',
          title: 'Звуки',
          description: 'Динамичные звуки и музыка',
          aiGenerationPrompt: 'Создай энергичный звуковой дизайн'
        }
      ]
    });

    // Конфигурация для головоломок
    this.stepConfigs.set('puzzle', {
      genre: 'puzzle',
      steps: [
        {
          stepType: 'mechanics',
          title: 'Правила головоломки',
          description: 'Логика и правила решения',
          aiGenerationPrompt: 'Создай правила для головоломки'
        },
        {
          stepType: 'levels',
          title: 'Уровни сложности',
          description: 'Прогрессия сложности',
          aiGenerationPrompt: 'Создай уровни головоломки'
        },
        {
          stepType: 'graphics',
          title: 'Интерфейс',
          description: 'Понятный и удобный интерфейс',
          aiGenerationPrompt: 'Создай интерфейс головоломки'
        }
      ]
    });

    // Конфигурация для экшена
    this.stepConfigs.set('action', {
      genre: 'action',
      steps: [
        {
          stepType: 'character',
          title: 'Герой',
          description: 'Боевой персонаж с навыками',
          aiGenerationPrompt: 'Создай боевого персонажа'
        },
        {
          stepType: 'mechanics',
          title: 'Боевая система',
          description: 'Атаки, защита, комбо',
          aiGenerationPrompt: 'Создай боевую систему'
        },
        {
          stepType: 'levels',
          title: 'Арены и уровни',
          description: 'Места для сражений',
          aiGenerationPrompt: 'Создай боевые арены'
        },
        {
          stepType: 'graphics',
          title: 'Визуальные эффекты',
          description: 'Эффекты атак и способностей',
          aiGenerationPrompt: 'Создай боевые эффекты'
        },
        {
          stepType: 'sounds',
          title: 'Звуки сражений',
          description: 'Звуки ударов и способностей',
          aiGenerationPrompt: 'Создай звуки сражений'
        }
      ]
    });

    // Конфигурация для RPG
    this.stepConfigs.set('rpg', {
      genre: 'rpg',
      steps: [
        {
          stepType: 'character',
          title: 'Персонаж и классы',
          description: 'Герой с характеристиками',
          aiGenerationPrompt: 'Создай RPG персонажа'
        },
        {
          stepType: 'mechanics',
          title: 'Система прогрессии',
          description: 'Уровни, навыки, экипировка',
          aiGenerationPrompt: 'Создай систему развития'
        },
        {
          stepType: 'levels',
          title: 'Мир и квесты',
          description: 'Локации и задания',
          aiGenerationPrompt: 'Создай игровой мир'
        },
        {
          stepType: 'graphics',
          title: 'Художественный стиль',
          description: 'Стиль фэнтези или sci-fi',
          aiGenerationPrompt: 'Создай атмосферную графику'
        },
        {
          stepType: 'sounds',
          title: 'Музыка и звуки',
          description: 'Атмосферная музыка',
          aiGenerationPrompt: 'Создай эпическую музыку'
        }
      ]
    });

    // Конфигурация для стратегии
    this.stepConfigs.set('strategy', {
      genre: 'strategy',
      steps: [
        {
          stepType: 'mechanics',
          title: 'Стратегические правила',
          description: 'Ресурсы, юниты, здания',
          aiGenerationPrompt: 'Создай стратегические механики'
        },
        {
          stepType: 'levels',
          title: 'Карты и сценарии',
          description: 'Поля сражений',
          aiGenerationPrompt: 'Создай стратегические карты'
        },
        {
          stepType: 'graphics',
          title: 'Интерфейс управления',
          description: 'Удобное управление войсками',
          aiGenerationPrompt: 'Создай стратегический интерфейс'
        }
      ]
    });
  }

  private getDefaultStepConfig(): InteractiveStepConfig {
    return {
      genre: 'default',
      steps: [
        {
          stepType: 'character',
          title: 'Персонаж',
          description: 'Выберите главного героя',
          aiGenerationPrompt: 'Создай игрового персонажа'
        },
        {
          stepType: 'mechanics',
          title: 'Механики',
          description: 'Основные правила игры',
          aiGenerationPrompt: 'Создай игровые механики'
        },
        {
          stepType: 'graphics',
          title: 'Графика',
          description: 'Визуальный стиль',
          aiGenerationPrompt: 'Создай графический стиль'
        }
      ]
    };
  }
} 
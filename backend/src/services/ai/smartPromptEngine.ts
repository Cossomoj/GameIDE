import { EventEmitter } from 'events';
import { LoggerService } from '../logger';
import { IntelligentAIRouter } from './intelligentRouter';

interface PromptAnalysis {
  originalPrompt: string;
  expandedPrompt: string;
  userIntent: UserIntent;
  gameClassification: GameClassification;
  complexity: PromptComplexity;
  missingElements: string[];
  suggestedEnhancements: string[];
  confidenceScore: number;
}

interface UserIntent {
  primaryGoal: 'create_game' | 'learn_development' | 'prototype_idea' | 'experiment' | 'commercial_project';
  experience: 'beginner' | 'intermediate' | 'advanced' | 'professional';
  urgency: 'low' | 'medium' | 'high';
  context: string;
  emotionalTone: string;
}

interface GameClassification {
  genre: string;
  subGenre?: string;
  targetAudience: string;
  complexity: 'simple' | 'medium' | 'complex' | 'enterprise';
  estimatedPlaytime: string;
  monetizationSuggestions: string[];
  technicalRequirements: string[];
}

interface PromptComplexity {
  level: 'basic' | 'intermediate' | 'advanced' | 'expert';
  missingDetails: string[];
  overComplications: string[];
  clarificationNeeded: string[];
}

interface EnhancedPrompt {
  main: string;
  technical: string;
  creative: string;
  aiSpecific: { [provider: string]: string };
}

export class SmartPromptEngine extends EventEmitter {
  private logger: LoggerService;
  private aiRouter: IntelligentAIRouter;
  private genreDatabase: Map<string, any> = new Map();
  private intentPatterns: Map<string, RegExp[]> = new Map();
  private templateLibrary: Map<string, string> = new Map();
  private userHistory: Map<string, any[]> = new Map();

  constructor(aiRouter: IntelligentAIRouter) {
    super();
    this.logger = new LoggerService();
    this.aiRouter = aiRouter;
    this.initializeGenreDatabase();
    this.initializeIntentPatterns();
    this.initializeTemplateLibrary();
  }

  /**
   * Главный метод анализа и улучшения промпта
   */
  public async analyzeAndEnhancePrompt(
    prompt: string,
    userId?: string,
    context?: any
  ): Promise<PromptAnalysis> {
    try {
      this.logger.info(`🧠 Анализ промпта: "${prompt.slice(0, 100)}..."`);

      // Базовый анализ промпта
      const userIntent = await this.analyzeUserIntent(prompt, userId);
      const gameClassification = await this.classifyGameRequest(prompt);
      const complexity = this.analyzeComplexity(prompt);

      // Расширение промпта
      const expandedPrompt = await this.expandPrompt(prompt, userIntent, gameClassification, context);

      // Поиск недостающих элементов
      const missingElements = this.identifyMissingElements(prompt, gameClassification);
      
      // Предложения по улучшению
      const suggestedEnhancements = await this.generateEnhancements(
        prompt, 
        userIntent, 
        gameClassification,
        missingElements
      );

      // Вычисление уверенности в анализе
      const confidenceScore = this.calculateConfidenceScore(
        prompt, 
        userIntent, 
        gameClassification, 
        complexity
      );

      const analysis: PromptAnalysis = {
        originalPrompt: prompt,
        expandedPrompt,
        userIntent,
        gameClassification,
        complexity,
        missingElements,
        suggestedEnhancements,
        confidenceScore
      };

      // Сохраняем в историю пользователя
      if (userId) {
        this.updateUserHistory(userId, analysis);
      }

      this.emit('prompt:analyzed', {
        userId,
        analysis,
        improvements: suggestedEnhancements.length
      });

      this.logger.info(`✅ Промпт проанализирован. Уверенность: ${Math.round(confidenceScore * 100)}%`);

      return analysis;

    } catch (error) {
      this.logger.error('Ошибка анализа промпта:', error);
      throw error;
    }
  }

  /**
   * Анализ намерений пользователя
   */
  private async analyzeUserIntent(prompt: string, userId?: string): Promise<UserIntent> {
    const lowerPrompt = prompt.toLowerCase();
    
    // Определяем основную цель
    let primaryGoal: UserIntent['primaryGoal'] = 'create_game';
    
    if (this.matchesPatterns(lowerPrompt, 'learn')) {
      primaryGoal = 'learn_development';
    } else if (this.matchesPatterns(lowerPrompt, 'prototype')) {
      primaryGoal = 'prototype_idea';
    } else if (this.matchesPatterns(lowerPrompt, 'experiment')) {
      primaryGoal = 'experiment';
    } else if (this.matchesPatterns(lowerPrompt, 'commercial')) {
      primaryGoal = 'commercial_project';
    }

    // Определяем уровень опыта
    let experience: UserIntent['experience'] = 'beginner';
    
    if (this.matchesPatterns(lowerPrompt, 'advanced')) {
      experience = 'advanced';
    } else if (this.matchesPatterns(lowerPrompt, 'professional')) {
      experience = 'professional';
    } else if (this.matchesPatterns(lowerPrompt, 'intermediate')) {
      experience = 'intermediate';
    }

    // Определяем срочность
    let urgency: UserIntent['urgency'] = 'medium';
    
    if (this.matchesPatterns(lowerPrompt, 'urgent')) {
      urgency = 'high';
    } else if (this.matchesPatterns(lowerPrompt, 'relaxed')) {
      urgency = 'low';
    }

    // Анализируем эмоциональный тон
    const emotionalTone = this.analyzeEmotionalTone(prompt);
    
    // Извлекаем контекст
    const context = this.extractContext(prompt);

    return {
      primaryGoal,
      experience,
      urgency,
      context,
      emotionalTone
    };
  }

  /**
   * Классификация игрового запроса
   */
  private async classifyGameRequest(prompt: string): Promise<GameClassification> {
    const lowerPrompt = prompt.toLowerCase();
    
    // Определяем жанр
    let genre = 'platformer'; // по умолчанию
    let subGenre: string | undefined;
    
    for (const [genreName, genreData] of this.genreDatabase) {
      if (genreData.keywords.some((keyword: string) => lowerPrompt.includes(keyword))) {
        genre = genreName;
        // Ищем поджанр
        if (genreData.subGenres) {
          for (const [subName, subData] of Object.entries(genreData.subGenres)) {
            if ((subData as any).keywords.some((keyword: string) => lowerPrompt.includes(keyword))) {
              subGenre = subName;
              break;
            }
          }
        }
        break;
      }
    }

    // Определяем целевую аудиторию
    let targetAudience = 'everyone';
    
    if (this.matchesPatterns(lowerPrompt, 'children')) {
      targetAudience = 'children';
    } else if (this.matchesPatterns(lowerPrompt, 'adults')) {
      targetAudience = 'adults';
    } else if (this.matchesPatterns(lowerPrompt, 'teenagers')) {
      targetAudience = 'teenagers';
    }

    // Оцениваем сложность
    let complexity: GameClassification['complexity'] = 'medium';
    
    if (this.matchesPatterns(lowerPrompt, 'simple')) {
      complexity = 'simple';
    } else if (this.matchesPatterns(lowerPrompt, 'complex')) {
      complexity = 'complex';
    } else if (this.matchesPatterns(lowerPrompt, 'enterprise')) {
      complexity = 'enterprise';
    }

    // Оцениваем время игры
    const estimatedPlaytime = this.estimatePlaytime(prompt, genre, complexity);
    
    // Предлагаем монетизацию
    const monetizationSuggestions = this.suggestMonetization(genre, targetAudience, complexity);
    
    // Технические требования
    const technicalRequirements = this.determineTechnicalRequirements(genre, complexity);

    return {
      genre,
      subGenre,
      targetAudience,
      complexity,
      estimatedPlaytime,
      monetizationSuggestions,
      technicalRequirements
    };
  }

  /**
   * Расширение промпта с дополнительной информацией
   */
  private async expandPrompt(
    prompt: string,
    userIntent: UserIntent,
    gameClassification: GameClassification,
    context?: any
  ): Promise<string> {
    const genreData = this.genreDatabase.get(gameClassification.genre);
    
    let expandedPrompt = prompt;

    // Добавляем контекст жанра
    if (genreData) {
      expandedPrompt += `\n\nКонтекст жанра ${gameClassification.genre}:`;
      expandedPrompt += `\nОсновные механики: ${genreData.coreMechanics.join(', ')}`;
      expandedPrompt += `\nТипичные элементы: ${genreData.commonElements.join(', ')}`;
    }

    // Добавляем информацию о целевой аудитории
    expandedPrompt += `\n\nЦелевая аудитория: ${gameClassification.targetAudience}`;
    expandedPrompt += `\nУровень сложности: ${gameClassification.complexity}`;
    expandedPrompt += `\nОжидаемое время игры: ${gameClassification.estimatedPlaytime}`;

    // Добавляем технические требования
    if (gameClassification.technicalRequirements.length > 0) {
      expandedPrompt += `\n\nТехнические требования:`;
      expandedPrompt += `\n${gameClassification.technicalRequirements.join('\n')}`;
    }

    // Добавляем опыт пользователя
    if (userIntent.experience !== 'beginner') {
      expandedPrompt += `\n\nУровень разработчика: ${userIntent.experience}`;
      expandedPrompt += '\nМожно использовать продвинутые механики и техники.';
    }

    // Добавляем монетизационные стратегии
    if (gameClassification.monetizationSuggestions.length > 0) {
      expandedPrompt += `\n\nРекомендуемые стратегии монетизации:`;
      expandedPrompt += `\n${gameClassification.monetizationSuggestions.join('\n')}`;
    }

    // Добавляем платформенные ограничения
    expandedPrompt += '\n\nОграничения платформы Яндекс Игры:';
    expandedPrompt += '\n- Размер игры должен быть менее 20MB';
    expandedPrompt += '\n- Поддержка мобильных устройств обязательна';
    expandedPrompt += '\n- Быстрая загрузка (менее 5 секунд)';
    expandedPrompt += '\n- Интеграция с Yandex Games SDK';

    return expandedPrompt;
  }

  /**
   * Поиск недостающих элементов в промпте
   */
  private identifyMissingElements(prompt: string, classification: GameClassification): string[] {
    const missing: string[] = [];
    const lowerPrompt = prompt.toLowerCase();

    // Проверяем основные элементы игры
    const essentialElements = [
      { name: 'персонаж', keywords: ['персонаж', 'герой', 'игрок', 'character', 'player'] },
      { name: 'цель игры', keywords: ['цель', 'задача', 'победа', 'goal', 'objective'] },
      { name: 'управление', keywords: ['управление', 'контроль', 'кнопки', 'control', 'input'] },
      { name: 'препятствия', keywords: ['враги', 'препятствия', 'вызовы', 'enemies', 'obstacles'] },
      { name: 'прогрессия', keywords: ['уровни', 'прогресс', 'развитие', 'levels', 'progression'] },
      { name: 'визуальный стиль', keywords: ['стиль', 'графика', 'дизайн', 'art', 'visual'] }
    ];

    for (const element of essentialElements) {
      if (!element.keywords.some(keyword => lowerPrompt.includes(keyword))) {
        missing.push(element.name);
      }
    }

    // Специфичные для жанра элементы
    const genreData = this.genreDatabase.get(classification.genre);
    if (genreData && genreData.requiredElements) {
      for (const requiredElement of genreData.requiredElements) {
        if (!lowerPrompt.includes(requiredElement.toLowerCase())) {
          missing.push(requiredElement);
        }
      }
    }

    return missing;
  }

  /**
   * Генерация предложений по улучшению
   */
  private async generateEnhancements(
    prompt: string,
    userIntent: UserIntent,
    classification: GameClassification,
    missingElements: string[]
  ): Promise<string[]> {
    const enhancements: string[] = [];

    // Предложения на основе недостающих элементов
    if (missingElements.includes('персонаж')) {
      enhancements.push('Добавьте описание главного персонажа: его внешность, способности и характер');
    }

    if (missingElements.includes('цель игры')) {
      enhancements.push('Опишите основную цель игры: что должен достичь игрок?');
    }

    if (missingElements.includes('управление')) {
      enhancements.push('Уточните схему управления: какие кнопки/жесты будут использоваться?');
    }

    // Предложения на основе жанра
    const genreData = this.genreDatabase.get(classification.genre);
    if (genreData && genreData.suggestions) {
      enhancements.push(...genreData.suggestions);
    }

    // Предложения на основе опыта пользователя
    if (userIntent.experience === 'beginner') {
      enhancements.push('Рассмотрите добавление обучающего уровня для новых игроков');
      enhancements.push('Сделайте первые уровни проще для постепенного изучения механик');
    } else if (userIntent.experience === 'advanced') {
      enhancements.push('Добавьте сложные механики и элементы метагеймплея');
      enhancements.push('Рассмотрите систему достижений и скрытых секретов');
    }

    // Предложения по монетизации
    if (classification.monetizationSuggestions.length > 0) {
      enhancements.push('Интегрируйте рекламу в естественные моменты игры (между уровнями, после смерти)');
      enhancements.push('Добавьте систему добровольных покупок (косметика, бустеры)');
    }

    // Предложения по доступности
    enhancements.push('Добавьте поддержку различных размеров экранов');
    enhancements.push('Рассмотрите добавление настроек сложности');
    enhancements.push('Включите звуковое сопровождение и возможность его отключения');

    return enhancements;
  }

  /**
   * Адаптация промпта под конкретную AI модель
   */
  public adaptPromptForAI(
    analysis: PromptAnalysis,
    aiProvider: 'openai' | 'claude' | 'deepseek',
    taskType: 'game_design' | 'code_generation' | 'image_generation'
  ): string {
    let adaptedPrompt = analysis.expandedPrompt;

    switch (aiProvider) {
      case 'openai':
        adaptedPrompt = this.adaptForOpenAI(adaptedPrompt, taskType);
        break;
      case 'claude':
        adaptedPrompt = this.adaptForClaude(adaptedPrompt, taskType);
        break;
      case 'deepseek':
        adaptedPrompt = this.adaptForDeepSeek(adaptedPrompt, taskType);
        break;
    }

    return adaptedPrompt;
  }

  /**
   * Адаптация для OpenAI
   */
  private adaptForOpenAI(prompt: string, taskType: string): string {
    let adapted = prompt;

    // OpenAI лучше работает с четкими инструкциями
    adapted = `Задача: ${taskType}\n\n${adapted}`;
    
    if (taskType === 'image_generation') {
      adapted += '\n\nТребования к изображению:';
      adapted += '\n- Высокое качество и детализация';
      adapted += '\n- Соответствие игровому стилю';
      adapted += '\n- Подходящие цвета и композиция';
    }

    return adapted;
  }

  /**
   * Адаптация для Claude
   */
  private adaptForClaude(prompt: string, taskType: string): string {
    let adapted = prompt;

    // Claude хорошо понимает контекст и рассуждения
    adapted = `Как эксперт по геймдизайну, проанализируйте следующий запрос и выполните задачу: ${taskType}\n\n${adapted}`;
    adapted += '\n\nПожалуйста, учтите лучшие практики игровой индустрии и современные тренды.';

    return adapted;
  }

  /**
   * Адаптация для DeepSeek
   */
  private adaptForDeepSeek(prompt: string, taskType: string): string {
    let adapted = prompt;

    // DeepSeek эффективен для технических задач
    if (taskType === 'code_generation') {
      adapted = `Техническая задача: Генерация кода для игры\n\n${adapted}`;
      adapted += '\n\nТехнические требования:';
      adapted += '\n- Современный JavaScript/TypeScript';
      adapted += '\n- Оптимизированный и читаемый код';
      adapted += '\n- Соответствие лучшим практикам';
    }

    return adapted;
  }

  /**
   * Инициализация базы данных жанров
   */
  private initializeGenreDatabase(): void {
    this.genreDatabase.set('platformer', {
      keywords: ['платформер', 'прыжки', 'препятствия', 'уровни', 'platformer', 'jump'],
      coreMechanics: ['прыжки', 'бег', 'сбор предметов', 'избегание препятствий'],
      commonElements: ['платформы', 'враги', 'монеты', 'жизни', 'финиш'],
      requiredElements: ['система прыжков', 'платформы'],
      suggestions: [
        'Добавьте разнообразные типы платформ (движущиеся, исчезающие, пружинящие)',
        'Создайте различных врагов с уникальным поведением',
        'Включите систему сбора предметов для увеличения очков'
      ]
    });

    this.genreDatabase.set('puzzle', {
      keywords: ['головоломка', 'логика', 'мышление', 'puzzle', 'brain'],
      coreMechanics: ['логическое мышление', 'сопоставление', 'планирование'],
      commonElements: ['блоки', 'цвета', 'формы', 'время', 'ходы'],
      requiredElements: ['правила игры', 'система победы'],
      suggestions: [
        'Реализуйте постепенное усложнение уровней',
        'Добавьте систему подсказок для застрявших игроков',
        'Включите таймер или ограничения ходов для повышения напряжения'
      ]
    });

    this.genreDatabase.set('arcade', {
      keywords: ['аркада', 'быстро', 'рефлексы', 'очки', 'arcade', 'action'],
      coreMechanics: ['быстрые реакции', 'набор очков', 'увеличение скорости'],
      commonElements: ['счетчик очков', 'жизни', 'бонусы', 'препятствия'],
      requiredElements: ['система очков', 'препятствия'],
      suggestions: [
        'Добавьте систему увеличения сложности со временем',
        'Включите специальные бонусы и power-ups',
        'Реализуйте таблицу лидеров для соревновательности'
      ]
    });

    this.logger.info(`📚 Загружено ${this.genreDatabase.size} определений жанров`);
  }

  /**
   * Инициализация паттернов намерений
   */
  private initializeIntentPatterns(): void {
    this.intentPatterns.set('learn', [
      /научи(ть)?ся?/i,
      /изучи(ть)?/i,
      /learn/i,
      /tutorial/i,
      /как\s+сделать/i
    ]);

    this.intentPatterns.set('prototype', [
      /прототип/i,
      /быстро/i,
      /prototype/i,
      /mvp/i,
      /тест/i
    ]);

    this.intentPatterns.set('experiment', [
      /эксперимент/i,
      /попробов/i,
      /experiment/i,
      /try/i,
      /идея/i
    ]);

    this.intentPatterns.set('commercial', [
      /коммерческ/i,
      /продать/i,
      /заработ/i,
      /commercial/i,
      /monetize/i
    ]);

    this.intentPatterns.set('advanced', [
      /сложн/i,
      /продвинут/i,
      /advanced/i,
      /professional/i,
      /enterprise/i
    ]);

    this.intentPatterns.set('urgent', [
      /срочно/i,
      /быстро/i,
      /urgent/i,
      /asap/i,
      /deadline/i
    ]);
  }

  /**
   * Инициализация библиотеки шаблонов
   */
  private initializeTemplateLibrary(): void {
    this.templateLibrary.set('basic_game', `
Создай игру со следующими характеристиками:
- Название: {title}
- Жанр: {genre}
- Целевая аудитория: {audience}
- Основные механики: {mechanics}
- Визуальный стиль: {style}
- Платформа: Яндекс Игры (HTML5)
    `);

    this.templateLibrary.set('character_description', `
Опиши главного персонажа игры:
- Имя и внешность
- Уникальные способности
- Предыстория
- Мотивация
- Стиль анимации: {style}
    `);

    this.templateLibrary.set('level_design', `
Создай дизайн уровня для игры жанра {genre}:
- Тема и атмосфера уровня
- Расположение препятствий и платформ
- Размещение врагов и бонусов
- Условия победы
- Уровень сложности: {difficulty}
    `);
  }

  /**
   * Вспомогательные методы
   */
  private matchesPatterns(text: string, patternKey: string): boolean {
    const patterns = this.intentPatterns.get(patternKey);
    return patterns ? patterns.some(pattern => pattern.test(text)) : false;
  }

  private analyzeEmotionalTone(prompt: string): string {
    const lowerPrompt = prompt.toLowerCase();
    
    if (lowerPrompt.includes('весел') || lowerPrompt.includes('fun')) return 'веселый';
    if (lowerPrompt.includes('серьез') || lowerPrompt.includes('serious')) return 'серьезный';
    if (lowerPrompt.includes('мрачн') || lowerPrompt.includes('dark')) return 'мрачный';
    if (lowerPrompt.includes('легк') || lowerPrompt.includes('casual')) return 'легкий';
    
    return 'нейтральный';
  }

  private extractContext(prompt: string): string {
    // Извлекаем контекстную информацию из промпта
    const contexts = [];
    
    if (prompt.includes('для детей')) contexts.push('детская аудитория');
    if (prompt.includes('мобильн')) contexts.push('мобильная платформа');
    if (prompt.includes('быстр')) contexts.push('быстрая игра');
    if (prompt.includes('обучающ')) contexts.push('образовательный контент');
    
    return contexts.join(', ') || 'общий контекст';
  }

  private estimatePlaytime(prompt: string, genre: string, complexity: string): string {
    if (prompt.includes('быстр') || genre === 'arcade') return '5-15 минут';
    if (complexity === 'simple') return '10-30 минут';
    if (complexity === 'complex') return '30-60 минут';
    return '15-45 минут';
  }

  private suggestMonetization(genre: string, audience: string, complexity: string): string[] {
    const suggestions = [];
    
    if (audience === 'children') {
      suggestions.push('Родительские покупки');
      suggestions.push('Безопасная реклама');
    } else {
      suggestions.push('Вознаграждающая реклама');
      suggestions.push('Межуровневые баннеры');
    }
    
    if (complexity !== 'simple') {
      suggestions.push('Косметические покупки');
      suggestions.push('Премиум уровни');
    }
    
    return suggestions;
  }

  private determineTechnicalRequirements(genre: string, complexity: string): string[] {
    const requirements = [
      'HTML5 Canvas или WebGL',
      'Адаптивный интерфейс',
      'Сенсорное управление'
    ];
    
    if (genre === 'arcade') {
      requirements.push('Высокая частота обновления (60 FPS)');
    }
    
    if (complexity === 'complex') {
      requirements.push('Локальное хранение прогресса');
      requirements.push('Система достижений');
    }
    
    return requirements;
  }

  private analyzeComplexity(prompt: string): PromptComplexity {
    const wordCount = prompt.split(' ').length;
    const hasDetails = /\b(механик|правил|систем|уровн|персонаж)\b/i.test(prompt);
    
    let level: PromptComplexity['level'] = 'basic';
    
    if (wordCount > 100 && hasDetails) level = 'advanced';
    else if (wordCount > 50 || hasDetails) level = 'intermediate';
    
    return {
      level,
      missingDetails: [],
      overComplications: [],
      clarificationNeeded: []
    };
  }

  private calculateConfidenceScore(
    prompt: string,
    userIntent: UserIntent,
    gameClassification: GameClassification,
    complexity: PromptComplexity
  ): number {
    let score = 0.5; // базовая уверенность
    
    // Бонус за длину и детализацию
    if (prompt.length > 100) score += 0.2;
    if (prompt.length > 300) score += 0.1;
    
    // Бонус за ясность жанра
    if (gameClassification.genre !== 'platformer') score += 0.1; // не дефолтный жанр
    
    // Бонус за указание опыта
    if (userIntent.experience !== 'beginner') score += 0.1;
    
    return Math.min(1.0, score);
  }

  private updateUserHistory(userId: string, analysis: PromptAnalysis): void {
    if (!this.userHistory.has(userId)) {
      this.userHistory.set(userId, []);
    }
    
    const history = this.userHistory.get(userId)!;
    history.push({
      timestamp: new Date(),
      analysis: analysis,
      genre: analysis.gameClassification.genre
    });
    
    // Ограничиваем историю 10 последними запросами
    if (history.length > 10) {
      history.shift();
    }
  }

  /**
   * Получение персонализированных рекомендаций на основе истории
   */
  public getPersonalizedSuggestions(userId: string): string[] {
    const history = this.userHistory.get(userId);
    if (!history || history.length === 0) return [];

    const suggestions = [];
    const recentGenres = history.slice(-3).map(h => h.genre);
    const favoriteGenre = this.getMostFrequent(recentGenres);

    if (favoriteGenre) {
      suggestions.push(`Основываясь на ваших предпочтениях, рекомендуем попробовать другие варианты жанра ${favoriteGenre}`);
    }

    return suggestions;
  }

  private getMostFrequent(array: string[]): string | null {
    if (array.length === 0) return null;
    
    const frequency = array.reduce((acc, item) => {
      acc[item] = (acc[item] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.keys(frequency).reduce((a, b) => frequency[a] > frequency[b] ? a : b);
  }
} 
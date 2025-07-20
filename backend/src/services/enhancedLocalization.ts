import { LocalizationService } from './localization';
import { OpenAIService } from './ai/openai';
import { DeepSeekService } from './ai/deepseek';
import { ClaudeService } from './ai/claude';
import { logger } from './logger';

interface TranslationRequest {
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
  context?: string;
  gameType?: string;
  domain?: 'ui' | 'game-content' | 'story' | 'dialogue' | 'menu' | 'error' | 'achievement';
}

interface TranslationResult {
  originalText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  confidence: number;
  model: string;
  context?: string;
  domain?: string;
  alternatives?: string[];
  quality: TranslationQuality;
}

interface TranslationQuality {
  accuracy: number;
  fluency: number;
  culturalAdaptation: number;
  gameContext: number;
  overallScore: number;
  issues: string[];
  suggestions: string[];
}

interface GameContentTranslation {
  gameId: string;
  sourceLanguage: string;
  targetLanguages: string[];
  content: {
    title: string;
    description: string;
    instructions: string;
    dialogues: string[];
    uiElements: Record<string, string>;
    achievements: Array<{
      title: string;
      description: string;
    }>;
    story?: {
      intro: string;
      chapters: string[];
      ending: string;
    };
  };
  translatedContent: Record<string, any>;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  qualityScore: number;
  createdAt: Date;
  updatedAt: Date;
}

interface TranslationCache {
  key: string;
  sourceText: string;
  targetLanguage: string;
  translatedText: string;
  quality: number;
  context: string;
  domain: string;
  expiresAt: Date;
  usageCount: number;
}

export class EnhancedLocalizationService {
  private localizationService: LocalizationService;
  private openaiService: OpenAIService;
  private deepseekService: DeepSeekService;
  private claudeService: ClaudeService;
  private translationCache: Map<string, TranslationCache> = new Map();
  private activeTranslations: Map<string, Promise<TranslationResult>> = new Map();

  constructor() {
    this.localizationService = new LocalizationService();
    this.openaiService = new OpenAIService();
    this.deepseekService = new DeepSeekService();
    this.claudeService = new ClaudeService();
  }

  // Основная функция перевода с выбором лучшей AI модели
  async translateText(request: TranslationRequest): Promise<TranslationResult> {
    try {
      // Проверяем кеш
      const cacheKey = this.generateCacheKey(request);
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        logger.info('Используем кешированный перевод', { cacheKey });
        return this.createResultFromCache(cached, request);
      }

      // Предотвращаем дублированные запросы
      if (this.activeTranslations.has(cacheKey)) {
        return await this.activeTranslations.get(cacheKey)!;
      }

      // Выбираем лучшую модель для конкретного типа перевода
      const model = this.selectBestModel(request);
      
      const translationPromise = this.performTranslation(request, model);
      this.activeTranslations.set(cacheKey, translationPromise);

      const result = await translationPromise;
      
      // Сохраняем в кеш
      this.saveToCache(cacheKey, result, request);
      this.activeTranslations.delete(cacheKey);

      return result;
    } catch (error) {
      logger.error('Ошибка перевода текста', { error, request });
      throw error;
    }
  }

  // Массовый перевод игрового контента
  async translateGameContent(gameId: string, content: any, targetLanguages: string[]): Promise<GameContentTranslation> {
    try {
      logger.info('Начинаем перевод игрового контента', { gameId, targetLanguages });

      const sourceLanguage = content.language || 'ru';
      const translation: GameContentTranslation = {
        gameId,
        sourceLanguage,
        targetLanguages,
        content,
        translatedContent: {},
        status: 'in_progress',
        qualityScore: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Переводим на каждый целевой язык
      for (const targetLang of targetLanguages) {
        if (targetLang === sourceLanguage) continue;

        logger.info('Переводим на язык', { targetLang });
        translation.translatedContent[targetLang] = await this.translateCompleteContent(
          content,
          sourceLanguage,
          targetLang,
          gameId
        );
      }

      // Оцениваем общее качество
      translation.qualityScore = await this.evaluateTranslationQuality(translation);
      translation.status = 'completed';
      translation.updatedAt = new Date();

      logger.info('Перевод игрового контента завершен', { 
        gameId, 
        qualityScore: translation.qualityScore 
      });

      return translation;
    } catch (error) {
      logger.error('Ошибка перевода игрового контента', { error, gameId });
      throw error;
    }
  }

  // Интеллектуальный перевод с учетом контекста игры
  async translateWithGameContext(
    text: string,
    sourceLanguage: string,
    targetLanguage: string,
    gameContext: {
      type: string;
      genre: string;
      setting: string;
      targetAudience: string;
      culturalContext?: string;
    }
  ): Promise<TranslationResult> {
    const contextPrompt = this.generateContextualPrompt(gameContext);
    
    return await this.translateText({
      text,
      sourceLanguage,
      targetLanguage,
      context: contextPrompt,
      gameType: gameContext.type,
      domain: 'game-content'
    });
  }

  // Перевод диалогов с сохранением характера персонажей
  async translateDialogue(
    dialogue: string,
    sourceLanguage: string,
    targetLanguage: string,
    character: {
      name: string;
      personality: string;
      age: string;
      background: string;
    }
  ): Promise<TranslationResult> {
    const characterContext = `Персонаж: ${character.name}. Характер: ${character.personality}. Возраст: ${character.age}. Предыстория: ${character.background}. Переведи диалог, сохраняя особенности речи и характер персонажа.`;

    return await this.translateText({
      text: dialogue,
      sourceLanguage,
      targetLanguage,
      context: characterContext,
      domain: 'dialogue'
    });
  }

  // Локализация UI элементов с учетом ограничений пространства
  async translateUIElement(
    text: string,
    sourceLanguage: string,
    targetLanguage: string,
    constraints: {
      maxLength?: number;
      elementType: 'button' | 'label' | 'tooltip' | 'menu' | 'notification';
      actionType?: string;
    }
  ): Promise<TranslationResult> {
    let constraintPrompt = `UI элемент типа "${constraints.elementType}".`;
    
    if (constraints.maxLength) {
      constraintPrompt += ` Максимальная длина: ${constraints.maxLength} символов.`;
    }
    
    if (constraints.actionType) {
      constraintPrompt += ` Действие: ${constraints.actionType}.`;
    }
    
    constraintPrompt += ' Переведи кратко и понятно, подходящим для UI языком.';

    return await this.translateText({
      text,
      sourceLanguage,
      targetLanguage,
      context: constraintPrompt,
      domain: 'ui'
    });
  }

  // Культурная адаптация контента
  async culturallyAdaptContent(
    content: string,
    sourceLanguage: string,
    targetLanguage: string,
    culturalContext: {
      region: string;
      cultural_notes: string[];
      taboos: string[];
      preferences: string[];
    }
  ): Promise<TranslationResult> {
    const culturalPrompt = `
      Целевая аудитория: ${culturalContext.region}
      Культурные особенности: ${culturalContext.cultural_notes.join(', ')}
      Избегать: ${culturalContext.taboos.join(', ')}
      Предпочтения: ${culturalContext.preferences.join(', ')}
      
      Выполни не просто перевод, а культурную адаптацию контента.
    `;

    return await this.translateText({
      text: content,
      sourceLanguage,
      targetLanguage,
      context: culturalPrompt,
      domain: 'game-content'
    });
  }

  // Выбор оптимальной AI модели для перевода
  private selectBestModel(request: TranslationRequest): 'openai' | 'claude' | 'deepseek' {
    // OpenAI GPT-4 - лучший для общих переводов и креативного контента
    if (request.domain === 'story' || request.domain === 'dialogue') {
      return 'openai';
    }

    // Claude - отличен для контекстуальных переводов и культурной адаптации
    if (request.context && request.context.length > 200) {
      return 'claude';
    }

    // DeepSeek - хорош для технических переводов и UI
    if (request.domain === 'ui' || request.domain === 'error') {
      return 'deepseek';
    }

    // По умолчанию Claude как наиболее сбалансированный
    return 'claude';
  }

  // Выполнение перевода через выбранную модель
  private async performTranslation(request: TranslationRequest, model: string): Promise<TranslationResult> {
    const prompt = this.generateTranslationPrompt(request);
    let translatedText: string;
    let alternatives: string[] = [];

    switch (model) {
      case 'openai':
        const openaiResult = await this.openaiService.generateText(prompt);
        translatedText = this.extractTranslation(openaiResult);
        break;

      case 'claude':
        const claudeResult = await this.claudeService.generateText(prompt);
        translatedText = this.extractTranslation(claudeResult);
        break;

      case 'deepseek':
        const deepseekResult = await this.deepseekService.generateText(prompt);
        translatedText = this.extractTranslation(deepseekResult);
        break;

      default:
        throw new Error(`Неподдерживаемая модель: ${model}`);
    }

    // Генерируем альтернативные варианты для важного контента
    if (request.domain === 'ui' || request.domain === 'dialogue') {
      alternatives = await this.generateAlternatives(request, translatedText);
    }

    // Оцениваем качество перевода
    const quality = await this.evaluateTranslation(
      request.text,
      translatedText,
      request.sourceLanguage,
      request.targetLanguage,
      request.domain
    );

    return {
      originalText: request.text,
      translatedText,
      sourceLanguage: request.sourceLanguage,
      targetLanguage: request.targetLanguage,
      confidence: quality.overallScore,
      model,
      context: request.context,
      domain: request.domain,
      alternatives,
      quality
    };
  }

  // Генерация промпта для перевода
  private generateTranslationPrompt(request: TranslationRequest): string {
    let prompt = `Переведи следующий текст с ${this.getLanguageName(request.sourceLanguage)} на ${this.getLanguageName(request.targetLanguage)}:\n\n`;
    prompt += `"${request.text}"\n\n`;

    if (request.context) {
      prompt += `Контекст: ${request.context}\n\n`;
    }

    if (request.domain) {
      prompt += `Домен: ${this.getDomainDescription(request.domain)}\n\n`;
    }

    if (request.gameType) {
      prompt += `Тип игры: ${request.gameType}\n\n`;
    }

    prompt += `Требования к переводу:
- Сохраняй смысл и эмоциональную окраску
- Адаптируй под целевую культуру
- Используй естественные выражения
- Для игрового контента используй подходящую терминологию
- Отвечай только переведенным текстом, без дополнительных комментариев`;

    return prompt;
  }

  // Перевод полного контента игры
  private async translateCompleteContent(
    content: any,
    sourceLanguage: string,
    targetLanguage: string,
    gameId: string
  ): Promise<any> {
    const translated: any = {};

    // Переводим заголовок
    if (content.title) {
      const titleResult = await this.translateText({
        text: content.title,
        sourceLanguage,
        targetLanguage,
        domain: 'ui',
        gameType: content.type
      });
      translated.title = titleResult.translatedText;
    }

    // Переводим описание
    if (content.description) {
      const descResult = await this.translateText({
        text: content.description,
        sourceLanguage,
        targetLanguage,
        domain: 'game-content',
        gameType: content.type
      });
      translated.description = descResult.translatedText;
    }

    // Переводим инструкции
    if (content.instructions) {
      const instrResult = await this.translateText({
        text: content.instructions,
        sourceLanguage,
        targetLanguage,
        domain: 'ui',
        context: 'Инструкции для игрока'
      });
      translated.instructions = instrResult.translatedText;
    }

    // Переводим диалоги
    if (content.dialogues && Array.isArray(content.dialogues)) {
      translated.dialogues = [];
      for (const dialogue of content.dialogues) {
        const dialogueResult = await this.translateText({
          text: dialogue,
          sourceLanguage,
          targetLanguage,
          domain: 'dialogue',
          gameType: content.type
        });
        translated.dialogues.push(dialogueResult.translatedText);
      }
    }

    // Переводим UI элементы
    if (content.uiElements) {
      translated.uiElements = {};
      for (const [key, value] of Object.entries(content.uiElements)) {
        if (typeof value === 'string') {
          const uiResult = await this.translateText({
            text: value,
            sourceLanguage,
            targetLanguage,
            domain: 'ui',
            context: `UI элемент: ${key}`
          });
          translated.uiElements[key] = uiResult.translatedText;
        }
      }
    }

    // Переводим достижения
    if (content.achievements && Array.isArray(content.achievements)) {
      translated.achievements = [];
      for (const achievement of content.achievements) {
        const titleResult = await this.translateText({
          text: achievement.title,
          sourceLanguage,
          targetLanguage,
          domain: 'achievement',
          context: 'Название достижения'
        });

        const descResult = await this.translateText({
          text: achievement.description,
          sourceLanguage,
          targetLanguage,
          domain: 'achievement',
          context: 'Описание достижения'
        });

        translated.achievements.push({
          title: titleResult.translatedText,
          description: descResult.translatedText
        });
      }
    }

    // Переводим сюжет
    if (content.story) {
      translated.story = {};
      
      if (content.story.intro) {
        const introResult = await this.translateText({
          text: content.story.intro,
          sourceLanguage,
          targetLanguage,
          domain: 'story',
          context: 'Вступление к игре'
        });
        translated.story.intro = introResult.translatedText;
      }

      if (content.story.chapters && Array.isArray(content.story.chapters)) {
        translated.story.chapters = [];
        for (const chapter of content.story.chapters) {
          const chapterResult = await this.translateText({
            text: chapter,
            sourceLanguage,
            targetLanguage,
            domain: 'story',
            context: 'Глава истории'
          });
          translated.story.chapters.push(chapterResult.translatedText);
        }
      }

      if (content.story.ending) {
        const endingResult = await this.translateText({
          text: content.story.ending,
          sourceLanguage,
          targetLanguage,
          domain: 'story',
          context: 'Концовка игры'
        });
        translated.story.ending = endingResult.translatedText;
      }
    }

    return translated;
  }

  // Оценка качества перевода
  private async evaluateTranslation(
    originalText: string,
    translatedText: string,
    sourceLanguage: string,
    targetLanguage: string,
    domain?: string
  ): Promise<TranslationQuality> {
    try {
      // Проверяем базовые метрики
      const lengthRatio = translatedText.length / originalText.length;
      const hasSpecialChars = /[^\w\s\p{P}]/u.test(translatedText);
      
      // Простая эвристика для оценки качества
      let accuracy = 0.8; // Базовая оценка
      let fluency = 0.8;
      let culturalAdaptation = 0.7;
      let gameContext = 0.7;

      // Корректировки на основе анализа
      if (lengthRatio < 0.5 || lengthRatio > 2.0) {
        accuracy -= 0.2; // Слишком короткий или длинный перевод
      }

      if (hasSpecialChars) {
        fluency -= 0.1; // Странные символы
      }

      // Проверка на пустой перевод
      if (!translatedText.trim()) {
        accuracy = 0.1;
        fluency = 0.1;
      }

      // Специфические проверки для домена
      if (domain === 'ui' && translatedText.length > originalText.length * 1.5) {
        gameContext -= 0.2; // UI тексты должны быть компактными
      }

      const overallScore = (accuracy + fluency + culturalAdaptation + gameContext) / 4;

      const issues: string[] = [];
      const suggestions: string[] = [];

      if (lengthRatio > 1.5) {
        issues.push('Перевод слишком длинный');
        suggestions.push('Рассмотрите более краткий вариант');
      }

      if (lengthRatio < 0.6) {
        issues.push('Перевод слишком короткий');
        suggestions.push('Возможно, потерян смысл оригинала');
      }

      return {
        accuracy,
        fluency,
        culturalAdaptation,
        gameContext,
        overallScore,
        issues,
        suggestions
      };
    } catch (error) {
      logger.error('Ошибка оценки качества перевода', { error });
      return {
        accuracy: 0.5,
        fluency: 0.5,
        culturalAdaptation: 0.5,
        gameContext: 0.5,
        overallScore: 0.5,
        issues: ['Не удалось оценить качество'],
        suggestions: ['Проверьте перевод вручную']
      };
    }
  }

  // Генерация альтернативных вариантов перевода
  private async generateAlternatives(request: TranslationRequest, mainTranslation: string): Promise<string[]> {
    try {
      const alternativePrompt = `
        Оригинальный текст: "${request.text}"
        Основной перевод: "${mainTranslation}"
        
        Предложи 2-3 альтернативных варианта перевода с ${this.getLanguageName(request.sourceLanguage)} на ${this.getLanguageName(request.targetLanguage)}.
        Варианты должны отличаться по стилю или подходу, но сохранять смысл.
        Отвечай только переводами, по одному на строке.
      `;

      const result = await this.claudeService.generateText(alternativePrompt);
      return result.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .slice(0, 3);
    } catch (error) {
      logger.error('Ошибка генерации альтернатив', { error });
      return [];
    }
  }

  // Утилиты
  private generateCacheKey(request: TranslationRequest): string {
    const contextHash = request.context ? this.hashString(request.context) : 'no-context';
    return `${request.sourceLanguage}-${request.targetLanguage}-${request.domain || 'general'}-${contextHash}-${this.hashString(request.text)}`;
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private getFromCache(key: string): TranslationCache | null {
    const cached = this.translationCache.get(key);
    if (cached && cached.expiresAt > new Date()) {
      cached.usageCount++;
      return cached;
    }
    this.translationCache.delete(key);
    return null;
  }

  private saveToCache(key: string, result: TranslationResult, request: TranslationRequest): void {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Кешируем на неделю

    this.translationCache.set(key, {
      key,
      sourceText: request.text,
      targetLanguage: request.targetLanguage,
      translatedText: result.translatedText,
      quality: result.confidence,
      context: request.context || '',
      domain: request.domain || 'general',
      expiresAt,
      usageCount: 1
    });
  }

  private createResultFromCache(cached: TranslationCache, request: TranslationRequest): TranslationResult {
    return {
      originalText: request.text,
      translatedText: cached.translatedText,
      sourceLanguage: request.sourceLanguage,
      targetLanguage: request.targetLanguage,
      confidence: cached.quality,
      model: 'cached',
      context: request.context,
      domain: request.domain,
      alternatives: [],
      quality: {
        accuracy: cached.quality,
        fluency: cached.quality,
        culturalAdaptation: cached.quality,
        gameContext: cached.quality,
        overallScore: cached.quality,
        issues: [],
        suggestions: []
      }
    };
  }

  private extractTranslation(aiResponse: string): string {
    // Простое извлечение перевода из ответа AI
    return aiResponse.trim().replace(/^["']|["']$/g, '');
  }

  private generateContextualPrompt(gameContext: any): string {
    return `Игра типа "${gameContext.type}", жанр "${gameContext.genre}", сеттинг "${gameContext.setting}", целевая аудитория "${gameContext.targetAudience}"`;
  }

  private getLanguageName(code: string): string {
    const names: Record<string, string> = {
      'ru': 'русского',
      'en': 'английского',
      'tr': 'турецкого',
      'uk': 'украинского',
      'be': 'белорусского',
      'kz': 'казахского',
      'de': 'немецкого',
      'fr': 'французского',
      'es': 'испанского',
      'it': 'итальянского',
      'ja': 'японского',
      'ko': 'корейского',
      'zh': 'китайского'
    };
    return names[code] || code;
  }

  private getDomainDescription(domain: string): string {
    const descriptions: Record<string, string> = {
      'ui': 'Интерфейс пользователя',
      'game-content': 'Игровой контент',
      'story': 'Сюжет и повествование',
      'dialogue': 'Диалоги персонажей',
      'menu': 'Меню и навигация',
      'error': 'Сообщения об ошибках',
      'achievement': 'Достижения'
    };
    return descriptions[domain] || 'Общий контент';
  }

  private async evaluateTranslationQuality(translation: GameContentTranslation): Promise<number> {
    // Простая оценка на основе количества переведенного контента
    let totalScore = 0;
    let itemCount = 0;

    for (const lang of translation.targetLanguages) {
      const content = translation.translatedContent[lang];
      if (content) {
        // Проверяем наличие основных элементов
        if (content.title) { totalScore += 0.9; itemCount++; }
        if (content.description) { totalScore += 0.85; itemCount++; }
        if (content.instructions) { totalScore += 0.8; itemCount++; }
        if (content.dialogues?.length > 0) { totalScore += 0.85; itemCount++; }
        if (content.uiElements && Object.keys(content.uiElements).length > 0) { totalScore += 0.8; itemCount++; }
      }
    }

    return itemCount > 0 ? totalScore / itemCount : 0;
  }

  // Публичные методы для получения статистики
  getCacheStatistics() {
    const stats = {
      totalCached: this.translationCache.size,
      mostUsed: Array.from(this.translationCache.values())
        .sort((a, b) => b.usageCount - a.usageCount)
        .slice(0, 10),
      byDomain: {} as Record<string, number>,
      byLanguage: {} as Record<string, number>
    };

    for (const cached of this.translationCache.values()) {
      stats.byDomain[cached.domain] = (stats.byDomain[cached.domain] || 0) + 1;
      stats.byLanguage[cached.targetLanguage] = (stats.byLanguage[cached.targetLanguage] || 0) + 1;
    }

    return stats;
  }

  // Очистка устаревшего кеша
  cleanupCache() {
    const now = new Date();
    let cleaned = 0;
    
    for (const [key, cached] of this.translationCache.entries()) {
      if (cached.expiresAt < now) {
        this.translationCache.delete(key);
        cleaned++;
      }
    }

    logger.info('Очистка кеша переводов завершена', { cleaned });
    return cleaned;
  }
}

export const enhancedLocalizationService = new EnhancedLocalizationService(); 
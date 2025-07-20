import { EventEmitter } from 'events';
import { LoggerService } from '../logger';
import { GenerationVariant, InteractiveGenerationState, StepType } from '../../types/interactive';

interface LearningData {
  stepType: StepType;
  prompt: string;
  context: any;
  variants: GenerationVariant[];
  selectedVariantId: string;
  userFeedback?: {
    rating: number; // 1-5
    comments?: string;
    usedInFinalGame: boolean;
  };
  sessionId: string;
  userId?: string;
  timestamp: Date;
  gameGenre: string;
  finalGameSuccess?: boolean; // Была ли игра успешно завершена
}

interface LearningPattern {
  stepType: StepType;
  genre: string;
  successfulPromptPatterns: string[];
  successfulContextPatterns: any[];
  avgRating: number;
  totalSamples: number;
  lastUpdated: Date;
  improvedPrompts: string[];
  commonFailures: string[];
}

interface QualityMetrics {
  coherence: number; // Согласованность с общим видением игры
  creativity: number; // Оригинальность и креативность
  usability: number; // Практичность использования
  userSatisfaction: number; // Удовлетворенность пользователя
  technicalFeasibility: number; // Техническая реализуемость
}

interface PromptOptimization {
  originalPrompt: string;
  optimizedPrompt: string;
  improvements: string[];
  confidence: number;
  basedOnSamples: number;
}

export class AILearningSystem extends EventEmitter {
  private logger: LoggerService;
  private learningData: Map<string, LearningData[]> = new Map();
  private patterns: Map<string, LearningPattern> = new Map();
  private readonly MIN_SAMPLES_FOR_PATTERN = 5;
  private readonly LEARNING_RATE = 0.1;

  constructor() {
    super();
    this.logger = new LoggerService();
    this.initializeLearningSystem();
  }

  /**
   * Записывает данные о выборе пользователя для обучения
   */
  public async recordUserChoice(data: {
    gameId: string;
    stepType: StepType;
    prompt: string;
    context: any;
    variants: GenerationVariant[];
    selectedVariantId: string;
    userId?: string;
    gameGenre: string;
  }): Promise<void> {
    try {
      const learningRecord: LearningData = {
        stepType: data.stepType,
        prompt: data.prompt,
        context: data.context,
        variants: data.variants,
        selectedVariantId: data.selectedVariantId,
        sessionId: data.gameId,
        userId: data.userId,
        timestamp: new Date(),
        gameGenre: data.gameGenre
      };

      // Сохраняем данные для обучения
      const key = `${data.stepType}_${data.gameGenre}`;
      if (!this.learningData.has(key)) {
        this.learningData.set(key, []);
      }
      this.learningData.get(key)!.push(learningRecord);

      // Обновляем паттерны если достаточно данных
      await this.updateLearningPatterns(key);

      this.logger.info(`📚 Записан выбор пользователя: ${data.stepType} для игры ${data.gameId}`);

      this.emit('learning:choice_recorded', {
        gameId: data.gameId,
        stepType: data.stepType,
        confidence: this.getPatternConfidence(key)
      });

    } catch (error) {
      this.logger.error('Ошибка записи данных обучения:', error);
    }
  }

  /**
   * Записывает обратную связь пользователя
   */
  public async recordUserFeedback(
    gameId: string,
    stepType: StepType,
    rating: number,
    comments?: string,
    usedInFinalGame: boolean = false
  ): Promise<void> {
    try {
      // Находим соответствующую запись
      for (const [key, records] of this.learningData.entries()) {
        const record = records.find(r => 
          r.sessionId === gameId && r.stepType === stepType
        );
        
        if (record) {
          record.userFeedback = {
            rating,
            comments,
            usedInFinalGame
          };

          // Обновляем паттерны с учетом обратной связи
          await this.updateLearningPatterns(key);
          
          this.logger.info(`💬 Записана обратная связь: ${rating}/5 для ${stepType} в игре ${gameId}`);
          
          this.emit('learning:feedback_recorded', {
            gameId,
            stepType,
            rating,
            improvedQuality: rating >= 4
          });
          
          break;
        }
      }
    } catch (error) {
      this.logger.error('Ошибка записи обратной связи:', error);
    }
  }

  /**
   * Отмечает успешность финальной игры
   */
  public async recordGameSuccess(gameId: string, successful: boolean): Promise<void> {
    try {
      // Обновляем все записи для данной игры
      for (const records of this.learningData.values()) {
        records
          .filter(r => r.sessionId === gameId)
          .forEach(r => r.finalGameSuccess = successful);
      }

      this.logger.info(`🎯 Записан результат игры ${gameId}: ${successful ? 'успех' : 'неудача'}`);

      this.emit('learning:game_success_recorded', {
        gameId,
        successful
      });
    } catch (error) {
      this.logger.error('Ошибка записи результата игры:', error);
    }
  }

  /**
   * Получает оптимизированный промпт на основе обучения
   */
  public async getOptimizedPrompt(
    originalPrompt: string,
    stepType: StepType,
    genre: string,
    context?: any
  ): Promise<PromptOptimization> {
    try {
      const key = `${stepType}_${genre}`;
      const pattern = this.patterns.get(key);

      if (!pattern || pattern.totalSamples < this.MIN_SAMPLES_FOR_PATTERN) {
        return {
          originalPrompt,
          optimizedPrompt: originalPrompt,
          improvements: ['Недостаточно данных для оптимизации'],
          confidence: 0,
          basedOnSamples: pattern?.totalSamples || 0
        };
      }

      let optimizedPrompt = originalPrompt;
      const improvements: string[] = [];

      // Применяем успешные паттерны
      for (const successPattern of pattern.successfulPromptPatterns) {
        if (!optimizedPrompt.includes(successPattern)) {
          optimizedPrompt = `${optimizedPrompt} ${successPattern}`;
          improvements.push(`Добавлен успешный паттерн: ${successPattern}`);
        }
      }

      // Избегаем неудачных паттернов
      for (const failure of pattern.commonFailures) {
        if (optimizedPrompt.includes(failure)) {
          optimizedPrompt = optimizedPrompt.replace(failure, '');
          improvements.push(`Удален неудачный элемент: ${failure}`);
        }
      }

      // Применяем жанрово-специфичные улучшения
      const genreImprovements = this.getGenreSpecificImprovements(genre, stepType);
      for (const improvement of genreImprovements) {
        if (!optimizedPrompt.includes(improvement)) {
          optimizedPrompt = `${optimizedPrompt} ${improvement}`;
          improvements.push(`Добавлено жанрово-специфичное улучшение: ${improvement}`);
        }
      }

      const confidence = Math.min(pattern.avgRating / 5, 1) * 
                        Math.min(pattern.totalSamples / 20, 1);

      this.logger.info(`🎯 Оптимизирован промпт для ${stepType}/${genre}, уверенность: ${confidence.toFixed(2)}`);

      return {
        originalPrompt,
        optimizedPrompt: optimizedPrompt.trim(),
        improvements,
        confidence,
        basedOnSamples: pattern.totalSamples
      };

    } catch (error) {
      this.logger.error('Ошибка оптимизации промпта:', error);
      return {
        originalPrompt,
        optimizedPrompt: originalPrompt,
        improvements: ['Ошибка при оптимизации'],
        confidence: 0,
        basedOnSamples: 0
      };
    }
  }

  /**
   * Анализирует качество вариантов на основе исторических данных
   */
  public async analyzeVariantQuality(
    variants: GenerationVariant[],
    stepType: StepType,
    genre: string,
    context?: any
  ): Promise<Array<GenerationVariant & { qualityMetrics: QualityMetrics }>> {
    try {
      const key = `${stepType}_${genre}`;
      const pattern = this.patterns.get(key);

      return variants.map(variant => {
        const metrics = this.calculateQualityMetrics(variant, pattern, context);
        
        return {
          ...variant,
          qualityMetrics: metrics
        };
      });

    } catch (error) {
      this.logger.error('Ошибка анализа качества вариантов:', error);
      return variants.map(v => ({
        ...v,
        qualityMetrics: {
          coherence: 0.5,
          creativity: 0.5,
          usability: 0.5,
          userSatisfaction: 0.5,
          technicalFeasibility: 0.5
        }
      }));
    }
  }

  /**
   * Получает рекомендации для улучшения генерации
   */
  public async getImprovementRecommendations(
    stepType: StepType,
    genre: string
  ): Promise<{
    recommendations: string[];
    confidence: number;
    basedOnData: boolean;
  }> {
    try {
      const key = `${stepType}_${genre}`;
      const pattern = this.patterns.get(key);

      if (!pattern || pattern.totalSamples < this.MIN_SAMPLES_FOR_PATTERN) {
        return {
          recommendations: [
            'Недостаточно данных для конкретных рекомендаций',
            'Собирайте больше обратной связи от пользователей',
            'Экспериментируйте с разными подходами'
          ],
          confidence: 0,
          basedOnData: false
        };
      }

      const recommendations: string[] = [];

      // Анализируем успешные паттерны
      if (pattern.successfulPromptPatterns.length > 0) {
        recommendations.push(
          `Используйте успешные элементы: ${pattern.successfulPromptPatterns.slice(0, 3).join(', ')}`
        );
      }

      // Анализируем провалы
      if (pattern.commonFailures.length > 0) {
        recommendations.push(
          `Избегайте: ${pattern.commonFailures.slice(0, 3).join(', ')}`
        );
      }

      // Анализируем рейтинги
      if (pattern.avgRating < 3) {
        recommendations.push('Качество требует значительных улучшений');
      } else if (pattern.avgRating < 4) {
        recommendations.push('Есть возможности для улучшения');
      } else {
        recommendations.push('Текущий подход работает хорошо');
      }

      const confidence = Math.min(pattern.totalSamples / 10, 1);

      return {
        recommendations,
        confidence,
        basedOnData: true
      };

    } catch (error) {
      this.logger.error('Ошибка получения рекомендаций:', error);
      return {
        recommendations: ['Ошибка анализа данных'],
        confidence: 0,
        basedOnData: false
      };
    }
  }

  /**
   * Экспортирует данные обучения для анализа
   */
  public exportLearningData(): {
    totalRecords: number;
    patterns: any[];
    topPerformingSteps: any[];
    recentTrends: any[];
  } {
    const totalRecords = Array.from(this.learningData.values())
      .reduce((sum, records) => sum + records.length, 0);

    const patterns = Array.from(this.patterns.entries()).map(([key, pattern]) => ({
      key,
      ...pattern
    }));

    const topPerformingSteps = patterns
      .filter(p => p.totalSamples >= this.MIN_SAMPLES_FOR_PATTERN)
      .sort((a, b) => b.avgRating - a.avgRating)
      .slice(0, 10);

    const recentTrends = this.analyzeRecentTrends();

    return {
      totalRecords,
      patterns,
      topPerformingSteps,
      recentTrends
    };
  }

  private async initializeLearningSystem(): Promise<void> {
    try {
      // Загружаем сохраненные данные обучения (если есть)
      // В реальной системе это было бы из базы данных
      this.logger.info('🧠 Система обучения инициализирована');
      
      this.emit('learning:system_initialized');
    } catch (error) {
      this.logger.error('Ошибка инициализации системы обучения:', error);
    }
  }

  private async updateLearningPatterns(key: string): Promise<void> {
    try {
      const records = this.learningData.get(key) || [];
      
      if (records.length < this.MIN_SAMPLES_FOR_PATTERN) {
        return;
      }

      const [stepType, genre] = key.split('_') as [StepType, string];

      // Анализируем успешные записи (с высоким рейтингом или использованные в финальной игре)
      const successfulRecords = records.filter(r => 
        (r.userFeedback?.rating && r.userFeedback.rating >= 4) ||
        r.userFeedback?.usedInFinalGame ||
        r.finalGameSuccess
      );

      // Анализируем неудачные записи
      const failedRecords = records.filter(r =>
        (r.userFeedback?.rating && r.userFeedback.rating <= 2) ||
        r.finalGameSuccess === false
      );

      // Извлекаем паттерны из успешных промптов
      const successfulPromptPatterns = this.extractPromptPatterns(
        successfulRecords.map(r => r.prompt)
      );

      // Извлекаем общие провалы
      const commonFailures = this.extractFailurePatterns(
        failedRecords.map(r => r.prompt)
      );

      // Вычисляем средний рейтинг
      const ratingsSum = records.reduce((sum, r) => 
        sum + (r.userFeedback?.rating || 3), 0
      );
      const avgRating = ratingsSum / records.length;

      // Создаем или обновляем паттерн
      const pattern: LearningPattern = {
        stepType,
        genre,
        successfulPromptPatterns,
        successfulContextPatterns: successfulRecords.map(r => r.context),
        avgRating,
        totalSamples: records.length,
        lastUpdated: new Date(),
        improvedPrompts: this.generateImprovedPrompts(successfulPromptPatterns),
        commonFailures
      };

      this.patterns.set(key, pattern);

      this.logger.info(`📊 Обновлен паттерн для ${key}: ${records.length} записей, рейтинг ${avgRating.toFixed(2)}`);

      this.emit('learning:pattern_updated', {
        key,
        avgRating,
        totalSamples: records.length,
        confidence: this.getPatternConfidence(key)
      });

    } catch (error) {
      this.logger.error('Ошибка обновления паттернов обучения:', error);
    }
  }

  private extractPromptPatterns(prompts: string[]): string[] {
    // Простой анализ - ищем общие фразы и термины
    const wordCounts = new Map<string, number>();
    
    for (const prompt of prompts) {
      const words = prompt.toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 3 && !this.isStopWord(word));
      
      for (const word of words) {
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
      }
    }

    // Возвращаем часто встречающиеся паттерны
    return Array.from(wordCounts.entries())
      .filter(([_, count]) => count >= Math.ceil(prompts.length * 0.3))
      .map(([word, _]) => word)
      .slice(0, 10);
  }

  private extractFailurePatterns(prompts: string[]): string[] {
    // Аналогично, но для неудачных промптов
    return this.extractPromptPatterns(prompts).slice(0, 5);
  }

  private generateImprovedPrompts(patterns: string[]): string[] {
    // Генерируем улучшенные промпты на основе успешных паттернов
    const improvements: string[] = [];
    
    if (patterns.includes('детальный')) {
      improvements.push('Добавьте больше деталей и конкретики');
    }
    
    if (patterns.includes('стиль')) {
      improvements.push('Четко определите визуальный стиль');
    }
    
    if (patterns.includes('игрок')) {
      improvements.push('Учитывайте опыт игрока');
    }

    return improvements;
  }

  private isStopWord(word: string): boolean {
    const stopWords = ['и', 'в', 'на', 'с', 'для', 'как', 'что', 'это', 'как', 'или'];
    return stopWords.includes(word);
  }

  private getPatternConfidence(key: string): number {
    const pattern = this.patterns.get(key);
    if (!pattern) return 0;
    
    return Math.min(pattern.totalSamples / 20, 1) * 
           Math.min(pattern.avgRating / 5, 1);
  }

  private calculateQualityMetrics(
    variant: GenerationVariant,
    pattern?: LearningPattern,
    context?: any
  ): QualityMetrics {
    // Базовые метрики
    let coherence = 0.5;
    let creativity = 0.5;
    let usability = 0.5;
    let userSatisfaction = 0.5;
    let technicalFeasibility = 0.5;

    if (pattern) {
      // Используем исторические данные для расчета метрик
      userSatisfaction = Math.min(pattern.avgRating / 5, 1);
      
      // Проверяем наличие успешных паттернов
      const content = JSON.stringify(variant.content).toLowerCase();
      const matchingPatterns = pattern.successfulPromptPatterns
        .filter(p => content.includes(p)).length;
      
      coherence = Math.min(matchingPatterns / pattern.successfulPromptPatterns.length, 1);
      
      // Базовая оценка творчества (можно улучшить)
      creativity = Math.random() * 0.4 + 0.3; // Пока случайно в разумных пределах
      
      // Техническая реализуемость (базовая оценка)
      technicalFeasibility = 0.8; // Предполагаем высокую реализуемость
      
      // Удобство использования
      usability = userSatisfaction * 0.9; // Коррелирует с удовлетворенностью
    }

    return {
      coherence,
      creativity,
      usability,
      userSatisfaction,
      technicalFeasibility
    };
  }

  private getGenreSpecificImprovements(genre: string, stepType: StepType): string[] {
    const improvements: string[] = [];

    // Жанрово-специфичные улучшения
    if (genre === 'platformer' && stepType === 'mechanics') {
      improvements.push('точные элементы управления', 'плавная физика прыжков');
    } else if (genre === 'puzzle' && stepType === 'mechanics') {
      improvements.push('интуитивные механики', 'прогрессивная сложность');
    } else if (genre === 'rpg' && stepType === 'character') {
      improvements.push('детальная предыстория', 'система развития');
    }

    return improvements;
  }

  private analyzeRecentTrends(): any[] {
    // Анализ недавних трендов в данных
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const trends: any[] = [];

    for (const [key, records] of this.learningData.entries()) {
      const recentRecords = records.filter(r => r.timestamp >= weekAgo);
      
      if (recentRecords.length > 0) {
        const avgRecentRating = recentRecords.reduce((sum, r) => 
          sum + (r.userFeedback?.rating || 3), 0
        ) / recentRecords.length;

        trends.push({
          key,
          recentSamples: recentRecords.length,
          avgRating: avgRecentRating,
          trend: avgRecentRating > 3.5 ? 'improving' : 'declining'
        });
      }
    }

    return trends.sort((a, b) => b.recentSamples - a.recentSamples);
  }
} 
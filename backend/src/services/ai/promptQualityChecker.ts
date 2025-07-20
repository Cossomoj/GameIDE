import { LoggerService } from '../logger';
import { StepType } from '../../types/interactive';

interface PromptQualityMetrics {
  clarity: number; // Ясность и понятность (0-1)
  specificity: number; // Конкретность и детализация (0-1)
  creativity: number; // Потенциал для креативных результатов (0-1)
  technical: number; // Техническая корректность (0-1)
  coherence: number; // Связность и логичность (0-1)
  completeness: number; // Полнота описания (0-1)
  overallScore: number; // Общая оценка (0-1)
}

interface QualityIssue {
  type: 'warning' | 'error' | 'suggestion';
  severity: 'low' | 'medium' | 'high';
  category: 'clarity' | 'specificity' | 'creativity' | 'technical' | 'coherence' | 'completeness';
  message: string;
  suggestion?: string;
  examples?: string[];
}

interface PromptAnalysis {
  metrics: PromptQualityMetrics;
  issues: QualityIssue[];
  improvements: string[];
  optimizedPrompt?: string;
  passesQualityCheck: boolean;
  recommendations: {
    priority: 'high' | 'medium' | 'low';
    action: string;
    description: string;
  }[];
}

interface QualityCheckRules {
  stepType: StepType;
  minLength: number;
  maxLength: number;
  requiredKeywords: string[];
  forbiddenWords: string[];
  specificityRules: {
    mustInclude: string[];
    shouldAvoid: string[];
  };
  genreSpecific: {
    [genre: string]: {
      keywords: string[];
      patterns: string[];
    };
  };
}

export class PromptQualityChecker {
  private logger: LoggerService;
  private qualityRules: Map<StepType, QualityCheckRules> = new Map();
  private readonly QUALITY_THRESHOLD = 0.7; // Минимальный порог качества

  constructor() {
    this.logger = new LoggerService();
    this.initializeQualityRules();
  }

  /**
   * Анализирует качество промпта и возвращает детальный отчет
   */
  public async analyzePromptQuality(
    prompt: string,
    stepType: StepType,
    genre: string,
    context?: any
  ): Promise<PromptAnalysis> {
    try {
      this.logger.info(`🔍 Анализ качества промпта для ${stepType}/${genre}`);

      const metrics = this.calculateQualityMetrics(prompt, stepType, genre, context);
      const issues = this.identifyQualityIssues(prompt, stepType, genre, metrics);
      const improvements = this.generateImprovements(prompt, stepType, genre, issues);
      const recommendations = this.generateRecommendations(metrics, issues);
      const optimizedPrompt = this.generateOptimizedPrompt(prompt, improvements);

      const analysis: PromptAnalysis = {
        metrics,
        issues,
        improvements,
        optimizedPrompt,
        passesQualityCheck: metrics.overallScore >= this.QUALITY_THRESHOLD,
        recommendations
      };

      this.logger.info(`📊 Качество промпта: ${(metrics.overallScore * 100).toFixed(1)}%`);

      return analysis;

    } catch (error) {
      this.logger.error('Ошибка анализа качества промпта:', error);
      
      return {
        metrics: this.getDefaultMetrics(),
        issues: [{
          type: 'error',
          severity: 'high',
          category: 'technical',
          message: 'Ошибка при анализе качества промпта'
        }],
        improvements: [],
        passesQualityCheck: false,
        recommendations: []
      };
    }
  }

  /**
   * Быстрая проверка качества промпта (только пройден/не пройден)
   */
  public async quickQualityCheck(
    prompt: string,
    stepType: StepType,
    genre: string
  ): Promise<{
    passed: boolean;
    score: number;
    criticalIssues: string[];
  }> {
    try {
      const analysis = await this.analyzePromptQuality(prompt, stepType, genre);
      
      const criticalIssues = analysis.issues
        .filter(issue => issue.severity === 'high')
        .map(issue => issue.message);

      return {
        passed: analysis.passesQualityCheck,
        score: analysis.metrics.overallScore,
        criticalIssues
      };

    } catch (error) {
      this.logger.error('Ошибка быстрой проверки качества:', error);
      return {
        passed: false,
        score: 0,
        criticalIssues: ['Ошибка при проверке качества']
      };
    }
  }

  /**
   * Анализирует серию промптов и возвращает общую статистику
   */
  public async analyzeBatchQuality(
    prompts: { text: string; stepType: StepType; genre: string }[]
  ): Promise<{
    overallQuality: number;
    passRate: number;
    commonIssues: { issue: string; frequency: number }[];
    bestPractices: string[];
    worstPerformingSteps: { stepType: StepType; score: number }[];
  }> {
    try {
      const analyses = await Promise.all(
        prompts.map(p => this.analyzePromptQuality(p.text, p.stepType, p.genre))
      );

      const overallQuality = analyses.reduce((sum, a) => sum + a.metrics.overallScore, 0) / analyses.length;
      const passRate = analyses.filter(a => a.passesQualityCheck).length / analyses.length;

      // Анализируем общие проблемы
      const issueFrequency = new Map<string, number>();
      analyses.forEach(a => {
        a.issues.forEach(issue => {
          issueFrequency.set(issue.message, (issueFrequency.get(issue.message) || 0) + 1);
        });
      });

      const commonIssues = Array.from(issueFrequency.entries())
        .map(([issue, frequency]) => ({ issue, frequency }))
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, 5);

      // Находим лучшие практики
      const bestPractices = this.extractBestPractices(analyses);

      // Находим худшие этапы
      const stepScores = new Map<StepType, number[]>();
      prompts.forEach((p, i) => {
        if (!stepScores.has(p.stepType)) {
          stepScores.set(p.stepType, []);
        }
        stepScores.get(p.stepType)!.push(analyses[i].metrics.overallScore);
      });

      const worstPerformingSteps = Array.from(stepScores.entries())
        .map(([stepType, scores]) => ({
          stepType,
          score: scores.reduce((sum, s) => sum + s, 0) / scores.length
        }))
        .sort((a, b) => a.score - b.score)
        .slice(0, 3);

      return {
        overallQuality,
        passRate,
        commonIssues,
        bestPractices,
        worstPerformingSteps
      };

    } catch (error) {
      this.logger.error('Ошибка анализа серии промптов:', error);
      return {
        overallQuality: 0,
        passRate: 0,
        commonIssues: [],
        bestPractices: [],
        worstPerformingSteps: []
      };
    }
  }

  private initializeQualityRules(): void {
    // Правила для персонажей
    this.qualityRules.set('character', {
      stepType: 'character',
      minLength: 20,
      maxLength: 500,
      requiredKeywords: ['персонаж', 'внешность', 'стиль'],
      forbiddenWords: ['плохой', 'скучный', 'неинтересный'],
      specificityRules: {
        mustInclude: ['цвет', 'размер', 'форма'],
        shouldAvoid: ['что-то', 'какой-то', 'примерно']
      },
      genreSpecific: {
        'platformer': {
          keywords: ['прыжки', 'движение', 'анимация'],
          patterns: ['способности', 'физика']
        },
        'rpg': {
          keywords: ['класс', 'навыки', 'экипировка'],
          patterns: ['развитие', 'история']
        }
      }
    });

    // Правила для механик
    this.qualityRules.set('mechanics', {
      stepType: 'mechanics',
      minLength: 30,
      maxLength: 600,
      requiredKeywords: ['механика', 'игрок', 'действие'],
      forbiddenWords: ['сложно', 'невозможно', 'не знаю'],
      specificityRules: {
        mustInclude: ['управление', 'цель', 'правила'],
        shouldAvoid: ['возможно', 'может быть', 'по желанию']
      },
      genreSpecific: {
        'puzzle': {
          keywords: ['логика', 'решение', 'головоломка'],
          patterns: ['сложность', 'прогрессия']
        },
        'arcade': {
          keywords: ['скорость', 'реакция', 'счет'],
          patterns: ['время', 'рекорды']
        }
      }
    });

    // Добавляем правила для остальных типов этапов
    this.initializeAdditionalRules();
  }

  private initializeAdditionalRules(): void {
    // Правила для уровней
    this.qualityRules.set('levels', {
      stepType: 'levels',
      minLength: 25,
      maxLength: 400,
      requiredKeywords: ['уровень', 'дизайн', 'игрок'],
      forbiddenWords: ['пустой', 'одинаковый'],
      specificityRules: {
        mustInclude: ['размер', 'препятствия', 'цель'],
        shouldAvoid: ['любой', 'произвольный']
      },
      genreSpecific: {
        'platformer': {
          keywords: ['платформы', 'препятствия', 'прыжки'],
          patterns: ['вертикальность', 'секреты']
        }
      }
    });

    // Правила для графики
    this.qualityRules.set('graphics', {
      stepType: 'graphics',
      minLength: 20,
      maxLength: 300,
      requiredKeywords: ['стиль', 'цвет', 'визуал'],
      forbiddenWords: ['неважно', 'любой'],
      specificityRules: {
        mustInclude: ['палитра', 'настроение'],
        shouldAvoid: ['что угодно', 'не важно']
      },
      genreSpecific: {
        'horror': {
          keywords: ['темный', 'атмосфера', 'тени'],
          patterns: ['контраст', 'мрачность']
        }
      }
    });

    // Добавляем правила для новых типов этапов
    this.initializeNewStepTypeRules();
  }

  private initializeNewStepTypeRules(): void {
    // Правила для монетизации
    this.qualityRules.set('monetization', {
      stepType: 'monetization',
      minLength: 30,
      maxLength: 400,
      requiredKeywords: ['монетизация', 'доход', 'модель'],
      forbiddenWords: ['обман', 'принуждение'],
      specificityRules: {
        mustInclude: ['цена', 'ценность', 'аудитория'],
        shouldAvoid: ['дорого', 'дешево']
      },
      genreSpecific: {
        'casual': {
          keywords: ['реклама', 'косметика'],
          patterns: ['добровольность', 'ненавязчивость']
        }
      }
    });

    // Правила для мультиплеера
    this.qualityRules.set('multiplayer', {
      stepType: 'multiplayer',
      minLength: 25,
      maxLength: 350,
      requiredKeywords: ['игроки', 'взаимодействие'],
      forbiddenWords: ['токсичность', 'конфликты'],
      specificityRules: {
        mustInclude: ['количество', 'роли', 'общение'],
        shouldAvoid: ['хаос', 'беспорядок']
      },
      genreSpecific: {
        'competitive': {
          keywords: ['баланс', 'навык', 'рейтинг'],
          patterns: ['честность', 'соревнование']
        }
      }
    });
  }

  private calculateQualityMetrics(
    prompt: string,
    stepType: StepType,
    genre: string,
    context?: any
  ): PromptQualityMetrics {
    const rules = this.qualityRules.get(stepType);
    
    // Ясность
    const clarity = this.calculateClarity(prompt);
    
    // Конкретность
    const specificity = this.calculateSpecificity(prompt, rules);
    
    // Креативность
    const creativity = this.calculateCreativity(prompt, stepType);
    
    // Техническая корректность
    const technical = this.calculateTechnicalScore(prompt, rules);
    
    // Связность
    const coherence = this.calculateCoherence(prompt, context);
    
    // Полнота
    const completeness = this.calculateCompleteness(prompt, rules);

    // Общая оценка
    const overallScore = (clarity + specificity + creativity + technical + coherence + completeness) / 6;

    return {
      clarity,
      specificity,
      creativity,
      technical,
      coherence,
      completeness,
      overallScore
    };
  }

  private calculateClarity(prompt: string): number {
    let score = 0.5; // Базовая оценка

    // Проверяем длину предложений
    const sentences = prompt.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgSentenceLength = sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length;
    
    if (avgSentenceLength < 100) score += 0.2; // Не слишком длинные предложения
    if (avgSentenceLength > 20) score += 0.1; // Не слишком короткие

    // Проверяем использование простых слов
    const complexWords = prompt.match(/\b\w{10,}\b/g) || [];
    if (complexWords.length / prompt.split(' ').length < 0.1) score += 0.2;

    return Math.min(score, 1);
  }

  private calculateSpecificity(prompt: string, rules?: QualityCheckRules): number {
    let score = 0.3; // Базовая оценка

    // Проверяем наличие конкретных деталей
    const specificWords = ['размер', 'цвет', 'форма', 'стиль', 'тип', 'вид', 'количество'];
    const foundSpecific = specificWords.filter(word => 
      prompt.toLowerCase().includes(word)
    ).length;
    
    score += (foundSpecific / specificWords.length) * 0.4;

    // Проверяем избегание расплывчатых формулировок
    const vagueWords = ['что-то', 'как-то', 'примерно', 'возможно', 'может быть'];
    const foundVague = vagueWords.filter(word => 
      prompt.toLowerCase().includes(word)
    ).length;
    
    score -= foundVague * 0.1;

    // Проверяем специфичные правила
    if (rules?.specificityRules) {
      const foundRequired = rules.specificityRules.mustInclude.filter(word =>
        prompt.toLowerCase().includes(word)
      ).length;
      score += (foundRequired / rules.specificityRules.mustInclude.length) * 0.3;
    }

    return Math.max(Math.min(score, 1), 0);
  }

  private calculateCreativity(prompt: string, stepType: StepType): number {
    let score = 0.4; // Базовая оценка

    // Проверяем разнообразие слов
    const words = prompt.toLowerCase().split(/\s+/);
    const uniqueWords = new Set(words);
    const diversity = uniqueWords.size / words.length;
    score += diversity * 0.3;

    // Проверяем использование творческих слов
    const creativeWords = ['уникальный', 'необычный', 'креативный', 'оригинальный', 'инновационный'];
    const foundCreative = creativeWords.filter(word => 
      prompt.toLowerCase().includes(word)
    ).length;
    score += (foundCreative / creativeWords.length) * 0.3;

    return Math.min(score, 1);
  }

  private calculateTechnicalScore(prompt: string, rules?: QualityCheckRules): number {
    let score = 0.5; // Базовая оценка

    if (!rules) return score;

    // Проверяем длину
    if (prompt.length >= rules.minLength && prompt.length <= rules.maxLength) {
      score += 0.2;
    } else {
      score -= 0.1;
    }

    // Проверяем обязательные ключевые слова
    const foundRequired = rules.requiredKeywords.filter(keyword =>
      prompt.toLowerCase().includes(keyword.toLowerCase())
    ).length;
    score += (foundRequired / rules.requiredKeywords.length) * 0.2;

    // Проверяем запрещенные слова
    const foundForbidden = rules.forbiddenWords.filter(word =>
      prompt.toLowerCase().includes(word.toLowerCase())
    ).length;
    score -= foundForbidden * 0.1;

    return Math.max(Math.min(score, 1), 0);
  }

  private calculateCoherence(prompt: string, context?: any): number {
    let score = 0.6; // Базовая оценка

    // Простая проверка связности (можно улучшить)
    const sentences = prompt.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    if (sentences.length > 1) {
      // Проверяем использование связующих слов
      const connectors = ['также', 'кроме того', 'при этом', 'однако', 'поэтому'];
      const foundConnectors = connectors.filter(conn => 
        prompt.toLowerCase().includes(conn)
      ).length;
      score += (foundConnectors / sentences.length) * 0.4;
    }

    return Math.min(score, 1);
  }

  private calculateCompleteness(prompt: string, rules?: QualityCheckRules): number {
    let score = 0.4; // Базовая оценка

    if (!rules) return score;

    // Проверяем покрытие основных аспектов
    const aspects = ['что', 'как', 'зачем', 'где']; // Основные вопросы
    const coveredAspects = aspects.filter(aspect => {
      switch (aspect) {
        case 'что': return /что|какой|какая|какое/.test(prompt.toLowerCase());
        case 'как': return /как|способ|метод/.test(prompt.toLowerCase());
        case 'зачем': return /цель|назначение|для/.test(prompt.toLowerCase());
        case 'где': return /где|место|область/.test(prompt.toLowerCase());
        default: return false;
      }
    }).length;

    score += (coveredAspects / aspects.length) * 0.6;

    return Math.min(score, 1);
  }

  private identifyQualityIssues(
    prompt: string,
    stepType: StepType,
    genre: string,
    metrics: PromptQualityMetrics
  ): QualityIssue[] {
    const issues: QualityIssue[] = [];
    const rules = this.qualityRules.get(stepType);

    // Проверка ясности
    if (metrics.clarity < 0.5) {
      issues.push({
        type: 'warning',
        severity: 'medium',
        category: 'clarity',
        message: 'Промпт может быть недостаточно ясным',
        suggestion: 'Используйте более простые и короткие предложения'
      });
    }

    // Проверка конкретности
    if (metrics.specificity < 0.4) {
      issues.push({
        type: 'warning',
        severity: 'high',
        category: 'specificity',
        message: 'Промпт слишком расплывчатый',
        suggestion: 'Добавьте конкретные детали: размеры, цвета, стили'
      });
    }

    // Проверка длины
    if (rules) {
      if (prompt.length < rules.minLength) {
        issues.push({
          type: 'error',
          severity: 'high',
          category: 'completeness',
          message: `Промпт слишком короткий (${prompt.length} символов, минимум ${rules.minLength})`,
          suggestion: 'Добавьте больше деталей и описаний'
        });
      }

      if (prompt.length > rules.maxLength) {
        issues.push({
          type: 'warning',
          severity: 'medium',
          category: 'clarity',
          message: `Промпт слишком длинный (${prompt.length} символов, максимум ${rules.maxLength})`,
          suggestion: 'Сократите и структурируйте описание'
        });
      }
    }

    // Проверка технической корректности
    if (metrics.technical < 0.5) {
      issues.push({
        type: 'error',
        severity: 'high',
        category: 'technical',
        message: 'Промпт не соответствует техническим требованиям',
        suggestion: 'Проверьте наличие обязательных ключевых слов'
      });
    }

    return issues;
  }

  private generateImprovements(
    prompt: string,
    stepType: StepType,
    genre: string,
    issues: QualityIssue[]
  ): string[] {
    const improvements: string[] = [];

    // Генерируем улучшения на основе найденных проблем
    issues.forEach(issue => {
      if (issue.suggestion) {
        improvements.push(issue.suggestion);
      }
    });

    // Добавляем специфичные для типа этапа улучшения
    const typeSpecificImprovements = this.getTypeSpecificImprovements(stepType, genre);
    improvements.push(...typeSpecificImprovements);

    return [...new Set(improvements)]; // Убираем дубликаты
  }

  private generateRecommendations(
    metrics: PromptQualityMetrics,
    issues: QualityIssue[]
  ): Array<{
    priority: 'high' | 'medium' | 'low';
    action: string;
    description: string;
  }> {
    const recommendations: Array<{
      priority: 'high' | 'medium' | 'low';
      action: string;
      description: string;
    }> = [];

    // Высокоприоритетные рекомендации
    const highSeverityIssues = issues.filter(i => i.severity === 'high');
    if (highSeverityIssues.length > 0) {
      recommendations.push({
        priority: 'high',
        action: 'Исправить критические проблемы',
        description: `Найдено ${highSeverityIssues.length} критических проблем качества`
      });
    }

    // Рекомендации по метрикам
    if (metrics.specificity < 0.5) {
      recommendations.push({
        priority: 'high',
        action: 'Повысить конкретность',
        description: 'Добавьте больше специфичных деталей и избегайте расплывчатых формулировок'
      });
    }

    if (metrics.creativity < 0.4) {
      recommendations.push({
        priority: 'medium',
        action: 'Увеличить креативность',
        description: 'Используйте более разнообразную лексику и оригинальные идеи'
      });
    }

    return recommendations;
  }

  private generateOptimizedPrompt(prompt: string, improvements: string[]): string {
    // Простая оптимизация - добавляем улучшения в конец
    if (improvements.length === 0) {
      return prompt;
    }

    const optimizationHints = improvements
      .filter(imp => imp.includes('Добавьте') || imp.includes('Используйте'))
      .slice(0, 2); // Берем только первые 2 конструктивных улучшения

    if (optimizationHints.length > 0) {
      return `${prompt} (Дополнительно учтите: ${optimizationHints.join(', ')})`;
    }

    return prompt;
  }

  private getTypeSpecificImprovements(stepType: StepType, genre: string): string[] {
    const improvements: string[] = [];

    switch (stepType) {
      case 'character':
        improvements.push('Опишите внешность персонажа', 'Укажите основные способности');
        break;
      case 'mechanics':
        improvements.push('Детализируйте управление', 'Опишите цель игрока');
        break;
      case 'levels':
        improvements.push('Укажите размер и структуру', 'Опишите препятствия');
        break;
      case 'monetization':
        improvements.push('Определите целевую аудиторию', 'Опишите ценностное предложение');
        break;
    }

    return improvements;
  }

  private extractBestPractices(analyses: PromptAnalysis[]): string[] {
    const practices: string[] = [];

    // Анализируем успешные промпты
    const successfulAnalyses = analyses.filter(a => a.passesQualityCheck);
    
    if (successfulAnalyses.length > 0) {
      const avgClarity = successfulAnalyses.reduce((sum, a) => sum + a.metrics.clarity, 0) / successfulAnalyses.length;
      if (avgClarity > 0.8) {
        practices.push('Используйте ясные и простые формулировки');
      }

      const avgSpecificity = successfulAnalyses.reduce((sum, a) => sum + a.metrics.specificity, 0) / successfulAnalyses.length;
      if (avgSpecificity > 0.7) {
        practices.push('Включайте конкретные детали и избегайте расплывчатости');
      }
    }

    if (practices.length === 0) {
      practices.push('Недостаточно данных для выявления лучших практик');
    }

    return practices;
  }

  private getDefaultMetrics(): PromptQualityMetrics {
    return {
      clarity: 0.5,
      specificity: 0.5,
      creativity: 0.5,
      technical: 0.5,
      coherence: 0.5,
      completeness: 0.5,
      overallScore: 0.5
    };
  }
} 
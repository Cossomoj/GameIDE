import { OpenAIService } from './ai/openai';
import { LoggerService } from './logger';
import { AssetGenerationResult } from '../types';
import sharp from 'sharp';
import { EventEmitter } from 'events';

interface AssetQualityMetrics {
  technicalScore: number; // 0-100
  aestheticScore: number; // 0-100
  gameRelevanceScore: number; // 0-100
  overallScore: number; // 0-100
  issues: string[];
  recommendations: string[];
}

interface EnhancedPromptTemplate {
  base: string;
  qualityModifiers: string[];
  styleSpecific: Record<string, string>;
  technicalRequirements: string[];
  negativePrompts: string[];
}

interface RegenerationConfig {
  maxAttempts: number;
  minQualityThreshold: number;
  improvementStrategy: 'iterative' | 'alternative' | 'hybrid';
  enableAutoRegeneration: boolean;
  regenerationTriggers: RegenerationTrigger[];
}

interface RegenerationTrigger {
  type: 'quality_threshold' | 'user_feedback' | 'technical_issue' | 'style_mismatch';
  threshold?: number;
  condition?: string;
}

interface RegenerationAttempt {
  attemptNumber: number;
  timestamp: Date;
  qualityBefore: number;
  qualityAfter: number;
  promptModifications: string[];
  success: boolean;
  failureReasons: string[];
}

interface RegenerationHistory {
  assetId: string;
  originalDescription: string;
  originalQuality: number;
  attempts: RegenerationAttempt[];
  finalQuality: number;
  totalRegenerations: number;
  averageImprovementPerAttempt: number;
  successRate: number;
}

interface PromptImprovementStrategy {
  name: string;
  description: string;
  modifications: string[];
  applicableIssues: string[];
  successRate: number;
}

export class EnhancedAssetGeneration extends EventEmitter {
  private openai: OpenAIService;
  private logger: LoggerService;
  private qualityThreshold: number = 75;
  private promptTemplates: Map<string, EnhancedPromptTemplate> = new Map();
  private generationHistory: Map<string, any[]> = new Map();
  private regenerationHistory: Map<string, RegenerationHistory> = new Map();
  private improvementStrategies: PromptImprovementStrategy[] = [];
  private regenerationStats = {
    totalRegenerations: 0,
    successfulRegenerations: 0,
    averageQualityImprovement: 0,
    mostCommonIssues: new Map<string, number>(),
    bestStrategies: new Map<string, number>()
  };

  constructor() {
    super();
    this.openai = new OpenAIService();
    this.logger = new LoggerService();
    this.initializePromptTemplates();
    this.initializeImprovementStrategies();
  }

  /**
   * Генерация высококачественного спрайта с автоматической проверкой качества
   */
  public async generateHighQualitySprite(
    description: string,
    style: string = 'pixel art',
    dimensions: { width: number; height: number } = { width: 64, height: 64 },
    config: RegenerationConfig = {
      maxAttempts: 3,
      minQualityThreshold: 75,
      improvementStrategy: 'iterative'
    }
  ): Promise<{
    asset: AssetGenerationResult;
    qualityMetrics: AssetQualityMetrics;
    attemptsMade: number;
    generationLog: string[];
  }> {
    const startTime = Date.now();
    const generationLog: string[] = [];
    let bestAsset: AssetGenerationResult | null = null;
    let bestQuality: AssetQualityMetrics | null = null;

    this.logger.info(`🎨 Начало генерации высококачественного спрайта: "${description}"`);
    generationLog.push(`Цель: ${description} (${style}, ${dimensions.width}x${dimensions.height})`);

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        generationLog.push(`\n--- Попытка ${attempt}/${config.maxAttempts} ---`);
        
        // Создаем улучшенный промпт
        const enhancedPrompt = this.createEnhancedPrompt(
          description, 
          style, 
          'sprite',
          attempt,
          bestQuality?.issues || []
        );
        
        generationLog.push(`Промпт: ${enhancedPrompt.substring(0, 100)}...`);
        
        // Генерируем ассет
        const asset = await this.generateSpriteWithAdvancedPrompt(
          enhancedPrompt,
          style,
          dimensions
        );
        
        // Оцениваем качество
        const qualityMetrics = await this.evaluateAssetQuality(
          asset,
          description,
          style,
          'sprite'
        );
        
        generationLog.push(`Качество: ${qualityMetrics.overallScore}/100`);
        
        // Сохраняем лучший результат
        if (!bestAsset || qualityMetrics.overallScore > bestQuality!.overallScore) {
          bestAsset = asset;
          bestQuality = qualityMetrics;
          generationLog.push(`✓ Новый лучший результат!`);
        }
        
        // Проверяем, достигли ли требуемого качества
        if (qualityMetrics.overallScore >= config.minQualityThreshold) {
          generationLog.push(`✅ Достигнуто требуемое качество!`);
          break;
        }
        
        if (attempt < config.maxAttempts) {
          generationLog.push(`⚠️ Качество ниже порога (${config.minQualityThreshold}), повторяем...`);
          
          // Применяем стратегию улучшения
          if (config.improvementStrategy === 'iterative') {
            await this.analyzeAndImprove(qualityMetrics, generationLog);
          }
        }
        
      } catch (error) {
        generationLog.push(`❌ Ошибка в попытке ${attempt}: ${error.message}`);
        this.logger.error(`Ошибка генерации спрайта (попытка ${attempt}):`, error);
      }
    }

    const duration = Date.now() - startTime;
    
    if (!bestAsset || !bestQuality) {
      throw new Error('Не удалось сгенерировать спрайт после всех попыток');
    }

    this.logger.info(`🎨 Спрайт сгенерирован за ${duration}ms. Качество: ${bestQuality.overallScore}/100`);
    
    // Сохраняем в историю для анализа
    this.saveGenerationHistory(description, {
      type: 'sprite',
      quality: bestQuality,
      attempts: config.maxAttempts,
      duration,
      style
    });

    return {
      asset: bestAsset,
      qualityMetrics: bestQuality,
      attemptsMade: config.maxAttempts,
      generationLog
    };
  }

  /**
   * Генерация высококачественного фона
   */
  public async generateHighQualityBackground(
    description: string,
    style: string = 'cartoon',
    size: '1792x1024' | '1024x1792' = '1792x1024',
    config: RegenerationConfig = {
      maxAttempts: 3,
      minQualityThreshold: 80,
      improvementStrategy: 'iterative'
    }
  ): Promise<{
    asset: AssetGenerationResult;
    qualityMetrics: AssetQualityMetrics;
    attemptsMade: number;
    generationLog: string[];
  }> {
    const generationLog: string[] = [];
    let bestAsset: AssetGenerationResult | null = null;
    let bestQuality: AssetQualityMetrics | null = null;

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        const enhancedPrompt = this.createEnhancedPrompt(
          description,
          style,
          'background',
          attempt,
          bestQuality?.issues || []
        );

        const asset = await this.generateBackgroundWithAdvancedPrompt(
          enhancedPrompt,
          style,
          size
        );

        const qualityMetrics = await this.evaluateAssetQuality(
          asset,
          description,
          style,
          'background'
        );

        if (!bestAsset || qualityMetrics.overallScore > bestQuality!.overallScore) {
          bestAsset = asset;
          bestQuality = qualityMetrics;
        }

        if (qualityMetrics.overallScore >= config.minQualityThreshold) {
          break;
        }
      } catch (error) {
        this.logger.error(`Ошибка генерации фона (попытка ${attempt}):`, error);
      }
    }

    if (!bestAsset || !bestQuality) {
      throw new Error('Не удалось сгенерировать фон');
    }

    return {
      asset: bestAsset,
      qualityMetrics: bestQuality,
      attemptsMade: config.maxAttempts,
      generationLog
    };
  }

  /**
   * Пакетная генерация ассетов с оптимизацией
   */
  public async generateAssetBatch(
    requests: Array<{
      type: 'sprite' | 'background' | 'ui' | 'icon';
      description: string;
      style: string;
      dimensions?: { width: number; height: number };
      priority: 'high' | 'medium' | 'low';
    }>
  ): Promise<Map<string, {
    asset: AssetGenerationResult;
    qualityMetrics: AssetQualityMetrics;
  }>> {
    const results = new Map();
    
    // Сортируем по приоритету
    const sortedRequests = requests.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    for (const request of sortedRequests) {
      try {
        let result;
        
        switch (request.type) {
          case 'sprite':
            result = await this.generateHighQualitySprite(
              request.description,
              request.style,
              request.dimensions
            );
            break;
          case 'background':
            result = await this.generateHighQualityBackground(
              request.description,
              request.style
            );
            break;
          default:
            // Для других типов используем базовую генерацию
            const asset = await this.openai.generateImage(
              request.description,
              request.style
            );
            const quality = await this.evaluateAssetQuality(
              asset,
              request.description,
              request.style,
              request.type
            );
            result = { asset, qualityMetrics: quality };
        }

        results.set(request.description, {
          asset: result.asset,
          qualityMetrics: result.qualityMetrics
        });

        this.emit('batch:progress', {
          completed: results.size,
          total: requests.length,
          current: request.description
        });

      } catch (error) {
        this.logger.error(`Ошибка генерации ассета "${request.description}":`, error);
      }
    }

    return results;
  }

  /**
   * Создание улучшенного промпта
   */
  private createEnhancedPrompt(
    description: string,
    style: string,
    assetType: string,
    attempt: number,
    previousIssues: string[] = []
  ): string {
    const template = this.promptTemplates.get(assetType);
    if (!template) {
      return description; // Fallback
    }

    let prompt = template.base
      .replace('{description}', description)
      .replace('{style}', style);

    // Добавляем модификаторы качества
    prompt += '\n\nТребования к качеству:\n';
    prompt += template.qualityModifiers.join('\n');

    // Добавляем стиль-специфичные требования
    if (template.styleSpecific[style]) {
      prompt += '\n\nСпецифичные требования для стиля:\n';
      prompt += template.styleSpecific[style];
    }

    // Добавляем технические требования
    prompt += '\n\nТехнические требования:\n';
    prompt += template.technicalRequirements.join('\n');

    // Исправляем предыдущие проблемы
    if (previousIssues.length > 0 && attempt > 1) {
      prompt += '\n\nИСПРАВИТЬ ПРОБЛЕМЫ ИЗ ПРЕДЫДУЩИХ ПОПЫТОК:\n';
      prompt += previousIssues.map(issue => `- ${issue}`).join('\n');
    }

    // Добавляем негативные промпты
    if (template.negativePrompts.length > 0) {
      prompt += '\n\nИЗБЕГАТЬ:\n';
      prompt += template.negativePrompts.join(', ');
    }

    return prompt;
  }

  /**
   * Оценка качества ассета
   */
  private async evaluateAssetQuality(
    asset: AssetGenerationResult,
    originalDescription: string,
    style: string,
    assetType: string
  ): Promise<AssetQualityMetrics> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // 1. Техническая оценка
    let technicalScore = 100;
    
    // Проверяем размер файла
    if (asset.data.length > 500 * 1024) { // 500KB
      technicalScore -= 20;
      issues.push('Размер файла слишком большой');
      recommendations.push('Оптимизировать сжатие изображения');
    }

    // Проверяем разрешение
    if (asset.metadata?.dimensions) {
      const { width, height } = asset.metadata.dimensions;
      if (width < 32 || height < 32) {
        technicalScore -= 15;
        issues.push('Слишком низкое разрешение');
      }
      if (width > 2048 || height > 2048) {
        technicalScore -= 10;
        issues.push('Избыточно высокое разрешение');
      }
    }

    // 2. Эстетическая оценка (упрощенная)
    let aestheticScore = 80; // Базовая оценка

    // Анализируем метаданные изображения
    try {
      const imageInfo = await sharp(asset.data).stats();
      
      // Проверяем контрастность
      const channels = imageInfo.channels;
      let avgVariance = 0;
      
      channels.forEach(channel => {
        avgVariance += channel.stdev || 0;
      });
      avgVariance /= channels.length;

      if (avgVariance < 20) {
        aestheticScore -= 15;
        issues.push('Низкий контраст изображения');
        recommendations.push('Увеличить контрастность и яркость');
      }

    } catch (error) {
      this.logger.warn('Не удалось проанализировать изображение:', error);
    }

    // 3. Соответствие игровому контексту
    let gameRelevanceScore = 85; // Базовая оценка

    // Проверяем соответствие стилю
    const styleKeywords = this.getStyleKeywords(style);
    const descriptionLower = originalDescription.toLowerCase();
    
    const matchingKeywords = styleKeywords.filter(keyword => 
      descriptionLower.includes(keyword)
    );
    
    if (matchingKeywords.length === 0) {
      gameRelevanceScore -= 10;
      recommendations.push(`Добавить элементы стиля ${style}`);
    }

    // Проверяем соответствие типу ассета
    if (assetType === 'sprite' && originalDescription.includes('background')) {
      gameRelevanceScore -= 20;
      issues.push('Несоответствие типа ассета описанию');
    }

    // Вычисляем общий счет
    const overallScore = Math.round(
      (technicalScore * 0.3 + aestheticScore * 0.4 + gameRelevanceScore * 0.3)
    );

    return {
      technicalScore: Math.max(0, technicalScore),
      aestheticScore: Math.max(0, aestheticScore),
      gameRelevanceScore: Math.max(0, gameRelevanceScore),
      overallScore: Math.max(0, overallScore),
      issues,
      recommendations
    };
  }

  /**
   * Генерация спрайта с продвинутым промптом
   */
  private async generateSpriteWithAdvancedPrompt(
    prompt: string,
    style: string,
    dimensions: { width: number; height: number }
  ): Promise<AssetGenerationResult> {
    const result = await this.openai.generateImage(prompt, style, '1024x1024');
    
    // Дополнительная обработка
    const processedBuffer = await this.postProcessSprite(result.data, dimensions, style);
    
    return {
      ...result,
      data: processedBuffer,
      metadata: {
        ...result.metadata,
        size: processedBuffer.length,
        dimensions,
        postProcessed: true
      }
    };
  }

  /**
   * Генерация фона с продвинутым промптом
   */
  private async generateBackgroundWithAdvancedPrompt(
    prompt: string,
    style: string,
    size: '1792x1024' | '1024x1792'
  ): Promise<AssetGenerationResult> {
    const result = await this.openai.generateImage(prompt, style, size);
    
    // Дополнительная обработка фона
    const processedBuffer = await this.postProcessBackground(result.data, style);
    
    return {
      ...result,
      data: processedBuffer,
      metadata: {
        ...result.metadata,
        size: processedBuffer.length,
        postProcessed: true
      }
    };
  }

  /**
   * Пост-обработка спрайта
   */
  private async postProcessSprite(
    imageBuffer: Buffer,
    targetDimensions: { width: number; height: number },
    style: string
  ): Promise<Buffer> {
    let processor = sharp(imageBuffer);

    // Изменяем размер
    processor = processor.resize(targetDimensions.width, targetDimensions.height, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    });

    // Применяем стиль-специфичную обработку
    switch (style.toLowerCase()) {
      case 'pixel art':
        processor = processor
          .sharpen(2, 1, 0.5) // Делаем края четче
          .modulate({ saturation: 1.2 }); // Увеличиваем насыщенность
        break;
      
      case 'cartoon':
        processor = processor
          .modulate({ saturation: 1.1, brightness: 1.05 })
          .sharpen(1, 1, 0.3);
        break;
      
      case 'realistic':
        processor = processor
          .sharpen(0.5, 1, 0.2)
          .modulate({ contrast: 1.05 });
        break;
    }

    // Оптимизируем для веба
    return processor
      .png({ 
        quality: 95,
        progressive: true,
        compressionLevel: 9 
      })
      .toBuffer();
  }

  /**
   * Пост-обработка фона
   */
  private async postProcessBackground(
    imageBuffer: Buffer,
    style: string
  ): Promise<Buffer> {
    let processor = sharp(imageBuffer);

    // Применяем обработку в зависимости от стиля
    switch (style.toLowerCase()) {
      case 'cartoon':
        processor = processor
          .modulate({ saturation: 1.15, brightness: 1.1 })
          .sharpen(0.8, 1, 0.4);
        break;
      
      case 'realistic':
        processor = processor
          .modulate({ contrast: 1.1 })
          .sharpen(0.6, 1, 0.3);
        break;
      
      case 'minimalist':
        processor = processor
          .modulate({ saturation: 0.8, brightness: 1.05 })
          .blur(0.3);
        break;
    }

    // Оптимизируем для веба
    return processor
      .jpeg({ 
        quality: 85,
        progressive: true 
      })
      .toBuffer();
  }

  /**
   * Анализ и улучшение для следующей попытки
   */
  private async analyzeAndImprove(
    qualityMetrics: AssetQualityMetrics,
    generationLog: string[]
  ): Promise<void> {
    if (qualityMetrics.technicalScore < 70) {
      generationLog.push('📈 Стратегия: Фокус на технических улучшениях');
    }
    
    if (qualityMetrics.aestheticScore < 70) {
      generationLog.push('🎨 Стратегия: Улучшение эстетики и стиля');
    }
    
    if (qualityMetrics.gameRelevanceScore < 70) {
      generationLog.push('🎮 Стратегия: Лучшее соответствие игровому контексту');
    }

    // Небольшая задержка для API лимитов
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  /**
   * Инициализация шаблонов промптов
   */
  private initializePromptTemplates(): void {
    // Шаблон для спрайтов
    this.promptTemplates.set('sprite', {
      base: `Create a high-quality game sprite: {description}
Style: {style}
This is a game character/object sprite that needs to be clearly recognizable and visually appealing.`,
      
      qualityModifiers: [
        '- Professional game art quality',
        '- Clear, crisp edges and details',
        '- Consistent lighting and shading',
        '- Vibrant, game-appropriate colors',
        '- High contrast for visibility',
        '- Clean transparent background',
        '- Optimized for game performance'
      ],
      
      styleSpecific: {
        'pixel art': 'Perfect pixel alignment, limited color palette, retro gaming aesthetic, no anti-aliasing',
        'cartoon': 'Bold outlines, exaggerated features, bright colors, friendly appearance',
        'realistic': 'Detailed textures, realistic proportions, proper lighting, high detail',
        'minimalist': 'Simple shapes, limited colors, clean design, geometric forms'
      },
      
      technicalRequirements: [
        '- Centered composition',
        '- Appropriate scale and proportions',
        '- Suitable for gameplay visibility',
        '- Consistent art direction',
        '- Game-engine friendly format'
      ],
      
      negativePrompts: [
        'blurry', 'low quality', 'distorted', 'incomplete', 'watermark',
        'text overlay', 'multiple objects', 'cluttered background'
      ]
    });

    // Шаблон для фонов
    this.promptTemplates.set('background', {
      base: `Create a stunning game background: {description}
Style: {style}
This background should create atmosphere and immersion for the game environment.`,
      
      qualityModifiers: [
        '- Cinematic composition',
        '- Rich atmospheric details',
        '- Professional game environment art',
        '- Immersive and engaging',
        '- Optimized color palette',
        '- Clear depth and perspective',
        '- Seamless tiling potential'
      ],
      
      styleSpecific: {
        'cartoon': 'Whimsical, colorful, inviting atmosphere, rounded shapes',
        'realistic': 'Photorealistic details, natural lighting, environmental storytelling',
        'pixel art': 'Retro gaming aesthetic, limited colors, chunky details',
        'minimalist': 'Clean composition, simple forms, harmonious colors'
      },
      
      technicalRequirements: [
        '- Horizontal game format',
        '- No distracting elements in foreground',
        '- Suitable for UI overlay',
        '- Performance-optimized composition',
        '- Clear focal hierarchy'
      ],
      
      negativePrompts: [
        'characters', 'text', 'UI elements', 'cluttered', 'chaotic',
        'low resolution', 'pixelated', 'distorted perspective'
      ]
    });

    this.logger.info('📝 Инициализированы шаблоны промптов для улучшенной генерации');
  }

  /**
   * Получение ключевых слов для стиля
   */
  private getStyleKeywords(style: string): string[] {
    const keywords: Record<string, string[]> = {
      'pixel art': ['pixel', 'retro', '8-bit', '16-bit', 'blocky', 'chunky'],
      'cartoon': ['cartoon', 'animated', 'colorful', 'whimsical', 'rounded'],
      'realistic': ['realistic', 'detailed', 'photorealistic', 'natural'],
      'minimalist': ['simple', 'clean', 'minimal', 'geometric', 'modern']
    };
    
    return keywords[style.toLowerCase()] || [];
  }

  /**
   * Сохранение истории генерации для анализа
   */
  private saveGenerationHistory(key: string, data: any): void {
    if (!this.generationHistory.has(key)) {
      this.generationHistory.set(key, []);
    }
    
    const history = this.generationHistory.get(key)!;
    history.push({
      timestamp: new Date(),
      ...data
    });
    
    // Ограничиваем историю последними 50 записями
    if (history.length > 50) {
      history.splice(0, history.length - 50);
    }
  }

  /**
   * Получение статистики качества
   */
  public getQualityStatistics(): {
    averageQuality: number;
    totalGenerated: number;
    qualityDistribution: Record<string, number>;
    topIssues: Array<{ issue: string; count: number }>;
  } {
    let totalQuality = 0;
    let totalCount = 0;
    const qualityBins = { excellent: 0, good: 0, average: 0, poor: 0 };
    const issueCount = new Map<string, number>();

    for (const history of this.generationHistory.values()) {
      for (const record of history) {
        if (record.quality?.overallScore) {
          totalQuality += record.quality.overallScore;
          totalCount++;

          // Распределение качества
          const score = record.quality.overallScore;
          if (score >= 90) qualityBins.excellent++;
          else if (score >= 75) qualityBins.good++;
          else if (score >= 60) qualityBins.average++;
          else qualityBins.poor++;

          // Подсчет проблем
          if (record.quality.issues) {
            for (const issue of record.quality.issues) {
              issueCount.set(issue, (issueCount.get(issue) || 0) + 1);
            }
          }
        }
      }
    }

    const topIssues = Array.from(issueCount.entries())
      .map(([issue, count]) => ({ issue, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      averageQuality: totalCount > 0 ? Math.round(totalQuality / totalCount) : 0,
      totalGenerated: totalCount,
      qualityDistribution: qualityBins,
      topIssues
    };
  }

  /**
   * Инициализация стратегий улучшения промптов
   */
  private initializeImprovementStrategies(): void {
    this.improvementStrategies = [
      {
        name: 'enhance_technical_quality',
        description: 'Улучшение технического качества ассета',
        modifications: [
          'high resolution',
          'sharp details',
          'clean lines',
          'professional quality',
          'optimized for gaming'
        ],
        applicableIssues: ['Размер файла слишком большой', 'Слишком низкое разрешение'],
        successRate: 0.75
      },
      {
        name: 'improve_aesthetic',
        description: 'Улучшение эстетических качеств',
        modifications: [
          'vibrant colors',
          'high contrast',
          'visually appealing',
          'well-balanced composition',
          'eye-catching design'
        ],
        applicableIssues: ['Низкий контраст изображения'],
        successRate: 0.68
      },
      {
        name: 'enhance_game_relevance',
        description: 'Улучшение соответствия игровому контексту',
        modifications: [
          'game-ready asset',
          'suitable for mobile gaming',
          'consistent art style',
          'clear visual hierarchy'
        ],
        applicableIssues: ['Несоответствие типа ассета описанию'],
        successRate: 0.82
      },
      {
        name: 'style_consistency',
        description: 'Улучшение стилевой согласованности',
        modifications: [
          'consistent style',
          'unified color palette',
          'matching art direction',
          'cohesive visual design'
        ],
        applicableIssues: [],
        successRate: 0.71
      },
      {
        name: 'detail_enhancement',
        description: 'Увеличение детализации',
        modifications: [
          'highly detailed',
          'intricate design',
          'fine details',
          'rich textures',
          'complex patterns'
        ],
        applicableIssues: [],
        successRate: 0.65
      }
    ];
  }

  /**
   * Автоматическая регенерация неудачного ассета
   */
  public async regenerateFailedAsset(
    originalAsset: AssetGenerationResult,
    qualityMetrics: AssetQualityMetrics,
    originalDescription: string,
    style: string,
    assetType: string
  ): Promise<{
    newAsset: AssetGenerationResult;
    newQualityMetrics: AssetQualityMetrics;
    regenerationLog: string[];
    improvementAchieved: boolean;
  }> {
    const regenerationId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const regenerationLog: string[] = [];
    
    this.logger.info(`🔄 Начинаем автоматическую регенерацию для качества ${qualityMetrics.overallScore}`);
    regenerationLog.push(`Исходное качество: ${qualityMetrics.overallScore}/100`);
    regenerationLog.push(`Проблемы: ${qualityMetrics.issues.join(', ')}`);

    // Анализируем проблемы и выбираем стратегии улучшения
    const applicableStrategies = this.selectImprovementStrategies(qualityMetrics.issues);
    regenerationLog.push(`Выбранные стратегии: ${applicableStrategies.map(s => s.name).join(', ')}`);

    // Создаем улучшенный промпт
    const improvedPrompt = this.createImprovedPrompt(
      originalDescription, 
      style, 
      assetType,
      qualityMetrics,
      applicableStrategies
    );
    
    regenerationLog.push(`Улучшенный промпт: ${improvedPrompt.substring(0, 150)}...`);

    // Генерируем новый ассет
    let newAsset: AssetGenerationResult;
    let newQualityMetrics: AssetQualityMetrics;

    try {
      if (assetType === 'sprite') {
        newAsset = await this.openai.generateSprite(improvedPrompt, style);
      } else if (assetType === 'background') {
        newAsset = await this.openai.generateBackground(improvedPrompt, style);
      } else {
        newAsset = await this.openai.generateImage(improvedPrompt, style);
      }

      // Оцениваем качество нового ассета
      newQualityMetrics = await this.evaluateAssetQuality(
        newAsset,
        originalDescription,
        style,
        assetType
      );

      regenerationLog.push(`Новое качество: ${newQualityMetrics.overallScore}/100`);

      const improvementAchieved = newQualityMetrics.overallScore > qualityMetrics.overallScore;
      const qualityDelta = newQualityMetrics.overallScore - qualityMetrics.overallScore;
      
      regenerationLog.push(
        improvementAchieved 
          ? `✅ Улучшение на ${qualityDelta} баллов`
          : `❌ Улучшения не достигнуто (${qualityDelta} баллов)`
      );

      // Обновляем статистику
      this.updateRegenerationStats(
        qualityMetrics.overallScore,
        newQualityMetrics.overallScore,
        applicableStrategies,
        improvementAchieved
      );

      // Сохраняем историю регенерации
      this.saveRegenerationHistory(regenerationId, {
        assetId: regenerationId,
        originalDescription,
        originalQuality: qualityMetrics.overallScore,
        attempts: [{
          attemptNumber: 1,
          timestamp: new Date(),
          qualityBefore: qualityMetrics.overallScore,
          qualityAfter: newQualityMetrics.overallScore,
          promptModifications: applicableStrategies.map(s => s.name),
          success: improvementAchieved,
          failureReasons: improvementAchieved ? [] : newQualityMetrics.issues
        }],
        finalQuality: newQualityMetrics.overallScore,
        totalRegenerations: 1,
        averageImprovementPerAttempt: qualityDelta,
        successRate: improvementAchieved ? 1 : 0
      });

      return {
        newAsset,
        newQualityMetrics,
        regenerationLog,
        improvementAchieved
      };

    } catch (error) {
      regenerationLog.push(`❌ Ошибка регенерации: ${error.message}`);
      this.logger.error('Ошибка автоматической регенерации:', error);
      throw error;
    }
  }

  /**
   * Выбор стратегий улучшения на основе проблем
   */
  private selectImprovementStrategies(issues: string[]): PromptImprovementStrategy[] {
    const selectedStrategies: PromptImprovementStrategy[] = [];
    
    for (const issue of issues) {
      const relevantStrategies = this.improvementStrategies.filter(strategy => 
        strategy.applicableIssues.includes(issue)
      );
      
      // Выбираем стратегию с наибольшим success rate
      if (relevantStrategies.length > 0) {
        const bestStrategy = relevantStrategies.reduce((best, current) => 
          current.successRate > best.successRate ? current : best
        );
        
        if (!selectedStrategies.find(s => s.name === bestStrategy.name)) {
          selectedStrategies.push(bestStrategy);
        }
      }
    }

    // Если нет специфичных стратегий, добавляем общие
    if (selectedStrategies.length === 0) {
      selectedStrategies.push(
        this.improvementStrategies.find(s => s.name === 'enhance_technical_quality')!,
        this.improvementStrategies.find(s => s.name === 'improve_aesthetic')!
      );
    }

    return selectedStrategies;
  }

  /**
   * Создание улучшенного промпта
   */
  private createImprovedPrompt(
    originalDescription: string,
    style: string,
    assetType: string,
    qualityMetrics: AssetQualityMetrics,
    strategies: PromptImprovementStrategy[]
  ): string {
    let improvedPrompt = originalDescription;

    // Добавляем модификации из стратегий
    const modifications = strategies.flatMap(strategy => strategy.modifications);
    
    improvedPrompt += `. ТРЕБОВАНИЯ К КАЧЕСТВУ: ${modifications.join(', ')}.`;
    
    // Добавляем специфичные улучшения на основе рекомендаций
    if (qualityMetrics.recommendations.length > 0) {
      improvedPrompt += ` УЛУЧШЕНИЯ: ${qualityMetrics.recommendations.join(', ')}.`;
    }

    // Добавляем технические требования
    improvedPrompt += ' ТЕХНИЧЕСКИЕ ПАРАМЕТРЫ: high resolution, optimized file size, game-ready format.';

    return improvedPrompt;
  }

  /**
   * Обновление статистики регенерации
   */
  private updateRegenerationStats(
    oldQuality: number,
    newQuality: number,
    strategies: PromptImprovementStrategy[],
    success: boolean
  ): void {
    this.regenerationStats.totalRegenerations++;
    
    if (success) {
      this.regenerationStats.successfulRegenerations++;
      const improvement = newQuality - oldQuality;
      
      // Обновляем средний показатель улучшения
      const totalImprovement = this.regenerationStats.averageQualityImprovement * 
        (this.regenerationStats.successfulRegenerations - 1) + improvement;
      this.regenerationStats.averageQualityImprovement = 
        totalImprovement / this.regenerationStats.successfulRegenerations;
    }

    // Обновляем статистику стратегий
    strategies.forEach(strategy => {
      const current = this.regenerationStats.bestStrategies.get(strategy.name) || 0;
      this.regenerationStats.bestStrategies.set(strategy.name, current + (success ? 1 : 0));
    });
  }

  /**
   * Сохранение истории регенерации
   */
  private saveRegenerationHistory(id: string, history: RegenerationHistory): void {
    this.regenerationHistory.set(id, history);
    
    // Ограничиваем историю последними 100 записями
    if (this.regenerationHistory.size > 100) {
      const firstKey = this.regenerationHistory.keys().next().value;
      this.regenerationHistory.delete(firstKey);
    }
  }

  /**
   * Проверка необходимости автоматической регенерации
   */
  public shouldTriggerAutoRegeneration(
    qualityMetrics: AssetQualityMetrics,
    config: RegenerationConfig
  ): boolean {
    if (!config.enableAutoRegeneration) {
      return false;
    }

    for (const trigger of config.regenerationTriggers) {
      switch (trigger.type) {
        case 'quality_threshold':
          if (trigger.threshold && qualityMetrics.overallScore < trigger.threshold) {
            return true;
          }
          break;
        case 'technical_issue':
          if (qualityMetrics.issues.some(issue => 
            issue.includes('размер') || issue.includes('разрешение'))) {
            return true;
          }
          break;
        case 'style_mismatch':
          if (qualityMetrics.gameRelevanceScore < 60) {
            return true;
          }
          break;
      }
    }

    return false;
  }

  /**
   * Получение статистики регенерации
   */
  public getRegenerationStats() {
    const successRate = this.regenerationStats.totalRegenerations > 0 
      ? this.regenerationStats.successfulRegenerations / this.regenerationStats.totalRegenerations
      : 0;

    const topStrategies = Array.from(this.regenerationStats.bestStrategies.entries())
      .map(([name, successes]) => ({ name, successes }))
      .sort((a, b) => b.successes - a.successes)
      .slice(0, 5);

    return {
      totalRegenerations: this.regenerationStats.totalRegenerations,
      successRate: Math.round(successRate * 100),
      averageQualityImprovement: Math.round(this.regenerationStats.averageQualityImprovement),
      topStrategies,
      mostCommonIssues: Array.from(this.regenerationStats.mostCommonIssues.entries())
        .map(([issue, count]) => ({ issue, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
    };
  }

  /**
   * Ручная регенерация ассета с пользовательскими параметрами
   */
  public async manualRegeneration(
    originalDescription: string,
    style: string,
    assetType: string,
    customPromptAdditions: string[] = [],
    maxAttempts: number = 3
  ): Promise<{
    assets: AssetGenerationResult[];
    qualityMetrics: AssetQualityMetrics[];
    bestAssetIndex: number;
    regenerationLog: string[];
  }> {
    const regenerationLog: string[] = [];
    const assets: AssetGenerationResult[] = [];
    const qualityMetrics: AssetQualityMetrics[] = [];
    
    regenerationLog.push(`🔄 Ручная регенерация: ${assetType} "${originalDescription}"`);
    regenerationLog.push(`Пользовательские дополнения: ${customPromptAdditions.join(', ')}`);

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        regenerationLog.push(`\n--- Попытка ${attempt}/${maxAttempts} ---`);
        
        // Создаем промпт с пользовательскими дополнениями
        let enhancedPrompt = originalDescription;
        if (customPromptAdditions.length > 0) {
          enhancedPrompt += `. ${customPromptAdditions.join(', ')}.`;
        }
        
        // Генерируем вариант с разной рандомизацией
        enhancedPrompt += ` Вариант ${attempt}, уникальная интерпретация.`;
        
        regenerationLog.push(`Промпт: ${enhancedPrompt.substring(0, 100)}...`);
        
        // Генерируем ассет
        let asset: AssetGenerationResult;
        if (assetType === 'sprite') {
          asset = await this.openai.generateSprite(enhancedPrompt, style);
        } else if (assetType === 'background') {
          asset = await this.openai.generateBackground(enhancedPrompt, style);
        } else {
          asset = await this.openai.generateImage(enhancedPrompt, style);
        }
        
        // Оцениваем качество
        const quality = await this.evaluateAssetQuality(
          asset,
          originalDescription,
          style,
          assetType
        );
        
        assets.push(asset);
        qualityMetrics.push(quality);
        
        regenerationLog.push(`Качество: ${quality.overallScore}/100`);
        
      } catch (error) {
        regenerationLog.push(`❌ Ошибка в попытке ${attempt}: ${error.message}`);
        this.logger.error(`Ошибка ручной регенерации (попытка ${attempt}):`, error);
      }
    }

    // Находим лучший результат
    let bestAssetIndex = 0;
    let bestQuality = 0;
    
    qualityMetrics.forEach((quality, index) => {
      if (quality.overallScore > bestQuality) {
        bestQuality = quality.overallScore;
        bestAssetIndex = index;
      }
    });

    regenerationLog.push(`\n✅ Лучший результат: вариант ${bestAssetIndex + 1} с качеством ${bestQuality}/100`);

    return {
      assets,
      qualityMetrics,
      bestAssetIndex,
      regenerationLog
    };
  }
} 
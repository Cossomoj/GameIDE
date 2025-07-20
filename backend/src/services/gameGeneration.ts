import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import archiver from 'archiver';
import config from '@/config';
import { LoggerService } from './logger';
import { DeepSeekService } from './ai/deepseek';
import { OpenAIService } from './ai/openai';
import { EnhancedAssetGeneration } from './enhancedAssetGeneration';
import { enhancedLocalizationService } from './enhancedLocalization';
import { getQualityMonitoringInstance } from '../routes/qualityMonitoring';
import { YandexValidator } from './validator';
import { BuildService } from './build';
import { templateManager } from '../../templates/games';
import { 
  GenerationRequest, 
  GameDesign, 
  BuildResult, 
  AssetRequirement,
  FileStructure 
} from '@/types';
import { GenerationError } from '@/middleware/errorHandler';

export type ProgressCallback = (step: string, progress: number, logs?: string[]) => void;

export class GameGenerationPipeline {
  private logger: LoggerService;
  private deepseek: DeepSeekService;
  private openai: OpenAIService;
  private enhancedAssetGen: EnhancedAssetGeneration;
  private validator: YandexValidator;
  private buildService: BuildService;

  constructor() {
    this.logger = new LoggerService();
    this.deepseek = new DeepSeekService();
    this.openai = new OpenAIService();
    this.enhancedAssetGen = new EnhancedAssetGeneration();
    this.validator = new YandexValidator();
    this.buildService = new BuildService();
  }

  public async execute(
    request: GenerationRequest,
    onProgress: ProgressCallback
  ): Promise<BuildResult> {
    const gameId = request.id;
    const startTime = Date.now();

    try {
      this.logger.generationStart(gameId, request.prompt);

      // 1. Анализ и обогащение промпта (5%)
      onProgress('Анализ промпта', 5, ['Анализируем требования к игре...']);
      const enrichedPrompt = await this.enrichPrompt(request.prompt);
      
      // Валидация анализа промпта
      const promptValid = await this.validateGenerationStep('prompt_analysis', enrichedPrompt);
      if (!promptValid) {
        throw new GenerationError('Промпт не прошел валидацию', 'prompt_analysis', enrichedPrompt);
      }

      // 2. Генерация Game Design Document (15%)
      onProgress('Создание дизайна игры', 15, ['Генерируем концепцию и механики...']);
      const gameDesign = await this.generateGameDesign(enrichedPrompt);
      
      // Валидация дизайна игры
      const designValid = await this.validateGenerationStep('game_design', gameDesign);
      if (!designValid) {
        throw new GenerationError('Дизайн игры не прошел валидацию', 'game_design', gameDesign);
      }

      // 2.5. Автоматическая локализация игрового контента (20%)
      let localizedDesign = gameDesign;
      if (request.localization?.enabled && request.localization?.targetLanguages?.length > 0) {
        onProgress('Локализация игрового контента', 20, [
          'Переводим контент игры на выбранные языки...',
          `Целевые языки: ${request.localization.targetLanguages.join(', ')}`
        ]);
        
        try {
          localizedDesign = await this.localizeGameContent(gameDesign, request.localization);
          this.logger.info('Автоматическая локализация завершена', {
            gameId,
            sourceLanguage: request.localization.sourceLanguage || 'ru',
            targetLanguages: request.localization.targetLanguages
          });
        } catch (error) {
          this.logger.warn('Ошибка локализации, продолжаем без перевода', { error, gameId });
          // Продолжаем выполнение без локализации
        }
      }

      // 3. Создание структуры проекта (25%)
      onProgress('Создание структуры проекта', 25, ['Создаем файловую структуру...']);
      const projectStructure = await this.createProjectStructure(localizedDesign);

      // 4. Генерация кода игры (50%)
      onProgress('Генерация кода', 50, ['Создаем код игры с помощью AI...']);
      const gameCode = await this.generateGameCode(localizedDesign);
      
      // Валидация сгенерированного кода
      const codeValid = await this.validateGenerationStep('code_generation', gameCode);
      if (!codeValid) {
        this.logger.warn('⚠️ Сгенерированный код имеет проблемы, но продолжаем...');
        onProgress('Генерация кода', 52, ['⚠️ Обнаружены проблемы в коде, исправляем...']);
        // Здесь можно добавить логику исправления кода
      }

      // 5. Генерация ассетов (70%)
      onProgress('Генерация ассетов', 70, ['Создаем графику и звуки...']);
      const assets = await this.generateAssets(localizedDesign);
      
      // Валидация ассетов
      const assetsValid = await this.validateGenerationStep('assets_generation', assets);
      if (!assetsValid) {
        this.logger.warn('⚠️ Проблемы с ассетами, но продолжаем...');
        onProgress('Генерация ассетов', 72, ['⚠️ Некоторые ассеты могут быть неоптимальными']);
      }

      // 6. Интеграция Yandex SDK (80%)
      onProgress('Интеграция Yandex SDK', 80, ['Добавляем интеграцию с платформой...']);
      const integratedCode = await this.integrateYandexSDK(gameCode, localizedDesign);

      // 7. Сборка проекта (90%)
      onProgress('Сборка проекта', 90, ['Собираем финальную версию игры...']);
      const buildResult = await this.buildProject(
        gameId,
        projectStructure,
        integratedCode,
        assets,
        localizedDesign
      );

      // 8. Расширенная валидация (95%)
      onProgress('Расширенная валидация', 95, ['Проверяем соответствие требованиям...']);
      const validationResult = await this.validateGameWithDetails(buildResult, localizedDesign);
      
      // Если есть критические ошибки валидации, останавливаем процесс
      if (validationResult.criticalErrors.length > 0) {
        throw new GenerationError(
          `Критические ошибки валидации: ${validationResult.criticalErrors.join(', ')}`,
          'validation',
          validationResult
        );
      }

      // 9. Создание архива (100%)
      onProgress('Создание архива', 100, ['Упаковываем игру для скачивания...']);
      const finalResult = await this.createGameArchive(buildResult);
      
      // Добавляем результаты валидации к финальному результату
      finalResult.validationResults = validationResult;

      const duration = Date.now() - startTime;
      this.logger.generationComplete(gameId, duration, finalResult.size);

      // Отправляем общую метрику качества игры в real-time мониторинг
      try {
        const qualityMonitor = getQualityMonitoringInstance();
        const overallScore = validationResult?.score || 0;
        
        qualityMonitor.addQualityMetric({
          type: 'game_generation',
          qualityScore: overallScore,
          details: {
            technicalScore: validationResult?.qualityMetrics?.codeQuality || 0,
            performanceScore: validationResult?.qualityMetrics?.performanceScore || 0,
            gameRelevanceScore: validationResult?.qualityMetrics?.yandexCompliance || 0,
            issues: validationResult?.criticalErrors || [],
            recommendations: validationResult?.recommendations || []
          },
          metadata: {
            gameId: gameId,
            generationTime: duration,
            aiModel: 'deepseek',
            promptLength: JSON.stringify(request).length,
            retryCount: 0
          }
        });
      } catch (error) {
        this.logger.warn('Ошибка отправки метрики качества игры:', error);
      }

      return finalResult;

    } catch (error) {
      this.logger.generationError(gameId, 'pipeline', error);
      throw new GenerationError(
        `Ошибка генерации игры: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        'pipeline',
        error
      );
    }
  }

  private async enrichPrompt(prompt: any): Promise<any> {
    // Добавляем дополнительную информацию к промпту
    return {
      ...prompt,
      targetPlatform: 'yandex_games',
      technicalRequirements: {
        maxSize: config.yandexGames.maxSize,
        targetSize: config.yandexGames.targetSize,
        supportedFormats: config.yandexGames.supportedFormats,
        sdkVersion: config.yandexGames.requiredSDKVersion,
      },
    };
  }

  private async generateGameDesign(prompt: any): Promise<GameDesign> {
    try {
      const response = await this.deepseek.generateGameDesign(
        `Создай игру "${prompt.title}" в жанре "${prompt.genre}": ${prompt.description}`
      );

      // Парсим JSON ответ
      const designJson = this.extractJsonFromResponse(response.content);
      
      if (!designJson) {
        throw new Error('Не удалось извлечь JSON из ответа AI');
      }

      return designJson as GameDesign;
      
    } catch (error) {
      throw new GenerationError('Ошибка генерации дизайна игры', 'game_design', error);
    }
  }

  private async createProjectStructure(gameDesign: GameDesign): Promise<FileStructure> {
    const structure: FileStructure = {
      'index.html': '',
      'game.js': '',
      'style.css': '',
      'manifest.json': '',
      'assets/': {
        'sprites/': {},
        'backgrounds/': {},
        'ui/': {},
        'sounds/': {},
      },
      'src/': {
        'scenes/': {},
        'objects/': {},
        'utils/': {},
      },
    };

    return structure;
  }

  private async generateGameCode(gameDesign: GameDesign): Promise<{ [filename: string]: string }> {
    const code: { [filename: string]: string } = {};

    try {
      // Проверяем, есть ли шаблон для данного жанра
      const template = templateManager.getTemplate(gameDesign.genre);
      
      if (template) {
        // Используем шаблон для генерации игры
        this.logger.logInfo('generation', `Используем шаблон для жанра: ${gameDesign.genre}`);
        
        const gamePrompt = {
          title: gameDesign.title,
          genre: gameDesign.genre,
          description: gameDesign.description,
          artStyle: gameDesign.artStyle,
          targetAudience: gameDesign.targetAudience,
          monetization: gameDesign.monetization
        };

        const templateResult = template.generateCode(gamePrompt, gameDesign);
        
        code['index.html'] = templateResult.html;
        code['game.js'] = templateResult.js;
        code['style.css'] = templateResult.css;
        
      } else {
        // Fallback к генерации через AI
        this.logger.logWarn('generation', `Шаблон для жанра ${gameDesign.genre} не найден, используем AI генерацию`);
        
        // Генерируем основной HTML файл
        code['index.html'] = await this.generateHTML(gameDesign);

        // Генерируем основной JavaScript файл
        const mainJsResponse = await this.deepseek.generateCode(
          `Создай основной JavaScript файл для игры "${gameDesign.title}" с использованием Phaser 3`,
          this.getMainJSSystemPrompt()
        );
        code['game.js'] = mainJsResponse.content;

        // Генерируем CSS
        code['style.css'] = await this.generateCSS(gameDesign);
      }

      // Генерируем manifest.json (всегда одинаковый)
      code['manifest.json'] = await this.generateManifest(gameDesign);

      return code;

    } catch (error) {
      throw new GenerationError('Ошибка генерации кода игры', 'code_generation', error);
    }
  }

  private async generateAssets(gameDesign: GameDesign): Promise<{ [path: string]: Buffer }> {
    const assets: { [path: string]: Buffer } = {};
    const qualityReports: any[] = [];

    try {
      this.logger.info(`🎨 Начало улучшенной генерации ассетов для "${gameDesign.title}"`);
      
      // Проверяем, есть ли шаблон для генерации ассетов
      const templateAssets = templateManager.generateAssets(gameDesign.genre, gameDesign);
      
      if (templateAssets) {
        this.logger.info(`📋 Используем шаблон ассетов для жанра: ${gameDesign.genre}`);
        
        // Подготавливаем пакетные запросы для оптимизации
        const assetRequests = [];
        
        // Добавляем спрайты
        for (const spriteReq of templateAssets.sprites) {
          assetRequests.push({
            type: 'sprite' as const,
            description: spriteReq.prompt,
            style: gameDesign.artStyle || 'pixel art',
            dimensions: { width: 64, height: 64 },
            priority: 'high' as const,
            name: spriteReq.name,
            category: 'sprites'
          });
        }

        // Добавляем фоны
        for (const backgroundReq of templateAssets.backgrounds) {
          assetRequests.push({
            type: 'background' as const,
            description: backgroundReq.prompt,
            style: gameDesign.artStyle || 'cartoon',
            priority: 'medium' as const,
            name: backgroundReq.name,
            category: 'backgrounds'
          });
        }

        // Пакетная генерация высококачественных ассетов
        this.logger.info(`🚀 Запуск пакетной генерации ${assetRequests.length} ассетов...`);
        
        // Настраиваем слушатель прогресса
        this.enhancedAssetGen.on('batch:progress', (progress) => {
          this.logger.info(`📊 Прогресс генерации: ${progress.completed}/${progress.total} (текущий: ${progress.current})`);
        });

        const results = await this.enhancedAssetGen.generateAssetBatch(assetRequests);
        
        // Обрабатываем результаты
        for (const [description, result] of results.entries()) {
          const request = assetRequests.find(req => req.description === description);
          if (request) {
            const assetPath = `assets/${request.category}/${request.name}.png`;
            assets[assetPath] = result.asset.data;
            
            qualityReports.push({
              name: request.name,
              type: request.type,
              quality: result.qualityMetrics,
              path: assetPath
            });

            this.logger.info(`✅ ${request.name}: ${result.qualityMetrics.overallScore}/100 качество`);
            
            // Отправляем метрику качества в real-time мониторинг
            try {
              const qualityMonitor = getQualityMonitoringInstance();
              qualityMonitor.addQualityMetric({
                type: 'asset_generation',
                subType: request.type,
                qualityScore: result.qualityMetrics.overallScore,
                details: {
                  technicalScore: result.qualityMetrics.technicalScore,
                  aestheticScore: result.qualityMetrics.aestheticScore,
                  gameRelevanceScore: result.qualityMetrics.gameRelevanceScore,
                  issues: result.qualityMetrics.issues,
                  recommendations: result.qualityMetrics.recommendations
                },
                metadata: {
                  gameId: gameId,
                  assetId: request.name,
                  generationTime: Date.now() - startTime,
                  aiModel: 'openai',
                  promptLength: description.length,
                  retryCount: 0
                }
              });
            } catch (error) {
              this.logger.warn('Ошибка отправки метрики качества:', error);
            }
          }
        }

        // Генерируем звуки (пока используем стандартную генерацию)
        for (const soundReq of templateAssets.sounds) {
          try {
            const result = await this.openai.generateSound(
              soundReq.prompt,
              1000
            );
            assets[`assets/sounds/${soundReq.name}.wav`] = result.data;
            
            this.logger.info(`🎵 Звук "${soundReq.name}" сгенерирован`);
          } catch (error) {
            this.logger.warn(`⚠️ Ошибка генерации звука ${soundReq.name}: ${error.message}`);
          }
        }
        
      } else {
        // Fallback к улучшенной генерации через стандартные ассеты
        this.logger.warn(`📝 Шаблон ассетов для жанра ${gameDesign.genre} не найден, используем адаптивную генерацию`);
        
        // Генерируем спрайты с высоким качеством
        for (const asset of gameDesign.assets.filter(a => a.type === 'sprite')) {
          try {
            const result = await this.enhancedAssetGen.generateHighQualitySprite(
              asset.description,
              asset.style || gameDesign.artStyle || 'pixel art',
              asset.dimensions || { width: 64, height: 64 },
              {
                maxAttempts: 2, // Быстрее для fallback
                minQualityThreshold: 70,
                improvementStrategy: 'iterative'
              }
            );
            
            assets[`assets/sprites/${asset.name}.png`] = result.asset.data;
            qualityReports.push({
              name: asset.name,
              type: 'sprite',
              quality: result.qualityMetrics,
              attempts: result.attemptsMade
            });

            this.logger.info(`✅ Спрайт "${asset.name}": ${result.qualityMetrics.overallScore}/100`);
          } catch (error) {
            this.logger.error(`❌ Критическая ошибка генерации спрайта ${asset.name}:`, error);
            // Fallback к обычной генерации
            try {
              const fallbackResult = await this.openai.generateSprite(
                asset.description,
                asset.style || gameDesign.artStyle || 'pixel art',
                asset.dimensions || { width: 64, height: 64 }
              );
              assets[`assets/sprites/${asset.name}.png`] = fallbackResult.data;
              this.logger.info(`🔄 Fallback спрайт "${asset.name}" сгенерирован`);
            } catch (fallbackError) {
              this.logger.error(`💥 Полный провал генерации спрайта ${asset.name}:`, fallbackError);
            }
          }
        }

        // Генерируем фоны с высоким качеством
        for (const asset of gameDesign.assets.filter(a => a.type === 'background')) {
          try {
            const result = await this.enhancedAssetGen.generateHighQualityBackground(
              asset.description,
              asset.style || gameDesign.artStyle || 'cartoon',
              '1792x1024',
              {
                maxAttempts: 2,
                minQualityThreshold: 75,
                improvementStrategy: 'iterative'
              }
            );
            
            assets[`assets/backgrounds/${asset.name}.png`] = result.asset.data;
            qualityReports.push({
              name: asset.name,
              type: 'background',
              quality: result.qualityMetrics,
              attempts: result.attemptsMade
            });

            this.logger.info(`✅ Фон "${asset.name}": ${result.qualityMetrics.overallScore}/100`);
          } catch (error) {
            this.logger.error(`❌ Ошибка генерации фона ${asset.name}:`, error);
            // Fallback к обычной генерации
            try {
              const fallbackResult = await this.openai.generateBackground(
                asset.description,
                asset.style || gameDesign.artStyle || 'cartoon'
              );
              assets[`assets/backgrounds/${asset.name}.png`] = fallbackResult.data;
              this.logger.info(`🔄 Fallback фон "${asset.name}" сгенерирован`);
            } catch (fallbackError) {
              this.logger.error(`💥 Полный провал генерации фона ${asset.name}:`, fallbackError);
            }
          }
        }

        // Генерируем UI элементы (базовая генерация)
        for (const asset of gameDesign.assets.filter(a => a.type === 'ui')) {
          try {
            const result = await this.openai.generateUIElement(
              asset.name,
              asset.style || gameDesign.artStyle || 'modern',
              asset.description
            );
            assets[`assets/ui/${asset.name}.png`] = result.data;
            this.logger.info(`🎛️ UI элемент "${asset.name}" сгенерирован`);
          } catch (error) {
            this.logger.warn(`⚠️ Ошибка генерации UI ${asset.name}: ${error.message}`);
          }
        }

        // Генерируем звуки
        for (const asset of gameDesign.assets.filter(a => a.type === 'sound')) {
          try {
            const result = await this.openai.generateSound(
              asset.description,
              asset.duration || 1000
            );
            assets[`assets/sounds/${asset.name}.wav`] = result.data;
            this.logger.info(`🎵 Звук "${asset.name}" сгенерирован`);
          } catch (error) {
            this.logger.warn(`⚠️ Ошибка генерации звука ${asset.name}: ${error.message}`);
          }
        }
      }

      // Логируем сводку качества
      if (qualityReports.length > 0) {
        const avgQuality = qualityReports.reduce((sum, report) => sum + report.quality.overallScore, 0) / qualityReports.length;
        const excellentAssets = qualityReports.filter(r => r.quality.overallScore >= 90).length;
        const goodAssets = qualityReports.filter(r => r.quality.overallScore >= 75).length;
        
        this.logger.info(`📊 Сводка качества ассетов:`);
        this.logger.info(`   📈 Среднее качество: ${Math.round(avgQuality)}/100`);
        this.logger.info(`   ⭐ Отличных: ${excellentAssets}, Хороших: ${goodAssets}, Всего: ${qualityReports.length}`);
        
        // Сохраняем отчет в метаданных
        (assets as any).qualityReport = {
          averageQuality: Math.round(avgQuality),
          totalAssets: qualityReports.length,
          excellentCount: excellentAssets,
          goodCount: goodAssets,
          details: qualityReports
        };
      }

      this.logger.info(`🎨 Генерация ассетов завершена. Создано ${Object.keys(assets).length} файлов`);
      return assets;

    } catch (error) {
      this.logger.error('💥 Критическая ошибка генерации ассетов:', error);
      throw new GenerationError('Ошибка генерации ассетов', 'asset_generation', error);
    }
  }

  private async integrateYandexSDK(
    gameCode: { [filename: string]: string },
    gameDesign: GameDesign
  ): Promise<{ [filename: string]: string }> {
    try {
      // Импортируем YandexSDKIntegrator
      const { YandexSDKIntegrator } = await import('../yandex-sdk/integration');

      // Создаем конфигурацию SDK на основе дизайна игры
      const sdkConfig = YandexSDKIntegrator.createSDKConfig(gameDesign);

      // Интегрируем SDK в код игры
      gameCode['index.html'] = YandexSDKIntegrator.integrateIntoGame(
        gameCode['index.html'],
        sdkConfig
      );

      this.logger.logInfo('integration', `Интеграция Yandex SDK завершена с конфигурацией: ${JSON.stringify(sdkConfig)}`);

      return gameCode;

    } catch (error) {
      throw new GenerationError('Ошибка интеграции Yandex SDK', 'sdk_integration', error);
    }
  }

  private async buildProject(
    gameId: string,
    structure: FileStructure,
    code: { [filename: string]: string },
    assets: { [path: string]: Buffer },
    gameDesign: GameDesign
  ): Promise<BuildResult> {
    try {
      return await this.buildService.build({
        gameId,
        structure,
        code,
        assets,
        gameDesign,
        outputPath: path.join(config.generation.outputPath, gameId),
      });
    } catch (error) {
      throw new GenerationError('Ошибка сборки проекта', 'build', error);
    }
  }

  private async validateGame(buildResult: BuildResult): Promise<void> {
    try {
      const validation = await this.validator.validateGame(buildResult.outputPath);
      
      if (!validation.isValid) {
        const errors = validation.errors.map(e => e.message).join(', ');
        throw new Error(`Игра не прошла валидацию: ${errors}`);
      }
    } catch (error) {
      throw new GenerationError('Ошибка валидации игры', 'validation', error);
    }
  }

  /**
   * Расширенная валидация с детальным анализом
   */
  private async validateGameWithDetails(buildResult: BuildResult, gameDesign: GameDesign): Promise<{
    isValid: boolean;
    score: number;
    criticalErrors: string[];
    warnings: string[];
    recommendations: string[];
    qualityMetrics: {
      codeQuality: number;
      performanceScore: number;
      mobileCompatibility: number;
      yandexCompliance: number;
      assetsQuality: number;
    };
  }> {
    const result = {
      isValid: true,
      score: 100,
      criticalErrors: [],
      warnings: [],
      recommendations: [],
      qualityMetrics: {
        codeQuality: 100,
        performanceScore: 100,
        mobileCompatibility: 100,
        yandexCompliance: 100,
        assetsQuality: 100
      }
    };

    try {
      // 1. Базовая валидация
      const basicValidation = await this.validator.validateGame(buildResult.outputPath);
      if (!basicValidation.isValid) {
        result.criticalErrors.push(...basicValidation.errors.map(e => e.message));
        result.isValid = false;
        result.score -= 30;
      }

      // 2. Проверка качества кода
      const codeQuality = await this.validateCodeQuality(buildResult);
      result.qualityMetrics.codeQuality = codeQuality.score;
      result.warnings.push(...codeQuality.warnings);
      result.recommendations.push(...codeQuality.recommendations);

      // 3. Проверка производительности
      const performance = await this.validatePerformance(buildResult);
      result.qualityMetrics.performanceScore = performance.score;
      if (performance.critical) {
        result.criticalErrors.push(...performance.errors);
        result.isValid = false;
      }
      result.warnings.push(...performance.warnings);

      // 4. Проверка мобильной совместимости
      const mobileCompatibility = await this.validateMobileCompatibility(buildResult);
      result.qualityMetrics.mobileCompatibility = mobileCompatibility.score;
      result.warnings.push(...mobileCompatibility.warnings);

      // 5. Проверка соответствия Yandex Games
      const yandexCompliance = await this.validateYandexCompliance(buildResult);
      result.qualityMetrics.yandexCompliance = yandexCompliance.score;
      if (yandexCompliance.critical) {
        result.criticalErrors.push(...yandexCompliance.errors);
        result.isValid = false;
      }

      // 6. Проверка качества ассетов
      const assetsQuality = await this.validateAssetsQuality(buildResult, gameDesign);
      result.qualityMetrics.assetsQuality = assetsQuality.score;
      result.recommendations.push(...assetsQuality.recommendations);

      // Вычисляем общий счет
      const avgScore = Object.values(result.qualityMetrics).reduce((sum, score) => sum + score, 0) / 5;
      result.score = Math.round(avgScore);

      // Логируем результаты
      this.logger.info(`🔍 Валидация завершена. Счет: ${result.score}/100`, {
        criticalErrors: result.criticalErrors.length,
        warnings: result.warnings.length,
        qualityMetrics: result.qualityMetrics
      });

      return result;

    } catch (error) {
      this.logger.error('Ошибка расширенной валидации:', error);
      result.criticalErrors.push('Внутренняя ошибка валидации');
      result.isValid = false;
      result.score = 0;
      return result;
    }
  }

  /**
   * Валидация качества кода
   */
  private async validateCodeQuality(buildResult: BuildResult): Promise<{
    score: number;
    warnings: string[];
    recommendations: string[];
  }> {
    let score = 100;
    const warnings = [];
    const recommendations = [];

    try {
      // Читаем сгенерированные файлы
      const files = await fs.readdir(buildResult.outputPath);
      
      for (const file of files) {
        if (file.endsWith('.js')) {
          const content = await fs.readFile(path.join(buildResult.outputPath, file), 'utf-8');
          
          // Проверяем синтаксис
          try {
            new Function(content);
          } catch (syntaxError) {
            score -= 30;
            warnings.push(`Синтаксическая ошибка в ${file}: ${syntaxError.message}`);
          }

          // Проверяем качество кода
          if (content.includes('console.log')) {
            score -= 5;
            warnings.push('Обнаружены отладочные console.log');
            recommendations.push('Удалите отладочный код перед продакшеном');
          }

          if (content.length > 100000) {
            score -= 10;
            warnings.push('Очень большой размер JavaScript файла');
            recommendations.push('Разделите код на модули или минифицируйте');
          }

          // Проверяем наличие комментариев
          const commentRatio = (content.match(/\/\*[\s\S]*?\*\/|\/\/.*$/gm) || []).length / content.split('\n').length;
          if (commentRatio < 0.1) {
            score -= 5;
            recommendations.push('Добавьте больше комментариев в код');
          }
        }
      }

      return { score: Math.max(0, score), warnings, recommendations };

    } catch (error) {
      this.logger.error('Ошибка валидации качества кода:', error);
      return { score: 50, warnings: ['Не удалось проверить качество кода'], recommendations: [] };
    }
  }

  /**
   * Валидация производительности
   */
  private async validatePerformance(buildResult: BuildResult): Promise<{
    score: number;
    critical: boolean;
    errors: string[];
    warnings: string[];
  }> {
    let score = 100;
    const errors = [];
    const warnings = [];
    let critical = false;

    try {
      // Проверяем размер файлов
      const stats = await fs.stat(buildResult.outputPath);
      const totalSize = await this.calculateDirectorySize(buildResult.outputPath);

      if (totalSize > 20 * 1024 * 1024) { // 20MB
        critical = true;
        errors.push(`Размер игры (${this.formatSize(totalSize)}) превышает лимит Yandex Games`);
        score -= 50;
      } else if (totalSize > 10 * 1024 * 1024) { // 10MB
        score -= 20;
        warnings.push(`Размер игры (${this.formatSize(totalSize)}) больше рекомендуемого`);
      }

      // Проверяем количество файлов
      const files = await fs.readdir(buildResult.outputPath, { recursive: true });
      if (files.length > 100) {
        score -= 10;
        warnings.push('Слишком много файлов, это может замедлить загрузку');
      }

      return { score: Math.max(0, score), critical, errors, warnings };

    } catch (error) {
      this.logger.error('Ошибка валидации производительности:', error);
      return { score: 50, critical: false, errors: [], warnings: ['Не удалось проверить производительность'] };
    }
  }

  /**
   * Валидация мобильной совместимости
   */
  private async validateMobileCompatibility(buildResult: BuildResult): Promise<{
    score: number;
    warnings: string[];
  }> {
    let score = 100;
    const warnings = [];

    try {
      const files = await fs.readdir(buildResult.outputPath);
      let hasIndexHtml = false;
      let hasViewportMeta = false;
      let hasTouchSupport = false;

      for (const file of files) {
        if (file === 'index.html') {
          hasIndexHtml = true;
          const content = await fs.readFile(path.join(buildResult.outputPath, file), 'utf-8');
          
          if (content.includes('width=device-width')) {
            hasViewportMeta = true;
          }
          
          if (content.includes('touchstart') || content.includes('touchend')) {
            hasTouchSupport = true;
          }
        }
      }

      if (!hasIndexHtml) {
        score -= 30;
        warnings.push('Отсутствует index.html');
      }

      if (!hasViewportMeta) {
        score -= 20;
        warnings.push('Отсутствует viewport meta tag для мобильной адаптации');
      }

      if (!hasTouchSupport) {
        score -= 15;
        warnings.push('Не обнаружена поддержка touch событий');
      }

      return { score: Math.max(0, score), warnings };

    } catch (error) {
      this.logger.error('Ошибка валидации мобильной совместимости:', error);
      return { score: 50, warnings: ['Не удалось проверить мобильную совместимость'] };
    }
  }

  /**
   * Валидация соответствия Yandex Games
   */
  private async validateYandexCompliance(buildResult: BuildResult): Promise<{
    score: number;
    critical: boolean;
    errors: string[];
  }> {
    let score = 100;
    const errors = [];
    let critical = false;

    try {
      const files = await fs.readdir(buildResult.outputPath);
      let hasYandexSDK = false;
      let hasManifest = false;

      for (const file of files) {
        if (file === 'manifest.json') {
          hasManifest = true;
        }

        if (file.endsWith('.html') || file.endsWith('.js')) {
          const content = await fs.readFile(path.join(buildResult.outputPath, file), 'utf-8');
          
          if (content.includes('yandex.ru/games/sdk') || content.includes('YaGames')) {
            hasYandexSDK = true;
          }
        }
      }

      if (!hasYandexSDK) {
        critical = true;
        errors.push('Отсутствует интеграция с Yandex Games SDK');
        score -= 50;
      }

      if (!hasManifest) {
        score -= 20;
        errors.push('Отсутствует manifest.json');
      }

      return { score: Math.max(0, score), critical, errors };

    } catch (error) {
      this.logger.error('Ошибка валидации Yandex соответствия:', error);
      return { score: 50, critical: false, errors: ['Не удалось проверить соответствие Yandex Games'] };
    }
  }

  /**
   * Валидация качества ассетов
   */
  private async validateAssetsQuality(buildResult: BuildResult, gameDesign: GameDesign): Promise<{
    score: number;
    recommendations: string[];
  }> {
    let score = 100;
    const recommendations = [];

    try {
      const files = await fs.readdir(buildResult.outputPath, { recursive: true });
      const assetFiles = files.filter(file => 
        file.toString().match(/\.(png|jpg|jpeg|gif|webp|svg|mp3|wav|ogg)$/i)
      );

      if (assetFiles.length === 0) {
        score -= 30;
        recommendations.push('Добавьте игровые ассеты для улучшения опыта');
      } else {
        // Проверяем размеры ассетов
        for (const assetFile of assetFiles.slice(0, 10)) { // Проверяем первые 10
          try {
            const assetPath = path.join(buildResult.outputPath, assetFile.toString());
            const assetStats = await fs.stat(assetPath);
            
            if (assetStats.size > 1024 * 1024) { // 1MB
              score -= 5;
              recommendations.push(`Оптимизируйте размер ассета: ${assetFile}`);
            }
          } catch (error) {
            // Файл может быть в подпапке, пропускаем
          }
        }
      }

      // Проверяем соответствие стилю игры
      if (gameDesign.artStyle && assetFiles.length > 0) {
        // Здесь можно добавить более сложную логику анализа стиля
        recommendations.push('Убедитесь, что все ассеты соответствуют выбранному стилю');
      }

      return { score: Math.max(0, score), recommendations };

    } catch (error) {
      this.logger.error('Ошибка валидации качества ассетов:', error);
      return { score: 50, recommendations: ['Не удалось проверить качество ассетов'] };
    }
  }

  /**
   * Промежуточная валидация этапов
   */
  private async validateGenerationStep(step: string, data: any): Promise<boolean> {
    try {
      switch (step) {
        case 'prompt_analysis':
          return this.validatePromptAnalysis(data);
        case 'game_design':
          return this.validateGameDesign(data);
        case 'code_generation':
          return this.validateCodeGeneration(data);
        case 'assets_generation':
          return this.validateAssetsGeneration(data);
        default:
          return true;
      }
    } catch (error) {
      this.logger.warn(`Ошибка валидации этапа ${step}:`, error);
      return false;
    }
  }

  private async validatePromptAnalysis(enrichedPrompt: any): Promise<boolean> {
    if (!enrichedPrompt || typeof enrichedPrompt !== 'object') return false;
    if (!enrichedPrompt.title || !enrichedPrompt.genre) return false;
    return true;
  }

  private async validateGameDesign(gameDesign: GameDesign): Promise<boolean> {
    if (!gameDesign || typeof gameDesign !== 'object') return false;
    if (!gameDesign.title || !gameDesign.genre || !gameDesign.mechanics) return false;
    return true;
  }

  private async validateCodeGeneration(gameCode: { [filename: string]: string }): Promise<boolean> {
    if (!gameCode || typeof gameCode !== 'object') return false;
    if (!gameCode['index.html'] || !gameCode['game.js']) return false;
    
    // Проверяем базовый синтаксис JavaScript
    try {
      new Function(gameCode['game.js']);
      return true;
    } catch (error) {
      this.logger.warn('Синтаксическая ошибка в сгенерированном коде:', error);
      return false;
    }
  }

  private async validateAssetsGeneration(assets: { [path: string]: Buffer }): Promise<boolean> {
    if (!assets || typeof assets !== 'object') return true; // Ассеты опциональны
    
    // Проверяем, что все файлы - валидные бинарные данные
    for (const [path, data] of Object.entries(assets)) {
      if (!Buffer.isBuffer(data) || data.length === 0) {
        this.logger.warn(`Невалидный ассет: ${path}`);
        return false;
      }
    }
    
    return true;
  }

  // Утилиты
  private async calculateDirectorySize(dirPath: string): Promise<number> {
    let totalSize = 0;
    
    try {
      const files = await fs.readdir(dirPath, { recursive: true });
      
      for (const file of files) {
        try {
          const filePath = path.join(dirPath, file.toString());
          const stats = await fs.stat(filePath);
          if (stats.isFile()) {
            totalSize += stats.size;
          }
        } catch (error) {
          // Пропускаем файлы, которые нельзя прочитать
        }
      }
    } catch (error) {
      this.logger.warn(`Не удалось рассчитать размер директории ${dirPath}:`, error);
    }
    
    return totalSize;
  }

  private formatSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private async createGameArchive(buildResult: BuildResult): Promise<BuildResult> {
    try {
      const archivePath = `${buildResult.outputPath}.zip`;
      
      await new Promise<void>((resolve, reject) => {
        const output = require('fs').createWriteStream(archivePath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        output.on('close', () => resolve());
        archive.on('error', reject);

        archive.pipe(output);
        archive.directory(buildResult.outputPath, false);
        archive.finalize();
      });

      const stats = await fs.stat(archivePath);

      return {
        ...buildResult,
        outputPath: archivePath,
        size: stats.size,
      };

    } catch (error) {
      throw new GenerationError('Ошибка создания архива', 'archive', error);
    }
  }

  // Вспомогательные методы для генерации базовых файлов

  private async generateHTML(gameDesign: GameDesign): Promise<string> {
    return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${gameDesign.title}</title>
    <link rel="stylesheet" href="style.css">
    <script src="https://yandex.ru/games/sdk/v2"></script>
    <script src="https://cdn.jsdelivr.net/npm/phaser@3.70.0/dist/phaser.min.js"></script>
</head>
<body>
    <div id="game-container"></div>
    <script src="src/yandex-integration.js"></script>
    <script src="src/scenes/MainMenu.js"></script>
    <script src="src/scenes/GameScene.js"></script>
    <script src="src/scenes/GameOver.js"></script>
    <script src="game.js"></script>
</body>
</html>`;
  }

  private async generateCSS(gameDesign: GameDesign): Promise<string> {
    return `body {
    margin: 0;
    padding: 0;
    background: #000;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    font-family: Arial, sans-serif;
}

#game-container {
    max-width: 100vw;
    max-height: 100vh;
}

canvas {
    display: block;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}`;
  }

  private async generateManifest(gameDesign: GameDesign): Promise<string> {
    const manifest = {
      name: gameDesign.title,
      version: "1.0.0",
      description: gameDesign.description,
      author: "AI Game Generator",
      files: [
        "index.html",
        "game.js",
        "style.css"
      ],
      requirements: {
        yandexSDK: config.yandexGames.requiredSDKVersion
      }
    };

    return JSON.stringify(manifest, null, 2);
  }

  private getMainJSSystemPrompt(): string {
    return `
Создай основной JavaScript файл для Phaser 3 игры.

Требования:
1. Используй Phaser 3.70+
2. Настрой конфигурацию игры для Yandex Games
3. Инициализируй все сцены
4. Добавь адаптивность для мобильных устройств
5. Включи базовую интеграцию с Yandex SDK
6. Оптимизируй для производительности

Структура:
- Конфигурация Phaser
- Инициализация игры
- Обработчики событий
- Утилиты
`;
  }



  /**
   * Автоматическая локализация игрового контента
   */
  private async localizeGameContent(gameDesign: GameDesign, localizationOptions: any): Promise<GameDesign> {
    try {
      const sourceLanguage = localizationOptions.sourceLanguage || 'ru';
      const targetLanguages = localizationOptions.targetLanguages || [];

      // Подготавливаем контент для перевода
      const contentToTranslate = {
        gameId: gameDesign.id || 'generated-game',
        title: gameDesign.title,
        description: gameDesign.description,
        instructions: gameDesign.instructions || 'Управляйте игрой с помощью клавиш-стрелок',
        dialogues: gameDesign.dialogues || [],
        uiElements: {
          startButton: 'Начать игру',
          pauseButton: 'Пауза',
          resumeButton: 'Продолжить',
          restartButton: 'Начать заново',
          gameOver: 'Игра окончена',
          victory: 'Победа!',
          score: 'Очки',
          level: 'Уровень',
          lives: 'Жизни',
          highScore: 'Лучший результат',
          ...gameDesign.uiElements
        },
        achievements: gameDesign.achievements || [],
        story: gameDesign.story || null
      };

      // Переводим игровой контент
      const translationResult = await enhancedLocalizationService.translateGameContent(
        contentToTranslate.gameId,
        contentToTranslate,
        targetLanguages
      );

      // Создаем локализованную версию gameDesign
      const localizedDesign: GameDesign = {
        ...gameDesign,
        localizations: {
          [sourceLanguage]: {
            title: gameDesign.title,
            description: gameDesign.description,
            instructions: gameDesign.instructions,
            uiElements: contentToTranslate.uiElements,
            dialogues: contentToTranslate.dialogues,
            achievements: contentToTranslate.achievements,
            story: contentToTranslate.story
          }
        }
      };

      // Добавляем переводы
      for (const language of targetLanguages) {
        if (translationResult.translatedContent[language]) {
          localizedDesign.localizations![language] = translationResult.translatedContent[language];
        }
      }

      // Обновляем основные поля на основном языке (если он в целевых языках)
      const primaryLanguage = localizationOptions.primaryLanguage || targetLanguages[0];
      if (primaryLanguage && translationResult.translatedContent[primaryLanguage]) {
        const primaryTranslation = translationResult.translatedContent[primaryLanguage];
        
        localizedDesign.title = primaryTranslation.title || gameDesign.title;
        localizedDesign.description = primaryTranslation.description || gameDesign.description;
        localizedDesign.instructions = primaryTranslation.instructions || gameDesign.instructions;
        localizedDesign.uiElements = {
          ...gameDesign.uiElements,
          ...primaryTranslation.uiElements
        };
        localizedDesign.dialogues = primaryTranslation.dialogues || gameDesign.dialogues;
        localizedDesign.achievements = primaryTranslation.achievements || gameDesign.achievements;
        
        if (primaryTranslation.story) {
          localizedDesign.story = primaryTranslation.story;
        }
      }

      // Добавляем метаданные локализации
      localizedDesign.localizationMetadata = {
        sourceLanguage,
        targetLanguages,
        primaryLanguage,
        qualityScore: translationResult.qualityScore,
        translatedAt: new Date().toISOString(),
        provider: 'enhanced-localization-service'
      };

      this.logger.info('Игровой контент успешно локализован', {
        gameId: gameDesign.id,
        languages: targetLanguages,
        qualityScore: translationResult.qualityScore
      });

      return localizedDesign;
    } catch (error) {
      this.logger.error('Ошибка локализации игрового контента', { error, gameDesign: gameDesign.id });
      throw error;
    }
  }

  private extractJsonFromResponse(content: string): any {
    try {
      // Пытаемся найти JSON в ответе
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                       content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1] || jsonMatch[0]);
      }
      
      // Если не найден в блоке кода, пытаемся парсить весь ответ
      return JSON.parse(content);
    } catch (error) {
      this.logger.warn('Не удалось извлечь JSON из ответа AI:', { content, error });
      return null;
    }
  }
} 
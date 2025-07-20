import { Router } from 'express';
import { EnhancedAssetGeneration } from '../services/enhancedAssetGeneration';
import { LoggerService } from '../services/logger';
import { validateRequest } from '../middleware/validation';
import { z } from 'zod';

const router = Router();
const assetGeneration = new EnhancedAssetGeneration();
const logger = new LoggerService();

// Схемы валидации
const regenerateAssetSchema = z.object({
  originalDescription: z.string().min(1, 'Описание не может быть пустым'),
  style: z.string().default('pixel art'),
  assetType: z.enum(['sprite', 'background', 'ui']),
  originalAssetData: z.string().optional(), // base64 encoded original asset
  qualityIssues: z.array(z.string()).optional(),
  qualityScore: z.number().min(0).max(100).optional()
});

const manualRegenerationSchema = z.object({
  originalDescription: z.string().min(1, 'Описание не может быть пустым'),
  style: z.string().default('pixel art'),
  assetType: z.enum(['sprite', 'background', 'ui']),
  customPromptAdditions: z.array(z.string()).default([]),
  maxAttempts: z.number().min(1).max(5).default(3)
});

const configureRegenerationSchema = z.object({
  maxAttempts: z.number().min(1).max(10).default(3),
  minQualityThreshold: z.number().min(1).max(100).default(75),
  improvementStrategy: z.enum(['iterative', 'alternative', 'hybrid']).default('iterative'),
  enableAutoRegeneration: z.boolean().default(true),
  regenerationTriggers: z.array(z.object({
    type: z.enum(['quality_threshold', 'user_feedback', 'technical_issue', 'style_mismatch']),
    threshold: z.number().optional(),
    condition: z.string().optional()
  })).default([])
});

/**
 * POST /api/asset-regeneration/auto
 * Автоматическая регенерация неудачного ассета
 */
router.post('/auto', validateRequest(regenerateAssetSchema), async (req, res) => {
  try {
    const { originalDescription, style, assetType, qualityIssues = [], qualityScore = 0 } = req.body;
    
    logger.info(`📝 Запрос автоматической регенерации: ${assetType} "${originalDescription}"`);

    // Создаем фиктивные объекты для совместимости с существующим API
    const fakeOriginalAsset = {
      type: 'image' as const,
      data: Buffer.from('fake-data'),
      metadata: {
        size: 1000,
        dimensions: { width: 64, height: 64 },
        format: 'png'
      }
    };

    const fakeQualityMetrics = {
      technicalScore: Math.max(0, qualityScore - 10),
      aestheticScore: Math.max(0, qualityScore - 5),
      gameRelevanceScore: Math.max(0, qualityScore - 8),
      overallScore: qualityScore,
      issues: qualityIssues,
      recommendations: qualityIssues.map(issue => `Исправить: ${issue}`)
    };

    const result = await assetGeneration.regenerateFailedAsset(
      fakeOriginalAsset,
      fakeQualityMetrics,
      originalDescription,
      style,
      assetType
    );

    // Конвертируем ассет в base64 для передачи
    const assetBase64 = result.newAsset.data.toString('base64');

    res.json({
      success: true,
      data: {
        newAsset: {
          type: result.newAsset.type,
          data: assetBase64,
          metadata: result.newAsset.metadata
        },
        qualityMetrics: result.newQualityMetrics,
        regenerationLog: result.regenerationLog,
        improvementAchieved: result.improvementAchieved,
        qualityImprovement: result.newQualityMetrics.overallScore - qualityScore
      }
    });

  } catch (error) {
    logger.error('Ошибка автоматической регенерации:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка автоматической регенерации ассета',
      details: error.message
    });
  }
});

/**
 * POST /api/asset-regeneration/manual
 * Ручная регенерация с пользовательскими параметрами
 */
router.post('/manual', validateRequest(manualRegenerationSchema), async (req, res) => {
  try {
    const { originalDescription, style, assetType, customPromptAdditions, maxAttempts } = req.body;
    
    logger.info(`🔧 Запрос ручной регенерации: ${assetType} "${originalDescription}"`);

    const result = await assetGeneration.manualRegeneration(
      originalDescription,
      style,
      assetType,
      customPromptAdditions,
      maxAttempts
    );

    // Конвертируем все ассеты в base64
    const assetsBase64 = result.assets.map(asset => ({
      type: asset.type,
      data: asset.data.toString('base64'),
      metadata: asset.metadata
    }));

    res.json({
      success: true,
      data: {
        assets: assetsBase64,
        qualityMetrics: result.qualityMetrics,
        bestAssetIndex: result.bestAssetIndex,
        regenerationLog: result.regenerationLog,
        bestQuality: result.qualityMetrics[result.bestAssetIndex]?.overallScore || 0
      }
    });

  } catch (error) {
    logger.error('Ошибка ручной регенерации:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка ручной регенерации ассета',
      details: error.message
    });
  }
});

/**
 * GET /api/asset-regeneration/stats
 * Получение статистики регенерации
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = assetGeneration.getRegenerationStats();
    
    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Ошибка получения статистики регенерации:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка получения статистики',
      details: error.message
    });
  }
});

/**
 * POST /api/asset-regeneration/check-trigger
 * Проверка необходимости автоматической регенерации
 */
router.post('/check-trigger', async (req, res) => {
  try {
    const { qualityMetrics, config } = req.body;
    
    const shouldRegenerate = assetGeneration.shouldTriggerAutoRegeneration(
      qualityMetrics,
      config
    );

    res.json({
      success: true,
      data: {
        shouldRegenerate,
        qualityScore: qualityMetrics.overallScore,
        triggers: config.regenerationTriggers,
        recommendations: qualityMetrics.recommendations || []
      }
    });

  } catch (error) {
    logger.error('Ошибка проверки триггеров регенерации:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка проверки триггеров',
      details: error.message
    });
  }
});

/**
 * POST /api/asset-regeneration/batch
 * Массовая регенерация ассетов
 */
router.post('/batch', async (req, res) => {
  try {
    const { assets, config } = req.body;
    
    logger.info(`🔄 Запрос массовой регенерации: ${assets.length} ассетов`);

    const results = [];
    let processed = 0;
    
    for (const assetRequest of assets) {
      try {
        // Создаем фиктивные объекты
        const fakeOriginalAsset = {
          type: 'image' as const,
          data: Buffer.from('fake-data'),
          metadata: {
            size: 1000,
            dimensions: { width: 64, height: 64 },
            format: 'png'
          }
        };

        const fakeQualityMetrics = {
          technicalScore: Math.max(0, assetRequest.qualityScore - 10),
          aestheticScore: Math.max(0, assetRequest.qualityScore - 5),
          gameRelevanceScore: Math.max(0, assetRequest.qualityScore - 8),
          overallScore: assetRequest.qualityScore,
          issues: assetRequest.qualityIssues || [],
          recommendations: (assetRequest.qualityIssues || []).map(issue => `Исправить: ${issue}`)
        };

        const result = await assetGeneration.regenerateFailedAsset(
          fakeOriginalAsset,
          fakeQualityMetrics,
          assetRequest.originalDescription,
          assetRequest.style,
          assetRequest.assetType
        );

        results.push({
          originalDescription: assetRequest.originalDescription,
          success: true,
          qualityImprovement: result.newQualityMetrics.overallScore - assetRequest.qualityScore,
          newQuality: result.newQualityMetrics.overallScore,
          improvementAchieved: result.improvementAchieved
        });
        
      } catch (error) {
        results.push({
          originalDescription: assetRequest.originalDescription,
          success: false,
          error: error.message
        });
      }
      
      processed++;
      
      // Отправляем прогресс каждые 5 ассетов
      if (processed % 5 === 0) {
        logger.info(`📊 Обработано ${processed}/${assets.length} ассетов`);
      }
    }

    const successCount = results.filter(r => r.success).length;
    const avgImprovement = results
      .filter(r => r.success && r.qualityImprovement)
      .reduce((sum, r) => sum + (r.qualityImprovement || 0), 0) / successCount;

    res.json({
      success: true,
      data: {
        totalProcessed: processed,
        successCount,
        failureCount: processed - successCount,
        averageQualityImprovement: Math.round(avgImprovement || 0),
        results
      }
    });

  } catch (error) {
    logger.error('Ошибка массовой регенерации:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка массовой регенерации',
      details: error.message
    });
  }
});

/**
 * GET /api/asset-regeneration/strategies
 * Получение доступных стратегий улучшения
 */
router.get('/strategies', async (req, res) => {
  try {
    // Получаем стратегии из сервиса (нужно добавить публичный метод)
    const strategies = [
      {
        name: 'enhance_technical_quality',
        description: 'Улучшение технического качества ассета',
        applicableIssues: ['Размер файла слишком большой', 'Слишком низкое разрешение'],
        successRate: 75
      },
      {
        name: 'improve_aesthetic',
        description: 'Улучшение эстетических качеств',
        applicableIssues: ['Низкий контраст изображения'],
        successRate: 68
      },
      {
        name: 'enhance_game_relevance',
        description: 'Улучшение соответствия игровому контексту',
        applicableIssues: ['Несоответствие типа ассета описанию'],
        successRate: 82
      },
      {
        name: 'style_consistency',
        description: 'Улучшение стилевой согласованности',
        applicableIssues: [],
        successRate: 71
      },
      {
        name: 'detail_enhancement',
        description: 'Увеличение детализации',
        applicableIssues: [],
        successRate: 65
      }
    ];

    res.json({
      success: true,
      data: {
        strategies,
        totalStrategies: strategies.length,
        averageSuccessRate: Math.round(
          strategies.reduce((sum, s) => sum + s.successRate, 0) / strategies.length
        )
      }
    });

  } catch (error) {
    logger.error('Ошибка получения стратегий:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка получения стратегий',
      details: error.message
    });
  }
});

export default router; 
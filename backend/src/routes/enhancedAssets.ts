import { Router, Request, Response } from 'express';
import { EnhancedAssetGeneration } from '../services/enhancedAssetGeneration';
import { LoggerService } from '../services/logger';
import { asyncHandler } from '../middleware/asyncHandler';
import multer from 'multer';
import path from 'path';

const router = Router();
const logger = new LoggerService();
const enhancedAssetGen = new EnhancedAssetGeneration();

// Настройка multer для загрузки изображений (для regeneration)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Только изображения разрешены'), false);
    }
  }
});

/**
 * Генерация высококачественного спрайта
 * POST /api/enhanced-assets/sprite
 */
router.post('/sprite', asyncHandler(async (req: Request, res: Response) => {
  const { description, style = 'pixel art', dimensions = { width: 64, height: 64 }, config } = req.body;
  
  if (!description) {
    return res.status(400).json({
      success: false,
      error: 'Description is required'
    });
  }

  try {
    logger.info(`🎨 API запрос на генерацию спрайта: "${description}"`);
    
    const result = await enhancedAssetGen.generateHighQualitySprite(
      description,
      style,
      dimensions,
      config
    );
    
    res.json({
      success: true,
      data: {
        asset: {
          data: result.asset.data.toString('base64'),
          metadata: result.asset.metadata
        },
        qualityMetrics: result.qualityMetrics,
        attemptsMade: result.attemptsMade,
        generationLog: result.generationLog
      }
    });
    
  } catch (error) {
    logger.error('Ошибка генерации спрайта:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate sprite',
      message: error.message
    });
  }
}));

/**
 * Генерация высококачественного фона
 * POST /api/enhanced-assets/background
 */
router.post('/background', asyncHandler(async (req: Request, res: Response) => {
  const { description, style = 'cartoon', size = '1792x1024', config } = req.body;
  
  if (!description) {
    return res.status(400).json({
      success: false,
      error: 'Description is required'
    });
  }

  try {
    logger.info(`🖼️ API запрос на генерацию фона: "${description}"`);
    
    const result = await enhancedAssetGen.generateHighQualityBackground(
      description,
      style,
      size,
      config
    );
    
    res.json({
      success: true,
      data: {
        asset: {
          data: result.asset.data.toString('base64'),
          metadata: result.asset.metadata
        },
        qualityMetrics: result.qualityMetrics,
        attemptsMade: result.attemptsMade,
        generationLog: result.generationLog
      }
    });
    
  } catch (error) {
    logger.error('Ошибка генерации фона:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate background',
      message: error.message
    });
  }
}));

/**
 * Пакетная генерация ассетов
 * POST /api/enhanced-assets/batch
 */
router.post('/batch', asyncHandler(async (req: Request, res: Response) => {
  const { requests } = req.body;
  
  if (!requests || !Array.isArray(requests)) {
    return res.status(400).json({
      success: false,
      error: 'Requests array is required'
    });
  }

  try {
    logger.info(`📦 API запрос на пакетную генерацию ${requests.length} ассетов`);
    
    // Настраиваем обработчик прогресса для WebSocket (если понадобится)
    const progressUpdates: any[] = [];
    
    enhancedAssetGen.on('batch:progress', (progress) => {
      progressUpdates.push({
        timestamp: new Date(),
        ...progress
      });
    });
    
    const results = await enhancedAssetGen.generateAssetBatch(requests);
    
    // Преобразуем результаты для JSON ответа
    const responseData: any[] = [];
    
    for (const [description, result] of results.entries()) {
      responseData.push({
        description,
        asset: {
          data: result.asset.data.toString('base64'),
          metadata: result.asset.metadata
        },
        qualityMetrics: result.qualityMetrics
      });
    }
    
    res.json({
      success: true,
      data: {
        results: responseData,
        totalGenerated: results.size,
        progressUpdates
      }
    });
    
  } catch (error) {
    logger.error('Ошибка пакетной генерации:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate asset batch',
      message: error.message
    });
  }
}));

/**
 * Получение статистики качества генерации
 * GET /api/enhanced-assets/quality-stats
 */
router.get('/quality-stats', asyncHandler(async (req: Request, res: Response) => {
  try {
    const stats = enhancedAssetGen.getQualityStatistics();
    
    res.json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    logger.error('Ошибка получения статистики:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get quality statistics'
    });
  }
}));

/**
 * Превью различных стилей для ассета
 * POST /api/enhanced-assets/style-preview
 */
router.post('/style-preview', asyncHandler(async (req: Request, res: Response) => {
  const { description, styles = ['pixel art', 'cartoon', 'realistic', 'minimalist'] } = req.body;
  
  if (!description) {
    return res.status(400).json({
      success: false,
      error: 'Description is required'
    });
  }

  try {
    logger.info(`🎨 Генерация превью стилей для: "${description}"`);
    
    const previews = [];
    
    // Генерируем быстрые превью для каждого стиля
    for (const style of styles) {
      try {
        const result = await enhancedAssetGen.generateHighQualitySprite(
          description,
          style,
          { width: 128, height: 128 }, // Увеличенный размер для превью
          {
            maxAttempts: 1, // Быстрое превью
            minQualityThreshold: 60,
            improvementStrategy: 'iterative'
          }
        );
        
        previews.push({
          style,
          asset: {
            data: result.asset.data.toString('base64'),
            metadata: result.asset.metadata
          },
          qualityScore: result.qualityMetrics.overallScore
        });
        
      } catch (error) {
        logger.warn(`Не удалось создать превью для стиля ${style}:`, error);
        previews.push({
          style,
          error: error.message,
          qualityScore: 0
        });
      }
    }
    
    res.json({
      success: true,
      data: {
        description,
        previews,
        totalStyles: styles.length,
        successfulPreviews: previews.filter(p => !p.error).length
      }
    });
    
  } catch (error) {
    logger.error('Ошибка генерации превью стилей:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate style previews',
      message: error.message
    });
  }
}));

/**
 * Улучшение существующего ассета
 * POST /api/enhanced-assets/improve
 */
router.post('/improve', upload.single('image'), asyncHandler(async (req: Request, res: Response) => {
  const { description, style, targetQuality = 85 } = req.body;
  const imageFile = req.file;
  
  if (!imageFile) {
    return res.status(400).json({
      success: false,
      error: 'Image file is required'
    });
  }

  if (!description) {
    return res.status(400).json({
      success: false,
      error: 'Description is required'
    });
  }

  try {
    logger.info(`🔧 Улучшение ассета: "${description}"`);
    
    // TODO: Здесь можно добавить логику анализа существующего изображения
    // и генерацию улучшенной версии на его основе
    
    // Пока используем обычную генерацию с высокими требованиями к качеству
    const result = await enhancedAssetGen.generateHighQualitySprite(
      `Improved version of: ${description}`,
      style || 'pixel art',
      { width: 128, height: 128 },
      {
        maxAttempts: 3,
        minQualityThreshold: targetQuality,
        improvementStrategy: 'iterative'
      }
    );
    
    res.json({
      success: true,
      data: {
        originalSize: imageFile.size,
        improvedAsset: {
          data: result.asset.data.toString('base64'),
          metadata: result.asset.metadata
        },
        qualityMetrics: result.qualityMetrics,
        improvementLog: result.generationLog
      }
    });
    
  } catch (error) {
    logger.error('Ошибка улучшения ассета:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to improve asset',
      message: error.message
    });
  }
}));

/**
 * Получение рекомендаций для улучшения качества
 * POST /api/enhanced-assets/recommendations
 */
router.post('/recommendations', asyncHandler(async (req: Request, res: Response) => {
  const { assetType, style, targetPlatform = 'yandex_games', description } = req.body;
  
  try {
    // Генерируем рекомендации на основе лучших практик
    const recommendations = {
      general: [
        'Используйте четкие, контрастные цвета для лучшей видимости',
        'Избегайте слишком мелких деталей в спрайтах малого размера',
        'Поддерживайте единый стиль во всех ассетах игры'
      ],
      styleSpecific: {},
      platformSpecific: {},
      qualityTips: []
    };

    // Добавляем рекомендации по стилю
    switch (style?.toLowerCase()) {
      case 'pixel art':
        recommendations.styleSpecific = {
          style: 'pixel art',
          tips: [
            'Используйте ограниченную палитру цветов (8-16 цветов)',
            'Избегайте anti-aliasing для пиксельной четкости',
            'Делайте контуры толщиной в 1 пиксель',
            'Используйте дизеринг для создания переходов'
          ]
        };
        break;
      case 'cartoon':
        recommendations.styleSpecific = {
          style: 'cartoon',
          tips: [
            'Используйте яркие, насыщенные цвета',
            'Добавьте четкие контуры (outline)',
            'Делайте формы простыми и узнаваемыми',
            'Используйте преувеличенные пропорции'
          ]
        };
        break;
      case 'realistic':
        recommendations.styleSpecific = {
          style: 'realistic',
          tips: [
            'Добавьте детализированные текстуры',
            'Используйте реалистичное освещение',
            'Соблюдайте правильные пропорции',
            'Добавьте глубину через затенение'
          ]
        };
        break;
    }

    // Рекомендации для платформы
    if (targetPlatform === 'yandex_games') {
      recommendations.platformSpecific = {
        platform: 'Yandex Games',
        tips: [
          'Ограничьте размер ассетов для быстрой загрузки',
          'Используйте веб-совместимые форматы (PNG, JPEG)',
          'Оптимизируйте для мобильных экранов',
          'Учитывайте ограничения в 20MB на всю игру'
        ]
      };
    }

    // Общие советы по качеству
    recommendations.qualityTips = [
      'Тестируйте ассеты на разных размерах экрана',
      'Используйте правило третей для композиции',
      'Создавайте вариации для анимации',
      'Поддерживайте консистентность в освещении'
    ];

    res.json({
      success: true,
      data: recommendations
    });
    
  } catch (error) {
    logger.error('Ошибка получения рекомендаций:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get recommendations'
    });
  }
}));

/**
 * Анализ качества загруженного ассета
 * POST /api/enhanced-assets/analyze
 */
router.post('/analyze', upload.single('image'), asyncHandler(async (req: Request, res: Response) => {
  const { description, style, assetType = 'sprite' } = req.body;
  const imageFile = req.file;
  
  if (!imageFile) {
    return res.status(400).json({
      success: false,
      error: 'Image file is required'
    });
  }

  try {
    logger.info(`🔍 Анализ качества ассета: "${description || 'unnamed'}"`);
    
    // Создаем временный AssetGenerationResult для анализа
    const assetResult = {
      type: 'image' as const,
      data: imageFile.buffer,
      metadata: {
        size: imageFile.size,
        format: path.extname(imageFile.originalname).substring(1),
        filename: imageFile.originalname
      }
    };
    
    // Используем приватный метод для анализа (нужно будет сделать его публичным)
    // Пока создаем упрощенный анализ
    const analysis = {
      fileSize: imageFile.size,
      format: path.extname(imageFile.originalname).substring(1),
      isOptimized: imageFile.size < 100 * 1024, // < 100KB считаем оптимизированным
      recommendations: []
    };

    if (imageFile.size > 500 * 1024) {
      analysis.recommendations.push('Файл слишком большой, рекомендуется сжатие');
    }

    if (!['png', 'jpg', 'jpeg', 'webp'].includes(analysis.format.toLowerCase())) {
      analysis.recommendations.push('Рекомендуется использовать PNG или JPEG формат');
    }

    res.json({
      success: true,
      data: {
        originalFile: {
          name: imageFile.originalname,
          size: imageFile.size,
          format: analysis.format
        },
        analysis,
        suggestions: analysis.recommendations
      }
    });
    
  } catch (error) {
    logger.error('Ошибка анализа ассета:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze asset',
      message: error.message
    });
  }
}));

export default router; 
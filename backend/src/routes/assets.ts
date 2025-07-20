import express from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { AssetGenerationService, AssetOptimizationSettings, AssetGenerationRequest } from '@/services/assetGeneration';
import { LoggerService } from '@/services/logger';
import { rateLimit } from '@/middleware/validation';
import config from '@/config';

const router = express.Router();
const logger = new LoggerService();
const assetService = new AssetGenerationService();

// Настройка multer для загрузки файлов
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
    files: 20
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'audio/wav', 'audio/mp3', 'audio/ogg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Неподдерживаемый тип файла: ${file.mimetype}`), false);
    }
  }
});

/**
 * POST /api/assets/generate
 * Генерирует набор ассетов для игры
 */
router.post('/generate', rateLimit(5, 60 * 60 * 1000), async (req, res) => {
  try {
    const { gameDesign, assets, optimizationSettings } = req.body;
    const gameId = uuidv4();

    if (!gameDesign || !assets || !Array.isArray(assets)) {
      return res.status(400).json({
        success: false,
        error: 'Требуются gameDesign и массив assets'
      });
    }

    logger.info(`🎨 Запуск генерации ассетов для игры ${gameId}`);

    const request: AssetGenerationRequest = {
      gameId,
      gameDesign,
      assets,
      optimizationSettings: optimizationSettings || {
        images: {
          format: 'auto',
          quality: 80,
          maxWidth: 1920,
          maxHeight: 1080,
          progressive: true,
          removeMetadata: true
        },
        audio: {
          format: 'auto',
          bitrate: 128,
          sampleRate: 44100,
          channels: 'stereo',
          normalize: true,
          removeMetadata: true
        },
        general: {
          enableCompression: true,
          maxFileSize: 10,
          targetGameSize: config.yandexGames.targetSize / (1024 * 1024) // MB
        }
      }
    };

    // Настраиваем SSE для отправки прогресса
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    const sendProgress = (progress: number, step: string, details?: any) => {
      res.write(`data: ${JSON.stringify({
        type: 'progress',
        gameId,
        progress,
        step,
        details
      })}\n\n`);
    };

    const sendError = (error: string) => {
      res.write(`data: ${JSON.stringify({
        type: 'error',
        gameId,
        error
      })}\n\n`);
      res.end();
    };

    const sendComplete = (bundle: any, validationResult: any) => {
      res.write(`data: ${JSON.stringify({
        type: 'complete',
        gameId,
        bundle: {
          metadata: bundle.metadata
        },
        validation: validationResult
      })}\n\n`);
      res.end();
    };

    try {
      // Генерируем ассеты
      const bundle = await assetService.generateAssetBundle(request, sendProgress);
      
      // Проверяем соответствие требованиям Yandex Games
      const validationResult = assetService.validateGameSize(bundle);
      
      sendComplete(bundle, validationResult);
      
    } catch (error: any) {
      logger.error(`Ошибка генерации ассетов для ${gameId}:`, error);
      sendError(error.message || 'Неизвестная ошибка генерации');
    }

  } catch (error: any) {
    logger.error('Ошибка в /api/assets/generate:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Внутренняя ошибка сервера'
    });
  }
});

/**
 * POST /api/assets/optimize
 * Оптимизирует загруженные ассеты
 */
router.post('/optimize', upload.array('files', 20), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Нет файлов для оптимизации'
      });
    }

    const files = req.files as Express.Multer.File[];
    const settings: AssetOptimizationSettings = JSON.parse(req.body.settings || '{}');
    
    // Применяем настройки по умолчанию
    const defaultSettings: AssetOptimizationSettings = {
      images: {
        format: 'auto',
        quality: 80,
        maxWidth: 1920,
        maxHeight: 1080,
        progressive: true,
        removeMetadata: true
      },
      audio: {
        format: 'auto',
        bitrate: 128,
        sampleRate: 44100,
        channels: 'stereo',
        normalize: true,
        removeMetadata: true
      },
      general: {
        enableCompression: true,
        maxFileSize: 10,
        targetGameSize: 100
      }
    };

    const optimizationSettings = {
      ...defaultSettings,
      ...settings,
      images: { ...defaultSettings.images, ...settings.images },
      audio: { ...defaultSettings.audio, ...settings.audio },
      general: { ...defaultSettings.general, ...settings.general }
    };

    const optimizedFiles: Array<{
      originalName: string;
      originalSize: number;
      optimizedSize: number;
      compressionRatio: number;
      data: Buffer;
    }> = [];

    for (const file of files) {
      try {
        let optimizedBuffer: Buffer;
        
        if (file.mimetype.startsWith('image/')) {
          // Используем асинхронную функцию из нашего сервиса
          const sharp = require('sharp');
          let processor = sharp(file.buffer);

          // Изменяем размер если нужно
          const { width, height } = await processor.metadata();
          if (width && height && (width > optimizationSettings.images.maxWidth || height > optimizationSettings.images.maxHeight)) {
            processor = processor.resize(optimizationSettings.images.maxWidth, optimizationSettings.images.maxHeight, {
              fit: 'inside',
              withoutEnlargement: true
            });
          }

          // Удаляем метаданные
          if (optimizationSettings.images.removeMetadata) {
            processor = processor.withMetadata({});
          }

          // Выбираем формат
          switch (optimizationSettings.images.format) {
            case 'webp':
              optimizedBuffer = await processor.webp({ quality: optimizationSettings.images.quality }).toBuffer();
              break;
            case 'jpg':
              optimizedBuffer = await processor.jpeg({ 
                quality: optimizationSettings.images.quality, 
                progressive: optimizationSettings.images.progressive 
              }).toBuffer();
              break;
            case 'png':
              optimizedBuffer = await processor.png({ 
                quality: optimizationSettings.images.quality,
                progressive: optimizationSettings.images.progressive
              }).toBuffer();
              break;
            default:
              optimizedBuffer = await processor.webp({ quality: optimizationSettings.images.quality }).toBuffer();
          }
        } else {
          // Для аудио пока просто возвращаем исходный файл
          optimizedBuffer = file.buffer;
        }

        optimizedFiles.push({
          originalName: file.originalname,
          originalSize: file.size,
          optimizedSize: optimizedBuffer.length,
          compressionRatio: file.size / optimizedBuffer.length,
          data: optimizedBuffer
        });

      } catch (error) {
        logger.warn(`Ошибка оптимизации файла ${file.originalname}:`, error);
        // В случае ошибки возвращаем исходный файл
        optimizedFiles.push({
          originalName: file.originalname,
          originalSize: file.size,
          optimizedSize: file.size,
          compressionRatio: 1,
          data: file.buffer
        });
      }
    }

    const totalOriginalSize = optimizedFiles.reduce((sum, f) => sum + f.originalSize, 0);
    const totalOptimizedSize = optimizedFiles.reduce((sum, f) => sum + f.optimizedSize, 0);

    res.json({
      success: true,
      files: optimizedFiles.map(f => ({
        originalName: f.originalName,
        originalSize: f.originalSize,
        optimizedSize: f.optimizedSize,
        compressionRatio: f.compressionRatio
      })),
      summary: {
        totalFiles: optimizedFiles.length,
        totalOriginalSize,
        totalOptimizedSize,
        totalCompressionRatio: totalOriginalSize / totalOptimizedSize,
        spaceSaved: totalOriginalSize - totalOptimizedSize
      }
    });

  } catch (error: any) {
    logger.error('Ошибка в /api/assets/optimize:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Ошибка оптимизации файлов'
    });
  }
});

/**
 * GET /api/assets/active
 * Получает список активных генераций ассетов
 */
router.get('/active', async (req, res) => {
  try {
    const activeGenerations = assetService.getActiveGenerations();
    
    res.json({
      success: true,
      generations: activeGenerations
    });
  } catch (error: any) {
    logger.error('Ошибка в /api/assets/active:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Ошибка получения активных генераций'
    });
  }
});

/**
 * DELETE /api/assets/cancel/:gameId
 * Отменяет генерацию ассетов
 */
router.delete('/cancel/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;
    
    if (!gameId) {
      return res.status(400).json({
        success: false,
        error: 'Требуется gameId'
      });
    }

    const cancelled = assetService.cancelGeneration(gameId);
    
    if (cancelled) {
      res.json({
        success: true,
        message: `Генерация ассетов для игры ${gameId} отменена`
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Генерация не найдена или уже завершена'
      });
    }
  } catch (error: any) {
    logger.error('Ошибка в /api/assets/cancel:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Ошибка отмены генерации'
    });
  }
});

/**
 * POST /api/assets/validate-size
 * Проверяет соответствие размера игры требованиям Yandex Games
 */
router.post('/validate-size', async (req, res) => {
  try {
    const { bundle } = req.body;
    
    if (!bundle || !bundle.metadata) {
      return res.status(400).json({
        success: false,
        error: 'Требуется bundle с метаданными'
      });
    }

    const validationResult = assetService.validateGameSize(bundle);
    
    res.json({
      success: true,
      validation: validationResult
    });
  } catch (error: any) {
    logger.error('Ошибка в /api/assets/validate-size:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Ошибка валидации размера'
    });
  }
});

/**
 * GET /api/assets/settings/default
 * Получает настройки оптимизации по умолчанию
 */
router.get('/settings/default', async (req, res) => {
  try {
    const defaultSettings: AssetOptimizationSettings = {
      images: {
        format: 'auto',
        quality: 80,
        maxWidth: 1920,
        maxHeight: 1080,
        progressive: true,
        removeMetadata: true
      },
      audio: {
        format: 'auto',
        bitrate: 128,
        sampleRate: 44100,
        channels: 'stereo',
        normalize: true,
        removeMetadata: true
      },
      general: {
        enableCompression: true,
        maxFileSize: 10,
        targetGameSize: config.yandexGames.targetSize / (1024 * 1024) // Конвертируем в MB
      }
    };

    res.json({
      success: true,
      settings: defaultSettings,
      yandexLimits: {
        maxSize: config.yandexGames.maxSize,
        targetSize: config.yandexGames.targetSize,
        supportedFormats: config.yandexGames.supportedFormats
      }
    });
  } catch (error: any) {
    logger.error('Ошибка в /api/assets/settings/default:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Ошибка получения настроек'
    });
  }
});

export default router; 
import express from 'express';
import path from 'path';
import { GameSizeController } from '@/services/gameSizeController';
import { LoggerService } from '@/services/logger';
import { rateLimit } from '@/middleware/validation';

const router = express.Router();
const logger = new LoggerService();
const sizeController = new GameSizeController();

/**
 * POST /api/game-size/analyze
 * Анализирует размер игры
 */
router.post('/analyze', rateLimit(10, 60 * 1000), async (req, res) => {
  try {
    const { gameDir, gameId } = req.body;

    if (!gameDir || !gameId) {
      return res.status(400).json({
        success: false,
        error: 'Требуются gameDir и gameId'
      });
    }

    // Проверяем, что путь безопасен (в пределах проекта)
    const safePath = path.resolve(gameDir);
    const projectRoot = path.resolve(process.cwd());
    
    if (!safePath.startsWith(projectRoot)) {
      return res.status(400).json({
        success: false,
        error: 'Недопустимый путь к игре'
      });
    }

    logger.info(`🔍 Анализ размера игры ${gameId}: ${gameDir}`);

    const report = await sizeController.analyzeGameSize(gameDir, gameId);

    res.json({
      success: true,
      report,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('Ошибка анализа размера игры:', error);
    
    if (error.code === 'ENOENT') {
      res.status(404).json({
        success: false,
        error: 'Директория игры не найдена'
      });
    } else {
      res.status(500).json({
        success: false,
        error: error.message || 'Внутренняя ошибка сервера'
      });
    }
  }
});

/**
 * POST /api/game-size/optimize
 * Автоматическая оптимизация игры
 */
router.post('/optimize', rateLimit(3, 60 * 60 * 1000), async (req, res) => {
  try {
    const { gameDir, options } = req.body;

    if (!gameDir) {
      return res.status(400).json({
        success: false,
        error: 'Требуется gameDir'
      });
    }

    // Параметры оптимизации по умолчанию
    const optimizationOptions = {
      compressImages: true,
      minifyCode: true,
      optimizeAudio: true,
      removeUnused: false,
      ...options
    };

    // Проверяем безопасность пути
    const safePath = path.resolve(gameDir);
    const projectRoot = path.resolve(process.cwd());
    
    if (!safePath.startsWith(projectRoot)) {
      return res.status(400).json({
        success: false,
        error: 'Недопустимый путь к игре'
      });
    }

    logger.info(`🔧 Запуск оптимизации игры: ${gameDir}`, optimizationOptions);

    // Настраиваем SSE для отправки прогресса
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    const sendProgress = (step: string, progress: number) => {
      res.write(`data: ${JSON.stringify({
        type: 'progress',
        step,
        progress,
        timestamp: new Date().toISOString()
      })}\n\n`);
    };

    const sendComplete = (result: any) => {
      res.write(`data: ${JSON.stringify({
        type: 'complete',
        result,
        timestamp: new Date().toISOString()
      })}\n\n`);
      res.end();
    };

    const sendError = (error: string) => {
      res.write(`data: ${JSON.stringify({
        type: 'error',
        error,
        timestamp: new Date().toISOString()
      })}\n\n`);
      res.end();
    };

    try {
      sendProgress('Начало оптимизации', 0);
      
      const result = await sizeController.autoOptimize(gameDir, optimizationOptions);
      
      sendProgress('Оптимизация завершена', 100);
      sendComplete(result);
      
    } catch (error: any) {
      logger.error('Ошибка оптимизации:', error);
      sendError(error.message);
    }

  } catch (error: any) {
    logger.error('Ошибка в /api/game-size/optimize:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Внутренняя ошибка сервера'
    });
  }
});

/**
 * GET /api/game-size/limits
 * Получает текущие лимиты размера
 */
router.get('/limits', async (req, res) => {
  try {
    const limits = sizeController.getLimits();
    
    res.json({
      success: true,
      limits,
      platform: 'Yandex Games',
      description: {
        max: 'Максимальный размер игры',
        target: 'Рекомендуемый размер',
        warning: 'Размер предупреждения'
      }
    });
  } catch (error: any) {
    logger.error('Ошибка получения лимитов:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Внутренняя ошибка сервера'
    });
  }
});

/**
 * PUT /api/game-size/limits
 * Обновляет лимиты размера (только для администраторов)
 */
router.put('/limits', rateLimit(5, 60 * 60 * 1000), async (req, res) => {
  try {
    const { max, target, warning } = req.body;
    
    const newLimits: any = {};
    
    if (max !== undefined) {
      if (typeof max !== 'number' || max <= 0) {
        return res.status(400).json({
          success: false,
          error: 'max должен быть положительным числом'
        });
      }
      newLimits.max = max;
    }
    
    if (target !== undefined) {
      if (typeof target !== 'number' || target <= 0) {
        return res.status(400).json({
          success: false,
          error: 'target должен быть положительным числом'
        });
      }
      newLimits.target = target;
    }
    
    if (warning !== undefined) {
      if (typeof warning !== 'number' || warning <= 0) {
        return res.status(400).json({
          success: false,
          error: 'warning должен быть положительным числом'
        });
      }
      newLimits.warning = warning;
    }

    if (Object.keys(newLimits).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Нет данных для обновления'
      });
    }

    sizeController.updateLimits(newLimits);
    const updatedLimits = sizeController.getLimits();
    
    logger.info('📏 Лимиты размера обновлены:', updatedLimits);
    
    res.json({
      success: true,
      limits: updatedLimits,
      message: 'Лимиты успешно обновлены'
    });

  } catch (error: any) {
    logger.error('Ошибка обновления лимитов:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Внутренняя ошибка сервера'
    });
  }
});

/**
 * GET /api/game-size/recommendations/:genre
 * Получает рекомендации для конкретного жанра
 */
router.get('/recommendations/:genre', async (req, res) => {
  try {
    const { genre } = req.params;
    
    if (!genre) {
      return res.status(400).json({
        success: false,
        error: 'Требуется genre'
      });
    }

    const recommendations = sizeController.getGenreSpecificRecommendations(genre);
    
    res.json({
      success: true,
      genre,
      recommendations,
      count: recommendations.length
    });

  } catch (error: any) {
    logger.error('Ошибка получения рекомендаций:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Внутренняя ошибка сервера'
    });
  }
});

/**
 * POST /api/game-size/monitor/start
 * Запускает мониторинг размера игры
 */
router.post('/monitor/start', rateLimit(5, 60 * 1000), async (req, res) => {
  try {
    const { gameDir, intervalMs } = req.body;

    if (!gameDir) {
      return res.status(400).json({
        success: false,
        error: 'Требуется gameDir'
      });
    }

    const interval = intervalMs || 30000; // 30 секунд по умолчанию
    
    if (interval < 10000) {
      return res.status(400).json({
        success: false,
        error: 'Минимальный интервал мониторинга: 10 секунд'
      });
    }

    // Проверяем безопасность пути
    const safePath = path.resolve(gameDir);
    const projectRoot = path.resolve(process.cwd());
    
    if (!safePath.startsWith(projectRoot)) {
      return res.status(400).json({
        success: false,
        error: 'Недопустимый путь к игре'
      });
    }

    // Запускаем мониторинг (без ожидания)
    sizeController.startSizeMonitoring(gameDir, interval);
    
    logger.info(`👁️ Мониторинг размера запущен для ${gameDir} с интервалом ${interval}ms`);
    
    res.json({
      success: true,
      message: 'Мониторинг размера запущен',
      gameDir,
      intervalMs: interval
    });

  } catch (error: any) {
    logger.error('Ошибка запуска мониторинга:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Внутренняя ошибка сервера'
    });
  }
});

/**
 * POST /api/game-size/export-report
 * Экспортирует отчет о размере в файл
 */
router.post('/export-report', rateLimit(10, 60 * 1000), async (req, res) => {
  try {
    const { report, outputPath } = req.body;

    if (!report || !outputPath) {
      return res.status(400).json({
        success: false,
        error: 'Требуются report и outputPath'
      });
    }

    // Проверяем безопасность выходного пути
    const safePath = path.resolve(outputPath);
    const projectRoot = path.resolve(process.cwd());
    
    if (!safePath.startsWith(projectRoot)) {
      return res.status(400).json({
        success: false,
        error: 'Недопустимый путь для экспорта'
      });
    }

    await sizeController.exportReport(report, outputPath);
    
    res.json({
      success: true,
      message: 'Отчет успешно экспортирован',
      outputPath
    });

  } catch (error: any) {
    logger.error('Ошибка экспорта отчета:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Внутренняя ошибка сервера'
    });
  }
});

/**
 * GET /api/game-size/compliance-check/:size
 * Быстрая проверка соответствия размера лимитам
 */
router.get('/compliance-check/:size', async (req, res) => {
  try {
    const sizeBytes = parseInt(req.params.size);
    
    if (isNaN(sizeBytes) || sizeBytes < 0) {
      return res.status(400).json({
        success: false,
        error: 'Размер должен быть положительным числом'
      });
    }

    const limits = sizeController.getLimits();
    
    const compliance = {
      withinLimit: sizeBytes <= limits.max,
      exceedsBy: Math.max(0, sizeBytes - limits.max),
      status: sizeBytes <= limits.target ? 'optimal' : 
              sizeBytes <= limits.warning ? 'acceptable' :
              sizeBytes <= limits.max ? 'warning' : 'exceeded',
      percentage: (sizeBytes / limits.max) * 100
    };

    res.json({
      success: true,
      sizeBytes,
      sizeMB: (sizeBytes / (1024 * 1024)).toFixed(2),
      compliance,
      limits
    });

  } catch (error: any) {
    logger.error('Ошибка проверки соответствия:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Внутренняя ошибка сервера'
    });
  }
});

/**
 * WebSocket события для мониторинга размера
 */
sizeController.on('size:analyzed', (report) => {
  logger.info(`📊 Размер игры ${report.gameId}: ${(report.totalSize / (1024 * 1024)).toFixed(2)}MB`);
});

sizeController.on('size:warning', (report) => {
  logger.warn(`⚠️ Предупреждение о размере игры ${report.gameId}: ${(report.totalSize / (1024 * 1024)).toFixed(2)}MB`);
});

sizeController.on('size:limit_exceeded', (report) => {
  logger.error(`❌ Превышен лимит размера игры ${report.gameId}: ${(report.totalSize / (1024 * 1024)).toFixed(2)}MB`);
});

sizeController.on('optimization:completed', (result) => {
  const savingsPercent = ((result.savings / result.originalSize) * 100).toFixed(1);
  logger.info(`✅ Оптимизация завершена: сэкономлено ${savingsPercent}%`);
});

export default router; 
import { Router } from 'express';
import { RealTimeQualityMonitoring } from '../services/realTimeQualityMonitoring';
import { LoggerService } from '../services/logger';
import { validateRequest } from '../middleware/validation';
import { z } from 'zod';

const router = Router();
const logger = new LoggerService();

// Singleton instance of quality monitoring
let qualityMonitor: RealTimeQualityMonitoring | null = null;

// Get or create quality monitoring instance
const getQualityMonitor = (): RealTimeQualityMonitoring => {
  if (!qualityMonitor) {
    qualityMonitor = new RealTimeQualityMonitoring();
  }
  return qualityMonitor;
};

// Схемы валидации
const addMetricSchema = z.object({
  type: z.enum(['game_generation', 'asset_generation', 'code_quality', 'performance']),
  subType: z.string().optional(),
  qualityScore: z.number().min(0).max(100),
  details: z.object({
    technicalScore: z.number().min(0).max(100).optional(),
    aestheticScore: z.number().min(0).max(100).optional(),
    gameRelevanceScore: z.number().min(0).max(100).optional(),
    performanceScore: z.number().min(0).max(100).optional(),
    codeQuality: z.number().min(0).max(100).optional(),
    issues: z.array(z.string()),
    recommendations: z.array(z.string())
  }),
  metadata: z.object({
    gameId: z.string().optional(),
    assetId: z.string().optional(),
    generationTime: z.number().min(0),
    aiModel: z.string(),
    promptLength: z.number().optional(),
    retryCount: z.number().optional()
  })
});

const setThresholdsSchema = z.object({
  critical: z.number().min(0).max(100).optional(),
  high: z.number().min(0).max(100).optional(),
  medium: z.number().min(0).max(100).optional(),
  low: z.number().min(0).max(100).optional()
});

const getTrendsSchema = z.object({
  timeWindow: z.enum(['5m', '15m', '1h', '6h', '24h']).default('1h')
});

const getAlertsSchema = z.object({
  limit: z.number().min(1).max(1000).default(50),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional()
});

/**
 * POST /api/quality-monitoring/metrics
 * Добавление новой метрики качества
 */
router.post('/metrics', validateRequest(addMetricSchema), async (req, res) => {
  try {
    const metricData = req.body;
    
    logger.info(`📊 Добавление метрики качества: ${metricData.type} - ${metricData.qualityScore}/100`);

    const monitor = getQualityMonitor();
    monitor.addQualityMetric(metricData);

    res.json({
      success: true,
      message: 'Метрика качества добавлена',
      timestamp: new Date()
    });

  } catch (error) {
    logger.error('Ошибка добавления метрики качества:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка добавления метрики',
      details: error.message
    });
  }
});

/**
 * GET /api/quality-monitoring/stats
 * Получение статистики мониторинга
 */
router.get('/stats', async (req, res) => {
  try {
    const monitor = getQualityMonitor();
    const stats = monitor.getMonitoringStats();
    
    res.json({
      success: true,
      data: stats,
      timestamp: new Date()
    });

  } catch (error) {
    logger.error('Ошибка получения статистики мониторинга:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка получения статистики',
      details: error.message
    });
  }
});

/**
 * POST /api/quality-monitoring/thresholds
 * Установка порогов качества
 */
router.post('/thresholds', validateRequest(setThresholdsSchema), async (req, res) => {
  try {
    const thresholds = req.body;
    
    logger.info('📊 Обновление порогов качества:', thresholds);

    const monitor = getQualityMonitor();
    monitor.setQualityThresholds(thresholds);

    res.json({
      success: true,
      message: 'Пороги качества обновлены',
      thresholds,
      timestamp: new Date()
    });

  } catch (error) {
    logger.error('Ошибка установки порогов качества:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка установки порогов',
      details: error.message
    });
  }
});

/**
 * GET /api/quality-monitoring/trends
 * Получение трендов качества
 */
router.get('/trends', async (req, res) => {
  try {
    const { timeWindow = '1h' } = req.query;
    
    // Валидация временного окна
    const validWindows = ['5m', '15m', '1h', '6h', '24h'];
    if (!validWindows.includes(timeWindow as string)) {
      return res.status(400).json({
        success: false,
        error: 'Неверное временное окно',
        validWindows
      });
    }

    const monitor = getQualityMonitor();
    const trends = monitor['calculateQualityTrends'](timeWindow as string);

    // Конвертируем Map в обычный объект для JSON
    const trendsForJson = {
      ...trends,
      issueFrequency: Object.fromEntries(trends.issueFrequency)
    };

    res.json({
      success: true,
      data: trendsForJson,
      timeWindow,
      timestamp: new Date()
    });

  } catch (error) {
    logger.error('Ошибка получения трендов качества:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка получения трендов',
      details: error.message
    });
  }
});

/**
 * GET /api/quality-monitoring/alerts
 * Получение истории алертов
 */
router.get('/alerts', async (req, res) => {
  try {
    const { limit = 50, severity } = req.query;
    
    const monitor = getQualityMonitor();
    const stats = monitor.getMonitoringStats();
    
    let alerts = stats.recentAlerts || [];
    
    // Фильтрация по серьезности
    if (severity) {
      alerts = alerts.filter((alert: any) => alert.severity === severity);
    }
    
    // Ограничение количества
    const limitNum = Math.min(parseInt(limit as string) || 50, 1000);
    alerts = alerts.slice(0, limitNum);

    res.json({
      success: true,
      data: {
        alerts,
        count: alerts.length,
        filters: { limit: limitNum, severity }
      },
      timestamp: new Date()
    });

  } catch (error) {
    logger.error('Ошибка получения алертов:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка получения алертов',
      details: error.message
    });
  }
});

/**
 * POST /api/quality-monitoring/cleanup
 * Очистка старых данных
 */
router.post('/cleanup', async (req, res) => {
  try {
    const { maxAge = 24 } = req.body; // часы
    
    const maxAgeMs = maxAge * 60 * 60 * 1000;
    
    logger.info(`🧹 Запуск очистки данных старше ${maxAge} часов`);

    const monitor = getQualityMonitor();
    monitor.cleanupOldData(maxAgeMs);

    res.json({
      success: true,
      message: `Данные старше ${maxAge} часов очищены`,
      maxAge,
      timestamp: new Date()
    });

  } catch (error) {
    logger.error('Ошибка очистки данных:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка очистки данных',
      details: error.message
    });
  }
});

/**
 * POST /api/quality-monitoring/simulate
 * Симуляция метрик для тестирования (только для разработки)
 */
router.post('/simulate', async (req, res) => {
  try {
    const { count = 10, type = 'asset_generation' } = req.body;
    
    logger.info(`🎭 Симуляция ${count} метрик типа ${type}`);

    const monitor = getQualityMonitor();
    
    for (let i = 0; i < count; i++) {
      const qualityScore = 30 + Math.random() * 70; // 30-100
      const generationTime = 1000 + Math.random() * 15000; // 1-16 секунд
      
      const metric = {
        type: type as 'game_generation' | 'asset_generation' | 'code_quality' | 'performance',
        subType: type === 'asset_generation' ? ['sprite', 'background', 'ui'][Math.floor(Math.random() * 3)] : undefined,
        qualityScore: Math.round(qualityScore),
        details: {
          technicalScore: Math.round(qualityScore + (Math.random() - 0.5) * 20),
          aestheticScore: Math.round(qualityScore + (Math.random() - 0.5) * 15),
          gameRelevanceScore: Math.round(qualityScore + (Math.random() - 0.5) * 10),
          issues: qualityScore < 60 ? ['Низкое качество', 'Проблемы с генерацией'] : [],
          recommendations: qualityScore < 60 ? ['Улучшить промпт', 'Проверить параметры'] : []
        },
        metadata: {
          gameId: `game_${Math.floor(Math.random() * 100)}`,
          assetId: type === 'asset_generation' ? `asset_${Math.floor(Math.random() * 1000)}` : undefined,
          generationTime: Math.round(generationTime),
          aiModel: ['openai', 'claude', 'deepseek'][Math.floor(Math.random() * 3)],
          promptLength: 50 + Math.random() * 200,
          retryCount: qualityScore < 50 ? Math.floor(Math.random() * 3) : 0
        }
      };
      
      monitor.addQualityMetric(metric);
      
      // Небольшая задержка между метриками
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    res.json({
      success: true,
      message: `Сгенерировано ${count} тестовых метрик`,
      count,
      type,
      timestamp: new Date()
    });

  } catch (error) {
    logger.error('Ошибка симуляции метрик:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка симуляции',
      details: error.message
    });
  }
});

/**
 * GET /api/quality-monitoring/dashboard-data
 * Получение всех данных для дашборда мониторинга
 */
router.get('/dashboard-data', async (req, res) => {
  try {
    const { timeWindow = '1h' } = req.query;
    
    const monitor = getQualityMonitor();
    const stats = monitor.getMonitoringStats();
    const trends = monitor['calculateQualityTrends'](timeWindow as string);
    
    // Подготавливаем данные для дашборда
    const dashboardData = {
      stats: {
        ...stats,
        uptime: Date.now() - stats.uptime.getTime()
      },
      trends: {
        ...trends,
        issueFrequency: Object.fromEntries(trends.issueFrequency)
      },
      recentAlerts: stats.recentAlerts?.slice(0, 10) || [],
      healthStatus: stats.averageQuality >= 80 ? 'excellent' : 
                   stats.averageQuality >= 60 ? 'good' :
                   stats.averageQuality >= 40 ? 'warning' : 'critical'
    };

    res.json({
      success: true,
      data: dashboardData,
      timestamp: new Date()
    });

  } catch (error) {
    logger.error('Ошибка получения данных дашборда:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка получения данных дашборда',
      details: error.message
    });
  }
});

/**
 * POST /api/quality-monitoring/bulk-metrics
 * Массовое добавление метрик
 */
router.post('/bulk-metrics', async (req, res) => {
  try {
    const { metrics } = req.body;
    
    if (!Array.isArray(metrics)) {
      return res.status(400).json({
        success: false,
        error: 'Метрики должны быть массивом'
      });
    }

    logger.info(`📊 Массовое добавление ${metrics.length} метрик`);

    const monitor = getQualityMonitor();
    let successCount = 0;
    const errors = [];

    for (const [index, metricData] of metrics.entries()) {
      try {
        // Валидация каждой метрики
        const validatedMetric = addMetricSchema.parse(metricData);
        monitor.addQualityMetric(validatedMetric);
        successCount++;
      } catch (error) {
        errors.push({
          index,
          error: error.message,
          metric: metricData
        });
      }
    }

    res.json({
      success: true,
      message: `Обработано ${metrics.length} метрик`,
      results: {
        total: metrics.length,
        successful: successCount,
        failed: errors.length,
        errors: errors.slice(0, 10) // Показываем только первые 10 ошибок
      },
      timestamp: new Date()
    });

  } catch (error) {
    logger.error('Ошибка массового добавления метрик:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка массового добавления метрик',
      details: error.message
    });
  }
});

// Экспорт функции для инициализации WebSocket
export const initializeQualityMonitoringWebSocket = (io: any) => {
  const monitor = getQualityMonitor();
  monitor.initializeWebSocket(io);
  logger.info('📡 WebSocket для мониторинга качества инициализирован');
};

// Экспорт функции для получения инстанса мониторинга
export const getQualityMonitoringInstance = () => getQualityMonitor();

export default router; 
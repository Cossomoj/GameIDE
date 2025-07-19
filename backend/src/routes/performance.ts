import { Router } from 'express';
import { performanceService } from '../services/performance';
import { logger } from '../services/logger';

const router = Router();

// Получение текущих метрик производительности
router.get('/metrics', async (req, res) => {
  try {
    const metrics = performanceService.getMetrics();
    
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    logger.error('Error getting performance metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get performance metrics'
    });
  }
});

// Получение полного отчета о производительности
router.get('/report', async (req, res) => {
  try {
    const report = performanceService.getPerformanceReport();
    
    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    logger.error('Error generating performance report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate performance report'
    });
  }
});

// Получение конфигурации производительности
router.get('/config', async (req, res) => {
  try {
    const config = performanceService.getConfig();
    
    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    logger.error('Error getting performance config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get performance config'
    });
  }
});

// Обновление конфигурации производительности
router.patch('/config', async (req, res) => {
  try {
    const updates = req.body;
    
    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Invalid configuration data'
      });
    }

    performanceService.updateConfig(updates);
    const newConfig = performanceService.getConfig();
    
    res.json({
      success: true,
      data: newConfig,
      message: 'Performance configuration updated'
    });
  } catch (error) {
    logger.error('Error updating performance config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update performance config'
    });
  }
});

// Настройка качества графики
router.post('/graphics/quality', async (req, res) => {
  try {
    const { quality } = req.body;
    
    if (!quality || !['low', 'medium', 'high', 'ultra'].includes(quality)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid graphics quality. Must be: low, medium, high, or ultra'
      });
    }

    performanceService.setGraphicsQuality(quality);
    const config = performanceService.getConfig();
    
    res.json({
      success: true,
      data: {
        quality,
        graphics: config.graphics
      },
      message: `Graphics quality set to ${quality}`
    });
  } catch (error) {
    logger.error('Error setting graphics quality:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to set graphics quality'
    });
  }
});

// Автоматическая настройка качества графики
router.post('/graphics/auto-adjust', async (req, res) => {
  try {
    performanceService.autoAdjustQuality();
    const config = performanceService.getConfig();
    
    res.json({
      success: true,
      data: {
        quality: config.graphics.quality,
        graphics: config.graphics
      },
      message: 'Graphics quality auto-adjusted'
    });
  } catch (error) {
    logger.error('Error auto-adjusting graphics quality:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to auto-adjust graphics quality'
    });
  }
});

// Управление кешем

// Получение информации о кеше
router.get('/cache/info', async (req, res) => {
  try {
    const metrics = performanceService.getMetrics();
    const config = performanceService.getConfig();
    
    const cacheInfo = {
      metrics: metrics.cache,
      config: config.cache,
      efficiency: {
        hitRate: metrics.cache.hitRate,
        memoryUsage: metrics.cache.memoryUsage,
        entriesCount: metrics.cache.size
      }
    };
    
    res.json({
      success: true,
      data: cacheInfo
    });
  } catch (error) {
    logger.error('Error getting cache info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get cache info'
    });
  }
});

// Очистка кеша
router.post('/cache/clear', async (req, res) => {
  try {
    performanceService.clearCache();
    
    res.json({
      success: true,
      message: 'Cache cleared successfully'
    });
  } catch (error) {
    logger.error('Error clearing cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache'
    });
  }
});

// Установка значения в кеш
router.post('/cache/set', async (req, res) => {
  try {
    const { key, value, options } = req.body;
    
    if (!key) {
      return res.status(400).json({
        success: false,
        error: 'Cache key is required'
      });
    }

    await performanceService.cacheSet(key, value, options);
    
    res.json({
      success: true,
      message: 'Value cached successfully'
    });
  } catch (error) {
    logger.error('Error setting cache value:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to set cache value'
    });
  }
});

// Получение значения из кеша
router.get('/cache/get/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const value = await performanceService.cacheGet(key);
    
    if (value === null) {
      return res.status(404).json({
        success: false,
        error: 'Cache key not found or expired'
      });
    }

    res.json({
      success: true,
      data: value
    });
  } catch (error) {
    logger.error('Error getting cache value:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get cache value'
    });
  }
});

// Управление ресурсами

// Добавление ресурса в очередь загрузки
router.post('/resources/queue', async (req, res) => {
  try {
    const resource = req.body;
    
    // Валидация ресурса
    if (!resource.id || !resource.url || !resource.type) {
      return res.status(400).json({
        success: false,
        error: 'Resource must have id, url, and type'
      });
    }

    if (!['image', 'audio', 'json', 'text', 'binary'].includes(resource.type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid resource type'
      });
    }

    if (!['critical', 'high', 'medium', 'low'].includes(resource.priority)) {
      resource.priority = 'medium';
    }

    performanceService.queueResource(resource);
    
    res.json({
      success: true,
      message: 'Resource queued for loading'
    });
  } catch (error) {
    logger.error('Error queuing resource:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to queue resource'
    });
  }
});

// Предварительная загрузка критических ресурсов
router.post('/resources/preload', async (req, res) => {
  try {
    const { resources } = req.body;
    
    if (!Array.isArray(resources)) {
      return res.status(400).json({
        success: false,
        error: 'Resources must be an array'
      });
    }

    await performanceService.preloadCriticalResources(resources);
    
    res.json({
      success: true,
      message: `Preloading ${resources.length} resources`
    });
  } catch (error) {
    logger.error('Error preloading resources:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to preload resources'
    });
  }
});

// Оптимизация производительности

// Сброс метрик производительности
router.post('/metrics/reset', async (req, res) => {
  try {
    performanceService.resetMetrics();
    
    res.json({
      success: true,
      message: 'Performance metrics reset'
    });
  } catch (error) {
    logger.error('Error resetting performance metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset performance metrics'
    });
  }
});

// Принудительная сборка мусора
router.post('/gc/force', async (req, res) => {
  try {
    // Эмитируем событие для принудительной сборки мусора
    performanceService.emit('force-gc');
    
    // Собираем мусор если доступен global.gc
    if (global.gc) {
      const before = process.memoryUsage().heapUsed;
      global.gc();
      const after = process.memoryUsage().heapUsed;
      const freed = before - after;
      
      res.json({
        success: true,
        data: {
          freedMemory: freed,
          beforeMB: Math.round(before / 1024 / 1024),
          afterMB: Math.round(after / 1024 / 1024)
        },
        message: 'Garbage collection completed'
      });
    } else {
      res.json({
        success: true,
        message: 'Garbage collection requested (global.gc not available)'
      });
    }
  } catch (error) {
    logger.error('Error forcing garbage collection:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to force garbage collection'
    });
  }
});

// Диагностика производительности

// Анализ узких мест производительности
router.get('/analysis/bottlenecks', async (req, res) => {
  try {
    const metrics = performanceService.getMetrics();
    const bottlenecks = [];

    // Анализируем метрики для поиска проблем
    if (metrics.memory.percentage > 80) {
      bottlenecks.push({
        type: 'memory',
        severity: 'high',
        description: 'Высокое использование памяти',
        value: `${metrics.memory.percentage.toFixed(1)}%`,
        recommendation: 'Рассмотрите очистку кеша или оптимизацию приложения'
      });
    }

    if (metrics.graphics.fps < 30) {
      bottlenecks.push({
        type: 'graphics',
        severity: 'high',
        description: 'Низкий FPS',
        value: `${metrics.graphics.fps.toFixed(1)} FPS`,
        recommendation: 'Понизьте качество графики или оптимизируйте рендеринг'
      });
    }

    if (metrics.cache.hitRate < 50) {
      bottlenecks.push({
        type: 'cache',
        severity: 'medium',
        description: 'Низкий коэффициент попаданий в кеш',
        value: `${metrics.cache.hitRate.toFixed(1)}%`,
        recommendation: 'Пересмотрите стратегию кеширования'
      });
    }

    if (metrics.network.latency > 1000) {
      bottlenecks.push({
        type: 'network',
        severity: 'medium',
        description: 'Высокая задержка сети',
        value: `${metrics.network.latency.toFixed(0)}ms`,
        recommendation: 'Проверьте качество соединения или используйте CDN'
      });
    }

    if (metrics.cpu.usage > 80) {
      bottlenecks.push({
        type: 'cpu',
        severity: 'high',
        description: 'Высокая загрузка CPU',
        value: `${metrics.cpu.usage.toFixed(1)}%`,
        recommendation: 'Оптимизируйте алгоритмы или распределите нагрузку'
      });
    }

    res.json({
      success: true,
      data: {
        bottlenecks,
        totalIssues: bottlenecks.length,
        severity: bottlenecks.length > 0 ? Math.max(...bottlenecks.map(b => 
          b.severity === 'high' ? 3 : b.severity === 'medium' ? 2 : 1
        )) : 0
      }
    });
  } catch (error) {
    logger.error('Error analyzing performance bottlenecks:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze performance bottlenecks'
    });
  }
});

// Получение рекомендаций по оптимизации
router.get('/recommendations', async (req, res) => {
  try {
    const report = performanceService.getPerformanceReport();
    const metrics = report.metrics;
    const config = report.config;
    
    const recommendations = [...report.recommendations];

    // Дополнительные рекомендации на основе конфигурации
    if (!config.cache.enabled) {
      recommendations.push('Включите кеширование для улучшения производительности.');
    }

    if (config.graphics.quality === 'ultra' && metrics.graphics.fps < 60) {
      recommendations.push('Рассмотрите понижение качества графики для стабильного 60 FPS.');
    }

    if (config.resources.maxConcurrentLoads > 10) {
      recommendations.push('Слишком много одновременных загрузок может снизить производительность.');
    }

    if (!config.memory.enableAutoCleanup) {
      recommendations.push('Включите автоматическую очистку памяти для предотвращения утечек.');
    }

    res.json({
      success: true,
      data: {
        recommendations,
        totalCount: recommendations.length,
        categories: {
          memory: recommendations.filter(r => r.toLowerCase().includes('памят')).length,
          graphics: recommendations.filter(r => r.toLowerCase().includes('граф') || r.toLowerCase().includes('fps')).length,
          cache: recommendations.filter(r => r.toLowerCase().includes('кеш')).length,
          network: recommendations.filter(r => r.toLowerCase().includes('сет')).length
        }
      }
    });
  } catch (error) {
    logger.error('Error getting performance recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get performance recommendations'
    });
  }
});

// Применение автоматических оптимизаций
router.post('/optimize/auto', async (req, res) => {
  try {
    const report = performanceService.getPerformanceReport();
    const metrics = report.metrics;
    const optimizations = [];

    // Автоматическая настройка качества графики
    if (metrics.graphics.fps < 30) {
      performanceService.autoAdjustQuality();
      optimizations.push('Понижено качество графики для улучшения FPS');
    }

    // Очистка кеша при высоком использовании памяти
    if (metrics.memory.percentage > 85) {
      performanceService.clearCache();
      optimizations.push('Очищен кеш для освобождения памяти');
    }

    // Принудительная сборка мусора
    if (global.gc && metrics.memory.percentage > 75) {
      global.gc();
      optimizations.push('Выполнена сборка мусора');
    }

    res.json({
      success: true,
      data: {
        optimizations,
        appliedCount: optimizations.length
      },
      message: `Применено ${optimizations.length} оптимизаций`
    });
  } catch (error) {
    logger.error('Error applying automatic optimizations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to apply automatic optimizations'
    });
  }
});

// Мониторинг в реальном времени

// WebSocket для реального времени (заглушка)
router.get('/realtime/status', async (req, res) => {
  try {
    const metrics = performanceService.getMetrics();
    
    // Определяем общий статус производительности
    let status = 'excellent';
    let score = 100;

    if (metrics.memory.percentage > 80) {
      status = 'poor';
      score -= 30;
    } else if (metrics.memory.percentage > 60) {
      status = 'fair';
      score -= 15;
    }

    if (metrics.graphics.fps < 30) {
      status = 'poor';
      score -= 25;
    } else if (metrics.graphics.fps < 50) {
      status = 'fair';
      score -= 10;
    }

    if (metrics.cache.hitRate < 50) {
      score -= 10;
    }

    if (metrics.network.errors > 5) {
      score -= 15;
    }

    if (score < 50) status = 'poor';
    else if (score < 75) status = 'fair';
    else if (score < 90) status = 'good';

    res.json({
      success: true,
      data: {
        status,
        score,
        metrics: {
          memory: metrics.memory.percentage,
          fps: metrics.graphics.fps,
          cacheHitRate: metrics.cache.hitRate,
          networkErrors: metrics.network.errors
        },
        timestamp: new Date()
      }
    });
  } catch (error) {
    logger.error('Error getting realtime performance status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get realtime performance status'
    });
  }
});

export default router; 
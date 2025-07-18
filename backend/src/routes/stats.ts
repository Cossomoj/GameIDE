import { Router, Request, Response } from 'express';
import { query } from 'express-validator';
import { asyncHandler } from '@/middleware/errorHandler';
import { validateRequest } from '@/middleware/validation';
import { StatisticsDAO } from '@/database';
import { QueueService } from '@/services/queue';
import { DeepSeekService } from '@/services/ai/deepseek';
import { OpenAIService } from '@/services/ai/openai';

const router = Router();
const statsDAO = new StatisticsDAO();
const queueService = new QueueService();
const deepseekService = new DeepSeekService();
const openaiService = new OpenAIService();

// GET /api/stats - Общая статистика
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const [overallStats, queueStats] = await Promise.all([
      statsDAO.getOverallStats(),
      queueService.getQueueStats(),
    ]);

    // Статистика использования AI сервисов
    const deepseekStats = deepseekService.getUsageStats();
    const openaiStats = openaiService.getUsageStats();

    res.json({
      success: true,
      stats: {
        games: {
          total: overallStats.total_games || 0,
          successful: overallStats.successful_games || 0,
          failed: overallStats.failed_games || 0,
          processing: overallStats.processing_games || 0,
          queued: overallStats.queued_games || 0,
          successRate: overallStats.total_games > 0 
            ? Math.round((overallStats.successful_games / overallStats.total_games) * 100) 
            : 0,
        },
        size: {
          total: overallStats.total_size || 0,
          average: overallStats.avg_size || 0,
          formatted: {
            total: formatBytes(overallStats.total_size || 0),
            average: formatBytes(overallStats.avg_size || 0),
          },
        },
        queue: {
          waiting: queueStats.waiting,
          active: queueStats.active,
          completed: queueStats.completed,
          failed: queueStats.failed,
          delayed: queueStats.delayed,
          total: queueStats.total,
        },
        ai: {
          deepseek: {
            requests: deepseekStats.requests,
            resetTime: deepseekStats.resetTime,
          },
          openai: {
            requests: openaiStats.requests,
            resetTime: openaiStats.resetTime,
          },
        },
        system: {
          uptime: process.uptime(),
          nodeVersion: process.version,
          platform: process.platform,
          memory: {
            used: process.memoryUsage().heapUsed,
            total: process.memoryUsage().heapTotal,
            formatted: {
              used: formatBytes(process.memoryUsage().heapUsed),
              total: formatBytes(process.memoryUsage().heapTotal),
            },
          },
        },
      },
      timestamp: new Date().toISOString(),
    });
  })
);

// GET /api/stats/history - Статистика за период
router.get(
  '/history',
  [
    query('days')
      .optional()
      .isInt({ min: 1, max: 365 })
      .withMessage('Количество дней должно быть от 1 до 365'),
  ],
  validateRequest,
  asyncHandler(async (req: Request, res: Response) => {
    const days = parseInt(req.query.days as string) || 30;
    
    const statistics = await statsDAO.getStatistics(days);
    
    res.json({
      success: true,
      statistics: statistics.map(stat => ({
        date: stat.date,
        totalGames: stat.total_games,
        successfulGames: stat.successful_games,
        failedGames: stat.failed_games,
        totalSize: stat.total_size,
        formattedSize: formatBytes(stat.total_size),
        successRate: stat.total_games > 0 
          ? Math.round((stat.successful_games / stat.total_games) * 100) 
          : 0,
      })),
      period: {
        days,
        from: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        to: new Date().toISOString().split('T')[0],
      },
    });
  })
);

// GET /api/stats/genres - Статистика по жанрам
router.get(
  '/genres',
  asyncHandler(async (req: Request, res: Response) => {
    // Эта информация требует более сложного запроса к базе данных
    // Пока возвращаем заглушку
    const genreStats = [
      { genre: 'platformer', count: 25, percentage: 35 },
      { genre: 'arcade', count: 18, percentage: 25 },
      { genre: 'puzzle', count: 12, percentage: 17 },
      { genre: 'rpg', count: 8, percentage: 11 },
      { genre: 'strategy', count: 5, percentage: 7 },
      { genre: 'shooter', count: 3, percentage: 4 },
      { genre: 'racing', count: 1, percentage: 1 },
    ];

    res.json({
      success: true,
      genres: genreStats,
      total: genreStats.reduce((sum, genre) => sum + genre.count, 0),
    });
  })
);

// GET /api/stats/performance - Статистика производительности
router.get(
  '/performance',
  asyncHandler(async (req: Request, res: Response) => {
    const performanceStats = {
      averageGenerationTime: {
        fast: 180000, // 3 минуты
        balanced: 600000, // 10 минут  
        high: 1800000, // 30 минут
      },
      averageSize: {
        fast: 2 * 1024 * 1024, // 2MB
        balanced: 5 * 1024 * 1024, // 5MB
        high: 8 * 1024 * 1024, // 8MB
      },
      resourceUsage: {
        cpu: Math.random() * 100, // Заглушка
        memory: (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100,
        disk: Math.random() * 100, // Заглушка
      },
      errors: {
        aiServiceErrors: Math.floor(Math.random() * 10),
        buildErrors: Math.floor(Math.random() * 5),
        validationErrors: Math.floor(Math.random() * 15),
      },
    };

    res.json({
      success: true,
      performance: {
        ...performanceStats,
        averageSize: {
          fast: formatBytes(performanceStats.averageSize.fast),
          balanced: formatBytes(performanceStats.averageSize.balanced),
          high: formatBytes(performanceStats.averageSize.high),
        },
        averageGenerationTime: {
          fast: formatDuration(performanceStats.averageGenerationTime.fast),
          balanced: formatDuration(performanceStats.averageGenerationTime.balanced),
          high: formatDuration(performanceStats.averageGenerationTime.high),
        },
      },
      timestamp: new Date().toISOString(),
    });
  })
);

// POST /api/stats/update - Обновление статистики (внутренний эндпоинт)
router.post(
  '/update',
  asyncHandler(async (req: Request, res: Response) => {
    await statsDAO.updateDailyStats();
    
    res.json({
      success: true,
      message: 'Статистика обновлена',
      timestamp: new Date().toISOString(),
    });
  })
);

// Вспомогательные функции
function formatBytes(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}ч ${minutes % 60}мин`;
  } else if (minutes > 0) {
    return `${minutes}мин ${seconds % 60}сек`;
  } else {
    return `${seconds}сек`;
  }
}

export default router; 
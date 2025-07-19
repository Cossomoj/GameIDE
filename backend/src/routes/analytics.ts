import { Router } from 'express';
import { analyticsService } from '../services/analytics';
import { logger } from '../services/logger';

const router = Router();

// Отслеживание события
router.post('/track', async (req, res) => {
  try {
    const {
      sessionId,
      userId,
      eventType,
      eventName,
      properties,
      page,
      referrer,
      deviceInfo,
      gameInfo
    } = req.body;

    if (!eventType || !eventName) {
      return res.status(400).json({
        success: false,
        error: 'Event type and name are required'
      });
    }

    const eventId = analyticsService.trackEvent({
      sessionId,
      userId,
      eventType,
      eventName,
      properties: properties || {},
      page,
      referrer,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
      deviceInfo,
      gameInfo
    });

    res.json({
      success: true,
      data: {
        eventId,
        message: 'Event tracked successfully'
      }
    });
  } catch (error) {
    logger.error('Error tracking analytics event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track event'
    });
  }
});

// Массовое отслеживание событий
router.post('/track/batch', async (req, res) => {
  try {
    const { events } = req.body;

    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Events array is required and must not be empty'
      });
    }

    if (events.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 100 events per batch'
      });
    }

    const eventIds = events.map(eventData => {
      return analyticsService.trackEvent({
        ...eventData,
        userAgent: req.headers['user-agent'],
        ip: req.ip
      });
    });

    res.json({
      success: true,
      data: {
        eventIds,
        count: eventIds.length,
        message: 'Events tracked successfully'
      }
    });
  } catch (error) {
    logger.error('Error tracking batch analytics events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track events'
    });
  }
});

// Получение отчета
router.get('/reports/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const {
      startDate,
      endDate,
      period = 'day'
    } = req.query;

    if (!['overview', 'user_behavior', 'game_performance', 'monetization', 'custom'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid report type'
      });
    }

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    const report = analyticsService.generateReport(type as any, {
      start,
      end,
      period: period as any
    });

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    logger.error('Error generating analytics report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate report'
    });
  }
});

// Получение реальных метрик
router.get('/realtime', async (req, res) => {
  try {
    const metrics = analyticsService.getRealtimeMetrics();
    
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    logger.error('Error getting realtime metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get realtime metrics'
    });
  }
});

// Получение воронок конверсии
router.get('/funnels', async (req, res) => {
  try {
    const funnels = analyticsService.getFunnels();
    
    res.json({
      success: true,
      data: funnels
    });
  } catch (error) {
    logger.error('Error getting conversion funnels:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get funnels'
    });
  }
});

// Анализ конкретной воронки
router.get('/funnels/:funnelId/analysis', async (req, res) => {
  try {
    const { funnelId } = req.params;
    const {
      startDate,
      endDate
    } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    const analysis = analyticsService.analyzeFunnel(funnelId, { start, end });
    
    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    logger.error('Error analyzing funnel:', error);
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({
        success: false,
        error: 'Funnel not found'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to analyze funnel'
      });
    }
  }
});

// Получение пользовательских сессий
router.get('/users/:userId/sessions', async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;

    const sessions = analyticsService.getUserSessions(userId, limit);
    
    res.json({
      success: true,
      data: {
        sessions,
        total: sessions.length
      }
    });
  } catch (error) {
    logger.error('Error getting user sessions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user sessions'
    });
  }
});

// Экспорт данных
router.get('/export/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const {
      format = 'json',
      startDate,
      endDate
    } = req.query;

    if (!['events', 'sessions', 'metrics'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid export type'
      });
    }

    if (!['json', 'csv'].includes(format as string)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid format. Use json or csv'
      });
    }

    const timeframe = startDate && endDate ? {
      start: new Date(startDate as string),
      end: new Date(endDate as string)
    } : undefined;

    const exportData = analyticsService.exportData(
      format as any,
      type as any,
      timeframe
    );

    // Установка заголовков для скачивания файла
    const filename = `analytics_${type}_${new Date().toISOString().split('T')[0]}.${format}`;
    const contentType = format === 'csv' ? 'text/csv' : 'application/json';
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(exportData);
  } catch (error) {
    logger.error('Error exporting analytics data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export data'
    });
  }
});

// Получение топ событий
router.get('/events/top', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const realtime = analyticsService.getRealtimeMetrics();
    
    const topEvents = realtime.topEvents.slice(0, limit);
    
    res.json({
      success: true,
      data: {
        events: topEvents,
        total: realtime.eventsLastHour
      }
    });
  } catch (error) {
    logger.error('Error getting top events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get top events'
    });
  }
});

// Получение статистики по страницам
router.get('/pages/stats', async (req, res) => {
  try {
    const {
      startDate,
      endDate
    } = req.query;

    // В реальном приложении здесь была бы более сложная логика
    // Пока возвращаем примерные данные
    const pageStats = [
      {
        page: '/',
        pageViews: 1250,
        uniqueViews: 890,
        avgTimeOnPage: 145,
        bounceRate: 65.5,
        exitRate: 45.2
      },
      {
        page: '/games',
        pageViews: 980,
        uniqueViews: 745,
        avgTimeOnPage: 210,
        bounceRate: 35.8,
        exitRate: 25.1
      },
      {
        page: '/create',
        pageViews: 650,
        uniqueViews: 520,
        avgTimeOnPage: 320,
        bounceRate: 25.4,
        exitRate: 15.8
      },
      {
        page: '/achievements',
        pageViews: 420,
        uniqueViews: 340,
        avgTimeOnPage: 180,
        bounceRate: 40.2,
        exitRate: 30.5
      },
      {
        page: '/leaderboards',
        pageViews: 380,
        uniqueViews: 310,
        avgTimeOnPage: 195,
        bounceRate: 38.7,
        exitRate: 28.9
      }
    ];
    
    res.json({
      success: true,
      data: {
        pages: pageStats,
        timeframe: {
          start: startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          end: endDate || new Date()
        }
      }
    });
  } catch (error) {
    logger.error('Error getting page stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get page stats'
    });
  }
});

// Получение статистики по устройствам
router.get('/devices/stats', async (req, res) => {
  try {
    // Примерные данные по устройствам
    const deviceStats = {
      platforms: [
        { name: 'Desktop', value: 65.2, sessions: 1420 },
        { name: 'Mobile', value: 28.5, sessions: 620 },
        { name: 'Tablet', value: 6.3, sessions: 137 }
      ],
      browsers: [
        { name: 'Chrome', value: 45.8, sessions: 997 },
        { name: 'Safari', value: 23.4, sessions: 509 },
        { name: 'Firefox', value: 15.7, sessions: 342 },
        { name: 'Edge', value: 10.2, sessions: 222 },
        { name: 'Other', value: 4.9, sessions: 107 }
      ],
      operatingSystems: [
        { name: 'Windows', value: 52.1, sessions: 1134 },
        { name: 'macOS', value: 25.8, sessions: 562 },
        { name: 'iOS', value: 12.3, sessions: 268 },
        { name: 'Android', value: 8.4, sessions: 183 },
        { name: 'Linux', value: 1.4, sessions: 30 }
      ],
      screenResolutions: [
        { name: '1920x1080', value: 35.2, sessions: 766 },
        { name: '1366x768', value: 18.9, sessions: 411 },
        { name: '375x667', value: 12.4, sessions: 270 },
        { name: '414x896', value: 10.8, sessions: 235 },
        { name: 'Other', value: 22.7, sessions: 495 }
      ]
    };
    
    res.json({
      success: true,
      data: deviceStats
    });
  } catch (error) {
    logger.error('Error getting device stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get device stats'
    });
  }
});

// Получение статистики по регионам
router.get('/geo/stats', async (req, res) => {
  try {
    // Примерные данные по регионам
    const geoStats = {
      countries: [
        { name: 'Россия', code: 'RU', value: 58.2, sessions: 1267, flag: '🇷🇺' },
        { name: 'Украина', code: 'UA', value: 15.8, sessions: 344, flag: '🇺🇦' },
        { name: 'Беларусь', code: 'BY', value: 12.4, sessions: 270, flag: '🇧🇾' },
        { name: 'Казахстан', code: 'KZ', value: 8.9, sessions: 194, flag: '🇰🇿' },
        { name: 'Другие', code: 'OTHER', value: 4.7, sessions: 102, flag: '🌍' }
      ],
      cities: [
        { name: 'Москва', value: 22.1, sessions: 481 },
        { name: 'Санкт-Петербург', value: 8.7, sessions: 189 },
        { name: 'Киев', value: 6.4, sessions: 139 },
        { name: 'Минск', value: 5.2, sessions: 113 },
        { name: 'Алматы', value: 3.8, sessions: 83 },
        { name: 'Другие', value: 53.8, sessions: 1172 }
      ],
      languages: [
        { name: 'Русский', code: 'ru', value: 78.5, sessions: 1709 },
        { name: 'Английский', code: 'en', value: 12.3, sessions: 268 },
        { name: 'Украинский', code: 'uk', value: 5.8, sessions: 126 },
        { name: 'Белорусский', code: 'be', value: 2.1, sessions: 46 },
        { name: 'Другие', code: 'other', value: 1.3, sessions: 28 }
      ]
    };
    
    res.json({
      success: true,
      data: geoStats
    });
  } catch (error) {
    logger.error('Error getting geo stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get geo stats'
    });
  }
});

// Отправка кастомной цели в Yandex.Metrica
router.post('/goals/:goalName', async (req, res) => {
  try {
    const { goalName } = req.params;
    const { value = 1, userId, sessionId, properties } = req.body;

    // Отслеживаем как обычное событие
    const eventId = analyticsService.trackEvent({
      sessionId,
      userId,
      eventType: 'goal',
      eventName: goalName,
      properties: {
        ...properties,
        goalValue: value
      },
      userAgent: req.headers['user-agent'],
      ip: req.ip
    });

    res.json({
      success: true,
      data: {
        eventId,
        goalName,
        value,
        message: 'Goal tracked successfully'
      }
    });
  } catch (error) {
    logger.error('Error tracking goal:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track goal'
    });
  }
});

// Получение информации о здоровье системы аналитики
router.get('/health', async (req, res) => {
  try {
    const realtime = analyticsService.getRealtimeMetrics();
    
    const health = {
      status: 'healthy',
      timestamp: new Date(),
      metrics: {
        activeUsers: realtime.activeUsers,
        activeSessions: realtime.activeSessions,
        eventsPerSecond: Math.round(realtime.eventsLastHour / 3600 * 100) / 100,
        errorRate: realtime.errorsLastHour > 0 ? 
          Math.round((realtime.errorsLastHour / realtime.eventsLastHour) * 10000) / 100 : 0
      },
      services: {
        eventTracking: 'operational',
        reporting: 'operational',
        yandexMetrica: process.env.YANDEX_METRICA_ID ? 'operational' : 'disabled'
      }
    };
    
    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    logger.error('Error getting analytics health:', error);
    res.status(500).json({
      success: false,
      data: {
        status: 'unhealthy',
        timestamp: new Date(),
        error: 'Analytics service unavailable'
      }
    });
  }
});

export default router; 
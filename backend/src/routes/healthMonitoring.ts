import { Router, Request, Response } from 'express';
import { asyncHandler } from '@/middleware/errorHandler';
import { aiHealthMonitor } from '@/services/aiHealthMonitor';
import { intelligentAIRouter } from '@/services/ai/intelligentRouter';
import { LoggerService } from '@/services/logger';

const router = Router();
const logger = new LoggerService();

// Получение отчета о здоровье всех AI сервисов
router.get('/report', asyncHandler(async (req: Request, res: Response) => {
  const report = await aiHealthMonitor.generateHealthReport();
  
  res.json({
    success: true,
    data: report,
    timestamp: new Date().toISOString()
  });
}));

// Получение подробной информации о конкретном сервисе
router.get('/service/:serviceName', asyncHandler(async (req: Request, res: Response) => {
  const { serviceName } = req.params;
  
  try {
    const healthData = await aiHealthMonitor.getHealthData(serviceName);
    
    res.json({
      success: true,
      data: healthData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      error: 'Сервис не найден',
      message: error instanceof Error ? error.message : 'Неизвестная ошибка'
    });
  }
}));

// Получение активного сервиса
router.get('/active-service', asyncHandler(async (req: Request, res: Response) => {
  const activeService = await aiHealthMonitor.getActiveService();
  const stats = await intelligentAIRouter.getStats();
  
  res.json({
    success: true,
    data: {
      activeService,
      stats,
      timestamp: new Date().toISOString()
    }
  });
}));

// Принудительный failover на конкретный сервис
router.post('/failover/:targetService', asyncHandler(async (req: Request, res: Response) => {
  const { targetService } = req.params;
  const { reason } = req.body;
  
  try {
    await aiHealthMonitor.forceFailover(targetService);
    
    logger.info(`🔄 Принудительный failover инициирован пользователем`, {
      targetService,
      reason: reason || 'Запрос пользователя',
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
    
    res.json({
      success: true,
      message: `Failover на сервис ${targetService} выполнен успешно`,
      targetService,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: 'Ошибка выполнения failover',
      message: error instanceof Error ? error.message : 'Неизвестная ошибка'
    });
  }
}));

// Получение списка недавних alert'ов
router.get('/alerts', asyncHandler(async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const alerts = await aiHealthMonitor.getRecentAlerts(limit);
  
  res.json({
    success: true,
    data: alerts,
    count: alerts.length,
    timestamp: new Date().toISOString()
  });
}));

// Решение alert'а
router.patch('/alerts/:alertId/resolve', asyncHandler(async (req: Request, res: Response) => {
  const { alertId } = req.params;
  const { comment } = req.body;
  
  try {
    await aiHealthMonitor.resolveAlert(alertId);
    
    logger.info(`✅ Alert ${alertId} решен пользователем`, {
      alertId,
      comment: comment || '',
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
    
    res.json({
      success: true,
      message: 'Alert успешно решен',
      alertId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      error: 'Alert не найден',
      message: error instanceof Error ? error.message : 'Неизвестная ошибка'
    });
  }
}));

// Тестирование конкретного AI сервиса
router.post('/test-service/:serviceName', asyncHandler(async (req: Request, res: Response) => {
  const { serviceName } = req.params;
  const { testPrompt = 'Ответь одним словом: "тест"' } = req.body;
  
  const startTime = Date.now();
  
  try {
    // Получаем health data сервиса
    const healthData = await aiHealthMonitor.getHealthData(serviceName) as any;
    
    if (healthData.status === 'offline') {
      return res.status(503).json({
        success: false,
        error: 'Сервис недоступен',
        serviceName,
        status: healthData.status
      });
    }
    
    // Выполняем тестовый запрос через router
    let result;
    switch (serviceName) {
      case 'deepseek':
      case 'claude':
      case 'openai':
        result = await intelligentAIRouter.generateCode(testPrompt);
        break;
      default:
        throw new Error(`Тестирование сервиса ${serviceName} не поддерживается`);
    }
    
    const duration = Date.now() - startTime;
    
    res.json({
      success: true,
      data: {
        serviceName,
        testResult: result,
        duration,
        healthStatus: healthData.status,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    res.status(500).json({
      success: false,
      error: 'Ошибка тестирования сервиса',
      serviceName,
      duration,
      message: error instanceof Error ? error.message : 'Неизвестная ошибка',
      timestamp: new Date().toISOString()
    });
  }
}));

// WebSocket эндпоинт для real-time мониторинга
router.get('/stream', asyncHandler(async (req: Request, res: Response) => {
  // Настройка SSE (Server-Sent Events)
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Отправляем initial data
  const initialReport = await aiHealthMonitor.generateHealthReport();
  res.write(`data: ${JSON.stringify({ type: 'initial', data: initialReport })}\n\n`);

  // Слушаем обновления health monitor
  const healthUpdateHandler = (report: any) => {
    res.write(`data: ${JSON.stringify({ type: 'health-update', data: report })}\n\n`);
  };

  const alertHandler = (alert: any) => {
    res.write(`data: ${JSON.stringify({ type: 'alert', data: alert })}\n\n`);
  };

  const failoverHandler = (event: any) => {
    res.write(`data: ${JSON.stringify({ type: 'failover', data: event })}\n\n`);
  };

  aiHealthMonitor.on('health:updated', healthUpdateHandler);
  aiHealthMonitor.on('alert:created', alertHandler);
  aiHealthMonitor.on('failover:activated', failoverHandler);

  // Cleanup при закрытии соединения
  req.on('close', () => {
    aiHealthMonitor.off('health:updated', healthUpdateHandler);
    aiHealthMonitor.off('alert:created', alertHandler);
    aiHealthMonitor.off('failover:activated', failoverHandler);
    res.end();
  });

  // Keep-alive ping каждые 30 секунд
  const keepAlive = setInterval(() => {
    res.write('data: {"type":"ping","timestamp":"' + new Date().toISOString() + '"}\n\n');
  }, 30000);

  req.on('close', () => {
    clearInterval(keepAlive);
  });
}));

// Получение статистики производительности
router.get('/performance-stats', asyncHandler(async (req: Request, res: Response) => {
  const stats = await intelligentAIRouter.getStats();
  const healthReport = await aiHealthMonitor.generateHealthReport();
  
  // Вычисляем дополнительную статистику
  const performanceStats = {
    router: stats,
    services: healthReport.services.map(service => ({
      name: service.serviceName,
      status: service.status,
      avgResponseTime: service.metrics.averageResponseTime,
      successRate: service.metrics.successRate,
      errorRate: service.errorRate,
      uptime: service.uptime,
      tokensPerSecond: service.metrics.tokensPerSecond
    })),
    overall: {
      totalServices: healthReport.summary.totalServices,
      healthyServices: healthReport.summary.healthyServices,
      overallStatus: healthReport.overallStatus,
      failoverActive: healthReport.failoverStatus.isActive
    }
  };
  
  res.json({
    success: true,
    data: performanceStats,
    timestamp: new Date().toISOString()
  });
}));

export default router; 
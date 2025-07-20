import { Router, Request, Response } from 'express';
import { asyncHandler } from '@/middleware/errorHandler';
import { deviceTestingService } from '@/services/deviceTesting';
import { LoggerService } from '@/services/logger';
import path from 'path';

const router = Router();
const logger = new LoggerService();

// Создание тестового набора
router.post('/suites', asyncHandler(async (req: Request, res: Response) => {
  const { gameId, gamePath, devices, customTests } = req.body;
  
  if (!gameId || !gamePath) {
    return res.status(400).json({
      success: false,
      error: 'Обязательные поля: gameId, gamePath'
    });
  }
  
  try {
    const suite = await deviceTestingService.createTestSuite(gameId, gamePath, {
      devices,
      customTests
    });
    
    logger.info(`📱 Создан тестовый набор для игры ${gameId}`, {
      suiteId: suite.id,
      deviceCount: suite.devices.length,
      testCount: suite.tests.length
    });
    
    res.json({
      success: true,
      data: suite,
      message: 'Тестовый набор создан успешно'
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Ошибка создания тестового набора',
      message: error instanceof Error ? error.message : 'Неизвестная ошибка'
    });
  }
}));

// Запуск тестирования
router.post('/suites/:suiteId/execute', asyncHandler(async (req: Request, res: Response) => {
  const { suiteId } = req.params;
  const { gamePath } = req.body;
  
  if (!gamePath) {
    return res.status(400).json({
      success: false,
      error: 'Обязательное поле: gamePath'
    });
  }
  
  try {
    // Запускаем тестирование асинхронно
    const reportPromise = deviceTestingService.executeSuite(suiteId, gamePath);
    
    // Возвращаем немедленный ответ
    res.json({
      success: true,
      message: 'Тестирование запущено',
      suiteId,
      status: 'running'
    });
    
    // Логируем результат в фоне
    reportPromise
      .then(report => {
        logger.info(`✅ Тестирование ${suiteId} завершено`, {
          score: report.summary.averageScore,
          passed: report.summary.passedDevices,
          total: report.summary.totalDevices
        });
      })
      .catch(error => {
        logger.error(`❌ Ошибка тестирования ${suiteId}:`, error);
      });
      
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Ошибка запуска тестирования',
      message: error instanceof Error ? error.message : 'Неизвестная ошибка'
    });
  }
}));

// Получение отчета по тестированию
router.get('/reports/:executionId', asyncHandler(async (req: Request, res: Response) => {
  const { executionId } = req.params;
  
  try {
    const report = await deviceTestingService.getTestReport(executionId);
    
    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Отчет не найден'
      });
    }
    
    res.json({
      success: true,
      data: report
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Ошибка получения отчета',
      message: error instanceof Error ? error.message : 'Неизвестная ошибка'
    });
  }
}));

// Получение списка всех отчетов
router.get('/reports', asyncHandler(async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const gameId = req.query.gameId as string;
  
  try {
    const reports = await deviceTestingService.getAllReports();
    
    // Фильтрация по игре если указана
    let filteredReports = reports;
    if (gameId) {
      filteredReports = reports.filter(report => report.gameId === gameId);
    }
    
    // Сортировка по дате (новые сначала)
    filteredReports.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
    
    // Ограничение количества
    const limitedReports = filteredReports.slice(0, limit);
    
    res.json({
      success: true,
      data: limitedReports,
      count: limitedReports.length,
      total: filteredReports.length
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Ошибка получения отчетов',
      message: error instanceof Error ? error.message : 'Неизвестная ошибка'
    });
  }
}));

// Быстрое тестирование игры на популярных устройствах
router.post('/quick-test', asyncHandler(async (req: Request, res: Response) => {
  const { gameId, gamePath } = req.body;
  
  if (!gameId || !gamePath) {
    return res.status(400).json({
      success: false,
      error: 'Обязательные поля: gameId, gamePath'
    });
  }
  
  try {
    // Создаем тестовый набор с предустановленными устройствами
    const suite = await deviceTestingService.createTestSuite(gameId, gamePath);
    
    // Запускаем тестирование
    const report = await deviceTestingService.executeSuite(suite.id, gamePath);
    
    // Генерируем упрощенную сводку
    const summary = {
      gameId,
      score: report.summary.averageScore,
      status: report.summary.averageScore >= 80 ? 'excellent' : 
              report.summary.averageScore >= 60 ? 'good' : 
              report.summary.averageScore >= 40 ? 'fair' : 'poor',
      deviceResults: report.results.map(result => ({
        device: result.deviceProfile.name,
        passed: result.success,
        fps: result.performance.averageFps,
        loadTime: result.performance.loadTime,
        errorCount: result.performance.errorCount
      })),
      recommendations: report.recommendations.filter(r => r.priority === 'high'),
      executionId: report.executionId
    };
    
    logger.info(`🚀 Быстрое тестирование ${gameId} завершено`, {
      score: summary.score,
      status: summary.status
    });
    
    res.json({
      success: true,
      data: summary,
      message: 'Быстрое тестирование завершено'
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Ошибка быстрого тестирования',
      message: error instanceof Error ? error.message : 'Неизвестная ошибка'
    });
  }
}));

// Получение доступных профилей устройств
router.get('/device-profiles', asyncHandler(async (req: Request, res: Response) => {
  // Возвращаем информацию о поддерживаемых устройствах
  const deviceProfiles = [
    {
      id: 'iphone-13',
      name: 'iPhone 13',
      type: 'mobile',
      os: 'ios',
      browser: 'safari',
      viewport: { width: 390, height: 844 },
      popular: true
    },
    {
      id: 'samsung-galaxy-s21',
      name: 'Samsung Galaxy S21',
      type: 'mobile',
      os: 'android',
      browser: 'chrome',
      viewport: { width: 360, height: 800 },
      popular: true
    },
    {
      id: 'ipad-air',
      name: 'iPad Air',
      type: 'tablet',
      os: 'ios',
      browser: 'safari',
      viewport: { width: 820, height: 1180 },
      popular: true
    },
    {
      id: 'desktop-chrome',
      name: 'Desktop Chrome',
      type: 'desktop',
      os: 'windows',
      browser: 'chrome',
      viewport: { width: 1920, height: 1080 },
      popular: true
    }
  ];
  
  res.json({
    success: true,
    data: deviceProfiles,
    count: deviceProfiles.length
  });
}));

// Получение статистики тестирования
router.get('/stats', asyncHandler(async (req: Request, res: Response) => {
  try {
    const reports = await deviceTestingService.getAllReports();
    
    const stats = {
      totalTests: reports.length,
      averageScore: reports.length > 0 
        ? Math.round(reports.reduce((sum, r) => sum + r.summary.averageScore, 0) / reports.length)
        : 0,
      deviceStats: {} as Record<string, {
        totalTests: number;
        passRate: number;
        avgScore: number;
      }>,
      recent: reports
        .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
        .slice(0, 10)
        .map(report => ({
          gameId: report.gameId,
          executionId: report.executionId,
          score: report.summary.averageScore,
          timestamp: report.startTime,
          deviceCount: report.summary.totalDevices
        }))
    };
    
    // Собираем статистику по устройствам
    reports.forEach(report => {
      report.results.forEach(result => {
        const deviceName = result.deviceProfile.name;
        if (!stats.deviceStats[deviceName]) {
          stats.deviceStats[deviceName] = {
            totalTests: 0,
            passRate: 0,
            avgScore: 0
          };
        }
        
        const deviceStat = stats.deviceStats[deviceName];
        deviceStat.totalTests++;
        deviceStat.passRate = ((deviceStat.passRate * (deviceStat.totalTests - 1)) + (result.success ? 100 : 0)) / deviceStat.totalTests;
        deviceStat.avgScore = ((deviceStat.avgScore * (deviceStat.totalTests - 1)) + (result.success ? 100 : 0)) / deviceStat.totalTests;
      });
    });
    
    res.json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Ошибка получения статистики',
      message: error instanceof Error ? error.message : 'Неизвестная ошибка'
    });
  }
}));

// WebSocket для real-time обновлений тестирования
router.get('/stream', asyncHandler(async (req: Request, res: Response) => {
  // Настройка SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Обработчики событий от DeviceTestingService
  const suiteStartedHandler = (event: any) => {
    res.write(`data: ${JSON.stringify({ type: 'suite-started', data: event })}\n\n`);
  };

  const deviceTestingHandler = (event: any) => {
    res.write(`data: ${JSON.stringify({ type: 'device-testing', data: event })}\n\n`);
  };

  const deviceCompletedHandler = (event: any) => {
    res.write(`data: ${JSON.stringify({ type: 'device-completed', data: event })}\n\n`);
  };

  const suiteCompletedHandler = (event: any) => {
    res.write(`data: ${JSON.stringify({ type: 'suite-completed', data: event })}\n\n`);
  };

  // Подписываемся на события
  deviceTestingService.on('suite:started', suiteStartedHandler);
  deviceTestingService.on('device:testing', deviceTestingHandler);
  deviceTestingService.on('device:completed', deviceCompletedHandler);
  deviceTestingService.on('suite:completed', suiteCompletedHandler);

  // Cleanup при закрытии соединения
  req.on('close', () => {
    deviceTestingService.off('suite:started', suiteStartedHandler);
    deviceTestingService.off('device:testing', deviceTestingHandler);
    deviceTestingService.off('device:completed', deviceCompletedHandler);
    deviceTestingService.off('suite:completed', suiteCompletedHandler);
    res.end();
  });

  // Keep-alive ping
  const keepAlive = setInterval(() => {
    res.write('data: {"type":"ping","timestamp":"' + new Date().toISOString() + '"}\n\n');
  }, 30000);

  req.on('close', () => {
    clearInterval(keepAlive);
  });
}));

export default router; 
import { Router, Request, Response } from 'express';
import { gameTestingService } from '../services/gameTesting';
import { logger } from '../services/logger';
import { GameTestRunner } from '../services/gameTestRunner';
import { asyncHandler } from '../middleware/asyncHandler';
import { TestConfiguration, GameTestScenario } from '../types/testing';
import { GenerationRequest } from '../types';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Создаем экземпляр тест-раннера
const testRunner = new GameTestRunner();

// Получение всех тестовых наборов
router.get('/test-suites', async (req, res) => {
  try {
    const { category } = req.query;
    const testSuites = gameTestingService.getTestSuites(category as any);

    res.json({
      success: true,
      data: { testSuites }
    });
  } catch (error) {
    logger.error('Error getting test suites:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get test suites'
    });
  }
});

// Создание тестового набора
router.post('/test-suites', async (req, res) => {
  try {
    const testSuiteData = req.body;
    const testSuite = await gameTestingService.createTestSuite(testSuiteData);

    res.json({
      success: true,
      data: { testSuite }
    });
  } catch (error) {
    logger.error('Error creating test suite:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create test suite'
    });
  }
});

// Запуск тестирования игры
router.post('/games/:gameId/run', async (req, res) => {
  try {
    const { gameId } = req.params;
    const { testSuiteIds, environment, triggeredBy, trigger, tags, notes } = req.body;

    if (!testSuiteIds || !Array.isArray(testSuiteIds) || testSuiteIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Test suite IDs are required'
      });
    }

    const execution = await gameTestingService.runTests(gameId, testSuiteIds, {
      environment,
      triggeredBy,
      trigger,
      tags,
      notes
    });

    res.json({
      success: true,
      data: { execution }
    });
  } catch (error) {
    logger.error('Error running tests:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to run tests'
    });
  }
});

// Получение результатов выполнения тестов
router.get('/executions/:executionId', async (req, res) => {
  try {
    const { executionId } = req.params;
    const execution = gameTestingService.getTestExecution(executionId);

    if (!execution) {
      return res.status(404).json({
        success: false,
        error: 'Test execution not found'
      });
    }

    res.json({
      success: true,
      data: { execution }
    });
  } catch (error) {
    logger.error('Error getting test execution:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get test execution'
    });
  }
});

// Получение всех выполнений тестов для игры
router.get('/games/:gameId/executions', async (req, res) => {
  try {
    const { gameId } = req.params;
    const { limit, offset } = req.query;

    let executions = gameTestingService.getGameTestExecutions(gameId);

    // Пагинация
    const limitNum = parseInt(limit as string) || 50;
    const offsetNum = parseInt(offset as string) || 0;
    const paginatedExecutions = executions.slice(offsetNum, offsetNum + limitNum);

    res.json({
      success: true,
      data: {
        executions: paginatedExecutions,
        total: executions.length,
        limit: limitNum,
        offset: offsetNum
      }
    });
  } catch (error) {
    logger.error('Error getting game test executions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get game test executions'
    });
  }
});

// Анализ качества игры
router.get('/games/:gameId/quality', async (req, res) => {
  try {
    const { gameId } = req.params;
    const qualityAnalysis = await gameTestingService.analyzeGameQuality(gameId);

    res.json({
      success: true,
      data: { quality: qualityAnalysis }
    });
  } catch (error) {
    logger.error('Error analyzing game quality:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze game quality'
    });
  }
});

// Генерация отчета
router.post('/executions/:executionId/report', async (req, res) => {
  try {
    const { executionId } = req.params;
    const { format = 'html' } = req.body;

    if (!['html', 'json', 'pdf'].includes(format)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid report format. Supported: html, json, pdf'
      });
    }

    const reportPath = await gameTestingService.generateReport(executionId, format);

    res.json({
      success: true,
      data: { reportPath }
    });
  } catch (error) {
    logger.error('Error generating report:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate report'
    });
  }
});

// Получение статистики тестирования
router.get('/stats', async (req, res) => {
  try {
    const stats = gameTestingService.getTestingStats();

    res.json({
      success: true,
      data: { stats }
    });
  } catch (error) {
    logger.error('Error getting testing stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get testing stats'
    });
  }
});

// Получение статистики для конкретной игры
router.get('/games/:gameId/stats', async (req, res) => {
  try {
    const { gameId } = req.params;
    const executions = gameTestingService.getGameTestExecutions(gameId);

    const stats = {
      totalExecutions: executions.length,
      lastExecution: executions[0] || null,
      averageSuccessRate: executions.length > 0 
        ? executions.reduce((sum, e) => sum + e.summary.successRate, 0) / executions.length 
        : 0,
      totalIssues: executions.reduce((sum, e) => sum + e.issues.length, 0),
      criticalIssues: executions.reduce((sum, e) => 
        sum + e.issues.filter(i => i.severity === 'critical').length, 0
      ),
      averageExecutionTime: executions.length > 0
        ? executions.reduce((sum, e) => sum + (e.duration || 0), 0) / executions.length
        : 0,
      testHistory: executions.slice(0, 10).map(e => ({
        id: e.id,
        date: e.startTime,
        successRate: e.summary.successRate,
        duration: e.duration,
        issuesCount: e.issues.length
      }))
    };

    res.json({
      success: true,
      data: { stats }
    });
  } catch (error) {
    logger.error('Error getting game stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get game stats'
    });
  }
});

// Поиск тестовых наборов
router.get('/test-suites/search', async (req, res) => {
  try {
    const { query, category, severity, automated } = req.query;

    let testSuites = gameTestingService.getTestSuites();

    // Фильтрация
    if (query) {
      const searchTerm = (query as string).toLowerCase();
      testSuites = testSuites.filter(suite => 
        suite.name.toLowerCase().includes(searchTerm) ||
        suite.description.toLowerCase().includes(searchTerm)
      );
    }

    if (category) {
      testSuites = testSuites.filter(suite => suite.category === category);
    }

    if (severity) {
      testSuites = testSuites.filter(suite => suite.severity === severity);
    }

    if (automated !== undefined) {
      const isAutomated = automated === 'true';
      testSuites = testSuites.filter(suite => suite.automated === isAutomated);
    }

    res.json({
      success: true,
      data: { testSuites }
    });
  } catch (error) {
    logger.error('Error searching test suites:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search test suites'
    });
  }
});

// Получение рекомендованных тестов для игры
router.get('/games/:gameId/recommended-tests', async (req, res) => {
  try {
    const { gameId } = req.params;
    
    // В реальной реализации здесь был бы анализ игры и рекомендации
    const recommendedTests = [
      {
        testSuiteId: 'func_basic',
        reason: 'Базовые функциональные тесты для всех игр',
        priority: 'high',
        estimatedDuration: 600
      },
      {
        testSuiteId: 'perf_basic',
        reason: 'Проверка производительности игры',
        priority: 'medium',
        estimatedDuration: 300
      }
    ];

    res.json({
      success: true,
      data: { recommendedTests }
    });
  } catch (error) {
    logger.error('Error getting recommended tests:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get recommended tests'
    });
  }
});

// Планирование автоматических тестов
router.post('/games/:gameId/schedule', async (req, res) => {
  try {
    const { gameId } = req.params;
    const { testSuiteIds, schedule, enabled } = req.body;

    // В реальной реализации здесь было бы создание расписания
    const scheduleConfig = {
      gameId,
      testSuiteIds,
      schedule, // например: '0 2 * * *' для ежедневного запуска в 2:00
      enabled,
      createdAt: new Date()
    };

    res.json({
      success: true,
      data: { schedule: scheduleConfig }
    });
  } catch (error) {
    logger.error('Error scheduling tests:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to schedule tests'
    });
  }
});

// Получение расписания тестов
router.get('/games/:gameId/schedule', async (req, res) => {
  try {
    const { gameId } = req.params;

    // В реальной реализации здесь было бы получение расписания из БД
    const schedules = []; // gameTestingService.getTestSchedules(gameId);

    res.json({
      success: true,
      data: { schedules }
    });
  } catch (error) {
    logger.error('Error getting test schedules:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get test schedules'
    });
  }
});

// Отмена выполнения тестов
router.post('/executions/:executionId/cancel', async (req, res) => {
  try {
    const { executionId } = req.params;

    // В реальной реализации здесь была бы остановка выполнения
    res.json({
      success: true,
      message: 'Test execution cancelled'
    });
  } catch (error) {
    logger.error('Error cancelling test execution:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel test execution'
    });
  }
});

// Получение логов выполнения
router.get('/executions/:executionId/logs', async (req, res) => {
  try {
    const { executionId } = req.params;
    const execution = gameTestingService.getTestExecution(executionId);

    if (!execution) {
      return res.status(404).json({
        success: false,
        error: 'Test execution not found'
      });
    }

    res.json({
      success: true,
      data: { logs: execution.logs }
    });
  } catch (error) {
    logger.error('Error getting execution logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get execution logs'
    });
  }
});

// Получение скриншотов выполнения
router.get('/executions/:executionId/screenshots', async (req, res) => {
  try {
    const { executionId } = req.params;
    const execution = gameTestingService.getTestExecution(executionId);

    if (!execution) {
      return res.status(404).json({
        success: false,
        error: 'Test execution not found'
      });
    }

    res.json({
      success: true,
      data: { screenshots: execution.screenshots }
    });
  } catch (error) {
    logger.error('Error getting execution screenshots:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get execution screenshots'
    });
  }
});

// Сравнение результатов тестирования
router.post('/executions/compare', async (req, res) => {
  try {
    const { executionIds } = req.body;

    if (!executionIds || !Array.isArray(executionIds) || executionIds.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'At least 2 execution IDs are required for comparison'
      });
    }

    const executions = executionIds.map(id => gameTestingService.getTestExecution(id))
      .filter(e => e !== null);

    if (executions.length < 2) {
      return res.status(404).json({
        success: false,
        error: 'Not enough valid executions found for comparison'
      });
    }

    const comparison = {
      executions: executions.map(e => ({
        id: e!.id,
        date: e!.startTime,
        successRate: e!.summary.successRate,
        duration: e!.duration,
        issuesCount: e!.issues.length
      })),
      trends: {
        successRate: executions[0]!.summary.successRate - executions[1]!.summary.successRate,
        duration: (executions[0]!.duration || 0) - (executions[1]!.duration || 0),
        issues: executions[0]!.issues.length - executions[1]!.issues.length
      }
    };

    res.json({
      success: true,
      data: { comparison }
    });
  } catch (error) {
    logger.error('Error comparing executions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to compare executions'
    });
  }
});

// Экспорт результатов тестирования
router.get('/games/:gameId/export', async (req, res) => {
  try {
    const { gameId } = req.params;
    const { format = 'json', includeDetails = 'false' } = req.query;

    const executions = gameTestingService.getGameTestExecutions(gameId);
    
    const exportData = {
      gameId,
      exportDate: new Date().toISOString(),
      summary: {
        totalExecutions: executions.length,
        averageSuccessRate: executions.length > 0 
          ? executions.reduce((sum, e) => sum + e.summary.successRate, 0) / executions.length 
          : 0,
        totalIssues: executions.reduce((sum, e) => sum + e.issues.length, 0)
      },
      executions: includeDetails === 'true' ? executions : executions.map(e => ({
        id: e.id,
        startTime: e.startTime,
        endTime: e.endTime,
        status: e.status,
        summary: e.summary,
        issuesCount: e.issues.length
      }))
    };

    if (format === 'csv') {
      // В реальной реализации здесь была бы конвертация в CSV
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="test_results_${gameId}.csv"`);
      res.send('CSV export not implemented');
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="test_results_${gameId}.json"`);
      res.json(exportData);
    }
  } catch (error) {
    logger.error('Error exporting test results:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export test results'
    });
  }
});

// Health check для сервиса тестирования
router.get('/health', async (req, res) => {
  try {
    const stats = gameTestingService.getTestingStats();
    
    res.json({
      success: true,
      data: {
        status: 'healthy',
        uptime: process.uptime(),
        stats: {
          totalExecutions: stats.totalExecutions,
          averageSuccessRate: stats.averageSuccessRate,
          totalIssuesFound: stats.totalIssuesFound
        }
      }
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      success: false,
      error: 'Service unhealthy'
    });
  }
});

/**
 * Запуск полного тестирования игры
 * POST /api/testing/run-full
 */
router.post('/run-full', asyncHandler(async (req: Request, res: Response) => {
  const { gameRequest } = req.body;
  
  if (!gameRequest) {
    return res.status(400).json({
      success: false,
      error: 'Game request is required'
    });
  }

  try {
    logger.info(`🧪 Запуск полного тестирования для игры: ${gameRequest.id}`);
    
    const report = await testRunner.runFullGameTest(gameRequest);
    
    res.json({
      success: true,
      data: {
        testReport: report,
        status: report.status,
        summary: report.summary
      }
    });
    
  } catch (error) {
    logger.error('Ошибка тестирования:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to run game test',
      message: error.message
    });
  }
}));

/**
 * Запуск тестирования по сценарию
 * POST /api/testing/run-scenario
 */
router.post('/run-scenario', asyncHandler(async (req: Request, res: Response) => {
  const { scenario } = req.body;
  
  if (!scenario) {
    return res.status(400).json({
      success: false,
      error: 'Test scenario is required'
    });
  }

  try {
    const report = await testRunner.runScenario(scenario);
    
    res.json({
      success: true,
      data: {
        testReport: report,
        status: report.status,
        summary: report.summary
      }
    });
    
  } catch (error) {
    logger.error('Ошибка сценарного тестирования:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to run scenario test',
      message: error.message
    });
  }
}));

/**
 * Быстрое тестирование (только критические проверки)
 * POST /api/testing/run-quick
 */
router.post('/run-quick', asyncHandler(async (req: Request, res: Response) => {
  const { gameData } = req.body;
  
  if (!gameData) {
    return res.status(400).json({
      success: false,
      error: 'Game data is required'
    });
  }

  try {
    // Создаем упрощенный запрос только для критических тестов
    const quickRequest: GenerationRequest = {
      id: gameData.id || uuidv4(),
      prompt: gameData.prompt || {},
      options: gameData.options || {},
      status: 'queued',
      createdAt: new Date(),
      updatedAt: new Date(),
      progress: 0,
      currentStep: 'Quick Testing',
      logs: []
    };

    // Запускаем только критические тесты
    const report = await testRunner.runFullGameTest(quickRequest);
    
    // Фильтруем только критические результаты
    const criticalResults = Array.from(report.suiteResults.values())
      .filter(suite => {
        const testSuite = testRunner['testSuites'].get(suite.suiteId);
        return testSuite?.priority === 'high';
      });

    res.json({
      success: true,
      data: {
        testId: report.id,
        status: report.status,
        criticalIssues: report.summary.criticalIssues,
        duration: report.duration,
        recommendations: report.recommendations.slice(0, 5), // Топ 5 рекомендаций
        quickSummary: {
          totalCriticalTests: criticalResults.reduce((sum, r) => sum + r.testResults.length, 0),
          passed: criticalResults.reduce((sum, r) => 
            sum + r.testResults.filter(t => t.status === 'passed').length, 0),
          failed: criticalResults.reduce((sum, r) => 
            sum + r.testResults.filter(t => t.status === 'failed').length, 0)
        }
      }
    });
    
  } catch (error) {
    logger.error('Ошибка быстрого тестирования:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to run quick test',
      message: error.message
    });
  }
}));

/**
 * Получение предустановленных сценариев тестирования
 * GET /api/testing/scenarios
 */
router.get('/scenarios', asyncHandler(async (req: Request, res: Response) => {
  const predefinedScenarios: GameTestScenario[] = [
    {
      id: 'basic_platformer',
      name: 'Базовый платформер',
      description: 'Тестирование генерации простого платформера',
      gamePrompt: {
        title: 'Test Platformer',
        description: 'Простая игра-платформер для тестирования',
        genre: 'platformer',
        artStyle: 'pixel art'
      },
      expectedOutcome: {
        shouldGenerate: true,
        minQuality: 7,
        maxGenerationTime: 300000, // 5 минут
        requiredFeatures: ['jumping', 'movement', 'collision'],
        forbiddenContent: []
      },
      testSteps: [
        {
          id: 'generate',
          action: 'generate',
          parameters: {},
          expectedResult: { success: true },
          timeout: 300000
        },
        {
          id: 'validate',
          action: 'validate',
          parameters: {},
          expectedResult: { valid: true },
          timeout: 30000
        }
      ]
    },
    {
      id: 'mobile_puzzle',
      name: 'Мобильная головоломка',
      description: 'Тестирование мобильной совместимости',
      gamePrompt: {
        title: 'Mobile Puzzle Test',
        description: 'Головоломка для мобильных устройств',
        genre: 'puzzle',
        artStyle: 'minimalist'
      },
      expectedOutcome: {
        shouldGenerate: true,
        minQuality: 6,
        maxGenerationTime: 240000,
        requiredFeatures: ['touch_controls', 'responsive_design'],
        forbiddenContent: []
      },
      testSteps: [
        {
          id: 'generate',
          action: 'generate',
          parameters: {},
          expectedResult: { success: true },
          timeout: 240000
        },
        {
          id: 'mobile_test',
          action: 'validate',
          parameters: { focus: 'mobile' },
          expectedResult: { mobile_compatible: true },
          timeout: 15000
        }
      ]
    },
    {
      id: 'yandex_integration',
      name: 'Интеграция Yandex SDK',
      description: 'Тестирование интеграции с Yandex Games',
      gamePrompt: {
        title: 'Yandex SDK Test',
        description: 'Игра с полной интеграцией Yandex Games SDK',
        genre: 'arcade',
        artStyle: 'cartoon'
      },
      expectedOutcome: {
        shouldGenerate: true,
        minQuality: 8,
        maxGenerationTime: 360000,
        requiredFeatures: ['yandex_sdk', 'leaderboards', 'achievements'],
        forbiddenContent: []
      },
      testSteps: [
        {
          id: 'generate',
          action: 'generate',
          parameters: {},
          expectedResult: { success: true },
          timeout: 360000
        },
        {
          id: 'sdk_test',
          action: 'validate',
          parameters: { focus: 'yandex-sdk' },
          expectedResult: { sdk_integrated: true },
          timeout: 20000
        }
      ]
    }
  ];

  res.json({
    success: true,
    data: {
      scenarios: predefinedScenarios,
      total: predefinedScenarios.length
    }
  });
}));

/**
 * Получение конфигурации тестирования
 * GET /api/testing/config
 */
router.get('/config', asyncHandler(async (req: Request, res: Response) => {
  const config: TestConfiguration = {
    environments: ['development', 'staging', 'production'],
    browsers: ['chrome', 'firefox', 'safari'],
    devices: [
      {
        name: 'Desktop',
        type: 'desktop',
        width: 1920,
        height: 1080,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        pixelRatio: 1
      },
      {
        name: 'Tablet',
        type: 'tablet',
        width: 768,
        height: 1024,
        userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15',
        pixelRatio: 2
      },
      {
        name: 'Mobile',
        type: 'mobile',
        width: 375,
        height: 667,
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15',
        pixelRatio: 2
      }
    ],
    parallel: true,
    maxConcurrency: 3,
    timeout: 60000,
    retries: 2,
    coverage: false,
    screenshots: false,
    artifacts: true,
    reportFormats: ['json', 'html']
  };

  res.json({
    success: true,
    data: { config }
  });
}));

/**
 * Обновление конфигурации тестирования
 * PUT /api/testing/config
 */
router.put('/config', asyncHandler(async (req: Request, res: Response) => {
  const { config } = req.body;
  
  if (!config) {
    return res.status(400).json({
      success: false,
      error: 'Configuration is required'
    });
  }

  try {
    // В реальном приложении здесь было бы сохранение в БД
    logger.info('Конфигурация тестирования обновлена');
    
    res.json({
      success: true,
      message: 'Configuration updated successfully'
    });
    
  } catch (error) {
    logger.error('Ошибка обновления конфигурации:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update configuration'
    });
  }
}));

/**
 * Получение статистики тестирования
 * GET /api/testing/stats
 */
router.get('/stats', asyncHandler(async (req: Request, res: Response) => {
  try {
    // В реальном приложении данные брались бы из БД
    const stats = {
      totalTests: 156,
      todayTests: 23,
      successRate: 87.3,
      averageExecutionTime: 45000, // мс
      topIssues: [
        { issue: 'Missing Yandex SDK integration', count: 12 },
        { issue: 'Bundle size too large', count: 8 },
        { issue: 'No mobile optimization', count: 6 },
        { issue: 'JavaScript syntax errors', count: 4 }
      ],
      testsByCategory: {
        compilation: { total: 45, passed: 42, failed: 3 },
        performance: { total: 38, passed: 31, failed: 7 },
        mobile: { total: 29, passed: 24, failed: 5 },
        'yandex-sdk': { total: 22, passed: 18, failed: 4 },
        assets: { total: 15, passed: 13, failed: 2 },
        gameplay: { total: 7, passed: 6, failed: 1 }
      },
      recentTrends: {
        labels: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт'],
        successRates: [85.2, 88.1, 86.7, 89.3, 87.3],
        testCounts: [18, 22, 19, 25, 23]
      }
    };

    res.json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    logger.error('Ошибка получения статистики:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get testing statistics'
    });
  }
}));

// WebSocket события для real-time обновлений
testRunner.on('generation:progress', (data) => {
  // Здесь можно отправлять события через WebSocket
  logger.debug(`🔄 Progress: ${data.step} - ${data.progress}%`);
});

testRunner.on('suite:start', (data) => {
  logger.info(`🔍 Starting suite: ${data.suite.name}`);
});

testRunner.on('suite:complete', (data) => {
  logger.info(`✅ Completed suite: ${data.suite.name} - Status: ${data.result.status}`);
});

export default router; 
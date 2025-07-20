import express from 'express';
import { RegressionTestingService } from '../services/regressionTesting';
import { logger } from '../services/logger';

const router = express.Router();
const regressionTestingService = new RegressionTestingService();

/**
 * POST /api/regression-testing/snapshots
 * Создает снапшот шаблона
 */
router.post('/snapshots', async (req, res) => {
  try {
    const { templatePath } = req.body;

    if (!templatePath) {
      return res.status(400).json({ 
        error: 'Template path is required' 
      });
    }

    const snapshot = await regressionTestingService.createTemplateSnapshot(templatePath);

    res.json({
      success: true,
      snapshot
    });
  } catch (error) {
    logger.error('Failed to create template snapshot', { error });
    res.status(500).json({ 
      error: 'Failed to create template snapshot',
      details: error.message
    });
  }
});

/**
 * POST /api/regression-testing/run-test
 * Запускает регрессионное тестирование
 */
router.post('/run-test', async (req, res) => {
  try {
    const { templatePath, testConfig, baselineSnapshotId } = req.body;

    if (!templatePath || !testConfig) {
      return res.status(400).json({ 
        error: 'Template path and test config are required' 
      });
    }

    // Валидация конфигурации тестов
    if (!testConfig.testScenarios || !Array.isArray(testConfig.testScenarios)) {
      return res.status(400).json({ 
        error: 'Test scenarios are required and must be an array' 
      });
    }

    if (!testConfig.regressionThresholds) {
      return res.status(400).json({ 
        error: 'Regression thresholds are required' 
      });
    }

    const result = await regressionTestingService.runRegressionTest(
      templatePath,
      testConfig,
      baselineSnapshotId
    );

    res.json({
      success: true,
      result
    });
  } catch (error) {
    logger.error('Failed to run regression test', { error });
    res.status(500).json({ 
      error: 'Failed to run regression test',
      details: error.message
    });
  }
});

/**
 * GET /api/regression-testing/results
 * Получает результаты регрессионных тестов
 */
router.get('/results', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const results = await regressionTestingService.getTestResults(limit);

    res.json({
      success: true,
      results,
      total: results.length
    });
  } catch (error) {
    logger.error('Failed to get test results', { error });
    res.status(500).json({ 
      error: 'Failed to get test results',
      details: error.message
    });
  }
});

/**
 * GET /api/regression-testing/results/:testId
 * Получает детальные результаты конкретного теста
 */
router.get('/results/:testId', async (req, res) => {
  try {
    const { testId } = req.params;
    const results = await regressionTestingService.getTestResults(100);
    const result = results.find(r => r.testId === testId);

    if (!result) {
      return res.status(404).json({ 
        error: 'Test result not found' 
      });
    }

    res.json({
      success: true,
      result
    });
  } catch (error) {
    logger.error('Failed to get test result', { error });
    res.status(500).json({ 
      error: 'Failed to get test result',
      details: error.message
    });
  }
});

/**
 * POST /api/regression-testing/cleanup
 * Очищает старые данные
 */
router.post('/cleanup', async (req, res) => {
  try {
    const { maxAge } = req.body;
    const maxAgeMs = maxAge || 30 * 24 * 60 * 60 * 1000; // 30 дней по умолчанию

    await regressionTestingService.cleanupOldData(maxAgeMs);

    res.json({
      success: true,
      message: 'Cleanup completed successfully'
    });
  } catch (error) {
    logger.error('Failed to cleanup old data', { error });
    res.status(500).json({ 
      error: 'Failed to cleanup old data',
      details: error.message
    });
  }
});

/**
 * POST /api/regression-testing/quick-test
 * Быстрое тестирование шаблона с предустановленными сценариями
 */
router.post('/quick-test', async (req, res) => {
  try {
    const { templatePath, gameType = 'unknown' } = req.body;

    if (!templatePath) {
      return res.status(400).json({ 
        error: 'Template path is required' 
      });
    }

    // Создаем стандартную конфигурацию тестов
    const quickTestConfig = {
      templatePath,
      testScenarios: [
        {
          name: 'Basic Generation Test',
          gameConfig: {
            gameType,
            theme: 'test',
            difficulty: 'easy',
            features: ['basic_gameplay']
          },
          expectedMetrics: {
            maxGenerationTime: 30000, // 30 секунд
            minAssetCount: 3,
            minCodeQuality: 0.7,
            minGameplayScore: 0.6,
            minPerformanceScore: 0.5
          }
        },
        {
          name: 'Performance Test',
          gameConfig: {
            gameType,
            theme: 'test',
            difficulty: 'hard',
            features: ['advanced_graphics', 'sound_effects']
          },
          expectedMetrics: {
            maxGenerationTime: 45000, // 45 секунд
            minAssetCount: 5,
            minCodeQuality: 0.6,
            minGameplayScore: 0.5,
            minPerformanceScore: 0.4
          }
        },
        {
          name: 'Feature Test',
          gameConfig: {
            gameType,
            theme: 'test',
            difficulty: 'medium',
            features: ['animations', 'particles', 'ui_effects']
          },
          expectedMetrics: {
            maxGenerationTime: 40000, // 40 секунд
            minAssetCount: 8,
            minCodeQuality: 0.6,
            minGameplayScore: 0.6,
            minPerformanceScore: 0.5
          }
        }
      ],
      regressionThresholds: {
        generationTimeIncrease: 50, // максимум 50% увеличение времени
        qualityDecrease: 20, // максимум 20% снижение качества
        performanceDecrease: 30 // максимум 30% снижение производительности
      }
    };

    const result = await regressionTestingService.runRegressionTest(
      templatePath,
      quickTestConfig
    );

    res.json({
      success: true,
      result,
      testType: 'quick-test'
    });
  } catch (error) {
    logger.error('Failed to run quick test', { error });
    res.status(500).json({ 
      error: 'Failed to run quick test',
      details: error.message
    });
  }
});

/**
 * GET /api/regression-testing/templates/analysis
 * Анализирует все доступные шаблоны
 */
router.get('/templates/analysis', async (req, res) => {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const templatesDir = path.join(process.cwd(), 'backend', 'templates', 'games');
    const templateFiles = await fs.readdir(templatesDir);
    
    const analysis = [];
    
    for (const file of templateFiles) {
      if (file.endsWith('.ts') && file !== 'index.ts') {
        const templatePath = path.join(templatesDir, file);
        const content = await fs.readFile(templatePath, 'utf-8');
        
        // Простой анализ шаблона
        const linesCount = content.split('\n').length;
        const functionsCount = (content.match(/function|=>/g) || []).length;
        const importsCount = (content.match(/import/g) || []).length;
        
        analysis.push({
          fileName: file,
          templatePath,
          metrics: {
            linesCount,
            functionsCount,
            importsCount,
            complexity: functionsCount + importsCount
          },
          lastModified: (await fs.stat(templatePath)).mtime
        });
      }
    }

    // Сортируем по сложности
    analysis.sort((a, b) => b.metrics.complexity - a.metrics.complexity);

    res.json({
      success: true,
      templates: analysis,
      totalTemplates: analysis.length
    });
  } catch (error) {
    logger.error('Failed to analyze templates', { error });
    res.status(500).json({ 
      error: 'Failed to analyze templates',
      details: error.message
    });
  }
});

/**
 * GET /api/regression-testing/health
 * Проверяет здоровье системы регрессионного тестирования
 */
router.get('/health', async (req, res) => {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');

    const snapshotsDir = path.join(process.cwd(), 'data', 'template-snapshots');
    const resultsDir = path.join(process.cwd(), 'data', 'regression-tests');

    // Проверяем директории
    const [snapshotsExist, resultsExist] = await Promise.all([
      fs.access(snapshotsDir).then(() => true).catch(() => false),
      fs.access(resultsDir).then(() => true).catch(() => false)
    ]);

    let snapshotsCount = 0;
    let resultsCount = 0;

    if (snapshotsExist) {
      const snapshotFiles = await fs.readdir(snapshotsDir);
      snapshotsCount = snapshotFiles.filter(f => f.endsWith('.json')).length;
    }

    if (resultsExist) {
      const resultFiles = await fs.readdir(resultsDir);
      resultsCount = resultFiles.filter(f => f.endsWith('.json')).length;
    }

    const health = {
      status: 'healthy',
      directories: {
        snapshots: snapshotsExist,
        results: resultsExist
      },
      counts: {
        snapshots: snapshotsCount,
        results: resultsCount
      },
      lastCheck: new Date()
    };

    res.json({
      success: true,
      health
    });
  } catch (error) {
    logger.error('Failed to check health', { error });
    res.status(500).json({ 
      error: 'Failed to check system health',
      details: error.message
    });
  }
});

export default router; 
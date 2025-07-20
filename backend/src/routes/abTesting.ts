import { Router } from 'express';
import { ABTestingService } from '../services/advancedABTesting';
import { logger } from '../services/logger';

const router = Router();
const abTestingService = new ABTestingService();

// Создание нового A/B теста
router.post('/tests', async (req, res) => {
  try {
    const test = await abTestingService.createTest(req.body);
    res.json(test);
  } catch (error) {
    logger.error('Error creating A/B test:', error);
    res.status(500).json({ error: 'Failed to create A/B test' });
  }
});

// Получение всех активных тестов
router.get('/tests/active', async (req, res) => {
  try {
    const tests = await abTestingService.getActiveTests();
    res.json(tests);
  } catch (error) {
    logger.error('Error fetching active tests:', error);
    res.status(500).json({ error: 'Failed to fetch active tests' });
  }
});

// Получение всех тестов
router.get('/tests', async (req, res) => {
  try {
    const tests = await abTestingService.getAllTests();
    res.json(tests);
  } catch (error) {
    logger.error('Error fetching tests:', error);
    res.status(500).json({ error: 'Failed to fetch tests' });
  }
});

// Получение конкретного теста
router.get('/tests/:testId', async (req, res) => {
  try {
    const test = await abTestingService.getTest(req.params.testId);
    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }
    res.json(test);
  } catch (error) {
    logger.error('Error fetching test:', error);
    res.status(500).json({ error: 'Failed to fetch test' });
  }
});

// Назначение пользователя к варианту теста
router.post('/assignment', async (req, res) => {
  try {
    const { userId, testType } = req.body;
    const assignment = await abTestingService.assignUserToVariant(userId, testType);
    res.json(assignment);
  } catch (error) {
    logger.error('Error assigning user to variant:', error);
    res.status(500).json({ error: 'Failed to assign user to variant' });
  }
});

// Получение назначений пользователя
router.get('/assignment/:userId', async (req, res) => {
  try {
    const assignments = await abTestingService.getUserAssignments(req.params.userId);
    res.json(assignments);
  } catch (error) {
    logger.error('Error fetching user assignments:', error);
    res.status(500).json({ error: 'Failed to fetch user assignments' });
  }
});

// Отслеживание события
router.post('/events', async (req, res) => {
  try {
    const { userId, testId, variant, eventType, eventData } = req.body;
    await abTestingService.trackEvent(userId, testId, variant, eventType, eventData);
    res.json({ success: true });
  } catch (error) {
    logger.error('Error tracking event:', error);
    res.status(500).json({ error: 'Failed to track event' });
  }
});

// Получение результатов теста
router.get('/tests/:testId/results', async (req, res) => {
  try {
    const results = await abTestingService.getTestResults(req.params.testId);
    res.json(results);
  } catch (error) {
    logger.error('Error fetching test results:', error);
    res.status(500).json({ error: 'Failed to fetch test results' });
  }
});

// Получение статистической значимости
router.get('/tests/:testId/significance', async (req, res) => {
  try {
    const significance = await abTestingService.calculateStatisticalSignificance(req.params.testId);
    res.json(significance);
  } catch (error) {
    logger.error('Error calculating statistical significance:', error);
    res.status(500).json({ error: 'Failed to calculate statistical significance' });
  }
});

// Остановка теста
router.post('/tests/:testId/stop', async (req, res) => {
  try {
    const test = await abTestingService.stopTest(req.params.testId);
    res.json(test);
  } catch (error) {
    logger.error('Error stopping test:', error);
    res.status(500).json({ error: 'Failed to stop test' });
  }
});

// Архивация теста
router.post('/tests/:testId/archive', async (req, res) => {
  try {
    const test = await abTestingService.archiveTest(req.params.testId);
    res.json(test);
  } catch (error) {
    logger.error('Error archiving test:', error);
    res.status(500).json({ error: 'Failed to archive test' });
  }
});

// Получение метрик теста
router.get('/tests/:testId/metrics', async (req, res) => {
  try {
    const metrics = await abTestingService.getTestMetrics(req.params.testId);
    res.json(metrics);
  } catch (error) {
    logger.error('Error fetching test metrics:', error);
    res.status(500).json({ error: 'Failed to fetch test metrics' });
  }
});

// Получение рекомендаций по оптимизации
router.get('/tests/:testId/recommendations', async (req, res) => {
  try {
    const recommendations = await abTestingService.getOptimizationRecommendations(req.params.testId);
    res.json(recommendations);
  } catch (error) {
    logger.error('Error fetching recommendations:', error);
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
});

// Экспорт результатов теста
router.get('/tests/:testId/export', async (req, res) => {
  try {
    const exportData = await abTestingService.exportTestResults(req.params.testId);
    res.json(exportData);
  } catch (error) {
    logger.error('Error exporting test results:', error);
    res.status(500).json({ error: 'Failed to export test results' });
  }
});

// Получение аналитики по всем тестам
router.get('/analytics', async (req, res) => {
  try {
    const analytics = await abTestingService.getOverallAnalytics();
    res.json(analytics);
  } catch (error) {
    logger.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Создание теста для UI элементов
router.post('/tests/ui', async (req, res) => {
  try {
    const { name, description, targetElements, variants } = req.body;
    const test = await abTestingService.createTest({
      name,
      description,
      type: 'ui_ux',
      variants,
      targetAudience: 'all',
      configuration: {
        targetElements,
        trafficAllocation: 50
      }
    });
    res.json(test);
  } catch (error) {
    logger.error('Error creating UI test:', error);
    res.status(500).json({ error: 'Failed to create UI test' });
  }
});

// Создание теста для алгоритмов генерации
router.post('/tests/generation', async (req, res) => {
  try {
    const { name, description, algorithmVariants, gameTypes } = req.body;
    const test = await abTestingService.createTest({
      name,
      description,
      type: 'generation_algorithm',
      variants: algorithmVariants,
      targetAudience: 'all',
      configuration: {
        gameTypes,
        trafficAllocation: 50
      }
    });
    res.json(test);
  } catch (error) {
    logger.error('Error creating generation test:', error);
    res.status(500).json({ error: 'Failed to create generation test' });
  }
});

// Создание теста для качества ассетов
router.post('/tests/assets', async (req, res) => {
  try {
    const { name, description, assetTypes, qualityParameters } = req.body;
    const test = await abTestingService.createTest({
      name,
      description,
      type: 'asset_quality',
      variants: qualityParameters,
      targetAudience: 'all',
      configuration: {
        assetTypes,
        trafficAllocation: 50
      }
    });
    res.json(test);
  } catch (error) {
    logger.error('Error creating asset test:', error);
    res.status(500).json({ error: 'Failed to create asset test' });
  }
});

export default router; 
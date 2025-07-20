import { Router } from 'express';
import { CohortAnalyticsService } from '../services/cohortAnalytics';
import { analyticsService } from '../services/analytics';
import { logger } from '../services/logger';

const router = Router();
const cohortAnalyticsService = new CohortAnalyticsService(analyticsService);

// Получение всех когорт
router.get('/cohorts', async (req, res) => {
  try {
    const cohorts = cohortAnalyticsService.getCohorts();
    res.json({
      success: true,
      cohorts,
      count: cohorts.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error fetching cohorts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cohorts'
    });
  }
});

// Создание новой когорты
router.post('/cohorts', async (req, res) => {
  try {
    const { name, description, cohortType, dateRange, filters } = req.body;

    if (!name || !cohortType || !dateRange) {
      return res.status(400).json({
        success: false,
        error: 'Required fields: name, cohortType, dateRange'
      });
    }

    const cohort = await cohortAnalyticsService.createCohort({
      name,
      description: description || '',
      cohortType,
      dateRange: {
        start: new Date(dateRange.start),
        end: new Date(dateRange.end)
      },
      filters: filters || {},
      isActive: true
    });

    res.status(201).json({
      success: true,
      cohort,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error creating cohort:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create cohort'
    });
  }
});

// Получение метрик конкретной когорты
router.get('/cohorts/:cohortId/metrics', async (req, res) => {
  try {
    const { cohortId } = req.params;
    const metrics = cohortAnalyticsService.getCohortMetrics(cohortId);

    if (!metrics) {
      return res.status(404).json({
        success: false,
        error: 'Cohort not found'
      });
    }

    res.json({
      success: true,
      metrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error fetching cohort metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cohort metrics'
    });
  }
});

// Пересчет метрик когорты
router.post('/cohorts/:cohortId/recalculate', async (req, res) => {
  try {
    const { cohortId } = req.params;
    
    const metrics = await cohortAnalyticsService.calculateCohortMetrics(cohortId);

    res.json({
      success: true,
      metrics,
      message: 'Cohort metrics recalculated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error recalculating cohort metrics:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to recalculate cohort metrics'
    });
  }
});

// Сравнение когорт
router.post('/cohorts/compare', async (req, res) => {
  try {
    const { cohortIds } = req.body;

    if (!cohortIds || !Array.isArray(cohortIds) || cohortIds.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Please provide at least 2 cohort IDs for comparison'
      });
    }

    const comparison = await cohortAnalyticsService.compareCohorts(cohortIds);

    res.json({
      success: true,
      comparison,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error comparing cohorts:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to compare cohorts'
    });
  }
});

// Прогнозирование retention для когорты
router.get('/cohorts/:cohortId/forecast', async (req, res) => {
  try {
    const { cohortId } = req.params;
    const { days = 90 } = req.query;
    
    const forecastDays = parseInt(days as string, 10);
    if (isNaN(forecastDays) || forecastDays < 1 || forecastDays > 365) {
      return res.status(400).json({
        success: false,
        error: 'Forecast days must be between 1 and 365'
      });
    }

    const forecast = await cohortAnalyticsService.forecastRetention(cohortId, forecastDays);

    res.json({
      success: true,
      forecast,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error forecasting retention:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to forecast retention'
    });
  }
});

// Получение retention данных для визуализации
router.get('/cohorts/:cohortId/retention', async (req, res) => {
  try {
    const { cohortId } = req.params;
    const { format = 'table' } = req.query;
    
    const metrics = cohortAnalyticsService.getCohortMetrics(cohortId);
    
    if (!metrics) {
      return res.status(404).json({
        success: false,
        error: 'Cohort not found'
      });
    }

    let retentionData = metrics.retentionCurve;

    // Форматируем данные для разных типов визуализации
    if (format === 'chart') {
      retentionData = retentionData.map(data => ({
        day: data.day,
        retention: Math.round(data.retentionRate * 10000) / 100, // В процентах с 2 знаками
        users: data.returningUsers
      }));
    } else if (format === 'heatmap') {
      // Группируем по неделям для тепловой карты
      const weeklyData = [];
      for (let week = 0; week < Math.ceil(retentionData.length / 7); week++) {
        const weekStart = week * 7;
        const weekData = retentionData.slice(weekStart, weekStart + 7);
        weeklyData.push({
          week: week + 1,
          days: weekData.map(d => ({
            day: d.day % 7 || 7,
            retention: Math.round(d.retentionRate * 10000) / 100
          }))
        });
      }
      retentionData = weeklyData;
    }

    res.json({
      success: true,
      cohortId,
      retentionData,
      format,
      cohortSize: metrics.cohortSize,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error fetching retention data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch retention data'
    });
  }
});

// Получение LTV кривой
router.get('/cohorts/:cohortId/ltv', async (req, res) => {
  try {
    const { cohortId } = req.params;
    const metrics = cohortAnalyticsService.getCohortMetrics(cohortId);

    if (!metrics) {
      return res.status(404).json({
        success: false,
        error: 'Cohort not found'
      });
    }

    const ltvData = metrics.lifetimeValueCurve.map(data => ({
      day: data.day,
      avgLTV: Math.round(data.avgLTV * 100) / 100,
      medianLTV: Math.round(data.medianLTV * 100) / 100,
      totalRevenue: Math.round(data.totalRevenue * 100) / 100
    }));

    res.json({
      success: true,
      cohortId,
      ltvData,
      cohortSize: metrics.cohortSize,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error fetching LTV data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch LTV data'
    });
  }
});

// Получение разбивки по сегментам
router.get('/cohorts/:cohortId/segments', async (req, res) => {
  try {
    const { cohortId } = req.params;
    const metrics = cohortAnalyticsService.getCohortMetrics(cohortId);

    if (!metrics) {
      return res.status(404).json({
        success: false,
        error: 'Cohort not found'
      });
    }

    const segmentData = Object.entries(metrics.segmentBreakdown).map(([segment, data]) => ({
      segment,
      size: data.size,
      retention30: Math.round(data.retention30 * 100) / 100,
      avgLTV: Math.round(data.avgLTV * 100) / 100,
      percentage: Math.round((data.size / metrics.cohortSize) * 10000) / 100
    }));

    res.json({
      success: true,
      cohortId,
      segmentData,
      totalSegments: segmentData.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error fetching segment data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch segment data'
    });
  }
});

// Получение производительности каналов привлечения
router.get('/cohorts/:cohortId/channels', async (req, res) => {
  try {
    const { cohortId } = req.params;
    const metrics = cohortAnalyticsService.getCohortMetrics(cohortId);

    if (!metrics) {
      return res.status(404).json({
        success: false,
        error: 'Cohort not found'
      });
    }

    const channelData = Object.entries(metrics.channelPerformance).map(([channel, data]) => ({
      channel,
      size: data.size,
      avgLTV: Math.round(data.avgLTV * 100) / 100,
      quality: data.quality,
      retention7: data.retention.find(r => r.day === 7)?.retentionRate || 0,
      retention30: data.retention.find(r => r.day === 30)?.retentionRate || 0,
      percentage: Math.round((data.size / metrics.cohortSize) * 10000) / 100
    }));

    // Сортируем по качеству и размеру
    channelData.sort((a, b) => {
      const qualityOrder = { high: 3, medium: 2, low: 1 };
      const qualityDiff = qualityOrder[b.quality] - qualityOrder[a.quality];
      return qualityDiff !== 0 ? qualityDiff : b.size - a.size;
    });

    res.json({
      success: true,
      cohortId,
      channelData,
      totalChannels: channelData.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error fetching channel data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch channel data'
    });
  }
});

// Получение воронки конверсии
router.get('/cohorts/:cohortId/funnel', async (req, res) => {
  try {
    const { cohortId } = req.params;
    const metrics = cohortAnalyticsService.getCohortMetrics(cohortId);

    if (!metrics) {
      return res.status(404).json({
        success: false,
        error: 'Cohort not found'
      });
    }

    const funnelData = metrics.conversionFunnel.map((step, index) => ({
      ...step,
      stepNumber: index + 1,
      conversionRate: Math.round(step.conversionRate * 100) / 100,
      dropoffRate: Math.round(step.dropoffRate * 100) / 100
    }));

    // Рассчитываем общую конверсию воронки
    const overallConversion = funnelData.length > 0 
      ? (funnelData[funnelData.length - 1].usersCompleted / funnelData[0].usersEntered) * 100
      : 0;

    res.json({
      success: true,
      cohortId,
      funnelData,
      overallConversion: Math.round(overallConversion * 100) / 100,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error fetching funnel data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch funnel data'
    });
  }
});

// Получение поведенческих паттернов
router.get('/cohorts/:cohortId/behavior', async (req, res) => {
  try {
    const { cohortId } = req.params;
    const metrics = cohortAnalyticsService.getCohortMetrics(cohortId);

    if (!metrics) {
      return res.status(404).json({
        success: false,
        error: 'Cohort not found'
      });
    }

    const behaviorData = {
      ...metrics.behaviorPatterns,
      total: metrics.cohortSize,
      percentages: {
        powerUsers: Math.round((metrics.behaviorPatterns.powerUsers / metrics.cohortSize) * 10000) / 100,
        casualUsers: Math.round((metrics.behaviorPatterns.casualUsers / metrics.cohortSize) * 10000) / 100,
        churned: Math.round((metrics.behaviorPatterns.churned / metrics.cohortSize) * 10000) / 100,
        dormant: Math.round((metrics.behaviorPatterns.dormant / metrics.cohortSize) * 10000) / 100,
        reactivated: Math.round((metrics.behaviorPatterns.reactivated / metrics.cohortSize) * 10000) / 100
      }
    };

    res.json({
      success: true,
      cohortId,
      behaviorData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error fetching behavior data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch behavior data'
    });
  }
});

// Получение сводки когорты
router.get('/cohorts/:cohortId/summary', async (req, res) => {
  try {
    const { cohortId } = req.params;
    const metrics = cohortAnalyticsService.getCohortMetrics(cohortId);

    if (!metrics) {
      return res.status(404).json({
        success: false,
        error: 'Cohort not found'
      });
    }

    const retention1 = metrics.retentionCurve.find(r => r.day === 1)?.retentionRate || 0;
    const retention7 = metrics.retentionCurve.find(r => r.day === 7)?.retentionRate || 0;
    const retention30 = metrics.retentionCurve.find(r => r.day === 30)?.retentionRate || 0;
    const ltv30 = metrics.lifetimeValueCurve.find(l => l.day === 30)?.avgLTV || 0;

    const summary = {
      cohortId,
      cohortSize: metrics.cohortSize,
      healthScore: metrics.healthScore,
      keyMetrics: {
        retention1Day: Math.round(retention1 * 10000) / 100,
        retention7Day: Math.round(retention7 * 10000) / 100,
        retention30Day: Math.round(retention30 * 10000) / 100,
        avgLTV30Day: Math.round(ltv30 * 100) / 100
      },
      trends: metrics.trendsVsPreviousCohort,
      insights: metrics.keyInsights,
      recommendations: metrics.recommendations,
      topChannels: Object.entries(metrics.channelPerformance)
        .sort((a, b) => b[1].size - a[1].size)
        .slice(0, 3)
        .map(([channel, data]) => ({
          channel,
          size: data.size,
          quality: data.quality
        })),
      topSegments: Object.entries(metrics.segmentBreakdown)
        .sort((a, b) => b[1].size - a[1].size)
        .slice(0, 3)
        .map(([segment, data]) => ({
          segment,
          size: data.size,
          retention30: Math.round(data.retention30 * 100) / 100
        }))
    };

    res.json({
      success: true,
      summary,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error fetching cohort summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cohort summary'
    });
  }
});

// Получение статистики сервиса
router.get('/stats', async (req, res) => {
  try {
    const stats = cohortAnalyticsService.getServiceStats();
    
    res.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error fetching service stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch service stats'
    });
  }
});

// Экспорт данных когорты
router.get('/cohorts/:cohortId/export', async (req, res) => {
  try {
    const { cohortId } = req.params;
    const { format = 'json' } = req.query;
    
    const metrics = cohortAnalyticsService.getCohortMetrics(cohortId);

    if (!metrics) {
      return res.status(404).json({
        success: false,
        error: 'Cohort not found'
      });
    }

    if (format === 'csv') {
      // Конвертируем retention данные в CSV
      const csvLines = ['Day,Total Users,Returning Users,Retention Rate'];
      metrics.retentionCurve.forEach(data => {
        csvLines.push(`${data.day},${data.totalUsers},${data.returningUsers},${data.retentionRate}`);
      });
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="cohort_${cohortId}_retention.csv"`);
      res.send(csvLines.join('\n'));
    } else {
      // JSON формат
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="cohort_${cohortId}_data.json"`);
      res.json({
        cohortId,
        exportedAt: new Date().toISOString(),
        data: metrics
      });
    }
  } catch (error) {
    logger.error('Error exporting cohort data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export cohort data'
    });
  }
});

export default router; 
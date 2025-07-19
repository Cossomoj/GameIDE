import { Router, Request, Response } from 'express';
import { advancedAnalyticsService } from '../services/advancedAnalytics';
import { logger } from '../services/logger';
import { analyticsService } from '../services/analytics';

const router = Router();

// POST /api/advanced-analytics/collect - сбор метрик
router.post('/collect', async (req: Request, res: Response) => {
  try {
    const { source, data } = req.body;

    if (!source || !Array.isArray(data)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'Source and data array are required'
      });
    }

    await advancedAnalyticsService.collectMetrics(source, data);

    res.json({
      success: true,
      message: `Collected ${data.length} metrics from ${source}`,
      timestamp: new Date().toISOString()
    });

    analyticsService.trackEvent('metrics_collected', {
      source,
      count: data.length,
      userAgent: req.get('User-Agent')
    });

  } catch (error) {
    logger.error('Error collecting metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to collect metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/advanced-analytics/reports - генерация отчета
router.post('/reports', async (req: Request, res: Response) => {
  try {
    const {
      title,
      type = 'dashboard',
      dateRange,
      metrics,
      includeCharts = true,
      includeInsights = true,
      includeComparison = false,
      format = 'json'
    } = req.body;

    if (!title || !dateRange || !Array.isArray(metrics)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'Title, dateRange, and metrics array are required'
      });
    }

    // Валидация dateRange
    if (!dateRange.start || !dateRange.end) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date range',
        message: 'Start and end dates are required'
      });
    }

    const config = {
      title,
      type,
      dateRange: {
        start: new Date(dateRange.start),
        end: new Date(dateRange.end),
        period: dateRange.period || 'day'
      },
      metrics,
      includeCharts,
      includeInsights,
      includeComparison,
      format
    };

    const report = await advancedAnalyticsService.generateReport(config);

    res.json({
      success: true,
      data: report,
      message: 'Report generated successfully'
    });

    analyticsService.trackEvent('report_generated', {
      reportId: report.id,
      type,
      metricsCount: metrics.length,
      includeCharts,
      includeInsights,
      userAgent: req.get('User-Agent')
    });

  } catch (error) {
    logger.error('Error generating report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate report',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/advanced-analytics/reports/:reportId - получение отчета
router.get('/reports/:reportId', async (req: Request, res: Response) => {
  try {
    const { reportId } = req.params;
    const report = advancedAnalyticsService.getReport(reportId);

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found',
        message: `Report with ID "${reportId}" not found`
      });
    }

    res.json({
      success: true,
      data: report
    });

    analyticsService.trackEvent('report_accessed', {
      reportId,
      userAgent: req.get('User-Agent')
    });

  } catch (error) {
    logger.error('Error getting report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get report',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/advanced-analytics/reports - список всех отчетов
router.get('/reports', async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, type, tags } = req.query;
    const reports = advancedAnalyticsService.getAllReports();

    // Фильтрация
    let filteredReports = reports;
    if (type) {
      filteredReports = filteredReports.filter(report => report.type === type);
    }
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      filteredReports = filteredReports.filter(report => 
        tagArray.some(tag => report.tags.includes(tag as string))
      );
    }

    // Пагинация
    const startIndex = (Number(page) - 1) * Number(limit);
    const endIndex = startIndex + Number(limit);
    const paginatedReports = filteredReports.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        reports: paginatedReports,
        pagination: {
          current: Number(page),
          limit: Number(limit),
          total: filteredReports.length,
          pages: Math.ceil(filteredReports.length / Number(limit))
        }
      }
    });

    analyticsService.trackEvent('reports_listed', {
      page: Number(page),
      limit: Number(limit),
      totalReports: filteredReports.length,
      userAgent: req.get('User-Agent')
    });

  } catch (error) {
    logger.error('Error listing reports:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list reports',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/advanced-analytics/funnels - создание воронки
router.post('/funnels', async (req: Request, res: Response) => {
  try {
    const { name, steps, dateRange } = req.body;

    if (!name || !Array.isArray(steps) || !dateRange) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'Name, steps array, and dateRange are required'
      });
    }

    const config = {
      name,
      steps,
      dateRange: {
        start: new Date(dateRange.start),
        end: new Date(dateRange.end)
      }
    };

    const funnel = await advancedAnalyticsService.createFunnelAnalysis(config);

    res.json({
      success: true,
      data: funnel,
      message: 'Funnel analysis created successfully'
    });

    analyticsService.trackEvent('funnel_created', {
      funnelId: funnel.id,
      stepsCount: steps.length,
      conversionRate: funnel.overallConversion,
      userAgent: req.get('User-Agent')
    });

  } catch (error) {
    logger.error('Error creating funnel:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create funnel analysis',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/advanced-analytics/funnels/:funnelId - получение воронки
router.get('/funnels/:funnelId', async (req: Request, res: Response) => {
  try {
    const { funnelId } = req.params;
    const funnel = advancedAnalyticsService.getFunnel(funnelId);

    if (!funnel) {
      return res.status(404).json({
        success: false,
        error: 'Funnel not found',
        message: `Funnel with ID "${funnelId}" not found`
      });
    }

    res.json({
      success: true,
      data: funnel
    });

    analyticsService.trackEvent('funnel_accessed', {
      funnelId,
      userAgent: req.get('User-Agent')
    });

  } catch (error) {
    logger.error('Error getting funnel:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get funnel',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/advanced-analytics/cohorts - создание когортного анализа
router.post('/cohorts', async (req: Request, res: Response) => {
  try {
    const {
      type = 'retention',
      cohortBy = 'signup_date',
      measureBy = 'retention',
      periods = 30,
      periodType = 'day',
      dateRange
    } = req.body;

    if (!dateRange) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'DateRange is required'
      });
    }

    const config = {
      type,
      cohortBy,
      measureBy,
      periods,
      periodType,
      dateRange: {
        start: new Date(dateRange.start),
        end: new Date(dateRange.end)
      }
    };

    const cohort = await advancedAnalyticsService.createCohortAnalysis(config);

    res.json({
      success: true,
      data: cohort,
      message: 'Cohort analysis created successfully'
    });

    analyticsService.trackEvent('cohort_created', {
      cohortId: cohort.id,
      type,
      periods,
      periodType,
      userAgent: req.get('User-Agent')
    });

  } catch (error) {
    logger.error('Error creating cohort:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create cohort analysis',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/advanced-analytics/cohorts/:cohortId - получение когортного анализа
router.get('/cohorts/:cohortId', async (req: Request, res: Response) => {
  try {
    const { cohortId } = req.params;
    const cohort = advancedAnalyticsService.getCohort(cohortId);

    if (!cohort) {
      return res.status(404).json({
        success: false,
        error: 'Cohort not found',
        message: `Cohort with ID "${cohortId}" not found`
      });
    }

    res.json({
      success: true,
      data: cohort
    });

    analyticsService.trackEvent('cohort_accessed', {
      cohortId,
      userAgent: req.get('User-Agent')
    });

  } catch (error) {
    logger.error('Error getting cohort:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get cohort',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/advanced-analytics/segments - создание сегмента пользователей
router.post('/segments', async (req: Request, res: Response) => {
  try {
    const { name, description, criteria } = req.body;

    if (!name || !description || !Array.isArray(criteria)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'Name, description, and criteria array are required'
      });
    }

    const config = { name, description, criteria };
    const segment = await advancedAnalyticsService.createUserSegment(config);

    res.json({
      success: true,
      data: segment,
      message: 'User segment created successfully'
    });

    analyticsService.trackEvent('segment_created', {
      segmentId: segment.id,
      userCount: segment.userCount,
      criteriaCount: criteria.length,
      userAgent: req.get('User-Agent')
    });

  } catch (error) {
    logger.error('Error creating segment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create user segment',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/advanced-analytics/segments/:segmentId - получение сегмента
router.get('/segments/:segmentId', async (req: Request, res: Response) => {
  try {
    const { segmentId } = req.params;
    const segment = advancedAnalyticsService.getSegment(segmentId);

    if (!segment) {
      return res.status(404).json({
        success: false,
        error: 'Segment not found',
        message: `Segment with ID "${segmentId}" not found`
      });
    }

    res.json({
      success: true,
      data: segment
    });

    analyticsService.trackEvent('segment_accessed', {
      segmentId,
      userAgent: req.get('User-Agent')
    });

  } catch (error) {
    logger.error('Error getting segment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get segment',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/advanced-analytics/alerts - создание алерта
router.post('/alerts', async (req: Request, res: Response) => {
  try {
    const {
      type,
      severity,
      title,
      description,
      metric,
      condition,
      actions = []
    } = req.body;

    if (!type || !severity || !title || !metric || !condition) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'Type, severity, title, metric, and condition are required'
      });
    }

    const config = {
      type,
      severity,
      title,
      description,
      metric,
      condition,
      actions
    };

    const alert = await advancedAnalyticsService.createAlert(config);

    res.json({
      success: true,
      data: alert,
      message: 'Performance alert created successfully'
    });

    analyticsService.trackEvent('alert_created', {
      alertId: alert.id,
      type,
      severity,
      metric,
      userAgent: req.get('User-Agent')
    });

  } catch (error) {
    logger.error('Error creating alert:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create alert',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/advanced-analytics/alerts - получение всех алертов
router.get('/alerts', async (req: Request, res: Response) => {
  try {
    const { status, severity, metric } = req.query;
    let alerts = advancedAnalyticsService.getAllAlerts();

    // Фильтрация
    if (status) {
      alerts = alerts.filter(alert => alert.status === status);
    }
    if (severity) {
      alerts = alerts.filter(alert => alert.severity === severity);
    }
    if (metric) {
      alerts = alerts.filter(alert => alert.metric === metric);
    }

    // Сортировка по времени срабатывания
    alerts.sort((a, b) => b.triggeredAt.getTime() - a.triggeredAt.getTime());

    res.json({
      success: true,
      data: {
        alerts,
        summary: {
          total: alerts.length,
          active: alerts.filter(a => a.status === 'active').length,
          critical: alerts.filter(a => a.severity === 'critical').length,
          warning: alerts.filter(a => a.severity === 'warning').length
        }
      }
    });

    analyticsService.trackEvent('alerts_listed', {
      total: alerts.length,
      filters: { status, severity, metric },
      userAgent: req.get('User-Agent')
    });

  } catch (error) {
    logger.error('Error listing alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list alerts',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// PUT /api/advanced-analytics/alerts/:alertId - обновление алерта
router.put('/alerts/:alertId', async (req: Request, res: Response) => {
  try {
    const { alertId } = req.params;
    const { status, assignedTo } = req.body;

    const alert = advancedAnalyticsService.getAlert(alertId);
    if (!alert) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found',
        message: `Alert with ID "${alertId}" not found`
      });
    }

    // Обновляем статус
    if (status && ['active', 'acknowledged', 'resolved'].includes(status)) {
      alert.status = status;
    }

    if (assignedTo) {
      alert.assignedTo = assignedTo;
    }

    res.json({
      success: true,
      data: alert,
      message: 'Alert updated successfully'
    });

    analyticsService.trackEvent('alert_updated', {
      alertId,
      newStatus: alert.status,
      assignedTo: alert.assignedTo,
      userAgent: req.get('User-Agent')
    });

  } catch (error) {
    logger.error('Error updating alert:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update alert',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/advanced-analytics/dashboard - реальное время дашборд
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const dashboard = await advancedAnalyticsService.getRealTimeDashboard();

    res.json({
      success: true,
      data: dashboard,
      timestamp: new Date().toISOString()
    });

    analyticsService.trackEvent('dashboard_accessed', {
      metricsCount: dashboard.metrics.length,
      activeUsers: dashboard.activeUsers,
      activeAlerts: dashboard.alerts.length,
      userAgent: req.get('User-Agent')
    });

  } catch (error) {
    logger.error('Error getting dashboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get dashboard',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/advanced-analytics/predictions - генерация прогнозов
router.post('/predictions', async (req: Request, res: Response) => {
  try {
    const {
      metric,
      horizon = 7,
      confidence = 0.95,
      model = 'linear'
    } = req.body;

    if (!metric) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'Metric is required'
      });
    }

    const config = { metric, horizon, confidence, model };
    const predictions = await advancedAnalyticsService.generatePredictions(config);

    res.json({
      success: true,
      data: predictions,
      message: 'Predictions generated successfully'
    });

    analyticsService.trackEvent('predictions_generated', {
      metric,
      horizon,
      model,
      accuracy: predictions.accuracy,
      userAgent: req.get('User-Agent')
    });

  } catch (error) {
    logger.error('Error generating predictions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate predictions',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/advanced-analytics/ab-test - анализ A/B теста
router.post('/ab-test', async (req: Request, res: Response) => {
  try {
    const {
      testId,
      metric,
      variants,
      dateRange,
      significanceLevel = 0.95
    } = req.body;

    if (!testId || !metric || !Array.isArray(variants) || !dateRange) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'TestId, metric, variants array, and dateRange are required'
      });
    }

    const config = {
      testId,
      metric,
      variants,
      dateRange: {
        start: new Date(dateRange.start),
        end: new Date(dateRange.end)
      },
      significanceLevel
    };

    const analysis = await advancedAnalyticsService.analyzeABTest(config);

    res.json({
      success: true,
      data: analysis,
      message: 'A/B test analysis completed'
    });

    analyticsService.trackEvent('ab_test_analyzed', {
      testId,
      metric,
      variantsCount: variants.length,
      significance: analysis.significance,
      winner: analysis.winner,
      userAgent: req.get('User-Agent')
    });

  } catch (error) {
    logger.error('Error analyzing A/B test:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze A/B test',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/advanced-analytics/metrics/:metricId - получение метрики
router.get('/metrics/:metricId', async (req: Request, res: Response) => {
  try {
    const { metricId } = req.params;
    const metric = advancedAnalyticsService.getMetric(metricId);

    if (!metric) {
      return res.status(404).json({
        success: false,
        error: 'Metric not found',
        message: `Metric with ID "${metricId}" not found`
      });
    }

    res.json({
      success: true,
      data: metric
    });

    analyticsService.trackEvent('metric_accessed', {
      metricId,
      userAgent: req.get('User-Agent')
    });

  } catch (error) {
    logger.error('Error getting metric:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get metric',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/advanced-analytics/stats - получение статистики системы
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = advancedAnalyticsService.getStats();

    res.json({
      success: true,
      data: stats
    });

    analyticsService.trackEvent('analytics_stats_requested', {
      userAgent: req.get('User-Agent')
    });

  } catch (error) {
    logger.error('Error getting analytics stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/advanced-analytics/export - экспорт данных
router.post('/export', async (req: Request, res: Response) => {
  try {
    const {
      type, // 'report' | 'metrics' | 'funnel' | 'cohort'
      id,
      format = 'json', // 'json' | 'csv' | 'excel' | 'pdf'
      dateRange
    } = req.body;

    if (!type || !id) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'Type and ID are required'
      });
    }

    // В реальном приложении здесь была бы логика экспорта
    const exportData = {
      type,
      id,
      format,
      exportedAt: new Date().toISOString(),
      downloadUrl: `/downloads/${type}_${id}.${format}`,
      size: Math.floor(Math.random() * 1000000) + 10000 // Случайный размер файла
    };

    res.json({
      success: true,
      data: exportData,
      message: 'Export completed successfully'
    });

    analyticsService.trackEvent('data_exported', {
      type,
      id,
      format,
      size: exportData.size,
      userAgent: req.get('User-Agent')
    });

    logger.info(`Data exported: ${type}/${id} in ${format} format`);

  } catch (error) {
    logger.error('Error exporting data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// WebSocket эндпоинт для реального времени (заглушка)
router.get('/realtime', async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      message: 'Real-time analytics available via WebSocket',
      websocketUrl: '/ws/analytics',
      supportedEvents: [
        'metrics_updated',
        'alert_triggered',
        'report_completed',
        'dashboard_refresh'
      ]
    });

  } catch (error) {
    logger.error('Error getting realtime info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get realtime info',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router; 
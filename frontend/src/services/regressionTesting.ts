import { api } from './api';

export interface TemplateSnapshot {
  id: string;
  templatePath: string;
  templateHash: string;
  timestamp: Date;
  version: string;
  metadata: {
    templateName: string;
    gameType: string;
    dependencies: string[];
    features: string[];
  };
}

export interface RegressionTestResult {
  testId: string;
  templateId: string;
  beforeSnapshot: TemplateSnapshot;
  afterSnapshot: TemplateSnapshot;
  testCases: {
    id: string;
    name: string;
    status: 'passed' | 'failed' | 'warning';
    message: string;
    executionTime: number;
    metrics: {
      generationTime: number;
      assetCount: number;
      codeQuality: number;
      gameplayScore: number;
      performanceScore: number;
    };
  }[];
  overallStatus: 'passed' | 'failed' | 'warning';
  regressionDetected: boolean;
  criticalIssues: string[];
  recommendations: string[];
  timestamp: Date;
}

export interface TemplateTestConfig {
  templatePath: string;
  testScenarios: {
    name: string;
    gameConfig: any;
    expectedMetrics: {
      minGenerationTime?: number;
      maxGenerationTime?: number;
      minAssetCount?: number;
      minCodeQuality?: number;
      minGameplayScore?: number;
      minPerformanceScore?: number;
    };
  }[];
  regressionThresholds: {
    generationTimeIncrease: number;
    qualityDecrease: number;
    performanceDecrease: number;
  };
}

export interface TemplateAnalysis {
  fileName: string;
  templatePath: string;
  metrics: {
    linesCount: number;
    functionsCount: number;
    importsCount: number;
    complexity: number;
  };
  lastModified: Date;
}

export interface RegressionTestingHealth {
  status: string;
  directories: {
    snapshots: boolean;
    results: boolean;
  };
  counts: {
    snapshots: number;
    results: number;
  };
  lastCheck: Date;
}

class RegressionTestingService {
  /**
   * Создает снапшот шаблона
   */
  async createSnapshot(templatePath: string): Promise<TemplateSnapshot> {
    const response = await api.post('/regression-testing/snapshots', {
      templatePath
    });
    return response.data.snapshot;
  }

  /**
   * Запускает регрессионное тестирование
   */
  async runTest(
    templatePath: string,
    testConfig: TemplateTestConfig,
    baselineSnapshotId?: string
  ): Promise<RegressionTestResult> {
    const response = await api.post('/regression-testing/run-test', {
      templatePath,
      testConfig,
      baselineSnapshotId
    });
    return response.data.result;
  }

  /**
   * Запускает быстрое тестирование
   */
  async runQuickTest(templatePath: string, gameType?: string): Promise<RegressionTestResult> {
    const response = await api.post('/regression-testing/quick-test', {
      templatePath,
      gameType
    });
    return response.data.result;
  }

  /**
   * Получает результаты регрессионных тестов
   */
  async getTestResults(limit = 50): Promise<RegressionTestResult[]> {
    const response = await api.get('/regression-testing/results', {
      params: { limit }
    });
    return response.data.results;
  }

  /**
   * Получает детальные результаты конкретного теста
   */
  async getTestResult(testId: string): Promise<RegressionTestResult> {
    const response = await api.get(`/regression-testing/results/${testId}`);
    return response.data.result;
  }

  /**
   * Очищает старые данные
   */
  async cleanup(maxAge?: number): Promise<void> {
    await api.post('/regression-testing/cleanup', {
      maxAge
    });
  }

  /**
   * Получает анализ всех шаблонов
   */
  async getTemplateAnalysis(): Promise<TemplateAnalysis[]> {
    const response = await api.get('/regression-testing/templates/analysis');
    return response.data.templates;
  }

  /**
   * Проверяет здоровье системы регрессионного тестирования
   */
  async getHealth(): Promise<RegressionTestingHealth> {
    const response = await api.get('/regression-testing/health');
    return response.data.health;
  }

  /**
   * Создает стандартную конфигурацию теста
   */
  createStandardTestConfig(
    templatePath: string,
    gameType = 'unknown',
    customScenarios?: any[]
  ): TemplateTestConfig {
    const defaultScenarios = [
      {
        name: 'Basic Generation Test',
        gameConfig: {
          gameType,
          theme: 'test',
          difficulty: 'easy',
          features: ['basic_gameplay']
        },
        expectedMetrics: {
          maxGenerationTime: 30000,
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
          maxGenerationTime: 45000,
          minAssetCount: 5,
          minCodeQuality: 0.6,
          minGameplayScore: 0.5,
          minPerformanceScore: 0.4
        }
      }
    ];

    return {
      templatePath,
      testScenarios: customScenarios || defaultScenarios,
      regressionThresholds: {
        generationTimeIncrease: 50,
        qualityDecrease: 20,
        performanceDecrease: 30
      }
    };
  }

  /**
   * Форматирует результаты теста для отображения
   */
  formatTestResults(result: RegressionTestResult) {
    const passedTests = result.testCases.filter(test => test.status === 'passed').length;
    const warningTests = result.testCases.filter(test => test.status === 'warning').length;
    const failedTests = result.testCases.filter(test => test.status === 'failed').length;

    const avgExecutionTime = result.testCases.reduce(
      (sum, test) => sum + test.executionTime, 0
    ) / result.testCases.length;

    const avgMetrics = result.testCases.reduce(
      (acc, test) => ({
        generationTime: acc.generationTime + test.metrics.generationTime,
        assetCount: acc.assetCount + test.metrics.assetCount,
        codeQuality: acc.codeQuality + test.metrics.codeQuality,
        gameplayScore: acc.gameplayScore + test.metrics.gameplayScore,
        performanceScore: acc.performanceScore + test.metrics.performanceScore
      }),
      { generationTime: 0, assetCount: 0, codeQuality: 0, gameplayScore: 0, performanceScore: 0 }
    );

    Object.keys(avgMetrics).forEach(key => {
      avgMetrics[key] /= result.testCases.length;
    });

    return {
      ...result,
      summary: {
        totalTests: result.testCases.length,
        passedTests,
        warningTests,
        failedTests,
        successRate: (passedTests / result.testCases.length) * 100,
        avgExecutionTime,
        avgMetrics
      }
    };
  }

  /**
   * Получает статистику по всем тестам
   */
  async getTestStatistics(): Promise<any> {
    try {
      const results = await this.getTestResults(100);
      
      if (results.length === 0) {
        return {
          totalTests: 0,
          successRate: 0,
          avgExecutionTime: 0,
          regressionRate: 0,
          templatesCovered: 0
        };
      }

      const totalTests = results.length;
      const passedTests = results.filter(r => r.overallStatus === 'passed').length;
      const testsWithRegression = results.filter(r => r.regressionDetected).length;
      
      const avgExecutionTime = results.reduce((sum, result) => {
        const resultAvg = result.testCases.reduce(
          (testSum, test) => testSum + test.executionTime, 0
        ) / result.testCases.length;
        return sum + resultAvg;
      }, 0) / totalTests;

      const uniqueTemplates = new Set(
        results.map(r => r.afterSnapshot.metadata.templateName)
      ).size;

      return {
        totalTests,
        successRate: (passedTests / totalTests) * 100,
        avgExecutionTime,
        regressionRate: (testsWithRegression / totalTests) * 100,
        templatesCovered: uniqueTemplates,
        lastTestDate: results[0]?.timestamp || null
      };
    } catch (error) {
      console.error('Error getting test statistics:', error);
      return {
        totalTests: 0,
        successRate: 0,
        avgExecutionTime: 0,
        regressionRate: 0,
        templatesCovered: 0,
        error: error.message
      };
    }
  }
}

export const regressionTestingService = new RegressionTestingService();
export default regressionTestingService; 
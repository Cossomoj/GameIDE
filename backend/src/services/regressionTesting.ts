import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { logger } from './logger';
import { GameGenerationService } from './gameGeneration';
import { GameTestingService } from './gameTesting';

interface TemplateSnapshot {
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

interface RegressionTestResult {
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

interface TemplateTestConfig {
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
    generationTimeIncrease: number; // максимальное увеличение времени генерации в %
    qualityDecrease: number; // максимальное снижение качества в %
    performanceDecrease: number; // максимальное снижение производительности в %
  };
}

export class RegressionTestingService {
  private snapshotsDir: string;
  private testResultsDir: string;
  private gameGeneration: GameGenerationService;
  private gameTesting: GameTestingService;

  constructor() {
    this.snapshotsDir = path.join(process.cwd(), 'data', 'template-snapshots');
    this.testResultsDir = path.join(process.cwd(), 'data', 'regression-tests');
    this.gameGeneration = new GameGenerationService();
    this.gameTesting = new GameTestingService();
    this.initializeDirectories();
  }

  private async initializeDirectories(): Promise<void> {
    await fs.mkdir(this.snapshotsDir, { recursive: true });
    await fs.mkdir(this.testResultsDir, { recursive: true });
  }

  /**
   * Создает снапшот шаблона для базовой линии тестирования
   */
  async createTemplateSnapshot(templatePath: string): Promise<TemplateSnapshot> {
    try {
      const templateContent = await fs.readFile(templatePath, 'utf-8');
      const templateHash = crypto.createHash('sha256').update(templateContent).digest('hex');
      
      const templateName = path.basename(templatePath, '.ts');
      const metadata = await this.extractTemplateMetadata(templatePath, templateContent);

      const snapshot: TemplateSnapshot = {
        id: `${templateName}_${Date.now()}`,
        templatePath,
        templateHash,
        timestamp: new Date(),
        version: await this.getTemplateVersion(templatePath),
        metadata: {
          templateName,
          gameType: metadata.gameType || 'unknown',
          dependencies: metadata.dependencies || [],
          features: metadata.features || []
        }
      };

      // Сохраняем снапшот
      const snapshotPath = path.join(this.snapshotsDir, `${snapshot.id}.json`);
      await fs.writeFile(snapshotPath, JSON.stringify(snapshot, null, 2));

      logger.info('Template snapshot created', { snapshotId: snapshot.id, templatePath });
      return snapshot;
    } catch (error) {
      logger.error('Failed to create template snapshot', { templatePath, error });
      throw error;
    }
  }

  /**
   * Запускает регрессионное тестирование для шаблона
   */
  async runRegressionTest(
    templatePath: string,
    testConfig: TemplateTestConfig,
    baselineSnapshotId?: string
  ): Promise<RegressionTestResult> {
    try {
      logger.info('Starting regression test', { templatePath });

      // Создаем новый снапшот
      const currentSnapshot = await this.createTemplateSnapshot(templatePath);

      // Получаем базовый снапшот
      const baselineSnapshot = baselineSnapshotId 
        ? await this.getSnapshot(baselineSnapshotId)
        : await this.getLatestSnapshot(templatePath, currentSnapshot.id);

      if (!baselineSnapshot) {
        throw new Error('No baseline snapshot found for comparison');
      }

      // Запускаем тесты
      const testCases = await this.executeTestCases(testConfig, currentSnapshot, baselineSnapshot);

      // Анализируем результаты
      const { overallStatus, regressionDetected, criticalIssues, recommendations } = 
        this.analyzeTestResults(testCases, testConfig.regressionThresholds);

      const result: RegressionTestResult = {
        testId: `regression_${Date.now()}`,
        templateId: currentSnapshot.id,
        beforeSnapshot: baselineSnapshot,
        afterSnapshot: currentSnapshot,
        testCases,
        overallStatus,
        regressionDetected,
        criticalIssues,
        recommendations,
        timestamp: new Date()
      };

      // Сохраняем результаты
      const resultPath = path.join(this.testResultsDir, `${result.testId}.json`);
      await fs.writeFile(resultPath, JSON.stringify(result, null, 2));

      logger.info('Regression test completed', {
        testId: result.testId,
        status: overallStatus,
        regressionDetected
      });

      return result;
    } catch (error) {
      logger.error('Regression test failed', { templatePath, error });
      throw error;
    }
  }

  /**
   * Выполняет тестовые случаи
   */
  private async executeTestCases(
    testConfig: TemplateTestConfig,
    currentSnapshot: TemplateSnapshot,
    baselineSnapshot: TemplateSnapshot
  ): Promise<RegressionTestResult['testCases']> {
    const testCases: RegressionTestResult['testCases'] = [];

    for (const scenario of testConfig.testScenarios) {
      const startTime = Date.now();
      
      try {
        // Генерируем игру с текущим шаблоном
        const currentResult = await this.generateTestGame(scenario.gameConfig, currentSnapshot);
        
        // Генерируем игру с базовым шаблоном (если возможно)
        let baselineResult;
        try {
          baselineResult = await this.generateTestGame(scenario.gameConfig, baselineSnapshot);
        } catch (error) {
          logger.warn('Could not generate with baseline template', { error });
        }

        const executionTime = Date.now() - startTime;

        // Сравниваем результаты
        const comparison = baselineResult 
          ? this.compareGenerationResults(currentResult, baselineResult, scenario.expectedMetrics)
          : this.validateAgainstExpected(currentResult, scenario.expectedMetrics);

        testCases.push({
          id: `test_${scenario.name}_${Date.now()}`,
          name: scenario.name,
          status: comparison.status,
          message: comparison.message,
          executionTime,
          metrics: currentResult
        });

      } catch (error) {
        testCases.push({
          id: `test_${scenario.name}_${Date.now()}`,
          name: scenario.name,
          status: 'failed',
          message: `Test execution failed: ${error.message}`,
          executionTime: Date.now() - startTime,
          metrics: {
            generationTime: 0,
            assetCount: 0,
            codeQuality: 0,
            gameplayScore: 0,
            performanceScore: 0
          }
        });
      }
    }

    return testCases;
  }

  /**
   * Генерирует тестовую игру и собирает метрики
   */
  private async generateTestGame(gameConfig: any, snapshot: TemplateSnapshot) {
    const startTime = Date.now();
    
    // Загружаем шаблон
    const templateModule = await import(snapshot.templatePath);
    const templateFunction = templateModule.default || templateModule;

    // Генерируем игру
    const gameResult = await this.gameGeneration.generateGame({
      ...gameConfig,
      template: templateFunction
    });

    const generationTime = Date.now() - startTime;

    // Тестируем сгенерированную игру
    const testResults = await this.gameTesting.runTests({
      gameId: `test_${Date.now()}`,
      gameCode: gameResult.code,
      assets: gameResult.assets
    });

    return {
      generationTime,
      assetCount: gameResult.assets.length,
      codeQuality: testResults.codeQuality,
      gameplayScore: testResults.gameplayScore,
      performanceScore: testResults.performanceScore
    };
  }

  /**
   * Сравнивает результаты генерации
   */
  private compareGenerationResults(current: any, baseline: any, expected: any) {
    const issues: string[] = [];
    
    // Проверяем время генерации
    if (current.generationTime > baseline.generationTime * 1.5) {
      issues.push(`Generation time increased significantly: ${current.generationTime}ms vs ${baseline.generationTime}ms`);
    }

    // Проверяем качество кода
    if (current.codeQuality < baseline.codeQuality * 0.9) {
      issues.push(`Code quality decreased: ${current.codeQuality} vs ${baseline.codeQuality}`);
    }

    // Проверяем производительность
    if (current.performanceScore < baseline.performanceScore * 0.9) {
      issues.push(`Performance decreased: ${current.performanceScore} vs ${baseline.performanceScore}`);
    }

    // Проверяем количество ассетов
    if (current.assetCount < baseline.assetCount * 0.8) {
      issues.push(`Asset count significantly decreased: ${current.assetCount} vs ${baseline.assetCount}`);
    }

    return {
      status: issues.length === 0 ? 'passed' : (issues.length <= 2 ? 'warning' : 'failed'),
      message: issues.length === 0 ? 'All metrics within acceptable range' : issues.join('; ')
    };
  }

  /**
   * Валидирует результаты против ожидаемых значений
   */
  private validateAgainstExpected(current: any, expected: any) {
    const issues: string[] = [];

    if (expected.maxGenerationTime && current.generationTime > expected.maxGenerationTime) {
      issues.push(`Generation time exceeds limit: ${current.generationTime}ms > ${expected.maxGenerationTime}ms`);
    }

    if (expected.minCodeQuality && current.codeQuality < expected.minCodeQuality) {
      issues.push(`Code quality below minimum: ${current.codeQuality} < ${expected.minCodeQuality}`);
    }

    if (expected.minPerformanceScore && current.performanceScore < expected.minPerformanceScore) {
      issues.push(`Performance below minimum: ${current.performanceScore} < ${expected.minPerformanceScore}`);
    }

    if (expected.minAssetCount && current.assetCount < expected.minAssetCount) {
      issues.push(`Asset count below minimum: ${current.assetCount} < ${expected.minAssetCount}`);
    }

    return {
      status: issues.length === 0 ? 'passed' : 'failed',
      message: issues.length === 0 ? 'All metrics meet expectations' : issues.join('; ')
    };
  }

  /**
   * Анализирует результаты тестов
   */
  private analyzeTestResults(testCases: RegressionTestResult['testCases'], thresholds: any) {
    const failedTests = testCases.filter(test => test.status === 'failed');
    const warningTests = testCases.filter(test => test.status === 'warning');

    const overallStatus = failedTests.length > 0 ? 'failed' : 
      (warningTests.length > 0 ? 'warning' : 'passed');

    const regressionDetected = failedTests.length > 0 || warningTests.length > testCases.length * 0.3;

    const criticalIssues = failedTests.map(test => test.message);
    
    const recommendations: string[] = [];
    if (failedTests.length > 0) {
      recommendations.push('Review failed test cases and fix critical issues before deployment');
    }
    if (warningTests.length > 0) {
      recommendations.push('Investigate warning cases to prevent potential issues');
    }
    if (regressionDetected) {
      recommendations.push('Consider reverting template changes or implementing fixes');
    }

    return { overallStatus, regressionDetected, criticalIssues, recommendations };
  }

  /**
   * Получает снапшот по ID
   */
  private async getSnapshot(snapshotId: string): Promise<TemplateSnapshot | null> {
    try {
      const snapshotPath = path.join(this.snapshotsDir, `${snapshotId}.json`);
      const content = await fs.readFile(snapshotPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      return null;
    }
  }

  /**
   * Получает последний снапшот для шаблона
   */
  private async getLatestSnapshot(templatePath: string, excludeId?: string): Promise<TemplateSnapshot | null> {
    try {
      const files = await fs.readdir(this.snapshotsDir);
      const snapshots: TemplateSnapshot[] = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          const snapshotPath = path.join(this.snapshotsDir, file);
          const content = await fs.readFile(snapshotPath, 'utf-8');
          const snapshot = JSON.parse(content);
          
          if (snapshot.templatePath === templatePath && snapshot.id !== excludeId) {
            snapshots.push(snapshot);
          }
        }
      }

      return snapshots.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )[0] || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Извлекает метаданные из шаблона
   */
  private async extractTemplateMetadata(templatePath: string, content: string) {
    // Простое извлечение метаданных из комментариев и кода
    const lines = content.split('\n');
    const metadata: any = {
      dependencies: [],
      features: []
    };

    for (const line of lines) {
      // Поиск типа игры
      if (line.includes('gameType') || line.includes('type:')) {
        const match = line.match(/['"`](\w+)['"`]/);
        if (match) metadata.gameType = match[1];
      }

      // Поиск импортов
      if (line.includes('import') && line.includes('from')) {
        const match = line.match(/from\s+['"`]([^'"`]+)['"`]/);
        if (match) metadata.dependencies.push(match[1]);
      }

      // Поиск функций (features)
      if (line.includes('function') || line.includes('=>')) {
        const match = line.match(/(?:function\s+|const\s+)(\w+)/);
        if (match) metadata.features.push(match[1]);
      }
    }

    return metadata;
  }

  /**
   * Получает версию шаблона из git или метаданных
   */
  private async getTemplateVersion(templatePath: string): Promise<string> {
    try {
      // Здесь можно интегрироваться с git для получения версии
      // Пока возвращаем timestamp как версию
      return Date.now().toString();
    } catch (error) {
      return '1.0.0';
    }
  }

  /**
   * Получает все результаты регрессионных тестов
   */
  async getTestResults(limit: number = 50): Promise<RegressionTestResult[]> {
    try {
      const files = await fs.readdir(this.testResultsDir);
      const results: RegressionTestResult[] = [];

      for (const file of files.slice(0, limit)) {
        if (file.endsWith('.json')) {
          const resultPath = path.join(this.testResultsDir, file);
          const content = await fs.readFile(resultPath, 'utf-8');
          results.push(JSON.parse(content));
        }
      }

      return results.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    } catch (error) {
      logger.error('Failed to get test results', { error });
      return [];
    }
  }

  /**
   * Удаляет старые снапшоты и результаты тестов
   */
  async cleanupOldData(maxAge: number = 30 * 24 * 60 * 60 * 1000): Promise<void> {
    const cutoffDate = new Date(Date.now() - maxAge);

    try {
      // Очистка снапшотов
      const snapshotFiles = await fs.readdir(this.snapshotsDir);
      for (const file of snapshotFiles) {
        const filePath = path.join(this.snapshotsDir, file);
        const stats = await fs.stat(filePath);
        if (stats.mtime < cutoffDate) {
          await fs.unlink(filePath);
        }
      }

      // Очистка результатов тестов
      const resultFiles = await fs.readdir(this.testResultsDir);
      for (const file of resultFiles) {
        const filePath = path.join(this.testResultsDir, file);
        const stats = await fs.stat(filePath);
        if (stats.mtime < cutoffDate) {
          await fs.unlink(filePath);
        }
      }

      logger.info('Cleanup completed', { cutoffDate });
    } catch (error) {
      logger.error('Cleanup failed', { error });
    }
  }
} 
import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from './logger';
import { analyticsService } from './analytics';

const execAsync = promisify(exec);

export interface TestSuite {
  id: string;
  name: string;
  description: string;
  category: 'functional' | 'performance' | 'compatibility' | 'security' | 'accessibility' | 'usability';
  severity: 'critical' | 'major' | 'minor' | 'info';
  automated: boolean;
  estimatedDuration: number; // seconds
  prerequisites: string[];
  tests: TestCase[];
  configuration: {
    browser: string[];
    device: string[];
    resolution: string[];
    network: string[];
    locale: string[];
  };
}

export interface TestCase {
  id: string;
  name: string;
  description: string;
  type: 'unit' | 'integration' | 'e2e' | 'performance' | 'visual' | 'api';
  priority: 'critical' | 'high' | 'medium' | 'low';
  automated: boolean;
  timeout: number; // seconds
  
  // Test configuration
  setup?: {
    actions: TestAction[];
    data?: any;
    mocks?: any[];
  };
  
  // Test steps
  steps: TestStep[];
  
  // Expected results
  assertions: TestAssertion[];
  
  // Performance criteria
  performance?: {
    maxLoadTime: number;
    maxMemoryUsage: number;
    minFPS: number;
    maxCPUUsage: number;
  };
  
  // Accessibility criteria
  accessibility?: {
    checkContrast: boolean;
    checkAltText: boolean;
    checkKeyboardNavigation: boolean;
    checkScreenReader: boolean;
    wcagLevel: 'A' | 'AA' | 'AAA';
  };
}

export interface TestStep {
  id: string;
  name: string;
  action: TestAction;
  expectedResult?: string;
  timeout?: number;
  screenshot?: boolean;
  critical: boolean;
}

export interface TestAction {
  type: 'click' | 'type' | 'wait' | 'scroll' | 'hover' | 'keypress' | 'api_call' | 'custom';
  target?: string; // CSS selector or element ID
  value?: any;
  parameters?: Record<string, any>;
  customCode?: string; // JavaScript code to execute
}

export interface TestAssertion {
  type: 'element_exists' | 'element_visible' | 'text_contains' | 'value_equals' | 'count_equals' | 'performance' | 'api_response';
  target?: string;
  expected: any;
  tolerance?: number; // for performance tests
  message?: string;
}

export interface TestExecution {
  id: string;
  testSuiteId: string;
  gameId: string;
  gameVersion: string;
  
  // Execution info
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  
  // Configuration
  environment: {
    browser: string;
    browserVersion: string;
    device: string;
    resolution: string;
    os: string;
    network: string;
    locale: string;
  };
  
  // Results
  results: TestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    errors: number;
    successRate: number;
  };
  
  // Performance metrics
  performance: {
    loadTime: number;
    firstContentfulPaint: number;
    largestContentfulPaint: number;
    cumulativeLayoutShift: number;
    firstInputDelay: number;
    memoryUsage: number;
    cpuUsage: number;
    fps: number;
  };
  
  // Reports
  screenshots: string[];
  videoRecording?: string;
  reportPath?: string;
  logs: string[];
  
  // Issues found
  issues: TestIssue[];
  
  // Metadata
  metadata: {
    triggeredBy: string;
    trigger: 'manual' | 'scheduled' | 'ci_cd' | 'deployment' | 'api';
    tags: string[];
    notes?: string;
  };
}

export interface TestResult {
  testCaseId: string;
  status: 'passed' | 'failed' | 'skipped' | 'error';
  startTime: Date;
  endTime: Date;
  duration: number;
  
  // Step results
  stepResults: Array<{
    stepId: string;
    status: 'passed' | 'failed' | 'skipped';
    duration: number;
    screenshot?: string;
    error?: string;
    actualResult?: any;
  }>;
  
  // Assertion results
  assertionResults: Array<{
    assertion: TestAssertion;
    status: 'passed' | 'failed';
    actualValue?: any;
    error?: string;
  }>;
  
  // Performance data
  performanceMetrics?: {
    loadTime: number;
    memoryUsage: number;
    cpuUsage: number;
    fps: number;
  };
  
  // Error details
  error?: {
    message: string;
    stack: string;
    screenshot?: string;
  };
}

export interface TestIssue {
  id: string;
  type: 'functional' | 'performance' | 'compatibility' | 'accessibility' | 'security' | 'usability';
  severity: 'critical' | 'major' | 'minor' | 'info';
  title: string;
  description: string;
  
  // Location info
  testCaseId: string;
  stepId?: string;
  element?: string;
  screenshot?: string;
  
  // Technical details
  browser?: string;
  device?: string;
  resolution?: string;
  reproduction: string[];
  expectedBehavior: string;
  actualBehavior: string;
  
  // Impact assessment
  impact: {
    userExperience: 'high' | 'medium' | 'low';
    businessImpact: 'high' | 'medium' | 'low';
    frequency: 'always' | 'often' | 'sometimes' | 'rarely';
  };
  
  // Status tracking
  status: 'open' | 'in_progress' | 'resolved' | 'deferred' | 'duplicate';
  assignee?: string;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  
  // Links and references
  relatedIssues: string[];
  gameVersion: string;
  testExecutionId: string;
}

export interface TestingConfig {
  // Execution settings
  parallel: {
    enabled: boolean;
    maxConcurrency: number;
    timeout: number;
  };
  
  // Browser settings
  browsers: Array<{
    name: string;
    version: string;
    headless: boolean;
    device?: string;
    resolution?: string;
  }>;
  
  // Recording settings
  recording: {
    screenshots: boolean;
    video: boolean;
    screenshotOnFailure: boolean;
    quality: 'low' | 'medium' | 'high';
  };
  
  // Performance settings
  performance: {
    enabled: boolean;
    metricsToCollect: string[];
    budgets: {
      loadTime: number;
      memoryUsage: number;
      cpuUsage: number;
      fps: number;
    };
  };
  
  // Accessibility settings
  accessibility: {
    enabled: boolean;
    standards: string[];
    tools: string[];
    reportFormat: 'json' | 'html' | 'xml';
  };
  
  // Reporting settings
  reporting: {
    formats: string[];
    includeLogs: boolean;
    includeScreenshots: boolean;
    includeVideo: boolean;
    webhooks: string[];
  };
  
  // Retry settings
  retry: {
    enabled: boolean;
    maxAttempts: number;
    retryDelay: number;
    retryOnFailure: boolean;
  };
}

class GameTestingService extends EventEmitter {
  private testSuites: Map<string, TestSuite> = new Map();
  private executions: Map<string, TestExecution> = new Map();
  private runningTests: Set<string> = new Set();
  private config: TestingConfig;

  constructor() {
    super();
    this.config = this.getDefaultConfig();
    this.initializeDefaultTestSuites();
  }

  // Создание тестового набора
  public async createTestSuite(testSuiteData: Partial<TestSuite>): Promise<TestSuite> {
    try {
      const testSuite: TestSuite = {
        id: this.generateTestSuiteId(),
        name: testSuiteData.name || 'New Test Suite',
        description: testSuiteData.description || '',
        category: testSuiteData.category || 'functional',
        severity: testSuiteData.severity || 'major',
        automated: testSuiteData.automated ?? true,
        estimatedDuration: testSuiteData.estimatedDuration || 300,
        prerequisites: testSuiteData.prerequisites || [],
        tests: testSuiteData.tests || [],
        configuration: {
          browser: ['chrome', 'firefox'],
          device: ['desktop', 'mobile'],
          resolution: ['1920x1080', '375x667'],
          network: ['fast3g', 'regular3g'],
          locale: ['ru-RU', 'en-US'],
          ...testSuiteData.configuration
        }
      };

      this.testSuites.set(testSuite.id, testSuite);

      // Аналитика
      analyticsService.trackEvent('test_suite_created', {
        testSuiteId: testSuite.id,
        category: testSuite.category,
        testsCount: testSuite.tests.length,
        automated: testSuite.automated
      });

      this.emit('testSuiteCreated', testSuite);
      logger.info(`Test suite created: ${testSuite.id}`);

      return testSuite;
    } catch (error) {
      logger.error('Error creating test suite:', error);
      throw error;
    }
  }

  // Запуск тестирования
  public async runTests(
    gameId: string,
    testSuiteIds: string[],
    options?: {
      environment?: Partial<TestExecution['environment']>;
      triggeredBy?: string;
      trigger?: TestExecution['metadata']['trigger'];
      tags?: string[];
      notes?: string;
    }
  ): Promise<TestExecution> {
    try {
      if (this.runningTests.has(gameId)) {
        throw new Error('Tests are already running for this game');
      }

      const execution: TestExecution = {
        id: this.generateExecutionId(),
        testSuiteId: testSuiteIds[0], // For simplicity, using first suite
        gameId,
        gameVersion: '1.0.0', // TODO: get from game metadata
        
        status: 'pending',
        startTime: new Date(),
        
        environment: {
          browser: 'chrome',
          browserVersion: '118.0',
          device: 'desktop',
          resolution: '1920x1080',
          os: 'linux',
          network: 'fast3g',
          locale: 'ru-RU',
          ...options?.environment
        },
        
        results: [],
        summary: {
          total: 0,
          passed: 0,
          failed: 0,
          skipped: 0,
          errors: 0,
          successRate: 0
        },
        
        performance: {
          loadTime: 0,
          firstContentfulPaint: 0,
          largestContentfulPaint: 0,
          cumulativeLayoutShift: 0,
          firstInputDelay: 0,
          memoryUsage: 0,
          cpuUsage: 0,
          fps: 0
        },
        
        screenshots: [],
        logs: [],
        issues: [],
        
        metadata: {
          triggeredBy: options?.triggeredBy || 'unknown',
          trigger: options?.trigger || 'manual',
          tags: options?.tags || [],
          notes: options?.notes
        }
      };

      this.executions.set(execution.id, execution);
      this.runningTests.add(gameId);

      // Запуск тестирования в фоне
      this.executeTests(execution, testSuiteIds).catch(error => {
        logger.error('Error in test execution:', error);
        execution.status = 'failed';
        this.runningTests.delete(gameId);
      });

      // Аналитика
      analyticsService.trackEvent('test_execution_started', {
        executionId: execution.id,
        gameId,
        testSuitesCount: testSuiteIds.length,
        trigger: execution.metadata.trigger
      });

      this.emit('testExecutionStarted', execution);
      logger.info(`Test execution started: ${execution.id} for game: ${gameId}`);

      return execution;
    } catch (error) {
      logger.error('Error starting tests:', error);
      throw error;
    }
  }

  // Получение результатов тестирования
  public getTestExecution(executionId: string): TestExecution | null {
    return this.executions.get(executionId) || null;
  }

  // Получение всех выполнений для игры
  public getGameTestExecutions(gameId: string): TestExecution[] {
    return Array.from(this.executions.values())
      .filter(execution => execution.gameId === gameId)
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  }

  // Получение тестовых наборов
  public getTestSuites(category?: TestSuite['category']): TestSuite[] {
    let suites = Array.from(this.testSuites.values());
    
    if (category) {
      suites = suites.filter(suite => suite.category === category);
    }
    
    return suites.sort((a, b) => a.name.localeCompare(b.name));
  }

  // Анализ качества игры
  public async analyzeGameQuality(gameId: string): Promise<{
    overallScore: number;
    categories: Record<string, { score: number; issues: number; lastTested: Date | null }>;
    recommendations: Array<{ priority: string; action: string; description: string }>;
    trend: 'improving' | 'stable' | 'declining';
  }> {
    try {
      const executions = this.getGameTestExecutions(gameId);
      
      if (executions.length === 0) {
        return {
          overallScore: 0,
          categories: {},
          recommendations: [{
            priority: 'high',
            action: 'run_initial_tests',
            description: 'Запустите первоначальное тестирование для оценки качества игры'
          }],
          trend: 'stable'
        };
      }

      const latestExecution = executions[0];
      const categories: Record<string, { score: number; issues: number; lastTested: Date | null }> = {};
      
      // Анализ по категориям
      for (const testSuite of this.testSuites.values()) {
        const categoryExecutions = executions.filter(e => 
          this.testSuites.get(e.testSuiteId)?.category === testSuite.category
        );
        
        if (categoryExecutions.length > 0) {
          const latestCategoryExecution = categoryExecutions[0];
          const score = latestCategoryExecution.summary.successRate;
          const issues = latestCategoryExecution.issues.filter(i => i.type === testSuite.category).length;
          
          categories[testSuite.category] = {
            score,
            issues,
            lastTested: latestCategoryExecution.endTime || null
          };
        }
      }

      // Общий счет
      const overallScore = Object.values(categories).reduce((sum, cat) => sum + cat.score, 0) / Object.keys(categories).length;

      // Рекомендации
      const recommendations = this.generateRecommendations(latestExecution);

      // Тренд
      const trend = this.calculateQualityTrend(executions);

      return {
        overallScore: Math.round(overallScore),
        categories,
        recommendations,
        trend
      };
    } catch (error) {
      logger.error('Error analyzing game quality:', error);
      throw error;
    }
  }

  // Генерация отчета
  public async generateReport(
    executionId: string,
    format: 'html' | 'json' | 'pdf' = 'html'
  ): Promise<string> {
    try {
      const execution = this.executions.get(executionId);
      if (!execution) {
        throw new Error('Test execution not found');
      }

      const reportData = {
        execution,
        testSuite: this.testSuites.get(execution.testSuiteId),
        timestamp: new Date().toISOString(),
        summary: this.generateExecutionSummary(execution)
      };

      const reportPath = join(process.cwd(), 'reports', `test_report_${executionId}.${format}`);
      
      switch (format) {
        case 'json':
          await fs.writeFile(reportPath, JSON.stringify(reportData, null, 2));
          break;
        case 'html':
          const htmlReport = this.generateHtmlReport(reportData);
          await fs.writeFile(reportPath, htmlReport);
          break;
        case 'pdf':
          // В реальной реализации здесь была бы генерация PDF
          throw new Error('PDF report generation not implemented yet');
      }

      logger.info(`Test report generated: ${reportPath}`);
      return reportPath;
    } catch (error) {
      logger.error('Error generating report:', error);
      throw error;
    }
  }

  // Приватные методы

  private async executeTests(execution: TestExecution, testSuiteIds: string[]): Promise<void> {
    try {
      execution.status = 'running';
      
      const allTests: TestCase[] = [];
      
      // Собираем все тесты из выбранных наборов
      for (const testSuiteId of testSuiteIds) {
        const testSuite = this.testSuites.get(testSuiteId);
        if (testSuite) {
          allTests.push(...testSuite.tests);
        }
      }

      execution.summary.total = allTests.length;

      // Выполняем тесты
      for (const testCase of allTests) {
        try {
          const result = await this.executeTestCase(testCase, execution);
          execution.results.push(result);
          
          // Обновляем статистику
          switch (result.status) {
            case 'passed':
              execution.summary.passed++;
              break;
            case 'failed':
              execution.summary.failed++;
              break;
            case 'skipped':
              execution.summary.skipped++;
              break;
            case 'error':
              execution.summary.errors++;
              break;
          }

          // Создаем issue для неудачных тестов
          if (result.status === 'failed' && result.error) {
            const issue = this.createIssueFromFailedTest(testCase, result, execution);
            execution.issues.push(issue);
          }

          this.emit('testCaseCompleted', { execution, testCase, result });
        } catch (error) {
          logger.error(`Error executing test case ${testCase.id}:`, error);
          execution.summary.errors++;
        }
      }

      // Завершение
      execution.endTime = new Date();
      execution.duration = execution.endTime.getTime() - execution.startTime.getTime();
      execution.summary.successRate = (execution.summary.passed / execution.summary.total) * 100;
      execution.status = 'completed';

      this.runningTests.delete(execution.gameId);

      // Аналитика
      analyticsService.trackEvent('test_execution_completed', {
        executionId: execution.id,
        gameId: execution.gameId,
        duration: execution.duration,
        successRate: execution.summary.successRate,
        issuesFound: execution.issues.length
      });

      this.emit('testExecutionCompleted', execution);
      logger.info(`Test execution completed: ${execution.id}`);

    } catch (error) {
      execution.status = 'failed';
      execution.endTime = new Date();
      this.runningTests.delete(execution.gameId);
      
      logger.error('Error executing tests:', error);
      throw error;
    }
  }

  private async executeTestCase(testCase: TestCase, execution: TestExecution): Promise<TestResult> {
    const startTime = new Date();
    
    try {
      // Имитация выполнения теста
      await this.simulateTestExecution(testCase, execution);
      
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();
      
      // Случайный результат для демонстрации
      const success = Math.random() > 0.2; // 80% успешности
      
      const result: TestResult = {
        testCaseId: testCase.id,
        status: success ? 'passed' : 'failed',
        startTime,
        endTime,
        duration,
        stepResults: [],
        assertionResults: [],
        performanceMetrics: testCase.performance ? {
          loadTime: Math.random() * 3000,
          memoryUsage: Math.random() * 100,
          cpuUsage: Math.random() * 50,
          fps: 45 + Math.random() * 15
        } : undefined,
        error: success ? undefined : {
          message: 'Test assertion failed',
          stack: 'Mock stack trace for demonstration'
        }
      };

      return result;
    } catch (error) {
      const endTime = new Date();
      
      return {
        testCaseId: testCase.id,
        status: 'error',
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        stepResults: [],
        assertionResults: [],
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack || '' : ''
        }
      };
    }
  }

  private async simulateTestExecution(testCase: TestCase, execution: TestExecution): Promise<void> {
    // Имитация времени выполнения теста
    const delay = Math.random() * 2000 + 500; // 0.5-2.5 секунд
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  private createIssueFromFailedTest(
    testCase: TestCase,
    result: TestResult,
    execution: TestExecution
  ): TestIssue {
    return {
      id: this.generateIssueId(),
      type: 'functional',
      severity: testCase.priority === 'critical' ? 'critical' : 'major',
      title: `Test "${testCase.name}" failed`,
      description: result.error?.message || 'Test execution failed',
      
      testCaseId: testCase.id,
      
      browser: execution.environment.browser,
      device: execution.environment.device,
      resolution: execution.environment.resolution,
      
      reproduction: [`Execute test case: ${testCase.name}`],
      expectedBehavior: 'Test should pass successfully',
      actualBehavior: result.error?.message || 'Test failed',
      
      impact: {
        userExperience: testCase.priority === 'critical' ? 'high' : 'medium',
        businessImpact: testCase.priority === 'critical' ? 'high' : 'medium',
        frequency: 'always'
      },
      
      status: 'open',
      createdAt: new Date(),
      updatedAt: new Date(),
      
      relatedIssues: [],
      gameVersion: execution.gameVersion,
      testExecutionId: execution.id
    };
  }

  private generateRecommendations(execution: TestExecution): Array<{ priority: string; action: string; description: string }> {
    const recommendations = [];

    if (execution.summary.successRate < 70) {
      recommendations.push({
        priority: 'high',
        action: 'fix_critical_issues',
        description: 'Устраните критические ошибки, влияющие на функциональность игры'
      });
    }

    if (execution.performance.loadTime > 3000) {
      recommendations.push({
        priority: 'medium',
        action: 'optimize_performance',
        description: 'Оптимизируйте время загрузки игры'
      });
    }

    if (execution.issues.filter(i => i.type === 'accessibility').length > 0) {
      recommendations.push({
        priority: 'medium',
        action: 'improve_accessibility',
        description: 'Улучшите доступность игры для пользователей с ограниченными возможностями'
      });
    }

    return recommendations;
  }

  private calculateQualityTrend(executions: TestExecution[]): 'improving' | 'stable' | 'declining' {
    if (executions.length < 2) return 'stable';

    const recent = executions.slice(0, 3);
    const older = executions.slice(3, 6);

    const recentAverage = recent.reduce((sum, e) => sum + e.summary.successRate, 0) / recent.length;
    const olderAverage = older.length > 0 ? older.reduce((sum, e) => sum + e.summary.successRate, 0) / older.length : recentAverage;

    const difference = recentAverage - olderAverage;

    if (difference > 5) return 'improving';
    if (difference < -5) return 'declining';
    return 'stable';
  }

  private generateExecutionSummary(execution: TestExecution) {
    return {
      gameId: execution.gameId,
      testSuite: execution.testSuiteId,
      status: execution.status,
      duration: execution.duration,
      environment: execution.environment,
      results: execution.summary,
      performance: execution.performance,
      issuesCount: execution.issues.length,
      criticalIssues: execution.issues.filter(i => i.severity === 'critical').length,
      majorIssues: execution.issues.filter(i => i.severity === 'major').length
    };
  }

  private generateHtmlReport(reportData: any): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Test Report - ${reportData.execution.id}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px; }
        .metric { background: white; padding: 15px; border: 1px solid #dee2e6; border-radius: 8px; }
        .metric-value { font-size: 24px; font-weight: bold; color: #007bff; }
        .metric-label { color: #6c757d; font-size: 14px; }
        .issues { margin-top: 20px; }
        .issue { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; margin-bottom: 10px; border-radius: 8px; }
        .issue.critical { background: #f8d7da; border-color: #f5c6cb; }
        .issue.major { background: #fff3cd; border-color: #ffeaa7; }
        .performance { margin-top: 20px; }
        .perf-metric { display: inline-block; margin-right: 20px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Test Report</h1>
        <p><strong>Game ID:</strong> ${reportData.execution.gameId}</p>
        <p><strong>Execution ID:</strong> ${reportData.execution.id}</p>
        <p><strong>Date:</strong> ${reportData.execution.startTime}</p>
        <p><strong>Status:</strong> ${reportData.execution.status}</p>
    </div>

    <div class="summary">
        <div class="metric">
            <div class="metric-value">${reportData.execution.summary.successRate.toFixed(1)}%</div>
            <div class="metric-label">Success Rate</div>
        </div>
        <div class="metric">
            <div class="metric-value">${reportData.execution.summary.passed}</div>
            <div class="metric-label">Tests Passed</div>
        </div>
        <div class="metric">
            <div class="metric-value">${reportData.execution.summary.failed}</div>
            <div class="metric-label">Tests Failed</div>
        </div>
        <div class="metric">
            <div class="metric-value">${reportData.execution.issues.length}</div>
            <div class="metric-label">Issues Found</div>
        </div>
    </div>

    <div class="performance">
        <h2>Performance Metrics</h2>
        <div class="perf-metric"><strong>Load Time:</strong> ${reportData.execution.performance.loadTime}ms</div>
        <div class="perf-metric"><strong>Memory Usage:</strong> ${reportData.execution.performance.memoryUsage}MB</div>
        <div class="perf-metric"><strong>CPU Usage:</strong> ${reportData.execution.performance.cpuUsage}%</div>
        <div class="perf-metric"><strong>FPS:</strong> ${reportData.execution.performance.fps}</div>
    </div>

    <div class="issues">
        <h2>Issues Found</h2>
        ${reportData.execution.issues.map((issue: TestIssue) => `
            <div class="issue ${issue.severity}">
                <h3>${issue.title}</h3>
                <p><strong>Severity:</strong> ${issue.severity}</p>
                <p><strong>Type:</strong> ${issue.type}</p>
                <p><strong>Description:</strong> ${issue.description}</p>
                <p><strong>Expected:</strong> ${issue.expectedBehavior}</p>
                <p><strong>Actual:</strong> ${issue.actualBehavior}</p>
            </div>
        `).join('')}
    </div>
</body>
</html>
    `;
  }

  private initializeDefaultTestSuites(): void {
    // Функциональные тесты
    const functionalTests: TestSuite = {
      id: 'func_basic',
      name: 'Basic Functionality Tests',
      description: 'Тестирование основной функциональности игры',
      category: 'functional',
      severity: 'critical',
      automated: true,
      estimatedDuration: 600,
      prerequisites: [],
      configuration: {
        browser: ['chrome', 'firefox', 'safari'],
        device: ['desktop', 'mobile'],
        resolution: ['1920x1080', '375x667'],
        network: ['fast3g'],
        locale: ['ru-RU']
      },
      tests: [
        {
          id: 'func_001',
          name: 'Game Loads Successfully',
          description: 'Проверка успешной загрузки игры',
          type: 'e2e',
          priority: 'critical',
          automated: true,
          timeout: 30,
          steps: [
            {
              id: 'step_001',
              name: 'Navigate to game',
              action: { type: 'api_call', target: '/api/games/load' },
              critical: true
            },
            {
              id: 'step_002',
              name: 'Wait for game interface',
              action: { type: 'wait', value: 5000 },
              critical: true
            }
          ],
          assertions: [
            {
              type: 'element_exists',
              target: '#game-canvas',
              expected: true,
              message: 'Game canvas should be present'
            }
          ]
        }
      ]
    };

    // Тесты производительности
    const performanceTests: TestSuite = {
      id: 'perf_basic',
      name: 'Performance Tests',
      description: 'Тестирование производительности игры',
      category: 'performance',
      severity: 'major',
      automated: true,
      estimatedDuration: 300,
      prerequisites: [],
      configuration: {
        browser: ['chrome'],
        device: ['desktop'],
        resolution: ['1920x1080'],
        network: ['fast3g'],
        locale: ['ru-RU']
      },
      tests: [
        {
          id: 'perf_001',
          name: 'Load Time Performance',
          description: 'Проверка времени загрузки игры',
          type: 'performance',
          priority: 'high',
          automated: true,
          timeout: 60,
          performance: {
            maxLoadTime: 3000,
            maxMemoryUsage: 100,
            minFPS: 30,
            maxCPUUsage: 70
          },
          steps: [
            {
              id: 'perf_step_001',
              name: 'Measure load time',
              action: { type: 'custom', customCode: 'performance.measure("loadTime")' },
              critical: true
            }
          ],
          assertions: [
            {
              type: 'performance',
              expected: 3000,
              tolerance: 500,
              message: 'Game should load within 3 seconds'
            }
          ]
        }
      ]
    };

    this.testSuites.set(functionalTests.id, functionalTests);
    this.testSuites.set(performanceTests.id, performanceTests);
  }

  private getDefaultConfig(): TestingConfig {
    return {
      parallel: {
        enabled: true,
        maxConcurrency: 3,
        timeout: 300000
      },
      browsers: [
        { name: 'chrome', version: 'latest', headless: true },
        { name: 'firefox', version: 'latest', headless: true }
      ],
      recording: {
        screenshots: true,
        video: false,
        screenshotOnFailure: true,
        quality: 'medium'
      },
      performance: {
        enabled: true,
        metricsToCollect: ['loadTime', 'memoryUsage', 'cpuUsage', 'fps'],
        budgets: {
          loadTime: 3000,
          memoryUsage: 100,
          cpuUsage: 70,
          fps: 30
        }
      },
      accessibility: {
        enabled: true,
        standards: ['WCAG2.1'],
        tools: ['axe-core'],
        reportFormat: 'json'
      },
      reporting: {
        formats: ['html', 'json'],
        includeLogs: true,
        includeScreenshots: true,
        includeVideo: false,
        webhooks: []
      },
      retry: {
        enabled: true,
        maxAttempts: 3,
        retryDelay: 1000,
        retryOnFailure: true
      }
    };
  }

  private generateTestSuiteId(): string {
    return `testsuite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateExecutionId(): string {
    return `execution_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateIssueId(): string {
    return `issue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Получение статистики
  public getTestingStats(): {
    totalExecutions: number;
    averageSuccessRate: number;
    totalIssuesFound: number;
    averageExecutionTime: number;
    testsByCategory: Record<string, number>;
    executionsByTrigger: Record<string, number>;
  } {
    const executions = Array.from(this.executions.values());
    
    return {
      totalExecutions: executions.length,
      averageSuccessRate: executions.length > 0 
        ? executions.reduce((sum, e) => sum + e.summary.successRate, 0) / executions.length 
        : 0,
      totalIssuesFound: executions.reduce((sum, e) => sum + e.issues.length, 0),
      averageExecutionTime: executions.length > 0
        ? executions.reduce((sum, e) => sum + (e.duration || 0), 0) / executions.length
        : 0,
      testsByCategory: this.getTestsByCategory(),
      executionsByTrigger: this.getExecutionsByTrigger(executions)
    };
  }

  private getTestsByCategory(): Record<string, number> {
    const categories: Record<string, number> = {};
    
    for (const testSuite of this.testSuites.values()) {
      categories[testSuite.category] = (categories[testSuite.category] || 0) + testSuite.tests.length;
    }
    
    return categories;
  }

  private getExecutionsByTrigger(executions: TestExecution[]): Record<string, number> {
    const triggers: Record<string, number> = {};
    
    for (const execution of executions) {
      const trigger = execution.metadata.trigger;
      triggers[trigger] = (triggers[trigger] || 0) + 1;
    }
    
    return triggers;
  }
}

export const gameTestingService = new GameTestingService();
export { GameTestingService }; 
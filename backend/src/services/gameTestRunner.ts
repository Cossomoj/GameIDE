import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { LoggerService } from './logger';
import { GameGenerationPipeline } from './gameGeneration';
import { GameValidationService } from './gameValidation';
import { PerformanceService } from './performance';
import {
  TestSuite,
  TestCase,
  TestResult,
  TestReport,
  TestContext,
  SuiteResult,
  GameTestScenario,
  TestConfiguration,
  AutomatedTestRunner,
  TestMetrics,
  ValidationRule,
  PerformanceMetrics
} from '../types/testing';
import { GenerationRequest } from '../types';
import path from 'path';
import fs from 'fs/promises';

export class GameTestRunner extends EventEmitter implements AutomatedTestRunner {
  private logger: LoggerService;
  private generationPipeline: GameGenerationPipeline;
  private validationService: GameValidationService;
  private performanceService: PerformanceService;
  private config: TestConfiguration;
  private activeTests: Map<string, TestContext> = new Map();
  private testSuites: Map<string, TestSuite> = new Map();
  private testCases: Map<string, TestCase> = new Map();

  constructor(config?: Partial<TestConfiguration>) {
    super();
    this.logger = new LoggerService();
    this.generationPipeline = new GameGenerationPipeline();
    this.validationService = new GameValidationService();
    this.performanceService = new PerformanceService();
    
    this.config = this.mergeConfig(config);
    this.initializeDefaultTestSuites();
    
    this.logger.info('🧪 GameTestRunner инициализирован');
  }

  /**
   * Запуск полного набора тестов для игры
   */
  public async runFullGameTest(gameRequest: GenerationRequest): Promise<TestReport> {
    const testId = uuidv4();
    const startTime = new Date();
    
    this.logger.info(`🧪 Начало полного тестирования игры: ${gameRequest.id}`);
    
    try {
      // Создаем контекст тестирования
      const context = await this.createTestContext(testId, gameRequest);
      this.activeTests.set(testId, context);

      // Запускаем все тест-сьюты по приоритету
      const suiteResults = new Map<string, SuiteResult>();
      const prioritizedSuites = this.getPrioritizedSuites();

      for (const suite of prioritizedSuites) {
        try {
          this.logger.info(`🔍 Запуск тест-сьюта: ${suite.name}`);
          this.emit('suite:start', { testId, suite });

          const suiteResult = await this.runSuite(suite, context);
          suiteResults.set(suite.id, suiteResult);

          this.emit('suite:complete', { testId, suite, result: suiteResult });

          // Если критический тест провален, останавливаем остальные
          if (suite.priority === 'high' && suiteResult.status === 'failed') {
            this.logger.warn(`❌ Критический тест провален: ${suite.name}. Останавливаем тестирование.`);
            break;
          }
        } catch (error) {
          this.logger.error(`💥 Ошибка в тест-сьюте ${suite.name}:`, error);
          // Продолжаем с остальными тестами
        }
      }

      // Генерируем финальный отчет
      const report = await this.generateTestReport(testId, gameRequest.id, startTime, suiteResults, context);
      
      this.logger.info(`✅ Тестирование завершено. Статус: ${report.status}. Успешно: ${report.summary.successRate}%`);
      
      return report;

    } catch (error) {
      this.logger.error(`💥 Критическая ошибка тестирования:`, error);
      throw error;
    } finally {
      this.activeTests.delete(testId);
    }
  }

  /**
   * Запуск конкретного тест-сьюта
   */
  public async runSuite(suite: TestSuite, context: TestContext): Promise<SuiteResult> {
    const startTime = Date.now();
    const testResults: TestResult[] = [];
    
    try {
      // Получаем тест-кейсы для этого сьюта
      const suiteCases = Array.from(this.testCases.values())
        .filter(tc => tc.suiteId === suite.id);

      // Запускаем тесты (параллельно или последовательно)
      if (this.config.parallel && suiteCases.length > 1) {
        const promises = suiteCases.map(testCase => this.runTest(testCase, context));
        const results = await Promise.allSettled(promises);
        
        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            testResults.push(result.value);
          } else {
            testResults.push({
              testCaseId: suiteCases[index].id,
              status: 'error',
              duration: 0,
              message: result.reason?.message || 'Unknown error',
              errors: [{
                code: 'EXECUTION_ERROR',
                message: result.reason?.message || 'Test execution failed',
                severity: 'critical'
              }],
              warnings: []
            });
          }
        });
      } else {
        // Последовательное выполнение
        for (const testCase of suiteCases) {
          try {
            const result = await this.runTest(testCase, context);
            testResults.push(result);
          } catch (error) {
            testResults.push({
              testCaseId: testCase.id,
              status: 'error',
              duration: 0,
              message: error.message,
              errors: [{
                code: 'EXECUTION_ERROR',
                message: error.message,
                severity: 'critical'
              }],
              warnings: []
            });
          }
        }
      }

      // Вычисляем статус сьюта
      const passed = testResults.filter(r => r.status === 'passed').length;
      const failed = testResults.filter(r => r.status === 'failed').length;
      const errors = testResults.filter(r => r.status === 'error').length;
      
      let status: 'passed' | 'failed' | 'partial';
      if (errors > 0 || failed > passed) {
        status = 'failed';
      } else if (failed > 0) {
        status = 'partial';
      } else {
        status = 'passed';
      }

      return {
        suiteId: suite.id,
        status,
        duration: Date.now() - startTime,
        testResults,
        metrics: this.aggregateMetrics(testResults)
      };

    } catch (error) {
      this.logger.error(`Ошибка выполнения сьюта ${suite.id}:`, error);
      throw error;
    }
  }

  /**
   * Запуск отдельного теста
   */
  public async runTest(testCase: TestCase, context: TestContext): Promise<TestResult> {
    const startTime = Date.now();
    
    this.logger.debug(`🔬 Выполнение теста: ${testCase.name}`);
    
    try {
      // Применяем таймаут
      const testPromise = this.executeTestCase(testCase, context);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Test timeout')), testCase.timeout);
      });

      const result = await Promise.race([testPromise, timeoutPromise]);
      
      return {
        testCaseId: testCase.id,
        status: 'passed',
        duration: Date.now() - startTime,
        ...result
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      
      if (error.message === 'Test timeout') {
        return {
          testCaseId: testCase.id,
          status: 'timeout',
          duration,
          message: `Тест превысил таймаут ${testCase.timeout}ms`,
          errors: [{
            code: 'TIMEOUT',
            message: `Test timed out after ${testCase.timeout}ms`,
            severity: 'major'
          }],
          warnings: []
        };
      }

      return {
        testCaseId: testCase.id,
        status: 'failed',
        duration,
        message: error.message,
        errors: [{
          code: 'TEST_FAILED',
          message: error.message,
          stack: error.stack,
          severity: 'major'
        }],
        warnings: []
      };
    }
  }

  /**
   * Запуск игрового сценария
   */
  public async runScenario(scenario: GameTestScenario): Promise<TestReport> {
    const testId = uuidv4();
    const startTime = new Date();
    
    this.logger.info(`🎮 Запуск игрового сценария: ${scenario.name}`);
    
    try {
      // Создаем запрос на генерацию на основе сценария
      const generationRequest: GenerationRequest = {
        id: uuidv4(),
        prompt: scenario.gamePrompt,
        options: {
          quality: 'balanced',
          optimization: 'size',
          targetPlatform: 'yandex_games'
        },
        status: 'queued',
        createdAt: new Date(),
        updatedAt: new Date(),
        progress: 0,
        currentStep: 'Тестирование',
        logs: []
      };

      const context = await this.createTestContext(testId, generationRequest);
      
      // Выполняем шаги сценария
      const testResults: TestResult[] = [];
      
      for (const step of scenario.testSteps) {
        const stepResult = await this.executeTestStep(step, context, scenario);
        testResults.push(stepResult);
        
        // Если критический шаг провален
        if (stepResult.status === 'failed' && step.action === 'generate') {
          break;
        }
      }

      // Создаем отчет
      const suiteResults = new Map<string, SuiteResult>();
      suiteResults.set('scenario', {
        suiteId: 'scenario',
        status: testResults.some(r => r.status === 'failed') ? 'failed' : 'passed',
        duration: Date.now() - startTime.getTime(),
        testResults,
        metrics: this.aggregateMetrics(testResults)
      });

      return await this.generateTestReport(testId, generationRequest.id, startTime, suiteResults, context);

    } catch (error) {
      this.logger.error(`💥 Ошибка выполнения сценария:`, error);
      throw error;
    }
  }

  /**
   * Выполнение конкретного тест-кейса
   */
  private async executeTestCase(testCase: TestCase, context: TestContext): Promise<Partial<TestResult>> {
    switch (testCase.suiteId) {
      case 'compilation':
        return await this.runCompilationTest(testCase, context);
      case 'performance':
        return await this.runPerformanceTest(testCase, context);
      case 'mobile':
        return await this.runMobileCompatibilityTest(testCase, context);
      case 'yandex-sdk':
        return await this.runYandexSDKTest(testCase, context);
      case 'assets':
        return await this.runAssetsTest(testCase, context);
      case 'gameplay':
        return await this.runGameplayTest(testCase, context);
      default:
        throw new Error(`Неизвестный тип теста: ${testCase.suiteId}`);
    }
  }

  /**
   * Тест компиляции и сборки
   */
  private async runCompilationTest(testCase: TestCase, context: TestContext): Promise<Partial<TestResult>> {
    const metrics: TestMetrics = {};
    const errors = [];
    const warnings = [];

    try {
      const startTime = Date.now();
      
      // Проверяем, что все необходимые файлы созданы
      if (testCase.id === 'files_created') {
        const requiredFiles = ['index.html', 'game.js', 'style.css'];
        for (const file of requiredFiles) {
          if (!context.generatedFiles.has(file)) {
            errors.push({
              code: 'MISSING_FILE',
              message: `Отсутствует обязательный файл: ${file}`,
              severity: 'critical' as const
            });
          }
        }
      }

      // Проверяем синтаксис JavaScript
      if (testCase.id === 'js_syntax' && context.generatedFiles.has('game.js')) {
        const jsContent = context.generatedFiles.get('game.js');
        try {
          // Простая проверка синтаксиса
          new Function(jsContent);
        } catch (syntaxError) {
          errors.push({
            code: 'JS_SYNTAX_ERROR',
            message: `Синтаксическая ошибка в game.js: ${syntaxError.message}`,
            severity: 'critical' as const
          });
        }
      }

      // Проверяем валидность HTML
      if (testCase.id === 'html_valid' && context.generatedFiles.has('index.html')) {
        const htmlContent = context.generatedFiles.get('index.html');
        
        // Базовые проверки HTML
        if (!htmlContent.includes('<!DOCTYPE html>')) {
          warnings.push({
            code: 'MISSING_DOCTYPE',
            message: 'Отсутствует DOCTYPE декларация',
            impact: 'compatibility' as const
          });
        }
        
        if (!htmlContent.includes('<meta name="viewport"')) {
          warnings.push({
            code: 'MISSING_VIEWPORT',
            message: 'Отсутствует viewport meta tag',
            impact: 'usability' as const
          });
        }
      }

      metrics.compilationTime = Date.now() - startTime;

      return {
        errors,
        warnings,
        metrics,
        details: {
          filesChecked: context.generatedFiles.size,
          compilationTime: metrics.compilationTime
        }
      };

    } catch (error) {
      throw new Error(`Ошибка теста компиляции: ${error.message}`);
    }
  }

  /**
   * Тест производительности
   */
  private async runPerformanceTest(testCase: TestCase, context: TestContext): Promise<Partial<TestResult>> {
    const metrics: TestMetrics = {};
    const errors = [];
    const warnings = [];

    try {
      // Измеряем размер бандла
      if (testCase.id === 'bundle_size') {
        const totalSize = Array.from(context.generatedFiles.values())
          .reduce((size, content) => size + Buffer.byteLength(content, 'utf8'), 0);

        metrics.bundleSize = totalSize;

        const maxSize = 5 * 1024 * 1024; // 5MB
        if (totalSize > maxSize) {
          errors.push({
            code: 'BUNDLE_TOO_LARGE',
            message: `Размер игры (${this.formatBytes(totalSize)}) превышает лимит (${this.formatBytes(maxSize)})`,
            severity: 'major' as const
          });
        }
      }

      // Проверяем наличие оптимизаций
      if (testCase.id === 'code_optimization') {
        const jsContent = context.generatedFiles.get('game.js') || '';
        
        // Проверяем минификацию
        if (jsContent.includes('  ') || jsContent.includes('\n\n')) {
          warnings.push({
            code: 'NOT_MINIFIED',
            message: 'JavaScript код не минифицирован',
            impact: 'performance' as const,
            suggestion: 'Включите минификацию для уменьшения размера'
          });
        }

        // Проверяем наличие console.log в продакшене
        if (jsContent.includes('console.log')) {
          warnings.push({
            code: 'DEBUG_CODE',
            message: 'Обнаружены отладочные console.log',
            impact: 'performance' as const,
            suggestion: 'Удалите отладочный код из продакшн версии'
          });
        }
      }

      return {
        errors,
        warnings,
        metrics,
        details: {
          bundleSize: metrics.bundleSize,
          optimizationChecks: ['minification', 'debug_removal']
        }
      };

    } catch (error) {
      throw new Error(`Ошибка теста производительности: ${error.message}`);
    }
  }

  /**
   * Тест мобильной совместимости
   */
  private async runMobileCompatibilityTest(testCase: TestCase, context: TestContext): Promise<Partial<TestResult>> {
    const errors = [];
    const warnings = [];

    try {
      const htmlContent = context.generatedFiles.get('index.html') || '';
      const cssContent = context.generatedFiles.get('style.css') || '';

      // Проверяем viewport meta tag
      if (!htmlContent.includes('width=device-width')) {
        errors.push({
          code: 'NO_RESPONSIVE_VIEWPORT',
          message: 'Отсутствует responsive viewport meta tag',
          severity: 'major' as const
        });
      }

      // Проверяем touch-friendly элементы
      if (htmlContent.includes('onclick') && !htmlContent.includes('ontouchstart')) {
        warnings.push({
          code: 'NO_TOUCH_SUPPORT',
          message: 'Отсутствует поддержка touch событий',
          impact: 'usability' as const,
          suggestion: 'Добавьте поддержку touch для мобильных устройств'
        });
      }

      // Проверяем CSS media queries
      if (!cssContent.includes('@media')) {
        warnings.push({
          code: 'NO_MEDIA_QUERIES',
          message: 'Отсутствуют CSS media queries для адаптивности',
          impact: 'usability' as const
        });
      }

      return {
        errors,
        warnings,
        details: {
          viewportChecked: true,
          touchSupport: htmlContent.includes('ontouchstart'),
          mediaQueries: cssContent.includes('@media')
        }
      };

    } catch (error) {
      throw new Error(`Ошибка теста мобильной совместимости: ${error.message}`);
    }
  }

  /**
   * Тест интеграции Yandex SDK
   */
  private async runYandexSDKTest(testCase: TestCase, context: TestContext): Promise<Partial<TestResult>> {
    const errors = [];
    const warnings = [];

    try {
      const htmlContent = context.generatedFiles.get('index.html') || '';
      const jsContent = context.generatedFiles.get('game.js') || '';

      // Проверяем подключение SDK
      if (!htmlContent.includes('yandex.ru/games/sdk') && !jsContent.includes('YaGames')) {
        errors.push({
          code: 'NO_YANDEX_SDK',
          message: 'Не найдена интеграция с Yandex Games SDK',
          severity: 'critical' as const
        });
      }

      // Проверяем инициализацию
      if (!jsContent.includes('YaGames.init')) {
        warnings.push({
          code: 'NO_SDK_INIT',
          message: 'Не найдена инициализация Yandex Games SDK',
          impact: 'usability' as const
        });
      }

      // Проверяем основные функции
      const requiredFeatures = ['getPlayer', 'getLeaderboards'];
      const missingFeatures = requiredFeatures.filter(feature => !jsContent.includes(feature));
      
      if (missingFeatures.length > 0) {
        warnings.push({
          code: 'MISSING_SDK_FEATURES',
          message: `Отсутствуют функции SDK: ${missingFeatures.join(', ')}`,
          impact: 'usability' as const
        });
      }

      return {
        errors,
        warnings,
        details: {
          sdkIncluded: htmlContent.includes('yandex.ru/games/sdk') || jsContent.includes('YaGames'),
          sdkInitialized: jsContent.includes('YaGames.init'),
          featuresImplemented: requiredFeatures.length - missingFeatures.length
        }
      };

    } catch (error) {
      throw new Error(`Ошибка теста Yandex SDK: ${error.message}`);
    }
  }

  /**
   * Тест ассетов
   */
  private async runAssetsTest(testCase: TestCase, context: TestContext): Promise<Partial<TestResult>> {
    const errors = [];
    const warnings = [];
    const metrics: TestMetrics = {};

    try {
      const jsContent = context.generatedFiles.get('game.js') || '';
      
      // Подсчитываем количество ассетов
      const assetReferences = (jsContent.match(/\.(png|jpg|jpeg|gif|webp|svg|mp3|wav|ogg)/gi) || []).length;
      metrics.errorCount = assetReferences;

      // Проверяем наличие базовых ассетов
      if (assetReferences === 0) {
        warnings.push({
          code: 'NO_ASSETS',
          message: 'Не найдены ссылки на игровые ассеты',
          impact: 'usability' as const,
          suggestion: 'Добавьте графические и звуковые ассеты для улучшения игрового опыта'
        });
      }

      // Проверяем поддерживаемые форматы
      const unsupportedFormats = (jsContent.match(/\.(bmp|tiff|psd)/gi) || []);
      if (unsupportedFormats.length > 0) {
        warnings.push({
          code: 'UNSUPPORTED_FORMATS',
          message: `Обнаружены неподдерживаемые форматы: ${unsupportedFormats.join(', ')}`,
          impact: 'compatibility' as const
        });
      }

      return {
        errors,
        warnings,
        metrics,
        details: {
          assetReferences,
          supportedFormats: true
        }
      };

    } catch (error) {
      throw new Error(`Ошибка теста ассетов: ${error.message}`);
    }
  }

  /**
   * Тест игрового процесса
   */
  private async runGameplayTest(testCase: TestCase, context: TestContext): Promise<Partial<TestResult>> {
    const errors = [];
    const warnings = [];

    try {
      const jsContent = context.generatedFiles.get('game.js') || '';

      // Проверяем наличие игровых механик
      const gameplayElements = [
        { pattern: /update.*function|function.*update/i, name: 'Game Loop' },
        { pattern: /input|control|key|mouse/i, name: 'Input Handling' },
        { pattern: /score|point/i, name: 'Scoring System' },
        { pattern: /collision|intersect/i, name: 'Collision Detection' }
      ];

      const missingElements = [];
      for (const element of gameplayElements) {
        if (!element.pattern.test(jsContent)) {
          missingElements.push(element.name);
        }
      }

      if (missingElements.length > 0) {
        warnings.push({
          code: 'MISSING_GAMEPLAY_ELEMENTS',
          message: `Отсутствуют игровые элементы: ${missingElements.join(', ')}`,
          impact: 'usability' as const,
          suggestion: 'Добавьте основные игровые механики'
        });
      }

      // Проверяем наличие Phaser или другого игрового движка
      if (!jsContent.includes('Phaser') && !jsContent.includes('canvas') && !jsContent.includes('WebGL')) {
        warnings.push({
          code: 'NO_GAME_ENGINE',
          message: 'Не обнаружен игровой движок',
          impact: 'usability' as const
        });
      }

      return {
        errors,
        warnings,
        details: {
          gameplayElements: gameplayElements.length - missingElements.length,
          hasGameEngine: jsContent.includes('Phaser') || jsContent.includes('canvas')
        }
      };

    } catch (error) {
      throw new Error(`Ошибка теста геймплея: ${error.message}`);
    }
  }

  // ... (продолжение методов)

  /**
   * Создание контекста тестирования
   */
  private async createTestContext(testId: string, gameRequest: GenerationRequest): Promise<TestContext> {
    const startTime = Date.now();
    
    // Запускаем генерацию игры
    const onProgress = (step: string, progress: number, logs?: string[]) => {
      this.emit('generation:progress', { testId, step, progress, logs });
    };

    try {
      const buildResult = await this.generationPipeline.execute(gameRequest, onProgress);
      
      // Читаем сгенерированные файлы
      const generatedFiles = new Map<string, string>();
      const outputPath = buildResult.outputPath;
      
      try {
        const files = await fs.readdir(outputPath);
        for (const file of files) {
          const filePath = path.join(outputPath, file);
          const content = await fs.readFile(filePath, 'utf-8');
          generatedFiles.set(file, content);
        }
      } catch (error) {
        this.logger.warn(`Не удалось прочитать файлы из ${outputPath}:`, error);
      }

      return {
        gameId: gameRequest.id,
        gameData: gameRequest,
        generatedFiles,
        buildResult,
        startTime: new Date(startTime),
        environment: process.env.NODE_ENV as any || 'development'
      };

    } catch (error) {
      this.logger.error(`Ошибка создания контекста тестирования:`, error);
      
      // Создаем минимальный контекст даже при ошибке генерации
      return {
        gameId: gameRequest.id,
        gameData: gameRequest,
        generatedFiles: new Map(),
        startTime: new Date(startTime),
        environment: process.env.NODE_ENV as any || 'development'
      };
    }
  }

  /**
   * Инициализация стандартных тест-сьютов
   */
  private initializeDefaultTestSuites(): void {
    const testSuites: TestSuite[] = [
      {
        id: 'compilation',
        name: 'Компиляция и сборка',
        description: 'Проверка правильности генерации и компиляции кода',
        category: 'compilation',
        priority: 'high',
        timeout: 30000,
        retries: 1
      },
      {
        id: 'performance',
        name: 'Производительность',
        description: 'Проверка размера бандла и оптимизаций',
        category: 'performance',
        priority: 'high',
        timeout: 15000,
        retries: 1
      },
      {
        id: 'mobile',
        name: 'Мобильная совместимость',
        description: 'Проверка адаптивности и мобильных функций',
        category: 'mobile',
        priority: 'medium',
        timeout: 10000,
        retries: 1
      },
      {
        id: 'yandex-sdk',
        name: 'Интеграция Yandex SDK',
        description: 'Проверка корректной интеграции с Yandex Games',
        category: 'yandex-sdk',
        priority: 'high',
        timeout: 10000,
        retries: 1
      },
      {
        id: 'assets',
        name: 'Ассеты',
        description: 'Проверка игровых ресурсов и их оптимизации',
        category: 'assets',
        priority: 'medium',
        timeout: 20000,
        retries: 1
      },
      {
        id: 'gameplay',
        name: 'Игровой процесс',
        description: 'Проверка игровых механик и логики',
        category: 'gameplay',
        priority: 'low',
        timeout: 15000,
        retries: 1
      }
    ];

    testSuites.forEach(suite => {
      this.testSuites.set(suite.id, suite);
      this.createTestCasesForSuite(suite);
    });

    this.logger.info(`📝 Инициализировано ${testSuites.length} тест-сьютов`);
  }

  /**
   * Создание тест-кейсов для сьюта
   */
  private createTestCasesForSuite(suite: TestSuite): void {
    const testCasesBySuite: Record<string, TestCase[]> = {
      compilation: [
        {
          id: 'files_created',
          suiteId: 'compilation',
          name: 'Создание обязательных файлов',
          description: 'Проверка создания index.html, game.js, style.css',
          input: null,
          validationRules: [],
          timeout: 5000,
          async: false
        },
        {
          id: 'js_syntax',
          suiteId: 'compilation',
          name: 'Синтаксис JavaScript',
          description: 'Проверка корректности синтаксиса JavaScript кода',
          input: null,
          validationRules: [],
          timeout: 3000,
          async: false
        },
        {
          id: 'html_valid',
          suiteId: 'compilation',
          name: 'Валидность HTML',
          description: 'Проверка корректности HTML разметки',
          input: null,
          validationRules: [],
          timeout: 2000,
          async: false
        }
      ],
      performance: [
        {
          id: 'bundle_size',
          suiteId: 'performance',
          name: 'Размер бандла',
          description: 'Проверка соответствия размера игры лимитам',
          input: null,
          validationRules: [],
          timeout: 3000,
          async: false
        },
        {
          id: 'code_optimization',
          suiteId: 'performance',
          name: 'Оптимизация кода',
          description: 'Проверка минификации и оптимизаций',
          input: null,
          validationRules: [],
          timeout: 2000,
          async: false
        }
      ],
      mobile: [
        {
          id: 'responsive_design',
          suiteId: 'mobile',
          name: 'Адаптивный дизайн',
          description: 'Проверка viewport и адаптивности',
          input: null,
          validationRules: [],
          timeout: 2000,
          async: false
        },
        {
          id: 'touch_support',
          suiteId: 'mobile',
          name: 'Поддержка касаний',
          description: 'Проверка обработки touch событий',
          input: null,
          validationRules: [],
          timeout: 2000,
          async: false
        }
      ],
      'yandex-sdk': [
        {
          id: 'sdk_integration',
          suiteId: 'yandex-sdk',
          name: 'Интеграция SDK',
          description: 'Проверка подключения Yandex Games SDK',
          input: null,
          validationRules: [],
          timeout: 3000,
          async: false
        },
        {
          id: 'sdk_features',
          suiteId: 'yandex-sdk',
          name: 'Функции SDK',
          description: 'Проверка использования основных функций SDK',
          input: null,
          validationRules: [],
          timeout: 2000,
          async: false
        }
      ],
      assets: [
        {
          id: 'asset_presence',
          suiteId: 'assets',
          name: 'Наличие ассетов',
          description: 'Проверка наличия игровых ресурсов',
          input: null,
          validationRules: [],
          timeout: 3000,
          async: false
        },
        {
          id: 'asset_formats',
          suiteId: 'assets',
          name: 'Форматы ассетов',
          description: 'Проверка поддерживаемых форматов файлов',
          input: null,
          validationRules: [],
          timeout: 2000,
          async: false
        }
      ],
      gameplay: [
        {
          id: 'game_mechanics',
          suiteId: 'gameplay',
          name: 'Игровые механики',
          description: 'Проверка основных игровых элементов',
          input: null,
          validationRules: [],
          timeout: 5000,
          async: false
        },
        {
          id: 'game_engine',
          suiteId: 'gameplay',
          name: 'Игровой движок',
          description: 'Проверка использования игрового движка',
          input: null,
          validationRules: [],
          timeout: 2000,
          async: false
        }
      ]
    };

    const suiteCases = testCasesBySuite[suite.id] || [];
    suiteCases.forEach(testCase => {
      this.testCases.set(testCase.id, testCase);
    });
  }

  /**
   * Утилиты
   */
  private getPrioritizedSuites(): TestSuite[] {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return Array.from(this.testSuites.values())
      .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }

  private aggregateMetrics(testResults: TestResult[]): TestMetrics {
    const metrics: TestMetrics = {
      errorCount: 0,
      warningCount: 0,
      compilationTime: 0,
      bundleSize: 0
    };

    testResults.forEach(result => {
      if (result.metrics) {
        metrics.errorCount += result.errors.length;
        metrics.warningCount += result.warnings.length;
        metrics.compilationTime += result.metrics.compilationTime || 0;
        metrics.bundleSize = Math.max(metrics.bundleSize || 0, result.metrics.bundleSize || 0);
      }
    });

    return metrics;
  }

  private async generateTestReport(
    testId: string,
    gameId: string,
    startTime: Date,
    suiteResults: Map<string, SuiteResult>,
    context: TestContext
  ): Promise<TestReport> {
    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();

    // Агрегируем результаты
    let totalTests = 0;
    let passed = 0;
    let failed = 0;
    let errors = 0;
    let warnings = 0;

    for (const result of suiteResults.values()) {
      totalTests += result.testResults.length;
      passed += result.testResults.filter(r => r.status === 'passed').length;
      failed += result.testResults.filter(r => r.status === 'failed').length;
      errors += result.testResults.reduce((sum, r) => sum + r.errors.length, 0);
      warnings += result.testResults.reduce((sum, r) => sum + r.warnings.length, 0);
    }

    const successRate = totalTests > 0 ? Math.round((passed / totalTests) * 100) : 0;
    const criticalIssues = Array.from(suiteResults.values())
      .flatMap(r => r.testResults)
      .flatMap(r => r.errors)
      .filter(e => e.severity === 'critical').length;

    const status: 'passed' | 'failed' | 'partial' = 
      criticalIssues > 0 ? 'failed' : 
      failed > 0 ? 'partial' : 'passed';

    return {
      id: testId,
      gameId,
      startTime,
      endTime,
      duration,
      status,
      summary: {
        totalTests,
        passed,
        failed,
        skipped: 0,
        errors,
        warnings,
        successRate,
        criticalIssues
      },
      suiteResults,
      overallMetrics: this.aggregateMetrics(
        Array.from(suiteResults.values()).flatMap(r => r.testResults)
      ),
      recommendations: this.generateRecommendations(suiteResults),
      artifacts: []
    };
  }

  private generateRecommendations(suiteResults: Map<string, SuiteResult>): string[] {
    const recommendations: string[] = [];
    
    for (const result of suiteResults.values()) {
      for (const testResult of result.testResults) {
        testResult.warnings.forEach(warning => {
          if (warning.suggestion) {
            recommendations.push(warning.suggestion);
          }
        });
      }
    }

    return [...new Set(recommendations)]; // Удаляем дубликаты
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private mergeConfig(userConfig?: Partial<TestConfiguration>): TestConfiguration {
    return {
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
      reportFormats: ['json', 'html'],
      ...userConfig
    };
  }

  private async executeTestStep(
    step: any,
    context: TestContext,
    scenario: GameTestScenario
  ): Promise<TestResult> {
    // Заглушка для выполнения шагов сценария
    return {
      testCaseId: step.id,
      status: 'passed',
      duration: 100,
      errors: [],
      warnings: []
    };
  }
} 
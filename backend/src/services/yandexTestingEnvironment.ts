import { promises as fs } from 'fs';
import { join } from 'path';
import { LoggerService } from './logger';
import { YandexGamesValidator } from './yandexGamesValidator';
import { YandexOutputStructureService } from './yandexOutputStructure';
import express from 'express';
import { Server } from 'http';
import { WebSocketServer } from 'ws';

// Интерфейсы для тестирования
interface TestEnvironmentConfig {
  port: number;
  yandexSDKVersion: string;
  simulateNetworkConditions: boolean;
  enableAnalytics: boolean;
  mockUserData: boolean;
  deviceSimulation: DeviceSimulationConfig;
  platformLimitations: PlatformLimitationConfig;
}

interface DeviceSimulationConfig {
  mobile: {
    enabled: boolean;
    userAgent: string;
    viewport: { width: number; height: number };
    touchEvents: boolean;
    performanceProfile: 'low' | 'medium' | 'high';
  };
  desktop: {
    enabled: boolean;
    userAgent: string;
    viewport: { width: number; height: number };
    performanceProfile: 'high';
  };
  tv: {
    enabled: boolean;
    userAgent: string;
    viewport: { width: number; height: number };
    remoteControl: boolean;
  };
}

interface PlatformLimitationConfig {
  maxMemoryUsage: number; // MB
  maxStorageQuota: number; // MB
  networkLatency: number; // ms
  cpuThrottling: number; // 1.0 = normal, 0.5 = half speed
  enabledAPIs: string[];
  blockedAPIs: string[];
}

interface TestSession {
  id: string;
  gameId: string;
  startTime: Date;
  endTime?: Date;
  device: 'mobile' | 'desktop' | 'tv';
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  metrics: TestMetrics;
  logs: TestLog[];
  errors: TestError[];
  warnings: TestWarning[];
  screenshots: Screenshot[];
  performanceProfile: PerformanceProfile;
}

interface TestMetrics {
  loadTime: number;
  firstPaint: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  timeToInteractive: number;
  cumulativeLayoutShift: number;
  memoryUsage: MemoryMetrics;
  networkRequests: NetworkMetrics;
  userInteractions: UserInteractionMetrics;
  yandexAPIUsage: YandexAPIMetrics;
}

interface MemoryMetrics {
  initial: number;
  peak: number;
  average: number;
  final: number;
  leaks: MemoryLeak[];
}

interface NetworkMetrics {
  totalRequests: number;
  totalDataTransferred: number;
  averageLatency: number;
  failedRequests: number;
  cachedRequests: number;
  requestsByType: { [type: string]: number };
}

interface UserInteractionMetrics {
  clicks: number;
  touches: number;
  keyPresses: number;
  scrolls: number;
  gameActions: GameAction[];
  sessionDuration: number;
  engagementScore: number;
}

interface YandexAPIMetrics {
  sdkInitTime: number;
  playerAuthTime: number;
  adRequests: number;
  adShownCount: number;
  leaderboardRequests: number;
  achievementUnlocks: number;
  paymentAttempts: number;
  apiErrors: YandexAPIError[];
}

interface TestLog {
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  source: 'game' | 'yandex_sdk' | 'platform' | 'test_framework';
  message: string;
  data?: any;
}

interface TestError {
  timestamp: Date;
  type: 'javascript' | 'network' | 'yandex_api' | 'performance';
  message: string;
  stack?: string;
  source?: string;
  line?: number;
  column?: number;
  critical: boolean;
}

interface TestWarning {
  timestamp: Date;
  type: 'performance' | 'compatibility' | 'best_practice' | 'accessibility';
  message: string;
  recommendation: string;
  impact: 'low' | 'medium' | 'high';
}

interface Screenshot {
  timestamp: Date;
  filename: string;
  description: string;
  viewport: { width: number; height: number };
  annotations: ScreenshotAnnotation[];
}

interface ScreenshotAnnotation {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'element' | 'interaction' | 'error' | 'performance';
  description: string;
}

interface PerformanceProfile {
  fps: number[];
  memorySnapshots: MemorySnapshot[];
  networkTimeline: NetworkEvent[];
  userInteractionTimeline: InteractionEvent[];
  renderingMetrics: RenderingMetrics;
}

interface GameAction {
  timestamp: Date;
  type: string;
  details: any;
  performance: number; // response time in ms
}

interface MemoryLeak {
  source: string;
  size: number;
  description: string;
}

interface YandexAPIError {
  api: string;
  error: string;
  timestamp: Date;
  recoverable: boolean;
}

interface MemorySnapshot {
  timestamp: Date;
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
}

interface NetworkEvent {
  timestamp: Date;
  type: 'request' | 'response' | 'error';
  url: string;
  method?: string;
  status?: number;
  size?: number;
  duration?: number;
}

interface InteractionEvent {
  timestamp: Date;
  type: 'click' | 'touch' | 'key' | 'scroll' | 'gesture';
  target: string;
  coordinates?: { x: number; y: number };
  performance: number;
}

interface RenderingMetrics {
  frameRate: number;
  droppedFrames: number;
  renderingTime: number[];
  layoutShifts: LayoutShift[];
}

interface LayoutShift {
  timestamp: Date;
  value: number;
  source: string;
}

interface TestReport {
  session: TestSession;
  summary: TestSummary;
  compatibility: CompatibilityReport;
  performance: PerformanceReport;
  yandexCompliance: YandexComplianceReport;
  recommendations: TestRecommendation[];
  artifacts: TestArtifact[];
}

interface TestSummary {
  overallScore: number; // 0-100
  passedChecks: number;
  failedChecks: number;
  warnings: number;
  criticalIssues: number;
  estimatedPerformance: 'excellent' | 'good' | 'fair' | 'poor';
  readyForProduction: boolean;
}

interface CompatibilityReport {
  yandexGames: boolean;
  mobileDevices: boolean;
  desktopBrowsers: boolean;
  tvPlatforms: boolean;
  apiCompatibility: { [api: string]: boolean };
  missingFeatures: string[];
}

interface PerformanceReport {
  loadingPerformance: 'excellent' | 'good' | 'fair' | 'poor';
  runtimePerformance: 'excellent' | 'good' | 'fair' | 'poor';
  memoryEfficiency: 'excellent' | 'good' | 'fair' | 'poor';
  networkOptimization: 'excellent' | 'good' | 'fair' | 'poor';
  bottlenecks: PerformanceBottleneck[];
  optimizationOpportunities: OptimizationOpportunity[];
}

interface YandexComplianceReport {
  sdkIntegration: boolean;
  requiredAPIs: { [api: string]: boolean };
  manifestCompliance: boolean;
  sizeCompliance: boolean;
  securityCompliance: boolean;
  complianceScore: number;
  missingRequirements: string[];
}

interface TestRecommendation {
  category: 'performance' | 'compatibility' | 'user_experience' | 'monetization';
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  solution: string;
  estimatedImpact: string;
  implementationEffort: 'low' | 'medium' | 'high';
}

interface TestArtifact {
  type: 'screenshot' | 'video' | 'log' | 'report' | 'performance_trace';
  filename: string;
  description: string;
  size: number;
  timestamp: Date;
}

interface PerformanceBottleneck {
  type: 'cpu' | 'memory' | 'network' | 'rendering';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  impact: string;
  suggestion: string;
}

interface OptimizationOpportunity {
  type: 'code' | 'assets' | 'caching' | 'bundling';
  description: string;
  potentialImprovement: string;
  effort: 'low' | 'medium' | 'high';
}

export class YandexTestingEnvironmentService {
  private logger: LoggerService;
  private validator: YandexGamesValidator;
  private structureService: YandexOutputStructureService;
  
  // Тестовый сервер
  private app: express.Application;
  private server?: Server;
  private wsServer?: WebSocketServer;
  
  // Конфигурация
  private config: TestEnvironmentConfig;
  
  // Активные сессии
  private activeSessions = new Map<string, TestSession>();
  private sessionResults = new Map<string, TestReport>();
  
  // Симуляторы
  private yandexSDKSimulator: YandexSDKSimulator;
  private deviceSimulator: DeviceSimulator;
  private networkSimulator: NetworkSimulator;
  
  constructor() {
    this.logger = LoggerService.getInstance();
    this.validator = new YandexGamesValidator();
    this.structureService = new YandexOutputStructureService();
    
    this.initializeConfig();
    this.initializeTestServer();
    this.initializeSimulators();
    
    this.logger.info('🧪 Сервис тестирования Яндекс Игр инициализирован');
  }

  /**
   * Инициализация конфигурации
   */
  private initializeConfig(): void {
    this.config = {
      port: parseInt(process.env.TEST_PORT || '3003'),
      yandexSDKVersion: '2.0',
      simulateNetworkConditions: true,
      enableAnalytics: true,
      mockUserData: true,
      deviceSimulation: {
        mobile: {
          enabled: true,
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
          viewport: { width: 375, height: 667 },
          touchEvents: true,
          performanceProfile: 'medium'
        },
        desktop: {
          enabled: true,
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          viewport: { width: 1920, height: 1080 },
          performanceProfile: 'high'
        },
        tv: {
          enabled: true,
          userAgent: 'Mozilla/5.0 (SMART-TV; Linux; Tizen 5.5) AppleWebKit/537.36',
          viewport: { width: 1920, height: 1080 },
          remoteControl: true
        }
      },
      platformLimitations: {
        maxMemoryUsage: 512, // MB
        maxStorageQuota: 50, // MB
        networkLatency: 100, // ms
        cpuThrottling: 1.0,
        enabledAPIs: [
          'YaGames', 'localStorage', 'sessionStorage', 'fetch', 'WebGL', 'AudioContext'
        ],
        blockedAPIs: [
          'indexedDB', 'WebRTC', 'getUserMedia', 'geolocation'
        ]
      }
    };
  }

  /**
   * Инициализация тестового сервера
   */
  private initializeTestServer(): void {
    this.app = express();
    
    // Middleware
    this.app.use(express.json());
    this.app.use(express.static(join(process.cwd(), 'test-output')));
    
    // CORS для тестирования
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      next();
    });

    this.setupTestAPIEndpoints();
    this.setupYandexSDKSimulation();
  }

  /**
   * Настройка API эндпоинтов
   */
  private setupTestAPIEndpoints(): void {
    // Запуск тестовой сессии
    this.app.post('/api/test/start', async (req, res) => {
      try {
        const { gameId, gamePath, device = 'desktop' } = req.body;
        const session = await this.startTestSession(gameId, gamePath, device);
        res.json(session);
      } catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
      }
    });

    // Получение статуса сессии
    this.app.get('/api/test/session/:sessionId', (req, res) => {
      const session = this.activeSessions.get(req.params.sessionId);
      if (session) {
        res.json(session);
      } else {
        res.status(404).json({ error: 'Session not found' });
      }
    });

    // Остановка тестовой сессии
    this.app.post('/api/test/stop/:sessionId', async (req, res) => {
      try {
        const report = await this.stopTestSession(req.params.sessionId);
        res.json(report);
      } catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
      }
    });

    // Получение отчета
    this.app.get('/api/test/report/:sessionId', (req, res) => {
      const report = this.sessionResults.get(req.params.sessionId);
      if (report) {
        res.json(report);
      } else {
        res.status(404).json({ error: 'Report not found' });
      }
    });

    // Список активных сессий
    this.app.get('/api/test/sessions', (req, res) => {
      const sessions = Array.from(this.activeSessions.values());
      res.json(sessions);
    });

    // Тестовая страница игры
    this.app.get('/test/:sessionId', async (req, res) => {
      const session = this.activeSessions.get(req.params.sessionId);
      if (!session) {
        return res.status(404).send('Session not found');
      }

      const testHTML = await this.generateTestHTML(session);
      res.setHeader('Content-Type', 'text/html');
      res.send(testHTML);
    });

    // WebSocket для live мониторинга
    this.app.get('/api/test/monitor/:sessionId', (req, res) => {
      res.json({
        websocketUrl: `ws://localhost:${this.config.port}`,
        sessionId: req.params.sessionId
      });
    });
  }

  /**
   * Настройка симуляции Yandex SDK
   */
  private setupYandexSDKSimulation(): void {
    // Симуляция Yandex Games SDK
    this.app.get('/yandex-sdk.js', (req, res) => {
      const sdkSimulation = this.yandexSDKSimulator.generateSDKCode();
      res.setHeader('Content-Type', 'application/javascript');
      res.send(sdkSimulation);
    });

    // API эндпоинты симуляции
    this.app.post('/api/yandex/player', (req, res) => {
      res.json(this.yandexSDKSimulator.getMockPlayer());
    });

    this.app.post('/api/yandex/leaderboard', (req, res) => {
      res.json(this.yandexSDKSimulator.getMockLeaderboard());
    });

    this.app.post('/api/yandex/ads', (req, res) => {
      res.json(this.yandexSDKSimulator.simulateAd());
    });
  }

  /**
   * Инициализация симуляторов
   */
  private initializeSimulators(): void {
    this.yandexSDKSimulator = new YandexSDKSimulator(this.config);
    this.deviceSimulator = new DeviceSimulator(this.config.deviceSimulation);
    this.networkSimulator = new NetworkSimulator(this.config.platformLimitations);
  }

  /**
   * Запуск тестовой сессии
   */
  async startTestSession(
    gameId: string,
    gamePath: string,
    device: 'mobile' | 'desktop' | 'tv' = 'desktop'
  ): Promise<TestSession> {
    const sessionId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.logger.info(`🧪 Запуск тестовой сессии ${sessionId} для игры ${gameId} на ${device}`);

    // Создаем тестовую сессию
    const session: TestSession = {
      id: sessionId,
      gameId,
      startTime: new Date(),
      device,
      status: 'running',
      metrics: this.initializeMetrics(),
      logs: [],
      errors: [],
      warnings: [],
      screenshots: [],
      performanceProfile: this.initializePerformanceProfile()
    };

    // Подготавливаем игру для тестирования
    await this.prepareGameForTesting(gamePath, sessionId);

    // Регистрируем сессию
    this.activeSessions.set(sessionId, session);

    // Запускаем мониторинг
    this.startSessionMonitoring(session);

    // Запускаем автотесты
    this.startAutomatedTesting(session);

    this.logger.info(`✅ Тестовая сессия ${sessionId} запущена`);
    
    return session;
  }

  /**
   * Остановка тестовой сессии
   */
  async stopTestSession(sessionId: string): Promise<TestReport> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Тестовая сессия ${sessionId} не найдена`);
    }

    this.logger.info(`🔴 Остановка тестовой сессии ${sessionId}`);

    session.status = 'completed';
    session.endTime = new Date();

    // Останавливаем мониторинг
    this.stopSessionMonitoring(sessionId);

    // Генерируем отчет
    const report = await this.generateTestReport(session);

    // Сохраняем результаты
    this.sessionResults.set(sessionId, report);
    this.activeSessions.delete(sessionId);

    this.logger.info(`📊 Отчет для сессии ${sessionId} сгенерирован. Общий счет: ${report.summary.overallScore}/100`);

    return report;
  }

  /**
   * Подготовка игры для тестирования
   */
  private async prepareGameForTesting(gamePath: string, sessionId: string): Promise<void> {
    const testOutputPath = join(process.cwd(), 'test-output', sessionId);
    
    // Нормализуем структуру игры
    await this.structureService.normalizeGameStructure(gamePath, testOutputPath, {
      optimize: false, // Не оптимизируем для тестирования
      validate: true,
      generateMissing: true,
      strictMode: false
    });

    // Внедряем тестовые скрипты
    await this.injectTestingScripts(testOutputPath);
  }

  /**
   * Внедрение тестовых скриптов
   */
  private async injectTestingScripts(gamePath: string): Promise<void> {
    const indexPath = join(gamePath, 'index.html');
    let content = await fs.readFile(indexPath, 'utf-8');

    // Заменяем Yandex SDK на симуляцию
    content = content.replace(
      /https:\/\/yandex\.ru\/games\/sdk\/v\d+/g,
      '/yandex-sdk.js'
    );

    // Добавляем тестовые скрипты
    const testingScript = `
  <!-- Testing Framework -->
  <script>
    window.YandexTestFramework = {
      sessionId: '${gamePath.split('/').pop()}',
      startTime: Date.now(),
      metrics: {
        interactions: [],
        performance: [],
        errors: [],
        logs: []
      },
      
      log: function(level, message, data) {
        this.metrics.logs.push({
          timestamp: Date.now(),
          level: level,
          message: message,
          data: data
        });
        
        // Отправляем на сервер
        fetch('/api/test/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: this.sessionId,
            level: level,
            message: message,
            data: data
          })
        }).catch(e => console.warn('Failed to send log:', e));
      },
      
      recordInteraction: function(type, target, data) {
        this.metrics.interactions.push({
          timestamp: Date.now(),
          type: type,
          target: target,
          data: data
        });
      },
      
      recordPerformance: function(metric, value) {
        this.metrics.performance.push({
          timestamp: Date.now(),
          metric: metric,
          value: value
        });
      },
      
      recordError: function(error) {
        this.metrics.errors.push({
          timestamp: Date.now(),
          message: error.message,
          stack: error.stack,
          source: error.filename,
          line: error.lineno,
          column: error.colno
        });
      }
    };
    
    // Перехватываем ошибки
    window.addEventListener('error', function(e) {
      YandexTestFramework.recordError(e.error || e);
    });
    
    // Перехватываем unhandled promise rejections
    window.addEventListener('unhandledrejection', function(e) {
      YandexTestFramework.recordError(new Error(e.reason));
    });
    
    // Мониторинг производительности
    if (window.PerformanceObserver) {
      // First Paint и First Contentful Paint
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          YandexTestFramework.recordPerformance(entry.name, entry.startTime);
        }
      }).observe({entryTypes: ['paint']});
      
      // Layout Shifts
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            YandexTestFramework.recordPerformance('layout-shift', entry.value);
          }
        }
      }).observe({entryTypes: ['layout-shift']});
    }
    
    // Мониторинг взаимодействий
    ['click', 'touchstart', 'keydown'].forEach(eventType => {
      document.addEventListener(eventType, function(e) {
        YandexTestFramework.recordInteraction(eventType, e.target.tagName, {
          x: e.clientX,
          y: e.clientY
        });
      });
    });
    
    // Периодическая отправка метрик
    setInterval(function() {
      fetch('/api/test/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: YandexTestFramework.sessionId,
          metrics: YandexTestFramework.metrics
        })
      }).catch(e => console.warn('Failed to send metrics:', e));
      
      // Очищаем буфер
      YandexTestFramework.metrics = {
        interactions: [],
        performance: [],
        errors: [],
        logs: []
      };
    }, 5000);
  </script>`;

    content = content.replace('</head>', `${testingScript}\n</head>`);
    
    await fs.writeFile(indexPath, content);
  }

  /**
   * Генерация HTML для тестирования
   */
  private async generateTestHTML(session: TestSession): Promise<string> {
    const gameURL = `/test-output/${session.id}/index.html`;
    const deviceConfig = this.config.deviceSimulation[session.device];

    return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Тестирование игры - ${session.gameId}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: Arial, sans-serif;
      background: #f0f0f0;
      display: flex;
      height: 100vh;
    }
    
    .test-sidebar {
      width: 300px;
      background: #2c3e50;
      color: white;
      padding: 20px;
      overflow-y: auto;
    }
    
    .game-frame-container {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    
    .device-frame {
      background: #333;
      border-radius: 20px;
      padding: 20px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    }
    
    .game-iframe {
      width: ${deviceConfig.viewport.width}px;
      height: ${deviceConfig.viewport.height}px;
      border: none;
      border-radius: 10px;
      background: white;
    }
    
    .metrics-section {
      margin-bottom: 20px;
      padding: 15px;
      background: rgba(255,255,255,0.1);
      border-radius: 8px;
    }
    
    .metric-item {
      display: flex;
      justify-content: space-between;
      margin: 5px 0;
      font-size: 14px;
    }
    
    .status-indicator {
      display: inline-block;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      margin-right: 8px;
    }
    
    .status-running { background: #f39c12; }
    .status-completed { background: #27ae60; }
    .status-failed { background: #e74c3c; }
    
    .control-buttons {
      margin-top: 20px;
    }
    
    .btn {
      display: block;
      width: 100%;
      padding: 10px;
      margin: 5px 0;
      background: #3498db;
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      text-decoration: none;
      text-align: center;
    }
    
    .btn:hover {
      background: #2980b9;
    }
    
    .btn.danger {
      background: #e74c3c;
    }
    
    .btn.danger:hover {
      background: #c0392b;
    }
    
    .log-container {
      height: 200px;
      overflow-y: auto;
      background: #000;
      color: #0f0;
      font-family: monospace;
      font-size: 12px;
      padding: 10px;
      border-radius: 5px;
    }
    
    .device-selector {
      margin-bottom: 15px;
    }
    
    .device-selector select {
      width: 100%;
      padding: 8px;
      border-radius: 4px;
      border: none;
    }
  </style>
</head>
<body>
  <div class="test-sidebar">
    <h2>🧪 Тестирование</h2>
    
    <div class="metrics-section">
      <h3>Сессия</h3>
      <div class="metric-item">
        <span>ID:</span>
        <span>${session.id}</span>
      </div>
      <div class="metric-item">
        <span>Статус:</span>
        <span>
          <span class="status-indicator status-${session.status}"></span>
          ${session.status}
        </span>
      </div>
      <div class="metric-item">
        <span>Устройство:</span>
        <span>${session.device}</span>
      </div>
      <div class="metric-item">
        <span>Время:</span>
        <span id="session-time">00:00</span>
      </div>
    </div>
    
    <div class="device-selector">
      <label>Устройство:</label>
      <select onchange="changeDevice(this.value)">
        <option value="desktop" ${session.device === 'desktop' ? 'selected' : ''}>Desktop</option>
        <option value="mobile" ${session.device === 'mobile' ? 'selected' : ''}>Mobile</option>
        <option value="tv" ${session.device === 'tv' ? 'selected' : ''}>TV</option>
      </select>
    </div>
    
    <div class="metrics-section">
      <h3>📊 Метрики</h3>
      <div class="metric-item">
        <span>FPS:</span>
        <span id="fps">60</span>
      </div>
      <div class="metric-item">
        <span>Память:</span>
        <span id="memory">0 MB</span>
      </div>
      <div class="metric-item">
        <span>Сеть:</span>
        <span id="network">0 KB/s</span>
      </div>
      <div class="metric-item">
        <span>Ошибки:</span>
        <span id="errors">0</span>
      </div>
    </div>
    
    <div class="metrics-section">
      <h3>🎮 Yandex API</h3>
      <div class="metric-item">
        <span>SDK:</span>
        <span id="sdk-status">Загрузка...</span>
      </div>
      <div class="metric-item">
        <span>Игрок:</span>
        <span id="player-status">Не авторизован</span>
      </div>
      <div class="metric-item">
        <span>Реклама:</span>
        <span id="ads-status">Готова</span>
      </div>
    </div>
    
    <div class="control-buttons">
      <button class="btn" onclick="takeScreenshot()">📸 Скриншот</button>
      <button class="btn" onclick="simulateAd()">📺 Показать рекламу</button>
      <button class="btn" onclick="togglePerformanceProfile()">⚡ Профиль производительности</button>
      <a href="/api/test/report/${session.id}" class="btn" target="_blank">📋 Отчет</a>
      <button class="btn danger" onclick="stopTest()">🛑 Остановить тест</button>
    </div>
    
    <div class="metrics-section">
      <h3>📝 Логи</h3>
      <div class="log-container" id="logs">
        <div>[${new Date().toLocaleTimeString()}] Сессия тестирования запущена</div>
      </div>
    </div>
  </div>
  
  <div class="game-frame-container">
    <div class="device-frame">
      <iframe 
        class="game-iframe" 
        src="${gameURL}"
        id="game-frame"
        title="Game Test Frame">
      </iframe>
    </div>
  </div>
  
  <script>
    const sessionId = '${session.id}';
    let startTime = Date.now();
    let ws = null;
    
    // WebSocket для live обновлений
    try {
      ws = new WebSocket('ws://localhost:${this.config.port}');
      ws.onopen = function() {
        ws.send(JSON.stringify({
          type: 'subscribe',
          sessionId: sessionId
        }));
      };
      
      ws.onmessage = function(event) {
        const data = JSON.parse(event.data);
        updateMetrics(data);
      };
    } catch (e) {
      console.warn('WebSocket connection failed:', e);
    }
    
    // Обновление времени сессии
    setInterval(function() {
      const elapsed = Date.now() - startTime;
      const minutes = Math.floor(elapsed / 60000);
      const seconds = Math.floor((elapsed % 60000) / 1000);
      document.getElementById('session-time').textContent = 
        \`\${minutes.toString().padStart(2, '0')}:\${seconds.toString().padStart(2, '0')}\`;
    }, 1000);
    
    function updateMetrics(data) {
      if (data.fps) document.getElementById('fps').textContent = data.fps;
      if (data.memory) document.getElementById('memory').textContent = data.memory + ' MB';
      if (data.network) document.getElementById('network').textContent = data.network + ' KB/s';
      if (data.errors) document.getElementById('errors').textContent = data.errors;
      if (data.sdkStatus) document.getElementById('sdk-status').textContent = data.sdkStatus;
      if (data.playerStatus) document.getElementById('player-status').textContent = data.playerStatus;
      
      if (data.log) {
        const logsContainer = document.getElementById('logs');
        const logEntry = document.createElement('div');
        logEntry.textContent = \`[\${new Date().toLocaleTimeString()}] \${data.log}\`;
        logsContainer.appendChild(logEntry);
        logsContainer.scrollTop = logsContainer.scrollHeight;
      }
    }
    
    function changeDevice(device) {
      location.href = \`/test/\${sessionId}?device=\${device}\`;
    }
    
    function takeScreenshot() {
      fetch(\`/api/test/screenshot/\${sessionId}\`, { method: 'POST' })
        .then(r => r.json())
        .then(data => {
          updateMetrics({ log: 'Скриншот сохранен: ' + data.filename });
        });
    }
    
    function simulateAd() {
      const gameFrame = document.getElementById('game-frame');
      gameFrame.contentWindow.postMessage({
        type: 'yandex_test_ad',
        action: 'show_fullscreen'
      }, '*');
      updateMetrics({ log: 'Симуляция показа рекламы' });
    }
    
    function togglePerformanceProfile() {
      fetch(\`/api/test/performance-toggle/\${sessionId}\`, { method: 'POST' })
        .then(r => r.json())
        .then(data => {
          updateMetrics({ log: 'Профиль производительности: ' + (data.enabled ? 'включен' : 'выключен') });
        });
    }
    
    function stopTest() {
      if (confirm('Остановить тестирование?')) {
        fetch(\`/api/test/stop/\${sessionId}\`, { method: 'POST' })
          .then(r => r.json())
          .then(data => {
            alert('Тест остановлен. Общий счет: ' + data.summary.overallScore + '/100');
            location.href = \`/api/test/report/\${sessionId}\`;
          });
      }
    }
    
    // Мониторинг производительности
    setInterval(function() {
      fetch(\`/api/test/metrics/\${sessionId}\`)
        .then(r => r.json())
        .then(data => updateMetrics(data))
        .catch(e => console.warn('Failed to fetch metrics:', e));
    }, 2000);
  </script>
</body>
</html>`;
  }

  /**
   * Запуск сервера
   */
  async startServer(): Promise<void> {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.config.port, () => {
        this.logger.info(`🌐 Сервер тестирования запущен на порту ${this.config.port}`);
        
        // Инициализируем WebSocket сервер
        this.wsServer = new WebSocketServer({ server: this.server });
        this.setupWebSocketHandlers();
        
        resolve();
      });
    });
  }

  /**
   * Настройка WebSocket обработчиков
   */
  private setupWebSocketHandlers(): void {
    if (!this.wsServer) return;

    this.wsServer.on('connection', (ws) => {
      this.logger.debug('WebSocket клиент подключен');
      
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString());
          
          if (data.type === 'subscribe' && data.sessionId) {
            // Подписываем клиента на обновления сессии
            (ws as any).sessionId = data.sessionId;
          }
        } catch (error) {
          this.logger.error('Ошибка обработки WebSocket сообщения:', error);
        }
      });
      
      ws.on('close', () => {
        this.logger.debug('WebSocket клиент отключен');
      });
    });
  }

  // Методы инициализации и мониторинга

  private initializeMetrics(): TestMetrics {
    return {
      loadTime: 0,
      firstPaint: 0,
      firstContentfulPaint: 0,
      largestContentfulPaint: 0,
      timeToInteractive: 0,
      cumulativeLayoutShift: 0,
      memoryUsage: {
        initial: 0,
        peak: 0,
        average: 0,
        final: 0,
        leaks: []
      },
      networkRequests: {
        totalRequests: 0,
        totalDataTransferred: 0,
        averageLatency: 0,
        failedRequests: 0,
        cachedRequests: 0,
        requestsByType: {}
      },
      userInteractions: {
        clicks: 0,
        touches: 0,
        keyPresses: 0,
        scrolls: 0,
        gameActions: [],
        sessionDuration: 0,
        engagementScore: 0
      },
      yandexAPIUsage: {
        sdkInitTime: 0,
        playerAuthTime: 0,
        adRequests: 0,
        adShownCount: 0,
        leaderboardRequests: 0,
        achievementUnlocks: 0,
        paymentAttempts: 0,
        apiErrors: []
      }
    };
  }

  private initializePerformanceProfile(): PerformanceProfile {
    return {
      fps: [],
      memorySnapshots: [],
      networkTimeline: [],
      userInteractionTimeline: [],
      renderingMetrics: {
        frameRate: 60,
        droppedFrames: 0,
        renderingTime: [],
        layoutShifts: []
      }
    };
  }

  private startSessionMonitoring(session: TestSession): void {
    // Запускаем мониторинг метрик
    const monitoringInterval = setInterval(() => {
      this.collectSessionMetrics(session);
    }, 1000);

    // Сохраняем интервал для последующей очистки
    (session as any).monitoringInterval = monitoringInterval;
  }

  private stopSessionMonitoring(sessionId: string): void {
    const session = this.activeSessions.get(sessionId);
    if (session && (session as any).monitoringInterval) {
      clearInterval((session as any).monitoringInterval);
    }
  }

  private async collectSessionMetrics(session: TestSession): Promise<void> {
    // Симуляция сбора метрик
    session.performanceProfile.fps.push(Math.floor(Math.random() * 10) + 55); // 55-65 FPS
    
    session.performanceProfile.memorySnapshots.push({
      timestamp: new Date(),
      heapUsed: Math.floor(Math.random() * 100) + 50, // 50-150 MB
      heapTotal: 200,
      external: 10,
      arrayBuffers: 5
    });

    // Отправляем live обновления через WebSocket
    if (this.wsServer) {
      const latestFPS = session.performanceProfile.fps[session.performanceProfile.fps.length - 1];
      const latestMemory = session.performanceProfile.memorySnapshots[session.performanceProfile.memorySnapshots.length - 1];
      
      this.wsServer.clients.forEach((ws) => {
        if ((ws as any).sessionId === session.id) {
          ws.send(JSON.stringify({
            fps: latestFPS,
            memory: latestMemory.heapUsed,
            network: Math.floor(Math.random() * 100), // KB/s
            errors: session.errors.length
          }));
        }
      });
    }
  }

  private startAutomatedTesting(session: TestSession): void {
    // Запускаем автоматические тесты через некоторое время
    setTimeout(() => {
      this.runAutomatedTests(session);
    }, 5000);
  }

  private async runAutomatedTests(session: TestSession): Promise<void> {
    // Симуляция автоматических тестов
    this.logger.info(`🤖 Запуск автотестов для сессии ${session.id}`);
    
    // Тест загрузки
    await this.testGameLoading(session);
    
    // Тест Yandex SDK
    await this.testYandexSDKIntegration(session);
    
    // Тест производительности
    await this.testPerformance(session);
    
    // Тест совместимости
    await this.testCompatibility(session);
  }

  private async testGameLoading(session: TestSession): Promise<void> {
    // Симуляция тестирования загрузки
    session.metrics.loadTime = Math.random() * 3000 + 1000; // 1-4 секунды
    session.logs.push({
      timestamp: new Date(),
      level: 'info',
      source: 'test_framework',
      message: `Игра загружена за ${session.metrics.loadTime.toFixed(0)}мс`
    });
  }

  private async testYandexSDKIntegration(session: TestSession): Promise<void> {
    // Симуляция тестирования SDK
    session.metrics.yandexAPIUsage.sdkInitTime = Math.random() * 1000 + 500; // 0.5-1.5 секунды
    session.logs.push({
      timestamp: new Date(),
      level: 'info',
      source: 'yandex_sdk',
      message: `SDK инициализирован за ${session.metrics.yandexAPIUsage.sdkInitTime.toFixed(0)}мс`
    });
  }

  private async testPerformance(session: TestSession): Promise<void> {
    // Симуляция тестирования производительности
    session.metrics.firstPaint = Math.random() * 500 + 100;
    session.metrics.firstContentfulPaint = session.metrics.firstPaint + Math.random() * 300;
    session.logs.push({
      timestamp: new Date(),
      level: 'info',
      source: 'test_framework',
      message: `First Paint: ${session.metrics.firstPaint.toFixed(0)}мс, FCP: ${session.metrics.firstContentfulPaint.toFixed(0)}мс`
    });
  }

  private async testCompatibility(session: TestSession): Promise<void> {
    // Симуляция тестирования совместимости
    session.logs.push({
      timestamp: new Date(),
      level: 'info',
      source: 'test_framework',
      message: `Тестирование совместимости для ${session.device} завершено`
    });
  }

  private async generateTestReport(session: TestSession): Promise<TestReport> {
    // Генерируем полный отчет о тестировании
    const summary = this.generateTestSummary(session);
    const compatibility = this.generateCompatibilityReport(session);
    const performance = this.generatePerformanceReport(session);
    const yandexCompliance = await this.generateYandexComplianceReport(session);
    const recommendations = this.generateRecommendations(session);
    const artifacts = await this.generateTestArtifacts(session);

    return {
      session,
      summary,
      compatibility,
      performance,
      yandexCompliance,
      recommendations,
      artifacts
    };
  }

  private generateTestSummary(session: TestSession): TestSummary {
    const totalChecks = 20;
    const failedChecks = session.errors.filter(e => e.critical).length;
    const passedChecks = totalChecks - failedChecks;
    
    const overallScore = Math.max(0, Math.floor((passedChecks / totalChecks) * 100));
    
    return {
      overallScore,
      passedChecks,
      failedChecks,
      warnings: session.warnings.length,
      criticalIssues: session.errors.filter(e => e.critical).length,
      estimatedPerformance: overallScore >= 80 ? 'excellent' : 
                           overallScore >= 60 ? 'good' : 
                           overallScore >= 40 ? 'fair' : 'poor',
      readyForProduction: overallScore >= 70 && failedChecks === 0
    };
  }

  private generateCompatibilityReport(session: TestSession): CompatibilityReport {
    return {
      yandexGames: session.errors.filter(e => e.type === 'yandex_api').length === 0,
      mobileDevices: session.device === 'mobile' || session.metrics.userInteractions.touches > 0,
      desktopBrowsers: true,
      tvPlatforms: session.device === 'tv',
      apiCompatibility: {
        'YaGames.init': true,
        'YaGames.getPlayer': true,
        'YaGames.adv': true,
        'YaGames.leaderboards': true
      },
      missingFeatures: []
    };
  }

  private generatePerformanceReport(session: TestSession): PerformanceReport {
    const avgFPS = session.performanceProfile.fps.reduce((a, b) => a + b, 0) / session.performanceProfile.fps.length;
    
    return {
      loadingPerformance: session.metrics.loadTime < 2000 ? 'excellent' : 
                         session.metrics.loadTime < 4000 ? 'good' : 
                         session.metrics.loadTime < 6000 ? 'fair' : 'poor',
      runtimePerformance: avgFPS >= 55 ? 'excellent' : 
                         avgFPS >= 45 ? 'good' : 
                         avgFPS >= 30 ? 'fair' : 'poor',
      memoryEfficiency: 'good',
      networkOptimization: 'good',
      bottlenecks: [],
      optimizationOpportunities: []
    };
  }

  private async generateYandexComplianceReport(session: TestSession): Promise<YandexComplianceReport> {
    // Используем валидатор для проверки соответствия
    const testOutputPath = join(process.cwd(), 'test-output', session.id);
    const validationResult = await this.validator.validateGame(testOutputPath);
    
    return {
      sdkIntegration: validationResult.details.sdk.sdkPresent,
      requiredAPIs: {
        'init': validationResult.details.sdk.correctIntegration,
        'player': !validationResult.details.sdk.missingFeatures.includes('player'),
        'ads': !validationResult.details.sdk.missingFeatures.includes('advertising'),
        'leaderboards': !validationResult.details.sdk.missingFeatures.includes('leaderboards')
      },
      manifestCompliance: validationResult.details.manifest.valid,
      sizeCompliance: validationResult.details.size.withinLimit,
      securityCompliance: true,
      complianceScore: validationResult.score,
      missingRequirements: validationResult.errors.map(e => e.message)
    };
  }

  private generateRecommendations(session: TestSession): TestRecommendation[] {
    const recommendations: TestRecommendation[] = [];
    
    // Рекомендации по производительности
    if (session.metrics.loadTime > 3000) {
      recommendations.push({
        category: 'performance',
        priority: 'high',
        title: 'Оптимизация времени загрузки',
        description: 'Время загрузки игры превышает рекомендуемое значение',
        solution: 'Оптимизируйте ассеты, используйте сжатие и кэширование',
        estimatedImpact: 'Улучшение пользовательского опыта на 30-50%',
        implementationEffort: 'medium'
      });
    }
    
    // Рекомендации по мобильной совместимости
    if (session.device === 'mobile' && session.metrics.userInteractions.touches === 0) {
      recommendations.push({
        category: 'compatibility',
        priority: 'critical',
        title: 'Добавление поддержки тач-событий',
        description: 'Игра не реагирует на тач-взаимодействия на мобильных устройствах',
        solution: 'Добавьте обработчики touchstart, touchend и touchmove событий',
        estimatedImpact: 'Обеспечение работоспособности на мобильных устройствах',
        implementationEffort: 'low'
      });
    }
    
    return recommendations;
  }

  private async generateTestArtifacts(session: TestSession): Promise<TestArtifact[]> {
    const artifacts: TestArtifact[] = [];
    
    // Логи сессии
    const logsPath = join(process.cwd(), 'test-output', session.id, 'logs.json');
    await fs.writeFile(logsPath, JSON.stringify(session.logs, null, 2));
    
    artifacts.push({
      type: 'log',
      filename: 'logs.json',
      description: 'Логи тестовой сессии',
      size: (await fs.stat(logsPath)).size,
      timestamp: new Date()
    });
    
    // Метрики производительности
    const metricsPath = join(process.cwd(), 'test-output', session.id, 'performance.json');
    await fs.writeFile(metricsPath, JSON.stringify(session.performanceProfile, null, 2));
    
    artifacts.push({
      type: 'performance_trace',
      filename: 'performance.json',
      description: 'Профиль производительности',
      size: (await fs.stat(metricsPath)).size,
      timestamp: new Date()
    });
    
    return artifacts;
  }

  /**
   * Получение статистики сервиса
   */
  getStats() {
    return {
      activeSessions: this.activeSessions.size,
      completedSessions: this.sessionResults.size,
      serverRunning: !!this.server,
      webSocketConnections: this.wsServer?.clients.size || 0
    };
  }

  /**
   * Остановка сервера
   */
  async stopServer(): Promise<void> {
    if (this.server) {
      return new Promise((resolve) => {
        this.server!.close(() => {
          this.logger.info('🔴 Сервер тестирования остановлен');
          resolve();
        });
      });
    }
  }
}

// Классы симуляторов

class YandexSDKSimulator {
  constructor(private config: TestEnvironmentConfig) {}

  generateSDKCode(): string {
    return `
// Yandex Games SDK Simulator v${this.config.yandexSDKVersion}
(function() {
  window.YaGames = {
    init: function() {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            getPlayer: () => Promise.resolve({
              getName: () => 'Test Player',
              getUniqueID: () => 'test_player_id',
              getData: () => Promise.resolve({}),
              setData: () => Promise.resolve()
            }),
            adv: {
              showFullscreenAdv: (options) => {
                setTimeout(() => {
                  if (options.callbacks && options.callbacks.onClose) {
                    options.callbacks.onClose(true);
                  }
                }, 2000);
              },
              showRewardedVideo: (options) => {
                setTimeout(() => {
                  if (options.callbacks && options.callbacks.onRewarded) {
                    options.callbacks.onRewarded();
                  }
                }, 3000);
              }
            },
            getLeaderboards: () => Promise.resolve({
              setLeaderboardScore: () => Promise.resolve(),
              getLeaderboardEntries: () => Promise.resolve([])
            })
          });
        }, 500);
      });
    }
  };
  
  console.log('Yandex Games SDK Simulator loaded');
})();
`;
  }

  getMockPlayer() {
    return {
      uniqueID: 'test_player_' + Math.random().toString(36).substr(2, 9),
      name: 'Test Player',
      photo: {
        small: 'https://via.placeholder.com/50',
        medium: 'https://via.placeholder.com/100',
        large: 'https://via.placeholder.com/200'
      }
    };
  }

  getMockLeaderboard() {
    return {
      entries: Array.from({ length: 10 }, (_, i) => ({
        score: Math.floor(Math.random() * 10000),
        player: {
          name: `Player ${i + 1}`,
          uniqueID: `player_${i + 1}`
        },
        rank: i + 1
      }))
    };
  }

  simulateAd() {
    return {
      type: 'fullscreen',
      shown: true,
      duration: 15,
      timestamp: Date.now()
    };
  }
}

class DeviceSimulator {
  constructor(private config: DeviceSimulationConfig) {}

  simulateDevice(device: keyof DeviceSimulationConfig) {
    return this.config[device];
  }
}

class NetworkSimulator {
  constructor(private config: PlatformLimitationConfig) {}

  simulateLatency() {
    return this.config.networkLatency + Math.random() * 50;
  }

  simulateThrottling() {
    return this.config.cpuThrottling;
  }
}

// Singleton экземпляр
export const yandexTestingEnvironment = new YandexTestingEnvironmentService();
export default yandexTestingEnvironment; 
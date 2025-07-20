import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import puppeteer, { Browser, Page } from 'puppeteer';
import { promises as fs } from 'fs';
import path from 'path';
import { LoggerService } from './logger';
import { 
  DeviceProfile, 
  DeviceTestResult, 
  DeviceTestSuite, 
  DeviceTestReport 
} from '@/types/testing';

export class DeviceTestingService extends EventEmitter {
  private logger: LoggerService;
  private browsers: Map<string, Browser> = new Map();
  private defaultDevices: DeviceProfile[] = [];
  private activeSuites: Map<string, DeviceTestSuite> = new Map();
  private testResults: Map<string, DeviceTestReport> = new Map();

  constructor() {
    super();
    this.logger = new LoggerService();
    this.initializeDefaultDevices();
  }

  private initializeDefaultDevices(): void {
    this.defaultDevices = [
      // Мобильные устройства
      {
        id: 'iphone-13',
        name: 'iPhone 13',
        type: 'mobile',
        os: 'ios',
        browser: 'safari',
        viewport: { width: 390, height: 844 },
        capabilities: {
          touch: true,
          keyboard: false,
          gamepad: false,
          webgl: true,
          audio: true
        },
        performance: {
          cpu: 'high',
          memory: 4096,
          gpu: 'dedicated'
        }
      },
      {
        id: 'samsung-galaxy-s21',
        name: 'Samsung Galaxy S21',
        type: 'mobile',
        os: 'android',
        browser: 'chrome',
        viewport: { width: 360, height: 800 },
        capabilities: {
          touch: true,
          keyboard: false,
          gamepad: false,
          webgl: true,
          audio: true
        },
        performance: {
          cpu: 'high',
          memory: 8192,
          gpu: 'dedicated'
        }
      },
      // Планшеты
      {
        id: 'ipad-air',
        name: 'iPad Air',
        type: 'tablet',
        os: 'ios',
        browser: 'safari',
        viewport: { width: 820, height: 1180 },
        capabilities: {
          touch: true,
          keyboard: true,
          gamepad: false,
          webgl: true,
          audio: true
        },
        performance: {
          cpu: 'high',
          memory: 4096,
          gpu: 'dedicated'
        }
      },
      // Десктоп
      {
        id: 'desktop-chrome',
        name: 'Desktop Chrome',
        type: 'desktop',
        os: 'windows',
        browser: 'chrome',
        viewport: { width: 1920, height: 1080 },
        capabilities: {
          touch: false,
          keyboard: true,
          gamepad: true,
          webgl: true,
          audio: true
        },
        performance: {
          cpu: 'high',
          memory: 16384,
          gpu: 'dedicated'
        }
      }
    ];
  }

  public async createTestSuite(
    gameId: string, 
    gamePath: string,
    options?: {
      devices?: DeviceProfile[];
      customTests?: Array<{
        name: string;
        description: string;
        type: 'compatibility' | 'performance' | 'ui' | 'gameplay';
        script: string;
      }>;
    }
  ): Promise<DeviceTestSuite> {
    const suiteId = uuidv4();
    
    const suite: DeviceTestSuite = {
      id: suiteId,
      gameId,
      name: `Автоматическое тестирование ${gameId}`,
      devices: options?.devices || this.defaultDevices,
      tests: [
        ...this.getDefaultTests(),
        ...(options?.customTests || [])
      ],
      configuration: {
        timeout: 60000, // 60 секунд
        retries: 3,
        screenshotsEnabled: true,
        performanceMonitoring: true
      }
    };

    this.activeSuites.set(suiteId, suite);
    this.logger.info(`Создан тестовый набор ${suiteId} для игры ${gameId}`);

    return suite;
  }

  public async executeSuite(suiteId: string, gamePath: string): Promise<DeviceTestReport> {
    const suite = this.activeSuites.get(suiteId);
    if (!suite) {
      throw new Error(`Тестовый набор ${suiteId} не найден`);
    }

    const executionId = uuidv4();
    const startTime = new Date();
    
    this.logger.info(`🧪 Начало выполнения тестового набора ${suiteId}`);
    this.emit('suite:started', { suiteId, executionId, deviceCount: suite.devices.length });

    const results: DeviceTestResult[] = [];

    // Выполняем тесты последовательно для каждого устройства
    for (const device of suite.devices) {
      try {
        this.logger.info(`🔍 Тестирование на устройстве: ${device.name}`);
        this.emit('device:testing', { suiteId, executionId, device: device.name });

        const deviceResult = await this.testOnDevice(suite, device, gamePath);
        results.push(deviceResult);

        this.emit('device:completed', { 
          suiteId, 
          executionId, 
          device: device.name, 
          success: deviceResult.success 
        });

      } catch (error) {
        this.logger.error(`Ошибка тестирования на ${device.name}:`, error);
        
        const failedResult: DeviceTestResult = {
          deviceProfile: device,
          testStartTime: new Date(),
          testEndTime: new Date(),
          duration: 0,
          success: false,
          performance: {
            averageFps: 0,
            memoryUsage: 0,
            loadTime: 0,
            errorCount: 1
          },
          compatibility: {
            rendering: false,
            input: false,
            audio: false,
            fullscreen: false
          },
          errors: [{
            type: 'script',
            message: error instanceof Error ? error.message : 'Неизвестная ошибка',
            timestamp: new Date()
          }]
        };
        
        results.push(failedResult);
      }
    }

    const endTime = new Date();
    const passedDevices = results.filter(r => r.success).length;
    const averageScore = results.length > 0 
      ? Math.round((passedDevices / results.length) * 100) 
      : 0;

    const report: DeviceTestReport = {
      suiteId,
      gameId: suite.gameId,
      executionId,
      startTime,
      endTime,
      summary: {
        totalDevices: suite.devices.length,
        passedDevices,
        failedDevices: results.length - passedDevices,
        averageScore
      },
      results,
      recommendations: this.generateRecommendations(results)
    };

    this.testResults.set(executionId, report);
    
    this.logger.info(`✅ Тестовый набор ${suiteId} завершен`, {
      score: averageScore,
      passed: passedDevices,
      total: results.length
    });

    this.emit('suite:completed', { 
      suiteId, 
      executionId, 
      score: averageScore,
      passedDevices,
      totalDevices: results.length
    });

    return report;
  }

  private async testOnDevice(
    suite: DeviceTestSuite, 
    device: DeviceProfile, 
    gamePath: string
  ): Promise<DeviceTestResult> {
    const browser = await this.getBrowser(device);
    const page = await browser.newPage();
    const startTime = new Date();
    
    try {
      // Настройка viewport и эмуляция устройства
      await page.setViewport({
        width: device.viewport.width,
        height: device.viewport.height,
        isMobile: device.type === 'mobile',
        hasTouch: device.capabilities.touch,
        deviceScaleFactor: device.type === 'mobile' ? 2 : 1
      });

      // Установка User-Agent для эмуляции устройства
      const userAgent = this.getUserAgent(device);
      await page.setUserAgent(userAgent);

      const errors: Array<{
        type: 'rendering' | 'script' | 'network' | 'input';
        message: string;
        timestamp: Date;
      }> = [];

      // Перехват ошибок
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push({
            type: 'script',
            message: msg.text(),
            timestamp: new Date()
          });
        }
      });

      page.on('pageerror', (error) => {
        errors.push({
          type: 'script',
          message: error.message,
          timestamp: new Date()
        });
      });

      page.on('requestfailed', (request) => {
        errors.push({
          type: 'network',
          message: `Failed to load: ${request.url()}`,
          timestamp: new Date()
        });
      });

      // Загрузка игры
      const gameUrl = `file://${path.resolve(gamePath)}/index.html`;
      await page.goto(gameUrl, { waitUntil: 'networkidle0', timeout: suite.configuration.timeout });

      // Ожидание загрузки игры
      await page.waitForSelector('canvas', { timeout: 30000 });

      // Запуск тестов
      const performance = await this.runPerformanceTests(page);
      const compatibility = await this.runCompatibilityTests(page, device);

      // Скриншот результата
      const screenshots = [];
      if (suite.configuration.screenshotsEnabled) {
        const screenshotBuffer = await page.screenshot({ fullPage: true });
        screenshots.push({
          name: `${device.id}-final`,
          data: screenshotBuffer,
          timestamp: new Date()
        });
      }

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      return {
        deviceProfile: device,
        testStartTime: startTime,
        testEndTime: endTime,
        duration,
        success: errors.length === 0 && compatibility.rendering,
        performance,
        compatibility,
        errors,
        screenshots
      };

    } finally {
      await page.close();
    }
  }

  private async runPerformanceTests(page: Page): Promise<{
    averageFps: number;
    memoryUsage: number;
    loadTime: number;
    errorCount: number;
  }> {
    // Измерение производительности
    const metrics = await page.metrics();
    
    // Измерение FPS через JavaScript
    const fpsData = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        let frames = 0;
        const start = Date.now();
        
        function countFrames() {
          frames++;
          if (Date.now() - start < 5000) { // 5 секунд измерения
            requestAnimationFrame(countFrames);
          } else {
            const fps = frames / 5;
            resolve(fps);
          }
        }
        
        requestAnimationFrame(countFrames);
      });
    });

    return {
      averageFps: fpsData,
      memoryUsage: metrics.JSHeapUsedSize / (1024 * 1024), // MB
      loadTime: metrics.DOMContentLoaded,
      errorCount: 0
    };
  }

  private async runCompatibilityTests(page: Page, device: DeviceProfile): Promise<{
    rendering: boolean;
    input: boolean;
    audio: boolean;
    fullscreen: boolean;
  }> {
    const results = {
      rendering: false,
      input: false,
      audio: false,
      fullscreen: false
    };

    try {
      // Проверка рендеринга
      const canvas = await page.$('canvas');
      if (canvas) {
        const canvasInfo = await canvas.evaluate((el: HTMLCanvasElement) => ({
          width: el.width,
          height: el.height,
          context: !!el.getContext('2d') || !!el.getContext('webgl')
        }));
        results.rendering = canvasInfo.width > 0 && canvasInfo.height > 0 && canvasInfo.context;
      }

      // Проверка input событий
      if (device.capabilities.touch) {
        await page.touchscreen.tap(device.viewport.width / 2, device.viewport.height / 2);
        results.input = true;
      } else if (device.capabilities.keyboard) {
        await page.keyboard.press('Space');
        results.input = true;
      }

      // Проверка аудио контекста
      results.audio = await page.evaluate(() => {
        try {
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          return audioContext.state !== undefined;
        } catch (e) {
          return false;
        }
      });

      // Проверка полноэкранного режима
      results.fullscreen = await page.evaluate(() => {
        return !!(document.fullscreenEnabled || (document as any).webkitFullscreenEnabled);
      });

    } catch (error) {
      this.logger.warn('Ошибка при проверке совместимости:', error);
    }

    return results;
  }

  private async getBrowser(device: DeviceProfile): Promise<Browser> {
    const browserKey = `${device.os}-${device.browser}`;
    
    if (!this.browsers.has(browserKey)) {
      const browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          ...(device.type === 'mobile' ? ['--disable-features=VizDisplayCompositor'] : [])
        ]
      });
      
      this.browsers.set(browserKey, browser);
    }

    return this.browsers.get(browserKey)!;
  }

  private getUserAgent(device: DeviceProfile): string {
    const userAgents = {
      'ios-safari': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
      'android-chrome': 'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36',
      'windows-chrome': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'macos-safari': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15'
    };

    const key = `${device.os}-${device.browser}` as keyof typeof userAgents;
    return userAgents[key] || userAgents['windows-chrome'];
  }

  private getDefaultTests(): Array<{
    id: string;
    name: string;
    description: string;
    type: 'compatibility' | 'performance' | 'ui' | 'gameplay';
    script: string;
  }> {
    return [
      {
        id: 'basic-load',
        name: 'Базовая загрузка',
        description: 'Проверка успешной загрузки игры',
        type: 'compatibility',
        script: 'return document.querySelector("canvas") !== null;'
      },
      {
        id: 'performance-check',
        name: 'Проверка производительности',
        description: 'Измерение FPS и использования памяти',
        type: 'performance',
        script: 'return performance.now() > 0;'
      },
      {
        id: 'input-response',
        name: 'Отзывчивость интерфейса',
        description: 'Проверка реакции на пользовательский ввод',
        type: 'ui',
        script: 'return true;'
      }
    ];
  }

  private generateRecommendations(results: DeviceTestResult[]): Array<{
    priority: 'high' | 'medium' | 'low';
    category: 'performance' | 'compatibility' | 'ux';
    message: string;
    devices: string[];
  }> {
    const recommendations = [];
    
    // Анализ производительности
    const lowFpsDevices = results.filter(r => r.performance.averageFps < 30);
    if (lowFpsDevices.length > 0) {
      recommendations.push({
        priority: 'high' as const,
        category: 'performance' as const,
        message: 'Низкий FPS на некоторых устройствах. Рекомендуется оптимизация графики.',
        devices: lowFpsDevices.map(r => r.deviceProfile.name)
      });
    }

    // Анализ памяти
    const highMemoryDevices = results.filter(r => r.performance.memoryUsage > 100);
    if (highMemoryDevices.length > 0) {
      recommendations.push({
        priority: 'medium' as const,
        category: 'performance' as const,
        message: 'Высокое потребление памяти. Рекомендуется оптимизация ассетов.',
        devices: highMemoryDevices.map(r => r.deviceProfile.name)
      });
    }

    // Анализ совместимости
    const renderingIssues = results.filter(r => !r.compatibility.rendering);
    if (renderingIssues.length > 0) {
      recommendations.push({
        priority: 'high' as const,
        category: 'compatibility' as const,
        message: 'Проблемы с рендерингом на некоторых устройствах.',
        devices: renderingIssues.map(r => r.deviceProfile.name)
      });
    }

    return recommendations;
  }

  public async getTestReport(executionId: string): Promise<DeviceTestReport | null> {
    return this.testResults.get(executionId) || null;
  }

  public async getAllReports(): Promise<DeviceTestReport[]> {
    return Array.from(this.testResults.values());
  }

  public async cleanup(): Promise<void> {
    // Закрываем все браузеры
    for (const [key, browser] of this.browsers) {
      try {
        await browser.close();
        this.logger.info(`Закрыт браузер: ${key}`);
      } catch (error) {
        this.logger.error(`Ошибка закрытия браузера ${key}:`, error);
      }
    }
    this.browsers.clear();
  }
}

export const deviceTestingService = new DeviceTestingService(); 
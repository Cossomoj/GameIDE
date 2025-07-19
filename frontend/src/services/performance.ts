export interface PerformanceConfig {
  cache: {
    enabled: boolean;
    maxMemoryMB: number;
    maxFileSize: number;
    ttl: number;
    compression: boolean;
  };
  graphics: {
    quality: 'low' | 'medium' | 'high' | 'ultra';
    maxTextureSize: number;
    enableMipmaps: boolean;
    antialiasing: boolean;
    shadows: boolean;
    particleCount: number;
  };
  resources: {
    maxConcurrentLoads: number;
    preloadCritical: boolean;
    lazyLoad: boolean;
    bundleSize: number;
    compressionLevel: number;
  };
  network: {
    timeout: number;
    retries: number;
    batchSize: number;
    enableGzip: boolean;
    prefetch: boolean;
  };
  memory: {
    gcInterval: number;
    maxHeapMB: number;
    enableAutoCleanup: boolean;
    warningThreshold: number;
  };
  monitoring: {
    enableMetrics: boolean;
    reportInterval: number;
    trackFrameRate: boolean;
    trackMemoryUsage: boolean;
    trackNetworkLatency: boolean;
  };
}

export interface PerformanceMetrics {
  memory: {
    used: number;
    total: number;
    percentage: number;
    heapUsed: number;
    heapTotal: number;
  };
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  cache: {
    hits: number;
    misses: number;
    hitRate: number;
    size: number;
    memoryUsage: number;
  };
  network: {
    latency: number;
    bandwidth: number;
    errors: number;
    requests: number;
  };
  graphics: {
    fps: number;
    frameTime: number;
    drawCalls: number;
    texturesLoaded: number;
  };
  timestamp: Date;
}

export interface ResourceLoader {
  id: string;
  type: 'image' | 'audio' | 'json' | 'text' | 'binary';
  url: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  size?: number;
  preload: boolean;
  cache: boolean;
}

export interface PerformanceReport {
  config: PerformanceConfig;
  metrics: PerformanceMetrics;
  uptime: number;
  recommendations: string[];
}

export interface Bottleneck {
  type: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  value: string;
  recommendation: string;
}

class FrontendPerformanceService {
  private baseURL = '/api/performance';
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private performanceObserver?: PerformanceObserver;
  private frameRateMonitor?: number;
  private memoryMonitor?: number;
  private listeners: { [event: string]: Array<(data: any) => void> } = {};

  // Настройки по умолчанию
  private settings = {
    cacheEnabled: true,
    autoOptimize: true,
    monitoringEnabled: true,
    graphicsQuality: 'medium' as const,
    maxCacheSize: 50 * 1024 * 1024, // 50MB
    framerate: {
      target: 60,
      monitoring: true
    }
  };

  constructor() {
    this.setupPerformanceMonitoring();
    this.loadSettings();
  }

  // Настройка мониторинга производительности
  private setupPerformanceMonitoring(): void {
    if (!this.settings.monitoringEnabled) return;

    // Мониторинг производительности браузера
    if ('PerformanceObserver' in window) {
      this.performanceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.processPerformanceEntry(entry);
        }
      });

      try {
        this.performanceObserver.observe({ 
          entryTypes: ['navigation', 'resource', 'measure', 'paint'] 
        });
      } catch (error) {
        console.warn('Performance Observer not fully supported:', error);
      }
    }

    // Мониторинг FPS
    if (this.settings.framerate.monitoring) {
      this.startFrameRateMonitoring();
    }

    // Мониторинг памяти
    this.startMemoryMonitoring();
  }

  // Обработка записей производительности
  private processPerformanceEntry(entry: PerformanceEntry): void {
    switch (entry.entryType) {
      case 'navigation':
        const navEntry = entry as PerformanceNavigationTiming;
        this.emit('navigation-timing', {
          loadTime: navEntry.loadEventEnd - navEntry.navigationStart,
          domContentLoaded: navEntry.domContentLoadedEventEnd - navEntry.navigationStart,
          firstPaint: navEntry.domContentLoadedEventStart - navEntry.navigationStart
        });
        break;

      case 'resource':
        const resEntry = entry as PerformanceResourceTiming;
        this.emit('resource-timing', {
          name: resEntry.name,
          duration: resEntry.duration,
          size: resEntry.transferSize,
          cached: resEntry.transferSize === 0
        });
        break;

      case 'paint':
        this.emit('paint-timing', {
          name: entry.name,
          startTime: entry.startTime
        });
        break;
    }
  }

  // Мониторинг FPS
  private startFrameRateMonitoring(): void {
    let lastTime = performance.now();
    let frameCount = 0;
    let fps = 60;

    const measureFPS = (currentTime: number) => {
      frameCount++;
      
      if (currentTime >= lastTime + 1000) {
        fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        frameCount = 0;
        lastTime = currentTime;
        
        this.emit('fps-update', { fps, target: this.settings.framerate.target });
        
        // Автооптимизация при низком FPS
        if (this.settings.autoOptimize && fps < 30) {
          this.autoOptimizeGraphics();
        }
      }
      
      this.frameRateMonitor = requestAnimationFrame(measureFPS);
    };

    this.frameRateMonitor = requestAnimationFrame(measureFPS);
  }

  // Мониторинг памяти
  private startMemoryMonitoring(): void {
    if ('memory' in performance) {
      const checkMemory = () => {
        const memory = (performance as any).memory;
        const percentage = (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100;
        
        this.emit('memory-update', {
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize,
          percentage,
          limit: memory.jsHeapSizeLimit
        });

        // Предупреждение о высоком использовании памяти
        if (percentage > 80) {
          this.emit('memory-warning', { percentage });
          
          if (this.settings.autoOptimize) {
            this.clearOldCache();
          }
        }
      };

      setInterval(checkMemory, 5000); // Каждые 5 секунд
    }
  }

  // Автооптимизация графики
  private async autoOptimizeGraphics(): Promise<void> {
    try {
      const response = await fetch(`${this.baseURL}/graphics/auto-adjust`, {
        method: 'POST'
      });

      if (response.ok) {
        const result = await response.json();
        this.settings.graphicsQuality = result.data.quality;
        this.saveSettings();
        this.emit('graphics-optimized', result.data);
      }
    } catch (error) {
      console.error('Failed to auto-optimize graphics:', error);
    }
  }

  // API методы

  // Получение метрик производительности
  async getMetrics(): Promise<PerformanceMetrics> {
    const response = await fetch(`${this.baseURL}/metrics`);
    
    if (!response.ok) {
      throw new Error(`Failed to get metrics: ${response.status}`);
    }

    const data = await response.json();
    return data.data;
  }

  // Получение отчета о производительности
  async getReport(): Promise<PerformanceReport> {
    const response = await fetch(`${this.baseURL}/report`);
    
    if (!response.ok) {
      throw new Error(`Failed to get report: ${response.status}`);
    }

    const data = await response.json();
    return data.data;
  }

  // Получение конфигурации
  async getConfig(): Promise<PerformanceConfig> {
    const response = await fetch(`${this.baseURL}/config`);
    
    if (!response.ok) {
      throw new Error(`Failed to get config: ${response.status}`);
    }

    const data = await response.json();
    return data.data;
  }

  // Обновление конфигурации
  async updateConfig(updates: Partial<PerformanceConfig>): Promise<PerformanceConfig> {
    const response = await fetch(`${this.baseURL}/config`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      throw new Error(`Failed to update config: ${response.status}`);
    }

    const data = await response.json();
    return data.data;
  }

  // Управление качеством графики
  async setGraphicsQuality(quality: 'low' | 'medium' | 'high' | 'ultra'): Promise<void> {
    const response = await fetch(`${this.baseURL}/graphics/quality`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ quality })
    });

    if (!response.ok) {
      throw new Error(`Failed to set graphics quality: ${response.status}`);
    }

    this.settings.graphicsQuality = quality;
    this.saveSettings();
    this.emit('graphics-quality-changed', { quality });
  }

  // Управление кешем

  // Получение информации о кеше
  async getCacheInfo(): Promise<{
    metrics: any;
    config: any;
    efficiency: any;
  }> {
    const response = await fetch(`${this.baseURL}/cache/info`);
    
    if (!response.ok) {
      throw new Error(`Failed to get cache info: ${response.status}`);
    }

    const data = await response.json();
    return data.data;
  }

  // Очистка кеша
  async clearCache(): Promise<void> {
    // Очищаем локальный кеш
    this.cache.clear();
    
    // Очищаем серверный кеш
    const response = await fetch(`${this.baseURL}/cache/clear`, {
      method: 'POST'
    });

    if (!response.ok) {
      throw new Error(`Failed to clear cache: ${response.status}`);
    }

    this.emit('cache-cleared');
  }

  // Очистка старого кеша
  private clearOldCache(): void {
    const now = Date.now();
    let clearedCount = 0;

    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        clearedCount++;
      }
    });

    if (clearedCount > 0) {
      this.emit('cache-cleaned', { clearedCount });
    }
  }

  // Локальное кеширование
  setCache<T>(key: string, data: T, ttl: number = 300000): void { // 5 минут по умолчанию
    if (!this.settings.cacheEnabled) return;

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  getCache<T>(key: string): T | null {
    if (!this.settings.cacheEnabled) return null;

    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  // Управление ресурсами

  // Добавление ресурса в очередь
  async queueResource(resource: ResourceLoader): Promise<void> {
    const response = await fetch(`${this.baseURL}/resources/queue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(resource)
    });

    if (!response.ok) {
      throw new Error(`Failed to queue resource: ${response.status}`);
    }
  }

  // Предварительная загрузка ресурсов
  async preloadResources(resources: ResourceLoader[]): Promise<void> {
    const response = await fetch(`${this.baseURL}/resources/preload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ resources })
    });

    if (!response.ok) {
      throw new Error(`Failed to preload resources: ${response.status}`);
    }
  }

  // Ленивая загрузка изображений
  setupLazyLoading(selector: string = 'img[data-src]'): void {
    if (!('IntersectionObserver' in window)) {
      // Fallback для старых браузеров
      document.querySelectorAll(selector).forEach((img: any) => {
        img.src = img.dataset.src;
      });
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          img.src = img.dataset.src || '';
          img.classList.remove('lazy');
          observer.unobserve(img);
        }
      });
    });

    document.querySelectorAll(selector).forEach(img => {
      observer.observe(img);
    });
  }

  // Диагностика

  // Анализ узких мест
  async analyzeBottlenecks(): Promise<{
    bottlenecks: Bottleneck[];
    totalIssues: number;
    severity: number;
  }> {
    const response = await fetch(`${this.baseURL}/analysis/bottlenecks`);
    
    if (!response.ok) {
      throw new Error(`Failed to analyze bottlenecks: ${response.status}`);
    }

    const data = await response.json();
    return data.data;
  }

  // Получение рекомендаций
  async getRecommendations(): Promise<{
    recommendations: string[];
    totalCount: number;
    categories: { [key: string]: number };
  }> {
    const response = await fetch(`${this.baseURL}/recommendations`);
    
    if (!response.ok) {
      throw new Error(`Failed to get recommendations: ${response.status}`);
    }

    const data = await response.json();
    return data.data;
  }

  // Автоматическая оптимизация
  async autoOptimize(): Promise<{
    optimizations: string[];
    appliedCount: number;
  }> {
    const response = await fetch(`${this.baseURL}/optimize/auto`, {
      method: 'POST'
    });

    if (!response.ok) {
      throw new Error(`Failed to auto-optimize: ${response.status}`);
    }

    const data = await response.json();
    this.emit('auto-optimized', data.data);
    return data.data;
  }

  // Получение статуса в реальном времени
  async getRealtimeStatus(): Promise<{
    status: string;
    score: number;
    metrics: any;
    timestamp: Date;
  }> {
    const response = await fetch(`${this.baseURL}/realtime/status`);
    
    if (!response.ok) {
      throw new Error(`Failed to get realtime status: ${response.status}`);
    }

    const data = await response.json();
    return data.data;
  }

  // Инструменты для разработчиков

  // Измерение производительности функции
  measurePerformance<T>(name: string, fn: () => T): T {
    const startTime = performance.now();
    const result = fn();
    const endTime = performance.now();
    const duration = endTime - startTime;

    console.log(`Performance: ${name} took ${duration.toFixed(2)}ms`);
    this.emit('performance-measured', { name, duration });

    return result;
  }

  // Измерение производительности асинхронной функции
  async measureAsyncPerformance<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const startTime = performance.now();
    const result = await fn();
    const endTime = performance.now();
    const duration = endTime - startTime;

    console.log(`Performance: ${name} took ${duration.toFixed(2)}ms`);
    this.emit('performance-measured', { name, duration, async: true });

    return result;
  }

  // Debounce функция для оптимизации
  debounce<T extends (...args: any[]) => any>(
    func: T, 
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  // Throttle функция для ограничения частоты вызовов
  throttle<T extends (...args: any[]) => any>(
    func: T, 
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  // Управление настройками

  // Загрузка настроек
  private loadSettings(): void {
    try {
      const saved = localStorage.getItem('performance-settings');
      if (saved) {
        const settings = JSON.parse(saved);
        this.settings = { ...this.settings, ...settings };
      }
    } catch (error) {
      console.warn('Failed to load performance settings:', error);
    }
  }

  // Сохранение настроек
  private saveSettings(): void {
    try {
      localStorage.setItem('performance-settings', JSON.stringify(this.settings));
    } catch (error) {
      console.warn('Failed to save performance settings:', error);
    }
  }

  // Обновление настроек
  updateSettings(updates: Partial<typeof this.settings>): void {
    this.settings = { ...this.settings, ...updates };
    this.saveSettings();
    this.emit('settings-updated', this.settings);
  }

  // Получение настроек
  getSettings(): typeof this.settings {
    return { ...this.settings };
  }

  // Управление событиями

  on(event: string, callback: (data: any) => void): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  off(event: string, callback: (data: any) => void): void {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  private emit(event: string, data?: any): void {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }

  // Очистка ресурсов
  cleanup(): void {
    if (this.frameRateMonitor) {
      cancelAnimationFrame(this.frameRateMonitor);
    }

    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }

    this.cache.clear();
    this.listeners = {};
  }
}

// Создаем единственный экземпляр
export const performanceService = new FrontendPerformanceService();

// Автоматическая инициализация
document.addEventListener('DOMContentLoaded', () => {
  // Настройка ленивой загрузки
  performanceService.setupLazyLoading();
  
  // Отслеживание производительности загрузки страницы
  window.addEventListener('load', () => {
    const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
    console.log(`Page loaded in ${loadTime}ms`);
  });
});

export default performanceService; 
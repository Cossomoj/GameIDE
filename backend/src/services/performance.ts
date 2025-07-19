import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import { join } from 'path';
import { logger } from './logger';

export interface PerformanceConfig {
  cache: {
    enabled: boolean;
    maxMemoryMB: number;
    maxFileSize: number;
    ttl: number; // TTL в секундах
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
    bundleSize: number; // MB
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
    gcInterval: number; // секунды
    maxHeapMB: number;
    enableAutoCleanup: boolean;
    warningThreshold: number; // процент от maxHeap
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

export interface CacheEntry<T = any> {
  key: string;
  value: T;
  size: number;
  timestamp: Date;
  ttl: number;
  compressed: boolean;
  hits: number;
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

class PerformanceService extends EventEmitter {
  private config: PerformanceConfig;
  private cache: Map<string, CacheEntry> = new Map();
  private metrics: PerformanceMetrics;
  private resourceQueue: ResourceLoader[] = [];
  private loadingResources: Set<string> = new Set();
  private performanceObserver?: PerformanceObserver;
  private metricsInterval?: NodeJS.Timeout;
  private gcInterval?: NodeJS.Timeout;
  private startTime = Date.now();

  constructor(config?: Partial<PerformanceConfig>) {
    super();
    
    this.config = this.mergeConfig(config);
    this.metrics = this.initializeMetrics();
    
    this.setupMonitoring();
    this.setupMemoryManagement();
    this.setupCacheCleanup();
  }

  // Объединение конфигурации с настройками по умолчанию
  private mergeConfig(config?: Partial<PerformanceConfig>): PerformanceConfig {
    const defaultConfig: PerformanceConfig = {
      cache: {
        enabled: true,
        maxMemoryMB: 512,
        maxFileSize: 50 * 1024 * 1024, // 50MB
        ttl: 3600, // 1 час
        compression: true
      },
      graphics: {
        quality: 'medium',
        maxTextureSize: 2048,
        enableMipmaps: true,
        antialiasing: true,
        shadows: true,
        particleCount: 1000
      },
      resources: {
        maxConcurrentLoads: 6,
        preloadCritical: true,
        lazyLoad: true,
        bundleSize: 5, // 5MB
        compressionLevel: 6
      },
      network: {
        timeout: 10000,
        retries: 3,
        batchSize: 10,
        enableGzip: true,
        prefetch: true
      },
      memory: {
        gcInterval: 300, // 5 минут
        maxHeapMB: 1024,
        enableAutoCleanup: true,
        warningThreshold: 80
      },
      monitoring: {
        enableMetrics: true,
        reportInterval: 60000, // 1 минута
        trackFrameRate: true,
        trackMemoryUsage: true,
        trackNetworkLatency: true
      }
    };

    return this.deepMerge(defaultConfig, config || {});
  }

  // Глубокое объединение объектов
  private deepMerge<T>(target: T, source: Partial<T>): T {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key], source[key] as any);
      } else if (source[key] !== undefined) {
        result[key] = source[key] as any;
      }
    }
    
    return result;
  }

  // Инициализация метрик
  private initializeMetrics(): PerformanceMetrics {
    return {
      memory: {
        used: 0,
        total: 0,
        percentage: 0,
        heapUsed: 0,
        heapTotal: 0
      },
      cpu: {
        usage: 0,
        loadAverage: [0, 0, 0]
      },
      cache: {
        hits: 0,
        misses: 0,
        hitRate: 0,
        size: 0,
        memoryUsage: 0
      },
      network: {
        latency: 0,
        bandwidth: 0,
        errors: 0,
        requests: 0
      },
      graphics: {
        fps: 60,
        frameTime: 16.67,
        drawCalls: 0,
        texturesLoaded: 0
      },
      timestamp: new Date()
    };
  }

  // Настройка мониторинга
  private setupMonitoring(): void {
    if (!this.config.monitoring.enableMetrics) return;

    // Мониторинг производительности
    if (typeof PerformanceObserver !== 'undefined') {
      this.performanceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.processPerformanceEntry(entry);
        }
      });

      this.performanceObserver.observe({ entryTypes: ['measure', 'navigation', 'resource', 'paint'] });
    }

    // Периодический сбор метрик
    this.metricsInterval = setInterval(() => {
      this.collectMetrics();
      this.emit('metrics', this.metrics);
    }, this.config.monitoring.reportInterval);
  }

  // Обработка записей производительности
  private processPerformanceEntry(entry: PerformanceEntry): void {
    switch (entry.entryType) {
      case 'navigation':
        const navEntry = entry as PerformanceNavigationTiming;
        this.metrics.network.latency = navEntry.responseEnd - navEntry.requestStart;
        break;
      
      case 'resource':
        const resEntry = entry as PerformanceResourceTiming;
        this.metrics.network.requests++;
        if (resEntry.transferSize) {
          this.metrics.network.bandwidth += resEntry.transferSize;
        }
        break;
      
      case 'measure':
        if (entry.name === 'frame-time') {
          this.metrics.graphics.frameTime = entry.duration;
          this.metrics.graphics.fps = 1000 / entry.duration;
        }
        break;
    }
  }

  // Сбор метрик
  private collectMetrics(): void {
    // Память
    if (process.memoryUsage) {
      const memUsage = process.memoryUsage();
      this.metrics.memory.heapUsed = memUsage.heapUsed;
      this.metrics.memory.heapTotal = memUsage.heapTotal;
      this.metrics.memory.used = memUsage.rss;
      this.metrics.memory.percentage = (memUsage.heapUsed / memUsage.heapTotal) * 100;

      // Предупреждение о высоком использовании памяти
      if (this.metrics.memory.percentage > this.config.memory.warningThreshold) {
        this.emit('memory-warning', {
          percentage: this.metrics.memory.percentage,
          used: this.metrics.memory.used,
          threshold: this.config.memory.warningThreshold
        });
      }
    }

    // CPU (только в Node.js)
    if (process.cpuUsage && process.uptime) {
      const cpuUsage = process.cpuUsage();
      const uptime = process.uptime() * 1000000; // микросекунды
      this.metrics.cpu.usage = ((cpuUsage.user + cpuUsage.system) / uptime) * 100;
    }

    // Кеш
    this.updateCacheMetrics();

    // Обновляем timestamp
    this.metrics.timestamp = new Date();
  }

  // Обновление метрик кеша
  private updateCacheMetrics(): void {
    let totalSize = 0;
    let totalHits = 0;
    
    this.cache.forEach(entry => {
      totalSize += entry.size;
      totalHits += entry.hits;
    });

    this.metrics.cache.size = this.cache.size;
    this.metrics.cache.memoryUsage = totalSize;
    this.metrics.cache.hitRate = this.metrics.cache.hits + this.metrics.cache.misses > 0
      ? (this.metrics.cache.hits / (this.metrics.cache.hits + this.metrics.cache.misses)) * 100
      : 0;
  }

  // Настройка управления памятью
  private setupMemoryManagement(): void {
    if (!this.config.memory.enableAutoCleanup) return;

    // Периодическая сборка мусора
    this.gcInterval = setInterval(() => {
      this.performGarbageCollection();
    }, this.config.memory.gcInterval * 1000);

    // Обработка события нехватки памяти
    process.on('memoryPressure', () => {
      this.handleMemoryPressure();
    });
  }

  // Сборка мусора
  private performGarbageCollection(): void {
    const before = process.memoryUsage().heapUsed;
    
    // Очистка просроченного кеша
    this.clearExpiredCache();
    
    // Принудительная сборка мусора (если доступна)
    if (global.gc) {
      global.gc();
    }

    const after = process.memoryUsage().heapUsed;
    const freed = before - after;

    if (freed > 0) {
      logger.info(`Performance: Freed ${this.formatBytes(freed)} of memory during GC`);
      this.emit('gc-completed', { freed, before, after });
    }
  }

  // Обработка нехватки памяти
  private handleMemoryPressure(): void {
    logger.warn('Performance: Memory pressure detected, performing emergency cleanup');
    
    // Очистка половины кеша
    const entriesToDelete = Math.floor(this.cache.size / 2);
    const sortedEntries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].hits - b[1].hits); // Сортируем по количеству обращений

    for (let i = 0; i < entriesToDelete; i++) {
      this.cache.delete(sortedEntries[i][0]);
    }

    this.emit('memory-pressure-handled', { 
      deletedEntries: entriesToDelete,
      remainingEntries: this.cache.size
    });
  }

  // Настройка очистки кеша
  private setupCacheCleanup(): void {
    // Очистка просроченного кеша каждые 5 минут
    setInterval(() => {
      this.clearExpiredCache();
    }, 5 * 60 * 1000);
  }

  // Очистка просроченного кеша
  private clearExpiredCache(): number {
    const now = Date.now();
    let deletedCount = 0;

    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp.getTime() > entry.ttl * 1000) {
        this.cache.delete(key);
        deletedCount++;
      }
    });

    if (deletedCount > 0) {
      logger.info(`Performance: Cleared ${deletedCount} expired cache entries`);
    }

    return deletedCount;
  }

  // Кеширование данных
  async cacheSet<T>(key: string, value: T, options?: { ttl?: number; compress?: boolean }): Promise<void> {
    if (!this.config.cache.enabled) return;

    const ttl = options?.ttl || this.config.cache.ttl;
    const compress = options?.compress ?? this.config.cache.compression;
    
    let serialized = JSON.stringify(value);
    let size = Buffer.byteLength(serialized, 'utf8');

    // Сжатие, если включено
    if (compress && size > 1024) { // Сжимаем только файлы больше 1KB
      try {
        const zlib = await import('zlib');
        const compressed = zlib.gzipSync(serialized);
        if (compressed.length < size) {
          serialized = compressed.toString('base64');
          size = compressed.length;
        }
      } catch (error) {
        logger.warn('Performance: Failed to compress cache entry', error);
      }
    }

    // Проверяем ограничения
    if (size > this.config.cache.maxFileSize) {
      logger.warn(`Performance: Cache entry too large (${this.formatBytes(size)}), skipping`);
      return;
    }

    // Проверяем общий размер кеша
    const totalSize = Array.from(this.cache.values()).reduce((sum, entry) => sum + entry.size, 0);
    if (totalSize + size > this.config.cache.maxMemoryMB * 1024 * 1024) {
      // Освобождаем место
      await this.evictLeastUsedEntries(size);
    }

    const entry: CacheEntry<T> = {
      key,
      value: serialized,
      size,
      timestamp: new Date(),
      ttl,
      compressed: compress,
      hits: 0
    };

    this.cache.set(key, entry);
    this.emit('cache-set', { key, size });
  }

  // Получение из кеша
  async cacheGet<T>(key: string): Promise<T | null> {
    if (!this.config.cache.enabled) return null;

    const entry = this.cache.get(key);
    if (!entry) {
      this.metrics.cache.misses++;
      return null;
    }

    // Проверяем TTL
    if (Date.now() - entry.timestamp.getTime() > entry.ttl * 1000) {
      this.cache.delete(key);
      this.metrics.cache.misses++;
      return null;
    }

    entry.hits++;
    this.metrics.cache.hits++;

    try {
      let data = entry.value as string;

      // Распаковка, если сжато
      if (entry.compressed) {
        const zlib = await import('zlib');
        const buffer = Buffer.from(data, 'base64');
        data = zlib.gunzipSync(buffer).toString();
      }

      return JSON.parse(data);
    } catch (error) {
      logger.error('Performance: Failed to parse cache entry', error);
      this.cache.delete(key);
      return null;
    }
  }

  // Удаление наименее используемых записей
  private async evictLeastUsedEntries(neededSpace: number): Promise<void> {
    const sortedEntries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].hits - b[1].hits);

    let freedSpace = 0;
    let deletedCount = 0;

    for (const [key, entry] of sortedEntries) {
      if (freedSpace >= neededSpace) break;
      
      this.cache.delete(key);
      freedSpace += entry.size;
      deletedCount++;
    }

    logger.info(`Performance: Evicted ${deletedCount} cache entries to free ${this.formatBytes(freedSpace)}`);
    this.emit('cache-evicted', { deletedCount, freedSpace });
  }

  // Управление ресурсами

  // Добавление ресурса в очередь загрузки
  queueResource(resource: ResourceLoader): void {
    this.resourceQueue.push(resource);
    this.processResourceQueue();
  }

  // Обработка очереди ресурсов
  private async processResourceQueue(): Promise<void> {
    // Сортируем по приоритету
    this.resourceQueue.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    // Обрабатываем ресурсы с учетом ограничения на одновременные загрузки
    while (this.loadingResources.size < this.config.resources.maxConcurrentLoads && this.resourceQueue.length > 0) {
      const resource = this.resourceQueue.shift()!;
      this.loadResource(resource);
    }
  }

  // Загрузка ресурса
  private async loadResource(resource: ResourceLoader): Promise<void> {
    this.loadingResources.add(resource.id);
    
    try {
      const startTime = performance.now();
      
      // Проверяем кеш
      if (resource.cache) {
        const cached = await this.cacheGet(resource.url);
        if (cached) {
          this.emit('resource-loaded', { resource, fromCache: true, duration: 0 });
          return;
        }
      }

      // Загружаем ресурс
      const response = await fetch(resource.url, {
        signal: AbortSignal.timeout(this.config.network.timeout)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      let data: any;
      switch (resource.type) {
        case 'json':
          data = await response.json();
          break;
        case 'text':
          data = await response.text();
          break;
        case 'binary':
          data = await response.arrayBuffer();
          break;
        default:
          data = await response.blob();
      }

      // Кешируем, если нужно
      if (resource.cache) {
        await this.cacheSet(resource.url, data);
      }

      const duration = performance.now() - startTime;
      this.emit('resource-loaded', { resource, data, fromCache: false, duration });

    } catch (error) {
      this.metrics.network.errors++;
      this.emit('resource-error', { resource, error });
      logger.error(`Performance: Failed to load resource ${resource.url}`, error);
    } finally {
      this.loadingResources.delete(resource.id);
      // Продолжаем обработку очереди
      this.processResourceQueue();
    }
  }

  // Настройка качества графики
  setGraphicsQuality(quality: PerformanceConfig['graphics']['quality']): void {
    const graphicsPresets = {
      low: {
        quality: 'low' as const,
        maxTextureSize: 512,
        enableMipmaps: false,
        antialiasing: false,
        shadows: false,
        particleCount: 100
      },
      medium: {
        quality: 'medium' as const,
        maxTextureSize: 1024,
        enableMipmaps: true,
        antialiasing: true,
        shadows: true,
        particleCount: 500
      },
      high: {
        quality: 'high' as const,
        maxTextureSize: 2048,
        enableMipmaps: true,
        antialiasing: true,
        shadows: true,
        particleCount: 1000
      },
      ultra: {
        quality: 'ultra' as const,
        maxTextureSize: 4096,
        enableMipmaps: true,
        antialiasing: true,
        shadows: true,
        particleCount: 2000
      }
    };

    this.config.graphics = { ...this.config.graphics, ...graphicsPresets[quality] };
    this.emit('graphics-quality-changed', this.config.graphics);
    
    logger.info(`Performance: Graphics quality set to ${quality}`);
  }

  // Автоматическая настройка качества на основе производительности
  autoAdjustQuality(): void {
    const avgFps = this.metrics.graphics.fps;
    const memoryUsage = this.metrics.memory.percentage;

    if (avgFps < 30 || memoryUsage > 80) {
      // Понижаем качество
      const qualities: Array<PerformanceConfig['graphics']['quality']> = ['ultra', 'high', 'medium', 'low'];
      const currentIndex = qualities.indexOf(this.config.graphics.quality);
      
      if (currentIndex < qualities.length - 1) {
        this.setGraphicsQuality(qualities[currentIndex + 1]);
        logger.info(`Performance: Auto-lowered graphics quality due to poor performance (FPS: ${avgFps}, Memory: ${memoryUsage}%)`);
      }
    } else if (avgFps > 55 && memoryUsage < 60) {
      // Повышаем качество
      const qualities: Array<PerformanceConfig['graphics']['quality']> = ['low', 'medium', 'high', 'ultra'];
      const currentIndex = qualities.indexOf(this.config.graphics.quality);
      
      if (currentIndex < qualities.length - 1) {
        this.setGraphicsQuality(qualities[currentIndex + 1]);
        logger.info(`Performance: Auto-increased graphics quality due to good performance (FPS: ${avgFps}, Memory: ${memoryUsage}%)`);
      }
    }
  }

  // Предварительная загрузка критических ресурсов
  async preloadCriticalResources(resources: ResourceLoader[]): Promise<void> {
    if (!this.config.resources.preloadCritical) return;

    const criticalResources = resources.filter(r => r.priority === 'critical' || r.preload);
    
    logger.info(`Performance: Preloading ${criticalResources.length} critical resources`);
    
    for (const resource of criticalResources) {
      this.queueResource(resource);
    }
  }

  // Получение текущих метрик
  getMetrics(): PerformanceMetrics {
    this.collectMetrics();
    return { ...this.metrics };
  }

  // Получение конфигурации
  getConfig(): PerformanceConfig {
    return { ...this.config };
  }

  // Обновление конфигурации
  updateConfig(updates: Partial<PerformanceConfig>): void {
    this.config = this.deepMerge(this.config, updates);
    this.emit('config-updated', this.config);
    logger.info('Performance: Configuration updated');
  }

  // Очистка кеша
  clearCache(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.emit('cache-cleared', { clearedEntries: size });
    logger.info(`Performance: Cleared ${size} cache entries`);
  }

  // Сброс метрик
  resetMetrics(): void {
    this.metrics = this.initializeMetrics();
    this.emit('metrics-reset');
    logger.info('Performance: Metrics reset');
  }

  // Получение отчета о производительности
  getPerformanceReport(): {
    config: PerformanceConfig;
    metrics: PerformanceMetrics;
    uptime: number;
    recommendations: string[];
  } {
    const uptime = Date.now() - this.startTime;
    const recommendations: string[] = [];

    // Генерируем рекомендации
    if (this.metrics.memory.percentage > 80) {
      recommendations.push('Высокое использование памяти. Рассмотрите возможность увеличения лимита или оптимизации кода.');
    }

    if (this.metrics.graphics.fps < 30) {
      recommendations.push('Низкий FPS. Попробуйте понизить качество графики или оптимизировать рендеринг.');
    }

    if (this.metrics.cache.hitRate < 50) {
      recommendations.push('Низкий уровень попаданий в кеш. Пересмотрите стратегию кеширования.');
    }

    if (this.metrics.network.errors > 10) {
      recommendations.push('Много сетевых ошибок. Проверьте стабильность соединения.');
    }

    return {
      config: this.config,
      metrics: this.metrics,
      uptime,
      recommendations
    };
  }

  // Утилиты

  private formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unit = 0;

    while (size >= 1024 && unit < units.length - 1) {
      size /= 1024;
      unit++;
    }

    return `${Math.round(size * 100) / 100} ${units[unit]}`;
  }

  // Очистка ресурсов
  cleanup(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
    
    if (this.gcInterval) {
      clearInterval(this.gcInterval);
    }
    
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
    
    this.clearCache();
    this.removeAllListeners();
    
    logger.info('Performance: Service cleaned up');
  }
}

// Создаем экземпляр сервиса
export const performanceService = new PerformanceService();

export default performanceService; 
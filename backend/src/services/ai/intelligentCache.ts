import Redis from 'ioredis';
import { EventEmitter } from 'events';
import { LoggerService } from '../logger';
import config from '@/config';

interface CacheEntry<T = any> {
  key: string;
  value: T;
  timestamp: number;
  ttl: number;
  hitCount: number;
  lastAccess: number;
  size: number;
  metadata?: {
    priority: number;
    tags: string[];
    dependency?: string;
    provider?: string;
    compressed?: boolean;
  };
}

interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  evictions: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  operations: {
    get: number;
    set: number;
    delete: number;
  };
}

interface RateLimitInfo {
  requests: number;
  windowStart: number;
  windowSize: number;
  limit: number;
  resetTime: number;
  provider: string;
  endpoint?: string;
}

interface IntelligentCacheConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
    keyPrefix: string;
  };
  cache: {
    defaultTTL: number;
    maxMemory: number;
    evictionPolicy: 'lru' | 'lfu' | 'ttl' | 'random';
    compressionThreshold: number;
    enableCompression: boolean;
  };
  rateLimits: {
    enabled: boolean;
    persistentStorage: boolean;
    gracePeriod: number;
  };
  intelligent: {
    enabled: boolean;
    learningEnabled: boolean;
    autoOptimization: boolean;
    predictivePreloading: boolean;
  };
}

export class IntelligentCacheService extends EventEmitter {
  private redis: Redis;
  private logger: LoggerService;
  private config: IntelligentCacheConfig;
  private stats: CacheStats;
  private rateLimits: Map<string, RateLimitInfo>;
  private accessPatterns: Map<string, number[]>;
  private popularKeys: Set<string>;
  private isConnected: boolean = false;
  private retryAttempts: number = 0;
  private maxRetryAttempts: number = 5;

  constructor(customConfig?: Partial<IntelligentCacheConfig>) {
    super();
    this.logger = new LoggerService();
    this.config = this.mergeConfig(customConfig);
    this.stats = this.initializeStats();
    this.rateLimits = new Map();
    this.accessPatterns = new Map();
    this.popularKeys = new Set();
    
    this.initializeRedis();
    this.setupIntelligentFeatures();
  }

  private mergeConfig(customConfig?: Partial<IntelligentCacheConfig>): IntelligentCacheConfig {
    const defaultConfig: IntelligentCacheConfig = {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB || '0'),
        keyPrefix: 'gameide:cache:'
      },
      cache: {
        defaultTTL: 3600, // 1 час
        maxMemory: 512 * 1024 * 1024, // 512MB
        evictionPolicy: 'lru',
        compressionThreshold: 1024, // 1KB
        enableCompression: true
      },
      rateLimits: {
        enabled: true,
        persistentStorage: true,
        gracePeriod: 300 // 5 минут
      },
      intelligent: {
        enabled: true,
        learningEnabled: true,
        autoOptimization: true,
        predictivePreloading: true
      }
    };

    return this.deepMerge(defaultConfig, customConfig || {});
  }

  private initializeStats(): CacheStats {
    return {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      memory: {
        used: 0,
        total: this.config.cache.maxMemory,
        percentage: 0
      },
      operations: {
        get: 0,
        set: 0,
        delete: 0
      }
    };
  }

  private async initializeRedis(): Promise<void> {
    try {
      this.redis = new Redis({
        host: this.config.redis.host,
        port: this.config.redis.port,
        password: this.config.redis.password,
        db: this.config.redis.db,
        keyPrefix: this.config.redis.keyPrefix,
        retryDelayOnFailover: 1000,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        keepAlive: 30000,
        family: 4
      });

      // Обработчики событий Redis
      this.redis.on('connect', () => {
        this.isConnected = true;
        this.retryAttempts = 0;
        this.logger.info('✅ Redis подключен для кеширования');
        this.emit('connected');
      });

      this.redis.on('error', (error) => {
        this.isConnected = false;
        this.logger.error('❌ Ошибка Redis:', error);
        this.emit('error', error);
        this.handleRedisError(error);
      });

      this.redis.on('close', () => {
        this.isConnected = false;
        this.logger.warn('⚠️ Redis соединение закрыто');
        this.emit('disconnected');
      });

      this.redis.on('reconnecting', () => {
        this.logger.info('🔄 Переподключение к Redis...');
        this.emit('reconnecting');
      });

      // Подключаемся
      await this.redis.connect();

      // Загружаем существующие лимиты
      if (this.config.rateLimits.persistentStorage) {
        await this.loadRateLimits();
      }

      this.logger.info('🧠 Интеллектуальное кеширование инициализировано');

    } catch (error) {
      this.logger.error('❌ Ошибка инициализации Redis:', error);
      throw error;
    }
  }

  private setupIntelligentFeatures(): void {
    if (!this.config.intelligent.enabled) return;

    // Периодическая оптимизация каждые 5 минут
    if (this.config.intelligent.autoOptimization) {
      setInterval(() => {
        this.performOptimization();
      }, 5 * 60 * 1000);
    }

    // Сбор статистики каждую минуту
    setInterval(() => {
      this.collectStats();
    }, 60 * 1000);

    // Предиктивная предзагрузка каждые 10 минут
    if (this.config.intelligent.predictivePreloading) {
      setInterval(() => {
        this.performPredictivePreloading();
      }, 10 * 60 * 1000);
    }
  }

  // =================== API RATE LIMITING ===================

  /**
   * Проверка и обновление лимитов для API провайдера
   */
  async checkRateLimit(
    provider: string, 
    endpoint: string = 'default', 
    limit: number = 100, 
    windowSizeMs: number = 3600000 // 1 час
  ): Promise<{ allowed: boolean; resetTime: number; remaining: number }> {
    const key = `ratelimit:${provider}:${endpoint}`;
    const now = Date.now();
    
    try {
      let limitInfo = this.rateLimits.get(key);
      
      if (!limitInfo || (now - limitInfo.windowStart) >= windowSizeMs) {
        // Новое окно
        limitInfo = {
          requests: 0,
          windowStart: now,
          windowSize: windowSizeMs,
          limit,
          resetTime: now + windowSizeMs,
          provider,
          endpoint
        };
      }

      // Проверяем лимит
      if (limitInfo.requests >= limit) {
        this.logger.warn(`⚠️ Превышен лимит для ${provider}:${endpoint}`, {
          requests: limitInfo.requests,
          limit,
          resetTime: new Date(limitInfo.resetTime)
        });

        return {
          allowed: false,
          resetTime: limitInfo.resetTime,
          remaining: 0
        };
      }

      // Увеличиваем счетчик
      limitInfo.requests++;
      this.rateLimits.set(key, limitInfo);

      // Сохраняем в Redis для персистентности
      if (this.config.rateLimits.persistentStorage && this.isConnected) {
        await this.redis.setex(
          `limit:${key}`, 
          Math.ceil(windowSizeMs / 1000), 
          JSON.stringify(limitInfo)
        );
      }

      this.logger.debug(`✅ Запрос разрешен для ${provider}:${endpoint}`, {
        requests: limitInfo.requests,
        limit,
        remaining: limit - limitInfo.requests
      });

      return {
        allowed: true,
        resetTime: limitInfo.resetTime,
        remaining: limit - limitInfo.requests
      };

    } catch (error) {
      this.logger.error('❌ Ошибка проверки лимита:', error);
      // В случае ошибки разрешаем запрос
      return {
        allowed: true,
        resetTime: now + windowSizeMs,
        remaining: limit
      };
    }
  }

  /**
   * Загрузка лимитов из Redis при запуске
   */
  private async loadRateLimits(): Promise<void> {
    try {
      const keys = await this.redis.keys('limit:ratelimit:*');
      
      for (const redisKey of keys) {
        const data = await this.redis.get(redisKey);
        if (data) {
          const limitInfo: RateLimitInfo = JSON.parse(data);
          const key = redisKey.replace('limit:', '');
          this.rateLimits.set(key, limitInfo);
        }
      }

      this.logger.info(`📊 Загружено ${this.rateLimits.size} лимитов из Redis`);
    } catch (error) {
      this.logger.error('❌ Ошибка загрузки лимитов:', error);
    }
  }

  /**
   * Получение статистики лимитов
   */
  getRateLimitStats(): { [provider: string]: { requests: number; limit: number; resetTime: number }[] } {
    const stats: { [provider: string]: { requests: number; limit: number; resetTime: number }[] } = {};
    
    for (const [key, info] of this.rateLimits) {
      if (!stats[info.provider]) {
        stats[info.provider] = [];
      }
      
      stats[info.provider].push({
        requests: info.requests,
        limit: info.limit,
        resetTime: info.resetTime
      });
    }
    
    return stats;
  }

  // =================== INTELLIGENT CACHING ===================

  /**
   * Умное кеширование с автоматической оптимизацией
   */
  async set<T>(
    key: string, 
    value: T, 
    options: {
      ttl?: number;
      priority?: number;
      tags?: string[];
      dependency?: string;
      compress?: boolean;
    } = {}
  ): Promise<boolean> {
    try {
      this.stats.operations.set++;
      this.stats.sets++;

      if (!this.isConnected) {
        this.logger.warn('⚠️ Redis недоступен, пропускаем кеширование');
        return false;
      }

      const ttl = options.ttl || this.config.cache.defaultTTL;
      const serialized = JSON.stringify(value);
      let finalValue = serialized;
      let compressed = false;

      // Сжатие больших значений
      if (this.config.cache.enableCompression && 
          serialized.length > this.config.cache.compressionThreshold &&
          (options.compress !== false)) {
        try {
          const zlib = await import('zlib');
          const compressedBuffer = zlib.gzipSync(serialized);
          if (compressedBuffer.length < serialized.length) {
            finalValue = compressedBuffer.toString('base64');
            compressed = true;
          }
        } catch (error) {
          this.logger.warn('⚠️ Ошибка сжатия:', error);
        }
      }

      // Создаем запись кеша
      const entry: CacheEntry<T> = {
        key,
        value: finalValue as any,
        timestamp: Date.now(),
        ttl,
        hitCount: 0,
        lastAccess: Date.now(),
        size: finalValue.length,
        metadata: {
          priority: options.priority || 1,
          tags: options.tags || [],
          dependency: options.dependency,
          provider: this.extractProvider(key),
          compressed
        }
      };

      // Сохраняем в Redis
      const pipeline = this.redis.pipeline();
      pipeline.setex(`entry:${key}`, ttl, JSON.stringify(entry));
      
      // Добавляем теги для группировки
      if (options.tags && options.tags.length > 0) {
        for (const tag of options.tags) {
          pipeline.sadd(`tag:${tag}`, key);
          pipeline.expire(`tag:${tag}`, ttl + 300); // Немного больше TTL
        }
      }

      await pipeline.exec();

      // Обновляем статистику
      this.stats.memory.used += entry.size;
      this.updateMemoryPercentage();

      // Проверяем, нужна ли очистка памяти
      if (this.stats.memory.percentage > 90) {
        this.performEviction();
      }

      this.logger.debug(`💾 Закешировано: ${key}`, {
        size: entry.size,
        ttl,
        compressed,
        priority: options.priority
      });

      return true;

    } catch (error) {
      this.logger.error('❌ Ошибка сохранения в кеш:', error);
      return false;
    }
  }

  /**
   * Умное получение из кеша с обучением
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      this.stats.operations.get++;

      if (!this.isConnected) {
        this.stats.misses++;
        return null;
      }

      const entryData = await this.redis.get(`entry:${key}`);
      
      if (!entryData) {
        this.stats.misses++;
        this.recordAccess(key, false);
        return null;
      }

      const entry: CacheEntry<T> = JSON.parse(entryData);
      
      // Проверяем TTL
      if (Date.now() - entry.timestamp > entry.ttl * 1000) {
        this.stats.misses++;
        this.recordAccess(key, false);
        await this.delete(key);
        return null;
      }

      // Обновляем статистику доступа
      entry.hitCount++;
      entry.lastAccess = Date.now();
      this.stats.hits++;
      this.recordAccess(key, true);

      // Сохраняем обновленную статистику
      await this.redis.setex(`entry:${key}`, entry.ttl, JSON.stringify(entry));

      // Обрабатываем сжатие
      let value = entry.value;
      if (entry.metadata?.compressed) {
        try {
          const zlib = await import('zlib');
          const buffer = Buffer.from(value as string, 'base64');
          value = zlib.gunzipSync(buffer).toString();
        } catch (error) {
          this.logger.error('❌ Ошибка распаковки:', error);
          return null;
        }
      }

      // Парсим значение
      const result = typeof value === 'string' ? JSON.parse(value) : value;

      this.logger.debug(`🎯 Попадание в кеш: ${key}`, {
        hitCount: entry.hitCount,
        age: Date.now() - entry.timestamp
      });

      return result;

    } catch (error) {
      this.logger.error('❌ Ошибка получения из кеша:', error);
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Удаление из кеша с очисткой тегов
   */
  async delete(key: string): Promise<boolean> {
    try {
      this.stats.operations.delete++;
      this.stats.deletes++;

      if (!this.isConnected) {
        return false;
      }

      // Получаем информацию об записи для очистки тегов
      const entryData = await this.redis.get(`entry:${key}`);
      
      const pipeline = this.redis.pipeline();
      pipeline.del(`entry:${key}`);

      // Очищаем теги
      if (entryData) {
        const entry: CacheEntry = JSON.parse(entryData);
        if (entry.metadata?.tags) {
          for (const tag of entry.metadata.tags) {
            pipeline.srem(`tag:${tag}`, key);
          }
        }
        this.stats.memory.used -= entry.size;
      }

      await pipeline.exec();
      this.updateMemoryPercentage();

      this.logger.debug(`🗑️ Удалено из кеша: ${key}`);
      return true;

    } catch (error) {
      this.logger.error('❌ Ошибка удаления из кеша:', error);
      return false;
    }
  }

  /**
   * Очистка по тегам
   */
  async clearByTag(tag: string): Promise<number> {
    try {
      if (!this.isConnected) return 0;

      const keys = await this.redis.smembers(`tag:${tag}`);
      
      if (keys.length === 0) return 0;

      const pipeline = this.redis.pipeline();
      
      for (const key of keys) {
        pipeline.del(`entry:${key}`);
      }
      
      pipeline.del(`tag:${tag}`);
      
      await pipeline.exec();

      this.logger.info(`🧹 Очищено ${keys.length} записей по тегу: ${tag}`);
      return keys.length;

    } catch (error) {
      this.logger.error('❌ Ошибка очистки по тегу:', error);
      return 0;
    }
  }

  // =================== INTELLIGENT FEATURES ===================

  /**
   * Записывает паттерны доступа для обучения
   */
  private recordAccess(key: string, hit: boolean): void {
    if (!this.config.intelligent.learningEnabled) return;

    const now = Date.now();
    const hourSlot = Math.floor(now / (60 * 60 * 1000)); // Часовые слоты
    
    if (!this.accessPatterns.has(key)) {
      this.accessPatterns.set(key, []);
    }
    
    const pattern = this.accessPatterns.get(key)!;
    pattern.push(hourSlot);
    
    // Сохраняем только последние 24 часа
    const cutoff = hourSlot - 24;
    this.accessPatterns.set(key, pattern.filter(slot => slot > cutoff));
    
    // Обновляем популярные ключи
    if (hit && pattern.length > 5) {
      this.popularKeys.add(key);
    }
  }

  /**
   * Предиктивная предзагрузка популярных данных
   */
  private async performPredictivePreloading(): Promise<void> {
    if (!this.config.intelligent.predictivePreloading) return;

    try {
      this.logger.info('🔮 Запуск предиктивной предзагрузки...');
      
      const now = Date.now();
      const hourSlot = Math.floor(now / (60 * 60 * 1000));
      
      for (const [key, pattern] of this.accessPatterns) {
        if (pattern.length < 3) continue;
        
        // Проверяем паттерн доступа
        const recentAccesses = pattern.filter(slot => slot > hourSlot - 6); // Последние 6 часов
        
        if (recentAccesses.length >= 2) {
          // Ключ активно используется, проверяем нужна ли предзагрузка
          const cached = await this.redis.get(`entry:${key}`);
          
          if (!cached) {
            this.emit('preload-needed', { key, pattern: recentAccesses });
            this.logger.debug(`🎯 Рекомендуется предзагрузка: ${key}`);
          }
        }
      }
      
    } catch (error) {
      this.logger.error('❌ Ошибка предиктивной предзагрузки:', error);
    }
  }

  /**
   * Автоматическая оптимизация кеша
   */
  private async performOptimization(): Promise<void> {
    if (!this.config.intelligent.autoOptimization) return;

    try {
      this.logger.info('⚡ Запуск автооптимизации кеша...');
      
      // Удаляем неиспользуемые ключи
      await this.cleanupUnusedKeys();
      
      // Оптимизируем TTL для популярных ключей
      await this.optimizeTTL();
      
      // Собираем статистику
      await this.collectStats();
      
      this.logger.info('✅ Автооптимизация завершена');
      
    } catch (error) {
      this.logger.error('❌ Ошибка автооптимизации:', error);
    }
  }

  /**
   * Очистка неиспользуемых ключей
   */
  private async cleanupUnusedKeys(): Promise<void> {
    try {
      const keys = await this.redis.keys('entry:*');
      const now = Date.now();
      let cleanedCount = 0;
      
      for (const redisKey of keys) {
        const entryData = await this.redis.get(redisKey);
        if (!entryData) continue;
        
        const entry: CacheEntry = JSON.parse(entryData);
        const key = redisKey.replace('entry:', '');
        
        // Удаляем если не было доступа более суток и мало попаданий
        if (now - entry.lastAccess > 24 * 60 * 60 * 1000 && entry.hitCount < 2) {
          await this.delete(key);
          cleanedCount++;
        }
      }
      
      if (cleanedCount > 0) {
        this.logger.info(`🧹 Очищено ${cleanedCount} неиспользуемых ключей`);
      }
      
    } catch (error) {
      this.logger.error('❌ Ошибка очистки:', error);
    }
  }

  /**
   * Оптимизация TTL для популярных ключей
   */
  private async optimizeTTL(): Promise<void> {
    try {
      for (const key of this.popularKeys) {
        const entryData = await this.redis.get(`entry:${key}`);
        if (!entryData) continue;
        
        const entry: CacheEntry = JSON.parse(entryData);
        
        // Увеличиваем TTL для часто используемых ключей
        if (entry.hitCount > 10) {
          const newTTL = Math.min(entry.ttl * 1.5, 24 * 3600); // Максимум 24 часа
          await this.redis.expire(`entry:${key}`, newTTL);
          
          this.logger.debug(`⏰ Увеличен TTL для ${key}: ${entry.ttl} → ${newTTL}`);
        }
      }
      
    } catch (error) {
      this.logger.error('❌ Ошибка оптимизации TTL:', error);
    }
  }

  /**
   * Eviction политика для освобождения памяти
   */
  private async performEviction(): Promise<void> {
    try {
      this.logger.warn('🚨 Достигнут лимит памяти, запуск eviction...');
      
      const keys = await this.redis.keys('entry:*');
      const entries: { key: string; entry: CacheEntry; score: number }[] = [];
      
      // Собираем информацию для принятия решения
      for (const redisKey of keys) {
        const entryData = await this.redis.get(redisKey);
        if (!entryData) continue;
        
        const entry: CacheEntry = JSON.parse(entryData);
        const key = redisKey.replace('entry:', '');
        
        let score = 0;
        const now = Date.now();
        
        switch (this.config.cache.evictionPolicy) {
          case 'lru':
            score = now - entry.lastAccess; // Больше = старше
            break;
          case 'lfu':
            score = -entry.hitCount; // Меньше = реже используется
            break;
          case 'ttl':
            score = entry.timestamp + (entry.ttl * 1000) - now; // Меньше = скорее истечет
            break;
          case 'random':
            score = Math.random();
            break;
        }
        
        entries.push({ key, entry, score });
      }
      
      // Сортируем по score (кандидаты на удаление идут первыми)
      entries.sort((a, b) => b.score - a.score);
      
      // Удаляем 20% записей
      const toRemove = Math.ceil(entries.length * 0.2);
      let removedCount = 0;
      
      for (let i = 0; i < toRemove && i < entries.length; i++) {
        await this.delete(entries[i].key);
        removedCount++;
        this.stats.evictions++;
      }
      
      this.logger.info(`🗑️ Удалено ${removedCount} записей при eviction`);
      
    } catch (error) {
      this.logger.error('❌ Ошибка eviction:', error);
    }
  }

  // =================== UTILITY METHODS ===================

  private updateMemoryPercentage(): void {
    this.stats.memory.percentage = (this.stats.memory.used / this.stats.memory.total) * 100;
  }

  private extractProvider(key: string): string {
    // Извлекаем провайдера из ключа (например, "openai:completion:xxx" -> "openai")
    const parts = key.split(':');
    return parts.length > 0 ? parts[0] : 'unknown';
  }

  private async collectStats(): Promise<void> {
    try {
      if (!this.isConnected) return;
      
      const keys = await this.redis.keys('entry:*');
      let totalSize = 0;
      
      for (const key of keys) {
        const entryData = await this.redis.get(key);
        if (entryData) {
          const entry: CacheEntry = JSON.parse(entryData);
          totalSize += entry.size;
        }
      }
      
      this.stats.memory.used = totalSize;
      this.updateMemoryPercentage();
      
      this.emit('stats-updated', this.stats);
      
    } catch (error) {
      this.logger.error('❌ Ошибка сбора статистики:', error);
    }
  }

  private async handleRedisError(error: Error): Promise<void> {
    this.retryAttempts++;
    
    if (this.retryAttempts >= this.maxRetryAttempts) {
      this.logger.error('❌ Превышено максимальное количество попыток подключения к Redis');
      this.emit('max-retries-exceeded', error);
      return;
    }
    
    // Экспоненциальная задержка для переподключения
    const delay = Math.min(1000 * Math.pow(2, this.retryAttempts), 30000);
    
    setTimeout(async () => {
      try {
        await this.redis.connect();
      } catch (reconnectError) {
        this.logger.error('❌ Ошибка переподключения к Redis:', reconnectError);
      }
    }, delay);
  }

  // =================== PUBLIC API ===================

  /**
   * Получение статистики кеша
   */
  getStats(): CacheStats & { rateLimits: any; isConnected: boolean } {
    return {
      ...this.stats,
      rateLimits: this.getRateLimitStats(),
      isConnected: this.isConnected
    };
  }

  /**
   * Очистка всего кеша
   */
  async clear(): Promise<void> {
    try {
      if (!this.isConnected) return;
      
      await this.redis.flushdb();
      this.stats = this.initializeStats();
      this.rateLimits.clear();
      this.accessPatterns.clear();
      this.popularKeys.clear();
      
      this.logger.info('🧹 Весь кеш очищен');
      
    } catch (error) {
      this.logger.error('❌ Ошибка очистки кеша:', error);
    }
  }

  /**
   * Проверка существования ключа
   */
  async exists(key: string): Promise<boolean> {
    try {
      if (!this.isConnected) return false;
      return await this.redis.exists(`entry:${key}`) === 1;
    } catch (error) {
      this.logger.error('❌ Ошибка проверки существования:', error);
      return false;
    }
  }

  /**
   * Закрытие соединения
   */
  async close(): Promise<void> {
    try {
      if (this.redis) {
        await this.redis.quit();
        this.isConnected = false;
        this.logger.info('👋 Redis соединение закрыто');
      }
    } catch (error) {
      this.logger.error('❌ Ошибка закрытия Redis:', error);
    }
  }

  /**
   * Проверка здоровья сервиса
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    redis: boolean;
    stats: CacheStats;
    latency: number;
  }> {
    const start = Date.now();
    let redisHealthy = false;
    
    try {
      if (this.isConnected) {
        await this.redis.ping();
        redisHealthy = true;
      }
    } catch (error) {
      this.logger.error('❌ Redis health check failed:', error);
    }
    
    const latency = Date.now() - start;
    
    return {
      status: redisHealthy ? 'healthy' : 'unhealthy',
      redis: redisHealthy,
      stats: this.stats,
      latency
    };
  }

  private deepMerge(target: any, source: any): any {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }
}

// Singleton экземпляр
export const intelligentCache = new IntelligentCacheService();
export default intelligentCache; 